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
      expect(s1.pendingDecision.drawnCardIds).toHaveLength(2);
      expect(s1.pendingDecision.sourceDeck).toBe('RED');

      const chosenCardId = s1.pendingDecision.drawnCardIds[0]!;
      const unchosenCardId = s1.pendingDecision.drawnCardIds[1]!;

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

      // Невыбранная карта возвращается под низ колоды
      expect(s2.decks.items.RED.drawPile.some((c) => c.id === unchosenCardId)).toBe(true);
      expect(s2.decks.items.RED.drawPile[s2.decks.items.RED.drawPile.length - 1]?.id).toBe(unchosenCardId);

      // Счётчик предметов отсека уменьшается ровно на 1
      expect(s2.ship.rooms[player.roomId]?.itemsCount).toBe(1);

      // В логе зафиксировано событие без раскрытия имени предмета
      expect(s2.gameLog.some((e) => e.event.type === 'SEARCH_PERFORMED')).toBe(true);
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
