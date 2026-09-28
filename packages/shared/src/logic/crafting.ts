import type { EngineAction } from '../types/actions.js';
import type { CraftedItemCard, CraftedItemId, ItemCard } from '../types/cards.js';
import type { PlayerState } from '../types/entities.js';
import type { GameState } from '../types/state.js';
import { matchesRecipe, recipeById } from '../data/crafting.js';
import { EngineError } from './engineErrors.js';
import { appendGameLog } from './gameLog.js';
import { executeCardPayment } from './cardsPayment.js';
import { queueActionCompletion } from './actionCompletion.js';
import { placeItemToPlayer } from './search.js';
import { discardItemCard } from './cardEffectsShared.js';

export const CRAFT_ACTION_COST = 1;

type OwnedItem = { item: ItemCard; location: 'INVENTORY' | 'HAND_SLOT' };

function ownedItem(player: PlayerState, itemId: string): OwnedItem | null {
  const inventoryItem = player.inventory.find((item) => item.id === itemId);
  if (inventoryItem) return { item: inventoryItem, location: 'INVENTORY' };
  const slot = player.handSlots.find((entry) => entry.source === 'ITEM' && entry.card.id === itemId);
  return slot?.source === 'ITEM' ? { item: slot.card, location: 'HAND_SLOT' } : null;
}

function removeOwnedItem(player: PlayerState, owned: OwnedItem): void {
  if (owned.location === 'INVENTORY') {
    player.inventory = player.inventory.filter((item) => item.id !== owned.item.id);
    return;
  }
  player.handSlots = player.handSlots.filter((slot) => slot.source !== 'ITEM' || slot.card.id !== owned.item.id);
}

function takeCraftedCard(state: GameState, recipeId: CraftedItemId): CraftedItemCard | null {
  const pile = state.decks.craftedItems;
  for (const zone of [pile.drawPile, pile.discard]) {
    const index = zone.findIndex((card) => card.recipeId === recipeId);
    if (index !== -1) return zone.splice(index, 1)[0]!;
  }
  return null;
}

export function performCraft(
  state: GameState,
  actorId: string,
  recipeId: CraftedItemId,
  componentItemIds: readonly string[],
  options: { yellowIsWildcard: boolean; viaCardName?: string },
): void {
  const player = state.players[actorId];
  if (!player) throw new EngineError('UNKNOWN_PLAYER', `Неизвестный персонаж: ${actorId}.`);
  const recipe = recipeById(recipeId);
  if (!recipe) throw new EngineError('INVALID_DECISION_OPTION', 'Такого Создаваемого Предмета нет.');
  if (componentItemIds.length !== 2 || componentItemIds[0] === componentItemIds[1]) {
    throw new EngineError(
      'INVALID_DECISION_OPTION',
      'Для Создания нужно ровно 2 разных Предмета-Компонента (стр. 13).',
    );
  }
  const owned = componentItemIds.map((id) => ownedItem(player, id));
  if (owned.some((entry) => entry === null)) {
    throw new EngineError('NO_ITEMS_LEFT', 'Одного из Предметов-Компонентов нет у Персонажа.');
  }
  const [first, second] = owned as [OwnedItem, OwnedItem];
  if (!matchesRecipe(recipe, first.item, second.item, options.yellowIsWildcard)) {
    throw new EngineError(
      'INVALID_DECISION_OPTION',
      `Синие символы Компонентов не совпадают с рецептом «${recipe.name}» (стр. 23).`,
    );
  }
  const crafted = takeCraftedCard(state, recipeId);
  if (!crafted) {
    throw new EngineError(
      'CARD_SUPPLY_EXHAUSTED',
      `Карт «${recipe.name}» не осталось ни в колоде, ни в сбросе (стр. 23).`,
    );
  }
  for (const entry of [first, second]) {
    removeOwnedItem(player, entry);
    discardItemCard(state, entry.item);
  }
  appendGameLog(state, {
    type: 'ITEM_CRAFTED',
    playerId: actorId,
    recipeId,
    itemName: crafted.name,
    componentNames: [first.item.name, second.item.name],
    ...(options.viaCardName ? { viaCardName: options.viaCardName } : {}),
  });
  placeItemToPlayer(state, actorId, crafted);
}

export function executeCraftItem(
  state: GameState,
  action: Extract<EngineAction, { type: 'ACTION_CRAFT_ITEM' }>,
  actorId: string,
): void {
  executeCardPayment(state, actorId, action.payload.discardCardIds, CRAFT_ACTION_COST);
  performCraft(state, actorId, action.payload.recipeId, action.payload.componentItemIds, { yellowIsWildcard: false });
  queueActionCompletion(state, actorId);
}
