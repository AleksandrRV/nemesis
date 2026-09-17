import { RoomId, RoomState, CorridorConnection } from './rooms';
import { IntruderToken, IntruderEntity, PlayerState } from './entities';
import { ClaimEvent } from './actions';

export interface GameState {
  meta: {
    seed: string;
    gameMode: 'SOLO' | 'COOP' | 'SEMI_COOP';
    currentRound: number;
    phase: 'PLAYER_PHASE' | 'EVENT_PHASE' | 'GAME_OVER';
    activePlayerId: string;
    firstPlayerId: string;
    timeTrackPosition: number; // 0..15 (0 = 15 раунд, 15 = 0 красный прыжок)
    selfDestructTrackPosition: number | null; // 0..8 (8 = череп)
  };
  ship: {
    rooms: Record<RoomId, RoomState>;
    corridors: Record<string, CorridorConnection>;
    technicalCorridorNoise: boolean;
    engines: {
      1: { topWorking: boolean; bottomWorking: boolean };
      2: { topWorking: boolean; bottomWorking: boolean };
      3: { topWorking: boolean; bottomWorking: boolean };
    };
    coordinates: {
      destination: 'EARTH' | 'MARS' | 'DEEP_SPACE_1' | 'DEEP_SPACE_2';
      currentCourseMarker: 'A' | 'B' | 'C' | 'D';
    };
    escapePods: Record<string, { id: string; section: 'A' | 'B'; isLocked: boolean; occupantIds: string[] }>;
  };
  intrudersPool: {
    bag: IntruderToken[];
    boardEntities: IntruderEntity[];
    deadEntities: IntruderEntity[];
    eggsCountOnBoard: number;
  };
  players: Record<string, PlayerState>;
  claimsLog: ClaimEvent[];
}

export type SanitizedGameState = GameState;