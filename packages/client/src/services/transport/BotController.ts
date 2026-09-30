import type {
  BotInspection,
  BotMind,
  CommsDraft,
  EngineAction,
  GameState,
  MoralePoint,
  TableSeating,
} from '@nemesis/shared';
import { BotAgent, activePersona, createBotMind, filterStateForPlayer, inspectBot } from '@nemesis/shared';

/** Разбор бота для Инспектора (dev-канал): его мысли и история морали за партию. */
export interface BotInspectionEntry {
  inspection: BotInspection;
  moraleHistory: MoralePoint[];
}

export interface BotThought {
  candidates: EngineAction[];
  speech: CommsDraft[];
}

/**
 * Контроллер ботов (план 0.8.0, В8-5-2): строит срез, вызывает чистое решение бота и хранит его память.
 * Полное состояние бот не видит — только `filterStateForPlayer` своего места.
 */
export class BotController {
  private readonly moraleHistory = new Map<string, MoralePoint[]>();

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
      const fresh = createBotMind(state.meta.seed, seat.playerId, playerIds, seat.difficulty ?? 'CREW');
      const matches =
        saved && saved.botId === seat.playerId && saved.seed === fresh.seed && saved.difficulty === fresh.difficulty;
      minds.set(seat.playerId, matches ? saved : fresh);
    }
    return new BotController(minds);
  }

  think(state: GameState, botId: string): BotThought {
    const mind = this.minds.get(botId);
    if (!mind) return { candidates: [], speech: [] };
    const decision = BotAgent.decide(filterStateForPlayer(state, botId), mind);
    this.minds.set(botId, decision.mind);
    this.recordMorale(botId, state.meta.currentRound, activePersona(decision.mind.character).morale);
    return {
      candidates: [decision.action, ...decision.alternatives].filter(
        (action): action is EngineAction => action !== null,
      ),
      speech: decision.speech,
    };
  }

  /** Только dev-канал: черты и мысли бота не должны попасть в игровой интерфейс (Р-8). */
  inspect(state: GameState): BotInspectionEntry[] {
    return [...this.minds.entries()].map(([botId, mind]) => ({
      inspection: inspectBot(filterStateForPlayer(state, botId), mind),
      moraleHistory: this.moraleHistory.get(botId) ?? [],
    }));
  }

  private recordMorale(botId: string, round: number, morale: number): void {
    const history = this.moraleHistory.get(botId) ?? [];
    const last = history.at(-1);
    if (last?.round === round) last.morale = morale;
    else history.push({ round, morale });
    this.moraleHistory.set(botId, history);
  }

  mindOf(botId: string): BotMind | null {
    return this.minds.get(botId) ?? null;
  }

  snapshot(): Record<string, BotMind> {
    return Object.fromEntries(this.minds);
  }
}
