import { describe, expect, it } from 'vitest';
import type { InterruptEvent } from '../types/interrupts.js';
import type { CorridorConnection, ExplorationEffect, RoomId, RoomState } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import type { EngineErrorCode } from './fsm.js';
import { EngineError, drainInterrupts, resolveInterrupt } from './fsm.js';
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

describe('Прерывания', () => {
  it('вскрытие отсека делает тайл открытым', () => {
    const state = freshState();
    const room = state.ship.rooms[2];

    if (room) room.isExplored = false;

    resolveInterrupt(state, { type: 'EXPLORE_ROOM_INTERRUPT', playerId: 'player-1', roomId: 2, corridorId: '1-2' });

    expect(state.ship.rooms[2]?.isExplored).toBe(true);
  });

  it.each([
    [
      'Контакт неизвестного игрока',
      { type: 'CONTACT_INTERRUPT', playerId: 'missing', roomId: 11, source: 'NOISE' },
      'UNKNOWN_PLAYER',
    ],
    [
      'Атака отсутствующего Чужого',
      { type: 'SURPRISE_ATTACK_INTERRUPT', playerId: 'player-1', intruderId: 'adult-1' },
      'UNKNOWN_INTRUDER',
    ],
    [
      'Побег неизвестного игрока',
      { type: 'ESCAPE_ATTACK_INTERRUPT', playerId: 'missing', intruderIds: [], targetRoomId: 11 },
      'UNKNOWN_PLAYER',
    ],
  ] as [string, InterruptEvent, EngineErrorCode][])(
    'отклоняет некорректное или ещё не реализованное прерывание: %s',
    (_name, interrupt, code) => {
      expectEngineError(() => resolveInterrupt(freshState(), interrupt), code);
    },
  );

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
