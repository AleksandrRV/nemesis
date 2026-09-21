import type { CombatDieFace } from '../data/combatDie.js';
import type { NoiseDieFace } from '../data/noiseDie.js';
import type { BoardObject, IntruderToken, IntruderType } from './entities.js';
import type { GameOverReason } from './state.js';
import type { ExplorationEffect, RoomId, RoomSlotCategory } from './rooms.js';

export type GameLogMovementMode = 'NORMAL' | 'CAREFUL';

export type GameLogNoiseTarget = { kind: 'CORRIDOR'; corridorId: string } | { kind: 'TECHNICAL_CORRIDOR' };

export type GameLogNoiseReason = 'ROLL' | 'CAREFUL' | 'DANGER' | 'BLANK';

/** Чем закончилась разыгранная Внезапная атака для атакованного персонажа. */
export type SurpriseAttackOutcome = 'MISSED' | 'HIT_SURVIVED' | 'HIT_DIED' | 'LARVA_INFECTION';

/** Исход внеочередной атаки при Побеге: процедура та же, что у Внезапной (стр. 20). */
export type EscapeAttackOutcome = SurpriseAttackOutcome;

/**
 * Снимок карты Атаки, вытянутой для проверки Стойкости: сама карта уходит
 * в сброс, а журнал хранит только нужное для разбора (стр. 18).
 */
export interface ToughnessCheckCardSnapshot {
  id: string;
  name: string;
  toughness: number;
  hasRetreat: boolean;
}

/** От чего погиб персонаж. Пока только атаки Чужих; остальные причины — следующие этапы. */
export type PlayerDeathCause = 'INTRUDER_ATTACK';

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
  | {
      type: 'CONTACT_OCCURRED';
      playerId: string;
      roomId: RoomId;
      tokenType: IntruderToken['type'];
      escapeNumber: number;
      handCount: number;
      isFirstContact: boolean;
      clearedCorridorIds: string[];
      clearedTechnical: boolean;
    }
  | {
      type: 'SURPRISE_ATTACK_TRIGGERED';
      playerId: string;
      intruderId: string;
      intruderType: IntruderType;
      handCount: number;
      escapeNumber: number;
    }
  | {
      type: 'SURPRISE_ATTACK_RESOLVED';
      playerId: string;
      intruderId: string;
      intruderType: IntruderType;
      attackCardId: string | null;
      attackCardName: string | null;
      hit: boolean;
      outcome: SurpriseAttackOutcome;
      lightWoundsDealt: number;
      seriousWoundsDealt: number;
      contaminationDealt: number;
    }
  | {
      type: 'ESCAPE_ATTACK_RESOLVED';
      playerId: string;
      intruderId: string;
      intruderType: IntruderType;
      attackCardId: string | null;
      attackCardName: string | null;
      hit: boolean;
      outcome: EscapeAttackOutcome;
      lightWoundsDealt: number;
      seriousWoundsDealt: number;
      contaminationDealt: number;
    }
  | {
      type: 'INTRUDER_TRANSFORMED';
      roomId: RoomId;
      oldIntruderId: string;
      newIntruderId: string;
    }
  | {
      type: 'INTRUDER_CALLED';
      roomId: RoomId;
      intruderId: string | null;
      tokenType: IntruderToken['type'];
    }
  | {
      type: 'SHOT_FIRED';
      playerId: string;
      roomId: RoomId;
      intruderId: string;
      intruderType: IntruderType;
      weaponId: string;
      weaponName: string;
      dieFace: CombatDieFace;
      woundsDealt: number;
    }
  | {
      type: 'TOUGHNESS_CHECKED';
      playerId: string;
      roomId: RoomId;
      intruderId: string;
      intruderType: IntruderType;
      attackCards: ToughnessCheckCardSnapshot[];
      woundsTotal: number;
      killed: boolean;
      retreated: boolean;
    }
  | {
      type: 'INTRUDER_KILLED';
      playerId: string;
      roomId: RoomId;
      intruderId: string;
      intruderType: IntruderType;
    }
  | {
      type: 'INTRUDER_RETREATED';
      playerId: string;
      intruderId: string;
      intruderType: IntruderType;
      fromRoomId: RoomId;
      toRoomId: RoomId;
    }
  | {
      type: 'MELEE_ATTACKED';
      playerId: string;
      roomId: RoomId;
      intruderId: string;
      intruderType: IntruderType;
      dieFace: CombatDieFace;
      woundsDealt: number;
      contaminationDealt: number;
      seriousWoundDealt: number;
    }
  | {
      type: 'OBJECT_PICKED_UP';
      playerId: string;
      roomId: RoomId;
      objectId: string;
      objectKind: BoardObject['kind'];
    }
  | {
      type: 'PLAYER_DIED';
      playerId: string;
      roomId: RoomId;
      cause: PlayerDeathCause;
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
    };

export interface GameLogEntry {
  id: string;
  sequence: number;
  event: GameLogEvent;
}
