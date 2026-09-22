import { livingPlayersInRoom } from './intruderPlacement.js';
import type { InterruptEvent } from '../types/interrupts.js';
import type { RoomId } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import { NOISE_DIE_FACES, type NoiseDieFace } from '../data/noiseDie.js';
import { appendGameLog } from './gameLog.js';
import { drawFromStream } from '../utils/rng.js';
import { EngineError } from './engineErrors.js';
import { corridorsLeadingInto, findNoiseTarget } from './shipGraphQueries.js';
import { placeCarefulNoiseMarker, placeNoiseMarker, fillRoomNoise } from './noiseMarkers.js';

export function resolveNoiseRoll(
  state: GameState,
  interrupt: Extract<InterruptEvent, { type: 'NOISE_ROLL_INTERRUPT' }>,
): void {
  const room = state.ship.rooms[interrupt.roomId];

  if (!room) {
    throw new EngineError('UNKNOWN_ROOM', `Шум ссылается на несуществующий отсек ${interrupt.roomId}.`);
  }

  const player = state.players[interrupt.playerId];

  if (!player) {
    throw new EngineError('UNKNOWN_PLAYER', `Шум ссылается на неизвестного персонажа: ${interrupt.playerId}.`);
  }

  const tokenEffect = room.explorationEffect;
  room.explorationEffect = null;

  const hasCompany =
    room.occupantPlayerIds.some((occupantId) => occupantId !== interrupt.playerId) ||
    room.occupantIntruderIds.length > 0;

  if (hasCompany) {
    appendGameLog(state, {
      type: 'NOISE_SKIPPED',
      playerId: interrupt.playerId,
      roomId: interrupt.roomId,
      reason: 'COMPANION',
    });
    return;
  }

  if (interrupt.noise.kind === 'CAREFUL') {
    placeCarefulNoiseMarker(state, interrupt.playerId, interrupt.roomId, interrupt.noise.chosen);
    return;
  }

  if (tokenEffect === 'DANGER' || (tokenEffect === 'SILENCE' && player.hasSlime)) {
    appendGameLog(state, {
      type: 'EXPLORATION_EFFECT_RESOLVED',
      playerId: interrupt.playerId,
      roomId: interrupt.roomId,
      effect: tokenEffect === 'DANGER' ? 'DANGER' : 'SILENCE',
      outcome: 'DANGER_TRIGGERED',
    });
    resolveDanger(state, interrupt.roomId, interrupt.playerId);
    return;
  }

  if (tokenEffect === 'SILENCE') {
    appendGameLog(state, {
      type: 'EXPLORATION_EFFECT_RESOLVED',
      playerId: interrupt.playerId,
      roomId: interrupt.roomId,
      effect: 'SILENCE',
      outcome: 'SILENCE_RESOLVED',
    });
    appendGameLog(state, {
      type: 'NOISE_SKIPPED',
      playerId: interrupt.playerId,
      roomId: interrupt.roomId,
      reason: 'EXPLORATION_SILENCE',
    });
    return;
  }

  const face = rollNoiseDie(state);

  appendGameLog(state, {
    type: 'NOISE_ROLLED',
    playerId: interrupt.playerId,
    roomId: interrupt.roomId,
    result: face,
  });

  applyNoiseFace(state, interrupt.playerId, interrupt.roomId, face);
}

function applyNoiseFace(state: GameState, playerId: string, roomId: RoomId, face: NoiseDieFace): void {
  const player = state.players[playerId];

  if (!player) {
    throw new EngineError('UNKNOWN_PLAYER', `Грань кубика Шума ссылается на неизвестного персонажа: ${playerId}.`);
  }

  if (face.kind === 'SILENCE') {
    if (player.hasSlime) {
      appendGameLog(state, {
        type: 'EXPLORATION_EFFECT_RESOLVED',
        playerId,
        roomId,
        effect: 'SILENCE',
        outcome: 'DANGER_TRIGGERED',
      });
      resolveDanger(state, roomId, playerId);
    } else {
      appendGameLog(state, { type: 'NOISE_SKIPPED', playerId, roomId, reason: 'NOISE_SILENCE' });
    }

    return;
  }

  if (face.kind === 'DANGER') {
    appendGameLog(state, {
      type: 'EXPLORATION_EFFECT_RESOLVED',
      playerId,
      roomId,
      effect: 'DANGER',
      outcome: 'DANGER_TRIGGERED',
    });
    resolveDanger(state, roomId, playerId);
    return;
  }

  const target = findNoiseTarget(state, roomId, face.number);

  if (target.kind === 'UNMAPPED') {
    // Решение владельца проекта (17.09.2026): пока номера выходов отсеков
    // не сверены с полем (пакет источника, `ship-graph-corridors`), бросок
    // на номер, которого нет среди выходов отсека, разыгрывается как
    // «Тишина» — включая превращение Слизью в «Опасность» (стр. 17).
    appendGameLog(state, { type: 'NOISE_SKIPPED', playerId, roomId, reason: 'UNMAPPED_EXIT' });

    if (player.hasSlime) {
      appendGameLog(state, {
        type: 'EXPLORATION_EFFECT_RESOLVED',
        playerId,
        roomId,
        effect: 'SILENCE',
        outcome: 'DANGER_TRIGGERED',
      });
      resolveDanger(state, roomId, playerId);
    }

    return;
  }

  placeNoiseMarker(state, playerId, roomId, target, 'ROLL');
}

function resolveDanger(state: GameState, roomId: RoomId, playerId: string): void {
  const paths = corridorsLeadingInto(state, roomId);
  const neighbours = new Set(paths.map((path) => (path.fromRoomId === roomId ? path.toRoomId : path.fromRoomId)));
  let attracted = false;
  for (const fromRoomId of neighbours) {
    if (livingPlayersInRoom(state, fromRoomId).length > 0) continue;
    const intruders = state.intrudersPool.boardTokens.filter((intruder) => intruder.roomId === fromRoomId);
    if (intruders.length === 0) continue;
    attracted = true;
    const routes = paths.filter((path) => path.fromRoomId === fromRoomId || path.toRoomId === fromRoomId);
    const route = routes.find((path) => path.doorState !== 'CLOSED') ?? routes[0]!;
    const intruderIds = intruders.map((intruder) => intruder.id);
    if (route.doorState === 'CLOSED') {
      route.doorState = 'DESTROYED';
      appendGameLog(state, { type: 'INTRUDERS_BLOCKED_BY_DOOR', intruderIds, corridorId: route.id, source: 'DANGER' });
      continue;
    }
    for (const intruder of intruders) intruder.roomId = roomId;
    const fromRoom = state.ship.rooms[fromRoomId]!;
    fromRoom.occupantIntruderIds = fromRoom.occupantIntruderIds.filter((id) => !intruderIds.includes(id));
    state.ship.rooms[roomId]!.occupantIntruderIds.push(...intruderIds);
    appendGameLog(state, { type: 'INTRUDERS_MOVED', intruderIds, fromRoomId, toRoomId: roomId });
  }
  if (!attracted) fillRoomNoise(state, playerId, roomId, 'DANGER');
}

function rollNoiseDie(state: GameState): NoiseDieFace {
  const drawIndex = state.meta.rngDraws.noise;
  const value = drawFromStream(state.meta.seed, 'noise', drawIndex);
  const faceIndex = Math.min(NOISE_DIE_FACES.length - 1, Math.floor(value * NOISE_DIE_FACES.length));

  state.meta.rngDraws.noise = drawIndex + 1;

  return NOISE_DIE_FACES[faceIndex]!;
}
