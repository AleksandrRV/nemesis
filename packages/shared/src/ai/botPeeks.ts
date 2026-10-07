import type { ExplorationEffect, RoomId } from '../types/rooms.js';
import type { SanitizedGameState } from '../types/sanitized.js';

/** Подсмотренные ботом закрытые тайлы (Комната Наблюдения, карты, Предметы): срез оставляет оборот только ему. */
export interface Peeks {
  tiles: ReadonlyMap<RoomId, string>;
  tokens: ReadonlyMap<RoomId, ExplorationEffect>;
}

const peeksCache = new WeakMap<SanitizedGameState, Peeks>();

export function peeksOf(view: SanitizedGameState): Peeks {
  const cached = peeksCache.get(view);
  if (cached) return cached;
  const tiles = new Map<RoomId, string>();
  const tokens = new Map<RoomId, ExplorationEffect>();
  for (const { event } of view.gameLog) {
    if (event.type !== 'ROOM_PEEKED' || event.playerId !== view.viewerId) continue;
    if (event.roomDefinitionId !== null) tiles.set(event.roomId, event.roomDefinitionId);
    if (event.effect !== null) tokens.set(event.roomId, event.effect);
  }
  const peeks = { tiles, tokens };
  peeksCache.set(view, peeks);
  return peeks;
}
