import { describe, expect, it } from 'vitest';
import { contactState, expectEngineError } from '../testing/contactFixtures.js';
import type { ItemCard } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import { GameEngine } from './fsm.js';

const CAPTAIN_DECK = [
  'ACT_CAP_RELOAD',
  'ACT_CAP_BASIC_REPAIR',
  'ACT_CAP_REST',
  'ACT_CAP_DEMOLITION',
  'ACT_CAP_ORDER',
  'ACT_CAP_MOTIVATION',
  'ACT_CAP_SUPPRESSIVE_FIRE',
  'ACT_CAP_DISMISS',
  'ACT_CAP_SEARCH_1',
  'ACT_CAP_SEARCH_2',
];

/** Машиночитаемый эффект по id тестовой карты — как в data/actionCards.ts. */
function effectForId(id: string): ActionCard['effect'] {
  if (id.includes('RELOAD')) return { kind: 'RELOAD', ammoGain: 1 };
  if (id.includes('REST')) return { kind: 'REST' };
  if (id.includes('REPAIR')) return { kind: 'BASIC_REPAIR' };
  if (id.includes('DEMOLITION')) return { kind: 'DEMOLITION' };
  if (id.includes('DISMISS')) return { kind: 'DISMISS' };
  if (id.includes('SEARCH')) return { kind: 'SEARCH' };
  if (id.includes('ORDER')) return { kind: 'ORDER' };
  if (id.includes('MOTIVATION')) return { kind: 'MOTIVATION', drawCount: 1 };
  return { kind: 'REST' };
}

function playState(): GameState {
  const state = contactState(1, 'player-actions-test');
  const player = state.players['player-1']!;
  player.actionDeck.hand = CAPTAIN_DECK.map((id) => ({
    id,
    characterClass: 'CAPTAIN',
    name: id,
    playCost: id === 'ACT_CAP_BASIC_REPAIR' ? 2 : 0,
    description: '',
    effect: effectForId(id),
  }));
  player.actionDeck.drawPile = [];
  player.actionDeck.discard = [];
  return state;
}

function card(state: GameState, id: string): string {
  const found = state.players['player-1']!.actionDeck.hand.find((entry) => entry.id === id);
  if (!found) throw new Error(`Нет карты ${id}`);
  return found.id;
}

function weapon(): ItemCard {
  return {
    id: 'ITEM_TEST_REVOLVER',
    color: 'RED',
    origin: 'STARTING',
    name: 'Револьвер',
    description: '',
    isHeavy: true,
    isSingleUse: false,
    actionCost: 0,
    isWeapon: true,
    isEnergyWeapon: true,
    ammo: 1,
    maxAmmo: 6,
    componentSymbols: [],
  };
}

function item(state: GameState, id: string, patch: Partial<ItemCard> = {}): ItemCard {
  const template = [
    ...state.decks.items.RED.drawPile,
    ...state.decks.items.YELLOW.drawPile,
    ...state.decks.items.GREEN.drawPile,
  ].find((entry) => entry.id === id);
  if (!template) throw new Error(`Нет предмета ${id}`);
  return structuredClone({ ...template, ...patch });
}

function play(
  state: GameState,
  cardId: string,
  discardCardIds: string[] = [],
  payload: Record<string, string> = {},
): GameState {
  return new GameEngine().processAction(state, {
    type: 'ACTION_PLAY_CARD',
    payload: { cardId, discardCardIds, ...payload },
  });
}

describe('Разыгрывание карт Действий (стр. 10, 13)', () => {
  it('уходит в личный сброс, считает действие и передаёт ход после второго', () => {
    const state = playState();
    // «Перезарядка» требует оружие не полным: стартовый Револьвер заряжаем на 5/6.
    const weaponSlot = state.players['player-1']!.handSlots[0];
    if (weaponSlot && weaponSlot.source === 'ITEM') weaponSlot.card.ammo = 5;
    // «Отдых» требует карту Заражения на руке.
    state.players['player-1']!.actionDeck.hand.push({ id: 'CONTAMINATION_REST', isInfected: false, isScanned: false });

    const next = play(state, card(state, 'ACT_CAP_RELOAD'));
    const player = next.players['player-1']!;
    expect(player.actionDeck.hand).toHaveLength(10);
    expect(player.actionDeck.discard.map((entry) => entry.id)).toEqual(['ACT_CAP_RELOAD']);
    expect(player.actionsPerformedThisRound).toBe(1);
    const finished = play(next, card(next, 'ACT_CAP_REST'));
    expect(finished.players['player-1']!.actionsPerformedThisRound).toBe(0);
  });

  it('оплата берётся с руки; Заражение и сама разыгрываемая карта оплатой быть не могут', () => {
    const state = playState();
    // «Базовый ремонт» требует маркер Неисправности в отсеке.
    state.ship.rooms[state.players['player-1']!.roomId]!.hasMalfunction = true;
    state.players['player-1']!.actionDeck.hand.push({ id: 'CONTAMINATION_1', isInfected: false, isScanned: false });
    expectEngineError(
      () => play(state, card(state, 'ACT_CAP_BASIC_REPAIR'), [card(state, 'ACT_CAP_RELOAD'), 'CONTAMINATION_1']),
      'CONTAMINATION_CANNOT_BE_DISCARDED_AS_COST',
    );
    expectEngineError(
      () => play(state, card(state, 'ACT_CAP_BASIC_REPAIR'), ['ACT_CAP_BASIC_REPAIR', card(state, 'ACT_CAP_RELOAD')]),
      'PAYMENT_CARD_CANNOT_PAY_SELF',
    );
    const next = play(state, card(state, 'ACT_CAP_BASIC_REPAIR'), [
      card(state, 'ACT_CAP_RELOAD'),
      card(state, 'ACT_CAP_ORDER'),
    ]);
    expect(next.players['player-1']!.actionDeck.discard.map((entry) => entry.id).sort()).toEqual([
      'ACT_CAP_BASIC_REPAIR',
      'ACT_CAP_ORDER',
      'ACT_CAP_RELOAD',
    ]);
    expect(next.players['player-1']!.actionDeck.hand).toHaveLength(8);
  });

  it('нельзя разыграть карту другого персонажа или отсутствующую карту', () => {
    const state = playState();
    expectEngineError(() => play(state, 'ACT_PIL_PILOTING'), 'INSUFFICIENT_ACTION_CARDS');
    expectEngineError(() => play(state, 'ACT_CAP_MISSING'), 'INSUFFICIENT_ACTION_CARDS');
  });

  it('Отдых сканирует Заражение в руке: чистая удаляется, инфицированная остаётся без раскрытия инфекции', () => {
    const state = playState();
    const player = state.players['player-1']!;
    player.actionDeck.hand.push({ id: 'CONTAMINATION_2', isInfected: true, isScanned: false });
    player.actionDeck.hand.push({ id: 'CONTAMINATION_3', isInfected: false, isScanned: false });
    const next = play(state, card(state, 'ACT_CAP_REST'));
    expect(next.players['player-1']!.actionDeck.hand.map((entry) => entry.id)).toEqual([
      ...CAPTAIN_DECK.filter((id) => id !== 'ACT_CAP_REST'),
      'CONTAMINATION_2',
    ]);
    expect(next.players['player-1']!.actionDeck.hand.at(-1)).toMatchObject({ isScanned: true, isInfected: true });
  });

  it('Демонтаж с выбранной Дверью переводит её в Разрушенную', () => {
    const state = playState();
    const roomId = state.players['player-1']!.roomId;
    const corridor = Object.values(state.ship.corridors).find(
      (candidate) =>
        (candidate.fromRoomId === roomId || candidate.toRoomId === roomId) && candidate.doorState !== 'DESTROYED',
    );
    expect(corridor).toBeDefined();
    const next = play(state, card(state, 'ACT_CAP_DEMOLITION'), [], { targetCorridorId: corridor!.id });
    expect(next.ship.corridors[corridor!.id]?.doorState).toBe('DESTROYED');
  });
});

describe('Использование Предметов (стр. 10, 22)', () => {
  function use(state: GameState, itemId: string, discardCardIds: string[] = []): GameState {
    return new GameEngine().processAction(state, { type: 'ACTION_USE_ITEM', payload: { itemId, discardCardIds } });
  }

  it('одноразовый Предмет уходит из инвентаря, многоразовый остаётся', () => {
    const state = playState();
    const single = item(state, 'ITEM_GRE_MEDKIT_1');
    const multi = item(state, 'ITEM_GRE_CLOTHES_1', { isSingleUse: false });
    state.players['player-1']!.lightWounds = 1; // Аптечке нужно, что лечить
    state.players['player-1']!.hasSlime = true; // Одежде нужна Слизь
    state.players['player-1']!.inventory = [single, multi];
    const next = use(state, single.id, [card(state, 'ACT_CAP_RELOAD')]);
    expect(next.players['player-1']!.inventory.map((entry) => entry.id)).toEqual([multi.id]);
    expect(next.players['player-1']!.actionDeck.discard.map((entry) => entry.id)).toEqual(['ACT_CAP_RELOAD']);
    const again = structuredClone(next);
    again.players['player-1']!.hasSlime = true; // многоразовая Одежда применима повторно
    expect(use(again, multi.id, [card(next, 'ACT_CAP_ORDER')]).players['player-1']!.inventory).toHaveLength(1);
  });

  it('Аптечка лечит Лёгкие Травмы, Алкоголь удаляет карту Заражения из руки', () => {
    const state = playState();
    state.players['player-1']!.lightWounds = 2;
    state.players['player-1']!.inventory = [item(state, 'ITEM_GRE_MEDKIT_1'), item(state, 'ITEM_GRE_ALCOHOL_1')];
    state.players['player-1']!.actionDeck.hand.push({ id: 'CONTAMINATION_4', isInfected: false, isScanned: false });
    const healed = use(state, 'ITEM_GRE_MEDKIT_1', [card(state, 'ACT_CAP_RELOAD')]);
    expect(healed.players['player-1']!.lightWounds).toBe(0);
    const withoutContamination = use(healed, 'ITEM_GRE_ALCOHOL_1', [card(healed, 'ACT_CAP_ORDER')]);
    expect(
      withoutContamination.players['player-1']!.actionDeck.hand.some((entry) => entry.id === 'CONTAMINATION_4'),
    ).toBe(false);
  });

  it('Одежда снимает Слизь, Огнетушитель тушит отсек, Инструменты чинят Неисправность', () => {
    const state = playState();
    state.players['player-1']!.hasSlime = true;
    state.ship.rooms[11]!.hasFire = true;
    state.ship.rooms[11]!.hasMalfunction = true;
    state.players['player-1']!.inventory = [
      item(state, 'ITEM_GRE_CLOTHES_1'),
      item(state, 'ITEM_YEL_FIRE_EXTINGUISHER_1'),
      item(state, 'ITEM_YEL_TOOLS_1'),
    ];
    const withoutSlime = use(state, 'ITEM_GRE_CLOTHES_1', [card(state, 'ACT_CAP_RELOAD')]);
    const withoutFire = use(withoutSlime, 'ITEM_YEL_FIRE_EXTINGUISHER_1', [card(state, 'ACT_CAP_ORDER')]);
    const repaired = use(withoutFire, 'ITEM_YEL_TOOLS_1', [card(state, 'ACT_CAP_MOTIVATION')]);
    expect(repaired.players['player-1']!).toMatchObject({ hasSlime: false });
    expect(repaired.ship.rooms[11]!).toMatchObject({ hasFire: false, hasMalfunction: false });
  });

  it('Синтетическая еда добирает из личной колоды, Энергия заряжает оружие в слоте Руки', () => {
    const state = playState();
    const player = state.players['player-1']!;
    const food = item(state, 'ITEM_GRE_SYNTHETIC_FOOD_1');
    const energy = item(state, 'ITEM_RED_ENERGY_CHARGE_1');
    player.inventory = [food, energy];
    player.handSlots = [{ source: 'ITEM', card: weapon() }];
    player.actionDeck.drawPile = ['ACT_CAP_EXTRA_1', 'ACT_CAP_EXTRA_2'].map((id) => ({
      id,
      characterClass: 'CAPTAIN',
      name: id,
      playCost: 0,
      description: '',
    }));
    const afterFood = use(state, food.id, [card(state, 'ACT_CAP_RELOAD')]);
    expect(afterFood.players['player-1']!.actionDeck.hand).toHaveLength(11);
    const reloaded = use(afterFood, energy.id, [card(afterFood, 'ACT_CAP_ORDER')]);
    expect(reloaded.players['player-1']!.handSlots[0]).toMatchObject({ source: 'ITEM', card: { ammo: 6, maxAmmo: 6 } });
  });

  it('неизвестный Предмет и нехватка оплаты отклоняются', () => {
    const state = playState();
    expectEngineError(() => use(state, 'ITEM_MISSING'), 'NO_ITEMS_LEFT');
    state.players['player-1']!.inventory = [item(state, 'ITEM_GRE_MEDKIT_1')];
    expectEngineError(() => use(state, 'ITEM_GRE_MEDKIT_1', []), 'INSUFFICIENT_ACTION_CARDS');
  });
});
