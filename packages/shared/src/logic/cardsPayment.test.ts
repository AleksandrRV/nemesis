import { describe, expect, it } from 'vitest';

import { createInitialGameState } from './setup.js';
import { GameEngine, EngineError } from './fsm.js';
import {
  BASE_HAND_SIZE,
  CABINS_HAND_SIZE,
  drawCardsToLimit,
  executeCardPayment,
  getPlayerHandLimit,
  validatePayment,
} from './cardsPayment.js';
import type { ActionCard, ContaminationCard } from '../types/cards.js';

describe('Подготовка руки и лимиты (v0.3.0 Шаг 3)', () => {
  it('при создании партии персонаж получает ровно 5 карт в руку и 5 в колоду добора', () => {
    const state = createInitialGameState('test-seed-1');
    const player = state.players['player-1']!;

    expect(player.actionDeck.hand).toHaveLength(BASE_HAND_SIZE);
    expect(player.actionDeck.drawPile).toHaveLength(5);
    expect(player.actionDeck.discard).toHaveLength(0);
  });

  it('базовый лимит руки равен 5 картам', () => {
    const state = createInitialGameState('test-seed-1');
    expect(getPlayerHandLimit(state, 'player-1')).toBe(BASE_HAND_SIZE);
  });

  it('в исправных Каютах (CABINS) без чужих лимит руки равен 6', () => {
    const state = createInitialGameState('test-seed-1');
    const player = state.players['player-1']!;
    const cabinsRoom = Object.values(state.ship.rooms).find((r) => r.definitionId === 'CABINS');

    if (cabinsRoom) {
      player.roomId = cabinsRoom.id;
      cabinsRoom.hasMalfunction = false;
      cabinsRoom.hasFire = false;
      cabinsRoom.occupantIntruderIds = [];

      expect(getPlayerHandLimit(state, 'player-1')).toBe(CABINS_HAND_SIZE);

      // При неисправности лимит снова базовый
      cabinsRoom.hasMalfunction = true;
      expect(getPlayerHandLimit(state, 'player-1')).toBe(BASE_HAND_SIZE);

      // При пожаре лимит снова базовый
      cabinsRoom.hasMalfunction = false;
      cabinsRoom.hasFire = true;
      expect(getPlayerHandLimit(state, 'player-1')).toBe(BASE_HAND_SIZE);

      // При чужих лимит базовый
      cabinsRoom.hasFire = false;
      cabinsRoom.occupantIntruderIds = ['intruder-1'];
      expect(getPlayerHandLimit(state, 'player-1')).toBe(BASE_HAND_SIZE);
    }
  });

  it('санитизированный лимит руки считается по тем же правилам (CABINS + !hasMalfunction && !hasFire && no intruders)', async () => {
    const { filterStateForPlayer } = await import('./sanitizer.js');
    const { getSanitizedPlayerHandLimit } = await import('./cardsPayment.js');
    const state = createInitialGameState('test-seed-cabins-sanitized');
    const player = state.players['player-1']!;
    const cabinsRoom = Object.values(state.ship.rooms).find((r) => r.definitionId === 'CABINS');
    if (!cabinsRoom) return;

    player.roomId = cabinsRoom.id;
    cabinsRoom.hasMalfunction = false;
    cabinsRoom.hasFire = false;
    cabinsRoom.occupantIntruderIds = [];

    const sanitized = filterStateForPlayer(state, 'player-1');
    expect(sanitized.players['player-1']?.handLimit).toBe(CABINS_HAND_SIZE);
    expect(getSanitizedPlayerHandLimit(sanitized, 'player-1')).toBe(CABINS_HAND_SIZE);

    // Пожар → 5
    cabinsRoom.hasFire = true;
    const sanitizedFire = filterStateForPlayer(state, 'player-1');
    expect(sanitizedFire.players['player-1']?.handLimit).toBe(BASE_HAND_SIZE);
    expect(getSanitizedPlayerHandLimit(sanitizedFire, 'player-1')).toBe(BASE_HAND_SIZE);
  });

  it('добирает карты до лимита руки при нехватке', () => {
    const state = createInitialGameState('test-seed-2');
    const player = state.players['player-1']!;

    // Имитируем сброс 2 карт
    player.actionDeck.hand.splice(0, 2);
    expect(player.actionDeck.hand).toHaveLength(3);

    const drawn = drawCardsToLimit(state, 'player-1');
    expect(drawn).toBe(2);
    expect(player.actionDeck.hand).toHaveLength(5);
  });

  it('при исчерпании колоды добора перетасовывает личный сброс потоком cards', () => {
    const state = createInitialGameState('test-seed-3');
    const player = state.players['player-1']!;

    // Опустошаем колоду добора, переносим карты в сброс
    const cards = [...player.actionDeck.drawPile];
    player.actionDeck.drawPile = [];
    player.actionDeck.discard = cards;
    player.actionDeck.hand = [];

    const initialDrawIndex = state.meta.rngDraws.cards;
    drawCardsToLimit(state, 'player-1');

    expect(player.actionDeck.hand).toHaveLength(5);
    expect(player.actionDeck.discard).toHaveLength(0);
    expect(state.meta.rngDraws.cards).toBeGreaterThan(initialDrawIndex);
  });
});

describe('Валидатор и выполнение оплаты действий (v0.3.0 Шаг 3)', () => {
  const dummyActionCard = (id: string): ActionCard => ({
    id,
    characterClass: 'CAPTAIN',
    name: 'Тест',
    playCost: 0,
    description: '',
  });

  const dummyContaminationCard = (id: string): ContaminationCard => ({
    id,
    isInfected: false,
    isScanned: false,
  });

  it('успешно валидирует корректную оплату', () => {
    const deck = {
      drawPile: [],
      hand: [dummyActionCard('c1'), dummyActionCard('c2'), dummyActionCard('c3')],
      discard: [],
    };

    const res = validatePayment(deck, ['c1', 'c2'], 2);
    expect(res.valid).toBe(true);
  });

  it('отклоняет неверное число карт оплаты', () => {
    const deck = {
      drawPile: [],
      hand: [dummyActionCard('c1'), dummyActionCard('c2')],
      discard: [],
    };

    const res = validatePayment(deck, ['c1'], 2);
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.reason).toBe('INCORRECT_PAYMENT_COUNT');
    }
  });

  it('отклоняет дубликаты карт оплаты', () => {
    const deck = {
      drawPile: [],
      hand: [dummyActionCard('c1')],
      discard: [],
    };

    const res = validatePayment(deck, ['c1', 'c1'], 2);
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.reason).toBe('DUPLICATE_PAYMENT_CARD');
    }
  });

  it('отклоняет карты, которых нет на руке', () => {
    const deck = {
      drawPile: [],
      hand: [dummyActionCard('c1')],
      discard: [],
    };

    const res = validatePayment(deck, ['c99'], 1);
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.reason).toBe('CARD_NOT_IN_HAND');
    }
  });

  it('строго запрещает оплату картами Заражения', () => {
    const deck = {
      drawPile: [],
      hand: [dummyActionCard('c1'), dummyContaminationCard('contam-1')],
      discard: [],
    };

    const res = validatePayment(deck, ['contam-1'], 1);
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.reason).toBe('CONTAMINATION_CANNOT_PAY');
    }
  });

  it('запрещает разыгрываемой карте оплачивать саму себя', () => {
    const deck = {
      drawPile: [],
      hand: [dummyActionCard('play-card'), dummyActionCard('other-card')],
      discard: [],
    };

    const res = validatePayment(deck, ['play-card'], 1, 'play-card');
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.reason).toBe('CARD_CANNOT_PAY_FOR_ITSELF');
    }
  });

  it('атомарно списывает карты оплаты с руки в сброс', () => {
    const state = createInitialGameState('test-seed-pay');
    const player = state.players['player-1']!;
    const cardToPay = player.actionDeck.hand[0]!.id;

    const paid = executeCardPayment(state, 'player-1', [cardToPay], 1);
    expect(paid).toHaveLength(1);
    expect(player.actionDeck.hand).toHaveLength(4);
    expect(player.actionDeck.discard).toHaveLength(1);
    expect(player.actionDeck.discard[0]?.id).toBe(cardToPay);
  });
});

describe('Интеграция оплаты в действия движка и Пас (v0.3.0 Шаг 3)', () => {
  it('требует сброс 1 карты для обычного перемещения', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('test-seed-move');
    const player = state.players['player-1']!;

    const corridor = Object.values(state.ship.corridors).find(
      (c) => c.doorState === 'OPEN' && (c.fromRoomId === 11 || c.toRoomId === 11),
    )!;
    const target = corridor.fromRoomId === 11 ? corridor.toRoomId : corridor.fromRoomId;

    // Попытка перемещения без карт оплаты
    expect(() =>
      engine.processAction(state, {
        type: 'ACTION_MOVE',
        payload: { targetRoomId: target, discardCardIds: [] },
      }),
    ).toThrowError(EngineError);

    // Успешное перемещение с 1 картой оплаты
    const cardId = player.actionDeck.hand[0]!.id;
    const next = engine.processAction(state, {
      type: 'ACTION_MOVE',
      payload: { targetRoomId: target, discardCardIds: [cardId] },
    });

    expect(next.players['player-1']?.roomId).toBe(target);
    expect(next.players['player-1']?.actionDeck.hand).toHaveLength(4);
    expect(next.players['player-1']?.actionDeck.discard).toHaveLength(1);
  });

  it('действие ACTION_PASS позволяет сбросить любое количество карт (включая Заражение)', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('test-seed-pass', { playerCount: 2 });
    const player = state.players['player-1']!;

    // Добавим в руку карту Заражения
    player.actionDeck.hand.push({
      id: 'contam-pass',
      isInfected: false,
      isScanned: false,
    });

    const discardIds = [player.actionDeck.hand[0]!.id, 'contam-pass'];

    const next = engine.processAction(state, {
      type: 'ACTION_PASS',
      payload: { discardCardIds: discardIds },
    });

    expect(next.players['player-1']?.hasPassed).toBe(true);
    expect(next.players['player-1']?.actionDeck.hand).toHaveLength(4);
    expect(next.players['player-1']?.actionDeck.discard).toHaveLength(2);
    expect(next.players['player-1']?.actionDeck.discard.some((c) => c.id === 'contam-pass')).toBe(true);
  });
});
