import type { BoardObject, CombatDieFace, GameMode, GamePhase, IntruderToken, IntruderType } from '@nemesis/shared';

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

export const INTRUDER_TOKEN_LABELS: Record<IntruderToken['type'], string> = {
  BLANK: 'Пустой',
  LARVA: 'Личинка',
  CREEPER: 'Крипер',
  ADULT: 'Взрослая Особь',
  BREEDER: 'Трутень',
  QUEEN: 'Королева',
};

export const INTRUDER_TYPE_LABELS: Record<IntruderType, string> = {
  LARVA: 'Личинка',
  CREEPER: 'Крипер',
  ADULT: 'Взрослая Особь',
  BREEDER: 'Трутень',
  QUEEN: 'Королева',
};

/** Цветовая кодировка Чужих на карте и в инспекторе: зелёная Личинка, жёлтый Крипер, красная Особь, бордовый Трутень, фиолетовая Королева. */
export const INTRUDER_TYPE_COLORS: Record<IntruderType, { fill: string; ink: string }> = {
  LARVA: { fill: '#22c55e', ink: '#05070c' },
  CREEPER: { fill: '#eab308', ink: '#05070c' },
  ADULT: { fill: '#ef4444', ink: '#05070c' },
  BREEDER: { fill: '#881337', ink: '#ffffff' },
  QUEEN: { fill: '#a855f7', ink: '#05070c' },
};

/** Подписи граней кубика Боя для журнала и модалки Стрельбы (стр. 18). */
export const COMBAT_DIE_FACE_LABELS: Record<CombatDieFace, string> = {
  MISS: 'Промах',
  TAIL: 'Хвост',
  SILHOUETTES: 'Силуэты',
  ONE_WOUND: '1 Рана',
  TWO_WOUNDS: '2 Раны',
};

/** Подписи Тяжёлых объектов на полу отсека (стр. 22). */
export const HEAVY_OBJECT_LABELS: Record<BoardObject['kind'], string> = {
  CORPSE: 'Труп члена экипажа',
  EGG: 'Яйцо Чужих',
  INTRUDER_REMAINS: 'Останки Чужого',
};
