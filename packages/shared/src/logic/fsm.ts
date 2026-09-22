import { produce } from 'immer';
import type { EngineAction } from '../types/actions.js';
import type { GameState } from '../types/state.js';
import { isPlayerInCombat } from './combatStatus.js';
import { executeCardPayment } from './cardsPayment.js';
import { escapeAttackerIds } from './escape.js';
import { executeToggleDoor, executeToggleNoise } from './devActions.js';
import { EngineError } from './engineErrors.js';
import { drainInterrupts } from './interrupts.js';
import { movePlayer, requireCarefulMoveAllowed } from './movement.js';
import { executePass, executePlayCard, executeUseItem } from './playerActions.js';
import { executeShoot } from './shoot.js';
import { executeMelee } from './melee.js';
import { executePickUpObject } from './heavyObjects.js';
import { executeCombatCard, isCombatActionCard } from './classCombatCards.js';
import { executeRoomAbility } from './roomAbilities.js';
import { executeDecision, executeSearch } from './searchActions.js';
import { requireOpenPath } from './shipGraphQueries.js';
import { queueActionCompletion } from './actionCompletion.js';

export { EngineError } from './engineErrors.js';
export type { EngineErrorCode } from './engineErrors.js';
export { drainInterrupts, resolveInterrupt } from './interrupts.js';
export { findAdjacentOpenRoomIds, findNoiseTarget } from './shipGraphQueries.js';
export type { CorridorGraphState, NoiseTarget } from './shipGraphQueries.js';

export interface ProcessActionOptions {
  actorId?: string;
  allowDevActions?: boolean;
}

function isDevAction(action: EngineAction): boolean {
  return action.type === 'DEV_TOGGLE_DOOR' || action.type === 'DEV_TOGGLE_NOISE';
}

function validateActor(state: GameState, action: EngineAction, actorId: string, options: ProcessActionOptions): void {
  if (state.meta.phase === 'GAME_OVER') {
    throw new EngineError('GAME_IS_OVER', `Партия окончена (${state.meta.gameOverReason}), действия недоступны.`);
  }
  if (isDevAction(action) && !options.allowDevActions) {
    throw new EngineError('DEV_ACTION_FORBIDDEN', `Отладочное действие ${action.type} запрещено.`);
  }
  const player = state.players[actorId];
  if (!player) throw new EngineError('UNKNOWN_PLAYER', `Неизвестный персонаж: ${actorId}.`);
  if (player.isDead) throw new EngineError('PLAYER_IS_DEAD', `Погибший персонаж ${actorId} не может действовать.`);
  const resolvesOwnDecision = action.type === 'ACTION_RESOLVE_DECISION' && state.pendingDecision?.playerId === actorId;
  const choosesObjective = resolvesOwnDecision && state.pendingDecision?.type === 'CHOOSE_OBJECTIVE';
  if ((player.isInHibernation || player.hasEscapedInPod) && !choosesObjective) {
    throw new EngineError('PLAYER_NOT_ON_SHIP', 'Персонаж в Анабиозе или покинул корабль.');
  }
  if (state.pendingDecision && action.type !== 'ACTION_RESOLVE_DECISION') {
    throw new EngineError('PENDING_DECISION_REQUIRED', 'Сначала завершите обязательное решение.');
  }
  if (resolvesOwnDecision) return;
  if (isDevAction(action)) return;
  if (state.meta.phase !== 'PLAYER_PHASE') {
    throw new EngineError('NOT_IN_PLAYER_PHASE', 'Действия игроков разрешены только в Фазе Игроков.');
  }
  if (player.hasPassed) throw new EngineError('PLAYER_ALREADY_PASSED', `Игрок ${actorId} уже спасовал.`);
  if (state.meta.activePlayerId !== actorId) {
    throw new EngineError('NOT_ACTIVE_PLAYER', `Сейчас ход игрока ${state.meta.activePlayerId}, а не ${actorId}.`);
  }
}

function handleAction(state: GameState, action: EngineAction, actorId: string): void {
  const player = state.players[actorId]!;
  switch (action.type) {
    case 'ACTION_MOVE': {
      const path = requireOpenPath(state, player.roomId, action.payload.targetRoomId);
      executeCardPayment(state, actorId, action.payload.discardCardIds, 1);
      if (isPlayerInCombat(state, actorId)) {
        // Побег (стр. 19): перед перемещением каждый Чужой отсека атакует
        // убегающего. COMPLETE_ACTION ставит сам resolveEscapeAttack — после
        // шага в целевой отсек и броска Шума.
        state.interruptQueue.push({
          type: 'ESCAPE_ATTACK_INTERRUPT',
          playerId: actorId,
          intruderIds: escapeAttackerIds(state, player.roomId),
          targetRoomId: action.payload.targetRoomId,
        });
        return;
      }
      movePlayer(state, actorId, action.payload.targetRoomId, path[0]!.id, { kind: 'ROLL' });
      queueActionCompletion(state, actorId);
      return;
    }
    case 'ACTION_CAREFUL_MOVE': {
      const { targetRoomId, chosenCorridor, discardCardIds } = action.payload;
      const path = requireOpenPath(state, player.roomId, targetRoomId);
      requireCarefulMoveAllowed(state, actorId, targetRoomId, chosenCorridor);
      executeCardPayment(state, actorId, discardCardIds, 2);
      movePlayer(state, actorId, targetRoomId, path[0]!.id, { kind: 'CAREFUL', chosen: chosenCorridor });
      queueActionCompletion(state, actorId);
      return;
    }
    case 'ACTION_PASS':
      return executePass(state, action, actorId);
    case 'ACTION_SHOOT':
      return executeShoot(state, action, actorId);
    case 'ACTION_MELEE':
      return executeMelee(state, action, actorId);
    case 'ACTION_PICK_UP_OBJECT':
      executeCardPayment(state, actorId, action.payload.discardCardIds, 1);
      return executePickUpObject(state, action, actorId);

    case 'ACTION_SEARCH':
      return executeSearch(state, action, actorId);
    case 'ACTION_RESOLVE_DECISION':
      return executeDecision(state, action, actorId);
    case 'ACTION_ROOM_ABILITY':
      executeCardPayment(state, actorId, action.payload.discardCardIds ?? [], 2);
      return executeRoomAbility(state, actorId, action.payload);
    case 'ACTION_PLAY_CARD':
      if (action.payload.combat || isCombatActionCard(action.payload.cardId)) {
        return executeCombatCard(state, action, actorId);
      }
      return executePlayCard(state, action, actorId);
    case 'ACTION_USE_ITEM':
      return executeUseItem(state, action, actorId);
    case 'DEV_TOGGLE_DOOR':
      return executeToggleDoor(state, action, actorId);
    case 'DEV_TOGGLE_NOISE':
      return executeToggleNoise(state, action, actorId);
    default:
      throw new EngineError('ACTION_NOT_IMPLEMENTED', `Действие ${action.type} ещё не реализовано движком.`);
  }
}

export class GameEngine {
  processAction(state: GameState, action: EngineAction, options: ProcessActionOptions = {}): GameState {
    const actorId = options.actorId ?? state.meta.activePlayerId;
    return produce(state, (draft) => {
      validateActor(draft, action, actorId, options);
      handleAction(draft, action, actorId);
      drainInterrupts(draft);
    });
  }
}
