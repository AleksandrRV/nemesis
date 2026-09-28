import { describe, expect, it } from 'vitest';
import { COORDINATE_CARDS, coursedDestination } from './coordinateCards.js';

import {
  CHARACTERS,
  ESCAPE_PODS_BY_PLAYER_COUNT,
  ESCAPE_POD_NUMBERS,
  MAX_PLAYER_COUNT,
  MIN_PLAYER_COUNT,
  WEAKNESS_SLOT_COUNT,
  WEAKNESS_SLOT_OBJECT_KINDS,
} from './setup.js';

describe('Подготовка к игре: Спасательные Капсулы', () => {
  it('задаёт число капсул для партии на 1–5 игроков (стр. 6, шаг 7)', () => {
    expect(ESCAPE_PODS_BY_PLAYER_COUNT).toEqual({ 1: 2, 2: 2, 3: 3, 4: 3, 5: 4 });
  });

  it('использует жетоны капсул с номерами 1..4', () => {
    expect(ESCAPE_POD_NUMBERS).toEqual([1, 2, 3, 4]);
  });

  it('никогда не выкладывает капсул больше, чем есть жетонов', () => {
    for (const count of Object.values(ESCAPE_PODS_BY_PLAYER_COUNT)) {
      expect(count).toBeLessThanOrEqual(ESCAPE_POD_NUMBERS.length);
      expect(count).toBeGreaterThan(0);
    }
  });
});

describe('Карты Координат (cards_additional.pdf, стр. 13, 15)', () => {
  it('8 карт, на каждой четыре разных пункта назначения — Земля, Марс, Венера, Глубокий космос', () => {
    expect(COORDINATE_CARDS).toHaveLength(8);
    expect(new Set(COORDINATE_CARDS.map((card) => card.id)).size).toBe(8);
    for (const card of COORDINATE_CARDS) {
      expect(Object.values(card.destinations).sort()).toEqual(['DEEP_SPACE', 'EARTH', 'MARS', 'VENUS']);
    }
  });

  it('пункт назначения определяется картой и положением маркера Курса: карта 5, Курс «B» — Земля', () => {
    expect(coursedDestination('COORDINATES_5', 'B')).toBe('EARTH');
    expect(coursedDestination('COORDINATES_5', 'A')).toBe('VENUS');
    expect(coursedDestination('COORDINATES_1', 'D')).toBe('EARTH');
  });

  it('у каждого пункта назначения на Курсе «B» есть хотя бы одна карта', () => {
    expect(new Set(COORDINATE_CARDS.map((card) => card.destinations.B)).size).toBe(4);
  });

  it('неизвестная карта — ошибка', () => {
    expect(() => coursedDestination('COORDINATES_9', 'A')).toThrow();
  });
});

describe('Подготовка к игре: персонажи', () => {
  it('описывает шесть персонажей базовой игры (GDD §2.2)', () => {
    expect(CHARACTERS).toHaveLength(6);

    const classes = CHARACTERS.map((character) => character.characterClass);

    expect(new Set(classes).size).toBe(6);
    expect(classes).toEqual(['CAPTAIN', 'PILOT', 'SCIENTIST', 'SCOUT', 'SOLDIER', 'MECHANIC']);
  });

  it('даёт каждому персонажу непустое имя', () => {
    for (const character of CHARACTERS) {
      expect(character.name.length).toBeGreaterThan(0);
    }
  });
});

describe('Подготовка к игре: границы партии', () => {
  it('собирается на 1–5 игроков', () => {
    expect(MIN_PLAYER_COUNT).toBe(1);
    expect(MAX_PLAYER_COUNT).toBe(5);
    expect(MAX_PLAYER_COUNT).toBeLessThanOrEqual(CHARACTERS.length);
  });

  it('не требует больше слотов Слабостей, чем их есть', () => {
    expect(WEAKNESS_SLOT_COUNT).toBe(3);
    expect(WEAKNESS_SLOT_OBJECT_KINDS).toHaveLength(WEAKNESS_SLOT_COUNT);
  });

  it('отводит каждому слоту Слабостей свой тип Объекта (стр. 21)', () => {
    expect(WEAKNESS_SLOT_OBJECT_KINDS).toEqual(['CORPSE', 'EGG', 'INTRUDER_REMAINS']);
  });
});
