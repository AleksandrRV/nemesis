export const HIBERNATION_OPENS_AT_TIME = 8;

export const ESCAPE_POD_SEATS = 2;

export function podSectionOfRoom(definitionId: string | null | undefined): 'A' | 'B' | null {
  if (definitionId === 'ESCAPE_POD_A') return 'A';
  if (definitionId === 'ESCAPE_POD_B') return 'B';
  return null;
}
