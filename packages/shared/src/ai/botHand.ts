import { ACTION_CARD_COMBAT_USE } from '../data/combatUse.js';
import type { ActionCard } from '../types/cards.js';
import type { SanitizedActionDeckCard, SanitizedGameState } from '../types/sanitized.js';
import { isPaymentCard } from '../logic/actionRules.js';
import type { BotTuning } from './botTuning.js';

export function isActionCard(card: SanitizedActionDeckCard): card is ActionCard {
  return isPaymentCard(card);
}

/** Карты, которые есть в колоде каждого Персонажа (стр. 13): их бот тратит первыми. */
const BASIC_KINDS: ReadonlySet<ActionCard['effect']['kind']> = new Set([
  'SEARCH',
  'DEMOLITION',
  'REST',
  'DISMISS',
  'BASIC_REPAIR',
]);

/** Ценность карты в руке (В8-7-7): боевые и классовые бот бережёт, базовые тратит первыми. */
export function cardValue(card: ActionCard, tuning: BotTuning): number {
  if (ACTION_CARD_COMBAT_USE[card.effect.kind] === 'IN_COMBAT') return tuning.hand.cardValue.COMBAT;
  return BASIC_KINDS.has(card.effect.kind) ? tuning.hand.cardValue.BASIC : tuning.hand.cardValue.CLASS;
}

/** Карты Заражения на руке, которых ещё не касался сканер: их убирает скан (стр. 20). */
export function unscannedContamination(view: SanitizedGameState, botId: string): number {
  return (view.players[botId]?.actionDeck.hand ?? []).filter((card) => !isActionCard(card) && card.isInfected === null)
    .length;
}

export function handOf(view: SanitizedGameState, botId: string): ActionCard[] {
  return (view.players[botId]?.actionDeck.hand ?? []).filter(isActionCard);
}

/** Самые дешёвые для бота карты оплаты; null — карт не хватает (Заражением платить нельзя, стр. 20). */
export function paymentFor(
  view: SanitizedGameState,
  botId: string,
  count: number,
  tuning: BotTuning,
  excludeIds: readonly string[] = [],
): string[] | null {
  if (count === 0) return [];
  const payable = handOf(view, botId)
    .filter((card) => !excludeIds.includes(card.id))
    .sort((left, right) => cardValue(left, tuning) - cardValue(right, tuning) || left.id.localeCompare(right.id));
  return payable.length >= count ? payable.slice(0, count).map((card) => card.id) : null;
}

/** Цена карт оплаты для оценки Действия: сколько ценности бот отдаёт. */
export function paymentValue(view: SanitizedGameState, botId: string, cardIds: readonly string[], tuning: BotTuning) {
  const hand = handOf(view, botId);
  return cardIds.reduce((sum, id) => {
    const card = hand.find((entry) => entry.id === id);
    return sum + (card ? cardValue(card, tuning) : 0);
  }, 0);
}
