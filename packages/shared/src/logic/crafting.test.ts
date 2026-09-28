import { describe, expect, it } from 'vitest';
import { contactState, existingIntruder, expectEngineError } from '../testing/contactFixtures.js';
import type { ActionCard, CraftComponent, ItemCard } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import { CRAFTING_RECIPES, craftablePairs, matchesRecipe } from '../data/crafting.js';
import { GREEN_ITEM_CARDS, RED_ITEM_CARDS, YELLOW_ITEM_CARDS } from '../data/itemCards.js';
import { GameEngine } from './fsm.js';
import { igniteFromWeapon, weaponFaceInjuries } from './shoot.js';
import { filterStateForPlayer } from './sanitizer.js';

const ROOM_ITEMS: readonly ItemCard[] = [...RED_ITEM_CARDS, ...YELLOW_ITEM_CARDS, ...GREEN_ITEM_CARDS];

function withSymbol(symbol: CraftComponent, skip: readonly string[] = []): ItemCard {
  const found = ROOM_ITEMS.find((item) => item.componentSymbols.includes(symbol) && !skip.includes(item.id));
  if (!found) throw new Error(`Нет предмета с символом ${symbol}`);
  return structuredClone(found);
}

function give(state: GameState, ...items: ItemCard[]): void {
  state.players['player-1']!.inventory.push(...items);
}

function payment(state: GameState): string[] {
  return [state.players['player-1']!.actionDeck.hand.find((card) => 'characterClass' in card)!.id];
}

function craft(state: GameState, recipeId: string, componentItemIds: string[]): GameState {
  return new GameEngine().processAction(state, {
    type: 'ACTION_CRAFT_ITEM',
    payload: { recipeId: recipeId as never, componentItemIds, discardCardIds: payment(state) },
  });
}

describe('Рецепты Создания (стр. 23)', () => {
  it('четыре рецепта из двух компонентов; порядок Предметов не важен', () => {
    expect(CRAFTING_RECIPES.map((recipe) => recipe.itemId)).toEqual([
      'ANTIDOTE',
      'TASER',
      'FLAMETHROWER',
      'MOLOTOV_COCKTAIL',
    ]);
    const taser = CRAFTING_RECIPES[1]!;
    const electronics = withSymbol('ELECTRONICS');
    const power = withSymbol('POWER_CELL');
    expect(matchesRecipe(taser, electronics, power)).toBe(true);
    expect(matchesRecipe(taser, power, electronics)).toBe(true);
    expect(matchesRecipe(taser, electronics, electronics)).toBe(false);
  });

  it('«Смекалка»: любой жёлтый Предмет подходит как компонент', () => {
    const antidote = CRAFTING_RECIPES[0]!;
    const yellow = { ...structuredClone(YELLOW_ITEM_CARDS[0]!), componentSymbols: [] };
    const chemicals = withSymbol('CHEMICALS');
    expect(matchesRecipe(antidote, yellow, chemicals)).toBe(false);
    expect(matchesRecipe(antidote, yellow, chemicals, true)).toBe(true);
    expect(craftablePairs(antidote, [yellow, chemicals], true)).toEqual([[yellow.id, chemicals.id]]);
  });
});

describe('Базовое Действие «Создание Предмета» [1]', () => {
  it('сбрасывает 2 Предмета-Компонента в их колоды и кладёт Создаваемый Предмет в инвентарь', () => {
    const state = contactState(2, 'craft-taser');
    const electronics = withSymbol('ELECTRONICS');
    const power = withSymbol('POWER_CELL');
    give(state, electronics, power);
    const before = state.decks.craftedItems.drawPile.length;

    const next = craft(state, 'TASER', [electronics.id, power.id]);
    const player = next.players['player-1']!;
    expect(player.inventory.map((item) => item.name)).toEqual(['Тазер']);
    expect(next.decks.craftedItems.drawPile).toHaveLength(before - 1);
    const discards = [
      ...next.decks.items.RED.discard,
      ...next.decks.items.YELLOW.discard,
      ...next.decks.items.GREEN.discard,
    ];
    expect(discards.map((item) => item.id).sort()).toEqual([electronics.id, power.id].sort());
    expect(player.actionsPerformedThisRound).toBe(1);
    expect(next.gameLog.at(-1)?.event).toMatchObject({ type: 'ITEM_CRAFTED', recipeId: 'TASER', itemName: 'Тазер' });
  });

  it('Тяжёлый Огнемёт сразу занимает свободную руку', () => {
    const state = contactState(2, 'craft-flamer');
    state.players['player-1']!.handSlots = [];
    const tools = withSymbol('TOOLS');
    const chemicals = withSymbol('CHEMICALS');
    give(state, tools, chemicals);
    const next = craft(state, 'FLAMETHROWER', [tools.id, chemicals.id]);
    const slot = next.players['player-1']!.handSlots[0];
    expect(slot?.source === 'ITEM' && slot.card.name).toBe('Огнемёт');
  });

  it('отказы: не те символы, один Предмет дважды, карт рецепта не осталось', () => {
    const state = contactState(2, 'craft-reject');
    const tools = withSymbol('TOOLS');
    const chemicals = withSymbol('CHEMICALS');
    give(state, tools, chemicals);
    expectEngineError(
      () => craft(structuredClone(state), 'TASER', [tools.id, chemicals.id]),
      'INVALID_DECISION_OPTION',
    );
    expectEngineError(
      () => craft(structuredClone(state), 'FLAMETHROWER', [tools.id, tools.id]),
      'INVALID_DECISION_OPTION',
    );
    const empty = structuredClone(state);
    empty.decks.craftedItems.drawPile = empty.decks.craftedItems.drawPile.filter(
      (card) => card.recipeId !== 'FLAMETHROWER',
    );
    expectEngineError(() => craft(empty, 'FLAMETHROWER', [tools.id, chemicals.id]), 'CARD_SUPPLY_EXHAUSTED');
  });

  it('карта из сброса Создаваемых тоже доступна (стр. 23)', () => {
    const state = contactState(2, 'craft-discard');
    const pile = state.decks.craftedItems;
    const molotovs = pile.drawPile.filter((card) => card.recipeId === 'MOLOTOV_COCKTAIL');
    pile.drawPile = pile.drawPile.filter((card) => card.recipeId !== 'MOLOTOV_COCKTAIL');
    pile.discard.push(molotovs[0]!);
    const alcohol = withSymbol('ALCOHOL');
    const fabric = withSymbol('FABRIC');
    give(state, alcohol, fabric);
    const next = craft(state, 'MOLOTOV_COCKTAIL', [alcohol.id, fabric.id]);
    expect(next.decks.craftedItems.discard).toHaveLength(0);
    expect(next.players['player-1']!.inventory.some((item) => item.name === 'Коктейль Молотова')).toBe(true);
  });

  it('«Смекалка» Механика создаёт Предмет, используя жёлтый Предмет как любой компонент', () => {
    const state = contactState(2, 'craft-ingenuity');
    const yellow = {
      ...structuredClone(YELLOW_ITEM_CARDS.find((item) => item.componentSymbols.length === 0) ?? YELLOW_ITEM_CARDS[0]!),
      componentSymbols: [],
    };
    const chemicals = withSymbol('CHEMICALS');
    give(state, yellow, chemicals);
    const ingenuity: ActionCard = {
      id: 'TEST_INGENUITY',
      characterClass: 'MECHANIC',
      name: 'Смекалка',
      playCost: 0,
      description: '',
      effect: { kind: 'INGENUITY' },
    };
    state.players['player-1']!.actionDeck.hand.push(ingenuity);
    const next = new GameEngine().processAction(state, {
      type: 'ACTION_PLAY_CARD',
      payload: {
        cardId: ingenuity.id,
        option: 'CRAFT',
        craftRecipeId: 'ANTIDOTE',
        componentItemIds: [yellow.id, chemicals.id],
      },
    });
    expect(next.players['player-1']!.inventory.some((item) => item.name === 'Антидот')).toBe(true);
    expect(next.gameLog.map((entry) => entry.event).find((event) => event.type === 'ITEM_CRAFTED')).toMatchObject({
      viaCardName: 'Смекалка',
    });
  });
});

describe('Огнемёт в Стрельбе', () => {
  it('всегда наносит минимум 1 Рану, кроме Промаха', () => {
    expect(weaponFaceInjuries('TAIL', 'ADULT', 'Огнемёт')).toBe(1);
    expect(weaponFaceInjuries('MISS', 'LARVA', 'Огнемёт')).toBe(0);
    expect(weaponFaceInjuries('TAIL', 'ADULT', 'Револьвер')).toBe(0);
  });

  it('грань «2 Раны» поджигает отсек Стрелка', () => {
    const state = contactState(2, 'flamer-fire');
    const roomId = state.players['player-1']!.roomId;
    existingIntruder(state, 'ADULT', roomId);
    expect(igniteFromWeapon(state, 'Огнемёт', 'ONE_WOUND', roomId)).toBe(false);
    expect(igniteFromWeapon(state, 'Огнемёт', 'TWO_WOUNDS', roomId)).toBe(true);
    expect(state.ship.rooms[roomId]!.hasFire).toBe(true);
    expect(igniteFromWeapon(state, 'Огнемёт', 'TWO_WOUNDS', roomId)).toBe(false);
  });
});

describe('Синяя колода в срезе игрока', () => {
  it('остаток по каждому рецепту публичен (колоду можно смотреть в любой момент, стр. 23)', () => {
    const state = contactState(2, 'crafted-public');
    const tools = withSymbol('TOOLS');
    const chemicals = withSymbol('CHEMICALS');
    give(state, tools, chemicals);
    const next = craft(state, 'FLAMETHROWER', [tools.id, chemicals.id]);
    expect(filterStateForPlayer(next, 'player-2').decks.craftedItems.remainingByRecipe).toEqual({
      ANTIDOTE: 3,
      TASER: 3,
      FLAMETHROWER: 2,
      MOLOTOV_COCKTAIL: 3,
    });
  });
});
