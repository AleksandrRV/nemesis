import { describe, expect, it } from 'vitest';

import type { GameState, RoomId, RoomState } from '@nemesis/shared';
import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1, SHIP_CORRIDORS, SHIP_ROOM_NODES } from '@nemesis/shared';
import { createInitialGameState } from './initialState';

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

/** Число маркеров каждого эффекта жетонов Исследования — инвариант генератора. */
const EXPECTED_ITEM_COUNTS = [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 4, 4];
const TOTAL_ITEMS = 34;

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

  it('сохраняет сид в состоянии партии', () => {
    expect(createInitialGameState('nemesis-alpha').meta.seed).toBe('nemesis-alpha');
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
    const state = createInitialGameState('nemesis-alpha');
    const placed = roomsWithCategory(state, 'ROOM_1').map((room) => room.definitionId);

    expect(placed).toHaveLength(11);
    expect([...placed].sort()).toEqual(BASIC_ROOMS_1.map((room) => room.id).sort());
  });

  it('выбирает 5 различных дополнительных комнат из 9 возможных', () => {
    const state = createInitialGameState('nemesis-alpha');
    const placed = roomsWithCategory(state, 'ROOM_2').map((room) => room.definitionId);

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
});

describe('createInitialGameState: жетоны Исследования', () => {
  it('раскрывает жетоны в 16 неисследованных отсеках и сохраняет 34 предмета', () => {
    for (const seed of SEEDS) {
      const hidden = hiddenRooms(createInitialGameState(seed));

      expect(hidden).toHaveLength(16);
      expect(hidden.reduce((total, room) => total + room.itemsCount, 0)).toBe(TOTAL_ITEMS);
    }
  });

  it('сохраняет неизменный набор чисел предметов на жетонах', () => {
    for (const seed of SEEDS) {
      const counts = hiddenRooms(createInitialGameState(seed))
        .map((room) => room.itemsCount)
        .sort((a, b) => a - b);

      expect(counts).toEqual([...EXPECTED_ITEM_COUNTS]);
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

  it('начинает партию без Чужих на поле и с 5 жетонами Яиц (стр. 6, шаг 9)', () => {
    const state = createInitialGameState('nemesis-alpha');

    expect(state.intrudersPool.boardEntities).toEqual([]);
    expect(state.intrudersPool.deadEntities).toEqual([]);
    expect(state.intrudersPool.eggsCountOnBoard).toBe(5);
  });
});

describe('createInitialGameState: экипаж и стартовые условия', () => {
  it('ставит единственного игрока в Криогенный отсек (стр. 8, шаг 20)', () => {
    const state = createInitialGameState('nemesis-alpha');
    const player = state.players['player-1'];

    expect(player).toBeDefined();
    expect(player?.roomId).toBe(11);
    expect(state.ship.rooms[11]?.occupantPlayerIds).toContain('player-1');
  });

  it('кладёт синий жетон Трупа в Криогенный отсек', () => {
    const state = createInitialGameState('nemesis-alpha');

    expect(state.ship.rooms[11]?.droppedObjectIds).toContain('CORPSE_BLUE');
  });

  it('выкладывает все Спасательные Капсулы заблокированными и пустыми (стр. 26)', () => {
    const state = createInitialGameState('nemesis-alpha');

    for (const pod of Object.values(state.ship.escapePods)) {
      expect(pod.isLocked).toBe(true);
      expect(pod.occupantIds).toEqual([]);
    }
  });
});

/**
 * Известные расхождения с книгой правил.
 *
 * Написаны как `it.fails`: они фиксируют ожидаемое по правилам поведение и
 * одновременно служат списком дефектов. Когда дефект исправят, тест начнёт
 * проходить и Vitest сообщит, что маркер «ожидаемого падения» пора снять.
 */
describe('createInitialGameState: известные расхождения с правилами', () => {
  it.fails('использует 2 Спасательные Капсулы для партии на 1–2 игроков (стр. 6, шаг 7) — P1-14 аудита', () => {
    const state = createInitialGameState('nemesis-alpha');

    expect(Object.keys(state.ship.escapePods)).toHaveLength(2);
  });

  it.fails('выбирает карту Координат случайно из пула (стр. 6, шаг 5) — P1-15 аудита', () => {
    const destinations = new Set(SEEDS.map((seed) => createInitialGameState(seed).ship.coordinates.destination));

    expect(destinations.size).toBeGreaterThan(1);
  });

  it.fails('держит в каждом Машинном отсеке ровно один исправный жетон из двух (стр. 6, шаг 8) — P1-16 аудита', () => {
    const violations: string[] = [];

    for (const seed of SEEDS) {
      const engines = createInitialGameState(seed).ship.engines;

      for (const engineNumber of [1, 2, 3] as const) {
        const engine = engines[engineNumber];

        if (engine.topWorking === engine.bottomWorking) {
          violations.push(`${seed}: двигатель ${engineNumber}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
