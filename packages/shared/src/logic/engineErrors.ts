export type EngineErrorCode =
  | 'UNKNOWN_PLAYER'
  | 'PLAYER_IS_DEAD'
  | 'UNKNOWN_ROOM'
  | 'UNKNOWN_CORRIDOR'
  | 'MOVE_TARGET_IS_CURRENT_ROOM'
  | 'NO_OPEN_DOOR_BETWEEN_ROOMS'
  | 'ACTION_NOT_IMPLEMENTED'
  | 'DEV_ACTION_FORBIDDEN'
  | 'INTERRUPT_NOT_IMPLEMENTED'
  /** Партия уже окончена: правила запасов маркеров (стр. 17) закрыли игру. */
  | 'GAME_IS_OVER'
  /** «Осторожное движение» запрещено в Бою (стр. 13). */
  | 'CAREFUL_MOVE_IN_COMBAT'
  /** Выбранный Коридор не ведёт в отсек назначения (стр. 13). */
  | 'CAREFUL_MOVE_BAD_CHOICE'
  /** Во всех Коридорах, ведущих в отсек, уже стоят маркеры Шума (стр. 13). */
  | 'CAREFUL_MOVE_NO_FREE_CORRIDOR'
  /** Маркеров Шума в запасе не осталось: правило не описано книгой (стр. 3, 15–16). */
  | 'MARKER_SUPPLY_EXHAUSTED'
  /** Жетонов Дверей нет ни в запасе, ни среди закрытых Дверей на поле (стр. 17). */
  | 'DOOR_TOKEN_SUPPLY_EXHAUSTED'
  | 'CARD_SUPPLY_EXHAUSTED'
  | 'INTRUDER_MINIATURE_UNAVAILABLE'
  | 'UNKNOWN_INTRUDER'
  | 'INVALID_ATTACK_TARGET'
  | 'EMPTY_INTRUDER_BAG'
  | 'PENDING_DECISION_REQUIRED'
  | 'PLAYER_NOT_ON_SHIP'
  /** Ошибки валидатора оплаты карт (v0.3.0 Шаг 3) */
  | 'INSUFFICIENT_ACTION_CARDS'
  | 'PAYMENT_CARD_DUPLICATE'
  | 'PAYMENT_CARD_CANNOT_PAY_SELF'
  | 'PAYMENT_CARD_NOT_IN_HAND'
  | 'CONTAMINATION_CANNOT_BE_DISCARDED_AS_COST'
  /** Игрок уже спасовал в текущей Фазе Игроков (стр. 10). */
  | 'PLAYER_ALREADY_PASSED'
  /** Действие совершается не в свой ход (стр. 10). */
  | 'NOT_ACTIVE_PLAYER'
  /** Игрок не находится в Фазе Игроков. */
  | 'NOT_IN_PLAYER_PHASE'
  /** Ошибки Поиска (v0.3.0 Шаг 5) */
  | 'SEARCH_NOT_ALLOWED'
  | 'NO_ITEMS_LEFT'
  | 'SEARCH_IN_COMBAT'
  | 'UNKNOWN_DECK'
  | 'DECISION_NOT_FOUND'
  | 'INVALID_DECISION'
  | 'INVALID_DECISION_OPTION'
  /** Ошибки действий отсеков (v0.3.0 Шаг 6) */
  | 'ROOM_ABILITY_NOT_ALLOWED'
  /** «Стрельба» выполняется только в Бою (стр. 12, 19). */
  | 'SHOOT_NOT_IN_COMBAT'
  | 'MELEE_NOT_IN_COMBAT'
  | 'HAND_SLOTS_FULL'
  | 'OBJECT_NOT_AVAILABLE'
  | 'WEAKNESS_ALREADY_REVEALED'
  /** Выбранная карта в слоте Руки — не Оружие либо Оружия там нет (стр. 19). */
  | 'WEAPON_NOT_AVAILABLE'
  /** На выбранном Оружии не осталось Боезапаса (стр. 19). */
  | 'WEAPON_NO_AMMO'
  /**
   * Для направления Отступления нужна карта События (стр. 20); колода Событий
   * и её сброс пусты — Фаза Событий не реализована (этап 0.5.0).
   */
  | 'EMPTY_EVENT_DECK';

export class EngineError extends Error {
  readonly code: EngineErrorCode;

  constructor(code: EngineErrorCode, message: string) {
    super(message);
    this.name = 'EngineError';
    this.code = code;
  }
}
