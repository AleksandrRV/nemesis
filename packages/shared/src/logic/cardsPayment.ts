import type { ActionCard, ActionDeckCard, ActionDeckState } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import { EngineError } from './engineErrors.js';
import { reshuffleDiscard } from './cardPiles.js';

export const BASE_HAND_SIZE = 5;
export const CABINS_HAND_SIZE = 6;

/**
 * Определяет целевой лимит руки игрока.
 * По правилам: 5 карт; 6 карт, если игрок начинает Фазу Игроков
 * в Исправных Каютах (отсек CABINS), в которых нет Чужих (стр. 10; стр. 25).
 */
export function getPlayerHandLimit(state: GameState, playerId: string): number {
  const player = state.players[playerId];
  if (!player) return BASE_HAND_SIZE;

  const currentRoom = state.ship.rooms[player.roomId];
  if (!currentRoom) return BASE_HAND_SIZE;

  const isCabins = currentRoom.definitionId === 'CABINS';
  const isWorking = !currentRoom.hasMalfunction;
  const noIntruders = (currentRoom.occupantIntruderIds?.length ?? 0) === 0;

  if (isCabins && isWorking && noIntruders) {
    return CABINS_HAND_SIZE;
  }

  return BASE_HAND_SIZE;
}

/**
 * Добор карт до целевого лимита руки.
 * Если колода добора пуста, сброс перемешивается потоком 'cards' и добор продолжается.
 */
export function drawCardsToLimit(state: GameState, playerId: string, limit?: number): number {
  const player = state.players[playerId];
  if (!player) {
    throw new EngineError('UNKNOWN_PLAYER', `Неизвестный игрок: ${playerId}`);
  }

  const targetLimit = limit ?? getPlayerHandLimit(state, playerId);
  let drawnCount = 0;

  while (player.actionDeck.hand.length < targetLimit) {
    if (player.actionDeck.drawPile.length === 0) {
      if (player.actionDeck.discard.length === 0) {
        // Карт больше нет ни в колоде, ни в сбросе
        break;
      }
      reshuffleDiscard(state, player.actionDeck);
    }

    const card = player.actionDeck.drawPile.shift();
    if (card) {
      player.actionDeck.hand.push(card);
      drawnCount++;
    }
  }

  return drawnCount;
}

/**
 * Валидатор оплаты действия сбросом карт с руки.
 * Требования:
 * 1. Число переданных карт должно в точности равняться requiredCost.
 * 2. Каждая карта обязана присутствовать в руке игрока.
 * 3. Нельзя передавать дублирующиеся id.
 * 4. Запрещено использовать карты Заражения (ContaminationCard).
 * 5. Если передана excludeCardId (например, сама разыгрываемая карта Действия),
 *    она не может быть использована для оплаты своего же playCost.
 */
export function validatePayment(
  playerDeck: ActionDeckState,
  discardCardIds: string[],
  requiredCost: number,
  excludeCardId?: string,
): { valid: true } | { valid: false; reason: PaymentFailureReason } {
  if (discardCardIds.length !== requiredCost) {
    return { valid: false, reason: 'INCORRECT_PAYMENT_COUNT' };
  }

  const uniqueIds = new Set(discardCardIds);
  if (uniqueIds.size !== discardCardIds.length) {
    return { valid: false, reason: 'DUPLICATE_PAYMENT_CARD' };
  }

  if (excludeCardId && uniqueIds.has(excludeCardId)) {
    return { valid: false, reason: 'CARD_CANNOT_PAY_FOR_ITSELF' };
  }

  const handCardMap = new Map<string, ActionDeckCard>();
  for (const card of playerDeck.hand) {
    handCardMap.set(card.id, card);
  }

  for (const cardId of discardCardIds) {
    const card = handCardMap.get(cardId);
    if (!card) {
      return { valid: false, reason: 'CARD_NOT_IN_HAND' };
    }
    // Проверка на карту Заражения: у ActionCard есть свойство characterClass
    if (!('characterClass' in card)) {
      return { valid: false, reason: 'CONTAMINATION_CANNOT_PAY' };
    }
  }

  return { valid: true };
}

export type PaymentFailureReason =
  | 'INCORRECT_PAYMENT_COUNT'
  | 'DUPLICATE_PAYMENT_CARD'
  | 'CARD_CANNOT_PAY_FOR_ITSELF'
  | 'CARD_NOT_IN_HAND'
  | 'CONTAMINATION_CANNOT_PAY';

/**
 * Атомарное списание карт оплаты с руки в личный сброс игрока.
 */
export function executeCardPayment(
  state: GameState,
  playerId: string,
  discardCardIds: string[],
  requiredCost: number,
  excludeCardId?: string,
): ActionCard[] {
  const player = state.players[playerId];
  if (!player) {
    throw new EngineError('UNKNOWN_PLAYER', `Неизвестный игрок: ${playerId}`);
  }

  const validation = validatePayment(player.actionDeck, discardCardIds, requiredCost, excludeCardId);
  if (!validation.valid) {
    switch (validation.reason) {
      case 'INCORRECT_PAYMENT_COUNT':
        throw new EngineError(
          'INSUFFICIENT_ACTION_CARDS',
          `Требуется сбросить ${requiredCost} карт(ы) для оплаты, передано: ${discardCardIds.length}`,
        );
      case 'DUPLICATE_PAYMENT_CARD':
        throw new EngineError('PAYMENT_CARD_DUPLICATE', 'Переданы повторяющиеся карты для оплаты');
      case 'CARD_CANNOT_PAY_FOR_ITSELF':
        throw new EngineError('PAYMENT_CARD_CANNOT_PAY_SELF', 'Разыгрываемая карта не может оплачивать саму себя');
      case 'CARD_NOT_IN_HAND':
        throw new EngineError('PAYMENT_CARD_NOT_IN_HAND', 'Одной или нескольких карт оплаты нет в руке');
      case 'CONTAMINATION_CANNOT_PAY':
        throw new EngineError(
          'CONTAMINATION_CANNOT_BE_DISCARDED_AS_COST',
          'Карты Заражения запрещено использовать для оплаты действий',
        );
    }
  }

  const paidCards: ActionCard[] = [];
  const discardSet = new Set(discardCardIds);

  const remainingHand: ActionDeckCard[] = [];
  for (const card of player.actionDeck.hand) {
    if (discardSet.has(card.id)) {
      paidCards.push(card as ActionCard);
      player.actionDeck.discard.push(card);
    } else {
      remainingHand.push(card);
    }
  }

  player.actionDeck.hand = remainingHand;
  return paidCards;
}
