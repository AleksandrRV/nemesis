import type { SanitizedGameState, SanitizedPlayerState, SanitizedWeaknessSlotState } from '@nemesis/shared';

type StudyObjectKind = SanitizedWeaknessSlotState['objectKind'];

export const OBJECT_KIND_LABELS: Record<StudyObjectKind, string> = {
  CORPSE: 'Труп члена экипажа',
  EGG: 'Яйцо Чужих',
  INTRUDER_REMAINS: 'Останки Чужого',
};

export function laboratoryStudyKinds(
  view: SanitizedGameState,
  roomId: number,
  player: SanitizedPlayerState | undefined,
): StudyObjectKind[] {
  const room = view.ship.rooms[roomId];
  const floorKinds = (room?.objects ?? []).map((object) => object.kind);
  const isPlayerHere = player?.roomId === roomId;
  const heldKinds = isPlayerHere
    ? (player?.handSlots ?? []).flatMap((slot) => (slot.source === 'OBJECT' ? [slot.object.kind] : []))
    : [];
  return [...new Set([...floorKinds, ...heldKinds])].filter((kind) =>
    view.intrudersPool.weaknessSlots.some((slot) => slot.objectKind === kind && slot.visibility === 'FACE_DOWN'),
  );
}
