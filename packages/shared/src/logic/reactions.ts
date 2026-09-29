import type { EngineAction, GameAction } from '../types/actions.js';
import type { ActionCard } from '../types/cards.js';
import type { DismissWindowView, PendingDecision, PendingReaction } from '../types/decisions.js';
import type { PlayerState } from '../types/entities.js';
import type { GameState } from '../types/state.js';
import { queueActionCompletion } from './actionCompletion.js';
import { executeCardPayment } from './cardsPayment.js';
import { EngineError } from './engineErrors.js';
import { appendGameLog } from './gameLog.js';
import { allocateEntityId } from './stateIds.js';

export const DISMISS_OPTION = { DISMISS: 'DISMISS', ALLOW: 'ALLOW' } as const;

export type ActionRunner = (action: GameAction, actorId: string) => void;

/** Действия, которые «Отставить» может отменить: всё, что стоит Действия; Пас и ответы на решения — нет. */
const DISMISSABLE_ACTIONS = new Set<EngineAction['type']>([
  'ACTION_MOVE',
  'ACTION_CAREFUL_MOVE',
  'ACTION_SEARCH',
  'ACTION_SHOOT',
  'ACTION_MELEE',
  'ACTION_PICK_UP_OBJECT',
  'ACTION_ROOM_ABILITY',
  'ACTION_PLAY_CARD',
  'ACTION_USE_ITEM',
  'ACTION_CRAFT_ITEM',
  'ACTION_ACTIVATE_QUEST',
  'ACTION_EXCHANGE',
]);

function dismissCardOf(player: PlayerState): ActionCard | undefined {
  return player.actionDeck.hand.find(
    (card): card is ActionCard => 'characterClass' in card && card.effect.kind === 'DISMISS',
  );
}

function crewInRoom(state: GameState, roomId: number): PlayerState[] {
  return Object.values(state.players)
    .filter(
      (player) => player.roomId === roomId && !player.isDead && !player.isInHibernation && !player.hasEscapedInPod,
    )
    .sort((left, right) => left.orderNumber - right.orderNumber);
}

function targetOf(reaction: PendingReaction): string {
  return reaction.dismissedBy.at(-1) ?? reaction.actorId;
}

function nextResponder(state: GameState, reaction: PendingReaction): PlayerState | undefined {
  const target = targetOf(reaction);
  return crewInRoom(state, reaction.roomId).find(
    (player) =>
      player.id !== target && !reaction.askedThisRound.includes(player.id) && dismissCardOf(player) !== undefined,
  );
}

export function dismissWindowView(reaction: PendingReaction): DismissWindowView {
  return {
    actorId: reaction.actorId,
    actionType: reaction.action.type,
    targetPlayerId: targetOf(reaction),
    dismissedBy: [...reaction.dismissedBy],
  };
}

function freshReaction(state: GameState, action: GameAction, actorId: string): PendingReaction {
  return { action, actorId, roomId: state.players[actorId]!.roomId, dismissedBy: [], askedThisRound: [] };
}

export function opensDismissWindow(state: GameState, action: EngineAction, actorId: string): action is GameAction {
  if (state.meta.phase !== 'PLAYER_PHASE' || !DISMISSABLE_ACTIONS.has(action.type)) return false;
  return nextResponder(state, freshReaction(state, action as GameAction, actorId)) !== undefined;
}

/** Цена отменённого Действия оплачивается (текст карты): платёжные карты и сама сыгранная карта уходят в сброс. */
function payForDismissedAction(state: GameState, reaction: PendingReaction): number {
  const payload = reaction.action.payload as { discardCardIds?: string[]; cardId?: string };
  const payment = payload.discardCardIds ?? [];
  const playedCardId = reaction.action.type === 'ACTION_PLAY_CARD' ? payload.cardId : undefined;
  executeCardPayment(state, reaction.actorId, payment, payment.length, playedCardId);
  if (!playedCardId) return payment.length;
  const player = state.players[reaction.actorId]!;
  const index = player.actionDeck.hand.findIndex((card) => card.id === playedCardId);
  if (index >= 0) player.actionDeck.discard.push(...player.actionDeck.hand.splice(index, 1));
  return payment.length + 1;
}

function finishReaction(state: GameState, runAction: ActionRunner): void {
  const reaction = state.reaction!;
  state.reaction = null;
  if (reaction.dismissedBy.length % 2 === 1) {
    const paidCardCount = payForDismissedAction(state, reaction);
    appendGameLog(state, {
      type: 'ACTION_DISMISSED',
      playerId: reaction.actorId,
      actionType: reaction.action.type,
      dismissedBy: [...reaction.dismissedBy],
      paidCardCount,
    });
    queueActionCompletion(state, reaction.actorId);
    return;
  }
  if (reaction.dismissedBy.length > 0) {
    appendGameLog(state, {
      type: 'DISMISS_OVERRULED',
      playerId: reaction.actorId,
      dismissedBy: [...reaction.dismissedBy],
    });
  }
  runAction(reaction.action, reaction.actorId);
}

function askNext(state: GameState, runAction: ActionRunner): void {
  const reaction = state.reaction!;
  const responder = nextResponder(state, reaction);
  if (!responder) {
    finishReaction(state, runAction);
    return;
  }
  state.pendingDecision = {
    id: allocateEntityId(state, 'dismiss-window'),
    playerId: responder.id,
    type: 'DISMISS_WINDOW',
    window: dismissWindowView(reaction),
  };
}

export function openDismissWindow(
  state: GameState,
  action: GameAction,
  actorId: string,
  runAction: ActionRunner,
): void {
  state.reaction = freshReaction(state, action, actorId);
  askNext(state, runAction);
}

export function resolveDismissWindow(
  state: GameState,
  decision: Extract<PendingDecision, { type: 'DISMISS_WINDOW' }>,
  option: string,
  runAction: ActionRunner,
): void {
  const reaction = state.reaction;
  if (!reaction) throw new EngineError('DECISION_NOT_FOUND', 'Окна «Отставить» нет.');
  if (option !== DISMISS_OPTION.DISMISS && option !== DISMISS_OPTION.ALLOW) {
    throw new EngineError('INVALID_DECISION_OPTION', 'Ответьте: сыграть «Отставить» или пропустить.');
  }
  state.pendingDecision = null;
  if (option === DISMISS_OPTION.ALLOW) {
    reaction.askedThisRound.push(decision.playerId);
    askNext(state, runAction);
    return;
  }
  const responder = state.players[decision.playerId]!;
  const card = dismissCardOf(responder);
  if (!card) throw new EngineError('CARD_NOT_IN_HAND', 'На руке нет карты «Отставить».');
  responder.actionDeck.hand = responder.actionDeck.hand.filter((entry) => entry.id !== card.id);
  responder.actionDeck.discard.push(card);
  appendGameLog(state, {
    type: 'DISMISS_PLAYED',
    playerId: responder.id,
    targetPlayerId: targetOf(reaction),
    cardId: card.id,
  });
  reaction.dismissedBy.push(responder.id);
  reaction.askedThisRound = [];
  askNext(state, runAction);
}
