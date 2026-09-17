export type RoomSlotCategory = 'SPECIAL' | 'ROOM_1' | 'ROOM_2';
export type RoomId = number; // 1..21
export type DoorState = 'OPEN' | 'CLOSED' | 'DESTROYED';
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
  hasSlime: boolean;
  hasDecompressionToken: boolean;
  hasTechnicalCorridorEntrance: boolean;
  occupantPlayerIds: string[];
  occupantIntruderIds: string[];
  droppedObjectIds: string[];
}
