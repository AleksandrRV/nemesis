import type { IntruderType } from '../types/entities.js';

export const INTRUDER_MINIATURE_LIMITS: Readonly<Record<IntruderType, number>> = {
  LARVA: 6,
  CREEPER: 3,
  ADULT: 8,
  BREEDER: 2,
  QUEEN: 1,
};
