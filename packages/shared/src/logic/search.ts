import type { GameState } from '../types/state.js';
import type { ItemCard, ItemDeckColor } from '../types/cards.js';
import { BASIC_ROOMS_1, ADDITIONAL_ROOMS_2, SPECIAL_ROOMS } from '../data/roomDefinitions.js';
import { isPlayerInCombat } from './combatStatus.js';
import { EngineError } from './engineErrors.js';
import { allocateEntityId } from './stateIds.js';

const ALL_ROOMS = [...SPECIAL_ROOMS, ...BASIC_ROOMS_1, ...ADDITIONAL_ROOMS_2];

/**
 * Определяет цвет колоды отсека по его definitionId.
 */
export function getRoomDeckColor(definitionId: string | null): ItemDeckColor | 'WHITE' | null {
  if (!definitionId) return null;
  const def = ALL_ROOMS.find((r) => r.id === definitionId);
  return (def?.color as ItemDeckColor | 'WHITE') ?? null;
}

/**
 * Проверяет возможность проведения Поиска в отсеке:
 * 1. Отсек исследован (isExplored = true).
 * 2. В отсеке есть предметы (itemsCount > 0).
 * 3. Отсек не запрещает поиск (например, NEST, SLIME_ROOM).
 * 4. В отсеке нет Чужих (в бою поиск запрещен).
 */
export function validateSearchConditions(
  state: GameState,
  playerId: string,
): { roomId: number; color: ItemDeckColor | 'WHITE' } {
  const player = state.players[playerId];
  if (!player) {
    throw new EngineError('UNKNOWN_PLAYER', `Неизвестный игрок: ${playerId}`);
  }

  const room = state.ship.rooms[player.roomId];
  if (!room) {
    throw new EngineError('UNKNOWN_ROOM', `Отсек не найден`);
  }

  if (!room.isExplored) {
    throw new EngineError('SEARCH_NOT_ALLOWED', 'Нельзя искать в неисследованном отсеке (стр. 14)');
  }

  if (room.definitionId === 'NEST' || room.definitionId === 'SLIME_ROOM') {
    throw new EngineError('SEARCH_NOT_ALLOWED', `Поиск в этом отсеке запрещён правилами (${room.definitionId})`);
  }

  if (room.itemsCount <= 0) {
    throw new EngineError('NO_ITEMS_LEFT', 'В отсеке не осталось предметов для поиска (счётчик = 0)');
  }

  if (isPlayerInCombat(state, playerId)) {
    throw new EngineError('SEARCH_IN_COMBAT', 'Поиск запрещён, пока в отсеке находятся Чужие (стр. 18).');
  }

  const color = getRoomDeckColor(room.definitionId);
  if (!color) {
    throw new EngineError('SEARCH_NOT_ALLOWED', 'Не удалось определить цвет колоды отсека');
  }

  return { roomId: room.id, color };
}

/**
 * Вытягивает до 2 карт из выбранной колоды предметов.
 */
export function drawSearchCards(state: GameState, deckColor: ItemDeckColor): ItemCard[] {
  const pile = state.decks.items[deckColor];
  if (!pile) {
    throw new EngineError('UNKNOWN_DECK', `Неизвестная колода предметов: ${deckColor}`);
  }

  const drawn: ItemCard[] = [];
  while (drawn.length < 2 && pile.drawPile.length > 0) {
    const card = pile.drawPile.shift();
    if (card) drawn.push(card);
  }

  return drawn;
}

/**
 * Добавляет предмет игроку в руку (если тяжелый) или в инвентарь.
 * Если слоты рук заняты, требуется решение на сброс.
 * Возвращает true если предмет сразу помещён, false если требуется DISCARD_HEAVY (Шаг 5, долг 12).
 * @param roomId — комната поиска, чтобы после сброса завершить поиск (Шаг 5, долг 12)
 */
export function placeItemToPlayer(
  state: GameState,
  playerId: string,
  item: ItemCard,
  roomId?: number,
): boolean {
  const player = state.players[playerId]!;

  if (item.isHeavy) {
    if (player.handSlots.length < 2) {
      player.handSlots.push({ source: 'ITEM', card: item });
      return true;
    }
    // Обе руки заняты: нужно решение о сбросе тяжёлого предмета для нового
    state.pendingDecision = {
      id: allocateEntityId(state, 'item-choice'),
      playerId,
      type: 'DISCARD_HEAVY_ITEM_FOR_NEW',
      newItemId: item.id,
      roomId,
    };
    return false;
  }

  player.inventory.push(item);
  return true;
}
