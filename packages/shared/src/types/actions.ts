import { RoomId } from './rooms';

export type GameAction =
  | { type: 'ACTION_MOVE'; payload: { targetRoomId: RoomId; discardCardIds: string[] } }
  | { type: 'ACTION_CAREFUL_MOVE'; payload: { targetRoomId: RoomId; chosenCorridorIndex: number; discardCardIds: string[] } }
  | { type: 'ACTION_SEARCH'; payload: { chosenDeckColor?: 'RED' | 'YELLOW' | 'GREEN'; discardCardIds: string[] } }
  | { type: 'ACTION_ROOM_ABILITY'; payload: { discardCardIds: string[]; extraArgs?: Record<string, unknown> } }
  | { type: 'ACTION_PASS'; payload: { discardCardIds?: string[] } }
  | { 
      type: 'ACTION_CLAIM'; 
      payload: { 
        target: 'ENGINE_1' | 'ENGINE_2' | 'ENGINE_3' | 'COORDINATES'; 
        declaredStatus: 'WORKING' | 'DAMAGED' | 'DESTINATION_EARTH' | 'DESTINATION_OTHER' | 'SILENCE';
      } 
    };

export interface ClaimEvent {
  id: string;
  authorPlayerId: string;
  target: 'ENGINE_1' | 'ENGINE_2' | 'ENGINE_3' | 'COORDINATES';
  declaredStatus: 'WORKING' | 'DAMAGED' | 'DESTINATION_EARTH' | 'DESTINATION_OTHER' | 'SILENCE';
  timestamp: number;
}