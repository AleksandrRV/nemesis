import type { CombatDieFace } from './combatDie.js';

export interface WeaponModifiers {
  minimumOneWoundUnlessMiss: boolean;
  bonusWoundFaces: readonly CombatDieFace[];
  extraAmmoWoundFace: CombatDieFace | null;
  ignitionFace: CombatDieFace | null;
  grantsReroll: boolean;
}

const NO_MODIFIERS: WeaponModifiers = {
  minimumOneWoundUnlessMiss: false,
  bonusWoundFaces: [],
  extraAmmoWoundFace: null,
  ignitionFace: null,
  grantsReroll: false,
};

const WEAPON_MODIFIERS_BY_ID_PREFIX: readonly (readonly [string, Partial<WeaponModifiers>])[] = [
  ['CRAFTED_FLAMETHROWER_', { minimumOneWoundUnlessMiss: true, ignitionFace: 'TWO_WOUNDS' }],
  ['ITEM_RED_PROTOTYPE_RIFLE_', { extraAmmoWoundFace: 'TWO_WOUNDS' }],
  ['ITEM_RED_PROTOTYPE_SHOTGUN_', { minimumOneWoundUnlessMiss: true, bonusWoundFaces: ['ONE_WOUND', 'TWO_WOUNDS'] }],
  ['ITEM_RED_PROTOTYPE_PISTOL_', { grantsReroll: true }],
];

export function weaponModifiers(weaponItemId: string): WeaponModifiers {
  const entry = WEAPON_MODIFIERS_BY_ID_PREFIX.find(([prefix]) => weaponItemId.startsWith(prefix));
  return { ...NO_MODIFIERS, ...entry?.[1] };
}
