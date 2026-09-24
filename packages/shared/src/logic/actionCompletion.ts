import type { GameState } from '../types/state.js';
import { advanceTurnWithoutFire, applyFireEndTurnEffect } from './turnCycle.js';

export function queueActionCompletion(state: GameState, playerId: string): void {
  state.interruptQueue.push({ type: 'COMPLETE_ACTION_INTERRUPT', playerId });
}

export function completeAction(state: GameState, playerId: string): void {
  const player = state.players[playerId]!;
  if (!player.isDead) player.actionsPerformedThisRound += 1;
  if (player.isDead || player.actionsPerformedThisRound >= 2) {
    // Огонь наносится до смены activePlayerId, чтобы смерть от огня наступила до передачи хода (Шаг 4, долг 9)
    applyFireEndTurnEffect(state, playerId);
    advanceTurnWithoutFire(state, playerId);
  }
}
