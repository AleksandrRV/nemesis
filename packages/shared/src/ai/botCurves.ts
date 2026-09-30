import type { ResponseCurve } from './botTuning.js';

/**
 * Кривые отклика факторов Utility (В8-7-2):
 * - `LINEAR` — 1 + наклон × (x − середина), в пределах [0; 1];
 * - `LOGISTIC` — 1 / (1 + e^(−крутизна × (x − середина)));
 * - `QUADRATIC` — крутизна × (x − середина)² правее середины, иначе 0.
 */
export function evaluateCurve(curve: ResponseCurve, x: number): number {
  const shifted = x - curve.midpoint;
  switch (curve.kind) {
    case 'LINEAR':
      return clamp01(1 + curve.steepness * shifted);
    case 'LOGISTIC':
      return 1 / (1 + Math.exp(-curve.steepness * shifted));
    case 'QUADRATIC':
      return shifted <= 0 ? 0 : clamp01(curve.steepness * shifted * shifted);
  }
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
