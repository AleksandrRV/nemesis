import {
  CRAFTING_RECIPES,
  canProvideComponent,
  craftablePairs,
  matchesRecipe,
  type CraftComponent,
  type CraftingRecipe,
  type ItemCard,
  type SanitizedGameState,
} from '@nemesis/shared';

export const CRAFT_ACTION_COST = 1;

export interface WorkshopComponentItem {
  item: ItemCard;
  location: 'INVENTORY' | 'HAND_SLOT';
  provides: CraftComponent[] | 'ANY';
}

export interface WorkshopRecipe {
  recipe: CraftingRecipe;
  remaining: number;
  pairs: [string, string][];
  available: boolean;
  reason?: string;
  missing: CraftComponent[];
  covered: [boolean, boolean];
}

export function componentItems(view: SanitizedGameState, yellowIsWildcard: boolean): WorkshopComponentItem[] {
  const player = view.players[view.meta.activePlayerId];
  if (!player) return [];
  const owned: { item: ItemCard; location: 'INVENTORY' | 'HAND_SLOT' }[] = [
    ...(player.inventory ?? []).map((item) => ({ item, location: 'INVENTORY' as const })),
    ...player.handSlots.flatMap((slot) =>
      slot.source === 'ITEM' ? [{ item: slot.card, location: 'HAND_SLOT' as const }] : [],
    ),
  ];
  return owned
    .filter(({ item }) => item.origin !== 'CRAFTED')
    .map(({ item, location }): WorkshopComponentItem => ({
      item,
      location,
      provides: yellowIsWildcard && item.color === 'YELLOW' ? 'ANY' : [...item.componentSymbols],
    }))
    .filter((entry) => entry.provides === 'ANY' || entry.provides.length > 0);
}

function slotCoverage(
  recipe: CraftingRecipe,
  items: readonly WorkshopComponentItem[],
  yellowIsWildcard: boolean,
): [boolean, boolean] {
  const pool = [...items];
  const covered = recipe.components.map((component) => {
    const index = pool.findIndex((entry) => canProvideComponent(entry.item, component, yellowIsWildcard));
    if (index === -1) return false;
    pool.splice(index, 1);
    return true;
  });
  return [covered[0]!, covered[1]!];
}

export function buildWorkshop(view: SanitizedGameState, yellowIsWildcard: boolean): WorkshopRecipe[] {
  const items = componentItems(view, yellowIsWildcard);
  const remainingByRecipe = view.decks.craftedItems.remainingByRecipe;
  return CRAFTING_RECIPES.map((recipe) => {
    const remaining = remainingByRecipe[recipe.itemId] ?? 0;
    const pairs = craftablePairs(
      recipe,
      items.map((entry) => entry.item),
      yellowIsWildcard,
    );
    const covered = slotCoverage(recipe, items, yellowIsWildcard);
    const missing = recipe.components.filter((_, index) => !covered[index]);
    const reason =
      remaining === 0
        ? 'Карт этого Предмета не осталось ни в колоде, ни в сбросе'
        : pairs.length === 0
          ? 'Не хватает Предметов с нужными синими символами'
          : undefined;
    return { recipe, remaining, pairs, available: reason === undefined, reason, missing, covered };
  });
}

export function selectionMatches(
  recipe: CraftingRecipe,
  items: readonly WorkshopComponentItem[],
  ids: readonly string[],
  yellowIsWildcard: boolean,
): boolean {
  if (ids.length !== 2) return false;
  const [first, second] = ids.map((id) => items.find((entry) => entry.item.id === id)?.item);
  return first !== undefined && second !== undefined && matchesRecipe(recipe, first, second, yellowIsWildcard);
}

export function usefulFor(recipe: CraftingRecipe, entry: WorkshopComponentItem, yellowIsWildcard: boolean): boolean {
  return recipe.components.some((component) => canProvideComponent(entry.item, component, yellowIsWildcard));
}

export function hasCraftableRecipe(view: SanitizedGameState, yellowIsWildcard: boolean): boolean {
  return buildWorkshop(view, yellowIsWildcard).some((entry) => entry.available);
}
