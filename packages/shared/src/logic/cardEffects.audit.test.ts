import { describe, expect, it } from 'vitest';
import {
  contactState,
  existingIntruder,
  expectEngineError,
  giveSeriousWounds,
  putPlayer,
} from '../testing/contactFixtures.js';
import type { ActionCard, ItemCard } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import { CRAFTED_ITEM_CARDS } from '../data/crafting.js';
import { GREEN_ITEM_CARDS, RED_ITEM_CARDS, YELLOW_ITEM_CARDS } from '../data/itemCards.js';
import { getItemEffectKind } from '../data/itemEffectKinds.js';
import { filterStateForPlayer } from './sanitizer.js';
import { GameEngine } from './fsm.js';

const ALL_ITEMS: readonly ItemCard[] = [
  ...RED_ITEM_CARDS,
  ...YELLOW_ITEM_CARDS,
  ...GREEN_ITEM_CARDS,
  ...CRAFTED_ITEM_CARDS,
];

function give(state: GameState, id: string, playerId = 'player-1'): string {
  const template = ALL_ITEMS.find((item) => item.id === id);
  if (!template) throw new Error(`Нет предмета ${id}`);
  state.players[playerId]!.inventory.push(structuredClone(template));
  return id;
}

function paymentCard(state: GameState, playerId = 'player-1'): string {
  return state.players[playerId]!.actionDeck.hand.find((card) => 'characterClass' in card)!.id;
}

function useItem(state: GameState, itemId: string, payload: Record<string, unknown> = {}): GameState {
  const item = state.players['player-1']!.inventory.find((entry) => entry.id === itemId);
  const discardCardIds = item && item.actionCost > 0 ? [paymentCard(state)] : [];
  return new GameEngine().processAction(state, {
    type: 'ACTION_USE_ITEM',
    payload: { itemId, discardCardIds, ...payload },
  });
}

function playCard(state: GameState, card: ActionCard, payload: Record<string, unknown> = {}): GameState {
  state.players['player-1']!.actionDeck.hand.push(card);
  return new GameEngine().processAction(state, { type: 'ACTION_PLAY_CARD', payload: { cardId: card.id, ...payload } });
}

function actionCard(effect: ActionCard['effect']): ActionCard {
  return {
    id: `TEST_${effect.kind}`,
    characterClass: 'CAPTAIN',
    name: effect.kind,
    playCost: 0,
    description: '',
    effect,
  };
}

function engineRoomId(state: GameState): number {
  return Object.values(state.ship.rooms).find((room) => room.definitionId === 'ENGINE_01')!.id;
}

function neighbourOf(state: GameState, roomId: number): number {
  const corridor = Object.values(state.ship.corridors).find(
    (entry) => entry.fromRoomId === roomId || entry.toRoomId === roomId,
  )!;
  return corridor.fromRoomId === roomId ? corridor.toRoomId : corridor.fromRoomId;
}

function unexploredRoomIds(state: GameState): number[] {
  return Object.values(state.ship.rooms)
    .filter((room) => !room.isExplored)
    .map((room) => room.id);
}

describe('Предметы: тип эффекта по точному префиксу id', () => {
  it('каждая карта Предмета получает свой эффект, без путаницы Гранаты и Дымовой гранаты', () => {
    expect(getItemEffectKind(RED_ITEM_CARDS.find((item) => item.id.startsWith('ITEM_RED_SMOKE'))!)).toBe(
      'SMOKE_GRENADE',
    );
    expect(getItemEffectKind(RED_ITEM_CARDS.find((item) => item.id.startsWith('ITEM_RED_GRENADE'))!)).toBe('GRENADE');
    expect(ALL_ITEMS.filter((item) => getItemEffectKind(item) === 'UNKNOWN')).toEqual([]);
  });
});

describe('Одноразовые Предметы уходят в сброс своей колоды (стр. 22)', () => {
  it('использованная Синтетическая еда лежит в сбросе Зелёной колоды', () => {
    const state = contactState(1, 'item-discard');
    give(state, 'ITEM_GRE_SYNTHETIC_FOOD_1');
    const next = useItem(state, 'ITEM_GRE_SYNTHETIC_FOOD_1');
    expect(next.players['player-1']!.inventory.some((item) => item.id === 'ITEM_GRE_SYNTHETIC_FOOD_1')).toBe(false);
    expect(next.decks.items.GREEN.discard.some((item) => item.id === 'ITEM_GRE_SYNTHETIC_FOOD_1')).toBe(true);
  });

  it('Увеличенный магазин прикрепляется один раз: уходит из инвентаря, но не в сброс', () => {
    const state = contactState(1, 'magazine');
    const player = state.players['player-1']!;
    player.handSlots = [
      {
        source: 'ITEM',
        card: {
          ...structuredClone(RED_ITEM_CARDS[0]!),
          id: 'E_RIFLE',
          isWeapon: true,
          isEnergyWeapon: true,
          ammo: 1,
          maxAmmo: 4,
        },
      },
    ];
    give(state, 'ITEM_RED_EXTENDED_MAGAZINE_1');
    const next = useItem(state, 'ITEM_RED_EXTENDED_MAGAZINE_1');
    const weapon = next.players['player-1']!.handSlots[0];
    expect(weapon?.source === 'ITEM' && [weapon.card.ammo, weapon.card.maxAmmo]).toEqual([3, 6]);
    expect(next.players['player-1']!.inventory).toHaveLength(0);
    expect(next.decks.items.RED.discard.some((item) => item.id === 'ITEM_RED_EXTENDED_MAGAZINE_1')).toBe(false);
  });
});

describe('Двигатель: починить или повредить по выбору игрока (стр. 26)', () => {
  it('игрок выбирает состояние, узнаёт его, а журнал сообщает только, менялся ли порядок жетонов', () => {
    const state = contactState(2, 'engine-choice');
    putPlayer(state, 'player-1', engineRoomId(state));
    state.ship.engines[1]!.isWorking = true;

    const next = playCard(state, actionCard({ kind: 'REPAIR' }), { option: 'ENGINE_DAMAGE' });
    expect(next.ship.engines[1]!.isWorking).toBe(false);
    expect(next.players['player-1']!.inspectedEngines).toContain(1);
    const own = filterStateForPlayer(next, 'player-1').gameLog.find((entry) => entry.event.type === 'ENGINE_TOGGLED')!;
    const other = filterStateForPlayer(next, 'player-2').gameLog.find(
      (entry) => entry.event.type === 'ENGINE_TOGGLED',
    )!;
    expect(own.event).toMatchObject({ isWorking: false, orderChanged: true });
    expect(other.event).toMatchObject({ isWorking: null, orderChanged: true });
    expect(filterStateForPlayer(next, 'player-2').ship.engines[1]!.isWorking).toBeNull();
  });

  it('«починить» исправный Двигатель не меняет порядок жетонов; старый вариант переключения отклоняется', () => {
    const state = contactState(1, 'engine-keep');
    putPlayer(state, 'player-1', engineRoomId(state));
    state.ship.engines[1]!.isWorking = true;
    const next = playCard(structuredClone(state), actionCard({ kind: 'REPAIR' }), { option: 'ENGINE_REPAIR' });
    expect(next.gameLog.at(-1)?.event).toMatchObject({ type: 'ENGINE_TOGGLED', orderChanged: false });
    expectEngineError(
      () => playCard(structuredClone(state), actionCard({ kind: 'REPAIR' }), { option: 'ENGINE' }),
      'INVALID_DECISION_OPTION',
    );
  });
});

describe('Подглядывание остаётся тайной (анти-чит)', () => {
  it('жетон Исследования и число предметов видит только владелец Дрона', () => {
    const state = contactState(2, 'peek-secret');
    const roomId = unexploredRoomIds(state)[0]!;
    give(state, 'ITEM_RED_RECON_DRONE_1');
    const next = useItem(state, 'ITEM_RED_RECON_DRONE_1', { targetRoomId: roomId });
    const own = filterStateForPlayer(next, 'player-1').gameLog.find((entry) => entry.event.type === 'ROOM_PEEKED')!;
    const other = filterStateForPlayer(next, 'player-2').gameLog.find((entry) => entry.event.type === 'ROOM_PEEKED')!;
    expect(own.event).toMatchObject({ itemsCount: next.ship.rooms[roomId]!.itemsCount });
    expect(other.event).toMatchObject({ effect: null, itemsCount: null, roomId });
  });

  it('Планы «Немезиды» требуют двух разных Неисследованных отсеков', () => {
    const state = contactState(1, 'nemesis-plans');
    const [first, second] = unexploredRoomIds(state);
    give(state, 'ITEM_YEL_NEMESIS_PLANS_1');
    expectEngineError(
      () => useItem(structuredClone(state), 'ITEM_YEL_NEMESIS_PLANS_1', { targetRoomId: first }),
      'INVALID_DECISION_OPTION',
    );
    const next = useItem(state, 'ITEM_YEL_NEMESIS_PLANS_1', { targetRoomId: first, targetRoomId2: second });
    expect(next.gameLog.filter((entry) => entry.event.type === 'ROOM_PEEKED')).toHaveLength(2);
  });
});

describe('Граната и Огнетушитель: выбор конкретного Чужого', () => {
  it('выбранный Чужой получает 2 Раны, остальные в комнате — по 1, Персонажи — Лёгкую Травму', () => {
    const state = contactState(1, 'grenade');
    const roomId = state.players['player-1']!.roomId;
    const larvaA = existingIntruder(state, 'LARVA', roomId);
    const larvaB = existingIntruder(state, 'LARVA', roomId);
    give(state, 'ITEM_RED_GRENADE_1');
    expectEngineError(
      () => useItem(structuredClone(state), 'ITEM_RED_GRENADE_1', { targetRoomId: roomId }),
      'INVALID_DECISION_OPTION',
    );
    const next = useItem(state, 'ITEM_RED_GRENADE_1', { targetIntruderId: larvaA });
    const alive = next.intrudersPool.boardTokens.map((token) => token.id);
    expect(alive).not.toContain(larvaA);
    expect(alive).not.toContain(larvaB);
    expect(next.players['player-1']!.lightWounds).toBe(1);
  });

  it('Огнетушитель прогоняет именно выбранного Чужого', () => {
    const state = contactState(1, 'extinguisher');
    const roomId = state.players['player-1']!.roomId;
    existingIntruder(state, 'ADULT', roomId);
    const target = existingIntruder(state, 'ADULT', roomId);
    give(state, 'ITEM_YEL_FIRE_EXTINGUISHER_1');
    expectEngineError(
      () => useItem(structuredClone(state), 'ITEM_YEL_FIRE_EXTINGUISHER_1', { option: 'RETREAT' }),
      'INVALID_DECISION_OPTION',
    );
    const next = useItem(state, 'ITEM_YEL_FIRE_EXTINGUISHER_1', { option: 'RETREAT', targetIntruderId: target });
    const log = next.gameLog
      .map((entry) => entry.event)
      .filter((event) => 'intruderId' in event && event.intruderId === target);
    expect(log.length).toBeGreaterThan(0);
  });
});

describe('Медицинские Предметы и препараты по печатному тексту', () => {
  it('Бинты не вылечивают Обработанную Тяжёлую Травму — это умеет только Аптечка', () => {
    const state = contactState(1, 'bandages');
    giveSeriousWounds(state, 'player-1', 1, true);
    give(state, 'ITEM_GRE_BANDAGES_1');
    give(state, 'ITEM_GRE_MEDKIT_1');
    expectEngineError(
      () => useItem(structuredClone(state), 'ITEM_GRE_BANDAGES_1', { option: 'HEAL_TREATED' }),
      'INVALID_DECISION_OPTION',
    );
    const next = useItem(state, 'ITEM_GRE_MEDKIT_1', { option: 'HEAL_TREATED' });
    expect(next.players['player-1']!.seriousWounds).toHaveLength(0);
  });

  it('Военные препараты: можно сбросить 0 карт и взять 1', () => {
    const state = contactState(1, 'stimulants');
    give(state, 'ITEM_RED_MILITARY_STIMULANTS_1');
    const handBefore = state.players['player-1']!.actionDeck.hand.length;
    const next = useItem(state, 'ITEM_RED_MILITARY_STIMULANTS_1', { targetCardIds: [] });
    expect(next.players['player-1']!.actionDeck.hand.length).toBe(handBefore - 1 + 1);
  });

  it('Инъекция адреналина снимает лимит двух Действий до Паса', () => {
    const state = contactState(1, 'adrenaline');
    give(state, 'ITEM_GRE_ADRENALINE_1');
    give(state, 'ITEM_GRE_SYNTHETIC_FOOD_1');
    give(state, 'ITEM_GRE_SYNTHETIC_FOOD_2');
    let next = useItem(state, 'ITEM_GRE_ADRENALINE_1');
    next = useItem(next, 'ITEM_GRE_SYNTHETIC_FOOD_1');
    next = useItem(next, 'ITEM_GRE_SYNTHETIC_FOOD_2');
    expect(next.players['player-1']!.actionsPerformedThisRound).toBe(3);
    expect(next.meta.activePlayerId).toBe('player-1');
    next = new GameEngine().processAction(next, { type: 'ACTION_PASS', payload: {} });
    expect(next.players['player-1']!.hasAdrenalineRush).toBe(false);
  });
});

describe('Приманка, Дымовая граната и создаваемые Предметы', () => {
  it('Приманка не трогает Чужих из вашей комнаты и требует соседний отсек', () => {
    const state = contactState(1, 'decoy');
    const roomId = state.players['player-1']!.roomId;
    const own = existingIntruder(state, 'ADULT', roomId);
    give(state, 'ITEM_RED_DECOY_1');
    expectEngineError(
      () => useItem(structuredClone(state), 'ITEM_RED_DECOY_1', { targetRoomId: neighbourOf(state, roomId) }),
      'UNKNOWN_INTRUDER',
    );
    expect(state.intrudersPool.boardTokens.find((token) => token.id === own)?.roomId).toBe(roomId);
  });

  it('Дымовая граната переносит в соседний отсек; при других Персонажах в комнате — явный отказ', () => {
    const lone = contactState(1, 'smoke');
    const roomId = lone.players['player-1']!.roomId;
    give(lone, 'ITEM_RED_SMOKE_GRENADE_1');
    const target = neighbourOf(lone, roomId);
    const moved = useItem(lone, 'ITEM_RED_SMOKE_GRENADE_1', { targetRoomId: target });
    expect(moved.players['player-1']!.roomId).toBe(target);

    const crowded = contactState(2, 'smoke-crowded');
    putPlayer(crowded, 'player-2', crowded.players['player-1']!.roomId);
    give(crowded, 'ITEM_RED_SMOKE_GRENADE_1');
    expectEngineError(
      () =>
        useItem(crowded, 'ITEM_RED_SMOKE_GRENADE_1', {
          targetRoomId: neighbourOf(crowded, crowded.players['player-1']!.roomId),
        }),
      'CARD_NOT_USABLE_NOW',
    );
  });

  it('Тазер заставляет выбранного Персонажа сбросить всю руку', () => {
    const state = contactState(2, 'taser');
    putPlayer(state, 'player-2', state.players['player-1']!.roomId);
    give(state, 'CRAFTED_TASER_1');
    const next = useItem(state, 'CRAFTED_TASER_1', { option: 'DISARM_CHARACTER', targetPlayerId: 'player-2' });
    expect(next.players['player-2']!.actionDeck.hand).toHaveLength(0);
    expect(next.decks.craftedItems.discard.some((item) => item.id === 'CRAFTED_TASER_1')).toBe(true);
  });

  it('Коктейль Молотова: Пожар в комнате с Чужим и Тяжёлая Травма каждому Персонажу в ней', () => {
    const state = contactState(1, 'molotov');
    const roomId = state.players['player-1']!.roomId;
    existingIntruder(state, 'ADULT', roomId);
    give(state, 'CRAFTED_MOLOTOV_1');
    const next = useItem(state, 'CRAFTED_MOLOTOV_1', { targetRoomId: roomId });
    expect(next.ship.rooms[roomId]!.hasFire).toBe(true);
    expect(next.players['player-1']!.seriousWounds).toHaveLength(1);
  });

  it('Антидот удаляет Инфекцию и Личинку, даёт карту Заражения и заставляет спасовать', () => {
    const state = contactState(2, 'antidote');
    const player = state.players['player-1']!;
    player.hasLarva = true;
    player.actionDeck.drawPile.push({ id: 'INFECTED_X', isInfected: true, isScanned: false });
    give(state, 'CRAFTED_ANTIDOTE_1');
    const next = useItem(state, 'CRAFTED_ANTIDOTE_1');
    const deck = next.players['player-1']!.actionDeck;
    const all = [...deck.hand, ...deck.drawPile, ...deck.discard];
    expect(all.some((card) => card.id === 'INFECTED_X')).toBe(false);
    expect(next.players['player-1']!.hasLarva).toBe(false);
    expect(next.players['player-1']!.hasPassed).toBe(true);
  });
});

describe('Карты Действий: правки по аудиту', () => {
  it('«Перезарядка» Капитана заряжает именно Револьвер', () => {
    const state = contactState(1, 'reload-hint');
    const player = state.players['player-1']!;
    const base = structuredClone(RED_ITEM_CARDS[0]!);
    player.handSlots = [
      { source: 'ITEM', card: { ...base, id: 'CRAFTED_FLAMETHROWER_1', isWeapon: true, ammo: 1, maxAmmo: 4 } },
      { source: 'ITEM', card: { ...base, id: 'WEAPON_CAPTAIN_REVOLVER', isWeapon: true, ammo: 2, maxAmmo: 6 } },
    ];
    const next = playCard(state, actionCard({ kind: 'RELOAD', ammoGain: 1, weaponHint: 'REVOLVER' }));
    const ammo = next.players['player-1']!.handSlots.map((slot) => (slot.source === 'ITEM' ? slot.card.ammo : null));
    expect(ammo).toEqual([1, 3]);
  });

  it('«Пиротехник»: сброшенный за Пожар Предмет уходит в сброс своей колоды', () => {
    const state = contactState(1, 'pyro');
    give(state, 'ITEM_GRE_SYNTHETIC_FOOD_1');
    const next = playCard(state, actionCard({ kind: 'PYROTECHNIC' }), {
      option: 'PLACE_FIRE',
      targetItemId: 'ITEM_GRE_SYNTHETIC_FOOD_1',
    });
    expect(next.ship.rooms[next.players['player-1']!.roomId]!.hasFire).toBe(true);
    expect(next.decks.items.GREEN.discard.some((item) => item.id === 'ITEM_GRE_SYNTHETIC_FOOD_1')).toBe(true);
  });
});

describe('Журнал в срезе игрока (анти-чит)', () => {
  it('название подсмотренной карты Событий видит только подсмотревший', () => {
    const state = contactState(2, 'event-peek');
    state.gameLog.push({
      id: 'log-peek',
      sequence: 999,
      event: { type: 'EVENT_PEEKED', playerId: 'player-1', cardName: 'Охота', placed: 'BOTTOM' },
    });
    const own = filterStateForPlayer(state, 'player-1').gameLog.at(-1)!.event;
    const other = filterStateForPlayer(state, 'player-2').gameLog.at(-1)!.event;
    expect(own).toMatchObject({ cardName: 'Охота', placed: 'BOTTOM' });
    expect(other).toMatchObject({ cardName: null, placed: 'BOTTOM' });
  });
});
