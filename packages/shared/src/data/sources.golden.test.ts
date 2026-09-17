import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { CRAFTING_RECIPES } from './crafting.js';
import { EXPLORATION_TOKENS } from './explorationTokens.js';
import {
  ADULT_ESCAPE_NUMBERS,
  BAG_ADULTS_PER_PLAYER,
  BAG_BASE_ADULT_COUNT,
  ESCAPE_NUMBERS,
  INTRUDER_SUPPLY_COMPOSITION,
  createIntruderSupply,
  splitIntruderBag,
} from './intruderPool.js';
import { NOISE_DIE_FACES } from './noiseDie.js';
import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1, SPECIAL_ROOMS } from './roomDefinitions.js';
import {
  COORDINATE_DESTINATIONS,
  ESCAPE_POD_CAPACITY,
  ESCAPE_POD_NUMBERS,
  ESCAPE_PODS_BY_PLAYER_COUNT,
  HAND_SLOT_COUNT,
  QUEST_ITEM_COUNT,
  TIME_TRACK_LENGTH,
  WEAKNESS_SLOT_COUNT,
  WEAKNESS_SLOT_OBJECT_KINDS,
  CHARACTERS,
} from './setup.js';
import { SHIP_CORRIDORS, SHIP_ROOM_NODES } from './shipGraph.js';
import {
  DOOR_TOKEN_SUPPLY,
  FIRE_MARKER_SUPPLY,
  MALFUNCTION_FORBIDDEN_ROOM_DEFINITIONS,
  MALFUNCTION_MARKER_SUPPLY,
  MAX_DOOR_TOKENS_PER_CORRIDOR,
  MAX_FIRE_MARKERS_PER_ROOM,
  MAX_MALFUNCTION_MARKERS_PER_ROOM,
  MAX_NOISE_MARKERS_PER_CORRIDOR,
  NOISE_MARKER_SUPPLY,
} from '../logic/markers.js';
import { DOOR_STATES, nextDoorState } from '../types/rooms.js';

/**
 * Golden-тесты происхождения данных (Э2-1).
 *
 * Таблица в коде не считается истиной сама по себе: рядом лежит пакет источника
 * `doc/sources/data-sources.json`, где у каждого числа указано, откуда оно
 * взялось — страница книги правил, подтверждение владельца или внешний
 * источник, который ещё ждёт сверки с картоном. Тест сверяет код с этим
 * файлом, поэтому «поправил таблицу, забыл источник» и «поправил источник,
 * забыл код» одинаково роняют сборку.
 *
 * Что тест проверить не может: сами физические компоненты. Поэтому статусы
 * `USER_CONFIRMED`, `EXTERNAL_UNVERIFIED` и `UNVERIFIED_BOARD` — это не
 * украшение, а честная пометка того, что осталось сверить, и она обязана
 * присутствовать у каждой таблицы.
 */

interface SourceCard {
  kind: 'RULES_LOCAL' | 'USER_CONFIRMED' | 'EXTERNAL_UNVERIFIED';
  title: string;
  location: string;
}

interface TableFacts {
  file: string;
  status: 'RULES_LOCAL' | 'USER_CONFIRMED' | 'EXTERNAL_UNVERIFIED' | 'UNVERIFIED_BOARD';
  facts: { claim: string; source: string; lines?: string; note?: string }[];
  expectation: Record<string, unknown>;
  unverified?: string[];
}

interface DataSources {
  meta: {
    version: number;
    updatedFor: string;
    statuses: Record<string, string>;
    sources: Record<string, SourceCard>;
  };
  tables: Record<string, TableFacts>;
}

const DATA_SOURCES_URL = new URL('../../../../doc/sources/data-sources.json', import.meta.url);

const dataSources = JSON.parse(readFileSync(fileURLToPath(DATA_SOURCES_URL), 'utf8')) as DataSources;

function table(id: string): TableFacts {
  const entry = dataSources.tables[id];

  if (!entry) throw new Error(`В пакете источника нет таблицы ${id}`);

  return entry;
}

/** Считает состав мешка для конкретного числа игроков и переводит его в числа. */
function bagComposition(playerCount: number): Record<string, number> {
  const supply = createIntruderSupply();
  const { bag } = splitIntruderBag(supply, playerCount);
  const counts: Record<string, number> = { BLANK: 0, LARVA: 0, CREEPER: 0, ADULT: 0, BREEDER: 0, QUEEN: 0 };

  for (const token of bag) {
    counts[token.type] = (counts[token.type] ?? 0) + 1;
  }

  return counts;
}

describe('Пакет источника: структура и статусы (Э2-1)', () => {
  it('описывает каждую таблицу данных файлом в репозитории и статусом проверки', () => {
    const expectedTables = [
      'exploration-tokens',
      'intruder-supply',
      'intruder-bag',
      'escape-numbers',
      'marker-supply',
      'door-rules',
      'noise-die',
      'ship-graph-rooms',
      'ship-graph-corridors',
      'room-definitions',
      'setup-plan',
      'crafting-recipes',
    ];

    expect(Object.keys(dataSources.tables).sort()).toEqual([...expectedTables].sort());

    for (const [id, entry] of Object.entries(dataSources.tables)) {
      expect(entry.facts.length, `таблица ${id} без фактов`).toBeGreaterThan(0);
      expect(dataSources.meta.statuses[entry.status], `таблица ${id}: неизвестный статус`).toBeDefined();

      for (const fact of entry.facts) {
        expect(dataSources.meta.sources[fact.source], `таблица ${id}: ссылка на неизвестный источник`).toBeDefined();
      }

      // Ни одна таблица не может быть объявлена проверенной «просто так»:
      // статус RULES_LOCAL обязан ссылаться хотя бы раз на строки rules.md.
      if (entry.status === 'RULES_LOCAL') {
        expect(
          entry.facts.some((fact) => fact.source === 'rules-md' && fact.lines),
          `таблица ${id}: статус RULES_LOCAL без ссылки на строки правил`,
        ).toBe(true);
      }
    }
  });

  it('перечисляет источник для каждой таблицы файлом, о котором можно спросить', () => {
    for (const entry of Object.values(dataSources.tables)) {
      expect(entry.file.length).toBeGreaterThan(0);
    }
  });

  it('не выдаёт внешние данные за проверенные: у непроверенных таблиц есть список открытых пунктов', () => {
    for (const [id, entry] of Object.entries(dataSources.tables)) {
      if (entry.status === 'EXTERNAL_UNVERIFIED' || entry.status === 'UNVERIFIED_BOARD') {
        expect(entry.unverified?.length ?? 0, `таблица ${id}: нет списка несверенного`).toBeGreaterThan(0);
      }
    }
  });
});

describe('Golden: жетоны Исследования (Э2-1)', () => {
  const expectation = table('exploration-tokens').expectation as {
    tokenCount: number;
    itemCount: number;
    byEffect: Record<string, number>;
    itemsByEffect: Record<string, number[]>;
  };

  it('совпадает с источником по числу жетонов и предметов', () => {
    expect(EXPLORATION_TOKENS).toHaveLength(expectation.tokenCount);
    expect(EXPLORATION_TOKENS.reduce((total, token) => total + token.itemsCount, 0)).toBe(expectation.itemCount);
  });

  it('совпадает с источником по составу эффектов и числам предметов', () => {
    const byEffect: Record<string, number> = {};
    const itemsByEffect: Record<string, number[]> = {};

    for (const token of EXPLORATION_TOKENS) {
      byEffect[token.effect] = (byEffect[token.effect] ?? 0) + 1;
      itemsByEffect[token.effect] = [...(itemsByEffect[token.effect] ?? []), token.itemsCount];
    }

    expect(byEffect).toEqual(expectation.byEffect);

    for (const [effect, items] of Object.entries(expectation.itemsByEffect)) {
      expect(itemsByEffect[effect]?.sort((a, b) => b - a)).toEqual([...items].sort((a, b) => b - a));
    }
  });
});

describe('Golden: Пул Чужих (Э2-1)', () => {
  it('совпадает с источником по составу коробки', () => {
    const expectation = table('intruder-supply').expectation as {
      supplyCount: number;
      composition: Record<string, number>;
    };

    expect(createIntruderSupply()).toHaveLength(expectation.supplyCount);
    expect(INTRUDER_SUPPLY_COMPOSITION).toEqual(expectation.composition);
  });

  it('совпадает с источником по составу мешка для 1–5 игроков', () => {
    const expectation = table('intruder-bag').expectation as {
      baseAdults: number;
      adultsPerPlayer: number;
      bagByPlayerCount: Record<string, Record<string, number>>;
    };

    expect(BAG_BASE_ADULT_COUNT).toBe(expectation.baseAdults);
    expect(BAG_ADULTS_PER_PLAYER).toBe(expectation.adultsPerPlayer);

    for (const [playerCount, composition] of Object.entries(expectation.bagByPlayerCount)) {
      expect(bagComposition(Number(playerCount)), `мешок на ${playerCount} игроков`).toEqual(composition);
    }
  });

  it('совпадает с источником по числам Внезапной атаки, включая пометку о несверенном', () => {
    const expectation = table('escape-numbers').expectation as {
      adultEscapeNumbers: number[];
      otherEscapeNumbers: Record<string, number>;
    };

    expect([...ADULT_ESCAPE_NUMBERS]).toEqual(expectation.adultEscapeNumbers);
    expect(ESCAPE_NUMBERS).toEqual(expectation.otherEscapeNumbers);

    const supply = createIntruderSupply();

    expect(supply.filter((token) => token.type === 'ADULT')).toHaveLength(expectation.adultEscapeNumbers.length);
    expect(supply.every((token) => token.escapeNumber >= 0)).toBe(true);
    expect(table('escape-numbers').status).toBe('EXTERNAL_UNVERIFIED');
  });
});

describe('Golden: запасы маркеров и Двери (Э2-1, Э2-2)', () => {
  it('совпадает с источником по запасам и лимитам', () => {
    const expectation = table('marker-supply').expectation as {
      noise: number;
      fire: number;
      malfunction: number;
      doors: number;
      maxNoisePerCorridor: number;
      maxFirePerRoom: number;
      maxMalfunctionPerRoom: number;
      maxDoorsPerCorridor: number;
      malfunctionForbiddenRoomDefinitions: string[];
    };

    expect(NOISE_MARKER_SUPPLY).toBe(expectation.noise);
    expect(FIRE_MARKER_SUPPLY).toBe(expectation.fire);
    expect(MALFUNCTION_MARKER_SUPPLY).toBe(expectation.malfunction);
    expect(DOOR_TOKEN_SUPPLY).toBe(expectation.doors);
    expect(MAX_NOISE_MARKERS_PER_CORRIDOR).toBe(expectation.maxNoisePerCorridor);
    expect(MAX_FIRE_MARKERS_PER_ROOM).toBe(expectation.maxFirePerRoom);
    expect(MAX_MALFUNCTION_MARKERS_PER_ROOM).toBe(expectation.maxMalfunctionPerRoom);
    expect(MAX_DOOR_TOKENS_PER_CORRIDOR).toBe(expectation.maxDoorsPerCorridor);
    expect([...MALFUNCTION_FORBIDDEN_ROOM_DEFINITIONS]).toEqual(expectation.malfunctionForbiddenRoomDefinitions);
  });

  it('запретные отсеки для Неисправности существуют в определениях отсеков', () => {
    const definitionIds = new Set([...BASIC_ROOMS_1, ...ADDITIONAL_ROOMS_2, ...SPECIAL_ROOMS].map((room) => room.id));

    for (const forbidden of MALFUNCTION_FORBIDDEN_ROOM_DEFINITIONS) {
      expect(definitionIds.has(forbidden), `нет определения отсека ${forbidden}`).toBe(true);
    }
  });

  it('совпадает с источником по правилам Дверей: три состояния, Разрушенная — терминальное', () => {
    const expectation = table('door-rules').expectation as {
      states: string[];
      terminal: string[];
      shortageMovesTokenFromBoard: boolean;
    };

    expect([...DOOR_STATES]).toEqual(expectation.states);

    for (const state of expectation.terminal) {
      expect(nextDoorState(state as (typeof DOOR_STATES)[number])).toBe(state);
    }

    expect(expectation.shortageMovesTokenFromBoard).toBe(true);
  });
});

describe('Golden: кубик Шума (Э2-1)', () => {
  it('совпадает с источником по составу граней', () => {
    const expectation = table('noise-die').expectation as {
      faceCount: number;
      corridorFaces: number[];
      specialFaces: string[];
    };

    expect(NOISE_DIE_FACES).toHaveLength(expectation.faceCount);

    const corridorFaces = NOISE_DIE_FACES.filter((face) => face.kind === 'CORRIDOR').map((face) => face.number);
    const specialFaces = NOISE_DIE_FACES.filter((face) => face.kind !== 'CORRIDOR').map((face) => face.kind);

    expect(corridorFaces).toEqual(expectation.corridorFaces);
    expect(specialFaces.sort()).toEqual([...expectation.specialFaces].sort());
  });
});

describe('Golden: схема корабля и определения отсеков (Э2-1)', () => {
  it('совпадает с источником по числу отсеков и их категориям', () => {
    const expectation = table('ship-graph-rooms').expectation as {
      roomCount: number;
      byCategory: Record<string, number>;
      techNumbers: Record<string, number[]>;
    };

    expect(SHIP_ROOM_NODES).toHaveLength(expectation.roomCount);

    const byCategory: Record<string, number> = {};

    for (const node of SHIP_ROOM_NODES) {
      byCategory[node.category] = (byCategory[node.category] ?? 0) + 1;
    }

    expect(byCategory).toEqual(expectation.byCategory);

    for (const [roomId, numbers] of Object.entries(expectation.techNumbers)) {
      const node = SHIP_ROOM_NODES.find((candidate) => candidate.id === Number(roomId));

      expect(node?.techNumbers, `отсек ${roomId}: номера вентиляции`).toEqual(numbers);
    }
  });

  it('совпадает с источником по числу Коридоров и по разбросу номеров выходов', () => {
    const expectation = table('ship-graph-corridors').expectation as {
      corridorCount: number;
      allNumbersInRange: [number, number];
      singleRecordPerRoomPair: boolean;
    };

    expect(SHIP_CORRIDORS).toHaveLength(expectation.corridorCount);

    const [min, max] = expectation.allNumbersInRange;

    for (const corridor of SHIP_CORRIDORS) {
      for (const number of [...corridor.fromNumbers, ...corridor.toNumbers]) {
        expect(number).toBeGreaterThanOrEqual(min);
        expect(number).toBeLessThanOrEqual(max);
      }
    }

    if (expectation.singleRecordPerRoomPair) {
      const pairs = SHIP_CORRIDORS.map((corridor) => `${corridor.fromRoomId}-${corridor.toRoomId}`);

      expect(new Set(pairs).size).toBe(pairs.length);
    }
  });

  it('совпадает с источником по числу определений отсеков', () => {
    const expectation = table('room-definitions').expectation as {
      rooms1: number;
      rooms2: number;
      special: number;
    };

    expect(BASIC_ROOMS_1).toHaveLength(expectation.rooms1);
    expect(ADDITIONAL_ROOMS_2).toHaveLength(expectation.rooms2);
    expect(SPECIAL_ROOMS).toHaveLength(expectation.special);
  });
});

describe('Golden: подготовка стола (Э2-1)', () => {
  it('совпадает с источником по капсулам, слабостям и трекам', () => {
    const expectation = table('setup-plan').expectation as {
      escapePodsByPlayerCount: Record<string, number>;
      escapePodNumbers: number[];
      escapePodCapacity: number;
      weaknessSlotCount: number;
      weaknessSlotObjectKinds: string[];
      timeTrackLength: number;
      handSlotCount: number;
      questItemCount: number;
      characterCount: number;
    };

    expect(ESCAPE_PODS_BY_PLAYER_COUNT).toEqual(
      Object.fromEntries(Object.entries(expectation.escapePodsByPlayerCount).map(([k, v]) => [Number(k), v])),
    );
    expect([...ESCAPE_POD_NUMBERS]).toEqual(expectation.escapePodNumbers);
    expect(ESCAPE_POD_CAPACITY).toBe(expectation.escapePodCapacity);
    expect(WEAKNESS_SLOT_COUNT).toBe(expectation.weaknessSlotCount);
    expect([...WEAKNESS_SLOT_OBJECT_KINDS]).toEqual(expectation.weaknessSlotObjectKinds);
    expect(TIME_TRACK_LENGTH).toBe(expectation.timeTrackLength);
    expect(HAND_SLOT_COUNT).toBe(expectation.handSlotCount);
    expect(QUEST_ITEM_COUNT).toBe(expectation.questItemCount);
    expect(CHARACTERS).toHaveLength(expectation.characterCount);
  });

  it('совпадает с источником по числу рецептов Изготовления', () => {
    const expectation = table('crafting-recipes').expectation as { recipeCount: number };

    expect(CRAFTING_RECIPES).toHaveLength(expectation.recipeCount);
    expect(COORDINATE_DESTINATIONS.length).toBeGreaterThan(0);
  });
});
