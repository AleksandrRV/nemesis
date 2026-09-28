import type { ItemCard } from '../types/cards.js';
import type { CharacterClass } from '../types/entities.js';

export interface StartingWeaponCard extends ItemCard {
  origin: 'STARTING';
  isWeapon: true;
  characterClass: CharacterClass;
  isEnergyWeapon: boolean;
}

interface StartingWeaponSpec {
  id: string;
  name: string;
  characterClass: CharacterClass;
  isEnergyWeapon: boolean;
  ammo: number;
  property: string | null;
}

function startingWeapon(spec: StartingWeaponSpec): StartingWeaponCard {
  const kind = spec.isEnergyWeapon ? 'Энергооружие' : 'Классическое оружие';
  return {
    id: spec.id,
    name: spec.name,
    color: 'RED',
    origin: 'STARTING',
    isHeavy: true,
    isSingleUse: false,
    componentSymbols: [],
    actionCost: 1,
    description: [`${kind}.`, `Боезапас: ${spec.ammo}.`, spec.property].filter(Boolean).join(' '),
    isWeapon: true,
    characterClass: spec.characterClass,
    isEnergyWeapon: spec.isEnergyWeapon,
    ammo: spec.ammo,
    maxAmmo: spec.ammo,
  };
}

const HIT_BONUS_TEXT = 'Каждый раз, когда вы наносите хотя бы 1 Рану, вы наносите 1 дополнительную Рану.';

export const STARTING_WEAPONS: Record<CharacterClass, StartingWeaponCard> = {
  CAPTAIN: startingWeapon({
    id: 'WEAPON_CAPTAIN_REVOLVER',
    name: 'Револьвер',
    characterClass: 'CAPTAIN',
    isEnergyWeapon: false,
    ammo: 6,
    property:
      'Может быть перезаряжен только Действием «Перезарядка». Когда вы выбрасываете [2 Раны], вы наносите 1 доп. Рану.',
  }),
  PILOT: startingWeapon({
    id: 'WEAPON_PILOT_SHOTGUN',
    name: 'Дробовик',
    characterClass: 'PILOT',
    isEnergyWeapon: true,
    ammo: 2,
    property: HIT_BONUS_TEXT,
  }),
  MECHANIC: startingWeapon({
    id: 'WEAPON_MECHANIC_SAWED_OFF',
    name: 'Обрез',
    characterClass: 'MECHANIC',
    isEnergyWeapon: true,
    ammo: 2,
    property: 'Выброшенные [1 Рана] считаются [2 Раны].',
  }),
  SOLDIER: startingWeapon({
    id: 'WEAPON_SOLDIER_ASSAULT_RIFLE',
    name: 'Боевая винтовка',
    characterClass: 'SOLDIER',
    isEnergyWeapon: true,
    ammo: 5,
    property: HIT_BONUS_TEXT,
  }),
  SCOUT: startingWeapon({
    id: 'WEAPON_SCOUT_ENERGY_RIFLE',
    name: 'Винтовка',
    characterClass: 'SCOUT',
    isEnergyWeapon: true,
    ammo: 4,
    property: null,
  }),
  SCIENTIST: startingWeapon({
    id: 'WEAPON_SCIENTIST_PISTOL',
    name: 'Пистолет',
    characterClass: 'SCIENTIST',
    isEnergyWeapon: true,
    ammo: 3,
    property: 'Выброшенные [2 Раны] считаются [1 Рана].',
  }),
};
