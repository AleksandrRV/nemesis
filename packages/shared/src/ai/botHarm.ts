import { COMBAT_DIE_FACES, injuriesForFace, meleeInjuriesForFace, type CombatDieFace } from '../data/combatDie.js';
import { INTRUDER_ATTACK_CARDS, hasRetreatArrow } from '../data/intruderAttacks.js';
import { weaponModifiers } from '../data/weaponModifiers.js';
import type { IntruderAttackEffect } from '../types/cards.js';
import type { IntruderType } from '../types/entities.js';
import type { SanitizedGameState, SanitizedPlayerState } from '../types/sanitized.js';
import type { BotTuning } from './botTuning.js';

export interface Vitality {
  seriousWounds: number;
  lightWounds: number;
}

interface AttackAftermath extends Vitality {
  dead: boolean;
  contaminated: boolean;
  slimed: boolean;
}

const MAX_SERIOUS_WOUNDS = 3;
const LIGHT_WOUNDS_PER_SERIOUS = 3;

export function vitalityOf(player: Pick<SanitizedPlayerState, 'seriousWounds' | 'lightWounds'>): Vitality {
  return { seriousWounds: player.seriousWounds.length, lightWounds: player.lightWounds };
}

function takeSeriousWound(state: AttackAftermath): AttackAftermath {
  if (state.seriousWounds >= MAX_SERIOUS_WOUNDS) return { ...state, dead: true };
  return { ...state, seriousWounds: state.seriousWounds + 1 };
}

function takeLightWounds(state: AttackAftermath, count: number): AttackAftermath {
  let next = state;
  for (let wound = 0; wound < count && !next.dead; wound++) {
    if (next.seriousWounds >= MAX_SERIOUS_WOUNDS) return { ...next, dead: true };
    next = { ...next, lightWounds: next.lightWounds + 1 };
    if (next.lightWounds === LIGHT_WOUNDS_PER_SERIOUS) next = takeSeriousWound({ ...next, lightWounds: 0 });
  }
  return next;
}

function killsAtSeriousWounds(state: AttackAftermath, threshold: number): AttackAftermath {
  return state.seriousWounds >= threshold ? { ...state, dead: true } : takeSeriousWound(state);
}

/** Исход одной карты Атаки для Персонажа (стр. 20; тексты карт — `data/intruderAttacks.ts`). */
export function attackAftermath(vitality: Vitality, effect: IntruderAttackEffect): AttackAftermath {
  const start: AttackAftermath = { ...vitality, dead: false, contaminated: false, slimed: false };
  switch (effect) {
    case 'SCRATCH':
      return { ...takeLightWounds(start, 1), contaminated: true };
    case 'CLAW_ATTACK':
      return { ...takeLightWounds(start, 2), contaminated: true };
    case 'BITE':
    case 'FRENZY':
      return killsAtSeriousWounds(start, 2);
    case 'TAIL_ATTACK':
      return killsAtSeriousWounds(start, 1);
    case 'SLIME':
      return { ...start, contaminated: true, slimed: true };
    case 'TRANSFORMATION':
    case 'CALL':
      return start;
  }
}

/** Цена состояния здоровья в долях гибели: между Тяжёлыми Травмами — по Лёгким. */
export function fragilityCost(vitality: Vitality, tuning: BotTuning): number {
  const ladder = tuning.tactics.harm.fragility;
  const serious = Math.min(vitality.seriousWounds, MAX_SERIOUS_WOUNDS);
  const here = ladder[serious]!;
  const next = serious >= MAX_SERIOUS_WOUNDS ? 1 : ladder[serious + 1]!;
  return here + ((next - here) * vitality.lightWounds) / LIGHT_WOUNDS_PER_SERIOUS;
}

function aftermathHarm(before: Vitality, after: AttackAftermath, tuning: BotTuning): number {
  if (after.dead) return 1;
  const { harm } = tuning.tactics;
  return (
    fragilityCost(after, tuning) -
    fragilityCost(before, tuning) +
    (after.contaminated ? harm.contamination : 0) +
    (after.slimed ? harm.slime : 0)
  );
}

/** Ожидаемый вред одной Атаки Чужого по составу колоды Атак: чужая карта — Промах (стр. 20). */
export function attackHarm(vitality: Vitality, attacker: IntruderType, tuning: BotTuning): number {
  if (attacker === 'LARVA') return tuning.tactics.harm.larva;
  const total = INTRUDER_ATTACK_CARDS.reduce(
    (sum, card) =>
      card.attackerTypes.includes(attacker)
        ? sum + aftermathHarm(vitality, attackAftermath(vitality, card.effect), tuning)
        : sum,
    0,
  );
  return total / INTRUDER_ATTACK_CARDS.length;
}

/** Шанс погибнуть от одной Атаки Чужого этого типа. */
export function attackDeathChance(vitality: Vitality, attacker: IntruderType): number {
  if (attacker === 'LARVA') return 0;
  const lethal = INTRUDER_ATTACK_CARDS.filter(
    (card) => card.attackerTypes.includes(attacker) && attackAftermath(vitality, card.effect).dead,
  ).length;
  return lethal / INTRUDER_ATTACK_CARDS.length;
}

/** Вред Тяжёлой Травмы (промах Рукопашной, Граната, Коктейль в своей Комнате). */
export function seriousWoundHarm(vitality: Vitality, tuning: BotTuning): number {
  const start: AttackAftermath = { ...vitality, dead: false, contaminated: false, slimed: false };
  return aftermathHarm(vitality, takeSeriousWound(start), tuning);
}

export function lightWoundHarm(vitality: Vitality, tuning: BotTuning): number {
  const start: AttackAftermath = { ...vitality, dead: false, contaminated: false, slimed: false };
  return aftermathHarm(vitality, takeLightWounds(start, 1), tuning);
}

/** Распределение Ран за один бросок кубика Боя: доля граней с каждым числом Ран. */
export type InjuryOdds = ReadonlyMap<number, number>;

function oddsOf(injuries: readonly number[]): InjuryOdds {
  const odds = new Map<number, number>();
  for (const count of injuries) odds.set(count, (odds.get(count) ?? 0) + 1 / injuries.length);
  return odds;
}

function isWeaknessRevealed(view: SanitizedGameState, effect: string): boolean {
  return view.intrudersPool.weaknessSlots.some((slot) => slot.visibility === 'REVEALED' && slot.card.effect === effect);
}

/** Раны выстрела по граням с модификаторами оружия и раскрытыми Слабостями (стр. 19, 21–22). */
export function shotInjuryOdds(
  view: SanitizedGameState,
  weapon: { id: string; isEnergyWeapon?: boolean },
  target: IntruderType,
): InjuryOdds {
  const modifiers = weaponModifiers(weapon.id);
  const energyBonus = weapon.isEnergyWeapon && isWeaknessRevealed(view, 'ENERGY_WEAKNESS') ? 1 : 0;
  const vulnerable = target === 'ADULT' && isWeaknessRevealed(view, 'VULNERABLE_SPOTS');
  return oddsOf(
    COMBAT_DIE_FACES.map((rolled) => {
      const face: CombatDieFace = modifiers.rolledFaceOverrides[rolled] ?? rolled;
      const counted = vulnerable && rolled === 'MISS' ? 'ONE_WOUND' : face;
      const base = injuriesForFace(counted, target);
      const floored = modifiers.minimumOneWoundUnlessMiss && rolled !== 'MISS' ? Math.max(1, base) : base;
      const bonus = modifiers.bonusWoundFaces.includes(rolled) ? 1 : 0;
      const injuries = floored + bonus;
      return injuries > 0 ? injuries + (modifiers.bonusWoundOnHit ? 1 : 0) + energyBonus : 0;
    }),
  );
}

export function meleeInjuryOdds(target: IntruderType): InjuryOdds {
  return oddsOf(COMBAT_DIE_FACES.map((face) => meleeInjuriesForFace(face, target)));
}

export function meleeMissChance(target: IntruderType): number {
  return meleeInjuryOdds(target).get(0) ?? 0;
}

function toughnessCardCount(type: IntruderType): number {
  return type === 'BREEDER' || type === 'QUEEN' ? 2 : 1;
}

interface InjuryCheckOdds {
  retreat: number;
  /** Шанс убить при данной сумме Ран на миниатюре. */
  killAt: (wounds: number) => number;
}

const injuryCheckCache = new Map<string, InjuryCheckOdds>();

function toughnessDraws(type: IntruderType, penalty: number): { retreat: boolean; toughness: number }[] {
  const cards = INTRUDER_ATTACK_CARDS;
  if (toughnessCardCount(type) === 1) {
    return cards.map((card) => ({ retreat: hasRetreatArrow(card), toughness: (card.toughness ?? 0) - penalty }));
  }
  return cards.flatMap((first, index) =>
    cards
      .filter((_, other) => other !== index)
      .map((second) => ({
        retreat: hasRetreatArrow(first) || hasRetreatArrow(second),
        toughness: (first.toughness ?? 0) + (second.toughness ?? 0) - 2 * penalty,
      })),
  );
}

/** Проверка Стойкости по картам Атак (стр. 20): Стрелка — Отступление, иначе сумма Стойкости. */
function injuryCheckOdds(view: SanitizedGameState, type: IntruderType): InjuryCheckOdds {
  if (type === 'LARVA') return { retreat: 0, killAt: (wounds) => (wounds > 0 ? 1 : 0) };
  const penalty = isWeaknessRevealed(view, 'EDGE_OF_EXTINCTION') ? 1 : 0;
  const key = `${type}:${penalty}`;
  const cached = injuryCheckCache.get(key);
  if (cached) return cached;
  const draws = toughnessDraws(type, penalty);
  const standing = draws.filter((draw) => !draw.retreat).map((draw) => draw.toughness);
  const killShares = new Map<number, number>();
  const odds: InjuryCheckOdds = {
    retreat: (draws.length - standing.length) / draws.length,
    killAt: (wounds) => {
      if (!killShares.has(wounds)) {
        killShares.set(wounds, standing.filter((toughness) => wounds >= toughness).length / draws.length);
      }
      return killShares.get(wounds)!;
    },
  };
  injuryCheckCache.set(key, odds);
  return odds;
}

/** Залп: броски с одним распределением Ран — выстрелы из одного Оружия, удар или взрыв. */
export interface Volley {
  odds: InjuryOdds;
  attempts: number;
}

type WoundSpread = Map<number, number>;

function afterHit(standing: WoundSpread, odds: InjuryOdds, check: InjuryCheckOdds): WoundSpread {
  const next: WoundSpread = new Map();
  for (const [wounds, mass] of standing) {
    for (const [injuries, chance] of odds) {
      const total = wounds + injuries;
      const stays = injuries === 0 ? 1 : 1 - check.retreat - check.killAt(total);
      next.set(total, (next.get(total) ?? 0) + mass * chance * stays);
    }
  }
  return next;
}

/**
 * Доля, в которой Чужой ещё стоит в Комнате после каждого раунда огня: Раны копятся на миниатюре между выстрелами
 * и раундами, каждое попадание — новая проверка по картам Атак (стр. 20).
 */
export function standingByRound(
  view: SanitizedGameState,
  type: IntruderType,
  woundsBefore: number,
  rounds: readonly (readonly Volley[])[],
): number[] {
  const check = injuryCheckOdds(view, type);
  let standing: WoundSpread = new Map([[woundsBefore, 1]]);
  const result: number[] = [];
  for (const volleys of rounds) {
    for (const volley of volleys) {
      for (let attempt = 0; attempt < volley.attempts; attempt++) standing = afterHit(standing, volley.odds, check);
    }
    result.push([...standing.values()].reduce((sum, mass) => sum + mass, 0));
  }
  return result;
}

/** Шанс, что Чужой покинет Комнату (убит или Отступил) за несколько попаданий подряд. */
export function neutralizeChance(
  view: SanitizedGameState,
  type: IntruderType,
  woundsBefore: number,
  odds: InjuryOdds,
  attempts: number,
): number {
  if (attempts <= 0) return 0;
  const [standing] = standingByRound(view, type, woundsBefore, [[{ odds, attempts }]]);
  return Math.min(1, Math.max(0, 1 - standing!));
}

/** Шанс убить (без Отступления) одним попаданием: ценность добить раненого Чужого. */
export function killChance(view: SanitizedGameState, type: IntruderType, woundsBefore: number, odds: InjuryOdds) {
  const check = injuryCheckOdds(view, type);
  let chance = 0;
  for (const [injuries, share] of odds) if (injuries > 0) chance += share * check.killAt(woundsBefore + injuries);
  return chance;
}
