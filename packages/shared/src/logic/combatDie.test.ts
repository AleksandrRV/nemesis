import { produce } from 'immer';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { COMBAT_DIE_FACES } from '../data/combatDie.js';
import type { CombatDieFace } from '../data/combatDie.js';
import type { GameState } from '../types/state.js';
import * as rng from '../utils/rng.js';
import { rollCombatDie } from './combatDie.js';
import { createInitialGameState } from './setup.js';

const SEED = 'combat-die-step-1';

function rollSequence(state: GameState, count: number): CombatDieFace[] {
  return Array.from({ length: count }, () => rollCombatDie(state));
}

afterEach(() => vi.restoreAllMocks());

describe('Кубик Боя: шесть физических граней (стр. 2, 18)', () => {
  it.each([
    [0, 'MISS'],
    [1 / 6 - Number.EPSILON, 'MISS'],
    [1 / 6, 'MISS'],
    [2 / 6 - Number.EPSILON, 'MISS'],
    [2 / 6, 'TAIL'],
    [3 / 6 - Number.EPSILON, 'TAIL'],
    [3 / 6, 'SILHOUETTES'],
    [4 / 6 - Number.EPSILON, 'SILHOUETTES'],
    [4 / 6, 'ONE_WOUND'],
    [5 / 6 - Number.EPSILON, 'ONE_WOUND'],
    [5 / 6, 'TWO_WOUNDS'],
    [1 - Number.EPSILON, 'TWO_WOUNDS'],
  ] as const)('отображает значение %s в %s без потери второго Промаха', (value, expected) => {
    const state = createInitialGameState(SEED);
    const draw = vi.spyOn(rng, 'drawFromStream').mockReturnValue(value);

    expect(rollCombatDie(state)).toBe(expected);
    expect(draw).toHaveBeenCalledTimes(1);
    expect(draw).toHaveBeenCalledWith(SEED, 'combat', 0);
    expect(state.meta.rngDraws.combat).toBe(1);
  });
});

describe('Кубик Боя: последовательность и состояние', () => {
  it('читает поток combat последовательно, а не начинает его заново при каждом броске', () => {
    const state = createInitialGameState(SEED);
    const sequential = rng.createRng(SEED, 'combat');
    const expected = Array.from({ length: 48 }, () => COMBAT_DIE_FACES[Math.floor(sequential() * 6)]);

    expect(rollSequence(state, expected.length)).toEqual(expected);
    expect(state.meta.rngDraws.combat).toBe(expected.length);
    expect(new Set(expected)).toEqual(new Set(COMBAT_DIE_FACES));
  });

  it('воспроизводит серию по сиду и меняет её при другом сиде', () => {
    const first = rollSequence(createInitialGameState(SEED), 24);
    const second = rollSequence(createInitialGameState(SEED), 24);
    const different = rollSequence(createInitialGameState(`${SEED}-other`), 24);

    expect(first).toEqual(second);
    expect(first).not.toEqual(different);
  });

  it('не читает позиции других потоков и меняет только счётчик combat', () => {
    const state = createInitialGameState(SEED);
    state.meta.rngDraws = { combat: 7, layout: 13, cards: 23, noise: 31, bag: 41 };
    const before = structuredClone(state);
    const control = createInitialGameState(SEED);
    control.meta.rngDraws.combat = 7;

    expect(rollCombatDie(state)).toBe(rollCombatDie(control));
    expect(state).toEqual({
      ...before,
      meta: { ...before.meta, rngDraws: { ...before.meta.rngDraws, combat: 8 } },
    });
  });

  it('продолжает серию после JSON-сохранения с ненулевой позиции', () => {
    const state = createInitialGameState(SEED);
    rollSequence(state, 9);
    const restored = JSON.parse(JSON.stringify(state)) as GameState;

    expect(restored.meta.rngDraws.combat).toBe(9);
    expect(rollSequence(restored, 24)).toEqual(rollSequence(state, 24));
    expect(restored).toEqual(state);
  });

  it('работает на Immer draft, не меняя исходный снимок партии', () => {
    const state = createInitialGameState(SEED);
    const before = structuredClone(state);
    const next = produce(state, (draft) => {
      rollCombatDie(draft);
      rollCombatDie(draft);
    });

    expect(state).toEqual(before);
    expect(next.meta.rngDraws).toEqual({ ...before.meta.rngDraws, combat: 2 });
    expect(next.decks).toEqual(before.decks);
  });

  it.each([-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'отвергает недопустимую позицию %s, не меняя состояние',
    (drawIndex) => {
      const state = createInitialGameState(SEED);
      state.meta.rngDraws.combat = drawIndex;
      const before = structuredClone(state);

      expect(() => rollCombatDie(state)).toThrow(/Недопустимая позиция в потоке combat/);
      expect(state).toEqual(before);
    },
  );
});
