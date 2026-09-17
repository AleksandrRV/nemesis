import { describe, expect, it } from 'vitest';

import { GAME_STATE_SCHEMA_VERSION } from '@nemesis/shared';
import { createInitialGameState } from '../utils/initialState';
import {
  DEFAULT_SELECTED_ROOM_ID,
  isPersistedSession,
  migrateSession,
  partializeSession,
  SESSION_STORAGE_VERSION,
} from './session';

const freshState = () => createInitialGameState('session-test');

describe('Сохранение сессии: что записывается', () => {
  it('записывает только игровые данные, без экшенов стора', () => {
    const persisted = partializeSession({
      gameState: freshState(),
      selectedRoomId: 5,
      initNewGame: () => undefined,
      selectRoom: () => undefined,
    } as Parameters<typeof partializeSession>[0] & Record<string, unknown>);

    expect(Object.keys(persisted).sort()).toEqual(['gameState', 'selectedRoomId']);
    expect(persisted.selectedRoomId).toBe(5);
  });

  it('использует версию контракта как версию сохранения', () => {
    expect(SESSION_STORAGE_VERSION).toBe(GAME_STATE_SCHEMA_VERSION);
  });
});

describe('Сохранение сессии: проверка данных', () => {
  it('принимает корректное сохранение', () => {
    expect(isPersistedSession(partializeSession({ gameState: freshState(), selectedRoomId: 11 }))).toBe(true);
  });

  it('принимает пустой выбор отсека', () => {
    expect(isPersistedSession(partializeSession({ gameState: freshState(), selectedRoomId: null }))).toBe(true);
  });

  it.each([
    ['null', null],
    ['строку', 'session'],
    ['число', 42],
    ['пустой объект', {}],
    ['состояние без gameState', { selectedRoomId: 1 }],
    ['состояние без ship.rooms', { selectedRoomId: 1, gameState: { meta: {}, ship: {}, players: {} } }],
    ['состояние без meta', { selectedRoomId: 1, gameState: { ship: { rooms: {} }, players: {} } }],
    ['некорректный selectedRoomId', { selectedRoomId: 'room', gameState: freshState() }],
  ])('отклоняет %s', (_label, value) => {
    expect(isPersistedSession(value)).toBe(false);
  });

  it('отклоняет сохранение с чужой версией контракта', () => {
    const state = freshState();
    const stale = { ...state, meta: { ...state.meta, schemaVersion: GAME_STATE_SCHEMA_VERSION + 1 } };

    expect(isPersistedSession(partializeSession({ gameState: stale, selectedRoomId: 11 }))).toBe(false);
  });
});

describe('Сохранение сессии: миграция', () => {
  it('восстанавливает совместимое сохранение как есть', () => {
    const persisted = partializeSession({ gameState: freshState(), selectedRoomId: 7 });

    expect(migrateSession(persisted, SESSION_STORAGE_VERSION)).toEqual(persisted);
  });

  it('начинает новую партию при устаревшей версии сохранения', () => {
    const legacy = { gameState: { meta: {}, ship: {}, players: {} }, selectedRoomId: 3 };
    const migrated = migrateSession(legacy, SESSION_STORAGE_VERSION - 1);

    expect(migrated.selectedRoomId).toBe(DEFAULT_SELECTED_ROOM_ID);
    expect(migrated.gameState.meta.schemaVersion).toBe(GAME_STATE_SCHEMA_VERSION);
    expect(migrated.gameState.meta.gameId).toBe('game-nemesis-default-seed');
  });

  it('начинает новую партию, если данные повреждены', () => {
    const migrated = migrateSession('broken', SESSION_STORAGE_VERSION);

    expect(migrated.gameState.interruptQueue).toEqual([]);
    expect(migrated.gameState.ship.corridors).not.toEqual({});
    expect(migrated.selectedRoomId).toBe(DEFAULT_SELECTED_ROOM_ID);
  });

  it('возвращает полное, готовое к игре состояние', () => {
    const migrated = migrateSession(null, 0);

    expect(Object.keys(migrated.gameState.ship.rooms)).toHaveLength(21);
    expect(Object.keys(migrated.gameState.players)).toEqual(['player-1']);
    expect(migrated.gameState.claimsLog).toEqual([]);
  });
});
