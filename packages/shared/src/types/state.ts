import type { ClaimEvent } from './actions.js';
import type { GameDecksState } from './cards.js';
import type { EscapePodState, IntruderEntity, IntruderToken, PlayerState, WeaknessSlotState } from './entities.js';
import type { InterruptEvent } from './interrupts.js';
import type { CorridorConnection, RoomId, RoomState } from './rooms.js';

/**
 * Версия контракта игрового состояния.
 *
 * Используется и как версия сохранённой сессии (zustand persist): при
 * несовпадении сохранение не восстанавливается, а партия начинается заново.
 * Значение увеличивается при любом несовместимом изменении GameState.
 */
export const GAME_STATE_SCHEMA_VERSION = 1;

/**
 * Режим партии (стр. 27 «Игровые Режимы»). Базовая игра полукооперативная:
 * у каждого игрока свои скрытые цели, а Соло/Кооперативные цели из коробки
 * в неё не входят (стр. 7, шаг 11).
 */
export type GameMode = 'SOLO' | 'COOP' | 'SEMI_COOP' | 'INTRUDER_PLAYER';
export type GamePhase = 'PLAYER_PHASE' | 'EVENT_PHASE' | 'GAME_OVER';
export type Destination = 'EARTH' | 'MARS' | 'DEEP_SPACE_1' | 'DEEP_SPACE_2';
export type CourseMarker = 'A' | 'B' | 'C' | 'D';
export type EngineNumber = 1 | 2 | 3;

/**
 * Двигатель: на отсеке лежат два жетона — Исправный и Неисправный, верхний
 * показывает текущее состояние (стр. 6, шаг 8; стр. 26). Второй жетон всегда
 * парный первому, поэтому в состоянии хранится только истина.
 */
export interface EngineState {
  isWorking: boolean;
}

export interface CoordinatesState {
  /** Истинный пункт назначения из случайно выбранной карты Координат (стр. 6, шаг 5). */
  destination: Destination;
  /** Положение маркера Курса на карте Координат. */
  currentCourseMarker: CourseMarker;
}

export interface IntrudersPoolState {
  /** Мешок (Пул Чужих) с ещё не вытянутыми жетонами. */
  bag: IntruderToken[];
  /** Чужие на поле: жетон + накопленные раны и позиция. */
  boardTokens: IntruderEntity[];
  /** Убитые Чужие: их жетоны выкладываются рядом с полем (стр. 6, шаг 10). */
  deadTokens: IntruderToken[];
  /** Жетоны Яиц, оставшиеся на Планшете Чужих (стр. 6, шаг 9). */
  eggsOnBoard: number;
  /** Три слота Слабостей на Планшете Чужих (стр. 6, шаг 9; стр. 21). */
  weaknessSlots: WeaknessSlotState[];
}

export interface ShipState {
  rooms: Record<RoomId, RoomState>;
  corridors: Record<string, CorridorConnection>;
  technicalCorridorNoise: boolean;
  engines: Record<EngineNumber, EngineState>;
  coordinates: CoordinatesState;
  escapePods: Record<string, EscapePodState>;
}

export interface GameMeta {
  /** Версия контракта: совпадает с GAME_STATE_SCHEMA_VERSION. */
  schemaVersion: number;
  /** Идентификатор партии: используется сервером и логом заявлений. */
  gameId: string;
  seed: string;
  gameMode: GameMode;
  currentRound: number;
  phase: GamePhase;
  activePlayerId: string;
  firstPlayerId: string;
  /** Позиция маркера Времени: 0..TIME_TRACK_LENGTH, где 15 — красный прыжок (стр. 11). */
  timeTrackPosition: number;
  selfDestructTrackPosition: number | null; // 0..8 (8 = череп)
}

export interface GameState {
  meta: GameMeta;
  ship: ShipState;
  intrudersPool: IntrudersPoolState;
  decks: GameDecksState;
  players: Record<string, PlayerState>;
  claimsLog: ClaimEvent[];
  /** Стек прерываний: действия разрешаются каскадом, а не мгновенно (AGENTS.md §3.3). */
  interruptQueue: InterruptEvent[];
}
