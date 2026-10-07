import { ITEM_COMBAT_USE } from '../data/combatUse.js';
import { CRAFTING_RECIPES, craftablePairs, type CraftingRecipe } from '../data/crafting.js';
import { getItemEffectKind, type ItemEffectKind } from '../data/itemEffectKinds.js';
import type { ItemCard } from '../types/cards.js';
import type { IntruderEntity } from '../types/entities.js';
import { CARD_OPTION } from '../types/cardOptions.js';
import type { UseItemActionPayload } from '../types/actions.js';
import type { RoomId } from '../types/rooms.js';
import { itemUseSurcharge } from '../logic/seriousWoundEffects.js';
import { findAdjacentOpenRoomIds } from '../logic/shipGraphQueries.js';
import {
  effect,
  paidCandidate,
  type Candidate,
  type CandidateContext,
  type Neutralization,
  type TaskEffect,
} from './botCandidates.js';
import { infectionDeath } from './botFinale.js';
import { unscannedContamination } from './botHand.js';
import { neutralizeChance, seriousWoundHarm, vitalityOf, type InjuryOdds } from './botHarm.js';
import { markerCost } from './botShipDoom.js';
import { crewIn, intrudersIn } from './botThreat.js';

const CRAFT_ACTION_COST = 1;
/** Огнетушитель и Тазер заставляют Чужого Отступить (стр. 20): он уходит, если есть куда. */
const RETREAT_SUCCESS = 0.85;
const GRENADE_TARGET_WOUNDS = 2;

interface ItemUse {
  payload: Omit<UseItemActionPayload, 'itemId' | 'discardCardIds'>;
  effects: TaskEffect[];
  kind?: Candidate['kind'];
  roomId?: RoomId;
  harmNow?: number;
  neutralizes?: Candidate['neutralizes'];
  /** Карты, которые Действие вернёт на руку. */
  drawn?: number;
  quality?: number;
}

function ownedItems(context: CandidateContext): ItemCard[] {
  const slots = context.self.handSlots.flatMap((slot) => (slot.source === 'ITEM' ? [slot.card] : []));
  return [...(context.self.inventory ?? []), ...slots];
}

function usableNow(context: CandidateContext, kind: ItemEffectKind): boolean {
  if (kind === 'QUEST' || kind === 'UNKNOWN' || kind === 'WEAPON') return false;
  const rule = ITEM_COMBAT_USE[kind];
  return rule === null || (rule === 'IN_COMBAT') === context.inCombat;
}

function heldWeapon(context: CandidateContext, matches: (card: ItemCard) => boolean): ItemCard | undefined {
  return context.self.handSlots.flatMap((slot) => (slot.source === 'ITEM' ? [slot.card] : [])).find(matches);
}

function woundCare(context: CandidateContext, kind: 'MEDKIT' | 'BANDAGES' | 'CLOTHES'): ItemUse[] {
  const { self } = context;
  const untreated = self.seriousWounds.some((wound) => !wound.isTreated);
  const treated = self.seriousWounds.some((wound) => wound.isTreated);
  const heal = [effect('HEAL')];
  const uses: ItemUse[] = [];
  if (untreated) uses.push({ payload: { option: CARD_OPTION.TREAT_SERIOUS }, effects: [effect('TREAT_WOUND')] });
  if (kind === 'MEDKIT' && treated) uses.push({ payload: { option: CARD_OPTION.HEAL_TREATED }, effects: heal });
  if (kind === 'BANDAGES' && self.lightWounds > 0) {
    uses.push({ payload: { option: CARD_OPTION.HEAL_LIGHT }, effects: heal });
  }
  if (kind === 'CLOTHES' && self.hasSlime)
    uses.push({ payload: { option: CARD_OPTION.SLIME }, effects: [effect('CLEANSE')] });
  return uses;
}

function repairUses(context: CandidateContext): ItemUse[] {
  const { room } = context;
  return room.hasMalfunction
    ? [{ payload: { option: CARD_OPTION.FIX_ROOM }, effects: [effect('FIX_MALFUNCTION', { roomId: room.id })] }]
    : [];
}

function extinguisherUses(context: CandidateContext): ItemUse[] {
  const { room, inCombat } = context;
  const uses: ItemUse[] = [];
  if (room.hasFire) uses.push({ payload: {}, effects: [effect('EXTINGUISH', { roomId: room.id })] });
  if (inCombat) {
    for (const intruder of intrudersIn(context.view, room.id)) {
      uses.push({
        payload: { option: CARD_OPTION.RETREAT, targetIntruderId: intruder.id },
        effects: [effect('FIGHT', { roomId: room.id })],
        neutralizes: [{ intruderId: intruder.id, chance: RETREAT_SUCCESS }],
        quality: RETREAT_SUCCESS,
      });
    }
  }
  return uses;
}

function reloadUses(context: CandidateContext, kind: 'ENERGY_CHARGE' | 'CHEMICALS'): ItemUse[] {
  const matches =
    kind === 'ENERGY_CHARGE'
      ? (card: ItemCard) => card.isWeapon && card.isEnergyWeapon === true
      : (card: ItemCard) => card.id.startsWith('CRAFTED_FLAMETHROWER_') && (card.ammo ?? 0) < (card.maxAmmo ?? 0);
  const weapon = heldWeapon(context, matches);
  return weapon && (weapon.ammo ?? 0) < (weapon.maxAmmo ?? 0) ? [{ payload: {}, effects: [effect('RELOAD')] }] : [];
}

/** Граната и Коктейль бьют всех в Комнате, Персонажей тоже (стр. 23): своя Комната — только если бот в ней один. */
function blastTargets(context: CandidateContext): RoomId[] {
  const { view, self } = context;
  const rooms = [self.roomId, ...findAdjacentOpenRoomIds(view, self.roomId)];
  return rooms.filter((roomId) => {
    const crew = crewIn(view, roomId).filter((player) => player.id !== self.id);
    return intrudersIn(view, roomId).length > 0 && crew.length === 0;
  });
}

function blastHarm(context: CandidateContext, roomId: RoomId): number {
  return roomId === context.self.roomId ? seriousWoundHarm(vitalityOf(context.self), context.tuning) : 0;
}

function grenadeUses(context: CandidateContext): ItemUse[] {
  return blastTargets(context).flatMap((roomId) =>
    intrudersIn(context.view, roomId).map((target) => ({
      payload: { targetRoomId: roomId, targetIntruderId: target.id },
      effects: [effect('FIGHT', { roomId })],
      harmNow: blastHarm(context, roomId),
      neutralizes: intrudersIn(context.view, roomId).map((intruder) =>
        blast(context, intruder, intruder === target ? GRENADE_TARGET_WOUNDS : 1),
      ),
    })),
  );
}

function blast(context: CandidateContext, intruder: IntruderEntity, wounds: number): Neutralization {
  const hit: InjuryOdds = new Map([[wounds, 1]]);
  return {
    intruderId: intruder.id,
    chance: neutralizeChance(context.view, intruder.type, intruder.woundsCount, hit, 1),
    hit,
  };
}

function molotovUses(context: CandidateContext): ItemUse[] {
  const fireCost = markerCost(context.view, 'FIRE', context.tuning);
  return blastTargets(context).map((roomId) => ({
    payload: { targetRoomId: roomId },
    effects: [effect('FIGHT', { roomId })],
    harmNow: blastHarm(context, roomId) + (context.view.ship.rooms[roomId]?.hasFire ? 0 : fireCost),
    neutralizes: intrudersIn(context.view, roomId).map((intruder) => blast(context, intruder, 1)),
  }));
}

function taserUses(context: CandidateContext): ItemUse[] {
  return intrudersIn(context.view, context.self.roomId).map((intruder) => ({
    payload: { option: CARD_OPTION.STUN_INTRUDER, targetIntruderId: intruder.id },
    effects: [effect('FIGHT', { roomId: context.self.roomId })],
    neutralizes: [{ intruderId: intruder.id, chance: RETREAT_SUCCESS }],
    quality: RETREAT_SUCCESS,
  }));
}

/** Дымовая граната (стр. 23): уйти в соседнюю Комнату без Атак Побега, если бот в Комнате один. */
function smokeUses(context: CandidateContext): ItemUse[] {
  const { view, self } = context;
  if (crewIn(view, self.roomId).some((player) => player.id !== self.id)) return [];
  return findAdjacentOpenRoomIds(view, self.roomId).map((roomId) => ({
    payload: { targetRoomId: roomId },
    effects: [],
    kind: 'COVERED_ESCAPE',
    roomId,
  }));
}

function itemUses(context: CandidateContext, item: ItemCard): ItemUse[] {
  const kind = getItemEffectKind(item);
  if (!usableNow(context, kind)) return [];
  switch (kind) {
    case 'MEDKIT':
    case 'BANDAGES':
    case 'CLOTHES':
      return woundCare(context, kind);
    case 'TOOLS':
    case 'DUCT_TAPE':
      return repairUses(context);
    case 'FIRE_EXTINGUISHER':
      return extinguisherUses(context);
    case 'ENERGY_CHARGE':
    case 'CHEMICALS':
      return reloadUses(context, kind);
    case 'GRENADE':
      return grenadeUses(context);
    case 'MOLOTOV':
      return molotovUses(context);
    case 'TASER':
      return taserUses(context);
    case 'SMOKE_GRENADE':
      return smokeUses(context);
    case 'ALCOHOL':
      return unscannedContamination(context.view, context.botId) > 0
        ? [{ payload: {}, effects: [effect('SCAN_HAND')] }]
        : [];
    case 'ANTIDOTE':
      return infectionDeath(context.view, context.self) > 0 ? [{ payload: {}, effects: [effect('CURE')] }] : [];
    case 'SYNTHETIC_FOOD':
      return [{ payload: {}, effects: [], drawn: 2 }];
    case 'ADRENALINE_INJECTION':
      return [{ payload: {}, effects: [], drawn: 1 }];
    default:
      return [];
  }
}

function useCandidate(context: CandidateContext, item: ItemCard, use: ItemUse): Candidate | null {
  const cost = item.actionCost + itemUseSurcharge(context.self);
  const candidate = paidCandidate(
    context,
    use.kind ?? 'ITEM',
    cost,
    (discardCardIds) => ({ type: 'ACTION_USE_ITEM', payload: { itemId: item.id, discardCardIds, ...use.payload } }),
    use.effects,
    use.roomId ?? context.self.roomId,
  );
  if (!candidate) return null;
  return {
    ...candidate,
    cardsUsed: (candidate.cardsUsed ?? 0) - (use.drawn ?? 0),
    ...(use.harmNow === undefined ? {} : { harmNow: use.harmNow }),
    ...(use.neutralizes ? { neutralizes: use.neutralizes } : {}),
    ...(use.quality === undefined ? {} : { quality: use.quality }),
  };
}

/** Предметы бота (стр. 22–23): по каждому — Действия, которые сейчас что-то дают. */
export function itemCandidates(context: CandidateContext): Candidate[] {
  return ownedItems(context)
    .flatMap((item) => itemUses(context, item).map((use) => useCandidate(context, item, use)))
    .filter((candidate): candidate is Candidate => candidate !== null);
}

function craftPayload(recipe: CraftingRecipe, pair: readonly [string, string], discardCardIds: string[]) {
  return {
    type: 'ACTION_CRAFT_ITEM' as const,
    payload: { recipeId: recipe.itemId, componentItemIds: [...pair], discardCardIds },
  };
}

/** Создание Предмета [1] (стр. 13, 23): пары Компонентов по рецептам, пока в синей колоде есть карта. */
export function craftCandidates(context: CandidateContext): Candidate[] {
  if (context.inCombat) return [];
  const items = ownedItems(context);
  const remaining = context.view.decks.craftedItems.remainingByRecipe;
  return CRAFTING_RECIPES.flatMap((recipe) => {
    if ((remaining[recipe.itemId] ?? 0) <= 0) return [];
    return craftablePairs(recipe, items)
      .slice(0, 1)
      .map((pair) =>
        paidCandidate(
          context,
          'CRAFT',
          CRAFT_ACTION_COST,
          (discardCardIds) => craftPayload(recipe, pair, discardCardIds),
          [effect('CRAFT', { itemId: recipe.itemId })],
        ),
      )
      .filter((candidate): candidate is Candidate => candidate !== null);
  });
}

export function hasHealingItem(context: Pick<CandidateContext, 'self'>): boolean {
  return ownedEffects(context).some((kind) => kind === 'MEDKIT' || kind === 'BANDAGES' || kind === 'CLOTHES');
}

export function ownedEffects(context: Pick<CandidateContext, 'self'>): ItemEffectKind[] {
  const slots = context.self.handSlots.flatMap((slot) => (slot.source === 'ITEM' ? [slot.card] : []));
  return [...(context.self.inventory ?? []), ...slots].map((item) => getItemEffectKind(item));
}
