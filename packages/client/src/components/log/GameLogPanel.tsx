import React from 'react';
import type { SanitizedGameState } from '@nemesis/shared';
import { formatGameLog } from './gameLogModel';
import { categorizeLog, tickerEntries } from './gameLogViewModel';
import { GameLogTicker } from './GameLogTicker';
import { GameLogModal } from './GameLogModal';

interface GameLogPanelProps {
  view: SanitizedGameState;
  initiallyOpen?: boolean;
}

export const GameLogPanel: React.FC<GameLogPanelProps> = ({ view, initiallyOpen = false }) => {
  const [isOpen, setIsOpen] = React.useState(initiallyOpen);
  const tickerButtonRef = React.useRef<HTMLButtonElement>(null);
  const entries = React.useMemo(() => categorizeLog(formatGameLog(view), view.gameLog), [view]);
  const ticker = React.useMemo(() => tickerEntries(entries), [entries]);

  const close = React.useCallback(() => {
    setIsOpen(false);
    window.requestAnimationFrame(() => tickerButtonRef.current?.focus());
  }, []);

  return (
    <>
      <GameLogTicker
        entries={ticker}
        total={entries.length}
        isOpen={isOpen}
        onOpen={() => setIsOpen(true)}
        buttonRef={tickerButtonRef}
      />
      {isOpen && <GameLogModal entries={entries} log={view.gameLog} onClose={close} />}
    </>
  );
};
