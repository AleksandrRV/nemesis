import { describe, expect, it } from 'vitest';

import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';

import { roomIntruders } from './roomIntruders';

describe('roomIntruders: Чужие в отсеке', () => {
  it('разрешает id отсека в сущности с типом и ранами', () => {
    const state = createInitialGameState('room-intruders-resolve');
    const token = { id: 'test-adult-1', type: 'ADULT', escapeNumber: 4 } as const;

    state.intrudersPool.boardTokens.push({
      id: token.id,
      type: 'ADULT',
      roomId: 11,
      woundsCount: 2,
      token: { ...token },
    });
    state.ship.rooms[11]!.occupantIntruderIds.push(token.id);

    const view = filterStateForPlayer(state, 'player-1');
    const intruders = roomIntruders(view, 11);

    expect(intruders).toHaveLength(1);
    expect(intruders[0]).toMatchObject({ id: 'test-adult-1', type: 'ADULT', woundsCount: 2 });
  });

  it('возвращает пустой список без отсека, без Чужих и при битых id', () => {
    const state = createInitialGameState('room-intruders-empty');

    state.ship.rooms[11]!.occupantIntruderIds.push('ghost');

    const view = filterStateForPlayer(state, 'player-1');

    expect(roomIntruders(view, 11)).toEqual([]);
    expect(roomIntruders(view, 999)).toEqual([]);
  });
});
