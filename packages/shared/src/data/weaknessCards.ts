import type { WeaknessCard } from '../types/cards.js';

// Источник текстов: doc/data/INTRUDERS.md §6 «СИСТЕМА СЛАБОСТЕЙ».
// В транскрипте 7 карт, книга говорит о 8 — восьмая карта в документе
// отсутствует и будет добавлена, когда появится её текст. Эффекты раскрытых
// Слабостей движок пока не применяет (будущий этап за пределами 0.4.0):
// Шаг 6 требует только раздачу и переворот карт.
export const WEAKNESS_CARDS: readonly WeaknessCard[] = [
  {
    id: 'WEAKNESS_VULNERABLE_SPOTS',
    name: 'Уязвимые места',
    description: 'Символ Силуэтов на кубике Боя = 1 Рана по Взрослым.',
    isRevealed: false,
  },
  {
    id: 'WEAKNESS_FIRE_VULNERABILITY',
    name: 'Уязвимость к огню',
    description: 'Урон от Огня наносит 1 доп. Рану.',
    isRevealed: false,
  },
  {
    id: 'WEAKNESS_DANGER_REACTION',
    name: 'Реакция на опасность',
    description: 'Число проверки Внезапной Атаки снижено на 1 (минимум 1).',
    isRevealed: false,
  },
  {
    id: 'WEAKNESS_ENERGY_VULNERABILITY',
    name: 'Уязвимость к энергии',
    description: 'Энергооружие наносит 1 доп. Рану.',
    isRevealed: false,
  },
  {
    id: 'WEAKNESS_MOVEMENT_HABITS',
    name: 'Повадки движения',
    description: 'Закрытые Двери разрушают только Королева или Трутни (Взрослые останавливаются).',
    isRevealed: false,
  },
  {
    id: 'WEAKNESS_PHOSPHATE_SUSCEPTIBILITY',
    name: 'Восприимчивость к фосфатам',
    description: 'Огнетушитель / Система Пожаротушения заставляет Чужого отступить и наносит ему 1 Рану.',
    isRevealed: false,
  },
  {
    id: 'WEAKNESS_ATTACK_HABITS',
    name: 'Повадки атаки',
    description: 'Атака «Укус» от Взрослой Особи наносит Лёгкую Травму вместо Тяжёлой.',
    isRevealed: false,
  },
];
