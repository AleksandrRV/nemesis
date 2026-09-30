import type { BotDifficulty, SimulationRecord, SimulationSummary } from '@nemesis/shared';
import { seriesSeed, simulateGame, summarizeSimulations } from '@nemesis/shared';

/** Размер серии в окне симуляции. */
export const SERIES_SIZE = 100;

export type SimulationRequest =
  | { kind: 'SINGLE'; seed: string; botCount: number; difficulty: BotDifficulty }
  | { kind: 'SERIES'; baseSeed: string; count: number; botCount: number; difficulty: BotDifficulty };

export type SimulationResponse =
  | { kind: 'PROGRESS'; done: number; total: number }
  | { kind: 'SINGLE_DONE'; record: SimulationRecord }
  | { kind: 'SERIES_DONE'; records: SimulationRecord[]; summary: SimulationSummary }
  | { kind: 'FAILED'; reason: string };

export function runSingleGame(request: Extract<SimulationRequest, { kind: 'SINGLE' }>): SimulationRecord {
  return simulateGame({ ...request, detailed: true });
}

export function runSeriesGame(
  request: Extract<SimulationRequest, { kind: 'SERIES' }>,
  index: number,
): SimulationRecord {
  return simulateGame({
    seed: seriesSeed(request.baseSeed, index),
    botCount: request.botCount,
    difficulty: request.difficulty,
  });
}

export function finishSeries(
  request: Extract<SimulationRequest, { kind: 'SERIES' }>,
  records: SimulationRecord[],
): SimulationResponse {
  return { kind: 'SERIES_DONE', records, summary: summarizeSimulations(records, request.botCount, request.difficulty) };
}

export function failureReason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
