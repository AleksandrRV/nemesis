import type { PendingDecision } from '../types/decisions.js';
import type { GameState } from '../types/state.js';
import { EngineError } from './engineErrors.js';
import { appendGameLog } from './gameLog.js';
import { movePlayer } from './movement.js';
import { requireOpenPath } from './shipGraphQueries.js';
import { allocateEntityId } from './stateIds.js';

export const CONSENT_OPTION = { ACCEPT: 'ACCEPT', DECLINE: 'DECLINE' } as const;

export type RepositionConsent = 'REQUIRED' | 'NOT_REQUIRED';

type RepositionMove = { playerId: string; targetRoomId: number };

/** Перенос без Атак Чужих: шаг идёт первым в очереди прерываний, до завершения Действия. */
function moveFirst(state: GameState, move: RepositionMove): void {
  const before = state.interruptQueue.length;
  const path = requireOpenPath(state, state.players[move.playerId]!.roomId, move.targetRoomId);
  movePlayer(state, move.playerId, move.targetRoomId, path[0]!.id, { kind: 'ROLL' });
  const added = state.interruptQueue.splice(before);
  state.interruptQueue.unshift(...added);
}

function validateMoves(
  state: GameState,
  actorId: string,
  moves: readonly RepositionMove[],
  maxMoves: number,
  label: string,
): void {
  if (moves.length < 1 || moves.length > maxMoves) {
    throw new EngineError(
      'INVALID_DECISION_OPTION',
      `${label}: допустимо ${maxMoves === 1 ? 'ровно один перенос' : `от 1 до ${maxMoves}`} переносов, передано ${moves.length}.`,
    );
  }
  const actorRoomId = state.players[actorId]!.roomId;
  const seen = new Set<string>();
  for (const move of moves) {
    if (seen.has(move.playerId)) {
      throw new EngineError('INVALID_DECISION_OPTION', `${label}: персонаж указан дважды.`);
    }
    seen.add(move.playerId);
    const target = state.players[move.playerId];
    if (!target || target.isDead || target.isInHibernation || target.hasEscapedInPod) {
      throw new EngineError('UNKNOWN_PLAYER', `${label}: такого персонажа на корабле нет.`);
    }
    if (target.roomId !== actorRoomId) {
      throw new EngineError('INVALID_ATTACK_TARGET', `${label}: переносимый персонаж должен быть в комнате игрока.`);
    }
    requireOpenPath(state, target.roomId, move.targetRoomId);
  }
}

/**
 * Отход без Атаки Чужих (стр. 19). «Огонь на подавление» и «Заградительный огонь»
 * переносят другого Персонажа, только «если он согласен»; «Приказ» — без согласия.
 */
export function executeReposition(
  state: GameState,
  actorId: string,
  moves: readonly RepositionMove[],
  maxMoves: number,
  label: string,
  consent: RepositionConsent,
): void {
  validateMoves(state, actorId, moves, maxMoves, label);
  const needsConsent = (move: RepositionMove) => consent === 'REQUIRED' && move.playerId !== actorId;
  for (const move of moves.filter((entry) => !needsConsent(entry))) moveFirst(state, move);
  const [asked] = moves.filter(needsConsent);
  if (!asked) return;
  state.pendingDecision = {
    id: allocateEntityId(state, 'reposition-consent'),
    playerId: asked.playerId,
    type: 'REPOSITION_CONSENT',
    requesterId: actorId,
    targetRoomId: asked.targetRoomId,
    cardName: label,
  };
}

export function resolveRepositionConsent(
  state: GameState,
  decision: Extract<PendingDecision, { type: 'REPOSITION_CONSENT' }>,
  option: string,
): void {
  if (option !== CONSENT_OPTION.ACCEPT && option !== CONSENT_OPTION.DECLINE) {
    throw new EngineError('INVALID_DECISION_OPTION', 'Ответьте: согласиться на перенос или отказаться.');
  }
  state.pendingDecision = null;
  const accepted = option === CONSENT_OPTION.ACCEPT;
  appendGameLog(state, {
    type: 'REPOSITION_ANSWERED',
    playerId: decision.playerId,
    requesterId: decision.requesterId,
    targetRoomId: decision.targetRoomId,
    accepted,
  });
  if (accepted) moveFirst(state, { playerId: decision.playerId, targetRoomId: decision.targetRoomId });
}
