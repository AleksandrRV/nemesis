import type { BotDifficulty } from '../ai/botTuning.js';
import type { BotSpeechStats, RateStat, SimulatedBot, SimulationRecord, SimulationSummary } from './simulationTypes.js';

const MORALE_BANDS = [
  { label: '−100…−50', min: -100, max: -50 },
  { label: '−50…0', min: -50, max: 0 },
  { label: '0…50', min: 0, max: 50 },
  { label: '50…100', min: 50, max: 101 },
] as const;

const EMPTY_SPEECH: BotSpeechStats = {
  claims: 0,
  intents: 0,
  requests: 0,
  answers: 0,
  lies: 0,
  liesExposed: 0,
  promisesMade: 0,
  promisesKept: 0,
  promisesBroken: 0,
};

function increment<Key extends string | number>(counts: Partial<Record<Key, number>>, key: Key, by = 1): void {
  counts[key] = (counts[key] ?? 0) + by;
}

function tally(stat: RateStat, bot: SimulatedBot): RateStat {
  stat.games += 1;
  if (bot.outcome === 'WON') stat.wins += 1;
  if (bot.outcome !== 'DIED') stat.survivals += 1;
  return stat;
}

function addRate<Key extends string>(rates: Partial<Record<Key, RateStat>>, key: Key, bot: SimulatedBot): void {
  rates[key] = tally(rates[key] ?? { games: 0, wins: 0, survivals: 0 }, bot);
}

function average(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Сводка серии партий (В8-9-2): победы по чертам и морали, причины гибели, длина партии, ложь, обещания. */
export function summarizeSimulations(
  records: readonly SimulationRecord[],
  botCount: number,
  difficulty: BotDifficulty,
): SimulationSummary {
  const summary: SimulationSummary = {
    games: records.length,
    botCount,
    difficulty,
    finished: records.filter((record) => record.finished).length,
    stalled: records.filter((record) => !record.finished).length,
    stallReasons: {},
    bots: 0,
    wins: 0,
    survivals: 0,
    gamesWithWinner: records.filter((record) => record.bots.some((bot) => bot.outcome === 'WON')).length,
    averageRounds: average(records.map((record) => record.rounds)),
    averageSteps: average(records.map((record) => record.steps)),
    roundsHistogram: {},
    gameOverReasons: {},
    deathCauses: {},
    deathRounds: {},
    byTrait: {},
    byMorale: MORALE_BANDS.map((band) => ({ ...band, stat: { games: 0, wins: 0, survivals: 0 } })),
    byCharacter: {},
    byEscapeRoute: {},
    speech: { ...EMPTY_SPEECH },
    actions: {},
    rejectedActions: records.reduce((sum, record) => sum + record.rejectedActions, 0),
  };
  for (const record of records) {
    increment(summary.roundsHistogram, record.rounds);
    if (!record.finished) increment(summary.stallReasons, record.stallReason ?? 'Предел шагов');
    if (record.gameOverReason) increment(summary.gameOverReasons, record.gameOverReason);
    for (const bot of record.bots) {
      summary.bots += 1;
      if (bot.outcome === 'WON') summary.wins += 1;
      if (bot.outcome !== 'DIED') summary.survivals += 1;
      if (bot.deathCause) increment(summary.deathCauses, bot.deathCause);
      if (bot.deathRound !== null) increment(summary.deathRounds, bot.deathRound);
      if (bot.escapeRoute) increment(summary.byEscapeRoute, bot.escapeRoute);
      for (const trait of new Set([...bot.traits, ...(bot.alterTraits ?? [])])) addRate(summary.byTrait, trait, bot);
      addRate(summary.byCharacter, bot.characterClass, bot);
      const band = summary.byMorale.find((entry) => bot.startMorale >= entry.min && bot.startMorale < entry.max);
      if (band) tally(band.stat, bot);
      for (const key of Object.keys(EMPTY_SPEECH) as (keyof BotSpeechStats)[]) summary.speech[key] += bot.speech[key];
      for (const [type, count] of Object.entries(bot.actions)) increment(summary.actions, type, count);
    }
  }
  return summary;
}

export function rateOf(part: number, whole: number): number {
  return whole === 0 ? 0 : part / whole;
}
