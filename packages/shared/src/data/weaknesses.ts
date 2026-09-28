import type { WeaknessCard } from '../types/cards.js';

/**
 * 8 карт Слабостей Чужих: `cards_additional.pdf`, стр. 13 (`doc/sources/scan-transcript.md` §6).
 * При подготовке партии 3 случайные кладутся рубашкой вверх в слоты Планшета
 * Чужих, остальные убираются в коробку (стр. 6, шаг 9; стр. 21).
 */
export const WEAKNESS_CARDS: readonly WeaknessCard[] = [
  {
    id: 'WK_VULNERABLE_SPOTS',
    name: 'Уязвимые места',
    description: 'При атаке Взрослых Особей выброшенный [Промах] считается [1 Рана].',
    effect: 'VULNERABLE_SPOTS',
    isRevealed: false,
  },
  {
    id: 'WK_FIRE_WEAKNESS',
    name: 'Уязвимость к огню',
    description: 'Когда Чужой получает Рану от Огня, он получает 1 дополнительную Рану.',
    effect: 'FIRE_WEAKNESS',
    isRevealed: false,
  },
  {
    id: 'WK_DANGER_REACTION',
    name: 'Реакция на опасность',
    description: 'Значение проверки Внезапной Атаки снижено на 1 (но не ниже 1).',
    effect: 'DANGER_REACTION',
    isRevealed: false,
  },
  {
    id: 'WK_ENERGY_WEAKNESS',
    name: 'Уязвимость к энергии',
    description: 'Каждая атака из Энергооружия, которая наносит хотя бы 1 Рану, наносит 1 дополнительную Рану.',
    effect: 'ENERGY_WEAKNESS',
    isRevealed: false,
  },
  {
    id: 'WK_MOVEMENT_BEHAVIOR',
    name: 'Повадки движения',
    description: 'Закрытые Двери могут разрушать только Королева или Трутни.',
    effect: 'MOVEMENT_BEHAVIOR',
    isRevealed: false,
  },
  {
    id: 'WK_PHOSPHORUS_SUSCEPTIBILITY',
    name: 'Восприимчивость к фосфатам',
    description: 'Когда на Чужого действует Огнетушитель или Система Пожаротушения, он Отступает и получает 1 Рану.',
    effect: 'PHOSPHORUS_SUSCEPTIBILITY',
    isRevealed: false,
  },
  {
    id: 'WK_ATTACK_BEHAVIOR',
    name: 'Повадки атаки',
    description: 'Если Взрослая особь атакует вас «Укусом», вы получаете Легкую Травму вместо Тяжелой Травмы.',
    effect: 'ATTACK_BEHAVIOR',
    isRevealed: false,
  },
  {
    id: 'WK_EDGE_OF_EXTINCTION',
    name: 'Вид на грани вымирания',
    description: 'Стойкость всех Чужих снижена на 1.',
    effect: 'EDGE_OF_EXTINCTION',
    isRevealed: false,
  },
];

export const WEAKNESS_CARDS_COUNT = WEAKNESS_CARDS.length;
