import type { CorridorNumber } from '../types/rooms.js';

/**
 * Кубик Шума (d10): грани и их эффекты (книга правил, стр. 15).
 *
 * В тексте книги перечислены только эффекты — «1, 2, 3 или 4», ОПАСНОСТЬ
 * и ТИШИНА, — а сам состав граней виден лишь на иллюстрации. Поэтому состав
 * подтверждён владельцем проекта по физическому кубику (17.09.2026):
 * 1, 1, 2, 2, 3, 3, 4, 4, Тишина, Опасность. Это свойство компонента,
 * а не «примерная» вероятность, придуманная в коде (AGENTS.md §1.1).
 */
export type NoiseDieFace = { kind: 'CORRIDOR'; number: CorridorNumber } | { kind: 'SILENCE' } | { kind: 'DANGER' };

export const NOISE_DIE_FACES: readonly NoiseDieFace[] = [
  { kind: 'CORRIDOR', number: 1 },
  { kind: 'CORRIDOR', number: 1 },
  { kind: 'CORRIDOR', number: 2 },
  { kind: 'CORRIDOR', number: 2 },
  { kind: 'CORRIDOR', number: 3 },
  { kind: 'CORRIDOR', number: 3 },
  { kind: 'CORRIDOR', number: 4 },
  { kind: 'CORRIDOR', number: 4 },
  { kind: 'SILENCE' },
  { kind: 'DANGER' },
];
