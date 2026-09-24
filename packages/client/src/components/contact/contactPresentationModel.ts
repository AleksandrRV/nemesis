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
