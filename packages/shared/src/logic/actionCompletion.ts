import type { GameState } from '../types/state.js';
import { advanceTurnWithoutFire, applyFireEndTurnEffect } from './turnCycle.js';

export function queueActionCompletion(state: GameState, playerId: string): void {
  state.interruptQueue.push({ type: 'COMPLETE_ACTION_INTERRUPT', playerId });
}

export function completeAction(state: GameState, playerId: string): void {
  const player = state.players[playerId]!;
  if (!player.isDead) player.actionsPerformedThisRound += 1;
  const reachedActionLimit = !player.hasAdrenalineRush && player.actionsPerformedThisRound >= 2;
  const leftTheGame = player.hasEscapedInPod || player.isInHibernation;
  if (leftTheGame) {
    advanceTurnWithoutFire(state, playerId);
    return;
  }
  if (player.isDead || reachedActionLimit) {
    applyFireEndTurnEffect(state, playerId);
    advanceTurnWithoutFire(state, playerId);
  }
}
