import type { Rng } from '../utils/rng.js';
import { pickIndex } from '../utils/rng.js';

// doc/sources/data-sources.json#combat-die
export type CombatDieFace = 'MISS' | 'TAIL' | 'SILHOUETTES' | 'ONE_WOUND' | 'TWO_WOUNDS';

export const COMBAT_DIE_FACES: readonly CombatDieFace[] = [
  'MISS',
  'MISS',
  'TAIL',
  'SILHOUETTES',
  'ONE_WOUND',
  'TWO_WOUNDS',
];

export function rollCombatDie(rng: Rng): CombatDieFace {
  return COMBAT_DIE_FACES[pickIndex(rng, COMBAT_DIE_FACES.length)]!;
}
