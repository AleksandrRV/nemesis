import type { RoomId } from '../types/rooms.js';
import type { GameState } from '../types/state.js';

/**
 * Запасы маркеров и жетонов Дверей (стр. 3 «Игровые компоненты», стр. 17).
 *
 * Происхождение данных: `doc/sources/data-sources.json#marker-supply`
 * и `#door-rules` (проверяется golden-тестом `sources.golden.test.ts`).
 *
 * В коробке: 30 маркеров Шума, 8 маркеров Пожара, 8 маркеров Неисправности
 * и 12 жетонов Дверей. Правила:
 *
 * - в Коридоре не может быть больше 1 маркера Шума (стр. 15); в Технических
 *   Коридорах — как в любых других (стр. 16);
 * - в Комнате не может быть больше 1 маркера Пожара и 1 маркера
 *   Неисправности (стр. 17); Неисправность нельзя выложить в Улей или
 *   в Комнату, покрытую Слизью (стр. 17);
 * - если маркеров Пожара не осталось, корабль взрывается и игра
 *   заканчивается; если не осталось маркеров Неисправности — корабль
 *   повреждается и игра заканчивается (стр. 17);
 * - в одном Коридоре не может быть больше 1 жетона Двери; если запаса
 *   нет — жетон переставляется с поля (стр. 17);
 * - Разрушенная Дверь не может быть снова закрыта (стр. 17).
 *
 * Запасы не хранятся отдельным полем состояния: они выводятся из поля —
 * сколько маркеров уже лежит на корабле, столько и занято. Так сохранение
 * не может разойтись с расстановкой на поле.
 */

/** Маркеров Шума в коробке (стр. 3). */
export const NOISE_MARKER_SUPPLY = 30;

/** Маркеров Пожара в коробке (стр. 3): когда запас пуст, корабль взрывается (стр. 17). */
export const FIRE_MARKER_SUPPLY = 8;

/** Маркеров Неисправности в коробке (стр. 3): когда запас пуст, обшивка не выдерживает (стр. 17). */
export const MALFUNCTION_MARKER_SUPPLY = 8;

/** Жетонов Дверей в коробке (стр. 3). */
export const DOOR_TOKEN_SUPPLY = 12;

/** Больше одного маркера Шума в Коридор не кладётся (стр. 15). */
export const MAX_NOISE_MARKERS_PER_CORRIDOR = 1;

/** Больше одного маркера Пожара или Неисправности в Комнату не кладётся (стр. 17). */
export const MAX_FIRE_MARKERS_PER_ROOM = 1;
export const MAX_MALFUNCTION_MARKERS_PER_ROOM = 1;

/** Больше одного жетона Двери в Коридор не кладётся (стр. 17). */
export const MAX_DOOR_TOKENS_PER_CORRIDOR = 1;

/** Отсеки, куда маркер Неисправности запрещено выкладывать (стр. 17). */
export const MALFUNCTION_FORBIDDEN_ROOM_DEFINITIONS = ['NEST', 'SLIME_ROOM'] as const;

/** Сколько маркеров Шума уже лежит на корабле: Коридоры плюс поле Технических Коридоров (стр. 15–16). */
export function countPlacedNoiseMarkers(ship: GameState['ship']): number {
  const inCorridors = Object.values(ship.corridors).filter((corridor) => corridor.hasNoise).length;

  return inCorridors + (ship.technicalCorridorNoise ? 1 : 0);
}

/** Остаток маркеров Шума в запасе. */
export function noiseMarkersInSupply(ship: GameState['ship']): number {
  return NOISE_MARKER_SUPPLY - countPlacedNoiseMarkers(ship);
}

/** Сколько маркеров Пожара уже лежит в отсеках. */
export function countFireMarkers(ship: GameState['ship']): number {
  return Object.values(ship.rooms).filter((room) => room.hasFire).length;
}

/** Остаток маркеров Пожара в запасе. */
export function fireMarkersInSupply(ship: GameState['ship']): number {
  return FIRE_MARKER_SUPPLY - countFireMarkers(ship);
}

/** Сколько маркеров Неисправности уже лежит в отсеках. */
export function countMalfunctionMarkers(ship: GameState['ship']): number {
  return Object.values(ship.rooms).filter((room) => room.hasMalfunction).length;
}

/** Остаток маркеров Неисправности в запасе. */
export function malfunctionMarkersInSupply(ship: GameState['ship']): number {
  return MALFUNCTION_MARKER_SUPPLY - countMalfunctionMarkers(ship);
}

/** Жетон Двери лежит в Коридоре, если Дверь не Открыта: Закрытая и Разрушенная — это жетоны (стр. 17). */
export function doorTokensOnBoard(ship: GameState['ship']): number {
  return Object.values(ship.corridors).filter((corridor) => corridor.doorState !== 'OPEN').length;
}

/** Остаток жетонов Дверей в запасе: Открытых Дверей в начале партии нет вовсе (стр. 17). */
export function doorTokensInSupply(ship: GameState['ship']): number {
  return Math.max(0, DOOR_TOKEN_SUPPLY - doorTokensOnBoard(ship));
}

/** Результат выкладывания маркера Пожара (стр. 17). */
export type FirePlacement = 'PLACED' | 'ALREADY_PRESENT' | 'UNKNOWN_ROOM' | 'SHIP_EXPLODED';

/**
 * Кладёт маркер Пожара в отсек. Второй маркер в ту же Комнату не кладётся,
 * а пустой запас означает взрыв корабля — это и возвращает результат
 * (состояние партии переводит в «игра окончена» вызывающий движок).
 */
export function placeFireMarker(state: GameState, roomId: RoomId): FirePlacement {
  const room = state.ship.rooms[roomId];

  if (!room) return 'UNKNOWN_ROOM';
  if (room.hasFire) return 'ALREADY_PRESENT';
  if (fireMarkersInSupply(state.ship) <= 0) return 'SHIP_EXPLODED';

  room.hasFire = true;

  return 'PLACED';
}

/** Результат выкладывания маркера Неисправности (стр. 17). */
export type MalfunctionPlacement = 'PLACED' | 'ALREADY_PRESENT' | 'UNKNOWN_ROOM' | 'FORBIDDEN_ROOM' | 'HULL_BREACH';

/**
 * Кладёт маркер Неисправности в отсек. Занятая Комната и запретные отсеки
 * (Улей, Комната со Слизью) — «ничего не происходит», пустой запас — разрыв
 * обшивки (стр. 17).
 */
export function placeMalfunctionMarker(state: GameState, roomId: RoomId): MalfunctionPlacement {
  const room = state.ship.rooms[roomId];

  if (!room) return 'UNKNOWN_ROOM';
  if (room.hasMalfunction) return 'ALREADY_PRESENT';
  if (
    room.definitionId !== null &&
    (MALFUNCTION_FORBIDDEN_ROOM_DEFINITIONS as readonly string[]).includes(room.definitionId)
  ) {
    return 'FORBIDDEN_ROOM';
  }

  if (malfunctionMarkersInSupply(state.ship) <= 0) return 'HULL_BREACH';

  room.hasMalfunction = true;

  return 'PLACED';
}

/** Результат выкладывания жетона Двери (стр. 17). */
export type DoorPlacement =
  'PLACED' | 'ALREADY_CLOSED' | 'UNKNOWN_CORRIDOR' | 'DESTROYED' | 'MOVED_FROM_BOARD' | 'NO_TOKEN_IN_SUPPLY';

/**
 * Закрывает Дверь жетоном из запаса.
 *
 * Разрушенная Дверь — терминальное состояние: жетон в такой Коридор не
 * возвращается и закрыть её снова нельзя (стр. 17). Если запас пуст, жетон
 * переставляется с поля: Коридор, откуда он ушёл, снова становится Открытым
 * (стр. 17). Разрушенные жетоны в перестановке не участвуют — иначе
 * «разрушена» перестала бы быть терминальным состоянием; если свободных
 * закрытых жетонов нет, движок обязан сказать об этом явно.
 */
export function placeDoorToken(state: GameState, corridorId: string): DoorPlacement {
  const corridor = state.ship.corridors[corridorId];

  if (!corridor) return 'UNKNOWN_CORRIDOR';
  if (corridor.doorState === 'DESTROYED') return 'DESTROYED';
  if (corridor.doorState === 'CLOSED') return 'ALREADY_CLOSED';

  if (doorTokensInSupply(state.ship) > 0) {
    corridor.doorState = 'CLOSED';
    return 'PLACED';
  }

  const donor = Object.values(state.ship.corridors).find(
    (candidate) => candidate.id !== corridorId && candidate.doorState === 'CLOSED',
  );

  if (!donor) return 'NO_TOKEN_IN_SUPPLY';

  donor.doorState = 'OPEN';
  corridor.doorState = 'CLOSED';

  return 'MOVED_FROM_BOARD';
}
