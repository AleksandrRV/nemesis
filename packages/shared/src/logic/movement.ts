import type { InterruptEvent, NoiseRollMode } from '../types/interrupts.js';
import type { CarefulMoveChosenCorridor, RoomId } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import { isPlayerInCombat } from './combatStatus.js';
import { appendGameLog } from './gameLog.js';
import { EngineError } from './engineErrors.js';
import { corridorsLeadingInto, roomHasTechnicalEntrance, corridorNumbersOf } from './shipGraphQueries.js';

function chosenPlaceHasNoise(state: GameState, chosen: CarefulMoveChosenCorridor, targetRoomId?: RoomId): boolean {
  if (chosen.kind === 'TECHNICAL_CORRIDOR') return state.ship.technicalCorridorNoise;

  if (chosen.kind === 'CORRIDOR_NUMBER') {
    if (!targetRoomId) return false;
    const leading = corridorsLeadingInto(state, targetRoomId);
    const matching = leading.filter((candidate) =>
      corridorNumbersOf(candidate, targetRoomId).includes(chosen.corridorNumber),
    );
    // Свободно, если хотя бы в одном коридоре с этим номером ещё нет шума
    return matching.length > 0 && matching.every((c) => c.hasNoise);
  }

  const corridor = state.ship.corridors[chosen.corridorId];

  return corridor ? corridor.hasNoise : true;
}

export function requireCarefulMoveAllowed(
  state: GameState,
  playerId: string,
  targetRoomId: RoomId,
  chosen: CarefulMoveChosenCorridor,
): void {
  const player = state.players[playerId];

  if (player && isPlayerInCombat(state, playerId)) {
    throw new EngineError(
      'CAREFUL_MOVE_IN_COMBAT',
      '«Осторожное движение» нельзя выполнять, находясь в Бою (стр. 13).',
    );
  }
  const leading = corridorsLeadingInto(state, targetRoomId);

  if (chosen.kind === 'TECHNICAL_CORRIDOR') {
    if (!roomHasTechnicalEntrance(targetRoomId)) {
      throw new EngineError(
        'CAREFUL_MOVE_BAD_CHOICE',
        `В отсеке ${targetRoomId} нет Входа в Технические Коридоры: туда нельзя положить маркер (стр. 16).`,
      );
    }
  } else if (chosen.kind === 'CORRIDOR_NUMBER') {
    const matching = leading.filter((candidate) =>
      corridorNumbersOf(candidate, targetRoomId).includes(chosen.corridorNumber),
    );
    if (matching.length === 0) {
      throw new EngineError(
        'CAREFUL_MOVE_BAD_CHOICE',
        `Номер коридора ${chosen.corridorNumber} не ведет в отсек ${targetRoomId} (стр. 13).`,
      );
    }
  } else if (!leading.some((corridor) => corridor.id === chosen.corridorId)) {
    throw new EngineError(
      'CAREFUL_MOVE_BAD_CHOICE',
      `Коридор ${chosen.corridorId} не ведёт в отсек ${targetRoomId} (стр. 13).`,
    );
  }

  const freeCorridor = leading.some((corridor) => !corridor.hasNoise);
  const freeTechnical = roomHasTechnicalEntrance(targetRoomId) && !state.ship.technicalCorridorNoise;

  if (!freeCorridor && !freeTechnical) {
    throw new EngineError(
      'CAREFUL_MOVE_NO_FREE_CORRIDOR',
      `В каждом Коридоре, ведущем в отсек ${targetRoomId}, уже есть маркер Шума: «Осторожное движение» невозможно (стр. 13).`,
    );
  }

  if (chosenPlaceHasNoise(state, chosen, targetRoomId)) {
    throw new EngineError(
      'CAREFUL_MOVE_NO_FREE_CORRIDOR',
      'Выбранный Коридор уже помечен маркером Шума: выберите другой (стр. 13).',
    );
  }
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

  const nextInterrupts: InterruptEvent[] = wasUnexplored
    ? [{ type: 'EXPLORE_ROOM_INTERRUPT', playerId, roomId: targetRoomId, corridorId }]
    : [];

  state.interruptQueue = [
    ...state.interruptQueue,
    ...nextInterrupts,
    { type: 'NOISE_ROLL_INTERRUPT', playerId, roomId: targetRoomId, noise },
  ];
}
