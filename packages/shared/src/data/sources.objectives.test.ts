import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { CORPORATE_OBJECTIVE_CARDS, PERSONAL_OBJECTIVE_CARDS, SOLO_COOP_OBJECTIVE_CARDS } from './objectiveCards.js';

interface ObjectiveTable {
  status: string;
  facts: { source: string; page?: string }[];
  expectation: { cards: Record<string, unknown> };
}

const dataSources = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../../../doc/sources/data-sources.json', import.meta.url)), 'utf8'),
) as { tables: Record<string, ObjectiveTable> };

const table = dataSources.tables['objective-cards']!;
const allObjectives = [...PERSONAL_OBJECTIVE_CARDS, ...CORPORATE_OBJECTIVE_CARDS, ...SOLO_COOP_OBJECTIVE_CARDS];

describe('Golden: карты Целей (cards_base.pdf, стр. 15, 17, 33, 35, 37)', () => {
  it('сверены со сканом', () => {
    expect(table.status).toBe('SCAN_VERIFIED');
    expect(table.facts.some((fact) => fact.source === 'pnp-scans' && fact.page)).toBe(true);
  });

  it('9 Личных, 9 Корпоративных и 7 Соло/Кооп Целей — как в составе игры (стр. 3)', () => {
    expect(PERSONAL_OBJECTIVE_CARDS).toHaveLength(9);
    expect(CORPORATE_OBJECTIVE_CARDS).toHaveLength(9);
    expect(SOLO_COOP_OBJECTIVE_CARDS).toHaveLength(7);
    expect(new Set(allObjectives.map((card) => card.id)).size).toBe(allObjectives.length);
  });

  it('название, вид, значок «N+» и условия каждой карты совпадают с пакетом источника', () => {
    expect(
      Object.fromEntries(
        allObjectives.map((card) => [
          card.id,
          { kind: card.kind, name: card.name, minPlayers: card.minPlayers, conditions: card.conditions },
        ]),
      ),
    ).toEqual(table.expectation.cards);
  });

  it('значок числа игроков есть только у Личных и Корпоративных Целей, у каждой карты есть цитата', () => {
    for (const card of allObjectives) {
      expect(card.minPlayers === null, card.name).toBe(card.kind === 'SOLO_COOP');
      expect(card.flavorText.length, card.name).toBeGreaterThan(0);
      expect(card.description, card.name).toBe(card.conditions.join(' ИЛИ '));
    }
  });
});
