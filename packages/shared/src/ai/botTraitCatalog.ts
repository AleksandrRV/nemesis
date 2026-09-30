import type { BotDifficulty, BotTraitId, BotTraitSpec, DifficultyPreset } from './botTuning.js';

/** Каталог черт (план 0.8.0, §4): редкость, сдвиг морали, множители ручек и несовместимости. Описание — `doc/bots.md`. */
export const BOT_TRAIT_CATALOG = {
  PANICKER: {
    label: 'Паникёр',
    rarity: 6,
    moraleShift: 0,
    modifiers: { riskAversion: 2, temperature: 1.6, requestRate: 1.8, combatFlight: 2 },
    incompatibleWith: ['EXTERMINATOR'],
  },
  EXTERMINATOR: {
    label: 'Истребитель',
    rarity: 6,
    moraleShift: 0,
    modifiers: { combatDesire: 2, killHelpValue: 1.8, fear: 0.6 },
    incompatibleWith: ['PANICKER'],
  },
  HOARDER: {
    label: 'Барахольщик',
    rarity: 6,
    moraleShift: 0,
    modifiers: { itemHoarding: 2, itemGenerosity: 0.4 },
    incompatibleWith: ['PHILANTHROPIST'],
  },
  EXPLORER: {
    label: 'Исследователь',
    rarity: 7,
    moraleShift: 0,
    modifiers: { explorationBonus: 1.8 },
    incompatibleWith: [],
  },
  PERFECTIONIST: {
    label: 'Перфекционист',
    rarity: 5,
    moraleShift: 0,
    modifiers: { selfVerification: 2, promiseDiligence: 1.6 },
    incompatibleWith: ['FORGETFUL'],
  },
  STRATEGIST: {
    label: 'Стратег',
    rarity: 5,
    moraleShift: 0,
    modifiers: { horizon: 2.5 },
    incompatibleWith: [],
  },
  GENIUS: {
    label: 'Гений',
    rarity: 3,
    moraleShift: 0,
    modifiers: { temperature: 0.4, riskAccuracy: 1.5 },
    incompatibleWith: ['FORGETFUL'],
  },
  FORGETFUL: {
    label: 'Склеротик',
    rarity: 4,
    moraleShift: 0,
    modifiers: { forgetChance: 1 },
    incompatibleWith: ['GENIUS', 'PERFECTIONIST'],
  },
  PARANOID: {
    label: 'Параноик',
    rarity: 5,
    moraleShift: -5,
    modifiers: { initialTrust: 0.5, sharedRoomAvoidance: 2, scanRate: 1.8 },
    incompatibleWith: ['PHILANTHROPIST'],
  },
  EGOIST: {
    label: 'Эгоист',
    rarity: 6,
    moraleShift: -5,
    modifiers: { othersSuccessWeight: 0.3, harmWillingness: 0.5 },
    incompatibleWith: ['PHILANTHROPIST'],
  },
  EGOCENTRIST: {
    label: 'Эгоцентрист',
    rarity: 5,
    moraleShift: 0,
    modifiers: { requestRate: 2, refusalResentment: 2 },
    incompatibleWith: [],
  },
  PHILANTHROPIST: {
    label: 'Филантроп',
    rarity: 4,
    moraleShift: 20,
    modifiers: { itemGenerosity: 2, othersSuccessWeight: 1.6 },
    incompatibleWith: ['PSYCHOPATH', 'SOCIOPATH', 'EGOIST', 'HOARDER', 'PARANOID'],
  },
  SOCIOPATH: {
    label: 'Социопат',
    rarity: 3,
    moraleShift: -20,
    modifiers: { reciprocityWeight: 0, lieThreshold: 0.5 },
    incompatibleWith: ['PHILANTHROPIST'],
  },
  PSYCHOPATH: {
    label: 'Психопат',
    rarity: 2,
    moraleShift: -40,
    modifiers: { harmWillingness: 2.5, fear: 0.5 },
    incompatibleWith: ['PHILANTHROPIST'],
  },
  POTENTIAL_LIAR: {
    label: 'Потенциальный лжец',
    rarity: 5,
    moraleShift: 0,
    modifiers: { lieThreshold: 0.4 },
    incompatibleWith: [],
  },
  TOUCHY: {
    label: 'Обидчивый',
    rarity: 5,
    moraleShift: 0,
    modifiers: { grudgeMemory: 2, skepticismDecay: 0.1 },
    incompatibleWith: [],
  },
  SPLIT_PERSONALITY: {
    label: 'Раздвоение личности',
    rarity: 1,
    moraleShift: 0,
    modifiers: {},
    incompatibleWith: [],
  },
} as const satisfies Record<BotTraitId, BotTraitSpec>;

/** Пресеты сложности (В8-8-3): множители ручек и добавка к редкости «Склеротика». */
export const BOT_DIFFICULTY_PRESETS = {
  NOVICE: {
    label: 'Новичок',
    modifiers: { temperature: 2, riskAccuracy: 0.6, horizon: 0.5 },
    forgetfulRarityBonus: 6,
  },
  CREW: { label: 'Экипаж', modifiers: {}, forgetfulRarityBonus: 0 },
  VETERAN: {
    label: 'Ветеран',
    modifiers: { temperature: 0.5, riskAccuracy: 1.4, horizon: 2.5 },
    forgetfulRarityBonus: -3,
  },
} as const satisfies Record<BotDifficulty, DifficultyPreset>;
