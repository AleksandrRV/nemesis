import type { GameState } from '../types/state.js';
import { resolveIntruderRetreat } from './intruderRetreat.js';
import { checkInjuryResult } from './shoot.js';
import { isWeaknessRevealed } from './weaknesses.js';

/** Огнетушитель и Система Пожаротушения: Чужой Отступает; «Восприимчивость к фосфатам» добавляет 1 Рану. */
export function repelIntruderWithSuppressant(state: GameState, intruderId: string, actorId: string): void {
  resolveIntruderRetreat(state, intruderId, actorId);
  if (!isWeaknessRevealed(state, 'PHOSPHORUS_SUSCEPTIBILITY')) return;
  const intruder = state.intrudersPool.boardTokens.find((token) => token.id === intruderId);
  if (!intruder) return;
  checkInjuryResult(state, intruder.id, intruder.type, 1, actorId);
}
