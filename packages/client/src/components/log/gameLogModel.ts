import {
  ADDITIONAL_ROOMS_2,
  BASIC_ROOMS_1,
  SPECIAL_ROOMS,
  type GameLogEntry,
  type GameLogEvent,
  type GameOverReason,
  type SanitizedGameState,
} from '@nemesis/shared';

import {
  COMBAT_DIE_FACE_LABELS,
  HEAVY_OBJECT_LABELS,
  INTRUDER_TOKEN_LABELS,
  INTRUDER_TYPE_LABELS,
} from '../../utils/labels';

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

const GAME_OVER_LABELS: Record<GameOverReason, string> = {
  SHIP_EXPLODED: ': корабль взорвался.',
  HULL_BREACH: ': произошёл разрыв обшивки.',
  ALL_PLAYERS_DEAD: ': погибли все персонажи.',
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

function playerName(view: SanitizedGameState, playerId: string): string {
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

export function woundsSummary(light: number, serious: number, contamination: number): string | null {
  const parts: string[] = [];

  if (light > 0) parts.push(light === 1 ? '1 Лёгкая Травма' : `${light} Лёгкие Травмы`);
  if (serious > 0) parts.push(serious === 1 ? '1 Тяжёлая Травма' : `${serious} Тяжёлые Травмы`);

  if (contamination > 0) {
    parts.push(contamination === 1 ? '1 Заражение' : `${contamination} Заражения`);
  }

  return parts.length > 0 ? parts.join(', ') : null;
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

    case 'CONTACT_OCCURRED': {
      const cleared: GameLogSegment[] =
        event.clearedCorridorIds.length > 0 || event.clearedTechnical
          ? [
              {
                text: ` Маркеры Шума сброшены${event.clearedTechnical ? ' (включая Технические Коридоры)' : ''}.`,
                tone: 'noise',
              },
            ]
          : [];

      return [
        { text: 'КОНТАКТ', tone: 'danger', strong: true },
        { text: '! ' },
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ` в ${roomLabel(view, event.roomId)} — жетон «` },
        { text: INTRUDER_TOKEN_LABELS[event.tokenType], tone: 'danger', strong: true },
        {
          text: `» (число Бегства ${event.escapeNumber}, карт на руке: ${event.handCount}).`,
        },
        ...(event.isFirstContact ? [{ text: ' Первый Контакт партии!', tone: 'warning' as const, strong: true }] : []),
        ...cleared,
      ];
    }

    case 'SURPRISE_ATTACK_TRIGGERED':
      return [
        { text: 'ВНЕЗАПНАЯ АТАКА', tone: 'error', strong: true },
        { text: '! ' },
        { text: INTRUDER_TYPE_LABELS[event.intruderType], tone: 'danger', strong: true },
        { text: ' атакует ' },
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ` (карт на руке: ${event.handCount}, число Бегства: ${event.escapeNumber}).` },
      ];

    case 'SURPRISE_ATTACK_RESOLVED': {
      if (event.outcome === 'MISSED') {
        return [
          { text: 'Мимо', tone: 'success', strong: true },
          { text: `! Карта «${event.attackCardName ?? '—'}» не задела ` },
          { text: playerName(view, event.playerId), tone: 'player', strong: true },
          { text: '.' },
        ];
      }

      if (event.outcome === 'LARVA_INFECTION') {
        return [
          { text: 'Личинка', tone: 'danger', strong: true },
          { text: ' заражает ' },
          { text: playerName(view, event.playerId), tone: 'player', strong: true },
          { text: ': +1 Заражение, Личинка уходит на планшет персонажа.' },
        ];
      }

      if (event.outcome === 'HIT_DIED') {
        return [
          { text: playerName(view, event.playerId), tone: 'player', strong: true },
          { text: ` погибает от Внезапной атаки («${event.attackCardName ?? '—'}»)!` },
        ];
      }

      const summary = woundsSummary(event.lightWoundsDealt, event.seriousWoundsDealt, event.contaminationDealt);

      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ` пережил Внезапную атаку («${event.attackCardName ?? '—'}»)` },
        ...(summary ? [{ text: `: ${summary}.` }] : [{ text: ' без ран и Заражения.' }]),
      ];
    }

    case 'ESCAPE_ATTACK_RESOLVED': {
      if (event.outcome === 'MISSED') {
        return [
          { text: 'Мимо', tone: 'success', strong: true },
          { text: `! Карта «${event.attackCardName ?? '—'}» не задела убегающего ` },
          { text: playerName(view, event.playerId), tone: 'player', strong: true },
          { text: '.' },
        ];
      }

      if (event.outcome === 'LARVA_INFECTION') {
        return [
          { text: 'Личинка', tone: 'danger', strong: true },
          { text: ' заражает убегающего ' },
          { text: playerName(view, event.playerId), tone: 'player', strong: true },
          { text: ': +1 Заражение, Личинка уходит на планшет персонажа.' },
        ];
      }

      if (event.outcome === 'HIT_DIED') {
        return [
          { text: playerName(view, event.playerId), tone: 'player', strong: true },
          { text: ` погибает при Побеге («${event.attackCardName ?? '—'}»)!` },
        ];
      }

      const summary = woundsSummary(event.lightWoundsDealt, event.seriousWoundsDealt, event.contaminationDealt);

      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ` пережил атаку в спину («${event.attackCardName ?? '—'}»)` },
        ...(summary ? [{ text: `: ${summary}.` }] : [{ text: ' без ран и Заражения.' }]),
      ];
    }

    case 'INTRUDER_TRANSFORMED':
      return [
        { text: 'Трансформация', tone: 'danger', strong: true },
        { text: ` в ${roomLabel(view, event.roomId)}: Крипер становится Трутнем.` },
      ];

    case 'INTRUDER_CALLED':
      if (!event.intruderId) {
        return [
          { text: 'Зов', tone: 'danger', strong: true },
          { text: ` в ${roomLabel(view, event.roomId)}: Пустой жетон — никто не пришёл.` },
        ];
      }

      return [
        { text: 'Зов', tone: 'danger', strong: true },
        { text: ` в ${roomLabel(view, event.roomId)}: появляется ` },
        { text: INTRUDER_TOKEN_LABELS[event.tokenType], tone: 'danger', strong: true },
        { text: '!' },
      ];

    case 'SHOT_FIRED':
      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ` стреляет из «${event.weaponName}» по ` },
        { text: INTRUDER_TYPE_LABELS[event.intruderType], tone: 'danger', strong: true },
        { text: ` в ${roomLabel(view, event.roomId)}: кубик — «` },
        { text: COMBAT_DIE_FACE_LABELS[event.dieFace], tone: 'warning', strong: true },
        { text: event.woundsDealt > 0 ? `», Ран нанесено: ${event.woundsDealt}.` : '» — промах.' },
      ];

    case 'TOUGHNESS_CHECKED': {
      const cards = event.attackCards
        .map((card) => `«${card.name}» (Стойкость ${card.toughness}${card.hasRetreat ? ', отступление!' : ''})`)
        .join(' + ');
      const outcome = event.retreated
        ? { text: 'Чужой отступает!', tone: 'warning' as const }
        : event.killed
          ? { text: 'Чужой убит!', tone: 'success' as const }
          : { text: 'Чужой выживает.', tone: 'danger' as const };
      return [
        { text: 'Проверка Стойкости', tone: 'system', strong: true },
        { text: ': ' },
        { text: INTRUDER_TYPE_LABELS[event.intruderType], tone: 'danger', strong: true },
        { text: ` — ${cards} против ${event.woundsTotal} Ран(ы). ` },
        { text: outcome.text, tone: outcome.tone, strong: true },
      ];
    }

    case 'INTRUDER_KILLED':
      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ' убивает ' },
        { text: INTRUDER_TYPE_LABELS[event.intruderType], tone: 'danger', strong: true },
        { text: ` в ${roomLabel(view, event.roomId)}.` },
      ];

    case 'INTRUDER_RETREATED':
      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ' заставляет ' },
        { text: INTRUDER_TYPE_LABELS[event.intruderType], tone: 'danger', strong: true },
        { text: ` отступить: ${roomLabel(view, event.fromRoomId)} → ${roomLabel(view, event.toRoomId)}.` },
      ];

    case 'MELEE_ATTACKED':
      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ' атакует врукопашную ' },
        { text: INTRUDER_TYPE_LABELS[event.intruderType], tone: 'danger', strong: true },
        { text: ` в ${roomLabel(view, event.roomId)}: кубик — «` },
        { text: COMBAT_DIE_FACE_LABELS[event.dieFace], tone: 'warning', strong: true },
        {
          text:
            event.woundsDealt > 0
              ? `», Ран нанесено: ${event.woundsDealt}. Заражение: +${event.contaminationDealt}.`
              : `» — промах. Заражение: +${event.contaminationDealt}, Тяжёлая Травма: +${event.seriousWoundDealt}.`,
        },
      ];

    case 'OBJECT_PICKED_UP':
      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ' подбирает ' },
        { text: HEAVY_OBJECT_LABELS[event.objectKind], tone: 'system', strong: true },
        { text: ` в ${roomLabel(view, event.roomId)}.` },
      ];

    case 'PLAYER_DIED':
      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ` погибает в ${roomLabel(view, event.roomId)} от атаки Чужого. Труп остаётся в отсеке.` },
      ];

    case 'GAME_OVER':
      return [{ text: 'ПАРТИЯ ЗАВЕРШЕНА', tone: 'error', strong: true }, { text: GAME_OVER_LABELS[event.reason] }];

    case 'PLAYER_PASSED':
      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ' объявил ' },
        { text: 'Пас', tone: 'system', strong: true },
        ...(event.discardedCount > 0 ? [{ text: ` и сбросил ${event.discardedCount} карт(ы)` }] : []),
        { text: '.' },
      ];

    case 'EVENT_PHASE_SKIPPED':
      return [
        { text: 'Фаза Событий (раунд ', tone: 'warning' },
        { text: String(event.round), tone: 'warning', strong: true },
        {
          text: ') пропущена: механика Событий и атак Чужих находится в разработке (v0.5.0). Начат следующий раунд.',
          tone: 'warning',
        },
      ];

    case 'DEV_STATE_CHANGED':
      return [
        { text: 'Dev-переключатель', tone: 'warning', strong: true },
        { text: ` изменил ${event.target === 'DOOR' ? 'Дверь' : 'маркер Шума'} в ` },
        { text: `Коридоре ${corridorLabel(event.corridorId)}`, tone: 'corridor', strong: true },
        { text: '.' },
      ];
  }
}

export function formatGameLogEntry(entry: GameLogEntry, view: SanitizedGameState): FormattedGameLogEntry {
  return { id: entry.id, sequence: entry.sequence, segments: formatEntry(entry, view) };
}

export function formatGameLog(view: SanitizedGameState): FormattedGameLogEntry[] {
  return view.gameLog.map((entry) => formatGameLogEntry(entry, view));
}
