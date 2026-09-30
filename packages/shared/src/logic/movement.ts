import type { InterruptEvent, NoiseRollMode } from '../types/interrupts.js';
import type { CarefulMoveChosenCorridor, RoomId } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import { isPlayerInCombat } from './combatStatus.js';
import { appendGameLog } from './gameLog.js';
import { enforceRule } from './engineErrors.js';
import { carefulMoveBlock } from './actionRules.js';
import { stepIntoSlimeRoom } from './slimeRoom.js';

export function requireCarefulMoveAllowed(
  state: GameState,
  playerId: string,
  targetRoomId: RoomId,
  chosen: CarefulMoveChosenCorridor,
): void {
  enforceRule(carefulMoveBlock(state, isPlayerInCombat(state, playerId), targetRoomId, chosen));
}

export function movePlayer(
  state: GameState,
  playerId: string,
  targetRoomId: RoomId,
  corridorId: string,
  noise: NoiseRollMode,
): void {
  const player = state.players[playerId];
  const targetRoom = state.ship.rooms[targetRoomId];

  if (!player || !targetRoom) return;

  const oldRoom = state.ship.rooms[player.roomId];

  if (oldRoom) {
    oldRoom.occupantPlayerIds = oldRoom.occupantPlayerIds.filter((id) => id !== playerId);
  }

  targetRoom.occupantPlayerIds = [...targetRoom.occupantPlayerIds, playerId];
  const wasUnexplored = !targetRoom.isExplored;
  player.roomId = targetRoomId;

  appendGameLog(state, {
    type: 'PLAYER_MOVED',
    playerId,
    fromRoomId: oldRoom?.id ?? player.roomId,
    toRoomId: targetRoomId,
    corridorId,
    mode: noise.kind === 'CAREFUL' ? 'CAREFUL' : 'NORMAL',
  });
  stepIntoSlimeRoom(state, playerId, targetRoom);

  const nextInterrupts: InterruptEvent[] = wasUnexplored
    ? [{ type: 'EXPLORE_ROOM_INTERRUPT', playerId, roomId: targetRoomId, corridorId }]
    : [];

  // Режим NONE («Разведка», перемещение Предметами): Движение без кубика Шума.
  // CAREFUL идёт через обычное прерывание: маркер ставит resolveNoiseRoll.
  if (noise.kind !== 'NONE') {
    nextInterrupts.push({ type: 'NOISE_ROLL_INTERRUPT', playerId, roomId: targetRoomId, noise });
  }

  state.interruptQueue = [...state.interruptQueue, ...nextInterrupts];
}
