import type { RoomId } from '../types/rooms.js';
import type { SanitizedGameState, SanitizedPlayerState } from '../types/sanitized.js';
import { hopDistances } from './botGraph.js';
import type { BotTask } from './botTasks.js';

function isActiveCrew(player: SanitizedPlayerState): boolean {
  return !player.isDead && !player.isInHibernation && !player.hasEscapedInPod && !player.boardedPodId;
}

function targetRooms(view: SanitizedGameState, place: BotTask['place']): RoomId[] {
  const byDefinition = Object.values(view.ship.rooms)
    .filter((room) => room.definitionId !== null && (place.definitionIds ?? []).includes(room.definitionId))
    .map((room) => room.id);
  return [...(place.roomIds ?? []), ...byDefinition];
}

/** Общая задача корабля достаётся ближайшему к ней члену экипажа: остальным она стоит доли `share`. */
export function teamShare(view: SanitizedGameState, selfId: string, place: BotTask['place'], share: number): number {
  if (share >= 1) return 1;
  const targets = targetRooms(view, place);
  const self = view.players[selfId];
  if (!self || targets.length === 0) return 1;
  const distanceFrom = (roomId: RoomId): number => {
    const distances = hopDistances(view, roomId);
    return Math.min(...targets.map((target) => distances.get(target) ?? Number.POSITIVE_INFINITY));
  };
  const mine = distanceFrom(self.roomId);
  const nearerMate = Object.values(view.players).some(
    (player) => player.id !== selfId && isActiveCrew(player) && distanceFrom(player.roomId) < mine,
  );
  return nearerMate ? share : 1;
}

export function sharedAmongCrew(view: SanitizedGameState, selfId: string, tasks: BotTask[], share: number): BotTask[] {
  return tasks.map((entry) => ({ ...entry, weight: entry.weight * teamShare(view, selfId, entry.place, share) }));
}
