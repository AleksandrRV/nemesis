import { CARD_OPTION } from '../types/cardOptions.js';
import type { CommsDraft } from '../types/comms.js';
import type { GameLogEvent } from '../types/log.js';
import type { GameState } from '../types/state.js';
import { setEngineState } from '../logic/cardEffectsShared.js';
import { trackCommitments } from '../logic/comms/commitments.js';
import { GameEngine } from '../logic/fsm.js';
import { appendGameLog } from '../logic/gameLog.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { standAt, useConsole } from './roomFixtures.js';
import { createBotMind } from '../ai/botAgent.js';
import type { BotCharacter, BotMind } from '../ai/botMind.js';
import { observe } from '../ai/botObserver.js';

export const BOT = 'player-2';

const engine = new GameEngine();

export function mindFor(state: GameState, botId = BOT, seed = 'social'): BotMind {
  return createBotMind(seed, botId, Object.keys(state.players));
}

export function withCharacter(mind: BotMind, character: Partial<BotCharacter>): BotMind {
  return {
    ...mind,
    character: { traits: [], morale: 0, alterEgo: null, activePersona: 'PRIMARY', ...character },
  };
}

export function seen(state: GameState, mind: BotMind): BotMind {
  return observe(filterStateForPlayer(state, mind.botId), mind);
}

export function say(state: GameState, authorId: string, draft: CommsDraft): GameState {
  const table = structuredClone(state);
  table.meta.activePlayerId = authorId;
  return engine.processAction(table, { type: 'ACTION_COMMS', payload: draft }, { actorId: authorId });
}

export function inspectEngine(state: GameState, playerId: string, engineNumber: 1 | 2 | 3): GameState {
  const next = structuredClone(state);
  standAt(next, playerId, `ENGINE_0${engineNumber}`);
  return structuredClone(useConsole(next, playerId));
}

export function toggleEngine(state: GameState, playerId: string, engineNumber: 1 | 2 | 3): GameState {
  const next = structuredClone(state);
  standAt(next, playerId, `ENGINE_0${engineNumber}`);
  const option = next.ship.engines[engineNumber]!.isWorking ? CARD_OPTION.ENGINE_DAMAGE : CARD_OPTION.ENGINE_REPAIR;
  setEngineState(next, playerId, option);
  return next;
}

/** Публичное событие журнала, как его записал бы движок, с пересчётом обещаний. */
export function logged(state: GameState, event: GameLogEvent): GameState {
  const next = structuredClone(state);
  appendGameLog(next, event);
  trackCommitments(next);
  return next;
}

export function laterRounds(state: GameState, rounds: number): GameState {
  const next = structuredClone(state);
  next.meta.currentRound += rounds;
  return next;
}
