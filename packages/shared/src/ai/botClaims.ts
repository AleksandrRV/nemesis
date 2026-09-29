import type { CommsClaim, CommsMessage } from '../types/comms.js';
import type { SanitizedGameState } from '../types/sanitized.js';
import type { CourseMarker, Destination } from '../types/state.js';
import { engineKey } from './botBeliefs.js';
import type { BotFact, BotMind, EvidenceReason, TrackedClaim } from './botMind.js';
import { withEvidence } from './botSocial.js';
import type { BotTuning } from './botTuning.js';

type ClaimMessage = Extract<CommsMessage, { kind: 'CLAIM' }>;
type Truth = 'TRUE' | 'FALSE' | 'UNKNOWN';

export function engineEpoch(mind: BotMind, engineNumber: number): number {
  const key = engineKey(engineNumber);
  return key ? mind.engineEpochs[key] : 0;
}

/** Заявление другого игрока запоминается, чтобы однажды сверить его со своим знанием. */
export function trackClaim(mind: BotMind, message: ClaimMessage, view: SanitizedGameState): BotMind {
  const body = message.body;
  const epoch =
    body.topic === 'ENGINE_STATUS' || body.topic === 'ENGINE_DEED' ? engineEpoch(mind, body.engineNumber) : 0;
  const claim: TrackedClaim = {
    messageId: message.id,
    authorId: message.authorId,
    to: message.to,
    round: message.round,
    body,
    epoch,
    marker: view.ship.coordinates.currentCourseMarker,
    verdict: 'OPEN',
  };
  return { ...mind, claims: [...mind.claims, claim] };
}

/** Состояние Двигателя в эпоху Заявления: текущее знание, перевёрнутое на каждую перестановку после слов. */
function engineStateAt(mind: BotMind, engineNumber: number, epoch: number): boolean | null {
  const key = engineKey(engineNumber);
  if (!key) return null;
  const known = mind.engines[key].known;
  if (known === null) return null;
  return (mind.engineEpochs[key] - epoch) % 2 === 0 ? known : !known;
}

function destinationAt(mind: BotMind, marker: CourseMarker): Destination | null {
  if (mind.coordinates.cardId === null) return null;
  const entry = Object.entries(mind.coordinates.byMarker[marker]).find(([, probability]) => probability === 1);
  return entry ? (entry[0] as Destination) : null;
}

function touchesInWindow(mind: BotMind, claim: TrackedClaim, engineNumber: number, tuning: BotTuning) {
  return mind.facts.filter(
    (fact): fact is Extract<BotFact, { kind: 'ENGINE_TOUCHED' }> =>
      fact.kind === 'ENGINE_TOUCHED' &&
      fact.playerId === claim.authorId &&
      fact.engineNumber === engineNumber &&
      fact.round >= claim.round - tuning.trust.deedClaimWindowRounds &&
      fact.round <= claim.round,
  );
}

function asTruth(value: boolean | null): Truth {
  return value === null ? 'UNKNOWN' : value ? 'TRUE' : 'FALSE';
}

/** Сверка одного Заявления со знанием бота (В8-6-1): своя Проверка, журнал дел, свои же слова автора. */
function judgeClaim(mind: BotMind, claim: TrackedClaim, tuning: BotTuning): { truth: Truth; reason: EvidenceReason } {
  const body: CommsClaim = claim.body;
  switch (body.topic) {
    case 'ENGINE_STATUS': {
      const state = engineStateAt(mind, body.engineNumber, claim.epoch);
      return {
        truth: state === null ? 'UNKNOWN' : asTruth(state === (body.status === 'WORKING')),
        reason: 'CLAIM_REFUTED_BY_CHECK',
      };
    }
    case 'ENGINE_DEED': {
      const touches = touchesInWindow(mind, claim, body.engineNumber, tuning);
      if (body.deed === 'UNTOUCHED') {
        return { truth: touches.some((fact) => fact.orderChanged) ? 'FALSE' : 'UNKNOWN', reason: 'DEED_CLAIM_REFUTED' };
      }
      if (touches.length === 0) return { truth: 'FALSE', reason: 'DEED_CLAIM_REFUTED' };
      const state = engineStateAt(mind, body.engineNumber, claim.epoch);
      return {
        truth: state === null ? 'UNKNOWN' : asTruth(state === (body.deed === 'REPAIRED')),
        reason: 'DEED_CLAIM_REFUTED',
      };
    }
    case 'COORDINATES': {
      const destination = destinationAt(mind, body.marker);
      return {
        truth: destination === null ? 'UNKNOWN' : asTruth(destination === body.destination),
        reason: 'CLAIM_REFUTED_BY_CHECK',
      };
    }
    case 'COURSE': {
      const destination = destinationAt(mind, claim.marker);
      if (destination !== null) {
        return { truth: asTruth((destination === 'EARTH') === body.toEarth), reason: 'CLAIM_REFUTED_BY_CHECK' };
      }
      return { truth: courseAgainstOwnWords(mind, claim, body.toEarth), reason: 'COURSE_CLAIM_SELF_CONTRADICTED' };
    }
    default:
      return { truth: 'UNKNOWN', reason: 'CLAIM_REFUTED_BY_CHECK' };
  }
}

/** Автор сам заявлял, куда ведёт маркер, а потом поставил на него Курс и говорит обратное. */
function courseAgainstOwnWords(mind: BotMind, claim: TrackedClaim, toEarth: boolean): Truth {
  const setByAuthor = mind.facts.some(
    (fact) =>
      fact.kind === 'COURSE_SET' &&
      fact.playerId === claim.authorId &&
      fact.toMarker === claim.marker &&
      fact.round <= claim.round,
  );
  if (!setByAuthor) return 'UNKNOWN';
  const ownWords = mind.claims.find(
    (other) =>
      other.authorId === claim.authorId &&
      other.body.topic === 'COORDINATES' &&
      other.body.marker === claim.marker &&
      other.round <= claim.round,
  );
  if (!ownWords || ownWords.body.topic !== 'COORDINATES') return 'UNKNOWN';
  return (ownWords.body.destination === 'EARTH') === toEarth ? 'UNKNOWN' : 'FALSE';
}

function sameEngineEpoch(left: TrackedClaim, right: TrackedClaim): boolean {
  return (
    left.body.topic === 'ENGINE_STATUS' &&
    right.body.topic === 'ENGINE_STATUS' &&
    left.body.engineNumber === right.body.engineNumber &&
    left.epoch === right.epoch
  );
}

/** Двое независимых говорят обратное, и никто не поддерживает автора: слабая улика против него. */
function contradictedByTwo(mind: BotMind, claim: TrackedClaim): boolean {
  if (claim.body.topic !== 'ENGINE_STATUS') return false;
  const status = claim.body.status;
  const peers = mind.claims.filter((other) => other.authorId !== claim.authorId && sameEngineEpoch(other, claim));
  const againstAuthors = new Set(
    peers
      .filter((other) => other.body.topic === 'ENGINE_STATUS' && other.body.status !== status)
      .map((o) => o.authorId),
  );
  const supporters = peers.some((other) => other.body.topic === 'ENGINE_STATUS' && other.body.status === status);
  return againstAuthors.size >= 2 && !supporters && !againstAuthors.has(mind.botId);
}

export interface ClaimVerdictEvent {
  claim: TrackedClaim;
  refuted: boolean;
}

/** Сверяет открытые Заявления; подтверждение и опровержение — улики в шкале честности автора. */
export function verifyClaims(
  mind: BotMind,
  round: number,
  tuning: BotTuning,
): { mind: BotMind; verdicts: ClaimVerdictEvent[] } {
  let players = mind.players;
  const verdicts: ClaimVerdictEvent[] = [];
  const claims = mind.claims.map((claim) => {
    if (claim.verdict !== 'OPEN' || !players[claim.authorId]) return claim;
    const { truth, reason } = judgeClaim(mind, claim, tuning);
    let verdict: TrackedClaim['verdict'] = 'OPEN';
    let weight = 0;
    let why: EvidenceReason = reason;
    if (truth === 'TRUE') {
      verdict = 'CONFIRMED';
      weight = tuning.trust.wordWeight;
      why = 'CLAIM_CONFIRMED';
    } else if (truth === 'FALSE') {
      verdict = 'REFUTED';
      weight = -tuning.trust.deedWeight;
    } else if (contradictedByTwo(mind, claim)) {
      verdict = 'REFUTED';
      weight = -tuning.trust.contradictionWeight;
      why = 'CLAIM_CONTRADICTED';
    }
    if (verdict === 'OPEN') return claim;
    players = {
      ...players,
      [claim.authorId]: withEvidence(players[claim.authorId]!, 'HONESTY', weight, why, round, tuning),
    };
    const settled = { ...claim, verdict };
    verdicts.push({ claim: settled, refuted: verdict === 'REFUTED' });
    return settled;
  });
  return { mind: { ...mind, claims, players }, verdicts };
}
