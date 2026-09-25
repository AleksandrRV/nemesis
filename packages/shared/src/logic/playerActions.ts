import { queueActionCompletion } from './actionCompletion.js';
import type { EngineAction } from '../types/actions.js';
import type { ItemCard } from '../types/cards.js';
import type { PlayerState } from '../types/entities.js';
import { discardItemCard } from './cardEffectsShared.js';
import { applyActionCardEffect, applyItemEffect } from './cardEffects.js';
import type { GameState } from '../types/state.js';
import { appendGameLog } from './gameLog.js';
import { executeCardPayment } from './cardsPayment.js';
import { performPass } from './turnCycle.js';
import { EngineError } from './engineErrors.js';

export function executePass(
  state: GameState,
  action: Extract<EngineAction, { type: 'ACTION_PASS' }>,
  actorId: string,
): void {
  performPass(state, actorId, action.payload.discardCardIds ?? []);
}

export function executePlayCard(
  state: GameState,
  action: Extract<EngineAction, { type: 'ACTION_PLAY_CARD' }>,
  actorId: string,
): void {
  const player = state.players[actorId]!;
  const cardIndex = player.actionDeck.hand.findIndex((c) => c.id === action.payload.cardId);
  if (cardIndex === -1) {
    throw new EngineError('INSUFFICIENT_ACTION_CARDS', 'Разыгрываемой карты нет в руке');
  }
  const card = player.actionDeck.hand[cardIndex]!;
  if (!('characterClass' in card)) {
    throw new EngineError('CONTAMINATION_CANNOT_BE_DISCARDED_AS_COST', 'Карту Заражения нельзя разыграть');
  }
  if (card.playCost > 0) {
    executeCardPayment(state, actorId, action.payload.discardCardIds ?? [], card.playCost, card.id);
  }
  player.actionDeck.hand.splice(
    player.actionDeck.hand.findIndex((entry) => entry.id === card.id),
    1,
  );
  player.actionDeck.discard.push(card);
  appendGameLog(state, {
    type: 'ACTION_CARD_PLAYED',
    playerId: actorId,
    cardId: card.id,
    cardName: card.name,
  });
  applyActionCardEffect(state, actorId, card, action.payload);
  queueActionCompletion(state, actorId);
}

type ItemLocation = { kind: 'INVENTORY'; item: ItemCard } | { kind: 'HAND_SLOT'; item: ItemCard };

function locateItem(player: PlayerState, itemId: string): ItemLocation | null {
  const inventoryItem = player.inventory.find((item) => item.id === itemId);
  if (inventoryItem) return { kind: 'INVENTORY', item: inventoryItem };
  const slot = player.handSlots.find((entry) => entry.source === 'ITEM' && entry.card.id === itemId);
  return slot && slot.source === 'ITEM' ? { kind: 'HAND_SLOT', item: slot.card } : null;
}

function removeItem(player: PlayerState, location: ItemLocation): boolean {
  if (location.kind === 'INVENTORY') {
    const index = player.inventory.findIndex((item) => item.id === location.item.id);
    if (index === -1) return false;
    player.inventory.splice(index, 1);
    return true;
  }
  const index = player.handSlots.findIndex((slot) => slot.source === 'ITEM' && slot.card.id === location.item.id);
  if (index === -1) return false;
  player.handSlots.splice(index, 1);
  return true;
}

export function executeUseItem(
  state: GameState,
  action: Extract<EngineAction, { type: 'ACTION_USE_ITEM' }>,
  actorId: string,
): void {
  const player = state.players[actorId]!;
  const location = locateItem(player, action.payload.itemId);
  if (!location) {
    throw new EngineError('NO_ITEMS_LEFT', 'Предмет не найден в инвентаре или слотах рук');
  }
  const item = location.item;
  if (item.actionCost > 0) {
    executeCardPayment(state, actorId, action.payload.discardCardIds ?? [], item.actionCost);
  }
  appendGameLog(state, { type: 'ITEM_USED', playerId: actorId, itemId: item.id, itemName: item.name });
  const disposal = applyItemEffect(state, actorId, item, action.payload);
  if (disposal !== 'KEEP' && removeItem(player, location) && disposal === 'DISCARD') {
    discardItemCard(state, item);
  }
  queueActionCompletion(state, actorId);
}
