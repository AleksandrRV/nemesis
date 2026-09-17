import { describe, expect, it } from 'vitest';

import type { RoomId, RoomSlotCategory } from '../types/rooms.js';
import { SHIP_CORRIDORS, SHIP_ROOM_NODES } from './shipGraph.js';

/** Номера выходов, нанесённые на коридоры игрового поля (книга правил, стр. 15). */
const DOOR_NUMBERS = [1, 2, 3, 4];

/** Особые отсеки напечатаны на поле и всегда открыты (GDD §2.1). */
const SPECIAL_ROOM_IDS = [1, 11, 19, 20, 21];

const nodesById = new Map<RoomId, (typeof SHIP_ROOM_NODES)[number]>(SHIP_ROOM_NODES.map((node) => [node.id, node]));

function neighborsOf(roomId: RoomId): RoomId[] {
  return SHIP_CORRIDORS.filter((corridor) => corridor.fromRoomId === roomId || corridor.toRoomId === roomId).map(
    (corridor) => (corridor.fromRoomId === roomId ? corridor.toRoomId : corridor.fromRoomId),
  );
}

/** Обход графа в ширину: множество отсеков, достижимых от стартового. */
function collectReachable(startRoomId: RoomId): Set<RoomId> {
  const visited = new Set<RoomId>([startRoomId]);
  const queue: RoomId[] = [startRoomId];

  while (queue.length > 0) {
    const current = queue.shift() as RoomId;

    for (const neighbor of neighborsOf(current)) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return visited;
}

function countByCategory(category: RoomSlotCategory): number {
  return SHIP_ROOM_NODES.filter((node) => node.category === category).length;
}

describe('Схема корабля: состав поля', () => {
  it('содержит 21 отсек: 5 особых, 11 основных «1» и 5 дополнительных «2»', () => {
    expect(SHIP_ROOM_NODES).toHaveLength(21);
    expect(countByCategory('SPECIAL')).toBe(5);
    expect(countByCategory('ROOM_1')).toBe(11);
    expect(countByCategory('ROOM_2')).toBe(5);
  });

  it('нумерует отсеки числами 1..21 без дублей и пропусков', () => {
    const ids = SHIP_ROOM_NODES.map((node) => node.id).sort((a, b) => a - b);

    expect(ids).toEqual(Array.from({ length: 21 }, (_, index) => index + 1));
  });

  it('закрепляет особые отсеки за своими номерами и печатает их на поле', () => {
    expect(nodesById.get(1)?.name).toBe('Мостик');
    expect(nodesById.get(11)?.name).toBe('Криогенный Отсек');
    expect(nodesById.get(19)?.name).toBe('Машинный Отсек #03');
    expect(nodesById.get(20)?.name).toBe('Машинный Отсек #02');
    expect(nodesById.get(21)?.name).toBe('Машинный Отсек #01');

    for (const roomId of SPECIAL_ROOM_IDS) {
      expect(nodesById.get(roomId)?.category).toBe('SPECIAL');
    }
  });

  it('даёт каждому отсеку непустое имя и координаты на схеме', () => {
    for (const node of SHIP_ROOM_NODES) {
      expect(node.name.length).toBeGreaterThan(0);
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
    }
  });

  it('не дублирует координаты: иначе SVG-карта наложит отсеки друг на друга', () => {
    const positions = SHIP_ROOM_NODES.map((node) => `${node.x}:${node.y}`);

    expect(new Set(positions).size).toBe(positions.length);
  });
});

describe('Схема корабля: коридоры', () => {
  it('соединяет только существующие отсеки и не делает петель', () => {
    for (const corridor of SHIP_CORRIDORS) {
      expect(nodesById.has(corridor.fromRoomId)).toBe(true);
      expect(nodesById.has(corridor.toRoomId)).toBe(true);
      expect(corridor.fromRoomId).not.toBe(corridor.toRoomId);
    }
  });

  it('не содержит двух коридоров между одной парой отсеков', () => {
    const pairs = SHIP_CORRIDORS.map((corridor) =>
      [corridor.fromRoomId, corridor.toRoomId].sort((a, b) => a - b).join('-'),
    );

    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it('присваивает коридорам уникальные идентификаторы вида «отсек-отсек»', () => {
    const ids = SHIP_CORRIDORS.map((corridor) => corridor.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const corridor of SHIP_CORRIDORS) {
      expect(corridor.id).toBe(`${corridor.fromRoomId}-${corridor.toRoomId}`);
    }
  });

  it('нумерует выходы целыми числами 1..4 без повторов внутри стороны', () => {
    for (const corridor of SHIP_CORRIDORS) {
      expect(corridor.fromNumbers.length).toBeGreaterThan(0);
      expect(corridor.toNumbers.length).toBeGreaterThan(0);
      expect(new Set(corridor.fromNumbers).size).toBe(corridor.fromNumbers.length);
      expect(new Set(corridor.toNumbers).size).toBe(corridor.toNumbers.length);

      for (const number of [...corridor.fromNumbers, ...corridor.toNumbers]) {
        expect(DOOR_NUMBERS).toContain(number);
      }
    }
  });

  it('сохраняет одинаковое число выходов с обеих сторон коридора', () => {
    for (const corridor of SHIP_CORRIDORS) {
      expect(corridor.toNumbers).toHaveLength(corridor.fromNumbers.length);
    }
  });

  it('не оставляет изолированных отсеков: из Мостика достижим каждый из 21', () => {
    expect(collectReachable(1).size).toBe(SHIP_ROOM_NODES.length);
  });

  it('даёт каждому отсеку как минимум два выхода', () => {
    for (const node of SHIP_ROOM_NODES) {
      expect(neighborsOf(node.id).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('начинает партию с открытыми дверями и без маркеров шума', () => {
    expect(SHIP_CORRIDORS.every((corridor) => corridor.doorState === 'OPEN')).toBe(true);
    expect(SHIP_CORRIDORS.every((corridor) => !corridor.hasNoise)).toBe(true);
  });
});

describe('Схема корабля: технические коридоры', () => {
  it('нумерует входы в вентиляцию числами 1..4 без повторов', () => {
    for (const node of SHIP_ROOM_NODES) {
      expect(new Set(node.techNumbers).size).toBe(node.techNumbers.length);

      for (const number of node.techNumbers) {
        expect(DOOR_NUMBERS).toContain(number);
      }
    }
  });

  it('закрепляет входы в вентиляцию по отсекам (регрессионный слепок схемы поля)', () => {
    // Слепок защищает от случайной правки координат. Сами номера входов
    // сняты со схемы поля и требуют сверки с физическим полем (пакет источника,
    // статус UNVERIFIED_BOARD).
    const expectedVentEntrances: Record<number, number[]> = {
      2: [1, 2],
      4: [2, 3],
      5: [4],
      9: [3],
      14: [3],
      15: [4],
      19: [3, 4],
      21: [2, 3],
    };

    const actual: Record<number, number[]> = {};
    for (const node of SHIP_ROOM_NODES) {
      if (node.techNumbers.length > 0) {
        actual[node.id] = node.techNumbers;
      }
    }

    expect(actual).toEqual(expectedVentEntrances);
  });
});

describe('Схема корабля: номера выходов и бросок Шума (стр. 15; пакет источника, UNVERIFIED_BOARD)', () => {
  /** Номера, нанесённые у выходов отсека: только по ним встаёт маркер Шума. */
  function exitNumbers(roomId: RoomId): number[] {
    return SHIP_CORRIDORS.flatMap((corridor) => [
      ...(corridor.fromRoomId === roomId ? corridor.fromNumbers : []),
      ...(corridor.toRoomId === roomId ? corridor.toNumbers : []),
    ]);
  }

  it('не выдумывает выходов: каждый номер отсека есть на схеме поля', () => {
    for (const node of SHIP_ROOM_NODES) {
      for (const number of exitNumbers(node.id)) {
        expect(DOOR_NUMBERS).toContain(number);
      }
    }
  });

  it('фиксирует отсеки, чьи выходы ещё не сверены с полем (долг, статус UNVERIFIED_BOARD)', () => {
    // Это не «правильные данные», а список долга: у части отсеков номера
    // выходов не покрывают 1..4 или повторяются — снимок удерживает расхождения
    // от молчаливой правки. Сверка требует фото физического поля: в
    // `doc/sources/data-sources.json#ship-graph-corridors` у таблицы стоит статус
    // `UNVERIFIED_BOARD` и список `unverified` с этим же перечнем.
    // До сверки бросок Шума на отсутствующий номер разыгрывается как «Тишина»
    // по решению владельца проекта (см. `resolveNoiseRoll` в logic/fsm.ts).
    const deviations = SHIP_ROOM_NODES.flatMap((node) => {
      const numbers = exitNumbers(node.id);
      const all = [...numbers, ...node.techNumbers];
      const missing = DOOR_NUMBERS.filter((number) => !all.includes(number));
      const duplicated = DOOR_NUMBERS.filter((number) => numbers.filter((value) => value === number).length > 1);

      return missing.length > 0 || duplicated.length > 0 ? [{ room: node.id, missing, duplicated }] : [];
    });

    expect(deviations).toEqual([
      { room: 6, missing: [], duplicated: [1, 2] },
      { room: 7, missing: [3], duplicated: [] },
      { room: 9, missing: [1, 2], duplicated: [4] },
      { room: 10, missing: [1, 2], duplicated: [3] },
      { room: 12, missing: [2], duplicated: [] },
    ]);
  });
});
