import type { IntruderEntity, SanitizedGameState } from '@nemesis/shared';

/** Особи Чужих в отсеке: карта и инспектор разрешают id в сущности одним способом. */
export function roomIntruders(view: SanitizedGameState, roomId: number): IntruderEntity[] {
  const room = view.ship.rooms[roomId];

  if (!room) return [];

  const byId = new Map(view.intrudersPool.boardTokens.map((entity) => [entity.id, entity]));
  const intruders: IntruderEntity[] = [];

  for (const id of room.occupantIntruderIds) {
    const entity = byId.get(id);

    if (entity) intruders.push(entity);
  }

  return intruders;
}
