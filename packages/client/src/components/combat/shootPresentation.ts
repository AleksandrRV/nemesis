import type { CombatDieFace } from '@nemesis/shared';

/**
 * Печатные результаты кубика Боя для интерфейса (стр. 18–19). Граней шесть,
 * «Промах» напечатан дважды — в словаре он один.
 */
export const COMBAT_DIE_PRESENTATION: Record<CombatDieFace, { label: string; hint: string }> = {
  MISS: { label: 'ПРОМАХ', hint: 'Перечёркнутый прицел: цели не нанесено ран.' },
  TAIL: { label: 'ХВОСТ', hint: '1 Рана Личинке или Криперу; остальным типам — промах.' },
  SILHOUETTES: { label: 'СИЛУЭТЫ', hint: '1 Рана Личинке, Криперу или Взрослой Особи; остальным — промах.' },
  ONE_WOUND: { label: '1 РАНА', hint: '1 Рана любому Чужому.' },
  TWO_WOUNDS: { label: '2 РАНЫ', hint: '2 Раны любому Чужому.' },
};
