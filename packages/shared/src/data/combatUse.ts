import type { ActionCard, ActionCardEffect, ItemCard } from '../types/cards.js';
import type { QuestItemState } from '../types/entities.js';
import { getItemEffectKind, type ItemEffectKind } from './itemEffectKinds.js';
import { questItemCardId, type QuestKey } from './questItems.js';

/** Символ в правом верхнем углу карты (стр. 12). null — символа нет. */
export type CombatUse = 'IN_COMBAT' | 'OUT_OF_COMBAT';

export const ACTION_CARD_COMBAT_USE: Readonly<Record<ActionCardEffect['kind'], CombatUse | null>> = {
  RELOAD: null,
  ORDER: 'OUT_OF_COMBAT',
  MOTIVATION: null,
  SUPPRESSIVE_FIRE: 'IN_COMBAT',
  BASIC_REPAIR: 'OUT_OF_COMBAT',
  REPAIR: 'OUT_OF_COMBAT',
  FAST_REPAIR: 'OUT_OF_COMBAT',
  INGENUITY: 'OUT_OF_COMBAT',
  DISMISS: null,
  SEARCH: 'OUT_OF_COMBAT',
  SCAVENGE: 'OUT_OF_COMBAT',
  REST: 'OUT_OF_COMBAT',
  DEMOLITION: null,
  SHIP_KNOWLEDGE: 'OUT_OF_COMBAT',
  PILOTING: 'OUT_OF_COMBAT',
  OLD_FRIEND: 'OUT_OF_COMBAT',
  COMPUTER_SKILLS: 'OUT_OF_COMBAT',
  PYROTECHNIC: 'OUT_OF_COMBAT',
  TECH_CORRIDORS: 'OUT_OF_COMBAT',
  BURST_FIRE: 'IN_COMBAT',
  STEEL_NERVES: null,
  AIMED_FIRE: 'IN_COMBAT',
  ADRENALINE: 'IN_COMBAT',
  RECONNAISSANCE: 'OUT_OF_COMBAT',
  INTRANET: 'OUT_OF_COMBAT',
  ACCESS_DENIED: 'OUT_OF_COMBAT',
  THREAT_ASSESSMENT: 'OUT_OF_COMBAT',
};

export const ITEM_COMBAT_USE: Readonly<Record<Exclude<ItemEffectKind, 'QUEST'>, CombatUse | null>> = {
  WEAPON: 'IN_COMBAT',
  ENERGY_CHARGE: null,
  GRENADE: null,
  SMOKE_GRENADE: 'IN_COMBAT',
  EXTENDED_MAGAZINE: 'OUT_OF_COMBAT',
  RECON_DRONE: 'OUT_OF_COMBAT',
  MILITARY_STIMULANTS: null,
  DECOY: null,
  COMMS_KEY: 'OUT_OF_COMBAT',
  EVACUATION_KEY: null,
  SELF_DESTRUCT_KEY: 'OUT_OF_COMBAT',
  DUCT_TAPE: 'OUT_OF_COMBAT',
  TOOLS: 'OUT_OF_COMBAT',
  FIRE_EXTINGUISHER: null,
  CHEMICALS: 'OUT_OF_COMBAT',
  TECH_CORRIDOR_PLANS: 'OUT_OF_COMBAT',
  SPACE_SUIT: 'OUT_OF_COMBAT',
  NEMESIS_PLANS: 'OUT_OF_COMBAT',
  BANDAGES: 'OUT_OF_COMBAT',
  MEDKIT: 'OUT_OF_COMBAT',
  ALCOHOL: 'OUT_OF_COMBAT',
  CLOTHES: 'OUT_OF_COMBAT',
  ADRENALINE_INJECTION: null,
  SYNTHETIC_FOOD: 'OUT_OF_COMBAT',
  ANTIDOTE: 'OUT_OF_COMBAT',
  TASER: null,
  MOLOTOV: null,
  UNKNOWN: null,
};

export const QUEST_ITEM_COMBAT_USE: Readonly<Record<QuestKey, CombatUse | null>> = {
  SHIP_LOG: 'OUT_OF_COMBAT',
  INTERCOM: null,
  ORBITAL_MANEUVERING: null,
  EVACUATION_KEY: 'OUT_OF_COMBAT',
  PLASMA_TORCH: 'OUT_OF_COMBAT',
  FLASHLIGHT: 'OUT_OF_COMBAT',
  AUTOLOADER: null,
  ARMOR: 'IN_COMBAT',
  MOTION_SENSOR: 'OUT_OF_COMBAT',
  SECURITY_KEY: 'OUT_OF_COMBAT',
  HOLO_COMPUTER: 'OUT_OF_COMBAT',
  LAB_EQUIPMENT: 'OUT_OF_COMBAT',
};

export const COMBAT_USE_LABELS: Readonly<Record<CombatUse, string>> = {
  IN_COMBAT: 'Только в Бою',
  OUT_OF_COMBAT: 'Только вне Боя',
};

export function actionCardCombatUse(card: Pick<ActionCard, 'effect'>): CombatUse | null {
  return ACTION_CARD_COMBAT_USE[card.effect.kind];
}

export function itemCombatUse(
  item: Pick<ItemCard, 'id' | 'isWeapon'>,
  questItems: readonly Pick<QuestItemState, 'id' | 'questKey'>[] = [],
): CombatUse | null {
  const kind = getItemEffectKind(item);
  if (kind !== 'QUEST') return ITEM_COMBAT_USE[kind];
  const quest = questItems.find((entry) => questItemCardId(entry.id) === item.id);
  return quest ? QUEST_ITEM_COMBAT_USE[quest.questKey] : null;
}

export function combatUseViolation(combatUse: CombatUse | null, inCombat: boolean): string | null {
  if (combatUse === 'IN_COMBAT' && !inCombat) return 'Символ «Только в Бою»: в вашем отсеке нет Чужих (стр. 12).';
  if (combatUse === 'OUT_OF_COMBAT' && inCombat) return 'Символ «Только вне Боя»: в вашем отсеке Чужой (стр. 12).';
  return null;
}
