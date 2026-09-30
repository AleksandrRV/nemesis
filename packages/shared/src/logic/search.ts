import type { GameState } from '../types/state.js';
import type { ItemCard, ItemDeckColor } from '../types/cards.js';
import { getRoomDeckColor, searchBlock } from './actionRules.js';
import { isPlayerInCombat } from './combatStatus.js';
import { EngineError, enforceRule } from './engineErrors.js';
import { allocateEntityId } from './stateIds.js';
import { hasFreeHandSlot } from './seriousWoundEffects.js';

export { getRoomDeckColor };

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

  enforceRule(searchBlock(room, isPlayerInCombat(state, playerId)));
  const color = getRoomDeckColor(room.definitionId)!;

  return { roomId: room.id, color };
}

/**
 * Вытягивает до 2 карт из выбранной колоды предметов.
 */
/** «Каждое Оружие, найденное в ходе Поиска, входит в игру с 1 ед. Боезапаса» (стр. 22). */
export const FOUND_WEAPON_AMMO = 1;

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
  for (const card of drawn) {
    if (card.isWeapon) card.ammo = FOUND_WEAPON_AMMO;
  }

  return drawn;
}

/**
 * Добавляет предмет игроку в руку (если тяжелый) или в инвентарь.
 * Если слоты рук заняты, требуется решение на сброс.
 * Возвращает true если предмет сразу помещён, false если требуется DISCARD_HEAVY (Шаг 5, долг 12).
 * @param roomId — комната поиска, чтобы после сброса завершить поиск (Шаг 5, долг 12)
 */
export function placeItemToPlayer(state: GameState, playerId: string, item: ItemCard, roomId?: number): boolean {
  const player = state.players[playerId]!;

  if (item.isHeavy) {
    if (hasFreeHandSlot(player)) {
      player.handSlots.push({ source: 'ITEM', card: item });
      return true;
    }
    state.pendingDecision = {
      id: allocateEntityId(state, 'item-choice'),
      playerId,
      type: 'DISCARD_HEAVY_ITEM_FOR_NEW',
      newItem: item,
      roomId,
    };
    return false;
  }

  player.inventory.push(item);
  return true;
}
