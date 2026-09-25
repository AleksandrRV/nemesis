import type { ActionCard, CardOption, ItemCard } from '@nemesis/shared';

export type UsageTargetKind =
  | 'ADJACENT_DOOR'
  | 'ANY_DOOR'
  | 'ADJACENT_ROOM'
  | 'NEIGHBOUR_ROOM'
  | 'PLAYER_OTHER_IN_ROOM'
  | 'PLAYER_IN_ROOM_OR_SELF'
  | 'INTRUDER_IN_ROOM'
  | 'INTRUDER_NEARBY'
  | 'INTRUDER_ROOM'
  | 'UNEXPLORED_ROOM'
  | 'TECH_ROOM'
  | 'COMPUTER_ROOM'
  | 'YELLOW_ROOM'
  | 'DECK_COLOR'
  | 'INVENTORY_ITEM'
  | 'HAND_CARD'
  | 'CONTAMINATION_CARD';

export type UsageIcon =
  | 'door'
  | 'room'
  | 'move'
  | 'intruder'
  | 'player'
  | 'deck'
  | 'item'
  | 'card'
  | 'engine'
  | 'wrench'
  | 'fire'
  | 'heal'
  | 'eye'
  | 'ammo'
  | 'shield'
  | 'bolt'
  | 'lock'
  | 'search'
  | 'biohazard';

export type CombatVariantKind = 'AIMED_SHOOT' | 'BURST_SHOOT' | 'ADRENALINE_SHOOT' | 'ADRENALINE_ESCAPE' | 'REPOSITION';

export interface TargetStep {
  kind: UsageTargetKind;
  title: string;
  min: number;
  max: number;
}

export interface UsageVariant {
  id: string;
  label: string;
  icon: UsageIcon;
  available: boolean;
  steps: TargetStep[];
  option?: CardOption;
  hint?: string;
  reason?: string;
  combat?: CombatVariantKind;
}

export type CardAccent = 'ACTION' | ItemCard['color'];

export interface CardUsage {
  title: string;
  typeLine: string;
  description: string;
  cost: number;
  accent: CardAccent;
  badges: string[];
  variants: UsageVariant[];
}

export interface UsageTarget {
  id: string;
  label: string;
  icon: UsageIcon;
  sublabel?: string;
  group?: string;
}

export type CardUseRequest =
  { kind: 'ACTION'; card: ActionCard } | { kind: 'ITEM'; card: ItemCard; location: 'INVENTORY' | 'HAND_SLOT' };

export type TargetSelection = readonly (readonly string[])[];

export function singleStep(kind: UsageTargetKind, title: string): TargetStep {
  return { kind, title, min: 1, max: 1 };
}
