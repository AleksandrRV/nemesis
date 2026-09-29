import type { RoomAbilityPayload } from '../types/actions.js';
import type { RoomState } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import { killPlayer } from './characterDamage.js';
import { livingCharactersInRoom, requireTargetRoom } from './cardEffectsShared.js';
import { closeDoorWithToken, corridorsIntoRoom } from './doorControl.js';
import { EngineError } from './engineErrors.js';
import { appendGameLog } from './gameLog.js';
import { placeIntruderRemains, removeIntruder, requireIntruder } from './intruderPlacement.js';
import { getRoomDeckColor } from './search.js';

function requireDecompressionTarget(state: GameState, consoleRoom: RoomState, payload: RoomAbilityPayload): RoomState {
  const target = requireTargetRoom(state, payload.targetRoomId, 'Выберите жёлтую Комнату для Экстренной Декомпрессии.');
  if (target.id === consoleRoom.id) {
    throw new EngineError('DECOMPRESSION_NOT_ALLOWED', 'Декомпрессию запускают в другой Комнате, а не в этой.');
  }
  if (!target.isExplored || getRoomDeckColor(target.definitionId) !== 'YELLOW') {
    throw new EngineError(
      'DECOMPRESSION_NOT_ALLOWED',
      'Экстренную Декомпрессию можно запустить только в жёлтой Комнате.',
    );
  }
  if (target.hasDecompressionToken) {
    throw new EngineError('DECOMPRESSION_NOT_ALLOWED', 'В этой Комнате Декомпрессия уже запущена.');
  }
  if (corridorsIntoRoom(state, target.id).some((corridor) => corridor.doorState === 'DESTROYED')) {
    throw new EngineError(
      'DECOMPRESSION_NOT_ALLOWED',
      'В Коридорах, ведущих в эту Комнату, есть Разрушенная Дверь — Декомпрессия невозможна.',
    );
  }
  return target;
}

export function startDecompression(
  state: GameState,
  actorId: string,
  consoleRoom: RoomState,
  payload: RoomAbilityPayload,
): void {
  const target = requireDecompressionTarget(state, consoleRoom, payload);
  for (const corridor of corridorsIntoRoom(state, target.id)) {
    if (corridor.doorState === 'OPEN') closeDoorWithToken(state, corridor.id);
  }
  const fireRemoved = target.hasFire;
  target.hasFire = false;
  target.hasDecompressionToken = true;
  appendGameLog(state, {
    type: 'DECOMPRESSION_STARTED',
    playerId: actorId,
    roomId: consoleRoom.id,
    targetRoomId: target.id,
    fireRemoved,
  });
}

export function guardDecompression(state: GameState): void {
  for (const room of Object.values(state.ship.rooms)) {
    if (!room.hasDecompressionToken) continue;
    const breach = corridorsIntoRoom(state, room.id).find((corridor) => corridor.doorState !== 'CLOSED');
    if (!breach) continue;
    room.hasDecompressionToken = false;
    appendGameLog(state, { type: 'DECOMPRESSION_CANCELLED', targetRoomId: room.id, corridorId: breach.id });
  }
}

function decompressionStarter(state: GameState, targetRoomId: number): string | null {
  const started = [...state.gameLog]
    .reverse()
    .find((entry) => entry.event.type === 'DECOMPRESSION_STARTED' && entry.event.targetRoomId === targetRoomId);
  return started?.event.type === 'DECOMPRESSION_STARTED' ? started.event.playerId : null;
}

function killIntruderByDecompression(state: GameState, intruderId: string, killerId: string | null): void {
  const intruder = requireIntruder(state, intruderId);
  const remains = intruder.type === 'LARVA' ? null : placeIntruderRemains(state, intruderId);
  removeIntruder(state, intruderId);
  appendGameLog(state, {
    type: 'INTRUDER_KILLED',
    playerId: killerId,
    roomId: intruder.roomId,
    targetIntruderId: intruderId,
    targetType: intruder.type,
    remainsObjectId: remains?.id ?? null,
  });
}

/** Конец Фазы Игроков (стр. 25): при всех закрытых Дверях гибнут все, кто в Комнате. */
export function resolveDecompressions(state: GameState): void {
  guardDecompression(state);
  for (const room of Object.values(state.ship.rooms)) {
    if (!room.hasDecompressionToken) continue;
    const startedBy = decompressionStarter(state, room.id);
    const killedPlayerIds = livingCharactersInRoom(state, room).filter(
      (playerId) => !state.players[playerId]!.isInHibernation,
    );
    const killedIntruderIds = [...room.occupantIntruderIds];
    for (const playerId of killedPlayerIds) killPlayer(state, playerId);
    for (const intruderId of killedIntruderIds) killIntruderByDecompression(state, intruderId, startedBy);
    room.hasDecompressionToken = false;
    appendGameLog(state, {
      type: 'DECOMPRESSION_RESOLVED',
      targetRoomId: room.id,
      startedBy,
      killedPlayerIds,
      killedIntruderIds,
    });
  }
}
