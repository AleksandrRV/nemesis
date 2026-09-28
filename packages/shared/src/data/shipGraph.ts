import type { CorridorConnection, CorridorNumber, RoomId, RoomSlotCategory } from '../types/rooms.js';

export interface RoomCoordinate {
  id: RoomId;
  name: string;
  category: RoomSlotCategory;
  x: number;
  y: number;
  /**
   * Номера выходов в технический коридор (вентиляцию).
   * Помечены цифрой рядом с красным маячком/символом.
   * Пустой массив означает отсутствие технического выхода в отсеке.
   */
  techNumbers: number[];
}

/**
 * 21 отсек основного поля Nemesis: 16 неособых слотов и 5 напечатанных особых.
 * Красный маячок рядом с отсеком — Вход в Технические Коридоры.
 *
 * Происхождение данных: `doc/sources/data-sources.json#ship-graph-rooms`
 * (статус `UNVERIFIED_BOARD`): координаты и номера выходов видно только на
 * физическом поле, сверки не было. Пока сверки нет, значения — снимок, и
 * golden-тест удерживает их от молчаливой правки.
 */
export const SHIP_ROOM_NODES: RoomCoordinate[] = [
  { id: 1, name: 'Мостик', category: 'SPECIAL', x: 80, y: 485, techNumbers: [] },
  { id: 2, name: 'Слот 002', category: 'ROOM_1', x: 235, y: 206, techNumbers: [1, 2] },
  { id: 3, name: 'Слот 003', category: 'ROOM_1', x: 215, y: 485, techNumbers: [] },
  { id: 4, name: 'Слот 004', category: 'ROOM_1', x: 235, y: 765, techNumbers: [2, 3] },
  { id: 5, name: 'Слот 005', category: 'ROOM_1', x: 410, y: 110, techNumbers: [4] },
  { id: 6, name: 'Слот 006', category: 'ROOM_2', x: 425, y: 310, techNumbers: [] },
  { id: 7, name: 'Слот 007', category: 'ROOM_2', x: 335, y: 485, techNumbers: [] },
  { id: 8, name: 'Слот 008', category: 'ROOM_2', x: 425, y: 660, techNumbers: [] },
  { id: 9, name: 'Слот 009', category: 'ROOM_1', x: 410, y: 865, techNumbers: [3] },
  { id: 10, name: 'Слот 010', category: 'ROOM_1', x: 568, y: 140, techNumbers: [] },
  { id: 11, name: 'Криогенный Отсек', category: 'SPECIAL', x: 535, y: 485, techNumbers: [] },
  { id: 12, name: 'Слот 012', category: 'ROOM_1', x: 568, y: 830, techNumbers: [] },
  { id: 13, name: 'Слот 013', category: 'ROOM_1', x: 735, y: 160, techNumbers: [] },
  { id: 14, name: 'Слот 014', category: 'ROOM_2', x: 670, y: 350, techNumbers: [3] },
  { id: 15, name: 'Слот 015', category: 'ROOM_2', x: 670, y: 620, techNumbers: [4] },
  { id: 16, name: 'Слот 016', category: 'ROOM_1', x: 735, y: 810, techNumbers: [] },
  { id: 17, name: 'Слот 017', category: 'ROOM_1', x: 815, y: 350, techNumbers: [] },
  { id: 18, name: 'Слот 018', category: 'ROOM_1', x: 815, y: 620, techNumbers: [] },
  { id: 19, name: 'Машинный Отсек #03', category: 'SPECIAL', x: 910, y: 195, techNumbers: [3, 4] },
  { id: 20, name: 'Машинный Отсек #02', category: 'SPECIAL', x: 910, y: 485, techNumbers: [] },
  { id: 21, name: 'Машинный Отсек #01', category: 'SPECIAL', x: 910, y: 775, techNumbers: [2, 3] },
];

/**
 * Открытый Коридор без маркера Шума между двумя отсеками. Номера — значения
 * кубика Шума, напечатанные у выхода с каждой стороны (стр. 15).
 */
function corridor(
  fromRoomId: RoomId,
  toRoomId: RoomId,
  fromNumbers: CorridorNumber[],
  toNumbers: CorridorNumber[] = [...fromNumbers],
): CorridorConnection {
  return {
    id: `${fromRoomId}-${toRoomId}`,
    fromRoomId,
    toRoomId,
    fromNumbers,
    toNumbers,
    doorState: 'OPEN',
    hasNoise: false,
  };
}

/** Коридоры базовой стороны поля: `doc/sources/data-sources.json#ship-graph-corridors`. */
export const SHIP_CORRIDORS: CorridorConnection[] = [
  // --- Мостик (001) ---
  corridor(1, 2, [3]),
  corridor(1, 3, [1, 2]),
  corridor(1, 4, [4]),

  // --- Нос / Левое крыло ---
  corridor(2, 6, [4]),
  corridor(3, 7, [3, 4]),
  corridor(4, 8, [1]),

  // --- Центр-север ---
  corridor(5, 6, [3]),
  corridor(5, 10, [1, 2]),
  corridor(6, 7, [1]),
  corridor(6, 11, [2]),
  corridor(8, 11, [3]),
  corridor(11, 14, [4]),
  corridor(11, 15, [1]),

  // --- Центр-юг ---
  corridor(7, 8, [2]),
  corridor(8, 9, [4]),
  corridor(9, 12, [1, 2]),

  // --- Северо-восток ---
  corridor(10, 13, [3, 4]),
  corridor(13, 14, [1]),
  corridor(13, 19, [2]),
  corridor(14, 17, [2]),

  // --- Юго-восток ---
  corridor(12, 16, [3, 4]),
  corridor(15, 16, [2]),
  corridor(15, 18, [3]),
  corridor(16, 21, [1]),

  // --- Двигатели ---
  corridor(17, 19, [1]),
  corridor(17, 20, [3, 4]),
  corridor(18, 20, [1, 2]),
  corridor(18, 21, [4]),
];
