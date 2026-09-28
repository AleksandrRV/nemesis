import type { SanitizedGameLogEvent, SanitizedGameState } from '@nemesis/shared';
import { playerName, type GameLogSegment } from './gameLogModel';
import { SCAN_OUTCOME_COPY, SCAN_SOURCE_LABELS } from '../scanner/scanLabels';

type ScanEvent = Extract<SanitizedGameLogEvent, { type: 'CONTAMINATION_SCANNED' }>;

export function formatScanLogEvent(event: ScanEvent, view: SanitizedGameState): GameLogSegment[] {
  const infected = event.results.filter((result) => result === 'INFECTED').length;
  const outcome = SCAN_OUTCOME_COPY[event.outcome];
  return [
    { text: playerName(view, event.playerId), tone: 'player', strong: true },
    { text: ` сканирует ${event.results.length} карт(ы) Заражения (${SCAN_SOURCE_LABELS[event.source]}): ` },
    infected > 0
      ? { text: `ИНФЕКЦИЯ ×${infected}`, tone: 'danger', strong: true }
      : { text: 'ИНФЕКЦИИ нет', tone: 'success', strong: true },
    { text: event.removedCount > 0 ? `, удалено ${event.removedCount}. ` : '. ' },
    {
      text: outcome.title,
      tone: outcome.tone === 'clean' || outcome.tone === 'cured' ? 'success' : 'danger',
      strong: true,
    },
    { text: '.' },
  ];
}
