import { describe, expect, it } from 'vitest';

import type { GameState } from '../types/state.js';
import {
  DOOR_TOKEN_SUPPLY,
  FIRE_MARKER_SUPPLY,
  MALFUNCTION_MARKER_SUPPLY,
  NOISE_MARKER_SUPPLY,
  countFireMarkers,
  countMalfunctionMarkers,
  countPlacedNoiseMarkers,
  doorTokensInSupply,
  doorTokensOnBoard,
  fireMarkersInSupply,
  malfunctionMarkersInSupply,
  noiseMarkersInSupply,
  placeDoorToken,
  placeFireMarker,
  placeMalfunctionMarker,
} from './markers.js';
import { createInitialGameState } from './setup.js';

/**
 * Запасы маркеров и жетонов Дверей (стр. 3, 17).
 *
 * Проверяется каждое правило по отдельности: лимит на Коридор и отсек, пустой
 * запас, который заканчивает партию, и перестановка жетона Двери с поля.
 * Физический смысл этих чисел — из коробки; книга правил печатает и сами
 * числа, и последствия их исчерпания.
 */

const SEED = 'markers-test';

const freshState = (): GameState => createInitialGameState(SEED);

/** Отсеки, куда маркер класть можно: без маркера и не запрещённые для Неисправности (стр. 17). */
function freeRooms(state: GameState): number[] {
  return Object.values(state.ship.rooms)
    .filter(
      (room) =>
        !room.hasFire && !room.hasMalfunction && room.definitionId !== 'NEST' && room.definitionId !== 'SLIME_ROOM',
    )
    .map((room) => room.id);
}

/** Первый Коридор корабля: используется там, где важен сам факт Двери, а не её место. */
function anyCorridorId(state: GameState): string {
  const corridorId = Object.keys(state.ship.corridors)[0];

  if (!corridorId) throw new Error('В партии нет Коридоров');

  return corridorId;
}

describe('Запасы маркеров: выводятся из поля (стр. 3, 17)', () => {
  it('в начале партии запас полон, а на поле нет ни маркеров, ни жетонов Дверей', () => {
    const state = freshState();

    expect(countPlacedNoiseMarkers(state.ship)).toBe(0);
    expect(noiseMarkersInSupply(state.ship)).toBe(NOISE_MARKER_SUPPLY);
    expect(countFireMarkers(state.ship)).toBe(0);
    expect(fireMarkersInSupply(state.ship)).toBe(FIRE_MARKER_SUPPLY);
    expect(countMalfunctionMarkers(state.ship)).toBe(0);
    expect(malfunctionMarkersInSupply(state.ship)).toBe(MALFUNCTION_MARKER_SUPPLY);
    expect(doorTokensOnBoard(state.ship)).toBe(0);
    expect(doorTokensInSupply(state.ship)).toBe(DOOR_TOKEN_SUPPLY);
  });

  it('считает маркер на поле Технических Коридоров наравне с маркерами в Коридорах (стр. 15–16)', () => {
    const state = freshState();

    state.ship.technicalCorridorNoise = true;

    expect(countPlacedNoiseMarkers(state.ship)).toBe(1);
    expect(noiseMarkersInSupply(state.ship)).toBe(NOISE_MARKER_SUPPLY - 1);

    const corridorId = anyCorridorId(state);

    state.ship.corridors[corridorId]!.hasNoise = true;

    expect(countPlacedNoiseMarkers(state.ship)).toBe(2);
  });

  it('считает Разрушенную Дверь занятым жетоном: он всё ещё лежит на поле (стр. 17)', () => {
    const state = freshState();
    const corridorId = anyCorridorId(state);

    state.ship.corridors[corridorId]!.doorState = 'DESTROYED';

    expect(doorTokensOnBoard(state.ship)).toBe(1);
    expect(doorTokensInSupply(state.ship)).toBe(DOOR_TOKEN_SUPPLY - 1);
  });
});

describe('Маркер Пожара (стр. 17)', () => {
  it('кладётся в отсек и не кладётся вторым', () => {
    const state = freshState();

    expect(placeFireMarker(state, 11)).toBe('PLACED');
    expect(state.ship.rooms[11]?.hasFire).toBe(true);
    expect(placeFireMarker(state, 11)).toBe('ALREADY_PRESENT');
    expect(countFireMarkers(state.ship)).toBe(1);
  });

  it('несуществующий отсек — явный результат, а не выдуманный маркер', () => {
    const state = freshState();

    expect(placeFireMarker(state, 999)).toBe('UNKNOWN_ROOM');
    expect(countFireMarkers(state.ship)).toBe(0);
  });

  it('когда запас исчерпан, следующий Пожар взрывает корабль (стр. 17)', () => {
    const state = freshState();
    const rooms = freeRooms(state);

    expect(rooms.length).toBeGreaterThan(FIRE_MARKER_SUPPLY);

    // Все 8 маркеров коробки уже лежат на корабле.
    for (let index = 0; index < FIRE_MARKER_SUPPLY; index++) {
      expect(placeFireMarker(state, rooms[index]!)).toBe('PLACED');
    }

    expect(countFireMarkers(state.ship)).toBe(FIRE_MARKER_SUPPLY);
    expect(fireMarkersInSupply(state.ship)).toBe(0);

    const roomWithoutFire = rooms[FIRE_MARKER_SUPPLY]!;

    expect(placeFireMarker(state, roomWithoutFire)).toBe('SHIP_EXPLODED');
    expect(state.ship.rooms[roomWithoutFire]?.hasFire).toBe(false);
  });

  it('в отсек с уже стоящим Пожаром второй маркер не кладётся — и не взрывает корабль (стр. 17)', () => {
    const state = freshState();
    const rooms = freeRooms(state);
    const roomId = rooms[0]!;

    // На поле уже 8 маркеров, и один из них — в проверяемом отсеке.
    for (const otherRoomId of rooms.slice(1, FIRE_MARKER_SUPPLY)) {
      state.ship.rooms[otherRoomId]!.hasFire = true;
    }

    state.ship.rooms[roomId]!.hasFire = true;

    expect(countFireMarkers(state.ship)).toBe(FIRE_MARKER_SUPPLY);
    expect(fireMarkersInSupply(state.ship)).toBe(0);
    expect(placeFireMarker(state, roomId)).toBe('ALREADY_PRESENT');
    expect(fireMarkersInSupply(state.ship)).toBe(0);
  });
});

describe('Маркер Неисправности (стр. 17)', () => {
  it('кладётся в отсек и запрещён в Улье и Комнате со Слизью', () => {
    const state = freshState();

    expect(placeMalfunctionMarker(state, 11)).toBe('PLACED');
    expect(state.ship.rooms[11]?.hasMalfunction).toBe(true);
    expect(placeMalfunctionMarker(state, 11)).toBe('ALREADY_PRESENT');

    state.ship.rooms[11]!.definitionId = 'NEST';

    expect(placeMalfunctionMarker(state, 11)).toBe('ALREADY_PRESENT');

    state.ship.rooms[11]!.hasMalfunction = false;

    expect(placeMalfunctionMarker(state, 11)).toBe('FORBIDDEN_ROOM');

    state.ship.rooms[11]!.definitionId = 'SLIME_ROOM';

    expect(placeMalfunctionMarker(state, 11)).toBe('FORBIDDEN_ROOM');
  });

  it('когда запас исчерпан, следующая Неисправность разрывает обшивку (стр. 17)', () => {
    const state = freshState();
    const rooms = freeRooms(state);

    for (let index = 0; index < MALFUNCTION_MARKER_SUPPLY; index++) {
      expect(placeMalfunctionMarker(state, rooms[index]!)).toBe('PLACED');
    }

    expect(countMalfunctionMarkers(state.ship)).toBe(MALFUNCTION_MARKER_SUPPLY);
    expect(malfunctionMarkersInSupply(state.ship)).toBe(0);

    const roomWithoutMalfunction = rooms[MALFUNCTION_MARKER_SUPPLY]!;

    expect(placeMalfunctionMarker(state, roomWithoutMalfunction)).toBe('HULL_BREACH');
    expect(state.ship.rooms[roomWithoutMalfunction]?.hasMalfunction).toBe(false);
  });
});

describe('Жетон Двери (стр. 17)', () => {
  it('закрывает Открытую Дверь жетоном из запаса', () => {
    const state = freshState();
    const corridorId = anyCorridorId(state);

    expect(placeDoorToken(state, corridorId)).toBe('PLACED');
    expect(state.ship.corridors[corridorId]?.doorState).toBe('CLOSED');
    expect(doorTokensInSupply(state.ship)).toBe(DOOR_TOKEN_SUPPLY - 1);
  });

  it('не закрывает уже Закрытую Дверь и никогда не возвращает Разрушенную', () => {
    const state = freshState();
    const corridorId = anyCorridorId(state);

    state.ship.corridors[corridorId]!.doorState = 'CLOSED';

    expect(placeDoorToken(state, corridorId)).toBe('ALREADY_CLOSED');

    state.ship.corridors[corridorId]!.doorState = 'DESTROYED';

    expect(placeDoorToken(state, corridorId)).toBe('DESTROYED');
    expect(state.ship.corridors[corridorId]?.doorState).toBe('DESTROYED');
  });

  it('несуществующий Коридор — явный результат, а не новая Дверь', () => {
    const state = freshState();

    expect(placeDoorToken(state, '4-999')).toBe('UNKNOWN_CORRIDOR');
  });

  it('при пустом запасе переставляет жетон с поля: Коридор-донор снова открыт (стр. 17)', () => {
    const state = freshState();
    const corridorIds = Object.keys(state.ship.corridors);
    const donorId = corridorIds[0]!;

    // Запас кончился: все 12 жетонов уже стоят на поле.
    for (let index = 0; index < DOOR_TOKEN_SUPPLY; index++) {
      state.ship.corridors[corridorIds[index]!]!.doorState = 'CLOSED';
    }

    const targetId = corridorIds[DOOR_TOKEN_SUPPLY]!;

    expect(doorTokensInSupply(state.ship)).toBe(0);
    expect(placeDoorToken(state, targetId)).toBe('MOVED_FROM_BOARD');
    expect(state.ship.corridors[targetId]?.doorState).toBe('CLOSED');
    expect(state.ship.corridors[donorId]?.doorState).toBe('OPEN');
    expect(doorTokensOnBoard(state.ship)).toBe(DOOR_TOKEN_SUPPLY);
  });

  it('не разбирает Разрушенные Двери ради перестановки: без Закрытых доноров — явный отказ (стр. 17)', () => {
    const state = freshState();
    const corridorIds = Object.keys(state.ship.corridors);

    for (let index = 0; index < DOOR_TOKEN_SUPPLY; index++) {
      state.ship.corridors[corridorIds[index]!]!.doorState = 'DESTROYED';
    }

    const targetId = corridorIds[DOOR_TOKEN_SUPPLY]!;

    expect(placeDoorToken(state, targetId)).toBe('NO_TOKEN_IN_SUPPLY');
    expect(state.ship.corridors[targetId]?.doorState).toBe('OPEN');
  });
});
