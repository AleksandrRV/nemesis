import { describe, expect, it } from 'vitest';
import { GameEngine, EngineError } from './fsm.js';
import { createInitialGameState } from './setup.js';
import { filterStateForPlayer } from './sanitizer.js';
import { startNewRound } from './turnCycle.js';
import { getPlayerHandLimit, drawCardsToLimit } from './cardsPayment.js';
import type { GameState } from '../types/state.js';
import type { ItemCard } from '../types/cards.js';

describe('Комплексная валидация релиза v0.3.0', () => {
  it('сериализация и восстановление состояния (JSON round-trip) сохраняет руку, колоды, сброс и pendingDecision', () => {
    const state = createInitialGameState('release-v0.3.0-test');
    const player = state.players['player-1']!;

    // Эмулируем активное промежуточное решение выбора карты поиска с полными картами (Шаг 5, долг 11)
    const cardA: ItemCard = {
      id: 'ITEM_YEL_1',
      name: 'Инструменты',
      color: 'YELLOW',
      origin: 'ROOM_DECK',
      isHeavy: false,
      isSingleUse: false,
      componentSymbols: ['TOOLS'],
      actionCost: 1,
      description: 'Чинит',
      isWeapon: false,
      ammo: null,
      maxAmmo: null,
    };
    const cardB: ItemCard = {
      id: 'ITEM_YEL_2',
      name: 'Изолента',
      color: 'YELLOW',
      origin: 'ROOM_DECK',
      isHeavy: false,
      isSingleUse: true,
      componentSymbols: ['TOOLS'],
      actionCost: 1,
      description: 'Клеит',
      isWeapon: false,
      ammo: null,
      maxAmmo: null,
    };
    state.pendingDecision = {
      id: 'search-decision-test',
      playerId: 'player-1',
      type: 'CHOOSE_SEARCH_ITEM',
      cards: [cardA, cardB],
      sourceDeck: 'YELLOW',
      roomId: 2,
    };

    const serialized = JSON.stringify(state);
    const restored = JSON.parse(serialized) as GameState;

    expect(restored.meta.schemaVersion).toBe(state.meta.schemaVersion);
    expect(restored.players['player-1']!.actionDeck.hand.length).toBe(player.actionDeck.hand.length);
    expect(restored.players['player-1']!.actionDeck.drawPile.length).toBe(player.actionDeck.drawPile.length);
    expect(restored.players['player-1']!.actionDeck.discard.length).toBe(player.actionDeck.discard.length);
    expect(restored.pendingDecision).toEqual(state.pendingDecision);
  });

  it('санитизация скрывает pendingDecision от чужих игроков, не допуская утечки скрытой информации', () => {
    const state = createInitialGameState('release-v0.3.0-test');
    const cardA: ItemCard = {
      id: 'HIDDEN_SECRET_ITEM_1',
      name: 'Секрет 1',
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
    };
    const cardB: ItemCard = {
      id: 'HIDDEN_SECRET_ITEM_2',
      name: 'Секрет 2',
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
    };
    state.pendingDecision = {
      id: 'private-decision',
      playerId: 'player-1',
      type: 'CHOOSE_SEARCH_ITEM',
      cards: [cardA, cardB],
      sourceDeck: 'RED',
      roomId: 5,
    };

    // Для владельца (player-1) решение доступно с полными картами
    const viewOwner = filterStateForPlayer(state, 'player-1');
    expect(viewOwner.pendingDecision).not.toBeNull();
    if (viewOwner.pendingDecision?.type === 'CHOOSE_SEARCH_ITEM') {
      expect(viewOwner.pendingDecision.cards.map((c) => c.id)).toEqual([
        'HIDDEN_SECRET_ITEM_1',
        'HIDDEN_SECRET_ITEM_2',
      ]);
      expect(viewOwner.pendingDecision.cards[0]?.name).toBe('Секрет 1');
    }

    // Для другого игрока (player-2) решение цензурируется в null
    state.players['player-2'] = {
      ...state.players['player-1']!,
      id: 'player-2',
      name: 'Игрок 2',
    };
    const viewOther = filterStateForPlayer(state, 'player-2');
    expect(viewOther.pendingDecision).toBeNull();
  });

  it('атомарность: при ошибке движка состояние полностью откатывается к исходному', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('release-v0.3.0-test');

    const snapshot = JSON.stringify(state);

    // Попытка применить нелегальное действие (например, оплатить несуществующей картой)
    expect(() => {
      engine.processAction(state, {
        type: 'ACTION_MOVE',
        payload: {
          targetRoomId: 999,
          discardCardIds: ['non-existent-card'],
        },
      });
    }).toThrow(EngineError);

    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('сквозной сценарий: MOVE → SEARCH → RESOLVE_DECISION → ROOM_ABILITY GENERATOR → PASS → PASS → startNewRound → draw to 5/6 (Шаг 8, долг 25)', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('release-e2e-test', { playerCount: 2 });

    // Подготовка: найдём комнату Генератора и сделаем её соседней к стартовой (11) для простоты
    const generatorRoom = Object.values(state.ship.rooms).find((r) => r.definitionId === 'GENERATOR');
    expect(generatorRoom).toBeDefined();
    const genRoomId = generatorRoom!.id;

    // Делаем генератор исследованным, с предметами, без поломки
    generatorRoom!.isExplored = true;
    generatorRoom!.hasMalfunction = false;
    generatorRoom!.hasFire = false;
    generatorRoom!.itemsCount = 2;
    generatorRoom!.occupantIntruderIds = [];

    // Стартовый отсек 11 соединён с 6,8,14,15 — откроем дверь к генератору если не соседний, создадим коридор
    const startRoomId = 11;
    const startRoom = state.ship.rooms[startRoomId]!;
    startRoom.isExplored = true;

    // Для теста сделаем генератор соседним к старту через временный коридор или переместим игрока напрямую
    // Упростим: переместим игрока в комнату 6, а комнату 6 сделаем Генератором
    const room6 = state.ship.rooms[6]!;
    room6.definitionId = 'GENERATOR';
    room6.isExplored = true;
    room6.hasMalfunction = false;
    room6.hasFire = false;
    room6.itemsCount = 2;
    room6.occupantIntruderIds = [];

    const player1 = state.players['player-1']!;
    const player2 = state.players['player-2']!;

    // Убедимся что у player-1 достаточно карт для оплаты MOVE[1] + SEARCH[1] + GENERATOR[2] = 4 карты
    // В начальной руке 5 карт, так что хватит
    expect(player1.actionDeck.hand.length).toBeGreaterThanOrEqual(5);

    // Шаг 1: MOVE из 11 в 6 (Генератор)
    const movePay1 = [player1.actionDeck.hand[0]!.id];
    const afterMove = engine.processAction(state, {
      type: 'ACTION_MOVE',
      payload: { targetRoomId: 6, discardCardIds: movePay1 },
    });

    expect(afterMove.players['player-1']!.roomId).toBe(6);
    expect(afterMove.players['player-1']!.actionsPerformedThisRound).toBe(1);
    // После MOVE должен быть шум, но не должен быть в бою
    expect(afterMove.ship.rooms[6]!.occupantPlayerIds).toContain('player-1');

    // Шаг 2: SEARCH в Генераторе (YELLOW колода)
    const searchPay = [afterMove.players['player-1']!.actionDeck.hand[0]!.id];
    const afterSearch = engine.processAction(afterMove, {
      type: 'ACTION_SEARCH',
      payload: { discardCardIds: searchPay },
    });

    expect(afterSearch.pendingDecision).not.toBeNull();
    expect(afterSearch.pendingDecision?.type).toBe('CHOOSE_SEARCH_ITEM');
    if (afterSearch.pendingDecision?.type !== 'CHOOSE_SEARCH_ITEM') throw new Error('Expected CHOOSE_SEARCH_ITEM');
    const drawnIds = afterSearch.pendingDecision.cards.map((c) => c.id);
    expect(drawnIds).toHaveLength(2);
    // itemsCount ещё не уменьшен до выбора
    expect(afterSearch.ship.rooms[6]!.itemsCount).toBe(2);

    // Шаг 3: RESOLVE_DECISION — выбор первой карты
    const chosenId = afterSearch.pendingDecision.cards[0]!.id;
    const afterResolve = engine.processAction(afterSearch, {
      type: 'ACTION_RESOLVE_DECISION',
      payload: { decisionId: afterSearch.pendingDecision.id, selectedOption: chosenId },
    });

    expect(afterResolve.pendingDecision).toBeNull();
    // itemsCount должен уменьшиться на 1
    expect(afterResolve.ship.rooms[6]!.itemsCount).toBe(1);
    // Выбранная карта должна быть у игрока
    const hasInInventory = afterResolve.players['player-1']!.inventory.some((i) => i.id === chosenId);
    const hasInHandSlots = afterResolve.players['player-1']!.handSlots.some(
      (s) => s.source === 'ITEM' && s.card.id === chosenId,
    );
    expect(hasInInventory || hasInHandSlots).toBe(true);
    // После 2 действий (MOVE+SEARCH) микроход завершается: actionsPerformed сбрасывается в 0 и ход переходит к player-2
    expect(afterResolve.players['player-1']!.actionsPerformedThisRound).toBe(0);
    expect(afterResolve.meta.activePlayerId).toBe('player-2');

    // Шаг 4: ROOM_ABILITY GENERATOR — запуск самоуничтожения
    // Нужно 2 карты оплаты, но после 2 действий у player-1 actionsPerformedThisRound=2, ход уже завершён?
    // В v0.3.0 после 2 действий ход автоматически передаётся? Проверим: после SEARCH actionsPerformedThisRound=2, активный игрок должен смениться на player-2.
    // Поэтому делаем ход player-2 пас, затем снова player-1.
    // Для простоты: сбросим actionsPerformedThisRound и вернём активного игрока
    const stateForGenerator = structuredClone(afterResolve) as GameState;
    stateForGenerator.meta.activePlayerId = 'player-1';
    stateForGenerator.players['player-1']!.actionsPerformedThisRound = 0;
    stateForGenerator.players['player-1']!.hasPassed = false;

    // Дадим игроку ещё 2 карты для оплаты генератора
    while (stateForGenerator.players['player-1']!.actionDeck.hand.length < 2) {
      stateForGenerator.players['player-1']!.actionDeck.hand.push({
        id: `extra-pay-${Date.now()}-${Math.random()}`,
        name: 'Extra',
        characterClass: player1.characterClass,
        playCost: 1,
        description: 'Extra',
      } as never);
    }
    const genPay = [
      stateForGenerator.players['player-1']!.actionDeck.hand[0]!.id,
      stateForGenerator.players['player-1']!.actionDeck.hand[1]!.id,
    ];
    const afterGenerator = engine.processAction(stateForGenerator, {
      type: 'ACTION_ROOM_ABILITY',
      payload: { discardCardIds: genPay },
    });

    expect(afterGenerator.meta.selfDestructTrackPosition).toBe(0);
    expect(afterGenerator.players['player-1']!.actionsPerformedThisRound).toBe(1);

    // Шаг 5: PASS обоих игроков (без сброса для простоты)
    const afterP1Pass = engine.processAction(afterGenerator, {
      type: 'ACTION_PASS',
      payload: { discardCardIds: [] },
    });
    expect(afterP1Pass.players['player-1']!.hasPassed).toBe(true);

    const afterP2Pass = engine.processAction(afterP1Pass, {
      type: 'ACTION_PASS',
      payload: { discardCardIds: [] },
    });
    // После паса обоих игроков срабатывает Фаза Событий и сразу startNewRound (runEventPhase)
    // Поэтому hasPassed сбрасывается, фаза снова PLAYER_PHASE, раунд 2
    expect(afterP2Pass.meta.phase).toBe('PLAYER_PHASE');
    expect(afterP2Pass.meta.currentRound).toBe(2);
    expect(afterP2Pass.players['player-1']!.hasPassed).toBe(false);
    expect(afterP2Pass.players['player-2']!.hasPassed).toBe(false);

    // Шаг 6: afterP2Pass уже прошёл startNewRound, проверим добор
    const afterNewRound = afterP2Pass;

    expect(afterNewRound.meta.phase).toBe('PLAYER_PHASE');
    expect(afterNewRound.meta.currentRound).toBe(2);

    // Проверим лимит руки: базовый 5, в Каютах 6
    const p1After = afterNewRound.players['player-1']!;
    const handLimit = getPlayerHandLimit(afterNewRound, 'player-1');
    expect([5, 6]).toContain(handLimit);

    // Добор до лимита
    const drawn = drawCardsToLimit(afterNewRound, 'player-1', handLimit);
    expect(afterNewRound.players['player-1']!.actionDeck.hand.length).toBe(handLimit);

    // Если игрок в Каютах без поломки/пожара/Чужих — лимит 6
    const cabinsRoomEntry = Object.values(afterNewRound.ship.rooms).find((r) => r.definitionId === 'CABINS');
    if (cabinsRoomEntry) {
      const mutable = structuredClone(afterNewRound) as typeof afterNewRound;
      const cabinsRoom = mutable.ship.rooms[cabinsRoomEntry.id]!;
      cabinsRoom.isExplored = true;
      cabinsRoom.hasMalfunction = false;
      cabinsRoom.hasFire = false;
      cabinsRoom.occupantIntruderIds = [];
      mutable.players['player-1']!.roomId = cabinsRoom.id;
      const cabinsLimit = getPlayerHandLimit(mutable, 'player-1');
      expect(cabinsLimit).toBe(6);
    }
  });
});
