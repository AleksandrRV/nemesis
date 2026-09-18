import type { ItemCard } from '../types/cards.js';
import type { CharacterClass } from '../types/entities.js';

export interface StartingWeaponCard extends ItemCard {
  origin: 'STARTING';
  isWeapon: true;
  characterClass: CharacterClass;
  isEnergyWeapon: boolean;
}

export const STARTING_WEAPONS: Record<CharacterClass, StartingWeaponCard> = {
  CAPTAIN: {
    id: 'WEAPON_CAPTAIN_REVOLVER',
    name: 'Револьвер',
    color: 'RED',
    origin: 'STARTING',
    isHeavy: true,
    isSingleUse: false,
    componentSymbols: [],
    actionCost: 1,
    description:
      'Классическое оружие. Перезаряжается только Действием «Перезарядка». Выброшенные [2 Раны] наносят 1 Рану.',
    isWeapon: true,
    characterClass: 'CAPTAIN',
    isEnergyWeapon: false,
    ammo: 6,
    maxAmmo: 6,
  },

  PILOT: {
    id: 'WEAPON_PILOT_SHOTGUN',
    name: 'Дробовик',
    color: 'RED',
    origin: 'STARTING',
    isHeavy: true,
    isSingleUse: false,
    componentSymbols: [],
    actionCost: 1,
    description: 'Классическое оружие. Каждый раз, когда вы наносите хотя бы 1 Рану, нанесите 1 дополнительную Рану.',
    isWeapon: true,
    characterClass: 'PILOT',
    isEnergyWeapon: false,
    ammo: 2,
    maxAmmo: 2,
  },

  MECHANIC: {
    id: 'WEAPON_MECHANIC_SAWED_OFF',
    name: 'Обрез',
    color: 'RED',
    origin: 'STARTING',
    isHeavy: true,
    isSingleUse: false,
    componentSymbols: [],
    actionCost: 1,
    description: 'Классическое оружие. Выброшенный символ «Силуэты» считается промахом.',
    isWeapon: true,
    characterClass: 'MECHANIC',
    isEnergyWeapon: false,
    ammo: 2,
    maxAmmo: 2,
  },

  SOLDIER: {
    id: 'WEAPON_SOLDIER_ASSAULT_RIFLE',
    name: 'Боевая винтовка',
    color: 'RED',
    origin: 'STARTING',
    isHeavy: true,
    isSingleUse: false,
    componentSymbols: [],
    actionCost: 1,
    description: 'Классическое оружие. Каждый раз, когда вы наносите хотя бы 1 Рану, нанесите 1 дополнительную Рану.',
    isWeapon: true,
    characterClass: 'SOLDIER',
    isEnergyWeapon: false,
    ammo: 5,
    maxAmmo: 5,
  },

  SCOUT: {
    id: 'WEAPON_SCOUT_ENERGY_RIFLE',
    name: 'Энерговинтовка',
    color: 'RED',
    origin: 'STARTING',
    isHeavy: true,
    isSingleUse: false,
    componentSymbols: [],
    actionCost: 1,
    description: 'Энергооружие. Может быть перезаряжено в Оружейной или Энергозарядом.',
    isWeapon: true,
    characterClass: 'SCOUT',
    isEnergyWeapon: true,
    ammo: 4,
    maxAmmo: 4,
  },

  SCIENTIST: {
    id: 'WEAPON_SCIENTIST_PISTOL',
    name: 'Пистолет',
    color: 'RED',
    origin: 'STARTING',
    isHeavy: true,
    isSingleUse: false,
    componentSymbols: [],
    actionCost: 1,
    description: 'Классическое оружие. Выброшенные [2 Раны] считаются 1 Раной.',
    isWeapon: true,
    characterClass: 'SCIENTIST',
    isEnergyWeapon: false,
    ammo: 3,
    maxAmmo: 3,
  },
};
