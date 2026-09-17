import type { GameState, RoomId } from '@nemesis/shared';
import { GAME_STATE_SCHEMA_VERSION } from '@nemesis/shared';
import { createInitialGameState, DEFAULT_SEED } from '../utils/initialState';

/** Ключ сохранения. Версия хранится внутри значения, а не в ключе. */
export const SESSION_STORAGE_KEY = 'nemesis-session';

/** Версия сохранения совпадает с версией контракта GameState. */
export const SESSION_STORAGE_VERSION = GAME_STATE_SCHEMA_VERSION;

/** Отсек, открытый по умолчанию: стартовый Криогенный отсек. */
export const DEFAULT_SELECTED_ROOM_ID: RoomId = 11;

/** То, что реально пишется в localStorage: игровые данные и выбор в UI. */
export interface PersistedSession {
  gameState: GameState;
  selectedRoomId: RoomId | null;
}

interface PersistableState {
  gameState: GameState;
  selectedRoomId: RoomId | null;
}

/**
 * Сохраняем только данные, без экшенов стора: иначе сохранение раздувается,
 * а восстановленные функции всё равно оказываются несериализуемыми.
 */
export function partializeSession(state: PersistableState): PersistedSession {
  return { gameState: state.gameState, selectedRoomId: state.selectedRoomId };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Проверяет сохранение перед восстановлением.
 *
 * Проверка намеренно неглубокая: она ловит чужие и устаревшие данные, а
 * валидацию содержимого выполняет движок правил, когда действие попадает
 * в стек прерываний.
 */
export function isPersistedSession(value: unknown): value is PersistedSession {
  if (!isRecord(value)) return false;

  const { gameState, selectedRoomId } = value;
  if (!isRecord(gameState)) return false;
  if (selectedRoomId !== null && typeof selectedRoomId !== 'number') return false;

  const meta = gameState.meta;
  const ship = gameState.ship;
  const players = gameState.players;

  return (
    isRecord(meta) &&
    meta.schemaVersion === SESSION_STORAGE_VERSION &&
    isRecord(ship) &&
    isRecord(ship.rooms) &&
    isRecord(players)
  );
}

/** Новая партия, если сохранение несовместимо: партия важнее, чем чужие данные. */
function startFreshSession(): PersistedSession {
  return {
    gameState: createInitialGameState(DEFAULT_SEED),
    selectedRoomId: DEFAULT_SELECTED_ROOM_ID,
  };
}

/**
 * Миграция сохранения при несовпадении версии.
 *
 * Если версия контракта совпала и данные прошли проверку — состояние
 * восстанавливается как есть. Во всех остальных случаях партия начинается
 * заново: молчаливое восстановление несовместимого состояния приводило бы
 * к падениям в глубине игровой логики.
 */
export function migrateSession(persisted: unknown, version: number): PersistedSession {
  if (version !== SESSION_STORAGE_VERSION) {
    return startFreshSession();
  }

  return isPersistedSession(persisted) ? persisted : startFreshSession();
}

/**
 * Сливает восстановленное сохранение с текущим состоянием стора.
 *
 * Это единственная точка, через которую проходят все загрузки: `migrate`
 * вызывается только при несовпадении версии, поэтому проверку содержимого
 * обязательно нужно повторять и здесь — иначе повреждённое сохранение той же
 * версии попадёт в стор и уронит приложение на старте.
 */
export function mergeSession<TState extends PersistableState>(persistedState: unknown, currentState: TState): TState {
  const session = isPersistedSession(persistedState) ? persistedState : startFreshSession();

  return { ...currentState, ...session };
}
