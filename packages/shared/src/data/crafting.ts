import type { CraftComponent, CraftedItemCard, CraftedItemId } from '../types/cards.js';

/**
 * Фиксированные рецепты создания предметов (GDD §2.4, стр. 23).
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

/**
 * Синяя колода Создаваемых предметов: 12 карт из коробки (стр. 3, 23).
 * По 3 экземпляра каждого из 4 создаваемых предметов.
 */
export const CRAFTED_ITEM_CARDS: readonly CraftedItemCard[] = [
  ...Array.from({ length: 3 }, (_, i) => ({
    id: `CRAFTED_ANTIDOTE_${i + 1}`,
    name: 'Антидот',
    color: 'BLUE' as const,
    origin: 'CRAFTED' as const,
    recipeId: 'ANTIDOTE' as const,
    components: ['CHEMICALS', 'CHEMICALS'] as [CraftComponent, CraftComponent],
    isHeavy: false,
    isSingleUse: true,
    componentSymbols: [] as const,
    actionCost: 1,
    description:
      'Просканируйте колоду, удалите карты с Инфекцией и Личинку. Возьмите 1 карту Заражения, перемешайте колоду и спасуйте.',
    isWeapon: false,
    ammo: null,
    maxAmmo: null,
  })),

  ...Array.from({ length: 3 }, (_, i) => ({
    id: `CRAFTED_TASER_${i + 1}`,
    name: 'Тазер',
    color: 'BLUE' as const,
    origin: 'CRAFTED' as const,
    recipeId: 'TASER' as const,
    components: ['ELECTRONICS', 'POWER_CELL'] as [CraftComponent, CraftComponent],
    isHeavy: false,
    isSingleUse: true,
    componentSymbols: [] as const,
    actionCost: 1,
    description:
      '1 Чужой в вашей Комнате получает 1 Рану и Отступает ИЛИ выбранный Персонаж сбрасывает все карты с руки.',
    isWeapon: false,
    ammo: null,
    maxAmmo: null,
  })),

  ...Array.from({ length: 3 }, (_, i) => ({
    id: `CRAFTED_FLAMETHROWER_${i + 1}`,
    name: 'Огнемёт',
    color: 'BLUE' as const,
    origin: 'CRAFTED' as const,
    recipeId: 'FLAMETHROWER' as const,
    components: ['TOOLS', 'CHEMICALS'] as [CraftComponent, CraftComponent],
    isHeavy: true,
    isSingleUse: false,
    componentSymbols: [] as const,
    actionCost: 1,
    description:
      'Классическое оружие. Всегда наносит как минимум 1 Рану (кроме Промаха). При [2 Ранах] поместите маркер Пожара в Комнату.',
    isWeapon: true,
    ammo: 4,
    maxAmmo: 4,
  })),

  ...Array.from({ length: 3 }, (_, i) => ({
    id: `CRAFTED_MOLOTOV_${i + 1}`,
    name: 'Коктейль Молотова',
    color: 'BLUE' as const,
    origin: 'CRAFTED' as const,
    recipeId: 'MOLOTOV_COCKTAIL' as const,
    components: ['ALCOHOL', 'FABRIC'] as [CraftComponent, CraftComponent],
    isHeavy: false,
    isSingleUse: true,
    componentSymbols: [] as const,
    actionCost: 1,
    description: 'В Комнату с Чужим поместите маркер Пожара. Все в этой Комнате получают 1 Рану / Тяжёлую Травму.',
    isWeapon: false,
    ammo: null,
    maxAmmo: null,
  })),
];
