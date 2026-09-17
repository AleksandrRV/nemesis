import type { GameMode, GamePhase } from '@nemesis/shared';

/**
 * Подписи состояний партии для интерфейса.
 *
 * Ключи — значения контракта (`GamePhase`, `GameMode`), а не строки в разметке:
 * если контракт расширится, компилятор потребует подпись, а не покажет пустоту
 * подписи берутся из подписей контракта, а не из литералов в разметке.
 */

export const PHASE_LABELS: Record<GamePhase, string> = {
  PLAYER_PHASE: 'ФАЗА ИГРОКОВ',
  EVENT_PHASE: 'ФАЗА СОБЫТИЙ',
  GAME_OVER: 'ПАРТИЯ ЗАВЕРШЕНА',
};

export const GAME_MODE_LABELS: Record<GameMode, string> = {
  SOLO: 'СОЛО',
  COOP: 'КООПЕРАТИВ',
  SEMI_COOP: 'ПОЛУКООПЕРАТИВ',
  INTRUDER_PLAYER: 'ИГРОК-ЧУЖОЙ',
};
