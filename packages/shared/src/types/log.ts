import type { NoiseDieFace } from '../data/noiseDie.js';
import type { GameOverReason } from './state.js';
import type { ExplorationEffect, RoomId, RoomSlotCategory } from './rooms.js';

export type GameLogMovementMode = 'NORMAL' | 'CAREFUL';

export type GameLogNoiseTarget = { kind: 'CORRIDOR'; corridorId: string } | { kind: 'TECHNICAL_CORRIDOR' };

export type GameLogNoiseReason = 'ROLL' | 'CAREFUL' | 'DANGER';

export type GameLogNoiseSkippedReason = 'COMPANION' | 'EXPLORATION_SILENCE' | 'NOISE_SILENCE' | 'UNMAPPED_EXIT';

export type GameLogEffectOutcome =
  | 'FIRE_PLACED'
  | 'FIRE_ALREADY_PRESENT'
  | 'SHIP_EXPLODED'
  | 'MALFUNCTION_PLACED'
  | 'MALFUNCTION_ALREADY_PRESENT'
  | 'MALFUNCTION_FORBIDDEN'
  | 'HULL_BREACH'
  | 'SLIME_APPLIED'
  | 'SLIME_ALREADY_PRESENT'
  | 'DOOR_CLOSED'
  | 'DOOR_MOVED'
  | 'DOOR_ALREADY_CLOSED'
  | 'DOOR_DESTROYED'
  | 'DANGER_TRIGGERED'
  | 'SILENCE_RESOLVED';

export type GameLogEvent =
  | { type: 'GAME_STARTED' }
  | {
      type: 'PLAYER_MOVED';
      playerId: string;
      fromRoomId: RoomId;
      toRoomId: RoomId;
      corridorId: string;
      mode: GameLogMovementMode;
    }
  | {
      type: 'ROOM_DISCOVERED';
      playerId: string;
      roomId: RoomId;
      roomName: string;
      category: RoomSlotCategory;
    }
  | {
      type: 'EXPLORATION_TOKEN_REVEALED';
      playerId: string;
      roomId: RoomId;
      itemsCount: number;
      effect: ExplorationEffect;
    }
  | {
      type: 'EXPLORATION_EFFECT_RESOLVED';
      playerId: string;
      roomId: RoomId;
      effect: ExplorationEffect;
      outcome: GameLogEffectOutcome;
    }
  | {
      type: 'NOISE_ROLLED';
      playerId: string;
      roomId: RoomId;
      result: NoiseDieFace;
    }
  | {
      type: 'NOISE_MARKER_PLACED';
      playerId: string;
      roomId: RoomId;
      target: GameLogNoiseTarget;
      reason: GameLogNoiseReason;
    }
  | {
      type: 'NOISE_SKIPPED';
      playerId: string;
      roomId: RoomId;
      reason: GameLogNoiseSkippedReason;
    }
  | { type: 'GAME_OVER'; reason: GameOverReason }
  | {
      type: 'PLAYER_PASSED';
      playerId: string;
      discardedCount: number;
    }
  | {
      type: 'DEV_STATE_CHANGED';
      playerId: string;
      target: 'DOOR' | 'NOISE';
      corridorId: string;
      value: string | boolean;
    };

export interface GameLogEntry {
  id: string;
  sequence: number;
  event: GameLogEvent;
}
