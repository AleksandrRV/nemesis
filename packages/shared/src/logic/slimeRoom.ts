import type { RoomState } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import { appendGameLog } from './gameLog.js';

/** Комната, покрытая Слизью (стр. 25): вошедший получает маркер Слизи, не больше одного (стр. 17). */
export function stepIntoSlimeRoom(state: GameState, playerId: string, room: RoomState): void {
  if (!room.isExplored || room.definitionId !== 'SLIME_ROOM') return;
  const player = state.players[playerId];
  if (!player || player.isDead) return;
  const alreadyHadSlime = player.hasSlime;
  player.hasSlime = true;
  appendGameLog(state, { type: 'SLIME_ROOM_ENTERED', playerId, roomId: room.id, alreadyHadSlime });
}
