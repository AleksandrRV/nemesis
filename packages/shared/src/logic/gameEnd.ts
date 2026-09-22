import type { GameOverReason, GameState } from '../types/state.js';
import { appendGameLog } from './gameLog.js';

export function endGame(state: GameState, reason: GameOverReason): void {
  state.meta.phase = 'GAME_OVER';
  state.meta.gameOverReason = reason;
  appendGameLog(state, { type: 'GAME_OVER', reason });
  state.interruptQueue = [];
}
