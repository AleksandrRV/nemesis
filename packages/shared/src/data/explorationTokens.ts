import type { ExplorationToken } from '../types/rooms.js';

/**
 * Пул жетонов Исследования — компонент из коробки.
 *
 * Происхождение данных: `doc/sources/data-sources.json#exploration-tokens`
 * (машинно проверяется golden-тестом `sources.golden.test.ts`).
 *
 * Что подтверждено книгой правил: жетонов в коробке ровно 20 (стр. 3,
 * «Игровые компоненты»), при подготовке они тасуются и по одному кладутся
 * на каждый неособый отсек, а оставшиеся возвращаются в коробку
 * (стр. 6, шаг 4). Неособых отсеков 16, поэтому 4 жетона в партии не участвуют.
 *
 * Что взято из внешнего источника: состав 20 жетонов (эффект + число предметов).
 * Числа на жетонах напечатаны только на картоне; в книге правил их нет, поэтому
 * список сверен с переписью компонентов от владельца игры (Reddit r/NemesisCrew,
 * тред «Need a list or picture of the exploration tokens!», 17.02.2020) и ждёт
 * физической сверки — расхождения фиксируются в пакете источника, а не молча.
 *
 * Итог: 20 жетонов, 44 предмета. Раскладка в партии — жеребьёвка этих 20
 * (см. `createInitialGameState`), а не выбор из фиксированных 16.
 */
export const EXPLORATION_TOKENS: ExplorationToken[] = [
  // Неисправность — 8 жетонов (столько же маркеров Неисправности в коробке).
  { itemsCount: 4, effect: 'MALFUNCTION' },
  { itemsCount: 3, effect: 'MALFUNCTION' },
  { itemsCount: 2, effect: 'MALFUNCTION' },
  { itemsCount: 2, effect: 'MALFUNCTION' },
  { itemsCount: 2, effect: 'MALFUNCTION' },
  { itemsCount: 2, effect: 'MALFUNCTION' },
  { itemsCount: 1, effect: 'MALFUNCTION' },
  { itemsCount: 1, effect: 'MALFUNCTION' },

  // Пожар — 2 жетона.
  { itemsCount: 2, effect: 'FIRE' },
  { itemsCount: 1, effect: 'FIRE' },

  // Тишина — 2 жетона.
  { itemsCount: 1, effect: 'SILENCE' },
  { itemsCount: 1, effect: 'SILENCE' },

  // Слизь — 2 жетона.
  { itemsCount: 4, effect: 'SLIME' },
  { itemsCount: 3, effect: 'SLIME' },

  // Опасность — 2 жетона.
  { itemsCount: 3, effect: 'DANGER' },
  { itemsCount: 2, effect: 'DANGER' },

  // Двери — 4 жетона.
  { itemsCount: 4, effect: 'DOORS' },
  { itemsCount: 3, effect: 'DOORS' },
  { itemsCount: 2, effect: 'DOORS' },
  { itemsCount: 1, effect: 'DOORS' },
];
