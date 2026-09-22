import type { GameLogNoiseReason } from '../types/log.js';
import type { CarefulMoveChosenCorridor, RoomId } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import { appendGameLog } from './gameLog.js';
import { noiseMarkersInSupply } from './markers.js';
import { EngineError } from './engineErrors.js';
import {
  requireCorridor,
  corridorsLeadingInto,
  corridorNumbersOf,
  roomHasTechnicalEntrance,
} from './shipGraphQueries.js';
import type { NoiseTarget } from './shipGraphQueries.js';

export function placeCarefulNoiseMarker(
  state: GameState,
  playerId: string,
  roomId: RoomId,
  chosen: CarefulMoveChosenCorridor,
): void {
  if (chosen.kind === 'TECHNICAL_CORRIDOR') {
    if (state.ship.technicalCorridorNoise) {
      throw new EngineError(
        'CAREFUL_MOVE_NO_FREE_CORRIDOR',
        'На поле Технических Коридоров уже есть маркер Шума: выберите другой Коридор (стр. 16).',
      );
    }

    requireNoiseMarkerSupply(state);
    state.ship.technicalCorridorNoise = true;
    appendGameLog(state, {
      type: 'NOISE_MARKER_PLACED',
      playerId,
      roomId,
      target: { kind: 'TECHNICAL_CORRIDOR' },
      reason: 'CAREFUL',
    });
    return;
  }

  if (chosen.kind === 'CORRIDOR_NUMBER') {
    const leading = corridorsLeadingInto(state, roomId);
    const matching = leading.filter((candidate) =>
      corridorNumbersOf(candidate, roomId).includes(chosen.corridorNumber),
    );

    if (matching.length === 0) {
      throw new EngineError(
        'CAREFUL_MOVE_BAD_CHOICE',
        `Коридоров с номером ${chosen.corridorNumber} нет в отсеке ${roomId}.`,
      );
    }

    // Если коридоров с таким номером несколько - шум добавляется во все коридоры с таким номером (без дублирования Контакта, если уже есть шум)
    for (const corridor of matching) {
      if (!corridor.hasNoise) {
        requireNoiseMarkerSupply(state);
        corridor.hasNoise = true;
        appendGameLog(state, {
          type: 'NOISE_MARKER_PLACED',
          playerId,
          roomId,
          target: { kind: 'CORRIDOR', corridorId: corridor.id },
          reason: 'CAREFUL',
        });
      }
    }
    return;
  }

  const corridor = requireCorridor(state, chosen.corridorId);

  if (!corridorsLeadingInto(state, roomId).some((candidate) => candidate.id === corridor.id)) {
    throw new EngineError('CAREFUL_MOVE_BAD_CHOICE', `Коридор ${corridor.id} не ведёт в отсек ${roomId} (стр. 13).`);
  }

  if (corridor.hasNoise) {
    throw new EngineError(
      'CAREFUL_MOVE_NO_FREE_CORRIDOR',
      `В Коридоре ${corridor.id} уже есть маркер Шума: выберите другой (стр. 13).`,
    );
  }

  requireNoiseMarkerSupply(state);
  corridor.hasNoise = true;
  appendGameLog(state, {
    type: 'NOISE_MARKER_PLACED',
    playerId,
    roomId,
    target: { kind: 'CORRIDOR', corridorId: corridor.id },
    reason: 'CAREFUL',
  });
}

export function placeNoiseMarker(
  state: GameState,
  playerId: string,
  roomId: RoomId,
  target: Exclude<NoiseTarget, { kind: 'UNMAPPED' }>,
  reason: GameLogNoiseReason,
): void {
  if (target.kind === 'TECHNICAL_CORRIDOR') {
    if (state.ship.technicalCorridorNoise) {
      state.interruptQueue.unshift({ type: 'CONTACT_INTERRUPT', playerId, roomId, source: 'NOISE' });
      return;
    }

    requireNoiseMarkerSupply(state);
    state.ship.technicalCorridorNoise = true;
    appendGameLog(state, {
      type: 'NOISE_MARKER_PLACED',
      playerId,
      roomId,
      target: { kind: 'TECHNICAL_CORRIDOR' },
      reason,
    });
    return;
  }

  if (target.corridor.hasNoise) {
    state.interruptQueue.unshift({ type: 'CONTACT_INTERRUPT', playerId, roomId, source: 'NOISE' });
    return;
  }

  requireNoiseMarkerSupply(state);
  target.corridor.hasNoise = true;
  appendGameLog(state, {
    type: 'NOISE_MARKER_PLACED',
    playerId,
    roomId,
    target: { kind: 'CORRIDOR', corridorId: target.corridor.id },
    reason,
  });
}

export function requireNoiseMarkerSupply(state: GameState): void {
  if (noiseMarkersInSupply(state.ship) <= 0) {
    throw new EngineError(
      'MARKER_SUPPLY_EXHAUSTED',
      'В запасе не осталось маркеров Шума: книга правил не описывает этот случай (стр. 3, 15–16).',
    );
  }
}

export function clearRoomNoise(state: GameState, roomId: RoomId): void {
  for (const corridor of corridorsLeadingInto(state, roomId)) corridor.hasNoise = false;
  if (roomHasTechnicalEntrance(roomId)) state.ship.technicalCorridorNoise = false;
}

export function fillRoomNoise(state: GameState, playerId: string, roomId: RoomId, reason: 'BLANK' | 'DANGER'): void {
  const freeCorridors = corridorsLeadingInto(state, roomId).filter((corridor) => !corridor.hasNoise);
  const needsTechnical = roomHasTechnicalEntrance(roomId) && !state.ship.technicalCorridorNoise;
  if (freeCorridors.length + Number(needsTechnical) > noiseMarkersInSupply(state.ship)) {
    throw new EngineError('MARKER_SUPPLY_EXHAUSTED', 'В запасе недостаточно маркеров Шума.');
  }
  for (const corridor of freeCorridors)
    placeNoiseMarker(state, playerId, roomId, { kind: 'CORRIDOR', corridor }, reason);
  if (needsTechnical) placeNoiseMarker(state, playerId, roomId, { kind: 'TECHNICAL_CORRIDOR' }, reason);
}
