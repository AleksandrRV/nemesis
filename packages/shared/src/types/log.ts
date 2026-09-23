import type { IntruderLogEvent } from './contact.js';
import type { EventCard, EventEffect } from './cards.js';
import type { NoiseDieFace } from '../data/noiseDie.js';
import type { GameOverReason } from './state.js';
import type { IntruderToken, IntruderType } from './entities.js';
import type { ExplorationEffect, RoomId, RoomSlotCategory } from './rooms.js';

export type GameLogMovementMode = 'NORMAL' | 'CAREFUL';

export type GameLogNoiseTarget = { kind: 'CORRIDOR'; corridorId: string } | { kind: 'TECHNICAL_CORRIDOR' };

export type GameLogNoiseReason = 'ROLL' | 'CAREFUL' | 'DANGER' | 'BLANK' | 'EVENT';

/**
 * Итог текстового эффекта карты События (стр. 10, шаг 7): структурные
 * подробности для журнала и клиента — по одному варианту на эффект.
 */
export type EventEffectOutcome =
  | { kind: 'HUNT'; movedIntruderIds: string[] }
  | { kind: 'PROTECT_NEST'; contactPlayerIds: string[] }
  | { kind: 'BROOD'; eggDiscarded: boolean; infectedPlayerIds: string[]; larvaAddedToBag: boolean }
  | { kind: 'REGENERATION'; healedIntruderIds: string[]; woundsRemoved: number }
  | { kind: 'HIDDEN'; withdrawnIntruderIds: string[] }
  | {
      kind: 'MATURATION';
      deadPlayerIds: string[];
      creeperRoomIds: RoomId[];
      scannedPlayerIds: string[];
      infectedPlayerIds: string[];
    }
  | { kind: 'RAMPAGE'; malfunctionRoomIds: RoomId[] }
  | { kind: 'PREPARATION'; decisionPlayerId: string }
  | { kind: 'PREY_SCENT'; noiseCorridorIds: string[] }
  | { kind: 'NOISE_TECH_CORRIDORS'; markerPlaced: boolean; rolledPlayerIds: string[] }
  | { kind: 'HIVE'; noiseCorridorIds: string[]; nestExplored: boolean }
  | { kind: 'FLAMMABLE_MIXTURE'; fireRoomIds: RoomId[]; spread: boolean }
  | { kind: 'DESTRUCTIVE_FLAME'; malfunctionRoomIds: RoomId[]; fireRoomIds: RoomId[] }
  | { kind: 'ESCAPE_POD_EJECTION'; podId: string | null }
  | { kind: 'SHORT_CIRCUIT'; malfunctionRoomIds: RoomId[] }
  | { kind: 'COOLANT_LEAK'; selfDestructStarted: boolean }
  | { kind: 'LIFE_SUPPORT_MALFUNCTION'; malfunctionRoomIds: RoomId[] }
  | { kind: 'MALFUNCTION'; targetRoomId: RoomId | null }
  | { kind: 'OPEN_COMPARTMENTS'; openedCorridorIds: string[] };

/**
 * Итог Развития Улья (стр. 10, шаг 8; стр. 31): по одному варианту на тип
 * вытянутого жетона Пула Чужих.
 */
export type HiveDevelopmentOutcome =
  | { kind: 'LARVA'; adultAdded: boolean }
  | { kind: 'CREEPER'; breederAdded: boolean }
  | { kind: 'ADULT'; rolledPlayerIds: string[] }
  | { kind: 'BREEDER'; rolledPlayerIds: string[] }
  | {
      kind: 'QUEEN';
      /** Миниатюра Королевы выставлена в Улей и разыгран Контакт. */
      queenPlaced: boolean;
      intruderId: string | null;
      contactPlayerIds: string[];
      /** Яйцо добавлено на Планшет Чужих (вместо Контакта). */
      eggAdded: boolean;
    }
  | { kind: 'BLANK'; adultAdded: boolean };

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
      /** null — маркер размещён картой События, а не действием Персонажа. */
      playerId: string | null;
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
      /** Шаг 7 Фазы Событий (стр. 10): верхняя карта Событий вытянута лицом вверх. */
      type: 'EVENT_CARD_DRAWN';
      round: number;
      card: EventCard;
    }
  | {
      /** Текстовый эффект карты События исполнен (стр. 10, шаг 7). */
      type: 'EVENT_EFFECT_RESOLVED';
      round: number;
      cardId: string;
      effect: EventEffect;
      outcome: EventEffectOutcome;
    }
  | {
      /** «Подготовка»: игрок выбрал одну из трёх вытянутых карт Событий для розыгрыша. */
      type: 'EVENT_CARD_CHOSEN';
      playerId: string;
      chosenCardId: string;
      discardedCardIds: string[];
    }
  | {
      /** Развитие Улья исполнено (стр. 10, шаг 8; стр. 31): жетон вытянут и разыгран. */
      type: 'HIVE_DEVELOPMENT_RESOLVED';
      round: number;
      tokenType: IntruderToken['type'];
      outcome: HiveDevelopmentOutcome;
    }
  | {
      /** Развитие Улья пропущено по честной причине (стр. 10, шаг 8). */
      type: 'HIVE_DEVELOPMENT_SKIPPED';
      round: number;
      reason: 'EMPTY_BAG';
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
    }
  | {
      type: 'OBJECT_DROPPED';
      playerId: string;
      roomId: RoomId;
      objectId: string;
      objectKind: 'CORPSE' | 'EGG' | 'INTRUDER_REMAINS';
    }
  | {
      type: 'HEAVY_ITEM_DISCARDED';
      playerId: string;
      roomId: RoomId;
      itemId: string;
      itemName: string;
    };

export interface GameLogEntry {
  id: string;
  sequence: number;
  event: GameLogEvent;
}
