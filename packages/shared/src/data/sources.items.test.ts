import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { ItemCard } from '../types/cards.js';
import { CRAFTED_ITEM_CARDS, CRAFTING_RECIPES } from './crafting.js';
import { GREEN_ITEM_CARDS, RED_ITEM_CARDS, YELLOW_ITEM_CARDS } from './itemCards.js';
import { weaponModifiers } from './weaponModifiers.js';

interface ItemTable {
  status: string;
  facts: { source: string; page?: string }[];
  expectation: Record<string, unknown>;
  scanDiscrepancies?: unknown[];
}

const dataSources = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../../../doc/sources/data-sources.json', import.meta.url)), 'utf8'),
) as { tables: Record<string, ItemTable> };

function table(id: string): ItemTable {
  const entry = dataSources.tables[id];
  if (!entry) throw new Error(`В пакете источника нет таблицы ${id}`);
  return entry;
}

function groupedByName(cards: readonly ItemCard[]) {
  const groups: Record<string, unknown>[] = [];
  for (const card of cards) {
    const existing = groups.find((group) => group.name === card.name);
    if (existing) {
      existing.count = (existing.count as number) + 1;
      continue;
    }
    groups.push({
      name: card.name,
      count: 1,
      componentSymbols: [...card.componentSymbols],
      isHeavy: card.isHeavy,
      isSingleUse: card.isSingleUse,
      isWeapon: card.isWeapon,
      isEnergyWeapon: card.isEnergyWeapon ?? false,
      ammo: card.ammo,
      actionCost: card.actionCost,
      description: card.description,
    });
  }
  return groups;
}

function countsByName(cards: readonly ItemCard[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const card of cards) counts[card.name] = (counts[card.name] ?? 0) + 1;
  return counts;
}

describe('Golden: колоды Предметов (cards_additional.pdf, стр. 1–13)', () => {
  it('сверяет каждую карту трех колод и синей колоды с пакетом источника', () => {
    const expectation = table('item-cards').expectation as {
      decks: Record<string, unknown[]>;
      crafted: unknown[];
    };

    expect(groupedByName(RED_ITEM_CARDS)).toEqual(expectation.decks.RED);
    expect(groupedByName(YELLOW_ITEM_CARDS)).toEqual(expectation.decks.YELLOW);
    expect(groupedByName(GREEN_ITEM_CARDS)).toEqual(expectation.decks.GREEN);
    expect(groupedByName(CRAFTED_ITEM_CARDS)).toEqual(expectation.crafted);
  });

  it('составы по 30 карт совпадают со сканом (scan-transcript §5)', () => {
    expect(countsByName(YELLOW_ITEM_CARDS)).toEqual({
      Изолента: 4,
      Инструменты: 6,
      Огнетушитель: 4,
      Химикаты: 7,
      Одежда: 3,
      Энергозаряд: 3,
      'Планы технических коридоров': 1,
      Скафандр: 1,
      'Планы «Немезиды»': 1,
    });
    expect(countsByName(GREEN_ITEM_CARDS)).toEqual({
      Бинты: 7,
      Аптечка: 7,
      'Синтетическая еда': 5,
      'Инъекция адреналина': 3,
      Алкоголь: 3,
      Одежда: 3,
      'Военные препараты': 2,
    });
    expect(countsByName(RED_ITEM_CARDS)).toEqual({
      Энергозаряд: 11,
      Граната: 4,
      'Дымовая граната': 3,
      'Дрон-разведчик': 3,
      Приманка: 2,
      'Увеличенный магазин': 1,
      'Прототип: винтовка': 1,
      'Прототип: дробовик': 1,
      'Прототип: пистолет': 1,
      'Ключ связи': 1,
      'Ключ эвакуации': 1,
      'Ключ самоуничтожения': 1,
    });
  });

  it('символ компонента есть только у Химикатов, Алкоголя, Одежды, Бинтов, Аптечки, Инструментов и Энергозаряда', () => {
    const symbolByName = Object.fromEntries(
      [...RED_ITEM_CARDS, ...YELLOW_ITEM_CARDS, ...GREEN_ITEM_CARDS]
        .filter((card) => card.componentSymbols.length > 0)
        .map((card) => [card.name, card.componentSymbols]),
    );

    expect(symbolByName).toEqual({
      Химикаты: ['FLAME'],
      Алкоголь: ['FLAME'],
      Одежда: ['FABRIC'],
      Бинты: ['FABRIC'],
      Аптечка: ['MEDKIT'],
      Инструменты: ['TOOLS'],
      Энергозаряд: ['BATTERY'],
    });
  });

  it('модификаторы оружия совпадают с пакетом источника', () => {
    const expectation = table('item-cards').expectation as { weaponModifiers: Record<string, unknown> };
    const weapons = [...RED_ITEM_CARDS, ...CRAFTED_ITEM_CARDS].filter((card) => card.isWeapon);

    expect(Object.fromEntries(weapons.map((card) => [card.name, weaponModifiers(card.id)]))).toEqual(
      expectation.weaponModifiers,
    );
  });

  it('рецепты совпадают с серыми символами синих карт', () => {
    const expectation = table('crafting-recipes').expectation as { recipes: Record<string, string[]> };

    expect(Object.fromEntries(CRAFTING_RECIPES.map((recipe) => [recipe.itemId, recipe.components]))).toEqual(
      expectation.recipes,
    );
  });

  it('таблицы Предметов и рецептов сверены со сканом и не расходятся с ним', () => {
    for (const id of ['item-cards', 'crafting-recipes']) {
      const entry = table(id);
      expect(entry.status, id).toBe('SCAN_VERIFIED');
      expect(entry.scanDiscrepancies ?? [], id).toEqual([]);
      expect(
        entry.facts.some((fact) => fact.source === 'pnp-scans' && fact.page),
        id,
      ).toBe(true);
    }
  });
});
