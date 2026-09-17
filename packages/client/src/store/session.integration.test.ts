import { afterEach, describe, expect, it, vi } from 'vitest';

import { GAME_STATE_SCHEMA_VERSION } from '@nemesis/shared';
import { createInitialGameState } from '../utils/initialState';
import { SESSION_STORAGE_KEY } from './session';

/**
 * Проверка сквозного сохранения: подменяем localStorage и убеждаемся, что
 * стор пишет partialized-состояние с версией контракта, восстанавливает
 * совместимое сохранение и начинает новую партию вместо несовместимого.
 */
class MemoryStorage {
  private readonly entries = new Map<string, string>();

  getItem(name: string): string | null {
    return this.entries.get(name) ?? null;
  }

  setItem(name: string, value: string): void {
    this.entries.set(name, value);
  }

  removeItem(name: string): void {
    this.entries.delete(name);
  }

  read(name: string): unknown {
    const raw = this.getItem(name);
    return raw === null ? null : JSON.parse(raw);
  }
}

async function loadStore(storage: MemoryStorage) {
  vi.stubGlobal('localStorage', storage);
  vi.resetModules();

  const module = await import('./gameStore');
  return module.useGameStore;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('Сохранение сессии в localStorage', () => {
  it('пишет партию с версией контракта и без экшенов', async () => {
    const storage = new MemoryStorage();
    const useGameStore = await loadStore(storage);

    useGameStore.getState().initNewGame('integration-seed');

    const saved = storage.read(SESSION_STORAGE_KEY) as { state: Record<string, unknown>; version: number };

    expect(saved.version).toBe(GAME_STATE_SCHEMA_VERSION);
    expect(Object.keys(saved.state).sort()).toEqual(['gameState', 'selectedRoomId']);
    expect(saved.state.selectedRoomId).toBe(11);
    expect((saved.state.gameState as { meta: { seed: string } }).meta.seed).toBe('integration-seed');
  });

  it('восстанавливает совместимое сохранение вместе с сидом партии', async () => {
    const storage = new MemoryStorage();
    const gameState = createInitialGameState('saved-game');

    storage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ state: { gameState, selectedRoomId: 5 }, version: GAME_STATE_SCHEMA_VERSION }),
    );

    const useGameStore = await loadStore(storage);

    expect(useGameStore.getState().gameState.meta.seed).toBe('saved-game');
    expect(useGameStore.getState().selectedRoomId).toBe(5);
  });

  it('начинает новую партию вместо сохранения старого формата', async () => {
    const storage = new MemoryStorage();
    const legacyGameState = createInitialGameState('legacy-game');
    const legacy = {
      state: {
        gameState: {
          ...legacyGameState,
          // Состояние формата 0.1.x: engines без поля isWorking, объекты строками.
          ship: { ...legacyGameState.ship, engines: { 1: { topWorking: true, bottomWorking: false } } },
        },
        selectedRoomId: 3,
      },
      version: 0,
    };

    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(legacy));

    const useGameStore = await loadStore(storage);

    expect(useGameStore.getState().gameState.meta.seed).toBe('nemesis-default-seed');
    expect(useGameStore.getState().selectedRoomId).toBe(11);
    expect(useGameStore.getState().gameState.meta.schemaVersion).toBe(GAME_STATE_SCHEMA_VERSION);
  });

  it('начинает новую партию, если сохранение повреждено', async () => {
    const storage = new MemoryStorage();
    storage.setItem(SESSION_STORAGE_KEY, '{"state":{"gameState":"broken"},"version":1}');

    const useGameStore = await loadStore(storage);

    expect(Object.keys(useGameStore.getState().gameState.ship.rooms)).toHaveLength(21);
    expect(useGameStore.getState().selectedRoomId).toBe(11);
  });

  it('сохраняет изменения состояния после действий игрока', async () => {
    const storage = new MemoryStorage();
    const useGameStore = await loadStore(storage);

    useGameStore.getState().initNewGame('actions-seed');
    useGameStore.getState().toggleNoise('1-2');

    const saved = storage.read(SESSION_STORAGE_KEY) as {
      state: { gameState: { ship: { corridors: Record<string, { hasNoise: boolean }> } } };
    };

    expect(saved.state.gameState.ship.corridors['1-2']?.hasNoise).toBe(true);
  });
});
