import type { ActionCard, CardPile, GameDecksState } from '../types/cards.js';
import type { CharacterClass } from '../types/entities.js';
import { ACTION_CARDS_BY_CHARACTER } from '../data/actionCards.js';
import { CONTAMINATION_CARDS } from '../data/contaminationCards.js';
import { CRAFTED_ITEM_CARDS } from '../data/crafting.js';
import { EVENT_CARDS } from '../data/eventCards.js';
import { GREEN_ITEM_CARDS, RED_ITEM_CARDS, YELLOW_ITEM_CARDS } from '../data/itemCards.js';
import { INTRUDER_ATTACK_CARDS } from '../data/intruderAttacks.js';
import { SERIOUS_WOUND_CARDS } from '../data/seriousWounds.js';
import { WEAKNESS_CARDS } from '../data/weaknesses.js';
import { createRng, shuffle } from '../utils/rng.js';
import type { Rng } from '../utils/rng.js';

export function createActionDeckForCharacter(
  characterClass: CharacterClass,
  seed: string,
  draws: number = 0,
): ActionCard[] {
  const definitions = ACTION_CARDS_BY_CHARACTER[characterClass];
  if (!definitions) {
    throw new Error(`Неизвестный класс персонажа: ${characterClass}`);
  }
  const rng = createRng(seed, 'cards');
  for (let i = 0; i < draws; i++) {
    rng();
  }
  return shuffle(rng, [...definitions]);
}

export function createShuffledPile<TCard>(cards: readonly TCard[], seed: string, draws: number = 0): CardPile<TCard> {
  const rng = createRng(seed, 'cards');
  for (let i = 0; i < draws; i++) {
    rng();
  }
  return {
    drawPile: shuffle(rng, [...cards]),
    discard: [],
  };
}

export function createInitialDecks(seed: string, rng: Rng = createRng(seed, 'cards')): GameDecksState {
  return {
    items: {
      RED: { drawPile: shuffle(rng, [...RED_ITEM_CARDS]), discard: [] },
      YELLOW: { drawPile: shuffle(rng, [...YELLOW_ITEM_CARDS]), discard: [] },
      GREEN: { drawPile: shuffle(rng, [...GREEN_ITEM_CARDS]), discard: [] },
    },
    craftedItems: { drawPile: [...CRAFTED_ITEM_CARDS], discard: [] },
    contamination: { drawPile: shuffle(rng, structuredClone(CONTAMINATION_CARDS)), discard: [] },
    seriousWounds: { drawPile: shuffle(rng, structuredClone(SERIOUS_WOUND_CARDS)), discard: [] },
    events: { drawPile: shuffle(rng, structuredClone(EVENT_CARDS)), discard: [] },
    intruderAttacks: { drawPile: shuffle(rng, structuredClone(INTRUDER_ATTACK_CARDS)), discard: [] },
    objectives: {
      personal: { drawPile: [], discard: [] },
      corporate: { drawPile: [], discard: [] },
    },
    weaknesses: { drawPile: shuffle(rng, structuredClone(WEAKNESS_CARDS)), discard: [] },
  };
}
