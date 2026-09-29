import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1, SPECIAL_ROOMS } from '@nemesis/shared';

const ROOM_NAMES = new Map(
  [...SPECIAL_ROOMS, ...BASIC_ROOMS_1, ...ADDITIONAL_ROOMS_2].map((room) => [room.id, room.name]),
);

export function roomDefinitionName(definitionId: string): string | null {
  return ROOM_NAMES.get(definitionId) ?? null;
}
