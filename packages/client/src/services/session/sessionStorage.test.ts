import { describe, expect, it } from 'vitest';

import { GAME_STATE_SCHEMA_VERSION, createInitialGameState } from '@nemesis/shared';

import type { StorageLike } from './sessionStorage';
import {
  SESSION_STORAGE_KEY,
  SESSION_STORAGE_VERSION,
  createMemoryStorage,
  createSessionStorage,
  resolveDefaultStorage,
  isGameState,
  parseSession,
  serializeSession,
} from './sessionStorage';

const SEED = 'session-storage-test';

describe('Сохранение партии: формат', () => {
  it('использует версию контракта как версию сохранения', () => {
    expect(SESSION_STORAGE_VERSION).toBe(GAME_STATE_SCHEMA_VERSION);
  });

  it('сериализует партию с версией и читает её обратно без потерь', () => {
    const state = createInitialGameState(SEED);
    const raw = serializeSession(state);

    expect(JSON.parse(raw).version).toBe(SESSION_STORAGE_VERSION);
    expect(parseSession(raw)).toEqual(state);
  });

  it.each([
    ['пустое сохранение', null],
    ['мусор вместо JSON', 'не json'],
    ['отсутствие версии', JSON.stringify({ state: createInitialGameState(SEED) })],
    ['чужую версию', JSON.stringify({ version: SESSION_STORAGE_VERSION + 1, state: createInitialGameState(SEED) })],
    ['частичное состояние', JSON.stringify({ version: SESSION_STORAGE_VERSION, state: { meta: {} } })],
  ])('начинает новую партию вместо %s', (_label, raw) => {
    expect(parseSession(raw)).toBeNull();
  });

  it('не принимает состояние без отсеков и игроков: играть такое нельзя', () => {
    const state = createInitialGameState(SEED);

    expect(isGameState({ ...state, ship: { ...state.ship, rooms: {} } })).toBe(false);
    expect(isGameState({ ...state, players: {} })).toBe(false);
    expect(isGameState({ ...state, interruptQueue: undefined })).toBe(false);
  });

  it('принимает партию, созданную генератором', () => {
    expect(isGameState(createInitialGameState(SEED))).toBe(true);
  });

  it('отвергает сохранение старого контракта (v2) и не пытается его доигрывать', () => {
    const state = createInitialGameState(SEED);
    const merged = { ...state } as Record<string, unknown>;
    const meta = { ...(state.meta as unknown as Record<string, unknown>) };

    // v2: у Пула Чужих ещё нет запаса, у партии — причины окончания.
    delete (merged as { intrudersPool?: unknown }).intrudersPool;
    merged.intrudersPool = { ...state.intrudersPool } as unknown as Record<string, unknown>;
    delete (merged.intrudersPool as Record<string, unknown>).supply;
    delete meta.gameOverReason;

    const oldSave = JSON.stringify({ version: SESSION_STORAGE_VERSION - 1, state: { ...merged, meta } });

    expect(isGameState({ ...merged, meta })).toBe(false);
    expect(parseSession(oldSave)).toBeNull();
  });

  it('отвергает запись без счётчиков случайности: воспроизводимость партии дороже «доиграть хоть как-то»', () => {
    const state = createInitialGameState(SEED);
    const meta = { ...state.meta } as Record<string, unknown>;

    delete meta.rngDraws;

    expect(isGameState({ ...state, meta })).toBe(false);
  });

  it('на старой записи начинает новую партию через хранилище, а не падает', () => {
    const storage = createMemoryStorage();
    const session = createSessionStorage(storage);
    const state = createInitialGameState(SEED);

    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ version: SESSION_STORAGE_VERSION - 1, state }));

    expect(session.load()).toBeNull();

    // Новая партия того же сида воспроизводима: сохранение не «портит» генератор.
    const fresh = createInitialGameState(SEED);

    session.save(fresh);

    expect(session.load()).toEqual(fresh);
  });
});

describe('Сохранение партии: хранилище', () => {
  it('пишет, читает и стирает партию', () => {
    const storage = createMemoryStorage();
    const session = createSessionStorage(storage);
    const state = createInitialGameState(SEED);

    expect(session.load()).toBeNull();

    session.save(state);
    expect(storage.getItem(SESSION_STORAGE_KEY)).not.toBeNull();
    expect(session.load()).toEqual(state);

    session.clear();
    expect(session.load()).toBeNull();
  });

  it('возвращает null вместо падения, если хранилище недоступно', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('доступ запрещён');
      },
      setItem: () => {
        throw new Error('переполнено');
      },
      removeItem: () => {
        throw new Error('доступ запрещён');
      },
    };

    const session = createSessionStorage(broken);

    expect(session.load()).toBeNull();
    expect(() => session.save(createInitialGameState(SEED))).not.toThrow();
    expect(() => session.clear()).not.toThrow();
  });

  it('при недоступном localStorage уходит в память, а не роняет партию', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('доступ к хранилищу запрещён');
      },
    });

    try {
      const storage = resolveDefaultStorage();

      storage.setItem('ключ', 'значение');
      expect(storage.getItem('ключ')).toBe('значение');
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, 'localStorage', descriptor);
      } else {
        delete (globalThis as { localStorage?: unknown }).localStorage;
      }
    }
  });

  it('переживает перезапуск: новая сессия видит сохранение предыдущей', () => {
    const storage = createMemoryStorage();
    const state = createInitialGameState('restart');

    createSessionStorage(storage).save(state);

    expect(createSessionStorage(storage).load()?.meta.seed).toBe('restart');
  });
});
