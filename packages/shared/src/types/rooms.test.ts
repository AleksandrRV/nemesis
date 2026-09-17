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
    ['DESTROYED', 'OPEN'],
  ] as const)('переключает %s в %s', (from, to) => {
    expect(nextDoorState(from)).toBe(to);
  });

  it('возвращается в исходное состояние за три переключения', () => {
    for (const state of DOOR_STATES) {
      let current: DoorState = state;

      for (let step = 0; step < DOOR_STATES.length; step++) {
        current = nextDoorState(current);
      }

      expect(current).toBe(state);
    }
  });
});
