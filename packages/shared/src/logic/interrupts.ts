import type { InterruptEvent } from '../types/interrupts.js';
import type { GameState } from '../types/state.js';
import { completeAction } from './actionCompletion.js';
import { offerSteelNervesOrAttack, resolveContact, requestFirstContactObjective } from './contact.js';
import { EngineError } from './engineErrors.js';
import { resolveSurpriseAttack } from './intruderAttacks.js';
import { resolveEscapeAttack } from './escape.js';
import { drawOneActionCard } from './classCombatCards.js';
import { resolveNoiseRoll } from './noise.js';
import { resolveExploreRoom } from './roomExploration.js';
import { advanceTurnWithoutFire } from './turnCycle.js';
import { guardEscapePods, resolveHibernationAttempt, resolvePodBoarding } from './evacuation.js';

export function drainInterrupts(state: GameState): void {
  while (state.interruptQueue.length > 0) {
    if (state.meta.phase === 'GAME_OVER') {
      state.interruptQueue = [];
      return;
    }
    if (state.pendingDecision) return;
    resolveInterrupt(state, state.interruptQueue.shift()!);
    guardEscapePods(state);
  }
  guardEscapePods(state);
  if (
    !state.pendingDecision &&
    state.meta.phase === 'PLAYER_PHASE' &&
    state.players[state.meta.activePlayerId]?.isDead
  ) {
    advanceTurnWithoutFire(state, state.meta.activePlayerId);
  }
}

export function resolveInterrupt(state: GameState, interrupt: InterruptEvent): void {
  switch (interrupt.type) {
    case 'EXPLORE_ROOM_INTERRUPT':
      return resolveExploreRoom(state, interrupt);
    case 'NOISE_ROLL_INTERRUPT':
      return resolveNoiseRoll(state, interrupt);
    case 'CONTACT_INTERRUPT':
      return resolveContact(state, interrupt);
    case 'FIRST_CONTACT_OBJECTIVE_INTERRUPT':
      return requestFirstContactObjective(state, interrupt.playerId);
    case 'STEEL_NERVES_OFFER_INTERRUPT':
      return offerSteelNervesOrAttack(state, interrupt.playerId, interrupt.intruderId);
    case 'SURPRISE_ATTACK_INTERRUPT':
      return resolveSurpriseAttack(state, interrupt.playerId, interrupt.intruderId);
    case 'ESCAPE_ATTACK_INTERRUPT':
      return resolveEscapeAttack(state, interrupt);
    case 'DRAW_ACTION_CARD_INTERRUPT':
      return drawOneActionCard(state, interrupt.playerId);
    case 'COMPLETE_ACTION_INTERRUPT':
      return completeAction(state, interrupt.playerId);
    case 'HIBERNATION_ATTEMPT_INTERRUPT':
      return resolveHibernationAttempt(state, interrupt);
    case 'ESCAPE_POD_BOARDING_INTERRUPT':
      return resolvePodBoarding(state, interrupt);
    default: {
      const unknown: never = interrupt;
      throw new EngineError(
        'INTERRUPT_NOT_IMPLEMENTED',
        `Прерывание ${(unknown as { type: string }).type} ещё не разыгрывается движком.`,
      );
    }
  }
}
