import type { ItemDeckColor } from './cards.js';
import type { CarefulMoveChosenCorridor, RoomId } from './rooms.js';

/**
 * Действия игрока — единственный способ изменить состояние партии:
 * клиент не мутирует `GameState`, он отправляет действие, а правила применяет
 * движок (`GameEngine.processAction`, AGENTS.md §2.2, GDD §3.2).
 *
 * Часть действий объявлена контрактом заранее: движок принимает их и отклоняет
 * с кодом `ACTION_NOT_IMPLEMENTED`, пока не наступит соответствующий этап
 * дорожной карты (поиск — этап 3, комнаты и крафт — этап 4, цели — этап 6).
 */
export type RoomAbilityPayload = {
  discardCardIds?: string[];
  option?: string;
  targetRoomId?: RoomId;
  targetDeckColor?: ItemDeckColor;
  targetEscapePodId?: string;
  targetObjectKind?: 'CORPSE' | 'EGG' | 'INTRUDER_REMAINS';
};

export type PlayCardActionPayload = {
  cardId: string;
  discardCardIds?: string[];
  option?: string;
  targetRoomId?: RoomId;
  targetCorridorId?: string;
};

export type UseItemActionPayload = {
  itemId: string;
  discardCardIds?: string[];
  option?: string;
  targetRoomId?: RoomId;
  targetCorridorId?: string;
};

/** Данные для действия «Стрельба»: выбор оружия, цели и бросок кубика */
export type ShootActionPayload = {
  /** ID оружия в руках персонажа (тяжёлый предмет) */
  weaponHandSlotIndex: number;
  /** ID жетона Чужого для атаки */
  targetIntruderId: string;
  /** Результат броска кубика Боя (индекс грани 0-5) */
  combatDieRoll: number;
  /** Карты действий для оплаты (минимум 1 карта) */
  discardCardIds: string[];
};

export type GameAction =
  | { type: 'ACTION_MOVE'; payload: { targetRoomId: RoomId; discardCardIds: string[] } }
  /**
   * «Осторожное движение» [1] (стр. 13): обычное Движение, но вместо броска
   * кубика Шума маркер кладётся в выбранный игроком Коридор, ведущий в отсек
   * назначения. Нельзя выполнять в Бою и когда во всех ведущих Коридорах уже
   * стоят маркеры.
   */
  | {
      type: 'ACTION_CAREFUL_MOVE';
      payload: { targetRoomId: RoomId; chosenCorridor: CarefulMoveChosenCorridor; discardCardIds: string[] };
    }
  | { type: 'ACTION_SEARCH'; payload: { chosenDeckColor?: ItemDeckColor; discardCardIds: string[] } }
  | { type: 'ACTION_ROOM_ABILITY'; payload: RoomAbilityPayload }
  | { type: 'ACTION_PLAY_CARD'; payload: PlayCardActionPayload }
  | { type: 'ACTION_USE_ITEM'; payload: UseItemActionPayload }
  | { type: 'ACTION_SHOOT'; payload: ShootActionPayload }
  | { type: 'ACTION_PASS'; payload: { discardCardIds?: string[] } }
  | {
      type: 'ACTION_RESOLVE_DECISION';
      payload: {
        decisionId: string;
        selectedOption: string;
      };
    }
  | {
      type: 'ACTION_CLAIM';
      payload: {
        target: 'ENGINE_1' | 'ENGINE_2' | 'ENGINE_3' | 'COORDINATES';
        declaredStatus: 'WORKING' | 'DAMAGED' | 'DESTINATION_EARTH' | 'DESTINATION_OTHER' | 'SILENCE';
      };
    };

/**
 * Отладочные действия (переключатели дверей и шума): в продакшн-сборке движок
 * отклоняет их всегда, локальный транспорт включает их только при
 * `allowDevActions` в dev-режиме.
 */
export type DevAction =
  | { type: 'DEV_TOGGLE_DOOR'; payload: { corridorId: string } }
  | { type: 'DEV_TOGGLE_NOISE'; payload: { corridorId: string } };

/** Всё, что движок умеет обрабатывать: действия игрока и отладочные действия. */
export type EngineAction = GameAction | DevAction;

export interface ClaimEvent {
  id: string;
  authorPlayerId: string;
  target: 'ENGINE_1' | 'ENGINE_2' | 'ENGINE_3' | 'COORDINATES';
  declaredStatus: 'WORKING' | 'DAMAGED' | 'DESTINATION_EARTH' | 'DESTINATION_OTHER' | 'SILENCE';
  timestamp: number;
}
