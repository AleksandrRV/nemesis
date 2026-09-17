import { describe, expect, it } from 'vitest';

import type { RoomId, RoomState } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1 } from '../data/roomDefinitions.js';
import { SHIP_CORRIDORS, SHIP_ROOM_NODES } from '../data/shipGraph.js';
import { EXPLORATION_TOKENS } from '../data/explorationTokens.js';
import { COORDINATE_DESTINATIONS, ESCAPE_POD_NUMBERS } from '../data/setup.js';
import { GAME_STATE_SCHEMA_VERSION } from '../types/state.js';
import { createInitialGameState } from './setup.js';

const SEEDS = ['nemesis-alpha', 'nemesis-beta', 'nemesis-gamma', 'nemesis-delta', 'nemesis-epsilon'];

/** Особые отсеки напечатаны на поле, поэтому всегда открыты (GDD §2.1). */
const SPECIAL_SLOTS: Record<number, string> = {
  1: 'COCKPIT',
  11: 'HIBERNATORIUM',
  19: 'ENGINE_03',
  20: 'ENGINE_02',
  21: 'ENGINE_01',
};

function roomsWithCategory(state: GameState, category: RoomState['category']): RoomState[] {
  return Object.values(state.ship.rooms).filter((room) => room.category === category);
}

function hiddenRooms(state: GameState): RoomState[] {
  return Object.values(state.ship.rooms).filter((room) => !room.isExplored);
}

/** Пул жетонов Исследования из коробки: 20 жетонов, 44 предмета (стр. 3; стр. 6, шаг 4). */
const POOL_TOKEN_COUNT = 20;
const POOL_ITEM_COUNT = 44;

describe('createInitialGameState: детерминизм и сохранение', () => {
  it('воспроизводит одну и ту же партию при одинаковом сиде', () => {
    for (const seed of SEEDS) {
      expect(createInitialGameState(seed)).toEqual(createInitialGameState(seed));
    }
  });

  it('не зависит от ранее созданных партий: генератор не хранит общего состояния', () => {
    const first = createInitialGameState('nemesis-alpha');
    createInitialGameState('nemesis-beta');

    expect(createInitialGameState('nemesis-alpha')).toEqual(first);
  });

  it('создаёт разные партии для разных сидов', () => {
    const layouts = new Set(SEEDS.map((seed) => JSON.stringify(createInitialGameState(seed).ship.rooms)));

    expect(layouts.size).toBe(SEEDS.length);
  });

  it('сохраняет сид и версию контракта в состоянии партии', () => {
    const state = createInitialGameState('nemesis-alpha');

    expect(state.meta.seed).toBe('nemesis-alpha');
    expect(state.meta.schemaVersion).toBe(GAME_STATE_SCHEMA_VERSION);
  });

  it('выводит идентификатор партии из сида, но принимает явный', () => {
    expect(createInitialGameState('nemesis-alpha').meta.gameId).toBe('game-nemesis-alpha');
    expect(createInitialGameState('nemesis-alpha', { gameId: 'game-42' }).meta.gameId).toBe('game-42');
  });

  it('переживает сериализацию в JSON без потерь (требование persist, AGENTS.md §4.4)', () => {
    const state = createInitialGameState('nemesis-alpha');

    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});

describe('createInitialGameState: поле и отсеки', () => {
  it('создаёт ровно те 21 отсек, что описаны схемой корабля', () => {
    const state = createInitialGameState('nemesis-alpha');
    const roomIds = Object.keys(state.ship.rooms)
      .map(Number)
      .sort((a, b) => a - b);

    expect(roomIds).toEqual(SHIP_ROOM_NODES.map((node) => node.id).sort((a, b) => a - b));
  });

  it('открывает особые отсеки и не кладёт в них предметы', () => {
    const state = createInitialGameState('nemesis-alpha');

    for (const [slotId, definitionId] of Object.entries(SPECIAL_SLOTS)) {
      const room = state.ship.rooms[Number(slotId) as RoomId];

      expect(room?.isExplored).toBe(true);
      expect(room?.itemsCount).toBe(0);
      expect(room?.definitionId).toBe(definitionId);
    }
  });

  it('раскладывает все 11 основных комнат «1» без повторов', () => {
    const placed = roomsWithCategory(createInitialGameState('nemesis-alpha'), 'ROOM_1').map(
      (room) => room.definitionId,
    );

    expect(placed).toHaveLength(11);
    expect([...placed].sort()).toEqual(BASIC_ROOMS_1.map((room) => room.id).sort());
  });

  it('выбирает 5 различных дополнительных комнат из 9 возможных', () => {
    const placed = roomsWithCategory(createInitialGameState('nemesis-alpha'), 'ROOM_2').map(
      (room) => room.definitionId,
    );

    expect(placed).toHaveLength(5);
    expect(new Set(placed).size).toBe(5);
    for (const definitionId of placed) {
      expect(ADDITIONAL_ROOMS_2.map((room) => room.id)).toContain(definitionId);
    }
  });

  it('выкладывает все коридоры открытыми, без шума и техкоридорного шума', () => {
    const state = createInitialGameState('nemesis-alpha');
    const corridors = Object.values(state.ship.corridors);

    expect(corridors).toHaveLength(SHIP_CORRIDORS.length);
    expect(corridors.every((corridor) => corridor.doorState === 'OPEN')).toBe(true);
    expect(corridors.every((corridor) => !corridor.hasNoise)).toBe(true);
    expect(state.ship.technicalCorridorNoise).toBe(false);
  });

  it('отмечает вход в техкоридор только там, где напечатан номер вентиляции', () => {
    const state = createInitialGameState('nemesis-alpha');

    for (const node of SHIP_ROOM_NODES) {
      expect(state.ship.rooms[node.id]?.hasTechnicalCorridorEntrance).toBe(node.techNumbers.length > 0);
    }
  });

  it('ставит на пол стартового отсека Труп как объект с полем kind', () => {
    const state = createInitialGameState('nemesis-alpha');
    const objects = state.ship.rooms[11]?.objects ?? [];

    expect(objects).toHaveLength(1);
    expect(objects[0]?.kind).toBe('CORPSE');
    expect(objects[0]?.id).toBe('CORPSE_BLUE');
  });

  it('не оставляет объектов в остальных отсеках', () => {
    const state = createInitialGameState('nemesis-alpha');
    const roomsWithObjects = Object.values(state.ship.rooms).filter((room) => room.objects.length > 0);

    expect(roomsWithObjects.map((room) => room.id)).toEqual([11]);
  });
});

describe('createInitialGameState: жетоны Исследования', () => {
  it('объявляет пул из 20 жетонов с 44 предметами: четыре остаются в коробке (стр. 3; стр. 6, шаг 4)', () => {
    expect(EXPLORATION_TOKENS).toHaveLength(POOL_TOKEN_COUNT);
    expect(EXPLORATION_TOKENS.reduce((total, token) => total + token.itemsCount, 0)).toBe(POOL_ITEM_COUNT);
  });

  it('раскладывает по одному жетону в каждый из 16 неисследованных отсеков', () => {
    for (const seed of SEEDS) {
      const hidden = hiddenRooms(createInitialGameState(seed));

      expect(hidden).toHaveLength(16);
      expect(hidden.every((room) => room.explorationEffect !== null)).toBe(true);
      expect(hidden.every((room) => room.itemsCount >= 1 && room.itemsCount <= 4)).toBe(true);
    }
  });

  it('набранные жетоны — выборка из пула: раскладка не выдумывает числа предметов', () => {
    for (const seed of SEEDS) {
      const pool = new Map<string, number>();

      for (const token of EXPLORATION_TOKENS) {
        const key = `${token.effect}:${token.itemsCount}`;
        pool.set(key, (pool.get(key) ?? 0) + 1);
      }

      for (const room of hiddenRooms(createInitialGameState(seed))) {
        const key = `${room.explorationEffect}:${room.itemsCount}`;
        const left = pool.get(key) ?? 0;

        expect(left, `жетон ${key} не из пула или использован дважды`).toBeGreaterThan(0);
        pool.set(key, left - 1);
      }
    }
  });

  it('не оставляет предметов в уже открытых отсеках', () => {
    const state = createInitialGameState('nemesis-alpha');

    for (const room of Object.values(state.ship.rooms).filter((item) => item.isExplored)) {
      expect(room.itemsCount).toBe(0);
    }
  });
});

describe('createInitialGameState: Пул Чужих', () => {
  it('собирает мешок для одиночной партии: 1 Пустой, 4 Личинки, 1 Крипер, 1 Королева и 4 Взрослых Особи', () => {
    const state = createInitialGameState('nemesis-alpha');
    const composition = state.intrudersPool.bag.reduce<Record<string, number>>((acc, token) => {
      acc[token.type] = (acc[token.type] ?? 0) + 1;
      return acc;
    }, {});

    // Книга правил, стр. 6, шаг 10: 3 Взрослых Особи + 1 за каждого игрока (соло — 1 игрок).
    expect(state.intrudersPool.bag).toHaveLength(11);
    expect(composition).toEqual({ BLANK: 1, LARVA: 4, CREEPER: 1, QUEEN: 1, ADULT: 4 });
  });

  it('добавляет Взрослую Особь за каждого игрока сверх трёх базовых', () => {
    const state = createInitialGameState('nemesis-alpha', { playerCount: 3 });
    const adults = state.intrudersPool.bag.filter((token) => token.type === 'ADULT');

    expect(adults).toHaveLength(6);
    expect(state.intrudersPool.bag).toHaveLength(13);
  });

  it('даёт каждому жетону уникальный идентификатор', () => {
    const ids = createInitialGameState('nemesis-alpha').intrudersPool.bag.map((token) => token.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('тасует мешок: порядок жетонов зависит от сида, а не от кода', () => {
    // Жетоны лежат рубашкой вверх, поэтому порядок вытягивания — случайный
    // (план исправлений, Э1-1). Один и тот же сид обязан повторить порядок,
    // разные сиды — дать разные мешки.
    const first = createInitialGameState('nemesis-alpha').intrudersPool.bag.map((token) => token.id);
    const repeat = createInitialGameState('nemesis-alpha').intrudersPool.bag.map((token) => token.id);
    const other = createInitialGameState('nemesis-beta').intrudersPool.bag.map((token) => token.id);

    expect(repeat).toEqual(first);
    expect(other).not.toEqual(first);
    expect([...other].sort()).toEqual([...first].sort());
  });

  it('начинает партию без Чужих на поле и с 5 жетонами Яиц (стр. 6, шаг 9)', () => {
    const state = createInitialGameState('nemesis-alpha');

    expect(state.intrudersPool.boardTokens).toEqual([]);
    expect(state.intrudersPool.deadTokens).toEqual([]);
    expect(state.intrudersPool.eggsOnBoard).toBe(5);
  });
});

describe('createInitialGameState: экипаж', () => {
  it('ставит единственного игрока в Криогенный отсек (стр. 8, шаг 20)', () => {
    const state = createInitialGameState('nemesis-alpha');
    const player = state.players['player-1'];

    expect(player).toBeDefined();
    expect(player?.roomId).toBe(11);
    expect(state.ship.rooms[11]?.occupantPlayerIds).toContain('player-1');
  });

  it('начинает партию с пустыми колодой, рукой и сбросом персонажа', () => {
    const { actionDeck } = createInitialGameState('nemesis-alpha').players['player-1'] ?? {};

    expect(actionDeck).toEqual({ drawPile: [], hand: [], discard: [] });
  });

  it('оставляет пустыми слоты рук, инвентарь, травмы и цели', () => {
    const player = createInitialGameState('nemesis-alpha').players['player-1'];

    expect(player?.handSlots).toEqual([]);
    expect(player?.inventory).toEqual([]);
    expect(player?.seriousWounds).toEqual([]);
    expect(player?.objectives).toEqual([]);
    expect(player?.lightWounds).toBe(0);
  });

  it('выдаёт два неактивных квестовых предмета (GDD §2.2)', () => {
    const questItems = createInitialGameState('nemesis-alpha').players['player-1']?.questItems ?? [];

    expect(questItems).toHaveLength(2);
    expect(questItems.every((item) => !item.isActivated)).toBe(true);
    expect(new Set(questItems.map((item) => item.id)).size).toBe(2);
  });

  it('сбрасывает флаги состояния персонажа', () => {
    const player = createInitialGameState('nemesis-alpha').players['player-1'];

    expect(player?.hasSlime).toBe(false);
    expect(player?.isInHibernation).toBe(false);
    expect(player?.hasEscapedInPod).toBe(false);
    expect(player?.isDead).toBe(false);
    expect(player?.hasPassed).toBe(false);
    expect(player?.inspectedEngines).toEqual([]);
    expect(player?.inspectedCoordinates).toBe(false);
  });
});

describe('createInitialGameState: колоды партии', () => {
  it('создаёт пустые стопки для трёх колод Предметов (стр. 7, шаг 11)', () => {
    const { items } = createInitialGameState('nemesis-alpha').decks;

    expect(Object.keys(items).sort()).toEqual(['GREEN', 'RED', 'YELLOW']);
    for (const pile of Object.values(items)) {
      expect(pile).toEqual({ drawPile: [], discard: [] });
    }
  });

  it('создаёт колоды создаваемых предметов, заражения, слабостей, травм, событий и целей', () => {
    const { craftedItems, contamination, weaknesses, seriousWounds, events, intruderAttacks, objectives } =
      createInitialGameState('nemesis-alpha').decks;

    expect(craftedItems).toEqual({ drawPile: [], discard: [] });
    expect(contamination).toEqual({ drawPile: [], discard: [] });
    expect(weaknesses).toEqual({ drawPile: [], discard: [] });
    expect(seriousWounds).toEqual({ drawPile: [], discard: [] });
    expect(events).toEqual({ drawPile: [], discard: [] });
    expect(intruderAttacks).toEqual({ drawPile: [], discard: [] });
    expect(objectives.personal).toEqual({ drawPile: [], discard: [] });
    expect(objectives.corporate).toEqual({ drawPile: [], discard: [] });
  });

  it('даёт каждой колоде собственные массивы: пустые стопки не разделяются по ссылке', () => {
    const decks = createInitialGameState('nemesis-alpha').decks;
    const piles = [
      ...Object.values(decks.items),
      decks.craftedItems,
      decks.contamination,
      decks.weaknesses,
      decks.seriousWounds,
      decks.events,
      decks.intruderAttacks,
      decks.objectives.personal,
      decks.objectives.corporate,
    ];

    expect(new Set(piles).size).toBe(piles.length);
    expect(new Set(piles.map((pile) => pile.drawPile)).size).toBe(piles.length);
  });
});

describe('createInitialGameState: пусковой стол', () => {
  it('начинает партию с пустыми стеком прерываний и логом заявлений', () => {
    const state = createInitialGameState('nemesis-alpha');

    expect(state.interruptQueue).toEqual([]);
    expect(state.claimsLog).toEqual([]);
  });
});

describe('createInitialGameState: двигатели и Координаты', () => {
  it.each([1, 2, 3] as const)(
    'хранит для двигателя №%i одну булеву истину вместо двух независимых бросков',
    (engineNumber) => {
      for (const seed of SEEDS) {
        const engine = createInitialGameState(seed).ship.engines[engineNumber];

        expect(typeof engine.isWorking).toBe('boolean');
      }
    },
  );

  it('даёт разные состояния двигателей на разных сидах и оба значения истины', () => {
    const values = SEEDS.flatMap((seed) =>
      [1, 2, 3].map((engineNumber) => createInitialGameState(seed).ship.engines[engineNumber as 1 | 2 | 3].isWorking),
    );

    expect(new Set(values).size).toBe(2);
  });

  it('выбирает пункт назначения случайно из пула карт Координат', () => {
    for (const seed of SEEDS) {
      expect(COORDINATE_DESTINATIONS).toContain(createInitialGameState(seed).ship.coordinates.destination);
    }

    const destinations = new Set(SEEDS.map((seed) => createInitialGameState(seed).ship.coordinates.destination));

    expect(destinations.size).toBeGreaterThan(1);
  });

  it('ставит маркер Курса на деление «B» (стр. 6, шаг 6)', () => {
    expect(createInitialGameState('nemesis-alpha').ship.coordinates.currentCourseMarker).toBe('B');
  });
});

describe('createInitialGameState: Спасательные Капсулы', () => {
  it('выкладывает 2 капсулы для партии на одного игрока (стр. 6, шаг 7)', () => {
    const state = createInitialGameState('nemesis-alpha');

    expect(Object.keys(state.ship.escapePods)).toHaveLength(2);
  });

  it.each([
    [1, 2],
    [2, 2],
    [3, 3],
    [4, 3],
    [5, 4],
  ])('выкладывает %i капсул(ы) для партии на %i игроков', (playerCount, expected) => {
    const state = createInitialGameState('nemesis-alpha', { playerCount });

    expect(Object.values(state.ship.escapePods)).toHaveLength(expected);
  });

  it('выбирает номера капсул из жетонов 1..4 без повторов', () => {
    for (const seed of SEEDS) {
      const numbers = Object.values(createInitialGameState(seed).ship.escapePods).map((pod) => pod.number);

      expect(new Set(numbers).size).toBe(numbers.length);
      for (const number of numbers) {
        expect(ESCAPE_POD_NUMBERS).toContain(number);
      }
    }
  });

  it('кладёт капсулу с меньшим номером в отсек «А», следующую — в отсек «В»', () => {
    for (const seed of SEEDS) {
      const pods = Object.values(createInitialGameState(seed).ship.escapePods);
      const sectionA = pods.find((pod) => pod.section === 'A');
      const sectionB = pods.find((pod) => pod.section === 'B');

      expect(sectionA).toBeDefined();
      expect(sectionB).toBeDefined();
      expect(sectionA!.number).toBeLessThan(sectionB!.number);
      expect(sectionA!.id).toBe(`POD_A${sectionA!.number}`);
      expect(sectionB!.id).toBe(`POD_B${sectionB!.number}`);
    }
  });

  it('начинает партию с заблокированными пустыми капсулами (стр. 26)', () => {
    for (const seed of SEEDS) {
      for (const pod of Object.values(createInitialGameState(seed).ship.escapePods)) {
        expect(pod.isLocked).toBe(true);
        expect(pod.occupantIds).toEqual([]);
      }
    }
  });
});
