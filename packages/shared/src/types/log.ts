import type { NoiseDieFace } from '../data/noiseDie.js';
import type { CombatDieFace } from '../data/combatDie.js';
import type { GameOverReason } from './state.js';
import type { ExplorationEffect, RoomId, RoomSlotCategory } from './rooms.js';
import type { IntruderType } from './entities.js';

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
      type: 'ROUND_STARTED';
      round: number;
      firstPlayerId: string;
    }
  | {
      type: 'PLAYER_TURN_STARTED';
      playerId: string;
      round: number;
    }
  | {
      type: 'FIRE_DAMAGE_TAKEN';
      playerId: string;
      roomId: RoomId;
      woundsCount: number;
    }
  | {
      type: 'SEARCH_PERFORMED';
      playerId: string;
      roomId: RoomId;
    }
  | {
      type: 'ACTION_CARD_PLAYED';
      playerId: string;
      cardId: string;
      cardName: string;
    }
  | {
      type: 'ITEM_USED';
      playerId: string;
      itemId: string;
      itemName: string;
    }
  | {
      type: 'ROOM_ABILITY_USED';
      playerId: string;
      roomId: RoomId;
      roomDefinitionId: string;
      detail?: string;
    }
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
      type: 'EVENT_PHASE_SKIPPED';
      round: number;
    }
  | {
      type: 'DEV_STATE_CHANGED';
      playerId: string;
      target: 'DOOR' | 'NOISE';
      corridorId: string;
      value: string | boolean;
    }
  | {
      type: 'CONTACT_OCCURRED';
      playerId: string;
      roomId: RoomId;
      intruderId: string;
      intruderType: IntruderType;
      isSurpriseAttack: boolean;
    }
  | {
      type: 'COMBAT_ROUND_RESOLVED';
      playerId: string;
      intruderId: string;
      intruderType: IntruderType;
      damageDealt: number;
      combatDieResult: CombatDieFace['kind'];
      attackCardId?: string;
    }
  | {
      type: 'INTRUDER_FLED';
      intruderId: string;
      intruderType: IntruderType;
      fromRoomId: RoomId;
      toRoomId: RoomId;
    }
  | {
      type: 'INTRUDER_KILLED';
      playerId: string;
      intruderId: string;
      intruderType: IntruderType;
    }
  | {
      type: 'PLAYER_WOUND_RECEIVED';
      playerId: string;
      woundCardId: string;
      isSerious: boolean;
    }
  | {
      type: 'PLAYER_PANIC_STARTED';
      playerId: string;
      reason: 'INJURY' | 'ATTACK' | 'EFFECT';
    }
  | {
      type: 'PLAYER_PANIC_ENDED';
      playerId: string;
    }
  | {
      type: 'PLAYER_SHOCK_STARTED';
      playerId: string;
      shockLevel: number;
    }
  | {
      type: 'PLAYER_SHOCK_ENDED';
      playerId: string;
    };

export interface GameLogEntry {
  id: string;
  sequence: number;
  event: GameLogEvent;
}
