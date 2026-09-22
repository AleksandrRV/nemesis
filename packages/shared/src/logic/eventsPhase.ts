import { TIME_TRACK_LENGTH } from '../data/setup.js';
import type { GameState } from '../types/state.js';
import { killPlayer } from './characterDamage.js';
import { resolveEventPhaseAttacks } from './eventsPhaseAttacks.js';
import { endGame } from './gameEnd.js';
import { appendGameLog } from './gameLog.js';
import { checkInjuryResult } from './shoot.js';
import { getOrderedPlayers, startNewRound } from './turnCycle.js';

/**
 * Оркестратор Фазы Событий (стр. 10): шаги книги правил исполняются
 * последовательно внутри одной транзакции.
 *
 * - Шаг 4: Счётчик Времени и Самоуничтожения — реализован;
 * - Шаг 5: Атаки Чужих — реализован (`resolveEventPhaseAttacks`);
 * - Шаг 6: Урон от огня — реализован;
 * - Шаг 7: карта События, Шаг 8: Развитие Улья — следующие шаги этапа,
 *   пропуски фиксируются в журнале явно;
 * - Шаг 9: конец раунда — `startNewRound`.
 *
 * Аварийные исходы Шага 4 (гиперпрыжок, взрыв) немедленно завершают партию:
 * оставшиеся шаги не исполняются, новый раунд не начинается.
 */
export function runEventPhase(state: GameState): void {
  advanceTimeAndSelfDestruct(state);
  if (state.meta.phase === 'GAME_OVER') return;

  resolveEventPhaseAttacks(state);
  if (endIfNoActiveCharacters(state)) return;

  resolveFireDamage(state);

  appendGameLog(state, { type: 'EVENT_PHASE_STEP_SKIPPED', round: state.meta.currentRound, step: 7 });
  appendGameLog(state, { type: 'EVENT_PHASE_STEP_SKIPPED', round: state.meta.currentRound, step: 8 });

  startNewRound(state);
}

/**
 * Полная гибель активных Персонажей в Фазе Событий (например, Исступление
 * в переполненном отсеке) завершает партию: ходить больше некому.
 */
function endIfNoActiveCharacters(state: GameState): boolean {
  if (getOrderedPlayers(state).length > 0) return false;
  endGame(state, 'NO_ACTIVE_CHARACTERS');
  return true;
}

/**
 * Шаг 4 Фазы Событий (стр. 10): маркер Времени сдвигается на деление;
 * активный маркер Самоуничтожения сдвигается вместе с ним. Достижение
 * последнего красного поля Времени — немедленный гиперпрыжок (стр. 11):
 * все персонажи на борту вне Анабиоза гибнут от перегрузок. Достижение
 * жёлтой зоны Самоуничтожения (≥6) необратимо разблокирует все Капсулы,
 * последнее деление с черепом (8) взрывает корабль (стр. 11, 24).
 */
export function advanceTimeAndSelfDestruct(state: GameState): void {
  state.meta.timeTrackPosition += 1;
  if (state.meta.selfDestructTrackPosition !== null) {
    state.meta.selfDestructTrackPosition += 1;
    if (state.meta.selfDestructTrackPosition >= 6) unlockAllEscapePods(state);
  }

  appendGameLog(state, {
    type: 'TIME_TRACK_ADVANCED',
    round: state.meta.currentRound,
    timeTrackPosition: state.meta.timeTrackPosition,
    selfDestructTrackPosition: state.meta.selfDestructTrackPosition,
  });

  if (state.meta.selfDestructTrackPosition === 8) {
    killEveryoneAboard(state, true);
    endGame(state, 'SHIP_EXPLODED');
    return;
  }

  if (state.meta.timeTrackPosition >= TIME_TRACK_LENGTH) {
    killEveryoneAboard(state, false);
    endGame(state, 'HYPERSPACE_JUMP');
  }
}

/** Жёлтая зона Самоуничтожения: все Капсулы разблокируются автоматически (стр. 24). */
function unlockAllEscapePods(state: GameState): void {
  const pods = Object.values(state.ship.escapePods);
  const hadLocked = pods.some((pod) => pod.isLocked);
  for (const pod of pods) pod.isLocked = false;
  if (hadLocked) {
    appendGameLog(state, { type: 'ESCAPE_PODS_UNLOCKED', cause: 'SELF_DESTRUCT' });
  }
}

/**
 * Гибель экипажа на борту при завершении партии (стр. 11): взрыв убивает
 * всех, включая Анабиоз; гиперпрыжок — только тех, кто не в Анабиозе.
 * Сбежавшие в Капсулах уже не на корабле.
 */
function killEveryoneAboard(state: GameState, includeHibernation: boolean): void {
  for (const player of Object.values(state.players)) {
    if (player.isDead || player.hasEscapedInPod) continue;
    if (!includeHibernation && player.isInHibernation) continue;
    killPlayer(state, player.id);
  }
}

/**
 * Шаг 6 Фазы Событий (стр. 10): каждый Чужой в отсеке с маркером Пожара
 * получает ровно 1 Рану, затем — общая проверка Результата Атаки (стр. 20):
 * гибель с Останками либо Отступление по карте События. После Чужих огонь
 * уничтожает одно Яйцо на полу отсека (стр. 25, Улей).
 */
export function resolveFireDamage(state: GameState): void {
  const burningRoomIds = Object.values(state.ship.rooms)
    .filter((room) => room.hasFire)
    .map((room) => room.id)
    .sort((a, b) => a - b);

  for (const roomId of burningRoomIds) {
    const room = state.ship.rooms[roomId]!;
    const intruderIds = [...room.occupantIntruderIds];

    for (const intruderId of intruderIds) {
      const intruder = state.intrudersPool.boardTokens.find((candidate) => candidate.id === intruderId);
      if (!intruder || intruder.roomId !== roomId) continue;

      appendGameLog(state, {
        type: 'FIRE_DAMAGE_TAKEN_BY_INTRUDER',
        roomId,
        intruderId,
        intruderType: intruder.type,
      });
      checkInjuryResult(state, intruderId, intruder.type, 1, null);
    }

    const egg = room.objects.find((object) => object.kind === 'EGG');
    if (egg) {
      room.objects = room.objects.filter((object) => object.id !== egg.id);
      appendGameLog(state, { type: 'EGG_DESTROYED_BY_FIRE', roomId, objectId: egg.id });
    }
  }
}
