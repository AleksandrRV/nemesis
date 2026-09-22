import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialGameState, filterStateForPlayer, SHIP_ROOM_NODES } from '@nemesis/shared';
import { RoomHex } from './RoomHex';

function renderTechRoom(technicalNoise: boolean): string {
  const raw = createInitialGameState('hex-vent');
  const view = filterStateForPlayer(raw, 'player-1');
  const roomId = 2;
  const node = SHIP_ROOM_NODES.find((candidate) => candidate.id === roomId)!;

  return renderToStaticMarkup(
    <svg>
      <RoomHex
        room={view.ship.rooms[roomId]!}
        intruders={[]}
        x={node.x}
        y={node.y}
        isSelected={false}
        onSelect={() => undefined}
        technicalNoise={technicalNoise}
      />
    </svg>,
  );
}

describe('RoomHex: индикатор Шума в вентиляции у входа', () => {
  it('Шум на поле вентиляции пульсирует на маячке входа', () => {
    const html = renderTechRoom(true);

    expect(html).toContain('aria-label="Шум в вентиляции"');
    expect(html).toContain('motion-safe:animate-vent-alarm');
  });

  it('без Шума маячок входа остаётся спокойным', () => {
    const html = renderTechRoom(false);

    expect(html).not.toContain('Шум в вентиляции');
  });

  it('у отсека без входа вентиляции индикатор не появляется', () => {
    const raw = createInitialGameState('hex-vent-none');
    const view = filterStateForPlayer(raw, 'player-1');
    const node = SHIP_ROOM_NODES.find((candidate) => candidate.id === 11)!;

    const html = renderToStaticMarkup(
      <svg>
        <RoomHex
          room={view.ship.rooms[11]!}
          intruders={[]}
          x={node.x}
          y={node.y}
          isSelected={false}
          onSelect={() => undefined}
          technicalNoise={true}
        />
      </svg>,
    );

    expect(html).not.toContain('Шум в вентиляции');
  });
});
