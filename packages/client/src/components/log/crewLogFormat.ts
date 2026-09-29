import type { SanitizedGameLogEvent, SanitizedGameState } from '@nemesis/shared';
import { playerName, roomLabel, type GameLogSegment } from './gameLogModel';

export type CrewLogEvent = Extract<
  SanitizedGameLogEvent,
  { type: 'REPOSITION_ANSWERED' | 'DISMISS_PLAYED' | 'ACTION_DISMISSED' | 'DISMISS_OVERRULED' }
>;

const CREW_LOG_TYPES = new Set<string>([
  'REPOSITION_ANSWERED',
  'DISMISS_PLAYED',
  'ACTION_DISMISSED',
  'DISMISS_OVERRULED',
]);

export const DISMISSABLE_ACTION_LABELS: Record<string, string> = {
  ACTION_MOVE: 'Перемещение',
  ACTION_CAREFUL_MOVE: 'Осторожное Перемещение',
  ACTION_SEARCH: 'Обыск',
  ACTION_SHOOT: 'Выстрел',
  ACTION_MELEE: 'Рукопашная',
  ACTION_PICK_UP_OBJECT: 'Подъём Предмета',
  ACTION_ROOM_ABILITY: 'Действие Комнаты',
  ACTION_PLAY_CARD: 'Розыгрыш карты',
  ACTION_USE_ITEM: 'Использование Предмета',
  ACTION_CRAFT_ITEM: 'Создание Предмета',
  ACTION_ACTIVATE_QUEST: 'Выполнение задания',
  ACTION_EXCHANGE: 'Обмен',
};

export function dismissableActionLabel(actionType: string): string {
  return DISMISSABLE_ACTION_LABELS[actionType] ?? 'Действие';
}

export function isCrewLogEvent(event: SanitizedGameLogEvent): event is CrewLogEvent {
  return CREW_LOG_TYPES.has(event.type);
}

function actor(view: SanitizedGameState, playerId: string): GameLogSegment {
  return { text: playerName(view, playerId), tone: 'player', strong: true };
}

export function formatCrewLogEvent(event: CrewLogEvent, view: SanitizedGameState): GameLogSegment[] {
  switch (event.type) {
    case 'REPOSITION_ANSWERED':
      return [
        actor(view, event.playerId),
        event.accepted
          ? { text: ' соглашается отойти в ', tone: 'success' }
          : { text: ' отказывается отходить в ', tone: 'warning' },
        { text: roomLabel(view, event.targetRoomId), tone: 'room', strong: true },
        { text: ` по приказу ${playerName(view, event.requesterId)}.` },
      ];
    case 'DISMISS_PLAYED':
      return [
        actor(view, event.playerId),
        { text: ' играет «Отставить»', tone: 'warning', strong: true },
        { text: ` — под отмену: ${playerName(view, event.targetPlayerId)}.` },
      ];
    case 'ACTION_DISMISSED':
      return [
        { text: 'Отставить! ', tone: 'danger', strong: true },
        { text: `${dismissableActionLabel(event.actionType)} ` },
        actor(view, event.playerId),
        { text: ` отменено — Цена оплачена (карт в сброс: ${event.paidCardCount}).` },
      ];
    case 'DISMISS_OVERRULED':
      return [
        { text: 'Встречное «Отставить»: ', tone: 'success', strong: true },
        actor(view, event.playerId),
        { text: ' всё-таки выполняет Действие.' },
      ];
  }
}
