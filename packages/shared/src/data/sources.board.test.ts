import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { COORDINATE_CARDS } from './coordinateCards.js';
import { HIBERNATION_OPENS_AT_TIME, SELF_DESTRUCT_EXPLODES_AT, SELF_DESTRUCT_IRREVERSIBLE_AT } from './evacuation.js';
import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1, SPECIAL_ROOMS } from './roomDefinitions.js';
import { SERIOUS_WOUND_CARDS } from './seriousWounds.js';
import { TIME_TRACK_LENGTH } from './setup.js';
import { createInitialGameState } from '../logic/setup.js';

interface BoardTable {
  status: string;
  facts: { source: string; page?: string }[];
  expectation: Record<string, unknown>;
  scanDiscrepancies?: unknown[];
}

const dataSources = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../../../doc/sources/data-sources.json', import.meta.url)), 'utf8'),
) as { tables: Record<string, BoardTable> };

function table(id: string): BoardTable {
  const entry = dataSources.tables[id];
  if (!entry) throw new Error(`В пакете источника нет таблицы ${id}`);
  return entry;
}

const BOARD_TABLES = ['room-definitions', 'board-tracks', 'coordinate-cards', 'serious-wounds'];

describe('Golden: поле и компоненты подготовки (map_full.jpg, rooms.pdf, cards_additional.pdf, cards_base.pdf)', () => {
  it('таблицы Этапа 5 сверены со сканом и не содержат открытых расхождений', () => {
    for (const id of BOARD_TABLES) {
      const entry = table(id);
      expect(entry.status, id).toBe('SCAN_VERIFIED');
      expect(
        entry.facts.some((fact) => fact.source === 'pnp-scans' && fact.page),
        id,
      ).toBe(true);
      expect(entry.scanDiscrepancies ?? [], id).toEqual([]);
    }
  });

  it('цвет и Компьютер каждой Комнаты совпадают с тайлами и полем', () => {
    const expectation = table('room-definitions').expectation as { rooms: Record<string, unknown> };
    const rooms = [...BASIC_ROOMS_1, ...ADDITIONAL_ROOMS_2, ...SPECIAL_ROOMS];

    expect(
      Object.fromEntries(rooms.map((room) => [room.id, { color: room.color, hasComputer: room.hasComputer }])),
    ).toEqual(expectation.rooms);
  });

  it('деления треков и старт маркера Курса совпадают с полем', () => {
    const expectation = table('board-tracks').expectation;

    expect({
      timeTrackLength: TIME_TRACK_LENGTH,
      hibernationOpensAtTime: HIBERNATION_OPENS_AT_TIME,
      selfDestructIrreversibleAt: SELF_DESTRUCT_IRREVERSIBLE_AT,
      selfDestructExplodesAt: SELF_DESTRUCT_EXPLODES_AT,
      startingCourseMarker: createInitialGameState('board-tracks').ship.coordinates.currentCourseMarker,
    }).toEqual(expectation);
  });

  it('32 пункта назначения 8 карт Координат совпадают со сканом', () => {
    const expectation = table('coordinate-cards').expectation as { cards: Record<string, unknown> };

    expect(Object.fromEntries(COORDINATE_CARDS.map((card) => [card.id, card.destinations]))).toEqual(expectation.cards);
  });

  it('состав и тексты Тяжелых Травм совпадают с картами', () => {
    const expectation = table('serious-wounds').expectation as { cards: Record<string, unknown> };
    const byKind: Record<string, { name: string; count: number; description: string }> = {};
    for (const card of SERIOUS_WOUND_CARDS) {
      const entry = byKind[card.kind] ?? { name: card.name, count: 0, description: card.description };
      entry.count += 1;
      byKind[card.kind] = entry;
    }

    expect(byKind).toEqual(expectation.cards);
  });
});
