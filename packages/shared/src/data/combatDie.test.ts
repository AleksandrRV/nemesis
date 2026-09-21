import { describe, expect, it } from 'vitest';

import { COMBAT_DIE_FACES, rollCombatDie } from './combatDie.js';
import { createRng } from '../utils/rng.js';

describe('Кубик Боя (CombatDie, v0.4.0 Шаг 1)', () => {
  it('d6: шесть граней с продублированным промахом', () => {
    expect(COMBAT_DIE_FACES).toHaveLength(6);
    expect(COMBAT_DIE_FACES.filter((face) => face === 'MISS')).toHaveLength(2);
  });

  it('бросается детерминированно через поток combat', () => {
    const rollSequence = (seed: string): string[] => {
      const rng = createRng(seed, 'combat');

      return Array.from({ length: 30 }, () => rollCombatDie(rng));
    };

    expect(rollSequence('nemesis-alpha')).toEqual(rollSequence('nemesis-alpha'));
    expect(rollSequence('nemesis-beta')).not.toEqual(rollSequence('nemesis-alpha'));
  });

  it('возвращает только грани из набора кубика', () => {
    const rng = createRng('nemesis-alpha', 'combat');

    for (let roll = 0; roll < 200; roll++) {
      expect(COMBAT_DIE_FACES).toContain(rollCombatDie(rng));
    }
  });
});
