import { queueActionCompletion } from './actionCompletion.js';
import type { EngineAction } from '../types/actions.js';
import type { ItemCard } from '../types/cards.js';
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
  // Обычный пас (стр. 10, 28): игрок объявляет пас и имеет право
  // сбросить любое количество карт с руки (как карт Действий, так и карт Заражения).
  // Шаг 4, долг 9: огонь на Пас — до блокировки, чтобы sufferLightWounds
  // убил до смены activePlayerId (внутри performPass).
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
  // Оплата стоимости карты (playCost)
  if (card.playCost > 0) {
    executeCardPayment(state, actorId, action.payload.discardCardIds ?? [], card.playCost, card.id);
  }
  // Удаляем сыгранную карту из руки и кладём в личный сброс
  player.actionDeck.hand.splice(
    player.actionDeck.hand.findIndex((entry) => entry.id === card.id),
    1,
  );
  player.actionDeck.discard.push(card);
  // Машинный эффект карты: полный разбор по effect.kind («карты работают»).
  // Броски проверок выполнимости откатывают транзакцию целиком.
  applyActionCardEffect(state, actorId, card, action.payload);
  appendGameLog(state, {
    type: 'ACTION_CARD_PLAYED',
    playerId: actorId,
    cardId: card.id,
    cardName: card.name,
  });
  queueActionCompletion(state, actorId);
  return;
}

export function executeUseItem(
  state: GameState,
  action: Extract<EngineAction, { type: 'ACTION_USE_ITEM' }>,
  actorId: string,
): void {
  const player = state.players[actorId]!;
  const itemIndex = player.inventory.findIndex((it) => it.id === action.payload.itemId);
  let foundItem: ItemCard | null = null;
  if (itemIndex > -1) {
    foundItem = player.inventory[itemIndex] ?? null;
    if (foundItem?.isSingleUse) {
      player.inventory.splice(itemIndex, 1);
    }
  } else {
    const handSlotIndex = player.handSlots.findIndex((s) => s.source === 'ITEM' && s.card.id === action.payload.itemId);
    if (handSlotIndex > -1) {
      const slot = player.handSlots[handSlotIndex];
      if (slot && slot.source === 'ITEM') {
        foundItem = slot.card;
        if (foundItem.isSingleUse) {
          player.handSlots.splice(handSlotIndex, 1);
        }
      }
    }
  }
  if (!foundItem) {
    throw new EngineError('NO_ITEMS_LEFT', 'Предмет не найден в инвентаре или слотах рук');
  }
  // Оплата стоимости предмета
  if (foundItem.actionCost > 0) {
    executeCardPayment(state, actorId, action.payload.discardCardIds ?? [], foundItem.actionCost);
  }
  // Машинный эффект предмета: проверки выполнимости откатывают транзакцию.
  applyItemEffect(state, actorId, foundItem, action.payload);
  appendGameLog(state, {
    type: 'ITEM_USED',
    playerId: actorId,
    itemId: foundItem.id,
    itemName: foundItem.name,
  });
  queueActionCompletion(state, actorId);
  return;
}
