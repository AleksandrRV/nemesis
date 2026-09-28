import { describe, expect, it } from 'vitest';
import { contactState, expectEngineError, putIntruder } from '../testing/contactFixtures.js';
import type { ItemCard, SeriousWoundCard, SeriousWoundKind } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import { SERIOUS_WOUND_CARDS } from '../data/seriousWounds.js';
import { STARTING_WEAPONS } from '../data/startingItems.js';
import { GREEN_ITEM_CARDS, RED_ITEM_CARDS, YELLOW_ITEM_CARDS } from '../data/itemCards.js';
import { GameEngine, findAdjacentOpenRoomIds } from './fsm.js';
import { BASE_HAND_SIZE, getPlayerHandLimit } from './cardsPayment.js';
import { filterStateForPlayer } from './sanitizer.js';
import { placeItemToPlayer } from './search.js';
import { handSlotCapacity, hasFreeHandSlot } from './seriousWoundEffects.js';

function wound(kind: SeriousWoundKind, isTreated = false): SeriousWoundCard {
  return { ...structuredClone(SERIOUS_WOUND_CARDS.find((card) => card.kind === kind)!), isTreated };
}

function wounded(seed: string, ...wounds: SeriousWoundCard[]): GameState {
  const state = contactState(2, seed);
  state.players['player-1']!.seriousWounds = wounds;
  return state;
}

function actionCards(state: GameState, count: number): string[] {
  return state.players['player-1']!.actionDeck.hand.filter((card) => 'characterClass' in card)
    .slice(0, count)
    .map((card) => card.id);
}

function cardFrom(pool: readonly ItemCard[], id: string): ItemCard {
  return structuredClone(pool.find((card) => card.id === id)!);
}

function act(state: GameState, action: Parameters<GameEngine['processAction']>[1]): GameState {
  return new GameEngine().processAction(state, action);
}

describe('Колода Тяжёлых Травм (cards_base.pdf, стр. 7, 9, 33)', () => {
  it('16 карт пяти видов: Спина 4, Нога 3, Кисть 3, Кровотечение 3, Рука 3', () => {
    const counts = SERIOUS_WOUND_CARDS.reduce<Record<string, number>>((acc, card) => {
      acc[card.name] = (acc[card.name] ?? 0) + 1;
      return acc;
    }, {});
    expect(SERIOUS_WOUND_CARDS).toHaveLength(16);
    expect(counts).toEqual({
      'Травма спины': 4,
      'Травма ноги': 3,
      'Травма кисти': 3,
      Кровотечение: 3,
      'Травма руки': 3,
    });
    expect(new Set(SERIOUS_WOUND_CARDS.map((card) => card.id)).size).toBe(16);
  });
});

describe('Травма спины: добор до 4 карт вместо 5', () => {
  it('лимит руки 4; Обработанная травма и дубликат не меняют правила', () => {
    expect(getPlayerHandLimit(wounded('back', wound('BACK')), 'player-1')).toBe(4);
    expect(getPlayerHandLimit(wounded('back-double', wound('BACK'), wound('BACK')), 'player-1')).toBe(4);
    expect(getPlayerHandLimit(wounded('back-treated', wound('BACK', true)), 'player-1')).toBe(BASE_HAND_SIZE);
  });

  it('Каюты добавляют 1 карту и к уменьшенному лимиту; срез показывает тот же лимит', () => {
    const state = wounded('back-cabins', wound('BACK'));
    const room = state.ship.rooms[state.players['player-1']!.roomId]!;
    Object.assign(room, { definitionId: 'CABINS', hasMalfunction: false, hasFire: false, occupantIntruderIds: [] });

    expect(getPlayerHandLimit(state, 'player-1')).toBe(5);
    expect(filterStateForPlayer(state, 'player-1').players['player-1']!.handLimit).toBe(5);
  });
});

describe('Травма ноги: цена Побега 2', () => {
  function escapeState(seed: string, ...wounds: SeriousWoundCard[]) {
    const state = wounded(seed, ...wounds);
    const roomId = state.players['player-1']!.roomId;
    putIntruder(state, 'CREEPER', roomId);
    const targetRoomId = findAdjacentOpenRoomIds(state, roomId)[0]!;
    return { state, targetRoomId };
  }

  it('Побег за 1 карту отклоняется, за 2 — выполняется', () => {
    const { state, targetRoomId } = escapeState('leg-escape', wound('LEG'));
    expectEngineError(
      () =>
        act(structuredClone(state), {
          type: 'ACTION_MOVE',
          payload: { targetRoomId, discardCardIds: actionCards(state, 1) },
        }),
      'INSUFFICIENT_ACTION_CARDS',
    );
    const paid = actionCards(state, 2);

    const next = act(state, { type: 'ACTION_MOVE', payload: { targetRoomId, discardCardIds: paid } });

    const handIds = next.players['player-1']!.actionDeck.hand.map((card) => card.id);
    expect(paid.every((cardId) => !handIds.includes(cardId))).toBe(true);
  });

  it('обычное Движение вне Боя по-прежнему стоит 1, Обработанная травма возвращает цену Побега 1', () => {
    const quiet = wounded('leg-quiet', wound('LEG'));
    const targetRoomId = findAdjacentOpenRoomIds(quiet, quiet.players['player-1']!.roomId)[0]!;
    expect(() =>
      act(quiet, { type: 'ACTION_MOVE', payload: { targetRoomId, discardCardIds: actionCards(quiet, 1) } }),
    ).not.toThrow();

    const treated = escapeState('leg-treated', wound('LEG', true));
    expect(() =>
      act(treated.state, {
        type: 'ACTION_MOVE',
        payload: { targetRoomId: treated.targetRoomId, discardCardIds: actionCards(treated.state, 1) },
      }),
    ).not.toThrow();
  });
});

describe('Травма кисти: цена использования Предметов +1', () => {
  it('Бинты стоят 2 карты; ими же можно Обработать саму Травму кисти', () => {
    const state = wounded('hand-bandages', wound('HAND'));
    const bandages = cardFrom(GREEN_ITEM_CARDS, 'ITEM_GRE_BANDAGES_1');
    state.players['player-1']!.inventory.push(bandages);
    const use = (discardCardIds: string[]) =>
      act(structuredClone(state), { type: 'ACTION_USE_ITEM', payload: { itemId: bandages.id, discardCardIds } });

    expectEngineError(() => use(actionCards(state, 1)), 'INSUFFICIENT_ACTION_CARDS');
    expect(use(actionCards(state, 2)).players['player-1']!.seriousWounds[0]!.isTreated).toBe(true);
  });

  it('бесплатный Предмет (Увеличенный магазин) стоит 1 карту', () => {
    const state = wounded('hand-magazine', wound('HAND'));
    const magazine = cardFrom(RED_ITEM_CARDS, 'ITEM_RED_EXTENDED_MAGAZINE_1');
    state.players['player-1']!.inventory.push(magazine);
    state.players['player-1']!.handSlots = [{ source: 'ITEM', card: structuredClone(STARTING_WEAPONS.SOLDIER) }];
    const use = (discardCardIds: string[]) =>
      act(structuredClone(state), { type: 'ACTION_USE_ITEM', payload: { itemId: magazine.id, discardCardIds } });

    expectEngineError(() => use([]), 'INSUFFICIENT_ACTION_CARDS');
    expect(() => use(actionCards(state, 1))).not.toThrow();
  });
});

describe('Кровотечение: Лёгкая Травма за каждый Пас', () => {
  function pass(state: GameState): GameState {
    return act(state, { type: 'ACTION_PASS', payload: {} });
  }

  it('Пас наносит 1 Лёгкую Травму и пишет журнал; дубликат не суммируется', () => {
    const next = pass(wounded('bleeding', wound('BLEEDING'), wound('BLEEDING')));

    expect(next.players['player-1']!.lightWounds).toBe(1);
    expect(next.gameLog.some((entry) => entry.event.type === 'BLEEDING_WOUND_TAKEN')).toBe(true);
  });

  it('Обработанное Кровотечение не действует', () => {
    expect(pass(wounded('bleeding-treated', wound('BLEEDING', true))).players['player-1']!.lightWounds).toBe(0);
  });
});

describe('Травма руки: 1 слот руки для Тяжёлых Предметов/Объектов', () => {
  const egg = { source: 'OBJECT' as const, object: { id: 'egg-arm', kind: 'EGG' as const } };

  it('с одним Тяжёлым в руке второй не поднять; Обработка возвращает слот', () => {
    const state = wounded('arm-pickup', wound('ARM'));
    const player = state.players['player-1']!;
    expect(player.handSlots).toHaveLength(1);
    state.ship.rooms[player.roomId]!.objects.push({ id: 'egg-floor', kind: 'EGG' });

    expect(handSlotCapacity(player)).toBe(1);
    expectEngineError(
      () =>
        act(structuredClone(state), {
          type: 'ACTION_PICK_UP_OBJECT',
          payload: { objectId: 'egg-floor', discardCardIds: actionCards(state, 1) },
        }),
      'HAND_SLOTS_FULL',
    );

    player.seriousWounds[0]!.isTreated = true;
    expect(hasFreeHandSlot(player)).toBe(true);
  });

  it('найденный Тяжёлый Предмет при занятом единственном слоте требует решения о сбросе', () => {
    const state = wounded('arm-search', wound('ARM'));
    const extinguisher = cardFrom(YELLOW_ITEM_CARDS, 'ITEM_YEL_FIRE_EXTINGUISHER_1');

    expect(placeItemToPlayer(state, 'player-1', extinguisher)).toBe(false);
    expect(state.pendingDecision).toMatchObject({
      type: 'DISCARD_HEAVY_ITEM_FOR_NEW',
      newItem: { id: extinguisher.id },
    });
  });

  it('с двумя Тяжёлыми нужно бросить один: другие действия отклоняются, сброс не тратит Действия', () => {
    const state = wounded('arm-drop', wound('ARM'));
    const player = state.players['player-1']!;
    player.handSlots.push(egg);
    const roomId = player.roomId;

    expectEngineError(() => act(structuredClone(state), { type: 'ACTION_PASS', payload: {} }), 'HEAVY_DROP_REQUIRED');

    const dropped = act(state, { type: 'ACTION_DISCARD_HEAVY_ITEM', payload: { handSlotIndex: 1 } });

    expect(dropped.players['player-1']!.handSlots).toHaveLength(1);
    expect(dropped.ship.rooms[roomId]!.objects.some((object) => object.id === 'egg-arm')).toBe(true);
    expect(dropped.players['player-1']!.actionsPerformedThisRound).toBe(player.actionsPerformedThisRound);
    expect(() => act(dropped, { type: 'ACTION_PASS', payload: {} })).not.toThrow();
  });

  it('без Травмы руки два Тяжёлых — норма', () => {
    const state = wounded('arm-none', wound('ARM', true));
    state.players['player-1']!.handSlots.push(egg);
    expect(() => act(state, { type: 'ACTION_PASS', payload: {} })).not.toThrow();
  });
});
