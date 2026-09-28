import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  GREEN_ITEM_CARDS,
  RED_ITEM_CARDS,
  YELLOW_ITEM_CARDS,
  createInitialGameState,
  filterStateForPlayer,
  type ActionCard,
  type CraftComponent,
  type ItemCard,
  type SanitizedGameState,
} from '@nemesis/shared';
import { buildWorkshop, componentItems, hasCraftableRecipe, selectionMatches } from './workshopModel';
import { WorkshopModal } from './WorkshopModal';
import { formatCraftLogEvent } from '../log/craftLogFormat';
import { getActionCardUsage } from '../hand/actionCardUsage';

const ROOM_ITEMS: readonly ItemCard[] = [...RED_ITEM_CARDS, ...YELLOW_ITEM_CARDS, ...GREEN_ITEM_CARDS];

function withSymbol(symbol: CraftComponent): ItemCard {
  return structuredClone(ROOM_ITEMS.find((item) => item.componentSymbols.includes(symbol))!);
}

function makeView(items: ItemCard[] = []): SanitizedGameState {
  const view = filterStateForPlayer(createInitialGameState('workshop-ui'), 'player-1');
  view.players['player-1']!.inventory = items;
  return view;
}

const INGENUITY: ActionCard = {
  id: 'TEST_INGENUITY',
  characterClass: 'MECHANIC',
  name: 'Смекалка',
  playCost: 0,
  description: '',
  effect: { kind: 'INGENUITY' },
};

describe('Модель мастерской', () => {
  it('в начале партии в синей колоде по 3 карты каждого рецепта, собрать нечего', () => {
    const workshop = buildWorkshop(makeView(), false);
    expect(workshop.map((entry) => entry.remaining)).toEqual([3, 3, 3, 3]);
    expect(workshop.every((entry) => !entry.available)).toBe(true);
    expect(workshop[1]!.missing).toEqual(['BATTERY', 'TOOLS']);
  });

  it('с Энергозарядом и Инструментами доступен Тазер и предложена пара', () => {
    const battery = withSymbol('BATTERY');
    const tools = withSymbol('TOOLS');
    const view = makeView([battery, tools]);
    const taser = buildWorkshop(view, false).find((entry) => entry.recipe.itemId === 'TASER')!;
    expect(taser.available).toBe(true);
    expect(taser.pairs).toEqual([[battery.id, tools.id]]);
    expect(selectionMatches(taser.recipe, componentItems(view, false), [tools.id, battery.id], false)).toBe(true);
    expect(hasCraftableRecipe(view, false)).toBe(true);
  });

  it('нет карт рецепта — рецепт недоступен с объяснением', () => {
    const view = makeView([withSymbol('BATTERY'), withSymbol('TOOLS')]);
    view.decks.craftedItems.remainingByRecipe.TASER = 0;
    const taser = buildWorkshop(view, false).find((entry) => entry.recipe.itemId === 'TASER')!;
    expect(taser.available).toBe(false);
    expect(taser.reason).toContain('не осталось');
  });

  it('«Смекалка»: жёлтый Предмет — любой компонент, вариант открывает мастерскую', () => {
    const yellow = { ...structuredClone(YELLOW_ITEM_CARDS[0]!), componentSymbols: [] };
    const view = makeView([yellow, withSymbol('FLAME')]);
    expect(componentItems(view, true).find((entry) => entry.item.id === yellow.id)?.provides).toBe('ANY');
    const craft = getActionCardUsage(INGENUITY, view).variants.find((variant) => variant.id === 'CRAFT')!;
    expect(craft).toMatchObject({ available: true, opensWorkshop: true });
  });
});

describe('Окно мастерской и журнал', () => {
  it('диалог с чертежами, компонентами рецептов и остатком карт', () => {
    const html = renderToStaticMarkup(
      <WorkshopModal
        view={makeView()}
        mode={{ kind: 'BASIC' }}
        preferredPaymentIds={[]}
        onConfirm={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('СОЗДАНИЕ ПРЕДМЕТА');
    expect(html).toContain('Базовое Действие · цена 1');
    for (const name of [
      'Антидот',
      'Тазер',
      'Огнемет',
      'Коктейль Молотова',
      'Пламя',
      'Крест',
      'Батарея',
      'Ключ',
      'Ткань',
    ])
      expect(html).toContain(name);
    expect(html).toContain('×3');
    expect(html).toContain('Не хватает Предметов с нужными синими символами');
  });

  it('запись журнала называет Предмет, компоненты и карту', () => {
    const view = makeView();
    const text = formatCraftLogEvent(
      {
        type: 'ITEM_CRAFTED',
        playerId: 'player-1',
        recipeId: 'TASER',
        itemName: 'Тазер',
        componentNames: ['Кабели', 'Батарея'],
        viaCardName: 'Смекалка',
      },
      view,
    )
      .map((segment) => segment.text)
      .join('');
    expect(text).toContain('«Тазер»');
    expect(text).toContain('«Кабели» и «Батарея»');
    expect(text).toContain('картой «Смекалка»');
  });
});

describe('Покрытие слотов рецепта', () => {
  it('одни Химикаты закрывают только слот пламени Антидота', () => {
    const antidote = buildWorkshop(makeView([withSymbol('FLAME')]), false).find(
      (entry) => entry.recipe.itemId === 'ANTIDOTE',
    )!;
    expect(antidote.covered).toEqual([true, false]);
    expect(antidote.missing).toEqual(['MEDKIT']);
  });
});
