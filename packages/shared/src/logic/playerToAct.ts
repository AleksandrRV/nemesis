import type { GameState } from '../types/state.js';

/** Чьего ответа ждёт движок: владельца решения или активного игрока в Фазе Игроков; null — никого. */
export function playerToAct(state: Pick<GameState, 'meta' | 'pendingDecision'>): string | null {
  if (state.meta.phase === 'GAME_OVER') return null;
  if (state.pendingDecision) return state.pendingDecision.playerId;
  return state.meta.phase === 'PLAYER_PHASE' ? state.meta.activePlayerId : null;
}
