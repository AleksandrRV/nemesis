import type { CombatDieFace } from '../data/combatDie.js';
import type { EventCard, ItemCard, ItemDeckColor } from './cards.js';
import type { RoomId } from './rooms.js';

export type PendingDecision =
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
      newItemId: string;
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
  | {
      /** «Прицельный огонь» (Шаг 8): перебросить выпавший кубик Боя? */
      id: string;
      playerId: string;
      type: 'REROLL_COMBAT_DIE';
      /** Выпавшая грань — публичный факт: кубик Боя бросается открыто (стр. 18). */
      firstFace: CombatDieFace;
      weaponName: string;
      /** Остаток Боезапаса оружия после выстрела (для события журнала). */
      ammoLeft: number;
      targetIntruderId: string;
      woundsBefore: number;
      /** Оружие даёт бонусные Раны при ≥1 Ране (Энергооружие/Боевая винтовка). */
      weaponBonusEligible: boolean;
    }
  | {
      /** «Подготовка» (стр. 10): разыграть одну из трёх вытянутых карт Событий. */
      id: string;
      playerId: string;
      type: 'CHOOSE_EVENT_CARD';
      /** Три вытянутые карты — публичная информация: карты Событий вскрываются лицом вверх. */
      cards: EventCard[];
    }
  | {
      /** «Стальные нервы»: сбросить карту, чтобы отменить Внезапную Атаку (стр. 25)? */
      id: string;
      playerId: string;
      type: 'STEEL_NERVES_OFFER';
      intruderId: string;
      intruderType: string;
    };
