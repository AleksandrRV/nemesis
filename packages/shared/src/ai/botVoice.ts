import type { CommsDraft, CommsIntent, CommsMessage, CommsRequestTopic } from '../types/comms.js';
import type { SanitizedGameState } from '../types/sanitized.js';
import type { EngineNumber } from '../types/state.js';
import { botStream, effectiveKnobs } from './botCharacter.js';
import { distanceBetween, intentTargetRooms } from './botGraph.js';
import { hasLoadedWeapon, roomIdsOf } from './botGoals.js';
import { planCoordinatesClaim, planEngineClaim } from './botLying.js';
import type { BotMind } from './botMind.js';
import { pickPhraseId } from './botPhrases.js';
import { hasAdjacentIntruders } from './botRisk.js';
import type { BotTask } from './botTasks.js';
import type { BotTuning } from './botTuning.js';
import type { ScoredCandidate } from './botUtility.js';

type Rng = () => number;
type OwnMessage = Exclude<CommsMessage, { kind: 'SYSTEM' }>;

const ENGINE_NUMBERS: readonly EngineNumber[] = [1, 2, 3];
const MOVING_KINDS = new Set(['MOVE', 'CAREFUL_MOVE']);

function ownMessages(view: SanitizedGameState, botId: string): OwnMessage[] {
  return view.comms.messages.filter((message): message is OwnMessage => message.authorId === botId);
}

function turnStartSequence(view: SanitizedGameState): number {
  for (let index = view.gameLog.length - 1; index >= 0; index--) {
    const entry = view.gameLog[index]!;
    if (entry.event.type === 'PLAYER_TURN_STARTED') return entry.sequence;
  }
  return 0;
}

function spokenThisTurn(view: SanitizedGameState, botId: string): number {
  const since = turnStartSequence(view);
  return ownMessages(view, botId).filter(
    (message) => message.kind !== 'ANSWER' && message.kind !== 'REQUEST' && message.logSequence >= since,
  ).length;
}

function claimedSince(view: SanitizedGameState, botId: string, round: number, matches: (m: OwnMessage) => boolean) {
  return ownMessages(view, botId).some((message) => message.round >= round && matches(message));
}

/** Заявление после своей Проверки (В8-8-2): правду или ложь решает политика лжи. */
function claimAfterCheck(view: SanitizedGameState, mind: BotMind, tuning: BotTuning): CommsDraft | null {
  const freshSince = view.meta.currentRound - tuning.comms.freshCheckRounds;
  for (const fact of [...mind.facts].reverse()) {
    if (fact.round < freshSince) break;
    if (fact.kind === 'ENGINES_CHECKED' && fact.playerId === mind.botId) {
      for (const engineNumber of ENGINE_NUMBERS.filter((number) => fact.engineNumbers.includes(number))) {
        const claimed = claimedSince(
          view,
          mind.botId,
          fact.round,
          (message) =>
            message.kind === 'CLAIM' &&
            message.body.topic === 'ENGINE_STATUS' &&
            message.body.engineNumber === engineNumber,
        );
        const plan = claimed ? null : planEngineClaim(view, mind, engineNumber, tuning);
        if (plan) return plan.draft;
      }
    }
    if (fact.kind === 'COORDINATES_CHECKED' && fact.playerId === mind.botId) {
      const claimed = claimedSince(
        view,
        mind.botId,
        fact.round,
        (message) => message.kind === 'CLAIM' && message.body.topic === 'COORDINATES',
      );
      const plan = claimed ? null : planCoordinatesClaim(view, mind, view.ship.coordinates.currentCourseMarker, tuning);
      if (plan) return plan.draft;
    }
  }
  return null;
}

function intentOf(view: SanitizedGameState, entry: BotTask): CommsIntent | null {
  switch (entry.kind) {
    case 'HIBERNATE':
      return { topic: 'GO_TO_HIBERNATION' };
    case 'CHECK_ENGINE':
    case 'REPAIR_ENGINE':
      return { topic: 'GO_TO_ENGINES' };
    case 'CHECK_COORDINATES':
    case 'SET_COURSE':
      return { topic: 'GO_TO_BRIDGE' };
    case 'HEAL':
      return { topic: 'GO_HEAL' };
    case 'EXPLORE':
      return { topic: 'EXPLORE' };
    case 'BOARD_POD':
      if (entry.detail.podId) return { topic: 'GO_TO_POD', podId: entry.detail.podId };
      break;
    case 'SHIELD_ALLY':
      if (entry.detail.playerId) return { topic: 'COVER_PLAYER', playerId: entry.detail.playerId };
      break;
    default:
      break;
  }
  const [roomId] = roomIdsOf(view, entry.place);
  return roomId === undefined ? null : { topic: 'GO_TO_ROOM', roomId };
}

/** Намерение перед дальним походом: только о своём настоящем пути и не о вредительстве. */
function intentBeforeTrip(
  view: SanitizedGameState,
  mind: BotMind,
  chosen: ScoredCandidate,
  tuning: BotTuning,
): CommsDraft | null {
  const entry = chosen.task;
  if (!entry || entry.desire === 'SABOTAGE' || !MOVING_KINDS.has(chosen.candidate.kind)) return null;
  const intent = intentOf(view, entry);
  if (!intent) return null;
  const targets = intentTargetRooms(view, intent);
  const here = view.players[mind.botId]!.roomId;
  const distance = distanceBetween(view, here, targets);
  if (!Number.isFinite(distance) || distance < tuning.comms.intentMinHops) return null;
  if (distanceBetween(view, chosen.candidate.roomId, targets) >= distance) return null;
  const since = view.meta.currentRound - tuning.trust.intentWindowRounds;
  const repeated = claimedSince(
    view,
    mind.botId,
    since,
    (message) => message.kind === 'INTENT' && JSON.stringify(message.body) === JSON.stringify(intent),
  );
  return repeated ? null : { kind: 'INTENT', to: 'ALL', body: intent };
}

/** Просьба, когда не хватает ресурса: Пожар, Чужой рядом, нет заряженного Оружия. */
function neededHelp(view: SanitizedGameState, mind: BotMind): CommsRequestTopic | null {
  const self = view.players[mind.botId]!;
  const room = view.ship.rooms[self.roomId];
  if (!room) return null;
  if (room.hasFire) return { topic: 'EXTINGUISH', roomId: room.id };
  const intruderHere = view.intrudersPool.boardTokens.some((token) => token.roomId === room.id);
  if (intruderHere) return { topic: 'HELP_KILL', roomId: room.id };
  if (!hasLoadedWeapon(self) && hasAdjacentIntruders(view, room.id)) return { topic: 'NEED_ITEM', need: 'WEAPON' };
  return null;
}

function hasOpenRequest(view: SanitizedGameState, botId: string): boolean {
  return ownMessages(view, botId).some(
    (message) => message.kind === 'REQUEST' && view.meta.currentRound <= message.expiresAtRound,
  );
}

function hasListeners(view: SanitizedGameState, botId: string): boolean {
  return Object.values(view.players).some((player) => player.id !== botId && !player.isDead);
}

function voiced(draft: CommsDraft, mind: BotMind, rng: Rng, tuning: BotTuning): CommsDraft {
  if (draft.kind !== 'CLAIM' && draft.kind !== 'INTENT' && draft.kind !== 'REQUEST') return draft;
  const phraseId = pickPhraseId(draft.kind, mind.character, rng(), tuning);
  return phraseId === undefined ? draft : { ...draft, phraseId };
}

/**
 * Голос бота (план 0.8.0, В8-8-2): говорит, когда это полезно — Заявление после своей Проверки, Намерение
 * перед дальним походом, Просьба при нехватке ресурса. Частота — `tuning.comms`, броски — личный поток `ai`.
 */
export function speak(
  view: SanitizedGameState,
  mind: BotMind,
  chosen: ScoredCandidate | null,
  tuning: BotTuning,
): { mind: BotMind; speech: CommsDraft[] } {
  if (!hasListeners(view, mind.botId)) return { mind, speech: [] };
  const stream = botStream(mind.seed, mind.rngDraws);
  const knobs = effectiveKnobs(mind.character, mind.difficulty, tuning);
  const speech: CommsDraft[] = [];
  let budget = tuning.comms.ownMessagesPerTurn - spokenThisTurn(view, mind.botId);
  const say = (draft: CommsDraft | null, chance: number) => {
    const ordinary = draft?.kind !== 'REQUEST';
    if (!draft || (ordinary && budget <= 0) || stream.rng() >= chance) return;
    speech.push(voiced(draft, mind, stream.rng, tuning));
    if (ordinary) budget -= 1;
  };
  say(claimAfterCheck(view, mind, tuning), tuning.comms.speakChance);
  if (chosen) say(intentBeforeTrip(view, mind, chosen, tuning), tuning.comms.speakChance);
  if (!hasOpenRequest(view, mind.botId)) {
    const help = neededHelp(view, mind);
    const draft: CommsDraft | null = help ? { kind: 'REQUEST', to: 'ALL', body: help } : null;
    say(draft, Math.min(1, tuning.comms.requestChance * knobs.requestRate));
  }
  const used = stream.used();
  return { mind: used === mind.rngDraws ? mind : { ...mind, rngDraws: used }, speech };
}
