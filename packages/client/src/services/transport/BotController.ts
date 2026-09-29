import type { BotMind, CommsDraft, EngineAction, GameState, TableSeating } from '@nemesis/shared';
import { BotAgent, createBotMind, filterStateForPlayer } from '@nemesis/shared';

export interface BotThought {
  candidates: EngineAction[];
  speech: CommsDraft[];
}

/**
 * Контроллер ботов (план 0.8.0, В8-5-2): строит срез, вызывает чистое решение бота и хранит его память.
 * Полное состояние бот не видит — только `filterStateForPlayer` своего места.
 */
export class BotController {
  private constructor(private readonly minds: Map<string, BotMind>) {}

  /** Память восстанавливается из сохранения, если она этого бота и этой партии; иначе рождается заново. */
  static forTable(
    state: GameState,
    seating: readonly TableSeating[],
    restored: Record<string, BotMind> = {},
  ): BotController {
    const playerIds = Object.keys(state.players);
    const minds = new Map<string, BotMind>();
    for (const seat of seating) {
      if (seat.kind !== 'BOT') continue;
      const saved = restored[seat.playerId];
      const fresh = createBotMind(state.meta.seed, seat.playerId, playerIds);
      minds.set(seat.playerId, saved && saved.botId === seat.playerId && saved.seed === fresh.seed ? saved : fresh);
    }
    return new BotController(minds);
  }

  think(state: GameState, botId: string): BotThought {
    const mind = this.minds.get(botId);
    if (!mind) return { candidates: [], speech: [] };
    const decision = BotAgent.decide(filterStateForPlayer(state, botId), mind);
    this.minds.set(botId, decision.mind);
    return {
      candidates: [decision.action, ...decision.alternatives].filter(
        (action): action is EngineAction => action !== null,
      ),
      speech: decision.speech,
    };
  }

  mindOf(botId: string): BotMind | null {
    return this.minds.get(botId) ?? null;
  }

  snapshot(): Record<string, BotMind> {
    return Object.fromEntries(this.minds);
  }
}
