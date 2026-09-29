import type { CommsMessage, CommsRequestTopic } from '../types/comms.js';
import type { SanitizedGameLogEvent, SanitizedGameState } from '../types/sanitized.js';
import { effectiveKnobs } from './botCharacter.js';
import { distanceBetween, intentTargetRooms, isAdjacentOrSame, corridorTouchesRoom } from './botGraph.js';
import type { BotMind, TrackedIntent } from './botMind.js';
import { observeTargeting } from './botObjectives.js';
import { withEvidence } from './botSocial.js';
import type { BotTuning, SocialSignal } from './botTuning.js';

export interface DeedSignal {
  playerId: string;
  signal: SocialSignal;
}

const MORALE_HELP: Partial<Record<SocialSignal, 'helpReceived' | 'promiseKeptForMe'>> = {
  GAVE_ITEM: 'helpReceived',
  KILLED_INTRUDER_NEAR_ME: 'helpReceived',
  OPENED_DOOR_ON_REQUEST: 'promiseKeptForMe',
  KEPT_PROMISE_TO_ME: 'promiseKeptForMe',
};

const HARM_TO_ME: ReadonlySet<SocialSignal> = new Set([
  'CLOSED_DOOR_ON_ME',
  'FIRE_IN_MY_ROOM',
  'DECOMPRESSED_MY_ROOM',
  'LEFT_WITHOUT_ME',
  'BROKE_PROMISE_TO_ME',
]);

const HARM_TO_ALL: ReadonlySet<SocialSignal> = new Set([
  'STARTED_SELF_DESTRUCT',
  'LOCKED_POD',
  'DAMAGED_ENGINE_AFTER_REPAIR_CLAIM',
]);

function myRoom(view: SanitizedGameState, mind: BotMind): number | null {
  return view.players[mind.botId]?.roomId ?? null;
}

function intrudersNear(view: SanitizedGameState, roomId: number): boolean {
  return Object.values(view.ship.rooms).some(
    (room) => room.occupantIntruderIds.length > 0 && isAdjacentOrSame(view, roomId, room.id),
  );
}

/** Поступки из журнала, которые бот принимает на свой счёт или как общее благо (В8-6-1). */
export function deedSignalsOf(event: SanitizedGameLogEvent, view: SanitizedGameState, mind: BotMind): DeedSignal[] {
  const room = myRoom(view, mind);
  const self = mind.botId;
  const from = (playerId: string | null, signal: SocialSignal): DeedSignal[] =>
    playerId && playerId !== self ? [{ playerId, signal }] : [];
  switch (event.type) {
    case 'DOOR_CHANGED':
      return event.to === 'CLOSED' &&
        room !== null &&
        corridorTouchesRoom(view, event.corridorId, room) &&
        intrudersNear(view, room)
        ? from(event.playerId, 'CLOSED_DOOR_ON_ME')
        : [];
    case 'FIRE_STARTED':
      return event.roomId === room ? from(event.playerId, 'FIRE_IN_MY_ROOM') : [];
    case 'DECOMPRESSION_STARTED':
      return event.targetRoomId === room ? from(event.playerId, 'DECOMPRESSED_MY_ROOM') : [];
    case 'SELF_DESTRUCT_TOGGLED':
      return event.isActive ? from(event.playerId, 'STARTED_SELF_DESTRUCT') : [];
    case 'ESCAPE_POD_TOGGLED':
      return event.isLocked ? from(event.playerId, 'LOCKED_POD') : [];
    case 'FIRE_EXTINGUISHED':
      return from(event.playerId, 'EXTINGUISHED_FIRE');
    case 'INTRUDER_KILLED':
      return room !== null && isAdjacentOrSame(view, room, event.roomId)
        ? from(event.playerId, 'KILLED_INTRUDER_NEAR_ME')
        : [];
    case 'EXCHANGE_COMPLETED':
      return event.entries
        .filter((entry) => entry.toPlayerId === self)
        .flatMap((entry) => from(entry.fromPlayerId, 'GAVE_ITEM'));
    default:
      return [];
  }
}

/** Сигнал ложится в шкалу помощи и вреда, двигает мораль бота и подсказывает, против кого чужая Цель. */
export function applySignal(mind: BotMind, deed: DeedSignal, view: SanitizedGameState, tuning: BotTuning): BotMind {
  const model = mind.players[deed.playerId];
  if (!model) return mind;
  const knobs = effectiveKnobs(mind.character, mind.difficulty, tuning);
  const base = tuning.socialSignals[deed.signal];
  const weight = deed.signal === 'REFUSED_MY_REQUEST' ? base * knobs.refusalResentment : base;
  let next: BotMind = {
    ...mind,
    players: {
      ...mind.players,
      [deed.playerId]: withEvidence(model, 'GOODWILL', weight, deed.signal, mind.observedRound, tuning),
    },
  };
  const helpKind = MORALE_HELP[deed.signal];
  if (helpKind) next = { ...next, pendingMorale: next.pendingMorale + tuning.morale[helpKind] };
  if (HARM_TO_ME.has(deed.signal) || HARM_TO_ALL.has(deed.signal)) {
    next = { ...next, pendingMorale: next.pendingMorale + tuning.morale.harmReceived };
  }
  const myNumber = view.players[mind.botId]?.orderNumber;
  if (HARM_TO_ME.has(deed.signal) && myNumber !== undefined) {
    next = observeTargeting(next, deed.playerId, myNumber, tuning.objectives.harmLikelihood);
  }
  return next;
}

type RequestMessage = Extract<CommsMessage, { kind: 'REQUEST' }>;

function requestOfCommitment(view: SanitizedGameState, commitmentId: string): RequestMessage | null {
  const commitment = view.comms.commitments.find((candidate) => candidate.id === commitmentId);
  const request = commitment && view.comms.messages.find((message) => message.id === commitment.requestId);
  return request?.kind === 'REQUEST' ? request : null;
}

function signalForRequester(topic: CommsRequestTopic, fulfilled: boolean): SocialSignal | null {
  if (fulfilled) {
    if (topic.topic === 'SET_DOOR') return 'OPENED_DOOR_ON_REQUEST';
    return topic.topic === 'NEED_ITEM' ? null : 'KEPT_PROMISE_TO_ME';
  }
  return topic.topic === 'WAIT_IN_POD' ? 'LEFT_WITHOUT_ME' : 'BROKE_PROMISE_TO_ME';
}

/** Исход обещания (публичный журнал): надёжность помощника у всех наблюдателей, сигнал — у просившего. */
export function observeCommitment(
  mind: BotMind,
  event: Extract<SanitizedGameLogEvent, { type: 'COMMITMENT_RESOLVED' }>,
  view: SanitizedGameState,
  tuning: BotTuning,
): BotMind {
  const request = requestOfCommitment(view, event.commitmentId);
  let next: BotMind =
    event.helperId === mind.botId && request
      ? { ...mind, ownPromises: mind.ownPromises.filter((promise) => promise.requestId !== request.id) }
      : mind;
  const helper = next.players[event.helperId];
  if (helper) {
    const weight =
      event.status === 'FULFILLED'
        ? tuning.trust.deedWeight
        : event.status === 'BROKEN'
          ? -tuning.trust.deedWeight
          : -tuning.trust.deedWeight * tuning.trust.expiredPromiseWeight;
    const reason =
      event.status === 'FULFILLED'
        ? 'PROMISE_FULFILLED'
        : event.status === 'BROKEN'
          ? 'PROMISE_BROKEN'
          : 'PROMISE_EXPIRED';
    next = {
      ...next,
      players: {
        ...next.players,
        [event.helperId]: withEvidence(helper, 'RELIABILITY', weight, reason, next.observedRound, tuning),
      },
    };
  }
  if (event.requesterId !== mind.botId || !request || event.status === 'EXPIRED') return next;
  const signal = signalForRequester(request.body, event.status === 'FULFILLED');
  return signal ? applySignal(next, { playerId: event.helperId, signal }, view, tuning) : next;
}

/** Шаг к другому игроку вплотную — слабая улика в пользу Цели «Персонаж Игрока N не должен выжить». */
export function observePursuit(
  mind: BotMind,
  event: Extract<SanitizedGameLogEvent, { type: 'PLAYER_MOVED' }>,
  view: SanitizedGameState,
  tuning: BotTuning,
): BotMind {
  if (event.playerId === mind.botId || !mind.objectiveGuesses[event.playerId]) return mind;
  let next = mind;
  for (const other of Object.values(view.players)) {
    if (other.id === event.playerId || other.isDead) continue;
    const before = distanceBetween(view, event.fromRoomId, [other.roomId]);
    const after = distanceBetween(view, event.toRoomId, [other.roomId]);
    if (after < before && after <= 1) {
      next = observeTargeting(next, event.playerId, other.orderNumber, tuning.objectives.pursuitLikelihood);
    }
  }
  return next;
}

export function trackIntent(
  mind: BotMind,
  message: Extract<CommsMessage, { kind: 'INTENT' }>,
  view: SanitizedGameState,
): BotMind {
  const author = view.players[message.authorId];
  if (!author || message.authorId === mind.botId) return mind;
  const targetRoomIds = intentTargetRooms(view, message.body);
  const startDistance = distanceBetween(view, author.roomId, targetRoomIds);
  if (!Number.isFinite(startDistance) || startDistance === 0) return mind;
  const intent: TrackedIntent = {
    messageId: message.id,
    authorId: message.authorId,
    round: message.round,
    targetRoomIds,
    startDistance,
  };
  return { ...mind, intents: [...mind.intents, intent] };
}

/** Намерение исполнено, если за окно раундов автор приблизился к цели по графу (В8-6-1). */
export function settleIntents(mind: BotMind, view: SanitizedGameState, tuning: BotTuning): BotMind {
  let players = mind.players;
  const open: TrackedIntent[] = [];
  for (const intent of mind.intents) {
    const author = view.players[intent.authorId];
    const model = players[intent.authorId];
    if (!author || !model || author.isDead) continue;
    const distance = distanceBetween(view, author.roomId, intent.targetRoomIds);
    const kept = distance < intent.startDistance;
    if (!kept && mind.observedRound - intent.round < tuning.trust.intentWindowRounds) {
      open.push(intent);
      continue;
    }
    const weight = kept ? tuning.trust.wordWeight : -tuning.trust.wordWeight;
    players = {
      ...players,
      [intent.authorId]: withEvidence(
        model,
        'RELIABILITY',
        weight,
        kept ? 'INTENT_KEPT' : 'INTENT_ABANDONED',
        mind.observedRound,
        tuning,
      ),
    };
  }
  return { ...mind, intents: open, players };
}
