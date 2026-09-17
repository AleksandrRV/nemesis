import type { DoorState, SanitizedGameState } from '@nemesis/shared';
import { DOOR_STATES, nextDoorState } from '@nemesis/shared';

/**
 * Данные dev-панели: строки коридоров и диагностика партии.
 *
 * Логика вынесена из компонента и живёт отдельно: её можно проверить тестом
 * без DOM, а сам React-компонент остаётся тонким. Порядок переключения Двери
 * берётся из ядра (`nextDoorState`), поэтому подпись «станет закрыта» не может
 * разойтись с тем, что сделает движок.
 */

/** Подписи состояний Двери для панели (стр. 14). */
export const DOOR_LABELS: Record<DoorState, string> = {
  OPEN: 'открыта',
  CLOSED: 'закрыта',
  DESTROYED: 'разрушена',
};

/** Причины окончания партии для панели: правила запасов закрывают игру (стр. 17). */
export const GAME_OVER_REASON_LABELS: Record<NonNullable<SanitizedGameState['meta']['gameOverReason']>, string> = {
  SHIP_EXPLODED: 'корабль взорвался',
  HULL_BREACH: 'разрыв обшивки',
};

/** Разрушенную Дверь снова не закрыть: переключать её некуда (стр. 17). */
export const DOOR_TERMINAL_HINT = 'нельзя переключить';

/** Легенда для заголовка панели: путь Двери до терминального состояния (стр. 17). */
export const DOOR_CYCLE_HINT = `${DOOR_STATES.map((state) => DOOR_LABELS[state]).join(' → ')} (${DOOR_TERMINAL_HINT})`;

export interface CorridorRow {
  id: string;
  fromRoomId: number;
  toRoomId: number;
  doorState: DoorState;
  /** Как Дверь выглядит сейчас. */
  doorLabel: string;
  /** Что произойдёт при нажатии — тем же переходом, что и в движке. */
  nextDoorLabel: string;
  hasNoise: boolean;
}

/** Строки коридоров в порядке обхода корабля: от меньшего номера отсека к большему. */
export function buildCorridorRows(view: SanitizedGameState): CorridorRow[] {
  return Object.values(view.ship.corridors)
    .map((corridor) => ({
      id: corridor.id,
      fromRoomId: corridor.fromRoomId,
      toRoomId: corridor.toRoomId,
      doorState: corridor.doorState,
      doorLabel: DOOR_LABELS[corridor.doorState],
      // Подпись «что будет при нажатии» берётся из того же перехода, что и в
      // движке: Разрушенная Дверь терминальна, и панель не обещает обратного.
      nextDoorLabel:
        corridor.doorState === 'DESTROYED' ? DOOR_TERMINAL_HINT : DOOR_LABELS[nextDoorState(corridor.doorState)],
      hasNoise: corridor.hasNoise,
    }))
    .sort((left, right) => left.fromRoomId - right.fromRoomId || left.toRoomId - right.toRoomId);
}

export interface DoorCounts {
  open: number;
  closed: number;
  destroyed: number;
}

export interface DevDiagnostics {
  seed: string;
  gameId: string;
  schemaVersion: number;
  gameMode: SanitizedGameState['meta']['gameMode'];
  round: number;
  phase: SanitizedGameState['meta']['phase'];
  activePlayerId: string;
  activePlayerName: string;
  timeTrackPosition: number;
  rooms: number;
  unexploredRooms: number;
  corridors: number;
  noiseMarkers: number;
  doors: DoorCounts;
  /** Сколько двигателей этому персонажу всё ещё неизвестно (стр. 26). */
  unknownEngines: number;
  /** Причина окончания партии по правилам запасов; null — партия идёт (стр. 17). */
  gameOverReason: SanitizedGameState['meta']['gameOverReason'];
  /** Открывал ли персонаж карту Координат (стр. 6, шаг 5). */
  coordinatesHidden: boolean;
  /** Сколько чужих наборов тайн скрыто фильтром (инвентарь, цели, квестовые предметы). */
  hiddenSecrets: number;
}

/**
 * Сводка по состоянию глазами игрока. Панель показывает только то, что уже
 * отфильтровано: она инструмент разработки, а не лазейка к скрытым данным.
 */
export function buildDiagnostics(view: SanitizedGameState): DevDiagnostics {
  const rooms = Object.values(view.ship.rooms);
  const corridors = Object.values(view.ship.corridors);
  const engines = Object.values(view.ship.engines);
  const players = Object.values(view.players);
  const activePlayer = view.players[view.meta.activePlayerId];

  return {
    seed: view.meta.seed,
    gameId: view.meta.gameId,
    schemaVersion: view.meta.schemaVersion,
    gameMode: view.meta.gameMode,
    round: view.meta.currentRound,
    phase: view.meta.phase,
    activePlayerId: view.meta.activePlayerId,
    activePlayerName: activePlayer?.name ?? view.meta.activePlayerId,
    timeTrackPosition: view.meta.timeTrackPosition,
    gameOverReason: view.meta.gameOverReason,
    rooms: rooms.length,
    unexploredRooms: rooms.filter((room) => !room.isExplored).length,
    corridors: corridors.length,
    noiseMarkers: corridors.filter((corridor) => corridor.hasNoise).length,
    doors: {
      open: corridors.filter((corridor) => corridor.doorState === 'OPEN').length,
      closed: corridors.filter((corridor) => corridor.doorState === 'CLOSED').length,
      destroyed: corridors.filter((corridor) => corridor.doorState === 'DESTROYED').length,
    },
    unknownEngines: engines.filter((engine) => engine.isWorking === null).length,
    coordinatesHidden: view.ship.coordinates.destination === null,
    hiddenSecrets: players.filter((player) => player.inventory === null).length,
  };
}
