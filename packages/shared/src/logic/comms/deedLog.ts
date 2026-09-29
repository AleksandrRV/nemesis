import type { EngineAction } from '../../types/actions.js';
import type { DoorState } from '../../types/rooms.js';
import type { GameState } from '../../types/state.js';
import { appendGameLog } from '../gameLog.js';

export interface DeedSnapshot {
  doors: Record<string, DoorState>;
  fires: Set<number>;
}

const PASSIVE_ACTIONS = new Set<EngineAction['type']>(['ACTION_PASS', 'ACTION_COMMS']);

export function snapshotDeeds(state: GameState): DeedSnapshot {
  return {
    doors: Object.fromEntries(Object.values(state.ship.corridors).map((corridor) => [corridor.id, corridor.doorState])),
    fires: new Set(
      Object.values(state.ship.rooms)
        .filter((room) => room.hasFire)
        .map((room) => room.id),
    ),
  };
}

function isOpenOrClosed(doorState: DoorState): boolean {
  return doorState === 'OPEN' || doorState === 'CLOSED';
}

/**
 * Поступки Действия игрока в журнал (учёт обещаний В8-3-4): Двери, открытые или закрытые им,
 * и потушенные им Пожары. Разрушение Двери сюда не входит — его делают и Чужие.
 */
export function logActorDeeds(state: GameState, action: EngineAction, actorId: string, before: DeedSnapshot): void {
  if (PASSIVE_ACTIONS.has(action.type)) return;
  for (const corridor of Object.values(state.ship.corridors)) {
    const from = before.doors[corridor.id];
    if (from === undefined || from === corridor.doorState || !isOpenOrClosed(corridor.doorState)) continue;
    appendGameLog(state, {
      type: 'DOOR_CHANGED',
      playerId: actorId,
      corridorId: corridor.id,
      from,
      to: corridor.doorState,
    });
  }
  for (const roomId of before.fires) {
    if (state.ship.rooms[roomId]?.hasFire === false)
      appendGameLog(state, { type: 'FIRE_EXTINGUISHED', playerId: actorId, roomId });
  }
}
