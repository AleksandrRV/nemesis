import type { EngineAction, SanitizedGameState } from '@nemesis/shared';
import type { SessionDiscardReason } from '../session/sessionStorage';

/**
 * Транспорт полностью изолирует интерфейс от того, где физически живёт движок
 * правил (tech_stack §5): сегодня это `LocalInMemoryTransport` в той же вкладке,
 * завтра — Socket.io к серверу (этап 10) или бот (этап 8). UI и стор работают
 * только с этим интерфейсом, поэтому переезд движка не потребует переписывания.
 *
 * Через транспорт клиент получает исключительно `SanitizedGameState`: скрытые
 * данные (двигатели, Координаты, чужие цели, непроверенное Заражение) не
 * покидают движок: наружу уходит только срез игрока.
 */

/** События транспорта: всё, что происходит помимо обновления состояния. */
export type GameEvent =
  | { type: 'ACTION_APPLIED'; action: EngineAction }
  | { type: 'ACTION_REJECTED'; action: EngineAction; reason: string }
  /** Сохранение несовместимо: оно удалено, начата новая партия (С7-2, решение В-5). */
  | { type: 'SESSION_DISCARDED'; reason: SessionDiscardReason }
  /** Экран перешёл к другому человеку за этим устройством; handoff — нужна шторка передачи. */
  | { type: 'VIEWER_CHANGED'; viewerId: string; handoff: boolean }
  | { type: 'BOT_ACTED'; botId: string; action: EngineAction }
  /** Защита оркестратора сработала: бот не может ответить, партия ждёт людей. */
  | { type: 'BOT_STALLED'; botId: string; reason: string }
  | { type: 'SETUP_REJECTED'; reason: string };

export interface IGameTransport {
  /** Готовит транспорт к работе: первая выдача состояния приходит подписчикам. */
  init(): Promise<void>;

  /** Отправляет действие движку. Отказ приходит событием ACTION_REJECTED, а не исключением. */
  sendAction(action: EngineAction): void;

  subscribeToState(callback: (state: SanitizedGameState) => void): () => void;

  subscribeToEvents(callback: (event: GameEvent) => void): () => void;
}
