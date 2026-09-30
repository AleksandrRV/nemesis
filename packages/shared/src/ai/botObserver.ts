import type { CommsMessage } from '../types/comms.js';
import type { SanitizedGameLogEntry, SanitizedGameState } from '../types/sanitized.js';
import {
  COURSE_CLAIM_DESTINATIONS,
  applyCoordinatesClaim,
  applyEngineClaim,
  certainEngine,
  engineKey,
  flipEngine,
  forgetKnowledge,
  knownCoordinates,
} from './botBeliefs.js';
import { botStream, effectiveKnobs, personaForRound } from './botCharacter.js';
import { trackClaim, verifyClaims, type ClaimVerdictEvent } from './botClaims.js';
import {
  applySignal,
  deedSignalsOf,
  observeCommitment,
  observePursuit,
  settleIntents,
  trackIntent,
} from './botDeeds.js';
import { recordOwnClaim } from './botLying.js';
import type { BotFact, BotMind } from './botMind.js';
import { applyMoraleDrift } from './botMorale.js';
import { initialObjectiveGuesses, objectiveClueOf, observeObjectiveClue } from './botObjectives.js';
import { pruneOwnPromises } from './botRequests.js';
import { claimWeight, relaxPlayerModel } from './botSocial.js';
import { BOT_TUNING, type BotTuning } from './botTuning.js';

function withFact(mind: BotMind, fact: BotFact, tuning: BotTuning): BotMind {
  const facts = [...mind.facts, fact];
  return { ...mind, facts: facts.length > tuning.memory.maxFacts ? facts.slice(-tuning.memory.maxFacts) : facts };
}

function setEngine(
  mind: BotMind,
  engineNumber: number,
  update: (belief: BotMind['engines']['1']) => BotMind['engines']['1'],
): BotMind {
  const key = engineKey(engineNumber);
  return key ? { ...mind, engines: { ...mind.engines, [key]: update(mind.engines[key]) } } : mind;
}

function ownPendingAnnouncement(mind: BotMind, engineNumber: number, delta: number): BotMind {
  const key = String(engineNumber);
  const count = Math.max(0, (mind.pendingOwnAnnouncements[key] ?? 0) + delta);
  return { ...mind, pendingOwnAnnouncements: { ...mind.pendingOwnAnnouncements, [key]: count } };
}

/** Одна запись журнала: публичный факт плюс то, что бот узнал сам (свои проверки в его срезе открыты). */
function observeShipLogEntry(mind: BotMind, entry: SanitizedGameLogEntry, tuning: BotTuning): BotMind {
  const event = entry.event;
  const round = mind.observedRound;
  const self = mind.botId;
  switch (event.type) {
    case 'ROUND_STARTED':
      return { ...mind, observedRound: event.round };
    case 'PLAYER_MOVED':
      return withFact(
        mind,
        { kind: 'MOVED', round, playerId: event.playerId, fromRoomId: event.fromRoomId, toRoomId: event.toRoomId },
        tuning,
      );
    case 'ENGINES_INSPECTED': {
      let next = withFact(
        mind,
        {
          kind: 'ENGINES_CHECKED',
          round,
          playerId: event.playerId,
          engineNumbers: event.engines.map((engine) => engine.engineNumber),
        },
        tuning,
      );
      if (event.playerId !== self) return next;
      for (const engine of event.engines) {
        if (engine.isWorking !== null) {
          const isWorking = engine.isWorking;
          next = setEngine(next, engine.engineNumber, () => certainEngine(isWorking, round, 'OWN_CHECK'));
        }
      }
      return next;
    }
    case 'ENGINE_TOGGLED': {
      const next = withFact(
        mind,
        {
          kind: 'ENGINE_TOUCHED',
          round,
          playerId: event.playerId,
          engineNumber: event.engineNumber,
          orderChanged: event.orderChanged,
        },
        tuning,
      );
      if (event.playerId !== self || event.isWorking === null) return next;
      const isWorking = event.isWorking;
      const known = setEngine(next, event.engineNumber, () => certainEngine(isWorking, round, 'OWN_TOGGLE'));
      return event.orderChanged ? ownPendingAnnouncement(known, event.engineNumber, 1) : known;
    }
    case 'COORDINATES_INSPECTED': {
      const next = withFact(mind, { kind: 'COORDINATES_CHECKED', round, playerId: event.playerId }, tuning);
      return event.playerId === self && event.cardId !== null
        ? { ...next, coordinates: knownCoordinates(event.cardId) }
        : next;
    }
    case 'COURSE_SET':
      return withFact(mind, { kind: 'COURSE_SET', round, playerId: event.playerId, toMarker: event.toMarker }, tuning);
    case 'DOOR_CHANGED':
      return withFact(
        mind,
        { kind: 'DOOR', round, playerId: event.playerId, corridorId: event.corridorId, to: event.to },
        tuning,
      );
    case 'FIRE_EXTINGUISHED':
      return withFact(
        mind,
        { kind: 'FIRE_EXTINGUISHED', round, playerId: event.playerId, roomId: event.roomId },
        tuning,
      );
    case 'SELF_DESTRUCT_TOGGLED':
      return withFact(mind, { kind: 'SELF_DESTRUCT', round, playerId: event.playerId, active: event.isActive }, tuning);
    case 'ESCAPE_POD_TOGGLED':
      return withFact(
        mind,
        { kind: 'POD_LOCK', round, playerId: event.playerId, podId: event.podId, locked: event.isLocked },
        tuning,
      );
    case 'DECOMPRESSION_STARTED':
      return withFact(
        mind,
        { kind: 'DECOMPRESSION', round, playerId: event.playerId, roomId: event.targetRoomId },
        tuning,
      );
    case 'EXCHANGE_COMPLETED':
      return event.entries.reduce(
        (next, item) =>
          withFact(
            next,
            { kind: 'EXCHANGE', round, fromPlayerId: item.fromPlayerId, toPlayerId: item.toPlayerId },
            tuning,
          ),
        mind,
      );
    case 'INTRUDER_KILLED':
      return withFact(mind, { kind: 'INTRUDER_KILLED', round, playerId: event.playerId, roomId: event.roomId }, tuning);
    case 'FIRE_DAMAGE_TAKEN':
      return withFact(mind, { kind: 'WOUNDED', round, playerId: event.playerId, cause: 'FIRE' }, tuning);
    case 'BLEEDING_WOUND_TAKEN':
      return withFact(mind, { kind: 'WOUNDED', round, playerId: event.playerId, cause: 'BLEEDING' }, tuning);
    case 'SURPRISE_ATTACK_RESOLVED':
      return event.outcome === 'HIT'
        ? withFact(mind, { kind: 'WOUNDED', round, playerId: event.playerId, cause: 'ATTACK' }, tuning)
        : mind;
    default:
      return mind;
  }
}

/** Та же запись глазами социальной модели (В8-6-1, В8-6-4): дела, обещания, преследование, улики о Целях. */
function observeSocialLogEntry(
  mind: BotMind,
  entry: SanitizedGameLogEntry,
  view: SanitizedGameState,
  tuning: BotTuning,
): BotMind {
  const event = entry.event;
  let next = deedSignalsOf(event, view, mind).reduce((acc, deed) => applySignal(acc, deed, view, tuning), mind);
  if (event.type === 'COMMITMENT_RESOLVED') next = observeCommitment(next, event, view, tuning);
  if (event.type === 'PLAYER_MOVED') next = observePursuit(next, event, view, tuning);
  const clue = objectiveClueOf(event, view);
  if (clue && clue.playerId !== mind.botId) next = observeObjectiveClue(next, clue.playerId, clue.clue, tuning);
  return next;
}

function observeAnnouncement(mind: BotMind, engineNumber: number, round: number, tuning: BotTuning): BotMind {
  const key = engineKey(engineNumber);
  const counted = key ? { ...mind, engineEpochs: { ...mind.engineEpochs, [key]: mind.engineEpochs[key] + 1 } } : mind;
  const next = withFact(counted, { kind: 'ENGINE_ORDER_CHANGED', round, engineNumber }, tuning);
  if ((next.pendingOwnAnnouncements[String(engineNumber)] ?? 0) > 0)
    return ownPendingAnnouncement(next, engineNumber, -1);
  return setEngine(next, engineNumber, flipEngine);
}

function observeClaim(
  mind: BotMind,
  message: Extract<CommsMessage, { kind: 'CLAIM' }>,
  view: SanitizedGameState,
  tuning: BotTuning,
): BotMind {
  if (message.authorId === mind.botId) return recordOwnClaim(mind, message);
  const next = trackClaim(mind, message, view);
  const weight = claimWeight(next.players[message.authorId], tuning);
  const claim = message.body;
  switch (claim.topic) {
    case 'ENGINE_STATUS':
      return setEngine(next, claim.engineNumber, (belief) =>
        applyEngineClaim(belief, claim.status === 'WORKING', weight),
      );
    case 'COORDINATES':
      return {
        ...next,
        coordinates: applyCoordinatesClaim(next.coordinates, claim.marker, [claim.destination], weight),
      };
    case 'COURSE':
      return {
        ...next,
        coordinates: applyCoordinatesClaim(
          next.coordinates,
          view.ship.coordinates.currentCourseMarker,
          COURSE_CLAIM_DESTINATIONS[claim.toEarth ? 'TO_EARTH' : 'NOT_EARTH'],
          weight,
        ),
      };
    default:
      return next;
  }
}

function refusedMyRequest(mind: BotMind, message: Extract<CommsMessage, { kind: 'ANSWER' }>): boolean {
  return message.body.answer === 'CANNOT' && message.to === mind.botId && message.authorId !== mind.botId;
}

function observeMessage(mind: BotMind, message: CommsMessage, view: SanitizedGameState, tuning: BotTuning): BotMind {
  const next = withFact(
    mind,
    {
      kind: 'SAID',
      round: message.round,
      messageId: message.id,
      authorId: message.authorId,
      messageKind: message.kind,
    },
    tuning,
  );
  switch (message.kind) {
    case 'SYSTEM':
      return observeAnnouncement(next, message.body.engineNumber, message.round, tuning);
    case 'CLAIM':
      return observeClaim(next, message, view, tuning);
    case 'INTENT':
      return trackIntent(next, message, view);
    case 'ANSWER':
      return refusedMyRequest(next, message)
        ? applySignal(next, { playerId: message.authorId, signal: 'REFUSED_MY_REQUEST' }, view, tuning)
        : next;
    default:
      return next;
  }
}

/** Приговор Заявлению — ещё и поступок: ложь в адрес бота бьёт по морали, «чиню» при поломке — вред. */
function afterVerdict(mind: BotMind, verdict: ClaimVerdictEvent, view: SanitizedGameState, tuning: BotTuning): BotMind {
  const { claim, refuted } = verdict;
  let next = mind;
  if (refuted && (claim.to === 'ALL' || claim.to === mind.botId)) {
    next = { ...next, pendingMorale: next.pendingMorale + tuning.morale.lieCaughtAgainstMe };
  }
  if (claim.body.topic === 'ENGINE_DEED' && claim.body.deed === 'REPAIRED') {
    const signal = refuted ? 'DAMAGED_ENGINE_AFTER_REPAIR_CLAIM' : 'REPAIRED';
    next = applySignal(next, { playerId: claim.authorId, signal }, view, tuning);
  }
  return next;
}

/** Смена раунда: смена личности при раздвоении, забывание «Склеротика» (личный поток `ai`), таяние доверия и обид, дрейф морали. */
function onNewRounds(mind: BotMind, view: SanitizedGameState, before: number, tuning: BotTuning): BotMind {
  const rounds = mind.observedRound - before;
  if (rounds <= 0) return mind;
  const character = personaForRound(mind.character, mind.observedRound, tuning);
  const knobs = effectiveKnobs(character, mind.difficulty, tuning);
  const initialTrust = tuning.trust.initial * knobs.initialTrust;
  const players = Object.fromEntries(
    Object.entries(mind.players).map(([playerId, model]) => [
      playerId,
      relaxPlayerModel(model, rounds, initialTrust, knobs, tuning),
    ]),
  );
  let next = applyMoraleDrift({ ...mind, character, players }, view, rounds, tuning);
  const chance = knobs.forgetChance * tuning.memory.forgetChancePerRound;
  if (chance <= 0) return next;
  const stream = botStream(next.seed, next.rngDraws);
  for (let round = 0; round < rounds; round++) next = forgetKnowledge(next, chance, stream.rng);
  return { ...next, rngDraws: stream.used() };
}

function withObjectiveGuesses(mind: BotMind, view: SanitizedGameState): BotMind {
  if (Object.keys(mind.objectiveGuesses).length > 0) return mind;
  return { ...mind, objectiveGuesses: initialObjectiveGuesses(view, mind.botId) };
}

/**
 * Наблюдатель (план 0.8.0, В8-5-4, В8-6): новые записи журнала и Рации в памяти бота — только из его среза.
 * Функция чистая: память на входе не меняется.
 */
export function observe(view: SanitizedGameState, mind: BotMind, tuning: BotTuning = BOT_TUNING): BotMind {
  const startRound = mind.observedRound;
  let next = withObjectiveGuesses(mind, view);
  const messages = view.comms.messages.filter((message) => message.sequence > mind.processedCommsSequence);
  let heard = 0;
  for (const entry of view.gameLog) {
    if (entry.sequence <= mind.processedLogSequence) continue;
    for (; heard < messages.length && messages[heard]!.logSequence < entry.sequence; heard++) {
      next = observeMessage(next, messages[heard]!, view, tuning);
    }
    next = observeSocialLogEntry(observeShipLogEntry(next, entry, tuning), entry, view, tuning);
  }
  for (; heard < messages.length; heard++) next = observeMessage(next, messages[heard]!, view, tuning);
  next = {
    ...next,
    observedRound: Math.max(next.observedRound, view.meta.currentRound),
    processedLogSequence: view.gameLog.at(-1)?.sequence ?? next.processedLogSequence,
    processedCommsSequence: view.comms.messages.at(-1)?.sequence ?? next.processedCommsSequence,
  };
  const verified = verifyClaims(next, next.observedRound, tuning);
  next = verified.verdicts.reduce((acc, verdict) => afterVerdict(acc, verdict, view, tuning), verified.mind);
  next = pruneOwnPromises(settleIntents(next, view, tuning), view);
  return onNewRounds(next, view, startRound, tuning);
}
