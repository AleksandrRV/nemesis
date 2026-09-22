import type { CorridorConnection, CorridorNumber, RoomId } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import { SHIP_ROOM_NODES } from '../data/shipGraph.js';
import { EngineError } from './engineErrors.js';

export function findOpenCorridors(state: GameState, fromRoomId: RoomId, toRoomId: RoomId): CorridorConnection[] {
  return Object.values(state.ship.corridors).filter(
    (corridor) =>
      corridor.doorState !== 'CLOSED' &&
      ((corridor.fromRoomId === fromRoomId && corridor.toRoomId === toRoomId) ||
        (corridor.fromRoomId === toRoomId && corridor.toRoomId === fromRoomId)),
  );
}

export function findAdjacentOpenRoomIds(state: CorridorGraphState, fromRoomId: RoomId): RoomId[] {
  return Object.values(state.ship.corridors)
    .filter((corridor) => corridor.doorState !== 'CLOSED')
    .flatMap((corridor) =>
      corridor.fromRoomId === fromRoomId
        ? [corridor.toRoomId]
        : corridor.toRoomId === fromRoomId
          ? [corridor.fromRoomId]
          : [],
    );
}

export interface CorridorGraphState {
  ship: { corridors: Record<string, CorridorConnection> };
}

export function requireCorridor(state: GameState, corridorId: string): CorridorConnection {
  const corridor = state.ship.corridors[corridorId];

  if (!corridor) {
    throw new EngineError('UNKNOWN_CORRIDOR', `Коридора ${corridorId} нет на корабле.`);
  }

  return corridor;
}

export function requireOpenPath(state: GameState, fromRoomId: RoomId, targetRoomId: RoomId): CorridorConnection[] {
  if (!state.ship.rooms[targetRoomId]) {
    throw new EngineError('UNKNOWN_ROOM', `Отсека ${targetRoomId} нет на корабле.`);
  }

  if (targetRoomId === fromRoomId) {
    throw new EngineError('MOVE_TARGET_IS_CURRENT_ROOM', 'Персонаж уже находится в этом отсеке.');
  }

  const corridors = findOpenCorridors(state, fromRoomId, targetRoomId);

  if (corridors.length === 0) {
    throw new EngineError(
      'NO_OPEN_DOOR_BETWEEN_ROOMS',
      `Отсек ${targetRoomId} не соседний с ${fromRoomId}: нет Коридора с открытой Дверью (стр. 14).`,
    );
  }

  return corridors;
}

export function corridorsLeadingInto(state: GameState, roomId: RoomId): CorridorConnection[] {
  return Object.values(state.ship.corridors).filter(
    (corridor) => corridor.fromRoomId === roomId || corridor.toRoomId === roomId,
  );
}

export function roomHasTechnicalEntrance(roomId: RoomId): boolean {
  return (SHIP_ROOM_NODES.find((node) => node.id === roomId)?.techNumbers.length ?? 0) > 0;
}

export function corridorNumbersOf(corridor: CorridorConnection, roomId: RoomId): CorridorNumber[] {
  if (corridor.fromRoomId === roomId) return corridor.fromNumbers;
  if (corridor.toRoomId === roomId) return corridor.toNumbers;

  return [];
}

export type NoiseTarget =
  { kind: 'TECHNICAL_CORRIDOR' } | { kind: 'CORRIDOR'; corridor: CorridorConnection } | { kind: 'UNMAPPED' };

export function findNoiseTarget(state: GameState, roomId: RoomId, number: CorridorNumber): NoiseTarget {
  const roomNode = SHIP_ROOM_NODES.find((node) => node.id === roomId);

  if (roomNode?.techNumbers.includes(number)) {
    return { kind: 'TECHNICAL_CORRIDOR' };
  }

  const corridor = corridorsLeadingInto(state, roomId).find((candidate) =>
    corridorNumbersOf(candidate, roomId).includes(number),
  );

  return corridor ? { kind: 'CORRIDOR', corridor } : { kind: 'UNMAPPED' };
}
