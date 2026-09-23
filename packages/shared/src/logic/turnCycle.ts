import { sufferLightWounds } from './characterDamage.js';
import { endGame } from './gameEnd.js';
import { runEventPhase } from './eventsPhase.js';
import type { GameState } from '../types/state.js';
import type { PlayerState } from '../types/entities.js';
import { appendGameLog } from './gameLog.js';
import { drawCardsToLimit } from './cardsPayment.js';
import { EngineError } from './engineErrors.js';

/**
 * Возвращает отсортированный по orderNumber список живых игроков.
 */
export function getOrderedPlayers(state: GameState): PlayerState[] {
  return Object.values(state.players)
    .filter((p) => !p.isDead && !p.hasEscapedInPod && !p.isInHibernation)
    .sort((a, b) => a.orderNumber - b.orderNumber);
}

/**
 * Ищет следующего живого игрока, который ещё не спасовал.
 * Порядок обхода — по часовой стрелке (по возрастанию orderNumber с циклом).
 */
export function findNextActivePlayer(state: GameState, currentActivePlayerId: string): PlayerState | null {
  const activePlayers = getOrderedPlayers(state).filter((p) => !p.hasPassed);
  if (activePlayers.length === 0) return null;

  const currentOrder = state.players[currentActivePlayerId]?.orderNumber ?? 0;
  return activePlayers.find((player) => player.orderNumber > currentOrder) ?? activePlayers[0]!;
}

/**
 * Применяет последствия нахождения в горящем отсеке в конце микрохода/паса (стр. 17).
 * Если в отсеке есть маркер Пожара — персонаж получает 1 Лёгкую Травму.
 */
export function applyFireEndTurnEffect(state: GameState, playerId: string): boolean {
  const player = state.players[playerId];
  if (!player || player.isDead) return false;

  const room = state.ship.rooms[player.roomId];
  if (room && room.hasFire) {
    sufferLightWounds(state, playerId, 1);
    appendGameLog(state, {
      type: 'FIRE_DAMAGE_TAKEN',
      playerId,
      roomId: room.id,
      woundsCount: 1,
    });
    return true;
  }
  return false;
}

/**
 * Завершает микроход активного игрока без применения огня.
 * Используется после явного вызова applyFireEndTurnEffect() в обработчиках паса/действий,
 * чтобы огонь наносился до смены activePlayerId и до блокировки паса (Шаг 4, долг 9).
 */
export function advanceTurnWithoutFire(state: GameState, completedPlayerId: string): void {
  const player = state.players[completedPlayerId];
  if (player) {
    player.actionsPerformedThisRound = 0;
  }

  // Проверяем, все ли живые игроки спасовали
  const alivePlayers = getOrderedPlayers(state);
  if (alivePlayers.length === 0) {
    endGame(state, 'NO_ACTIVE_CHARACTERS');
    return;
  }
  const allPassed = alivePlayers.length > 0 && alivePlayers.every((p) => p.hasPassed);

  if (allPassed) {
    state.meta.phase = 'EVENT_PHASE';
    runEventPhase(state);
    return;
  }

  const nextPlayer = findNextActivePlayer(state, completedPlayerId);
  if (nextPlayer) {
    state.meta.activePlayerId = nextPlayer.id;
    appendGameLog(state, {
      type: 'PLAYER_TURN_STARTED',
      playerId: nextPlayer.id,
      round: state.meta.currentRound,
    });
  }
}

/**
 * Завершает микроход активного игрока.
 * - Применяет эффект пожара (урон до смены activePlayerId, чтобы смерть от огня наступила до передачи хода);
 * - Сбрасывает счётчик действий текущего микрохода (actionsPerformedThisRound = 0);
 * - Если все игроки спасовали: переводит игру в EVENT_PHASE;
 * - Иначе: переключает activePlayerId на следующего неспасовавшего игрока.
 */
export function advanceTurn(state: GameState, completedPlayerId: string): void {
  applyFireEndTurnEffect(state, completedPlayerId);
  advanceTurnWithoutFire(state, completedPlayerId);
}

/**
 * Переход из Фазы Событий (Шаг 9 книги правил, стр. 10) в новый раунд Фазы
 * Игроков (Шаг 1). Счётчики Времени и Самоуничтожения здесь больше не
 * двигаются: маркер Времени сдвигается в Шаге 4 Фазы Событий
 * (`advanceTimeAndSelfDestruct`). Выполняет:
 * 1. Инкремент currentRound (+1);
 * 2. Передачу жетона Первого Игрока следующему игроку по часовой стрелке;
 *    если первый умер в Фазе Событий, жетон передаётся следующему живому по кругу от умершего (стр. 10);
 * 3. Сброс флагов hasPassed и actionsPerformedThisRound;
 * 4. Добор карт всеми игроками до лимита руки (включая проверку Кают);
 * 5. Установку activePlayerId = firstPlayerId и phase = 'PLAYER_PHASE'.
 */
export function startNewRound(state: GameState): void {
  if (state.meta.phase === 'GAME_OVER') {
    throw new EngineError('GAME_IS_OVER', 'Нельзя начать раунд в завершённой партии');
  }

  state.meta.currentRound += 1;

  const alivePlayers = getOrderedPlayers(state);
  if (alivePlayers.length > 0) {
    const currentFirst = state.players[state.meta.firstPlayerId];
    let nextFirst: PlayerState | undefined;

    if (currentFirst) {
      const currentIdx = alivePlayers.findIndex((p) => p.id === currentFirst.id);
      if (currentIdx !== -1) {
        // Текущий первый жив — передаём следующему по кругу
        const nextIdx = (currentIdx + 1) % alivePlayers.length;
        nextFirst = alivePlayers[nextIdx];
      } else {
        // Текущий первый умер/улетел/уснул в Фазе Событий — ищем следующего живого по orderNumber от умершего
        const deadOrder = currentFirst.orderNumber;
        nextFirst =
          alivePlayers.find((p) => p.orderNumber > deadOrder) ?? alivePlayers[0];
      }
    } else {
      // На случай если firstPlayerId отсутствует в state (не должно случаться)
      nextFirst = alivePlayers[0];
    }

    if (nextFirst) {
      state.meta.firstPlayerId = nextFirst.id;
    }
  }

  state.meta.activePlayerId = state.meta.firstPlayerId;
  state.meta.phase = 'PLAYER_PHASE';

  for (const player of alivePlayers) {
    player.hasPassed = false;
    player.actionsPerformedThisRound = 0;
    drawCardsToLimit(state, player.id);
  }

  appendGameLog(state, {
    type: 'ROUND_STARTED',
    round: state.meta.currentRound,
    firstPlayerId: state.meta.firstPlayerId,
  });

  appendGameLog(state, {
    type: 'PLAYER_TURN_STARTED',
    playerId: state.meta.activePlayerId,
    round: state.meta.currentRound,
  });
}
