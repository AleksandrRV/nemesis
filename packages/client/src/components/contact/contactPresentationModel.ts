import type { ContactPresentationEvent, GameLogEntry } from '@nemesis/shared';

// Единый справочник названий Чужих (intruderReference.ts) под прежним именем.
export { INTRUDER_NAMES_RU as INTRUDER_NAMES } from '../board/intruderReference';

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
  // При загрузке страницы история не проигрывается: всё, что уже есть в
  // журнале — включая последний Контакт и результаты атак — считается
  // увиденным. Иначе после F5 лишний раз открываются окна о Чужих.
  for (let i = log.length - 1; i >= 0; i--) {
    const entry = log[i]!;
    if (isContactPresentationEntry(entry)) return entry.sequence;
  }
  return log.at(-1)?.sequence ?? 0;
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
