import { describe, expect, it } from 'vitest';

import type { EngineErrorCode } from './fsm.js';
import { EngineError } from './fsm.js';
import { filterStateForPlayer } from './sanitizer.js';
import { createInitialGameState } from './setup.js';
import type { EventCard, WeaknessCard } from '../types/cards.js';
import { INTRUDER_ATTACK_CARDS } from '../data/intruderAttacks.js';
import { EVENT_CARDS } from '../data/eventCards.js';

const SEED = 'sanitizer-test';
const VIEWER = 'player-1';

const freshState = () => createInitialGameState(SEED);

function expectEngineError(run: () => unknown, code: EngineErrorCode): void {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(EngineError);
    expect((error as EngineError).code).toBe(code);
    return;
  }

  throw new Error(`Ожидалась ошибка движка с кодом ${code}, но вызов прошёл без ошибки.`);
}

describe('filterStateForPlayer: двигатели и Координаты (стр. 26)', () => {
  it('скрывает состояние всех двигателей, пока персонаж их не проверял', () => {
    const view = filterStateForPlayer(freshState(), VIEWER);

    expect(view.ship.engines[1]?.isWorking).toBeNull();
    expect(view.ship.engines[2]?.isWorking).toBeNull();
    expect(view.ship.engines[3]?.isWorking).toBeNull();
  });

  it('открывает только проверенные двигатели, остальные остаются неизвестными', () => {
    const state = freshState();
    const player = state.players[VIEWER];

    if (player) player.inspectedEngines = [2];

    const view = filterStateForPlayer(state, VIEWER);

    expect(view.ship.engines[2]?.isWorking).toBe(state.ship.engines[2]?.isWorking);
    expect(view.ship.engines[1]?.isWorking).toBeNull();
    expect(view.ship.engines[3]?.isWorking).toBeNull();
  });

  it('скрывает пункт назначения, пока не открыта карта Координат', () => {
    const state = freshState();
    const view = filterStateForPlayer(state, VIEWER);

    expect(view.ship.coordinates.destination).toBeNull();
    expect(view.ship.coordinates.currentCourseMarker).toBe(state.ship.coordinates.currentCourseMarker);
  });

  it('раскрывает пункт назначения персонажу, который смотрел Координаты', () => {
    const state = freshState();
    const player = state.players[VIEWER];

    if (player) player.inspectedCoordinates = true;

    expect(filterStateForPlayer(state, VIEWER).ship.coordinates.destination).toBe(state.ship.coordinates.destination);
  });
});

describe('filterStateForPlayer: неисследованные отсеки (стр. 14)', () => {
  it('скрывает тайл, жетон Исследования и компьютер невскрытого отсека', () => {
    const view = filterStateForPlayer(freshState(), VIEWER);
    const unexplored = Object.values(view.ship.rooms).filter((room) => !room.isExplored);

    expect(unexplored.length).toBeGreaterThan(0);

    for (const room of unexplored) {
      expect(room.definitionId).toBeNull();
      expect(room.itemsCount).toBeNull();
      expect(room.hasComputer).toBeNull();
      // Эффект жетона Исследования напечатан на его лицевой стороне (стр. 14).
      expect(room.explorationEffect).toBeNull();
    }
  });

  it('скрывает тайл и аварии, но сохраняет публичные миниатюры в невскрытом отсеке (стр. 15)', () => {
    const state = freshState();
    const room = Object.values(state.ship.rooms).find((candidate) => !candidate.isExplored);

    expect(room).toBeDefined();

    if (room) {
      room.hasFire = true;
      room.hasMalfunction = true;
      room.hasDecompressionToken = true;
      room.objects = [{ id: 'EGG_1', kind: 'EGG' }];
      room.occupantIntruderIds = ['adult-1'];
    }

    const view = filterStateForPlayer(state, VIEWER);
    const sanitizedRoom = room ? view.ship.rooms[room.id] : undefined;

    expect(sanitizedRoom?.hasFire).toBeNull();
    expect(sanitizedRoom?.hasMalfunction).toBeNull();
    expect(sanitizedRoom?.hasDecompressionToken).toBeNull();
    expect(sanitizedRoom?.objects).toEqual([]);
    expect(sanitizedRoom?.occupantIntruderIds).toEqual(['adult-1']);
  });

  it('раны Чужих публичны: маркеры Ран лежат на виду у всех игроков (стр. 19)', () => {
    const state = freshState();
    state.intrudersPool.boardTokens = [{ id: 'adult-1', type: 'ADULT', roomId: 11, woundsCount: 2 }];
    state.ship.rooms[11]!.isExplored = false;

    const view = filterStateForPlayer(state, VIEWER);

    expect(view.intrudersPool.boardTokens).toEqual([{ id: 'adult-1', type: 'ADULT', roomId: 11, woundsCount: 2 }]);
  });

  it('событие Контакта доходит с полем заражения Личинкой', () => {
    const state = freshState();
    state.gameLog.push({
      id: 'log-1',
      sequence: 1,
      event: {
        type: 'CONTACT_OCCURRED',
        playerId: VIEWER,
        roomId: 11,
        tokenType: 'LARVA',
        escapeNumber: 1,
        handCount: 3,
        intruderId: null,
        firstEncounter: false,
        surpriseAttack: false,
        source: 'NOISE',
        infestation: { alreadyInfested: false },
      },
    });

    const view = filterStateForPlayer(state, VIEWER);
    const contact = view.gameLog.find((entry) => entry.event.type === 'CONTACT_OCCURRED');

    expect(contact?.event).toMatchObject({ infestation: { alreadyInfested: false } });
  });

  it('оставляет исследованные отсеки как есть', () => {
    const state = freshState();
    const view = filterStateForPlayer(state, VIEWER);
    const exploredId = 11;

    expect(view.ship.rooms[exploredId]).toEqual(state.ship.rooms[exploredId]);
  });
});

describe('filterStateForPlayer: чужие тайны (стр. 21–22)', () => {
  it('скрывает инвентарь, квестовые предметы и цели другого персонажа', () => {
    const state = createInitialGameState(SEED, { playerCount: 2 });
    const view = filterStateForPlayer(state, VIEWER);

    expect(view.players['player-2']?.inventory).toBeNull();
    expect(view.players['player-2']?.questItems).toBeNull();
    expect(view.players['player-2']?.objectives).toBeNull();
  });

  it('не скрывает от персонажа его собственные предметы и цели', () => {
    const state = createInitialGameState(SEED, { playerCount: 2 });
    const view = filterStateForPlayer(state, VIEWER);

    expect(view.players[VIEWER]?.questItems).toHaveLength(2);
    expect(view.players[VIEWER]?.inventory).toEqual([]);
    expect(view.players[VIEWER]?.objectives).toEqual([]);
  });

  it('оставляет открытыми публичные признаки: раны, состояние, позицию', () => {
    const state = createInitialGameState(SEED, { playerCount: 2 });
    const player = state.players['player-2'];

    if (player) {
      player.lightWounds = 2;
      player.isInHibernation = true;
    }

    const view = filterStateForPlayer(state, VIEWER);

    expect(view.players['player-2']?.lightWounds).toBe(2);
    expect(view.players['player-2']?.isInHibernation).toBe(true);
    expect(view.players['player-2']?.roomId).toBe(state.players['player-2']?.roomId);
  });
});

describe('filterStateForPlayer: карты Заражения (стр. 20)', () => {
  const contaminatedState = () => {
    const state = freshState();
    const player = state.players[VIEWER];

    if (player) {
      player.actionDeck.hand = [{ id: 'cont-1', isInfected: true, isScanned: false }];
      player.actionDeck.discard = [{ id: 'cont-2', isInfected: true, isScanned: true }];
    }

    return state;
  };

  it('скрывает факт инфекции, пока карта не проверена', () => {
    const view = filterStateForPlayer(contaminatedState(), VIEWER);
    const [unscanned] = view.players[VIEWER]?.actionDeck.hand ?? [];

    expect(unscanned).toMatchObject({ id: 'cont-1', isScanned: false, isInfected: null });
  });

  it('раскрывает факт инфекции у проверенной карты', () => {
    const view = filterStateForPlayer(contaminatedState(), VIEWER);
    const [scanned] = view.players[VIEWER]?.actionDeck.discard ?? [];

    expect(scanned).toMatchObject({ id: 'cont-2', isScanned: true, isInfected: true });
  });

  it('не трогает карты Действий', () => {
    const state = freshState();
    const player = state.players[VIEWER];

    if (player) {
      player.actionDeck.hand = [
        { id: 'act-1', characterClass: 'CAPTAIN', name: 'Ремонт', playCost: 0, description: '' },
      ];
    }

    const view = filterStateForPlayer(state, VIEWER);

    expect(view.players[VIEWER]?.actionDeck.hand[0]).toEqual(state.players[VIEWER]?.actionDeck.hand[0]);
  });
});

describe('filterStateForPlayer: Слабости Чужих (стр. 21)', () => {
  const stateWithWeaknesses = () => {
    const state = freshState();

    state.intrudersPool.weaknessSlots = [
      {
        objectKind: 'CORPSE',
        card: { id: 'w-1', name: 'Слабость 1', description: 'текст', effect: 'DANGER_REACTION', isRevealed: false },
      },
      {
        objectKind: 'EGG',
        card: { id: 'w-2', name: 'Слабость 2', description: 'текст', effect: 'EDGE_OF_EXTINCTION', isRevealed: true },
      },
      { objectKind: 'INTRUDER_REMAINS', card: null },
    ];

    return state;
  };

  it('прячет карту, лежащую рубашкой вверх', () => {
    const [faceDown] = filterStateForPlayer(stateWithWeaknesses(), VIEWER).intrudersPool.weaknessSlots;

    expect(faceDown).toEqual({ objectKind: 'CORPSE', visibility: 'FACE_DOWN' });
  });

  it('отдаёт карту, которую уже изучили в Лаборатории', () => {
    const slots = filterStateForPlayer(stateWithWeaknesses(), VIEWER).intrudersPool.weaknessSlots;

    expect(slots[1]).toMatchObject({ objectKind: 'EGG', visibility: 'REVEALED' });
    expect(slots[1]?.visibility === 'REVEALED' ? slots[1].card.name : null).toBe('Слабость 2');
  });

  it('отличает пустой слот от закрытой карты', () => {
    const slots = filterStateForPlayer(stateWithWeaknesses(), VIEWER).intrudersPool.weaknessSlots;

    expect(slots[2]).toEqual({ objectKind: 'INTRUDER_REMAINS', visibility: 'EMPTY' });
  });
});

describe('filterStateForPlayer: границы', () => {
  it('отклоняет неизвестного наблюдателя', () => {
    expectEngineError(() => filterStateForPlayer(freshState(), 'player-42'), 'UNKNOWN_PLAYER');
  });

  it('не меняет исходное состояние партии', () => {
    const state = freshState();
    const snapshot = structuredClone(state);

    filterStateForPlayer(state, VIEWER);

    expect(state).toEqual(snapshot);
  });

  it('возвращает независимую копию: правки в представлении не трогают партию', () => {
    const state = freshState();
    const view = filterStateForPlayer(state, VIEWER);
    const room = view.ship.rooms[11];

    if (room) room.hasFire = true;

    expect(state.ship.rooms[11]?.hasFire).toBe(false);
  });

  it('сохраняет публичные данные: отсеки, коридоры, состав мешка, лог заявлений, прерывания', () => {
    const state = freshState();
    const view = filterStateForPlayer(state, VIEWER);

    expect(Object.keys(view.ship.rooms)).toHaveLength(21);
    expect(Object.keys(view.ship.corridors)).toHaveLength(Object.keys(state.ship.corridors).length);
    expect(view.intrudersPool.bag).toEqual({ BLANK: 1, LARVA: 4, CREEPER: 1, QUEEN: 1, ADULT: 4, BREEDER: 0 });
    expect(view.intrudersPool.eggsOnBoard).toBe(state.intrudersPool.eggsOnBoard);
    expect(view.claimsLog).toEqual(state.claimsLog);
    expect(view.interruptQueue).toEqual(state.interruptQueue);
    expect(view.meta).toEqual(state.meta);
  });

  it('не отдаёт порядок мешка Чужих: наружу уходит только состав по типам', () => {
    const state = freshState();
    const view = filterStateForPlayer(state, VIEWER);
    const orderInEngine = state.intrudersPool.bag.map((token) => token.id);

    // Мешок в срезе — не список жетонов: порядок вытягивания остаётся в движке,
    // иначе Контакт был бы предсказуем для игрока и для бота (GDD §5.1).
    expect(Array.isArray(view.intrudersPool.bag)).toBe(false);
    expect(orderInEngine.length).toBeGreaterThan(0);

    const serialized = JSON.stringify(view);

    for (const tokenId of orderInEngine) {
      expect(serialized).not.toContain(tokenId);
    }
  });

  it('не отдаёт порядок добора личной колоды, чужую руку и чужой сброс, но открывает их размеры (стр. 7, 18)', () => {
    const state = createInitialGameState(SEED, { playerCount: 2 });
    const actionCard = (id: string, characterClass: 'CAPTAIN' | 'PILOT') => ({
      id,
      characterClass,
      name: 'Карта действий',
      playCost: 0,
      description: '',
    });

    state.players[VIEWER]!.actionDeck = {
      drawPile: [actionCard('own-deck-1', 'CAPTAIN')],
      hand: [actionCard('own-hand-1', 'CAPTAIN')],
      discard: [actionCard('own-discard-1', 'CAPTAIN')],
    };
    state.players['player-2']!.actionDeck = {
      drawPile: [actionCard('enemy-deck-1', 'PILOT')],
      hand: [actionCard('enemy-hand-1', 'PILOT')],
      discard: [actionCard('enemy-discard-1', 'PILOT')],
    };

    const view = filterStateForPlayer(state, VIEWER);
    const serialized = JSON.stringify(view);

    // Порядок добора не видит никто, включая владельца колоды: посмотреть колоду
    // правилами нельзя, видно только толщину стопки (стр. 7). Наружу уходят
    // размеры, а не карты: число карт на руке нужно Внезапной атаке (стр. 18).
    expect(view.players[VIEWER]?.actionDeck.drawPileCount).toBe(1);
    expect(view.players['player-2']?.actionDeck.drawPileCount).toBe(1);
    expect(view.players[VIEWER]?.actionDeck.hand).toHaveLength(1);
    expect(view.players['player-2']?.actionDeck.handCount).toBe(1);
    expect(view.players['player-2']?.actionDeck.discardCount).toBe(1);
    expect(serialized).not.toContain('own-deck-1');
    expect(serialized).not.toContain('enemy-deck-1');

    // Чужая рука и чужой сброс скрыты, свои — видны: чужая колода — чужая тайна.
    expect(view.players['player-2']?.actionDeck.hand).toEqual([]);
    expect(view.players['player-2']?.actionDeck.discard).toEqual([]);
    expect(serialized).not.toContain('enemy-hand-1');
    expect(serialized).not.toContain('enemy-discard-1');
    expect(serialized).toContain('own-hand-1');
    expect(serialized).toContain('own-discard-1');
  });

  it('не отдаёт скрытых данных при сериализации: ни пункта назначения, ни состояния двигателей', () => {
    const state = freshState();
    const json = JSON.stringify(filterStateForPlayer(state, VIEWER));
    const parsed = JSON.parse(json) as {
      ship: { coordinates: { destination: unknown }; engines: Record<string, { isWorking: unknown }> };
    };

    // Скрытое значение кодируется как null: ключи контракта обязаны остаться
    // на месте, а вот истина за ними уходить в JSON не должна.
    expect(parsed.ship.coordinates.destination).toBeNull();
    expect(['EARTH', 'MARS', 'DEEP_SPACE_1', 'DEEP_SPACE_2']).not.toContain(parsed.ship.coordinates.destination);
    expect(Object.values(parsed.ship.engines).map((engine) => engine.isWorking)).toEqual([null, null, null]);
    expect(json).toContain('"coordinates"');
  });
});

describe('filterStateForPlayer: колоды корабля (Э2-5)', () => {
  const itemCard = (id: string, color: 'RED' | 'GREEN' = 'RED') => ({
    id,
    name: 'Предмет',
    color,
    origin: 'ROOM_DECK' as const,
    isHeavy: false,
    isSingleUse: false,
    componentSymbols: [],
    actionCost: 0,
    description: '',
    isWeapon: false,
    ammo: null,
    maxAmmo: null,
  });

  const weaknessCard = (id: string): WeaknessCard => ({
    id,
    name: 'Слабость',
    description: '',
    effect: 'DANGER_REACTION',
    isRevealed: false,
  });

  const eventCard = (id: string): EventCard => ({
    id,
    name: 'Событие',
    description: '',
    effect: 'HUNT',
    corridorNumber: 1,
    intruderTypes: ['ADULT'],
    isDestroyedOnResolve: false,
    isReshuffledIntoDeck: false,
  });

  it('закрытую колоду отдаёт числом, а сброс Предметов оставляет открытым: он лежит лицом вверх', () => {
    const state = freshState();

    state.decks.items.RED = {
      drawPile: [itemCard('red-draw-1'), itemCard('red-draw-2')],
      discard: [itemCard('red-discard-1')],
    };
    state.decks.events = {
      drawPile: [eventCard('event-draw-1')],
      discard: [eventCard('event-discard-1')],
    };

    const view = filterStateForPlayer(state, VIEWER);
    const serialized = JSON.stringify(view);

    expect(view.decks.items.RED.drawPileCount).toBe(2);
    expect(view.decks.items.RED.discard.map((card) => card.id)).toEqual(['red-discard-1']);
    expect(view.decks.events.drawPileCount).toBe(1);
    expect(view.decks.events.discard.map((card) => card.id)).toEqual(['event-discard-1']);

    expect(serialized).not.toContain('red-draw-1');
    expect(serialized).not.toContain('red-draw-2');
    expect(serialized).not.toContain('event-draw-1');
    expect(serialized).toContain('red-discard-1');
  });

  it('у колоды Заражения, Целей и Слабостей скрыт и сброс: наружу уходят только числа', () => {
    const state = freshState();

    state.decks.contamination = {
      drawPile: [{ id: 'contamination-draw-1', isInfected: true, isScanned: false }],
      discard: [{ id: 'contamination-discard-1', isInfected: false, isScanned: true }],
    };
    state.decks.objectives.personal = {
      drawPile: [{ id: 'personal-draw-1', characterClass: 'CAPTAIN', name: 'Цель', description: '' }],
      discard: [{ id: 'personal-discard-1', characterClass: 'CAPTAIN', name: 'Цель', description: '' }],
    } as never;

    const view = filterStateForPlayer(state, VIEWER);
    const serialized = JSON.stringify(view);

    expect(view.decks.contamination.drawPileCount).toBe(1);
    expect(view.decks.contamination.discardCount).toBe(1);
    expect(view.decks.objectives.personal.drawPileCount).toBe(1);
    expect(view.decks.objectives.personal.discardCount).toBe(1);

    for (const hiddenId of [
      'contamination-draw-1',
      'contamination-discard-1',
      'personal-draw-1',
      'personal-discard-1',
    ]) {
      expect(serialized, `${hiddenId} утёк в срез`).not.toContain(hiddenId);
    }

    // Ключей с массивами карт у таких колод в срезе нет вовсе: даже форма
    // ответа не подсказывает, что за карты там лежат.
    expect(Object.keys(view.decks.contamination).sort()).toEqual(['discardCount', 'drawPileCount']);
    expect(Object.keys(view.decks.weaknesses).sort()).toEqual(['discardCount', 'drawPileCount']);
  });

  it('скрывает лицевую сторону невскрытой Слабости, но показывает её вид и число карт', () => {
    const state = freshState();
    const slot = state.intrudersPool.weaknessSlots[0]!;

    slot.card = weaknessCard('weakness-1');

    const view = filterStateForPlayer(state, VIEWER);
    const viewedSlot = view.intrudersPool.weaknessSlots[0]!;

    expect(viewedSlot.visibility).toBe('FACE_DOWN');
    expect(JSON.stringify(view)).not.toContain('weakness-1');

    (state.intrudersPool.weaknessSlots[0]!.card as { isRevealed: boolean }).isRevealed = true;

    const revealed = filterStateForPlayer(state, VIEWER).intrudersPool.weaknessSlots[0]!;

    expect(revealed.visibility).toBe('REVEALED');
  });

  it('колода Атак Чужих: порядок закрыт числом, сброс — свершившиеся факты лицом вверх (стр. 9, 20)', () => {
    const state = createInitialGameState('sanitizer-attacks');
    const scratch = structuredClone(INTRUDER_ATTACK_CARDS[0]!);
    state.decks.intruderAttacks = {
      drawPile: [scratch, ...INTRUDER_ATTACK_CARDS.slice(1).map((card) => structuredClone(card))],
      discard: [structuredClone(INTRUDER_ATTACK_CARDS[3]!)],
    };

    const view = filterStateForPlayer(state, 'player-1');
    const deck = view.decks.intruderAttacks;

    expect('drawPile' in deck).toBe(false);
    expect(deck.drawPileCount).toBe(state.decks.intruderAttacks.drawPile.length);
    expect(deck.discard).toHaveLength(1);
    expect(deck.discard[0]).toMatchObject({ id: 'IAT_SCRATCH_4', toughness: 6 });
  });

  it('колода Событий при подготовке: порядок закрыт числом, сброс пуст и открыт (стр. 7, шаг 11)', () => {
    const state = freshState();
    const view = filterStateForPlayer(state, VIEWER);
    const deck = view.decks.events;
    const serialized = JSON.stringify(view);

    expect('drawPile' in deck).toBe(false);
    expect(deck.drawPileCount).toBe(EVENT_CARDS.length);
    expect(deck.discard).toEqual([]);

    for (const card of state.decks.events.drawPile) {
      expect(serialized, `карта ${card.id} утёкла в срез`).not.toContain(card.id);
    }
  });

  it('колода Событий: разыгранная карта в сбросе видна целиком, направление и эффект открыты', () => {
    const state = freshState();
    const resolved = structuredClone(EVENT_CARDS.find((card) => card.effect === 'COOLANT_LEAK')!);

    state.decks.events.discard = [resolved];

    const view = filterStateForPlayer(state, VIEWER);

    expect(view.decks.events.discard).toHaveLength(1);
    expect(view.decks.events.discard[0]).toMatchObject({
      id: 'EVT_COOLANT_LEAK',
      corridorNumber: 1,
      isDestroyedOnResolve: true,
    });
  });

  it('отдаёт состав мешка и запаса числами, не раскрывая порядок жетонов (стр. 6, шаг 10)', () => {
    const state = freshState();
    const view = filterStateForPlayer(state, VIEWER);
    const serialized = JSON.stringify(view);

    expect(Object.keys(view.intrudersPool.bag).sort()).toEqual(
      ['ADULT', 'BLANK', 'BREEDER', 'CREEPER', 'LARVA', 'QUEEN'].sort(),
    );
    expect(view.intrudersPool.bag.ADULT).toBe(state.intrudersPool.bag.filter((t) => t.type === 'ADULT').length);
    expect(view.intrudersPool.supply.BREEDER).toBe(
      state.intrudersPool.supply.filter((t) => t.type === 'BREEDER').length,
    );

    for (const token of [...state.intrudersPool.bag, ...state.intrudersPool.supply]) {
      expect(serialized, `жетон ${token.id} утёк в срез`).not.toContain(token.id);
    }
  });
});

describe('filterStateForPlayer: privacy — чужая рука, инвентарь, pendingDecision, порядок колод (Шаг 8, долг 26)', () => {
  it('чужая рука — пустой массив, инвентарь — null, pendingDecision — null, порядок колод только drawPileCount', () => {
    const state = createInitialGameState('privacy-test', { playerCount: 2 });
    // Даём второму игроку предметы и руку
    state.players['player-2']!.inventory = [
      {
        id: 'ITEM_RED_1',
        name: 'Граната',
        color: 'RED',
        origin: 'ROOM_DECK',
        isHeavy: false,
        isSingleUse: true,
        componentSymbols: [],
        actionCost: 1,
        description: '',
        isWeapon: false,
        ammo: null,
        maxAmmo: null,
      } as never,
    ];
    state.players['player-2']!.handSlots = [
      {
        source: 'ITEM',
        card: {
          id: 'heavy-weapon',
          name: 'Винтовка',
          color: 'RED',
          origin: 'STARTING',
          isHeavy: true,
          isSingleUse: false,
          componentSymbols: [],
          actionCost: 1,
          description: '',
          isWeapon: true,
          isEnergyWeapon: false,
          ammo: 2,
          maxAmmo: 4,
        } as never,
      },
    ];
    state.players['player-2']!.actionDeck.hand = [
      { id: 'secret-hand-1', characterClass: 'PILOT', name: 'Секрет', playCost: 0, description: '' },
    ];

    // Приватное решение для player-2
    state.pendingDecision = {
      id: 'dec-private',
      playerId: 'player-2',
      type: 'CHOOSE_SEARCH_ITEM',
      cards: [
        {
          id: 'secret-item-1',
          name: 'Секретный предмет',
          color: 'RED',
          origin: 'ROOM_DECK',
          isHeavy: false,
          isSingleUse: true,
          componentSymbols: [],
          actionCost: 1,
          description: 'Секрет',
          isWeapon: false,
          ammo: null,
          maxAmmo: null,
        } as never,
        {
          id: 'secret-item-2',
          name: 'Секретный предмет 2',
          color: 'YELLOW',
          origin: 'ROOM_DECK',
          isHeavy: false,
          isSingleUse: true,
          componentSymbols: [],
          actionCost: 1,
          description: 'Секрет2',
          isWeapon: false,
          ammo: null,
          maxAmmo: null,
        } as never,
      ],
      sourceDeck: 'RED',
      roomId: 1,
    };

    // Вьювер — player-1, смотрит на чужого player-2
    const view = filterStateForPlayer(state, 'player-1');
    const serialized = JSON.stringify(view);

    // Чужая рука — пустой массив (handCount отдельно)
    expect(view.players['player-2']?.actionDeck.hand).toEqual([]);
    expect(view.players['player-2']?.actionDeck.handCount).toBe(1);
    // Инвентарь чужого — null
    expect(view.players['player-2']?.inventory).toBeNull();
    // handSlots чужого — скрыты? В текущей реализации они публичны? По правилам тяжёлые видны всем (ITEMS_AND_GEAR.md), но инвентарь скрыт.
    // Проверяем что inventory null, а handSlots видны (публичные)
    // pendingDecision чужого — null
    expect(view.pendingDecision).toBeNull();

    // Порядок колод — только drawPileCount, без drawPile
    expect(view.decks.items.RED.drawPileCount).toBeDefined();
    expect((view.decks.items.RED as unknown as { drawPile?: unknown }).drawPile).toBeUndefined();
    expect(view.decks.items.YELLOW.drawPileCount).toBeDefined();
    expect(view.decks.events.drawPileCount).toBeDefined();
    expect((view.decks.events as unknown as { drawPile?: unknown }).drawPile).toBeUndefined();

    // Секретные ID не должны утекать в JSON
    expect(serialized).not.toContain('secret-hand-1');
    expect(serialized).not.toContain('secret-item-1');
    expect(serialized).not.toContain('secret-item-2');
    expect(serialized).not.toContain('HIDDEN');
  });

  it('своя рука видна, чужая — только счётчики, инвентарь чужого скрыт', () => {
    const state = createInitialGameState('privacy-test-2', { playerCount: 2 });
    const view = filterStateForPlayer(state, 'player-1');

    // Своя рука видна
    expect(view.players['player-1']?.actionDeck.hand.length).toBeGreaterThan(0);
    // Чужая рука — пустая, но есть handCount
    expect(view.players['player-2']?.actionDeck.hand).toEqual([]);
    expect(typeof view.players['player-2']?.actionDeck.handCount).toBe('number');
    expect(view.players['player-2']?.inventory).toBeNull();
  });
});

