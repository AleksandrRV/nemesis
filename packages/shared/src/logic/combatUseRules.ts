import { actionCardCombatUse, combatUseViolation, itemCombatUse, type CombatUse } from '../data/combatUse.js';
import type { GameState } from '../types/state.js';
import { isPlayerInCombat } from './combatStatus.js';
import { EngineError } from './engineErrors.js';

function rejectViolation(state: GameState, actorId: string, combatUse: CombatUse | null): void {
  const violation = combatUseViolation(combatUse, isPlayerInCombat(state, actorId));
  if (violation === null) return;
  throw new EngineError(combatUse === 'IN_COMBAT' ? 'ACTION_ONLY_IN_COMBAT' : 'ACTION_ONLY_OUT_OF_COMBAT', violation);
}

export function requireActionCardCombatUse(state: GameState, actorId: string, cardId: string): void {
  const card = state.players[actorId]?.actionDeck.hand.find((entry) => entry.id === cardId);
  if (!card || !('effect' in card)) return;
  rejectViolation(state, actorId, actionCardCombatUse(card));
}

export function requireItemCombatUse(state: GameState, actorId: string, itemId: string): void {
  const player = state.players[actorId];
  if (!player) return;
  const item =
    player.inventory.find((entry) => entry.id === itemId) ??
    player.handSlots.flatMap((slot) => (slot.source === 'ITEM' && slot.card.id === itemId ? [slot.card] : []))[0];
  if (!item) return;
  rejectViolation(state, actorId, itemCombatUse(item, player.questItems));
}
