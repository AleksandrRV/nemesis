import { describe, expect, it } from 'vitest';
import { BotAgent } from './botAgent.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { actorOf, botTable, stepBots, tryAction, type BotTable } from '../testing/botTable.js';
import { generateCandidates, isBotsTurn } from './botActions.js';
import { buildAgenda } from './botGoals.js';
import { observe } from './botObserver.js';
import { BOT_TUNING } from './botTuning.js';

const SEEDS = ['play-a', 'play-b', 'play-c', 'play-d'];

/** Бюджет решения на телефоне (план, В8-7-9) и во сколько раз телефон медленнее машины CI — оценка. */
const BOT_DECISION_BUDGET_MS = 50;
const PHONE_SLOWDOWN = 3;

function mismatches(table: BotTable): string[] {
  const actorId = actorOf(table.state);
  if (!actorId) return [];
  const view = filterStateForPlayer(table.state, actorId);
  if (!isBotsTurn(view, actorId)) return [];
  const mind = observe(view, table.minds[actorId]!);
  const candidates = generateCandidates(view, mind, buildAgenda(view, mind, BOT_TUNING).tasks, BOT_TUNING);
  return candidates
    .filter((candidate) => tryAction(table.state, candidate.action, actorId) === null)
    .map((candidate) => JSON.stringify(candidate.action));
}

describe('Генератор допустимых Действий совпадает с движком (план 0.8.0, В8-7-1)', () => {
  it.each(SEEDS)(
    'стол %s: каждый кандидат бота движок принимает, партия идёт без зависаний',
    (seed) => {
      let table = botTable(seed, 3);
      const rejected: string[] = [];
      let accepted = 0;
      for (let step = 0; step < 160 && table.state.meta.phase !== 'GAME_OVER'; step++) {
        rejected.push(...mismatches(table));
        const next = stepBots(table);
        if (!next) break;
        expect(next.accepted, `${next.actorId}: ни одно Действие не принято`).not.toBeNull();
        accepted += 1;
        table = next.table;
      }
      expect(rejected).toEqual([]);
      expect(accepted).toBeGreaterThan(20);
    },
    60_000,
  );
});

describe('Бюджет решения (В8-7-9)', () => {
  it('решение бота укладывается в бюджет с запасом для телефона', () => {
    const times: number[] = [];
    let table = botTable('budget', 5);
    for (let step = 0; step < 120 && table.state.meta.phase !== 'GAME_OVER'; step++) {
      const actorId = actorOf(table.state)!;
      const view = filterStateForPlayer(table.state, actorId);
      const started = performance.now();
      BotAgent.decide(view, table.minds[actorId]!);
      times.push(performance.now() - started);
      const next = stepBots(table);
      if (!next) break;
      table = next.table;
    }
    times.sort((left, right) => left - right);
    const p95 = times[Math.floor(times.length * 0.95)]!;
    expect(p95).toBeLessThan(BOT_DECISION_BUDGET_MS / PHONE_SLOWDOWN);
  }, 60_000);
});
