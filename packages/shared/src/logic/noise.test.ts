import { describe, expect, it } from 'vitest';
import type { CorridorConnection, CorridorNumber, ExplorationEffect, RoomId } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import type { NoiseDieFace } from '../data/noiseDie.js';
import { NOISE_DIE_FACES } from '../data/noiseDie.js';
import { drawFromStream } from '../utils/rng.js';
import type { EngineErrorCode } from './fsm.js';
import { EngineError, GameEngine, findNoiseTarget, resolveInterrupt } from './fsm.js';
import { createInitialGameState } from './setup.js';
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

const SEED = 'engine-test';

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

  it('повторный маркер в Коридоре разрешает Контакт без мутации исходного снимка (стр. 18)', () => {
    const state = createInitialGameState(SEED);
    state.ship.rooms[6]!.isExplored = false;
    state.ship.rooms[6]!.explorationEffect = null;
    const numbered = Object.values(state.ship.corridors).find((corridor) => numbersOn(corridor, 6).includes(3))!;
    numbered.hasNoise = true;
    state.intrudersPool.bag = [{ id: 'adult-test', type: 'ADULT', escapeNumber: 4 }];
    const before = structuredClone(state);
    const next = new GameEngine().processAction(state, {
      type: 'ACTION_MOVE',
      payload: { targetRoomId: 6, discardCardIds: [state.players['player-1']!.actionDeck.hand[0]!.id] },
    });
    expect(state).toEqual(before);
    expect(next.intrudersPool.boardTokens).toHaveLength(1);
    expect(next.intrudersPool.boardTokens[0]).toMatchObject({ type: 'ADULT', roomId: 6 });
    expect(next.ship.rooms[6]!.occupantIntruderIds).toEqual([next.intrudersPool.boardTokens[0]!.id]);
    expect(next.ship.corridors[numbered.id]!.hasNoise).toBe(false);
    expect(next.meta.rngDraws.bag).toBe(before.meta.rngDraws.bag + 1);
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

  it('«Опасность» перемещает соседнего Чужого вне Боя, не разыгрывая Контакт (стр. 15)', () => {
    const state = createInitialGameState(SEED);
    prepareRoll(state, 14, 'DANGER');
    placePlayer(state, 14);
    state.ship.rooms[13]!.occupantIntruderIds.push('adult-1');
    state.intrudersPool.boardTokens.push({ id: 'adult-1', type: 'ADULT', roomId: 13, woundsCount: 2 });
    const before = state.meta.rngDraws.bag;
    resolveInterrupt(state, {
      type: 'NOISE_ROLL_INTERRUPT',
      playerId: 'player-1',
      roomId: 14,
      noise: { kind: 'ROLL' },
    });
    expect(state.intrudersPool.boardTokens[0]).toMatchObject({ roomId: 14, woundsCount: 2 });
    expect(state.ship.rooms[13]!.occupantIntruderIds).toEqual([]);
    expect(state.ship.rooms[14]!.occupantIntruderIds).toEqual(['adult-1']);
    expect(state.meta.rngDraws.bag).toBe(before);
    expect(state.interruptQueue).toEqual([]);
  });

  it('повторный маркер на Технических Коридорах ставит Контакт в начало очереди', () => {
    const state = createInitialGameState(SEED);
    prepareRoll(state, 14);
    placePlayer(state, 14);
    state.ship.technicalCorridorNoise = true;
    state.interruptQueue.push({ type: 'COMPLETE_ACTION_INTERRUPT', playerId: 'player-1' });
    resolveInterrupt(state, {
      type: 'NOISE_ROLL_INTERRUPT',
      playerId: 'player-1',
      roomId: 14,
      noise: { kind: 'ROLL' },
    });
    expect(state.interruptQueue[0]).toEqual({
      type: 'CONTACT_INTERRUPT',
      playerId: 'player-1',
      roomId: 14,
      source: 'NOISE',
    });
    expect(state.interruptQueue[1]?.type).toBe('COMPLETE_ACTION_INTERRUPT');
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
