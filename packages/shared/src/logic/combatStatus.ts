import type { GameState } from '../types/state.js';

/**
 * Статус Боя (стр. 18): «Когда Персонаж и Чужой находятся в одной Комнате,
 * они находятся в Бою». Яйца Чужих Чужими не считаются (стр. 12), поэтому
 * объекты на полу на статус не влияют; мёртвые Чужие с поля снимаются при
 * гибели и в отсеках не числятся.
 *
 * В Бою Персонажу запрещены (стр. 12 «Только вне боя», стр. 13, 18):
 * обычный Поиск, Осторожное движение и Действия Комнат; движение из такого
 * отсека — это Побег (до Шага 7 отклоняется явно). Единый предикат нужен,
 * чтобы движок и интерфейс читали статус из одного источника.
 */

/** Есть ли живой Чужой в указанном отсеке. */
export function isRoomInCombat(state: GameState, roomId: number): boolean {
  return (state.ship.rooms[roomId]?.occupantIntruderIds.length ?? 0) > 0;
}

/**
 * Находится ли персонаж в Бою: он жив, активен (не в Анабиозе и не улетел)
 * и в его отсеке стоит Чужой.
 */
export function isPlayerInCombat(state: GameState, playerId: string): boolean {
  const player = state.players[playerId];
  if (!player) return false;
  if (player.isDead || player.isInHibernation || player.hasEscapedInPod) return false;

  return isRoomInCombat(state, player.roomId);
}
