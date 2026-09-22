import { describe, expect, it } from 'vitest';
import type { RoomId } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import type { EngineErrorCode } from './fsm.js';
import { EngineError, GameEngine, drainInterrupts, findAdjacentOpenRoomIds, resolveInterrupt } from './fsm.js';
import { FIRE_MARKER_SUPPLY, MALFUNCTION_MARKER_SUPPLY } from './markers.js';
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
    expect(reloaded.meta.rngDraws.bag).toBe(state.intrudersPool.bag.length - 1);
  });
});
