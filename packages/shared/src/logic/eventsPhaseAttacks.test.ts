import { describe, expect, it } from 'vitest';
import { INTRUDER_ATTACK_CARDS } from '../data/intruderAttacks.js';
import { WEAKNESS_CARDS } from '../data/weaknesses.js';
import type { GameState } from '../types/state.js';
import { sufferSeriousWound } from './characterDamage.js';
import { resolveEventPhaseAttacks, selectAttackTarget } from './eventsPhaseAttacks.js';
import { runEventPhase } from './eventsPhase.js';
import { createInitialGameState } from './setup.js';
import { putIntruder } from '../testing/contactFixtures.js';

function freshState(seed: string, playerCount = 2): GameState {
  return createInitialGameState(seed, { playerCount });
}

/** Верх колоды Атак — одна конкретная карта. */
function stackAttackDeck(state: GameState, topCardId: string): void {
  const top = structuredClone(INTRUDER_ATTACK_CARDS.find((card) => card.id === topCardId)!);
  const rest = INTRUDER_ATTACK_CARDS.filter((card) => card.id !== topCardId).map((card) => structuredClone(card));
  state.decks.intruderAttacks = { drawPile: [top, ...rest], discard: [] };
}

function attackEvents(state: GameState) {
  return state.gameLog.flatMap((entry) => (entry.event.type === 'EVENT_PHASE_ATTACK_RESOLVED' ? [entry.event] : []));
}

describe('Выбор цели Атаки Чужого (стр. 20, шаг 1)', () => {
  it('нет подходящих Персонажей в отсеке — цели нет', () => {
    const state = freshState('atk-target-empty', 1);
    state.players['player-1']!.roomId = 12;

    expect(selectAttackTarget(state, 11)).toBeNull();
  });

  it('Анабиоз, Капсула и смерть выводят Персонажа из-под атаки', () => {
    const state = freshState('atk-target-ineligible', 2);
    state.players['player-1']!.isInHibernation = true;
    state.players['player-2']!.hasEscapedInPod = true;

    expect(selectAttackTarget(state, 11)).toBeNull();

    state.players['player-2']!.hasEscapedInPod = false;
    state.players['player-2']!.isDead = true;
    expect(selectAttackTarget(state, 11)).toBeNull();
  });

  it('атакуется Персонаж с наименьшим числом карт на руке', () => {
    const state = freshState('atk-target-fewest');
    state.players['player-1']!.actionDeck.hand.splice(0, 2);

    expect(selectAttackTarget(state, 11)).toBe('player-1');
  });

  it('при равенстве карт атакуется владелец жетона Первого Игрока', () => {
    const state = freshState('atk-target-first');
    expect(state.meta.firstPlayerId).toBe('player-1');

    expect(selectAttackTarget(state, 11)).toBe('player-1');
  });

  it('если Первого Игрока нет в отсеке — ближайший по часовой стрелке', () => {
    const state = freshState('atk-target-clockwise', 3);
    state.players['player-1']!.roomId = 12;

    expect(state.meta.firstPlayerId).toBe('player-1');
    expect(selectAttackTarget(state, 11)).toBe('player-2');
  });
});

describe('Шаг 5 Фазы Событий: Атаки Чужих (стр. 10, 20)', () => {
  it('нет символа атакующего на карте — атака проходит мимо', () => {
    const state = freshState('atk-miss', 1);
    const intruderId = putIntruder(state, 'ADULT', 11);
    stackAttackDeck(state, 'IAT_TAIL_1');

    resolveEventPhaseAttacks(state);

    const [event] = attackEvents(state);
    expect(event).toMatchObject({
      roomId: 11,
      intruderId,
      intruderType: 'ADULT',
      playerId: 'player-1',
      outcome: 'MISS',
      card: { id: 'IAT_TAIL_1' },
    });
    expect(state.players['player-1']!.lightWounds).toBe(0);
    expect(state.players['player-1']!.seriousWounds).toHaveLength(0);
  });

  it('Царапина: Лёгкая Травма и карта Заражения', () => {
    const state = freshState('atk-scratch', 1);
    putIntruder(state, 'ADULT', 11);
    stackAttackDeck(state, 'IAT_SCRATCH_1');

    resolveEventPhaseAttacks(state);

    const [event] = attackEvents(state);
    expect(event).toMatchObject({ outcome: 'HIT', card: { id: 'IAT_SCRATCH_1' } });
    expect(state.players['player-1']!.lightWounds).toBe(1);
    expect(
      state.gameLog.some(
        (entry) => entry.event.type === 'CONTAMINATION_RECEIVED' && entry.event.playerId === 'player-1',
      ),
    ).toBe(true);
  });

  it('Личинка инфицирует без карты Атаки: Заражение в сброс, миниатюра снята', () => {
    const state = freshState('atk-larva', 1);
    const larvaId = putIntruder(state, 'LARVA', 11);
    const discardBefore = state.players['player-1']!.actionDeck.discard.length;

    resolveEventPhaseAttacks(state);

    const [event] = attackEvents(state);
    expect(event).toMatchObject({ outcome: 'INFESTATION', intruderType: 'LARVA' });
    expect(state.players['player-1']!.hasLarva).toBe(true);
    expect(state.players['player-1']!.actionDeck.discard.length).toBe(discardBefore + 1);
    expect(state.intrudersPool.boardTokens.find((token) => token.id === larvaId)).toBeUndefined();
    expect(state.ship.rooms[11]!.occupantIntruderIds).toHaveLength(0);
  });

  it('подавленная Зовом особь не атакует в этой фазе', () => {
    const state = freshState('atk-suppressed', 1);
    state.meta.phase = 'EVENT_PHASE';
    const intruderId = putIntruder(state, 'ADULT', 11);
    state.intrudersPool.attackSuppression[intruderId] = { round: state.meta.currentRound, phase: 'EVENT_PHASE' };
    const drawBefore = state.decks.intruderAttacks.drawPile.length;

    resolveEventPhaseAttacks(state);

    const [event] = attackEvents(state);
    expect(event).toMatchObject({ outcome: 'SUPPRESSED', card: null, victims: [] });
    expect(state.decks.intruderAttacks.drawPile.length).toBe(drawBefore);
  });

  it('«Повадки атаки»: Укус Взрослой Особи бьёт Лёгкой Травмой вместо Тяжёлой', () => {
    const state = freshState('atk-weakness', 1);
    putIntruder(state, 'ADULT', 11);
    stackAttackDeck(state, 'IAT_BITE_1');
    const weakness = structuredClone(WEAKNESS_CARDS.find((card) => card.id === 'WK_ATTACK_BEHAVIOR')!);
    weakness.isRevealed = true;
    state.intrudersPool.weaknessSlots[0]!.card = weakness;

    resolveEventPhaseAttacks(state);

    expect(state.players['player-1']!.lightWounds).toBe(1);
    expect(state.players['player-1']!.seriousWounds).toHaveLength(0);
  });

  it('без Слабости Укус даёт Тяжёлую Травму; третья убивает с Трупом', () => {
    const state = freshState('atk-bite-death', 1);
    putIntruder(state, 'ADULT', 11);
    stackAttackDeck(state, 'IAT_BITE_1');
    sufferSeriousWound(state, 'player-1');
    sufferSeriousWound(state, 'player-1');

    resolveEventPhaseAttacks(state);

    expect(state.players['player-1']!.isDead).toBe(true);
    expect(state.ship.rooms[11]!.objects.some((object) => object.kind === 'CORPSE')).toBe(true);
    expect(attackEvents(state)[0]!.victims).toContainEqual(
      expect.objectContaining({ playerId: 'player-1', isDead: true }),
    );
  });

  it('два Чужих в отсеке: после гибели цели второй атакует следующего', () => {
    const state = freshState('atk-retarget', 2);
    putIntruder(state, 'ADULT', 11);
    putIntruder(state, 'ADULT', 11);
    stackAttackDeck(state, 'IAT_BITE_1');
    sufferSeriousWound(state, 'player-1');
    sufferSeriousWound(state, 'player-1');

    resolveEventPhaseAttacks(state);

    const events = attackEvents(state);
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.playerId)).toEqual(['player-1', 'player-2']);
  });

  it('Исступление выкашивает отсек: партия кончается без активных Персонажей', () => {
    const state = freshState('atk-frenzy-wipe', 1);
    putIntruder(state, 'BREEDER', 11);
    stackAttackDeck(state, 'IAT_FRENZY_1');
    sufferSeriousWound(state, 'player-1');
    sufferSeriousWound(state, 'player-1');
    state.meta.phase = 'EVENT_PHASE';

    runEventPhase(state);

    expect(state.meta.phase).toBe('GAME_OVER');
    expect(state.meta.gameOverReason).toBe('NO_ACTIVE_CHARACTERS');
    const types = state.gameLog.map((entry) => entry.event.type);
    expect(types).toContain('EVENT_PHASE_ATTACK_RESOLVED');
    expect(types).not.toContain('ROUND_STARTED');
  });

  it('оркестратор исполняет атаки вместо пропуска Шага 5', () => {
    const state = freshState('atk-orchestrated', 1);
    putIntruder(state, 'ADULT', 11);
    stackAttackDeck(state, 'IAT_TAIL_1');
    state.meta.phase = 'EVENT_PHASE';

    runEventPhase(state);

    const types = state.gameLog.map((entry) => entry.event.type);
    const skipped = state.gameLog.flatMap((entry) =>
      entry.event.type === 'EVENT_PHASE_STEP_SKIPPED' ? [entry.event.step] : [],
    );
    expect(state.meta.phase).toBe('PLAYER_PHASE');
    expect(types).toContain('EVENT_PHASE_ATTACK_RESOLVED');
    expect(skipped).toEqual([8]);
    expect(types.indexOf('EVENT_PHASE_ATTACK_RESOLVED')).toBeLessThan(types.indexOf('ROUND_STARTED'));
  });
});
