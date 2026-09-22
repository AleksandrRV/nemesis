import type { ClaimEvent } from './actions.js';
import type { GameDecksState } from './cards.js';
import type { PendingDecision } from './decisions.js';
import type { EscapePodState, IntruderEntity, IntruderToken, PlayerState, WeaknessSlotState } from './entities.js';
import type { InterruptEvent } from './interrupts.js';
import type { GameLogEntry } from './log.js';
import type { CorridorConnection, RoomId, RoomState } from './rooms.js';
import type { RngStream } from '../utils/rng.js';

// Совместимость сохранений: Фаза Событий исполняет Шаг 7а книги правил —
// Автономное Движение Чужих по карте События (события `EVENT_CARD_DRAWN` и
// `INTRUDER_MOVED`, источник разрушения Двери) — сохранения схемы 16 не восстанавливаются.
export const GAME_STATE_SCHEMA_VERSION = 17;

/**
 * Режим партии (стр. 27 «Игровые Режимы»). Базовая игра полукооперативная:
 * у каждого игрока свои скрытые цели, а Соло/Кооперативные цели из коробки
 * в неё не входят (стр. 7, шаг 11).
 */
export type GameMode = 'SOLO' | 'COOP' | 'SEMI_COOP' | 'INTRUDER_PLAYER';

/** Почему партия окончена (стр. 11, 17): взрыв, разрыв обшивки, гиперпрыжок или отсутствие участников. */
export type GameOverReason = 'SHIP_EXPLODED' | 'HULL_BREACH' | 'HYPERSPACE_JUMP' | 'NO_ACTIVE_CHARACTERS';
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
  firstEncounterOccurred: boolean;
  attackSuppression: Record<string, { round: number; phase: GamePhase }>;
  /** Мешок (Пул Чужих) с ещё не вытянутыми жетонами: рубашкой вверх (стр. 6, шаг 10). */
  bag: IntruderToken[];
  /** Жетоны Чужих рядом с полем: входят в игру по ходу партии (стр. 6, шаг 10). */
  supply: IntruderToken[];
  /** Миниатюры на поле: накопленные раны и позиция. */
  boardTokens: IntruderEntity[];
  /** Прежний резерв контракта; жетоны вне мешка хранятся в supply. */
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
  nextEntitySequence: number;
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
