import type { BoardObject } from './entities.js';

export type RoomSlotCategory = 'SPECIAL' | 'ROOM_1' | 'ROOM_2';
export type RoomId = number; // 1..21
/** Состояния жетона Двери (стр. 14): открыта, закрыта, разрушена. */
export const DOOR_STATES = ['OPEN', 'CLOSED', 'DESTROYED'] as const;
export type DoorState = (typeof DOOR_STATES)[number];

/**
 * Следующее состояние Двери при переключении: OPEN → CLOSED → DESTROYED → OPEN
 * (стр. 14, жетон Двери двусторонний). Одно место для перехода: им пользуются
 * и движок, и dev-панель, поэтому подпись «станет закрыта» в интерфейсе
 * не разойдётся с поведением правил.
 */
export function nextDoorState(state: DoorState): DoorState {
  const index = DOOR_STATES.indexOf(state);

  return DOOR_STATES[(index + 1) % DOOR_STATES.length]!;
}
export type RoomColor = 'WHITE' | 'RED' | 'YELLOW' | 'GREEN';

export interface CorridorConnection {
  id: string;
  fromRoomId: RoomId;
  toRoomId: RoomId;
  fromNumbers: number[]; // Номера выхода из первой комнаты (напр. [1] или [3, 4])
  toNumbers: number[]; // Номера входа во вторую комнату
  doorState: DoorState;
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

export interface ExplorationToken {
  itemsCount: number;
  effect: 'SILENCE' | 'DANGER' | 'SLIME' | 'FIRE' | 'MALFUNCTION' | 'DOORS';
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
}
