import type { ItemColor } from './cards.js';
import type { RoomId } from './rooms.js';
import type { CourseMarker, EngineNumber } from './state.js';

export type EngineInspectionSource = 'ENGINE_ROOM' | 'ENGINE_CONTROL';

export interface InspectedEngine {
  engineNumber: EngineNumber;
  isWorking: boolean;
}

export type RoomPeekSource = 'CARD' | 'OBSERVATION_ROOM';

export type ExchangeEntryKind = 'ITEM' | 'OBJECT';

/** Что перешло из рук в руки при Обмене (стр. 12). Инвентарь скрыт, слоты Рук видны всем. */
export interface ExchangedEntry {
  fromPlayerId: string;
  toPlayerId: string;
  kind: ExchangeEntryKind;
  name: string;
  color: ItemColor | null;
  fromHandSlot: boolean;
  /** Боезапас Оружия не передаётся (стр. 12): сколько маркеров снято при передаче. */
  ammoRemoved: number;
}

export type ShipSystemsLogEvent =
  | {
      type: 'ENGINES_INSPECTED';
      playerId: string;
      roomId: RoomId;
      source: EngineInspectionSource;
      engines: InspectedEngine[];
    }
  | { type: 'SLIME_ROOM_ENTERED'; playerId: string; roomId: RoomId; alreadyHadSlime: boolean }
  | { type: 'COORDINATES_INSPECTED'; playerId: string; roomId: RoomId; cardId: string }
  | { type: 'COURSE_SET'; playerId: string; roomId: RoomId; fromMarker: CourseMarker; toMarker: CourseMarker }
  | {
      type: 'DOORS_REARRANGED';
      playerId: string;
      roomId: RoomId;
      targetRoomId: RoomId;
      closedCorridorIds: string[];
      openedCorridorIds: string[];
    }
  | { type: 'DECOMPRESSION_STARTED'; playerId: string; roomId: RoomId; targetRoomId: RoomId; fireRemoved: boolean }
  | { type: 'DECOMPRESSION_CANCELLED'; targetRoomId: RoomId; corridorId: string }
  | {
      type: 'DECOMPRESSION_RESOLVED';
      targetRoomId: RoomId;
      startedBy: string | null;
      killedPlayerIds: string[];
      killedIntruderIds: string[];
    }
  | {
      type: 'EXCHANGE_PROPOSED';
      playerId: string;
      roomId: RoomId;
      exchangeId: string;
      participantIds: string[];
    }
  | {
      type: 'EXCHANGE_ANSWERED';
      playerId: string;
      exchangeId: string;
      accepted: boolean;
    }
  | {
      type: 'EXCHANGE_COMPLETED';
      playerId: string;
      roomId: RoomId;
      exchangeId: string;
      entries: ExchangedEntry[];
    };
