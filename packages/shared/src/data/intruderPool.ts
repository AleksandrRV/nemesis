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
 * Числа на обороте жетонов (проверка Внезапной атаки, стр. 18) в книге правил
 * не напечатаны: их можно прочитать только с физических жетонов. Текущие
 * значения — зафиксированное допущение, а не проверенный факт; пакет источника
 * помечает его как `UNVERIFIED_COMPONENT`, и golden-тест удерживает допущение
 * от молчаливого изменения.
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

/**
 * Числа на обороте жетонов Взрослых Особей в порядке выкладывания жетонов
 * в коробке (допущение, стр. 18: число сравнивается с картами на руке).
 */
export const ADULT_ESCAPE_NUMBERS: readonly number[] = [2, 3, 4, 4, 1, 2, 3, 1, 2, 3, 4, 1];

/** Числа на обороте остальных жетонов (допущение, стр. 18). Пустой жетон числа не имеет. */
export const ESCAPE_NUMBERS: Record<Exclude<IntruderToken['type'], 'ADULT'>, number> = {
  BLANK: 0,
  LARVA: 1,
  CREEPER: 1,
  BREEDER: 3,
  QUEEN: 4,
};

/** Идентификатор жетона по типу и порядковому номеру: стабилен между партиями с одним сидом. */
function tokenId(type: IntruderToken['type'], index: number): string {
  return type === 'BLANK' ? 'blank' : `${type.toLowerCase()}-${index + 1}`;
}

function escapeNumberFor(type: IntruderToken['type'], index: number): number {
  if (type === 'ADULT') {
    return ADULT_ESCAPE_NUMBERS[index] ?? ADULT_ESCAPE_NUMBERS[ADULT_ESCAPE_NUMBERS.length - 1]!;
  }

  return ESCAPE_NUMBERS[type];
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
 * (стр. 6, шаг 10). Состав мешка зависит только от числа игроков, а порядок
 * внутри мешка задаёт перемешивание в `createInitialGameState`.
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
