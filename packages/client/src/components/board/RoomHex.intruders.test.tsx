import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialGameState, filterStateForPlayer, type IntruderEntity } from '@nemesis/shared';
import { SHIP_ROOM_NODES } from '@nemesis/shared';
import { RoomHex } from './RoomHex';

function roomView(seed: string, roomId: number, intruders: IntruderEntity[]) {
  const raw = createInitialGameState(seed);
  const placed = intruders.map((entry) => (entry.roomId === 0 ? { ...entry, roomId } : entry));
  raw.intrudersPool.boardTokens.push(...placed);
  raw.ship.rooms[roomId]!.occupantIntruderIds.push(...placed.map((entry) => entry.id));

  return { view: filterStateForPlayer(raw, 'player-1'), placed };
}

function renderHex(roomId: number, intruders: IntruderEntity[]): string {
  const node = SHIP_ROOM_NODES.find((candidate) => candidate.id === roomId)!;
  const { view, placed } = roomView('hex-intruders', roomId, intruders);

  return renderToStaticMarkup(
    <svg>
      <RoomHex
        room={view.ship.rooms[roomId]!}
        intruders={placed}
        x={node.x}
        y={node.y}
        isSelected={false}
        onSelect={() => undefined}
      />
    </svg>,
  );
}

describe('RoomHex: бейджи Чужих на карте', () => {
  it('одна миниатюра без ран: силуэт с цветом типа и без счётчиков', () => {
    const html = renderHex(11, [{ id: 'adult-1', type: 'ADULT', roomId: 0, woundsCount: 0 }]);

    expect(html).toContain('aria-label="Взрослая особь: 1 шт., ран 0"');
    expect(html).toContain('#ef4444');
    expect(html).not.toContain('×2');
  });

  it('несколько миниатюр и раны: счётчик и красный маркер ран', () => {
    const html = renderHex(11, [
      { id: 'adult-1', type: 'ADULT', roomId: 0, woundsCount: 0 },
      { id: 'adult-2', type: 'ADULT', roomId: 0, woundsCount: 3 },
    ]);

    expect(html).toContain('aria-label="Взрослая особь: 2 шт., ран 3"');
    expect(html).toContain('×2');
  });

  it('типы идут от Личинки к Королеве, у каждого свой цвет', () => {
    const html = renderHex(11, [
      { id: 'queen-1', type: 'QUEEN', roomId: 0, woundsCount: 0 },
      { id: 'larva-1', type: 'LARVA', roomId: 0, woundsCount: 1 },
    ]);

    const larvaAt = html.indexOf('aria-label="Личинка: 1 шт., ран 1"');
    const queenAt = html.indexOf('aria-label="Королева: 1 шт., ран 0"');

    expect(larvaAt).toBeGreaterThan(-1);
    expect(queenAt).toBeGreaterThan(larvaAt);
    expect(html).toContain('#4ade80');
    expect(html).toContain('#a855f7');
  });

  it('в пустом отсеке бейджей нет', () => {
    const html = renderHex(11, []);

    expect(html).not.toContain('aria-label="Личинка');
    expect(html).not.toContain('aria-label="Взрослая особь');
  });
});
