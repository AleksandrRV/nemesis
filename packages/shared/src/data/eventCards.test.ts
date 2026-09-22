import { describe, expect, it } from 'vitest';

import { createInitialDecks } from './cardsSetup.js';
import { EVENT_CARDS, EVENT_CARDS_COUNT } from './eventCards.js';
import type { IntruderType } from '../types/entities.js';

const SEED = 'event-deck-step-1';
const KNOWN_INTRUDER_TYPES: readonly IntruderType[] = ['LARVA', 'CREEPER', 'ADULT', 'BREEDER', 'QUEEN'];

function eventIds(seed: string): string[] {
  return createInitialDecks(seed).events.drawPile.map((card) => card.id);
}

describe('Данные колоды Событий (стр. 3, 10)', () => {
  it('задаёт 20 различных экземпляров, даже если название и эффект совпадают', () => {
    expect(EVENT_CARDS).toHaveLength(EVENT_CARDS_COUNT);
    expect(new Set(EVENT_CARDS.map((card) => card.id)).size).toBe(EVENT_CARDS_COUNT);

    for (const card of EVENT_CARDS) {
      expect(card.id).toMatch(/^EVT_[A-Z0-9_]+$/);
      expect(card.name.length).toBeGreaterThan(0);
      expect(card.description.length).toBeGreaterThan(0);
    }
  });

  it('направление — номер Коридора 1–4 или любое: иных значений нет', () => {
    for (const card of EVENT_CARDS) {
      const valid = card.corridorNumber === 'ANY' || [1, 2, 3, 4].includes(card.corridorNumber);
      expect(valid, `${card.id}: направление ${String(card.corridorNumber)}`).toBe(true);
    }
  });

  it('символы Чужих верхнего блока непусты, уникальны и взяты из пяти типов', () => {
    for (const card of EVENT_CARDS) {
      expect(card.intruderTypes.length, card.id).toBeGreaterThan(0);
      expect(new Set(card.intruderTypes).size, card.id).toBe(card.intruderTypes.length);
      for (const type of card.intruderTypes) {
        expect(KNOWN_INTRUDER_TYPES, `${card.id}: неизвестный тип ${type}`).toContain(type);
      }
    }
  });

  it('флаги уничтожения и замешивания взаимоисключающи: 4 карты в коробку, 1 обратно в колоду', () => {
    const destroyed = EVENT_CARDS.filter((card) => card.isDestroyedOnResolve)
      .map((card) => card.id)
      .sort();
    const reshuffled = EVENT_CARDS.filter((card) => card.isReshuffledIntoDeck).map((card) => card.id);

    expect(destroyed).toEqual([
      'EVT_COOLANT_LEAK',
      'EVT_ESCAPE_POD_EJECTION',
      'EVT_LIFE_SUPPORT_MALFUNCTION',
      'EVT_SHORT_CIRCUIT',
    ]);
    expect(reshuffled).toEqual(['EVT_MALFUNCTION']);

    for (const card of EVENT_CARDS) {
      expect(card.isDestroyedOnResolve && card.isReshuffledIntoDeck, card.id).toBe(false);
    }
  });
});

describe('Подготовка колоды Событий (стр. 7, шаг 11)', () => {
  it('сохраняет полный состав без пропусков и дублей, начиная с пустого сброса', () => {
    const pile = createInitialDecks(SEED).events;
    const expectedIds = EVENT_CARDS.map((card) => card.id).sort();

    expect(pile.drawPile).toHaveLength(EVENT_CARDS_COUNT);
    expect(pile.discard).toEqual([]);
    expect(pile.drawPile.map((card) => card.id).sort()).toEqual(expectedIds);
    expect(pile.drawPile.map((card) => card.id)).not.toEqual(EVENT_CARDS.map((card) => card.id));
  });

  it('воспроизводит тасовку по сиду и меняет порядок при другом сиде', () => {
    expect(eventIds(SEED)).toEqual(eventIds(SEED));
    expect(eventIds(SEED)).not.toEqual(eventIds(`${SEED}-other`));
  });

  it('не разделяет карточные объекты и вложенные символы с шаблонами или другой партией', () => {
    const first = createInitialDecks(SEED).events;
    const second = createInitialDecks(SEED).events;
    const secondBefore = structuredClone(second);
    const templatesBefore = structuredClone(EVENT_CARDS);

    expect(first.drawPile).not.toBe(second.drawPile);
    expect(first.discard).not.toBe(second.discard);

    for (const card of first.drawPile) {
      const template = EVENT_CARDS.find((candidate) => candidate.id === card.id)!;
      const other = second.drawPile.find((candidate) => candidate.id === card.id)!;
      expect(card).not.toBe(template);
      expect(card).not.toBe(other);
      expect(card.intruderTypes).not.toBe(template.intruderTypes);
      expect(card.intruderTypes).not.toBe(other.intruderTypes);
    }

    first.drawPile[0]!.description = 'Изменение только первой партии';
    first.drawPile[0]!.intruderTypes = ['QUEEN'];
    first.discard.push(first.drawPile.shift()!);

    expect(second).toEqual(secondBefore);
    expect(EVENT_CARDS).toEqual(templatesBefore);
    expect(createInitialDecks(SEED).events).toEqual(secondBefore);
  });
});
