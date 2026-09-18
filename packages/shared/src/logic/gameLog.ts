import type { GameLogEntry, GameLogEvent } from '../types/log.js';

export function createInitialGameLog(): GameLogEntry[] {
  return [{ id: 'log-1', sequence: 1, event: { type: 'GAME_STARTED' } }];
}

export function appendGameLog(state: { gameLog: GameLogEntry[] }, event: GameLogEvent): void {
  const lastEntry = state.gameLog[state.gameLog.length - 1];
  const sequence = (lastEntry?.sequence ?? 0) + 1;

  state.gameLog.push({ id: `log-${sequence}`, sequence, event });
}
