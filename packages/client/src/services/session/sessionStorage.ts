import type { GameState, SeatKind, TableSeating } from '@nemesis/shared';
import { GAME_STATE_SCHEMA_VERSION } from '@nemesis/shared';

/**
 * Сохранение партии.
 *
 * Партию хранит движок (транспорт), а не стор: клиент видит только
 * отфильтрованное состояние, а истина лежит отдельно и версионируется.
 * При несовместимой (старой) или повреждённой записи партия начинается заново —
 * обещание «устойчивость мобильной сессии» важнее, чем чужие данные. Правило
 * одно и то же для чужой версии, обрезанного JSON и записи, у которой нет
 * полей текущего контракта: попытка «догадаться» исказила бы партию молча
 * (план исправлений, Э2-6).
 *
 * Осознанное ограничение v0: сохранение лежит в localStorage браузера, то есть
 * в соло-режиме истина физически доступна владельцу устройства (и только ему).
 * Изоляция от любопытного игрока появится вместе с сервером (этап 10).
 */

/** Ключ сохранения. Версия хранится внутри значения, а не в ключе. */
export const SESSION_STORAGE_KEY = 'nemesis-session';

/** Версия сохранения совпадает с версией контракта GameState. */
export const SESSION_STORAGE_VERSION = GAME_STATE_SCHEMA_VERSION;

/** Минимум возможностей хранилища, который нужен сохранению (в тестах подменяется). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type SessionDiscardReason = 'OUTDATED_VERSION' | 'CORRUPTED';

export interface SessionRestore {
  state: GameState | null;
  /** Кто сидит за столом восстановленной партии; пусто, если партии нет. */
  seating: TableSeating[];
  discarded: SessionDiscardReason | null;
}

export interface SessionStorage {
  /** Возвращает совместимую партию или null: вызывающий начинает новую. */
  load(): GameState | null;
  /** Как `load`, но несовместимая запись удаляется, а причина возвращается для сообщения игроку (С7-2). */
  restore(): SessionRestore;
  save(state: GameState, seating?: readonly TableSeating[]): void;
  clear(): void;
}

interface PersistedSession {
  version: number;
  state: GameState;
  seating: TableSeating[];
}

const SEAT_KINDS = new Set<SeatKind>(['LOCAL_HUMAN', 'REMOTE_HUMAN', 'BOT']);

/** Сохранение без мест за столом: все Персонажи ведутся с этого устройства. */
export function everyoneAtThisDevice(state: GameState): TableSeating[] {
  return Object.values(state.players)
    .sort((left, right) => left.orderNumber - right.orderNumber)
    .map((player) => ({ playerId: player.id, kind: 'LOCAL_HUMAN', label: player.name }));
}

export function isTableSeating(value: unknown, state: GameState): value is TableSeating[] {
  if (!Array.isArray(value)) return false;
  const seated = value.filter(
    (seat): seat is TableSeating =>
      isRecord(seat) &&
      typeof seat.playerId === 'string' &&
      typeof seat.label === 'string' &&
      SEAT_KINDS.has(seat.kind as SeatKind) &&
      seat.playerId in state.players,
  );
  const unique = new Set(seated.map((seat) => seat.playerId));
  return seated.length === value.length && unique.size === Object.keys(state.players).length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Структурная проверка партии перед восстановлением.
 *
 * Проверка намеренно неглубокая: она отсекает чужие и повреждённые данные,
 * а полноту игры проверяет движок, когда действие попадает в стек прерываний.
 * Но поля, без которых партия заведомо не продолжится, обязаны проверяться
 * здесь: сохранение без `intrudersPool.supply` (контракт v3), `gameLog` (v4) или
 * счётчиков случайности — это не «почти партия», а запись другого формата, и
 * молча доигрывать её нельзя (план исправлений, Э2-6).
 */
export function isGameState(value: unknown): value is GameState {
  if (!isRecord(value)) return false;

  const { meta, ship, players, intrudersPool, decks, claimsLog, gameLog, interruptQueue } = value;

  return (
    isRecord(meta) &&
    meta.schemaVersion === SESSION_STORAGE_VERSION &&
    isRecord(meta.rngDraws) &&
    Number.isSafeInteger(meta.nextEntitySequence) &&
    Number(meta.nextEntitySequence) > 0 &&
    'gameOverReason' in meta &&
    isRecord(ship) &&
    isRecord(ship.rooms) &&
    Object.keys(ship.rooms).length > 0 &&
    isRecord(ship.corridors) &&
    isRecord(ship.engines) &&
    isRecord(players) &&
    Object.keys(players).length > 0 &&
    isRecord(intrudersPool) &&
    Array.isArray(intrudersPool.bag) &&
    Array.isArray(intrudersPool.supply) &&
    typeof intrudersPool.firstEncounterOccurred === 'boolean' &&
    isRecord(intrudersPool.attackSuppression) &&
    Object.values(players).every((player) => isRecord(player) && typeof player.hasLarva === 'boolean') &&
    isRecord(decks) &&
    Array.isArray(claimsLog) &&
    Array.isArray(gameLog) &&
    Array.isArray(interruptQueue) &&
    'reaction' in value
  );
}

export function serializeSession(
  state: GameState,
  seating: readonly TableSeating[] = everyoneAtThisDevice(state),
): string {
  const persisted: PersistedSession = { version: SESSION_STORAGE_VERSION, state, seating: [...seating] };

  return JSON.stringify(persisted);
}

interface ParsedSession {
  state: GameState;
  seating: TableSeating[];
}

/** Разбирает запись сохранения: чужая версия, мусор, обрезанный JSON и чужие места дают null. */
export function parseSession(raw: string | null): GameState | null {
  return parseSessionRecord(raw)?.state ?? null;
}

function parseSessionRecord(raw: string | null): ParsedSession | null {
  if (raw === null) return null;

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed) || parsed.version !== SESSION_STORAGE_VERSION || !isGameState(parsed.state)) {
    return null;
  }
  if (!isTableSeating(parsed.seating, parsed.state)) return null;

  return { state: parsed.state, seating: parsed.seating };
}

function savedVersionOf(raw: string): number | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    const stateVersion = isRecord(parsed.state) && isRecord(parsed.state.meta) ? parsed.state.meta.schemaVersion : null;
    const version = typeof stateVersion === 'number' ? stateVersion : parsed.version;
    return typeof version === 'number' ? version : null;
  } catch {
    return null;
  }
}

export function inspectSession(raw: string | null): SessionRestore {
  if (raw === null) return { state: null, seating: [], discarded: null };
  const parsed = parseSessionRecord(raw);
  if (parsed) return { ...parsed, discarded: null };
  const savedVersion = savedVersionOf(raw);
  return {
    state: null,
    seating: [],
    discarded: savedVersion !== null && savedVersion < SESSION_STORAGE_VERSION ? 'OUTDATED_VERSION' : 'CORRUPTED',
  };
}

/** Хранилище в памяти: страховка для среды без localStorage (SSR, тесты, приватный режим). */
export function createMemoryStorage(): StorageLike {
  const entries = new Map<string, string>();

  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => void entries.set(key, value),
    removeItem: (key) => void entries.delete(key),
  };
}

/** Хранилище браузера, если оно доступно; иначе — память, чтобы партия не падала. */
export function resolveDefaultStorage(): StorageLike {
  try {
    return typeof localStorage === 'undefined' ? createMemoryStorage() : localStorage;
  } catch {
    return createMemoryStorage();
  }
}

export function createSessionStorage(storage: StorageLike): SessionStorage {
  return {
    load: () => {
      try {
        return parseSession(storage.getItem(SESSION_STORAGE_KEY));
      } catch {
        return null;
      }
    },

    restore: () => {
      let result: SessionRestore;
      try {
        result = inspectSession(storage.getItem(SESSION_STORAGE_KEY));
      } catch {
        return { state: null, seating: [], discarded: null };
      }
      if (result.discarded) {
        try {
          storage.removeItem(SESSION_STORAGE_KEY);
        } catch {
          return result;
        }
      }
      return result;
    },

    save: (state, seating) => {
      try {
        storage.setItem(SESSION_STORAGE_KEY, serializeSession(state, seating));
      } catch {
        // Приватный режим или переполненное хранилище: партия продолжается без сохранения.
      }
    },

    clear: () => {
      try {
        storage.removeItem(SESSION_STORAGE_KEY);
      } catch {
        // См. комментарий выше.
      }
    },
  };
}

/** Сохранение в localStorage браузера с откатом в память, если хранилище недоступно. */
export function createLocalSessionStorage(): SessionStorage {
  return createSessionStorage(resolveDefaultStorage());
}
