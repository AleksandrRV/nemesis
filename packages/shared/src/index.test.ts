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
  'BASIC_ROOMS_1',
  'SHIP_CORRIDORS',
  'SHIP_ROOM_NODES',
  'SPECIAL_ROOMS',
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
  });
});
