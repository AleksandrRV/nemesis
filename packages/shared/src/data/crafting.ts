import type { CraftComponent, CraftedItemId } from '../types/cards.js';

/**
 * Фиксированные рецепты создания предметов (AGENTS.md §3.6, GDD §2.4, стр. 23).
 *
 * В игре ровно 4 создаваемых предмета, каждый собирается сбросом 2 карт
 * с синими символами компонентов. Состав рецептов перенесён по книге правил
 * без изменений и не подлежит «балансировке».
 */
export interface CraftingRecipe {
  /** Идентификатор создаваемого предмета: совпадает с `CraftedItemId` его карты. */
  itemId: CraftedItemId;
  name: string;
  /** Ровно два компонента, которые нужно сбросить. */
  components: [CraftComponent, CraftComponent];
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  { itemId: 'ANTIDOTE', name: 'Антидот', components: ['CHEMICALS', 'CHEMICALS'] },
  { itemId: 'TASER', name: 'Тазер', components: ['ELECTRONICS', 'POWER_CELL'] },
  { itemId: 'FLAMETHROWER', name: 'Огнемёт', components: ['TOOLS', 'CHEMICALS'] },
  { itemId: 'MOLOTOV_COCKTAIL', name: 'Коктейль Молотова', components: ['ALCOHOL', 'FABRIC'] },
];
