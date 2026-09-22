import { INTRUDER_TYPE_NAMES, formatIntruderLogEvent } from './intruderLogModel';
import { eventCardName, formatEventEffectOutcome, formatHiveDevelopmentOutcome } from './eventEffectLogModel';
import {
  ADDITIONAL_ROOMS_2,
  BASIC_ROOMS_1,
  SPECIAL_ROOMS,
  TIME_TRACK_LENGTH,
  type GameLogEntry,
  type GameLogEvent,
  type SanitizedGameState,
} from '@nemesis/shared';

export type GameLogTone =
  | 'system'
  | 'player'
  | 'room'
  | 'corridor'
  | 'noise'
  | 'fire'
  | 'malfunction'
  | 'slime'
  | 'danger'
  | 'silence'
  | 'door'
  | 'success'
  | 'warning'
  | 'error';

export interface GameLogSegment {
  text: string;
  tone?: GameLogTone;
  strong?: boolean;
}

export interface FormattedGameLogEntry {
  id: string;
  sequence: number;
  segments: GameLogSegment[];
}

const ROOM_NAMES = new Map(
  [...SPECIAL_ROOMS, ...BASIC_ROOMS_1, ...ADDITIONAL_ROOMS_2].map((room) => [room.id, room.name]),
);

const EFFECT_LABELS: Record<
  NonNullable<Extract<GameLogEvent, { type: 'EXPLORATION_TOKEN_REVEALED' }>['effect']>,
  string
> = {
  FIRE: 'Пожар',
  MALFUNCTION: 'Неисправность',
  SLIME: 'Слизь',
  DOORS: 'Двери',
  DANGER: 'Опасность',
  SILENCE: 'Тишина',
};

const CATEGORY_LABELS: Record<Extract<GameLogEvent, { type: 'ROOM_DISCOVERED' }>['category'], string> = {
  SPECIAL: 'особая',
  ROOM_1: 'основная «1»',
  ROOM_2: 'дополнительная «2»',
};

const OUTCOME_LABELS: Record<Extract<GameLogEvent, { type: 'EXPLORATION_EFFECT_RESOLVED' }>['outcome'], string> = {
  FIRE_PLACED: 'маркер Пожара установлен',
  FIRE_ALREADY_PRESENT: 'Пожар уже был в отсеке',
  SHIP_EXPLODED: 'корабль взорвался',
  MALFUNCTION_PLACED: 'маркер Неисправности установлен',
  MALFUNCTION_ALREADY_PRESENT: 'Неисправность уже была в отсеке',
  MALFUNCTION_FORBIDDEN: 'маркер нельзя установить в этом отсеке',
  HULL_BREACH: 'обшивка не выдержала',
  SLIME_APPLIED: 'персонаж получил Слизь',
  SLIME_ALREADY_PRESENT: 'у персонажа уже была Слизь',
  DOOR_CLOSED: 'Дверь закрыта',
  DOOR_MOVED: 'жетон Двери переставлен с другого Коридора',
  DOOR_ALREADY_CLOSED: 'Дверь уже закрыта',
  DOOR_DESTROYED: 'Разрушенную Дверь нельзя закрыть',
  DANGER_TRIGGERED: 'сработала Опасность',
  SILENCE_RESOLVED: 'Шум отменён',
};

export function playerName(view: SanitizedGameState, playerId: string): string {
  return view.players[playerId]?.name ?? playerId;
}

export function roomLabel(view: SanitizedGameState, roomId: number): string {
  const room = view.ship.rooms[roomId];
  const numberLabel = `#${String(roomId).padStart(3, '0')}`;

  if (room?.isExplored && room.definitionId) {
    const name = ROOM_NAMES.get(room.definitionId);

    if (name) return `«${name}» (${numberLabel})`;
  }

  return `отсек ${numberLabel}`;
}

function corridorLabel(corridorId: string): string {
  return corridorId.replace('-', '–');
}

function noiseLabel(result: Extract<GameLogEvent, { type: 'NOISE_ROLLED' }>['result']): GameLogSegment {
  if (result.kind === 'CORRIDOR') {
    return { text: `Коридор ${result.number}`, tone: 'corridor', strong: true };
  }

  return result.kind === 'DANGER'
    ? { text: 'Опасность', tone: 'danger', strong: true }
    : { text: 'Тишина', tone: 'silence', strong: true };
}

function targetLabel(target: Extract<GameLogEvent, { type: 'NOISE_MARKER_PLACED' }>['target']): GameLogSegment[] {
  if (target.kind === 'TECHNICAL_CORRIDOR') {
    return [{ text: 'Технические Коридоры', tone: 'corridor', strong: true }];
  }

  return [{ text: `Коридор ${corridorLabel(target.corridorId)}`, tone: 'corridor', strong: true }];
}

function reasonLabel(reason: Extract<GameLogEvent, { type: 'NOISE_MARKER_PLACED' }>['reason']): string {
  if (reason === 'CAREFUL') return 'Осторожное движение';
  if (reason === 'DANGER') return 'Опасность';
  if (reason === 'BLANK') return 'Пустой жетон';
  if (reason === 'EVENT') return 'карта События';

  return 'бросок Шума';
}

function effectTone(effect: Extract<GameLogEvent, { type: 'EXPLORATION_TOKEN_REVEALED' }>['effect']): GameLogTone {
  if (effect === 'FIRE') return 'fire';
  if (effect === 'MALFUNCTION') return 'malfunction';
  if (effect === 'SLIME') return 'slime';
  if (effect === 'DANGER') return 'danger';
  if (effect === 'SILENCE') return 'silence';

  return 'door';
}

function effectSegment(
  effect: Extract<GameLogEvent, { type: 'EXPLORATION_TOKEN_REVEALED' }>['effect'],
): GameLogSegment {
  return { text: EFFECT_LABELS[effect], tone: effectTone(effect), strong: true };
}

function outcomeTone(outcome: Extract<GameLogEvent, { type: 'EXPLORATION_EFFECT_RESOLVED' }>['outcome']): GameLogTone {
  if (outcome === 'SHIP_EXPLODED' || outcome === 'HULL_BREACH') return 'error';
  if (outcome.includes('FIRE')) return 'fire';
  if (outcome.includes('MALFUNCTION')) return 'malfunction';
  if (outcome.includes('SLIME')) return 'slime';
  if (outcome.includes('DOOR')) return 'door';
  if (outcome.includes('DANGER')) return 'danger';

  return 'silence';
}

function formatEntry(entry: GameLogEntry, view: SanitizedGameState): GameLogSegment[] {
  const event = entry.event;

  switch (event.type) {
    case 'GAME_STARTED':
      return [{ text: 'Партия начата', tone: 'system', strong: true }, { text: '.' }];

    case 'ROUND_STARTED':
      return [
        { text: `Раунд ${event.round}`, tone: 'system', strong: true },
        { text: `: жетон Первого Игрока у ` },
        { text: playerName(view, event.firstPlayerId), tone: 'player', strong: true },
        { text: '.' },
      ];

    case 'PLAYER_TURN_STARTED':
      return [
        { text: 'Ход игрока ', tone: 'system' },
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: '.' },
      ];

    case 'FIRE_DAMAGE_TAKEN':
      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ` завершил ход в горящем отсеке ${roomLabel(view, event.roomId)} и получил ` },
        { text: `${event.woundsCount} Лёгкую Травму`, tone: 'fire', strong: true },
        { text: '.' },
      ];

    case 'SEARCH_PERFORMED':
      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ` выполнил Поиск в ${roomLabel(view, event.roomId)}.` },
      ];

    case 'ROOM_ABILITY_USED':
      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ` задействовал отсек ${roomLabel(view, event.roomId)}` },
        ...(event.detail ? [{ text: ` (${event.detail})` }] : []),
        { text: '.' },
      ];

    case 'ACTION_CARD_PLAYED':
      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ' разыгрывает карту действия «' },
        { text: event.cardName, tone: 'system', strong: true },
        { text: '».' },
      ];

    case 'ACTION_CARD_DRAWN':
      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ' берёт карту Действия в руку (эффект карты).' },
      ];

    case 'ITEM_USED':
      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ' использует предмет «' },
        { text: event.itemName, tone: 'success', strong: true },
        { text: '».' },
      ];

    case 'PLAYER_MOVED':
      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ` переместился из ${roomLabel(view, event.fromRoomId)} в ${roomLabel(view, event.toRoomId)} по ` },
        { text: `Коридору ${corridorLabel(event.corridorId)}`, tone: 'corridor', strong: true },
        ...(event.mode === 'CAREFUL'
          ? [{ text: ' — Осторожное движение', tone: 'warning' as const, strong: true }]
          : []),
        { text: '.' },
      ];

    case 'ROOM_DISCOVERED':
      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ' обнаружил ' },
        { text: `«${event.roomName}»`, tone: 'room', strong: true },
        { text: ` — ${CATEGORY_LABELS[event.category]} отсек.` },
      ];

    case 'EXPLORATION_TOKEN_REVEALED':
      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ` вытянул жетон Исследования в ${roomLabel(view, event.roomId)}: ` },
        {
          text: `${event.itemsCount} предмет${event.itemsCount === 1 ? '' : event.itemsCount < 5 ? 'а' : 'ов'}`,
          tone: 'success',
          strong: true,
        },
        { text: ', эффект «' },
        effectSegment(event.effect),
        { text: '».' },
      ];

    case 'EXPLORATION_EFFECT_RESOLVED':
      return [
        { text: 'Эффект «' },
        effectSegment(event.effect),
        { text: `» в ${roomLabel(view, event.roomId)}: ` },
        { text: OUTCOME_LABELS[event.outcome], tone: outcomeTone(event.outcome), strong: true },
        { text: '.' },
      ];

    case 'NOISE_ROLLED':
      return [
        { text: 'Кубик Шума', tone: 'noise', strong: true },
        { text: ` в ${roomLabel(view, event.roomId)}: выпало «` },
        noiseLabel(event.result),
        { text: '».' },
      ];

    case 'NOISE_MARKER_PLACED':
      return [
        { text: 'Маркер Шума', tone: 'noise', strong: true },
        { text: ' выставлен в ' },
        ...targetLabel(event.target),
        { text: ` (${reasonLabel(event.reason)}).` },
      ];

    case 'NOISE_SKIPPED':
      if (event.reason === 'COMPANION') {
        return [
          { text: 'Шум не бросался', tone: 'silence', strong: true },
          { text: `: в ${roomLabel(view, event.roomId)} уже есть персонаж или Чужой.` },
        ];
      }

      if (event.reason === 'EXPLORATION_SILENCE') {
        return [{ text: 'Жетон «Тишина» отменил бросок Шума.', tone: 'silence', strong: true }];
      }

      if (event.reason === 'NOISE_SILENCE') {
        return [{ text: 'Грань «Тишина» отменила размещение маркера Шума.', tone: 'silence', strong: true }];
      }

      return [
        { text: 'Выпавший номер не имеет выхода из отсека: маркер не установлен.', tone: 'warning', strong: true },
      ];

    case 'GAME_OVER':
      return [
        { text: 'ПАРТИЯ ЗАВЕРШЕНА', tone: 'error', strong: true },
        {
          text:
            event.reason === 'SHIP_EXPLODED'
              ? ': корабль взорвался.'
              : event.reason === 'HULL_BREACH'
                ? ': произошёл разрыв обшивки.'
                : event.reason === 'HYPERSPACE_JUMP'
                  ? ': корабль совершил гиперпрыжок. Все, кто не успел в Анабиоз, погибли от перегрузок.'
                  : ': на корабле не осталось активных персонажей.',
        },
      ];

    case 'PLAYER_PASSED':
      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ' объявил ' },
        { text: 'Пас', tone: 'system', strong: true },
        ...(event.discardedCount > 0 ? [{ text: ` и сбросил ${event.discardedCount} карт(ы)` }] : []),
        { text: '.' },
      ];

    case 'TIME_TRACK_ADVANCED':
      return [
        { text: `Фаза Событий: маркер Времени — позиция ${event.timeTrackPosition} из ${TIME_TRACK_LENGTH}.` },
        ...(event.selfDestructTrackPosition !== null
          ? [
              {
                text: ` Самоуничтожение — позиция ${event.selfDestructTrackPosition} из 8.`,
                tone: 'warning' as const,
              },
            ]
          : []),
      ];

    case 'EVENT_CARD_DRAWN': {
      const direction = event.card.corridorNumber === 'ANY' ? 'любое' : `Коридор ${event.card.corridorNumber}`;
      const symbols = event.card.intruderTypes.map((type) => INTRUDER_TYPE_NAMES[type]).join(', ');
      return [
        { text: `Фаза Событий: карта Событий «${event.card.name}»`, tone: 'warning', strong: true },
        { text: ` — направление ${direction}, двигаются: ${symbols}.` },
      ];
    }

    case 'FIRE_DAMAGE_TAKEN_BY_INTRUDER':
      return [
        { text: `Пожар в ${roomLabel(view, event.roomId)}: `, tone: 'fire' },
        { text: INTRUDER_TYPE_NAMES[event.intruderType], tone: 'danger', strong: true },
        { text: ' получает 1 Рану.' },
      ];

    case 'EGG_DESTROYED_BY_FIRE':
      return [
        { text: 'Пожар уничтожает ', tone: 'fire' },
        { text: 'Яйцо Чужих', tone: 'danger', strong: true },
        { text: ` в ${roomLabel(view, event.roomId)}.` },
      ];

    case 'OBJECT_PICKED_UP': {
      const kindLabel =
        event.objectKind === 'CORPSE'
          ? 'Труп члена экипажа'
          : event.objectKind === 'EGG'
            ? 'Яйцо Чужих'
            : 'Останки Чужого';
      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ' поднимает Тяжёлый объект «' },
        { text: kindLabel, tone: 'warning', strong: true },
        { text: ` в ${roomLabel(view, event.roomId)}.` },
      ];
    }
    case 'EVENT_EFFECT_RESOLVED':
      return formatEventEffectOutcome(event.outcome, view);
    case 'HIVE_DEVELOPMENT_RESOLVED':
      return formatHiveDevelopmentOutcome(event.outcome, view);
    case 'HIVE_DEVELOPMENT_SKIPPED':
      return [{ text: 'Развитие Улья: Пул Чужих пуст — вытягивать нечего.', tone: 'silence' }];
    case 'EVENT_CARD_CHOSEN':
      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ' разыгрывает выбранную карту Событий: ' },
        { text: `«${eventCardName(event.chosenCardId)}»`, tone: 'warning', strong: true },
        { text: ` (${event.discardedCardIds.length} других — в сброс).` },
      ];
    case 'DEV_STATE_CHANGED':
      return [
        { text: 'Dev-переключатель', tone: 'warning', strong: true },
        { text: ` изменил ${event.target === 'DOOR' ? 'Дверь' : 'маркер Шума'} в ` },
        { text: `Коридоре ${corridorLabel(event.corridorId)}`, tone: 'corridor', strong: true },
        { text: '.' },
      ];
    default:
      return formatIntruderLogEvent(event, view);
  }
}

export function formatGameLogEntry(entry: GameLogEntry, view: SanitizedGameState): FormattedGameLogEntry {
  return { id: entry.id, sequence: entry.sequence, segments: formatEntry(entry, view) };
}

export function formatGameLog(view: SanitizedGameState): FormattedGameLogEntry[] {
  return view.gameLog.map((entry) => formatGameLogEntry(entry, view));
}
