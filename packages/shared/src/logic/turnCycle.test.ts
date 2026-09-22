import { describe, expect, it } from 'vitest';

import { createInitialGameState } from './setup.js';
import { GameEngine, EngineError, findAdjacentOpenRoomIds } from './fsm.js';
import { applyFireEndTurnEffect, findNextActivePlayer, getOrderedPlayers, startNewRound } from './turnCycle.js';

describe('Цикл микроходов и порядок игроков (Фаза Игроков, этап 0.5.0)', () => {
  it('возвращает игроков, упорядоченных по orderNumber', () => {
    const state = createInitialGameState('test-turn-1', { playerCount: 3 });
    const ordered = getOrderedPlayers(state);

    expect(ordered).toHaveLength(3);
    expect(ordered.map((p) => p.orderNumber)).toEqual([1, 2, 3]);
  });

  it('находит следующего неспасовавшего игрока по часовой стрелке', () => {
    const state = createInitialGameState('test-turn-2', { playerCount: 3 });

    expect(findNextActivePlayer(state, 'player-1')?.id).toBe('player-2');
    expect(findNextActivePlayer(state, 'player-2')?.id).toBe('player-3');
    expect(findNextActivePlayer(state, 'player-3')?.id).toBe('player-1');

    // Если player-2 спасовал, ход переходит сразу к player-3
    state.players['player-2']!.hasPassed = true;
    expect(findNextActivePlayer(state, 'player-1')?.id).toBe('player-3');

    // Если все спасовали, следующего нет
    state.players['player-1']!.hasPassed = true;
    state.players['player-3']!.hasPassed = true;
    expect(findNextActivePlayer(state, 'player-1')).toBeNull();
  });

  it('переключает ход после двух выполненных действий', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('test-turn-3', { playerCount: 2 });

    const openNeighbour = findAdjacentOpenRoomIds(state, 11)[0]!;
    const card1 = state.players['player-1']!.actionDeck.hand[0]!.id;

    // Действие 1: перемещение в соседнюю комнату
    const s1 = engine.processAction(state, {
      type: 'ACTION_MOVE',
      payload: { targetRoomId: openNeighbour, discardCardIds: [card1] },
    });

    expect(s1.meta.activePlayerId).toBe('player-1');
    expect(s1.players['player-1']?.actionsPerformedThisRound).toBe(1);

    // Действие 2: перемещение обратно в 11
    const card2 = s1.players['player-1']!.actionDeck.hand[0]!.id;
    const s2 = engine.processAction(s1, {
      type: 'ACTION_MOVE',
      payload: { targetRoomId: 11, discardCardIds: [card2] },
    });

    // После 2 действий ход передается player-2
    expect(s2.meta.activePlayerId).toBe('player-2');
    expect(s2.players['player-1']?.actionsPerformedThisRound).toBe(0);
  });

  it('позволяет выполнить одно действие и спасовать', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('test-turn-4', { playerCount: 2 });

    const openNeighbour = findAdjacentOpenRoomIds(state, 11)[0]!;
    const card1 = state.players['player-1']!.actionDeck.hand[0]!.id;

    // Действие 1
    const s1 = engine.processAction(state, {
      type: 'ACTION_MOVE',
      payload: { targetRoomId: openNeighbour, discardCardIds: [card1] },
    });

    // Пас после 1 действия
    const s2 = engine.processAction(s1, {
      type: 'ACTION_PASS',
      payload: {},
    });

    expect(s2.players['player-1']?.hasPassed).toBe(true);
    expect(s2.meta.activePlayerId).toBe('player-2');
  });

  it('блокирует действия спасовавшего игрока до конца Фазы Игроков', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('test-turn-5', { playerCount: 2 });

    // player-1 пасует
    const s1 = engine.processAction(state, {
      type: 'ACTION_PASS',
      payload: {},
    });

    // player-2 делает действие
    const openNeighbour = findAdjacentOpenRoomIds(s1, 11)[0]!;
    const card = s1.players['player-2']!.actionDeck.hand[0]!.id;

    // Попытка player-1 сделать действие приводит к ошибке NOT_ACTIVE_PLAYER
    expect(() =>
      engine.processAction(
        s1,
        {
          type: 'ACTION_MOVE',
          payload: { targetRoomId: openNeighbour, discardCardIds: [card] },
        },
        { actorId: 'player-1' },
      ),
    ).toThrowError(EngineError);

    // player-2 делает 2 действия и передает ход обратно
    const s2 = engine.processAction(s1, {
      type: 'ACTION_MOVE',
      payload: { targetRoomId: openNeighbour, discardCardIds: [card] },
    });
    const card2 = s2.players['player-2']!.actionDeck.hand[0]!.id;
    const s3 = engine.processAction(s2, {
      type: 'ACTION_MOVE',
      payload: { targetRoomId: 11, discardCardIds: [card2] },
    });

    // Так как player-1 спасовал, активным остается player-2
    expect(s3.meta.activePlayerId).toBe('player-2');
  });

  it('наносит урон от пожара при завершении хода в горящем отсеке (стр. 17)', () => {
    const state = createInitialGameState('test-turn-fire');
    const player = state.players['player-1']!;
    const room = state.ship.rooms[player.roomId]!;

    room.hasFire = true;
    expect(player.lightWounds).toBe(0);

    const damaged = applyFireEndTurnEffect(state, 'player-1');
    expect(damaged).toBe(true);
    expect(player.lightWounds).toBe(1);
    expect(state.gameLog.some((e) => e.event.type === 'FIRE_DAMAGE_TAKEN')).toBe(true);
  });

  it('при общем пасе всех игроков исполняет оркестратор Фазы Событий и начинает новый раунд', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('test-turn-all-pass', { playerCount: 2 });

    const s1 = engine.processAction(state, { type: 'ACTION_PASS', payload: {} });
    expect(s1.meta.phase).toBe('PLAYER_PHASE');

    const s2 = engine.processAction(s1, { type: 'ACTION_PASS', payload: {} });
    // Оркестратор Шагов Фазы Событий: счётчики, честные пропуски 5/7/8, огонь, новый раунд
    expect(s2.meta.phase).toBe('PLAYER_PHASE');
    expect(s2.meta.currentRound).toBe(2);
    expect(s2.meta.timeTrackPosition).toBe(1);
    expect(s2.gameLog.some((e) => e.event.type === 'TIME_TRACK_ADVANCED')).toBe(true);
    expect(s2.gameLog.filter((e) => e.event.type === 'EVENT_PHASE_STEP_SKIPPED')).toHaveLength(3);
    expect(s2.gameLog.some((e) => e.event.type === 'ROUND_STARTED')).toBe(true);
  });

  it('startNewRound корректно начинает новый раунд: сброс паса, передача жетона 1-го игрока и добор', () => {
    const state = createInitialGameState('test-new-round', { playerCount: 2 });
    state.players['player-1']!.hasPassed = true;
    state.players['player-2']!.hasPassed = true;
    state.meta.phase = 'EVENT_PHASE';
    state.players['player-1']!.actionDeck.hand = [];

    startNewRound(state);

    expect(state.meta.phase).toBe('PLAYER_PHASE');
    expect(state.meta.currentRound).toBe(2);
    // Маркер Времени двигает Шаг 4 Фазы Событий, а не начало раунда
    expect(state.meta.timeTrackPosition).toBe(0);
    expect(state.meta.firstPlayerId).toBe('player-2');
    expect(state.meta.activePlayerId).toBe('player-2');
    expect(state.players['player-1']?.hasPassed).toBe(false);
    expect(state.players['player-2']?.hasPassed).toBe(false);
    expect(state.players['player-1']?.actionDeck.hand).toHaveLength(5);
  });
});
