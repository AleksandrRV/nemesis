import { describe, expect, it } from 'vitest';
import { ACTION_CARDS } from '../data/actionCards.js';
import {
  CORPORATE_OBJECTIVE_CARDS,
  PERSONAL_OBJECTIVE_CARDS,
  SOLO_COOP_OBJECTIVE_CARDS,
  objectivesForPlayerCount,
} from '../data/objectiveCards.js';
import { contactState, expectEngineError, forceToken } from '../testing/contactFixtures.js';
import type { ActionCard, ContaminationCard } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import { createRng } from '../utils/rng.js';
import { resolveContact } from './contact.js';
import { GameEngine } from './fsm.js';
import { drainInterrupts } from './interrupts.js';
import { dealObjectives } from './objectives.js';
import { filterStateForPlayer } from './sanitizer.js';
import { createInitialGameState } from './setup.js';

const REST: ActionCard = {
  id: 'TEST_REST',
  characterClass: 'CAPTAIN',
  name: 'Отдых',
  playCost: 0,
  description: '',
  effect: { kind: 'REST' },
};

function infectedCard(): ContaminationCard {
  return { id: 'INFECTED_CARD', isInfected: true, isScanned: false };
}

function chooseObjective(state: GameState, objectiveIndex = 0): GameState {
  const decision = state.pendingDecision;
  if (decision?.type !== 'CHOOSE_OBJECTIVE') throw new Error('Ожидался выбор Цели');
  return new GameEngine().processAction(
    state,
    {
      type: 'ACTION_RESOLVE_DECISION',
      payload: { decisionId: decision.id, selectedOption: decision.objectiveIds[objectiveIndex]! },
    },
    { actorId: decision.playerId },
  );
}

describe('Подготовка: раздача Целей (стр. 8, шаг 16; стр. 27)', () => {
  it('в Соло игрок получает 2 карты Соло/Кооп Целей вместо обычных', () => {
    const state = createInitialGameState('objectives-solo');
    const objectives = state.players['player-1']!.objectives;

    expect(state.meta.gameMode).toBe('SOLO');
    expect(objectives).toHaveLength(2);
    expect(objectives.every((card) => card.kind === 'SOLO_COOP')).toBe(true);
    expect(new Set(objectives.map((card) => card.id)).size).toBe(2);
  });

  it.each([2, 3, 4, 5])('на %i игроков каждый получает 1 Корпоративную и 1 Личную Цель без повторов', (playerCount) => {
    const state = createInitialGameState(`objectives-${playerCount}`, { playerCount });
    const dealt = Object.values(state.players).flatMap((player) => player.objectives);

    for (const player of Object.values(state.players)) {
      expect(player.objectives.map((card) => card.kind)).toEqual(['CORPORATE', 'PERSONAL']);
    }
    expect(new Set(dealt.map((card) => card.id)).size).toBe(playerCount * 2);
    expect(dealt.every((card) => card.minPlayers !== null && card.minPlayers <= playerCount)).toBe(true);
  });

  it('убирает карты со значком больше числа игроков: на двоих нет «Старинного друга» и «Старого спора»', () => {
    const personal = objectivesForPlayerCount(PERSONAL_OBJECTIVE_CARDS, 2).map((card) => card.name);
    const corporate = objectivesForPlayerCount(CORPORATE_OBJECTIVE_CARDS, 2).map((card) => card.name);

    expect(personal).toHaveLength(6);
    expect(corporate).toHaveLength(6);
    expect(personal).not.toContain('Старинный друг');
    expect(corporate).not.toContain('Старый спор');
    expect(objectivesForPlayerCount(PERSONAL_OBJECTIVE_CARDS, 5)).toHaveLength(9);
  });

  it('раздача детерминирована по сиду и не сдвигает расклад колод', () => {
    const first = createInitialGameState('objectives-seed', { playerCount: 3 });
    const second = createInitialGameState('objectives-seed', { playerCount: 3 });

    expect(first.players).toEqual(second.players);
    expect(first.decks).toEqual(second.decks);
    expect(first.meta.rngDraws.cards).toBeGreaterThan(0);
  });

  it('раздаёт независимые копии карт: изменение Цели игрока не трогает данные', () => {
    const state = createInitialGameState('objectives-copy', { playerCount: 2 });
    state.players['player-1']!.objectives[0]!.name = 'Изменено';

    expect([...CORPORATE_OBJECTIVE_CARDS, ...PERSONAL_OBJECTIVE_CARDS].some((card) => card.name === 'Изменено')).toBe(
      false,
    );
  });

  it('Соло/Кооп колоды не хватает больше чем на 3 игроков — явный отказ, а не выдуманные Цели', () => {
    const players = Object.values(createInitialGameState('objectives-coop', { playerCount: 4 }).players);

    expectEngineError(
      () => dealObjectives(players, 'COOP', createRng('objectives-coop', 'cards')),
      'OBJECTIVE_DECK_EXHAUSTED',
    );
    expect(SOLO_COOP_OBJECTIVE_CARDS).toHaveLength(7);
  });
});

describe('Первый Контакт: пауза и выбор Цели (стр. 12)', () => {
  it('оставляет выбранную Цель, вторую удаляет втайне и продолжает игру', () => {
    const state = contactState(1, 'objectives-contact');
    forceToken(state, 'ADULT', 1);
    const [kept, dropped] = state.players['player-1']!.objectives;
    resolveContact(state, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 11, source: 'NOISE' });
    drainInterrupts(state);
    const paused = state;

    expect(paused.pendingDecision).toMatchObject({ type: 'CHOOSE_OBJECTIVE', playerId: 'player-1' });
    const next = chooseObjective(paused, 0);

    expect(next.players['player-1']!.objectives).toEqual([kept]);
    expect(JSON.stringify(next)).not.toContain(dropped!.id);
    expect(next.pendingDecision).toBeNull();
    expect(next.gameLog.some((entry) => entry.event.type === 'OBJECTIVE_CHOSEN')).toBe(true);
  });

  it('отклоняет Цель не из своей пары явной ошибкой', () => {
    const state = contactState(1, 'objectives-reject');
    forceToken(state, 'ADULT', 1);
    resolveContact(state, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 11, source: 'NOISE' });
    drainInterrupts(state);
    const paused = state;

    expectEngineError(
      () =>
        new GameEngine().processAction(paused, {
          type: 'ACTION_RESOLVE_DECISION',
          payload: { decisionId: paused.pendingDecision!.id, selectedOption: CORPORATE_OBJECTIVE_CARDS[0]!.id },
        }),
      'INVALID_DECISION_OPTION',
    );
  });

  it('Ползун из погибшего носителя — первая миниатюра на поле: выжившие выбирают Цель', () => {
    const state = contactState(2, 'objectives-creeper');
    const carrier = state.players['player-1']!;
    carrier.hasLarva = true;
    carrier.actionDeck.hand.push(infectedCard(), structuredClone(REST));

    const next = new GameEngine().processAction(state, { type: 'ACTION_PLAY_CARD', payload: { cardId: REST.id } });

    expect(next.players['player-1']!.isDead).toBe(true);
    expect(next.intrudersPool.firstEncounterOccurred).toBe(true);
    expect(next.gameLog.some((entry) => entry.event.type === 'FIRST_CONTACT')).toBe(true);
    expect(next.pendingDecision).toMatchObject({ type: 'CHOOSE_OBJECTIVE', playerId: 'player-2' });
  });

  it('чужой выбор Цели скрыт в срезе: видно только, кто принимает решение', () => {
    const state = contactState(2, 'objectives-hidden');
    forceToken(state, 'ADULT', 1);
    resolveContact(state, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 11, source: 'NOISE' });
    drainInterrupts(state);
    const paused = state;
    const view = filterStateForPlayer(paused, 'player-2');

    expect(view.pendingDecisionPlayerId).toBe('player-1');
    expect(view.pendingDecision).toBeNull();
    for (const objective of paused.players['player-1']!.objectives) {
      expect(JSON.stringify(view)).not.toContain(objective.id);
    }
  });

  it('при Внезапной Атаке сначала все выбирают Цель, затем владелец решает про «Стальные нервы»', () => {
    const state = contactState(1, 'objectives-nerves');
    forceToken(state, 'ADULT', 4);
    const player = state.players['player-1']!;
    const nerves = ACTION_CARDS.find((card) => card.id === 'ACT_SOL_STEEL_NERVES')!;
    player.actionDeck.hand = [structuredClone(nerves)];
    resolveContact(state, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 11, source: 'NOISE' });
    drainInterrupts(state);

    expect(state.pendingDecision).toMatchObject({ type: 'CHOOSE_OBJECTIVE' });
    const next = chooseObjective(state);
    expect(next.pendingDecision).toMatchObject({ type: 'STEEL_NERVES_OFFER', playerId: 'player-1' });
  });
});
