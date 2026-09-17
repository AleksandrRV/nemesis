import { describe, expect, it } from 'vitest';

import * as core from './index.js';

/**
 * Контракт публичного API ядра.
 *
 * Пакет объявляет поле `exports` и собирается в dist, поэтому список
 * рантайм-экспортов — часть публичного контракта: его используют и клиент,
 * и будущий сервер. Типы в этот список не попадают (они стираются при сборке),
 * а потеря любой таблицы данных должна ловиться тестом, а не баг-репортом.
 */
const PUBLIC_RUNTIME_EXPORTS = [
  'ADDITIONAL_ROOMS_2',
  'BASE_ADULT_COUNT',
  'BASIC_ROOMS_1',
  'CHARACTERS',
  'COMPONENT_FAMILY',
  'COORDINATE_DESTINATIONS',
  'CRAFTING_RECIPES',
  'ESCAPE_POD_CAPACITY',
  'ESCAPE_POD_NUMBERS',
  'ESCAPE_PODS_BY_PLAYER_COUNT',
  'GAME_STATE_SCHEMA_VERSION',
  'HAND_SLOT_COUNT',
  'MAX_PLAYER_COUNT',
  'MIN_PLAYER_COUNT',
  'QUEST_ITEM_COUNT',
  'SHIP_CORRIDORS',
  'SHIP_ROOM_NODES',
  'SPECIAL_ROOMS',
  'WEAKNESS_SLOT_COUNT',
  'WEAKNESS_SLOT_OBJECT_KINDS',
];

describe('Публичное API ядра', () => {
  it('экспортирует через точку входа все таблицы данных', () => {
    expect(Object.keys(core).sort()).toEqual([...PUBLIC_RUNTIME_EXPORTS].sort());
  });

  it('отдаёт непустые данные по каждому экспорту', () => {
    expect(core.SHIP_ROOM_NODES.length).toBeGreaterThan(0);
    expect(core.SHIP_CORRIDORS.length).toBeGreaterThan(0);
    expect(core.BASIC_ROOMS_1.length).toBeGreaterThan(0);
    expect(core.ADDITIONAL_ROOMS_2.length).toBeGreaterThan(0);
    expect(core.SPECIAL_ROOMS.length).toBeGreaterThan(0);
    expect(core.CRAFTING_RECIPES.length).toBeGreaterThan(0);
  });

  it('объявляет версию контракта состояния', () => {
    expect(core.GAME_STATE_SCHEMA_VERSION).toBeGreaterThanOrEqual(1);
  });
});
