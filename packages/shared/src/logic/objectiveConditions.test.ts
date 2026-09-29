import { describe, expect, it } from 'vitest';
import {
  CORPORATE_OBJECTIVE_CARDS,
  PERSONAL_OBJECTIVE_CARDS,
  SOLO_COOP_OBJECTIVE_CARDS,
} from '../data/objectiveCards.js';
import type { ObjectiveCard } from '../types/cards.js';
import type { EndgameFacts } from '../types/endgame.js';
import { expectEngineError } from '../testing/contactFixtures.js';
import { OBJECTIVE_CONDITIONS, metObjectiveCondition, type ObjectiveContext } from './objectiveConditions.js';
import { createInitialGameState } from './setup.js';

const ALL = [...PERSONAL_OBJECTIVE_CARDS, ...CORPORATE_OBJECTIVE_CARDS, ...SOLO_COOP_OBJECTIVE_CARDS];
const card = (id: string): ObjectiveCard => ALL.find((entry) => entry.id === id)!;

const NO_FACTS: EndgameFacts = {
  hiveDestroyed: false,
  queenKilled: false,
  allRoomsExplored: false,
  studiedObjectKinds: [],
};

function context(overrides: Partial<ObjectiveContext> = {}): ObjectiveContext {
  const state = createInitialGameState('objective-conditions', { playerCount: 3 });
  return {
    state,
    player: state.players['player-1']!,
    survivorIds: ['player-1'],
    shipDestroyed: false,
    destinationReached: null,
    facts: NO_FACTS,
    ...overrides,
  };
}

describe('Условия Целей Финального Валидатора', () => {
  it('у каждой из 25 карт проверка на каждый вариант «ИЛИ»', () => {
    for (const objective of ALL) {
      expect(OBJECTIVE_CONDITIONS[objective.id]?.length, objective.name).toBe(objective.conditions.length);
    }
    expect(Object.keys(OBJECTIVE_CONDITIONS).sort()).toEqual(ALL.map((objective) => objective.id).sort());
  });

  it('Цель без проверки — явная ошибка, а не молчаливое поражение', () => {
    expectEngineError(
      () => metObjectiveCondition({ ...card('OBJ_CORPORATE_AB_OVO'), id: 'OBJ_UNKNOWN' }, context()),
      'OBJECTIVE_NOT_EVALUABLE',
    );
  });

  it('«Карантин»: Марс — первый вариант; Земля и Улей уничтожен — второй', () => {
    expect(metObjectiveCondition(card('OBJ_PERSONAL_QUARANTINE'), context({ destinationReached: 'MARS' }))).toBe(0);
    expect(metObjectiveCondition(card('OBJ_PERSONAL_QUARANTINE'), context({ destinationReached: 'EARTH' }))).toBeNull();
    expect(
      metObjectiveCondition(
        card('OBJ_PERSONAL_QUARANTINE'),
        context({ destinationReached: 'EARTH', facts: { ...NO_FACTS, hiveDestroyed: true } }),
      ),
    ).toBe(1);
  });

  it('Слабости: Некроскопия — Сигнал и Останки; полевая биология — 2 любые', () => {
    const studied = { ...NO_FACTS, studiedObjectKinds: ['INTRUDER_REMAINS' as const, 'EGG' as const] };
    const base = context({ facts: studied });
    expect(metObjectiveCondition(card('OBJ_CORPORATE_NECROSCOPY'), base)).toBeNull();
    base.player.hasSignalSent = true;
    expect(metObjectiveCondition(card('OBJ_CORPORATE_NECROSCOPY'), base)).toBe(0);
    expect(metObjectiveCondition(card('OBJ_CORPORATE_EXTREME_FIELD_BIOLOGY'), base)).toBe(0);
    expect(metObjectiveCondition(card('OBJ_CORPORATE_AB_OVO'), base)).toBe(0);
  });

  it('«Лучшие друзья»: вы и ещё хотя бы 1 Персонаж; «Только ваш Персонаж» — один выживший', () => {
    expect(metObjectiveCondition(card('OBJ_PERSONAL_BEST_FRIENDS'), context())).toBeNull();
    expect(
      metObjectiveCondition(card('OBJ_PERSONAL_BEST_FRIENDS'), context({ survivorIds: ['player-1', 'player-3'] })),
    ).toBe(0);
    expect(metObjectiveCondition(card('OBJ_PERSONAL_SAVE_PROPERTY'), context())).toBe(1);
  });

  it('«Вскрытие покажет»: Синий Труп лежит в Операционной', () => {
    const base = context();
    const surgery = base.state.ship.rooms[2]!;
    surgery.definitionId = 'SURGERY';
    surgery.objects = [];
    expect(metObjectiveCondition(card('OBJ_SOLO_AUTOPSY'), base)).toBeNull();
    surgery.objects.push({ id: 'blue', kind: 'CORPSE', characterClass: null });
    expect(metObjectiveCondition(card('OBJ_SOLO_AUTOPSY'), base)).toBe(0);
  });

  it('«Неутомимый исследователь» требует и Сигнала, и всех Исследованных Комнат', () => {
    const base = context({ facts: { ...NO_FACTS, allRoomsExplored: true } });
    expect(metObjectiveCondition(card('OBJ_PERSONAL_TIRELESS_EXPLORER'), base)).toBeNull();
    base.player.hasSignalSent = true;
    expect(metObjectiveCondition(card('OBJ_PERSONAL_TIRELESS_EXPLORER'), base)).toBe(0);
  });
});
