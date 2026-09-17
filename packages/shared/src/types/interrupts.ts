import type { RoomId } from './rooms.js';

/** Событие прерывания: шаг пайплайна, который должен разрешиться до конца действия (AGENTS.md §3.3). */
export type InterruptEvent =
  /** Попытка побега: каждый Чужой в отсеке атакует до шага в целевой отсек. */
  | { type: 'ESCAPE_ATTACK_INTERRUPT'; playerId: string; intruderIds: string[]; targetRoomId: RoomId }
  /** Вскрытие неисследованного отсека и розыгрыш жетона Исследования. */
  | { type: 'EXPLORE_ROOM_INTERRUPT'; playerId: string; roomId: RoomId }
  /** Бросок кубика Шума после входа в отсек. */
  | { type: 'NOISE_ROLL_INTERRUPT'; playerId: string; roomId: RoomId }
  /** Контакт: вытянутый из мешка жетон Чужого появляется на поле. */
  | { type: 'ENCOUNTER_INTERRUPT'; roomId: RoomId; intruderTokenId: string }
  /** Внезапная атака: карт на руке меньше числа на жетоне (стр. 18). */
  | { type: 'SURPRISE_ATTACK_INTERRUPT'; playerId: string; intruderId: string };
