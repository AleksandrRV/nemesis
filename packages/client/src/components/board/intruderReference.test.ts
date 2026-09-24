import { describe, expect, it } from 'vitest';
import { INTRUDER_COLORS } from './intruderShapes';
import {
  HIVE_DEFINITION_ID,
  HIVE_EGGS_CAPACITY,
  INTRUDER_CLASS_REFERENCE,
  INTRUDER_NAMES_RU,
  SURPRISE_ATTACK_RULE_RU,
} from './intruderReference';

describe('intruderReference', () => {
  it('названия всех типов жетонов непустые, включая Пустой', () => {
    const types = Object.keys(INTRUDER_NAMES_RU) as Array<keyof typeof INTRUDER_NAMES_RU>;
    expect(types).toHaveLength(6);
    for (const type of types) expect(INTRUDER_NAMES_RU[type].length).toBeGreaterThan(0);
    expect(INTRUDER_NAMES_RU.BLANK).toBe('Пустой жетон');
  });

  it('справочник классов: ровно 5 карточек, уникальные типы, цвета совпадают с картой', () => {
    expect(INTRUDER_CLASS_REFERENCE).toHaveLength(5);
    const types = INTRUDER_CLASS_REFERENCE.map((entry) => entry.type);
    expect(new Set(types).size).toBe(5);
    expect(types).toEqual(['LARVA', 'CREEPER', 'ADULT', 'BREEDER', 'QUEEN']);

    for (const entry of INTRUDER_CLASS_REFERENCE) {
      expect(entry.name).toBe(INTRUDER_NAMES_RU[entry.type]);
      expect(entry.color).toBe(INTRUDER_COLORS[entry.type]);
      expect(entry.toughnessLabel.length).toBeGreaterThan(0);
      expect(entry.attacksLabel.length).toBeGreaterThan(0);
      expect(entry.note.length).toBeGreaterThan(0);
    }
  });

  it('лимиты миниатюр соответствуют коробке: 6/3/8/2/1 (INTRUDERS §4)', () => {
    const limits = Object.fromEntries(INTRUDER_CLASS_REFERENCE.map((entry) => [entry.type, entry.miniatureLimit]));
    expect(limits).toEqual({ LARVA: 6, CREEPER: 3, ADULT: 8, BREEDER: 2, QUEEN: 1 });
  });

  it('стойкость доминантных классов — 2 карты Атаки суммой', () => {
    for (const entry of INTRUDER_CLASS_REFERENCE) {
      if (entry.type === 'BREEDER' || entry.type === 'QUEEN') {
        expect(entry.toughnessLabel).toContain('2 карты Атаки');
      }
      if (entry.type === 'LARVA') {
        expect(entry.toughnessLabel).toContain('без карты Атаки');
      }
    }
  });

  it('Улей в данных комнаты — NEST, кладка вмещает 8 яиц', () => {
    expect(HIVE_DEFINITION_ID).toBe('NEST');
    expect(HIVE_EGGS_CAPACITY).toBe(8);
  });

  it('памятка Внезапной Атаки — только правило, без оборотов конкретных жетонов', () => {
    expect(SURPRISE_ATTACK_RULE_RU).toContain('Внезапная Атака');
    expect(SURPRISE_ATTACK_RULE_RU).toContain('строго меньше');
    // Числа 2/3/4 — возможные обороты жетонов: справочник их не раскрывает.
    expect(SURPRISE_ATTACK_RULE_RU).not.toMatch(/Личинка.*\d|Трутень.*\d|Королева.*\d/);
  });
});
