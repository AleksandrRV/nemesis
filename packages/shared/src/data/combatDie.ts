/**
 * Кубик Боя (d6 Combat Die): грани и их эффекты (книга правил, стр. 18).
 *
 * Состав граней подтверждён владельцем проекта по физическому кубику:
 * 2 × Промах (MISS), 1 × Хвост (CLAW_HIT), 1 × Силуэт (ALIEN_HIT),
 * 1 × 1 Рана (ONE_HIT), 1 × 2 Раны (TWO_HITS).
 *
 * Грани применяются в зависимости от типа цели:
 * - CLAW_HIT: ранит только Личинку или Крипера
 * - ALIEN_HIT: ранит Личинку, Крипера или Взрослую Особь
 * - ONE_HIT / TWO_HITS: наносят прямой урон любому типу
 */
export type CombatDieFace =
  | { kind: 'MISS' }
  | { kind: 'CLAW_HIT'; description: '1 Рана Личинке или Криперу' }
  | { kind: 'ALIEN_HIT'; description: '1 Рана Личинке, Криперу или Взрослой Особи' }
  | { kind: 'ONE_HIT'; description: '1 Рана любому типу Чужого' }
  | { kind: 'TWO_HITS'; description: '2 Раны любому типу Чужого' };

export const COMBAT_DIE_FACES: readonly CombatDieFace[] = [
  { kind: 'MISS' },
  { kind: 'MISS' },
  { kind: 'CLAW_HIT', description: '1 Рана Личинке или Криперу' },
  { kind: 'ALIEN_HIT', description: '1 Рана Личинке, Криперу или Взрослой Особи' },
  { kind: 'ONE_HIT', description: '1 Рана любому типу Чужого' },
  { kind: 'TWO_HITS', description: '2 Раны любому типу Чужого' },
] as const;
