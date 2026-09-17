import type { BoardObject, CharacterClass } from '../types/entities.js';
import type { Destination } from '../types/state.js';

/** Число Спасательных Капсул в партии по числу игроков (книга правил, стр. 6, шаг 7). */
export const ESCAPE_PODS_BY_PLAYER_COUNT: Record<number, number> = {
  1: 2,
  2: 2,
  3: 3,
  4: 3,
  5: 4,
};

/** Жетоны Спасательных Капсул, которые могут попасть в партию (стр. 6, шаг 7). */
export const ESCAPE_POD_NUMBERS = [1, 2, 3, 4];

/**
 * Пункты назначения карты Координат: случайная карта определяет, куда прыгнет
 * корабль (стр. 6, шаг 5; стр. 11, проверка Координат в конце игры).
 */
export const COORDINATE_DESTINATIONS: Destination[] = ['EARTH', 'MARS', 'DEEP_SPACE_1', 'DEEP_SPACE_2'];

/** Мест в одной Спасательной Капсуле (стр. 26). */
export const ESCAPE_POD_CAPACITY = 2;

/** Слотов рук у персонажа под Тяжёлые предметы и Объекты (GDD §2.2, стр. 22). */
export const HAND_SLOT_COUNT = 2;

/** Количество квестовых предметов персонажа (GDD §2.2, стр. 21). */
export const QUEST_ITEM_COUNT = 2;

/** Взрослых Особей в Пуле Чужих: 3 базовых + 1 за каждого игрока (стр. 6, шаг 10). */
export const BASE_ADULT_COUNT = 3;

/** Партию можно собрать на 1–5 игроков: на это рассчитаны жетоны и капсулы. */
export const MIN_PLAYER_COUNT = 1;
export const MAX_PLAYER_COUNT = 5;

export interface CharacterPreset {
  characterClass: CharacterClass;
  name: string;
}

/** Персонажи базовой игры в порядке выбора для подготовки партии (GDD §2.2). */
export const CHARACTERS: CharacterPreset[] = [
  { characterClass: 'CAPTAIN', name: 'Капитан' },
  { characterClass: 'PILOT', name: 'Пилот' },
  { characterClass: 'SCIENTIST', name: 'Учёный' },
  { characterClass: 'SCOUT', name: 'Скаут' },
  { characterClass: 'SOLDIER', name: 'Солдат' },
  { characterClass: 'MECHANIC', name: 'Механик' },
];

/** Слотов Слабостей на Планшете Чужих: 3 карты из 8 (стр. 7, шаг 9; стр. 21). */
export const WEAKNESS_SLOT_COUNT = 3;

/** Слоты Планшета Чужих: по одному слоту на каждый тип Объекта (стр. 6, шаг 9; стр. 21). */
export const WEAKNESS_SLOT_OBJECT_KINDS: BoardObject['kind'][] = ['CORPSE', 'EGG', 'INTRUDER_REMAINS'];
