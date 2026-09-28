import { describe, expect, it } from 'vitest';
import { EVENT_CARDS } from '../data/eventCards.js';
import type { ActionDeckCard, ContaminationCard, EventCard } from '../types/cards.js';
import type { EventEffectOutcome } from '../types/log.js';
import type { GameState } from '../types/state.js';
import { putIntruder, putPlayer } from '../testing/contactFixtures.js';
import { resolveEventCardEffect } from './eventEffects.js';
import { createInitialGameState } from './setup.js';

function freshState(seed: string, playerCount = 1): GameState {
  return createInitialGameState(seed, { playerCount });
}

function cardById(cardId: string): EventCard {
  const card = EVENT_CARDS.find((candidate) => candidate.id === cardId);
  if (!card) throw new Error(`Неизвестная карта Событий: ${cardId}`);
  return card;
}

function outcome(state: GameState, cardId: string): EventEffectOutcome {
  resolveEventCardEffect(state, cardById(cardId));
  const entry = [...state.gameLog].reverse().find((candidate) => candidate.event.type === 'EVENT_EFFECT_RESOLVED');
  if (!entry || entry.event.type !== 'EVENT_EFFECT_RESOLVED') throw new Error('EVENT_EFFECT_RESOLVED не в журнале');
  return entry.event.outcome;
}

function contaminationCard(id: string, isInfected: boolean): ContaminationCard {
  return { id, isInfected, isScanned: false };
}

function ids(cards: readonly ActionDeckCard[]): string[] {
  return cards.map((card) => card.id);
}

function scanEvents(state: GameState) {
  return state.gameLog.flatMap((entry) => (entry.event.type === 'CONTAMINATION_SCANNED' ? [entry.event] : []));
}

describe('Шаг 7б Фазы Событий: эффекты Улья и заражения (стр. 10, 20–21)', () => {
  describe('Выводок', () => {
    it('Яйцо сбрасывается с Планшета, Личинка уходит в мешок', () => {
      const state = freshState('dump');
      const larvaBefore = state.intrudersPool.bag.filter((token) => token.type === 'LARVA').length;

      const result = outcome(state, 'EVT_BROOD');

      expect(state.intrudersPool.eggsOnBoard).toBe(4);
      expect(result).toEqual({ kind: 'BROOD', eggDiscarded: true, infectedPlayerIds: [], larvaAddedToBag: true });
      expect(state.intrudersPool.bag.filter((token) => token.type === 'LARVA')).toHaveLength(larvaBefore + 1);
    });

    it('Персонаж в Улье без карт Действий становится Инфицированным: Личинка на Планшет и карта Заражения', () => {
      const state = freshState('dump');
      putPlayer(state, 'player-1', 3);
      state.players['player-1']!.actionDeck.hand = [];
      const contaminationBefore = state.decks.contamination.drawPile.length;
      const larvaBefore = state.intrudersPool.bag.filter((token) => token.type === 'LARVA').length;

      const result = outcome(state, 'EVT_BROOD');

      expect(result).toEqual({
        kind: 'BROOD',
        eggDiscarded: true,
        infectedPlayerIds: ['player-1'],
        larvaAddedToBag: false,
      });
      expect(state.players['player-1']!.hasLarva).toBe(true);
      expect(state.decks.contamination.drawPile).toHaveLength(contaminationBefore - 1);
      expect(state.players['player-1']!.actionDeck.discard).toHaveLength(1);
      expect(state.intrudersPool.bag.filter((token) => token.type === 'LARVA')).toHaveLength(larvaBefore);
    });

    it('карты Заражения на руке не считаются картами Действий', () => {
      const state = freshState('dump');
      putPlayer(state, 'player-1', 3);
      state.players['player-1']!.actionDeck.hand = [contaminationCard('held-contamination', false)];

      const result = outcome(state, 'EVT_BROOD');

      expect(result).toMatchObject({ infectedPlayerIds: ['player-1'], larvaAddedToBag: false });
      expect(state.players['player-1']!.hasLarva).toBe(true);
    });

    it('Персонаж в Улье с картами Действий на руке не Инфицирован', () => {
      const state = freshState('dump');
      putPlayer(state, 'player-1', 3);
      expect(state.players['player-1']!.actionDeck.hand.length).toBeGreaterThan(0);

      const result = outcome(state, 'EVT_BROOD');

      expect(result).toMatchObject({ infectedPlayerIds: [], larvaAddedToBag: true });
      expect(state.players['player-1']!.hasLarva).toBe(false);
    });
  });

  describe('Регенерация', () => {
    it('каждый Чужой на поле сбрасывает 2 Раны, с одной Раной — сбрасывает её', () => {
      const state = freshState('dump');
      const threeWounds = putIntruder(state, 'ADULT', 6);
      const oneWound = putIntruder(state, 'CREEPER', 13);
      const healthy = putIntruder(state, 'ADULT', 8);
      state.intrudersPool.boardTokens.find((token) => token.id === threeWounds)!.woundsCount = 3;
      state.intrudersPool.boardTokens.find((token) => token.id === oneWound)!.woundsCount = 1;

      const result = outcome(state, 'EVT_REGENERATION');

      expect(result).toEqual({ kind: 'REGENERATION', healedIntruderIds: [threeWounds, oneWound], woundsRemoved: 3 });
      expect(state.intrudersPool.boardTokens.find((token) => token.id === threeWounds)!.woundsCount).toBe(1);
      expect(state.intrudersPool.boardTokens.find((token) => token.id === oneWound)!.woundsCount).toBe(0);
      expect(state.intrudersPool.boardTokens.find((token) => token.id === healthy)!.woundsCount).toBe(0);
    });
  });

  describe('Созревание', () => {
    it('носитель Личинки гибнет, Крипер появляется в его Комнате', () => {
      const state = freshState('dump2', 2);
      state.players['player-1']!.hasLarva = true;

      const result = outcome(state, 'EVT_MATURATION');

      expect(result).toMatchObject({ deadPlayerIds: ['player-1'], creeperRoomIds: [11] });
      expect(state.players['player-1']!.isDead).toBe(true);
      expect(state.players['player-1']!.hasLarva).toBe(false);
      const creeper = state.intrudersPool.boardTokens.find((token) => token.roomId === 11 && token.type === 'CREEPER');
      expect(creeper).toBeDefined();
    });

    it('каждый Персонаж берет 4 карты из своей колоды, сканирует руку и сбрасывает взятые карты', () => {
      const state = freshState('dump2', 2);
      const deck = state.players['player-2']!.actionDeck;
      const handBefore = ids(deck.hand);
      const drawnIds = ids(deck.drawPile.slice(0, 4));
      const contaminationDeckBefore = structuredClone(state.decks.contamination);

      const result = outcome(state, 'EVT_MATURATION');

      expect(result).toEqual({
        kind: 'MATURATION',
        deadPlayerIds: [],
        creeperRoomIds: [],
        scannedPlayerIds: ['player-1', 'player-2'],
        infectedPlayerIds: [],
      });
      expect(ids(deck.hand)).toEqual(handBefore);
      expect(ids(deck.discard).slice(-4)).toEqual(drawnIds);
      expect(state.decks.contamination).toEqual(contaminationDeckBefore);
      expect(state.players['player-2']!.hasLarva).toBe(false);
    });

    it('ИНФЕКЦИЯ среди взятых карт кладет Личинку на Планшет, карта Заражения уходит в сброс', () => {
      const state = freshState('dump2', 2);
      const deck = state.players['player-1']!.actionDeck;
      const infected = contaminationCard('maturation-infected', true);
      deck.drawPile.splice(2, 0, infected);

      const result = outcome(state, 'EVT_MATURATION');

      expect(result).toMatchObject({ infectedPlayerIds: ['player-1'] });
      expect(state.players['player-1']!.hasLarva).toBe(true);
      expect(state.players['player-2']!.hasLarva).toBe(false);
      expect(ids(deck.discard)).toContain('maturation-infected');
      expect(ids(deck.hand)).not.toContain('maturation-infected');
      expect(deck.discard.find((card) => card.id === 'maturation-infected')).toMatchObject({ isScanned: true });
      expect(scanEvents(state)).toEqual([
        {
          type: 'CONTAMINATION_SCANNED',
          playerId: 'player-1',
          source: 'MATURATION',
          results: ['INFECTED'],
          removedCount: 0,
          outcome: 'LARVA_PLACED',
        },
      ]);
    });

    it('сканируются и карты Заражения, которые уже были на руке; они остаются на руке', () => {
      const state = freshState('dump2', 2);
      const deck = state.players['player-2']!.actionDeck;
      deck.hand.push(contaminationCard('held-infected', true));

      const result = outcome(state, 'EVT_MATURATION');

      expect(result).toMatchObject({ infectedPlayerIds: ['player-2'] });
      expect(state.players['player-2']!.hasLarva).toBe(true);
      expect(ids(deck.hand)).toContain('held-infected');
    });

    it('пустая колода Действий замешивает сброс перед добором (стр. 10)', () => {
      const state = freshState('dump2', 1);
      const deck = state.players['player-1']!.actionDeck;
      deck.discard = [...deck.drawPile];
      deck.drawPile = [];
      const deckSize = deck.discard.length;
      const handBefore = ids(deck.hand);
      const cardsDrawsBefore = state.meta.rngDraws.cards;

      outcome(state, 'EVT_MATURATION');

      expect(state.meta.rngDraws.cards).toBeGreaterThan(cardsDrawsBefore);
      expect(ids(deck.hand)).toEqual(handBefore);
      expect(deck.discard).toHaveLength(4);
      expect(deck.drawPile).toHaveLength(deckSize - 4);
    });

    it('Персонажи в Анабиозе и в Спасательной Капсуле в розыгрыше не участвуют', () => {
      const state = freshState('dump2', 3);
      state.players['player-1']!.isInHibernation = true;
      state.players['player-1']!.hasLarva = true;
      state.players['player-2']!.hasEscapedInPod = true;
      const hibernatedDeck = structuredClone(state.players['player-1']!.actionDeck);

      const result = outcome(state, 'EVT_MATURATION');

      expect(result).toMatchObject({ deadPlayerIds: [], scannedPlayerIds: ['player-3'] });
      expect(state.players['player-1']!.isDead).toBe(false);
      expect(state.players['player-1']!.actionDeck).toEqual(hibernatedDeck);
    });
  });
});
