import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { COMBAT_DIE_FACES } from './combatDie.js';
import { INTRUDER_ATTACK_CARDS, hasRetreatArrow } from './intruderAttacks.js';
import { WEAKNESS_CARDS } from './weaknesses.js';

interface CombatTable {
  status: string;
  facts: { source: string; lines?: string; page?: string }[];
  expectation: Record<string, unknown>;
  scanDiscrepancies?: unknown[];
}

const dataSources = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../../../doc/sources/data-sources.json', import.meta.url)), 'utf8'),
) as { tables: Record<string, CombatTable> };

function table(id: string): CombatTable {
  const entry = dataSources.tables[id];
  if (!entry) throw new Error(`В пакете источника нет таблицы ${id}`);
  return entry;
}

describe('Golden: кубик Боя (dices.pdf; стр. 18–19)', () => {
  it('сверяет все шесть граней: один Промах и две грани Крипера', () => {
    const expectation = table('combat-die').expectation;

    expect(expectation.faceCount).toBe(6);
    expect(COMBAT_DIE_FACES).toEqual(expectation.faces);
    expect(COMBAT_DIE_FACES.filter((face) => face === 'MISS')).toHaveLength(1);
    expect(COMBAT_DIE_FACES.filter((face) => face === 'TAIL')).toHaveLength(2);
  });
});

describe('Golden: карты Атак Чужих (cards_base.pdf, стр. 3, 5, 7; стр. 20)', () => {
  it('сверяет каждый экземпляр: ID, эффект, текст, стойкость или стрелку и символы атакующих', () => {
    const expectation = table('intruder-attacks').expectation;
    const byEffect: Record<string, number> = {};

    for (const card of INTRUDER_ATTACK_CARDS) byEffect[card.effect] = (byEffect[card.effect] ?? 0) + 1;

    expect(INTRUDER_ATTACK_CARDS).toHaveLength(20);
    expect(expectation.cardCount).toBe(20);
    expect(INTRUDER_ATTACK_CARDS).toEqual(expectation.cards);
    expect(byEffect).toEqual(expectation.byEffect);
  });

  it('печатает стрелку Отступления вместо стойкости ровно на одном Укусе и одной Атаке когтями', () => {
    const arrows = INTRUDER_ATTACK_CARDS.filter(hasRetreatArrow).map((card) => card.effect);

    expect(arrows.sort()).toEqual(['BITE', 'CLAW_ATTACK']);
  });
});

describe('Golden: карты Слабостей (cards_additional.pdf, стр. 13; стр. 21)', () => {
  it('сверяет каждую карту: ID, название, эффект и печатный текст', () => {
    const expectation = table('weakness-cards').expectation as {
      cardCount: number;
      cards: { id: string; name: string; effect: string; description: string }[];
    };

    expect(WEAKNESS_CARDS).toHaveLength(expectation.cardCount);
    expect(WEAKNESS_CARDS.map(({ id, name, effect, description }) => ({ id, name, effect, description }))).toEqual(
      expectation.cards,
    );
  });
});

describe('Пакет источника: таблицы боя сверены со сканом', () => {
  it.each(['combat-die', 'intruder-attacks', 'escape-numbers', 'weakness-cards'])('%s', (id) => {
    const entry = table(id);

    expect(entry.status).toBe('SCAN_VERIFIED');
    expect(entry.scanDiscrepancies ?? []).toEqual([]);
    expect(entry.facts.some((fact) => fact.source === 'pnp-scans' && fact.page)).toBe(true);
  });
});
