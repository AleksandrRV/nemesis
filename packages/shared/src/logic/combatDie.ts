import { COMBAT_DIE_FACES } from '../data/combatDie.js';
import type { CombatDieFace } from '../data/combatDie.js';
import type { GameState } from '../types/state.js';
import { drawFromStream } from '../utils/rng.js';

export function rollCombatDie(state: GameState): CombatDieFace {
  const drawIndex = state.meta.rngDraws.combat;
  const value = drawFromStream(state.meta.seed, 'combat', drawIndex);
  const face = COMBAT_DIE_FACES[Math.floor(value * COMBAT_DIE_FACES.length)]!;

  state.meta.rngDraws.combat = drawIndex + 1;

  return face;
}
