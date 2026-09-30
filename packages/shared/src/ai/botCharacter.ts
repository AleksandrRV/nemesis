import { createRng, type Rng } from '../utils/rng.js';
import type { BotCharacter, BotPersona } from './botMind.js';
import {
  BOT_TRAITS,
  BOT_TUNING,
  type BotDifficulty,
  type BotTraitId,
  type BotTuning,
  type TuningKnob,
} from './botTuning.js';

/** Личный поток `ai` бота, продолженный с позиции `start`: мысли одного бота не сдвигают чужих. */
export function botStream(seed: string, start: number): { rng: Rng; used: () => number } {
  const generator = createRng(seed, 'ai');
  for (let index = 0; index < start; index++) generator();
  let used = start;
  return {
    rng: () => {
      used += 1;
      return generator();
    },
    used: () => used,
  };
}

/** Сид мыслей бота: мастер-сид партии плюс место, чтобы у каждого бота была своя последовательность. */
export function botSeedOf(gameSeed: string, botId: string): string {
  return `${gameSeed}@${botId}`;
}

function rollMorale(rng: Rng, tuning: BotTuning): number {
  const span = tuning.morale.max - tuning.morale.min + 1;
  const rolls = Array.from({ length: tuning.morale.rolls }, () => tuning.morale.min + Math.floor(rng() * span));
  return Math.max(...rolls);
}

function weightedIndex(rng: Rng, weights: readonly number[]): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = rng() * total;
  for (let index = 0; index < weights.length; index++) {
    roll -= weights[index]!;
    if (roll < 0) return index;
  }
  return weights.length - 1;
}

function rarityOf(trait: BotTraitId, difficulty: BotDifficulty, tuning: BotTuning): number {
  const base = tuning.traits.catalog[trait].rarity;
  return trait === 'FORGETFUL' ? Math.max(0, base + tuning.difficulty[difficulty].forgetfulRarityBonus) : base;
}

function compatible(trait: BotTraitId, chosen: readonly BotTraitId[], tuning: BotTuning): boolean {
  return chosen.every(
    (other) =>
      other !== trait &&
      !tuning.traits.catalog[trait].incompatibleWith.includes(other) &&
      !tuning.traits.catalog[other].incompatibleWith.includes(trait),
  );
}

function pickTraits(
  rng: Rng,
  count: number,
  difficulty: BotDifficulty,
  tuning: BotTuning,
  excluded: readonly BotTraitId[],
): BotTraitId[] {
  const chosen: BotTraitId[] = [];
  for (let slot = 0; slot < count; slot++) {
    const pool = BOT_TRAITS.filter((trait) => !excluded.includes(trait) && compatible(trait, chosen, tuning));
    const weights = pool.map((trait) => rarityOf(trait, difficulty, tuning));
    if (pool.length === 0 || weights.every((weight) => weight <= 0)) break;
    chosen.push(pool[weightedIndex(rng, weights)]!);
  }
  return chosen;
}

function clampMorale(value: number, tuning: BotTuning): number {
  return Math.min(tuning.morale.max, Math.max(tuning.morale.min, value));
}

function shiftedMorale(base: number, traits: readonly BotTraitId[], tuning: BotTuning): number {
  return clampMorale(base + traits.reduce((sum, trait) => sum + tuning.traits.catalog[trait].moraleShift, 0), tuning);
}

/**
 * Характер (план 0.8.0, В8-5-7): мораль — наибольший из двух бросков от −100 до +100, черты — 1–3 по редкости
 * без несовместимых пар, черты сдвигают мораль. Всё — потоком `ai` этого бота.
 */
export function generateCharacter(
  seed: string,
  difficulty: BotDifficulty,
  tuning: BotTuning = BOT_TUNING,
): { character: BotCharacter; draws: number } {
  const stream = botStream(seed, 0);
  const baseMorale = rollMorale(stream.rng, tuning);
  const count = weightedIndex(stream.rng, tuning.traits.countWeights) + 1;
  const traits = pickTraits(stream.rng, count, difficulty, tuning, []);
  let alterEgo: BotPersona | null = null;
  if (traits.includes('SPLIT_PERSONALITY')) {
    const alterCount = weightedIndex(stream.rng, tuning.traits.countWeights) + 1;
    const alterTraits = pickTraits(stream.rng, alterCount, difficulty, tuning, ['SPLIT_PERSONALITY']);
    alterEgo = { traits: alterTraits, morale: shiftedMorale(-baseMorale, alterTraits, tuning) };
  }
  return {
    character: { traits, morale: shiftedMorale(baseMorale, traits, tuning), alterEgo, activePersona: 'PRIMARY' },
    draws: stream.used(),
  };
}

export function activePersona(character: BotCharacter): BotPersona {
  return character.activePersona === 'ALTER' && character.alterEgo ? character.alterEgo : character;
}

/** Раздвоение личности: личности сменяются каждые `splitPersonalitySwitchRounds` раундов, начиная с основной. */
export function personaForRound(character: BotCharacter, round: number, tuning: BotTuning = BOT_TUNING): BotCharacter {
  if (!character.alterEgo) return character;
  const period = Math.max(1, tuning.traits.splitPersonalitySwitchRounds);
  const active = Math.floor(Math.max(0, round - 1) / period) % 2 === 0 ? 'PRIMARY' : 'ALTER';
  return active === character.activePersona ? character : { ...character, activePersona: active };
}

/** `forgetChance` складывается, остальные ручки перемножаются: у базы 0 «Склеротик» добавляет шанс забыть. */
const ADDITIVE_KNOBS: ReadonlySet<TuningKnob> = new Set(['forgetChance']);

export function effectiveKnobs(
  character: BotCharacter,
  difficulty: BotDifficulty,
  tuning: BotTuning = BOT_TUNING,
): Record<TuningKnob, number> {
  const knobs = { ...tuning.knobs } as Record<TuningKnob, number>;
  const modifierSets = [
    ...activePersona(character).traits.map((trait) => tuning.traits.catalog[trait].modifiers),
    tuning.difficulty[difficulty].modifiers,
  ];
  for (const modifiers of modifierSets) {
    for (const [knob, value] of Object.entries(modifiers) as [TuningKnob, number][]) {
      knobs[knob] = ADDITIVE_KNOBS.has(knob) ? knobs[knob] + value : knobs[knob] * value;
    }
  }
  return knobs;
}
