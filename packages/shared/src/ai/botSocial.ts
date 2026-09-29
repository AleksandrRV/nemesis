import type { BetaScale, BotCharacter, EvidenceReason, PlayerModel, SocialEvidence, SocialScale } from './botMind.js';
import { activePersona, effectiveKnobs } from './botCharacter.js';
import type { BotDifficulty, BotTuning } from './botTuning.js';

const PRIOR_WEIGHT = 2;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function scaleMean(scale: BetaScale): number {
  return scale.alpha / (scale.alpha + scale.beta);
}

function priorScale(mean: number): BetaScale {
  const clamped = Math.min(0.95, Math.max(0.05, mean));
  return { alpha: clamped * PRIOR_WEIGHT, beta: (1 - clamped) * PRIOR_WEIGHT };
}

/** Априорная модель игрока: доверие по характеру бота, помощи и вреда ещё не было. */
export function initialPlayerModel(initialTrust: number): PlayerModel {
  return {
    honesty: priorScale(initialTrust),
    reliability: priorScale(initialTrust),
    goodwill: priorScale(0.5),
    skepticism: 0,
    evidence: [],
  };
}

function scaleKey(scale: SocialScale): 'honesty' | 'reliability' | 'goodwill' {
  return scale === 'HONESTY' ? 'honesty' : scale === 'RELIABILITY' ? 'reliability' : 'goodwill';
}

function shifted(scale: BetaScale, weight: number): BetaScale {
  return weight >= 0 ? { ...scale, alpha: scale.alpha + weight } : { ...scale, beta: scale.beta - weight };
}

/** Улика сдвигает шкалу и остаётся в списке «почему»; пойманная ложь включает скепсис. */
export function withEvidence(
  model: PlayerModel,
  scale: SocialScale,
  weight: number,
  reason: EvidenceReason,
  round: number,
  tuning: BotTuning,
): PlayerModel {
  if (weight === 0) return model;
  const key = scaleKey(scale);
  const evidence: SocialEvidence[] = [...model.evidence, { round, scale, weight, reason }];
  const lieSeverity = scale === 'HONESTY' && weight < 0 ? Math.min(1, -weight / tuning.trust.deedWeight) : 0;
  return {
    ...model,
    [key]: shifted(model[key], weight),
    skepticism: Math.max(model.skepticism, tuning.trust.skepticismOnLie * lieSeverity),
    evidence: evidence.slice(-tuning.trust.maxEvidencePerPlayer),
  };
}

/** Доверие (В8-6-2): сводка трёх шкал, дела весят больше слов. */
export function trustIn(model: PlayerModel, tuning: BotTuning): number {
  const words = scaleMean(model.honesty) * tuning.trust.wordWeight;
  const deeds = ((scaleMean(model.reliability) + scaleMean(model.goodwill)) / 2) * tuning.trust.deedWeight;
  return (words + deeds) / (tuning.trust.wordWeight + tuning.trust.deedWeight);
}

export function hostilityOf(model: PlayerModel): number {
  return 1 - scaleMean(model.goodwill);
}

/** Вес слов игрока: пойманного лжеца бот почти не слышит, ниже порога честности — не слышит вовсе. */
export function claimWeight(model: PlayerModel | undefined, tuning: BotTuning): number {
  const honesty = model ? scaleMean(model.honesty) : tuning.trust.initial;
  if (honesty < tuning.trust.skepticismFloor) return 0;
  const skepticism = model?.skepticism ?? 0;
  return tuning.trust.claimInfluence * honesty * (1 - skepticism);
}

function relaxed(scale: BetaScale, prior: BetaScale, rate: number): BetaScale {
  const keep = 1 - clamp01(rate);
  return {
    alpha: prior.alpha + (scale.alpha - prior.alpha) * keep,
    beta: prior.beta + (scale.beta - prior.beta) * keep,
  };
}

/**
 * Забывание за раунд: слова и дела медленно возвращаются к априорному, обиды — медленнее у «Обидчивого»
 * (ручка `grudgeMemory`), скепсис тает со скоростью ручки `skepticismDecay`.
 */
export function relaxPlayerModel(
  model: PlayerModel,
  rounds: number,
  initialTrust: number,
  knobs: { grudgeMemory: number; skepticismDecay: number },
  tuning: BotTuning,
): PlayerModel {
  if (rounds <= 0) return model;
  let next = model;
  const grudgeRate = tuning.trust.goodwillForgettingPerRound / Math.max(knobs.grudgeMemory, 0.01);
  const skepticismRate = tuning.trust.skepticismDecayPerRound * knobs.skepticismDecay;
  for (let round = 0; round < rounds; round++) {
    next = {
      ...next,
      honesty: relaxed(next.honesty, priorScale(initialTrust), tuning.trust.forgettingPerRound),
      reliability: relaxed(next.reliability, priorScale(initialTrust), tuning.trust.forgettingPerRound),
      goodwill: relaxed(next.goodwill, priorScale(0.5), grudgeRate),
      skepticism: Math.max(0, next.skepticism - skepticismRate),
    };
  }
  return next;
}

/**
 * Вес чужого успеха в полезности (план 0.8.0, §4): при морали > 0 — альтруизм, около 0 — рациональный эгоизм,
 * при морали < 0 — злорадство. Масштаб — ручка `othersSuccessWeight`.
 */
export function othersSuccessWeight(character: BotCharacter, difficulty: BotDifficulty, tuning: BotTuning): number {
  return (activePersona(character).morale / 100) * effectiveKnobs(character, difficulty, tuning).othersSuccessWeight;
}
