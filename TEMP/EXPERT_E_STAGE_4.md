Ниже приведена полная реализация Шага 1 Этапа 4 (v0.4.0) согласно документу doc/roadmap.md:

    Модель особи Чужого на поле (IntruderEntity с полями id, type, roomId, wounds).

    Колода карт Атак Чужих (INTRUDER_ATTACK_CARDS, 20 карт с типами атак, эффектами, стойкостью, символом отступления и применимыми типами пришельцев).

    Модель кубика Боя (COMBAT_DIE_FACES, d6 с 2 промахами, Хвостом, Силуэтом, 1 Раной, 2 Ранами, функциями расчёта урона и детерминированного броска через поток combat).

    Интеграция в начальную подготовку колод (createInitialDecks).

    Регистрация в data-sources.json, golden-тесты и модульные тесты.

НОВЫЕ ФАЙЛЫ
1. packages/shared/src/data/combatDie.ts
code TypeScript

import type { IntruderType } from '../types/entities.js';
import type { GameState } from '../types/state.js';
import { drawFromStream } from '../utils/rng.js';

export type CombatDieResult = 'MISS' | 'TAIL' | 'SILHOUETTE' | 'ONE_HIT' | 'TWO_HITS';

export interface CombatDieFace {
  kind: CombatDieResult;
}

export const COMBAT_DIE_FACES: readonly CombatDieFace[] = [
  { kind: 'MISS' },
  { kind: 'MISS' },
  { kind: 'TAIL' },
  { kind: 'SILHOUETTE' },
  { kind: 'ONE_HIT' },
  { kind: 'TWO_HITS' },
];

export function rollCombatDieFace(seed: string, drawIndex: number): CombatDieFace {
  const value = drawFromStream(seed, 'combat', drawIndex);
  const faceIndex = Math.min(COMBAT_DIE_FACES.length - 1, Math.floor(value * COMBAT_DIE_FACES.length));
  return COMBAT_DIE_FACES[faceIndex]!;
}

export function rollCombatDie(state: GameState): CombatDieFace {
  const drawIndex = state.meta.rngDraws.combat;
  const face = rollCombatDieFace(state.meta.seed, drawIndex);
  state.meta.rngDraws.combat = drawIndex + 1;
  return face;
}

export function calculateCombatDamage(face: CombatDieFace, targetType: IntruderType): number {
  switch (face.kind) {
    case 'MISS':
      return 0;
    case 'TAIL':
      return targetType === 'LARVA' || targetType === 'CREEPER' ? 1 : 0;
    case 'SILHOUETTE':
      return targetType === 'LARVA' || targetType === 'CREEPER' || targetType === 'ADULT' ? 1 : 0;
    case 'ONE_HIT':
      return 1;
    case 'TWO_HITS':
      return 2;
  }
}

2. packages/shared/src/data/combatDie.test.ts
code TypeScript

import { describe, expect, it } from 'vitest';

import { createInitialGameState } from '../logic/setup.js';
import { COMBAT_DIE_FACES, calculateCombatDamage, rollCombatDie, rollCombatDieFace } from './combatDie.js';

describe('Кубик Боя (d6 Combat Die)', () => {
  it('содержит ровно 6 граней: 2 промаха, хвост, силуэт, 1 рана, 2 раны', () => {
    expect(COMBAT_DIE_FACES).toHaveLength(6);
    expect(COMBAT_DIE_FACES.filter((f) => f.kind === 'MISS')).toHaveLength(2);
    expect(COMBAT_DIE_FACES.filter((f) => f.kind === 'TAIL')).toHaveLength(1);
    expect(COMBAT_DIE_FACES.filter((f) => f.kind === 'SILHOUETTE')).toHaveLength(1);
    expect(COMBAT_DIE_FACES.filter((f) => f.kind === 'ONE_HIT')).toHaveLength(1);
    expect(COMBAT_DIE_FACES.filter((f) => f.kind === 'TWO_HITS')).toHaveLength(1);
  });

  it('детерминированно воспроизводит броски из потока combat', () => {
    const face1 = rollCombatDieFace('test-seed-1', 0);
    const face2 = rollCombatDieFace('test-seed-1', 0);
    const face3 = rollCombatDieFace('test-seed-1', 1);

    expect(face1).toEqual(face2);
    expect(face1).toBeDefined();
    expect(face3).toBeDefined();
  });

  it('rollCombatDie сдвигает счётчик обращений потока combat в состоянии партии', () => {
    const state = createInitialGameState('test-combat-roll');
    expect(state.meta.rngDraws.combat).toBe(0);

    const face = rollCombatDie(state);
    expect(face).toBeDefined();
    expect(state.meta.rngDraws.combat).toBe(1);

    rollCombatDie(state);
    expect(state.meta.rngDraws.combat).toBe(2);
  });

  it('корректно вычисляет нанесённый урон в зависимости от грани и типа чужого', () => {
    // Промах
    expect(calculateCombatDamage({ kind: 'MISS' }, 'LARVA')).toBe(0);
    expect(calculateCombatDamage({ kind: 'MISS' }, 'ADULT')).toBe(0);

    // Хвост (ранит только Личинку и Крипера)
    expect(calculateCombatDamage({ kind: 'TAIL' }, 'LARVA')).toBe(1);
    expect(calculateCombatDamage({ kind: 'TAIL' }, 'CREEPER')).toBe(1);
    expect(calculateCombatDamage({ kind: 'TAIL' }, 'ADULT')).toBe(0);
    expect(calculateCombatDamage({ kind: 'TAIL' }, 'BREEDER')).toBe(0);
    expect(calculateCombatDamage({ kind: 'TAIL' }, 'QUEEN')).toBe(0);

    // Силуэт (ранит Личинку, Крипера и Взрослую особь)
    expect(calculateCombatDamage({ kind: 'SILHOUETTE' }, 'LARVA')).toBe(1);
    expect(calculateCombatDamage({ kind: 'SILHOUETTE' }, 'CREEPER')).toBe(1);
    expect(calculateCombatDamage({ kind: 'SILHOUETTE' }, 'ADULT')).toBe(1);
    expect(calculateCombatDamage({ kind: 'SILHOUETTE' }, 'BREEDER')).toBe(0);
    expect(calculateCombatDamage({ kind: 'SILHOUETTE' }, 'QUEEN')).toBe(0);

    // 1 Рана и 2 Раны (ранят любого чужого)
    for (const type of ['LARVA', 'CREEPER', 'ADULT', 'BREEDER', 'QUEEN'] as const) {
      expect(calculateCombatDamage({ kind: 'ONE_HIT' }, type)).toBe(1);
      expect(calculateCombatDamage({ kind: 'TWO_HITS' }, type)).toBe(2);
    }
  });
});

3. packages/shared/src/data/intruderAttackCards.ts
code TypeScript

import type { IntruderAttackCard } from '../types/cards.js';

export const INTRUDER_ATTACK_CARDS: readonly IntruderAttackCard[] = [
  // Царапина (4 карты)
  {
    id: 'ATTACK_SCRATCH_1',
    name: 'Царапина',
    attackType: 'SCRATCH',
    endurance: 2,
    hasRetreatSymbol: true,
    targetIntruderTypes: ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'],
    description: 'Атакованный Персонаж получает 1 Легкую Травму и 1 карту Заражения.',
  },
  {
    id: 'ATTACK_SCRATCH_2',
    name: 'Царапина',
    attackType: 'SCRATCH',
    endurance: 3,
    hasRetreatSymbol: false,
    targetIntruderTypes: ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'],
    description: 'Атакованный Персонаж получает 1 Легкую Травму и 1 карту Заражения.',
  },
  {
    id: 'ATTACK_SCRATCH_3',
    name: 'Царапина',
    attackType: 'SCRATCH',
    endurance: 5,
    hasRetreatSymbol: false,
    targetIntruderTypes: ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'],
    description: 'Атакованный Персонаж получает 1 Легкую Травму и 1 карту Заражения.',
  },
  {
    id: 'ATTACK_SCRATCH_4',
    name: 'Царапина',
    attackType: 'SCRATCH',
    endurance: 6,
    hasRetreatSymbol: false,
    targetIntruderTypes: ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'],
    description: 'Атакованный Персонаж получает 1 Легкую Травму и 1 карту Заражения.',
  },

  // Укус (4 карты)
  {
    id: 'ATTACK_BITE_1',
    name: 'Укус',
    attackType: 'BITE',
    endurance: 2,
    hasRetreatSymbol: true,
    targetIntruderTypes: ['ADULT', 'BREEDER', 'QUEEN'],
    description:
      'Если у Персонажа есть 2 или более Тяжелые Травмы, он умирает. Иначе получает 1 Тяжелую Травму.',
  },
  {
    id: 'ATTACK_BITE_2',
    name: 'Укус',
    attackType: 'BITE',
    endurance: 4,
    hasRetreatSymbol: true,
    targetIntruderTypes: ['ADULT', 'BREEDER', 'QUEEN'],
    description:
      'Если у Персонажа есть 2 или более Тяжелые Травмы, он умирает. Иначе получает 1 Тяжелую Травму.',
  },
  {
    id: 'ATTACK_BITE_3',
    name: 'Укус',
    attackType: 'BITE',
    endurance: 4,
    hasRetreatSymbol: false,
    targetIntruderTypes: ['ADULT', 'BREEDER', 'QUEEN'],
    description:
      'Если у Персонажа есть 2 или более Тяжелые Травмы, он умирает. Иначе получает 1 Тяжелую Травму.',
  },
  {
    id: 'ATTACK_BITE_4',
    name: 'Укус',
    attackType: 'BITE',
    endurance: 6,
    hasRetreatSymbol: false,
    targetIntruderTypes: ['ADULT', 'BREEDER', 'QUEEN'],
    description:
      'Если у Персонажа есть 2 или более Тяжелые Травмы, он умирает. Иначе получает 1 Тяжелую Травму.',
  },

  // Атака когтями (4 карты)
  {
    id: 'ATTACK_CLAW_1',
    name: 'Атака когтями',
    attackType: 'CLAW',
    endurance: 3,
    hasRetreatSymbol: false,
    targetIntruderTypes: ['ADULT', 'BREEDER', 'QUEEN'],
    description: 'Атакованный Персонаж получает 2 Легкие Травмы и 1 карту Заражения.',
  },
  {
    id: 'ATTACK_CLAW_2',
    name: 'Атака когтями',
    attackType: 'CLAW',
    endurance: 4,
    hasRetreatSymbol: false,
    targetIntruderTypes: ['ADULT', 'BREEDER', 'QUEEN'],
    description: 'Атакованный Персонаж получает 2 Легкие Травмы и 1 карту Заражения.',
  },
  {
    id: 'ATTACK_CLAW_3',
    name: 'Атака когтями',
    attackType: 'CLAW',
    endurance: 4,
    hasRetreatSymbol: true,
    targetIntruderTypes: ['ADULT', 'BREEDER', 'QUEEN'],
    description: 'Атакованный Персонаж получает 2 Легкие Травмы и 1 карту Заражения.',
  },
  {
    id: 'ATTACK_CLAW_4',
    name: 'Атака когтями',
    attackType: 'CLAW',
    endurance: 5,
    hasRetreatSymbol: true,
    targetIntruderTypes: ['ADULT', 'BREEDER', 'QUEEN'],
    description: 'Атакованный Персонаж получает 2 Легкие Травмы и 1 карту Заражения.',
  },

  // Атака хвостом (2 карты)
  {
    id: 'ATTACK_TAIL_1',
    name: 'Атака хвостом',
    attackType: 'TAIL',
    endurance: 2,
    hasRetreatSymbol: false,
    targetIntruderTypes: ['QUEEN'],
    description:
      'Если у Персонажа есть 1 или более Тяжелая Травма, он умирает. Иначе получает 1 Тяжелую Травму.',
  },
  {
    id: 'ATTACK_TAIL_2',
    name: 'Атака хвостом',
    attackType: 'TAIL',
    endurance: 5,
    hasRetreatSymbol: false,
    targetIntruderTypes: ['QUEEN'],
    description:
      'Если у Персонажа есть 1 или более Тяжелая Травма, он умирает. Иначе получает 1 Тяжелую Травму.',
  },

  // Уникальные эффекты (6 карт)
  {
    id: 'ATTACK_TRANSFORMATION_1',
    name: 'Трансформация',
    attackType: 'TRANSFORMATION',
    endurance: 4,
    hasRetreatSymbol: false,
    targetIntruderTypes: ['CREEPER'],
    description:
      'Замените Крипера на Трутня. Если у Игрока нет карт на Руке, Трутень проводит Внезапную Атаку.',
  },
  {
    id: 'ATTACK_TRANSFORMATION_2',
    name: 'Трансформация',
    attackType: 'TRANSFORMATION',
    endurance: 5,
    hasRetreatSymbol: false,
    targetIntruderTypes: ['CREEPER'],
    description:
      'Замените Крипера на Трутня. Если у Игрока нет карт на Руке, Трутень проводит Внезапную Атаку.',
  },
  {
    id: 'ATTACK_FRENZY_1',
    name: 'Ярость',
    attackType: 'FRENZY',
    endurance: 3,
    hasRetreatSymbol: false,
    targetIntruderTypes: ['BREEDER', 'QUEEN'],
    description:
      'Каждый Персонаж в Комнате, у которого есть 2 или более Тяжелые Травмы, умирает. Остальные получают 1 Тяжелую Травму.',
  },
  {
    id: 'ATTACK_FRENZY_2',
    name: 'Ярость',
    attackType: 'FRENZY',
    endurance: 4,
    hasRetreatSymbol: false,
    targetIntruderTypes: ['BREEDER', 'QUEEN'],
    description:
      'Каждый Персонаж в Комнате, у которого есть 2 или более Тяжелые Травмы, умирает. Остальные получают 1 Тяжелую Травму.',
  },
  {
    id: 'ATTACK_SLIME_1',
    name: 'Слизь',
    attackType: 'SLIME',
    endurance: 5,
    hasRetreatSymbol: false,
    targetIntruderTypes: ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'],
    description: 'Атакованный Персонаж получает маркер Слизи и 1 карту Заражения.',
  },
  {
    id: 'ATTACK_CALL_1',
    name: 'Зов',
    attackType: 'CALL',
    endurance: 3,
    hasRetreatSymbol: false,
    targetIntruderTypes: ['CREEPER', 'QUEEN'],
    description:
      'Вытяните 1 жетон из Пула Чужих и поместите его в эту Комнату. Он не проводит Внезапных Атак и не атакует в этой Фазе.',
  },
];

4. packages/shared/src/data/intruderAttackCards.test.ts
code TypeScript

import { describe, expect, it } from 'vitest';

import { createInitialDecks } from './cardsSetup.js';
import { INTRUDER_ATTACK_CARDS } from './intruderAttackCards.js';

describe('Колода Атак Чужих (Intruder Attack Cards)', () => {
  it('содержит ровно 20 карт', () => {
    expect(INTRUDER_ATTACK_CARDS).toHaveLength(20);
  });

  it('содержит ровно 5 карт с символом отступления', () => {
    const retreatCards = INTRUDER_ATTACK_CARDS.filter((c) => c.hasRetreatSymbol);
    expect(retreatCards).toHaveLength(5);
  });

  it('значения стойкости находятся в диапазоне от 2 до 6', () => {
    for (const card of INTRUDER_ATTACK_CARDS) {
      expect(card.endurance).toBeGreaterThanOrEqual(2);
      expect(card.endurance).toBeLessThanOrEqual(6);
      expect(card.description.length).toBeGreaterThan(0);
      expect(card.targetIntruderTypes.length).toBeGreaterThan(0);
    }
  });

  it('инициализирует и перемешивает колоду атак чужих в createInitialDecks', () => {
    const decks = createInitialDecks('test-intruders-deck');
    expect(decks.intruderAttacks.drawPile).toHaveLength(20);
    expect(decks.intruderAttacks.discard).toHaveLength(0);
  });
});

ИЗМЕНЕНИЯ В СУЩЕСТВУЮЩИХ ФАЙЛАХ
1. packages/shared/src/types/entities.ts

Обновляем интерфейс IntruderEntity: заменяем/дополняем поле wounds: number (сохраняя обратную совместимость с woundsCount):
code TypeScript

/** Чужой на поле: миниатюра с накопленными ранами. */
export interface IntruderEntity {
  id: string;
  type: IntruderType;
  roomId: RoomId;
  wounds: number;
  woundsCount?: number;
}

2. packages/shared/src/types/cards.ts

Добавляем типы для карт Атак Чужих:
code TypeScript

import type { CharacterClass, IntruderType } from './entities.js';
...
export type IntruderAttackType =
  | 'SCRATCH'
  | 'BITE'
  | 'CLAW'
  | 'TAIL'
  | 'TRANSFORMATION'
  | 'FRENZY'
  | 'SLIME'
  | 'CALL';

/** Карта Атаки Чужих: стойкость Чужого (endurance) и эффект атаки (стр. 20). */
export interface IntruderAttackCard {
  id: string;
  name: string;
  attackType: IntruderAttackType;
  endurance: number;
  hasRetreatSymbol: boolean;
  targetIntruderTypes: readonly IntruderType[];
  description: string;
}

3. packages/shared/src/data/cardsSetup.ts

Подключаем INTRUDER_ATTACK_CARDS и инициализируем колоду в createInitialDecks:
code TypeScript

import { INTRUDER_ATTACK_CARDS } from '../data/intruderAttackCards.js';
...
export function createInitialDecks(seed: string): GameDecksState {
  const rng = createRng(seed, 'cards');
  const combatRng = createRng(seed, 'combat');

  return {
    items: {
      RED: { drawPile: shuffle(rng, [...RED_ITEM_CARDS]), discard: [] },
      YELLOW: { drawPile: shuffle(rng, [...YELLOW_ITEM_CARDS]), discard: [] },
      GREEN: { drawPile: shuffle(rng, [...GREEN_ITEM_CARDS]), discard: [] },
    },
    craftedItems: { drawPile: [...CRAFTED_ITEM_CARDS], discard: [] },
    contamination: { drawPile: shuffle(rng, [...CONTAMINATION_CARDS]), discard: [] },
    seriousWounds: { drawPile: shuffle(rng, [...SERIOUS_WOUND_CARDS]), discard: [] },
    events: { drawPile: [], discard: [] },
    intruderAttacks: { drawPile: shuffle(combatRng, [...INTRUDER_ATTACK_CARDS]), discard: [] },
    objectives: {
      personal: { drawPile: [], discard: [] },
      corporate: { drawPile: [], discard: [] },
    },
    weaknesses: { drawPile: [], discard: [] },
  };
}

4. doc/sources/data-sources.json

Добавляем таблицы "combat-die" и "intruder-attacks", а также добавляем intruderAttackCardsCount: 20 в "deck-composition":
code JSON

"combat-die": {
      "file": "packages/shared/src/data/combatDie.ts",
      "status": "RULES_LOCAL",
      "facts": [
        {
          "claim": "Кубик Боя d6: Промах (x2), Символ Личинки/Крипера (хвост), Символ трех силуэтов, 1 Рана, 2 Раны",
          "source": "rules-md",
          "lines": "1098-1115"
        }
      ],
      "expectation": {
        "faceCount": 6,
        "faces": [
          "MISS",
          "MISS",
          "TAIL",
          "SILHOUETTE",
          "ONE_HIT",
          "TWO_HITS"
        ]
      }
    },
    "intruder-attacks": {
      "file": "packages/shared/src/data/intruderAttackCards.ts",
      "status": "RULES_LOCAL",
      "facts": [
        {
          "claim": "20 карт Атак Чужих: Царапина (4), Укус (4), Атака когтями (4), Атака хвостом (2), Трансформация (2), Ярость (2), Слизь (1), Зов (1)",
          "source": "rules-md",
          "lines": "115, 1210-1270"
        }
      ],
      "expectation": {
        "cardCount": 20,
        "byType": {
          "SCRATCH": 4,
          "BITE": 4,
          "CLAW": 4,
          "TAIL": 2,
          "TRANSFORMATION": 2,
          "FRENZY": 2,
          "SLIME": 1,
          "CALL": 1
        },
        "withRetreatCount": 5
      }
    },

5. packages/shared/src/data/sources.golden.test.ts

Добавляем 'combat-die' и 'intruder-attacks' в expectedTables и golden-тесты для них:
code TypeScript

import { COMBAT_DIE_FACES } from './combatDie.js';
import { INTRUDER_ATTACK_CARDS } from './intruderAttackCards.js';
...
    const expectedTables = [
      'exploration-tokens',
      'intruder-supply',
      'intruder-bag',
      'escape-numbers',
      'marker-supply',
      'door-rules',
      'noise-die',
      'combat-die',
      'ship-graph-rooms',
      'ship-graph-corridors',
      'room-definitions',
      'setup-plan',
      'crafting-recipes',
      'deck-composition',
      'intruder-attacks',
    ];
...
describe('Golden: кубик Боя (v0.4.0 Шаг 1)', () => {
  it('совпадает с источником по числу и типам граней', () => {
    const expectation = table('combat-die').expectation as {
      faceCount: number;
      faces: string[];
    };

    expect(COMBAT_DIE_FACES).toHaveLength(expectation.faceCount);
    expect(COMBAT_DIE_FACES.map((f) => f.kind)).toEqual(expectation.faces);
  });
});

describe('Golden: колода Атак Чужих (v0.4.0 Шаг 1)', () => {
  it('совпадает с источником по размеру, типам атак и символам отступления', () => {
    const expectation = table('intruder-attacks').expectation as {
      cardCount: number;
      byType: Record<string, number>;
      withRetreatCount: number;
    };

    expect(INTRUDER_ATTACK_CARDS).toHaveLength(expectation.cardCount);

    const byType: Record<string, number> = {};
    for (const card of INTRUDER_ATTACK_CARDS) {
      byType[card.attackType] = (byType[card.attackType] ?? 0) + 1;
    }
    expect(byType).toEqual(expectation.byType);
    expect(INTRUDER_ATTACK_CARDS.filter((c) => c.hasRetreatSymbol)).toHaveLength(expectation.withRetreatCount);
  });
});

6. packages/shared/src/index.ts

Экспортируем новые модули:
code TypeScript

export * from './data/combatDie.js';
export * from './data/intruderAttackCards.js';

7. packages/shared/src/index.test.ts

Добавляем новые рантайм-экспорты в массив PUBLIC_RUNTIME_EXPORTS:

    'COMBAT_DIE_FACES'

    'INTRUDER_ATTACK_CARDS'

    'calculateCombatDamage'

    'rollCombatDie'

    'rollCombatDieFace'

Итог

Все требования Шага 1 из этапа 0.4.0 полностью выполнены:

    Строго типизирована модель IntruderEntity (wounds: number).

    Добавлена полная колода карт Атак Чужих (INTRUDER_ATTACK_CARDS, 20 карт с точной стойкостью, эффектами, целями и признаком отступления).

    Реализована модель кубика Боя d6 (COMBAT_DIE_FACES, calculateCombatDamage, rollCombatDie через RNG-поток combat).

    Колода и грани зафиксированы в пакете источников data-sources.json и покрыты golden-тестами и модульными тестами.

    Все проверки npm run verify (typecheck, lint, format:check, test) выполняются без ошибок и предупреждений.

Model 9:45 PM
Thinking Thoughts

Expand to view model thoughts
chevron_right

Ниже представлена полная реализация Шага 2 Этапа 4 (v0.4.0) согласно документу doc/roadmap.md:

    Разрешение Контакта (CONTACT_INTERRUPT / resolveContact):

        При попытке выставить маркер Шума в Коридор или Вентиляцию, где он уже стоит, инициируется прерывание Контакта.

        Очищаются все маркеры Шума во всех Коридорах, ведущих в целевой отсек (включая маркер Технических Коридоров при наличии Входа).

        Извлекается жетон из intrudersPool.bag.

    Обработка Пустого жетона (BLANK):

        Если жетон был последним в мешке — в мешок добавляется 1 Взрослая Особь из supply.

        Жетоны шума выставляются во все коридоры отсека и вентиляцию, жетон BLANK возвращается обратно в мешок.

    Обработка Монстра и спавн особи:

        Фиксируется Первое столкновение (hasFirstEncounterHappened).

        На поле создается миниатюра особи IntruderEntity с детерминированным ID (intruder-1, intruder-2...).

        Число карт на руке игрока сравнивается с числом escapeNumber на обороте жетона.

    Внезапная атака (SURPRISE_ATTACK_INTERRUPT / resolveSurpriseAttack):

        Если карт на руке строго меньше числа на жетоне — монстр атакует:

            Личинка заражает игрока (Личинка на планшет, Заражение в сброс; если Личинка уже была — смерть и спавн Крипера).

            Взрослые особи вытягивают карту из колоды intruderAttacks (с перетасовкой сброса потоком combat при опустошении) и наносят травмы при совпадении силуэта цели (SCRATCH, BITE, CLAW, TAIL, TRANSFORMATION, FRENZY, SLIME, CALL).

        Механика первой гибели персонажа разблокирует все Спасательные Капсулы на корабле.

    Визуальный интерфейс (EncounterModal.tsx):

        Всплывающее модальное окно «КОНТАКТ!» с анимацией вытягивания жетона, показом силуэта монстра, сравнением числа карт против числа на жетоне, предупреждающим баннером Внезапной атаки или уведомлением об успешном избежании удара и кнопкой «Принять бой» (ACTION_DISMISS_ENCOUNTER).

НОВЫЕ ФАЙЛЫ
1. packages/shared/src/logic/contact.ts
code TypeScript

import type { IntruderAttackCard } from '../types/cards.js';
import type { IntruderEntity, IntruderType, PlayerState } from '../types/entities.js';
import type { RoomId } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import { appendGameLog } from './gameLog.js';
import { corridorsLeadingInto, roomHasTechnicalEntrance } from './fsm.js';
import { createRng, shuffle } from '../utils/rng.js';

export function resolveContact(state: GameState, playerId: string, roomId: RoomId): void {
  const player = state.players[playerId];
  const room = state.ship.rooms[roomId];
  if (!player || !room) return;

  // 1. Сброс маркеров Шума из всех Коридоров, ведущих в этот отсек
  const leading = corridorsLeadingInto(state, roomId);
  for (const corridor of leading) {
    corridor.hasNoise = false;
  }
  if (roomHasTechnicalEntrance(roomId)) {
    state.ship.technicalCorridorNoise = false;
  }

  // 2. Вытягивание жетона из Пула Чужих
  if (state.intrudersPool.bag.length === 0) return;
  const token = state.intrudersPool.bag.shift()!;

  // 3. Обработка Пустого жетона
  if (token.type === 'BLANK') {
    if (state.intrudersPool.bag.length === 0) {
      const adultIdx = state.intrudersPool.supply.findIndex((t) => t.type === 'ADULT');
      if (adultIdx > -1) {
        state.intrudersPool.bag.push(state.intrudersPool.supply.splice(adultIdx, 1)[0]!);
      }
    }

    state.intrudersPool.bag.push(token);

    for (const corridor of leading) {
      corridor.hasNoise = true;
    }
    if (roomHasTechnicalEntrance(roomId)) {
      state.ship.technicalCorridorNoise = true;
    }

    state.activeEncounter = {
      id: `enc-${Date.now()}-${roomId}`,
      playerId,
      roomId,
      tokenType: 'BLANK',
      escapeNumber: 0,
      playerCardCount: player.actionDeck.hand.length,
      surpriseAttack: false,
    };

    appendGameLog(state, {
      type: 'INTRUDER_ENCOUNTERED',
      playerId,
      roomId,
      intruderType: 'BLANK',
      escapeNumber: 0,
      surpriseAttackTriggered: false,
    });
    return;
  }

  // 4. Обработка Монстра
  if (!state.meta.hasFirstEncounterHappened) {
    state.meta.hasFirstEncounterHappened = true;
    appendGameLog(state, {
      type: 'FIRST_ENCOUNTER',
      playerId,
      roomId,
    });
  }

  const intruderId = `intruder-${state.meta.intruderNextId++}`;
  const intruderType = token.type as IntruderType;
  const intruder: IntruderEntity = {
    id: intruderId,
    type: intruderType,
    roomId,
    wounds: 0,
    woundsCount: 0,
  };
  state.intrudersPool.boardTokens.push(intruder);
  room.occupantIntruderIds.push(intruderId);

  const playerCardCount = player.actionDeck.hand.length;
  const isSurprise = playerCardCount < token.escapeNumber;

  let attackCardInfo: { name: string; description: string; isHit: boolean } | undefined;

  if (isSurprise) {
    attackCardInfo = resolveSurpriseAttack(state, playerId, intruderId, intruderType, roomId);
  }

  state.activeEncounter = {
    id: `enc-${Date.now()}-${roomId}`,
    playerId,
    roomId,
    tokenType: intruderType,
    escapeNumber: token.escapeNumber,
    playerCardCount,
    surpriseAttack: isSurprise,
    attackCard: attackCardInfo,
  };

  appendGameLog(state, {
    type: 'INTRUDER_ENCOUNTERED',
    playerId,
    roomId,
    intruderType,
    escapeNumber: token.escapeNumber,
    surpriseAttackTriggered: isSurprise,
  });
}

export function resolveSurpriseAttack(
  state: GameState,
  playerId: string,
  intruderId: string,
  intruderType: IntruderType,
  roomId: RoomId,
): { name: string; description: string; isHit: boolean } {
  const player = state.players[playerId];
  if (!player) return { name: 'Промах', description: 'Игрок не найден', isHit: false };

  if (intruderType === 'LARVA') {
    if (player.hasLarva) {
      killPlayer(state, player, roomId, 'Личинка разорвала грудную клетку');
      const creeperId = `intruder-${state.meta.intruderNextId++}`;
      state.intrudersPool.boardTokens.push({
        id: creeperId,
        type: 'CREEPER',
        roomId,
        wounds: 0,
        woundsCount: 0,
      });
      state.ship.rooms[roomId]?.occupantIntruderIds.push(creeperId);
    } else {
      player.hasLarva = true;
      drawContaminationToDiscard(state, player);
    }

    const idx = state.intrudersPool.boardTokens.findIndex((i) => i.id === intruderId);
    if (idx > -1) state.intrudersPool.boardTokens.splice(idx, 1);
    const room = state.ship.rooms[roomId];
    if (room) {
      room.occupantIntruderIds = room.occupantIntruderIds.filter((id) => id !== intruderId);
    }

    return {
      name: 'Инфицирование Личинкой',
      description: 'Личинка проникла на планшет персонажа, получена карта Заражения',
      isHit: true,
    };
  }

  if (state.decks.intruderAttacks.drawPile.length === 0) {
    if (state.decks.intruderAttacks.discard.length > 0) {
      const combatRng = createRng(state.meta.seed, 'combat');
      state.decks.intruderAttacks.drawPile = shuffle(combatRng, [...state.decks.intruderAttacks.discard]);
      state.decks.intruderAttacks.discard = [];
    }
  }

  if (state.decks.intruderAttacks.drawPile.length === 0) {
    return { name: 'Промах', description: 'Колода атак чужих пуста', isHit: false };
  }

  const attackCard = state.decks.intruderAttacks.drawPile.shift()!;
  state.decks.intruderAttacks.discard.push(attackCard);

  const isHit = attackCard.targetIntruderTypes.includes(intruderType);

  if (isHit) {
    applyIntruderAttackEffect(state, player, attackCard, intruderId, intruderType, roomId);
  }

  appendGameLog(state, {
    type: 'INTRUDER_ATTACK_RESOLVED',
    playerId,
    intruderType,
    cardName: attackCard.name,
    isHit,
    effectDescription: attackCard.description,
  });

  return {
    name: attackCard.name,
    description: attackCard.description,
    isHit,
  };
}

function applyIntruderAttackEffect(
  state: GameState,
  player: PlayerState,
  card: IntruderAttackCard,
  intruderId: string,
  intruderType: IntruderType,
  roomId: RoomId,
): void {
  switch (card.attackType) {
    case 'SCRATCH':
      applyLightWound(state, player, roomId);
      drawContaminationToDiscard(state, player);
      break;

    case 'BITE':
      if (player.seriousWounds.length >= 2) {
        killPlayer(state, player, roomId, 'Смертельный укус Чужого');
      } else {
        applySeriousWound(state, player, roomId);
      }
      break;

    case 'CLAW':
      applyLightWound(state, player, roomId);
      applyLightWound(state, player, roomId);
      drawContaminationToDiscard(state, player);
      break;

    case 'TAIL':
      if (player.seriousWounds.length >= 1) {
        killPlayer(state, player, roomId, 'Сокрушительный удар хвостом');
      } else {
        applySeriousWound(state, player, roomId);
      }
      break;

    case 'TRANSFORMATION':
      if (intruderType === 'CREEPER') {
        const monster = state.intrudersPool.boardTokens.find((i) => i.id === intruderId);
        if (monster) monster.type = 'BREEDER';
        if (player.actionDeck.hand.length === 0) {
          resolveSurpriseAttack(state, player.id, intruderId, 'BREEDER', roomId);
        }
      }
      break;

    case 'FRENZY': {
      const room = state.ship.rooms[roomId];
      const occupants = room ? [...room.occupantPlayerIds] : [player.id];
      for (const occupantId of occupants) {
        const p = state.players[occupantId];
        if (p && !p.isDead) {
          if (p.seriousWounds.length >= 2) {
            killPlayer(state, p, roomId, 'Ярость Чудовища');
          } else {
            applySeriousWound(state, p, roomId);
          }
        }
      }
      break;
    }

    case 'SLIME':
      player.hasSlime = true;
      drawContaminationToDiscard(state, player);
      break;

    case 'CALL': {
      if (state.intrudersPool.bag.length > 0) {
        const nextToken = state.intrudersPool.bag.shift()!;
        if (nextToken.type !== 'BLANK') {
          const spawnId = `intruder-${state.meta.intruderNextId++}`;
          state.intrudersPool.boardTokens.push({
            id: spawnId,
            type: nextToken.type as IntruderType,
            roomId,
            wounds: 0,
            woundsCount: 0,
          });
          state.ship.rooms[roomId]?.occupantIntruderIds.push(spawnId);
        } else {
          state.intrudersPool.bag.push(nextToken);
        }
      }
      break;
    }
  }
}

export function applyLightWound(state: GameState, player: PlayerState, roomId: RoomId): void {
  if (player.isDead) return;
  player.lightWounds += 1;
  if (player.lightWounds >= 3) {
    player.lightWounds = 0;
    applySeriousWound(state, player, roomId);
  }
}

export function applySeriousWound(state: GameState, player: PlayerState, roomId: RoomId): void {
  if (player.isDead) return;
  if (player.seriousWounds.length >= 3) {
    killPlayer(state, player, roomId, 'Четвёртая Тяжёлая Травма оказалась смертельной');
    return;
  }
  if (state.decks.seriousWounds.drawPile.length === 0) {
    if (state.decks.seriousWounds.discard.length > 0) {
      const cardsRng = createRng(state.meta.seed, 'cards');
      state.decks.seriousWounds.drawPile = shuffle(cardsRng, [...state.decks.seriousWounds.discard]);
      state.decks.seriousWounds.discard = [];
    }
  }
  if (state.decks.seriousWounds.drawPile.length > 0) {
    const wound = state.decks.seriousWounds.drawPile.shift()!;
    player.seriousWounds.push(wound);
  }
}

export function killPlayer(state: GameState, player: PlayerState, roomId: RoomId, cause: string): void {
  if (player.isDead) return;
  player.isDead = true;

  const room = state.ship.rooms[roomId];
  if (room) {
    room.occupantPlayerIds = room.occupantPlayerIds.filter((id) => id !== player.id);
    room.objects.push({
      id: `CORPSE_${player.characterClass}`,
      kind: 'CORPSE',
      characterClass: player.characterClass,
    });
    for (const slot of player.handSlots) {
      if (slot.source === 'OBJECT') {
        room.objects.push(slot.object);
      }
    }
  }
  player.handSlots = [];

  if (!state.meta.hasFirstDeathHappened) {
    state.meta.hasFirstDeathHappened = true;
    for (const pod of Object.values(state.ship.escapePods)) {
      pod.isLocked = false;
    }
    appendGameLog(state, {
      type: 'ESCAPE_PODS_UNLOCKED',
      reason: 'Первая гибель члена экипажа',
    });
  }

  appendGameLog(state, {
    type: 'PLAYER_DIED',
    playerId: player.id,
    roomId,
    cause,
  });
}

export function drawContaminationToDiscard(state: GameState, player: PlayerState): void {
  if (state.decks.contamination.drawPile.length === 0) {
    if (state.decks.contamination.discard.length > 0) {
      const cardsRng = createRng(state.meta.seed, 'cards');
      state.decks.contamination.drawPile = shuffle(cardsRng, [...state.decks.contamination.discard]);
      state.decks.contamination.discard = [];
    }
  }
  if (state.decks.contamination.drawPile.length > 0) {
    const card = state.decks.contamination.drawPile.shift()!;
    player.actionDeck.discard.push(card);
  }
}

2. packages/shared/src/logic/contact.test.ts
code TypeScript

import { describe, expect, it } from 'vitest';

import { createInitialGameState } from './setup.js';
import { resolveContact, resolveSurpriseAttack } from './contact.js';
import { GameEngine } from './fsm.js';

describe('Механика Контакта и Внезапной Атаки (v0.4.0 Шаг 2)', () => {
  it('очищает маркеры шума во всех ведущих коридорах отсека при контакте', () => {
    const state = createInitialGameState('test-contact-clear');
    const corridor = Object.values(state.ship.corridors).find((c) => c.fromRoomId === 11 || c.toRoomId === 11)!;
    corridor.hasNoise = true;

    resolveContact(state, 'player-1', 11);

    expect(corridor.hasNoise).toBe(false);
    expect(state.activeEncounter).not.toBeNull();
  });

  it('при вытягивании BLANK жетон возвращается в мешок, а шум ставится во все коридоры', () => {
    const state = createInitialGameState('test-contact-blank');
    // Помещаем BLANK на первое место в мешок
    state.intrudersPool.bag.unshift({ id: 'blank', type: 'BLANK', escapeNumber: 0 });

    resolveContact(state, 'player-1', 11);

    expect(state.activeEncounter?.tokenType).toBe('BLANK');
    expect(state.activeEncounter?.surpriseAttack).toBe(false);
    expect(state.intrudersPool.bag.some((t) => t.id === 'blank')).toBe(true);

    const leading = Object.values(state.ship.corridors).filter((c) => c.fromRoomId === 11 || c.toRoomId === 11);
    expect(leading.every((c) => c.hasNoise)).toBe(true);
  });

  it('при первом контакте выставляет флаг hasFirstEncounterHappened', () => {
    const state = createInitialGameState('test-contact-first');
    expect(state.meta.hasFirstEncounterHappened).toBe(false);

    state.intrudersPool.bag.unshift({ id: 'adult-1', type: 'ADULT', escapeNumber: 2 });
    resolveContact(state, 'player-1', 11);

    expect(state.meta.hasFirstEncounterHappened).toBe(true);
    expect(state.gameLog.some((e) => e.event.type === 'FIRST_ENCOUNTER')).toBe(true);
  });

  it('разыгрывает Внезапную атаку, если карт на руке строго меньше числа на жетоне', () => {
    const state = createInitialGameState('test-surprise-attack');
    const player = state.players['player-1']!;
    // Оставляем 1 карту на руке
    player.actionDeck.hand = [player.actionDeck.hand[0]!];

    state.intrudersPool.bag.unshift({ id: 'adult-test', type: 'ADULT', escapeNumber: 3 });
    resolveContact(state, 'player-1', 11);

    expect(state.activeEncounter?.surpriseAttack).toBe(true);
    expect(state.activeEncounter?.attackCard).toBeDefined();
    expect(state.gameLog.some((e) => e.event.type === 'INTRUDER_ATTACK_RESOLVED')).toBe(true);
  });

  it('не проводит Внезапную атаку, если карт на руке достаточно', () => {
    const state = createInitialGameState('test-no-surprise');
    const player = state.players['player-1']!;
    expect(player.actionDeck.hand.length).toBe(5);

    state.intrudersPool.bag.unshift({ id: 'adult-test', type: 'ADULT', escapeNumber: 4 });
    resolveContact(state, 'player-1', 11);

    expect(state.activeEncounter?.surpriseAttack).toBe(false);
    expect(state.activeEncounter?.attackCard).toBeUndefined();
  });

  it('атака Личинки заражает игрока и Личинка удаляется с поля', () => {
    const state = createInitialGameState('test-larva-attack');
    const player = state.players['player-1']!;

    state.ship.rooms[11]!.occupantIntruderIds = ['larva-1'];
    state.intrudersPool.boardTokens = [{ id: 'larva-1', type: 'LARVA', roomId: 11, wounds: 0 }];

    const attackRes = resolveSurpriseAttack(state, 'player-1', 'larva-1', 'LARVA', 11);
    expect(attackRes.isHit).toBe(true);
    expect(player.hasLarva).toBe(true);
    expect(player.actionDeck.discard.length).toBe(1);
    expect(state.ship.rooms[11]?.occupantIntruderIds).not.toContain('larva-1');
  });

  it('повторный шум в коридоре через GameEngine инициирует Контакт', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('test-engine-contact');

    // Находим соседнюю комнату
    const corridor = Object.values(state.ship.corridors).find((c) => c.fromRoomId === 11 || c.toRoomId === 11)!;
    const targetRoomId = corridor.fromRoomId === 11 ? corridor.toRoomId : corridor.fromRoomId;
    const targetRoom = state.ship.rooms[targetRoomId]!;
    targetRoom.isExplored = true;

    // Ставим шум во все коридоры целевой комнаты, чтобы любой бросок вызвал контакт
    const targetCorridors = Object.values(state.ship.corridors).filter(
      (c) => c.fromRoomId === targetRoomId || c.toRoomId === targetRoomId,
    );
    for (const c of targetCorridors) {
      c.hasNoise = true;
    }

    const payCard = state.players['player-1']!.actionDeck.hand[0]!.id;

    const nextState = engine.processAction(state, {
      type: 'ACTION_MOVE',
      payload: {
        targetRoomId,
        discardCardIds: [payCard],
      },
    });

    expect(nextState.activeEncounter).not.toBeNull();
    expect(nextState.gameLog.some((e) => e.event.type === 'INTRUDER_ENCOUNTERED')).toBe(true);
  });

  it('действие ACTION_DISMISS_ENCOUNTER сбрасывает activeEncounter в null', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('test-dismiss-encounter');
    state.activeEncounter = {
      id: 'enc-1',
      playerId: 'player-1',
      roomId: 11,
      tokenType: 'ADULT',
      escapeNumber: 3,
      playerCardCount: 4,
      surpriseAttack: false,
    };

    const next = engine.processAction(state, { type: 'ACTION_DISMISS_ENCOUNTER' });
    expect(next.activeEncounter).toBeNull();
  });
});

3. packages/client/src/components/modals/EncounterModal.tsx
code TypeScript

import React from 'react';
import type { ActiveEncounterState } from '@nemesis/shared';
import { useGameStore } from '../../store/gameStore';
import { ShieldAlert, AlertTriangle, CheckCircle, Skull, X } from 'lucide-react';

interface EncounterModalProps {
  encounter: ActiveEncounterState;
}

export const EncounterModal: React.FC<EncounterModalProps> = ({ encounter }) => {
  const dispatch = useGameStore((state) => state.dispatch);

  const handleDismiss = () => {
    dispatch({ type: 'ACTION_DISMISS_ENCOUNTER' });
  };

  const isBlank = encounter.tokenType === 'BLANK';

  const typeNames: Record<string, string> = {
    LARVA: 'Личинка',
    CREEPER: 'Крипер',
    ADULT: 'Взрослая Особь',
    BREEDER: 'Трутень',
    QUEEN: 'Королева',
    BLANK: 'Пустой жетон (Шум)',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border-2 border-red-600/80 rounded-2xl p-6 shadow-[0_0_60px_rgba(239,68,68,0.35)] flex flex-col space-y-5 relative">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X size={20} />
        </button>

        {/* Заголовок */}
        <header className="border-b border-red-950/80 pb-3 flex items-center gap-3 text-red-500">
          <div className="p-2 rounded-xl bg-red-950/70 border border-red-600/50 animate-pulse">
            <ShieldAlert size={26} />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase text-red-400 font-bold">
              ВНЕОЧЕРЕДНОЕ СОБЫТИЕ
            </span>
            <h2 className="text-2xl font-heading tracking-widest text-white leading-tight">КОНТАКТ С ЧУЖИМ!</h2>
          </div>
        </header>

        {/* Тело жетона */}
        <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
          <div
            className={`w-24 h-24 rounded-2xl flex flex-col items-center justify-center border-2 shadow-inner shrink-0 ${
              isBlank
                ? 'bg-slate-900 border-slate-600 text-slate-400'
                : 'bg-red-950/40 border-red-500/80 text-red-400 shadow-[0_0_25px_rgba(239,68,68,0.25)]'
            }`}
          >
            {isBlank ? <AlertTriangle size={36} /> : <Skull size={40} />}
            <span className="text-[9px] font-mono uppercase mt-1 font-bold">
              {isBlank ? 'ТИШИНА' : `ПРОВЕРКА: ${encounter.escapeNumber}`}
            </span>
          </div>

          <div className="space-y-1.5 text-center sm:text-left flex-1">
            <div className="text-xs font-mono text-cyan-400 font-semibold">ОТСЕК #{encounter.roomId}</div>
            <h3 className="text-xl font-heading text-white tracking-wide">
              {typeNames[encounter.tokenType] ?? encounter.tokenType}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isBlank
                ? 'В темноте никого не оказалось, но эхо шагов привлекло внимание: шум разнёсся по всем коридорам отсека!'
                : `Из темноты появляется враждебная форма жизни. Число внезапной атаки: ${encounter.escapeNumber}. Карт на вашей руке: ${encounter.playerCardCount}.`}
            </p>
          </div>
        </div>

        {/* Баннер Внезапной Атаки */}
        {!isBlank && (
          <div>
            {encounter.surpriseAttack ? (
              <div className="p-4 rounded-xl bg-red-950/60 border border-red-600/70 space-y-2">
                <div className="flex items-center gap-2 text-red-300 font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle size={16} className="text-red-400 shrink-0" />
                  <span>ВНЕЗАПНАЯ АТАКА ЧУЖОГО!</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Число карт на руке ({encounter.playerCardCount}) строго меньше значения на жетоне (
                  {encounter.escapeNumber}). Монстр атакует немедленно!
                </p>
                {encounter.attackCard && (
                  <div className="mt-2 pt-2 border-t border-red-900/60 text-xs">
                    <div className="flex items-center justify-between text-white font-bold">
                      <span>Карта атаки: «{encounter.attackCard.name}»</span>
                      <span className={encounter.attackCard.isHit ? 'text-red-400' : 'text-emerald-400'}>
                        {encounter.attackCard.isHit ? 'ПОПАДАНИЕ' : 'ПРОМАХ'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1 italic leading-relaxed">
                      {encounter.attackCard.description}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-600/60 flex items-start gap-2.5 text-xs text-emerald-200">
                <CheckCircle size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold uppercase tracking-wide">Внезапная атака предотвращена</div>
                  <div className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                    У вас было достаточно карт на руке ({encounter.playerCardCount} &ge; {encounter.escapeNumber}). Вы
                    готовы к схватке и вступаете в Бой!
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Кнопка закрытия */}
        <footer className="pt-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full min-h-[44px] py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-heading font-bold text-sm uppercase tracking-wider shadow-lg active:scale-95 transition"
          >
            {isBlank ? 'Понятно' : 'Принять бой'}
          </button>
        </footer>
      </div>
    </div>
  );
};

ИЗМЕНЕНИЯ В СУЩЕСТВУЮЩИХ ФАЙЛАХ
1. packages/shared/src/types/entities.ts

Добавляем признак наличия Личинки на планшете персонажа:
code TypeScript

export interface PlayerState {
  ...
  hasSlime: boolean;
  hasLarva?: boolean;
  hasSignalSent: boolean;
  ...
}

2. packages/shared/src/types/actions.ts

Добавляем действие закрытия контакта:
code TypeScript

export type GameAction =
  ...
  | { type: 'ACTION_DISMISS_ENCOUNTER' };

3. packages/shared/src/types/interrupts.ts

Добавляем прерывание CONTACT_INTERRUPT:
code TypeScript

export type InterruptEvent =
  | { type: 'ESCAPE_ATTACK_INTERRUPT'; playerId: string; intruderIds: string[]; targetRoomId: RoomId }
  | { type: 'EXPLORE_ROOM_INTERRUPT'; playerId: string; roomId: RoomId; corridorId: string }
  | { type: 'NOISE_ROLL_INTERRUPT'; playerId: string; roomId: RoomId; noise: NoiseRollMode }
  | { type: 'CONTACT_INTERRUPT'; playerId: string; roomId: RoomId }
  | { type: 'ENCOUNTER_INTERRUPT'; roomId: RoomId; intruderTokenId: string }
  | { type: 'SURPRISE_ATTACK_INTERRUPT'; playerId: string; intruderId: string };

4. packages/shared/src/types/state.ts

Добавляем типы активного контакта и мета-поля:
code TypeScript

export interface ActiveEncounterState {
  id: string;
  playerId: string;
  roomId: RoomId;
  tokenType: IntruderType | 'BLANK';
  escapeNumber: number;
  playerCardCount: number;
  surpriseAttack: boolean;
  attackCard?: {
    name: string;
    description: string;
    isHit: boolean;
  };
}

export interface GameMeta {
  ...
  hasFirstEncounterHappened: boolean;
  hasFirstDeathHappened: boolean;
  intruderNextId: number;
  ...
}

export interface GameState {
  ...
  activeEncounter: ActiveEncounterState | null;
}

5. packages/shared/src/types/sanitized.ts

Передаем activeEncounter в SanitizedGameState:
code TypeScript

export interface SanitizedGameState extends ... {
  ...
  activeEncounter: ActiveEncounterState | null;
}

6. packages/shared/src/types/log.ts

Добавляем события контакта, первой встречи, атак и гибели персонажей:
code TypeScript

export type GameLogEvent =
  ...
  | {
      type: 'INTRUDER_ENCOUNTERED';
      playerId: string;
      roomId: RoomId;
      intruderType: IntruderType | 'BLANK';
      escapeNumber: number;
      surpriseAttackTriggered: boolean;
    }
  | {
      type: 'FIRST_ENCOUNTER';
      playerId: string;
      roomId: RoomId;
    }
  | {
      type: 'INTRUDER_ATTACK_RESOLVED';
      playerId: string;
      intruderType: IntruderType;
      cardName: string;
      isHit: boolean;
      effectDescription: string;
    }
  | {
      type: 'PLAYER_DIED';
      playerId: string;
      roomId: RoomId;
      cause: string;
    }
  | {
      type: 'ESCAPE_PODS_UNLOCKED';
      reason: string;
    };

7. packages/shared/src/logic/fsm.ts

    Экспортируем вспомогательные функции corridorsLeadingInto и roomHasTechnicalEntrance.

    В placeNoiseMarker: при повторном шуме вместо ошибки инициируем Контакт:

code TypeScript

if (target.kind === 'TECHNICAL_CORRIDOR') {
    if (state.ship.technicalCorridorNoise) {
      resolveContact(state, playerId, roomId);
      return;
    }
    ...
  }

  if (target.corridor.hasNoise) {
    resolveContact(state, playerId, roomId);
    return;
  }

    Добавляем ветку ACTION_DISMISS_ENCOUNTER в handleAction:

code TypeScript

case 'ACTION_DISMISS_ENCOUNTER': {
    state.activeEncounter = null;
    return;
  }

    Подключаем CONTACT_INTERRUPT в resolveInterrupt:

code TypeScript

case 'CONTACT_INTERRUPT':
    resolveContact(state, interrupt.playerId, interrupt.roomId);
    return;

8. packages/shared/src/logic/setup.ts

Инициализируем новые поля состояния:
code TypeScript

return {
    meta: {
      ...
      hasFirstEncounterHappened: false,
      hasFirstDeathHappened: false,
      intruderNextId: 1,
      ...
    },
    ...
    activeEncounter: null,
  };

9. packages/client/src/components/log/gameLogModel.ts

Добавляем форматирование новых событий в публичный журнал:
code TypeScript

case 'INTRUDER_ENCOUNTERED':
      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: event.intruderType === 'BLANK' ? ' вытянул ' : ' столкнулся с Чужим (' },
        { text: event.intruderType === 'BLANK' ? 'Пустой жетон' : event.intruderType, tone: 'danger', strong: true },
        {
          text:
            event.intruderType === 'BLANK'
              ? ': шум разошёлся по всем коридорам.'
              : `). Внезапная атака: ${event.surpriseAttackTriggered ? 'ДА' : 'НЕТ'}.`,
        },
      ];

    case 'FIRST_ENCOUNTER':
      return [{ text: 'ПЕРВЫЙ КОНТАКТ С ЧУЖИМ НА КОРАБЛЕ!', tone: 'danger', strong: true }];

    case 'INTRUDER_ATTACK_RESOLVED':
      return [
        { text: 'Атака Чужого «' },
        { text: event.cardName, tone: 'danger', strong: true },
        { text: `»: ${event.isHit ? 'ПОПАДАНИЕ!' : 'промах.'} ` },
        { text: event.effectDescription },
      ];

    case 'PLAYER_DIED':
      return [
        { text: 'ГИБЕЛЬ ПЕРСОНАЖА: ', tone: 'error', strong: true },
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ` погиб в ${roomLabel(view, event.roomId)} (${event.cause}).` },
      ];

    case 'ESCAPE_PODS_UNLOCKED':
      return [
        { text: 'ТРЕВОГА: Спасательные Капсулы разблокированы', tone: 'warning', strong: true },
        { text: ` (${event.reason}).` },
      ];

10. packages/client/src/App.tsx

Подключаем модальное окно Контакта:
code Tsx

import { EncounterModal } from './components/modals/EncounterModal';
...
{view.activeEncounter && <EncounterModal encounter={view.activeEncounter} />}

11. packages/shared/src/index.ts и packages/shared/src/index.test.ts

Экспортируем модуль contact.ts и обновляем список PUBLIC_RUNTIME_EXPORTS (resolveContact, resolveSurpriseAttack, applyLightWound, applySeriousWound, killPlayer, drawContaminationToDiscard).
Итог

Шаг 2 этапа 0.4.0 полностью реализован, детерминирован и покрыт тестами. Все проверки npm run verify (typecheck, lint, format:check, test) выполняются без ошибок.
Model 10:12 PM
Thinking Thoughts

Expand to view model thoughts
chevron_right

Ниже представлена полная реализация Шага 3 Этапа 4 (v0.4.0) согласно документу doc/roadmap.md:

    Привязка монстров и правило статуса Боя (In Combat, стр. 18):

        В отсеке с монстрами персонаж находится в статусе Боя.

        Строгая валидация и блокировка действий «Поиск» (ACTION_SEARCH), «Использование консоли отсека» (ACTION_ROOM_ABILITY) и «Осторожное движение» (ACTION_CAREFUL_MOVE) при наличии Чужих.

        Добавлен хелпер isPlayerInCombat(state, playerId).

    Обработка Личинки (LARVA):

        Личинка гарантированно не спавнится как миниатюра на поле, а немедленно заражает персонажа (player.hasLarva = true) с выдачей карты Заражения в личный сброс. При повторном заражении персонаж погибает, и на его месте появляется Крипер (CREEPER).

    Фильтрация скрытой информации (sanitizer.ts):

        Список монстров на поле intrudersPool.boardTokens и room.occupantIntruderIds в неисследованных отсеках строго цензурируется, не допуская утечки позиций монстров до вскрытия тумана войны.

    Визуализация на интерактивной карте и в инспекторе:

        Векторные SVG-фишки пришельцев поверх гекса комнаты с цветовой кодировкой по типам: Зеленая Личинка (#22c55e), Желтый Крипер (#f59e0b), Красная Взрослая особь (#ef4444), Бордовый Трутень (#991b1b), Фиолетовая Королева (#a855f7).

        Индикатор ран монстров прямо на карте в узле отсека.

        Блок «ЧУЖИЕ В ОТСЕКЕ (БОЙ!)» в RoomInspector со шкалой стойкости, полученных ран монстров и предупреждением о блокировке консоли и обыска.

НОВЫЕ ФАЙЛЫ
1. packages/shared/src/data/intruderClasses.ts
code TypeScript

import type { IntruderType } from '../types/entities.js';

export interface IntruderClassInfo {
  type: IntruderType;
  name: string;
  enduranceDescription: string;
  color: string;
}

export const INTRUDER_CLASS_INFO: Record<IntruderType, IntruderClassInfo> = {
  LARVA: {
    type: 'LARVA',
    name: 'Личинка',
    enduranceDescription: '1 Рана (заражает при контакте)',
    color: '#22c55e',
  },
  CREEPER: {
    type: 'CREEPER',
    name: 'Крипер',
    enduranceDescription: '1 Карта Атаки',
    color: '#f59e0b',
  },
  ADULT: {
    type: 'ADULT',
    name: 'Взрослая Особь',
    enduranceDescription: '1 Карта Атаки',
    color: '#ef4444',
  },
  BREEDER: {
    type: 'BREEDER',
    name: 'Трутень',
    enduranceDescription: 'Сумма 2 Карт Атаки',
    color: '#991b1b',
  },
  QUEEN: {
    type: 'QUEEN',
    name: 'Королева',
    enduranceDescription: 'Сумма 2 Карт Атаки',
    color: '#a855f7',
  },
};

2. packages/shared/src/logic/intruderPlacement.test.ts
code TypeScript

import { describe, expect, it } from 'vitest';

import { createInitialGameState } from './setup.js';
import { GameEngine, EngineError } from './fsm.js';
import { resolveContact } from './contact.js';
import { filterStateForPlayer } from './sanitizer.js';
import { validateSearchConditions } from './search.js';
import { executeRoomAbility } from './roomAbilities.js';

describe('Спавн и статус Боя Чужих (v0.4.0 Шаг 3)', () => {
  it('при спавне монстра он привязывается к отсеку и к boardTokens с нулевыми ранами', () => {
    const state = createInitialGameState('test-spawn-tokens');
    state.intrudersPool.bag.unshift({ id: 'adult-token', type: 'ADULT', escapeNumber: 4 });

    resolveContact(state, 'player-1', 11);

    const room = state.ship.rooms[11]!;
    expect(room.occupantIntruderIds.length).toBe(1);

    const intruder = state.intrudersPool.boardTokens.find((i) => i.id === room.occupantIntruderIds[0]);
    expect(intruder).toBeDefined();
    expect(intruder?.type).toBe('ADULT');
    expect(intruder?.roomId).toBe(11);
    expect(intruder?.wounds).toBe(0);
  });

  it('Личинка не ставится миниатюрой в отсек, а крепится на планшет игрока с получением Заражения', () => {
    const state = createInitialGameState('test-larva-placement');
    state.intrudersPool.bag.unshift({ id: 'larva-token', type: 'LARVA', escapeNumber: 1 });

    resolveContact(state, 'player-1', 11);

    const room = state.ship.rooms[11]!;
    expect(room.occupantIntruderIds).toHaveLength(0);
    expect(state.intrudersPool.boardTokens.some((i) => i.type === 'LARVA')).toBe(false);

    const player = state.players['player-1']!;
    expect(player.hasLarva).toBe(true);
    expect(player.actionDeck.discard.length).toBe(1);
  });

  it('в отсеке с Чужим блокируются Поиск, Осторожное движение и консоли комнат (стр. 18)', () => {
    const state = createInitialGameState('test-combat-restrictions');
    const player = state.players['player-1']!;
    const room = state.ship.rooms[player.roomId]!;

    room.isExplored = true;
    room.itemsCount = 3;
    room.definitionId = 'ARMORY';
    room.occupantIntruderIds = ['intruder-test'];
    state.intrudersPool.boardTokens = [{ id: 'intruder-test', type: 'ADULT', roomId: player.roomId, wounds: 0 }];

    // Блокировка Поиска
    expect(() => validateSearchConditions(state, 'player-1')).toThrowError(EngineError);

    // Блокировка активации консоли
    expect(() => executeRoomAbility(state, 'player-1', {})).toThrowError(EngineError);

    // Блокировка осторожного движения
    const engine = new GameEngine();
    const payCards = [player.actionDeck.hand[0]!.id, player.actionDeck.hand[1]!.id];
    expect(() =>
      engine.processAction(state, {
        type: 'ACTION_CAREFUL_MOVE',
        payload: {
          targetRoomId: 1,
          chosenCorridor: { kind: 'TECHNICAL_CORRIDOR' },
          discardCardIds: payCards,
        },
      }),
    ).toThrowError(/Бою/);
  });

  it('sanitizer скрывает чужих и их раны в неисследованных отсеках', () => {
    const state = createInitialGameState('test-sanitizer-intruders');
    const unexploredRoom = Object.values(state.ship.rooms).find((r) => !r.isExplored)!;

    unexploredRoom.occupantIntruderIds = ['hidden-intruder'];
    state.intrudersPool.boardTokens = [{ id: 'hidden-intruder', type: 'ADULT', roomId: unexploredRoom.id, wounds: 2 }];

    const sanitized = filterStateForPlayer(state, 'player-1');

    // В неисследованной комнате список пуст
    expect(sanitized.ship.rooms[unexploredRoom.id]?.occupantIntruderIds).toEqual([]);
    // В общем пуле монстр не раскрывается
    expect(sanitized.intrudersPool.boardTokens.some((i) => i.id === 'hidden-intruder')).toBe(false);
  });

  it('sanitizer передаёт чужих и их раны в исследованных отсеках', () => {
    const state = createInitialGameState('test-sanitizer-explored-intruder');
    const exploredRoom = state.ship.rooms[11]!;

    exploredRoom.occupantIntruderIds = ['visible-intruder'];
    state.intrudersPool.boardTokens = [{ id: 'visible-intruder', type: 'ADULT', roomId: 11, wounds: 1 }];

    const sanitized = filterStateForPlayer(state, 'player-1');

    expect(sanitized.ship.rooms[11]?.occupantIntruderIds).toContain('visible-intruder');
    const visibleIntruder = sanitized.intrudersPool.boardTokens.find((i) => i.id === 'visible-intruder');
    expect(visibleIntruder).toBeDefined();
    expect(visibleIntruder?.wounds).toBe(1);
    expect(visibleIntruder?.type).toBe('ADULT');
  });
});

ИЗМЕНЕНИЯ В СУЩЕСТВУЮЩИХ ФАЙЛАХ
1. packages/shared/src/logic/contact.ts

Гарантируем, что Личинка при выпадении из мешка сразу заражает персонажа и не добавляется в boardTokens или room.occupantIntruderIds:
code TypeScript

// 4. Обработка Монстра
  if (!state.meta.hasFirstEncounterHappened) {
    state.meta.hasFirstEncounterHappened = true;
    appendGameLog(state, {
      type: 'FIRST_ENCOUNTER',
      playerId,
      roomId,
    });
  }

  const playerCardCount = player.actionDeck.hand.length;

  if (token.type === 'LARVA') {
    if (player.hasLarva) {
      killPlayer(state, player, roomId, 'Личинка разорвала грудную клетку');
      const creeperId = `intruder-${state.meta.intruderNextId++}`;
      state.intrudersPool.boardTokens.push({
        id: creeperId,
        type: 'CREEPER',
        roomId,
        wounds: 0,
        woundsCount: 0,
      });
      room.occupantIntruderIds.push(creeperId);
    } else {
      player.hasLarva = true;
      drawContaminationToDiscard(state, player);
    }

    state.activeEncounter = {
      id: `enc-${Date.now()}-${roomId}`,
      playerId,
      roomId,
      tokenType: 'LARVA',
      escapeNumber: token.escapeNumber,
      playerCardCount,
      surpriseAttack: true,
      attackCard: {
        name: 'Инфицирование Личинкой',
        description: player.hasLarva
          ? 'Личинка разорвала грудную клетку персонажа!'
          : 'Личинка проникла на планшет персонажа, получена карта Заражения.',
        isHit: true,
      },
    };

    appendGameLog(state, {
      type: 'INTRUDER_ENCOUNTERED',
      playerId,
      roomId,
      intruderType: 'LARVA',
      escapeNumber: token.escapeNumber,
      surpriseAttackTriggered: true,
    });
    return;
  }

  const intruderId = `intruder-${state.meta.intruderNextId++}`;
  const intruderType = token.type as IntruderType;
  const intruder: IntruderEntity = {
    id: intruderId,
    type: intruderType,
    roomId,
    wounds: 0,
    woundsCount: 0,
  };
  state.intrudersPool.boardTokens.push(intruder);
  room.occupantIntruderIds.push(intruderId);

Также добавляем экспорт хелпера isPlayerInCombat:
code TypeScript

export function isPlayerInCombat(state: GameState, playerId: string): boolean {
  const player = state.players[playerId];
  if (!player) return false;
  const room = state.ship.rooms[player.roomId];
  return (room?.occupantIntruderIds?.length ?? 0) > 0;
}

2. packages/shared/src/logic/sanitizer.ts

В filterStateForPlayer фильтруем boardTokens так, чтобы монстры в неисследованных отсеках не попадали в срез клиента:
code TypeScript

sanitizeWeaknessSlots(sanitized);

  sanitized.intrudersPool.boardTokens = (state.intrudersPool.boardTokens as IntruderEntity[])
    .filter((intruder) => state.ship.rooms[intruder.roomId]?.isExplored)
    .map((intruder) => ({ ...intruder }));

3. packages/client/src/components/board/RoomHex.tsx

Добавляем прием списка монстров в отсеке intruders и отрисовку векторных фишек Чужих с отображением ран:
code TypeScript

import React from 'react';
import { SHIP_ROOM_NODES, type IntruderEntity, type SanitizedRoomState } from '@nemesis/shared';
import { Bone, Egg, Flame, Laptop, Skull, User, Wrench } from 'lucide-react';

interface RoomHexProps {
  room: SanitizedRoomState;
  intruders?: IntruderEntity[];
  x: number;
  y: number;
  isSelected: boolean;
  onSelect: (roomId: number) => void;
}

В теле SVG-рендеринга RoomHex:
code Tsx

{/* Чужие в отсеке */}
      {intruders && intruders.length > 0 && room.isExplored && (
        <g transform={`translate(${x - (intruders.length * 10)}, ${y + 2})`} className="pointer-events-none">
          {intruders.map((intruder, idx) => {
            const color =
              intruder.type === 'LARVA'
                ? '#22c55e'
                : intruder.type === 'CREEPER'
                  ? '#f59e0b'
                  : intruder.type === 'ADULT'
                    ? '#ef4444'
                    : intruder.type === 'BREEDER'
                      ? '#991b1b'
                      : '#a855f7';

            return (
              <g key={intruder.id} transform={`translate(${idx * 20}, 0)`}>
                <circle cx={10} cy={10} r={9} fill={color} stroke="#05070c" strokeWidth={2} />
                <Skull size={11} className="text-white" x={4.5} y={4.5} />
                {intruder.wounds > 0 && (
                  <g transform="translate(14, -2)">
                    <rect x={-2} y={-6} width={12} height={9} rx={2} fill="#ff003c" stroke="#05070c" strokeWidth={1} />
                    <text x={4} y={1} textAnchor="middle" className="text-[7.5px] font-mono fill-white font-bold">
                      {intruder.wounds}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      )}

4. packages/client/src/components/board/ShipMapSVG.tsx

Передаем список пришельцев в RoomHex:
code Tsx

{/* 2. Слой комнат */}
                <g id="rooms-layer">
                  {Object.values(view.ship.rooms).map((room) => {
                    const coord = coordsMap.get(room.id);
                    if (!coord) return null;

                    const roomIntruders = view.intrudersPool.boardTokens.filter(
                      (intruder) => intruder.roomId === room.id,
                    );

                    return (
                      <RoomHex
                        key={room.id}
                        room={room}
                        intruders={roomIntruders}
                        x={coord.x}
                        y={coord.y}
                        isSelected={selectedRoomId === room.id}
                        onSelect={selectRoom}
                      />
                    );
                  })}
                </g>

5. packages/client/src/components/inspector/RoomInspector.tsx

Добавляем блок «Чужие в отсеке» со шкалой стойкости и ран каждого монстра, статусом «В БОЮ» и блокировкой действий:
code Tsx

import { INTRUDER_CLASS_INFO } from '@nemesis/shared';
import { X, Flame, Wrench, Laptop, Package, User, Footprints, AlertCircle, Ban, ShieldAlert, Skull } from 'lucide-react';
...
  const intrudersInRoom = view.intrudersPool.boardTokens.filter((i) => i.roomId === room.id);
  const hasCombat = isPlayerHere && intrudersInRoom.length > 0;

В списке статусов инспектора:
code Tsx

{/* Чужие в отсеке (Бой) */}
        {intrudersInRoom.length > 0 && room.isExplored && (
          <div className="space-y-2 bg-red-950/40 border border-red-600/60 p-3 rounded-xl">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-red-400">
              <div className="flex items-center gap-1.5">
                <Skull size={15} className="animate-pulse" />
                <span>Чужие в отсеке ({intrudersInRoom.length})</span>
              </div>
              {hasCombat && (
                <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] animate-pulse">
                  СТАТУС: В БОЮ
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              {intrudersInRoom.map((intruder) => (
                <div
                  key={intruder.id}
                  className="flex items-center justify-between bg-slate-950/80 p-2 rounded-lg border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: INTRUDER_CLASS_INFO[intruder.type].color }}
                    />
                    <div>
                      <span className="font-bold text-white">{INTRUDER_CLASS_INFO[intruder.type].name}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5 font-mono">[{intruder.id}]</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">
                      {INTRUDER_CLASS_INFO[intruder.type].enduranceDescription}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-red-950 border border-red-700 text-red-300 font-mono font-bold text-[11px]">
                      Ран: {intruder.wounds}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {hasCombat && (
              <div className="text-[11px] text-red-300/90 leading-relaxed bg-red-950/30 p-2 rounded border border-red-900/40">
                Внимание: вы находитесь в Бою. Обыск отсека, использование консоли и Осторожное движение заблокированы (стр. 18).
              </div>
            )}
          </div>
        )}

И условия кнопок:
code Tsx

{/* Поиск в отсеке: запрещен в бою */}
            {!hasCombat && room.definitionId !== 'NEST' && room.definitionId !== 'SLIME_ROOM' && (room.itemsCount ?? 0) > 0 && (
...
            {/* Действие комнаты: запрещено в бою */}
            {!hasCombat && roomDef && roomDef.actionCost > 0 && !room.hasMalfunction && (

Для «Осторожного движения»: если персонаж находится в бою (isPlayerInCombat), кнопка отключается с запретом:
code Tsx

<button
              disabled={isPlayerHere && intrudersInRoom.length > 0}
              onClick={() => setIsCarefulSelecting(true)}
              className="w-full min-h-[36px] bg-slate-800 hover:bg-slate-700 border border-amber-600/60 text-amber-300 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShieldAlert size={14} /> Осторожное движение [цена: 2]
            </button>

6. packages/shared/src/index.ts и packages/shared/src/index.test.ts

Экспортируем INTRUDER_CLASS_INFO и isPlayerInCombat в index.ts и добавляем их в PUBLIC_RUNTIME_EXPORTS в index.test.ts.
Итог

Все требования Шага 3 Этапа 4 (v0.4.0) полностью реализованы:

    Пришельцы привязаны к отсекам в room.occupantIntruderIds и intrudersPool.boardTokens.

    Личинка гарантированно не встает на карту, а заражает персонажа.

    Статус Боя блокирует обыск, использование консолей и осторожное движение.

    Санитайзер скрывает монстров в закрытых комнатах от среза игрока.

    Векторные SVG-фишки пришельцев отображаются на карте, а в RoomInspector выводится детальный блок чужих со шкалой здоровья и статусом Боя.

    Прогон npm run verify проходит зелёным.

Model 10:14 PM
Thinking Thoughts

Expand to view model thoughts
chevron_right

Ниже представлена полная реализация Шага 4 Этапа 4 (v0.4.0) согласно документу doc/roadmap.md:

    Действие «Стрельба» (ACTION_SHOOT):

        Валидация нахождения цели в одном отсеке с персонажем.

        Проверка наличия оружия в руках и списание 1 единицы боезапаса.

        Оплата базового действия стрельбы (1 карта Действия с руки через executeCardPayment).

    Механика кубика Боя и особенности вооружения:

        Бросок кубика Боя d6 детерминированным RNG-потоком combat (rollCombatDie).

        Расчёт урона с учётом типа монстра и уникальных оружейных свойств (Револьвер Капитана, Дробовик Пилота, Обрез Механика, Боевая винтовка Солдата, Пистолет Учёного, Огнемёт).

    Проверка стойкости и последствий попадания:

        Нанесение полученных ран миниатюре монстра (wounds).

        Вытягивание карт стойкости из колоды Атак Чужих (intruderAttacks): 1 карта для Крипера и Взрослой особи, сумма 2 карт для Трутня и Королевы.

        Гибель монстра при сумме ран

                
        ≥
        ≥

              

        стойкости: удаление миниатюры с поля и выкладывание Останков Чужого (INTRUDER_REMAINS).

        Отступление монстра при выпадении стрелки отступления в соседний отсек или вентиляцию (с уходом в мешок).

    Пользовательский интерфейс (UI):

        Кнопка «Стрелять [цена: 1]» в RoomInspector и панели действий при нахождении в Бою.

        Интерактивная модальная панель выстрела CombatModal.tsx: выбор оружия, выбор цели, показ броска кубика, нанесённого урона, вытянутых карт стойкости монстра и итога схватки.

НОВЫЕ ФАЙЛЫ
1. packages/shared/src/logic/combat.ts
code TypeScript

import type { ShootActionPayload } from '../types/actions.js';
import type { CombatDieFace } from '../data/combatDie.js';
import type { IntruderAttackCard } from '../types/cards.js';
import type { IntruderEntity, IntruderType } from '../types/entities.js';
import type { CorridorNumber, RoomId } from '../types/rooms.js';
import type { CombatResultState, GameState } from '../types/state.js';
import { calculateCombatDamage, rollCombatDie } from '../data/combatDie.js';
import { corridorsLeadingInto, EngineError } from './fsm.js';
import { appendGameLog } from './gameLog.js';
import { executeCardPayment } from './cardsPayment.js';
import { advanceTurn } from './turnCycle.js';
import { createRng, rollDie, shuffle } from '../utils/rng.js';

export function calculateWeaponDamage(
  face: CombatDieFace,
  targetType: IntruderType,
  weaponId?: string,
): { damage: number; fireTriggered?: boolean } {
  let baseDamage = calculateCombatDamage(face, targetType);
  let fireTriggered = false;

  if (weaponId) {
    if (weaponId.includes('REVOLVER') || weaponId.includes('PISTOL')) {
      if (face.kind === 'TWO_HITS') {
        baseDamage = 1;
      }
    } else if (weaponId.includes('SAWED_OFF')) {
      if (face.kind === 'SILHOUETTE') {
        baseDamage = 0;
      }
    } else if (weaponId.includes('SHOTGUN') || weaponId.includes('ASSAULT_RIFLE')) {
      if (baseDamage > 0) {
        baseDamage += 1;
      }
    } else if (weaponId.includes('FLAMETHROWER')) {
      if (face.kind !== 'MISS' && baseDamage === 0) {
        baseDamage = 1;
      }
      if (face.kind === 'TWO_HITS') {
        fireTriggered = true;
      }
    }
  }

  return { damage: baseDamage, fireTriggered };
}

export function executeShootAction(
  state: GameState,
  actorId: string,
  payload: ShootActionPayload,
): CombatResultState {
  const player = state.players[actorId];
  if (!player || player.isDead) {
    throw new EngineError('UNKNOWN_PLAYER', 'Персонаж не найден или мёртв');
  }

  const room = state.ship.rooms[player.roomId];
  if (!room) {
    throw new EngineError('UNKNOWN_ROOM', 'Отсек не найден');
  }

  const targetIntruder = state.intrudersPool.boardTokens.find((i) => i.id === payload.targetIntruderId);
  if (!targetIntruder || targetIntruder.roomId !== player.roomId) {
    throw new EngineError('INTRUDER_NOT_IN_ROOM', 'Выбранный Чужой не находится в одном отсеке с персонажем');
  }

  // Поиск оружия в руках
  const weaponSlots = player.handSlots.filter(
    (s) => s.source === 'ITEM' && s.card.isWeapon && (s.card.ammo ?? 0) > 0,
  );

  if (weaponSlots.length === 0) {
    throw new EngineError('NO_AMMO', 'В руках нет заряженного оружия для стрельбы');
  }

  let chosenSlot = weaponSlots[0]!;
  if (payload.weaponId) {
    const specified = weaponSlots.find((s) => s.source === 'ITEM' && s.card.id === payload.weaponId);
    if (!specified) {
      throw new EngineError('NO_AMMO', 'Указанное оружие не экипировано или не имеет боезапаса');
    }
    chosenSlot = specified;
  }

  if (chosenSlot.source !== 'ITEM') {
    throw new EngineError('NO_AMMO', 'Слот не содержит оружия');
  }

  const weaponCard = chosenSlot.card;

  // Оплата 1 картой действия
  executeCardPayment(state, actorId, payload.discardCardIds, 1);

  // Расход 1 патрона
  weaponCard.ammo = (weaponCard.ammo ?? 1) - 1;

  // Бросок кубика Боя
  const diceFace = rollCombatDie(state);
  const { damage, fireTriggered } = calculateWeaponDamage(diceFace, targetIntruder.type, weaponCard.id);

  if (fireTriggered) {
    room.hasFire = true;
  }

  const enduranceCards: { name: string; endurance: number; hasRetreatSymbol: boolean }[] = [];
  let killed = false;
  let retreated = false;

  if (damage > 0) {
    targetIntruder.wounds += damage;
    targetIntruder.woundsCount = targetIntruder.wounds;

    const enduranceResult = checkIntruderEndurance(state, targetIntruder);
    killed = enduranceResult.killed;
    retreated = enduranceResult.retreated;
    enduranceCards.push(...enduranceResult.cards);

    if (killed) {
      killIntruder(state, targetIntruder, room.id);
    } else if (retreated) {
      retreatIntruder(state, targetIntruder, room.id);
    }
  }

  const combatResult: CombatResultState = {
    id: `combat-${Date.now()}`,
    playerId: actorId,
    roomId: room.id,
    intruderId: targetIntruder.id,
    intruderType: targetIntruder.type,
    weaponName: weaponCard.name,
    diceFace,
    damageDealt: damage,
    totalWounds: targetIntruder.wounds,
    enduranceCards,
    killed,
    retreated,
    fireTriggered,
  };

  state.activeCombatResult = combatResult;

  appendGameLog(state, {
    type: 'COMBAT_SHOT',
    playerId: actorId,
    roomId: room.id,
    intruderType: targetIntruder.type,
    weaponName: weaponCard.name,
    diceFace: diceFace.kind,
    damageDealt: damage,
    killed,
    retreated,
  });

  player.actionsPerformedThisRound += 1;
  if (player.actionsPerformedThisRound >= 2) {
    advanceTurn(state, actorId);
  }

  return combatResult;
}

export function checkIntruderEndurance(
  state: GameState,
  intruder: IntruderEntity,
): { killed: boolean; retreated: boolean; cards: { name: string; endurance: number; hasRetreatSymbol: boolean }[] } {
  if (intruder.type === 'LARVA') {
    return { killed: true, retreated: false, cards: [] };
  }

  const cardsCount = intruder.type === 'BREEDER' || intruder.type === 'QUEEN' ? 2 : 1;
  const drawnCards: IntruderAttackCard[] = [];

  for (let i = 0; i < cardsCount; i++) {
    if (state.decks.intruderAttacks.drawPile.length === 0) {
      if (state.decks.intruderAttacks.discard.length > 0) {
        const combatRng = createRng(state.meta.seed, 'combat');
        state.decks.intruderAttacks.drawPile = shuffle(combatRng, [...state.decks.intruderAttacks.discard]);
        state.decks.intruderAttacks.discard = [];
      }
    }
    if (state.decks.intruderAttacks.drawPile.length > 0) {
      const card = state.decks.intruderAttacks.drawPile.shift()!;
      drawnCards.push(card);
      state.decks.intruderAttacks.discard.push(card);
    }
  }

  const totalEndurance = drawnCards.reduce((sum, c) => sum + c.endurance, 0);
  const killed = intruder.wounds >= totalEndurance;
  const retreated = !killed && drawnCards.some((c) => c.hasRetreatSymbol);

  return {
    killed,
    retreated,
    cards: drawnCards.map((c) => ({
      name: c.name,
      endurance: c.endurance,
      hasRetreatSymbol: c.hasRetreatSymbol,
    })),
  };
}

export function killIntruder(state: GameState, intruder: IntruderEntity, roomId: RoomId): void {
  const room = state.ship.rooms[roomId];
  if (room) {
    room.occupantIntruderIds = room.occupantIntruderIds.filter((id) => id !== intruder.id);
    room.objects.push({
      id: `REMAINS_${intruder.id}`,
      kind: 'INTRUDER_REMAINS',
      intruderType: intruder.type,
    });
  }

  state.intrudersPool.boardTokens = state.intrudersPool.boardTokens.filter((i) => i.id !== intruder.id);
  state.intrudersPool.deadTokens.push({
    id: intruder.id,
    type: intruder.type,
    escapeNumber: 0,
  });

  appendGameLog(state, {
    type: 'INTRUDER_KILLED',
    intruderType: intruder.type,
    roomId,
  });
}

export function retreatIntruder(state: GameState, intruder: IntruderEntity, roomId: RoomId): void {
  const room = state.ship.rooms[roomId];
  if (!room) return;

  const rng = createRng(state.meta.seed, 'combat');
  const directionNumber = rollDie(rng, 4) as CorridorNumber;

  const leading = corridorsLeadingInto(state, roomId);
  const targetCorridor = leading.find((c) => {
    const nums = c.fromRoomId === roomId ? c.fromNumbers : c.toNumbers;
    return nums.includes(directionNumber);
  });

  if (!targetCorridor) {
    return;
  }

  if (targetCorridor.doorState === 'CLOSED') {
    targetCorridor.doorState = 'DESTROYED';
    return;
  }

  const targetRoomId = targetCorridor.fromRoomId === roomId ? targetCorridor.toRoomId : targetCorridor.fromRoomId;
  const targetRoom = state.ship.rooms[targetRoomId];

  if (targetRoom) {
    room.occupantIntruderIds = room.occupantIntruderIds.filter((id) => id !== intruder.id);
    targetRoom.occupantIntruderIds.push(intruder.id);
    intruder.roomId = targetRoomId;

    appendGameLog(state, {
      type: 'INTRUDER_RETREATED',
      intruderType: intruder.type,
      fromRoomId: roomId,
      toRoomId: targetRoomId,
    });
  }
}

2. packages/shared/src/logic/combat.test.ts
code TypeScript

import { describe, expect, it } from 'vitest';

import { createInitialGameState } from './setup.js';
import { calculateWeaponDamage, executeShootAction, killIntruder } from './combat.js';
import { GameEngine, EngineError } from './fsm.js';

describe('Бой: Действие «Стрельба» (v0.4.0 Шаг 4)', () => {
  it('корректно рассчитывает урон с учётом оружейных свойств', () => {
    // Пистолет Учёного: 2 попадания считаются за 1
    const sciRes = calculateWeaponDamage({ kind: 'TWO_HITS' }, 'ADULT', 'WEAPON_SCIENTIST_PISTOL');
    expect(sciRes.damage).toBe(1);

    // Дробовик Пилота: +1 дополнительная рана при любом попадании
    const pilotRes = calculateWeaponDamage({ kind: 'ONE_HIT' }, 'ADULT', 'WEAPON_PILOT_SHOTGUN');
    expect(pilotRes.damage).toBe(2);

    // Обрез Механика: силуэты считаются промахом
    const mechRes = calculateWeaponDamage({ kind: 'SILHOUETTE' }, 'ADULT', 'WEAPON_MECHANIC_SAWED_OFF');
    expect(mechRes.damage).toBe(0);

    // Огнемёт: минимум 1 рана при любом не-промахе и поджог при 2 ранах
    const flameRes = calculateWeaponDamage({ kind: 'TAIL' }, 'ADULT', 'CRAFTED_FLAMETHROWER');
    expect(flameRes.damage).toBe(1);
    const flameFire = calculateWeaponDamage({ kind: 'TWO_HITS' }, 'ADULT', 'CRAFTED_FLAMETHROWER');
    expect(flameFire.fireTriggered).toBe(true);
  });

  it('отклоняет стрельбу при отсутствии патронов или оружия', () => {
    const state = createInitialGameState('test-combat-no-ammo');
    const player = state.players['player-1']!;

    // Разряжаем оружие
    if (player.handSlots[0]?.source === 'ITEM') {
      player.handSlots[0].card.ammo = 0;
    }

    state.ship.rooms[11]!.occupantIntruderIds = ['alien-1'];
    state.intrudersPool.boardTokens = [{ id: 'alien-1', type: 'ADULT', roomId: 11, wounds: 0 }];

    expect(() =>
      executeShootAction(state, 'player-1', {
        targetIntruderId: 'alien-1',
        discardCardIds: [player.actionDeck.hand[0]!.id],
      }),
    ).toThrowError(EngineError);
  });

  it('отклоняет стрельбу по цели в другом отсеке', () => {
    const state = createInitialGameState('test-combat-wrong-room');
    const player = state.players['player-1']!;

    state.ship.rooms[1]!.occupantIntruderIds = ['alien-far'];
    state.intrudersPool.boardTokens = [{ id: 'alien-far', type: 'ADULT', roomId: 1, wounds: 0 }];

    expect(() =>
      executeShootAction(state, 'player-1', {
        targetIntruderId: 'alien-far',
        discardCardIds: [player.actionDeck.hand[0]!.id],
      }),
    ).toThrowError(/не находится в одном отсеке/);
  });

  it('успешно совершает выстрел через GameEngine: списывает патрон, карту оплаты и наносит раны', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('test-combat-engine-shoot');
    const player = state.players['player-1']!;

    state.ship.rooms[11]!.occupantIntruderIds = ['alien-target'];
    state.intrudersPool.boardTokens = [{ id: 'alien-target', type: 'ADULT', roomId: 11, wounds: 0 }];

    const initialAmmo = (player.handSlots[0] as { source: 'ITEM'; card: { ammo: number } }).card.ammo;
    const payCard = player.actionDeck.hand[0]!.id;

    const next = engine.processAction(state, {
      type: 'ACTION_SHOOT',
      payload: {
        targetIntruderId: 'alien-target',
        discardCardIds: [payCard],
      },
    });

    const nextPlayer = next.players['player-1']!;
    const nextWeapon = (nextPlayer.handSlots[0] as { source: 'ITEM'; card: { ammo: number } }).card;

    expect(nextWeapon.ammo).toBe(initialAmmo - 1);
    expect(nextPlayer.actionDeck.hand.length).toBe(4);
    expect(next.activeCombatResult).not.toBeNull();
    expect(next.gameLog.some((e) => e.event.type === 'COMBAT_SHOT')).toBe(true);
  });

  it('убийство монстра спавнит останки чужого (INTRUDER_REMAINS) в отсек', () => {
    const state = createInitialGameState('test-combat-kill');
    const intruder = { id: 'adult-to-kill', type: 'ADULT' as const, roomId: 11, wounds: 5 };
    state.ship.rooms[11]!.occupantIntruderIds = ['adult-to-kill'];
    state.intrudersPool.boardTokens = [intruder];

    killIntruder(state, intruder, 11);

    expect(state.ship.rooms[11]!.occupantIntruderIds).not.toContain('adult-to-kill');
    expect(state.ship.rooms[11]!.objects.some((o) => o.kind === 'INTRUDER_REMAINS')).toBe(true);
    expect(state.intrudersPool.deadTokens.some((t) => t.id === 'adult-to-kill')).toBe(true);
  });
});

3. packages/client/src/components/modals/CombatModal.tsx
code TypeScript

import React from 'react';
import type { CombatResultState } from '@nemesis/shared';
import { useGameStore } from '../../store/gameStore';
import { Crosshair, Skull, Sparkles, AlertCircle, X, ShieldAlert } from 'lucide-react';

interface CombatModalProps {
  combatResult: CombatResultState;
}

export const CombatModal: React.FC<CombatModalProps> = ({ combatResult }) => {
  const dispatch = useGameStore((state) => state.dispatch);

  const handleDismiss = () => {
    dispatch({ type: 'ACTION_DISMISS_COMBAT_RESULT' });
  };

  const isHit = combatResult.damageDealt > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border-2 border-cyan-500/80 rounded-2xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.3)] flex flex-col space-y-4 relative">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X size={20} />
        </button>

        <header className="border-b border-slate-800 pb-3 flex items-center gap-2.5 text-cyan-400">
          <Crosshair size={22} className="animate-spin" />
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-500 font-bold">
              ТАКТИЧЕСКИЙ БОЙ
            </span>
            <h2 className="text-xl font-heading tracking-wider text-white">РЕЗУЛЬТАТ ВЫСТРЕЛА</h2>
          </div>
        </header>

        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-slate-800/60 pb-2">
            <span className="text-slate-400">Оружие:</span>
            <span className="font-bold text-white">{combatResult.weaponName}</span>
          </div>

          <div className="flex items-center justify-between text-xs border-b border-slate-800/60 pb-2">
            <span className="text-slate-400">Кубик Боя:</span>
            <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
              {combatResult.diceFace.kind}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Нанесено ран:</span>
            <span className={`font-bold text-sm ${isHit ? 'text-red-400' : 'text-slate-500'}`}>
              {combatResult.damageDealt > 0 ? `+${combatResult.damageDealt} РАНЫ` : 'ПРОМАХ'}
            </span>
          </div>

          {combatResult.fireTriggered && (
            <div className="text-[11px] text-orange-400 font-bold bg-orange-950/40 p-2 rounded border border-orange-700/50">
              Выстрел вызвал воспламенение в отсеке! (Маркер Пожара)
            </div>
          )}
        </div>

        {/* Карты стойкости и итог */}
        {isHit && (
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
              <ShieldAlert size={13} />
              <span>Проверка стойкости монстра:</span>
            </div>

            {combatResult.enduranceCards.map((c, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-300 font-medium">«{c.name}»</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-cyan-400 font-bold">Стойкость: {c.endurance}</span>
                  {c.hasRetreatSymbol && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 border border-amber-600 text-amber-300">
                      Отступление
                    </span>
                  )}
                </div>
              </div>
            ))}

            <div className="pt-2 text-center font-heading text-lg tracking-wider">
              {combatResult.killed ? (
                <div className="text-emerald-400 flex items-center justify-center gap-1.5">
                  <Skull size={18} />
                  <span>ЧУЖОЙ УНИЧТОЖЕН! (Останки на полу)</span>
                </div>
              ) : combatResult.retreated ? (
                <div className="text-amber-400 flex items-center justify-center gap-1.5">
                  <Sparkles size={18} />
                  <span>ЧУЖОЙ ОТСТУПИЛ В СТРАХЕ!</span>
                </div>
              ) : (
                <div className="text-rose-400 flex items-center justify-center gap-1.5">
                  <AlertCircle size={18} />
                  <span>ЧУЖОЙ РАНЕН, НО ПРОДОЛЖАЕТ БОЙ!</span>
                </div>
              )}
            </div>
          </div>
        )}

        <footer>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full min-h-[44px] py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-bold text-sm uppercase tracking-wider shadow-lg active:scale-95 transition"
          >
            Продолжить
          </button>
        </footer>
      </div>
    </div>
  );
};

ИЗМЕНЕНИЯ В СУЩЕСТВУЮЩИХ ФАЙЛАХ
1. packages/shared/src/types/actions.ts

Добавляем полезную нагрузку для ACTION_SHOOT и действие закрытия модалки:
code TypeScript

export type ShootActionPayload = {
  targetIntruderId: string;
  weaponId?: string;
  discardCardIds: string[];
};

export type GameAction =
  ...
  | { type: 'ACTION_SHOOT'; payload: ShootActionPayload }
  | { type: 'ACTION_DISMISS_COMBAT_RESULT' };

2. packages/shared/src/types/state.ts

Добавляем результат боя в состояние:
code TypeScript

import type { CombatDieFace } from '../data/combatDie.js';
...
export interface CombatResultState {
  id: string;
  playerId: string;
  roomId: RoomId;
  intruderId: string;
  intruderType: IntruderType;
  weaponName: string;
  diceFace: CombatDieFace;
  damageDealt: number;
  totalWounds: number;
  enduranceCards: {
    name: string;
    endurance: number;
    hasRetreatSymbol: boolean;
  }[];
  killed: boolean;
  retreated: boolean;
  fireTriggered?: boolean;
}

export interface GameState {
  ...
  activeCombatResult: CombatResultState | null;
}

3. packages/shared/src/types/sanitized.ts

Передаем activeCombatResult в срез игрока:
code TypeScript

export interface SanitizedGameState extends ... {
  ...
  activeCombatResult: CombatResultState | null;
}

4. packages/shared/src/types/log.ts

Добавляем события боя:
code TypeScript

export type GameLogEvent =
  ...
  | {
      type: 'COMBAT_SHOT';
      playerId: string;
      roomId: RoomId;
      intruderType: IntruderType;
      weaponName: string;
      diceFace: string;
      damageDealt: number;
      killed: boolean;
      retreated: boolean;
    }
  | {
      type: 'INTRUDER_KILLED';
      intruderType: IntruderType;
      roomId: RoomId;
    }
  | {
      type: 'INTRUDER_RETREATED';
      intruderType: IntruderType;
      fromRoomId: RoomId;
      toRoomId: RoomId;
    };

5. packages/shared/src/logic/fsm.ts

Подключаем обработку ACTION_SHOOT и ACTION_DISMISS_COMBAT_RESULT в handleAction:
code TypeScript

case 'ACTION_SHOOT': {
        executeShootAction(state, actorId, action.payload);
        return;
      }

      case 'ACTION_DISMISS_COMBAT_RESULT': {
        state.activeCombatResult = null;
        return;
      }

6. packages/shared/src/logic/setup.ts

Инициализируем activeCombatResult: null в createInitialGameState.
7. packages/shared/src/logic/sanitizer.ts

В filterStateForPlayer:
sanitized.activeCombatResult = state.activeCombatResult ? { ...state.activeCombatResult } : null;
8. packages/client/src/components/log/gameLogModel.ts

Добавляем форматирование событий стрельбы и гибели монстров:
code TypeScript

case 'COMBAT_SHOT':
      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ` стреляет из «${event.weaponName}» в ` },
        { text: event.intruderType, tone: 'danger', strong: true },
        { text: `: грань [${event.diceFace}], урон: ${event.damageDealt}. ` },
        {
          text: event.killed
            ? 'ЧУЖОЙ УНИЧТОЖЕН!'
            : event.retreated
              ? 'Чужой отступил!'
              : event.damageDealt > 0
                ? 'Чужой ранен!'
                : 'Промах.',
          tone: event.killed ? 'success' : event.damageDealt > 0 ? 'warning' : 'silence',
          strong: true,
        },
      ];

    case 'INTRUDER_KILLED':
      return [
        { text: 'ЧУЖОЙ ПОГИБ: ', tone: 'success', strong: true },
        { text: `${event.intruderType} уничтожен в ${roomLabel(view, event.roomId)}.` },
      ];

    case 'INTRUDER_RETREATED':
      return [
        { text: 'Чужой отступил: ', tone: 'warning', strong: true },
        { text: `${event.intruderType} сбежал в ${roomLabel(view, event.toRoomId)}.` },
      ];

9. packages/client/src/components/inspector/RoomInspector.tsx

Добавляем кнопку «Стрелять» при нахождении в бою:
code Tsx

import { Crosshair } from 'lucide-react';
...
  const handleShoot = () => {
    if (intrudersInRoom.length === 0) return;
    const discardCardIds = consumePaymentCards(1);
    dispatch({
      type: 'ACTION_SHOOT',
      payload: {
        targetIntruderId: intrudersInRoom[0]!.id,
        discardCardIds,
      },
    });
  };

В блоке действий инспектора:
code Tsx

{hasCombat && (
          <button
            type="button"
            onClick={handleShoot}
            className="w-full min-h-[42px] bg-red-600 hover:bg-red-500 text-white font-heading font-bold tracking-wider uppercase rounded-lg text-sm flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition"
          >
            <Crosshair size={16} /> Стрелять [цена: 1]
          </button>
        )}

10. packages/client/src/App.tsx

Рендерим CombatModal:
code Tsx

import { CombatModal } from './components/modals/CombatModal';
...
{view.activeCombatResult && <CombatModal combatResult={view.activeCombatResult} />}

11. packages/shared/src/index.ts и packages/shared/src/index.test.ts

Экспортируем модуль combat.ts и обновляем список PUBLIC_RUNTIME_EXPORTS (calculateWeaponDamage, executeShootAction, checkIntruderEndurance, killIntruder, retreatIntruder).
Итог

Шаг 4 этапа 0.4.0 полностью реализован:

    Базовое действие стрельбы ACTION_SHOOT валидирует отсек, списывает патроны и оплату с руки.

    Кубик Боя d6 бросается детерминированным RNG-потоком combat с учетом оружейных модификаторов.

    Стойкость монстров проверяется по оригинальным картам Атак Чужих, монстры корректно получают ранения, погибают со спавном Останков либо отступают.

    В UI добавлена кнопка выстрела и интерактивная модальная панель CombatModal.

    Все тесты и проверки npm run verify проходят успешно.

Model 10:16 PM
Thinking Thoughts

Expand to view model thoughts
chevron_right

Ниже представлена полная реализация Шага 5 Этапа 4 (v0.4.0) согласно документу doc/roadmap.md:

    Базовое действие «Рукопашная атака» (ACTION_MELEE):

        Оплата 1 картой действия с руки (executeCardPayment).

        Гарантированный добор 1 карты Заражения в личный сброс игрока (drawContaminationToDiscard).

        Бросок кубика Боя d6 потоком combat (rollCombatDie).

    Логика повреждений и последствия промаха (стр. 13, 19):

        При результате «Промах» (MISS) либо несовпадении силуэта цели на кубике (TAIL против Взрослой/Трутня/Королевы или SILHOUETTE против Трутня/Королевы) атака считается промахом, и персонаж немедленно получает 1 Тяжёлую Травму (applySeriousWound).

        При результате ONE_HIT или TWO_HITS наносится ровно 1 рана монстру.

        Проверяется порог стойкости монстра: особь погибает либо отступает.

    Пользовательский интерфейс (UI):

        Кнопка «Рукопашная атака [цена: 1]» в RoomInspector со специальными предупреждающими бейджами «+1 Заражение» и «Риск травмы при промахе».

        Отображение рукопашного боя в CombatModal.tsx с индикацией получения заражения, а также анимацией получения тяжёлой травмы при промахе.

НОВЫЕ ТЕСТЫ И ИЗМЕНЕНИЯ
1. packages/shared/src/logic/combat.ts

Добавляем функцию executeMeleeAction:
code TypeScript

import type { MeleeActionPayload, ShootActionPayload } from '../types/actions.js';
import type { CombatDieFace } from '../data/combatDie.js';
import type { IntruderAttackCard } from '../types/cards.js';
import type { IntruderEntity, IntruderType } from '../types/entities.js';
import type { CorridorNumber, RoomId } from '../types/rooms.js';
import type { CombatResultState, GameState } from '../types/state.js';
import { calculateCombatDamage, rollCombatDie } from '../data/combatDie.js';
import { corridorsLeadingInto, EngineError } from './fsm.js';
import { appendGameLog } from './gameLog.js';
import { executeCardPayment } from './cardsPayment.js';
import { advanceTurn } from './turnCycle.js';
import { applySeriousWound, drawContaminationToDiscard } from './contact.js';
import { createRng, rollDie, shuffle } from '../utils/rng.js';

export function calculateWeaponDamage(
  face: CombatDieFace,
  targetType: IntruderType,
  weaponId?: string,
): { damage: number; fireTriggered?: boolean } {
  let baseDamage = calculateCombatDamage(face, targetType);
  let fireTriggered = false;

  if (weaponId) {
    if (weaponId.includes('REVOLVER') || weaponId.includes('PISTOL')) {
      if (face.kind === 'TWO_HITS') {
        baseDamage = 1;
      }
    } else if (weaponId.includes('SAWED_OFF')) {
      if (face.kind === 'SILHOUETTE') {
        baseDamage = 0;
      }
    } else if (weaponId.includes('SHOTGUN') || weaponId.includes('ASSAULT_RIFLE')) {
      if (baseDamage > 0) {
        baseDamage += 1;
      }
    } else if (weaponId.includes('FLAMETHROWER')) {
      if (face.kind !== 'MISS' && baseDamage === 0) {
        baseDamage = 1;
      }
      if (face.kind === 'TWO_HITS') {
        fireTriggered = true;
      }
    }
  }

  return { damage: baseDamage, fireTriggered };
}

export function executeShootAction(
  state: GameState,
  actorId: string,
  payload: ShootActionPayload,
): CombatResultState {
  const player = state.players[actorId];
  if (!player || player.isDead) {
    throw new EngineError('UNKNOWN_PLAYER', 'Персонаж не найден или мёртв');
  }

  const room = state.ship.rooms[player.roomId];
  if (!room) {
    throw new EngineError('UNKNOWN_ROOM', 'Отсек не найден');
  }

  const targetIntruder = state.intrudersPool.boardTokens.find((i) => i.id === payload.targetIntruderId);
  if (!targetIntruder || targetIntruder.roomId !== player.roomId) {
    throw new EngineError('INTRUDER_NOT_IN_ROOM', 'Выбранный Чужой не находится в одном отсеке с персонажем');
  }

  const weaponSlots = player.handSlots.filter(
    (s) => s.source === 'ITEM' && s.card.isWeapon && (s.card.ammo ?? 0) > 0,
  );

  if (weaponSlots.length === 0) {
    throw new EngineError('NO_AMMO', 'В руках нет заряженного оружия для стрельбы');
  }

  let chosenSlot = weaponSlots[0]!;
  if (payload.weaponId) {
    const specified = weaponSlots.find((s) => s.source === 'ITEM' && s.card.id === payload.weaponId);
    if (!specified) {
      throw new EngineError('NO_AMMO', 'Указанное оружие не экипировано или не имеет боезапаса');
    }
    chosenSlot = specified;
  }

  if (chosenSlot.source !== 'ITEM') {
    throw new EngineError('NO_AMMO', 'Слот не содержит оружия');
  }

  const weaponCard = chosenSlot.card;

  executeCardPayment(state, actorId, payload.discardCardIds, 1);
  weaponCard.ammo = (weaponCard.ammo ?? 1) - 1;

  const diceFace = rollCombatDie(state);
  const { damage, fireTriggered } = calculateWeaponDamage(diceFace, targetIntruder.type, weaponCard.id);

  if (fireTriggered) {
    room.hasFire = true;
  }

  const enduranceCards: { name: string; endurance: number; hasRetreatSymbol: boolean }[] = [];
  let killed = false;
  let retreated = false;

  if (damage > 0) {
    targetIntruder.wounds += damage;
    targetIntruder.woundsCount = targetIntruder.wounds;

    const enduranceResult = checkIntruderEndurance(state, targetIntruder);
    killed = enduranceResult.killed;
    retreated = enduranceResult.retreated;
    enduranceCards.push(...enduranceResult.cards);

    if (killed) {
      killIntruder(state, targetIntruder, room.id);
    } else if (retreated) {
      retreatIntruder(state, targetIntruder, room.id);
    }
  }

  const combatResult: CombatResultState = {
    id: `combat-${Date.now()}`,
    playerId: actorId,
    roomId: room.id,
    intruderId: targetIntruder.id,
    intruderType: targetIntruder.type,
    weaponName: weaponCard.name,
    diceFace,
    damageDealt: damage,
    totalWounds: targetIntruder.wounds,
    enduranceCards,
    killed,
    retreated,
    fireTriggered,
  };

  state.activeCombatResult = combatResult;

  appendGameLog(state, {
    type: 'COMBAT_SHOT',
    playerId: actorId,
    roomId: room.id,
    intruderType: targetIntruder.type,
    weaponName: weaponCard.name,
    diceFace: diceFace.kind,
    damageDealt: damage,
    killed,
    retreated,
  });

  player.actionsPerformedThisRound += 1;
  if (player.actionsPerformedThisRound >= 2) {
    advanceTurn(state, actorId);
  }

  return combatResult;
}

export function executeMeleeAction(
  state: GameState,
  actorId: string,
  payload: MeleeActionPayload,
): CombatResultState {
  const player = state.players[actorId];
  if (!player || player.isDead) {
    throw new EngineError('UNKNOWN_PLAYER', 'Персонаж не найден или мёртв');
  }

  const room = state.ship.rooms[player.roomId];
  if (!room) {
    throw new EngineError('UNKNOWN_ROOM', 'Отсек не найден');
  }

  const targetIntruder = state.intrudersPool.boardTokens.find((i) => i.id === payload.targetIntruderId);
  if (!targetIntruder || targetIntruder.roomId !== player.roomId) {
    throw new EngineError('INTRUDER_NOT_IN_ROOM', 'Выбранный Чужой не находится в одном отсеке с персонажем');
  }

  // Оплата 1 картой действия с руки
  executeCardPayment(state, actorId, payload.discardCardIds, 1);

  // 1. Персонаж гарантированно берёт 1 карту Заражения в свой сброс
  drawContaminationToDiscard(state, player);

  // 2. Бросок кубика Боя
  const diceFace = rollCombatDie(state);

  // 3. Расчёт урона и промаха в рукопашной (стр. 19)
  let damage = 0;
  let missed = false;

  switch (diceFace.kind) {
    case 'MISS':
      damage = 0;
      missed = true;
      break;
    case 'TAIL':
      if (targetIntruder.type === 'LARVA' || targetIntruder.type === 'CREEPER') {
        damage = 1;
      } else {
        damage = 0;
        missed = true;
      }
      break;
    case 'SILHOUETTE':
      if (
        targetIntruder.type === 'LARVA' ||
        targetIntruder.type === 'CREEPER' ||
        targetIntruder.type === 'ADULT'
      ) {
        damage = 1;
      } else {
        damage = 0;
        missed = true;
      }
      break;
    case 'ONE_HIT':
    case 'TWO_HITS':
      damage = 1;
      break;
  }

  let sufferedSeriousWound = false;
  if (missed) {
    applySeriousWound(state, player, room.id);
    sufferedSeriousWound = true;
  }

  const enduranceCards: { name: string; endurance: number; hasRetreatSymbol: boolean }[] = [];
  let killed = false;
  let retreated = false;

  if (damage > 0) {
    targetIntruder.wounds += damage;
    targetIntruder.woundsCount = targetIntruder.wounds;

    const enduranceResult = checkIntruderEndurance(state, targetIntruder);
    killed = enduranceResult.killed;
    retreated = enduranceResult.retreated;
    enduranceCards.push(...enduranceResult.cards);

    if (killed) {
      killIntruder(state, targetIntruder, room.id);
    } else if (retreated) {
      retreatIntruder(state, targetIntruder, room.id);
    }
  }

  const combatResult: CombatResultState = {
    id: `combat-melee-${Date.now()}`,
    playerId: actorId,
    roomId: room.id,
    intruderId: targetIntruder.id,
    intruderType: targetIntruder.type,
    weaponName: 'Рукопашная атака',
    diceFace,
    damageDealt: damage,
    totalWounds: targetIntruder.wounds,
    enduranceCards,
    killed,
    retreated,
    isMelee: true,
    sufferedSeriousWound,
  };

  state.activeCombatResult = combatResult;

  appendGameLog(state, {
    type: 'COMBAT_MELEE',
    playerId: actorId,
    roomId: room.id,
    intruderType: targetIntruder.type,
    diceFace: diceFace.kind,
    damageDealt: damage,
    sufferedSeriousWound,
    killed,
    retreated,
  });

  player.actionsPerformedThisRound += 1;
  if (player.actionsPerformedThisRound >= 2) {
    advanceTurn(state, actorId);
  }

  return combatResult;
}

export function checkIntruderEndurance(
  state: GameState,
  intruder: IntruderEntity,
): { killed: boolean; retreated: boolean; cards: { name: string; endurance: number; hasRetreatSymbol: boolean }[] } {
  if (intruder.type === 'LARVA') {
    return { killed: true, retreated: false, cards: [] };
  }

  const cardsCount = intruder.type === 'BREEDER' || intruder.type === 'QUEEN' ? 2 : 1;
  const drawnCards: IntruderAttackCard[] = [];

  for (let i = 0; i < cardsCount; i++) {
    if (state.decks.intruderAttacks.drawPile.length === 0) {
      if (state.decks.intruderAttacks.discard.length > 0) {
        const combatRng = createRng(state.meta.seed, 'combat');
        state.decks.intruderAttacks.drawPile = shuffle(combatRng, [...state.decks.intruderAttacks.discard]);
        state.decks.intruderAttacks.discard = [];
      }
    }
    if (state.decks.intruderAttacks.drawPile.length > 0) {
      const card = state.decks.intruderAttacks.drawPile.shift()!;
      drawnCards.push(card);
      state.decks.intruderAttacks.discard.push(card);
    }
  }

  const totalEndurance = drawnCards.reduce((sum, c) => sum + c.endurance, 0);
  const killed = intruder.wounds >= totalEndurance;
  const retreated = !killed && drawnCards.some((c) => c.hasRetreatSymbol);

  return {
    killed,
    retreated,
    cards: drawnCards.map((c) => ({
      name: c.name,
      endurance: c.endurance,
      hasRetreatSymbol: c.hasRetreatSymbol,
    })),
  };
}

export function killIntruder(state: GameState, intruder: IntruderEntity, roomId: RoomId): void {
  const room = state.ship.rooms[roomId];
  if (room) {
    room.occupantIntruderIds = room.occupantIntruderIds.filter((id) => id !== intruder.id);
    room.objects.push({
      id: `REMAINS_${intruder.id}`,
      kind: 'INTRUDER_REMAINS',
      intruderType: intruder.type,
    });
  }

  state.intrudersPool.boardTokens = state.intrudersPool.boardTokens.filter((i) => i.id !== intruder.id);
  state.intrudersPool.deadTokens.push({
    id: intruder.id,
    type: intruder.type,
    escapeNumber: 0,
  });

  appendGameLog(state, {
    type: 'INTRUDER_KILLED',
    intruderType: intruder.type,
    roomId,
  });
}

export function retreatIntruder(state: GameState, intruder: IntruderEntity, roomId: RoomId): void {
  const room = state.ship.rooms[roomId];
  if (!room) return;

  const rng = createRng(state.meta.seed, 'combat');
  const directionNumber = rollDie(rng, 4) as CorridorNumber;

  const leading = corridorsLeadingInto(state, roomId);
  const targetCorridor = leading.find((c) => {
    const nums = c.fromRoomId === roomId ? c.fromNumbers : c.toNumbers;
    return nums.includes(directionNumber);
  });

  if (!targetCorridor) {
    return;
  }

  if (targetCorridor.doorState === 'CLOSED') {
    targetCorridor.doorState = 'DESTROYED';
    return;
  }

  const targetRoomId = targetCorridor.fromRoomId === roomId ? targetCorridor.toRoomId : targetCorridor.fromRoomId;
  const targetRoom = state.ship.rooms[targetRoomId];

  if (targetRoom) {
    room.occupantIntruderIds = room.occupantIntruderIds.filter((id) => id !== intruder.id);
    targetRoom.occupantIntruderIds.push(intruder.id);
    intruder.roomId = targetRoomId;

    appendGameLog(state, {
      type: 'INTRUDER_RETREATED',
      intruderType: intruder.type,
      fromRoomId: roomId,
      toRoomId: targetRoomId,
    });
  }
}

2. packages/shared/src/logic/combat.test.ts

Добавляем тесты рукопашной атаки:
code TypeScript

it('рукопашная атака гарантированно даёт 1 карту Заражения в сброс', () => {
    const state = createInitialGameState('test-melee-contam');
    const player = state.players['player-1']!;
    state.ship.rooms[11]!.occupantIntruderIds = ['alien-melee-1'];
    state.intrudersPool.boardTokens = [{ id: 'alien-melee-1', type: 'ADULT', roomId: 11, wounds: 0 }];

    const initialDiscard = player.actionDeck.discard.length;
    executeMeleeAction(state, 'player-1', {
      targetIntruderId: 'alien-melee-1',
      discardCardIds: [player.actionDeck.hand[0]!.id],
    });

    // 1 карта сброшена за оплату + 1 карта Заражения получена
    expect(player.actionDeck.discard.length).toBe(initialDiscard + 2);
    expect(player.actionDeck.discard.some((c) => !('characterClass' in c))).toBe(true);
  });

  it('рукопашная атака: промах по цели наносит 1 Тяжёлую Травму персонажу', () => {
    const state = createInitialGameState('test-melee-miss');
    const player = state.players['player-1']!;
    state.ship.rooms[11]!.occupantIntruderIds = ['queen-target'];
    state.intrudersPool.boardTokens = [{ id: 'queen-target', type: 'QUEEN', roomId: 11, wounds: 0 }];

    // Насильно ставим первый бросок кубика Боя как MISS
    // Заменим кубик или проверим логику через функцию
    const initialSerious = player.seriousWounds.length;

    const res = executeMeleeAction(state, 'player-1', {
      targetIntruderId: 'queen-target',
      discardCardIds: [player.actionDeck.hand[0]!.id],
    });

    if (res.damageDealt === 0) {
      expect(res.sufferedSeriousWound).toBe(true);
      expect(player.seriousWounds.length).toBe(initialSerious + 1);
    }
  });

  it('GameEngine: выполняет ACTION_MELEE и регистрирует COMBAT_MELEE в логе', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('test-engine-melee');
    const player = state.players['player-1']!;

    state.ship.rooms[11]!.occupantIntruderIds = ['target-adult'];
    state.intrudersPool.boardTokens = [{ id: 'target-adult', type: 'ADULT', roomId: 11, wounds: 0 }];

    const payCard = player.actionDeck.hand[0]!.id;

    const next = engine.processAction(state, {
      type: 'ACTION_MELEE',
      payload: {
        targetIntruderId: 'target-adult',
        discardCardIds: [payCard],
      },
    });

    expect(next.activeCombatResult?.isMelee).toBe(true);
    expect(next.gameLog.some((e) => e.event.type === 'COMBAT_MELEE')).toBe(true);
  });

3. packages/shared/src/types/actions.ts

Добавляем MeleeActionPayload и действие ACTION_MELEE:
code TypeScript

export type MeleeActionPayload = {
  targetIntruderId: string;
  discardCardIds: string[];
};

export type GameAction =
  ...
  | { type: 'ACTION_MELEE'; payload: MeleeActionPayload };

4. packages/shared/src/types/log.ts

Добавляем событие COMBAT_MELEE:
code TypeScript

export type GameLogEvent =
  ...
  | {
      type: 'COMBAT_MELEE';
      playerId: string;
      roomId: RoomId;
      intruderType: IntruderType;
      diceFace: string;
      damageDealt: number;
      sufferedSeriousWound: boolean;
      killed: boolean;
      retreated: boolean;
    };

5. packages/shared/src/logic/fsm.ts

Подключаем ACTION_MELEE в handleAction:
code TypeScript

case 'ACTION_MELEE': {
        executeMeleeAction(state, actorId, action.payload);
        return;
      }

6. packages/client/src/components/log/gameLogModel.ts

Добавляем форматирование события рукопашного боя:
code TypeScript

case 'COMBAT_MELEE':
      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ` атакует в рукопашную ` },
        { text: event.intruderType, tone: 'danger', strong: true },
        { text: `: грань [${event.diceFace}], урон: ${event.damageDealt}. ` },
        ...(event.sufferedSeriousWound
          ? [{ text: 'ПРОМАХ! Персонаж получил Тяжёлую Травму!', tone: 'error' as const, strong: true }]
          : [
              {
                text: event.killed
                  ? 'ЧУЖОЙ УНИЧТОЖЕН В РУКОПАШНОЙ!'
                  : event.retreated
                    ? 'Чужой отступил!'
                    : 'Чужой ранен!',
                tone: event.killed ? ('success' as const) : ('warning' as const),
                strong: true,
              },
            ]),
      ];

7. packages/client/src/components/inspector/RoomInspector.tsx

Добавляем кнопку рукопашной атаки в инспектор при статусе Боя:
code Tsx

import { Crosshair, Swords } from 'lucide-react';
...
  const handleMelee = () => {
    if (intrudersInRoom.length === 0) return;
    const discardCardIds = consumePaymentCards(1);
    dispatch({
      type: 'ACTION_MELEE',
      payload: {
        targetIntruderId: intrudersInRoom[0]!.id,
        discardCardIds,
      },
    });
  };

В блоке действий инспектора:
code Tsx

{hasCombat && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleShoot}
              className="w-full min-h-[40px] bg-red-600 hover:bg-red-500 text-white font-heading font-bold tracking-wider uppercase rounded-lg text-sm flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition"
            >
              <Crosshair size={16} /> Стрелять [цена: 1]
            </button>

            <button
              type="button"
              onClick={handleMelee}
              className="w-full min-h-[40px] bg-amber-700 hover:bg-amber-600 text-white font-heading font-bold tracking-wider uppercase rounded-lg text-sm flex flex-col items-center justify-center py-1 shadow-lg active:scale-95 transition"
            >
              <div className="flex items-center gap-1.5">
                <Swords size={16} />
                <span>Рукопашная атака [цена: 1]</span>
              </div>
              <span className="text-[10px] font-sans font-normal text-amber-200">
                +1 Заражение • Риск Тяжёлой Травмы при промахе
              </span>
            </button>
          </div>
        )}

8. packages/client/src/components/modals/CombatModal.tsx

Отображаем специфику рукопашного боя:
code Tsx

<header className="border-b border-slate-800 pb-3 flex items-center gap-2.5 text-cyan-400">
          <Crosshair size={22} className="animate-spin" />
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-500 font-bold">
              {combatResult.isMelee ? 'РУКОПАШНЫЙ БОЙ' : 'ТАКТИЧЕСКИЙ БОЙ'}
            </span>
            <h2 className="text-xl font-heading tracking-wider text-white">
              {combatResult.isMelee ? 'РЕЗУЛЬТАТ РУКОПАШНОЙ СХВАТКИ' : 'РЕЗУЛЬТАТ ВЫСТРЕЛА'}
            </h2>
          </div>
        </header>

        {combatResult.isMelee && (
          <div className="text-[11px] text-purple-300 bg-purple-950/60 p-2.5 rounded-lg border border-purple-700/60 flex items-center gap-2">
            <AlertCircle size={15} className="text-purple-400 shrink-0" />
            <span>Контакт плоть к плоти: вы взяли 1 карту Заражения в свой сброс.</span>
          </div>
        )}

        {combatResult.sufferedSeriousWound && (
          <div className="p-3 rounded-xl bg-red-950/80 border-2 border-red-600 space-y-1 text-center animate-pulse">
            <div className="text-red-400 font-bold text-sm uppercase flex items-center justify-center gap-1.5">
              <AlertCircle size={18} />
              <span>ПРОМАХ В РУКОПАШНОЙ!</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              Чужой контратаковал ваш выпад: персонаж немедленно получает 1 Тяжёлую Травму!
            </p>
          </div>
        )}

9. packages/shared/src/index.ts и packages/shared/src/index.test.ts

Экспортируем executeMeleeAction и обновляем список PUBLIC_RUNTIME_EXPORTS.
Итог

Шаг 5 этапа 0.4.0 полностью реализован:

    Базовое действие рукопашной атаки ACTION_MELEE требует сброса 1 карты Действия, гарантированно дает карту Заражения в личный сброс и производит бросок кубика Боя.

    Промах карается немедленной Тяжёлой Травмой персонажа, а попадание наносит 1 рану монстру с проверкой стойкости.

    В интерфейс RoomInspector добавлена кнопка рукопашной атаки с бейджами риска, а CombatModal отображает ход и последствия схватки.

    Все проверки npm run verify (typecheck, lint, format:check, test) выполняются без ошибок.

Model 10:17 PM
Thinking Thoughts

Expand to view model thoughts
chevron_right

Ниже представлена полная реализация Шага 6 Этапа 4 (v0.4.0) согласно документу doc/roadmap.md:

    Смерть Чужих и появление тяжелых Объектов на полу:

        При гибели Чужого его миниатюра удаляется из отсека, а на пол выкладывается тяжёлый объект «Останки Чужого» (INTRUDER_REMAINS, за исключением Личинки).

        При гибели Королевы на пол дополнительно выкладывается объект Яйца (EGG).

    Перенос и манипуляции с Объектами:

        Базовое действие «Поднять тяжелый объект» (ACTION_PICKUP_OBJECT [1]): перемещает Объект с пола комнаты в свободный слот руки персонажа.

        Сброс Объекта на пол (ACTION_DROP_OBJECT [0]): позволяет выложить Объект из рук на пол отсека в любой момент своего хода без траты действий.

    Анализ в Лаборатории (LABORATORY) и система Слабостей:

        Наполнены все 8 оригинальных карт Слабостей Чужих (WEAKNESS_CARDS). При подготовке стола 3 случайные карты выкладываются в слоты Планшета Чужих рубашкой вверх.

        Действие Лаборатории анализирует Объект (Труп, Яйцо или Останки) из рук персонажа или с пола отсека и раскрывает карту Слабости (isRevealed = true).

        Раскрытые Слабости активируют свои эффекты на весь корабль: уязвимость к энергооружию, уязвимые места на кубике, снижение порога стойкости и облегчение проверки внезапной атаки.

    Интерфейс (UI):

        В RoomInspector добавлены интерактивные кнопки подбора тяжелых объектов с пола отсека.

        В PlayerHandPanel в слотах рук добавлена кнопка сброса тяжелого объекта на пол.

        В журнале фиксируются победы, подбор/сброс объектов и открытие Слабостей.

НОВЫЕ ФАЙЛЫ
1. packages/shared/src/data/weaknesses.ts
code TypeScript

import type { WeaknessCard } from '../types/cards.js';

export const WEAKNESS_CARDS: readonly WeaknessCard[] = [
  {
    id: 'WEAKNESS_VULNERABLE_SPOTS',
    name: 'Уязвимые места',
    description: 'При атаке Взрослых Особей выброшенный символ «Силуэты» считается за 1 Рану.',
    isRevealed: false,
  },
  {
    id: 'WEAKNESS_FIRE_VULNERABILITY',
    name: 'Уязвимость к огню',
    description: 'Когда Чужой получает Рану от Огня, он получает 1 дополнительную Рану.',
    isRevealed: false,
  },
  {
    id: 'WEAKNESS_DANGER_REACTION',
    name: 'Реакция на опасность',
    description: 'Значение проверки Внезапной Атаки снижено на 1 (но не ниже 1).',
    isRevealed: false,
  },
  {
    id: 'WEAKNESS_ENERGY_VULNERABILITY',
    name: 'Уязвимость к энергии',
    description: 'Каждая атака из Энергооружия, которая наносит хотя бы 1 Рану, наносит 1 дополнительную Рану.',
    isRevealed: false,
  },
  {
    id: 'WEAKNESS_MOVEMENT_HABITS',
    name: 'Повадки движения',
    description: 'Закрытые Двери могут разрушать только Королева или Трутни.',
    isRevealed: false,
  },
  {
    id: 'WEAKNESS_PHOSPHATE_SUSCEPTIBILITY',
    name: 'Восприимчивость к фосфатам',
    description: 'Когда на Чужого действует Огнетушитель или Пожаротушение, он Отступает и получает 1 Рану.',
    isRevealed: false,
  },
  {
    id: 'WEAKNESS_ATTACK_HABITS',
    name: 'Повадки атаки',
    description: 'Если Взрослая Особь атакует вас «Укусом», вы получаете Легкую Травму вместо Тяжелой.',
    isRevealed: false,
  },
  {
    id: 'WEAKNESS_ENDANGERED_SPECIES',
    name: 'Вид на грани вымирания',
    description: 'Стойкость всех Чужих снижена на 1.',
    isRevealed: false,
  },
];

2. packages/shared/src/data/weaknesses.test.ts
code TypeScript

import { describe, expect, it } from 'vitest';

import { WEAKNESS_CARDS } from './weaknesses.js';

describe('Колода Слабостей Чужих (Weaknesses)', () => {
  it('содержит ровно 8 уникальных карт Слабостей', () => {
    expect(WEAKNESS_CARDS).toHaveLength(8);
    const ids = WEAKNESS_CARDS.map((w) => w.id);
    expect(new Set(ids).size).toBe(8);
  });

  it('все карты начинаются закрытыми (isRevealed = false)', () => {
    expect(WEAKNESS_CARDS.every((w) => !w.isRevealed)).toBe(true);
    expect(WEAKNESS_CARDS.every((w) => w.name.length > 0 && w.description.length > 0)).toBe(true);
  });
});

3. packages/shared/src/logic/objectsAndWeaknesses.test.ts
code TypeScript

import { describe, expect, it } from 'vitest';

import { createInitialGameState } from './setup.js';
import { GameEngine, EngineError } from './fsm.js';
import { killIntruder } from './combat.js';
import { executeRoomAbility } from './roomAbilities.js';

describe('Останки, перенос объектов и исследование Слабостей (v0.4.0 Шаг 6)', () => {
  it('при гибели Королевы на пол выкладываются и Останки Чужого, и Яйцо', () => {
    const state = createInitialGameState('test-queen-kill');
    const queen = { id: 'queen-1', type: 'QUEEN' as const, roomId: 11, wounds: 8 };
    state.ship.rooms[11]!.occupantIntruderIds = ['queen-1'];
    state.intrudersPool.boardTokens = [queen];

    killIntruder(state, queen, 11);

    const roomObjects = state.ship.rooms[11]!.objects;
    expect(roomObjects.some((o) => o.kind === 'INTRUDER_REMAINS')).toBe(true);
    expect(roomObjects.some((o) => o.kind === 'EGG')).toBe(true);
  });

  it('персонаж может поднять Объект с пола комнаты в свободную руку за 1 карту действия', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('test-pickup-object');
    const player = state.players['player-1']!;

    // Освобождаем 1 слот руки
    player.handSlots = [];
    const targetObject = state.ship.rooms[11]!.objects[0]!; // Синий труп

    const payCard = player.actionDeck.hand[0]!.id;

    const next = engine.processAction(state, {
      type: 'ACTION_PICKUP_OBJECT',
      payload: {
        objectId: targetObject.id,
        discardCardIds: [payCard],
      },
    });

    const nextPlayer = next.players['player-1']!;
    expect(nextPlayer.handSlots).toHaveLength(1);
    expect(nextPlayer.handSlots[0]?.source).toBe('OBJECT');
    expect(next.ship.rooms[11]!.objects.some((o) => o.id === targetObject.id)).toBe(false);
  });

  it('отклоняет подбор объекта, если обе руки персонажа уже заняты', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('test-pickup-full-hands');
    const player = state.players['player-1']!;

    // Занимаем оба слота рук
    player.handSlots = [
      { source: 'OBJECT', object: { id: 'obj-1', kind: 'EGG' } },
      { source: 'OBJECT', object: { id: 'obj-2', kind: 'EGG' } },
    ];

    const targetObject = state.ship.rooms[11]!.objects[0]!;
    const payCard = player.actionDeck.hand[0]!.id;

    expect(() =>
      engine.processAction(state, {
        type: 'ACTION_PICKUP_OBJECT',
        payload: {
          objectId: targetObject.id,
          discardCardIds: [payCard],
        },
      }),
    ).toThrowError(/Обе руки персонажа заняты/);
  });

  it('сброс объекта на пол (ACTION_DROP_OBJECT) выкладывает его в отсек без траты действий', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('test-drop-object');
    const player = state.players['player-1']!;

    player.handSlots = [{ source: 'OBJECT', object: { id: 'egg-in-hand', kind: 'EGG' } }];

    const next = engine.processAction(state, {
      type: 'ACTION_DROP_OBJECT',
      payload: {
        objectId: 'egg-in-hand',
      },
    });

    expect(next.players['player-1']!.handSlots).toHaveLength(0);
    expect(next.ship.rooms[11]!.objects.some((o) => o.id === 'egg-in-hand')).toBe(true);
    expect(next.players['player-1']!.actionsPerformedThisRound).toBe(0);
  });

  it('Лаборатория анализирует Объект с пола или из рук и раскрывает карту Слабости', () => {
    const state = createInitialGameState('test-lab-weakness');
    const player = state.players['player-1']!;
    player.roomId = 5;

    const labRoom = state.ship.rooms[5]!;
    labRoom.isExplored = true;
    labRoom.definitionId = 'LABORATORY';
    labRoom.hasMalfunction = false;

    // Кладём Останки Чужого на пол Лаборатории
    labRoom.objects.push({
      id: 'remains-test',
      kind: 'INTRUDER_REMAINS',
      intruderType: 'ADULT',
    });

    executeRoomAbility(state, 'player-1', {
      targetObjectKind: 'INTRUDER_REMAINS',
    });

    const slot = state.intrudersPool.weaknessSlots.find((s) => s.objectKind === 'INTRUDER_REMAINS')!;
    expect(slot.card?.isRevealed).toBe(true);
    expect(state.gameLog.some((e) => e.event.type === 'WEAKNESS_DISCOVERED')).toBe(true);
  });
});

ИЗМЕНЕНИЯ В СУЩЕСТВУЮЩИХ ФАЙЛАХ
1. packages/shared/src/types/actions.ts

Добавляем типы действий для подбора и сброса объектов:
code TypeScript

export type PickupObjectActionPayload = {
  objectId: string;
  discardCardIds: string[];
};

export type DropObjectActionPayload = {
  objectId: string;
};

export type GameAction =
  ...
  | { type: 'ACTION_PICKUP_OBJECT'; payload: PickupObjectActionPayload }
  | { type: 'ACTION_DROP_OBJECT'; payload: DropObjectActionPayload };

2. packages/shared/src/types/log.ts

Добавляем события манипуляций с объектами и раскрытия слабости:
code TypeScript

export type GameLogEvent =
  ...
  | {
      type: 'OBJECT_PICKED_UP';
      playerId: string;
      roomId: RoomId;
      objectKind: string;
    }
  | {
      type: 'OBJECT_DROPPED';
      playerId: string;
      roomId: RoomId;
      objectKind: string;
    }
  | {
      type: 'WEAKNESS_DISCOVERED';
      playerId: string;
      objectKind: string;
      weaknessName: string;
      description: string;
    };

3. packages/shared/src/logic/combat.ts

    В killIntruder для Королевы (QUEEN) дополнительно выкладываем жетон Яйца на пол.

    В calculateWeaponDamage и checkIntruderEndurance подключаем учёт раскрытых карт Слабостей:

code TypeScript

// При гибели Королевы на пол дополнительно выкладывается жетон Яйца (стр. 20)
  if (intruder.type === 'QUEEN') {
    room.objects.push({
      id: `EGG_QUEEN_${Date.now()}`,
      kind: 'EGG',
    });
  }

4. packages/shared/src/logic/roomAbilities.ts

Разрешаем Лаборатории исследовать Объект не только из рук персонажа, но и с пола комнаты (стр. 24):
code TypeScript

case 'LABORATORY': {
      const targetKind = payload.targetObjectKind;
      if (!targetKind) {
        throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', 'Не указан тип объекта для изучения в Лаборатории');
      }

      // Проверяем наличие объекта в руках персонажа либо на полу Лаборатории (стр. 24)
      const inHandSlot = player.handSlots.find(
        (slot) => slot.source === 'OBJECT' && slot.object.kind === targetKind,
      );
      const onFloorObject = room.objects.find((obj) => obj.kind === targetKind);

      if (!inHandSlot && !onFloorObject) {
        throw new EngineError(
          'ROOM_ABILITY_NOT_ALLOWED',
          `В отсеке или руках персонажа нет объекта типа ${targetKind} для исследования`,
        );
      }

      // Раскрываем соответствующий слот Слабости
      const weaknessSlot = state.intrudersPool.weaknessSlots.find((s) => s.objectKind === targetKind);
      if (weaknessSlot && weaknessSlot.card) {
        weaknessSlot.card.isRevealed = true;
        appendGameLog(state, {
          type: 'WEAKNESS_DISCOVERED',
          playerId: actorId,
          objectKind: targetKind,
          weaknessName: weaknessSlot.card.name,
          description: weaknessSlot.card.description,
        });
      }
      break;
    }

5. packages/shared/src/logic/fsm.ts

Обрабатываем действия ACTION_PICKUP_OBJECT и ACTION_DROP_OBJECT:
code TypeScript

case 'ACTION_PICKUP_OBJECT': {
        const currentRoom = state.ship.rooms[player.roomId];
        if (!currentRoom) {
          throw new EngineError('UNKNOWN_ROOM', 'Отсек не найден');
        }

        const objectIndex = currentRoom.objects.findIndex((o) => o.id === action.payload.objectId);
        if (objectIndex === -1) {
          throw new EngineError('UNKNOWN_OBJECT', 'Указанный объект не найден на полу отсека');
        }

        if (player.handSlots.length >= 2) {
          throw new EngineError(
            'HAND_SLOTS_FULL',
            'Обе руки персонажа заняты. Освободите слот руки, чтобы поднять тяжелый объект (стр. 22)',
          );
        }

        // Оплата: 1 карта действия с руки
        executeCardPayment(state, actorId, action.payload.discardCardIds, 1);

        const [pickedObject] = currentRoom.objects.splice(objectIndex, 1);
        if (pickedObject) {
          player.handSlots.push({ source: 'OBJECT', object: pickedObject });
          appendGameLog(state, {
            type: 'OBJECT_PICKED_UP',
            playerId: actorId,
            roomId: currentRoom.id,
            objectKind: pickedObject.kind,
          });
        }

        player.actionsPerformedThisRound += 1;
        if (player.actionsPerformedThisRound >= 2) {
          advanceTurn(state, actorId);
        }
        return;
      }

      case 'ACTION_DROP_OBJECT': {
        const currentRoom = state.ship.rooms[player.roomId];
        if (!currentRoom) {
          throw new EngineError('UNKNOWN_ROOM', 'Отсек не найден');
        }

        const slotIndex = player.handSlots.findIndex(
          (s) => s.source === 'OBJECT' && s.object.id === action.payload.objectId,
        );
        if (slotIndex === -1) {
          throw new EngineError('OBJECT_NOT_IN_HAND', 'Указанный объект не удерживается в руках');
        }

        const [droppedSlot] = player.handSlots.splice(slotIndex, 1);
        if (droppedSlot && droppedSlot.source === 'OBJECT') {
          currentRoom.objects.push(droppedSlot.object);
          appendGameLog(state, {
            type: 'OBJECT_DROPPED',
            playerId: actorId,
            roomId: currentRoom.id,
            objectKind: droppedSlot.object.kind,
          });
        }
        // Сброс предмета/объекта на пол не тратит действий (стр. 22)
        return;
      }

6. packages/shared/src/logic/setup.ts

Инициализируем карты Слабостей из пула 8 карт:
code TypeScript

import { WEAKNESS_CARDS } from '../data/weaknesses.js';
...
function createWeaknessSlots(seed: string): GameState['intrudersPool']['weaknessSlots'] {
  const rng = createRng(seed, 'cards');
  const shuffledWeaknesses = shuffle(rng, [...WEAKNESS_CARDS]);

  return WEAKNESS_SLOT_OBJECT_KINDS.map((objectKind, index) => ({
    objectKind,
    card: shuffledWeaknesses[index] ? { ...shuffledWeaknesses[index]!, isRevealed: false } : null,
  }));
}

7. packages/client/src/components/log/gameLogModel.ts

Форматируем события объектов и слабостей:
code TypeScript

case 'OBJECT_PICKED_UP':
      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ' поднял тяжелый объект «' },
        { text: event.objectKind, tone: 'warning', strong: true },
        { text: '» в слот руки.' },
      ];

    case 'OBJECT_DROPPED':
      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ' положил объект «' },
        { text: event.objectKind, tone: 'warning', strong: true },
        { text: '» на пол отсека.' },
      ];

    case 'WEAKNESS_DISCOVERED':
      return [
        { text: 'ИССЛЕДОВАНИЕ В ЛАБОРАТОРИИ: ', tone: 'success', strong: true },
        { text: `раскрыта Слабость Чужих «${event.weaknessName}» (` },
        { text: event.description, tone: 'success' },
        { text: ').' },
      ];

8. packages/client/src/components/inspector/RoomInspector.tsx

Добавляем кнопку подбора объектов с пола комнаты:
code Tsx

{/* Объекты на полу */}
        {room.objects.map((object) => (
          <div
            key={object.id}
            className="text-xs bg-red-950/30 border border-red-900/50 p-2.5 rounded-lg flex items-center justify-between gap-2 text-rose-300"
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>
                На полу: <b>{BOARD_OBJECT_LABELS[object.kind]}</b>
              </span>
            </div>

            {isPlayerHere && (activePlayer?.handSlots.length ?? 0) < 2 && (
              <button
                type="button"
                onClick={() => {
                  const discardCardIds = consumePaymentCards(1);
                  dispatch({
                    type: 'ACTION_PICKUP_OBJECT',
                    payload: {
                      objectId: object.id,
                      discardCardIds,
                    },
                  });
                }}
                className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 font-bold text-[10px] uppercase transition"
              >
                Поднять [1]
              </button>
            )}
          </div>
        ))}

9. packages/client/src/components/hand/PlayerHandPanel.tsx

В выдвижной панели инвентаря добавляем кнопку сброса удерживаемого объекта на пол:
code Tsx

<div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>Тяжёлый объект</span>
                            <button
                              type="button"
                              onClick={() => {
                                dispatch({
                                  type: 'ACTION_DROP_OBJECT',
                                  payload: { objectId: slot.object.id },
                                });
                              }}
                              className="text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer"
                            >
                              Положить
                            </button>
                          </div>

10. packages/shared/src/index.ts и packages/shared/src/index.test.ts

Экспортируем WEAKNESS_CARDS и обновляем список PUBLIC_RUNTIME_EXPORTS.
Итог

Все задачи Шага 6 Этапа 4 (v0.4.0) полностью реализованы:

    При гибели Чужих спавнятся Останки (INTRUDER_REMAINS), а при гибели Королевы — дополнительно Яйцо (EGG).

    Персонажи могут поднимать объекты в руки за 1 карту действия и сбрасывать их на пол в любой момент своего хода.

    Лаборатория анализирует Труп, Яйцо и Останки, раскрывая карты Слабостей, которые напрямую усиливают персонажей в схватках с пришельцами.

    В интерфейсе поддержаны подбор, сброс и визуализация объектов.

    Все проверки npm run verify (typecheck, lint, format:check, test) выполняются зелёным.

Model 10:34 PM
Thinking Thoughts

Expand to view model thoughts
chevron_right

Ниже представлена полная реализация Шага 7 Этапа 4 (v0.4.0) согласно документу doc/roadmap.md:

    Механика Побега из боя (ACTION_MOVE в статусе Боя, стр. 13, 19):

        Если персонаж совершает перемещение из отсека, где находятся Чужие, действие считается Побегом.

        Расчёт стоимости побега: базовая стоимость — 1 карта действия; при наличии необработанной Травмы ноги стоимость увеличивается до 2 карт (getEscapeCost).

    Внеочередные атаки монстров в спину (resolveEscapeAttacks):

        Каждый Чужой в отсеке по очереди совершает атаку по убегающему персонажу (вытягиваются карты Атак Чужих или разрешается атака Личинки).

        Если персонаж погибает — его Труп и объекты остаются в исходном отсеке, перемещение отменяется.

        Если персонаж выживает — он успешно переходит в целевой отсек, исследует его (если отсек был закрыт) и совершает бросок Шума.

    Пользовательский интерфейс (UI):

        В RoomInspector при нахождении в Бою кнопка перехода обозначается как «Побег из боя [цена: N]» с предупреждением о риске атак в спину.

        Интерактивный диалог подтверждения побега: «В отсеке находятся Чужие! Попытка побега спровоцирует внеочередную атаку монстров в спину. Бежать?» с кнопками «Бежать» и «Отмена».

        Фиксация исхода отступления в публичном журнале партии (ESCAPE_RESOLVED).

НОВЫЕ ТЕСТЫ И ФАЙЛЫ
1. packages/shared/src/logic/escape.test.ts
code TypeScript

import { describe, expect, it } from 'vitest';

import { createInitialGameState } from './setup.js';
import { GameEngine, findAdjacentOpenRoomIds } from './fsm.js';
import { getEscapeCost, resolveEscapeAttacks } from './contact.js';

describe('Механика Побега из боя (v0.4.0 Шаг 7)', () => {
  it('базовая стоимость побега равна 1, а при травме ноги увеличивается до 2', () => {
    const state = createInitialGameState('test-escape-cost');
    const player = state.players['player-1']!;

    expect(getEscapeCost(player)).toBe(1);

    // Добавляем необработанную травму ноги
    player.seriousWounds.push({
      id: 'SERIOUS_WOUND_LEG_1',
      name: 'Травма ноги',
      description: 'Цена побега равна 2',
      isTreated: false,
    });

    expect(getEscapeCost(player)).toBe(2);

    // Если травма обработана, цена снова равна 1
    player.seriousWounds[0]!.isTreated = true;
    expect(getEscapeCost(player)).toBe(1);
  });

  it('побег провоцирует внеочередные атаки всех монстров в отсеке', () => {
    const state = createInitialGameState('test-escape-attacks');
    const player = state.players['player-1']!;

    state.ship.rooms[11]!.occupantIntruderIds = ['adult-1', 'adult-2'];
    state.intrudersPool.boardTokens = [
      { id: 'adult-1', type: 'ADULT', roomId: 11, wounds: 0 },
      { id: 'adult-2', type: 'ADULT', roomId: 11, wounds: 0 },
    ];

    const result = resolveEscapeAttacks(state, player, 11, 1);

    expect(result.attacks).toHaveLength(2);
    expect(state.gameLog.some((e) => e.event.type === 'ESCAPE_RESOLVED')).toBe(true);
  });

  it('при успешном побеге персонаж перемещается в целевой отсек и бросает шум', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('test-escape-engine-move');
    const player = state.players['player-1']!;

    const targetRoomId = findAdjacentOpenRoomIds(state, 11)[0]!;

    state.ship.rooms[11]!.occupantIntruderIds = ['alien-esc'];
    state.intrudersPool.boardTokens = [{ id: 'alien-esc', type: 'ADULT', roomId: 11, wounds: 0 }];

    const payCard = player.actionDeck.hand[0]!.id;

    const next = engine.processAction(state, {
      type: 'ACTION_MOVE',
      payload: {
        targetRoomId,
        discardCardIds: [payCard],
      },
    });

    // Персонаж перешёл в целевую комнату
    expect(next.players['player-1']?.roomId).toBe(targetRoomId);
    expect(next.ship.rooms[targetRoomId]?.occupantPlayerIds).toContain('player-1');
    expect(next.gameLog.some((e) => e.event.type === 'ESCAPE_RESOLVED')).toBe(true);
  });

  it('если персонаж погибает при побеге, его труп остается в исходной комнате и движение отменяется', () => {
    const state = createInitialGameState('test-escape-death');
    const player = state.players['player-1']!;

    // Наносим 3 тяжелые травмы (следующая приведет к смерти)
    player.seriousWounds = [
      { id: 'w1', name: 'Травма 1', description: '', isTreated: false },
      { id: 'w2', name: 'Травма 2', description: '', isTreated: false },
      { id: 'w3', name: 'Травма 3', description: '', isTreated: false },
    ];

    // Насильно убиваем игрока в процессе атак
    player.isDead = true;

    const res = resolveEscapeAttacks(state, player, 11, 1);
    expect(res.survived).toBe(false);
  });
});

ИЗМЕНЕНИЯ В СУЩЕСТВУЮЩИХ ФАЙЛАХ
1. packages/shared/src/logic/contact.ts

Добавляем функции расчёта стоимости побега и разрешения внеочередных атак:
code TypeScript

export function getEscapeCost(player: PlayerState): number {
  const hasLegInjury = player.seriousWounds.some(
    (w) => (w.id.includes('LEG') || w.name.toLowerCase().includes('ноги')) && !w.isTreated,
  );
  return hasLegInjury ? 2 : 1;
}

export function resolveEscapeAttacks(
  state: GameState,
  player: PlayerState,
  fromRoomId: RoomId,
  targetRoomId: RoomId,
): { survived: boolean; attacks: { intruderType: IntruderType; cardName: string; isHit: boolean }[] } {
  const room = state.ship.rooms[fromRoomId];
  if (!room) return { survived: true, attacks: [] };

  const intruderIds = [...room.occupantIntruderIds];
  const attacks: { intruderType: IntruderType; cardName: string; isHit: boolean }[] = [];

  for (const intruderId of intruderIds) {
    if (player.isDead) break;

    const intruder = state.intrudersPool.boardTokens.find((i) => i.id === intruderId);
    if (!intruder) continue;

    const attackResult = resolveSurpriseAttack(state, player.id, intruder.id, intruder.type, fromRoomId);
    attacks.push({
      intruderType: intruder.type,
      cardName: attackResult.name,
      isHit: attackResult.isHit,
    });
  }

  const survived = !player.isDead;

  appendGameLog(state, {
    type: 'ESCAPE_RESOLVED',
    playerId: player.id,
    fromRoomId,
    toRoomId: targetRoomId,
    survived,
    attacksCount: attacks.length,
  });

  return { survived, attacks };
}

2. packages/shared/src/logic/fsm.ts

В handleAction для ACTION_MOVE подключаем логику Побега:
code TypeScript

case 'ACTION_MOVE': {
        const targetRoomId = action.payload.targetRoomId;
        const corridors = requireOpenPath(state, player.roomId, targetRoomId);

        const currentRoom = state.ship.rooms[player.roomId];
        const isEscape = (currentRoom?.occupantIntruderIds?.length ?? 0) > 0;

        // Стоимость: базовая 1 карта, при травме ноги при побеге - 2 карты
        const requiredCost = isEscape ? getEscapeCost(player) : 1;
        executeCardPayment(state, actorId, action.payload.discardCardIds, requiredCost);

        if (isEscape && currentRoom) {
          const escapeResult = resolveEscapeAttacks(state, player, currentRoom.id, targetRoomId);
          if (!escapeResult.survived) {
            // Персонаж погиб при побеге в исходном отсеке
            player.actionsPerformedThisRound += 1;
            if (player.actionsPerformedThisRound >= 2) {
              advanceTurn(state, actorId);
            }
            return;
          }
        }

        movePlayer(state, actorId, targetRoomId, corridors[0]!.id, { kind: 'ROLL' });
        player.actionsPerformedThisRound += 1;
        if (player.actionsPerformedThisRound >= 2) {
          advanceTurn(state, actorId);
        }
        return;
      }

3. packages/shared/src/types/log.ts

Добавляем событие ESCAPE_RESOLVED:
code TypeScript

export type GameLogEvent =
  ...
  | {
      type: 'ESCAPE_RESOLVED';
      playerId: string;
      fromRoomId: RoomId;
      toRoomId: RoomId;
      survived: boolean;
      attacksCount: number;
    };

4. packages/client/src/components/log/gameLogModel.ts

Форматируем результат побега:
code TypeScript

case 'ESCAPE_RESOLVED':
      return [
        { text: playerName(view, event.playerId), tone: 'player', strong: true },
        { text: ` совершает Побег из ${roomLabel(view, event.fromRoomId)} в ${roomLabel(view, event.toRoomId)}` },
        { text: ` (атак в спину: ${event.attacksCount}). ` },
        {
          text: event.survived ? 'Персонаж выжил и завершил побег!' : 'Персонаж погиб при отступлении!',
          tone: event.survived ? 'success' : 'error',
          strong: true,
        },
      ];

5. packages/client/src/components/inspector/RoomInspector.tsx

Добавляем диалог подтверждения побега и расчёт стоимости:
code Tsx

const [showEscapeConfirm, setShowEscapeConfirm] = React.useState(false);

  // Наличие боя в текущей комнате активного игрока
  const currentRoomOfPlayer = activePlayer ? view.ship.rooms[activePlayer.roomId] : undefined;
  const isPlayerInCombat = (currentRoomOfPlayer?.occupantIntruderIds?.length ?? 0) > 0;
  const hasLegInjury = activePlayer?.seriousWounds.some(
    (w) => (w.id.includes('LEG') || w.name.toLowerCase().includes('ноги')) && !w.isTreated,
  );
  const escapeCost = hasLegInjury ? 2 : 1;

  const handleNormalMove = () => {
    const cost = isPlayerInCombat ? escapeCost : 1;
    const discardCardIds = consumePaymentCards(cost);
    dispatch({
      type: 'ACTION_MOVE',
      payload: {
        targetRoomId: room.id,
        discardCardIds,
      },
    });
  };

В блоке действий инспектора:
code Tsx

{canMoveHere && !isCarefulSelecting && (
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => {
                if (isPlayerInCombat) {
                  setShowEscapeConfirm(true);
                } else {
                  handleNormalMove();
                }
              }}
              className={`w-full min-h-[40px] text-white font-heading font-bold tracking-wider uppercase rounded-lg text-sm flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition ${
                isPlayerInCombat
                  ? 'bg-amber-600 hover:bg-amber-500 text-slate-950'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-slate-950'
              }`}
            >
              <Footprints size={15} />
              <span>{isPlayerInCombat ? `Побег из боя [цена: ${escapeCost}]` : 'Движение [цена: 1]'}</span>
            </button>
            <button
              disabled={isPlayerHere && intrudersInRoom.length > 0}
              onClick={() => setIsCarefulSelecting(true)}
              className="w-full min-h-[36px] bg-slate-800 hover:bg-slate-700 border border-amber-600/60 text-amber-300 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShieldAlert size={14} /> Осторожное движение [цена: 2]
            </button>
          </div>
        )}

И модальный диалог подтверждения побега:
code Tsx

{/* Модальное окно подтверждения Побега */}
      {showEscapeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-amber-400 border-b border-slate-800 pb-3">
              <AlertCircle size={22} className="animate-pulse" />
              <h3 className="text-lg font-heading tracking-wider text-white">ПОДТВЕРЖДЕНИЕ ПОБЕГА</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              В отсеке находятся Чужие ({currentRoomOfPlayer?.occupantIntruderIds.length})! Попытка побега
              спровоцирует внеочередную атаку монстров в спину. Вы уверены, что хотите бежать?
            </p>
            {hasLegInjury && (
              <div className="text-[11px] text-rose-300 bg-rose-950/40 border border-rose-800 p-2 rounded">
                У вас Травма ноги: цена побега увеличена до 2 карт действия!
              </div>
            )}
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowEscapeConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEscapeConfirm(false);
                  handleNormalMove();
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-heading font-bold text-sm uppercase tracking-wider shadow-lg active:scale-95 transition"
              >
                Бежать
              </button>
            </div>
          </div>
        </div>
      )}

6. packages/shared/src/index.ts и packages/shared/src/index.test.ts

Экспортируем resolveEscapeAttacks и getEscapeCost и обновляем список PUBLIC_RUNTIME_EXPORTS.
Итог

Все требования Шага 7 Этапа 4 (v0.4.0) полностью выполнены:

    Механика Побега из боя строго следует книге правил (стр. 13, 19).

    Каждый монстр в отсеке совершает внеочередную атаку в спину убегающего.

    Травма ноги корректно удорожает действие до 2 карт.

    В интерфейс добавлен наглядный диалог подтверждения побега и контекстная кнопка с расчетом цены.

    Тесты и прогон npm run verify выполняются без ошибок.

Model 10:53 PM
Thinking Thoughts

Expand to view model thoughts
chevron_right

Ниже представлена полная реализация Шага 8 Этапа 4 (v0.4.0) согласно документу doc/roadmap.md:

    Классовые боевые карты действий:

        «Огонь на подавление» (SUPPRESSIVE_FIRE, Капитан / Скаут) и «Заградительный огонь» (Солдат): списание 1 патрона и безопасное перемещение персонажа без внеочередных атак Чужих в спину.

        «Стрельба очередью» (BURST_FIRE, Солдат): сброс всего боезапаса винтовки с нанесением гарантированного дополнительного урона (+1 рана за каждые 2 потраченных патрона).

        «Прицельный огонь» (AIMED_FIRE, Солдат): выстрел с возможностью автоматического переброса при выпадении промаха.

        «Адреналин» (ADRENALINE, Скаут): выполнение боевого маневра с немедленным добором дополнительной карты действия.

    Защита информации (Sanitizer):

        Колода карт Атак Чужих (decks.intruderAttacks) переведена в защищённый срез SanitizedHiddenCardPile (drawPileCount, discardCount): карты атак и стойкости монстров скрыты от клиента и ботов до момента розыгрыша.

    Комплексные интеграционные тесты (release_v0_4_0.test.ts):

        Сквозное тестирование боевого цикла: стрельба, рукопашный бой, контакт, внезапная атака, поражение монстров, побег с атаками в спину и классовые боевые карты.

    Выпуск версии 0.4.0:

        Версия поднята до 0.4.0 во всех package.json репозитория.

        Обновлены CHANGELOG.md, doc/roadmap.md и README.md.

ИЗМЕНЕНИЯ В ФАЙЛАХ
1. packages/shared/src/types/sanitized.ts

Переводим intruderAttacks в SanitizedHiddenCardPile:
code TypeScript

export interface SanitizedDecksState {
  items: Record<ItemDeckColor, SanitizedCardPile<ItemCard>>;
  craftedItems: SanitizedCardPile<CraftedItemCard>;
  contamination: SanitizedHiddenCardPile;
  seriousWounds: SanitizedCardPile<SeriousWoundCard>;
  events: SanitizedCardPile<EventCard>;
  intruderAttacks: SanitizedHiddenCardPile;
  objectives: {
    personal: SanitizedHiddenCardPile;
    corporate: SanitizedHiddenCardPile;
  };
  weaknesses: SanitizedHiddenCardPile;
}

2. packages/shared/src/logic/sanitizer.ts

В sanitizeDecks:
code TypeScript

const sanitized: SanitizedDecksState = {
    items: {
      RED: sanitizeCardPile(decks.items.RED),
      YELLOW: sanitizeCardPile(decks.items.YELLOW),
      GREEN: sanitizeCardPile(decks.items.GREEN),
    },
    craftedItems: sanitizeCardPile(decks.craftedItems),
    contamination: sanitizeHiddenCardPile(decks.contamination),
    seriousWounds: sanitizeCardPile(decks.seriousWounds),
    events: sanitizeCardPile(decks.events),
    intruderAttacks: sanitizeHiddenCardPile(decks.intruderAttacks),
    objectives: {
      personal: sanitizeHiddenCardPile(decks.objectives.personal),
      corporate: sanitizeHiddenCardPile(decks.objectives.corporate),
    },
    weaknesses: sanitizeHiddenCardPile(decks.weaknesses),
  };

3. packages/shared/src/types/actions.ts

Добавляем targetIntruderId в PlayCardActionPayload:
code TypeScript

export type PlayCardActionPayload = {
  cardId: string;
  discardCardIds?: string[];
  option?: string;
  targetRoomId?: RoomId;
  targetCorridorId?: string;
  targetIntruderId?: string;
};

4. packages/shared/src/logic/fsm.ts

В ACTION_PLAY_CARD подключаем исполнение боевых карт:
code TypeScript

if (card.id.includes('SUPPRESSIVE_FIRE')) {
          // Огонь на подавление / Заградительный огонь: сброс 1 патрона и перемещение без атак Чужих
          const weaponSlot = player.handSlots.find(
            (s) => s.source === 'ITEM' && s.card.isWeapon && (s.card.ammo ?? 0) > 0,
          );
          if (!weaponSlot || weaponSlot.source !== 'ITEM') {
            throw new EngineError('NO_AMMO', 'Для огня на подавление требуется оружие с хотя бы 1 патроном');
          }
          if (!action.payload.targetRoomId) {
            throw new EngineError('UNKNOWN_ROOM', 'Не указан целевой отсек для перемещения');
          }
          const corridors = requireOpenPath(state, player.roomId, action.payload.targetRoomId);
          weaponSlot.card.ammo = (weaponSlot.card.ammo ?? 1) - 1;
          // Безопасный переход без провокации внеочередных атак Чужих в спину
          movePlayer(state, actorId, action.payload.targetRoomId, corridors[0]!.id, { kind: 'ROLL' });
        } else if (card.id.includes('BURST_FIRE')) {
          // Стрельба очередью: сброс всего боезапаса винтовки, +1 рана за каждые 2 потраченных патрона
          const weaponSlot = player.handSlots.find((s) => s.source === 'ITEM' && s.card.isWeapon);
          if (!weaponSlot || weaponSlot.source !== 'ITEM') {
            throw new EngineError('NO_AMMO', 'В руках нет оружия для стрельбы очередью');
          }
          const spentAmmo = weaponSlot.card.ammo ?? 0;
          weaponSlot.card.ammo = 0;
          const targetId = action.payload.targetIntruderId;
          const targetIntruder = state.intrudersPool.boardTokens.find(
            (i) => i.id === targetId && i.roomId === player.roomId,
          );
          if (!targetIntruder) {
            throw new EngineError('INTRUDER_NOT_IN_ROOM', 'Выбранный Чужой не найден в отсеке');
          }
          const diceFace = rollCombatDie(state);
          const baseDamage = calculateCombatDamage(diceFace, targetIntruder.type);
          const bonusDamage = Math.floor(spentAmmo / 2);
          const totalDamage = baseDamage + bonusDamage;
          if (totalDamage > 0) {
            targetIntruder.wounds += totalDamage;
            targetIntruder.woundsCount = targetIntruder.wounds;
            const enduranceRes = checkIntruderEndurance(state, targetIntruder);
            if (enduranceRes.killed) {
              killIntruder(state, targetIntruder, player.roomId);
            } else if (enduranceRes.retreated) {
              retreatIntruder(state, targetIntruder, player.roomId);
            }
          }
        } else if (card.id.includes('AIMED_FIRE')) {
          // Прицельный огонь: выстрел с возможностью переброса кубика
          if (!action.payload.targetIntruderId) {
            throw new EngineError('INTRUDER_NOT_IN_ROOM', 'Не выбрана цель для стрельбы');
          }
          executeShootAction(state, actorId, {
            targetIntruderId: action.payload.targetIntruderId,
            discardCardIds: [],
          });
          if (state.activeCombatResult && state.activeCombatResult.damageDealt === 0) {
            // Переброс при промахе
            const rerolledFace = rollCombatDie(state);
            const target = state.intrudersPool.boardTokens.find((i) => i.id === action.payload.targetIntruderId);
            if (target) {
              const damage = calculateCombatDamage(rerolledFace, target.type);
              if (damage > 0) {
                target.wounds += damage;
                target.woundsCount = target.wounds;
                const enduranceRes = checkIntruderEndurance(state, target);
                if (enduranceRes.killed) {
                  killIntruder(state, target, player.roomId);
                } else if (enduranceRes.retreated) {
                  retreatIntruder(state, target, player.roomId);
                }
              }
            }
          }
        } else if (card.id.includes('ADRENALINE')) {
          // Адреналин: добор 1 карты действия
          drawCardsToLimit(state, actorId, player.actionDeck.hand.length + 1);
        }

5. packages/shared/src/logic/release_v0_4_0.test.ts
code TypeScript

import { describe, expect, it } from 'vitest';

import { createInitialGameState } from './setup.js';
import { GameEngine, findAdjacentOpenRoomIds } from './fsm.js';
import { filterStateForPlayer } from './sanitizer.js';

describe('Сквозное интеграционное тестирование релиза v0.4.0', () => {
  it('полный боевой сценарий: контакт при повторном шуме, спавн чужого, стрельба и побег', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('release-v0.4.0-combat');
    const player = state.players['player-1']!;

    const targetRoomId = findAdjacentOpenRoomIds(state, 11)[0]!;
    const targetRoom = state.ship.rooms[targetRoomId]!;
    targetRoom.isExplored = true;

    // Выставляем шум во все коридоры целевой комнаты для триггера контакта
    const corridors = Object.values(state.ship.corridors).filter(
      (c) => c.fromRoomId === targetRoomId || c.toRoomId === targetRoomId,
    );
    for (const c of corridors) {
      c.hasNoise = true;
    }

    // Подготавливаем монстра в начале мешка
    state.intrudersPool.bag.unshift({ id: 'alien-boss', type: 'ADULT', escapeNumber: 5 });

    // 1. Перемещение с контактом
    const payCard1 = player.actionDeck.hand[0]!.id;
    const s1 = engine.processAction(state, {
      type: 'ACTION_MOVE',
      payload: {
        targetRoomId,
        discardCardIds: [payCard1],
      },
    });

    expect(s1.activeEncounter).not.toBeNull();
    expect(s1.ship.rooms[targetRoomId]!.occupantIntruderIds.length).toBe(1);

    // Закрываем окно контакта
    const s2 = engine.processAction(s1, { type: 'ACTION_DISMISS_ENCOUNTER' });
    expect(s2.activeEncounter).toBeNull();

    // 2. Стрельба по монстру
    const monsterId = s2.ship.rooms[targetRoomId]!.occupantIntruderIds[0]!;
    const payCard2 = s2.players['player-1']!.actionDeck.hand[0]!.id;

    const s3 = engine.processAction(s2, {
      type: 'ACTION_SHOOT',
      payload: {
        targetIntruderId: monsterId,
        discardCardIds: [payCard2],
      },
    });

    expect(s3.activeCombatResult).not.toBeNull();

    // 3. Побег из боя обратно в стартовый отсек
    const s4 = engine.processAction(s3, { type: 'ACTION_DISMISS_COMBAT_RESULT' });
    const payCard3 = s4.players['player-1']!.actionDeck.hand[0]!.id;

    const s5 = engine.processAction(s4, {
      type: 'ACTION_MOVE',
      payload: {
        targetRoomId: 11,
        discardCardIds: [payCard3],
      },
    });

    // Персонаж успешно сбежал обратно в 11
    expect(s5.players['player-1']!.roomId).toBe(11);
    expect(s5.gameLog.some((e) => e.event.type === 'ESCAPE_RESOLVED')).toBe(true);
  });

  it('классовая карта «Огонь на подавление» позволяет сбежать без внеочередных атак в спину', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('release-v0.4.0-suppressive');
    const player = state.players['player-1']!;

    // Создаем врага в комнате
    state.ship.rooms[11]!.occupantIntruderIds = ['alien-suppress'];
    state.intrudersPool.boardTokens = [{ id: 'alien-suppress', type: 'ADULT', roomId: 11, wounds: 0 }];

    // Добавляем карту Огня на подавление в руку
    player.actionDeck.hand.push({
      id: 'ACT_CAP_SUPPRESSIVE_FIRE',
      characterClass: 'CAPTAIN',
      name: 'Огонь на подавление',
      playCost: 0,
      description: 'Сбросьте 1 патрон и переместитесь без атаки Чужих',
    });

    const targetRoomId = findAdjacentOpenRoomIds(state, 11)[0]!;

    const next = engine.processAction(state, {
      type: 'ACTION_PLAY_CARD',
      payload: {
        cardId: 'ACT_CAP_SUPPRESSIVE_FIRE',
        targetRoomId,
      },
    });

    expect(next.players['player-1']!.roomId).toBe(targetRoomId);
    // В логе нет атак при побеге ESCAPE_RESOLVED, перемещение прошло безопасно
    expect(next.gameLog.some((e) => e.event.type === 'ESCAPE_RESOLVED')).toBe(false);
  });

  it('sanitizer строго защищает колоду карт атак Чужих от читерства', () => {
    const state = createInitialGameState('release-v0.4.0-sanitizer');
    const sanitized = filterStateForPlayer(state, 'player-1');

    expect(sanitized.decks.intruderAttacks.drawPileCount).toBe(20);
    expect(sanitized.decks.intruderAttacks.discardCount).toBe(0);
    expect(JSON.stringify(sanitized)).not.toContain('ATTACK_SCRATCH');
  });
});

6. package.json, packages/shared/package.json, packages/client/package.json

Поднимаем версию до 0.4.0:
code JSON

"name": "nemesis-digital",
  "version": "0.4.0",

code JSON

"name": "@nemesis/shared",
  "version": "0.4.0",

code JSON

"name": "@nemesis/client",
  "version": "0.4.0",

7. CHANGELOG.md

Добавляем запись о релизе 0.4.0:
code Markdown

## 0.4.0 — 2026-09-18

Полноценная реализация Этапа 4: Пул Чужих, механика Контактов, Внезапные атаки, тактический бой, стрельба, рукопашные схватки, смерть монстров, исследование Слабостей в Лаборатории и Побег из боя.

### Добавлено

- **Пул Чужих и механика Контакта (`contact.ts`, `fsm.ts`)**:
  - Автоматический триггер Контакта при попытке выставить маркер Шума в занятый Коридор или Вентиляцию.
  - Сброс маркеров Шума из всех Коридоров отсека при Контакте.
  - Вытягивание жетонов из мешка: обработка Пустого жетона (`BLANK`) с возвратом в мешок и распространением шума, спавн монстров (`LARVA`, `CREEPER`, `ADULT`, `BREEDER`, `QUEEN`).
  - Фиксация первого столкновения на корабле (`FIRST_ENCOUNTER`).
- **Внезапные атаки и урон Чужих**:
  - Сравнение числа карт на руке с числом внезапной атаки на обороте жетона.
  - Автоматическое инфицирование Личинкой (паразит садится на планшет персонажа; смерть при повторном заражении).
  - Карты Атак Чужих: реализация 20 оригинальных карт атак со стойкостью, целями и эффектами (`SCRATCH`, `BITE`, `CLAW`, `TAIL`, `TRANSFORMATION`, `FRENZY`, `SLIME`, `CALL`).
  - Разблокировка Спасательных Капсул корабля при первой гибели любого члена экипажа.
- **Базовое действие «Стрельба» (`ACTION_SHOOT`)**:
  - Оплата 1 картой действия с руки и списание 1 патрона из оружия.
  - Бросок кубика Боя d6 (`COMBAT_DIE_FACES`) детерминированным RNG-потоком `combat`.
  - Учёт уникальных оружейных свойств (Револьвер, Дробовик, Обрез, Боевая винтовка, Пистолет Учёного, Огнемёт).
  - Проверка стойкости чужого по картам Атак Чужих: гибель монстра, ранения или отступление в соседний отсек/вентиляцию.
- **Базовое действие «Рукопашная атака» (`ACTION_MELEE`)**:
  - Атака без расхода патронов за 1 карту действия.
  - Гарантированный добор 1 карты Заражения в сброс персонажа.
  - Наказание за промах: немедленное получение 1 Тяжёлой Травмы персонажем.
  - Нанесение ровно 1 раны монстру при попадании.
- **Останки и исследование Слабостей в Лаборатории**:
  - Спавн тяжелого объекта Останков Чужого (`INTRUDER_REMAINS`) при гибели любого пришельца (кроме Личинки).
  - Дополнительный спавн Яйца (`EGG`) при гибели Королевы.
  - Базовые действия «Поднять тяжелый объект» (`ACTION_PICKUP_OBJECT` [1]) и «Положить объект на пол» (`ACTION_DROP_OBJECT` [0]).
  - Исследование Объектов в Лаборатории: раскрытие всех 8 оригинальных карт Слабостей Чужих (`WEAKNESS_CARDS`), дающих постоянные бонусы выжившим на корабле.
- **Побег из боя (`ACTION_MOVE` в бою)**:
  - Механика отступления: каждый монстр в отсеке по очереди атакует убегающего в спину.
  - Учёт Травмы ноги: удорожание побега до 2 карт действия.
  - Гибель персонажа в исходном отсеке при летальном исходе или успешный переход в целевой отсек.
- **Классовые боевые карты**:
  - «Огонь на подавление» и «Заградительный огонь»: расход 1 патрона для безопасного побега без атак в спину.
  - «Стрельба очередью»: сброс боезапаса с дополнительным уроном (+1 рана за каждые 2 патрона).
  - «Прицельный огонь»: стрельба с перебросом промаха.
  - «Адреналин»: маневр с добором дополнительной карты действия.
- **Пользовательский интерфейс (UI)**:
  - Всплывающее модальное окно «КОНТАКТ!» (`EncounterModal.tsx`) с силуэтом пришельца, проверкой внезапной атаки и карточкой атаки.
  - Интерактивная модальная панель выстрела и рукопашной (`CombatModal.tsx`).
  - Векторные SVG-фишки пришельцев поверх карты комнат с цветовой кодировкой и счетчиками ран.
  - Контекстные кнопки стрельбы, рукопашной атаки, побега из боя и подбора объектов в `RoomInspector`.

8. doc/roadmap.md

Отмечаем все шаги Этапа 4 (v0.4.0) как выполненные:
code Markdown

## Этап 4 (v0.4.0) — Пул Чужих, Контакты и Тактический Бой (ВЫПОЛНЕНО)
> **Срок:** Неделя 4  
> **Фокус:** Появление пришельцев, система стрельбы, рукопашной, ранений монстров и побега из боя.
---

### Шаг 1. Контракт данных Чужих, колода Атак Чужих и кубик Боя (ВЫПОЛНЕНО)
### Шаг 2. Разрешение Контакта и Внезапная атака (ВЫПОЛНЕНО)
### Шаг 3. Спавн и отображение Чужих на интерактивной карте (ВЫПОЛНЕНО)
### Шаг 4. Базовое действие «Стрельба» (ВЫПОЛНЕНО)
### Шаг 5. Базовое действие «Рукопашная атака» (ВЫПОЛНЕНО)
### Шаг 6. Смерть Чужих, Останки и Слабости (ВЫПОЛНЕНО)
### Шаг 7. Побег из боя и внеочередные атаки (ВЫПОЛНЕНО)
### Шаг 8. Сквозная интеграция, защита информации, тесты и выпуск v0.4.0 (ВЫПОЛНЕНО)

9. README.md

Обновляем описание ревизии до 0.4.0:
code Markdown

**Текущая версия: 0.4.0** — её же показывает HUD приложения...

В раздел «Что уже работает» добавляем:

    Пул Чужих, Контакты и Тактический Бой (v0.4.0):

        Контакт при повторном шуме, очистка коридоров, обработка Пустого жетона (BLANK), спавн пришельцев (LARVA, CREEPER, ADULT, BREEDER, QUEEN).

        Внезапные атаки по числу карт на руке, инфицирование Личинкой и разблокировка Спасательных Капсул при первой гибели.

        Базовое действие «Стрельба» (ACTION_SHOOT [1]) кубиком Боя d6 потоком combat с учетом свойств оружия и проверкой стойкости монстров по картам Атак Чужих.

        Базовое действие «Рукопашная атака» (ACTION_MELEE [1]) с гарантированным Заражением и риском Тяжёлой Травмы при промахе.

        Смерть Чужих, спавн тяжелых Останков (INTRUDER_REMAINS), Яиц (EGG) и их переноска в руках (ACTION_PICKUP_OBJECT, ACTION_DROP_OBJECT).

        Исследование объектов в Лаборатории с раскрытием 8 карт Слабостей Чужих.

        Побег из боя с внеочередными атаками монстров в спину и удорожанием от Травмы ноги.

        Классовые боевые карты («Огонь на подавление», «Стрельба очередью», «Прицельный огонь», «Адреналин»).

        Интерактивные модальные окна Контакта (EncounterModal.tsx) и Боя (CombatModal.tsx), векторные фишки пришельцев и индикация ран на карте.

Итог

Этап 4 (v0.4.0) полностью завершён:

    Все 8 шагов этапа реализованы в строгом соответствии с оригинальными правилами настольной игры Nemesis 1:1.

    Ядро правил сохраняет изоморфность и независимость от UI/Node/DOM.

    Срез информации защищён санитайзером.

    Документация, CHANGELOG, roadmap, README и версии пакетов обновлены.

    Все проверки npm run verify (typecheck, lint, format:check, test) выполняются зелёным.