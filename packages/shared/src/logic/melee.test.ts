import { afterEach, describe, expect, it, vi } from 'vitest';
import { COMBAT_DIE_FACES, type CombatDieFace } from '../data/combatDie.js';
import { INTRUDER_ATTACK_CARDS } from '../data/intruderAttacks.js';
import type { GameState } from '../types/state.js';
import type { IntruderType } from '../types/entities.js';
import * as rng from '../utils/rng.js';
import { executeMelee, meleeInjuriesForFace } from './melee.js';
import { checkInjuryResult } from './shoot.js';
import { combatStatusState, expectEngineError, putIntruder } from '../testing/contactFixtures.js';
import { GameEngine } from './fsm.js';

const realDraw = rng.drawFromStream;

/** Форсирует грань кубика Боя, не трогая другие потоки RNG. */
function forceCombatDie(face: CombatDieFace): void {
  const index = COMBAT_DIE_FACES.indexOf(face);
  const value = (index + 0.5) / COMBAT_DIE_FACES.length;
  vi.spyOn(rng, 'drawFromStream').mockImplementation((seed, stream, drawIndex) =>
    stream === 'combat' ? value : realDraw(seed, stream, drawIndex),
  );
}

/** Готовое состояние Боя: Чужой указанного типа в отсеке игрока. */
function combatReady(seed = 'melee-step-5', type: IntruderType = 'ADULT', wounds = 0): GameState {
  const state = combatStatusState(seed);
  const roomId = state.players['player-1']!.roomId;
  const intruderId = putIntruder(state, type, roomId);
  const intruder = state.intrudersPool.boardTokens.find((entry) => entry.id === intruderId)!;
  intruder.woundsCount = wounds;
  return state;
}

/** Кладёт указанные карты на вершину колоды Атак Чужих (без стрелок — см. тест Отступления). */
function deckTop(state: GameState, cards: (typeof INTRUDER_ATTACK_CARDS)[number][]): void {
  const ids = new Set(cards.map((card) => card.id));
  const rest = INTRUDER_ATTACK_CARDS.filter((card) => !ids.has(card.id));
  state.decks.intruderAttacks = { drawPile: [...cards.map((card) => structuredClone(card)), ...rest], discard: [] };
}

const SCRATCH_2 = INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_SCRATCH_2')!; // Стойкость 3, без стрелки
const SCRATCH_3 = INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_SCRATCH_3')!; // Стойкость 5, без стрелки
const SCRATCH_1 = INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_SCRATCH_1')!; // Стойкость 2, стрелка Отступления

function melee(state: GameState, overrides: Partial<{ targetIntruderId: string }> = {}): GameState {
  const player = state.players[state.meta.activePlayerId]!;
  const target = state.intrudersPool.boardTokens.find((entry) => entry.roomId === player.roomId);
  const discardCardIds = player.actionDeck.hand[0] ? [player.actionDeck.hand[0].id] : [];

  return new GameEngine().processAction(state, {
    type: 'ACTION_MELEE',
    payload: {
      targetIntruderId: overrides.targetIntruderId ?? target?.id ?? 'intruder-absent',
      discardCardIds,
    },
  });
}

function meleeLog(state: GameState): Extract<GameState['gameLog'][number]['event'], { type: 'MELEE_RESOLVED' }> {
  const entry = state.gameLog.find((item) => item.event.type === 'MELEE_RESOLVED');
  if (!entry || entry.event.type !== 'MELEE_RESOLVED') throw new Error('MELEE_RESOLVED не в журнале');
  return entry.event;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Матрица граней кубика в рукопашной (стр. 19)', () => {
  const types: IntruderType[] = ['LARVA', 'CREEPER', 'ADULT', 'BREEDER'];

  it('Хвост ранит Личинку и Крипера, остальным — промах с Травмой', () => {
    forceCombatDie('TAIL');
    for (const type of types) {
      const hit = meleeInjuriesForFace('TAIL', type);
      expect(hit).toBe(type === 'LARVA' || type === 'CREEPER' ? 1 : 0);
      const ready = combatReady('melee-tail', type);
      deckTop(ready, [SCRATCH_2]);
      const state = melee(ready);
      const event = meleeLog(state);
      expect(event.injuries).toBe(hit);
      expect(event.seriousWoundTaken).toBe(hit === 0);
    }
  });

  it('Силуэты ранят до Взрослой Особи включительно', () => {
    expect(meleeInjuriesForFace('SILHOUETTES', 'LARVA')).toBe(1);
    expect(meleeInjuriesForFace('SILHOUETTES', 'CREEPER')).toBe(1);
    expect(meleeInjuriesForFace('SILHOUETTES', 'ADULT')).toBe(1);
    expect(meleeInjuriesForFace('SILHOUETTES', 'BREEDER')).toBe(0);
    expect(meleeInjuriesForFace('SILHOUETTES', 'QUEEN')).toBe(0);
  });

  it('«1 Рана» ранит любого, «2 Раны» в рукопашной считает 1 Раной (стр. 19)', () => {
    for (const type of types) {
      expect(meleeInjuriesForFace('ONE_WOUND', type)).toBe(1);
      expect(meleeInjuriesForFace('TWO_WOUNDS', type)).toBe(1);
    }
  });

  it('полная атака «2 Раны» по Взрослой Особи наносит ровно 1 Рану', () => {
    forceCombatDie('TWO_WOUNDS');
    const ready = combatReady('melee-two', 'ADULT');
    deckTop(ready, [SCRATCH_2]);
    const state = melee(ready);
    const event = meleeLog(state);
    expect(event.dieFace).toBe('TWO_WOUNDS');
    expect(event.injuries).toBe(1);
    expect(event.woundsTotal).toBe(1);
    expect(event.seriousWoundTaken).toBe(false);
  });
});

describe('Заражение до броска (стр. 19, шаг 1)', () => {
  it('карта Заражения уходит в сброс даже при успешной атаке', () => {
    forceCombatDie('ONE_WOUND');
    const state = combatReady('melee-contam', 'CREEPER', 3);
    deckTop(state, [SCRATCH_2]);
    const contaminationBefore = state.decks.contamination.drawPile.length;
    const next = melee(state);
    const player = next.players[next.meta.activePlayerId]!;
    const topDiscard = player.actionDeck.discard.at(-1)!;

    // У карты Заражения нет поля kind — только id/isInfected/isScanned.
    expect('isInfected' in topDiscard && topDiscard.isScanned === false).toBe(true);
    expect(next.decks.contamination.drawPile.length).toBe(contaminationBefore - 1);
    expect(meleeLog(next).contaminated).toBe(true);
    expect(next.gameLog.some((entry) => entry.event.type === 'CONTAMINATION_RECEIVED')).toBe(true);
  });

  it('карта Заражения уходит в сброс и при промахе', () => {
    forceCombatDie('MISS');
    const next = melee(combatReady('melee-contam-miss', 'ADULT'));
    const player = next.players[next.meta.activePlayerId]!;
    const top = player.actionDeck.discard.at(-1)!;
    expect('isInfected' in top && top.isScanned === false).toBe(true);
    expect(meleeLog(next).contaminated).toBe(true);
  });
});

describe('Промах — Тяжёлая Травма (стр. 19, 21)', () => {
  it('промах даёт 1 Тяжёлую Травму и не ранит цель', () => {
    forceCombatDie('MISS');
    const state = combatReady('melee-miss', 'ADULT');
    const deckBefore = state.decks.seriousWounds.drawPile.length;
    const next = melee(state);
    const player = next.players[next.meta.activePlayerId]!;
    const event = meleeLog(next);

    expect(event.injuries).toBe(0);
    expect(event.seriousWoundTaken).toBe(true);
    expect(player.seriousWounds.length).toBe(1);
    expect(next.decks.seriousWounds.drawPile.length).toBe(deckBefore - 1);
    expect(next.intrudersPool.boardTokens[0]!.woundsCount).toBe(0);
    expect(event.killed).toBe(false);
  });

  it('грань не по типу цели — тоже промах с Травмой', () => {
    forceCombatDie('SILHOUETTES');
    const next = melee(combatReady('melee-wrong-face', 'BREEDER'));
    const event = meleeLog(next);

    expect(event.injuries).toBe(0);
    expect(event.seriousWoundTaken).toBe(true);
    expect(next.players[next.meta.activePlayerId]!.seriousWounds.length).toBe(1);
  });

  it('третья Тяжёлая Травма от промаха убивает Персонажа (стр. 21)', () => {
    forceCombatDie('MISS');
    const state = combatReady('melee-miss-death', 'ADULT');
    const player = state.players[state.meta.activePlayerId]!;
    // Третья Тяжёлая Травма убивает: у Персонажа уже 3 (стр. 21; ревью 0.4.0).
    const trauma = (id: string) => ({ id, name: 'Травма', description: '', isTreated: false });
    player.seriousWounds.push(trauma('sw-1'), trauma('sw-2'), trauma('sw-3'));
    const roomId = player.roomId;
    const next = melee(state);
    const dead = next.players[next.meta.activePlayerId]!;

    expect(dead.isDead).toBe(true);
    expect(meleeLog(next).attackerDied).toBe(true);
    expect(next.ship.rooms[roomId]!.objects.some((object) => object.kind === 'CORPSE')).toBe(true);
  });
});

describe('Проверка Результата Атаки (стр. 20) в рукопашной', () => {
  it('Личинка убита 1 Раной без карты Атаки', () => {
    forceCombatDie('ONE_WOUND');
    const state = combatReady('melee-larva', 'LARVA');
    const cardsBefore = state.decks.intruderAttacks.drawPile.length + state.decks.intruderAttacks.discard.length;
    const next = melee(state);
    const event = meleeLog(next);

    expect(event.killed).toBe(true);
    expect(event.toughnessCards).toHaveLength(0);
    expect(event.toughnessTotal).toBe(0);
    expect(next.intrudersPool.boardTokens).toHaveLength(0);
    expect(next.decks.intruderAttacks.drawPile.length + next.decks.intruderAttacks.discard.length).toBe(cardsBefore);
  });

  it('накопленные Раны 2+1 против Стойкости 3 убивают Взрослую Особь', () => {
    forceCombatDie('ONE_WOUND');
    const state = combatReady('melee-kill', 'ADULT', 2);
    deckTop(state, [SCRATCH_2]);
    const next = melee(state);
    const event = meleeLog(next);

    expect(event.woundsBefore).toBe(2);
    expect(event.woundsTotal).toBe(3);
    expect(event.toughnessTotal).toBe(3);
    expect(event.killed).toBe(true);
    expect(next.intrudersPool.boardTokens).toHaveLength(0);
    // Карта Стойкости после сравнения — в колоде (мгновенная перетасовка сброса).
    const pile = next.decks.intruderAttacks;
    expect(
      pile.discard.some((card) => card.id === 'IAT_SCRATCH_2') ||
        pile.drawPile.some((card) => card.id === 'IAT_SCRATCH_2'),
    ).toBe(true);
  });

  it('Трутню вытягиваются 2 карты, Стойкость суммируется; выживание без стрелки', () => {
    forceCombatDie('ONE_WOUND');
    const state = combatReady('melee-breeder', 'BREEDER');
    deckTop(state, [SCRATCH_2, SCRATCH_3]);
    const next = melee(state);
    const event = meleeLog(next);

    expect(event.toughnessCards).toHaveLength(2);
    expect(event.toughnessTotal).toBe(3 + 5);
    expect(event.killed).toBe(false);
    expect(event.seriousWoundTaken).toBe(false);
    expect(next.intrudersPool.boardTokens[0]!.woundsCount).toBe(1);
  });

  it('стрелка Отступления на карте выжившего: EMPTY_EVENT_DECK и полный откат', () => {
    forceCombatDie('ONE_WOUND');
    const state = combatReady('melee-retreat', 'ADULT');
    deckTop(state, [SCRATCH_1]);
    const snapshot = structuredClone(state);
    try {
      melee(state);
      expect.unreachable('ожидался отказ');
    } catch (error) {
      expect((error as { code: string }).code).toBe('EMPTY_EVENT_DECK');
    }
    // Полный откат: заражение, оплата, Раны и чтения колод не сохранились.
    expect(state).toEqual(snapshot);
  });

  it('перетасовка из сброса читает поток cards', () => {
    forceCombatDie('ONE_WOUND');
    const state = combatReady('melee-reshuffle', 'ADULT');
    // Только карты без стрелки: выживание не должно требовать карту События.
    state.decks.intruderAttacks = {
      drawPile: [],
      discard: structuredClone(INTRUDER_ATTACK_CARDS.filter((card) => !card.hasRetreat).slice(0, 4)),
    };
    const cardsBefore = state.meta.rngDraws.cards;
    const next = melee(state);
    expect(next.meta.rngDraws.cards).toBeGreaterThan(cardsBefore);
  });
});

describe('Цена и потоки', () => {
  it('оплата списывает карту Действия, кубик продвигает поток combat', () => {
    forceCombatDie('ONE_WOUND');
    const state = combatReady('melee-cost', 'CREEPER', 3);
    const player = state.players[state.meta.activePlayerId]!;
    const handBefore = player.actionDeck.hand.length;
    const discardBefore = player.actionDeck.discard.length;
    const combatBefore = state.meta.rngDraws.combat;
    const paidId = player.actionDeck.hand[0]!.id;

    const next = melee(state);

    expect(next.players[next.meta.activePlayerId]!.actionDeck.hand.length).toBe(handBefore - 1);
    expect(next.players[next.meta.activePlayerId]!.actionDeck.discard.length).toBe(discardBefore + 2); // оплата + Заражение
    expect(next.players[next.meta.activePlayerId]!.actionDeck.discard.some((card) => card.id === paidId)).toBe(true);
    expect(next.meta.rngDraws.combat).toBe(combatBefore + 1);
  });
});

describe('Отказы Рукопашной', () => {
  it('неизвестный attacking — UNKNOWN_PLAYER (прямой вызов)', () => {
    const state = combatReady();
    // Через processAction тот же отказ отдаёт validateActor.
    expectEngineError(
      () =>
        executeMelee(
          state,
          { type: 'ACTION_MELEE', payload: { targetIntruderId: 'intruder-ghost', discardCardIds: [] } },
          'ghost',
        ),
      'UNKNOWN_PLAYER',
    );
  });

  it('вне Боя драться нельзя', () => {
    const state = combatStatusState('melee-quiet');
    expectEngineError(() => melee(state), 'MELEE_NOT_IN_COMBAT');
  });

  it('цель из другого отсека — INVALID_ATTACK_TARGET', () => {
    const state = combatStatusState('melee-wrong-room');
    const playerRoom = state.players[state.meta.activePlayerId]!.roomId;
    putIntruder(state, 'ADULT', playerRoom); // Бой: Чужой в отсеке игрока
    const foreignId = putIntruder(state, 'ADULT', playerRoom === 1 ? 2 : 1);
    expectEngineError(() => melee(state, { targetIntruderId: foreignId }), 'INVALID_ATTACK_TARGET');
  });

  it('без карты цены — INSUFFICIENT_ACTION_CARDS, заражения нет', () => {
    forceCombatDie('MISS');
    const state = combatReady('melee-no-pay');
    const contaminationBefore = state.decks.contamination.drawPile.length;
    expectEngineError(
      () =>
        new GameEngine().processAction(state, {
          type: 'ACTION_MELEE',
          payload: { targetIntruderId: state.intrudersPool.boardTokens[0]!.id, discardCardIds: [] },
        }),
      'INSUFFICIENT_ACTION_CARDS',
    );
    expect(state.decks.contamination.drawPile.length).toBe(contaminationBefore);
  });

  it('checkInjuryResult — общая процедура Стрельбы и Рукопашной', () => {
    const state = combatReady('melee-shared', 'CREEPER', 3);
    deckTop(state, [SCRATCH_2]);
    const target = state.intrudersPool.boardTokens[0]!;
    const result = checkInjuryResult(state, target.id, 'CREEPER', 1, 'player-1');
    expect(result.killed).toBe(true); // 3 + 1 Раны против Стойкости 3
    expect(state.intrudersPool.boardTokens).toHaveLength(0);
  });
});
