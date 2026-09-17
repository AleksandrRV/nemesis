import type { BoardObject } from './entities.js';

export type RoomSlotCategory = 'SPECIAL' | 'ROOM_1' | 'ROOM_2';
export type RoomId = number; // 1..21
/** Состояния жетона Двери (стр. 14): открыта, закрыта, разрушена. */
export const DOOR_STATES = ['OPEN', 'CLOSED', 'DESTROYED'] as const;
export type DoorState = (typeof DOOR_STATES)[number];

/** Номера Коридоров, напечатанные на поле: по ним разыгрывается бросок кубика Шума (стр. 15). */
export const CORRIDOR_NUMBERS = [1, 2, 3, 4] as const;
export type CorridorNumber = (typeof CORRIDOR_NUMBERS)[number];

/** Особые эффекты жетонов Исследования (стр. 14–15). */
export const EXPLORATION_EFFECTS = ['SILENCE', 'DANGER', 'SLIME', 'FIRE', 'MALFUNCTION', 'DOORS'] as const;
export type ExplorationEffect = (typeof EXPLORATION_EFFECTS)[number];

/**
 * Следующее состояние Двери при переключении: OPEN → CLOSED → DESTROYED.
 *
 * Разрушенная Дверь — терминальное состояние: снова закрыть её нельзя
 * (стр. 17), поэтому DESTROYED остаётся собой, а не возвращается к OPEN.
 * Одно место для перехода: им пользуются и движок, и dev-панель, поэтому
 * подпись «станет разрушена» в интерфейсе не разойдётся с правилами.
 */
export function nextDoorState(state: DoorState): DoorState {
  if (state === 'DESTROYED') return 'DESTROYED';

  return state === 'OPEN' ? 'CLOSED' : 'DESTROYED';
}

/**
 * Коридор, выбранный для маркера Шума при «Осторожном движении» (стр. 13):
 * конкретный Коридор, ведущий в отсек, либо поле Технических Коридоров, если
 * в отсеке есть Вход (стр. 15–16).
 */
export type CarefulMoveChosenCorridor = { kind: 'CORRIDOR'; corridorId: string } | { kind: 'TECHNICAL_CORRIDOR' };

export type RoomColor = 'WHITE' | 'RED' | 'YELLOW' | 'GREEN';

export interface CorridorConnection {
  id: string;
  fromRoomId: RoomId;
  toRoomId: RoomId;
  fromNumbers: CorridorNumber[]; // Номера выхода из первой комнаты (напр. [1] или [3, 4])
  toNumbers: CorridorNumber[]; // Номера входа во вторую комнату
  doorState: DoorState;
  /** Маркер Шума: больше одного в один Коридор не кладётся (стр. 15). */
  hasNoise: boolean;
}

export interface RoomDefinition {
  id: string;
  name: string;
  category: RoomSlotCategory;
  color: RoomColor;
  hasComputer: boolean;
  actionCost: number;
  actionDescription: string;
}

/**
 * Жетон Исследования: лежит рубашкой вверх в неисследованном отсеке (стр. 6,
 * шаг 4). Число предметов хранится и в отсеке (`RoomState.itemsCount`), потому
 * что счётчик предметов печатается на поле, а эффект — только на жетоне.
 */
export interface ExplorationToken {
  itemsCount: number;
  effect: ExplorationEffect;
}

export interface RoomState {
  id: RoomId;
  definitionId: string | null;
  category: RoomSlotCategory;
  isExplored: boolean;
  itemsCount: number;
  hasComputer: boolean;
  hasFire: boolean;
  hasMalfunction: boolean;
  hasDecompressionToken: boolean;
  hasTechnicalCorridorEntrance: boolean;
  occupantPlayerIds: string[];
  occupantIntruderIds: string[];
  /** Тяжёлые объекты на полу: Труп, Яйцо, Останки (стр. 22). */
  objects: BoardObject[];
  /**
   * Эффект жетона Исследования: до вскрытия тайла он скрыт, а после розыгрыша
   * жетон удаляется из игры (стр. 14–15), поэтому у открытого отсека эффекта нет.
   */
  explorationEffect: ExplorationEffect | null;
}
