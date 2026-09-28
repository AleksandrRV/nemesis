export const HIBERNATION_OPENS_AT_TIME = 7;

export const SELF_DESTRUCT_IRREVERSIBLE_AT = 3;

export const SELF_DESTRUCT_EXPLODES_AT = 6;

export const ESCAPE_POD_SEATS = 2;

export function podSectionOfRoom(definitionId: string | null | undefined): 'A' | 'B' | null {
  if (definitionId === 'ESCAPE_POD_A') return 'A';
  if (definitionId === 'ESCAPE_POD_B') return 'B';
  return null;
}
