import type { CommsDraft, CommsMessage, CommsRequestTopic } from '../types/comms.js';
import type { RoomId } from '../types/rooms.js';
import type { SanitizedGameState } from '../types/sanitized.js';
import { effectiveKnobs } from './botCharacter.js';
import { distanceBetween, roomsWithDefinition } from './botGraph.js';
import type { BotMind, OwnPromise } from './botMind.js';
import { ownObjectiveConflict, threatFrom } from './botObjectives.js';
import { othersSuccessWeight, scaleMean, trustIn } from './botSocial.js';
import type { BotTuning } from './botTuning.js';

type RequestMessage = Extract<CommsMessage, { kind: 'REQUEST' }>;

export interface RequestAssessment {
  requestId: string;
  answer: 'WILL_HELP' | 'CANNOT' | null;
  sincere: boolean;
  utility: number;
}

/** Где исполняется Просьба: к этим Комнатам боту придётся идти. */
function requestTargetRooms(view: SanitizedGameState, request: RequestMessage): RoomId[] {
  const topic = request.body;
  switch (topic.topic) {
    case 'HELP_KILL':
    case 'EXTINGUISH':
      return [topic.roomId];
    case 'CHECK_ENGINE':
      return roomsWithDefinition(view, [`ENGINE_0${topic.engineNumber}`]);
    case 'CHECK_COORDINATES':
      return roomsWithDefinition(view, ['COCKPIT']);
    case 'SET_DOOR': {
      const corridor = view.ship.corridors[topic.corridorId];
      return corridor ? [corridor.fromRoomId, corridor.toRoomId] : [];
    }
    case 'WAIT_IN_POD': {
      const pod = view.ship.escapePods[topic.podId];
      return pod ? roomsWithDefinition(view, [`ESCAPE_POD_${pod.section}`]) : [];
    }
    case 'NEED_ITEM': {
      const requester = view.players[request.authorId];
      return requester ? [requester.roomId] : [];
    }
    case 'NO_SELF_DESTRUCT':
      return [];
  }
}

function hasItemsToGive(view: SanitizedGameState, botId: string): boolean {
  const self = view.players[botId];
  return Boolean(self && ((self.inventory?.length ?? 0) > 0 || self.handSlots.some((slot) => slot.source === 'ITEM')));
}

/** Своя выгода от помощи: тушить и убивать рядом с собой, узнать корабль, не взрывать его без своей Цели. */
function selfBenefit(view: SanitizedGameState, mind: BotMind, topic: CommsRequestTopic, tuning: BotTuning): number {
  const benefit = tuning.requests.benefit[topic.topic];
  const myRoom = view.players[mind.botId]?.roomId;
  switch (topic.topic) {
    case 'EXTINGUISH':
    case 'HELP_KILL':
      return topic.roomId === myRoom ? benefit / 2 : 0;
    case 'CHECK_ENGINE':
    case 'CHECK_COORDINATES':
      return benefit / 2;
    case 'NO_SELF_DESTRUCT':
      return ownObjectiveConflict(view, mind.botId) ? 0 : benefit;
    default:
      return 0;
  }
}

/** Своя цена: путь, риск и расставание с Предметом; невозможная помощь стоит бесконечно. */
function ownCost(view: SanitizedGameState, mind: BotMind, request: RequestMessage, tuning: BotTuning): number {
  const topic = request.body;
  const knobs = effectiveKnobs(mind.character, mind.difficulty, tuning);
  const self = view.players[mind.botId];
  if (!self) return Number.POSITIVE_INFINITY;
  if (topic.topic === 'NEED_ITEM' && !hasItemsToGive(view, mind.botId)) return Number.POSITIVE_INFINITY;
  if (topic.topic === 'NO_SELF_DESTRUCT') return ownObjectiveConflict(view, mind.botId) ? 1 : 0;
  const distance = distanceBetween(view, self.roomId, requestTargetRooms(view, request));
  if (!Number.isFinite(distance)) return Number.POSITIVE_INFINITY;
  const base = tuning.requests.baseCost[topic.topic];
  const risky = topic.topic === 'HELP_KILL' || topic.topic === 'EXTINGUISH' ? knobs.riskAversion : 1;
  const itemFactor = topic.topic === 'NEED_ITEM' ? knobs.itemHoarding / Math.max(knobs.itemGenerosity, 0.01) : 1;
  return base * risky * itemFactor + tuning.requests.costPerHop * distance;
}

function disposedToDeceive(mind: BotMind, tuning: BotTuning): boolean {
  const knobs = effectiveKnobs(mind.character, mind.difficulty, tuning);
  return knobs.lieThreshold < 1 || knobs.harmWillingness > 1;
}

/**
 * Ответ на Просьбу (В8-6-6): польза просящему × вес морали × доверие − своя цена. «Помогу» — только если бот
 * правда собирается, либо это сознательный обман лжеца, социопата или психопата. Подозреваемого во вражде
 * бот в Капсуле не ждёт.
 */
export function assessRequest(
  view: SanitizedGameState,
  mind: BotMind,
  request: RequestMessage,
  tuning: BotTuning,
): RequestAssessment {
  const model = mind.players[request.authorId];
  const refuse = (utility: number): RequestAssessment => ({
    requestId: request.id,
    answer: request.to === mind.botId ? 'CANNOT' : null,
    sincere: true,
    utility,
  });
  if (!model) return refuse(Number.NEGATIVE_INFINITY);
  const threat = threatFrom(mind, view, request.authorId);
  const suspected = threat > tuning.objectives.suspicionThreshold;
  if (request.body.topic === 'WAIT_IN_POD' && suspected) return refuse(Number.NEGATIVE_INFINITY);
  const knobs = effectiveKnobs(mind.character, mind.difficulty, tuning);
  const altruism = othersSuccessWeight(mind.character, mind.difficulty, tuning);
  const reciprocity = knobs.reciprocityWeight * (scaleMean(model.goodwill) - 0.5);
  const benefit = tuning.requests.benefit[request.body.topic];
  const helpWeight = Math.max(0, tuning.requests.baseGoodwill + altruism + reciprocity);
  const wariness = suspected ? 1 - threat : 1;
  const valueToRequester = benefit * helpWeight * trustIn(model, tuning) * (1 - model.skepticism) * wariness;
  const utility =
    valueToRequester + selfBenefit(view, mind, request.body, tuning) - ownCost(view, mind, request, tuning);
  if (utility > 0) return { requestId: request.id, answer: 'WILL_HELP', sincere: true, utility };
  const deceptionGain = (threat - altruism) * benefit - tuning.requests.brokenPromiseReputationCost;
  const threshold = tuning.lying.benefitThreshold * knobs.lieThreshold;
  if (disposedToDeceive(mind, tuning) && deceptionGain > threshold) {
    return { requestId: request.id, answer: 'WILL_HELP', sincere: false, utility };
  }
  return refuse(utility);
}

function answeredBy(view: SanitizedGameState, botId: string, requestId: string): boolean {
  return view.comms.messages.some(
    (message) => message.kind === 'ANSWER' && message.authorId === botId && message.body.requestId === requestId,
  );
}

export function openRequestsFor(view: SanitizedGameState, botId: string): RequestMessage[] {
  return view.comms.messages.filter(
    (message): message is RequestMessage =>
      message.kind === 'REQUEST' &&
      message.authorId !== botId &&
      (message.to === 'ALL' || message.to === botId) &&
      view.meta.currentRound <= message.expiresAtRound &&
      view.players[message.authorId]?.isDead === false &&
      !answeredBy(view, botId, message.id),
  );
}

/** Ответы на Просьбы в свой ход: вне лимитов Рации (Р-9). Свои обещания бот запоминает вместе с искренностью. */
export function answerRequests(
  view: SanitizedGameState,
  mind: BotMind,
  tuning: BotTuning,
): { mind: BotMind; speech: CommsDraft[] } {
  if (view.meta.activePlayerId !== mind.botId || view.players[mind.botId]?.isDead !== false) {
    return { mind, speech: [] };
  }
  const speech: CommsDraft[] = [];
  const promises: OwnPromise[] = [];
  for (const request of openRequestsFor(view, mind.botId)) {
    const assessment = assessRequest(view, mind, request, tuning);
    if (!assessment.answer) continue;
    speech.push({ kind: 'ANSWER', body: { topic: 'ANSWER', requestId: request.id, answer: assessment.answer } });
    if (assessment.answer === 'WILL_HELP') {
      promises.push({
        requestId: request.id,
        requesterId: request.authorId,
        topic: request.body.topic,
        round: view.meta.currentRound,
        sincere: assessment.sincere,
      });
    }
  }
  return { mind: { ...mind, ownPromises: [...mind.ownPromises, ...promises] }, speech };
}

/** Обещание, чья Просьба истекла, снимается. */
export function pruneOwnPromises(mind: BotMind, view: SanitizedGameState): BotMind {
  const ownPromises = mind.ownPromises.filter((promise) => {
    const request = view.comms.messages.find((message) => message.id === promise.requestId);
    return request?.kind === 'REQUEST' && view.meta.currentRound <= request.expiresAtRound;
  });
  return ownPromises.length === mind.ownPromises.length ? mind : { ...mind, ownPromises };
}
