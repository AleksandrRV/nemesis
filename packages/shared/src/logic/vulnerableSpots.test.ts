import { afterEach, describe, expect, it, vi } from 'vitest';
import { COMBAT_DIE_FACES, type CombatDieFace } from '../data/combatDie.js';
import { INTRUDER_ATTACK_CARDS } from '../data/intruderAttacks.js';
import { WEAKNESS_CARDS } from '../data/weaknesses.js';
import type { IntruderType } from '../types/entities.js';
import type { GameState } from '../types/state.js';
import * as rng from '../utils/rng.js';
import { combatStatusState, putIntruder } from '../testing/contactFixtures.js';
import { GameEngine } from './fsm.js';
import { countedCombatFace } from './weaknesses.js';

const realDraw = rng.drawFromStream;

function forceCombatDie(face: CombatDieFace): void {
  const value = (COMBAT_DIE_FACES.indexOf(face) + 0.5) / COMBAT_DIE_FACES.length;
  vi.spyOn(rng, 'drawFromStream').mockImplementation((seed, stream, drawIndex) =>
    stream === 'combat' ? value : realDraw(seed, stream, drawIndex),
  );
}

function revealVulnerableSpots(state: GameState): void {
  const template = WEAKNESS_CARDS.find((card) => card.effect === 'VULNERABLE_SPOTS')!;
  const slot = state.intrudersPool.weaknessSlots.find((entry) => entry.objectKind === 'INTRUDER_REMAINS')!;
  slot.card = { ...structuredClone(template), isRevealed: true };
}

function combatReady(type: IntruderType, isWeaknessRevealed: boolean): GameState {
  const state = combatStatusState(`vulnerable-spots-${type}`);
  putIntruder(state, type, state.players['player-1']!.roomId);
  state.decks.intruderAttacks = {
    drawPile: [structuredClone(INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_SCRATCH_4')!)],
    discard: [],
  };
  state.players['player-1']!.handSlots = [
    {
      source: 'ITEM',
      card: {
        id: 'w-vulnerable-spots',
        name: 'Испытательный пистолет',
        color: 'RED',
        origin: 'STARTING',
        isHeavy: true,
        isSingleUse: false,
        componentSymbols: [],
        actionCost: 0,
        description: '',
        isWeapon: true,
        isEnergyWeapon: false,
        ammo: 3,
        maxAmmo: 3,
      },
    },
  ];
  if (isWeaknessRevealed) revealVulnerableSpots(state);
  return state;
}

function attack(state: GameState, type: 'ACTION_SHOOT' | 'ACTION_MELEE'): GameState {
  const player = state.players['player-1']!;
  const targetIntruderId = state.intrudersPool.boardTokens[0]!.id;
  const discardCardIds = [player.actionDeck.hand[0]!.id];
  return new GameEngine().processAction(
    state,
    type === 'ACTION_SHOOT'
      ? { type, payload: { weaponItemId: 'w-vulnerable-spots', targetIntruderId, discardCardIds } }
      : { type, payload: { targetIntruderId, discardCardIds } },
  );
}

function lastCombatEvent(state: GameState) {
  const entry = [...state.gameLog]
    .reverse()
    .find((item) => item.event.type === 'SHOOT_RESOLVED' || item.event.type === 'MELEE_RESOLVED');
  if (!entry || (entry.event.type !== 'SHOOT_RESOLVED' && entry.event.type !== 'MELEE_RESOLVED')) {
    throw new Error('нет события боя');
  }
  return entry.event;
}

afterEach(() => vi.restoreAllMocks());

describe('«Уязвимые места»: грань, которой засчитан бросок (cards_additional.pdf, стр. 13)', () => {
  it('Промах по Взрослой Особи засчитывается как «1 Рана», когда Слабость раскрыта', () => {
    const state = combatReady('ADULT', true);
    expect(countedCombatFace(state, 'MISS', 'ADULT')).toBe('ONE_WOUND');
  });

  it('не меняет Промах по другим Чужим и другие грани по Взрослой Особи', () => {
    const state = combatReady('ADULT', true);
    expect(countedCombatFace(state, 'MISS', 'CREEPER')).toBe('MISS');
    expect(countedCombatFace(state, 'MISS', 'BREEDER')).toBe('MISS');
    expect(countedCombatFace(state, 'TAIL', 'ADULT')).toBe('TAIL');
    expect(countedCombatFace(state, 'SILHOUETTES', 'ADULT')).toBe('SILHOUETTES');
  });

  it('без раскрытой Слабости Промах остаётся Промахом', () => {
    expect(countedCombatFace(combatReady('ADULT', false), 'MISS', 'ADULT')).toBe('MISS');
  });
});

describe('«Уязвимые места» в бою', () => {
  it('Стрельба: Промах по Взрослой наносит 1 Рану, журнал хранит выпавшую и засчитанную грани', () => {
    forceCombatDie('MISS');
    const event = lastCombatEvent(attack(combatReady('ADULT', true), 'ACTION_SHOOT'));

    expect(event).toMatchObject({ dieFace: 'MISS', countedFace: 'ONE_WOUND', injuries: 1, woundsTotal: 1 });
  });

  it('Рукопашная: засчитанный Промах — попадание, ответной Тяжёлой Травмы нет', () => {
    forceCombatDie('MISS');
    const next = attack(combatReady('ADULT', true), 'ACTION_MELEE');
    const event = lastCombatEvent(next);

    expect(event).toMatchObject({ dieFace: 'MISS', countedFace: 'ONE_WOUND', injuries: 1 });
    expect(event.type === 'MELEE_RESOLVED' && event.seriousWoundTaken).toBe(false);
    expect(next.players['player-1']!.seriousWounds).toHaveLength(0);
  });

  it('Промах по Криперу остаётся промахом: подмены в журнале нет', () => {
    forceCombatDie('MISS');
    const event = lastCombatEvent(attack(combatReady('CREEPER', true), 'ACTION_SHOOT'));

    expect(event).toMatchObject({ dieFace: 'MISS', injuries: 0 });
    expect(event).not.toHaveProperty('countedFace');
  });
});
