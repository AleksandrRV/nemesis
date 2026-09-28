import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CombatDieFace } from '../data/combatDie.js';
import { RED_ITEM_CARDS } from '../data/itemCards.js';
import { STARTING_WEAPONS } from '../data/startingItems.js';
import { WEAKNESS_CARDS } from '../data/weaknesses.js';
import type { WeaknessEffect } from '../types/cards.js';
import type { CharacterClass } from '../types/entities.js';
import type { GameState } from '../types/state.js';
import { expectEngineError } from '../testing/contactFixtures.js';
import { forceCombatDice, lastShot, paymentCards, shoot, weaponAmmo, weaponState } from '../testing/weaponFixtures.js';
import { GameEngine } from './fsm.js';

afterEach(() => {
  vi.restoreAllMocks();
});

function revealWeakness(state: GameState, effect: WeaknessEffect): void {
  const template = WEAKNESS_CARDS.find((card) => card.effect === effect)!;
  state.intrudersPool.weaknessSlots[0]!.card = { ...structuredClone(template), isRevealed: true };
}

function shotWith(
  characterClass: CharacterClass,
  face: CombatDieFace,
  seed: string,
  setup?: (state: GameState) => void,
) {
  const weaponId = STARTING_WEAPONS[characterClass].id;
  const { state, intruderId } = weaponState(seed, weaponId);
  setup?.(state);
  forceCombatDice(state, [face]);
  return lastShot(shoot(state, weaponId, intruderId));
}

describe('Стартовое оружие (cards_additional.pdf, стр. 15, 17)', () => {
  it('Револьвер: при выброшенных «2 Ранах» — 1 доп. Рана', () => {
    expect(shotWith('CAPTAIN', 'TWO_WOUNDS', 'revolver-two')).toMatchObject({ injuries: 3 });
    expect(shotWith('CAPTAIN', 'ONE_WOUND', 'revolver-one')).toMatchObject({ injuries: 1 });
  });

  it('Дробовик: при хотя бы 1 Ране — 1 доп. Рана, без Раны бонуса нет', () => {
    expect(shotWith('PILOT', 'ONE_WOUND', 'shotgun-one')).toMatchObject({ injuries: 2, hitBonusWounds: 1 });
    expect(shotWith('PILOT', 'TAIL', 'shotgun-tail')).toMatchObject({ injuries: 0 });
  });

  it('Обрез: выброшенная «1 Рана» считается «2 Ранами»', () => {
    expect(shotWith('MECHANIC', 'ONE_WOUND', 'sawed-off-one')).toMatchObject({
      injuries: 2,
      countedFace: 'TWO_WOUNDS',
      countedBy: 'WEAPON',
    });
    expect(shotWith('MECHANIC', 'TWO_WOUNDS', 'sawed-off-two')).toMatchObject({ injuries: 2 });
  });

  it('Боевая винтовка: +1 Рана при попадании; с «Уязвимостью к энергии» бонусы суммируются', () => {
    expect(shotWith('SOLDIER', 'ONE_WOUND', 'rifle-hit')).toMatchObject({ injuries: 2, hitBonusWounds: 1 });
    const withWeakness = shotWith('SOLDIER', 'ONE_WOUND', 'rifle-energy', (state) =>
      revealWeakness(state, 'ENERGY_WEAKNESS'),
    );
    expect(withWeakness).toMatchObject({ injuries: 3, hitBonusWounds: 2 });
  });

  it('Винтовка Скаута свойств не имеет', () => {
    expect(shotWith('SCOUT', 'TWO_WOUNDS', 'scout-rifle')).toMatchObject({ injuries: 2 });
  });

  it('Пистолет: пример стр. 19 — выброшенные «2 Раны» кладут 1 маркер Раны', () => {
    const shot = shotWith('SCIENTIST', 'TWO_WOUNDS', 'pistol-example');
    expect(shot).toMatchObject({ dieFace: 'TWO_WOUNDS', countedFace: 'ONE_WOUND', countedBy: 'WEAPON', injuries: 1 });
    expect(shot.woundsTotal).toBe(1);
  });

  it('свойство Обреза и «Уязвимые места» меняют разные грани и не складываются', () => {
    const weaponId = STARTING_WEAPONS.MECHANIC.id;
    const { state, intruderId } = weaponState('sawed-off-vulnerable', weaponId, { targetType: 'ADULT' });
    revealWeakness(state, 'VULNERABLE_SPOTS');
    forceCombatDice(state, ['MISS']);

    expect(lastShot(shoot(state, weaponId, intruderId))).toMatchObject({
      countedFace: 'ONE_WOUND',
      countedBy: 'WEAKNESS',
      injuries: 1,
    });
  });
});

describe('Энергооружие заряжается Энергозарядом, Револьвер — только «Перезарядкой»', () => {
  function chargeWith(characterClass: CharacterClass, seed: string): GameState {
    const { state } = weaponState(seed, STARTING_WEAPONS[characterClass].id, { ammo: 0 });
    const charge = structuredClone(RED_ITEM_CARDS.find((card) => card.name === 'Энергозаряд')!);
    state.players['player-1']!.inventory.push(charge);
    return new GameEngine().processAction(state, {
      type: 'ACTION_USE_ITEM',
      payload: { itemId: charge.id, discardCardIds: paymentCards(state), option: 'CHARGE' },
    });
  }

  it('Дробовик Пилота заряжается до 2', () => {
    expect(weaponAmmo(chargeWith('PILOT', 'charge-shotgun'))).toBe(2);
  });

  it('Револьвер Энергозарядом не заряжается', () => {
    expectEngineError(() => chargeWith('CAPTAIN', 'charge-revolver'), 'WEAPON_NOT_AVAILABLE');
  });
});
