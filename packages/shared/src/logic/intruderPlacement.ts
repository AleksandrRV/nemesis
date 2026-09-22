import { INTRUDER_MINIATURE_LIMITS } from '../data/intruderMiniatures.js';
import type { BoardObject, IntruderEntity, IntruderType } from '../types/entities.js';
import type { RoomId } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import { EngineError } from './engineErrors.js';
import { appendGameLog } from './gameLog.js';
import { allocateEntityId } from './stateIds.js';

export function livingPlayersInRoom(state: GameState, roomId: RoomId): string[] {
  return Object.values(state.players)
    .filter(
      (player) => player.roomId === roomId && !player.isDead && !player.isInHibernation && !player.hasEscapedInPod,
    )
    .map((player) => player.id);
}

export function requireIntruder(state: GameState, intruderId: string): IntruderEntity {
  const intruder = state.intrudersPool.boardTokens.find((candidate) => candidate.id === intruderId);
  if (!intruder) throw new EngineError('UNKNOWN_INTRUDER', `Чужого ${intruderId} нет на поле.`);
  return intruder;
}

export function removeIntruder(state: GameState, intruderId: string): void {
  const intruder = requireIntruder(state, intruderId);
  const room = state.ship.rooms[intruder.roomId]!;
  room.occupantIntruderIds = room.occupantIntruderIds.filter((id) => id !== intruderId);
  state.intrudersPool.boardTokens = state.intrudersPool.boardTokens.filter((candidate) => candidate.id !== intruderId);
  delete state.intrudersPool.attackSuppression[intruderId];
}

/**
 * Жетон Останков Чужого на месте смерти — «означающий Объект Останки Чужого»
 * (стр. 20). Личинка Останков не оставляет (стр. 22; вердикт ревью 0.4.0),
 * как и любое другое следствие смерти Чужого: никаких Яиц Королевы.
 */
export function placeIntruderRemains(state: GameState, intruderId: string): BoardObject {
  const intruder = requireIntruder(state, intruderId);
  const remains: BoardObject = {
    id: allocateEntityId(state, 'remains'),
    kind: 'INTRUDER_REMAINS',
    intruderType: intruder.type,
  };
  state.ship.rooms[intruder.roomId]!.objects.push(remains);
  return remains;
}

export function returnTokenToBag(state: GameState, type: IntruderType): boolean {
  const index = state.intrudersPool.supply.findIndex((token) => token.type === type);
  if (index < 0) return false;
  state.intrudersPool.bag.push(state.intrudersPool.supply.splice(index, 1)[0]!);
  return true;
}

export function requireAvailableMiniature(state: GameState, type: IntruderType): void {
  let inUse = state.intrudersPool.boardTokens.filter((intruder) => intruder.type === type).length;
  if (type === 'LARVA') inUse += Object.values(state.players).filter((player) => player.hasLarva).length;
  if (inUse < INTRUDER_MINIATURE_LIMITS[type]) return;

  if (type === 'ADULT') {
    const withdrawing = state.intrudersPool.boardTokens.filter(
      (intruder) => intruder.type === 'ADULT' && livingPlayersInRoom(state, intruder.roomId).length === 0,
    );
    for (const intruder of withdrawing) {
      removeIntruder(state, intruder.id);
      returnTokenToBag(state, 'ADULT');
    }
    if (withdrawing.length > 0 && inUse - withdrawing.length < INTRUDER_MINIATURE_LIMITS.ADULT) {
      appendGameLog(state, { type: 'INTRUDERS_WITHDRAWN', intruderIds: withdrawing.map((intruder) => intruder.id) });
      return;
    }
  }
  throw new EngineError('INTRUDER_MINIATURE_UNAVAILABLE', `Все миниатюры ${type} заняты; свободной миниатюры нет.`);
}

export function placeIntruder(state: GameState, type: IntruderType, roomId: RoomId): IntruderEntity {
  const room = state.ship.rooms[roomId];
  if (!room) throw new EngineError('UNKNOWN_ROOM', `Отсека ${roomId} нет на корабле.`);
  requireAvailableMiniature(state, type);
  const intruder: IntruderEntity = { id: allocateEntityId(state, 'intruder'), type, roomId, woundsCount: 0 };
  state.intrudersPool.boardTokens.push(intruder);
  room.occupantIntruderIds.push(intruder.id);
  return intruder;
}

export function transformCreeper(state: GameState, intruderId: string): void {
  const intruder = requireIntruder(state, intruderId);
  requireAvailableMiniature(state, 'BREEDER');
  intruder.type = 'BREEDER';
  intruder.woundsCount = 0;
  appendGameLog(state, { type: 'INTRUDER_TRANSFORMED', intruderId, roomId: intruder.roomId });
}
