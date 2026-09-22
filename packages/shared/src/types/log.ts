import type { IntruderLogEvent } from './contact.js';
import type { NoiseDieFace } from '../data/noiseDie.js';
import type { GameOverReason } from './state.js';
import type { IntruderType } from './entities.js';
import type { ExplorationEffect, RoomId, RoomSlotCategory } from './rooms.js';

export type GameLogMovementMode = 'NORMAL' | 'CAREFUL';

export type GameLogNoiseTarget = { kind: 'CORRIDOR'; corridorId: string } | { kind: 'TECHNICAL_CORRIDOR' };

export type GameLogNoiseReason = 'ROLL' | 'CAREFUL' | 'DANGER' | 'BLANK';

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
  | IntruderLogEvent
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
      /** Классовая карта добрала карту Действия («Адреналин», Шаг 8). */
      type: 'ACTION_CARD_DRAWN';
      playerId: string;
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
      /** Поднят Тяжёлый объект Действием [1] (стр. 13, 22). */
      type: 'OBJECT_PICKED_UP';
      playerId: string;
      roomId: RoomId;
      objectId: string;
      objectKind: 'CORPSE' | 'EGG' | 'INTRUDER_REMAINS';
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
      /** Шаг 4 Фазы Событий (стр. 10): маркеры Времени и Самоуничтожения сдвинуты. */
      type: 'TIME_TRACK_ADVANCED';
      round: number;
      timeTrackPosition: number;
      selfDestructTrackPosition: number | null;
    }
  | {
      /** Шаг Фазы Событий ещё не реализован движком и честно пропущен (этап 0.5.0 в разработке). */
      type: 'EVENT_PHASE_STEP_SKIPPED';
      round: number;
      step: 5 | 7 | 8;
    }
  | {
      /** Урон от огня (стр. 10, шаг 6): Чужой в горящем отсеке получил 1 Рану. */
      type: 'FIRE_DAMAGE_TAKEN_BY_INTRUDER';
      roomId: RoomId;
      intruderId: string;
      intruderType: IntruderType;
    }
  | {
      /** Огонь уничтожил Яйцо, не находящееся в руках Персонажа (стр. 25, Улей). */
      type: 'EGG_DESTROYED_BY_FIRE';
      roomId: RoomId;
      objectId: string;
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
