import type { GameState } from '../types/state.js';

function isDismiss(card: GameState['players'][string]['actionDeck']['hand'][number]): boolean {
  return 'characterClass' in card && card.effect.kind === 'DISMISS';
}

/**
 * Стол, где никто не держит «Отставить» на руке: карта меняется местами с обычной
 * из колоды того же игрока, размер руки не меняется. Окно реакции проверяют свои тесты.
 */
export function withoutDismissInHands(state: GameState): GameState {
  for (const player of Object.values(state.players)) {
    const deck = player.actionDeck;
    deck.hand = deck.hand.map((card) => {
      if (!isDismiss(card)) return card;
      const index = deck.drawPile.findIndex((candidate) => !isDismiss(candidate));
      if (index < 0) return card;
      const [replacement] = deck.drawPile.splice(index, 1, card);
      return replacement!;
    });
  }
  return state;
}
