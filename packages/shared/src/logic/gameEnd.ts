import type { GameOverReason, GameState } from '../types/state.js';
import { resolveEndgame } from './endgame.js';
import { appendGameLog } from './gameLog.js';

export function endGame(state: GameState, reason: GameOverReason): void {
  if (state.meta.phase === 'GAME_OVER') return;
  state.meta.phase = 'GAME_OVER';
  state.meta.gameOverReason = reason;
  appendGameLog(state, { type: 'GAME_OVER', reason });
  state.interruptQueue = [];
  state.pendingDecision = null;
  resolveEndgame(state, reason);
}
