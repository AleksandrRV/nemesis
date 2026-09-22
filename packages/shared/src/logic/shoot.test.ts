import { afterEach, describe, expect, it, vi } from 'vitest';
import { COMBAT_DIE_FACES, type CombatDieFace } from '../data/combatDie.js';
import { EVENT_CARDS } from '../data/eventCards.js';
import { INTRUDER_ATTACK_CARDS } from '../data/intruderAttacks.js';
import type { IntruderAttackCard, ItemCard } from '../types/cards.js';
import type { IntruderType } from '../types/entities.js';
import type { GameState } from '../types/state.js';
import * as rng from '../utils/rng.js';
import { executeShoot } from './shoot.js';
import { combatStatusState, expectEngineError, putIntruder } from '../testing/contactFixtures.js';
import { GameEngine } from './fsm.js';
import { injuriesForFace } from './shoot.js';

const realDraw = rng.drawFromStream;

/** Форсирует грань кубика Боя, не трогая другие потоки RNG. */
function forceCombatDie(face: CombatDieFace): void {
  const index = COMBAT_DIE_FACES.indexOf(face);
  const value = (index + 0.5) / COMBAT_DIE_FACES.length;
  vi.spyOn(rng, 'drawFromStream').mockImplementation((seed, stream, drawIndex) =>
    stream === 'combat' ? value : realDraw(seed, stream, drawIndex),
  );
}

function makeWeapon(ammo: number, overrides: Partial<ItemCard> = {}): ItemCard {
  return {
    id: 'w-test',
    name: 'Испытательный пистолет',
    color: 'RED',
    origin: 'STARTING',
    isHeavy: true,
    isSingleUse: false,
    componentSymbols: [],
    actionCost: 0,
    description: '',
    isWeapon: true,
    ammo,
    maxAmmo: 6,
    ...overrides,
  };
}

function giveWeapon(state: GameState, ammo: number, overrides: Partial<ItemCard> = {}): string {
  const weapon = makeWeapon(ammo, overrides);
  state.players['player-1']!.handSlots.push({ source: 'ITEM', card: weapon });
  return weapon.id;
}

/** Готовое состояние Боя: Взрослый в отсеке игрока, оружие в слоте Руки. */
function combatReady(seed = 'shoot-step-4', type: IntruderType = 'ADULT'): GameState {
  const state = combatStatusState(seed);
  const roomId = state.players['player-1']!.roomId;
  const intruderId = putIntruder(state, type, roomId);
  giveWeapon(state, 4);
  void intruderId;
  return state;
}

function shoot(
  state: GameState,
  overrides: Partial<{ weaponItemId: string; targetIntruderId: string }> = {},
): GameState {
  const player = state.players[state.meta.activePlayerId]!;
  const target = state.intrudersPool.boardTokens.find((entry) => entry.roomId === player.roomId);
  const discardCardIds = player.actionDeck.hand[0] ? [player.actionDeck.hand[0].id] : [];

  return new GameEngine().processAction(state, {
    type: 'ACTION_SHOOT',
    payload: {
      weaponItemId: overrides.weaponItemId ?? 'w-test',
      targetIntruderId: overrides.targetIntruderId ?? target?.id ?? 'intruder-absent',
      discardCardIds,
    },
  });
}

/** Кладёт указанные карты на вершину колоды Атак Чужих. */
function deckTop(state: GameState, cards: IntruderAttackCard[]): void {
  const ids = new Set(cards.map((card) => card.id));
  const rest = INTRUDER_ATTACK_CARDS.filter((card) => !ids.has(card.id));
  state.decks.intruderAttacks = { drawPile: [...cards.map((card) => structuredClone(card)), ...rest], discard: [] };
}

/** Ставит карту Событий на верх колоды — её вытянет Отступление (стр. 20). */
function eventDeckTop(state: GameState, cardId: string): void {
  const cards = structuredClone(EVENT_CARDS);
  const first = cards.find((card) => card.id === cardId)!;
  state.decks.events = { drawPile: [first, ...cards.filter((card) => card.id !== cardId)], discard: [] };
}

function shootLog(state: GameState): Extract<GameState['gameLog'][number]['event'], { type: 'SHOOT_RESOLVED' }> {
  const entry = state.gameLog.find((log) => log.event.type === 'SHOOT_RESOLVED');
  if (!entry || entry.event.type !== 'SHOOT_RESOLVED') throw new Error('нет события SHOOT_RESOLVED');
  return entry.event;
}

afterEach(() => vi.restoreAllMocks());

describe('Грани кубика Боя против типов Чужих (стр. 19)', () => {
  const cases: [CombatDieFace, IntruderType, number][] = [
    ['MISS', 'ADULT', 0],
    ['MISS', 'LARVA', 0],
    ['TAIL', 'LARVA', 1],
    ['TAIL', 'CREEPER', 1],
    ['TAIL', 'ADULT', 0],
    ['TAIL', 'BREEDER', 0],
    ['TAIL', 'QUEEN', 0],
    ['SILHOUETTES', 'LARVA', 1],
    ['SILHOUETTES', 'CREEPER', 1],
    ['SILHOUETTES', 'ADULT', 1],
    ['SILHOUETTES', 'BREEDER', 0],
    ['SILHOUETTES', 'QUEEN', 0],
    ['ONE_WOUND', 'BREEDER', 1],
    ['ONE_WOUND', 'QUEEN', 1],
    ['TWO_WOUNDS', 'QUEEN', 2],
    ['TWO_WOUNDS', 'LARVA', 2],
  ];

  it.each(cases)('%s по %s даёт %i ран', (face, type, injuries) => {
    expect(injuriesForFace(face, type)).toBe(injuries);
  });
});

describe('Стрельба: оплата, боезапас и бросок (стр. 19)', () => {
  it('промах тратит Боезапас и карту цены, но не трогает колоду Атак и раны', () => {
    const state = combatReady();
    forceCombatDie('MISS');
    const before = { ...state.meta.rngDraws };

    const next = shoot(state);
    const log = shootLog(next);
    const player = next.players['player-1']!;

    expect(log).toMatchObject({ injuries: 0, killed: false, toughnessCards: [], ammoLeft: 3, dieFace: 'MISS' });
    const slot = player.handSlots.find((candidate) => candidate.source === 'ITEM' && candidate.card.id === 'w-test');
    expect(slot && slot.source === 'ITEM' && slot.card.ammo).toBe(3);
    expect(player.actionDeck.hand).toHaveLength(4);
    expect(player.actionDeck.discard).toHaveLength(1);
    expect(player.actionsPerformedThisRound).toBe(1);
    expect(next.decks.intruderAttacks.drawPile).toHaveLength(20);
    expect(next.meta.rngDraws.combat).toBe(before.combat + 1);
    expect(next.meta.rngDraws.cards).toBe(before.cards);
  });

  it('«Хвост» по Взрослой Особи — промах: символ не подходит цели', () => {
    const state = combatReady();
    forceCombatDie('TAIL');

    const next = shoot(state);

    expect(shootLog(next)).toMatchObject({ injuries: 0, targetType: 'ADULT' });
    expect(next.intrudersPool.boardTokens[0]!.woundsCount).toBe(0);
  });

  it('«Силуэты» ранят Взрослую Особь: 1 Рана, карта Стойкости выкладывается, Чужой выживает', () => {
    const state = combatReady();
    forceCombatDie('SILHOUETTES');
    deckTop(state, [INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_SCRATCH_2')!]); // Стойкость 3

    const next = shoot(state);

    expect(shootLog(next)).toMatchObject({
      injuries: 1,
      woundsBefore: 0,
      woundsTotal: 1,
      toughnessTotal: 3,
      killed: false,
    });
    expect(shootLog(next).toughnessCards.map((card) => card.id)).toEqual(['IAT_SCRATCH_2']);
    expect(next.intrudersPool.boardTokens[0]!.woundsCount).toBe(1);
    expect(next.decks.intruderAttacks.discard.map((card) => card.id)).toEqual(['IAT_SCRATCH_2']);
  });

  it('Раны копятся между выстрелами: 2 + 1 против Стойкости 3 убивает', () => {
    const state = combatReady();
    state.intrudersPool.boardTokens[0]!.woundsCount = 2;
    forceCombatDie('ONE_WOUND');
    deckTop(state, [INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_SCRATCH_2')!]); // Стойкость 3

    const next = shoot(state);

    expect(shootLog(next)).toMatchObject({
      woundsBefore: 2,
      injuries: 1,
      woundsTotal: 3,
      toughnessTotal: 3,
      killed: true,
    });
    expect(next.intrudersPool.boardTokens).toHaveLength(0);
    expect(Object.values(next.ship.rooms).every((room) => room.occupantIntruderIds.length === 0)).toBe(true);
  });

  it('Личинке хватает 1 Раны: гибель без карты Атаки Чужих (стр. 20)', () => {
    const state = combatReady('shoot-larva', 'LARVA');
    forceCombatDie('ONE_WOUND');

    const next = shoot(state);

    expect(shootLog(next)).toMatchObject({ targetType: 'LARVA', killed: true, toughnessCards: [], toughnessTotal: 0 });
    expect(next.intrudersPool.boardTokens).toHaveLength(0);
    expect(next.decks.intruderAttacks.drawPile).toHaveLength(20);
    expect(next.decks.intruderAttacks.discard).toHaveLength(0);
  });

  it('Трутню вытягиваются 2 карты: Стойкости суммируются (стр. 20)', () => {
    const state = combatReady('shoot-breeder', 'BREEDER');
    forceCombatDie('ONE_WOUND');
    deckTop(state, [
      INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_SCRATCH_2')!, // 3
      INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_SCRATCH_3')!, // 5
    ]);

    const next = shoot(state);

    expect(shootLog(next)).toMatchObject({ toughnessTotal: 8, killed: false, woundsTotal: 1 });
    expect(shootLog(next).toughnessCards).toHaveLength(2);
  });

  it('пустая колода Атач восстанавливается из сброса потоком cards', () => {
    const state = combatReady('shoot-reshuffle');
    state.decks.intruderAttacks = {
      drawPile: [],
      discard: structuredClone(INTRUDER_ATTACK_CARDS.filter((card) => !card.hasRetreat).slice(0, 2)),
    };
    forceCombatDie('ONE_WOUND');
    const before = { ...state.meta.rngDraws };

    const next = shoot(state);

    expect(next.decks.intruderAttacks.drawPile.length + next.decks.intruderAttacks.discard.length).toBe(2);
    expect(next.meta.rngDraws.cards).toBeGreaterThan(before.cards);
    expect(shootLog(next).toughnessCards.length).toBe(1);
  });

  it('энергетическое оружие тратит заряды тем же порядком', () => {
    const state = combatReady('shoot-energy');
    const weaponId = giveWeapon(state, 2, { id: 'w-laser', name: 'Лазер', isEnergyWeapon: true, ammo: 2, maxAmmo: 4 });
    forceCombatDie('MISS');

    const next = shoot(state, { weaponItemId: weaponId });

    const slot = next.players['player-1']!.handSlots.find(
      (candidate) => candidate.source === 'ITEM' && candidate.card.id === 'w-laser',
    );
    expect(slot && slot.source === 'ITEM' && slot.card.ammo).toBe(1);
  });
});

describe('Отступление по колоде Событий (стр. 20; Шаг 2 этапа 0.5.0)', () => {
  it('стрелка Отступления у выжившего: выстрел фиксируется, Чужой уходит по карте События', () => {
    const state = combatReady('shoot-retreat');
    forceCombatDie('ONE_WOUND');
    deckTop(state, [INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_SCRATCH_1')!]); // Стойкость 2, Отступление
    eventDeckTop(state, 'EVT_HUNT_2'); // Коридор 3 — отсек 8 из отсека 11
    const intruderId = state.intrudersPool.boardTokens[0]!.id;

    const next = shoot(state);

    const event = shootLog(next);
    expect(event.killed).toBe(false);
    expect(event.retreat).toMatchObject({
      eventCardId: 'EVT_HUNT_2',
      corridorNumber: 3,
      outcome: 'MOVED',
      toRoomId: 8,
      corridorId: '8-11',
    });
    const intruder = next.intrudersPool.boardTokens.find((entry) => entry.id === intruderId)!;
    expect(intruder.roomId).toBe(8);
    expect(intruder.woundsCount).toBe(1);
    // Карта События уходит в сброс без розыгрыша эффекта (стр. 20).
    expect(next.decks.events.discard.map((card) => card.id)).toContain('EVT_HUNT_2');
    expect(next.gameLog.some((entry) => entry.event.type === 'INTRUDER_RETREATED')).toBe(true);
  });

  it('Закрытая Дверь направления разрушается, Чужой остаётся в отсеке (FAQ Rules 8)', () => {
    const state = combatReady('shoot-retreat-door');
    forceCombatDie('ONE_WOUND');
    deckTop(state, [INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_SCRATCH_1')!]);
    eventDeckTop(state, 'EVT_HUNT_2'); // Коридор 3 — Коридор 8-11
    state.ship.corridors['8-11']!.doorState = 'CLOSED';
    const intruderId = state.intrudersPool.boardTokens[0]!.id;

    const next = shoot(state);

    expect(shootLog(next).retreat).toMatchObject({ outcome: 'DOOR_DESTROYED', corridorId: '8-11', toRoomId: null });
    expect(next.ship.corridors['8-11']!.doorState).toBe('DESTROYED');
    expect(next.intrudersPool.boardTokens.find((entry) => entry.id === intruderId)!.roomId).toBe(
      state.players['player-1']!.roomId,
    );
  });
});

describe('Отказы Стрельбы', () => {
  it('неизвестный стрелок — UNKNOWN_PLAYER', () => {
    const state = combatReady();
    // Прямой вызов: через processAction тот же отказ отдаёт validateActor.
    expectEngineError(
      () =>
        executeShoot(
          state,
          {
            type: 'ACTION_SHOOT',
            payload: { weaponItemId: 'w-test', targetIntruderId: 'intruder-ghost', discardCardIds: [] },
          },
          'ghost',
        ),
      'UNKNOWN_PLAYER',
    );
  });

  it('вне Боя стрелять нельзя', () => {
    const state = combatStatusState('shoot-quiet');
    giveWeapon(state, 4);
    expectEngineError(() => shoot(state), 'SHOOT_NOT_IN_COMBAT');
  });

  it('оружие вне слота Руки не подходит (стр. 19, действие [1])', () => {
    const state = combatReady();
    state.players['player-1']!.handSlots = [];
    state.players['player-1']!.inventory.push(makeWeapon(4));
    expectEngineError(() => shoot(state), 'WEAPON_NOT_AVAILABLE');
  });

  it('карта без признака Оружия не стреляет', () => {
    const state = combatReady();
    const weaponId = giveWeapon(state, 4, { id: 'w-not-weapon', isWeapon: false, ammo: null, maxAmmo: null });
    expectEngineError(() => shoot(state, { weaponItemId: weaponId }), 'WEAPON_NOT_AVAILABLE');
  });

  it('пустое Оружие не стреляет', () => {
    const state = combatReady();
    const weaponId = giveWeapon(state, 0, { id: 'w-empty' });
    expectEngineError(() => shoot(state, { weaponItemId: weaponId }), 'WEAPON_NO_AMMO');
  });

  it('цель в другом отсеке недостижима', () => {
    const state = combatReady();
    const otherRoom = Object.values(state.ship.rooms).find((room) => room.id !== state.players['player-1']!.roomId)!;
    const intruderId = putIntruder(state, 'CREEPER', otherRoom.id);
    expectEngineError(() => shoot(state, { targetIntruderId: intruderId }), 'INVALID_ATTACK_TARGET');
  });

  it('без карты цены выстрел не выполняется, Боезапас не тратится', () => {
    const state = combatReady();
    state.players['player-1']!.actionDeck.hand = [];
    expectEngineError(() => shoot(state), 'INSUFFICIENT_ACTION_CARDS');
    const slot = state.players['player-1']!.handSlots.find(
      (candidate) => candidate.source === 'ITEM' && candidate.card.id === 'w-test',
    );
    expect(slot && slot.source === 'ITEM' && slot.card.ammo).toBe(4);
  });
});
