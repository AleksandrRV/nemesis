import { describe, expect, it } from 'vitest';

import { WEAKNESS_CARDS } from './weaknessCards.js';

describe('WEAKNESS_CARDS: транскрипт doc/data/INTRUDERS.md §6', () => {
  it('содержит 7 карт с уникальными id и названиями', () => {
    expect(WEAKNESS_CARDS).toHaveLength(7);
    expect(new Set(WEAKNESS_CARDS.map((card) => card.id)).size).toBe(7);
    expect(new Set(WEAKNESS_CARDS.map((card) => card.name)).size).toBe(7);
  });

  it('у каждой карты непустое описание и рубашка вверх', () => {
    for (const card of WEAKNESS_CARDS) {
      expect(card.description.length).toBeGreaterThan(0);
      expect(card.isRevealed).toBe(false);
    }
  });
});
