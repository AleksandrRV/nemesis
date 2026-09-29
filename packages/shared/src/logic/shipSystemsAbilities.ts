import type { RoomAbilityPayload } from '../types/actions.js';
import { ROOM_OPTION } from '../types/cardOptions.js';
import type { RoomState } from '../types/rooms.js';
import type { CourseMarker, EngineNumber, GameState } from '../types/state.js';
import type { EngineInspectionSource } from '../types/shipSystemsLog.js';
import { engineNumberOfRoom, peekRoom, requirePlayer } from './cardEffectsShared.js';
import { EngineError } from './engineErrors.js';
import { appendGameLog } from './gameLog.js';

const ALL_ENGINES: readonly EngineNumber[] = [1, 2, 3];
const COURSE_MARKERS: readonly CourseMarker[] = ['A', 'B', 'C', 'D'];

function inspectEngines(
  state: GameState,
  actorId: string,
  room: RoomState,
  engineNumbers: readonly EngineNumber[],
  source: EngineInspectionSource,
): void {
  const player = requirePlayer(state, actorId);
  for (const engineNumber of engineNumbers) {
    if (!player.inspectedEngines.includes(engineNumber)) player.inspectedEngines.push(engineNumber);
  }
  appendGameLog(state, {
    type: 'ENGINES_INSPECTED',
    playerId: actorId,
    roomId: room.id,
    source,
    engines: engineNumbers.map((engineNumber) => ({
      engineNumber,
      isWorking: state.ship.engines[engineNumber]!.isWorking,
    })),
  });
}

export function inspectEngineInRoom(state: GameState, actorId: string, room: RoomState): void {
  const engineNumber = engineNumberOfRoom(room);
  if (engineNumber === null) {
    throw new EngineError('ENGINE_NOT_HERE', 'Проверить Двигатель можно только в Машинном Отсеке.');
  }
  inspectEngines(state, actorId, room, [engineNumber], 'ENGINE_ROOM');
}

export function inspectAllEngines(state: GameState, actorId: string, room: RoomState): void {
  inspectEngines(state, actorId, room, ALL_ENGINES, 'ENGINE_CONTROL');
}

function isAnyoneInHibernation(state: GameState): boolean {
  return Object.values(state.players).some((player) => player.isInHibernation && !player.isDead);
}

function setCourse(state: GameState, actorId: string, room: RoomState, marker: CourseMarker | undefined): void {
  if (!marker || !COURSE_MARKERS.includes(marker)) {
    throw new EngineError('INVALID_DECISION_OPTION', 'Выберите Координаты A, B, C или D для маркера Курса.');
  }
  if (isAnyoneInHibernation(state)) {
    throw new EngineError('COURSE_CHANGE_FORBIDDEN', 'Курс нельзя изменить, пока кто-то из Персонажей в Анабиозе.');
  }
  if (room.occupantIntruderIds.length > 0) {
    throw new EngineError('COURSE_CHANGE_FORBIDDEN', 'Курс нельзя Установить, если на Мостике есть Чужой.');
  }
  const coordinates = state.ship.coordinates;
  if (coordinates.currentCourseMarker === marker) {
    throw new EngineError('INVALID_DECISION_OPTION', `Маркер Курса уже стоит на Координатах ${marker}.`);
  }
  const fromMarker = coordinates.currentCourseMarker;
  coordinates.currentCourseMarker = marker;
  appendGameLog(state, { type: 'COURSE_SET', playerId: actorId, roomId: room.id, fromMarker, toMarker: marker });
}

function inspectCoordinates(state: GameState, actorId: string, room: RoomState): void {
  requirePlayer(state, actorId).inspectedCoordinates = true;
  appendGameLog(state, {
    type: 'COORDINATES_INSPECTED',
    playerId: actorId,
    roomId: room.id,
    cardId: state.ship.coordinates.cardId,
  });
}

export function operateFlightControl(
  state: GameState,
  actorId: string,
  room: RoomState,
  payload: RoomAbilityPayload,
): void {
  if (payload.option === ROOM_OPTION.CHECK_COORDINATES) return inspectCoordinates(state, actorId, room);
  if (payload.option === ROOM_OPTION.SET_COURSE) return setCourse(state, actorId, room, payload.targetCourseMarker);
  throw new EngineError('INVALID_DECISION_OPTION', 'Мостик: выберите Проверку Координат или Установку Курса.');
}

export function observeUnexploredRoom(state: GameState, actorId: string, payload: RoomAbilityPayload): void {
  peekRoom(state, actorId, payload.targetRoomId, true, 'OBSERVATION_ROOM');
}
