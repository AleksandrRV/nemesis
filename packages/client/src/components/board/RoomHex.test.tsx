import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import type { IntruderEntity } from '@nemesis/shared';
import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';

import { RoomHex } from './RoomHex';
import { INTRUDER_TYPE_COLORS } from '../../utils/labels';

function roomProps(intruders: IntruderEntity[] = []) {
  const view = filterStateForPlayer(createInitialGameState('room-hex-intruders'), 'player-1');

  return {
    room: view.ship.rooms[11]!,
    x: 100,
    y: 100,
    isSelected: false,
    onSelect: () => undefined,
    intruders,
  };
}

describe('RoomHex: Чужие в отсеке', () => {
  it('красит значок по типу особи и показывает счётчик ран', () => {
    const intruders: IntruderEntity[] = [
      {
        id: 'test-adult-1',
        type: 'ADULT',
        roomId: 11,
        woundsCount: 0,
        token: { id: 'test-adult-1', type: 'ADULT', escapeNumber: 4 },
      },
      {
        id: 'test-queen-1',
        type: 'QUEEN',
        roomId: 11,
        woundsCount: 3,
        token: { id: 'test-queen-1', type: 'QUEEN', escapeNumber: 4 },
      },
    ];

    const html = renderToStaticMarkup(
      <svg>
        <RoomHex {...roomProps(intruders)} />
      </svg>,
    );

    expect(html).toContain(`fill="${INTRUDER_TYPE_COLORS.ADULT.fill}"`);
    expect(html).toContain(`fill="${INTRUDER_TYPE_COLORS.QUEEN.fill}"`);
    expect(html).toContain('Взрослая Особь — ран: 0');
    expect(html).toContain('Королева — ран: 3');
    expect(html).toContain('>3</text>');
  });

  it('без Чужих значки не рисует', () => {
    const html = renderToStaticMarkup(
      <svg>
        <RoomHex {...roomProps()} />
      </svg>,
    );

    expect(html).not.toContain('<title>');
    expect(html).not.toContain(INTRUDER_TYPE_COLORS.ADULT.fill);
  });
});
