import { describe, expect, it } from 'vitest';

import { appendGameLog, createInitialGameLog } from './gameLog.js';
import { createInitialGameState } from './setup.js';
import { GameEngine, findAdjacentOpenRoomIds } from './fsm.js';

describe('gameLog: последовательный публичный журнал', () => {
  it('начинает каждую партию с GAME_STARTED', () => {
    const state = createInitialGameState('game-log-start');

    expect(state.gameLog).toEqual(createInitialGameLog());
    expect(state.gameLog[0]).toEqual({ id: 'log-1', sequence: 1, event: { type: 'GAME_STARTED' } });
  });

  it('добавляет события с монотонными sequence и детерминированными id', () => {
    const state = createInitialGameState('game-log-append');

    appendGameLog(state, { type: 'GAME_OVER', reason: 'HULL_BREACH' });
    appendGameLog(state, {
      type: 'DEV_STATE_CHANGED',
      playerId: 'player-1',
      target: 'NOISE',
      corridorId: '1-2',
      value: true,
    });

    expect(state.gameLog.slice(-2)).toEqual([
      { id: 'log-2', sequence: 2, event: { type: 'GAME_OVER', reason: 'HULL_BREACH' } },
      {
        id: 'log-3',
        sequence: 3,
        event: { type: 'DEV_STATE_CHANGED', playerId: 'player-1', target: 'NOISE', corridorId: '1-2', value: true },
      },
    ]);
  });

  it('движок записывает перемещение и публичные последствия входа', () => {
    const state = createInitialGameState('game-log-move');
    const targetRoomId = findAdjacentOpenRoomIds(state, 11).find((roomId) => !state.ship.rooms[roomId]?.isExplored);
    const discardCardId = state.players['player-1']!.actionDeck.hand[0]!.id;

    expect(targetRoomId).toBeDefined();

    const next = new GameEngine().processAction(state, {
      type: 'ACTION_MOVE',
      payload: { targetRoomId: targetRoomId!, discardCardIds: [discardCardId] },
    });
    const eventTypes = next.gameLog.map((entry) => entry.event.type);

    expect(eventTypes).toContain('PLAYER_MOVED');
    expect(eventTypes).toContain('ROOM_DISCOVERED');
    expect(eventTypes).toContain('EXPLORATION_TOKEN_REVEALED');
    expect(next.gameLog.every((entry, index) => entry.sequence === index + 1 && entry.id === `log-${index + 1}`)).toBe(
      true,
    );
  });

  it('не добавляет записи при отклонённом действии: журнал не расходится с состоянием', () => {
    const state = createInitialGameState('game-log-rejected');
    const before = structuredClone(state);

    expect(() =>
      new GameEngine().processAction(state, {
        type: 'ACTION_MOVE',
        payload: { targetRoomId: 11, discardCardIds: [] },
      }),
    ).toThrow();

    expect(state).toEqual(before);
  });
});
