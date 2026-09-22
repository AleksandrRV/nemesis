import React from 'react';
import { ChevronDown, ChevronUp, ScrollText } from 'lucide-react';
import type { SanitizedGameState } from '@nemesis/shared';

import { formatGameLog, type GameLogSegment, type GameLogTone } from './gameLogModel';

interface GameLogPanelProps {
  view: SanitizedGameState;
}

const TONE_CLASSES: Record<GameLogTone, string> = {
  system: 'text-white',
  player: 'text-cyan-300 font-bold',
  room: 'text-sky-300 font-bold',
  corridor: 'text-violet-300 font-bold',
  noise: 'text-orange-300 font-bold',
  fire: 'text-orange-400 font-bold',
  malfunction: 'text-amber-300 font-bold',
  slime: 'text-lime-300 font-bold',
  danger: 'text-red-300 font-bold',
  silence: 'text-slate-100 font-bold',
  door: 'text-fuchsia-300 font-bold',
  success: 'text-emerald-300 font-bold',
  warning: 'text-yellow-300 font-bold',
  error: 'text-red-200 font-bold',
};

export function LogLine({ segments }: { segments: GameLogSegment[] }): React.ReactElement {
  return (
    <p className="break-words text-xs leading-5 text-slate-200">
      {segments.map((segment, index) => (
        <span
          key={`${segment.text}-${index}`}
          className={`${segment.tone ? TONE_CLASSES[segment.tone] : 'text-white'} ${segment.strong ? 'font-bold' : ''}`}
        >
          {segment.text}
        </span>
      ))}
    </p>
  );
}

export const GameLogPanel: React.FC<GameLogPanelProps> = ({ view }) => {
  const [isOpen, setIsOpen] = React.useState(true);
  const entries = React.useMemo(() => formatGameLog(view), [view]);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen || !scrollContainerRef.current) return;

    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
  }, [entries.length, isOpen]);

  return (
    <aside
      aria-label="Журнал действий партии"
      className="absolute inset-x-0 bottom-0 z-50 flex max-h-[38vh] min-h-10 flex-col border-t border-cyan-900/80 bg-black shadow-[0_-8px_30px_rgba(0,0,0,0.75)]"
    >
      <header className="flex min-h-10 shrink-0 items-center justify-between gap-3 border-b border-slate-800 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <ScrollText size={15} className="shrink-0 text-cyan-300" aria-hidden="true" />
          <h2 className="truncate text-xs font-bold tracking-[0.16em] text-white">ЖУРНАЛ ДЕЙСТВИЙ</h2>
          <span className="shrink-0 rounded border border-slate-700 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
            {entries.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls="game-log-list"
          aria-label={isOpen ? 'Скрыть журнал действий' : 'Показать журнал действий'}
          className="flex min-h-7 shrink-0 items-center gap-1 rounded border border-slate-700 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-200 transition hover:border-cyan-500 hover:text-cyan-200"
        >
          {isOpen ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronUp size={14} aria-hidden="true" />}
          {isOpen ? 'Скрыть' : 'Показать'}
        </button>
      </header>

      {isOpen && (
        <div
          id="game-log-list"
          ref={scrollContainerRef}
          className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-3 py-2"
        >
          <ol className="space-y-1.5" aria-live="polite">
            {entries.map((entry) => (
              <li key={entry.id} className="flex gap-2 border-b border-slate-950 pb-1.5 last:border-b-0">
                <span className="w-8 shrink-0 pt-0.5 text-right font-mono text-[10px] text-slate-500">
                  #{String(entry.sequence).padStart(3, '0')}
                </span>
                <LogLine segments={entry.segments} />
              </li>
            ))}
          </ol>
        </div>
      )}
    </aside>
  );
};
