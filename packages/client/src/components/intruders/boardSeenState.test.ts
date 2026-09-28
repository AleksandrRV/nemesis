import { describe, expect, it } from 'vitest';
import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';
import {
  SEEN_BOARD_STORAGE_KEY,
  deltaSinceSnapshot,
  hasUnseenBoardChanges,
  readSeenBoardSnapshot,
  sessionSnapshotStorage,
  writeSeenBoardSnapshot,
  type SnapshotStorage,
} from './boardSeenState';
import { buildIntruderBoardModel } from './intruderBoardModel';

function makeModel() {
  return buildIntruderBoardModel(filterStateForPlayer(createInitialGameState('board-seen-state'), 'player-1'));
}

function memoryStorage(): SnapshotStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

const failingStorage: SnapshotStorage = {
  getItem: () => {
    throw new Error('storage disabled');
  },
  setItem: () => {
    throw new Error('storage disabled');
  },
};

describe('boardSeenState: янтарная точка кнопки «Чужие»', () => {
  it('гаснет, пока планшет открыт, даже если улей изменился', () => {
    expect(hasUnseenBoardChanges('after', 'before', true)).toBe(false);
  });

  it('горит при закрытом планшете, если улей изменился с прошлого просмотра', () => {
    expect(hasUnseenBoardChanges('after', 'before', false)).toBe(true);
  });

  it('не горит при закрытом планшете без изменений', () => {
    expect(hasUnseenBoardChanges('same', 'same', false)).toBe(false);
  });
});

describe('boardSeenState: снимок улья между открытиями планшета', () => {
  it('записывает и читает снимок под ключом сессии', () => {
    const storage = memoryStorage();
    const model = makeModel();

    writeSeenBoardSnapshot(storage, model);

    expect(storage.values.has(SEEN_BOARD_STORAGE_KEY)).toBe(true);
    expect(readSeenBoardSnapshot(storage)).toEqual(model);
  });

  it('без хранилища, без снимка и при повреждённом снимке возвращает null', () => {
    const storage = memoryStorage();
    storage.setItem(SEEN_BOARD_STORAGE_KEY, '{not json');

    expect(readSeenBoardSnapshot(null)).toBeNull();
    expect(readSeenBoardSnapshot(memoryStorage())).toBeNull();
    expect(readSeenBoardSnapshot(storage)).toBeNull();
    expect(readSeenBoardSnapshot(failingStorage)).toBeNull();
  });

  it('не падает, если хранилище отказывает в записи', () => {
    expect(() => writeSeenBoardSnapshot(failingStorage, makeModel())).not.toThrow();
    expect(() => writeSeenBoardSnapshot(null, makeModel())).not.toThrow();
  });

  it('вне браузера сессионного хранилища нет', () => {
    expect(sessionSnapshotStorage()).toBeNull();
  });

  it('дельта есть только при наличии прошлого снимка', () => {
    const model = makeModel();

    expect(deltaSinceSnapshot(null, model)).toBeNull();
    expect(deltaSinceSnapshot(model, model)).toMatchObject({ bagChanged: false, boardChanged: false });
  });
});
