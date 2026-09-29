import type { CommsIntent } from '../types/comms.js';
import type { RoomId } from '../types/rooms.js';
import type { SanitizedGameState } from '../types/sanitized.js';

type GraphView = Pick<SanitizedGameState, 'ship'>;

const HEALING_ROOMS = ['INFIRMARY', 'SURGERY', 'CANTEEN', 'SHOWER'];
const ENGINE_ROOMS = ['ENGINE_01', 'ENGINE_02', 'ENGINE_03'];

/** Расстояния в Коридорах от Комнаты по всему графу корабля: Двери открываются, путь от этого не исчезает. */
export function hopDistances(view: GraphView, fromRoomId: RoomId): Map<RoomId, number> {
  const distances = new Map<RoomId, number>([[fromRoomId, 0]]);
  const queue: RoomId[] = [fromRoomId];
  const corridors = Object.values(view.ship.corridors);
  while (queue.length > 0) {
    const room = queue.shift()!;
    const distance = distances.get(room)!;
    for (const corridor of corridors) {
      const next =
        corridor.fromRoomId === room ? corridor.toRoomId : corridor.toRoomId === room ? corridor.fromRoomId : null;
      if (next === null || distances.has(next)) continue;
      distances.set(next, distance + 1);
      queue.push(next);
    }
  }
  return distances;
}

export function distanceBetween(view: GraphView, fromRoomId: RoomId, toRoomIds: readonly RoomId[]): number {
  if (toRoomIds.length === 0) return Number.POSITIVE_INFINITY;
  const distances = hopDistances(view, fromRoomId);
  return Math.min(...toRoomIds.map((roomId) => distances.get(roomId) ?? Number.POSITIVE_INFINITY));
}

export function roomsWithDefinition(view: GraphView, definitionIds: readonly string[]): RoomId[] {
  return Object.values(view.ship.rooms)
    .filter((room) => room.definitionId !== null && definitionIds.includes(room.definitionId))
    .map((room) => room.id);
}

export function isAdjacentOrSame(view: GraphView, roomId: RoomId, otherRoomId: RoomId): boolean {
  return roomId === otherRoomId || (hopDistances(view, roomId).get(otherRoomId) ?? Infinity) <= 1;
}

export function corridorTouchesRoom(view: GraphView, corridorId: string, roomId: RoomId): boolean {
  const corridor = view.ship.corridors[corridorId];
  return corridor !== undefined && (corridor.fromRoomId === roomId || corridor.toRoomId === roomId);
}

/** Куда ведёт Намерение: Комнаты, к которым автор обещал идти. Пусто — прогресс по графу не измерить. */
export function intentTargetRooms(view: SanitizedGameState, intent: CommsIntent): RoomId[] {
  switch (intent.topic) {
    case 'GO_TO_ROOM':
      return [intent.roomId];
    case 'SEEK_ROOM':
      return roomsWithDefinition(view, [intent.definitionId]);
    case 'GO_TO_ENGINES':
      return roomsWithDefinition(view, ENGINE_ROOMS);
    case 'GO_TO_BRIDGE':
      return roomsWithDefinition(view, ['COCKPIT']);
    case 'GO_HEAL':
      return roomsWithDefinition(view, HEALING_ROOMS);
    case 'GO_TO_HIBERNATION':
      return roomsWithDefinition(view, ['HIBERNATORIUM']);
    case 'GO_TO_POD': {
      const pod = view.ship.escapePods[intent.podId];
      return pod ? roomsWithDefinition(view, [`ESCAPE_POD_${pod.section}`]) : [];
    }
    case 'COVER_PLAYER': {
      const target = view.players[intent.playerId];
      return target ? [target.roomId] : [];
    }
    case 'EXPLORE':
      return Object.values(view.ship.rooms)
        .filter((room) => !room.isExplored)
        .map((room) => room.id);
  }
}
