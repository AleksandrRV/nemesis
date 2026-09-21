import type { GameLogEntry, SanitizedGameState } from '@nemesis/shared';

export type ContactEvent = Extract<GameLogEntry['event'], { type: 'CONTACT_OCCURRED' }>;
export type SurpriseResolvedEvent = Extract<GameLogEntry['event'], { type: 'SURPRISE_ATTACK_RESOLVED' }>;

/** Последний Контакт, который игрок ещё не закрывал: каждый новый Контакт показывает модалку заново. */
export function selectContactEntry(view: SanitizedGameState, dismissedSequence: number | null): GameLogEntry | null {
  let latest: GameLogEntry | null = null;

  for (const entry of view.gameLog) {
    if (entry.event.type !== 'CONTACT_OCCURRED') continue;
    if (dismissedSequence !== null && entry.sequence <= dismissedSequence) continue;
    latest = entry;
  }

  return latest;
}

/** Разыгранные Внезапные атаки этого Контакта: обычно одна, после Трансформации — цепочка. */
export function surpriseOutcomes(
  view: SanitizedGameState,
  contact: ContactEvent,
  sequence: number,
): SurpriseResolvedEvent[] {
  const outcomes: SurpriseResolvedEvent[] = [];

  for (const entry of view.gameLog) {
    if (entry.sequence <= sequence) continue;
    if (entry.event.type !== 'SURPRISE_ATTACK_RESOLVED') continue;
    if (entry.event.playerId !== contact.playerId) continue;

    outcomes.push(entry.event);
  }

  return outcomes;
}

/** Внезапная атака объявлена, но итога в журнале пока нет (оборона от рассинхрона снимка). */
export function surpriseTriggered(view: SanitizedGameState, contact: ContactEvent, sequence: number): boolean {
  return view.gameLog.some(
    (entry) =>
      entry.sequence > sequence &&
      entry.event.type === 'SURPRISE_ATTACK_TRIGGERED' &&
      entry.event.playerId === contact.playerId,
  );
}
