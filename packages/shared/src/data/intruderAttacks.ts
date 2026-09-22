/**
 * Колода Атак Чужих (Intruder Attack Deck): точный состав 20 карт.
 *
 * Происхождение данных: doc/data/INTRUDERS.md §4 (проверено по физическим компонентам).
 * Колода используется для проверки стойкости Чужого при нанесении ран.
 */

import type { IntruderAttackCardDef } from '../types/cards.js';

/** Полный состав колоды Атак Чужих: 20 карт (doc/data/INTRUDERS.md §4). */
export const INTRUDER_ATTACK_CARDS: readonly IntruderAttackCardDef[] = [
  // Царапина (4 карты)
  {
    id: 'intruder-attack-scratch-2-retreat',
    name: 'ЦАРАПИНА',
    toughness: 2,
    hasRetreat: true,
    applicableTypes: ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'],
    effectName: 'ЦАРАПИНА',
    effectDescription: 'Атакованный Персонаж получает 1 Легкую Травму и 1 карту Заражения.',
  },
  {
    id: 'intruder-attack-scratch-3',
    name: 'ЦАРАПИНА',
    toughness: 3,
    hasRetreat: false,
    applicableTypes: ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'],
    effectName: 'ЦАРАПИНА',
    effectDescription: 'Атакованный Персонаж получает 1 Легкую Травму и 1 карту Заражения.',
  },
  {
    id: 'intruder-attack-scratch-5',
    name: 'ЦАРАПИНА',
    toughness: 5,
    hasRetreat: false,
    applicableTypes: ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'],
    effectName: 'ЦАРАПИНА',
    effectDescription: 'Атакованный Персонаж получает 1 Легкую Травму и 1 карту Заражения.',
  },
  {
    id: 'intruder-attack-scratch-6-a',
    name: 'ЦАРАПИНА',
    toughness: 6,
    hasRetreat: false,
    applicableTypes: ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'],
    effectName: 'ЦАРАПИНА',
    effectDescription: 'Атакованный Персонаж получает 1 Легкую Травму и 1 карту Заражения.',
  },
  // Укус (4 карты)
  {
    id: 'intruder-attack-bite-2-retreat',
    name: 'УКУС',
    toughness: 2,
    hasRetreat: true,
    applicableTypes: ['ADULT', 'BREEDER', 'QUEEN'],
    effectName: 'УКУС',
    effectDescription: 'Если у Персонажа есть ≥ 2 Тяжелые Травмы, он умирает. Иначе получает 1 Тяжелую Травму.',
  },
  {
    id: 'intruder-attack-bite-4-retreat',
    name: 'УКУС',
    toughness: 4,
    hasRetreat: true,
    applicableTypes: ['ADULT', 'BREEDER', 'QUEEN'],
    effectName: 'УКУС',
    effectDescription: 'Если у Персонажа есть ≥ 2 Тяжелые Травмы, он умирает. Иначе получает 1 Тяжелую Травму.',
  },
  {
    id: 'intruder-attack-bite-4',
    name: 'УКУС',
    toughness: 4,
    hasRetreat: false,
    applicableTypes: ['ADULT', 'BREEDER', 'QUEEN'],
    effectName: 'УКУС',
    effectDescription: 'Если у Персонажа есть ≥ 2 Тяжелые Травмы, он умирает. Иначе получает 1 Тяжелую Травму.',
  },
  {
    id: 'intruder-attack-bite-6-a',
    name: 'УКУС',
    toughness: 6,
    hasRetreat: false,
    applicableTypes: ['ADULT', 'BREEDER', 'QUEEN'],
    effectName: 'УКУС',
    effectDescription: 'Если у Персонажа есть ≥ 2 Тяжелые Травмы, он умирает. Иначе получает 1 Тяжелую Травму.',
  },
  // Атака когтями (4 карты)
  {
    id: 'intruder-attack-claw-3',
    name: 'АТАКА КОГТЯМИ',
    toughness: 3,
    hasRetreat: false,
    applicableTypes: ['ADULT', 'BREEDER', 'QUEEN'],
    effectName: 'АТАКА КОГТЯМИ',
    effectDescription: 'Атакованный Персонаж получает 2 Легкие Травмы и 1 карту Заражения.',
  },
  {
    id: 'intruder-attack-claw-4-a',
    name: 'АТАКА КОГТЯМИ',
    toughness: 4,
    hasRetreat: false,
    applicableTypes: ['ADULT', 'BREEDER', 'QUEEN'],
    effectName: 'АТАКА КОГТЯМИ',
    effectDescription: 'Атакованный Персонаж получает 2 Легкие Травмы и 1 карту Заражения.',
  },
  {
    id: 'intruder-attack-claw-4-retreat',
    name: 'АТАКА КОГТЯМИ',
    toughness: 4,
    hasRetreat: true,
    applicableTypes: ['ADULT', 'BREEDER', 'QUEEN'],
    effectName: 'АТАКА КОГТЯМИ',
    effectDescription: 'Атакованный Персонаж получает 2 Легкие Травмы и 1 карту Заражения.',
  },
  {
    id: 'intruder-attack-claw-5-retreat',
    name: 'АТАКА КОГТЯМИ',
    toughness: 5,
    hasRetreat: true,
    applicableTypes: ['ADULT', 'BREEDER', 'QUEEN'],
    effectName: 'АТАКА КОГТЯМИ',
    effectDescription: 'Атакованный Персонаж получает 2 Легкие Травмы и 1 карту Заражения.',
  },
  // Атака хвостом (2 карты)
  {
    id: 'intruder-attack-tail-2',
    name: 'АТАКА ХВОСТОМ',
    toughness: 2,
    hasRetreat: false,
    applicableTypes: ['QUEEN'],
    effectName: 'АТАКА ХВОСТОМ',
    effectDescription: 'Если у Персонажа есть ≥ 1 Тяжелая Травма, он умирает. Иначе получает 1 Тяжелую Травму.',
  },
  {
    id: 'intruder-attack-tail-5',
    name: 'АТАКА ХВОСТОМ',
    toughness: 5,
    hasRetreat: false,
    applicableTypes: ['QUEEN'],
    effectName: 'АТАКА ХВОСТОМ',
    effectDescription: 'Если у Персонажа есть ≥ 1 Тяжелая Травма, он умирает. Иначе получает 1 Тяжелую Травму.',
  },
  // Уникальные эффекты (6 карт)
  {
    id: 'intruder-attack-transformation-4',
    name: 'ТРАНСФОРМАЦИЯ',
    toughness: 4,
    hasRetreat: false,
    applicableTypes: ['CREEPER'],
    effectName: 'ТРАНСФОРМАЦИЯ',
    effectDescription: 'Замените Крипера на Трутня. Если у Игрока нет карт на Руке, Трутень проводит Внезапную Атаку.',
  },
  {
    id: 'intruder-attack-transformation-5',
    name: 'ТРАНСФОРМАЦИЯ',
    toughness: 5,
    hasRetreat: false,
    applicableTypes: ['CREEPER'],
    effectName: 'ТРАНСФОРМАЦИЯ',
    effectDescription: 'Замените Крипера на Трутня. Если у Игрока нет карт на Руке, Трутень проводит Внезапную Атаку.',
  },
  {
    id: 'intruder-attack-rage-3',
    name: 'ЯРОСТЬ',
    toughness: 3,
    hasRetreat: false,
    applicableTypes: ['BREEDER', 'QUEEN'],
    effectName: 'ЯРОСТЬ',
    effectDescription:
      'Каждый Персонаж в Комнате, у которого есть ≥ 2 Тяжелые Травмы, умирает. Остальные получают 1 Тяжелую Травму.',
  },
  {
    id: 'intruder-attack-rage-4',
    name: 'ЯРОСТЬ',
    toughness: 4,
    hasRetreat: false,
    applicableTypes: ['BREEDER', 'QUEEN'],
    effectName: 'ЯРОСТЬ',
    effectDescription:
      'Каждый Персонаж в Комнате, у которого есть ≥ 2 Тяжелые Травмы, умирает. Остальные получают 1 Тяжелую Травму.',
  },
  {
    id: 'intruder-attack-slime-5',
    name: 'СЛИЗЬ',
    toughness: 5,
    hasRetreat: false,
    applicableTypes: ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'],
    effectName: 'СЛИЗЬ',
    effectDescription: 'Атакованный Персонаж получает маркер Слизи и 1 карту Заражения.',
  },
  {
    id: 'intruder-attack-call-3',
    name: 'ЗОВ',
    toughness: 3,
    hasRetreat: false,
    applicableTypes: ['CREEPER', 'QUEEN'],
    effectName: 'ЗОВ',
    effectDescription:
      'Вытяните 1 жетон из Пула Чужих и поместите его в эту Комнату. Он не проводит Внезапных Атак и не атакует в этой Фазе.',
  },
] as const;
