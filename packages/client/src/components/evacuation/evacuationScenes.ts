import type { SanitizedGameLogEntry } from '@nemesis/shared';

export type EvacuationScene =
  | { kind: 'LAUNCH'; key: string; podNumber: number; occupantIds: string[] }
  | { kind: 'HIBERNATION'; key: string; playerId: string };

export function collectEvacuationScenes(
  log: readonly SanitizedGameLogEntry[],
  afterSequence: number,
): EvacuationScene[] {
  return log.flatMap((entry): EvacuationScene[] => {
    if (entry.sequence <= afterSequence) return [];
    const event = entry.event;
    if (event.type === 'ESCAPE_POD_LAUNCHED') {
      return [{ kind: 'LAUNCH', key: entry.id, podNumber: event.podNumber, occupantIds: [...event.occupantIds] }];
    }
    if (event.type === 'HIBERNATION_ATTEMPTED' && event.success) {
      return [{ kind: 'HIBERNATION', key: entry.id, playerId: event.playerId }];
    }
    return [];
  });
}
