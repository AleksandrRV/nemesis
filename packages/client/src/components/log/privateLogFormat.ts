import type { SanitizedGameLogEvent, SanitizedGameState } from '@nemesis/shared';
import { effectSegment, playerName, roomLabel, type GameLogSegment } from './gameLogModel';

type PrivateLogEvent = Extract<
  SanitizedGameLogEvent,
  { type: 'ROOM_PEEKED' | 'EVENT_PEEKED' | 'ENGINE_TOGGLED' | 'OBJECTIVE_PEEKED' }
>;

const PRIVATE_LOG_EVENT_TYPES: readonly SanitizedGameLogEvent['type'][] = [
  'ROOM_PEEKED',
  'EVENT_PEEKED',
  'ENGINE_TOGGLED',
  'OBJECTIVE_PEEKED',
];

export function isPrivateLogEvent(event: SanitizedGameLogEvent): event is PrivateLogEvent {
  return PRIVATE_LOG_EVENT_TYPES.includes(event.type);
}

function roomPeeked(
  event: Extract<PrivateLogEvent, { type: 'ROOM_PEEKED' }>,
  view: SanitizedGameState,
): GameLogSegment[] {
  const actor: GameLogSegment = { text: playerName(view, event.playerId), tone: 'player', strong: true };
  const room: GameLogSegment = { text: roomLabel(view, event.roomId), tone: 'room', strong: true };
  if (event.itemsCount === null) {
    return [actor, { text: ' тайно смотрит оборот: ' }, room, { text: '.' }];
  }
  const details: GameLogSegment[] = [{ text: ` — предметов: ${event.itemsCount}` }];
  if (event.effect) details.push({ text: ', жетон ' }, effectSegment(event.effect));
  return [actor, { text: ' смотрит оборот: ' }, room, ...details, { text: '.' }];
}

function eventPeeked(
  event: Extract<PrivateLogEvent, { type: 'EVENT_PEEKED' }>,
  view: SanitizedGameState,
): GameLogSegment[] {
  const placement = event.placed === 'TOP' ? 'оставляет её сверху' : 'кладёт её под низ колоды';
  const card: GameLogSegment[] =
    event.cardName === null
      ? [{ text: 'верхнюю карту Событий' }]
      : [{ text: 'карту Событий ' }, { text: `«${event.cardName}»`, tone: 'warning', strong: true }];
  return [
    { text: playerName(view, event.playerId), tone: 'player', strong: true },
    { text: event.cardName === null ? ' тайно смотрит ' : ' смотрит ' },
    ...card,
    { text: ` и ${placement}.` },
  ];
}

function engineToggled(
  event: Extract<PrivateLogEvent, { type: 'ENGINE_TOGGLED' }>,
  view: SanitizedGameState,
): GameLogSegment[] {
  const order = event.orderChanged ? 'порядок жетонов изменён' : 'порядок жетонов не менялся';
  const actor: GameLogSegment = { text: playerName(view, event.playerId), tone: 'player', strong: true };
  if (event.isWorking === null) {
    return [actor, { text: ` чинит или повреждает Двигатель №${event.engineNumber}: ${order}.` }];
  }
  return [
    actor,
    { text: ` оставляет Двигатель №${event.engineNumber} ` },
    event.isWorking
      ? { text: 'Исправным', tone: 'success', strong: true }
      : { text: 'Неисправным', tone: 'error', strong: true },
    { text: ` (${order}).` },
  ];
}

function objectivePeeked(
  event: Extract<PrivateLogEvent, { type: 'OBJECTIVE_PEEKED' }>,
  view: SanitizedGameState,
): GameLogSegment[] {
  const actor: GameLogSegment = { text: playerName(view, event.playerId), tone: 'player', strong: true };
  const target: GameLogSegment = { text: playerName(view, event.targetPlayerId), tone: 'player', strong: true };
  if (event.objectiveNames === null) {
    return [actor, { text: ' Ключом связи тайно смотрит карты Цели: ' }, target, { text: '.' }];
  }
  return [
    actor,
    { text: ' Ключом связи смотрит карты Цели: ' },
    target,
    { text: ' — ' },
    { text: event.objectiveNames.map((name) => `«${name}»`).join(', '), tone: 'warning', strong: true },
    { text: '.' },
  ];
}

export function formatPrivateLogEvent(event: PrivateLogEvent, view: SanitizedGameState): GameLogSegment[] {
  if (event.type === 'ROOM_PEEKED') return roomPeeked(event, view);
  if (event.type === 'EVENT_PEEKED') return eventPeeked(event, view);
  if (event.type === 'OBJECTIVE_PEEKED') return objectivePeeked(event, view);
  return engineToggled(event, view);
}
