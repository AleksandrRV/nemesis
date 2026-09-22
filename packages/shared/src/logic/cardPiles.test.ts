import { afterEach, describe, expect, it, vi } from 'vitest';
import { contactState, existingIntruder, forceAttack, giveSeriousWounds } from '../testing/contactFixtures.js';
import { createRng, drawFromStream } from '../utils/rng.js';
import * as rng from '../utils/rng.js';
import { drawSharedCard, reshuffleDiscard } from './cardPiles.js';
import { drainInterrupts } from './interrupts.js';
import { resolveSurpriseAttack } from './intruderAttacks.js';
import type { GameState } from '../types/state.js';
import { createInitialDecks } from '../data/cardsSetup.js';

afterEach(() => vi.restoreAllMocks());

describe('Перетасовка Атак и продолжение потоков (стр. 20)', () => {
  it('тасует сброс при пустой колоде, читая ровно n−1 значений cards', () => {
    const state = contactState();
    const pile = state.decks.intruderAttacks;
    pile.discard = pile.drawPile;
    pile.drawPile = [];
    const before = { ...state.meta.rngDraws };
    const ids = pile.discard.map((card) => card.id).sort();
    const draw = vi.spyOn(rng, 'drawFromStream');
    const card = drawSharedCard(state, pile, 'Атаки Чужих');
    expect(pile.drawPile).toHaveLength(19);
    expect(pile.discard).toEqual([]);
    expect([card, ...pile.drawPile].map((entry) => entry.id).sort()).toEqual(ids);
    expect(draw).toHaveBeenCalledTimes(19);
    expect(draw).toHaveBeenNthCalledWith(1, state.meta.seed, 'cards', before.cards);
    expect(draw).toHaveBeenNthCalledWith(19, state.meta.seed, 'cards', before.cards + 18);
    expect(state.meta.rngDraws).toEqual({ ...before, cards: before.cards + 19 });
  });

  it('после последней разыгранной карты сразу тасует весь сброс, включая эту карту', () => {
    const state = contactState();
    forceAttack(state, 'SCRATCH');
    const pile = state.decks.intruderAttacks;
    pile.discard = pile.drawPile.slice(1);
    pile.drawPile = pile.drawPile.slice(0, 1);
    const before = state.meta.rngDraws.cards;
    resolveSurpriseAttack(state, 'player-1', existingIntruder(state, 'ADULT'));
    expect(pile.drawPile).toHaveLength(20);
    expect(pile.discard).toEqual([]);
    expect(new Set(pile.drawPile.map((card) => card.id)).size).toBe(20);
    expect(state.meta.rngDraws.cards).toBe(before + 19);
  });

  it('Трансформация последней картой: сброс возвращается до дополнительной атаки', () => {
    const state = contactState(2);
    forceAttack(state, 'TRANSFORMATION');
    const pile = state.decks.intruderAttacks;
    const transform = pile.drawPile[0]!;
    const bite = pile.drawPile.find((card) => card.effect === 'BITE')!;
    pile.discard = [bite, ...pile.drawPile.filter((card) => card.id !== transform.id && card.id !== bite.id)];
    pile.drawPile = [transform];
    giveSeriousWounds(state, 'player-1', 2);
    state.players['player-1']!.actionDeck.hand = [];
    vi.spyOn(rng, 'drawFromStream').mockReturnValue(0.999999);
    state.interruptQueue = [
      { type: 'SURPRISE_ATTACK_INTERRUPT', playerId: 'player-1', intruderId: existingIntruder(state, 'CREEPER') },
      { type: 'COMPLETE_ACTION_INTERRUPT', playerId: 'player-1' },
    ];
    drainInterrupts(state);
    expect(state.players['player-1']!.isDead).toBe(true);
    expect(pile.drawPile).toHaveLength(19);
    expect(pile.discard).toEqual([bite]);
    expect(state.meta.activePlayerId).toBe('player-2');
  });

  it('одна карта и пустой сброс не расходуют RNG впустую', () => {
    const state = contactState();
    const before = { ...state.meta.rngDraws };
    const pile = { drawPile: [], discard: [state.decks.intruderAttacks.drawPile[0]!] };
    reshuffleDiscard(state, pile);
    reshuffleDiscard(state, pile);
    expect(pile.drawPile).toHaveLength(1);
    expect(state.meta.rngDraws).toEqual(before);
  });

  it('продолжает перетасовки после сохранения с ненулевой позиции', () => {
    const state = contactState();
    const pile = state.decks.intruderAttacks;
    pile.discard = pile.drawPile;
    pile.drawPile = [];
    const restored = JSON.parse(JSON.stringify(state)) as GameState;
    reshuffleDiscard(state, pile);
    reshuffleDiscard(restored, restored.decks.intruderAttacks);
    expect(restored).toEqual(state);
  });

  it('подготовка сохраняет фактические позиции bag/cards, не повторяя уже использованные значения', () => {
    const state = contactState();
    expect(state.meta.rngDraws.bag).toBe(state.intrudersPool.bag.length - 1);
    let cardDraws = 0;
    const sequential = createRng(state.meta.seed, 'cards');
    createInitialDecks(state.meta.seed, () => {
      cardDraws += 1;
      return sequential();
    });
    expect(state.meta.rngDraws.cards).toBe(cardDraws);
    expect(drawFromStream(state.meta.seed, 'cards', cardDraws)).toBe(sequential());
    expect(state.meta.rngDraws.noise).toBe(0);
    expect(state.meta.rngDraws.combat).toBe(0);
  });
});
