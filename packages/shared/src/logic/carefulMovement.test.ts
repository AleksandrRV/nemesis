import { describe, expect, it } from 'vitest';
import type { CorridorConnection, RoomId } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import type { EngineErrorCode } from './fsm.js';
import { EngineError, GameEngine, findAdjacentOpenRoomIds } from './fsm.js';
import { SHIP_ROOM_NODES } from '../data/shipGraph.js';
import { createInitialGameState } from './setup.js';
const SEED = 'engine-test';

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
