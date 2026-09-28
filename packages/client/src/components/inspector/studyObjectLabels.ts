import type { SanitizedWeaknessSlotState } from '@nemesis/shared';

export const OBJECT_KIND_LABELS: Record<SanitizedWeaknessSlotState['objectKind'], string> = {
  CORPSE: 'Труп члена экипажа',
  EGG: 'Яйцо Чужих',
  INTRUDER_REMAINS: 'Останки Чужого',
};
