import type { GameAction } from '../types/actions.js';
import type { RoomId } from '../types/rooms.js';
import type { SanitizedGameState, SanitizedPlayerState, SanitizedRoomState } from '../types/sanitized.js';
import type { BotTuning } from './botTuning.js';
import type { TaskDetail, TaskKind } from './botTasks.js';
import type { InjuryOdds } from './botHarm.js';
import { paymentFor, paymentValue } from './botHand.js';

export type CandidateKind =
  | 'MOVE'
  | 'CAREFUL_MOVE'
  | 'ESCAPE'
  | 'SEARCH'
  | 'SHOOT'
  | 'MELEE'
  | 'PICK_UP'
  | 'DROP'
  | 'ABILITY'
  | 'CARD'
  | 'EXCHANGE'
  | 'ITEM'
  | 'CRAFT'
  | 'COVERED_ESCAPE'
  | 'POD'
  | 'PASS';

export interface TaskEffect {
  kind: TaskKind;
  detail: TaskDetail;
}

export interface Neutralization {
  intruderId: string;
  chance: number;
  /** Раны попадания: к ним до конца раунда добавятся выстрелы, и Раны сложатся (стр. 20). */
  hit?: InjuryOdds;
}

/** Допустимое по срезу Действие и то, какие шаги повестки оно закрывает (В8-7-1). */
export interface Candidate {
  action: GameAction;
  kind: CandidateKind;
  effects: TaskEffect[];
  /** Где окажется бот после Действия: для Движения — Комната назначения. */
  roomId: RoomId;
  /** Ценность отданных карт оплаты. */
  spent: number;
  /** Сколько карт руки уйдёт на Действие: от остатка зависит, хватит ли карт на Побег до конца хода. */
  cardsUsed?: number;
  /** Насколько хорошо Действие делает своё дело (0–1): для атаки — шанс убрать Чужого из Комнаты. */
  quality?: number;
  /** Вред себе сразу, в долях гибели: промах Рукопашной, Граната или Коктейль в своей Комнате. */
  harmNow?: number;
  /** Шанс убрать каждого из Чужих (убить или заставить Отступить) этим Действием и Раны попадания, если оно ранит. */
  neutralizes?: readonly Neutralization[];
  /** Сколько Боезапаса уйдёт: оставшийся — выстрелы до конца раунда. */
  ammoUsed?: number;
  /** Комната за Дверью, которую Действие открывает: путь туда становится проходимым. */
  opensTo?: RoomId;
}

export interface CandidateContext {
  view: SanitizedGameState;
  botId: string;
  self: SanitizedPlayerState;
  room: SanitizedRoomState;
  inCombat: boolean;
  tuning: BotTuning;
}

/** Собирает кандидата с самой дешёвой оплатой; null — карт не хватает. */
export function paidCandidate(
  context: CandidateContext,
  kind: CandidateKind,
  cost: number,
  build: (discardCardIds: string[]) => GameAction,
  effects: TaskEffect[] = [],
  roomId: RoomId = context.self.roomId,
  excludeIds: readonly string[] = [],
): Candidate | null {
  const payment = paymentFor(context.view, context.botId, cost, context.tuning, excludeIds);
  if (!payment) return null;
  return {
    action: build(payment),
    kind,
    effects,
    roomId,
    spent: paymentValue(context.view, context.botId, payment, context.tuning),
    cardsUsed: payment.length,
  };
}

export function effect(kind: TaskKind, detail: TaskDetail = {}): TaskEffect {
  return { kind, detail };
}
