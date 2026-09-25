import type { CombatCardPayload, ItemDeckColor, PlayCardActionPayload, UseItemActionPayload } from '@nemesis/shared';
import type { CardUseRequest, TargetSelection, UsageTargetKind, UsageVariant } from './usageTypes';

export type BuiltCardPayload = Omit<PlayCardActionPayload, 'cardId' | 'discardCardIds' | 'combat'> &
  Omit<UseItemActionPayload, 'itemId' | 'discardCardIds'> & { cardId?: string; itemId?: string };

function assignTargets(payload: BuiltCardPayload, kind: UsageTargetKind, ids: readonly string[]): void {
  const first = ids[0];
  if (first === undefined && kind !== 'HAND_CARD') return;
  switch (kind) {
    case 'ADJACENT_DOOR':
    case 'ANY_DOOR':
      payload.targetCorridorId = first;
      return;
    case 'ADJACENT_ROOM':
    case 'NEIGHBOUR_ROOM':
    case 'INTRUDER_ROOM':
    case 'TECH_ROOM':
    case 'COMPUTER_ROOM':
    case 'YELLOW_ROOM':
      payload.targetRoomId = Number(first);
      return;
    case 'UNEXPLORED_ROOM':
      payload.targetRoomId = Number(first);
      if (ids[1] !== undefined) payload.targetRoomId2 = Number(ids[1]);
      return;
    case 'PLAYER_OTHER_IN_ROOM':
    case 'PLAYER_IN_ROOM_OR_SELF':
      payload.targetPlayerId = first;
      return;
    case 'INTRUDER_IN_ROOM':
    case 'INTRUDER_NEARBY':
      payload.targetIntruderId = first;
      return;
    case 'DECK_COLOR':
      payload.targetDeckColor = first as ItemDeckColor;
      return;
    case 'INVENTORY_ITEM':
      payload.targetItemId = first;
      return;
    case 'HAND_CARD':
    case 'CONTAMINATION_CARD':
      payload.targetCardIds = [...ids];
      return;
  }
}

export function buildUsePayload(
  request: CardUseRequest,
  variant: UsageVariant,
  selection: TargetSelection,
): BuiltCardPayload {
  const payload: BuiltCardPayload =
    request.kind === 'ACTION' ? { cardId: request.card.id } : { itemId: request.card.id };
  if (variant.option) payload.option = variant.option;
  variant.steps.forEach((step, index) => assignTargets(payload, step.kind, selection[index] ?? []));
  return payload;
}

export function buildCombatPayload(
  variant: UsageVariant,
  weaponItemId: string,
  selection: TargetSelection,
): CombatCardPayload | null {
  const first = selection[0]?.[0];
  const second = selection[1]?.[0];
  switch (variant.combat) {
    case 'AIMED_SHOOT':
    case 'BURST_SHOOT':
    case 'ADRENALINE_SHOOT':
      return first ? { kind: variant.combat, weaponItemId, targetIntruderId: first } : null;
    case 'ADRENALINE_ESCAPE':
      return first ? { kind: 'ADRENALINE_ESCAPE', targetRoomId: Number(first) } : null;
    case 'REPOSITION':
      return first && second
        ? { kind: 'REPOSITION', weaponItemId, moves: [{ playerId: first, targetRoomId: Number(second) }] }
        : null;
    case undefined:
      return null;
  }
}

export function isSelectionComplete(variant: UsageVariant, selection: TargetSelection): boolean {
  return variant.steps.every((step, index) => {
    const count = selection[index]?.length ?? 0;
    return count >= step.min && count <= step.max;
  });
}
