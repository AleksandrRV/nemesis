import { describe, expect, it } from 'vitest';

import { COMPONENT_FAMILY, type CraftComponent, type CraftedItemId } from '../types/cards.js';
import { CRAFTING_RECIPES } from './crafting.js';

/** Рецепты из AGENTS.md §3.6 и GDD §2.4: ровно 4 создаваемых предмета. */
const EXPECTED_RECIPES: Record<string, CraftComponent[]> = {
  ANTIDOTE: ['CHEMICALS', 'CHEMICALS'],
  TASER: ['ELECTRONICS', 'POWER_CELL'],
  FLAMETHROWER: ['TOOLS', 'CHEMICALS'],
  MOLOTOV_COCKTAIL: ['ALCOHOL', 'FABRIC'],
};

describe('Рецепты создания предметов', () => {
  it('содержит ровно 4 создаваемых предмета', () => {
    expect(CRAFTING_RECIPES).toHaveLength(4);
  });

  it('совпадает с рецептами из AGENTS.md §3.6', () => {
    const actual = Object.fromEntries(CRAFTING_RECIPES.map((recipe) => [recipe.itemId, [...recipe.components].sort()]));
    const expected = Object.fromEntries(
      Object.entries(EXPECTED_RECIPES).map(([itemId, components]) => [itemId, [...components].sort()]),
    );

    expect(actual).toEqual(expected);
  });

  it('требует ровно два компонента и не повторяет предметы', () => {
    for (const recipe of CRAFTING_RECIPES) {
      expect(recipe.components).toHaveLength(2);
      expect(recipe.name.length).toBeGreaterThan(0);
    }

    const itemIds = CRAFTING_RECIPES.map((recipe) => recipe.itemId);

    expect(new Set(itemIds).size).toBe(itemIds.length);
  });

  it('покрывает все четыре создаваемых предмета как единый набор', () => {
    const expected: CraftedItemId[] = ['ANTIDOTE', 'TASER', 'FLAMETHROWER', 'MOLOTOV_COCKTAIL'];

    expect(CRAFTING_RECIPES.map((recipe) => recipe.itemId).sort()).toEqual([...expected].sort());
  });

  it('использует только существующие компоненты с известным семейством', () => {
    for (const recipe of CRAFTING_RECIPES) {
      for (const component of recipe.components) {
        expect(Object.keys(COMPONENT_FAMILY)).toContain(component);
        expect(['MEDICAL', 'TECH']).toContain(COMPONENT_FAMILY[component]);
      }
    }
  });

  it('покрывает все шесть символов компонентов, включая сдвоенный символ Антидота', () => {
    const used = new Set(CRAFTING_RECIPES.flatMap((recipe) => recipe.components));

    expect([...used].sort()).toEqual(['ALCOHOL', 'CHEMICALS', 'ELECTRONICS', 'FABRIC', 'POWER_CELL', 'TOOLS'].sort());
  });

  it('делит компоненты на медицинское и техническое семейства', () => {
    const byFamily = Object.entries(COMPONENT_FAMILY).reduce<Record<string, string[]>>((acc, [component, family]) => {
      acc[family] = [...(acc[family] ?? []), component];
      return acc;
    }, {});

    expect(byFamily.MEDICAL).toHaveLength(3);
    expect(byFamily.TECH).toHaveLength(3);
  });
});
