import type { IntruderAttackCard, IntruderAttackEffect, IntruderAttackerType } from '../types/cards.js';

/** Стрелка Отступления, напечатанная вместо числа стойкости (стр. 20). */
export const RETREAT_ARROW = null;

function attackCopies(
  idPrefix: string,
  name: string,
  effect: IntruderAttackEffect,
  attackerTypes: readonly IntruderAttackerType[],
  description: string,
  toughnessByCopy: readonly (number | typeof RETREAT_ARROW)[],
): IntruderAttackCard[] {
  return toughnessByCopy.map((toughness, index) => ({
    id: toughnessByCopy.length === 1 ? idPrefix : `${idPrefix}_${index + 1}`,
    name,
    effect,
    toughness,
    attackerTypes: [...attackerTypes],
    description,
  }));
}

/** 20 карт Атак Чужих: `cards_base.pdf`, стр. 3, 5, 7 (`doc/sources/scan-transcript.md` §3). */
export const INTRUDER_ATTACK_CARDS: readonly Readonly<IntruderAttackCard>[] = [
  ...attackCopies(
    'IAT_SCRATCH',
    'Царапина',
    'SCRATCH',
    ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'],
    'Атакованный Персонаж получает 1 Легкую Травму и 1 карту Заражения.',
    [2, 3, 5, 6],
  ),
  ...attackCopies(
    'IAT_BITE',
    'Укус',
    'BITE',
    ['ADULT', 'BREEDER', 'QUEEN'],
    'Если у атакованного Персонажа есть хотя бы 2 Тяжелые Травмы, он умирает. Если нет, он получает 1 Тяжелую Травму.',
    [4, 4, 6, RETREAT_ARROW],
  ),
  ...attackCopies(
    'IAT_CLAW',
    'Атака когтями',
    'CLAW_ATTACK',
    ['ADULT', 'BREEDER', 'QUEEN'],
    'Атакованный Персонаж получает 2 Легкие Травмы и 1 карту Заражения.',
    [3, 4, 5, RETREAT_ARROW],
  ),
  ...attackCopies(
    'IAT_TAIL',
    'Атака хвостом',
    'TAIL_ATTACK',
    ['QUEEN'],
    'Если у атакованного Персонажа есть хотя бы 1 Тяжелая Травма, он умирает. Если нет, он получает 1 Тяжелую Травму.',
    [2, 5],
  ),
  ...attackCopies(
    'IAT_TRANSFORMATION',
    'Трансформация',
    'TRANSFORMATION',
    ['CREEPER'],
    'Замените Крипера на Трутня. Если у Игрока нет карт на Руке, Трутень проводит Внезапную Атаку.',
    [4, 5],
  ),
  ...attackCopies(
    'IAT_FRENZY',
    'Ярость',
    'FRENZY',
    ['BREEDER', 'QUEEN'],
    'Каждый Персонаж в Комнате, у которого есть хотя бы 2 Тяжелые Травмы, умирает. Остальные Персонажи в этой Комнате получают 1 Тяжелую Травму.',
    [3, 4],
  ),
  ...attackCopies(
    'IAT_SLIME',
    'Слизь',
    'SLIME',
    ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'],
    'Атакованный Персонаж получает маркер Слизи и 1 карту Заражения.',
    [5],
  ),
  ...attackCopies(
    'IAT_CALL',
    'Зов',
    'CALL',
    ['CREEPER', 'QUEEN'],
    'Вытяните 1 жетон Чужого из Пула Чужих и поместите соответствующего ему Чужого в эту Комнату. Этот Чужой не проводит Внезапных Атак и не атакует в этой Фазе.',
    [3],
  ),
];

export function hasRetreatArrow(card: Pick<IntruderAttackCard, 'toughness'>): boolean {
  return card.toughness === RETREAT_ARROW;
}
