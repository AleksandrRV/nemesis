import { describe, expect, it } from 'vitest';
import type { EngineAction } from '../types/actions.js';
import type { GameState } from '../types/state.js';
import type { EngineErrorCode } from './fsm.js';
import { EngineError, GameEngine, findAdjacentOpenRoomIds } from './fsm.js';
import { DOOR_TOKEN_SUPPLY } from './markers.js';
import { createInitialGameState } from './setup.js';
const SEED = 'engine-test';

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

const freshState = (): GameState => createInitialGameState(SEED);

describe('GameEngine: перемещение', () => {
  it('переводит персонажа в соседний отсек через открытую дверь (стр. 14)', () => {
    const engine = new GameEngine();
    const state = freshState();
    const target = openCorridorFrom(state, 11).toRoomId;
    const discardCardId = state.players['player-1']!.actionDeck.hand[0]!.id;

    const next = engine.processAction(state, {
      type: 'ACTION_MOVE',
      payload: { targetRoomId: target, discardCardIds: [discardCardId] },
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
    const discardCardId = state.players['player-1']!.actionDeck.hand[0]!.id;

    engine.processAction(state, {
      type: 'ACTION_MOVE',
      payload: { targetRoomId: target, discardCardIds: [discardCardId] },
    });

    expect(state).toEqual(snapshot);
  });

  it('вскрывает неисследованный отсек прерыванием EXPLORE_ROOM_INTERRUPT (tech_stack §4)', () => {
    const engine = new GameEngine();
    const state = freshState();
    const unexploredNeighbour = findAdjacentOpenRoomIds(state, 11).find(
      (roomId) => !state.ship.rooms[roomId]?.isExplored,
    );
    const discardCardId = state.players['player-1']!.actionDeck.hand[0]!.id;

    expect(unexploredNeighbour).toBeDefined();

    const next = engine.processAction(state, {
      type: 'ACTION_MOVE',
      payload: { targetRoomId: unexploredNeighbour!, discardCardIds: [discardCardId] },
    });

    expect(next.ship.rooms[unexploredNeighbour!]?.isExplored).toBe(true);
    expect(next.interruptQueue).toEqual([]);
  });

  it('оставляет стек прерываний пустым: каскад разбирается до конца', () => {
    const engine = new GameEngine();
    const state = freshState();
    const target = openCorridorFrom(state, 11).toRoomId;
    const discardCardId = state.players['player-1']!.actionDeck.hand[0]!.id;

    const next = engine.processAction(state, {
      type: 'ACTION_MOVE',
      payload: { targetRoomId: target, discardCardIds: [discardCardId] },
    });

    expect(next.interruptQueue).toEqual([]);
  });

  it('отклоняет переход в несоседний отсек', () => {
    const engine = new GameEngine();
    const state = freshState();
    const farRoom = Object.keys(state.ship.rooms)
      .map(Number)
      .find((roomId) => roomId !== 11 && !findAdjacentOpenRoomIds(state, 11).includes(roomId));
    const cardId = state.players['player-1']!.actionDeck.hand[0]!.id;

    expectEngineError(
      () =>
        engine.processAction(state, {
          type: 'ACTION_MOVE',
          payload: { targetRoomId: farRoom!, discardCardIds: [cardId] },
        }),
      'NO_OPEN_DOOR_BETWEEN_ROOMS',
    );
  });

  it('не пускает в соседний отсек через закрытую дверь (стр. 14)', () => {
    const engine = new GameEngine();
    const state = freshState();
    const neighbour = openCorridorFrom(state, 11);
    const cardId = state.players['player-1']!.actionDeck.hand[0]!.id;

    for (const corridor of Object.values(state.ship.corridors)) {
      if (corridor.fromRoomId === 11 || corridor.toRoomId === 11) {
        corridor.doorState = 'CLOSED';
      }
    }

    expectEngineError(
      () =>
        engine.processAction(state, {
          type: 'ACTION_MOVE',
          payload: { targetRoomId: neighbour.toRoomId, discardCardIds: [cardId] },
        }),
      'NO_OPEN_DOOR_BETWEEN_ROOMS',
      /открытой Дверью/,
    );
  });

  it('отклоняет переход в отсек, где персонаж уже стоит', () => {
    const engine = new GameEngine();
    const state = freshState();
    const cardId = state.players['player-1']!.actionDeck.hand[0]!.id;

    expectEngineError(
      () =>
        engine.processAction(state, { type: 'ACTION_MOVE', payload: { targetRoomId: 11, discardCardIds: [cardId] } }),
      'MOVE_TARGET_IS_CURRENT_ROOM',
    );
  });

  it('отклоняет переход в несуществующий отсек', () => {
    const engine = new GameEngine();
    const state = freshState();
    const cardId = state.players['player-1']!.actionDeck.hand[0]!.id;

    expectEngineError(
      () =>
        engine.processAction(state, { type: 'ACTION_MOVE', payload: { targetRoomId: 999, discardCardIds: [cardId] } }),
      'UNKNOWN_ROOM',
    );
  });

  it('отклоняет действие от неизвестного персонажа', () => {
    const engine = new GameEngine();
    const state = freshState();
    const cardId = state.players['player-1']!.actionDeck.hand[0]!.id;

    expectEngineError(
      () =>
        engine.processAction(
          state,
          { type: 'ACTION_MOVE', payload: { targetRoomId: 1, discardCardIds: [cardId] } },
          { actorId: 'player-42' },
        ),
      'UNKNOWN_PLAYER',
    );
  });

  it('отклоняет действие погибшего персонажа', () => {
    const engine = new GameEngine();
    const state = freshState();
    const player = state.players['player-1'];
    const cardId = player!.actionDeck.hand[0]!.id;

    if (player) player.isDead = true;

    expectEngineError(
      () =>
        engine.processAction(state, { type: 'ACTION_MOVE', payload: { targetRoomId: 1, discardCardIds: [cardId] } }),
      'PLAYER_IS_DEAD',
    );
  });
});

describe('GameEngine: объявленные, но не реализованные действия', () => {
  it.each([
    ['ACTION_CLAIM', { type: 'ACTION_CLAIM', payload: { target: 'COORDINATES', declaredStatus: 'DESTINATION_EARTH' } }],
  ])('отклоняет %s с явной ошибкой, а не молча', (_name, action) => {
    const engine = new GameEngine();

    expectEngineError(() => engine.processAction(freshState(), action as never), 'ACTION_NOT_IMPLEMENTED');
  });
});

describe('GameEngine: отладочные действия', () => {
  it('запрещены по умолчанию — в продакшн-сборке их быть не должно', () => {
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

  it('не могут «починить» Разрушенную Дверь: состояние терминально (стр. 17)', () => {
    const engine = new GameEngine();
    const state = freshState();
    const corridorId = Object.keys(state.ship.corridors)[0]!;

    state.ship.corridors[corridorId]!.doorState = 'DESTROYED';

    const next = engine.processAction(
      state,
      { type: 'DEV_TOGGLE_DOOR', payload: { corridorId } },
      { allowDevActions: true },
    );

    expect(next.ship.corridors[corridorId]?.doorState).toBe('DESTROYED');
  });

  it('ведут Дверь по тому же переходу, что и правила: OPEN → CLOSED → DESTROYED', () => {
    const engine = new GameEngine();
    const state = freshState();
    const corridorId = Object.keys(state.ship.corridors)[0]!;

    const closed = engine.processAction(
      state,
      { type: 'DEV_TOGGLE_DOOR', payload: { corridorId } },
      { allowDevActions: true },
    );

    expect(closed.ship.corridors[corridorId]?.doorState).toBe('CLOSED');

    const destroyed = engine.processAction(
      closed,
      { type: 'DEV_TOGGLE_DOOR', payload: { corridorId } },
      { allowDevActions: true },
    );

    expect(destroyed.ship.corridors[corridorId]?.doorState).toBe('DESTROYED');
  });

  it('берут жетон Двери из запаса и не выдумывают его, когда запаса нет (стр. 17)', () => {
    const engine = new GameEngine();
    const state = freshState();
    const corridorIds = Object.keys(state.ship.corridors);
    const corridorId = corridorIds[0]!;

    // Запас исчерпан, доноров для перестановки нет: все жетоны на поле
    // лежат в Разрушенных Дверях, а их разбирать нельзя (стр. 17).
    for (let index = 1; index <= DOOR_TOKEN_SUPPLY; index++) {
      state.ship.corridors[corridorIds[index]!]!.doorState = 'DESTROYED';
    }

    expectEngineError(
      () =>
        engine.processAction(state, { type: 'DEV_TOGGLE_DOOR', payload: { corridorId } }, { allowDevActions: true }),
      'DOOR_TOKEN_SUPPLY_EXHAUSTED',
    );
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
