import type { ItemDeckColor } from './cards.js';
import type { RoomId } from './rooms.js';

/**
 * Действия игрока — единственный способ изменить состояние партии:
 * клиент не мутирует `GameState`, он отправляет действие, а правила применяет
 * движок (`GameEngine.processAction`, AGENTS.md §2.2 и §3.1).
 *
 * Часть действий объявлена контрактом заранее: движок принимает их и отклоняет
 * с кодом `ACTION_NOT_IMPLEMENTED`, пока не наступит соответствующий этап
 * дорожной карты (поиск — этап 3, комнаты и крафт — этап 4, цели — этап 6).
 */
export type GameAction =
  | { type: 'ACTION_MOVE'; payload: { targetRoomId: RoomId; discardCardIds: string[] } }
  | {
      type: 'ACTION_CAREFUL_MOVE';
      payload: { targetRoomId: RoomId; chosenCorridorIndex: number; discardCardIds: string[] };
    }
  | { type: 'ACTION_SEARCH'; payload: { chosenDeckColor?: ItemDeckColor; discardCardIds: string[] } }
  | { type: 'ACTION_ROOM_ABILITY'; payload: { discardCardIds: string[] } }
  | { type: 'ACTION_PASS'; payload: { discardCardIds?: string[] } }
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
 * `allowDevActions` в dev-режиме (аудит №22).
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
