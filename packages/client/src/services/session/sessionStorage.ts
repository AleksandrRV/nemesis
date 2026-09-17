import type { GameState } from '@nemesis/shared';
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

export interface SessionStorage {
  /** Возвращает совместимую партию или null: вызывающий начинает новую. */
  load(): GameState | null;
  save(state: GameState): void;
  clear(): void;
}

interface PersistedSession {
  version: number;
  state: GameState;
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
 * здесь: сохранение без `intrudersPool.supply` (контракт v3) или без счётчиков
 * случайности — это не «почти партия», а запись другого формата, и молча
 * доигрывать её нельзя (план исправлений, Э2-6).
 */
export function isGameState(value: unknown): value is GameState {
  if (!isRecord(value)) return false;

  const { meta, ship, players, intrudersPool, decks, claimsLog, interruptQueue } = value;

  return (
    isRecord(meta) &&
    meta.schemaVersion === SESSION_STORAGE_VERSION &&
    isRecord(meta.rngDraws) &&
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
    isRecord(decks) &&
    Array.isArray(claimsLog) &&
    Array.isArray(interruptQueue)
  );
}

export function serializeSession(state: GameState): string {
  const persisted: PersistedSession = { version: SESSION_STORAGE_VERSION, state };

  return JSON.stringify(persisted);
}

/** Разбирает запись сохранения: чужая версия, мусор и обрезанный JSON дают null. */
export function parseSession(raw: string | null): GameState | null {
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

  return parsed.state;
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

    save: (state) => {
      try {
        storage.setItem(SESSION_STORAGE_KEY, serializeSession(state));
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
