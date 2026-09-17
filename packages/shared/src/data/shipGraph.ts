import type { CorridorConnection, RoomId, RoomSlotCategory } from '../types/rooms.js';

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
 * Переходы между отсеками корабля.
 *
 * Номера в `fromNumbers` / `toNumbers` — те, что напечатаны у выхода с каждой
 * стороны, то есть значения броска кубика Шума (1–4), по которым маркер уходит
 * в этот Коридор (стр. 15).
 *
 * Происхождение данных: `doc/sources/data-sources.json#ship-graph-corridors`
 * (статус `UNVERIFIED_BOARD`). Известное расхождение модели с полем: парные
 * Коридоры — два независимых Коридора между одной парой отсеков — здесь
 * описаны одной записью, поэтому маркер Шума и Дверь у такой пары общие.
 * Расхождение зафиксировано снимком в `shipGraph.test.ts` и ждёт сверки
 * с физическим полем; выдумывать топологию вместо сверки нельзя (AGENTS §1.3).
 */
export const SHIP_CORRIDORS: CorridorConnection[] = [
  // --- Мостик (001) ---
  { id: '1-2', fromRoomId: 1, toRoomId: 2, fromNumbers: [3], toNumbers: [3], doorState: 'OPEN', hasNoise: false },
  { id: '1-3', fromRoomId: 1, toRoomId: 3, fromNumbers: [1, 2], toNumbers: [1, 2], doorState: 'OPEN', hasNoise: false },
  { id: '1-4', fromRoomId: 1, toRoomId: 4, fromNumbers: [4], toNumbers: [4], doorState: 'OPEN', hasNoise: false },

  // --- Нос / Левое крыло ---
  { id: '2-6', fromRoomId: 2, toRoomId: 6, fromNumbers: [4], toNumbers: [4], doorState: 'OPEN', hasNoise: false },
  { id: '3-6', fromRoomId: 3, toRoomId: 6, fromNumbers: [3], toNumbers: [3], doorState: 'OPEN', hasNoise: false },
  { id: '3-7', fromRoomId: 3, toRoomId: 7, fromNumbers: [4], toNumbers: [4], doorState: 'OPEN', hasNoise: false },
  { id: '4-8', fromRoomId: 4, toRoomId: 8, fromNumbers: [1], toNumbers: [1], doorState: 'OPEN', hasNoise: false },

  // --- Центр-север ---
  { id: '5-6', fromRoomId: 5, toRoomId: 6, fromNumbers: [1, 2], toNumbers: [1, 2], doorState: 'OPEN', hasNoise: false },
  { id: '5-10', fromRoomId: 5, toRoomId: 10, fromNumbers: [3], toNumbers: [3], doorState: 'OPEN', hasNoise: false },
  { id: '6-7', fromRoomId: 6, toRoomId: 7, fromNumbers: [1], toNumbers: [1], doorState: 'OPEN', hasNoise: false },
  { id: '6-11', fromRoomId: 6, toRoomId: 11, fromNumbers: [2], toNumbers: [2], doorState: 'OPEN', hasNoise: false },
  { id: '8-11', fromRoomId: 8, toRoomId: 11, fromNumbers: [3], toNumbers: [3], doorState: 'OPEN', hasNoise: false },
  { id: '11-14', fromRoomId: 11, toRoomId: 14, fromNumbers: [4], toNumbers: [4], doorState: 'OPEN', hasNoise: false },
  { id: '11-15', fromRoomId: 11, toRoomId: 15, fromNumbers: [1], toNumbers: [1], doorState: 'OPEN', hasNoise: false },

  // --- Центр-юг ---
  { id: '7-8', fromRoomId: 7, toRoomId: 8, fromNumbers: [2], toNumbers: [2], doorState: 'OPEN', hasNoise: false },
  { id: '8-9', fromRoomId: 8, toRoomId: 9, fromNumbers: [4], toNumbers: [4], doorState: 'OPEN', hasNoise: false },
  { id: '9-12', fromRoomId: 9, toRoomId: 12, fromNumbers: [4], toNumbers: [1], doorState: 'OPEN', hasNoise: false },

  // --- Северо-восток ---
  {
    id: '10-13',
    fromRoomId: 10,
    toRoomId: 13,
    fromNumbers: [3, 4],
    toNumbers: [3, 4],
    doorState: 'OPEN',
    hasNoise: false,
  },
  { id: '13-14', fromRoomId: 13, toRoomId: 14, fromNumbers: [1], toNumbers: [1], doorState: 'OPEN', hasNoise: false },
  { id: '13-19', fromRoomId: 13, toRoomId: 19, fromNumbers: [2], toNumbers: [2], doorState: 'OPEN', hasNoise: false },
  { id: '14-17', fromRoomId: 14, toRoomId: 17, fromNumbers: [2], toNumbers: [2], doorState: 'OPEN', hasNoise: false },

  // --- Юго-восток ---
  {
    id: '12-16',
    fromRoomId: 12,
    toRoomId: 16,
    fromNumbers: [3, 4],
    toNumbers: [3, 4],
    doorState: 'OPEN',
    hasNoise: false,
  },
  { id: '15-16', fromRoomId: 15, toRoomId: 16, fromNumbers: [2], toNumbers: [2], doorState: 'OPEN', hasNoise: false },
  { id: '15-18', fromRoomId: 15, toRoomId: 18, fromNumbers: [3], toNumbers: [3], doorState: 'OPEN', hasNoise: false },
  { id: '16-21', fromRoomId: 16, toRoomId: 21, fromNumbers: [1], toNumbers: [1], doorState: 'OPEN', hasNoise: false },

  // --- Двигатели ---
  { id: '17-19', fromRoomId: 17, toRoomId: 19, fromNumbers: [1], toNumbers: [1], doorState: 'OPEN', hasNoise: false },
  {
    id: '17-20',
    fromRoomId: 17,
    toRoomId: 20,
    fromNumbers: [3, 4],
    toNumbers: [3, 4],
    doorState: 'OPEN',
    hasNoise: false,
  },
  {
    id: '18-20',
    fromRoomId: 18,
    toRoomId: 20,
    fromNumbers: [1, 2],
    toNumbers: [1, 2],
    doorState: 'OPEN',
    hasNoise: false,
  },
  { id: '18-21', fromRoomId: 18, toRoomId: 21, fromNumbers: [4], toNumbers: [4], doorState: 'OPEN', hasNoise: false },
];
