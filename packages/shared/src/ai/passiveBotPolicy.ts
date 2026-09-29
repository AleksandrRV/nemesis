import type { GameAction } from '../types/actions.js';
import type { ItemDeckColor } from '../types/cards.js';
import type { PendingDecision } from '../types/decisions.js';
import type { SanitizedGameState } from '../types/sanitized.js';
import { podCommandsFor } from '../logic/evacuation.js';
import { EXCHANGE_OPTION } from '../logic/exchange.js';
import { CONSENT_OPTION } from '../logic/reposition.js';
import { DISMISS_OPTION } from '../logic/reactions.js';

const WHITE_ROOM_DECK_PREFERENCE: readonly ItemDeckColor[] = ['RED', 'YELLOW', 'GREEN'];

function answer(decision: PendingDecision, selectedOption: string): GameAction {
  return { type: 'ACTION_RESOLVE_DECISION', payload: { decisionId: decision.id, selectedOption } };
}

function firstNonEmptyItemDeck(view: SanitizedGameState): ItemDeckColor | undefined {
  return WHITE_ROOM_DECK_PREFERENCE.find((color) => view.decks.items[color].drawPileCount > 0);
}

function firstHandItemId(view: SanitizedGameState, botId: string): string | undefined {
  const slot = view.players[botId]?.handSlots.find((entry) => entry.source === 'ITEM');
  return slot?.source === 'ITEM' ? slot.card.id : undefined;
}

function cautiousOption(view: SanitizedGameState, botId: string, decision: PendingDecision): string | undefined {
  switch (decision.type) {
    case 'CHOOSE_OBJECTIVE':
      return decision.objectiveIds[0];
    case 'REPOSITION_CONSENT':
      return CONSENT_OPTION.ACCEPT;
    case 'DISMISS_WINDOW':
      return DISMISS_OPTION.ALLOW;
    case 'EXCHANGE_CONSENT':
      return EXCHANGE_OPTION.DECLINE;
    case 'STEEL_NERVES_OFFER':
      return 'USE_STEEL_NERVES';
    case 'ESCAPE_POD_LAUNCH_CHOICE':
      return 'LAUNCH';
    case 'REROLL_COMBAT_DIE':
      return 'KEEP';
    case 'CHOOSE_SEARCH_ITEM':
    case 'CHOOSE_STORAGE_ITEM':
      return decision.cards[0]?.id;
    case 'CHOOSE_WHITE_ROOM_DECK':
      return firstNonEmptyItemDeck(view);
    case 'CHOOSE_ENERGY_WEAPON':
      return decision.weaponIds[0];
    case 'DISCARD_HEAVY_ITEM_FOR_NEW':
      return firstHandItemId(view, botId);
    case 'ROOM_FIRE_CONTROL_TARGET':
    case 'ROOM_GENERATOR_ACTION':
    case 'CHOOSE_REST_CONTAMINATION_DISCARD':
      return undefined;
  }
}

/**
 * Бот до шагов 5–7 плана 0.8.0: на своём ходу пасует (в Капсуле — остаётся),
 * на решения отвечает осторожно. Видит только свой срез; null — ответа нет.
 */
export function decidePassiveBotAction(view: SanitizedGameState, botId: string): GameAction | null {
  if (view.meta.phase === 'GAME_OVER') return null;
  if (view.pendingDecisionPlayerId !== null && view.pendingDecisionPlayerId !== botId) return null;
  const decision = view.pendingDecision;
  if (decision) {
    const option = cautiousOption(view, botId, decision);
    return option === undefined ? null : answer(decision, option);
  }
  if (view.meta.phase !== 'PLAYER_PHASE' || view.meta.activePlayerId !== botId) return null;
  const bot = view.players[botId];
  if (!bot) return null;
  if (podCommandsFor(view, bot).includes('STAY')) return { type: 'ACTION_ESCAPE_POD', payload: { command: 'STAY' } };
  return { type: 'ACTION_PASS', payload: {} };
}
