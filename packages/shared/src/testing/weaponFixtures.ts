import { vi } from 'vitest';
import { COMBAT_DIE_FACES, type CombatDieFace } from '../data/combatDie.js';
import { CRAFTED_ITEM_CARDS } from '../data/crafting.js';
import { INTRUDER_ATTACK_CARDS } from '../data/intruderAttacks.js';
import { RED_ITEM_CARDS } from '../data/itemCards.js';
import { STARTING_WEAPONS } from '../data/startingItems.js';
import type { EngineAction } from '../types/actions.js';
import type { ItemCard } from '../types/cards.js';
import type { IntruderType } from '../types/entities.js';
import type { GameState } from '../types/state.js';
import * as rng from '../utils/rng.js';
import { GameEngine } from '../logic/fsm.js';
import { combatStatusState, putIntruder } from './contactFixtures.js';

const realDraw = rng.drawFromStream;

const ALL_WEAPONS: readonly ItemCard[] = [
  ...Object.values(STARTING_WEAPONS),
  ...RED_ITEM_CARDS.filter((card) => card.isWeapon),
  ...CRAFTED_ITEM_CARDS.filter((card) => card.isWeapon),
];

/** Грани кубика Боя по порядку бросков, не трогая другие потоки RNG. */
export function forceCombatDice(state: GameState, faces: readonly CombatDieFace[]): void {
  const firstDraw = state.meta.rngDraws.combat;
  vi.spyOn(rng, 'drawFromStream').mockImplementation((seed, stream, drawIndex) => {
    if (stream !== 'combat') return realDraw(seed, stream, drawIndex);
    const face = faces[Math.min(drawIndex - firstDraw, faces.length - 1)]!;
    return (COMBAT_DIE_FACES.indexOf(face) + 0.5) / COMBAT_DIE_FACES.length;
  });
}

/** Персонаж в Бою с оружием в руке; колода Атак сверху — две карты без стрелки Отступления. */
export function weaponState(
  seed: string,
  weaponId: string,
  options: { ammo?: number; targetType?: IntruderType } = {},
): { state: GameState; intruderId: string } {
  const state = combatStatusState(seed);
  const intruderId = putIntruder(state, options.targetType ?? 'QUEEN', 11);
  const toughness = structuredClone(INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_SCRATCH_2')!);
  const rest = INTRUDER_ATTACK_CARDS.filter((card) => card.id !== toughness.id).map((card) => structuredClone(card));
  state.decks.intruderAttacks = {
    drawPile: [toughness, { ...toughness, id: 'IAT_SCRATCH_2_COPY' }, ...rest],
    discard: [],
  };
  const template = ALL_WEAPONS.find((card) => card.id === weaponId);
  if (!template) throw new Error(`Нет оружия ${weaponId}`);
  const weapon = { ...structuredClone(template), ammo: options.ammo ?? template.ammo };
  state.players['player-1']!.handSlots = [{ source: 'ITEM', card: weapon }];
  return { state, intruderId };
}

export function paymentCards(state: GameState, count = 1): string[] {
  return state.players['player-1']!.actionDeck.hand.filter((card) => 'characterClass' in card)
    .slice(0, count)
    .map((card) => card.id);
}

export function shoot(state: GameState, weaponItemId: string, targetIntruderId: string, extra = false): GameState {
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

export function lastShot(state: GameState) {
  const entry = [...state.gameLog].reverse().find((candidate) => candidate.event.type === 'SHOOT_RESOLVED');
  if (!entry || entry.event.type !== 'SHOOT_RESOLVED') throw new Error('SHOOT_RESOLVED не в журнале');
  return entry.event;
}

export function weaponAmmo(state: GameState): number | null {
  const slot = state.players['player-1']!.handSlots[0];
  return slot?.source === 'ITEM' ? slot.card.ammo : null;
}
