import { describe, expect, it } from 'vitest';
import { EVENT_CARDS } from '../data/eventCards.js';
import type { EventCard } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import { disposeEventCard } from './eventEffects.js';
import { playEventCard, resolveEventCardMovement } from './eventCardMovement.js';
import { createInitialGameState } from './setup.js';

function freshState(seed: string, playerCount = 1): GameState {
  return createInitialGameState(seed, { playerCount });
}

function cardById(cardId: string): EventCard {
  const card = EVENT_CARDS.find((candidate) => candidate.id === cardId);
  if (!card) throw new Error(`Неизвестная карта Событий: ${cardId}`);
  return card;
}

/** Колода Событий в точном порядке, остальные карты — за указанными. */
function stackEventDeck(state: GameState, topToBottom: string[]): void {
  const rest = EVENT_CARDS.filter((card) => !topToBottom.includes(card.id));
  state.decks.events = {
    drawPile: [...topToBottom.map(cardById), ...rest],
    discard: [],
  };
}

describe('Шаг 7б: судьба карт Событий после розыгрыша', () => {
  it('обычная карта уходит в публичный сброс', () => {
    const state = freshState('dispose-plain');
    const card = cardById('EVT_HUNT_1');

    disposeEventCard(state, card);

    expect(state.decks.events.discard.map((candidate) => candidate.id)).toEqual(['EVT_HUNT_1']);
    expect(state.decks.events.drawPile).toHaveLength(20);
  });

  it('карта «Неисправности» замешивается обратно в колоду', () => {
    const state = freshState('dispose-reshuffle');
    state.decks.events.drawPile = EVENT_CARDS.filter((card) => card.id !== 'EVT_MALFUNCTION').map((card) => ({
      ...card,
    }));
    const card = cardById('EVT_MALFUNCTION');

    disposeEventCard(state, card);

    expect(state.decks.events.discard).toHaveLength(0);
    expect(state.decks.events.drawPile).toHaveLength(20);
    expect(state.decks.events.drawPile.map((candidate) => candidate.id)).toContain('EVT_MALFUNCTION');
  });

  it('карта «удалите и замешайте сброс» исчезает из игры, сброс уходит под колоду', () => {
    const state = freshState('dispose-destroy');
    const outOfGame = ['EVT_ESCAPE_POD_EJECTION', 'EVT_HUNT_1', 'EVT_HIVE'];
    state.decks.events.drawPile = EVENT_CARDS.filter((card) => !outOfGame.includes(card.id)).map((card) => ({
      ...card,
    }));
    state.decks.events.discard = [cardById('EVT_HUNT_1'), cardById('EVT_HIVE')];
    const destroyed = cardById('EVT_ESCAPE_POD_EJECTION');

    disposeEventCard(state, destroyed);

    const allIds = [
      ...state.decks.events.drawPile.map((card) => card.id),
      ...state.decks.events.discard.map((card) => card.id),
    ];
    expect(allIds).not.toContain('EVT_ESCAPE_POD_EJECTION'); // карта удалена из игры
    expect(state.decks.events.discard).toHaveLength(0);
    expect(state.decks.events.drawPile).toHaveLength(19); // 17 + замешанный сброс (2)
    expect(state.decks.events.drawPile.map((card) => card.id)).toContain('EVT_HIVE');
  });
});

describe('Шаг 7б: полный цикл розыгрыша карты Событий', () => {
  it('движение Чужих исполняется до эффекта, карта уходит в сброс', () => {
    const state = freshState('full-cycle');
    stackEventDeck(state, ['EVT_OPEN_COMPARTMENTS']);
    state.ship.corridors['1-2']!.doorState = 'CLOSED';

    resolveEventCardMovement(state);

    const types = state.gameLog.map((entry) => entry.event.type);
    expect(types).toContain('EVENT_CARD_DRAWN');
    expect(types).toContain('EVENT_EFFECT_RESOLVED');
    expect(types.indexOf('EVENT_CARD_DRAWN')).toBeLessThan(types.indexOf('EVENT_EFFECT_RESOLVED'));
    expect(state.ship.corridors['1-2']!.doorState).toBe('OPEN');
    expect(state.decks.events.discard.map((card) => card.id)).toEqual(['EVT_OPEN_COMPARTMENTS']);
  });

  it('игра, завершённая до розыгрыша, не исполняет эффект и не сбрасывает карту', () => {
    const state = freshState('game-over-guard');
    const card = state.decks.events.drawPile.find((candidate) => candidate.id === 'EVT_HUNT_1')!;
    state.decks.events.drawPile = state.decks.events.drawPile.filter((candidate) => candidate.id !== 'EVT_HUNT_1');
    state.meta.phase = 'GAME_OVER';

    playEventCard(state, card);

    expect(state.decks.events.discard).toHaveLength(0);
    expect(state.decks.events.drawPile.map((candidate) => candidate.id)).not.toContain('EVT_HUNT_1');
    expect(state.gameLog.some((entry) => entry.event.type === 'EVENT_EFFECT_RESOLVED')).toBe(false);
  });
});
