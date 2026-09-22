/**
 * Модель интерфейса Фазы Событий (Шаг 9).
 *
 * Кинематографичный оверлей показывает Фазу Событий последнего раунда
 * в шести последовательных шагах — в том же порядке, в каком её разрешает
 * движок (время → атаки → огонь → карта События → эффект → Улей). Каждый шаг
 * предъявляет свои записи Журнала и подсвечивает затронутые отсеки на карте.
 */
import type { GameLogEntry, RoomId, SanitizedGameState } from '@nemesis/shared';

export type EventPhaseStepId = 'TIME' | 'ATTACKS' | 'FIRE' | 'EVENT_CARD' | 'EFFECT' | 'HIVE';

export interface EventPhaseStepModel {
  id: EventPhaseStepId;
  title: string;
  /** Записи Журнала шага (по порядку разрешения движком). */
  entries: GameLogEntry[];
  /** Отсеки, подсвечиваемые на карте во время шага. */
  highlightRoomIds: RoomId[];
}

export interface EventPhaseModalModel {
  /** Секвенс записи Сдвига Счётчиков Времени — ключ Фазы. */
  phaseKey: number;
  round: number;
  steps: EventPhaseStepModel[];
}

const STEP_TITLES: Record<EventPhaseStepId, string> = {
  TIME: 'Счётчики Времени и Самоуничтожения',
  ATTACKS: 'Атаки Чужих',
  FIRE: 'Урон от огня',
  EVENT_CARD: 'Карта События: движение Чужих',
  EFFECT: 'Текстовый эффект карты',
  HIVE: 'Развитие Улья',
};

/** Отсеки, подсвечиваемые текстовым эффектом карты События. */
function effectHighlightRooms(entry: GameLogEntry): RoomId[] {
  if (entry.event.type !== 'EVENT_EFFECT_RESOLVED') return [];
  const result = entry.event.outcome;
  switch (result.kind) {
    case 'MATURATION':
      return result.creeperRoomIds;
    case 'RAMPAGE':
      return result.malfunctionRoomIds;
    case 'FLAMMABLE_MIXTURE':
      return result.fireRoomIds;
    case 'DESTRUCTIVE_FLAME':
      return [...result.malfunctionRoomIds, ...result.fireRoomIds];
    case 'SHORT_CIRCUIT':
      return result.malfunctionRoomIds;
    case 'LIFE_SUPPORT_MALFUNCTION':
      return result.malfunctionRoomIds;
    case 'MALFUNCTION':
      return result.targetRoomId ? [result.targetRoomId] : [];
    default:
      return [];
  }
}

function roomIdsFromEntry(entry: GameLogEntry): RoomId[] {
  switch (entry.event.type) {
    case 'EVENT_PHASE_ATTACK_RESOLVED':
      return [entry.event.roomId];
    case 'SURPRISE_ATTACK_RESOLVED':
      return [entry.event.roomId];
    case 'FIRE_DAMAGE_TAKEN_BY_INTRUDER':
      return entry.event.roomId ? [entry.event.roomId] : [];
    case 'EGG_DESTROYED_BY_FIRE':
      return [entry.event.roomId];
    case 'INTRUDER_MOVED':
      return [entry.event.fromRoomId, ...(entry.event.toRoomId ? [entry.event.toRoomId] : [])];
    case 'INTRUDERS_BLOCKED_BY_DOOR': {
      // Дверь принадлежит кораблю: подсветка отсеков через координаты недоступна
      // на чистом клиенте без карты коридоров, поэтому шаг «дверь» подсвечивает
      // отсеки по записям движения ниже (см. EVENT_CARD).
      return [];
    }
    case 'EVENT_EFFECT_RESOLVED':
      return effectHighlightRooms(entry);
    default:
      return [];
  }
}

function stepIdForEntry(entry: GameLogEntry): EventPhaseStepId | null {
  switch (entry.event.type) {
    case 'TIME_TRACK_ADVANCED':
    case 'ESCAPE_PODS_UNLOCKED':
      return 'TIME';
    case 'EVENT_PHASE_ATTACK_RESOLVED':
    case 'SURPRISE_ATTACK_RESOLVED':
      return 'ATTACKS';
    case 'FIRE_DAMAGE_TAKEN_BY_INTRUDER':
    case 'EGG_DESTROYED_BY_FIRE':
      return 'FIRE';
    case 'EVENT_CARD_DRAWN':
    case 'INTRUDER_MOVED':
    case 'INTRUDERS_BLOCKED_BY_DOOR':
      return 'EVENT_CARD';
    case 'EVENT_EFFECT_RESOLVED':
    case 'EVENT_CARD_CHOSEN':
      return 'EFFECT';
    case 'HIVE_DEVELOPMENT_RESOLVED':
    case 'HIVE_DEVELOPMENT_SKIPPED':
      return 'HIVE';
    default:
      // Побочные записи (шум, каскады Королевы, трансформации) остаются в Журнале,
      // но отдельным шагом презентации не предъявляются.
      return null;
  }
}

/**
 * Собирает модель модалки по последней Фазе Событий: от последнего Сдвига
 * Счётчиков Времени до записи Начала Нового Раунда (или до конца Журнала).
 * Возвращает `null`, если завершённой Фазы Событий ещё не было.
 */
export function buildEventPhaseModalModel(view: SanitizedGameState): EventPhaseModalModel | null {
  const entries = view.gameLog;
  let phaseStart = -1;
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry && entry.event.type === 'TIME_TRACK_ADVANCED') {
      phaseStart = index;
      break;
    }
  }
  if (phaseStart === -1) return null;

  const buckets = new Map<EventPhaseStepId, GameLogEntry[]>([
    ['TIME', []],
    ['ATTACKS', []],
    ['FIRE', []],
    ['EVENT_CARD', []],
    ['EFFECT', []],
    ['HIVE', []],
  ]);
  const highlights = new Map<EventPhaseStepId, RoomId[]>();
  for (const stepId of buckets.keys()) highlights.set(stepId, []);

  for (let index = phaseStart; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!entry) continue;
    if (entry.event.type === 'ROUND_STARTED') break;
    const stepId = stepIdForEntry(entry);
    if (!stepId) continue;
    buckets.get(stepId)!.push(entry);
    const roomIds = roomIdsFromEntry(entry);
    const target = highlights.get(stepId)!;
    for (const roomId of roomIds) {
      if (!target.includes(roomId)) target.push(roomId);
    }
  }

  const orderedIds: EventPhaseStepId[] = ['TIME', 'ATTACKS', 'FIRE', 'EVENT_CARD', 'EFFECT', 'HIVE'];
  const phaseEntry = entries[phaseStart];
  if (!phaseEntry) return null;
  const phaseEvent = phaseEntry.event;
  return {
    phaseKey: phaseEntry.sequence,
    round: phaseEvent.type === 'TIME_TRACK_ADVANCED' ? phaseEvent.round : 0,
    steps: orderedIds.map((stepId) => ({
      id: stepId,
      title: STEP_TITLES[stepId],
      entries: buckets.get(stepId)!,
      highlightRoomIds: highlights.get(stepId)!,
    })),
  };
}
