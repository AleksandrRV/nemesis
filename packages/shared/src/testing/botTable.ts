import type { EngineAction } from '../types/actions.js';
import type { GameState } from '../types/state.js';
import { GameEngine } from '../logic/fsm.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { createInitialGameState } from '../logic/setup.js';
import { BotAgent, type BotDecision, createBotMind } from '../ai/botAgent.js';
import type { BotMind } from '../ai/botMind.js';

const engine = new GameEngine();

export interface BotTable {
  state: GameState;
  minds: Record<string, BotMind>;
}

export function botTable(seed: string, playerCount: number): BotTable {
  const state = createInitialGameState(seed, { playerCount });
  const ids = Object.keys(state.players);
  return { state, minds: Object.fromEntries(ids.map((id) => [id, createBotMind(seed, id, ids)])) };
}

/** Чей ответ ждёт стол: владелец обязательного решения или активный игрок. */
export function actorOf(state: GameState): string | null {
  if (state.meta.phase === 'GAME_OVER') return null;
  return state.pendingDecision?.playerId ?? state.meta.activePlayerId;
}

export function tryAction(state: GameState, action: EngineAction, actorId: string): GameState | null {
  try {
    return engine.processAction(state, action, { actorId });
  } catch {
    return null;
  }
}

export interface BotStep {
  table: BotTable;
  actorId: string;
  decision: BotDecision;
  accepted: EngineAction | null;
}

/** Один шаг стола из одних ботов: реплики, затем первый принятый движком кандидат. */
export function stepBots(table: BotTable): BotStep | null {
  const actorId = actorOf(table.state);
  if (!actorId) return null;
  const decision = BotAgent.decide(filterStateForPlayer(table.state, actorId), table.minds[actorId]!);
  let state = table.state;
  for (const draft of decision.speech)
    state = tryAction(state, { type: 'ACTION_COMMS', payload: draft }, actorId) ?? state;
  let accepted: EngineAction | null = null;
  for (const action of [decision.action, ...decision.alternatives]) {
    if (!action) continue;
    const next = tryAction(state, action, actorId);
    if (next) {
      state = next;
      accepted = action;
      break;
    }
  }
  return { table: { state, minds: { ...table.minds, [actorId]: decision.mind } }, actorId, decision, accepted };
}
