import { describe, expect, it } from 'vitest';

import { ACTION_CARDS_BY_CHARACTER } from './actionCards.js';
import { CONTAMINATION_CARDS } from './contaminationCards.js';
import { CRAFTED_ITEM_CARDS } from './crafting.js';
import { GREEN_ITEM_CARDS, RED_ITEM_CARDS, YELLOW_ITEM_CARDS } from './itemCards.js';
import { SERIOUS_WOUND_CARDS } from './seriousWounds.js';
import { STARTING_WEAPONS } from './startingItems.js';
import { createActionDeckForCharacter, createInitialDecks } from './cardsSetup.js';
import type { CharacterClass } from '../types/entities.js';

describe('Колоды карт Действий (Action Cards)', () => {
  const characters: CharacterClass[] = ['CAPTAIN', 'PILOT', 'MECHANIC', 'SOLDIER', 'SCOUT', 'SCIENTIST'];

  it('содержит ровно 10 карт для каждого из 6 персонажей', () => {
    for (const character of characters) {
      const deck = ACTION_CARDS_BY_CHARACTER[character];
      expect(deck).toBeDefined();
      expect(deck).toHaveLength(10);
      expect(deck.every((c) => c.characterClass === character)).toBe(true);
      expect(deck.every((c) => c.name.length > 0)).toBe(true);
      expect(deck.every((c) => c.description.length > 0)).toBe(true);
      expect(deck.every((c) => c.playCost >= 0)).toBe(true);
    }
  });

  it('детерминированно тасует личную колоду персонажа через поток cards', () => {
    const deck1 = createActionDeckForCharacter('CAPTAIN', 'seed-123', 0);
    const deck2 = createActionDeckForCharacter('CAPTAIN', 'seed-123', 0);
    const deckDifferentSeed = createActionDeckForCharacter('CAPTAIN', 'seed-456', 0);

    expect(deck1.map((c) => c.id)).toEqual(deck2.map((c) => c.id));
    expect(deck1.map((c) => c.id)).not.toEqual(deckDifferentSeed.map((c) => c.id));
  });
});

describe('Колоды Предметов (Item Cards)', () => {
  it('Красная колода содержит ровно 30 карт', () => {
    expect(RED_ITEM_CARDS).toHaveLength(30);
    expect(RED_ITEM_CARDS.every((c) => c.color === 'RED')).toBe(true);
  });

  it('Жёлтая колода содержит ровно 30 карт', () => {
    expect(YELLOW_ITEM_CARDS).toHaveLength(30);
    expect(YELLOW_ITEM_CARDS.every((c) => c.color === 'YELLOW')).toBe(true);
  });

  it('Зелёная колода содержит ровно 30 карт', () => {
    expect(GREEN_ITEM_CARDS).toHaveLength(30);
    expect(GREEN_ITEM_CARDS.every((c) => c.color === 'GREEN')).toBe(true);
  });

  it('Синяя колода Создаваемых предметов содержит ровно 12 карт (по 3 на рецепт)', () => {
    expect(CRAFTED_ITEM_CARDS).toHaveLength(12);
    expect(CRAFTED_ITEM_CARDS.every((c) => c.color === 'BLUE')).toBe(true);
    expect(CRAFTED_ITEM_CARDS.every((c) => c.origin === 'CRAFTED')).toBe(true);
  });
});

describe('Стартовые предметы (Starting Weapons)', () => {
  const characters: CharacterClass[] = ['CAPTAIN', 'PILOT', 'MECHANIC', 'SOLDIER', 'SCOUT', 'SCIENTIST'];

  it('каждый персонаж имеет стартовое оружие в слоте руки', () => {
    for (const character of characters) {
      const weapon = STARTING_WEAPONS[character];
      expect(weapon).toBeDefined();
      expect(weapon.isHeavy).toBe(true);
      expect(weapon.isWeapon).toBe(true);
      expect(weapon.ammo).toBeGreaterThan(0);
      expect(weapon.maxAmmo).toBe(weapon.ammo);
    }
  });

  it('различает энергооружие (Скаут) и классическое оружие (остальные)', () => {
    expect(STARTING_WEAPONS.SCOUT.isEnergyWeapon).toBe(true);
    expect(STARTING_WEAPONS.CAPTAIN.isEnergyWeapon).toBe(false);
    expect(STARTING_WEAPONS.PILOT.isEnergyWeapon).toBe(false);
    expect(STARTING_WEAPONS.MECHANIC.isEnergyWeapon).toBe(false);
    expect(STARTING_WEAPONS.SOLDIER.isEnergyWeapon).toBe(false);
    expect(STARTING_WEAPONS.SCIENTIST.isEnergyWeapon).toBe(false);
  });
});

describe('Колода Заражения и Тяжёлых Травм', () => {
  it('колода Заражения содержит 27 карт, из которых 7 с Инфекцией', () => {
    expect(CONTAMINATION_CARDS).toHaveLength(27);
    const infected = CONTAMINATION_CARDS.filter((c) => c.isInfected);
    expect(infected).toHaveLength(7);
  });

  it('колода Тяжёлых Травм содержит 16 карт (по 4 каждого типа)', () => {
    expect(SERIOUS_WOUND_CARDS).toHaveLength(16);
    expect(SERIOUS_WOUND_CARDS.every((w) => !w.isTreated)).toBe(true);
  });
});

describe('Инициализация колод партии (createInitialDecks)', () => {
  it('создаёт корректно наполненные и перетасованные колоды', () => {
    const decks = createInitialDecks('seed-test');
    expect(decks.items.RED.drawPile).toHaveLength(30);
    expect(decks.items.YELLOW.drawPile).toHaveLength(30);
    expect(decks.items.GREEN.drawPile).toHaveLength(30);
    expect(decks.craftedItems.drawPile).toHaveLength(12);
    expect(decks.contamination.drawPile).toHaveLength(27);
    expect(decks.seriousWounds.drawPile).toHaveLength(16);
    expect(decks.events.drawPile).toHaveLength(20);
    expect(decks.events.discard).toEqual([]);
  });
});
