import type { CarefulMoveChosenCorridor, RoomId } from './rooms.js';

/**
 * Как разыгрывается вход в пустой отсек: обычным броском кубика Шума или
 * «Осторожным движением» с маркером в выбранный Коридор (стр. 13, 15).
 */
export type NoiseRollMode = { kind: 'ROLL' } | { kind: 'CAREFUL'; chosen: CarefulMoveChosenCorridor };

/** Целевое место шума для прерывания Контакта: Коридор или Технические Коридоры. */
export type NoiseTargetForContact =
  | { kind: 'CORRIDOR'; corridorId: string }
  | { kind: 'TECHNICAL_CORRIDOR' };

/** Событие прерывания: шаг пайплайна, который должен разрешиться до конца действия (tech_stack §4). */
export type InterruptEvent =
  /** Попытка побега: каждый Чужой в отсеке атакует до шага в целевой отсек. */
  | { type: 'ESCAPE_ATTACK_INTERRUPT'; playerId: string; intruderIds: string[]; targetRoomId: RoomId }
  /**
   * Вскрытие неисследованного отсека и розыгрыш жетона Исследования.
   * `corridorId` — Коридор, через который персонаж вошёл: эффект «Двери»
   * ставит жетон Двери именно в него (стр. 15).
   */
  | { type: 'EXPLORE_ROOM_INTERRUPT'; playerId: string; roomId: RoomId; corridorId: string }
  /**
   * Шум после входа в отсек (стр. 15). Режим `ROLL` — обычный бросок кубика;
   * режим `CAREFUL` — «Осторожное движение»: вместо броска маркер кладётся
   * в выбранный игроком Коридор (стр. 13).
   */
  | { type: 'NOISE_ROLL_INTERRUPT'; playerId: string; roomId: RoomId; noise: NoiseRollMode }
  /**
   * Контакт (v0.4.0 Шаг 2): при попытке положить маркер Шума в место, где он уже стоит,
   * инициируется прерывание: удаляются все маркеры Шума из коридоров отсека,
   * вытягивается жетон из Пула Чужих.
   */
  | { type: 'CONTACT_INTERRUPT'; playerId: string; roomId: RoomId; noiseTarget: NoiseTargetForContact }
  /** Внезапная атака: карт на руке меньше числа на жетоне (стр. 18). */
  | { type: 'SURPRISE_ATTACK_INTERRUPT'; playerId: string; intruderId: string };
