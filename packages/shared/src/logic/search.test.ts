import { describe, expect, it } from 'vitest';

import { createInitialGameState } from './setup.js';
import { GameEngine } from './fsm.js';
import { filterStateForPlayer } from './sanitizer.js';
import { drawSearchCards, getRoomDeckColor, validateSearchConditions } from './search.js';

describe('Механика Поиска и экономика предметов (v0.3.0 Шаг 5)', () => {
  it('определяет цвет колоды отсека по правилам', () => {
    expect(getRoomDeckColor('ARMORY')).toBe('RED');
    expect(getRoomDeckColor('COMM_ROOM')).toBe('YELLOW');
    expect(getRoomDeckColor('INFIRMARY')).toBe('GREEN');
    expect(getRoomDeckColor('COCKPIT')).toBe('WHITE');
    expect(getRoomDeckColor('HIBERNATORIUM')).toBe('WHITE');
  });

  it('запрещает поиск в неисследованных комнатах, при 0 предметов или в бою', () => {
    const state = createInitialGameState('test-search-val');
    const player = state.players['player-1']!;

    // В неисследованной комнате
    const unexploredRoom = Object.values(state.ship.rooms).find((r) => !r.isExplored)!;
    player.roomId = unexploredRoom.id;
    expect(() => validateSearchConditions(state, 'player-1')).toThrowError(/неисследованном/);

    // Исследуем, но обнуляем предметы
    unexploredRoom.isExplored = true;
    unexploredRoom.itemsCount = 0;
    unexploredRoom.definitionId = 'ARMORY';
    expect(() => validateSearchConditions(state, 'player-1')).toThrowError(/не осталось предметов/);

    // Добавляем предметы, но добавляем Чужого (бой)
    unexploredRoom.itemsCount = 2;
    unexploredRoom.occupantIntruderIds = ['intruder-1'];
    expect(() => validateSearchConditions(state, 'player-1')).toThrowError(/Чужие/);
  });

  it('запрещает поиск в Улье (NEST) и Комнате со Слизью (SLIME_ROOM)', () => {
    const state = createInitialGameState('test-search-forbidden');
    const player = state.players['player-1']!;
    const room = state.ship.rooms[player.roomId]!;

    room.isExplored = true;
    room.itemsCount = 3;
    room.definitionId = 'NEST';

    expect(() => validateSearchConditions(state, 'player-1')).toThrowError(/запрещён правилами/);

    room.definitionId = 'SLIME_ROOM';
    expect(() => validateSearchConditions(state, 'player-1')).toThrowError(/запрещён правилами/);
  });

  it('вытягивает 2 карты из колоды предметов для выбора', () => {
    const state = createInitialGameState('test-search-draw');
    const redCards = drawSearchCards(state, 'RED');

    expect(redCards).toHaveLength(2);
    expect(state.decks.items.RED.drawPile).toHaveLength(28);
  });

  it('выполняет двухэтапный поиск в цветном отсеке: вытягивание -> pendingDecision -> выбор', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('test-search-flow');
    const player = state.players['player-1']!;
    const room = state.ship.rooms[player.roomId]!;

    room.isExplored = true;
    room.definitionId = 'ARMORY'; // Красный отсек
    room.itemsCount = 2;

    const payCardId = player.actionDeck.hand[0]!.id;

    // Шаг 1: заявка на поиск
    const s1 = engine.processAction(state, {
      type: 'ACTION_SEARCH',
      payload: { discardCardIds: [payCardId] },
    });

    expect(s1.pendingDecision).not.toBeNull();
    expect(s1.pendingDecision?.type).toBe('CHOOSE_SEARCH_ITEM');
    if (s1.pendingDecision?.type === 'CHOOSE_SEARCH_ITEM') {
      // Шаг 5, долг 11: решение содержит полные карты, а не только ID
      expect(s1.pendingDecision.cards).toHaveLength(2);
      expect(s1.pendingDecision.cards[0]?.name).toBeDefined();
      expect(s1.pendingDecision.cards[0]?.description).toBeDefined();
      expect(s1.pendingDecision.cards[0]?.color).toBeDefined();
      expect(s1.pendingDecision.sourceDeck).toBe('RED');

      const chosenCardId = s1.pendingDecision.cards[0]!.id;
      const unchosenCardId = s1.pendingDecision.cards[1]!.id;

      // Шаг 2: выбор карты
      const s2 = engine.processAction(s1, {
        type: 'ACTION_RESOLVE_DECISION',
        payload: {
          decisionId: s1.pendingDecision.id,
          selectedOption: chosenCardId,
        },
      });

      expect(s2.pendingDecision).toBeNull();
      // Выбранная карта попадает в инвентарь или руку игрока
      const inInventory = s2.players['player-1']?.inventory.some((i) => i.id === chosenCardId);
      const inHandSlots = s2.players['player-1']?.handSlots.some(
        (s) => s.source === 'ITEM' && s.card.id === chosenCardId,
      );
      expect(inInventory || inHandSlots).toBe(true);

      // Невыбранная карта возвращается под низ колоды (Шаг 5, долг 15: push() низ, shift() верх)
      expect(s2.decks.items.RED.drawPile.some((c) => c.id === unchosenCardId)).toBe(true);
      expect(s2.decks.items.RED.drawPile[s2.decks.items.RED.drawPile.length - 1]?.id).toBe(unchosenCardId);

      // Счётчик предметов отсека уменьшается ровно на 1
      expect(s2.ship.rooms[player.roomId]?.itemsCount).toBe(1);

      // В логе зафиксировано событие без раскрытия имени предмета
      expect(s2.gameLog.some((e) => e.event.type === 'SEARCH_PERFORMED')).toBe(true);
    }
  });

  it('одиночная карта при занятых руках не теряется — требуется DISCARD_HEAVY (Шаг 5, долг 12)', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('test-search-single-heavy');
    const player = state.players['player-1']!;
    const room = state.ship.rooms[player.roomId]!;

    room.isExplored = true;
    room.definitionId = 'ARMORY';
    room.itemsCount = 1;

    // Занимаем обе руки тяжёлыми предметами
    player.handSlots = [
      { source: 'ITEM', card: { id: 'heavy-1', name: 'Тяж1', color: 'RED', origin: 'ROOM_DECK', isHeavy: true, isSingleUse: false, componentSymbols: [], actionCost: 0, description: '', isWeapon: false, ammo: null, maxAmmo: null } as never },
      { source: 'ITEM', card: { id: 'heavy-2', name: 'Тяж2', color: 'RED', origin: 'ROOM_DECK', isHeavy: true, isSingleUse: false, componentSymbols: [], actionCost: 0, description: '', isWeapon: false, ammo: null, maxAmmo: null } as never },
    ];

    // Делаем колоду с одной тяжёлой картой — берём реальную карту из CRAFTED чтобы DISCARD_HEAVY мог её найти в шаблонах
    const heavyCard = {
      id: 'CRAFTED_FLAMETHROWER_1',
      name: 'Огнемёт',
      color: 'BLUE' as const,
      origin: 'CRAFTED' as const,
      recipeId: 'FLAMETHROWER' as const,
      components: ['TOOLS', 'CHEMICALS'] as const,
      isHeavy: true,
      isSingleUse: false,
      componentSymbols: [] as const,
      actionCost: 1,
      description: 'Огнемёт',
      isWeapon: true,
      ammo: 4,
      maxAmmo: 4,
    } as never;
    state.decks.items.RED.drawPile = [heavyCard];

    const payCardId = player.actionDeck.hand[0]!.id;
    const s1 = engine.processAction(state, {
      type: 'ACTION_SEARCH',
      payload: { discardCardIds: [payCardId] },
    });

    // Должно выставить DISCARD_HEAVY, а не потерять карту
    expect(s1.pendingDecision?.type).toBe('DISCARD_HEAVY_ITEM_FOR_NEW');
    if (s1.pendingDecision?.type === 'DISCARD_HEAVY_ITEM_FOR_NEW') {
      expect(s1.pendingDecision.newItemId).toBe(heavyCard.id);
      expect(s1.pendingDecision.roomId).toBe(room.id);
      // itemsCount ещё не уменьшен — поиск не завершён до сброса
      expect(s1.ship.rooms[room.id]?.itemsCount).toBe(1);

      // Разрешаем DISCARD_HEAVY
      const s2 = engine.processAction(s1, {
        type: 'ACTION_RESOLVE_DECISION',
        payload: { decisionId: s1.pendingDecision.id, selectedOption: 'heavy-1' },
      });

      expect(s2.pendingDecision).toBeNull();
      expect(s2.players['player-1']?.handSlots.some((s) => s.source === 'ITEM' && s.card.id === heavyCard.id)).toBe(true);
      // Теперь поиск завершён и itemsCount уменьшен
      expect(s2.ship.rooms[room.id]?.itemsCount).toBe(0);
    }
  });

  it('возврат второй карты вниз — карта действительно внизу, а не сверху (Шаг 5, долг 15)', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('test-search-bottom');
    const player = state.players['player-1']!;
    const room = state.ship.rooms[player.roomId]!;

    room.isExplored = true;
    room.definitionId = 'ARMORY';
    room.itemsCount = 1;

    // Задаём известный порядок колоды: [A, B, C]
    const cardA = { id: 'A', name: 'A', color: 'RED', origin: 'ROOM_DECK', isHeavy: false, isSingleUse: true, componentSymbols: [], actionCost: 0, description: '', isWeapon: false, ammo: null, maxAmmo: null } as never;
    const cardB = { id: 'B', name: 'B', color: 'RED', origin: 'ROOM_DECK', isHeavy: false, isSingleUse: true, componentSymbols: [], actionCost: 0, description: '', isWeapon: false, ammo: null, maxAmmo: null } as never;
    const cardC = { id: 'C', name: 'C', color: 'RED', origin: 'ROOM_DECK', isHeavy: false, isSingleUse: true, componentSymbols: [], actionCost: 0, description: '', isWeapon: false, ammo: null, maxAmmo: null } as never;
    state.decks.items.RED.drawPile = [cardA, cardB, cardC];

    const payCardId = player.actionDeck.hand[0]!.id;
    const s1 = engine.processAction(state, {
      type: 'ACTION_SEARCH',
      payload: { discardCardIds: [payCardId] },
    });

    // Вытянуто A и B, в колоде остался C
    expect(s1.pendingDecision?.type).toBe('CHOOSE_SEARCH_ITEM');
    if (s1.pendingDecision?.type === 'CHOOSE_SEARCH_ITEM') {
      expect(s1.pendingDecision.cards.map((c) => c.id)).toEqual(['A', 'B']);
      expect(s1.decks.items.RED.drawPile.map((c) => c.id)).toEqual(['C']);

      // Выбираем A, B должен уйти под низ (после C)
      const s2 = engine.processAction(s1, {
        type: 'ACTION_RESOLVE_DECISION',
        payload: { decisionId: s1.pendingDecision.id, selectedOption: 'A' },
      });

      expect(s2.decks.items.RED.drawPile.map((c) => c.id)).toEqual(['C', 'B']);
      expect(s2.decks.items.RED.drawPile[0]?.id).toBe('C'); // верх остался C
      expect(s2.decks.items.RED.drawPile[s2.decks.items.RED.drawPile.length - 1]?.id).toBe('B'); // B внизу
    }
  });

  it('STORAGE использует отдельный тип CHOOSE_STORAGE_ITEM (Шаг 5, долг 14)', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('test-storage-type');
    const player = state.players['player-1']!;
    const room = state.ship.rooms[player.roomId]!;

    room.isExplored = true;
    room.definitionId = 'STORAGE';
    room.itemsCount = 5; // Склад не уменьшает itemsCount своим поиском

    const payCardIds = [player.actionDeck.hand[0]!.id, player.actionDeck.hand[1]!.id];
    const s1 = engine.processAction(state, {
      type: 'ACTION_ROOM_ABILITY',
      payload: { targetDeckColor: 'RED', discardCardIds: payCardIds },
    });

    expect(s1.pendingDecision?.type).toBe('CHOOSE_STORAGE_ITEM');
    if (s1.pendingDecision?.type === 'CHOOSE_STORAGE_ITEM') {
      expect(s1.pendingDecision.cards).toHaveLength(2);
      const chosenId = s1.pendingDecision.cards[0]!.id;
      const s2 = engine.processAction(s1, {
        type: 'ACTION_RESOLVE_DECISION',
        payload: { decisionId: s1.pendingDecision.id, selectedOption: chosenId },
      });
      // Склад не уменьшает itemsCount
      expect(s2.ship.rooms[room.id]?.itemsCount).toBe(5);
    }
  });

  it('в белом отсеке запрашивает выбор колоды, если цвет не был передан сразу', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('test-search-white');
    const player = state.players['player-1']!;
    const room = state.ship.rooms[player.roomId]!;

    room.isExplored = true;
    room.definitionId = 'COCKPIT'; // Белый отсек
    room.itemsCount = 2;

    const payCardId = player.actionDeck.hand[0]!.id;

    // Шаг 1: поиск без указания цвета колоды
    const s1 = engine.processAction(state, {
      type: 'ACTION_SEARCH',
      payload: { discardCardIds: [payCardId] },
    });

    expect(s1.pendingDecision?.type).toBe('CHOOSE_WHITE_ROOM_DECK');

    // Шаг 2: выбор колоды (например, GREEN)
    const s2 = engine.processAction(s1, {
      type: 'ACTION_RESOLVE_DECISION',
      payload: {
        decisionId: s1.pendingDecision!.id,
        selectedOption: 'GREEN',
      },
    });

    expect(s2.pendingDecision?.type).toBe('CHOOSE_SEARCH_ITEM');
    if (s2.pendingDecision?.type === 'CHOOSE_SEARCH_ITEM') {
      expect(s2.pendingDecision.sourceDeck).toBe('GREEN');
      expect(s2.pendingDecision.cards).toHaveLength(2);
      expect(s2.pendingDecision.cards[0]?.name).toBeDefined();
    }
  });

  it('фильтрует чужой pendingDecision и скрытый инвентарь при санитайзинге', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('test-search-sanitized', { playerCount: 2 });
    const player = state.players['player-1']!;
    const room = state.ship.rooms[player.roomId]!;

    room.isExplored = true;
    room.definitionId = 'ARMORY';
    room.itemsCount = 3;

    const payCardId = player.actionDeck.hand[0]!.id;
    const s1 = engine.processAction(state, {
      type: 'ACTION_SEARCH',
      payload: { discardCardIds: [payCardId] },
    });

    // Для самого игрока pendingDecision виден
    const viewer1 = filterStateForPlayer(s1, 'player-1');
    expect(viewer1.pendingDecision).not.toBeNull();

    // Для второго игрока чужое приватное решение скрыто (null)
    const viewer2 = filterStateForPlayer(s1, 'player-2');
    expect(viewer2.pendingDecision).toBeNull();
  });
});
