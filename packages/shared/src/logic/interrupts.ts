import type { InterruptEvent } from '../types/interrupts.js';
import type { GameState } from '../types/state.js';
import { completeAction } from './actionCompletion.js';
import { resolveContact, requestFirstContactObjective } from './contact.js';
import { EngineError } from './engineErrors.js';
import { resolveSurpriseAttack } from './intruderAttacks.js';
import { resolveEscapeAttack } from './escape.js';
import { drawOneActionCard } from './classCombatCards.js';
import { resolveNoiseRoll } from './noise.js';
import { resolveExploreRoom } from './roomExploration.js';
import { advanceTurn } from './turnCycle.js';

export function drainInterrupts(state: GameState): void {
  while (state.interruptQueue.length > 0) {
    if (state.meta.phase === 'GAME_OVER') {
      state.interruptQueue = [];
      return;
    }
    if (state.pendingDecision) return;
    resolveInterrupt(state, state.interruptQueue.shift()!);
  }
  if (
    !state.pendingDecision &&
    state.meta.phase === 'PLAYER_PHASE' &&
    state.players[state.meta.activePlayerId]?.isDead
  ) {
    advanceTurn(state, state.meta.activePlayerId);
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
    case 'SURPRISE_ATTACK_INTERRUPT':
      return resolveSurpriseAttack(state, interrupt.playerId, interrupt.intruderId);
    case 'ESCAPE_ATTACK_INTERRUPT':
      return resolveEscapeAttack(state, interrupt);
    case 'DRAW_ACTION_CARD_INTERRUPT':
      return drawOneActionCard(state, interrupt.playerId);
    case 'COMPLETE_ACTION_INTERRUPT':
      return completeAction(state, interrupt.playerId);
    default: {
      const unknown: never = interrupt;
      throw new EngineError(
        'INTERRUPT_NOT_IMPLEMENTED',
        `Прерывание ${(unknown as { type: string }).type} ещё не разыгрывается движком.`,
      );
    }
  }
}
