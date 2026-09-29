import type {
  CourseMarker,
  EngineNumber,
  ExplorationEffect,
  SanitizedGameLogEntry,
  SanitizedGameLogEvent,
} from '@nemesis/shared';

export type ShipIntelScene =
  | {
      kind: 'ENGINES';
      key: string;
      source: 'ENGINE_ROOM' | 'ENGINE_CONTROL';
      engines: { engineNumber: EngineNumber; isWorking: boolean }[];
    }
  | { kind: 'COORDINATES'; key: string; cardId: string }
  | { kind: 'COURSE'; key: string; playerId: string; fromMarker: CourseMarker; toMarker: CourseMarker }
  | {
      kind: 'OBSERVATION';
      key: string;
      roomId: number;
      roomDefinitionId: string;
      effect: ExplorationEffect | null;
      itemsCount: number | null;
    }
  | { kind: 'DECOMPRESSION_STARTED'; key: string; playerId: string; targetRoomId: number }
  | {
      kind: 'DECOMPRESSION_RESOLVED';
      key: string;
      targetRoomId: number;
      killedPlayerIds: string[];
      killedIntruderCount: number;
    }
  | {
      kind: 'EXCHANGE';
      key: string;
      entries: Extract<SanitizedGameLogEvent, { type: 'EXCHANGE_COMPLETED' }>['entries'];
    };

function knownEngines(event: Extract<SanitizedGameLogEvent, { type: 'ENGINES_INSPECTED' }>) {
  const known = event.engines.flatMap((engine) =>
    engine.isWorking === null ? [] : [{ engineNumber: engine.engineNumber, isWorking: engine.isWorking }],
  );
  return known.length === event.engines.length ? known : null;
}

function sceneOf(entry: SanitizedGameLogEntry, viewerId: string | null): ShipIntelScene[] {
  const event = entry.event;
  const key = entry.id;
  switch (event.type) {
    case 'ENGINES_INSPECTED': {
      const engines = knownEngines(event);
      return engines ? [{ kind: 'ENGINES', key, source: event.source, engines }] : [];
    }
    case 'COORDINATES_INSPECTED':
      return event.cardId === null ? [] : [{ kind: 'COORDINATES', key, cardId: event.cardId }];
    case 'COURSE_SET':
      return event.playerId === viewerId
        ? [{ kind: 'COURSE', key, playerId: event.playerId, fromMarker: event.fromMarker, toMarker: event.toMarker }]
        : [];
    case 'ROOM_PEEKED':
      return event.source === 'OBSERVATION_ROOM' && event.roomDefinitionId !== null
        ? [
            {
              kind: 'OBSERVATION',
              key,
              roomId: event.roomId,
              roomDefinitionId: event.roomDefinitionId,
              effect: event.effect,
              itemsCount: event.itemsCount,
            },
          ]
        : [];
    case 'DECOMPRESSION_STARTED':
      return [{ kind: 'DECOMPRESSION_STARTED', key, playerId: event.playerId, targetRoomId: event.targetRoomId }];
    case 'DECOMPRESSION_RESOLVED':
      return [
        {
          kind: 'DECOMPRESSION_RESOLVED',
          key,
          targetRoomId: event.targetRoomId,
          killedPlayerIds: [...event.killedPlayerIds],
          killedIntruderCount: event.killedIntruderIds.length,
        },
      ];
    case 'EXCHANGE_COMPLETED': {
      const involved = event.entries.some((item) => item.fromPlayerId === viewerId || item.toPlayerId === viewerId);
      return involved && event.entries.length > 0 ? [{ kind: 'EXCHANGE', key, entries: [...event.entries] }] : [];
    }
    default:
      return [];
  }
}

export function collectShipIntelScenes(
  log: readonly SanitizedGameLogEntry[],
  afterSequence: number,
  viewerId: string | null,
): ShipIntelScene[] {
  return log.filter((entry) => entry.sequence > afterSequence).flatMap((entry) => sceneOf(entry, viewerId));
}
