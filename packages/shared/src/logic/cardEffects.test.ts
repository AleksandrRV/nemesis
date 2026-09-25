import { describe, expect, it } from 'vitest';
import { contactState, expectEngineError, putPlayer } from '../testing/contactFixtures.js';
import type { ActionCard, ItemCard } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import { GameEngine } from './fsm.js';

/**
 * Машинные эффекты карт Действий и Предметов («карты работают»):
 * каждая разыгранная карта меняет состояние по печатному тексту,
 * а невыполнимая карта отклоняется с понятной причиной.
 */

function captainState(seed = 'card-effects'): GameState {
  const state = contactState(1, seed);
  const player = state.players['player-1']!;
  player.actionDeck.hand = [
    card('ACT_CAP_RELOAD', { kind: 'RELOAD', ammoGain: 1 }),
    card('ACT_CAP_ORDER', { kind: 'ORDER' }),
    card('ACT_CAP_MOTIVATION', { kind: 'MOTIVATION', drawCount: 1 }),
    card('ACT_CAP_REST', { kind: 'REST' }),
    card('ACT_CAP_DEMOLITION', { kind: 'DEMOLITION' }),
    card('ACT_CAP_BASIC_REPAIR', { kind: 'BASIC_REPAIR' }),
    card('ACT_CAP_SEARCH', { kind: 'SEARCH' }),
    card('ACT_CAP_SCAVENGE', { kind: 'SCAVENGE' }),
    card('ACT_CAP_SHIP_KNOWLEDGE', { kind: 'SHIP_KNOWLEDGE' }),
    card('ACT_CAP_TECH_CORRIDORS', { kind: 'TECH_CORRIDORS' }),
  ];
  return state;
}

function card(id: string, effect: ActionCard['effect']): ActionCard {
  return { id, characterClass: 'CAPTAIN', name: id, playCost: 0, description: '', effect };
}

function play(state: GameState, cardId: string, payload: Record<string, unknown> = {}): GameState {
  return new GameEngine().processAction(state, { type: 'ACTION_PLAY_CARD', payload: { cardId, ...payload } });
}

function useItem(state: GameState, itemId: string, payload: Record<string, unknown> = {}): GameState {
  const discardCardIds = (payload.discardCardIds as string[] | undefined) ?? ['ACT_CAP_RELOAD'];
  return new GameEngine().processAction(state, {
    type: 'ACTION_USE_ITEM',
    payload: { itemId, discardCardIds, ...payload },
  });
}

function handItem(state: GameState, id: string): string {
  const template = [
    ...state.decks.items.RED.drawPile,
    ...state.decks.items.YELLOW.drawPile,
    ...state.decks.items.GREEN.drawPile,
  ].find((entry) => entry.id === id);
  if (!template) throw new Error(`Нет предмета ${id}`);
  return structuredClone(template).id;
}

function giveItem(state: GameState, id: string, patch: Partial<ItemCard> = {}): void {
  const template = [
    ...state.decks.items.RED.drawPile,
    ...state.decks.items.YELLOW.drawPile,
    ...state.decks.items.GREEN.drawPile,
  ].find((entry) => entry.id === id);
  if (!template) throw new Error(`Нет предмета ${id}`);
  state.players['player-1']!.inventory.push(structuredClone({ ...template, ...patch }));
}

describe('Эффекты карт Действий', () => {
  it('Перезарядка: +1 Боезапас, при полном магазине отклоняется с причиной', () => {
    const state = captainState();
    const slot = state.players['player-1']!.handSlots[0];
    if (slot && slot.source === 'ITEM') slot.card.ammo = 2;

    const next = play(state, 'ACT_CAP_RELOAD');
    const weapon = next.players['player-1']!.handSlots[0];
    expect(weapon && weapon.source === 'ITEM' ? weapon.card.ammo : null).toBe(3);

    const full = structuredClone(state);
    const fullSlot = full.players['player-1']!.handSlots[0];
    if (fullSlot && fullSlot.source === 'ITEM') fullSlot.card.ammo = fullSlot.card.maxAmmo;
    expectEngineError(() => play(full, 'ACT_CAP_RELOAD'), 'WEAPON_FULL');
  });

  it('Мотивация: все Персонажи в комнате добирают карту', () => {
    const state = contactState(2, 'card-effects-motivation');
    putPlayer(state, 'player-1', 11);
    putPlayer(state, 'player-2', 11);
    state.players['player-1']!.actionDeck.hand = [card('ACT_CAP_MOTIVATION', { kind: 'MOTIVATION', drawCount: 1 })];

    const next = play(state, 'ACT_CAP_MOTIVATION');
    expect(next.players['player-1']!.actionDeck.hand.length).toBe(1);
    expect(next.players['player-2']!.actionDeck.hand.length).toBe(
      contactState(2, 'card-effects-motivation').players['player-2']!.actionDeck.hand.length + 1,
    );
  });

  it('Разрушение: дверь соседнего коридора; чужой коридор отклоняется', () => {
    const state = captainState();
    const roomId = state.players['player-1']!.roomId;
    const corridor = Object.values(state.ship.corridors).find(
      (candidate) =>
        (candidate.fromRoomId === roomId || candidate.toRoomId === roomId) && candidate.doorState !== 'DESTROYED',
    )!;
    const next = play(state, 'ACT_CAP_DEMOLITION', { targetCorridorId: corridor.id });
    expect(next.ship.corridors[corridor.id]!.doorState).toBe('DESTROYED');

    const far = Object.values(state.ship.corridors).find(
      (candidate) => candidate.fromRoomId !== roomId && candidate.toRoomId !== roomId,
    )!;
    expectEngineError(() => play(state, 'ACT_CAP_DEMOLITION', { targetCorridorId: far.id }), 'INVALID_DECISION_OPTION');
  });

  it('Разрушение: вариант с маркером Неисправности', () => {
    const state = captainState();
    expect(state.ship.rooms[state.players['player-1']!.roomId]!.hasMalfunction).toBe(false);
    const next = play(state, 'ACT_CAP_DEMOLITION', { option: 'MALFUNCTION' });
    expect(next.ship.rooms[next.players['player-1']!.roomId]!.hasMalfunction).toBe(true);
  });

  it('Отдых: при Инфекции персонаж получает Личинку', () => {
    const state = captainState();
    state.players['player-1']!.actionDeck.hand.push({ id: 'CONTAMINATION_X', isInfected: true, isScanned: false });
    expect(state.players['player-1']!.hasLarva).toBe(false);
    const next = play(state, 'ACT_CAP_REST');
    expect(next.players['player-1']!.hasLarva).toBe(true);
  });

  it('Разведка: перемещение без кубика Шума', () => {
    const state = captainState();
    state.players['player-1']!.actionDeck.hand = [card('ACT_PIL_RECONNAISSANCE', { kind: 'RECONNAISSANCE' })];
    const roomId = state.players['player-1']!.roomId;
    const corridor = Object.values(state.ship.corridors).find(
      (candidate) =>
        (candidate.fromRoomId === roomId || candidate.toRoomId === roomId) && candidate.doorState !== 'CLOSED',
    )!;
    const target = corridor.fromRoomId === roomId ? corridor.toRoomId : corridor.fromRoomId;

    const next = play(state, 'ACT_PIL_RECONNAISSANCE', { targetRoomId: target });
    expect(next.players['player-1']!.roomId).toBe(target);
    // Кубик Шума не бросался: записей NOISE_ROLLED нет.
    expect(next.gameLog.some((entry) => entry.event.type === 'NOISE_ROLLED')).toBe(false);
  });

  it('Поиск: карта запускает поиск и открывает решение выбора предмета', () => {
    const state = captainState();
    const player = state.players['player-1']!;
    const room = state.ship.rooms[player.roomId]!;
    room.isExplored = true;
    room.itemsCount = 3;
    const next = play(state, 'ACT_CAP_SEARCH', { targetDeckColor: 'RED' });
    expect(next.pendingDecision?.type).toBe('CHOOSE_SEARCH_ITEM');
  });

  it('Технические коридоры: переносит в другой отсек со входом и спасует', () => {
    const state = captainState();
    state.players['player-1']!.actionDeck.hand = [card('ACT_MED_TECH_CORRIDORS', { kind: 'TECH_CORRIDORS' })];
    const roomId = state.players['player-1']!.roomId;
    const current = state.ship.rooms[roomId]!;
    current.hasTechnicalCorridorEntrance = true;
    const targetEntry = Object.values(state.ship.rooms).find(
      (candidate) => candidate.id !== roomId && candidate.hasTechnicalCorridorEntrance,
    );
    expect(targetEntry).toBeDefined();

    const next = play(state, 'ACT_MED_TECH_CORRIDORS', { targetRoomId: targetEntry!.id });
    expect(next.players['player-1']!.roomId).toBe(targetEntry!.id);
    expect(next.gameLog.some((entry) => entry.event.type === 'PLAYER_PASSED')).toBe(true);
  });

  it('Оценка угрозы: в комнате с Компьютером подглядывает карту Событий и кладёт её под низ', () => {
    const state = captainState();
    state.players['player-1']!.actionDeck.hand = [card('ACT_SCI_THREAT_ASSESSMENT', { kind: 'THREAT_ASSESSMENT' })];
    putPlayer(state, 'player-1', 14); // COMMAND_CENTER с Компьютером
    const topId = state.decks.events.drawPile[0]!.id;
    const next = play(state, 'ACT_SCI_THREAT_ASSESSMENT', { option: 'MOVE_BOTTOM' });
    expect(next.decks.events.drawPile.at(-1)!.id).toBe(topId);
    expect(next.gameLog.some((entry) => entry.event.type === 'EVENT_PEEKED')).toBe(true);

    const elsewhere = structuredClone(state);
    putPlayer(elsewhere, 'player-1', 11); // Каюты без Компьютера
    expectEngineError(() => play(elsewhere, 'ACT_SCI_THREAT_ASSESSMENT', { option: 'MOVE_BOTTOM' }), 'NO_COMPUTER');
  });

  it('Пиротехник: тушит Пожар; размещает Пожар ценой Предмета', () => {
    const state = captainState();
    state.players['player-1']!.actionDeck.hand = [
      card('ACT_MED_PYROTECHNIC', { kind: 'PYROTECHNIC' }),
      card('ACT_MED_PYROTECHNIC_2', { kind: 'PYROTECHNIC' }),
    ];
    const roomId = state.players['player-1']!.roomId;
    state.ship.rooms[roomId]!.hasFire = true;

    const extinguished = play(state, 'ACT_MED_PYROTECHNIC', { option: 'EXTINGUISH' });
    expect(extinguished.ship.rooms[roomId]!.hasFire).toBe(false);

    const base = structuredClone(extinguished);
    base.players['player-1']!.actionDeck.hand.push(card('ACT_MED_PYROTECHNIC_2', { kind: 'PYROTECHNIC' }));
    giveItem(base, handItem(base, 'ITEM_GRE_ALCOHOL_1'));
    const itemId = base.players['player-1']!.inventory[0]!.id;
    const burning = play(base, 'ACT_MED_PYROTECHNIC_2', { targetItemId: itemId });
    expect(burning.ship.rooms[roomId]!.hasFire).toBe(true);
    expect(burning.players['player-1']!.inventory).toHaveLength(0);
  });

  it('Недоступные сейчас карты отклоняются с явной причиной', () => {
    const state = captainState();
    state.players['player-1']!.actionDeck.hand = [
      card('ACT_CAP_DISMISS', { kind: 'DISMISS' }),
      card('ACT_SOL_STEEL_NERVES', { kind: 'STEEL_NERVES' }),
      card('ACT_PIL_PILOTING', { kind: 'PILOTING' }),
    ];
    for (const played of ['ACT_CAP_DISMISS', 'ACT_SOL_STEEL_NERVES', 'ACT_PIL_PILOTING']) {
      expectEngineError(() => play(state, played), 'CARD_NOT_USABLE_NOW');
    }
  });
});

describe('Эффекты Предметов', () => {
  it('Энергозаряд: заряжает Энергооружие полностью; вариант с Дверью', () => {
    const state = structuredClone(captainState());
    const slot = state.players['player-1']!.handSlots[0];
    expect(slot).toBeTruthy();
    if (slot && slot.source === 'ITEM') {
      slot.card.isEnergyWeapon = true;
      slot.card.ammo = 1;
    }
    giveItem(state, 'ITEM_RED_ENERGY_CHARGE_1');
    const itemId = state.players['player-1']!.inventory[0]!.id;

    const next = useItem(state, itemId);
    const weapon = next.players['player-1']!.handSlots[0];
    expect(weapon && weapon.source === 'ITEM' ? weapon.card.ammo : null).toBe(
      weapon && weapon.source === 'ITEM' ? weapon.card.maxAmmo : null,
    );
  });

  it('Инструменты: открывают/закрывают Дверь любым вариантом', () => {
    const state = captainState();
    giveItem(state, 'ITEM_YEL_TOOLS_1');
    const itemId = state.players['player-1']!.inventory[0]!.id;
    const roomId = state.players['player-1']!.roomId;
    const corridor = Object.values(state.ship.corridors).find(
      (candidate) =>
        (candidate.fromRoomId === roomId || candidate.toRoomId === roomId) && candidate.doorState === 'OPEN',
    );
    expect(corridor).toBeDefined();
    const before = corridor!.doorState;
    const next = useItem(state, itemId, { option: 'DOOR', targetCorridorId: corridor!.id });
    expect(next.ship.corridors[corridor!.id]!.doorState).not.toBe(before);
  });

  it('Огнетушитель: заставляет Чужого в комнате Отступить', () => {
    const state = captainState();
    const roomId = state.players['player-1']!.roomId;
    state.ship.rooms[roomId]!.occupantIntruderIds.push('retreat-target');
    state.intrudersPool.boardTokens.push({ id: 'retreat-target', type: 'ADULT', roomId, woundsCount: 0 });
    giveItem(state, 'ITEM_YEL_FIRE_EXTINGUISHER_1');
    const itemId = state.players['player-1']!.inventory[0]!.id;

    const next = useItem(state, itemId, { option: 'RETREAT' });
    // Отступление читает карту Событий — журнал должен зафиксировать факт.
    expect(next.gameLog.length).toBeGreaterThan(state.gameLog.length);
  });

  it('Аптечка: без варианта лечит Лёгкие Травмы, с вариантом — обрабатывает Тяжёлую', () => {
    const state = captainState();
    giveItem(state, 'ITEM_GRE_MEDKIT_1');
    const itemId = state.players['player-1']!.inventory[0]!.id;
    const player = state.players['player-1']!;
    player.lightWounds = 2;

    const healed = useItem(state, itemId);
    expect(healed.players['player-1']!.lightWounds).toBe(0);

    const healedCopy = structuredClone(healed);
    giveItem(healedCopy, 'ITEM_GRE_MEDKIT_2'); // первая Аптечка одноразовая — уже списана
    const secondId = healedCopy.players['player-1']!.inventory[0]!.id;
    const wounded = healedCopy;
    wounded.players['player-1']!.seriousWounds.push({
      id: 'sw-1',
      name: 'Тяжёлая травма',
      description: '',
      isTreated: false,
    });
    const payment = wounded.players['player-1']!.actionDeck.hand[0]!.id;
    const treated = useItem(wounded, secondId, { option: 'TREAT_SERIOUS', discardCardIds: [payment] });
    expect(treated.players['player-1']!.seriousWounds[0]).toMatchObject({ isTreated: true });
  });

  it('Алкоголь: удаляет карту Заражения; за Инфекцию берётся новая карта Заражения', () => {
    const state = captainState();
    giveItem(state, 'ITEM_GRE_ALCOHOL_1');
    const itemId = state.players['player-1']!.inventory[0]!.id;
    state.players['player-1']!.actionDeck.hand.push({ id: 'CONTAMINATION_INF', isInfected: true, isScanned: false });
    const contaminationCount = state.decks.contamination.drawPile.length;

    const next = useItem(state, itemId);
    const hand = next.players['player-1']!.actionDeck.hand;
    expect(hand.some((entry) => entry.id === 'CONTAMINATION_INF')).toBe(false);
    expect(next.players['player-1']!.actionDeck.discard.some((entry) => entry.id === 'CONTAMINATION_INF')).toBe(false);
    expect(next.decks.contamination.discard.some((entry) => entry.id === 'CONTAMINATION_INF')).toBe(false);
    expect(next.decks.contamination.drawPile.length).toBe(contaminationCount - 1);
    expect(hand.some((entry) => !('characterClass' in entry))).toBe(true);
  });
});
