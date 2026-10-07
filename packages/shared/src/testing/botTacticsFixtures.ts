import { ACTION_CARDS } from '../data/actionCards.js';
import { GREEN_ITEM_CARDS, RED_ITEM_CARDS, YELLOW_ITEM_CARDS } from '../data/itemCards.js';
import { getItemEffectKind, type ItemEffectKind } from '../data/itemEffectKinds.js';
import type { ActionCard, ItemCard } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { generateCandidates } from '../ai/botActions.js';
import { buildAgenda } from '../ai/botGoals.js';
import type { BotMind } from '../ai/botMind.js';
import { BOT_TUNING, type BotTuning } from '../ai/botTuning.js';
import { scoreCandidates, type ScoredCandidate } from '../ai/botUtility.js';
import { contactState } from './contactFixtures.js';
import { BOT, mindFor, seen, withCharacter } from './botSocialFixtures.js';

export { BOT };

/** Ход бота в Фазе Игроков без решений в ожидании. */
export function botTable(seed: string): GameState {
  const state = contactState(2, seed);
  state.meta.activePlayerId = BOT;
  state.pendingDecision = null;
  state.players[BOT]!.hasPassed = false;
  return state;
}

export function neutralMind(state: GameState): BotMind {
  return seen(state, withCharacter(mindFor(state), {}));
}

export function rankedFor(state: GameState, tuning: BotTuning = BOT_TUNING): ScoredCandidate[] {
  const view = filterStateForPlayer(state, BOT);
  const mind = neutralMind(state);
  const agenda = buildAgenda(view, mind, tuning);
  return scoreCandidates(view, mind, agenda, generateCandidates(view, mind, agenda.tasks, tuning), tuning);
}

export function agendaFor(state: GameState) {
  return buildAgenda(filterStateForPlayer(state, BOT), neutralMind(state), BOT_TUNING);
}

export function itemOfKind(kind: ItemEffectKind): ItemCard {
  const card = [...RED_ITEM_CARDS, ...YELLOW_ITEM_CARDS, ...GREEN_ITEM_CARDS].find(
    (item) => getItemEffectKind(item) === kind,
  );
  if (!card) throw new Error(`Нет Предмета с эффектом ${kind}`);
  return structuredClone(card);
}

export function actionCardOfKind(kind: ActionCard['effect']['kind']): ActionCard {
  const card = ACTION_CARDS.find((entry) => entry.effect.kind === kind);
  if (!card) throw new Error(`Нет карты Действия ${kind}`);
  return structuredClone(card);
}

/** Рука бота: только перечисленные карты плюс базовые на оплату до `size`. */
export function handOf(state: GameState, cards: readonly ActionCard[], size: number): void {
  const deck = state.players[BOT]!.actionDeck;
  const fillers = [...deck.hand, ...deck.drawPile].filter(
    (card): card is ActionCard => 'effect' in card && !cards.some((kept) => kept.id === card.id),
  );
  deck.hand = [...cards, ...fillers.slice(0, Math.max(0, size - cards.length))];
}

export function weaponOf(state: GameState): ItemCard {
  const slot = state.players[BOT]!.handSlots.find((entry) => entry.source === 'ITEM' && entry.card.isWeapon);
  if (!slot || slot.source !== 'ITEM') throw new Error('У бота нет Оружия в руке');
  return slot.card;
}
