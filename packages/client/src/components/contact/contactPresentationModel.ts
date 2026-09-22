import type { ContactPresentationEvent, GameLogEntry, IntruderToken } from '@nemesis/shared';

export const INTRUDER_NAMES: Record<IntruderToken['type'], string> = {
  BLANK: 'Пустой жетон',
  LARVA: 'Личинка',
  CREEPER: 'Крипер',
  ADULT: 'Взрослая особь',
  BREEDER: 'Трутень',
  QUEEN: 'Королева',
};

export interface ContactPresentationEntry extends Omit<GameLogEntry, 'event'> {
  event: ContactPresentationEvent;
}

export function isContactPresentationEntry(entry: GameLogEntry): entry is ContactPresentationEntry {
  return (
    entry.event.type === 'CONTACT_OCCURRED' ||
    entry.event.type === 'SURPRISE_ATTACK_RESOLVED' ||
    entry.event.type === 'ESCAPE_ATTACK_RESOLVED' ||
    entry.event.type === 'SHOOT_RESOLVED' ||
    entry.event.type === 'MELEE_RESOLVED'
  );
}

export function initialContactSequence(log: readonly GameLogEntry[]): number {
  const lastContact = [...log].reverse().find((entry) => entry.event.type === 'CONTACT_OCCURRED');
  if (lastContact) return lastContact.sequence - 1;
  const lastAttack = [...log].reverse().find(isContactPresentationEntry);
  return lastAttack ? lastAttack.sequence - 1 : (log.at(-1)?.sequence ?? 0);
}

export function nextContactPresentation(
  log: readonly GameLogEntry[],
  seenSequence: number,
): ContactPresentationEntry | null {
  return (
    log.find(
      (entry): entry is ContactPresentationEntry => entry.sequence > seenSequence && isContactPresentationEntry(entry),
    ) ?? null
  );
}
