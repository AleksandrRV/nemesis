import { describe, expect, it } from 'vitest';

import type { DoorState } from './rooms.js';
import { DOOR_STATES, nextDoorState } from './rooms.js';

describe('Жетон Двери (стр. 14)', () => {
  it('знает ровно три состояния без повторов', () => {
    expect(DOOR_STATES).toHaveLength(3);
    expect(new Set(DOOR_STATES).size).toBe(3);
  });

  it.each([
    ['OPEN', 'CLOSED'],
    ['CLOSED', 'DESTROYED'],
  ] as const)('переключает %s в %s', (from, to) => {
    expect(nextDoorState(from)).toBe(to);
  });

  it('Разрушенная Дверь — терминальное состояние: снова её не закрыть (стр. 17)', () => {
    expect(nextDoorState('DESTROYED')).toBe('DESTROYED');

    let current: DoorState = 'DESTROYED';

    for (let step = 0; step < DOOR_STATES.length * 2; step++) {
      current = nextDoorState(current);
    }

    expect(current).toBe('DESTROYED');
  });

  it('проходит путь OPEN → CLOSED → DESTROYED за два переключения', () => {
    expect(nextDoorState(nextDoorState('OPEN'))).toBe('DESTROYED');
  });
});
