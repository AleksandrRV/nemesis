import type { CraftComponent, CraftedItemCard, CraftedItemId, ItemCard } from '../types/cards.js';

/** Рецепты — серые символы на синих картах и планшетах персонажей (стр. 23; scan-transcript §5.4). */
export interface CraftingRecipe {
  /** Идентификатор создаваемого предмета: совпадает с `CraftedItemId` его карты. */
  itemId: CraftedItemId;
  name: string;
  /** Ровно два компонента, которые нужно сбросить. */
  components: [CraftComponent, CraftComponent];
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  { itemId: 'ANTIDOTE', name: 'Антидот', components: ['FLAME', 'MEDKIT'] },
  { itemId: 'TASER', name: 'Тазер', components: ['BATTERY', 'TOOLS'] },
  { itemId: 'FLAMETHROWER', name: 'Огнемет', components: ['FLAME', 'TOOLS'] },
  { itemId: 'MOLOTOV_COCKTAIL', name: 'Коктейль Молотова', components: ['FLAME', 'FABRIC'] },
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
    components: ['FLAME', 'MEDKIT'] as [CraftComponent, CraftComponent],
    isHeavy: false,
    isSingleUse: true,
    componentSymbols: [] as const,
    actionCost: 1,
    description:
      'Просканируйте все карты в вашей колоде. Удалите все карты с ИНФЕКЦИЕЙ (и Личинку, если она у вас была). Затем возьмите 1 карту Заражения и перемешайте все ваши карты Действий. Затем вы обязаны спасовать.',
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
    components: ['BATTERY', 'TOOLS'] as [CraftComponent, CraftComponent],
    isHeavy: false,
    isSingleUse: true,
    componentSymbols: [] as const,
    actionCost: 1,
    description:
      'Выберите 1 Чужого в вашей Комнате. Он получает 1 Рану и Отступает ИЛИ Выберите 1 Персонажа в вашей Комнате. Он должен сбросить все карты с руки.',
    isWeapon: false,
    ammo: null,
    maxAmmo: null,
  })),

  ...Array.from({ length: 3 }, (_, i) => ({
    id: `CRAFTED_FLAMETHROWER_${i + 1}`,
    name: 'Огнемет',
    color: 'BLUE' as const,
    origin: 'CRAFTED' as const,
    recipeId: 'FLAMETHROWER' as const,
    components: ['FLAME', 'TOOLS'] as [CraftComponent, CraftComponent],
    isHeavy: true,
    isSingleUse: false,
    componentSymbols: [] as const,
    actionCost: 1,
    description:
      'Классическое оружие. Боезапас: 4. Вы всегда наносите как минимум 1 Рану (кроме [Промах]). Если вы выбросили [2 Раны], поместите маркер Пожара в вашу Комнату.',
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
    components: ['FLAME', 'FABRIC'] as [CraftComponent, CraftComponent],
    isHeavy: false,
    isSingleUse: true,
    componentSymbols: [] as const,
    actionCost: 1,
    description:
      'Выберите 1 Комнату, в которой есть Чужой (вашу или соседнюю). Поместите в нее маркер Пожара. Все, кто находятся в этой Комнате, получают 1 Рану/Тяжелую Травму.',
    isWeapon: false,
    ammo: null,
    maxAmmo: null,
  })),
];

export type CraftComponentSource = Pick<ItemCard, 'id' | 'color' | 'componentSymbols'> & { origin?: string };

export function recipeById(recipeId: CraftedItemId): CraftingRecipe | undefined {
  return CRAFTING_RECIPES.find((recipe) => recipe.itemId === recipeId);
}

export function canProvideComponent(
  item: CraftComponentSource,
  component: CraftComponent,
  yellowIsWildcard: boolean,
): boolean {
  if (item.origin === 'CRAFTED') return false;
  if (yellowIsWildcard && item.color === 'YELLOW') return true;
  return item.componentSymbols.includes(component);
}

export function matchesRecipe(
  recipe: CraftingRecipe,
  first: CraftComponentSource,
  second: CraftComponentSource,
  yellowIsWildcard = false,
): boolean {
  if (first.id === second.id) return false;
  const [a, b] = recipe.components;
  return (
    (canProvideComponent(first, a, yellowIsWildcard) && canProvideComponent(second, b, yellowIsWildcard)) ||
    (canProvideComponent(first, b, yellowIsWildcard) && canProvideComponent(second, a, yellowIsWildcard))
  );
}

export function craftablePairs(
  recipe: CraftingRecipe,
  items: readonly CraftComponentSource[],
  yellowIsWildcard = false,
): [string, string][] {
  const pairs: [string, string][] = [];
  items.forEach((first, index) => {
    items.slice(index + 1).forEach((second) => {
      if (matchesRecipe(recipe, first, second, yellowIsWildcard)) pairs.push([first.id, second.id]);
    });
  });
  return pairs;
}
