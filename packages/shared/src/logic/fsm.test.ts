import { describe, expect, it } from 'vitest';

import type { EngineAction } from '../types/actions.js';
import type { GameState } from '../types/state.js';
import type { EngineErrorCode } from './fsm.js';
import { EngineError, GameEngine, drainInterrupts, findAdjacentOpenRoomIds, resolveInterrupt } from './fsm.js';
import { createInitialGameState } from './setup.js';

const SEED = 'engine-test';

const freshState = (): GameState => createInitialGameState(SEED);

/**
 * Проверяет, что действие отклонено именно с этим кодом движка: код — часть
 * контракта, на него ориентируется и интерфейс, и будущий сервер.
 */
function expectEngineError(run: () => unknown, code: EngineErrorCode, messagePattern?: RegExp): void {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(EngineError);
    expect((error as EngineError).code).toBe(code);

    if (messagePattern) {
      expect((error as EngineError).message).toMatch(messagePattern);
    }

    return;
  }

  throw new Error(`Ожидалась ошибка движка с кодом ${code}, но действие прошло без ошибки.`);
}

/** Коридор с открытой дверью — единственный легальный путь между отсеками (стр. 14). */
function openCorridorFrom(state: GameState, roomId: number): { id: string; toRoomId: number } {
  const corridor = Object.values(state.ship.corridors).find(
    (candidate) =>
      candidate.doorState === 'OPEN' &&
      (candidate.fromRoomId === roomId || candidate.toRoomId === roomId) &&
      candidate.fromRoomId !== candidate.toRoomId,
  );

  if (!corridor) throw new Error(`У отсека ${roomId} нет коридоров с открытой дверью`);

  return {
    id: corridor.id,
    toRoomId: corridor.fromRoomId === roomId ? corridor.toRoomId : corridor.fromRoomId,
  };
}

describe('GameEngine: перемещение', () => {
  it('переводит персонажа в соседний отсек через открытую дверь (стр. 14)', () => {
    const engine = new GameEngine();
    const state = freshState();
    const target = openCorridorFrom(state, 11).toRoomId;

    const next = engine.processAction(state, {
      type: 'ACTION_MOVE',
      payload: { targetRoomId: target, discardCardIds: [] },
    });

    expect(next.players['player-1']?.roomId).toBe(target);
    expect(next.ship.rooms[target]?.occupantPlayerIds).toContain('player-1');
    expect(next.ship.rooms[11]?.occupantPlayerIds).not.toContain('player-1');
  });

  it('не меняет исходное состояние: движок работает на копии', () => {
    const engine = new GameEngine();
    const state = freshState();
    const snapshot = structuredClone(state);
    const target = openCorridorFrom(state, 11).toRoomId;

    engine.processAction(state, { type: 'ACTION_MOVE', payload: { targetRoomId: target, discardCardIds: [] } });

    expect(state).toEqual(snapshot);
  });

  it('вскрывает неисследованный отсек прерыванием EXPLORE_ROOM_INTERRUPT (AGENTS §3.3)', () => {
    const engine = new GameEngine();
    const state = freshState();
    const unexploredNeighbour = findAdjacentOpenRoomIds(state, 11).find(
      (roomId) => !state.ship.rooms[roomId]?.isExplored,
    );

    expect(unexploredNeighbour).toBeDefined();

    const next = engine.processAction(state, {
      type: 'ACTION_MOVE',
      payload: { targetRoomId: unexploredNeighbour!, discardCardIds: [] },
    });

    expect(next.ship.rooms[unexploredNeighbour!]?.isExplored).toBe(true);
    expect(next.interruptQueue).toEqual([]);
  });

  it('оставляет стек прерываний пустым: каскад разбирается до конца', () => {
    const engine = new GameEngine();
    const state = freshState();
    const target = openCorridorFrom(state, 11).toRoomId;

    const next = engine.processAction(state, {
      type: 'ACTION_MOVE',
      payload: { targetRoomId: target, discardCardIds: [] },
    });

    expect(next.interruptQueue).toEqual([]);
  });

  it('отклоняет переход в несоседний отсек', () => {
    const engine = new GameEngine();
    const state = freshState();
    const farRoom = Object.keys(state.ship.rooms)
      .map(Number)
      .find((roomId) => roomId !== 11 && !findAdjacentOpenRoomIds(state, 11).includes(roomId));

    expectEngineError(
      () =>
        engine.processAction(state, { type: 'ACTION_MOVE', payload: { targetRoomId: farRoom!, discardCardIds: [] } }),
      'NO_OPEN_DOOR_BETWEEN_ROOMS',
    );
  });

  it('не пускает в соседний отсек через закрытую дверь (стр. 14)', () => {
    const engine = new GameEngine();
    const state = freshState();
    const neighbour = openCorridorFrom(state, 11);

    for (const corridor of Object.values(state.ship.corridors)) {
      if (corridor.fromRoomId === 11 || corridor.toRoomId === 11) {
        corridor.doorState = 'CLOSED';
      }
    }

    expectEngineError(
      () =>
        engine.processAction(state, {
          type: 'ACTION_MOVE',
          payload: { targetRoomId: neighbour.toRoomId, discardCardIds: [] },
        }),
      'NO_OPEN_DOOR_BETWEEN_ROOMS',
      /открытой Дверью/,
    );
  });

  it('отклоняет переход в отсек, где персонаж уже стоит', () => {
    const engine = new GameEngine();

    expectEngineError(
      () =>
        engine.processAction(freshState(), { type: 'ACTION_MOVE', payload: { targetRoomId: 11, discardCardIds: [] } }),
      'MOVE_TARGET_IS_CURRENT_ROOM',
    );
  });

  it('отклоняет переход в несуществующий отсек', () => {
    const engine = new GameEngine();

    expectEngineError(
      () =>
        engine.processAction(freshState(), { type: 'ACTION_MOVE', payload: { targetRoomId: 999, discardCardIds: [] } }),
      'UNKNOWN_ROOM',
    );
  });

  it('отклоняет действие от неизвестного персонажа', () => {
    const engine = new GameEngine();

    expectEngineError(
      () =>
        engine.processAction(
          freshState(),
          { type: 'ACTION_MOVE', payload: { targetRoomId: 1, discardCardIds: [] } },
          { actorId: 'player-42' },
        ),
      'UNKNOWN_PLAYER',
    );
  });

  it('отклоняет действие погибшего персонажа', () => {
    const engine = new GameEngine();
    const state = freshState();
    const player = state.players['player-1'];

    if (player) player.isDead = true;

    expectEngineError(
      () => engine.processAction(state, { type: 'ACTION_MOVE', payload: { targetRoomId: 1, discardCardIds: [] } }),
      'PLAYER_IS_DEAD',
    );
  });
});

describe('GameEngine: объявленные, но не реализованные действия', () => {
  it.each([
    ['ACTION_SEARCH', { type: 'ACTION_SEARCH', payload: { discardCardIds: [] } }],
    [
      'ACTION_CAREFUL_MOVE',
      { type: 'ACTION_CAREFUL_MOVE', payload: { targetRoomId: 2, chosenCorridorIndex: 0, discardCardIds: [] } },
    ],
    ['ACTION_ROOM_ABILITY', { type: 'ACTION_ROOM_ABILITY', payload: { discardCardIds: [] } }],
    ['ACTION_PASS', { type: 'ACTION_PASS', payload: {} }],
    ['ACTION_CLAIM', { type: 'ACTION_CLAIM', payload: { target: 'COORDINATES', declaredStatus: 'DESTINATION_EARTH' } }],
  ])('отклоняет %s с явной ошибкой, а не молча', (_name, action) => {
    const engine = new GameEngine();

    expectEngineError(() => engine.processAction(freshState(), action as never), 'ACTION_NOT_IMPLEMENTED');
  });
});

describe('GameEngine: отладочные действия', () => {
  it('запрещены по умолчанию — в продакшн-сборке их быть не должно (аудит №22)', () => {
    const engine = new GameEngine();

    expectEngineError(
      () => engine.processAction(freshState(), { type: 'DEV_TOGGLE_NOISE', payload: { corridorId: '1-2' } }),
      'DEV_ACTION_FORBIDDEN',
    );
    expectEngineError(
      () => engine.processAction(freshState(), { type: 'DEV_TOGGLE_DOOR', payload: { corridorId: '1-2' } }),
      'DEV_ACTION_FORBIDDEN',
    );
  });

  it('переключают шум и дверь, когда явно разрешены', () => {
    const engine = new GameEngine();
    const state = freshState();
    const corridorId = Object.keys(state.ship.corridors)[0]!;

    const withNoise = engine.processAction(
      state,
      { type: 'DEV_TOGGLE_NOISE', payload: { corridorId } },
      { allowDevActions: true },
    );

    expect(withNoise.ship.corridors[corridorId]?.hasNoise).toBe(true);

    const withDoor = engine.processAction(
      state,
      { type: 'DEV_TOGGLE_DOOR', payload: { corridorId } },
      { allowDevActions: true },
    );

    expect(withDoor.ship.corridors[corridorId]?.doorState).toBe('CLOSED');
  });

  it('отклоняют неизвестный коридор', () => {
    const engine = new GameEngine();

    expectEngineError(
      () =>
        engine.processAction(
          freshState(),
          { type: 'DEV_TOGGLE_NOISE', payload: { corridorId: '42-43' } },
          { allowDevActions: true },
        ),
      'UNKNOWN_CORRIDOR',
    );
  });
});

describe('Прерывания', () => {
  it('вскрытие отсека делает тайл открытым', () => {
    const state = freshState();
    const room = state.ship.rooms[2];

    if (room) room.isExplored = false;

    resolveInterrupt(state, { type: 'EXPLORE_ROOM_INTERRUPT', playerId: 'player-1', roomId: 2 });

    expect(state.ship.rooms[2]?.isExplored).toBe(true);
  });

  it('вскрытие несуществующего отсека — ошибка контракта, а не тишина', () => {
    expectEngineError(
      () => resolveInterrupt(freshState(), { type: 'EXPLORE_ROOM_INTERRUPT', playerId: 'player-1', roomId: 999 }),
      'UNKNOWN_ROOM',
    );
  });

  it.each([
    ['NOISE_ROLL_INTERRUPT', { type: 'NOISE_ROLL_INTERRUPT', playerId: 'player-1', roomId: 11 }],
    ['ENCOUNTER_INTERRUPT', { type: 'ENCOUNTER_INTERRUPT', roomId: 11, intruderTokenId: 'blank' }],
    ['SURPRISE_ATTACK_INTERRUPT', { type: 'SURPRISE_ATTACK_INTERRUPT', playerId: 'player-1', intruderId: 'adult-1' }],
    [
      'ESCAPE_ATTACK_INTERRUPT',
      { type: 'ESCAPE_ATTACK_INTERRUPT', playerId: 'player-1', intruderIds: [], targetRoomId: 11 },
    ],
  ])('отклоняет %s до реализации этапа «Движение и шум»', (_name, interrupt) => {
    expectEngineError(() => resolveInterrupt(freshState(), interrupt as never), 'INTERRUPT_NOT_IMPLEMENTED');
  });

  it('разбирает очередь прерываний по порядку', () => {
    const state = freshState();
    const explored: boolean[] = [];

    state.interruptQueue = [
      { type: 'EXPLORE_ROOM_INTERRUPT', playerId: 'player-1', roomId: 2 },
      { type: 'EXPLORE_ROOM_INTERRUPT', playerId: 'player-1', roomId: 3 },
    ];

    for (const room of [2, 3]) {
      const target = state.ship.rooms[room];

      if (target) target.isExplored = false;
    }

    drainInterrupts(state);

    for (const room of [2, 3]) {
      explored.push(state.ship.rooms[room]?.isExplored ?? false);
    }

    expect(state.interruptQueue).toEqual([]);
    expect(explored).toEqual([true, true]);
  });
});

describe('GameEngine: неизвестное действие', () => {
  it('отклоняет действие, которого нет в контракте, вместо тихой остановки', () => {
    const state = freshState();
    const before = structuredClone(state);
    const action = { type: 'ACTION_UNKNOWN', payload: {} } as unknown as EngineAction;

    expectEngineError(() => new GameEngine().processAction(state, action), 'ACTION_NOT_IMPLEMENTED');
    expect(state).toEqual(before);
  });
});

describe('Доступные для перехода отсеки', () => {
  it('перечисляет соседей с открытой дверью и не включает сам отсек', () => {
    const state = freshState();
    const reachable = findAdjacentOpenRoomIds(state, 11);

    expect(reachable.length).toBeGreaterThan(0);
    expect(reachable).not.toContain(11);
    expect(new Set(reachable).size).toBe(reachable.length);
  });

  it('после закрытия всех дверей соседей не остаётся', () => {
    const state = freshState();

    for (const corridor of Object.values(state.ship.corridors)) {
      if (corridor.fromRoomId === 11 || corridor.toRoomId === 11) {
        corridor.doorState = 'CLOSED';
      }
    }

    expect(findAdjacentOpenRoomIds(state, 11)).toEqual([]);
  });
});
