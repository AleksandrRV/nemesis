import { describe, expect, it } from 'vitest';

import type { CraftComponent, CraftedItemId } from '../types/cards.js';
import { CRAFTED_ITEM_CARDS, CRAFTING_RECIPES } from './crafting.js';

const SCAN_RECIPES: Record<CraftedItemId, CraftComponent[]> = {
  ANTIDOTE: ['FLAME', 'MEDKIT'],
  TASER: ['BATTERY', 'TOOLS'],
  FLAMETHROWER: ['FLAME', 'TOOLS'],
  MOLOTOV_COCKTAIL: ['FLAME', 'FABRIC'],
};

describe('Рецепты создания предметов (стр. 23; cards_additional.pdf, стр. 11, 13)', () => {
  it('четыре рецепта — серые символы синих карт', () => {
    const actual = Object.fromEntries(CRAFTING_RECIPES.map((recipe) => [recipe.itemId, [...recipe.components].sort()]));
    const expected = Object.fromEntries(
      Object.entries(SCAN_RECIPES).map(([itemId, components]) => [itemId, [...components].sort()]),
    );

    expect(actual).toEqual(expected);
  });

  it('синие карты собираются по своему рецепту: по 3 экземпляра каждого предмета', () => {
    for (const recipe of CRAFTING_RECIPES) {
      const cards = CRAFTED_ITEM_CARDS.filter((card) => card.recipeId === recipe.itemId);
      expect(cards, recipe.itemId).toHaveLength(3);
      for (const card of cards) expect(card.components, card.id).toEqual(recipe.components);
    }
  });

  it('пять символов компонентов, у каждого рецепта два разных символа', () => {
    const used = new Set(CRAFTING_RECIPES.flatMap((recipe) => recipe.components));

    expect([...used].sort()).toEqual(['BATTERY', 'FABRIC', 'FLAME', 'MEDKIT', 'TOOLS']);
    for (const recipe of CRAFTING_RECIPES) expect(new Set(recipe.components).size, recipe.itemId).toBe(2);
  });
});
