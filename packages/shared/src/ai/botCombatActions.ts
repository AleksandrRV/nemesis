import { ACTION_CARD_COMBAT_USE } from '../data/combatUse.js';
import type { ActionCard, ItemCard } from '../types/cards.js';
import type { IntruderEntity } from '../types/entities.js';
import type { RoomId } from '../types/rooms.js';
import { attackBlock, loadedHandWeapon } from '../logic/actionRules.js';
import { escapeCost } from '../logic/seriousWoundEffects.js';
import { findAdjacentOpenRoomIds } from '../logic/shipGraphQueries.js';
import { effect, paidCandidate, type Candidate, type CandidateContext } from './botCandidates.js';
import { cardValue, handOf } from './botHand.js';
import {
  meleeInjuryOdds,
  meleeMissChance,
  neutralizeChance,
  seriousWoundHarm,
  shotInjuryOdds,
  vitalityOf,
  type InjuryOdds,
} from './botHarm.js';

const AIMED_FIRE = 'ACT_SOL_AIMED_FIRE';
const BURST_FIRE = 'ACT_SOL_BURST_FIRE';
const ADRENALINE = 'ACT_SCO_ADRENALINE';
const COVERING_FIRE_CARDS = ['ACT_SOL_SUPPRESSIVE_FIRE', 'ACT_CAP_SUPPRESSIVE_FIRE', 'ACT_SCO_SUPPRESSIVE_FIRE'];

function loadedWeapons(context: CandidateContext): ItemCard[] {
  return context.self.handSlots.flatMap((slot) =>
    slot.source === 'ITEM' && loadedHandWeapon(context.self, slot.card.id).block === null ? [slot.card] : [],
  );
}

function targetsInReach(context: CandidateContext): IntruderEntity[] {
  const { view, self, inCombat } = context;
  return view.intrudersPool.boardTokens.filter(
    (token) => attackBlock('SHOOT', inCombat, self.roomId, token.roomId) === null,
  );
}

function handCard(context: CandidateContext, cardId: string): ActionCard | undefined {
  return handOf(context.view, context.botId).find(
    (card) => card.id === cardId && ACTION_CARD_COMBAT_USE[card.effect.kind] !== 'OUT_OF_COMBAT',
  );
}

/** Кандидат с шансом убрать цель: он же качество задачи «Бой». */
function withShot(candidate: Candidate | null, target: IntruderEntity, chance: number, ammoUsed: number) {
  return candidate
    ? { ...candidate, quality: chance, neutralizes: [{ intruderId: target.id, chance }], ammoUsed }
    : null;
}

function neutralizing(context: CandidateContext, target: IntruderEntity, odds: InjuryOdds): number {
  return neutralizeChance(context.view, target.type, target.woundsCount, odds, 1);
}

/** Переброс «Прицельного огня»: грань без Ран бросается заново (стр. 24). */
function withReroll(odds: InjuryOdds): InjuryOdds {
  const miss = odds.get(0) ?? 0;
  const rerolled = new Map<number, number>();
  for (const [injuries, share] of odds) {
    const kept = injuries === 0 ? 0 : share;
    rerolled.set(injuries, (rerolled.get(injuries) ?? 0) + kept + miss * share);
  }
  return rerolled;
}

/** «Стрельба очередью» (стр. 26): весь Боезапас в один выстрел, +1 Рана за каждые 2 ед. при попадании. */
function withBurst(odds: InjuryOdds, ammo: number): InjuryOdds {
  const bonus = Math.floor(ammo / 2);
  return new Map([...odds].map(([injuries, share]) => [injuries > 0 ? injuries + bonus : 0, share]));
}

function cardPlayed(candidate: Candidate | null, card: ActionCard, context: CandidateContext): Candidate | null {
  return candidate
    ? {
        ...candidate,
        kind: candidate.kind,
        spent: candidate.spent + cardValue(card, context.tuning),
        cardsUsed: (candidate.cardsUsed ?? 0) + 1,
      }
    : null;
}

function shots(context: CandidateContext, weapon: ItemCard, target: IntruderEntity): (Candidate | null)[] {
  const { view } = context;
  const fight = [effect('FIGHT', { roomId: context.self.roomId })];
  const odds = shotInjuryOdds(view, weapon, target.type);
  const plain = paidCandidate(
    context,
    'SHOOT',
    1,
    (discardCardIds) => ({
      type: 'ACTION_SHOOT',
      payload: { weaponItemId: weapon.id, targetIntruderId: target.id, discardCardIds },
    }),
    fight,
  );
  const variants: (Candidate | null)[] = [withShot(plain, target, neutralizing(context, target, odds), 1)];
  const aimed = handCard(context, AIMED_FIRE);
  if (aimed && weapon.isEnergyWeapon) {
    const candidate = paidCandidate(
      context,
      'SHOOT',
      1,
      (discardCardIds) => ({
        type: 'ACTION_PLAY_CARD',
        payload: {
          cardId: aimed.id,
          discardCardIds,
          combat: { kind: 'AIMED_SHOOT', weaponItemId: weapon.id, targetIntruderId: target.id },
        },
      }),
      fight,
      context.self.roomId,
      [aimed.id],
    );
    const chance = neutralizing(context, target, withReroll(odds));
    variants.push(withShot(cardPlayed(candidate, aimed, context), target, chance, 1));
  }
  const burst = handCard(context, BURST_FIRE);
  const ammo = weapon.ammo ?? 0;
  if (burst && ammo >= 2) {
    const candidate = paidCandidate(
      context,
      'SHOOT',
      1,
      (discardCardIds) => ({
        type: 'ACTION_PLAY_CARD',
        payload: {
          cardId: burst.id,
          discardCardIds,
          combat: { kind: 'BURST_SHOOT', weaponItemId: weapon.id, targetIntruderId: target.id },
        },
      }),
      fight,
      context.self.roomId,
      [burst.id],
    );
    const chance = neutralizing(context, target, withBurst(odds, ammo));
    variants.push(withShot(cardPlayed(candidate, burst, context), target, chance, ammo));
  }
  const adrenaline = handCard(context, ADRENALINE);
  if (adrenaline) {
    const candidate = paidCandidate(
      context,
      'SHOOT',
      1,
      (discardCardIds) => ({
        type: 'ACTION_PLAY_CARD',
        payload: {
          cardId: adrenaline.id,
          discardCardIds,
          combat: { kind: 'ADRENALINE_SHOOT', weaponItemId: weapon.id, targetIntruderId: target.id },
        },
      }),
      fight,
      context.self.roomId,
      [adrenaline.id],
    );
    const played = cardPlayed(candidate, adrenaline, context);
    const drawn = played ? { ...played, cardsUsed: (played.cardsUsed ?? 1) - 1 } : null;
    variants.push(withShot(drawn, target, neutralizing(context, target, odds), 1));
  }
  return variants;
}

/** Рукопашная (стр. 19): карта Заражения всегда, промах — Тяжёлая Травма. */
function melee(context: CandidateContext, target: IntruderEntity): Candidate | null {
  const { tuning } = context;
  const candidate = paidCandidate(
    context,
    'MELEE',
    1,
    (discardCardIds) => ({ type: 'ACTION_MELEE', payload: { targetIntruderId: target.id, discardCardIds } }),
    [effect('FIGHT', { roomId: context.self.roomId })],
  );
  const vitality = vitalityOf(context.self);
  const harmNow = meleeMissChance(target.type) * seriousWoundHarm(vitality, tuning) + tuning.tactics.harm.contamination;
  const shot = withShot(candidate, target, neutralizing(context, target, meleeInjuryOdds(target.type)), 0);
  return shot ? { ...shot, harmNow } : null;
}

/** Отход без Атак Чужих: «Огонь на подавление» / «Заградительный огонь» за 1 ед. Боезапаса (стр. 19, 24–28). */
function coveredEscapes(context: CandidateContext, weapons: readonly ItemCard[]): Candidate[] {
  const weapon = weapons[0];
  if (!context.inCombat || !weapon) return [];
  const card = COVERING_FIRE_CARDS.map((id) => handCard(context, id)).find((entry) => entry !== undefined);
  if (!card) return [];
  return findAdjacentOpenRoomIds(context.view, context.self.roomId).map((targetRoomId: RoomId): Candidate => ({
    action: {
      type: 'ACTION_PLAY_CARD',
      payload: {
        cardId: card.id,
        discardCardIds: [],
        combat: {
          kind: 'REPOSITION',
          weaponItemId: weapon.id,
          moves: [{ playerId: context.botId, targetRoomId }],
        },
      },
    },
    kind: 'COVERED_ESCAPE',
    effects: [],
    roomId: targetRoomId,
    spent: cardValue(card, context.tuning),
    cardsUsed: 1,
    ammoUsed: 1,
  }));
}

/** «Адреналин» (стр. 27): Побег с добором карты — Атаки Побега те же, но рука не пустеет. */
function adrenalineEscapes(context: CandidateContext): Candidate[] {
  const card = handCard(context, ADRENALINE);
  if (!context.inCombat || !card) return [];
  return findAdjacentOpenRoomIds(context.view, context.self.roomId).flatMap((targetRoomId) => {
    const candidate = paidCandidate(
      context,
      'ESCAPE',
      escapeCost(context.self),
      (discardCardIds) => ({
        type: 'ACTION_PLAY_CARD',
        payload: { cardId: card.id, discardCardIds, combat: { kind: 'ADRENALINE_ESCAPE', targetRoomId } },
      }),
      [],
      targetRoomId,
      [card.id],
    );
    return candidate ? [{ ...candidate, spent: candidate.spent + cardValue(card, context.tuning) }] : [];
  });
}

/** Боевые Действия бота: по каждой цели — лучшие доступные способы убрать её из Комнаты или уйти без Атак. */
export function combatCandidates(context: CandidateContext): Candidate[] {
  const weapons = loadedWeapons(context);
  const targets = targetsInReach(context);
  const attacks = targets.flatMap((target) => [
    ...weapons.flatMap((weapon) => shots(context, weapon, target)),
    melee(context, target),
  ]);
  return [
    ...attacks.filter((candidate): candidate is Candidate => candidate !== null),
    ...coveredEscapes(context, weapons),
    ...adrenalineEscapes(context),
  ];
}
