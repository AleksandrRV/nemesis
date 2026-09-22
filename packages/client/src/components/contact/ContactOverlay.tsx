import { useState } from 'react';
import type { SanitizedGameState } from '@nemesis/shared';
import { ContactModal } from './ContactModal';
import { initialContactSequence, nextContactPresentation } from './contactPresentationModel';

export function ContactOverlay({ view }: { view: SanitizedGameState }) {
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
