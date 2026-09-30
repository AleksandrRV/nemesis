import { describe, expect, it } from 'vitest';
import { COORDINATE_CARDS } from '../data/coordinateCards.js';
import { CORPORATE_OBJECTIVE_CARDS, PERSONAL_OBJECTIVE_CARDS } from '../data/objectiveCards.js';
import type { ActionDeckCard, ObjectiveCard } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { actorOf, botTable, stepBots, type BotTable } from '../testing/botTable.js';
import { BotAgent } from './botAgent.js';

const TABLES = 20;
const STEPS_PER_TABLE = 90;
const CHECK_EVERY = 5;

function isActionCard(card: ActionDeckCard): boolean {
  return 'characterClass' in card;
}

/** Меняет местами первую карту Действия руки и первую карту Действия колоды: число карт на руке прежнее. */
function swapHandWithDeck(state: GameState, playerId: string): void {
  const deck = state.players[playerId]!.actionDeck;
  const inHand = deck.hand.findIndex(isActionCard);
  const inPile = deck.drawPile.findIndex(isActionCard);
  if (inHand < 0 || inPile < 0) return;
  [deck.hand[inHand], deck.drawPile[inPile]] = [deck.drawPile[inPile]!, deck.hand[inHand]!];
}

function otherObjective(card: ObjectiveCard, taken: ReadonlySet<string>): ObjectiveCard {
  const pool = card.kind === 'CORPORATE' ? CORPORATE_OBJECTIVE_CARDS : PERSONAL_OBJECTIVE_CARDS;
  return structuredClone(pool.find((candidate) => !taken.has(candidate.id) && candidate.id !== card.id) ?? card);
}

/**
 * Другой мир с тем же срезом наблюдателя: чужие руки и Цели, порядок всех колод и мешка, Двигатели и карта
 * Координат — всё, чего бот знать не может, подменено.
 */
function withDifferentSecrets(state: GameState, viewerId: string): GameState {
  const other = structuredClone(state);
  const viewerObjectives = new Set(other.players[viewerId]!.objectives.map((card) => card.id));
  for (const player of Object.values(other.players)) {
    player.actionDeck.drawPile.reverse();
    if (player.id === viewerId) continue;
    swapHandWithDeck(other, player.id);
    player.objectives = player.objectives.map((card) => otherObjective(card, viewerObjectives));
  }
  for (const pile of Object.values(other.decks.items)) pile.drawPile.reverse();
  for (const pile of [other.decks.events, other.decks.intruderAttacks, other.decks.contamination]) {
    pile.drawPile.reverse();
  }
  other.decks.seriousWounds.drawPile.reverse();
  other.intrudersPool.bag.reverse();
  for (const engine of Object.values(other.ship.engines)) engine.isWorking = !engine.isWorking;
  const coordinates = COORDINATE_CARDS.find((card) => card.id !== other.ship.coordinates.cardId)!;
  other.ship.coordinates.cardId = coordinates.id;
  return other;
}

function checkpoint(table: BotTable): { same: boolean; actorId: string } | null {
  const actorId = actorOf(table.state);
  if (!actorId) return null;
  const mind = table.minds[actorId]!;
  const truth = BotAgent.decide(filterStateForPlayer(table.state, actorId), mind);
  const fake = BotAgent.decide(filterStateForPlayer(withDifferentSecrets(table.state, actorId), actorId), mind);
  return { same: JSON.stringify(truth) === JSON.stringify(fake), actorId };
}

describe('Нет подглядывания (план 0.8.0, В8-9-3)', () => {
  it('подмена скрытого не меняет решения бота на сотнях случайных столов', () => {
    let checked = 0;
    const leaks: string[] = [];
    for (let index = 0; index < TABLES; index++) {
      let table = botTable(`no-peeking-${index}`, 2 + (index % 4));
      for (let step = 0; step < STEPS_PER_TABLE && table.state.meta.phase !== 'GAME_OVER'; step++) {
        if (step % CHECK_EVERY === 0) {
          const result = checkpoint(table);
          if (result) {
            checked += 1;
            if (!result.same) leaks.push(`no-peeking-${index} шаг ${step}: ${result.actorId}`);
          }
        }
        const next = stepBots(table);
        if (!next) break;
        table = next.table;
      }
    }
    expect(leaks).toEqual([]);
    expect(checked).toBeGreaterThan(200);
  }, 120_000);

  it('подмена действительно меняет скрытое состояние', () => {
    const table = botTable('no-peeking-control', 3);
    const other = withDifferentSecrets(table.state, 'player-1');
    expect(other.ship.coordinates.cardId).not.toBe(table.state.ship.coordinates.cardId);
    expect(other.ship.engines[1]!.isWorking).toBe(!table.state.ship.engines[1]!.isWorking);
    expect(other.players['player-2']!.actionDeck.hand).not.toEqual(table.state.players['player-2']!.actionDeck.hand);
  });
});
