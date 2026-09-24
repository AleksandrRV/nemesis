import { queueActionCompletion } from './actionCompletion.js';
import { resolveRerollCombatDie } from './classCombatCards.js';
import { playEventCard } from './eventCardMovement.js';
import type { EngineAction } from '../types/actions.js';
import type { GameState } from '../types/state.js';
import { appendGameLog } from './gameLog.js';
import { executeCardPayment } from './cardsPayment.js';
import { drawSearchCards, placeItemToPlayer, validateSearchConditions } from './search.js';
import { RED_ITEM_CARDS, YELLOW_ITEM_CARDS, GREEN_ITEM_CARDS } from '../data/itemCards.js';
import { CRAFTED_ITEM_CARDS } from '../data/crafting.js';
import type { ItemCard, ItemDeckColor } from '../types/cards.js';
import type { PendingDecision } from '../types/decisions.js';
import { EngineError } from './engineErrors.js';
import { allocateEntityId } from './stateIds.js';

/**
 * Завершает поиск: уменьшает itemsCount в отсеке на 1,
 * пишет в публичный журнал (без названия найденного предмета)
 * и продвигает микроход.
 * Единственная реализация — оставлена здесь (Шаг 5, долг 13: дублирование finishSearch удалено из search.ts).
 */
export function finishSearch(state: GameState, playerId: string, roomId: number): void {
  const room = state.ship.rooms[roomId];
  if (room && room.itemsCount > 0) {
    room.itemsCount -= 1;
  }

  appendGameLog(state, {
    type: 'SEARCH_PERFORMED',
    playerId,
    roomId,
  });

  queueActionCompletion(state, playerId);
}

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
    const placed = placeItemToPlayer(state, actorId, item, roomId);
    // Шаг 5, долг 12: если руки заняты тяжёлыми, placeItemToPlayer вернёт false и выставит DISCARD_HEAVY — карта не должна теряться
    if (!placed) {
      // Не завершаем поиск до разрешения DISCARD_HEAVY
      return;
    }
    finishSearch(state, actorId, roomId);
    return;
  }
  // Шаг 5, долг 11: приватное решение содержит полные карты, а не только ID — модалка показывает name/description/color
  state.pendingDecision = {
    id: `search-item-${allocateEntityId(state, 'decision')}-${actorId}`,
    playerId: actorId,
    type: 'CHOOSE_SEARCH_ITEM',
    cards: drawn,
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
  if (decision.type === 'CHOOSE_EVENT_CARD') {
    const chosen = decision.cards.find((card) => card.id === action.payload.selectedOption);
    if (!chosen) {
      throw new EngineError('INVALID_DECISION_OPTION', 'Выбранной карты нет среди вытянутых.');
    }
    state.pendingDecision = null;
    const discardedCardIds: string[] = [];
    for (const other of decision.cards) {
      if (other.id === chosen.id) continue;
      state.decks.events.discard.push(other);
      discardedCardIds.push(other.id);
    }
    appendGameLog(state, {
      type: 'EVENT_CARD_CHOSEN',
      playerId: actorId,
      chosenCardId: chosen.id,
      discardedCardIds,
    });
    playEventCard(state, chosen);
    return;
  }
  if (decision.type === 'STEEL_NERVES_OFFER') {
    state.pendingDecision = null;
    if (action.payload.selectedOption === 'USE_STEEL_NERVES') {
      // Сброс «Стальных нервов» отменяет Внезапную Атаку (стр. 25):
      // атака не ставится в очередь, drainInterrupts продолжит остальные прерывания.
      const index = player.actionDeck.hand.findIndex(
        (card) => 'characterClass' in card && card.id === 'ACT_SOL_STEEL_NERVES',
      );
      if (index > -1) {
        const [card] = player.actionDeck.hand.splice(index, 1);
        if (card && 'characterClass' in card) {
          player.actionDeck.discard.push(card);
          appendGameLog(state, { type: 'ACTION_CARD_PLAYED', playerId: actorId, cardId: card.id, cardName: card.name });
        }
      }
      return;
    }
    state.interruptQueue.unshift({ type: 'SURPRISE_ATTACK_INTERRUPT', playerId: actorId, intruderId: decision.intruderId });
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
      const placed = placeItemToPlayer(state, actorId, item, decision.roomId);
      if (!placed) {
        // Руки заняты — ждём DISCARD_HEAVY, но решение WHITE уже снято (DISCARD_HEAVY выставлен внутри placeItemToPlayer)
        // Не завершаем поиск до разрешения тяжёлого
        return;
      }
      state.pendingDecision = null;
      finishSearch(state, actorId, decision.roomId);
      return;
    }
    state.pendingDecision = {
      id: `search-item-${allocateEntityId(state, 'decision')}-${actorId}`,
      playerId: actorId,
      type: 'CHOOSE_SEARCH_ITEM',
      cards: drawn,
      sourceDeck: chosenColor,
      roomId: decision.roomId,
    };
    return;
  }
  if (decision.type === 'CHOOSE_SEARCH_ITEM') {
    const chosenCardId = action.payload.selectedOption;
    const chosenCard = decision.cards.find((c) => c.id === chosenCardId);
    if (!chosenCard) {
      throw new EngineError('INVALID_DECISION_OPTION', 'Выбранной карты нет среди вытянутых');
    }
    const unchosenCard = decision.cards.find((c) => c.id !== chosenCardId);
    const pile = state.decks.items[decision.sourceDeck];

    // Шаг 5, долг 15: возврат второй карты вниз — drawPile использует shift() для верха, push() для низа.
    // Комментарий фиксирует порядок: вытянутые карты берутся с верха (shift), невыбранная уходит под низ (push),
    // чтобы следующий поиск не вытянул её снова. Тест проверяет что карта действительно внизу, а не сверху.
    if (unchosenCard) {
      pile.drawPile.push(unchosenCard);
    }

    state.pendingDecision = null;
    const placed = placeItemToPlayer(state, actorId, chosenCard, decision.roomId);
    if (!placed) {
      // Тяжёлый предмет при занятых руках — ждём DISCARD_HEAVY, поиск завершится после сброса
      return;
    }

    finishSearch(state, actorId, decision.roomId);
    return;
  }
  if (decision.type === 'CHOOSE_STORAGE_ITEM') {
    const chosenCardId = action.payload.selectedOption;
    const chosenCard = decision.cards.find((c) => c.id === chosenCardId);
    if (!chosenCard) {
      throw new EngineError('INVALID_DECISION_OPTION', 'Выбранной карты нет среди вытянутых (Склад)');
    }
    const unchosenCard = decision.cards.find((c) => c.id !== chosenCardId);
    const pile = state.decks.items[decision.sourceDeck];

    if (unchosenCard) {
      pile.drawPile.push(unchosenCard);
    }

    state.pendingDecision = null;
    const placed = placeItemToPlayer(state, actorId, chosenCard);
    if (!placed) {
      return;
    }

    // Склад не уменьшает itemsCount (стр. 24, описание Склада) — в отличие от обычного поиска
    appendGameLog(state, {
      type: 'SEARCH_PERFORMED',
      playerId: actorId,
      roomId: decision.roomId,
    });
    queueActionCompletion(state, actorId);
    return;
  }
  if (decision.type === 'CHOOSE_ENERGY_WEAPON') {
    const chosenWeaponId = action.payload.selectedOption;
    if (!decision.weaponIds.includes(chosenWeaponId)) {
      throw new EngineError('INVALID_DECISION_OPTION', 'Выбранного энергооружия нет среди предложенных');
    }
    const slot = player.handSlots.find((s) => s.source === 'ITEM' && s.card.id === chosenWeaponId);
    if (!slot || slot.source !== 'ITEM') {
      throw new EngineError('INVALID_DECISION_OPTION', 'Энергооружие не найдено в руках');
    }
    const weapon = slot.card;
    const maxAmmo = weapon.maxAmmo ?? 4;
    const currentAmmo = weapon.ammo ?? 0;
    const newAmmo = Math.min(maxAmmo, currentAmmo + 2);
    weapon.ammo = newAmmo;

    state.pendingDecision = null;

    appendGameLog(state, {
      type: 'ROOM_ABILITY_USED',
      playerId: actorId,
      roomId: decision.roomId,
      roomDefinitionId: 'ARMORY',
      detail: `Заряжено энергооружие «${weapon.name}»: ${newAmmo}/${maxAmmo} зарядов`,
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

    const allTemplates = [...RED_ITEM_CARDS, ...YELLOW_ITEM_CARDS, ...GREEN_ITEM_CARDS, ...CRAFTED_ITEM_CARDS];
    const newCard = allTemplates.find((c) => c.id === decision.newItemId) as ItemCard | undefined;

    if (newCard) {
      player.handSlots[slotIndex] = { source: 'ITEM', card: { ...newCard } };
    }

    const roomIdForFinish = decision.roomId ?? player.roomId;
    const currentRoom = state.ship.rooms[roomIdForFinish];

    state.pendingDecision = null;

    // Если это был поиск (roomId передан из placeItemToPlayer), завершаем его
    if (currentRoom) {
      // Для обычного поиска itemsCount уменьшается, для подбора с пола — нет.
      // Если roomId был передан — это поиск, поэтому уменьшаем
      if (decision.roomId !== undefined && currentRoom.itemsCount > 0) {
        currentRoom.itemsCount -= 1;
        appendGameLog(state, {
          type: 'SEARCH_PERFORMED',
          playerId: actorId,
          roomId: currentRoom.id,
        });
        queueActionCompletion(state, actorId);
      }
      // Если roomId не передан — это подбор тяжёлого объекта с пола, поиск не завершаем
    }

    return;
  }
  throw new EngineError('INVALID_DECISION', `Тип решения не поддерживается: ${(decision as PendingDecision).type}`);
}

