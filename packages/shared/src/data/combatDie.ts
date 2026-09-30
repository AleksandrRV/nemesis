import type { IntruderType } from '../types/entities.js';

export const COMBAT_DIE_FACES = ['MISS', 'TAIL', 'TAIL', 'SILHOUETTES', 'ONE_WOUND', 'TWO_WOUNDS'] as const;

export type CombatDieFace = (typeof COMBAT_DIE_FACES)[number];

/** Сколько Ран наносит грань кубика Боя цели указанного типа (стр. 19). */
export function injuriesForFace(face: CombatDieFace, targetType: IntruderType): number {
  switch (face) {
    case 'MISS':
      return 0;
    case 'TAIL':
      return targetType === 'LARVA' || targetType === 'CREEPER' ? 1 : 0;
    case 'SILHOUETTES':
      return targetType === 'LARVA' || targetType === 'CREEPER' || targetType === 'ADULT' ? 1 : 0;
    case 'ONE_WOUND':
      return 1;
    case 'TWO_WOUNDS':
      return 2;
  }
}

/** Сколько Ран наносит грань кубика Боя в Рукопашной атаке (стр. 19). */
export function meleeInjuriesForFace(face: CombatDieFace, targetType: IntruderType): number {
  switch (face) {
    case 'MISS':
      return 0;
    case 'TAIL':
      return targetType === 'LARVA' || targetType === 'CREEPER' ? 1 : 0;
    case 'SILHOUETTES':
      return targetType === 'LARVA' || targetType === 'CREEPER' || targetType === 'ADULT' ? 1 : 0;
    case 'ONE_WOUND':
      return 1;
    case 'TWO_WOUNDS':
      // «Вы наносите цели 1 Рану (да, лишь 1!)» — стр. 19.
      return 1;
  }
}
