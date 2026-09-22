import { afterEach, describe, expect, it, vi } from 'vitest';
import { COMBAT_DIE_FACES, type CombatDieFace } from '../data/combatDie.js';
import { ACTION_CARDS_BY_CHARACTER } from '../data/actionCards.js';
import { INTRUDER_ATTACK_CARDS } from '../data/intruderAttacks.js';
import { STARTING_WEAPONS } from '../data/startingItems.js';
import type { GameState } from '../types/state.js';
import type { HeavyItemRef } from '../types/entities.js';
import * as rng from '../utils/rng.js';
import type { EngineAction } from '../types/actions.js';
import { GameEngine } from './fsm.js';
import { combatStatusState, expectEngineError, putIntruder } from '../testing/contactFixtures.js';

const realDraw = rng.drawFromStream;

/** Форсирует грань кубика Боя, не трогая другие потоки RNG. */
function forceCombatDie(face: CombatDieFace): void {
  const index = COMBAT_DIE_FACES.indexOf(face);
  const value = (index + 0.5) / COMBAT_DIE_FACES.length;
  vi.spyOn(rng, 'drawFromStream').mockImplementation((seed, stream, drawIndex) =>
    stream === 'combat' ? value : realDraw(seed, stream, drawIndex),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

/** Кладёт указанную карту Действий в руку персонажа (копия из данных класса). */
function giveCard(state: GameState, cardId: string): void {
  const pool = Object.values(ACTION_CARDS_BY_CHARACTER).flat();
  const template = pool.find((card) => card.id === cardId);
  if (!template) throw new Error(`нет карты ${cardId}`);
  state.players['player-1']!.actionDeck.hand.push(structuredClone(template));
}

/** Боевая обстановка: Чужой в отсеке, верх колоды Атак — карта без Отступления (Стойкость 3). */
function combatState(seed: string): { state: GameState; intruderId: string } {
  const state = combatStatusState(seed);
  const intruderId = putIntruder(state, 'ADULT', 11);
  const scratch2 = structuredClone(INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_SCRATCH_2')!);
  const rest = INTRUDER_ATTACK_CARDS.filter((card) => card.id !== 'IAT_SCRATCH_2').map((card) => structuredClone(card));
  state.decks.intruderAttacks = { drawPile: [scratch2, ...rest], discard: [] };
  return { state, intruderId };
}

/** Копия Боевой винтовки Солдата в слот Руки. */
function giveRifle(state: GameState, ammo: number): string {
  const rifle = { ...structuredClone(STARTING_WEAPONS.SOLDIER), ammo };
  state.players['player-1']!.handSlots.push({ source: 'ITEM', card: rifle });
  return rifle.id;
}

/** Идентификатор оружия в слоте Руки (Капитан по умолчанию — револьвер). */
function firstWeaponId(state: GameState): string {
  const slot = state.players['player-1']!.handSlots.find((candidate) => candidate.source === 'ITEM');
  if (!slot || slot.source !== 'ITEM') throw new Error('нет оружия в руке');
  return slot.card.id;
}

/** Оплата встроенного действия — карты без Отступления из руки. */
function payWith(state: GameState, count: number): string[] {
  return state.players['player-1']!.actionDeck.hand.slice(0, count).map((card) => card.id);
}

function play(state: GameState, payload: EngineAction): GameState {
  return new GameEngine().processAction(state, payload, { actorId: 'player-1' });
}

describe('Классовые боевые карты (Шаг 8)', () => {
  it('Бонус Боевой винтовки: грань «1 Рана» наносит 2 Раны (описание предмета)', () => {
    const { state, intruderId } = combatState('rifle-bonus');
    const rifleId = giveRifle(state, 5);
    forceCombatDie('ONE_WOUND');

    const next = play(state, {
      type: 'ACTION_SHOOT',
      payload: { weaponItemId: rifleId, targetIntruderId: intruderId, discardCardIds: payWith(state, 1) },
    });

    const event = next.gameLog.map((entry) => entry.event).find((event) => event.type === 'SHOOT_RESOLVED');
    expect(event).toMatchObject({ injuries: 2, woundsTotal: 2, killed: false, rifleBonusApplied: true });
  });

  it('Прицельный огонь, KEEP: остаётся выпавшая грань, решение публично завершает выстрел', () => {
    const { state, intruderId } = combatState('aimed-keep');
    giveCard(state, 'ACT_SOL_AIMED_FIRE');
    const weaponId = firstWeaponId(state);
    forceCombatDie('MISS');

    const suspended = play(state, {
      type: 'ACTION_PLAY_CARD',
      payload: {
        cardId: 'ACT_SOL_AIMED_FIRE',
        discardCardIds: payWith(state, 1),
        combat: { kind: 'AIMED_SHOOT', weaponItemId: weaponId, targetIntruderId: intruderId },
      },
    });

    expect(suspended.pendingDecision).toMatchObject({ type: 'REROLL_COMBAT_DIE', firstFace: 'MISS' });
    // Боезапас (6 → 5) и цена списаны до решения (стр. 24: выстрел уже выполнен).
    expect(
      suspended.players['player-1']!.handSlots.find(
        (slot): slot is HeavyItemRef => slot.source === 'ITEM' && slot.card.id === weaponId,
      )?.card.ammo,
    ).toBe(5);

    forceCombatDie('ONE_WOUND');
    const resumed = play(suspended, {
      type: 'ACTION_RESOLVE_DECISION',
      payload: { decisionId: suspended.pendingDecision!.id, selectedOption: 'KEEP' },
    });

    expect(resumed.pendingDecision).toBeNull();
    const event = resumed.gameLog.map((entry) => entry.event).find((event) => event.type === 'SHOOT_RESOLVED');
    expect(event).toMatchObject({ dieFace: 'MISS', injuries: 0 });
    expect(event && 'rerolled' in event ? event.rerolled : undefined).toBeUndefined();
    expect(resumed.players['player-1']!.actionsPerformedThisRound).toBe(1);
  });

  it('Прицельный огонь, REROLL: новый бросок заменяет грань, журнал это отмечает', () => {
    const { state, intruderId } = combatState('aimed-reroll');
    giveCard(state, 'ACT_SOL_AIMED_FIRE');
    forceCombatDie('MISS');

    const suspended = play(state, {
      type: 'ACTION_PLAY_CARD',
      payload: {
        cardId: 'ACT_SOL_AIMED_FIRE',
        discardCardIds: payWith(state, 1),
        combat: { kind: 'AIMED_SHOOT', weaponItemId: firstWeaponId(state), targetIntruderId: intruderId },
      },
    });
    forceCombatDie('ONE_WOUND');
    const resumed = play(suspended, {
      type: 'ACTION_RESOLVE_DECISION',
      payload: { decisionId: suspended.pendingDecision!.id, selectedOption: 'REROLL' },
    });

    const event = resumed.gameLog.map((entry) => entry.event).find((event) => event.type === 'SHOOT_RESOLVED');
    expect(event).toMatchObject({ dieFace: 'ONE_WOUND', injuries: 1, rerolled: true });
  });

  it('Стрельба очередью: весь Боезапас сброшен, +1 Рана за каждые 2 ед., бонус винтовки суммируется', () => {
    const { state, intruderId } = combatState('burst');
    giveCard(state, 'ACT_SOL_BURST_FIRE');
    const rifleId = giveRifle(state, 5);
    forceCombatDie('ONE_WOUND');

    const next = play(state, {
      type: 'ACTION_PLAY_CARD',
      payload: {
        cardId: 'ACT_SOL_BURST_FIRE',
        discardCardIds: payWith(state, 1),
        combat: { kind: 'BURST_SHOOT', weaponItemId: rifleId, targetIntruderId: intruderId },
      },
    });

    // База 1 + бонус винтовки 1 + floor(5/2)=2 → 4 Раны; Стойкость 3 — убит.
    const event = next.gameLog.map((entry) => entry.event).find((event) => event.type === 'SHOOT_RESOLVED');
    expect(event).toMatchObject({ injuries: 4, killed: true, burstAmmoSpent: 5 });
    expect(
      next.players['player-1']!.handSlots.find(
        (slot): slot is HeavyItemRef => slot.source === 'ITEM' && slot.card.id === rifleId,
      )?.card.ammo,
    ).toBe(0);
    expect(next.intrudersPool.boardTokens).toHaveLength(0);
  });

  it('Заградительный огонь: себя и другого — без Атаки Чужих, Шум переносов разыгрывается', () => {
    const { state } = combatState('covering');
    state.players['player-2'] = {
      ...structuredClone(state.players['player-1']!),
      id: 'player-2',
      name: 'Пилот',
      orderNumber: 2,
    };
    state.players['player-2']!.characterClass = 'PILOT';
    state.ship.rooms[11]!.occupantPlayerIds.push('player-2');
    giveCard(state, 'ACT_SOL_SUPPRESSIVE_FIRE');
    const weaponId = firstWeaponId(state);
    const ammoBefore = 2;
    const slotIndex = state.players['player-1']!.handSlots.findIndex((slot) => slot.source === 'ITEM');
    state.players['player-1']!.handSlots[slotIndex] = {
      source: 'ITEM',
      card: { ...structuredClone(STARTING_WEAPONS.CAPTAIN), ammo: ammoBefore },
    };

    const next = play(state, {
      type: 'ACTION_PLAY_CARD',
      payload: {
        cardId: 'ACT_SOL_SUPPRESSIVE_FIRE',
        combat: {
          kind: 'REPOSITION',
          weaponItemId: weaponId,
          moves: [
            { playerId: 'player-1', targetRoomId: 6 },
            { playerId: 'player-2', targetRoomId: 14 },
          ],
        },
      },
    });

    expect(next.players['player-1']!.roomId).toBe(6);
    expect(next.players['player-2']!.roomId).toBe(14);
    expect(
      next.players['player-1']!.handSlots.find(
        (slot): slot is HeavyItemRef => slot.source === 'ITEM' && slot.card.id === weaponId,
      )?.card.ammo,
    ).toBe(ammoBefore - 1);
    // Внеочередных атак нет, несмотря на Чужого в отсеке (стр. 19).
    expect(next.gameLog.some((entry) => entry.event.type === 'ESCAPE_ATTACK_RESOLVED')).toBe(false);
    expect(next.players['player-1']!.actionsPerformedThisRound).toBe(1);
  });

  it('Огонь на подавление: ровно один перенос, второй отклоняется целиком', () => {
    const { state } = combatState('suppressive');
    state.players['player-2'] = {
      ...structuredClone(state.players['player-1']!),
      id: 'player-2',
      name: 'Пилот',
      orderNumber: 2,
    };
    state.ship.rooms[11]!.occupantPlayerIds.push('player-2');
    giveCard(state, 'ACT_CAP_SUPPRESSIVE_FIRE');

    expectEngineError(
      () =>
        play(state, {
          type: 'ACTION_PLAY_CARD',
          payload: {
            cardId: 'ACT_CAP_SUPPRESSIVE_FIRE',
            combat: {
              kind: 'REPOSITION',
              weaponItemId: firstWeaponId(state),
              moves: [
                { playerId: 'player-1', targetRoomId: 6 },
                { playerId: 'player-2', targetRoomId: 14 },
              ],
            },
          },
        }),
      'INVALID_DECISION_OPTION',
    );
    // Транзакция атомарна: карта не потрачена, персонажи на месте.
    expect(state.players['player-1']!.roomId).toBe(11);
    expect(state.players['player-1']!.actionDeck.hand.some((card) => card.id === 'ACT_CAP_SUPPRESSIVE_FIRE')).toBe(
      true,
    );
  });

  it('Адреналин: Стрельба, затем добор карты — ход не передаётся раньше добора', () => {
    const { state, intruderId } = combatState('adrenaline-shoot');
    giveCard(state, 'ACT_SCO_ADRENALINE');
    const handBefore = state.players['player-1']!.actionDeck.hand.length;
    forceCombatDie('ONE_WOUND');

    const next = play(state, {
      type: 'ACTION_PLAY_CARD',
      payload: {
        cardId: 'ACT_SCO_ADRENALINE',
        discardCardIds: payWith(state, 1),
        combat: { kind: 'ADRENALINE_SHOOT', weaponItemId: firstWeaponId(state), targetIntruderId: intruderId },
      },
    });

    const types = next.gameLog.map((entry) => entry.event.type);
    const shootIndex = types.indexOf('SHOOT_RESOLVED');
    expect(types.indexOf('ACTION_CARD_DRAWN')).toBeGreaterThan(shootIndex);
    // Сгорела только карта Адреналина: добор вернул вторую списанную (цену).
    expect(next.players['player-1']!.actionDeck.hand.length).toBe(handBefore - 1);
    expect(next.players['player-1']!.actionsPerformedThisRound).toBe(1);
  });

  it('Адреналин: Побег с Внеочередными атаками, добор после атак', () => {
    const { state } = combatState('adrenaline-escape');
    giveCard(state, 'ACT_SCO_ADRENALINE');
    const handBefore = state.players['player-1']!.actionDeck.hand.length;
    expect(handBefore).toBeGreaterThan(1);

    const next = play(state, {
      type: 'ACTION_PLAY_CARD',
      payload: {
        cardId: 'ACT_SCO_ADRENALINE',
        discardCardIds: payWith(state, 1), // цена Движения при Побеге (стр. 19)
        combat: { kind: 'ADRENALINE_ESCAPE', targetRoomId: 6 },
      },
    });

    const types = next.gameLog.map((entry) => entry.event.type);
    const attackIndex = types.indexOf('ESCAPE_ATTACK_RESOLVED');
    expect(attackIndex).toBeGreaterThan(-1);
    expect(types.indexOf('ACTION_CARD_DRAWN')).toBeGreaterThan(types.indexOf('PLAYER_MOVED'));
    expect(next.players['player-1']!.roomId).toBe(6);
    expect(next.players['player-1']!.lightWounds).toBe(1);
    // Сгорел Адреналин и цена Движения, добор вернул одну.
    expect(next.players['player-1']!.actionDeck.hand.length).toBe(handBefore - 1);
  });

  it('Адреналин: колода и сброс пусты — действие отклонено целиком', () => {
    const { state, intruderId } = combatState('adrenaline-empty');
    giveCard(state, 'ACT_SCO_ADRENALINE');
    state.players['player-1']!.actionDeck.drawPile = [];

    expectEngineError(
      () =>
        play(state, {
          type: 'ACTION_PLAY_CARD',
          payload: {
            cardId: 'ACT_SCO_ADRENALINE',
            combat: { kind: 'ADRENALINE_SHOOT', weaponItemId: firstWeaponId(state), targetIntruderId: intruderId },
          },
        }),
      'CARD_SUPPLY_EXHAUSTED',
    );
    // Атомарность: карта Адреналина и оплата остались в руке.
    expect(state.players['player-1']!.actionDeck.hand.some((card) => card.id === 'ACT_SCO_ADRENALINE')).toBe(true);
    const weaponSlot = state.players['player-1']!.handSlots.find(
      (slot) => slot.source === 'ITEM' && slot.card.id === firstWeaponId(state),
    );
    expect(weaponSlot && weaponSlot.source === 'ITEM' ? weaponSlot.card.ammo : null).toBe(6);
  });

  it('Разыгрывание боевой карты без параметров действия отклоняется', () => {
    const { state } = combatState('no-combat-payload');
    giveCard(state, 'ACT_SOL_BURST_FIRE');

    expectEngineError(
      () => play(state, { type: 'ACTION_PLAY_CARD', payload: { cardId: 'ACT_SOL_BURST_FIRE' } }),
      'INVALID_DECISION_OPTION',
    );
  });

  it('Решение о перебросе с недопустимым вариантом отклоняется честной ошибкой', () => {
    const { state, intruderId } = combatState('reroll-invalid-option');
    giveCard(state, 'ACT_SOL_AIMED_FIRE');
    const weaponId = firstWeaponId(state);
    forceCombatDie('MISS');

    const suspended = play(state, {
      type: 'ACTION_PLAY_CARD',
      payload: {
        cardId: 'ACT_SOL_AIMED_FIRE',
        discardCardIds: payWith(state, 1),
        combat: { kind: 'AIMED_SHOOT', weaponItemId: weaponId, targetIntruderId: intruderId },
      },
    });

    expectEngineError(
      () =>
        play(suspended, {
          type: 'ACTION_RESOLVE_DECISION',
          payload: { decisionId: suspended.pendingDecision!.id, selectedOption: 'PASS' },
        }),
      'INVALID_DECISION_OPTION',
    );
  });

  it('Переброс по цели, сошедшей с поля, отклоняется (UNKNOWN_INTRUDER)', () => {
    const { state, intruderId } = combatState('reroll-target-gone');
    giveCard(state, 'ACT_SOL_AIMED_FIRE');
    const weaponId = firstWeaponId(state);
    forceCombatDie('MISS');

    const suspended = play(state, {
      type: 'ACTION_PLAY_CARD',
      payload: {
        cardId: 'ACT_SOL_AIMED_FIRE',
        discardCardIds: payWith(state, 1),
        combat: { kind: 'AIMED_SHOOT', weaponItemId: weaponId, targetIntruderId: intruderId },
      },
    });

    const detached = structuredClone(suspended);
    detached.intrudersPool.boardTokens = detached.intrudersPool.boardTokens.filter((entry) => entry.id !== intruderId);

    expectEngineError(
      () =>
        play(detached, {
          type: 'ACTION_RESOLVE_DECISION',
          payload: { decisionId: detached.pendingDecision!.id, selectedOption: 'REROLL' },
        }),
      'UNKNOWN_INTRUDER',
    );
  });
});
