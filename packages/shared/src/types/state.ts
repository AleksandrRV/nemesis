import type { ClaimEvent } from './actions.js';
import type { GameDecksState } from './cards.js';
import type { PendingDecision } from './decisions.js';
import type { EscapePodState, IntruderEntity, IntruderToken, PlayerState, WeaknessSlotState } from './entities.js';
import type { InterruptEvent } from './interrupts.js';
import type { GameLogEntry } from './log.js';
import type { CorridorConnection, RoomId, RoomState } from './rooms.js';
import type { RngStream } from '../utils/rng.js';

/**
 * Версия контракта игрового состояния.
 *
 * Используется и как версия сохранённой сессии (zustand persist): при
 * несовместимости сохранение не восстанавливается, а партия начинается заново.
 * Значение увеличивается при любом несовместимом изменении GameState.
 *
 * v2 (0.1.10): отсек помнит эффект жетона Исследования, в состоянии появились
 * счётчики потоков случайности (`meta.rngDraws`), а прерывание вскрытия несёт
 * Коридор входа — старая сессия без этих полей не восстанавливается.
 *
 * v3 (0.1.11): Пул Чужих — это полный набор из 27 жетонов: `bag` (мешок)
 * плюс `supply` (жетоны рядом с полем, стр. 6, шаг 10); у партии появилась
 * причина окончания (`meta.gameOverReason`) для правил запасов маркеров
 * (стр. 17); «Осторожное движение» приносит режим шума в прерывание.
 *
 * v4: публичный журнал событий партии (`gameLog`) сохраняется вместе с игрой.
 * Старые сохранения не восстанавливаются, чтобы журнал и состояние не расходились.
 *
 * v5 (0.4.0, шаг 2): Контакт и Внезапная атака — у особи Чужого на поле хранится
 * отложенный жетон (`IntruderEntity.token`), у персонажа — Личинка на планшете
 * (`PlayerState.hasLarva`), а гибель всех персонажей завершает партию
 * (`ALL_PLAYERS_DEAD`).
 */
export const GAME_STATE_SCHEMA_VERSION = 5;

/**
 * Режим партии (стр. 27 «Игровые Режимы»). Базовая игра полукооперативная:
 * у каждого игрока свои скрытые цели, а Соло/Кооперативные цели из коробки
 * в неё не входят (стр. 7, шаг 11).
 */
export type GameMode = 'SOLO' | 'COOP' | 'SEMI_COOP' | 'INTRUDER_PLAYER';

/** Почему партия окончена: корабль взорвался, обшивка не выдержала (стр. 17) или погибли все персонажи. */
export type GameOverReason = 'SHIP_EXPLODED' | 'HULL_BREACH' | 'ALL_PLAYERS_DEAD';
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
  /** Мешок (Пул Чужих) с ещё не вытянутыми жетонами: рубашкой вверх (стр. 6, шаг 10). */
  bag: IntruderToken[];
  /** Жетоны Чужих рядом с полем: входят в игру по ходу партии (стр. 6, шаг 10). */
  supply: IntruderToken[];
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
  /**
   * Сколько раз партия уже обратилась к каждому потоку случайности.
   * Сам генератор в состоянии не хранится (состояние остаётся JSON-сериализуемым),
   * поэтому позиция восстанавливается реплеем от мастер-сида (utils/rng.ts).
   * Расклад (`layout`) читается только при подготовке стола, поэтому после
   * старта партии его счётчик не растёт.
   */
  rngDraws: Record<RngStream, number>;
  /**
   * Причина окончания партии; null — партия идёт. Нужна правилам запасов:
   * последний маркер Пожара взрывает корабль, последний маркер Неисправности
   * разрывает обшивку (стр. 17), и оба случая обязаны быть видимыми, а не
   * молчаливым пропуском розыгрыша.
   */
  gameOverReason: GameOverReason | null;
}

export interface GameState {
  meta: GameMeta;
  ship: ShipState;
  intrudersPool: IntrudersPoolState;
  decks: GameDecksState;
  players: Record<string, PlayerState>;
  claimsLog: ClaimEvent[];
  /** Публичный журнал уже разыгранных событий партии; скрытые данные сюда не попадают. */
  gameLog: GameLogEntry[];
  /** Стек прерываний: действия разрешаются каскадом, а не мгновенно (tech_stack §4). */
  interruptQueue: InterruptEvent[];
  /** Ожидающее решение активного игрока (Поиск, выбор отсеков, решений комнат). */
  pendingDecision: PendingDecision | null;
}
