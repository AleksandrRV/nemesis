import type { CardPile } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import { drawFromStream, shuffle } from '../utils/rng.js';
import { EngineError } from './engineErrors.js';

export function reshuffleDiscard<T>(state: GameState, pile: CardPile<T>): void {
  if (pile.drawPile.length > 0 || pile.discard.length === 0) return;

  pile.drawPile = shuffle(() => {
    const value = drawFromStream(state.meta.seed, 'cards', state.meta.rngDraws.cards);
    state.meta.rngDraws.cards += 1;
    return value;
  }, pile.discard);
  pile.discard = [];
}

export function drawSharedCard<T>(state: GameState, pile: CardPile<T>, deckName: string): T {
  reshuffleDiscard(state, pile);
  const card = pile.drawPile.shift();
  if (card === undefined)
    throw new EngineError('CARD_SUPPLY_EXHAUSTED', `В колоде «${deckName}» и её сбросе нет карт.`);
  return card;
}
