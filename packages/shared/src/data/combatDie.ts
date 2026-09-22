export const COMBAT_DIE_FACES = ['MISS', 'MISS', 'TAIL', 'SILHOUETTES', 'ONE_WOUND', 'TWO_WOUNDS'] as const;

export type CombatDieFace = (typeof COMBAT_DIE_FACES)[number];
