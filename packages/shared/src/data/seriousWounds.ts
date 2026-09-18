import type { SeriousWoundCard } from '../types/cards.js';

export const SERIOUS_WOUND_CARDS: readonly SeriousWoundCard[] = [
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `SERIOUS_WOUND_LEG_${i + 1}`,
    name: 'Травма ноги',
    description: 'С этого момента цена Действия «Побег» равна 2.',
    isTreated: false,
  })),

  ...Array.from({ length: 4 }, (_, i) => ({
    id: `SERIOUS_WOUND_ARM_${i + 1}`,
    name: 'Травма руки',
    description: 'С этого момента цена использования ваших Предметов увеличена на 1.',
    isTreated: false,
  })),

  ...Array.from({ length: 4 }, (_, i) => ({
    id: `SERIOUS_WOUND_BODY_${i + 1}`,
    name: 'Травма спины',
    description: 'В начале Фазы Игроков вы добираете на руку до 4 карт вместо 5.',
    isTreated: false,
  })),

  ...Array.from({ length: 4 }, (_, i) => ({
    id: `SERIOUS_WOUND_BLEEDING_${i + 1}`,
    name: 'Кровотечение',
    description: 'Каждый раз, когда вы пасуете во время Фазы Игроков, вы получаете 1 Лёгкую Травму.',
    isTreated: false,
  })),
];
