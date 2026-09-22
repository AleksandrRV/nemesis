import { describe, expect, it } from 'vitest';
import { createInitialGameState, filterStateForPlayer, type IntruderEntity } from '@nemesis/shared';
import {
  groupIntrudersByRoom,
  intrudersInRoom,
  isActivePlayerInCombat,
  layoutIntruderBadges,
  layoutIntruderGrid,
} from './intruderMapModel';

function intruder(id: string, type: IntruderEntity['type'], roomId: number, woundsCount = 0): IntruderEntity {
  return { id, type, roomId, woundsCount };
}

describe('Группировка Чужих по отсекам', () => {
  it('считает миниатюры по типам и суммирует раны', () => {
    const badges = groupIntrudersByRoom([
      intruder('a1', 'ADULT', 11),
      intruder('a2', 'ADULT', 11, 2),
      intruder('l1', 'LARVA', 11, 1),
      intruder('a3', 'ADULT', 12, 3),
    ]);

    expect(badges.get(11)).toEqual([
      { type: 'LARVA', count: 1, wounds: 1 },
      { type: 'ADULT', count: 2, wounds: 2 },
    ]);
    expect(badges.get(12)).toEqual([{ type: 'ADULT', count: 1, wounds: 3 }]);
    expect(badges.get(13)).toBeUndefined();
  });

  it('сортирует типы от Личинки к Королеве', () => {
    const badges = groupIntrudersByRoom([
      intruder('q1', 'QUEEN', 5),
      intruder('c1', 'CREEPER', 5),
      intruder('l1', 'LARVA', 5),
      intruder('b1', 'BREEDER', 5),
      intruder('a1', 'ADULT', 5),
    ]);

    expect(badges.get(5)?.map((badge) => badge.type)).toEqual(['LARVA', 'CREEPER', 'ADULT', 'BREEDER', 'QUEEN']);
  });

  it('отдаёт Чужих отсека в порядке показа типов', () => {
    const list = [intruder('q1', 'QUEEN', 7, 1), intruder('a1', 'ADULT', 7), intruder('a2', 'ADULT', 9)];

    expect(intrudersInRoom(list, 7).map((entry) => entry.id)).toEqual(['a1', 'q1']);
    expect(intrudersInRoom(list, 9).map((entry) => entry.id)).toEqual(['a2']);
    expect(intrudersInRoom(list, 13)).toEqual([]);
  });
});

describe('Статус Боя по публичному состоянию (стр. 18)', () => {
  it('активный персонаж в Бою, когда в его отсеке есть Чужой', () => {
    const raw = createInitialGameState('combat-view');
    raw.intrudersPool.boardTokens.push(intruder('adult-1', 'ADULT', raw.players['player-1']!.roomId));
    raw.ship.rooms[raw.players['player-1']!.roomId]!.occupantIntruderIds.push('adult-1');
    const view = filterStateForPlayer(raw, 'player-1');

    expect(isActivePlayerInCombat(view)).toBe(true);
  });

  it('без Чужих в отсеке Боя нет; погибший персонаж не в Бою', () => {
    const raw = createInitialGameState('combat-view-empty');
    const view = filterStateForPlayer(raw, 'player-1');
    expect(isActivePlayerInCombat(view)).toBe(false);

    raw.players['player-1']!.isDead = true;
    const afterDeath = filterStateForPlayer(raw, 'player-1');
    expect(isActivePlayerInCombat(afterDeath)).toBe(false);
  });
});

describe('Раскладка строки бейджей', () => {
  it('короткая строка масштаба 1 с правильными сдвигами (масштаб класса учтён)', () => {
    const layout = layoutIntruderBadges([
      { type: 'LARVA', count: 1, wounds: 0 },
      { type: 'ADULT', count: 1, wounds: 2 },
    ]);

    expect(layout.scale).toBe(1);
    // Личинка 26 × 0.9 = 23.4, Взрослая с ранами 40 × 1 = 40, зазор 4.
    expect(layout.width).toBeCloseTo(23.4 + 4 + 40, 10);
    expect(layout.items[0]!.x).toBe(0);
    expect(layout.items[1]!.x).toBeCloseTo(27.4, 10);
  });

  it('доминантные классы шире: Трутень и Королева получают увеличенный масштаб', () => {
    const queen = layoutIntruderBadges([{ type: 'QUEEN', count: 1, wounds: 0 }]);
    const adult = layoutIntruderBadges([{ type: 'ADULT', count: 1, wounds: 0 }]);

    expect(queen.width).toBeCloseTo(26 * 1.3, 10);
    expect(adult.width).toBeCloseTo(26, 10);
  });

  it('при переполнении сжимается целиком до максимальной ширины', () => {
    const layout = layoutIntruderBadges(
      [
        { type: 'LARVA', count: 2, wounds: 1 },
        { type: 'CREEPER', count: 1, wounds: 0 },
        { type: 'ADULT', count: 3, wounds: 4 },
        { type: 'BREEDER', count: 1, wounds: 0 },
        { type: 'QUEEN', count: 1, wounds: 2 },
      ],
      88,
    );

    expect(layout.width).toBeGreaterThan(88);
    expect(layout.scale).toBeCloseTo(88 / layout.width, 10);
    expect(layout.items).toHaveLength(5);
  });
});

describe('Адаптивная сетка миниатюр (Шаг 8)', () => {
  it('один-два типа — одна строка', () => {
    const rows = layoutIntruderGrid([
      { type: 'ADULT', count: 1, wounds: 0 },
      { type: 'QUEEN', count: 1, wounds: 1 },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]!.items).toHaveLength(2);
  });

  it('три и больше типов — стопка из двух строк без потери бейджей', () => {
    const rows = layoutIntruderGrid([
      { type: 'LARVA', count: 1, wounds: 0 },
      { type: 'CREEPER', count: 1, wounds: 0 },
      { type: 'ADULT', count: 2, wounds: 0 },
      { type: 'BREEDER', count: 1, wounds: 1 },
      { type: 'QUEEN', count: 1, wounds: 0 },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]!.items.map((item) => item.badge.type)).toEqual(['LARVA', 'CREEPER']);
    expect(rows[1]!.items.map((item) => item.badge.type)).toEqual(['ADULT', 'BREEDER', 'QUEEN']);
    expect(rows.every((row) => row.scale <= 1)).toBe(true);
  });

  it('каждая строка сетки сжимается независимо', () => {
    const rows = layoutIntruderGrid(
      [
        { type: 'ADULT', count: 1, wounds: 3 },
        { type: 'BREEDER', count: 1, wounds: 2 },
        { type: 'QUEEN', count: 1, wounds: 1 },
      ],
      60,
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]!.scale).toBeLessThan(1);
    expect(rows[1]!.scale).toBe(1);
  });
});
