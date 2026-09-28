import type { IntruderToken } from '../types/entities.js';

import { BASE_ADULT_COUNT } from './setup.js';

/**
 * Пул Чужих: полный состав жетонов и правила подготовки мешка.
 *
 * Происхождение данных: `doc/sources/data-sources.json#intruder-supply`
 * и `#intruder-bag` (проверяется golden-тестом `sources.golden.test.ts`).
 *
 * Из книги правил: жетонов Чужих 27 — 8 Личинок, 12 Взрослых Особей, 3 Крипера,
 * 2 Трутня, 1 Королева и 1 Пустой (стр. 3, «Игровые компоненты»). В мешок при
 * подготовке уходят 1 Пустой, 4 Личинки, 1 Крипер, 1 Королева и 3 Взрослых
 * Особи плюс по 1 Взрослой за каждого игрока; остальные жетоны лежат рядом
 * с полем и задействуются по ходу партии (стр. 6, шаг 10).
 *
 * Числа на обороте жетонов (проверка Внезапной атаки, стр. 18) прочитаны со
 * скана `rooms.pdf`, стр. 7–8 (`doc/sources/scan-transcript.md` §2).
 */

/** Состав Пула Чужих из коробки: 27 жетонов (стр. 3, «Игровые компоненты»). */
export const INTRUDER_SUPPLY_COMPOSITION: Record<IntruderToken['type'], number> = {
  BLANK: 1,
  LARVA: 8,
  CREEPER: 3,
  ADULT: 12,
  BREEDER: 2,
  QUEEN: 1,
};

/** Сколько Взрослых Особей кладётся в мешок сверх «за каждого игрока» (стр. 6, шаг 10). */
export const BAG_BASE_ADULT_COUNT = BASE_ADULT_COUNT;

/** Сколько Взрослых Особей добавляет каждый игрок (стр. 6, шаг 10). */
export const BAG_ADULTS_PER_PLAYER = 1;

/** Числа на обороте жетонов каждого типа, по одному на жетон; у Пустого числа нет (0). */
export const ESCAPE_NUMBERS_BY_TYPE: Record<IntruderToken['type'], readonly number[]> = {
  BLANK: [0],
  LARVA: [1, 1, 1, 1, 1, 1, 1, 1],
  CREEPER: [1, 1, 1],
  ADULT: [2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4],
  BREEDER: [3, 4],
  QUEEN: [4],
};

/** Идентификатор жетона по типу и порядковому номеру: стабилен между партиями с одним сидом. */
function tokenId(type: IntruderToken['type'], index: number): string {
  return type === 'BLANK' ? 'blank' : `${type.toLowerCase()}-${index + 1}`;
}

function escapeNumberFor(type: IntruderToken['type'], index: number): number {
  const escapeNumber = ESCAPE_NUMBERS_BY_TYPE[type][index];
  if (escapeNumber === undefined) {
    throw new Error(`Нет числа Внезапной атаки для жетона ${type} №${index + 1}.`);
  }
  return escapeNumber;
}

/**
 * Полный набор жетонов Чужих из коробки: 27 штук в порядке, в котором их
 * выкладывают на стол. Мешок при подготовке — это выборка из него, а не
 * отдельный список (стр. 6, шаг 10).
 */
export function createIntruderSupply(): IntruderToken[] {
  return (Object.keys(INTRUDER_SUPPLY_COMPOSITION) as IntruderToken['type'][]).flatMap((type) =>
    Array.from({ length: INTRUDER_SUPPLY_COMPOSITION[type] }, (_, index) => ({
      id: tokenId(type, index),
      type,
      escapeNumber: escapeNumberFor(type, index),
    })),
  );
}

/**
 * Делит полный набор на мешок и запас рядом с полем по правилу подготовки
 * (стр. 6, шаг 10). Состав мешка зависит только от числа игроков; из каждого
 * типа берутся первые жетоны в переданном порядке, поэтому какие именно числа
 * Внезапной атаки попадут в мешок, решает перемешивание в `createInitialGameState`.
 */
export function splitIntruderBag(
  supply: IntruderToken[],
  playerCount: number,
): { bag: IntruderToken[]; supply: IntruderToken[] } {
  const adultsInBag = BAG_BASE_ADULT_COUNT + BAG_ADULTS_PER_PLAYER * playerCount;

  const bagComposition: Record<IntruderToken['type'], number> = {
    BLANK: 1,
    LARVA: 4,
    CREEPER: 1,
    ADULT: adultsInBag,
    BREEDER: 0,
    QUEEN: 1,
  };

  const taken: Record<IntruderToken['type'], number> = {
    BLANK: 0,
    LARVA: 0,
    CREEPER: 0,
    ADULT: 0,
    BREEDER: 0,
    QUEEN: 0,
  };

  const bag: IntruderToken[] = [];
  const rest: IntruderToken[] = [];

  for (const token of supply) {
    if (taken[token.type] < bagComposition[token.type]) {
      taken[token.type] += 1;
      bag.push(token);
      continue;
    }

    rest.push(token);
  }

  return { bag, supply: rest };
}
