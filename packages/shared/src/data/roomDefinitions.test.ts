import { describe, expect, it } from 'vitest';

import type { RoomId } from '../types/rooms.js';
import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1, SPECIAL_ROOMS } from './roomDefinitions.js';
import { SHIP_ROOM_NODES } from './shipGraph.js';

/** Все 11 Основных Комнат «1» участвуют в каждой игре (книга правил, стр. 24). */
const BASIC_ROOM_IDS = [
  'ARMORY',
  'COMM_ROOM',
  'INFIRMARY',
  'LABORATORY',
  'GENERATOR',
  'ESCAPE_POD_A',
  'ESCAPE_POD_B',
  'FIRE_CONTROL',
  'NEST',
  'STORAGE',
  'SURGERY',
];

/** Все 9 Дополнительных Комнат «2», из которых 5 попадают на поле (GDD §2.1). */
const ADDITIONAL_ROOM_IDS = [
  'AIRLOCK_CONTROL',
  'CABINS',
  'CANTEEN',
  'COMMAND_CENTER',
  'ENGINE_CONTROL',
  'HATCH_CONTROL',
  'OBSERVATION_ROOM',
  'SLIME_ROOM',
  'SHOWER',
];

/** Особые отсеки напечатаны на поле и не выбираются случайно (GDD §2.1). */
const SPECIAL_ROOM_NODES: Record<string, RoomId> = {
  COCKPIT: 1,
  HIBERNATORIUM: 11,
  ENGINE_03: 19,
  ENGINE_02: 20,
  ENGINE_01: 21,
};

const allDefinitions = [...BASIC_ROOMS_1, ...ADDITIONAL_ROOMS_2, ...SPECIAL_ROOMS];

describe('Определения комнат: состав', () => {
  it('содержит 11 основных, 9 дополнительных и 5 особых комнат', () => {
    expect(BASIC_ROOMS_1).toHaveLength(11);
    expect(ADDITIONAL_ROOMS_2).toHaveLength(9);
    expect(SPECIAL_ROOMS).toHaveLength(5);
  });

  it('совпадает с перечнем комнат из GDD §2.1', () => {
    expect(BASIC_ROOMS_1.map((room) => room.id).sort()).toEqual([...BASIC_ROOM_IDS].sort());
    expect(ADDITIONAL_ROOMS_2.map((room) => room.id).sort()).toEqual([...ADDITIONAL_ROOM_IDS].sort());
  });

  it('не повторяет идентификаторы между списками', () => {
    const ids = allDefinitions.map((room) => room.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('не повторяет названия комнат', () => {
    const names = allDefinitions.map((room) => room.name.toLowerCase());

    expect(new Set(names).size).toBe(names.length);
  });

  it('заполняет название и описание действия у каждой комнаты', () => {
    for (const room of allDefinitions) {
      expect(room.name.length).toBeGreaterThan(0);
      expect(room.actionDescription.length).toBeGreaterThan(0);
      expect(room.actionCost).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Определения комнат: категории и стоимость действий', () => {
  it('относит каждую комнату к правильной категории', () => {
    expect(BASIC_ROOMS_1.every((room) => room.category === 'ROOM_1')).toBe(true);
    expect(ADDITIONAL_ROOMS_2.every((room) => room.category === 'ROOM_2')).toBe(true);
    expect(SPECIAL_ROOMS.every((room) => room.category === 'SPECIAL')).toBe(true);
  });

  it('стоит [2] у всех основных и особых комнат (книга правил, стр. 24–26)', () => {
    for (const room of [...BASIC_ROOMS_1, ...SPECIAL_ROOMS]) {
      expect(room.actionCost).toBe(2);
    }
  });

  it('стоит 0 или [2] у дополнительных комнат', () => {
    for (const room of ADDITIONAL_ROOMS_2) {
      expect([0, 2]).toContain(room.actionCost);
    }
  });

  it('обнуляет стоимость у пассивных дополнительных комнат: Каюты и Комната со слизью', () => {
    expect(ADDITIONAL_ROOMS_2.find((room) => room.id === 'CABINS')?.actionCost).toBe(0);
    expect(ADDITIONAL_ROOMS_2.find((room) => room.id === 'SLIME_ROOM')?.actionCost).toBe(0);
  });
});

describe('Определения комнат: связь с отсеками поля', () => {
  it('сопоставляет каждую особую комнату своему отсеку и совпадает по названию', () => {
    for (const [definitionId, nodeId] of Object.entries(SPECIAL_ROOM_NODES)) {
      const definition = SPECIAL_ROOMS.find((room) => room.id === definitionId);
      const node = SHIP_ROOM_NODES.find((room) => room.id === nodeId);

      expect(definition).toBeDefined();
      expect(node).toBeDefined();
      expect(definition?.category).toBe('SPECIAL');
      expect(node?.category).toBe('SPECIAL');
      expect(node?.name.toLowerCase()).toBe(definition?.name.toLowerCase());
    }
  });

  it('оставляет в списке особых комнат ровно те определения, что стоят на поле', () => {
    expect(SPECIAL_ROOMS.map((room) => room.id).sort()).toEqual(Object.keys(SPECIAL_ROOM_NODES).sort());
  });
});
