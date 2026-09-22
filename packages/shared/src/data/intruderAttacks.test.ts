import { describe, expect, it } from 'vitest';

import { CONTAMINATION_CARDS } from './contaminationCards.js';
import { createInitialDecks } from './cardsSetup.js';
import { EVENT_CARDS } from './eventCards.js';
import { INTRUDER_ATTACK_CARDS } from './intruderAttacks.js';
import { GREEN_ITEM_CARDS, RED_ITEM_CARDS, YELLOW_ITEM_CARDS } from './itemCards.js';
import { SERIOUS_WOUND_CARDS } from './seriousWounds.js';
import { createRng, shuffle } from '../utils/rng.js';

const SEED = 'intruder-attack-deck-step-1';

function attackIds(seed: string): string[] {
  return createInitialDecks(seed).intruderAttacks.drawPile.map((card) => card.id);
}

describe('Данные Атак Чужих (стр. 3, 20)', () => {
  it('задаёт 20 различных экземпляров, даже если название и эффект совпадают', () => {
    expect(INTRUDER_ATTACK_CARDS).toHaveLength(20);
    expect(new Set(INTRUDER_ATTACK_CARDS.map((card) => card.id)).size).toBe(20);

    for (const card of INTRUDER_ATTACK_CARDS) {
      expect(card.id).toMatch(/^IAT_[A-Z_]+(?:_\d+)?$/);
      expect(card.name.length).toBeGreaterThan(0);
      expect(card.description.length).toBeGreaterThan(0);
      expect(Number.isInteger(card.toughness)).toBe(true);
      expect(card.toughness).toBeGreaterThan(0);
      expect(card.attackerTypes.length).toBeGreaterThan(0);
      expect(new Set(card.attackerTypes).size).toBe(card.attackerTypes.length);
    }
  });

  it('не включает Личинку: она атакует без карты (стр. 20)', () => {
    for (const card of INTRUDER_ATTACK_CARDS) {
      expect(card.attackerTypes, card.id).not.toContain('LARVA');
      expect(card.attackerTypes, card.id).not.toContain('BLANK');
    }
  });
});

describe('Подготовка колоды Атак Чужих (стр. 7, шаг 11)', () => {
  it('сохраняет полный состав без пропусков и дублей, начиная с пустого сброса', () => {
    const pile = createInitialDecks(SEED).intruderAttacks;
    const expectedIds = INTRUDER_ATTACK_CARDS.map((card) => card.id).sort();

    expect(pile.drawPile).toHaveLength(20);
    expect(pile.discard).toEqual([]);
    expect(pile.drawPile.map((card) => card.id).sort()).toEqual(expectedIds);
    expect(pile.drawPile.map((card) => card.id)).not.toEqual(INTRUDER_ATTACK_CARDS.map((card) => card.id));
  });

  it('воспроизводит тасовку по сиду и меняет порядок при другом сиде', () => {
    expect(attackIds(SEED)).toEqual(attackIds(SEED));
    expect(attackIds(SEED)).not.toEqual(attackIds(`${SEED}-other`));
  });

  it('продолжает поток cards после прежних колод, не меняя их порядок и не используя combat', () => {
    const decks = createInitialDecks(SEED);
    const rng = createRng(SEED, 'cards');

    expect(decks.items.RED.drawPile).toEqual(shuffle(rng, RED_ITEM_CARDS));
    expect(decks.items.YELLOW.drawPile).toEqual(shuffle(rng, YELLOW_ITEM_CARDS));
    expect(decks.items.GREEN.drawPile).toEqual(shuffle(rng, GREEN_ITEM_CARDS));
    expect(decks.contamination.drawPile).toEqual(shuffle(rng, CONTAMINATION_CARDS));
    expect(decks.seriousWounds.drawPile).toEqual(shuffle(rng, SERIOUS_WOUND_CARDS));
    expect(decks.events.drawPile).toEqual(shuffle(rng, EVENT_CARDS));
    expect(decks.intruderAttacks.drawPile).toEqual(shuffle(rng, INTRUDER_ATTACK_CARDS));
  });

  it('не разделяет карточные объекты и вложенные символы с шаблонами или другой партией', () => {
    const first = createInitialDecks(SEED).intruderAttacks;
    const second = createInitialDecks(SEED).intruderAttacks;
    const secondBefore = structuredClone(second);
    const templatesBefore = structuredClone(INTRUDER_ATTACK_CARDS);

    expect(first.drawPile).not.toBe(second.drawPile);
    expect(first.discard).not.toBe(second.discard);

    for (const card of first.drawPile) {
      const template = INTRUDER_ATTACK_CARDS.find((candidate) => candidate.id === card.id)!;
      const other = second.drawPile.find((candidate) => candidate.id === card.id)!;
      expect(card).not.toBe(template);
      expect(card).not.toBe(other);
      expect(card.attackerTypes).not.toBe(template.attackerTypes);
      expect(card.attackerTypes).not.toBe(other.attackerTypes);
    }

    first.drawPile[0]!.description = 'Изменение только первой партии';
    first.drawPile[0]!.attackerTypes = ['QUEEN'];
    first.discard.push(first.drawPile.shift()!);

    expect(second).toEqual(secondBefore);
    expect(INTRUDER_ATTACK_CARDS).toEqual(templatesBefore);
    expect(createInitialDecks(SEED).intruderAttacks).toEqual(secondBefore);
  });
});
