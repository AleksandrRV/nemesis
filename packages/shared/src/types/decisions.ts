import type { ItemDeckColor } from './cards.js';
import type { RoomId } from './rooms.js';

export type PendingDecision =
  | {
      id: string;
      playerId: string;
      type: 'CHOOSE_SEARCH_ITEM';
      drawnCardIds: string[];
      sourceDeck: ItemDeckColor;
      roomId: RoomId;
    }
  | {
      id: string;
      playerId: string;
      type: 'CHOOSE_WHITE_ROOM_DECK';
      roomId: RoomId;
    }
  | {
      id: string;
      playerId: string;
      type: 'DISCARD_HEAVY_ITEM_FOR_NEW';
      newItemId: string;
    }
  | {
      id: string;
      playerId: string;
      type: 'ROOM_FIRE_CONTROL_TARGET';
      roomId: RoomId;
    }
  | {
      id: string;
      playerId: string;
      type: 'ROOM_GENERATOR_ACTION';
      currentSelfDestructActive: boolean;
    }
  | {
      id: string;
      playerId: string;
      type: 'CHOOSE_REST_CONTAMINATION_DISCARD';
      scannedCardIds: string[];
    };
