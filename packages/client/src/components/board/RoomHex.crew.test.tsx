import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SHIP_ROOM_NODES, createInitialGameState, filterStateForPlayer } from '@nemesis/shared';
import { RoomHex } from './RoomHex';
import { buildCrewByRoom } from './crewTokenModel';

function renderStartRoom(hidden: ReadonlySet<string> = new Set()) {
  const view = filterStateForPlayer(createInitialGameState('hex-crew', { playerCount: 2 }), 'player-1');
  const roomId = view.players['player-1']!.roomId;
  const node = SHIP_ROOM_NODES.find((candidate) => candidate.id === roomId)!;
  const html = renderToStaticMarkup(
    <svg>
      <RoomHex
        room={view.ship.rooms[roomId]!}
        intruders={[]}
        x={node.x}
        y={node.y}
        isSelected={false}
        onSelect={() => undefined}
        crew={buildCrewByRoom(view, hidden).get(roomId) ?? []}
      />
    </svg>,
  );
  return { view, html };
}

describe('RoomHex: фишки экипажа с ролью и номером игрока', () => {
  it('каждый персонаж в отсеке — отдельная фишка своей роли с номером', () => {
    const { view, html } = renderStartRoom();
    for (const player of Object.values(view.players)) {
      expect(html).toContain(`data-crew-class="${player.characterClass}"`);
      expect(html).toContain(`data-crew-number="${player.orderNumber}"`);
      expect(html).toContain(`Игрок ${player.orderNumber} — `);
    }
  });

  it('у активного игрока — пульсирующее кольцо хода', () => {
    const { html } = renderStartRoom();
    expect(html).toContain('animate-crew-active-ring');
    expect(html).toContain('(сейчас ходит)');
  });

  it('персонаж в пути не дублируется на статичном поле', () => {
    const { html } = renderStartRoom(new Set(['player-1']));
    expect(html).not.toContain('data-crew-number="1"');
  });
});
