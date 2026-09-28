import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { EVENT_CARDS, EVENT_CARDS_COUNT } from './eventCards.js';
import type { IntruderType } from '../types/entities.js';

interface EventTable {
  status: string;
  facts: { source: string; lines?: string; page?: string }[];
  expectation: {
    cardCount: number;
    byEffect: Record<string, number>;
    destroyedOnResolve: string[];
    reshuffledIntoDeck: string[];
    corridorNumbers: Record<string, number>;
    cards: unknown[];
  };
  unverified?: string[];
  scanDiscrepancies?: unknown[];
}

const dataSources = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../../../doc/sources/data-sources.json', import.meta.url)), 'utf8'),
) as { meta: { sources: Record<string, unknown> }; tables: Record<string, EventTable> };

const eventTable = dataSources.tables['event-cards']!;

const SCAN_SYMBOLS: Record<string, readonly IntruderType[]> = {
  'Защита кладки': ['BREEDER', 'QUEEN'],
  Выводок: ['ADULT', 'BREEDER'],
  Регенерация: ['BREEDER', 'QUEEN'],
  Разгром: ['CREEPER', 'ADULT'],
  Затаившиеся: ['CREEPER', 'ADULT'],
  Созревание: ['CREEPER', 'BREEDER', 'QUEEN'],
  'Воспламеняемый раствор': ['BREEDER', 'QUEEN'],
  'Пожирающее пламя': ['CREEPER', 'BREEDER', 'QUEEN'],
  'Запах добычи': ['CREEPER', 'ADULT'],
  Неисправность: ['ADULT', 'BREEDER'],
  'Шум в технических коридорах': ['ADULT', 'BREEDER'],
  Улей: ['CREEPER', 'BREEDER', 'QUEEN'],
  'Открытие отсеков': ['ADULT', 'BREEDER'],
  'Разрушающее пламя': ['CREEPER', 'ADULT'],
  'Катапультирование капсулы': ['ADULT', 'BREEDER', 'QUEEN'],
  'Короткое замыкание': ['ADULT', 'BREEDER', 'QUEEN'],
  'Утечка охладителя': ['ADULT', 'BREEDER', 'QUEEN'],
  'Неполадка систем жизнеобеспечения': ['ADULT', 'BREEDER', 'QUEEN'],
};

describe('Golden: колода Событий (cards_base.pdf, стр. 11, 13, 15; стр. 10)', () => {
  it('сверяет каждый экземпляр: ID, эффект, направление, символы Чужих, текст и флаги', () => {
    const byEffect: Record<string, number> = {};
    for (const card of EVENT_CARDS) byEffect[card.effect] = (byEffect[card.effect] ?? 0) + 1;

    expect(eventTable.expectation.cardCount).toBe(EVENT_CARDS_COUNT);
    expect(EVENT_CARDS).toHaveLength(20);
    expect(new Set(EVENT_CARDS.map((card) => card.id)).size).toBe(20);
    expect(EVENT_CARDS).toEqual(eventTable.expectation.cards);
    expect(byEffect).toEqual(eventTable.expectation.byEffect);
  });

  it('сверяет направление каждой карты и флаги уничтожения и замешивания', () => {
    const { corridorNumbers, destroyedOnResolve, reshuffledIntoDeck } = eventTable.expectation;

    expect(Object.keys(corridorNumbers).sort()).toEqual(EVENT_CARDS.map((card) => card.id).sort());
    for (const card of EVENT_CARDS) {
      expect(card.corridorNumber, `${card.id}: направление`).toBe(corridorNumbers[card.id]);
      expect(destroyedOnResolve.includes(card.id), `${card.id}: флаг уничтожения`).toBe(card.isDestroyedOnResolve);
      expect(reshuffledIntoDeck.includes(card.id), `${card.id}: флаг замешивания`).toBe(card.isReshuffledIntoDeck);
    }
  });

  it('символы Чужих каждой карты совпадают со сканом (scan-transcript §4)', () => {
    for (const card of EVENT_CARDS.filter((candidate) => candidate.effect !== 'HUNT')) {
      expect(card.intruderTypes, card.name).toEqual(SCAN_SYMBOLS[card.name]);
    }
    const hunts = EVENT_CARDS.filter((card) => card.effect === 'HUNT').map((card) => [
      card.corridorNumber,
      card.intruderTypes,
    ]);
    expect(hunts).toEqual([
      [2, ['CREEPER', 'BREEDER', 'QUEEN']],
      [3, ['BREEDER', 'QUEEN']],
    ]);
  });

  it('сверена со сканом: страницы скана, без расхождений и без транскрипта EVENTS.md', () => {
    expect(eventTable.status).toBe('SCAN_VERIFIED');
    expect(eventTable.scanDiscrepancies ?? []).toEqual([]);
    expect(eventTable.unverified ?? []).toEqual([]);
    expect(eventTable.facts.some((fact) => fact.source === 'pnp-scans' && fact.page?.includes('cards_base.pdf'))).toBe(
      true,
    );
    expect(eventTable.facts.some((fact) => fact.source === 'rules-md' && fact.lines)).toBe(true);
    expect(dataSources.meta.sources['events-transcript']).toBeUndefined();
    expect(dataSources.meta.sources['owner-decision-2026-09-22']).toBeUndefined();
  });
});
