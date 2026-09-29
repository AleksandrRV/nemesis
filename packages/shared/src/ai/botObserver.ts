import type { CommsMessage } from '../types/comms.js';
import type { SanitizedGameLogEntry, SanitizedGameState } from '../types/sanitized.js';
import {
  COURSE_CLAIM_DESTINATIONS,
  applyCoordinatesClaim,
  applyEngineClaim,
  certainEngine,
  claimWeight,
  engineKey,
  flipEngine,
  forgetKnowledge,
  knownCoordinates,
} from './botBeliefs.js';
import { botStream, effectiveKnobs } from './botCharacter.js';
import type { BotFact, BotMind } from './botMind.js';
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
function observeLogEntry(mind: BotMind, entry: SanitizedGameLogEntry, tuning: BotTuning): BotMind {
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
      let next = withFact(
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
      next = setEngine(next, event.engineNumber, () => certainEngine(isWorking, round, 'OWN_TOGGLE'));
      return event.orderChanged ? ownPendingAnnouncement(next, event.engineNumber, 1) : next;
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
  if (message.kind === 'SYSTEM') {
    const engineNumber = message.body.engineNumber;
    if ((next.pendingOwnAnnouncements[String(engineNumber)] ?? 0) > 0)
      return ownPendingAnnouncement(next, engineNumber, -1);
    return setEngine(
      withFact(next, { kind: 'ENGINE_ORDER_CHANGED', round: message.round, engineNumber }, tuning),
      engineNumber,
      flipEngine,
    );
  }
  if (message.kind !== 'CLAIM' || message.authorId === mind.botId) return next;
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

/** Смена раунда: «Склеротик» может забыть точные знания; бросок — личным потоком `ai`. */
function forgetOnNewRounds(mind: BotMind, before: number, tuning: BotTuning): BotMind {
  const rounds = mind.observedRound - before;
  const chance =
    effectiveKnobs(mind.character, mind.difficulty, tuning).forgetChance * tuning.memory.forgetChancePerRound;
  if (rounds <= 0 || chance <= 0) return mind;
  const stream = botStream(mind.seed, mind.rngDraws);
  let next = mind;
  for (let round = 0; round < rounds; round++) next = forgetKnowledge(next, chance, stream.rng);
  return { ...next, rngDraws: stream.used() };
}

/**
 * Наблюдатель (план 0.8.0, В8-5-4): новые записи журнала и Рации в памяти бота — только из его среза.
 * Функция чистая: память на входе не меняется.
 */
export function observe(view: SanitizedGameState, mind: BotMind, tuning: BotTuning = BOT_TUNING): BotMind {
  const startRound = mind.observedRound;
  let next = mind;
  for (const entry of view.gameLog) {
    if (entry.sequence > next.processedLogSequence) next = observeLogEntry(next, entry, tuning);
  }
  for (const message of view.comms.messages) {
    if (message.sequence > next.processedCommsSequence) next = observeMessage(next, message, view, tuning);
  }
  next = {
    ...next,
    observedRound: Math.max(next.observedRound, view.meta.currentRound),
    processedLogSequence: view.gameLog.at(-1)?.sequence ?? next.processedLogSequence,
    processedCommsSequence: view.comms.messages.at(-1)?.sequence ?? next.processedCommsSequence,
  };
  return forgetOnNewRounds(next, startRound, tuning);
}
