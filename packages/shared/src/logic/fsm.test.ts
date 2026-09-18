import { describe, expect, it } from 'vitest';

import type { EngineAction } from '../types/actions.js';
import type { CorridorConnection, CorridorNumber, ExplorationEffect, RoomId, RoomState } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import type { NoiseDieFace } from '../data/noiseDie.js';
import { NOISE_DIE_FACES } from '../data/noiseDie.js';
import { drawFromStream } from '../utils/rng.js';
import type { EngineErrorCode } from './fsm.js';
import {
  EngineError,
  GameEngine,
  drainInterrupts,
  findAdjacentOpenRoomIds,
  findNoiseTarget,
  resolveInterrupt,
} from './fsm.js';
import { SHIP_ROOM_NODES } from '../data/shipGraph.js';
import { DOOR_TOKEN_SUPPLY, FIRE_MARKER_SUPPLY, MALFUNCTION_MARKER_SUPPLY } from './markers.js';
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
    ['ACTION_ROOM_ABILITY', { type: 'ACTION_ROOM_ABILITY', payload: { discardCardIds: [] } }],
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

describe('Прерывания', () => {
  it('вскрытие отсека делает тайл открытым', () => {
    const state = freshState();
    const room = state.ship.rooms[2];

    if (room) room.isExplored = false;

    resolveInterrupt(state, { type: 'EXPLORE_ROOM_INTERRUPT', playerId: 'player-1', roomId: 2, corridorId: '1-2' });

    expect(state.ship.rooms[2]?.isExplored).toBe(true);
  });

  it.each([
    ['ENCOUNTER_INTERRUPT', { type: 'ENCOUNTER_INTERRUPT', roomId: 11, intruderTokenId: 'blank' }],
    ['SURPRISE_ATTACK_INTERRUPT', { type: 'SURPRISE_ATTACK_INTERRUPT', playerId: 'player-1', intruderId: 'adult-1' }],
    [
      'ESCAPE_ATTACK_INTERRUPT',
      { type: 'ESCAPE_ATTACK_INTERRUPT', playerId: 'player-1', intruderIds: [], targetRoomId: 11 },
    ],
  ])('отклоняет %s: прерывание ещё не разыгрывается движком', (_name, interrupt) => {
    expectEngineError(() => resolveInterrupt(freshState(), interrupt as never), 'INTERRUPT_NOT_IMPLEMENTED');
  });

  it('разбирает очередь прерываний по порядку', () => {
    const state = freshState();
    const explored: boolean[] = [];

    state.interruptQueue = [
      { type: 'EXPLORE_ROOM_INTERRUPT', playerId: 'player-1', roomId: 2, corridorId: '1-2' },
      { type: 'EXPLORE_ROOM_INTERRUPT', playerId: 'player-1', roomId: 3, corridorId: '1-3' },
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

describe('Вскрытие отсека: особые эффекты жетона Исследования (стр. 14–15, 17)', () => {
  /** Коридоры, ведущие в отсек: из них состоит набор номеров у выхода на тайле (стр. 15). */
  function exitsOf(state: GameState, roomId: RoomId): CorridorConnection[] {
    return Object.values(state.ship.corridors).filter(
      (corridor) => corridor.fromRoomId === roomId || corridor.toRoomId === roomId,
    );
  }

  /**
   * Готовит отсек так, как он выглядит до вскрытия. Тест задаёт эффект сам,
   * поэтому не зависит от расклада конкретного сида: расклад проверяется
   * отдельно, а здесь проверяется розыгрыш.
   */
  function prepareUnexplored(state: GameState, roomId: RoomId, effect: ExplorationEffect | null): RoomState {
    const room = state.ship.rooms[roomId];

    if (!room) throw new Error(`В партии нет отсека ${roomId}`);

    room.isExplored = false;
    room.itemsCount = 2;
    room.explorationEffect = effect;
    room.hasFire = false;
    room.hasMalfunction = false;

    return room;
  }

  function corridorsWithNoise(state: GameState): CorridorConnection[] {
    return Object.values(state.ship.corridors).filter((corridor) => corridor.hasNoise);
  }

  it('вскрытый отсек открывается, число предметов остаётся счётчиком на поле', () => {
    const state = freshState();
    const room = prepareUnexplored(state, 9, 'FIRE');

    resolveInterrupt(state, {
      type: 'EXPLORE_ROOM_INTERRUPT',
      playerId: 'player-1',
      roomId: 9,
      corridorId: exitsOf(state, 9)[0]!.id,
    });

    expect(room.isExplored).toBe(true);
    expect(room.itemsCount).toBe(2);
    expect(room.hasFire).toBe(true);
  });

  it.each([
    ['НЕИСПРАВНОСТЬ', 'MALFUNCTION'],
    ['ПОЖАР', 'FIRE'],
  ] as const)('эффект «%s» ставит маркер в отсек', (_name, effect) => {
    const state = freshState();

    prepareUnexplored(state, 9, effect);
    resolveInterrupt(state, {
      type: 'EXPLORE_ROOM_INTERRUPT',
      playerId: 'player-1',
      roomId: 9,
      corridorId: exitsOf(state, 9)[0]!.id,
    });

    expect(state.ship.rooms[9]?.[effect === 'FIRE' ? 'hasFire' : 'hasMalfunction']).toBe(true);
  });

  it('эффект «Слизь» ставит маркер Слизи персонажу и не ставит второй (стр. 17)', () => {
    const state = freshState();

    prepareUnexplored(state, 9, 'SLIME');
    resolveInterrupt(state, {
      type: 'EXPLORE_ROOM_INTERRUPT',
      playerId: 'player-1',
      roomId: 9,
      corridorId: exitsOf(state, 9)[0]!.id,
    });

    expect(state.players['player-1']?.hasSlime).toBe(true);
  });

  it('«Тишина» и «Опасность» не меняют поле при вскрытии: их разыгрывает бросок Шума (стр. 15)', () => {
    const state = freshState();

    prepareUnexplored(state, 9, 'DANGER');
    resolveInterrupt(state, {
      type: 'EXPLORE_ROOM_INTERRUPT',
      playerId: 'player-1',
      roomId: 9,
      corridorId: exitsOf(state, 9)[0]!.id,
    });

    expect(corridorsWithNoise(state)).toEqual([]);
    expect(state.ship.technicalCorridorNoise).toBe(false);
    // Эффект жетона ещё не разыгран: он нужен броску Шума и удаляется после него.
    expect(state.ship.rooms[9]?.explorationEffect).toBe('DANGER');
  });

  it('эффект «Двери» закрывает Коридор, через который персонаж вошёл (стр. 15)', () => {
    const state = freshState();
    const corridor = exitsOf(state, 9)[0]!;

    prepareUnexplored(state, 9, 'DOORS');
    corridor.doorState = 'OPEN';

    resolveInterrupt(state, {
      type: 'EXPLORE_ROOM_INTERRUPT',
      playerId: 'player-1',
      roomId: 9,
      corridorId: corridor.id,
    });

    expect(corridor.doorState).toBe('CLOSED');
  });

  it('эффект «Двери» не восстанавливает Разрушенную Дверь (стр. 17)', () => {
    const state = freshState();
    const corridor = exitsOf(state, 9)[0]!;

    prepareUnexplored(state, 9, 'DOORS');
    corridor.doorState = 'DESTROYED';

    resolveInterrupt(state, {
      type: 'EXPLORE_ROOM_INTERRUPT',
      playerId: 'player-1',
      roomId: 9,
      corridorId: corridor.id,
    });

    expect(corridor.doorState).toBe('DESTROYED');
  });

  it('эффект «Двери» с неизвестным Коридором — явная ошибка, а не тишина', () => {
    const state = freshState();

    prepareUnexplored(state, 9, 'DOORS');

    expectEngineError(
      () =>
        resolveInterrupt(state, {
          type: 'EXPLORE_ROOM_INTERRUPT',
          playerId: 'player-1',
          roomId: 9,
          corridorId: '999-998',
        }),
      'UNKNOWN_CORRIDOR',
    );
  });

  it('вскрытие несуществующего отсека — ошибка контракта, а не тишина', () => {
    expectEngineError(
      () =>
        resolveInterrupt(freshState(), {
          type: 'EXPLORE_ROOM_INTERRUPT',
          playerId: 'player-1',
          roomId: 999,
          corridorId: '1-2',
        }),
      'UNKNOWN_ROOM',
    );
  });

  it('вскрытие от имени неизвестного персонажа — ошибка контракта', () => {
    expectEngineError(
      () =>
        resolveInterrupt(freshState(), {
          type: 'EXPLORE_ROOM_INTERRUPT',
          playerId: 'player-42',
          roomId: 9,
          corridorId: '1-2',
        }),
      'UNKNOWN_PLAYER',
    );
  });
});

describe('Кубик Шума (стр. 15, 17)', () => {
  const SEED = 'engine-test';
  const OTHER_SEED = 'nemesis-beta';

  /** Состав граней — свойство компонента: 1, 1, 2, 2, 3, 3, 4, 4, Тишина, Опасность. */
  it('у кубика Шума десять граней: четыре номера по два раза, Тишина и Опасность', () => {
    expect(NOISE_DIE_FACES).toHaveLength(10);
    expect(NOISE_DIE_FACES.filter((face) => face.kind === 'CORRIDOR' && face.number === 1)).toHaveLength(2);
    expect(NOISE_DIE_FACES.filter((face) => face.kind === 'CORRIDOR' && face.number === 4)).toHaveLength(2);
    expect(NOISE_DIE_FACES.filter((face) => face.kind === 'SILENCE')).toHaveLength(1);
    expect(NOISE_DIE_FACES.filter((face) => face.kind === 'DANGER')).toHaveLength(1);
  });

  /**
   * Грань кубика в позиции потока `noise`. Тест читает тот же поток, что и движок,
   * и тем самым проверяет не «примерный» результат, а конкретную позицию:
   * лишний вызов потока сдвинул бы все последующие броски.
   */
  function faceAt(seed: string, drawIndex: number): NoiseDieFace {
    const index = Math.floor(drawFromStream(seed, 'noise', drawIndex) * NOISE_DIE_FACES.length);

    return NOISE_DIE_FACES[index]!;
  }

  /** Готовит отсек к броску: тайл вскрыт, эффект жетона задан тестом (или отсутствует). */
  function prepareRoll(state: GameState, roomId: RoomId, effect: ExplorationEffect | null = null): void {
    const room = state.ship.rooms[roomId];

    if (!room) throw new Error(`В партии нет отсека ${roomId}`);

    room.isExplored = true;
    room.explorationEffect = effect;

    for (const corridor of Object.values(state.ship.corridors)) {
      corridor.hasNoise = false;
    }

    state.ship.technicalCorridorNoise = false;
  }

  function placePlayer(state: GameState, roomId: RoomId): void {
    const player = state.players['player-1']!;

    for (const room of Object.values(state.ship.rooms)) {
      room.occupantPlayerIds = room.occupantPlayerIds.filter((id) => id !== player.id);
    }

    state.ship.rooms[roomId]!.occupantPlayerIds.push(player.id);
    player.roomId = roomId;
  }

  function corridorsWithNoise(state: GameState): CorridorConnection[] {
    return Object.values(state.ship.corridors).filter((corridor) => corridor.hasNoise);
  }

  function numbersOn(corridor: CorridorConnection, roomId: RoomId): CorridorNumber[] {
    if (corridor.fromRoomId === roomId) return corridor.fromNumbers;
    if (corridor.toRoomId === roomId) return corridor.toNumbers;

    return [];
  }

  it('перемещение в отсек завершается броском Шума из потока noise', () => {
    const engine = new GameEngine();
    const state = createInitialGameState(SEED);
    const room = state.ship.rooms[6]!;

    // Отсек 6 — сосед стартового, и у него есть выходы со всеми четырьмя номерами.
    room.isExplored = false;
    room.explorationEffect = null;

    const expectedFace = faceAt(SEED, 0);

    expect(expectedFace).toEqual({ kind: 'CORRIDOR', number: 3 });

    const discardCardId = state.players['player-1']!.actionDeck.hand[0]!.id;

    const next = engine.processAction(state, {
      type: 'ACTION_MOVE',
      payload: { targetRoomId: 6, discardCardIds: [discardCardId] },
    });

    const marked = corridorsWithNoise(next);

    expect(next.ship.rooms[6]?.isExplored).toBe(true);
    expect(next.meta.rngDraws.noise).toBe(1);
    expect(next.ship.rooms[6]?.explorationEffect).toBeNull();
    expect(marked).toHaveLength(1);
    expect(numbersOn(marked[0]!, 6)).toContain(3);
  });

  it('второй бросок продолжает поток, а не начинает его заново (Э2-4)', () => {
    const state = createInitialGameState(OTHER_SEED);

    expect(faceAt(OTHER_SEED, 0)).toEqual({ kind: 'CORRIDOR', number: 2 });
    expect(faceAt(OTHER_SEED, 1)).toEqual({ kind: 'CORRIDOR', number: 4 });

    prepareRoll(state, 6);
    placePlayer(state, 6);
    resolveInterrupt(state, { type: 'NOISE_ROLL_INTERRUPT', playerId: 'player-1', roomId: 6, noise: { kind: 'ROLL' } });

    // Второй бросок в тот же отсек: маркер встаёт в Коридор с другим номером,
    // поэтому Контакт не наступает и видно оба результата потока.
    resolveInterrupt(state, { type: 'NOISE_ROLL_INTERRUPT', playerId: 'player-1', roomId: 6, noise: { kind: 'ROLL' } });

    const marked = corridorsWithNoise(state);
    const markedNumbers = marked.map((corridor) => numbersOn(corridor, 6));

    expect(state.meta.rngDraws.noise).toBe(2);
    expect(marked).toHaveLength(2);
    expect(markedNumbers.some((numbers) => numbers.includes(2))).toBe(true);
    expect(markedNumbers.some((numbers) => numbers.includes(4))).toBe(true);
  });

  it('тот же сид — тот же бросок, другой сид — другой (воспроизводимость партии)', () => {
    function markFor(seed: string): number[] {
      const state = createInitialGameState(seed);

      prepareRoll(state, 6);
      placePlayer(state, 6);
      resolveInterrupt(state, {
        type: 'NOISE_ROLL_INTERRUPT',
        playerId: 'player-1',
        roomId: 6,
        noise: { kind: 'ROLL' },
      });

      return corridorsWithNoise(state).flatMap((corridor) => numbersOn(corridor, 6));
    }

    expect(markFor(SEED)).toEqual(markFor(SEED));
    expect(markFor(SEED)).not.toEqual(markFor(OTHER_SEED));
  });

  it('грань «Тишина» отменяет бросок: маркер не выкладывается и поток не читается', () => {
    const state = createInitialGameState(SEED);

    prepareRoll(state, 6, 'SILENCE');
    placePlayer(state, 6);
    resolveInterrupt(state, { type: 'NOISE_ROLL_INTERRUPT', playerId: 'player-1', roomId: 6, noise: { kind: 'ROLL' } });

    expect(corridorsWithNoise(state)).toEqual([]);
    expect(state.meta.rngDraws.noise).toBe(0);
    expect(state.ship.rooms[6]?.explorationEffect).toBeNull();
  });

  it('грань «Опасность» разыгрывает перемещение Чужих, а без них — маркеры (стр. 15)', () => {
    // Сид подобран так, что первым из потока `noise` выпадает «Опасность».
    const state = createInitialGameState('nemesis-alpha');

    prepareRoll(state, 14);
    placePlayer(state, 14);
    resolveInterrupt(state, {
      type: 'NOISE_ROLL_INTERRUPT',
      playerId: 'player-1',
      roomId: 14,
      noise: { kind: 'ROLL' },
    });

    const exits = Object.values(state.ship.corridors).filter(
      (corridor) => corridor.fromRoomId === 14 || corridor.toRoomId === 14,
    );

    expect(corridorsWithNoise(state)).toHaveLength(exits.length);
    expect(state.ship.technicalCorridorNoise).toBe(true);
    expect(state.meta.rngDraws.noise).toBe(1);
  });

  it('эффект «Опасность» на жетоне: бросок не делается, маркеры встают сразу (стр. 14–15)', () => {
    const state = createInitialGameState(SEED);

    prepareRoll(state, 14, 'DANGER');
    placePlayer(state, 14);
    resolveInterrupt(state, {
      type: 'NOISE_ROLL_INTERRUPT',
      playerId: 'player-1',
      roomId: 14,
      noise: { kind: 'ROLL' },
    });

    const exits = Object.values(state.ship.corridors).filter(
      (corridor) => corridor.fromRoomId === 14 || corridor.toRoomId === 14,
    );

    expect(exits.length).toBeGreaterThan(0);
    expect(corridorsWithNoise(state)).toHaveLength(exits.length);
    expect(state.meta.rngDraws.noise).toBe(0);
  });

  it('«Опасность» в отсеке с Входом ставит маркер и на Технические Коридоры (стр. 15)', () => {
    const state = createInitialGameState(SEED);

    prepareRoll(state, 14, 'DANGER');
    placePlayer(state, 14);
    resolveInterrupt(state, {
      type: 'NOISE_ROLL_INTERRUPT',
      playerId: 'player-1',
      roomId: 14,
      noise: { kind: 'ROLL' },
    });

    expect(state.ship.technicalCorridorNoise).toBe(true);
  });

  it('Слизь превращает «Тишину» в «Опасность» (стр. 17)', () => {
    const state = createInitialGameState(SEED);

    prepareRoll(state, 14, 'SILENCE');
    placePlayer(state, 14);
    state.players['player-1']!.hasSlime = true;

    resolveInterrupt(state, {
      type: 'NOISE_ROLL_INTERRUPT',
      playerId: 'player-1',
      roomId: 14,
      noise: { kind: 'ROLL' },
    });

    expect(corridorsWithNoise(state).length).toBeGreaterThan(0);
    expect(state.meta.rngDraws.noise).toBe(0);
  });

  it('персонаж в отсеке отменяет бросок («ПОМНИТЕ», стр. 15)', () => {
    const state = createInitialGameState(SEED);

    prepareRoll(state, 6);
    placePlayer(state, 6);
    state.players['player-2'] = { ...state.players['player-1']!, id: 'player-2', roomId: 6 };
    state.ship.rooms[6]!.occupantPlayerIds.push('player-2');

    resolveInterrupt(state, { type: 'NOISE_ROLL_INTERRUPT', playerId: 'player-1', roomId: 6, noise: { kind: 'ROLL' } });

    expect(corridorsWithNoise(state)).toEqual([]);
    expect(state.meta.rngDraws.noise).toBe(0);
  });

  it('Чужой в отсеке отменяет бросок («ПОМНИТЕ», стр. 15)', () => {
    const state = createInitialGameState(SEED);

    prepareRoll(state, 6);
    placePlayer(state, 6);
    state.ship.rooms[6]!.occupantIntruderIds.push('adult-1');

    resolveInterrupt(state, { type: 'NOISE_ROLL_INTERRUPT', playerId: 'player-1', roomId: 6, noise: { kind: 'ROLL' } });

    expect(corridorsWithNoise(state)).toEqual([]);
    expect(state.meta.rngDraws.noise).toBe(0);
  });

  it('номер без выхода из отсека разыгрывается как «Тишина» (решение владельца проекта до Э2-1)', () => {
    const state = createInitialGameState(SEED);

    // У отсека 7 нет выхода с номером 3, а грань сида — «3».
    expect(faceAt(SEED, 0)).toEqual({ kind: 'CORRIDOR', number: 3 });
    expect(
      Object.values(state.ship.corridors)
        .filter((corridor) => corridor.fromRoomId === 7 || corridor.toRoomId === 7)
        .flatMap((corridor) => numbersOn(corridor, 7)),
    ).not.toContain(3);

    prepareRoll(state, 7);
    placePlayer(state, 7);
    resolveInterrupt(state, { type: 'NOISE_ROLL_INTERRUPT', playerId: 'player-1', roomId: 7, noise: { kind: 'ROLL' } });

    expect(corridorsWithNoise(state)).toEqual([]);
    // Бросок состоялся — поток сдвинулся, просто результат ничего не сделал.
    expect(state.meta.rngDraws.noise).toBe(1);
  });

  it('повторный маркер в Коридоре — Контакт, и он пока не разыгрывается', () => {
    const engine = new GameEngine();
    const state = createInitialGameState(SEED);

    // Отсек 6 — сосед стартового, грань сида — «3».
    state.ship.rooms[6]!.isExplored = false;
    state.ship.rooms[6]!.explorationEffect = null;
    const numbered = Object.values(state.ship.corridors).find((corridor) => numbersOn(corridor, 6).includes(3))!;

    numbered.hasNoise = true;
    const before = structuredClone(state);
    const discardCardId = state.players['player-1']!.actionDeck.hand[0]!.id;

    expectEngineError(
      () =>
        engine.processAction(state, {
          type: 'ACTION_MOVE',
          payload: { targetRoomId: 6, discardCardIds: [discardCardId] },
        }),
      'CONTACT_NOT_IMPLEMENTED',
      /жетона Чужого/,
    );

    // Действие отклонено целиком: иммер откатывает и перемещение, и бросок.
    expect(state).toEqual(before);
  });

  it('выпавший номер Входа уводит маркер на общее поле Технических Коридоров (стр. 15)', () => {
    const state = createInitialGameState(SEED);

    // У отсека 14 есть Вход в Технические Коридоры с номером 3 — это и есть грань сида.
    prepareRoll(state, 14);
    placePlayer(state, 14);
    resolveInterrupt(state, {
      type: 'NOISE_ROLL_INTERRUPT',
      playerId: 'player-1',
      roomId: 14,
      noise: { kind: 'ROLL' },
    });

    expect(state.ship.technicalCorridorNoise).toBe(true);
    // Маркер ушёл на общее поле вентиляции, а не в Коридор отсека.
    expect(corridorsWithNoise(state)).toEqual([]);
    expect(state.meta.rngDraws.noise).toBe(1);
  });

  it('«Опасность» при Чужом в соседнем отсеке отклоняется явной ошибкой до этапа 4', () => {
    const state = createInitialGameState(SEED);

    prepareRoll(state, 14, 'DANGER');
    placePlayer(state, 14);
    // Чужих на поле ещё нет, но защита от «переместить наугад» проверяется заранее.
    state.ship.rooms[13]!.occupantIntruderIds.push('adult-1');

    expectEngineError(
      () =>
        resolveInterrupt(state, {
          type: 'NOISE_ROLL_INTERRUPT',
          playerId: 'player-1',
          roomId: 14,
          noise: { kind: 'ROLL' },
        }),
      'INTRUDER_MOVEMENT_NOT_IMPLEMENTED',
      /соседнего отсека/,
    );
  });

  it('повторный маркер на Технических Коридорах — тоже Контакт', () => {
    const state = createInitialGameState(SEED);

    // У отсека 14 есть Вход в Технические Коридоры с номером 3 — это и есть грань сида.
    prepareRoll(state, 14);
    placePlayer(state, 14);
    state.ship.technicalCorridorNoise = true;

    expectEngineError(
      () =>
        resolveInterrupt(state, {
          type: 'NOISE_ROLL_INTERRUPT',
          playerId: 'player-1',
          roomId: 14,
          noise: { kind: 'ROLL' },
        }),
      'CONTACT_NOT_IMPLEMENTED',
      /Технические Коридоры/,
    );
  });

  it('бросок для несуществующего отсека — ошибка контракта', () => {
    expectEngineError(
      () =>
        resolveInterrupt(freshState(), {
          type: 'NOISE_ROLL_INTERRUPT',
          playerId: 'player-1',
          roomId: 999,
          noise: { kind: 'ROLL' },
        }),
      'UNKNOWN_ROOM',
    );
  });

  it('бросок для неизвестного персонажа — ошибка контракта', () => {
    expectEngineError(
      () =>
        resolveInterrupt(freshState(), {
          type: 'NOISE_ROLL_INTERRUPT',
          playerId: 'player-42',
          roomId: 6,
          noise: { kind: 'ROLL' },
        }),
      'UNKNOWN_PLAYER',
    );
  });

  it('находит Коридор по номеру, Вход в Технические Коридоры и номер без выхода', () => {
    const state = createInitialGameState(SEED);

    // У отсека 9 среди выходов есть 3 — это Вход в Технические Коридоры (стр. 15).
    expect(findNoiseTarget(state, 9, 3)).toEqual({ kind: 'TECHNICAL_CORRIDOR' });
    expect(findNoiseTarget(state, 9, 4).kind).toBe('CORRIDOR');
    expect(findNoiseTarget(state, 6, 3).kind).toBe('CORRIDOR');
    // У отсека 12 такого выхода нет: до сверки данных (Э2-1) это «Тишина».
    expect(findNoiseTarget(state, 12, 2)).toEqual({ kind: 'UNMAPPED' });
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

describe('Осторожное движение: маркер вместо броска (стр. 13)', () => {
  /** Коридоры, ведущие в отсек, и точки входа в него: из них игрок и выбирает (стр. 13). */
  function corridorsInto(state: GameState, roomId: RoomId): CorridorConnection[] {
    return Object.values(state.ship.corridors).filter(
      (corridor) => corridor.doorState === 'OPEN' && (corridor.fromRoomId === roomId || corridor.toRoomId === roomId),
    );
  }

  function neighbourOfStart(state: GameState): RoomId {
    const neighbour = findAdjacentOpenRoomIds(state, 11)[0];

    if (neighbour === undefined) throw new Error('У стартового отсека нет соседей');

    return neighbour;
  }

  it('кладёт маркер Шума в выбранный Коридор и не трогает кубик', () => {
    const engine = new GameEngine();
    const state = freshState();
    const target = neighbourOfStart(state);
    const corridor = corridorsInto(state, target)[0]!;
    const discardCardIds = [
      state.players['player-1']!.actionDeck.hand[0]!.id,
      state.players['player-1']!.actionDeck.hand[1]!.id,
    ];

    const next = engine.processAction(state, {
      type: 'ACTION_CAREFUL_MOVE',
      payload: {
        targetRoomId: target,
        chosenCorridor: { kind: 'CORRIDOR', corridorId: corridor.id },
        discardCardIds,
      },
    });

    expect(next.players['player-1']?.roomId).toBe(target);
    expect(next.ship.corridors[corridor.id]?.hasNoise).toBe(true);
    // Бросок не делается: счётчик потока `noise` остаётся на месте (стр. 13).
    expect(next.meta.rngDraws.noise).toBe(state.meta.rngDraws.noise);
    expect(next.ship.technicalCorridorNoise).toBe(false);
  });

  it('разрешает положить маркер на поле Технических Коридоров, если в отсеке есть Вход (стр. 16)', () => {
    const engine = new GameEngine();
    const state = freshState();
    const target = Object.values(state.ship.rooms).find(
      (room) =>
        findAdjacentOpenRoomIds(state, 11).includes(room.id) &&
        (SHIP_ROOM_NODES.find((node) => node.id === room.id)?.techNumbers.length ?? 0) > 0,
    );

    expect(target, 'среди соседей стартового отсека нет отсека с вентиляцией').toBeDefined();
    const discardCardIds = [
      state.players['player-1']!.actionDeck.hand[0]!.id,
      state.players['player-1']!.actionDeck.hand[1]!.id,
    ];

    const next = engine.processAction(state, {
      type: 'ACTION_CAREFUL_MOVE',
      payload: { targetRoomId: target!.id, chosenCorridor: { kind: 'TECHNICAL_CORRIDOR' }, discardCardIds },
    });

    expect(next.ship.technicalCorridorNoise).toBe(true);
    expect(next.meta.rngDraws.noise).toBe(state.meta.rngDraws.noise);
  });

  it('отклоняет Коридор, который не ведёт в отсек назначения', () => {
    const engine = new GameEngine();
    const state = freshState();
    const target = neighbourOfStart(state);
    const foreignCorridor = Object.values(state.ship.corridors).find(
      (corridor) => !corridorsInto(state, target).some((candidate) => candidate.id === corridor.id),
    );

    expect(foreignCorridor).toBeDefined();
    const discardCardIds = [
      state.players['player-1']!.actionDeck.hand[0]!.id,
      state.players['player-1']!.actionDeck.hand[1]!.id,
    ];

    expectEngineError(
      () =>
        engine.processAction(state, {
          type: 'ACTION_CAREFUL_MOVE',
          payload: {
            targetRoomId: target,
            chosenCorridor: { kind: 'CORRIDOR', corridorId: foreignCorridor!.id },
            discardCardIds,
          },
        }),
      'CAREFUL_MOVE_BAD_CHOICE',
    );
  });

  it('запрещено, когда во всех ведущих Коридорах уже стоят маркеры (стр. 13)', () => {
    const engine = new GameEngine();
    const state = freshState();
    const target = neighbourOfStart(state);
    const discardCardIds = [
      state.players['player-1']!.actionDeck.hand[0]!.id,
      state.players['player-1']!.actionDeck.hand[1]!.id,
    ];

    for (const corridor of corridorsInto(state, target)) {
      corridor.hasNoise = true;
    }

    expectEngineError(
      () =>
        engine.processAction(state, {
          type: 'ACTION_CAREFUL_MOVE',
          payload: {
            targetRoomId: target,
            chosenCorridor: { kind: 'CORRIDOR', corridorId: corridorsInto(state, target)[0]!.id },
            discardCardIds,
          },
        }),
      'CAREFUL_MOVE_NO_FREE_CORRIDOR',
    );
  });

  it('запрещено в Бою: в отсеке персонажа стоит Чужой (стр. 13)', () => {
    const engine = new GameEngine();
    const state = freshState();
    const target = neighbourOfStart(state);
    const discardCardIds = [
      state.players['player-1']!.actionDeck.hand[0]!.id,
      state.players['player-1']!.actionDeck.hand[1]!.id,
    ];

    state.ship.rooms[11]!.occupantIntruderIds = ['intruder-1'];

    expectEngineError(
      () =>
        engine.processAction(state, {
          type: 'ACTION_CAREFUL_MOVE',
          payload: {
            targetRoomId: target,
            chosenCorridor: { kind: 'CORRIDOR', corridorId: corridorsInto(state, target)[0]!.id },
            discardCardIds,
          },
        }),
      'CAREFUL_MOVE_IN_COMBAT',
    );
  });
});

describe('Запасы маркеров заканчивают партию по правилам (стр. 17)', () => {
  /** Кладёт все маркеры коробки, выбирая отсеки, куда маркер класть разрешено. */
  function exhaustSupply(state: GameState, kind: 'FIRE' | 'MALFUNCTION', supply: number): void {
    const rooms = Object.values(state.ship.rooms).filter(
      (room) =>
        room.definitionId !== 'NEST' && room.definitionId !== 'SLIME_ROOM' && !room.hasFire && !room.hasMalfunction,
    );

    for (let index = 0; index < supply; index++) {
      const room = rooms[index];

      if (!room) throw new Error('В партии не хватает отсеков для исчерпания запаса');

      if (kind === 'FIRE') room.hasFire = true;
      else room.hasMalfunction = true;
    }
  }

  it('взрыв корабля: эффект «ПОЖАР» при пустом запасе переводит партию в GAME_OVER', () => {
    const state = freshState();

    exhaustSupply(state, 'FIRE', FIRE_MARKER_SUPPLY);

    const room = state.ship.rooms[9]!;

    room.isExplored = false;
    room.explorationEffect = 'FIRE';
    room.hasFire = false;

    resolveInterrupt(state, { type: 'EXPLORE_ROOM_INTERRUPT', playerId: 'player-1', roomId: 9, corridorId: '4-9' });

    expect(state.meta.phase).toBe('GAME_OVER');
    expect(state.meta.gameOverReason).toBe('SHIP_EXPLODED');
    expect(room.hasFire).toBe(false);
    expect(state.interruptQueue).toEqual([]);
  });

  it('разрыв обшивки: эффект «НЕИСПРАВНОСТЬ» при пустом запасе тоже закрывает партию', () => {
    const state = freshState();

    exhaustSupply(state, 'MALFUNCTION', MALFUNCTION_MARKER_SUPPLY);

    const room = state.ship.rooms[9]!;

    room.isExplored = false;
    room.explorationEffect = 'MALFUNCTION';
    room.hasMalfunction = false;
    state.interruptQueue = [
      { type: 'EXPLORE_ROOM_INTERRUPT', playerId: 'player-1', roomId: 9, corridorId: '4-9' },
      { type: 'NOISE_ROLL_INTERRUPT', playerId: 'player-1', roomId: 9, noise: { kind: 'ROLL' } },
    ];

    drainInterrupts(state);

    expect(state.meta.phase).toBe('GAME_OVER');
    expect(state.meta.gameOverReason).toBe('HULL_BREACH');
    // Шаги после конца партии не разыгрываются: очередь очищена.
    expect(state.interruptQueue).toEqual([]);
  });

  it('оконченная партия не принимает действий: явная ошибка вместо продолжения', () => {
    const engine = new GameEngine();
    const state = freshState();
    const cardId = state.players['player-1']!.actionDeck.hand[0]!.id;

    state.meta.phase = 'GAME_OVER';
    state.meta.gameOverReason = 'SHIP_EXPLODED';

    expectEngineError(
      () =>
        engine.processAction(state, {
          type: 'ACTION_MOVE',
          payload: { targetRoomId: findAdjacentOpenRoomIds(state, 11)[0]!, discardCardIds: [cardId] },
        }),
      'GAME_IS_OVER',
    );
  });
});

describe('Сохранение и восстановление не сдвигает случайность (Э2-4)', () => {
  /**
   * Отсек без особого эффекта: бросок Шума гарантированно делается, поэтому
   * тест проверяет поток случайности, а не расклад конкретного сида.
   */
  function preparePlainRoom(state: GameState, roomId: RoomId): void {
    const room = state.ship.rooms[roomId];

    if (!room) throw new Error(`В партии нет отсека ${roomId}`);

    room.isExplored = true;
    room.explorationEffect = null;
    room.occupantIntruderIds = [];
  }

  it('после round-trip через JSON бросок Шума продолжает поток, а не начинает его заново', () => {
    const engine = new GameEngine();
    const state = freshState();
    const target = findAdjacentOpenRoomIds(state, 11)[0]!;
    const discardCardId = state.players['player-1']!.actionDeck.hand[0]!.id;

    preparePlainRoom(state, target);

    const afterDirect = engine.processAction(state, {
      type: 'ACTION_MOVE',
      payload: { targetRoomId: target, discardCardIds: [discardCardId] },
    });

    const reloaded = JSON.parse(JSON.stringify(state)) as GameState;
    const afterReload = engine.processAction(reloaded, {
      type: 'ACTION_MOVE',
      payload: { targetRoomId: target, discardCardIds: [discardCardId] },
    });

    expect(afterReload).toEqual(afterDirect);
    expect(afterReload.meta.rngDraws.noise).toBe(state.meta.rngDraws.noise + 1);
  });

  it('второй бросок после перезагрузки берёт следующее значение потока, а не первое', () => {
    const engine = new GameEngine();
    const state = freshState();
    const target = findAdjacentOpenRoomIds(state, 11)[0]!;
    const discard1 = state.players['player-1']!.actionDeck.hand[0]!.id;

    preparePlainRoom(state, target);

    const once = engine.processAction(state, {
      type: 'ACTION_MOVE',
      payload: { targetRoomId: target, discardCardIds: [discard1] },
    });

    const discard2 = once.players['player-1']!.actionDeck.hand[0]!.id;

    const twice = engine.processAction(JSON.parse(JSON.stringify(once)) as GameState, {
      type: 'ACTION_MOVE',
      payload: { targetRoomId: 11, discardCardIds: [discard2] },
    });

    expect(once.meta.rngDraws.noise).toBe(1);
    expect(twice.meta.rngDraws.noise).toBe(2);
    expect(twice.meta.rngDraws).toEqual({ ...state.meta.rngDraws, noise: 2 });
  });

  it('счётчик вытягивания из мешка готов к работе: мешок тасуется при подготовке и в состоянии сохраняется целиком', () => {
    const state = freshState();
    const reloaded = JSON.parse(JSON.stringify(state)) as GameState;

    expect(reloaded.intrudersPool.bag).toEqual(state.intrudersPool.bag);
    expect(reloaded.intrudersPool.supply).toEqual(state.intrudersPool.supply);
    expect(reloaded.meta.rngDraws.bag).toBe(0);
  });
});
