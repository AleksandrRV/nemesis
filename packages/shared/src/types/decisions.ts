import type { CombatDieFace } from '../data/combatDie.js';
import type { ItemCard, ItemDeckColor } from './cards.js';
import type { RoomId } from './rooms.js';
import type { ExchangeTransfer } from './actions.js';
import type { ExchangeEntryKind } from './shipSystemsLog.js';

/** Выстрел, ожидающий решения о перебросе кубика Боя. */
export interface PendingShot {
  weaponItemId: string;
  weaponName: string;
  targetIntruderId: string;
  woundsBefore: number;
  burstAmmoSpent: number;
  spendExtraAmmoOnTwoWounds: boolean;
}

/** Передача с тем, что видят участники Обмена: они показывают друг другу карты (стр. 12). */
export interface ExchangeOfferLine extends ExchangeTransfer {
  kind: ExchangeEntryKind;
  name: string;
  color: ItemCard['color'] | null;
  isHeavy: boolean;
  ammo: number;
}

export interface PendingExchange {
  exchangeId: string;
  initiatorId: string;
  roomId: RoomId;
  lines: ExchangeOfferLine[];
  acceptedPlayerIds: string[];
  declinedPlayerIds: string[];
  awaitingPlayerIds: string[];
}

export type PendingDecision =
  | { id: string; playerId: string; type: 'EXCHANGE_CONSENT'; exchange: PendingExchange }
  | {
      id: string;
      playerId: string;
      type: 'ESCAPE_POD_LAUNCH_CHOICE';
      podId: string;
    }
  | { id: string; playerId: string; type: 'CHOOSE_OBJECTIVE'; objectiveIds: string[] }
  | {
      id: string;
      playerId: string;
      type: 'CHOOSE_SEARCH_ITEM';
      /** Полные карты, вытянутые из колоды — владелец видит name/description/color (Шаг 5, долг 11) */
      cards: ItemCard[];
      sourceDeck: ItemDeckColor;
      roomId: RoomId;
    }
  | {
      id: string;
      playerId: string;
      type: 'CHOOSE_STORAGE_ITEM';
      /** Отдельный тип для Склада, чтобы не путать itemsCount-- логику (Шаг 5, долг 14) */
      cards: ItemCard[];
      sourceDeck: ItemDeckColor;
      roomId: RoomId;
    }
  | {
      id: string;
      playerId: string;
      type: 'CHOOSE_ENERGY_WEAPON';
      /** Выбор энергооружия в Оружейной, если у игрока их несколько (Шаг 6, долг 18) */
      weaponIds: string[];
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
      /** Сам новый Тяжелый Предмет: найденный, созданный или квестовый — Тяжелые Предметы видны всем (стр. 22). */
      newItem: ItemCard;
      /** Комната, в которой был поиск — чтобы после сброса завершить поиск (Шаг 5, долг 12) */
      roomId?: RoomId;
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
    }
  | ({
      /** Переброс кубика Боя: «Прицельный огонь» (стр. 24) и «Прототип: пистолет» — по разу. */
      id: string;
      playerId: string;
      type: 'REROLL_COMBAT_DIE';
      /** Выпавшая грань — публичный факт: кубик Боя бросается открыто (стр. 18). */
      firstFace: CombatDieFace;
      rerollsLeft: number;
    } & PendingShot)
  | {
      /** «Стальные нервы»: сбросить карту, чтобы отменить Внезапную Атаку (стр. 25)? */
      id: string;
      playerId: string;
      type: 'STEEL_NERVES_OFFER';
      intruderId: string;
      intruderType: string;
    };
