import type { CombatDieFace } from './combatDie.js';

export interface WeaponModifiers {
  rolledFaceOverrides: Partial<Record<CombatDieFace, CombatDieFace>>;
  minimumOneWoundUnlessMiss: boolean;
  bonusWoundFaces: readonly CombatDieFace[];
  bonusWoundOnHit: boolean;
  extraAmmoWoundFace: CombatDieFace | null;
  ignitionFace: CombatDieFace | null;
  grantsReroll: boolean;
}

const NO_MODIFIERS: WeaponModifiers = {
  rolledFaceOverrides: {},
  minimumOneWoundUnlessMiss: false,
  bonusWoundFaces: [],
  bonusWoundOnHit: false,
  extraAmmoWoundFace: null,
  ignitionFace: null,
  grantsReroll: false,
};

const WEAPON_MODIFIERS_BY_ID_PREFIX: readonly (readonly [string, Partial<WeaponModifiers>])[] = [
  ['WEAPON_CAPTAIN_REVOLVER', { bonusWoundFaces: ['TWO_WOUNDS'] }],
  ['WEAPON_PILOT_SHOTGUN', { bonusWoundOnHit: true }],
  ['WEAPON_MECHANIC_SAWED_OFF', { rolledFaceOverrides: { ONE_WOUND: 'TWO_WOUNDS' } }],
  ['WEAPON_SOLDIER_ASSAULT_RIFLE', { bonusWoundOnHit: true }],
  ['WEAPON_SCIENTIST_PISTOL', { rolledFaceOverrides: { TWO_WOUNDS: 'ONE_WOUND' } }],
  ['CRAFTED_FLAMETHROWER_', { minimumOneWoundUnlessMiss: true, ignitionFace: 'TWO_WOUNDS' }],
  ['ITEM_RED_PROTOTYPE_RIFLE_', { extraAmmoWoundFace: 'TWO_WOUNDS' }],
  ['ITEM_RED_PROTOTYPE_SHOTGUN_', { minimumOneWoundUnlessMiss: true, bonusWoundFaces: ['ONE_WOUND', 'TWO_WOUNDS'] }],
  ['ITEM_RED_PROTOTYPE_PISTOL_', { grantsReroll: true }],
];

export function weaponModifiers(weaponItemId: string): WeaponModifiers {
  const entry = WEAPON_MODIFIERS_BY_ID_PREFIX.find(([prefix]) => weaponItemId.startsWith(prefix));
  return { ...NO_MODIFIERS, ...entry?.[1] };
}
