import { afterEach, describe, expect, it, vi } from 'vitest';
import { COMBAT_DIE_FACES, type CombatDieFace } from '../data/combatDie.js';
import { ACTION_CARDS_BY_CHARACTER } from '../data/actionCards.js';
import { CRAFTED_ITEM_CARDS } from '../data/crafting.js';
import { INTRUDER_ATTACK_CARDS } from '../data/intruderAttacks.js';
import { RED_ITEM_CARDS } from '../data/itemCards.js';
import type { EngineAction } from '../types/actions.js';
import type { GameState } from '../types/state.js';
import * as rng from '../utils/rng.js';
import { combatStatusState, expectEngineError, putIntruder } from '../testing/contactFixtures.js';
import { GameEngine } from './fsm.js';
import { igniteFromWeapon, weaponFaceInjuries } from './shoot.js';

const realDraw = rng.drawFromStream;

function forceCombatDice(state: GameState, faces: readonly CombatDieFace[]): void {
  const firstDraw = state.meta.rngDraws.combat;
  vi.spyOn(rng, 'drawFromStream').mockImplementation((seed, stream, drawIndex) => {
    if (stream !== 'combat') return realDraw(seed, stream, drawIndex);
    const face = faces[Math.min(drawIndex - firstDraw, faces.length - 1)]!;
    return (COMBAT_DIE_FACES.indexOf(face) + 0.5) / COMBAT_DIE_FACES.length;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

function weaponState(seed: string, weaponId: string, ammo?: number): { state: GameState; intruderId: string } {
  const state = combatStatusState(seed);
  const intruderId = putIntruder(state, 'QUEEN', 11);
  const toughness = structuredClone(INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_SCRATCH_2')!);
  const rest = INTRUDER_ATTACK_CARDS.filter((card) => card.id !== toughness.id).map((card) => structuredClone(card));
  state.decks.intruderAttacks = {
    drawPile: [toughness, { ...toughness, id: 'IAT_SCRATCH_2_COPY' }, ...rest],
    discard: [],
  };
  const template = [...RED_ITEM_CARDS, ...CRAFTED_ITEM_CARDS].find((card) => card.id === weaponId)!;
  const weapon = { ...structuredClone(template), ammo: ammo ?? template.ammo };
  state.players['player-1']!.handSlots = [{ source: 'ITEM', card: weapon }];
  return { state, intruderId };
}

function paymentCards(state: GameState, count = 1): string[] {
  return state.players['player-1']!.actionDeck.hand.filter((card) => 'characterClass' in card)
    .slice(0, count)
    .map((card) => card.id);
}

function shoot(state: GameState, weaponItemId: string, targetIntruderId: string, extra = false): GameState {
  const action: EngineAction = {
    type: 'ACTION_SHOOT',
    payload: {
      weaponItemId,
      targetIntruderId,
      discardCardIds: paymentCards(state),
      ...(extra ? { spendExtraAmmoOnTwoWounds: true } : {}),
    },
  };
  return new GameEngine().processAction(state, action);
}

function lastShot(state: GameState) {
  const entry = [...state.gameLog].reverse().find((candidate) => candidate.event.type === 'SHOOT_RESOLVED');
  if (!entry || entry.event.type !== 'SHOOT_RESOLVED') throw new Error('SHOOT_RESOLVED не в журнале');
  return entry.event;
}

function weaponAmmo(state: GameState): number | null {
  const slot = state.players['player-1']!.handSlots[0];
  return slot?.source === 'ITEM' ? slot.card.ammo : null;
}

const RIFLE = 'ITEM_RED_PROTOTYPE_RIFLE_1';
const SHOTGUN = 'ITEM_RED_PROTOTYPE_SHOTGUN_1';
const PISTOL = 'ITEM_RED_PROTOTYPE_PISTOL_1';
const FLAMETHROWER = 'CRAFTED_FLAMETHROWER_1';

describe('Огнемет (cards_additional.pdf, стр. 11)', () => {
  it('всегда наносит минимум 1 Рану, кроме Промаха', () => {
    expect(weaponFaceInjuries('TAIL', 'ADULT', FLAMETHROWER)).toBe(1);
    expect(weaponFaceInjuries('MISS', 'LARVA', FLAMETHROWER)).toBe(0);
    expect(weaponFaceInjuries('TAIL', 'ADULT', 'WEAPON_CAPTAIN_REVOLVER')).toBe(0);
  });

  it('грань «2 Раны» поджигает отсек Стрелка, горящий отсек второй раз не поджигается', () => {
    const { state } = weaponState('flamer-fire', FLAMETHROWER);
    const roomId = state.players['player-1']!.roomId;

    expect(igniteFromWeapon(state, FLAMETHROWER, 'ONE_WOUND', roomId)).toBe(false);
    expect(igniteFromWeapon(state, FLAMETHROWER, 'TWO_WOUNDS', roomId)).toBe(true);
    expect(state.ship.rooms[roomId]!.hasFire).toBe(true);
    expect(igniteFromWeapon(state, FLAMETHROWER, 'TWO_WOUNDS', roomId)).toBe(false);
  });
});

describe('Прототип: винтовка — доп. Боезапас за доп. Рану при «2 Ранах»', () => {
  it('при «2 Ранах» тратит 1 доп. ед. Боезапаса и наносит 3 Раны', () => {
    const { state, intruderId } = weaponState('proto-rifle-two', RIFLE);
    forceCombatDice(state, ['TWO_WOUNDS']);

    const next = shoot(state, RIFLE, intruderId, true);

    expect(lastShot(next)).toMatchObject({ injuries: 3, extraAmmoSpent: true, ammoLeft: 4 });
    expect(weaponAmmo(next)).toBe(4);
  });

  it('без решения игрока или при другой грани доп. Боезапас не тратится', () => {
    const { state, intruderId } = weaponState('proto-rifle-other', RIFLE);
    forceCombatDice(state, ['TWO_WOUNDS']);
    expect(lastShot(shoot(structuredClone(state), RIFLE, intruderId))).toMatchObject({ injuries: 2, ammoLeft: 5 });

    vi.restoreAllMocks();
    forceCombatDice(state, ['ONE_WOUND']);
    const next = shoot(state, RIFLE, intruderId, true);
    expect(lastShot(next)).toMatchObject({ injuries: 1, ammoLeft: 5 });
    expect(lastShot(next).extraAmmoSpent).toBeUndefined();
  });

  it('отказ: доп. Боезапаса сверх выстрела нет или оружие не умеет тратить его', () => {
    const lastRound = weaponState('proto-rifle-empty', RIFLE, 1);
    expectEngineError(() => shoot(lastRound.state, RIFLE, lastRound.intruderId, true), 'WEAPON_NO_AMMO');

    const shotgun = weaponState('proto-rifle-wrong', SHOTGUN);
    expectEngineError(() => shoot(shotgun.state, SHOTGUN, shotgun.intruderId, true), 'INVALID_DECISION_OPTION');
  });
});

describe('Прототип: дробовик — минимум 1 Рана и +1 при «1 Ране»/«2 Ранах»', () => {
  it.each([
    ['MISS', 0],
    ['TAIL', 1],
    ['SILHOUETTES', 1],
    ['ONE_WOUND', 2],
    ['TWO_WOUNDS', 3],
  ] as const)('грань %s по Королеве — %i Ран(ы)', (face, injuries) => {
    expect(weaponFaceInjuries(face, 'QUEEN', SHOTGUN)).toBe(injuries);
  });

  it('выстрел тратит 1 ед. Боезапаса из двух', () => {
    const { state, intruderId } = weaponState('proto-shotgun', SHOTGUN);
    forceCombatDice(state, ['ONE_WOUND']);

    const next = shoot(state, SHOTGUN, intruderId);

    expect(lastShot(next)).toMatchObject({ injuries: 2, ammoLeft: 1 });
  });
});

describe('Прототип: пистолет — один переброс кубика Атаки', () => {
  it('после броска игрок решает о перебросе; переброс заменяет грань', () => {
    const { state, intruderId } = weaponState('proto-pistol', PISTOL);
    forceCombatDice(state, ['MISS', 'TWO_WOUNDS']);

    const suspended = shoot(state, PISTOL, intruderId);
    const decision = suspended.pendingDecision;
    expect(decision).toMatchObject({ type: 'REROLL_COMBAT_DIE', firstFace: 'MISS', rerollsLeft: 1 });
    expect(suspended.players['player-1']!.actionsPerformedThisRound).toBe(0);

    const next = new GameEngine().processAction(suspended, {
      type: 'ACTION_RESOLVE_DECISION',
      payload: { decisionId: decision!.id, selectedOption: 'REROLL' },
    });

    expect(next.pendingDecision).toBeNull();
    expect(lastShot(next)).toMatchObject({ dieFace: 'TWO_WOUNDS', rerolled: true, injuries: 2 });
    expect(next.players['player-1']!.actionsPerformedThisRound).toBe(1);
  });

  it('оставленная грань не расходует бросок кубика', () => {
    const { state, intruderId } = weaponState('proto-pistol-keep', PISTOL);
    forceCombatDice(state, ['ONE_WOUND']);
    const suspended = shoot(state, PISTOL, intruderId);
    const drawsAfterShot = suspended.meta.rngDraws.combat;

    const next = new GameEngine().processAction(suspended, {
      type: 'ACTION_RESOLVE_DECISION',
      payload: { decisionId: suspended.pendingDecision!.id, selectedOption: 'KEEP' },
    });

    expect(next.meta.rngDraws.combat).toBe(drawsAfterShot);
    expect(lastShot(next)).toMatchObject({ dieFace: 'ONE_WOUND', injuries: 1 });
    expect(lastShot(next).rerolled).toBeUndefined();
  });

  it('с «Прицельным огнем» дает второй переброс', () => {
    const { state, intruderId } = weaponState('proto-pistol-aimed', PISTOL);
    const aimed = ACTION_CARDS_BY_CHARACTER.SOLDIER.find((card) => card.id === 'ACT_SOL_AIMED_FIRE')!;
    state.players['player-1']!.actionDeck.hand.push(structuredClone(aimed));
    forceCombatDice(state, ['MISS', 'TAIL', 'TWO_WOUNDS']);

    let next = new GameEngine().processAction(state, {
      type: 'ACTION_PLAY_CARD',
      payload: {
        cardId: aimed.id,
        discardCardIds: paymentCards(state).filter((id) => id !== aimed.id),
        combat: { kind: 'AIMED_SHOOT', weaponItemId: PISTOL, targetIntruderId: intruderId },
      },
    });
    expect(next.pendingDecision).toMatchObject({ firstFace: 'MISS', rerollsLeft: 2 });
    next = new GameEngine().processAction(next, {
      type: 'ACTION_RESOLVE_DECISION',
      payload: { decisionId: next.pendingDecision!.id, selectedOption: 'REROLL' },
    });
    expect(next.pendingDecision).toMatchObject({ firstFace: 'TAIL', rerollsLeft: 1 });
    next = new GameEngine().processAction(next, {
      type: 'ACTION_RESOLVE_DECISION',
      payload: { decisionId: next.pendingDecision!.id, selectedOption: 'REROLL' },
    });

    expect(lastShot(next)).toMatchObject({ dieFace: 'TWO_WOUNDS', rerolled: true });
    expect(next.players['player-1']!.actionsPerformedThisRound).toBe(1);
  });
});

describe('Прототипы — Энергооружие', () => {
  it('Энергозаряд полностью заряжает Прототип в руке', () => {
    const { state } = weaponState('proto-charge', RIFLE, 1);
    const charge = structuredClone(RED_ITEM_CARDS.find((card) => card.name === 'Энергозаряд')!);
    state.players['player-1']!.inventory.push(charge);

    const next = new GameEngine().processAction(state, {
      type: 'ACTION_USE_ITEM',
      payload: { itemId: charge.id, discardCardIds: paymentCards(state), option: 'CHARGE' },
    });

    expect(weaponAmmo(next)).toBe(6);
  });
});
