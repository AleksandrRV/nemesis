import type { InterruptEvent } from '../types/interrupts.js';
import type { RoomId } from '../types/rooms.js';
import type { IntruderType } from '../types/entities.js';
import type { GameState } from '../types/state.js';
import { appendGameLog } from './gameLog.js';
import { EngineError } from './engineErrors.js';
import { performIntruderAttack } from './intruderAttacks.js';
import { requireIntruder } from './intruderPlacement.js';
import { movePlayer } from './movement.js';
import { requireOpenPath } from './shipGraphQueries.js';
import { queueActionCompletion } from './actionCompletion.js';

/**
 * Побег из Боя (стр. 19): при Действии «Движение» из отсека с Чужими перед
 * перемещением разыгрывается отдельная Атака Чужого для каждого Чужого.
 * FAQ Rules 5: «You draw one Intruder Attack card for each Intruder, starting
 * from the larger ones (Queen, Breeder, Adult, and Larva)» — от крупных к
 * мелким. Крипер в перечне FAQ не упомянут: это мутировавшая Взрослая особь,
 * поэтому в иерархии она стоит между Трутнем и Взрослой (решение контракта
 * v0.4.0-step-7). При равном типе порядок стабилен по id.
 */
const ATTACKER_RANK: Record<IntruderType, number> = {
  QUEEN: 0,
  BREEDER: 1,
  CREEPER: 2,
  ADULT: 3,
  LARVA: 4,
};

/** Атакующие при Побеге из отсека: все Чужие отсека в порядке FAQ Rules 5. */
export function escapeAttackerIds(state: GameState, roomId: RoomId): string[] {
  return state.ship.rooms[roomId]!.occupantIntruderIds.map((intruderId) => requireIntruder(state, intruderId))
    .sort((left, right) => ATTACKER_RANK[left.type] - ATTACKER_RANK[right.type] || left.id.localeCompare(right.id))
    .map((intruder) => intruder.id);
}

/**
 * Разрешение прерывания Побега: атаки по убегающему до выхода из отсека; при
 * гибели Труп остаётся в исходном отсеке (killPlayer кладёт его в текущий
 * отсек персонажа — перемещения ещё не было). Выживший завершает Движение:
 * неисследованный отсек вскрывается, бросок Шума выполняется как при обычном
 * шаге (стр. 19). Завершение действия ставится последним прерыванием — после
 * Шума, чтобы счёт действий и смена хода не обгоняли розыгрыш входа.
 */
export function resolveEscapeAttack(
  state: GameState,
  interrupt: Extract<InterruptEvent, { type: 'ESCAPE_ATTACK_INTERRUPT' }>,
): void {
  const player = state.players[interrupt.playerId];
  if (!player) throw new EngineError('UNKNOWN_PLAYER', `Неизвестный персонаж: ${interrupt.playerId}.`);

  for (const intruderId of interrupt.intruderIds) {
    if (player.isDead) break;
    const stillOnBoard = state.intrudersPool.boardTokens.some((entry) => entry.id === intruderId);
    if (!stillOnBoard) continue;
    performIntruderAttack(state, interrupt.playerId, intruderId, (event) =>
      appendGameLog(state, { type: 'ESCAPE_ATTACK_RESOLVED', ...event }),
    );
  }

  if (!player.isDead) {
    const path = requireOpenPath(state, player.roomId, interrupt.targetRoomId);
    movePlayer(state, interrupt.playerId, interrupt.targetRoomId, path[0]!.id, { kind: 'ROLL' });
  }
  queueActionCompletion(state, interrupt.playerId);
}
