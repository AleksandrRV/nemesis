import type { BoardObject } from '../types/entities.js';
import type { RoomId } from '../types/rooms.js';
import type { CourseMarker, EngineNumber } from '../types/state.js';
import type { BotDesire } from './botTuning.js';

/** Шаг, который закрывает одно Действие бота: его ищет генератор, его ценит Utility (В8-7-2). */
export type TaskKind =
  | 'SEND_SIGNAL'
  | 'CHECK_ENGINE'
  | 'REPAIR_ENGINE'
  | 'DAMAGE_ENGINE'
  | 'CHECK_COORDINATES'
  | 'SET_COURSE'
  | 'HIBERNATE'
  | 'BOARD_POD'
  | 'LAUNCH_POD'
  | 'STAY_IN_POD'
  | 'EXPLORE'
  | 'PICK_UP'
  | 'TAKE_EGG'
  | 'STUDY'
  | 'DROP_OBJECT'
  | 'SEARCH'
  | 'SELF_DESTRUCT'
  | 'LOCK_POD'
  | 'UNLOCK_POD'
  | 'FIGHT'
  | 'HEAL'
  | 'TREAT_WOUND'
  | 'EXTINGUISH'
  | 'FIX_MALFUNCTION'
  | 'GIVE_ITEM'
  | 'RELOAD'
  | 'CLEANSE'
  | 'CURE'
  | 'SCAN_HAND'
  | 'SHIELD_ALLY'
  | 'SET_DOOR'
  | 'BREAK_DOOR'
  | 'CRAFT'
  | 'ESCORT'
  | 'OBSERVE';

export interface TaskDetail {
  engineNumber?: EngineNumber;
  marker?: CourseMarker;
  objectKind?: BoardObject['kind'];
  objectId?: string;
  playerId?: string;
  podId?: string;
  roomId?: RoomId;
  corridorId?: string;
  doorState?: 'OPEN' | 'CLOSED';
  itemId?: string;
}

/** Где выполняется шаг: известные Комнаты или тайлы, которые ещё предстоит найти. */
export interface TaskPlace {
  roomIds?: RoomId[];
  definitionIds?: string[];
}

export interface BotTask {
  kind: TaskKind;
  desire: BotDesire;
  weight: number;
  place: TaskPlace;
  detail: TaskDetail;
  /** Для Инспектора ботов и памяти: зачем этот шаг. */
  reason: string;
  /** Не успеть — погибнуть: каждый шаг к цели ценен целиком, а не долей пути. */
  lifeline?: boolean;
}

export function task(
  kind: TaskKind,
  desire: BotDesire,
  weight: number,
  place: TaskPlace,
  reason: string,
  detail: TaskDetail = {},
): BotTask {
  return { kind, desire, weight, place, detail, reason };
}

/** Действие закрывает шаг, если совпал вид и каждое поле детали, заданное шагом. */
export function detailMatches(expected: TaskDetail, actual: TaskDetail): boolean {
  return (Object.keys(expected) as (keyof TaskDetail)[]).every(
    (key) => expected[key] === undefined || expected[key] === actual[key],
  );
}
