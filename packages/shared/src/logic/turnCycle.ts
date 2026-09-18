import type { GameState } from '../types/state.js';
import type { PlayerState } from '../types/entities.js';
import { appendGameLog } from './gameLog.js';
import { drawCardsToLimit } from './cardsPayment.js';
import { EngineError } from './fsm.js';

/**
 * Возвращает отсортированный по orderNumber список живых игроков.
 */
export function getOrderedPlayers(state: GameState): PlayerState[] {
  return Object.values(state.players)
    .filter((p) => !p.isDead && !p.hasEscapedInPod)
    .sort((a, b) => a.orderNumber - b.orderNumber);
}

/**
 * Ищет следующего живого игрока, который ещё не спасовал.
 * Порядок обхода — по часовой стрелке (по возрастанию orderNumber с циклом).
 */
export function findNextActivePlayer(state: GameState, currentActivePlayerId: string): PlayerState | null {
  const activePlayers = getOrderedPlayers(state).filter((p) => !p.hasPassed);
  if (activePlayers.length === 0) return null;

  const currentIndex = activePlayers.findIndex((p) => p.id === currentActivePlayerId);
  if (currentIndex === -1) {
    // Если текущий игрок не найден среди неспасовавших, берем первого доступного
    return activePlayers[0] ?? null;
  }

  const nextIndex = (currentIndex + 1) % activePlayers.length;
  return activePlayers[nextIndex] ?? null;
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
    player.lightWounds += 1;
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
 * Завершает микроход активного игрока.
 * - Применяет эффект пожара;
 * - Сбрасывает счётчик действий текущего микрохода (actionsPerformedThisRound = 0);
 * - Если все игроки спасовали: переводит игру в EVENT_PHASE;
 * - Иначе: переключает activePlayerId на следующего неспасовавшего игрока.
 */
export function advanceTurn(state: GameState, completedPlayerId: string): void {
  const player = state.players[completedPlayerId];
  if (player) {
    applyFireEndTurnEffect(state, completedPlayerId);
    player.actionsPerformedThisRound = 0;
  }

  // Проверяем, все ли живые игроки спасовали
  const alivePlayers = getOrderedPlayers(state);
  const allPassed = alivePlayers.length > 0 && alivePlayers.every((p) => p.hasPassed);

  if (allPassed) {
    state.meta.phase = 'EVENT_PHASE';
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
 * Переход из Фазы Событий (EVENT_PHASE) в новый раунд Фазы Игроков (PLAYER_PHASE).
 * В рамках v0.3.0 выполняет:
 * 1. Инкремент currentRound (+1) и timeTrackPosition (+1);
 * 2. Передачу жетона Первого Игрока следующему игроку по часовой стрелке;
 * 3. Сброс флагов hasPassed и actionsPerformedThisRound;
 * 4. Добор карт всеми игроками до лимита руки (включая проверку Кают);
 * 5. Установку activePlayerId = firstPlayerId и phase = 'PLAYER_PHASE'.
 */
export function startNewRound(state: GameState): void {
  if (state.meta.phase === 'GAME_OVER') {
    throw new EngineError('GAME_IS_OVER', 'Нельзя начать раунд в завершённой партии');
  }

  state.meta.currentRound += 1;
  state.meta.timeTrackPosition += 1;

  const players = getOrderedPlayers(state);
  if (players.length > 0) {
    // Передача жетона первого игрока следующему по orderNumber
    const currentFirstIdx = players.findIndex((p) => p.id === state.meta.firstPlayerId);
    const nextFirstIdx = currentFirstIdx === -1 ? 0 : (currentFirstIdx + 1) % players.length;
    state.meta.firstPlayerId = players[nextFirstIdx]!.id;
  }

  state.meta.activePlayerId = state.meta.firstPlayerId;
  state.meta.phase = 'PLAYER_PHASE';

  for (const player of players) {
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
