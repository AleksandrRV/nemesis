import type { GameLogEntry, GameLogEvent, SanitizedGameState } from '@nemesis/shared';
import {
  groupFormattedLog,
  type FormattedGameLogEntry,
  type GameLogSegment,
  type GroupedGameLog,
} from './gameLogModel';

export type GameLogCategory = 'SYSTEM' | 'MOVEMENT' | 'NOISE' | 'COMBAT' | 'CREW' | 'EVENTS';

export const GAME_LOG_CATEGORIES: readonly GameLogCategory[] = [
  'MOVEMENT',
  'NOISE',
  'COMBAT',
  'CREW',
  'EVENTS',
  'SYSTEM',
];

export const GAME_LOG_CATEGORY_LABELS: Record<GameLogCategory, string> = {
  SYSTEM: 'Ход партии',
  MOVEMENT: 'Движение',
  NOISE: 'Шум',
  COMBAT: 'Чужие и бой',
  CREW: 'Действия экипажа',
  EVENTS: 'Фаза Событий',
};

export const GAME_LOG_CATEGORY_BY_EVENT: Record<GameLogEvent['type'], GameLogCategory> = {
  GAME_STARTED: 'SYSTEM',
  ROUND_STARTED: 'SYSTEM',
  PLAYER_TURN_STARTED: 'SYSTEM',
  PLAYER_PASSED: 'SYSTEM',
  GAME_OVER: 'SYSTEM',
  DEV_STATE_CHANGED: 'SYSTEM',
  OBJECTIVE_CHOSEN: 'SYSTEM',
  ESCAPE_PODS_UNLOCKED: 'SYSTEM',
  PLAYER_MOVED: 'MOVEMENT',
  ROOM_DISCOVERED: 'MOVEMENT',
  ROOM_PEEKED: 'MOVEMENT',
  EXPLORATION_TOKEN_REVEALED: 'MOVEMENT',
  EXPLORATION_EFFECT_RESOLVED: 'MOVEMENT',
  NOISE_ROLLED: 'NOISE',
  NOISE_MARKER_PLACED: 'NOISE',
  NOISE_SKIPPED: 'NOISE',
  CONTACT_OCCURRED: 'COMBAT',
  FIRST_CONTACT: 'COMBAT',
  SURPRISE_ATTACK_RESOLVED: 'COMBAT',
  SHOOT_RESOLVED: 'COMBAT',
  MELEE_RESOLVED: 'COMBAT',
  ESCAPE_ATTACK_RESOLVED: 'COMBAT',
  INTRUDER_KILLED: 'COMBAT',
  INTRUDER_RETREATED: 'COMBAT',
  INTRUDERS_WITHDRAWN: 'COMBAT',
  INTRUDERS_MOVED: 'COMBAT',
  INTRUDERS_BLOCKED_BY_DOOR: 'COMBAT',
  INTRUDER_MOVED: 'COMBAT',
  INTRUDER_TRANSFORMED: 'COMBAT',
  PLAYER_DIED: 'COMBAT',
  CONTAMINATION_RECEIVED: 'COMBAT',
  SEARCH_PERFORMED: 'CREW',
  ROOM_ABILITY_USED: 'CREW',
  ACTION_CARD_PLAYED: 'CREW',
  ACTION_CARD_DRAWN: 'CREW',
  ITEM_USED: 'CREW',
  OBJECT_PICKED_UP: 'CREW',
  OBJECT_DROPPED: 'CREW',
  HEAVY_ITEM_DISCARDED: 'CREW',
  ENGINE_TOGGLED: 'CREW',
  FIRE_DAMAGE_TAKEN: 'CREW',
  TIME_TRACK_ADVANCED: 'EVENTS',
  EVENT_PHASE_ATTACK_RESOLVED: 'EVENTS',
  FIRE_DAMAGE_TAKEN_BY_INTRUDER: 'EVENTS',
  EGG_DESTROYED_BY_FIRE: 'EVENTS',
  EVENT_CARD_DRAWN: 'EVENTS',
  EVENT_EFFECT_RESOLVED: 'EVENTS',
  EVENT_PEEKED: 'EVENTS',
  EVENT_CARD_CHOSEN: 'EVENTS',
  HIVE_DEVELOPMENT_RESOLVED: 'EVENTS',
  HIVE_DEVELOPMENT_SKIPPED: 'EVENTS',
};

export interface CategorizedLogEntry extends FormattedGameLogEntry {
  category: GameLogCategory;
  plainText: string;
}

export interface GameLogRound {
  key: string;
  title: string;
  groups: GroupedGameLog<CategorizedLogEntry>[];
  entryCount: number;
}

export interface GameLogFilter {
  category: GameLogCategory | 'ALL';
  query: string;
}

export function segmentsText(segments: readonly GameLogSegment[]): string {
  return segments.map((segment) => segment.text).join('');
}

export function categorizeLog(
  formatted: readonly FormattedGameLogEntry[],
  log: readonly GameLogEntry[],
): CategorizedLogEntry[] {
  const typeBySequence = new Map(log.map((entry) => [entry.sequence, entry.event.type]));
  return formatted.map((entry) => {
    const type = typeBySequence.get(entry.sequence);
    return {
      ...entry,
      category: type ? GAME_LOG_CATEGORY_BY_EVENT[type] : 'SYSTEM',
      plainText: segmentsText(entry.segments),
    };
  });
}

export function matchesLogFilter(entry: CategorizedLogEntry, filter: GameLogFilter): boolean {
  if (filter.category !== 'ALL' && entry.category !== filter.category) return false;
  const query = filter.query.trim().toLocaleLowerCase('ru');
  return query.length === 0 || entry.plainText.toLocaleLowerCase('ru').includes(query);
}

export function countByCategory(entries: readonly CategorizedLogEntry[]): Record<GameLogCategory | 'ALL', number> {
  const counts: Record<GameLogCategory | 'ALL', number> = {
    ALL: entries.length,
    SYSTEM: 0,
    MOVEMENT: 0,
    NOISE: 0,
    COMBAT: 0,
    CREW: 0,
    EVENTS: 0,
  };
  for (const entry of entries) counts[entry.category] += 1;
  return counts;
}

function roundStartedBySequence(log: readonly GameLogEntry[]): Map<number, number> {
  const rounds = new Map<number, number>();
  for (const entry of log) {
    if (entry.event.type === 'ROUND_STARTED') rounds.set(entry.sequence, entry.event.round);
  }
  return rounds;
}

export function buildLogRounds(
  entries: readonly CategorizedLogEntry[],
  log: readonly GameLogEntry[],
  filter: GameLogFilter,
): GameLogRound[] {
  const roundStarts = roundStartedBySequence(log);
  const sections: { key: string; title: string; entries: CategorizedLogEntry[] }[] = [];
  let current = { key: 'prologue', title: 'Подготовка', entries: [] as CategorizedLogEntry[] };

  for (const entry of entries) {
    const round = roundStarts.get(entry.sequence);
    if (round !== undefined) {
      sections.push(current);
      current = { key: `round-${round}-${entry.sequence}`, title: `Раунд ${round}`, entries: [] };
    }
    if (matchesLogFilter(entry, filter)) current.entries.push(entry);
  }
  sections.push(current);

  return sections
    .filter((section) => section.entries.length > 0)
    .map((section) => ({
      key: section.key,
      title: section.title,
      groups: groupFormattedLog(section.entries),
      entryCount: section.entries.length,
    }));
}

export function tickerEntries(entries: readonly CategorizedLogEntry[], limit = 8): CategorizedLogEntry[] {
  return entries.slice(-limit).reverse();
}

const TICKER_CHARS_PER_SECOND = 9;
const TICKER_MIN_SECONDS = 18;

export function tickerDurationSeconds(entries: readonly CategorizedLogEntry[]): number {
  const characters = entries.reduce((sum, entry) => sum + entry.plainText.length + 6, 0);
  return Math.max(TICKER_MIN_SECONDS, Math.round(characters / TICKER_CHARS_PER_SECOND));
}

export function newestLogSequence(view: SanitizedGameState): number {
  return view.gameLog.at(-1)?.sequence ?? 0;
}

export type LogHighlight = 'CONTACT' | 'NOISE_ROLL';

const CONTACT_LOOKAHEAD = 4;

export function logHighlights(log: readonly GameLogEntry[]): Map<string, LogHighlight> {
  const highlights = new Map<string, LogHighlight>();
  for (let index = 0; index < log.length; index++) {
    const entry = log[index]!;
    const event = entry.event;
    if (event.type === 'CONTACT_OCCURRED' && event.source === 'NOISE') {
      highlights.set(entry.id, 'CONTACT');
      continue;
    }
    if (event.type !== 'NOISE_MARKER_PLACED' || event.reason !== 'ROLL') continue;
    const followingContact = log
      .slice(index + 1, index + 1 + CONTACT_LOOKAHEAD)
      .some(
        (next) =>
          next.event.type === 'CONTACT_OCCURRED' && next.event.source === 'NOISE' && next.event.roomId === event.roomId,
      );
    if (followingContact) highlights.set(entry.id, 'CONTACT');
  }
  const lastRoll = [...log].reverse().find((entry) => entry.event.type === 'NOISE_ROLLED');
  if (lastRoll && !highlights.has(lastRoll.id)) highlights.set(lastRoll.id, 'NOISE_ROLL');
  return highlights;
}
