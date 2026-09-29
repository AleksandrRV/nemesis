import type { CorridorConnection, RoomId } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import { EngineError } from './engineErrors.js';
import { placeDoorToken } from './markers.js';
import { requireTargetRoom } from './cardEffectsShared.js';

export interface DoorRearrangement {
  targetRoomId: RoomId;
  closedCorridorIds: string[];
  openedCorridorIds: string[];
}

export function corridorsIntoRoom(state: GameState, roomId: RoomId): CorridorConnection[] {
  return Object.values(state.ship.corridors).filter(
    (corridor) => corridor.fromRoomId === roomId || corridor.toRoomId === roomId,
  );
}

export function closeDoorWithToken(state: GameState, corridorId: string): void {
  if (placeDoorToken(state, corridorId) === 'NO_TOKEN_IN_SUPPLY') {
    throw new EngineError('DOOR_TOKEN_SUPPLY_EXHAUSTED', 'Жетонов Дверей нет ни в запасе, ни на поле.');
  }
}

/**
 * Двери всех Коридоров выбранной Комнаты: перечисленные Закрываются, остальные
 * Открываются. Без списка — все целые Двери в одно положение: Закрыть, если
 * хотя бы одна открыта, иначе Открыть.
 */
export function rearrangeRoomDoors(
  state: GameState,
  targetRoomId: RoomId | undefined,
  closedCorridorIds?: readonly string[],
): DoorRearrangement {
  const target = requireTargetRoom(state, targetRoomId, 'Выберите комнату, Двери которой нужно переключить.');
  const doors = corridorsIntoRoom(state, target.id).filter((corridor) => corridor.doorState !== 'DESTROYED');
  if (doors.length === 0) throw new EngineError('DOOR_DESTROYED', 'У этой комнаты нет целых Дверей.');
  const doorIds = new Set(doors.map((corridor) => corridor.id));
  if (closedCorridorIds?.some((id) => !doorIds.has(id))) {
    throw new EngineError('INVALID_DECISION_OPTION', 'Закрывать можно только целые Двери выбранной Комнаты.');
  }
  const toClose = new Set(
    closedCorridorIds ??
      (doors.some((corridor) => corridor.doorState === 'OPEN') ? doors.map((corridor) => corridor.id) : []),
  );
  const result: DoorRearrangement = { targetRoomId: target.id, closedCorridorIds: [], openedCorridorIds: [] };
  for (const corridor of doors) {
    if (toClose.has(corridor.id) && corridor.doorState === 'OPEN') {
      closeDoorWithToken(state, corridor.id);
      result.closedCorridorIds.push(corridor.id);
    }
    if (!toClose.has(corridor.id) && corridor.doorState === 'CLOSED') {
      corridor.doorState = 'OPEN';
      result.openedCorridorIds.push(corridor.id);
    }
  }
  return result;
}
