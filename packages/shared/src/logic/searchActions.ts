import { queueActionCompletion } from './actionCompletion.js';
import { resolveRerollCombatDie } from './classCombatCards.js';
import type { EngineAction } from '../types/actions.js';
import type { GameState } from '../types/state.js';
import { appendGameLog } from './gameLog.js';
import { executeCardPayment } from './cardsPayment.js';
import { drawSearchCards, placeItemToPlayer, validateSearchConditions } from './search.js';
import { RED_ITEM_CARDS, YELLOW_ITEM_CARDS, GREEN_ITEM_CARDS } from '../data/itemCards.js';
import type { ItemDeckColor } from '../types/cards.js';
import type { PendingDecision } from '../types/decisions.js';
import { EngineError } from './engineErrors.js';
import { allocateEntityId } from './stateIds.js';

export function executeSearch(
  state: GameState,
  action: Extract<EngineAction, { type: 'ACTION_SEARCH' }>,
  actorId: string,
): void {
  const { roomId, color } = validateSearchConditions(state, actorId);
  // Оплата: 1 карта действия с руки
  executeCardPayment(state, actorId, action.payload.discardCardIds, 1);
  let targetColor: ItemDeckColor;
  if (color === 'WHITE') {
    if (!action.payload.chosenDeckColor) {
      state.pendingDecision = {
        id: `search-deck-${allocateEntityId(state, 'decision')}-${actorId}`,
        playerId: actorId,
        type: 'CHOOSE_WHITE_ROOM_DECK',
        roomId,
      };
      return;
    }
    targetColor = action.payload.chosenDeckColor;
  } else {
    targetColor = color;
  }
  const drawn = drawSearchCards(state, targetColor);
  if (drawn.length === 0) {
    throw new EngineError('NO_ITEMS_LEFT', `В колоде ${targetColor} предметов не осталось карт`);
  }
  if (drawn.length === 1) {
    const item = drawn[0]!;
    placeItemToPlayer(state, actorId, item);
    const currentRoom = state.ship.rooms[roomId]!;
    if (currentRoom.itemsCount > 0) currentRoom.itemsCount -= 1;
    appendGameLog(state, { type: 'SEARCH_PERFORMED', playerId: actorId, roomId });
    queueActionCompletion(state, actorId);
    return;
  }
  state.pendingDecision = {
    id: `search-item-${allocateEntityId(state, 'decision')}-${actorId}`,
    playerId: actorId,
    type: 'CHOOSE_SEARCH_ITEM',
    drawnCardIds: drawn.map((c) => c.id),
    sourceDeck: targetColor,
    roomId,
  };
  return;
}

export function executeDecision(
  state: GameState,
  action: Extract<EngineAction, { type: 'ACTION_RESOLVE_DECISION' }>,
  actorId: string,
): void {
  const player = state.players[actorId]!;
  const decision = state.pendingDecision;
  if (!decision || decision.id !== action.payload.decisionId) {
    throw new EngineError('DECISION_NOT_FOUND', 'Активное решение не найдено или идентификатор не совпадает');
  }
  if (decision.playerId !== actorId) {
    throw new EngineError('INVALID_DECISION', 'Решение предназначено для другого игрока');
  }
  if (decision.type === 'REROLL_COMBAT_DIE') {
    state.pendingDecision = null;
    resolveRerollCombatDie(state, decision, action.payload.selectedOption);
    return;
  }
  if (decision.type === 'CHOOSE_OBJECTIVE') {
    const selected = player.objectives.find((objective) => objective.id === action.payload.selectedOption);
    if (!selected || !decision.objectiveIds.includes(selected.id)) {
      throw new EngineError('INVALID_DECISION_OPTION', 'Выбранной Цели нет среди предложенных.');
    }
    player.objectives = [selected];
    state.pendingDecision = null;
    appendGameLog(state, { type: 'OBJECTIVE_CHOSEN', playerId: actorId });
    return;
  }
  if (decision.type === 'CHOOSE_WHITE_ROOM_DECK') {
    const chosenColor = action.payload.selectedOption as ItemDeckColor;
    if (!['RED', 'YELLOW', 'GREEN'].includes(chosenColor)) {
      throw new EngineError('INVALID_DECISION_OPTION', `Недопустимый цвет колоды: ${chosenColor}`);
    }
    const drawn = drawSearchCards(state, chosenColor);
    if (drawn.length === 0) {
      throw new EngineError('NO_ITEMS_LEFT', `В колоде ${chosenColor} предметов не осталось карт`);
    }
    if (drawn.length === 1) {
      const item = drawn[0]!;
      state.pendingDecision = null;
      placeItemToPlayer(state, actorId, item);
      const currentRoom = state.ship.rooms[decision.roomId]!;
      if (currentRoom.itemsCount > 0) currentRoom.itemsCount -= 1;
      appendGameLog(state, { type: 'SEARCH_PERFORMED', playerId: actorId, roomId: decision.roomId });
      queueActionCompletion(state, actorId);
      return;
    }
    state.pendingDecision = {
      id: `search-item-${allocateEntityId(state, 'decision')}-${actorId}`,
      playerId: actorId,
      type: 'CHOOSE_SEARCH_ITEM',
      drawnCardIds: drawn.map((c) => c.id),
      sourceDeck: chosenColor,
      roomId: decision.roomId,
    };
    return;
  }
  if (decision.type === 'CHOOSE_SEARCH_ITEM') {
    const chosenCardId = action.payload.selectedOption;
    if (!decision.drawnCardIds.includes(chosenCardId)) {
      throw new EngineError('INVALID_DECISION_OPTION', 'Выбранной карты нет среди вытянутых');
    }
    const unchosenCardId = decision.drawnCardIds.find((id) => id !== chosenCardId)!;
    const pile = state.decks.items[decision.sourceDeck];

    const deckItems =
      decision.sourceDeck === 'RED'
        ? RED_ITEM_CARDS
        : decision.sourceDeck === 'YELLOW'
          ? YELLOW_ITEM_CARDS
          : GREEN_ITEM_CARDS;

    const chosenCard = deckItems.find((c) => c.id === chosenCardId);
    const unchosenCard = deckItems.find((c) => c.id === unchosenCardId);

    state.pendingDecision = null;
    if (chosenCard) {
      placeItemToPlayer(state, actorId, chosenCard);
    }
    if (unchosenCard) {
      pile.drawPile.push(unchosenCard);
    }

    const currentRoom = state.ship.rooms[decision.roomId]!;
    if (currentRoom.itemsCount > 0) {
      currentRoom.itemsCount -= 1;
    }

    appendGameLog(state, {
      type: 'SEARCH_PERFORMED',
      playerId: actorId,
      roomId: decision.roomId,
    });

    queueActionCompletion(state, actorId);
    return;
  }
  if (decision.type === 'DISCARD_HEAVY_ITEM_FOR_NEW') {
    const slotIndex = player.handSlots.findIndex(
      (slot) => slot.source === 'ITEM' && slot.card.id === action.payload.selectedOption,
    );
    if (slotIndex === -1) {
      throw new EngineError('INVALID_DECISION_OPTION', 'Указанный тяжёлый предмет не найден в руках');
    }
    const oldSlot = player.handSlots[slotIndex]!;
    if (oldSlot.source === 'ITEM') {
      const oldCard = oldSlot.card;
      if (oldCard.color !== 'BLUE') {
        state.decks.items[oldCard.color].discard.push(oldCard);
      }
    }
    const allItems = [...RED_ITEM_CARDS, ...YELLOW_ITEM_CARDS, ...GREEN_ITEM_CARDS];
    const newCard = allItems.find((c) => c.id === decision.newItemId);
    if (newCard) {
      player.handSlots[slotIndex] = { source: 'ITEM', card: newCard };
    }
    state.pendingDecision = null;
    return;
  }
  throw new EngineError('INVALID_DECISION', `Тип решения не поддерживается: ${(decision as PendingDecision).type}`);
}
