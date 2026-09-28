import type { SanitizedGameLogEvent, SanitizedGameState } from '@nemesis/shared';
import { playerName, type GameLogSegment } from './gameLogModel';

export type EvacuationLogEvent = Extract<
  SanitizedGameLogEvent,
  {
    type:
      | 'HIBERNATION_OPENED'
      | 'HIBERNATION_ATTEMPTED'
      | 'ESCAPE_POD_BOARDING_ATTEMPTED'
      | 'ESCAPE_POD_WAITING'
      | 'ESCAPE_POD_LAUNCHED'
      | 'ESCAPE_POD_EXITED'
      | 'ESCAPE_POD_TOGGLED';
  }
>;

const EVACUATION_TYPES = new Set<string>([
  'HIBERNATION_OPENED',
  'HIBERNATION_ATTEMPTED',
  'ESCAPE_POD_BOARDING_ATTEMPTED',
  'ESCAPE_POD_WAITING',
  'ESCAPE_POD_LAUNCHED',
  'ESCAPE_POD_EXITED',
  'ESCAPE_POD_TOGGLED',
]);

export function isEvacuationLogEvent(event: SanitizedGameLogEvent): event is EvacuationLogEvent {
  return EVACUATION_TYPES.has(event.type);
}

const EXIT_REASONS = {
  VOLUNTARY: 'выходит из Капсулы',
  INTRUDER: 'выброшен из Капсулы: в Спасательный отсек ворвался Чужой',
  POD_DESTROYED: 'покидает Капсулу — её катапультировало',
} as const;

function actor(view: SanitizedGameState, playerId: string): GameLogSegment {
  return { text: playerName(view, playerId), tone: 'player', strong: true };
}

export function formatEvacuationLogEvent(event: EvacuationLogEvent, view: SanitizedGameState): GameLogSegment[] {
  switch (event.type) {
    case 'HIBERNATION_OPENED':
      return [
        { text: 'Маркер Времени на синем поле: ' },
        { text: 'Камеры Анабиоза открыты', tone: 'success', strong: true },
        { text: '.' },
      ];
    case 'HIBERNATION_ATTEMPTED':
      return event.success
        ? [
            actor(view, event.playerId),
            { text: ' засыпает в ' },
            { text: 'Камере Анабиоза', tone: 'success', strong: true },
            { text: ' и выходит из игры.' },
          ]
        : [
            actor(view, event.playerId),
            { text: ' не успевает лечь в Камеру: ' },
            { text: 'в отсеке Чужой', tone: 'danger', strong: true },
            { text: '.' },
          ];
    case 'ESCAPE_POD_BOARDING_ATTEMPTED':
      return event.success
        ? [actor(view, event.playerId), { text: ` садится в Спасательную Капсулу №${event.podNumber}.` }]
        : [
            actor(view, event.playerId),
            { text: ` не успевает сесть в Капсулу №${event.podNumber}: ` },
            { text: 'в отсеке Чужой', tone: 'danger', strong: true },
            { text: '.' },
          ];
    case 'ESCAPE_POD_WAITING':
      return [actor(view, event.playerId), { text: ` ждёт в Капсуле №${event.podNumber}.` }];
    case 'ESCAPE_POD_LAUNCHED':
      return [
        { text: `Капсула №${event.podNumber} стартовала`, tone: 'success', strong: true },
        { text: `: ${event.occupantIds.map((id) => playerName(view, id)).join(' и ')} покидает корабль.` },
      ];
    case 'ESCAPE_POD_EXITED':
      return [actor(view, event.playerId), { text: ` ${EXIT_REASONS[event.reason]} (№${event.podNumber}).` }];
    case 'ESCAPE_POD_TOGGLED':
      return [
        actor(view, event.playerId),
        { text: event.isLocked ? ' блокирует ' : ' разблокирует ' },
        { text: `Капсулу №${event.podNumber}`, tone: event.isLocked ? 'warning' : 'success', strong: true },
        { text: event.source === 'EVACUATION_KEY' ? ' Ключом эвакуации.' : ' через Систему блокировки капсул.' },
      ];
  }
}
