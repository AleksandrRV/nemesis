import { describe, expect, it } from 'vitest';
import { SHIP_ROOM_NODES, type GameLogEntry } from '@nemesis/shared';
import {
  TECH_HUB,
  TECH_HUB_RADIUS,
  lastLogSequence,
  newVentRetreats,
  techEntranceRooms,
  ventShaftRoutes,
} from './techCorridorModel';

function retreatEntry(
  sequence: number,
  outcome: 'MOVED' | 'DOOR_DESTROYED' | 'TECHNICAL_CORRIDORS' | 'STAYED',
  intruderId: string,
): GameLogEntry {
  return {
    id: `log-${sequence}`,
    sequence,
    event: {
      type: 'INTRUDER_RETREATED',
      playerId: 'player-1',
      roomId: 14,
      intruderId,
      intruderType: 'ADULT',
      retreat: {
        eventCardId: 'EVT_HUNT_2',
        eventCardName: 'Охота',
        corridorNumber: 3,
        outcome,
        toRoomId: null,
        corridorId: null,
      },
    },
  };
}

describe('techCorridorModel: входы вентиляции и трассы шахт', () => {
  it('входы вентиляции совпадают с красными маячками узлов корабля', () => {
    const entranceIds = techEntranceRooms().map((node) => node.id);

    expect(entranceIds).toEqual(SHIP_ROOM_NODES.filter((node) => node.techNumbers.length > 0).map((node) => node.id));
    expect(entranceIds.length).toBe(8);
  });

  it('каждому входу проложена трасса: старт у маячка, конец у кромки узла', () => {
    const routes = ventShaftRoutes();

    expect(routes.map((route) => route.roomId).sort((a, b) => a - b)).toEqual(
      techEntranceRooms()
        .map((node) => node.id)
        .sort((a, b) => a - b),
    );

    for (const route of routes) {
      const node = SHIP_ROOM_NODES.find((candidate) => candidate.id === route.roomId)!;
      const [startX, startY] = route.points[0]!;
      expect(startX).toBe(node.x);
      expect(startY).toBe(node.y - 45);

      const [endX, endY] = route.points[route.points.length - 1]!;
      const distance = Math.hypot(endX - TECH_HUB.x, endY - TECH_HUB.y);
      expect(distance).toBeGreaterThanOrEqual(TECH_HUB_RADIUS - 12);
      expect(distance).toBeLessThanOrEqual(TECH_HUB_RADIUS + 8);
    }
  });
});

describe('techCorridorModel: силуэты уходящих в вентиляцию Чужих', () => {
  it('пустой журнал — нулевая последняя запись', () => {
    expect(lastLogSequence([])).toBe(0);
  });

  it('возвращает только новые уходы в вентиляцию после показанной записи', () => {
    const log: GameLogEntry[] = [
      { id: 'log-1', sequence: 1, event: { type: 'GAME_STARTED' } },
      retreatEntry(2, 'TECHNICAL_CORRIDORS', 'intruder-1'),
      retreatEntry(3, 'MOVED', 'intruder-2'),
      retreatEntry(4, 'TECHNICAL_CORRIDORS', 'intruder-3'),
    ];

    expect(lastLogSequence(log)).toBe(4);
    expect(newVentRetreats(log, 0).map((entry) => entry.intruderId)).toEqual(['intruder-1', 'intruder-3']);
    expect(newVentRetreats(log, 2).map((entry) => entry.intruderId)).toEqual(['intruder-3']);
    expect(newVentRetreats(log, 4)).toEqual([]);
  });
});
