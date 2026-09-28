import type {
  ContaminationScanOutcome,
  ContaminationScanResult,
  ContaminationScanSource,
  SanitizedGameLogEntry,
} from '@nemesis/shared';

export interface ScanReport {
  key: string;
  sequence: number;
  playerId: string;
  source: ContaminationScanSource;
  results: ContaminationScanResult[];
  removedCount: number;
  outcome: ContaminationScanOutcome;
}

export const SCAN_STEP_MS = 1700;

export function latestLogSequence(log: readonly SanitizedGameLogEntry[]): number {
  return log.at(-1)?.sequence ?? 0;
}

export function collectScanReports(log: readonly SanitizedGameLogEntry[], afterSequence: number): ScanReport[] {
  return log.flatMap((entry) => {
    const event = entry.event;
    if (entry.sequence <= afterSequence || event.type !== 'CONTAMINATION_SCANNED') return [];
    return [
      {
        key: entry.id,
        sequence: entry.sequence,
        playerId: event.playerId,
        source: event.source,
        results: [...event.results],
        removedCount: event.removedCount,
        outcome: event.outcome,
      },
    ];
  });
}

export function scanTally(results: readonly ContaminationScanResult[], revealedCount: number) {
  const revealed = results.slice(0, revealedCount);
  return {
    scanned: revealed.length,
    infected: revealed.filter((result) => result === 'INFECTED').length,
    clean: revealed.filter((result) => result === 'CLEAN').length,
    total: results.length,
  };
}

export function scanCardId(report: ScanReport, index: number): string {
  return `${report.key}-card-${index}`;
}
