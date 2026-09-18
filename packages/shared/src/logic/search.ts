import type { GameState } from '../types/state.js';
import type { ItemCard, ItemDeckColor } from '../types/cards.js';
import { BASIC_ROOMS_1, ADDITIONAL_ROOMS_2, SPECIAL_ROOMS } from '../data/roomDefinitions.js';
import { EngineError } from './fsm.js';
import { appendGameLog } from './gameLog.js';
import { advanceTurn } from './turnCycle.js';

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

  if ((room.occupantIntruderIds?.length ?? 0) > 0) {
    throw new EngineError('SEARCH_IN_COMBAT', 'Поиск запрещён, пока в отсеке находятся Чужие (стр. 14)');
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
 */
export function placeItemToPlayer(state: GameState, playerId: string, item: ItemCard): boolean {
  const player = state.players[playerId]!;

  if (item.isHeavy) {
    if (player.handSlots.length < 2) {
      player.handSlots.push({ source: 'ITEM', card: item });
      return true;
    }
    // Обе руки заняты: нужно решение о сбросе
    state.pendingDecision = {
      id: `decision-${Date.now()}-${playerId}`,
      playerId,
      type: 'DISCARD_HEAVY_ITEM_FOR_NEW',
      newItemId: item.id,
    };
    // Временно сохраняем карту в инвентарь или держим в решении
    return false;
  }

  player.inventory.push(item);
  return true;
}

/**
 * Завершает поиск: помещает выбранный предмет игроку, невыбранный — под низ колоды,
 * уменьшает itemsCount в отсеке на 1, пишет в публичный журнал (без названия предмета)
 * и продвигает микроход.
 */
/**
 * Завершает поиск: уменьшает itemsCount в отсеке на 1,
 * пишет в публичный журнал (без названия найденного предмета)
 * и продвигает микроход.
 */
export function finishSearch(state: GameState, playerId: string): void {
  const player = state.players[playerId]!;
  const room = state.ship.rooms[player.roomId]!;

  if (room.itemsCount > 0) {
    room.itemsCount -= 1;
  }

  appendGameLog(state, {
    type: 'SEARCH_PERFORMED',
    playerId,
    roomId: room.id,
  });

  player.actionsPerformedThisRound += 1;
  if (player.actionsPerformedThisRound >= 2) {
    advanceTurn(state, playerId);
  }
}
