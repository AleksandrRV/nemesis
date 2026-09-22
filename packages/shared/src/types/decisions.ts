import type { CombatDieFace } from '../data/combatDie.js';
import type { ItemDeckColor } from './cards.js';
import type { RoomId } from './rooms.js';

export type PendingDecision =
  | { id: string; playerId: string; type: 'CHOOSE_OBJECTIVE'; objectiveIds: string[] }
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
    };
