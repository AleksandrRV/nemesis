import type { EngineAction, GameState, SeatKind, TableSeating } from '@nemesis/shared';
import { playerToAct } from '@nemesis/shared';

export const MAX_BOT_STEPS_IN_A_ROW = 600;
export const MAX_BOT_REFUSALS = 3;

export type BotMove =
  { kind: 'ACT'; botId: string; candidates: EngineAction[] } | { kind: 'STALLED'; botId: string; reason: string };

/** Кто придумывает ходы бота: контроллер ботов по срезу и памяти. */
export type BotThinker = (state: GameState, botId: string) => EngineAction[];

/** Оркестратор мест (план 0.8.0, В8-2-4): кто за каким Персонажем и чей ответ ждёт движок. */
export class SeatController {
  private refusals = 0;
  private stepsInARow = 0;

  constructor(private readonly seating: readonly TableSeating[]) {}

  getSeating(): TableSeating[] {
    return this.seating.map((seat) => ({ ...seat }));
  }

  kindOf(playerId: string): SeatKind | null {
    return this.seating.find((seat) => seat.playerId === playerId)?.kind ?? null;
  }

  localHumanIds(): string[] {
    return this.seating.filter((seat) => seat.kind === 'LOCAL_HUMAN').map((seat) => seat.playerId);
  }

  pendingBotId(state: GameState): string | null {
    const actorId = playerToAct(state);
    return actorId !== null && this.kindOf(actorId) === 'BOT' ? actorId : null;
  }

  /** Экран переходит к человеку, чьего ответа ждут; пока думает бот, зритель не меняется. */
  nextViewer(state: GameState, currentViewerId: string): string {
    const actorId = playerToAct(state);
    if (actorId !== null && this.kindOf(actorId) === 'LOCAL_HUMAN') return actorId;
    if (this.kindOf(currentViewerId) === 'LOCAL_HUMAN') return currentViewerId;
    return this.localHumanIds()[0] ?? currentViewerId;
  }

  /** Передача устройства нужна, только когда за одним экраном сидят несколько людей. */
  needsHandoff(fromId: string, toId: string): boolean {
    return fromId !== toId && this.localHumanIds().length > 1;
  }

  nextBotMove(state: GameState, think: BotThinker): BotMove | null {
    const botId = this.pendingBotId(state);
    if (botId === null) return null;
    if (this.stepsInARow >= MAX_BOT_STEPS_IN_A_ROW) {
      return { kind: 'STALLED', botId, reason: `Боты сделали ${MAX_BOT_STEPS_IN_A_ROW} ходов подряд без людей.` };
    }
    if (this.refusals > MAX_BOT_REFUSALS || (this.refusals === MAX_BOT_REFUSALS && state.pendingDecision)) {
      return { kind: 'STALLED', botId, reason: 'Бот не может ни ответить, ни спасовать.' };
    }
    if (this.refusals === MAX_BOT_REFUSALS) {
      return { kind: 'ACT', botId, candidates: [{ type: 'ACTION_PASS', payload: {} }] };
    }
    const candidates = think(state, botId);
    if (candidates.length > 0) return { kind: 'ACT', botId, candidates };
    this.refusals += 1;
    return this.nextBotMove(state, think);
  }

  botActed(): void {
    this.refusals = 0;
    this.stepsInARow += 1;
  }

  botRefused(): void {
    this.refusals += 1;
  }

  humanActed(): void {
    this.refusals = 0;
    this.stepsInARow = 0;
  }
}
