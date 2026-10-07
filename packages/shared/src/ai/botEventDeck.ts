import { EVENT_CARDS } from '../data/eventCards.js';
import type { EventCard } from '../types/cards.js';
import type { SanitizedGameState } from '../types/sanitized.js';

const eventDecks = new WeakMap<SanitizedGameState, readonly EventCard[]>();

/** Колода Событий глазами бота: карты, которых нет ни в открытом сбросе, ни среди удалённых из игры (стр. 10). */
export function eventDeckOf(view: SanitizedGameState): readonly EventCard[] {
  const cached = eventDecks.get(view);
  if (cached) return cached;
  const discarded = new Set(view.decks.events.discard.map((card) => card.id));
  const removed = removedEventCards(view);
  const unseen = EVENT_CARDS.filter((card) => !discarded.has(card.id) && !removed.has(card.id));
  const deck = unseen.length > 0 ? unseen : EVENT_CARDS.filter((card) => discarded.has(card.id));
  eventDecks.set(view, deck);
  return deck;
}

function removedEventCards(view: SanitizedGameState): Set<string> {
  const removed = new Set<string>();
  for (const { event } of view.gameLog) {
    if (event.type === 'EVENT_CARD_DRAWN' && event.card.isDestroyedOnResolve) removed.add(event.card.id);
  }
  return removed;
}

/**
 * Шанс, что карта События с этим эффектом выйдет за оставшиеся Фазы Событий: она в колоде — доля вытянутых из неё
 * карт; в сбросе — только после замеса, когда колода кончится.
 */
export function eventDrawChance(view: SanitizedGameState, effect: EventCard['effect'], phases: number): number {
  if (phases <= 0) return 0;
  const deck = eventDeckOf(view);
  if (deck.some((card) => card.effect === effect)) return Math.min(1, phases / deck.length);
  const afterReshuffle = phases - view.decks.events.drawPileCount;
  const removed = removedEventCards(view);
  const reshuffled = EVENT_CARDS.filter((card) => !removed.has(card.id));
  if (afterReshuffle <= 0 || !reshuffled.some((card) => card.effect === effect)) return 0;
  return Math.min(1, afterReshuffle / reshuffled.length);
}
