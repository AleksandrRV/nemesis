import { COORDINATE_CARDS, type SanitizedGameLogEvent, type SanitizedGameState } from '@nemesis/shared';
import { DESTINATION_LABELS } from '../endgame/endgameModel';
import { corridorLabel, playerName, roomLabel, type GameLogSegment } from './gameLogModel';

export type ShipSystemsLogEvent = Extract<
  SanitizedGameLogEvent,
  {
    type:
      | 'ENGINES_INSPECTED'
      | 'COORDINATES_INSPECTED'
      | 'COURSE_SET'
      | 'DOORS_REARRANGED'
      | 'DECOMPRESSION_STARTED'
      | 'DECOMPRESSION_CANCELLED'
      | 'DECOMPRESSION_RESOLVED'
      | 'SLIME_ROOM_ENTERED'
      | 'EXCHANGE_PROPOSED'
      | 'EXCHANGE_ANSWERED'
      | 'EXCHANGE_COMPLETED'
      | 'DOOR_CHANGED'
      | 'FIRE_EXTINGUISHED';
  }
>;

const SHIP_SYSTEMS_TYPES = new Set<string>([
  'ENGINES_INSPECTED',
  'COORDINATES_INSPECTED',
  'COURSE_SET',
  'DOORS_REARRANGED',
  'DECOMPRESSION_STARTED',
  'DECOMPRESSION_CANCELLED',
  'DECOMPRESSION_RESOLVED',
  'SLIME_ROOM_ENTERED',
  'EXCHANGE_PROPOSED',
  'EXCHANGE_ANSWERED',
  'EXCHANGE_COMPLETED',
  'DOOR_CHANGED',
  'FIRE_EXTINGUISHED',
]);

export function isShipSystemsLogEvent(event: SanitizedGameLogEvent): event is ShipSystemsLogEvent {
  return SHIP_SYSTEMS_TYPES.has(event.type);
}

function actor(view: SanitizedGameState, playerId: string): GameLogSegment {
  return { text: playerName(view, playerId), tone: 'player', strong: true };
}

function room(view: SanitizedGameState, roomId: number): GameLogSegment {
  return { text: roomLabel(view, roomId), tone: 'room', strong: true };
}

function names(view: SanitizedGameState, playerIds: readonly string[]): string {
  return playerIds.map((playerId) => playerName(view, playerId)).join(', ');
}

function enginesInspected(
  event: Extract<ShipSystemsLogEvent, { type: 'ENGINES_INSPECTED' }>,
  view: SanitizedGameState,
): GameLogSegment[] {
  const where = event.source === 'ENGINE_CONTROL' ? ' в Машинном Отделении' : '';
  const numbers = event.engines.map((engine) => `№${engine.engineNumber}`).join(', ');
  if (event.engines.every((engine) => engine.isWorking === null)) {
    return [actor(view, event.playerId), { text: `${where} тайно проверяет Двигатель ${numbers}.` }];
  }
  const results = event.engines.flatMap<GameLogSegment>((engine, index) => [
    { text: `${index > 0 ? ', ' : ''}№${engine.engineNumber} — ` },
    engine.isWorking
      ? { text: 'Исправен', tone: 'success', strong: true }
      : { text: 'Неисправен', tone: 'error', strong: true },
  ]);
  return [actor(view, event.playerId), { text: `${where} проверяет Двигатели: ` }, ...results, { text: '.' }];
}

function coordinatesInspected(
  event: Extract<ShipSystemsLogEvent, { type: 'COORDINATES_INSPECTED' }>,
  view: SanitizedGameState,
): GameLogSegment[] {
  const card = event.cardId === null ? null : COORDINATE_CARDS.find((entry) => entry.id === event.cardId);
  if (!card) return [actor(view, event.playerId), { text: ' тайно смотрит карту Координат на Мостике.' }];
  const route = (['A', 'B', 'C', 'D'] as const)
    .map((marker) => `${marker} — ${DESTINATION_LABELS[card.destinations[marker]]}`)
    .join(', ');
  return [
    actor(view, event.playerId),
    { text: ' смотрит карту Координат: ' },
    { text: route, tone: 'warning', strong: true },
    { text: '.' },
  ];
}

function exchangeCompleted(
  event: Extract<ShipSystemsLogEvent, { type: 'EXCHANGE_COMPLETED' }>,
  view: SanitizedGameState,
): GameLogSegment[] {
  if (event.entries.length === 0) {
    return [actor(view, event.playerId), { text: ': Обмен не состоялся — участники отказались.' }];
  }
  const parts = event.entries.map((entry) => {
    const what = entry.name ? `«${entry.name}»` : 'Предмет из Инвентаря';
    const ammo = entry.ammo > 0 ? ` (Боезапас ${entry.ammo})` : '';
    return `${playerName(view, entry.fromPlayerId)} → ${playerName(view, entry.toPlayerId)}: ${what}${ammo}`;
  });
  return [{ text: 'Обмен: ', tone: 'system', strong: true }, { text: parts.join('; ') }, { text: '.' }];
}

export function formatShipSystemsLogEvent(event: ShipSystemsLogEvent, view: SanitizedGameState): GameLogSegment[] {
  switch (event.type) {
    case 'ENGINES_INSPECTED':
      return enginesInspected(event, view);
    case 'COORDINATES_INSPECTED':
      return coordinatesInspected(event, view);
    case 'COURSE_SET':
      return [
        actor(view, event.playerId),
        { text: ' переставляет маркер Курса: ' },
        { text: `${event.fromMarker} → ${event.toMarker}`, tone: 'warning', strong: true },
        { text: '.' },
      ];
    case 'DOORS_REARRANGED':
      return [
        actor(view, event.playerId),
        { text: ' из Центра Управления переключает Двери: ' },
        room(view, event.targetRoomId),
        {
          text: ` — закрыто ${event.closedCorridorIds.length}, открыто ${event.openedCorridorIds.length}.`,
          tone: 'door',
        },
      ];
    case 'DECOMPRESSION_STARTED':
      return [
        actor(view, event.playerId),
        { text: ' запускает Экстренную Декомпрессию: ', tone: 'danger', strong: true },
        room(view, event.targetRoomId),
        { text: event.fireRemoved ? ' — Двери закрыты, Пожар погас.' : ' — Двери закрыты.' },
      ];
    case 'DECOMPRESSION_CANCELLED':
      return [
        { text: 'Декомпрессия отменена: ', tone: 'success', strong: true },
        room(view, event.targetRoomId),
        { text: ' — Дверь открыта.' },
      ];
    case 'DECOMPRESSION_RESOLVED': {
      const victims = [
        ...(event.killedPlayerIds.length > 0 ? [names(view, event.killedPlayerIds)] : []),
        ...(event.killedIntruderIds.length > 0 ? [`Чужих: ${event.killedIntruderIds.length}`] : []),
      ];
      return [
        { text: 'Декомпрессия: ', tone: 'danger', strong: true },
        room(view, event.targetRoomId),
        { text: victims.length > 0 ? ` — в космос выброшены: ${victims.join(', ')}.` : ' — Комната пуста.' },
      ];
    }
    case 'SLIME_ROOM_ENTERED':
      return [
        actor(view, event.playerId),
        {
          text: event.alreadyHadSlime ? ' снова вляпался в Слизь.' : ' вляпался в Слизь: маркер Слизи на планшете.',
          tone: 'slime',
        },
      ];
    case 'EXCHANGE_PROPOSED':
      return [actor(view, event.playerId), { text: ` предлагает Обмен: ${names(view, event.participantIds)}.` }];
    case 'EXCHANGE_ANSWERED':
      return [
        actor(view, event.playerId),
        event.accepted
          ? { text: ' соглашается на Обмен.', tone: 'success' }
          : { text: ' отказывается от Обмена.', tone: 'warning' },
      ];
    case 'EXCHANGE_COMPLETED':
      return exchangeCompleted(event, view);
    case 'DOOR_CHANGED':
      return [
        actor(view, event.playerId),
        { text: event.to === 'CLOSED' ? ' закрывает Дверь: ' : ' открывает Дверь: ', tone: 'door' },
        { text: `Коридор ${corridorLabel(event.corridorId)}`, tone: 'corridor', strong: true },
        { text: '.' },
      ];
    case 'FIRE_EXTINGUISHED':
      return [
        actor(view, event.playerId),
        { text: ' тушит Пожар: ', tone: 'success' },
        room(view, event.roomId),
        { text: '.' },
      ];
  }
}
