import React from 'react';
import { ChevronDown, ChevronUp, ScrollText } from 'lucide-react';
import type { SanitizedGameState, GameLogEntry } from '@nemesis/shared';

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

function isContactTeaseEntry(entry: GameLogEntry, log: readonly GameLogEntry[]): boolean {
  if (entry.event.type === 'CONTACT_OCCURRED' && entry.event.source === 'NOISE') return true;
  if (entry.event.type === 'NOISE_MARKER_PLACED' && entry.event.reason === 'ROLL') {
    // Если в следующих 4 записях есть CONTACT_OCCURRED source NOISE в том же отсеке — это тизер дубликата
    const idx = log.findIndex((e) => e.id === entry.id);
    if (idx >= 0) {
      for (let j = idx + 1; j < Math.min(log.length, idx + 5); j++) {
        const next = log[j]!;
        if (
          next.event.type === 'CONTACT_OCCURRED' &&
          next.event.source === 'NOISE' &&
          next.event.roomId === entry.event.roomId
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

function isRecentNoiseRoll(entry: GameLogEntry, log: readonly GameLogEntry[]): boolean {
  if (entry.event.type !== 'NOISE_ROLLED') return false;
  // Последний бросок Шума считается свежим для подсветки
  const lastRoll = [...log].reverse().find((e) => e.event.type === 'NOISE_ROLLED');
  return lastRoll?.id === entry.id;
}

export const GameLogPanel: React.FC<GameLogPanelProps> = ({ view }) => {
  const [isOpen, setIsOpen] = React.useState(true);
  const entries = React.useMemo(() => formatGameLog(view), [view]);
  const rawLog = view.gameLog;
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
            {entries.map((entry) => {
              const raw = rawLog.find((e) => e.sequence === entry.sequence);
              const isTease = raw ? isContactTeaseEntry(raw, rawLog) : false;
              const isRoll = raw ? isRecentNoiseRoll(raw, rawLog) : false;
              return (
                <li
                  key={entry.id}
                  className={`flex gap-2 border-b border-slate-950 pb-1.5 last:border-b-0 ${isTease ? 'motion-safe:animate-contact-warning motion-reduce:animate-none bg-red-950/20 rounded px-1 -mx-1' : ''} ${isRoll ? 'bg-amber-950/20 rounded px-1 -mx-1' : ''}`}
                >
                  <span className="w-8 shrink-0 pt-0.5 text-right font-mono text-[10px] text-slate-500">
                    #{String(entry.sequence).padStart(3, '0')}
                  </span>
                  <LogLine segments={entry.segments} />
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </aside>
  );
};
