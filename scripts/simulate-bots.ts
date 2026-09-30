/**
 * Симулятор партий ботов (план 0.8.0, В8-9-2): Node, вне ядра. Отчёт для балансировки `botTuning.ts`.
 *
 *   npm run simulate -- --games 100 --bots 4 --difficulty CREW --seed base
 *   npm run simulate -- --matrix --games 40          # все составы 1–5 ботов × все сложности
 *   npm run simulate -- --games 100 --json report.json
 */
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import {
  BOT_DIFFICULTIES,
  BOT_TUNING,
  rateOf,
  seriesSeed,
  simulateGame,
  summarizeSimulations,
  type BotDifficulty,
  type SimulationRecord,
  type SimulationSummary,
} from '@nemesis/shared';

const { values } = parseArgs({
  options: {
    games: { type: 'string', default: '100' },
    bots: { type: 'string', default: '4' },
    difficulty: { type: 'string', default: 'CREW' },
    seed: { type: 'string', default: 'simulate' },
    json: { type: 'string' },
    matrix: { type: 'boolean', default: false },
  },
});

function isDifficulty(value: string): value is BotDifficulty {
  return (BOT_DIFFICULTIES as readonly string[]).includes(value);
}

function percent(part: number, whole: number): string {
  return `${(rateOf(part, whole) * 100).toFixed(1)}%`;
}

function top(counts: Partial<Record<string, number>>, limit = 8): string {
  return Object.entries(counts)
    .sort((left, right) => (right[1] ?? 0) - (left[1] ?? 0))
    .slice(0, limit)
    .map(([key, count]) => `${key} ${count}`)
    .join(', ');
}

function runSeries(games: number, botCount: number, difficulty: BotDifficulty, seed: string) {
  const started = performance.now();
  const records: SimulationRecord[] = [];
  for (let index = 0; index < games; index++) {
    records.push(simulateGame({ seed: seriesSeed(`${seed}-${botCount}-${difficulty}`, index), botCount, difficulty }));
  }
  return { records, summary: summarizeSimulations(records, botCount, difficulty), ms: performance.now() - started };
}

function printSummary(summary: SimulationSummary, ms: number): void {
  const { speech } = summary;
  const traits = Object.entries(summary.byTrait)
    .filter(([, stat]) => (stat?.games ?? 0) >= 3)
    .map(([trait, stat]) => ({
      label: BOT_TUNING.traits.catalog[trait as keyof typeof BOT_TUNING.traits.catalog].label,
      rate: rateOf(stat!.survivals, stat!.games),
      games: stat!.games,
    }))
    .sort((left, right) => right.rate - left.rate)
    .map((entry) => `${entry.label} ${(entry.rate * 100).toFixed(0)}% (${entry.games})`)
    .join(', ');
  console.log(
    `\n=== ${summary.botCount} бот(а) · ${summary.difficulty} · ${summary.games} партий · ${(ms / 1000).toFixed(1)} с`,
  );
  console.log(
    `  выжили ${summary.survivals}/${summary.bots} (${percent(summary.survivals, summary.bots)}), победы ${summary.wins} (${percent(summary.wins, summary.bots)}), партий с победителем ${summary.gamesWithWinner}`,
  );
  console.log(
    `  длина: ${summary.averageRounds.toFixed(1)} раунда; зависаний ${summary.stalled}; отказов движка ${summary.rejectedActions}`,
  );
  console.log(`  конец игры: ${top(summary.gameOverReasons)}`);
  console.log(`  причины гибели: ${top(summary.deathCauses)}`);
  console.log(`  спасение: ${top(summary.byEscapeRoute)}`);
  console.log(`  черты (выживаемость): ${traits}`);
  console.log(
    `  речь: Заявлений ${speech.claims}, Намерений ${speech.intents}, Просьб ${speech.requests}, лжи ${speech.lies} (поймано ${speech.liesExposed}), обещаний ${speech.promisesMade} (сдержано ${speech.promisesKept}, нарушено ${speech.promisesBroken})`,
  );
  console.log(`  Действия: ${top(summary.actions, 10)}`);
  if (summary.stalled > 0) console.log(`  зависания: ${top(summary.stallReasons)}`);
}

const games = Number(values.games);
const seed = values.seed ?? 'simulate';
if (values.matrix) {
  for (const difficulty of BOT_DIFFICULTIES) {
    for (const botCount of [1, 2, 3, 4, 5]) {
      const { summary, ms } = runSeries(games, botCount, difficulty, seed);
      printSummary(summary, ms);
    }
  }
} else {
  const botCount = Number(values.bots);
  const difficulty = values.difficulty ?? 'CREW';
  if (!isDifficulty(difficulty)) throw new Error(`Сложность: ${BOT_DIFFICULTIES.join(', ')}.`);
  const { records, summary, ms } = runSeries(games, botCount, difficulty, seed);
  printSummary(summary, ms);
  if (values.json) {
    writeFileSync(values.json, JSON.stringify({ summary, records }, null, 2));
    console.log(`\nОтчёт записан: ${values.json}`);
  }
}
