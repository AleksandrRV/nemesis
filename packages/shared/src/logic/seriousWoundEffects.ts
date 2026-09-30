import type { SeriousWoundCard, SeriousWoundKind } from '../types/cards.js';
import type { PlayerState } from '../types/entities.js';
import { HAND_SLOT_COUNT } from '../data/setup.js';

interface WoundHolder {
  seriousWounds: readonly Pick<SeriousWoundCard, 'kind' | 'isTreated'>[] | null;
}

type WoundedCarrier = WoundHolder & { handSlots: readonly PlayerState['handSlots'][number][] };

export const BACK_WOUND_HAND_SIZE = 4;
export const LEG_WOUND_ESCAPE_COST = 2;
export const HAND_WOUND_ITEM_SURCHARGE = 1;
export const ARM_WOUND_HAND_SLOTS = 1;

export function hasActiveSeriousWound(player: WoundHolder, kind: SeriousWoundKind): boolean {
  return (player.seriousWounds ?? []).some((wound) => wound.kind === kind && !wound.isTreated);
}

export function handSlotCapacity(player: WoundHolder): number {
  return hasActiveSeriousWound(player, 'ARM') ? ARM_WOUND_HAND_SLOTS : HAND_SLOT_COUNT;
}

export function hasFreeHandSlot(player: WoundedCarrier): boolean {
  return player.handSlots.length < handSlotCapacity(player);
}

export function mustDropHeavyForArmWound(player: WoundedCarrier): boolean {
  return player.handSlots.length > handSlotCapacity(player);
}

export function escapeCost(player: WoundHolder): number {
  return hasActiveSeriousWound(player, 'LEG') ? LEG_WOUND_ESCAPE_COST : 1;
}

export function itemUseSurcharge(player: WoundHolder): number {
  return hasActiveSeriousWound(player, 'HAND') ? HAND_WOUND_ITEM_SURCHARGE : 0;
}
