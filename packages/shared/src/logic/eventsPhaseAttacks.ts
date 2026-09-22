import type { GameState } from '../types/state.js';
import type { RoomId } from '../types/rooms.js';
import { appendGameLog } from './gameLog.js';
import { performIntruderAttack } from './intruderAttacks.js';
import { getOrderedPlayers } from './turnCycle.js';

/**
 * Выбор цели Атаки Чужого в отсеке (стр. 20, шаг 1): Чужие атакуют
 * Персонажа с наименьшим количеством карт Действия на руке (карты
 * Заражения на руке тоже считаются). При равенстве — Персонаж с жетоном
 * Первого Игрока либо ближайший к нему по часовой стрелке (по порядку
 * `orderNumber`). Анабиоз и Спасательные Капсулы выводят из-под атаки.
 */
export function selectAttackTarget(state: GameState, roomId: RoomId): string | null {
  const candidates = Object.values(state.players).filter(
    (player) => !player.isDead && !player.isInHibernation && !player.hasEscapedInPod && player.roomId === roomId,
  );
  if (candidates.length === 0) return null;

  const minHand = Math.min(...candidates.map((player) => player.actionDeck.hand.length));
  const tied = candidates.filter((player) => player.actionDeck.hand.length === minHand);
  if (tied.length === 1) return tied[0]!.id;

  const tiedIds = new Set(tied.map((player) => player.id));
  const ordered = getOrderedPlayers(state);
  const firstIndex = ordered.findIndex((player) => player.id === state.meta.firstPlayerId);
  const start = firstIndex === -1 ? 0 : firstIndex;
  for (let step = 0; step < ordered.length; step += 1) {
    const candidate = ordered[(start + step) % ordered.length]!;
    if (tiedIds.has(candidate.id)) return candidate.id;
  }
  return tied[0]!.id;
}

/**
 * Шаг 5 Фазы Событий (стр. 10): каждый Чужой, находящийся в Бою
 * с Персонажами, совершает Атаку. Отсеки обрабатываются по возрастанию
 * номера, Чужие в отсеке — в порядке занимаемых мест; цель выбирается
 * заново перед каждой атакой, поэтому гибель Персонажа от предыдущей
 * атаки сразу меняет выбор. Исход каждой атаки фиксируется публичным
 * событием `EVENT_PHASE_ATTACK_RESOLVED`.
 */
export function resolveEventPhaseAttacks(state: GameState): void {
  const roomIds = Object.values(state.ship.rooms)
    .map((room) => room.id)
    .sort((a, b) => a - b);

  for (const roomId of roomIds) {
    const room = state.ship.rooms[roomId]!;
    const intruderIds = [...room.occupantIntruderIds];

    for (const intruderId of intruderIds) {
      const targetId = selectAttackTarget(state, roomId);
      if (targetId === null) break;

      const intruder = state.intrudersPool.boardTokens.find((token) => token.id === intruderId);
      if (!intruder || intruder.roomId !== roomId) continue;

      performIntruderAttack(state, targetId, intruderId, (event) =>
        appendGameLog(state, { type: 'EVENT_PHASE_ATTACK_RESOLVED', ...event }),
      );
    }
  }
}
