import { useState } from 'react';
import type { SanitizedGameState } from '@nemesis/shared';
import { ContactModal } from './ContactModal';
import { initialContactSequence, nextContactPresentation, type ContactPresentationEntry } from './contactPresentationModel';

interface ControlledProps {
  entry: ContactPresentationEntry | null;
  onClose: (sequence: number) => void;
}

export function ContactOverlay({ view, entry: controlledEntry, onClose: controlledOnClose }: { view: SanitizedGameState } & Partial<ControlledProps>) {
  const isControlled = controlledEntry !== undefined;

  if (isControlled) {
    if (!controlledEntry) return null;
    return (
      <ContactModal
        key={`${view.meta.gameId}-${controlledEntry.id}`}
        entry={controlledEntry}
        view={view}
        onClose={() => controlledOnClose?.(controlledEntry.sequence)}
      />
    );
  }

  const gameId = view.meta.gameId;
  const latest = view.gameLog.at(-1)?.sequence ?? 0;
  const [progress, setProgress] = useState(() => ({
    gameId,
    seen: initialContactSequence(view.gameLog),
    observed: latest,
  }));
  const reset = progress.gameId !== gameId || latest < progress.observed;
  const seen = reset ? initialContactSequence(view.gameLog) : progress.seen;
  if (reset) setProgress({ gameId, seen, observed: latest });
  const entry = nextContactPresentation(view.gameLog, seen);
  if (!entry) return null;
  return (
    <ContactModal
      key={`${gameId}-${entry.id}`}
      entry={entry}
      view={view}
      onClose={() => setProgress({ gameId, seen: entry.sequence, observed: latest })}
    />
  );
}
