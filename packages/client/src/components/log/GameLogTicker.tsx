import React from 'react';
import { Maximize2, ScrollText } from 'lucide-react';
import { LogSegments } from './LogSegments';
import { GAME_LOG_CATEGORY_ACCENTS, GAME_LOG_CATEGORY_ICONS } from './logCategoryIcons';
import { tickerDurationSeconds, type CategorizedLogEntry } from './gameLogViewModel';

interface GameLogTickerProps {
  entries: readonly CategorizedLogEntry[];
  total: number;
  isOpen: boolean;
  onOpen: () => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
}

const SCROLL_THRESHOLD_CHARS = 70;

function TickerItem({ entry, isNewest }: { entry: CategorizedLogEntry; isNewest: boolean }) {
  const Icon = GAME_LOG_CATEGORY_ICONS[entry.category];
  return (
    <span
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded px-2 text-xs ${
        isNewest ? 'motion-safe:animate-log-ticker-flash' : ''
      }`}
    >
      <Icon size={12} className={`shrink-0 ${GAME_LOG_CATEGORY_ACCENTS[entry.category]}`} aria-hidden="true" />
      <span className="font-mono text-[10px] text-slate-500">#{String(entry.sequence).padStart(3, '0')}</span>
      <span className="text-slate-200">
        <LogSegments segments={entry.segments} />
      </span>
      <span className="pl-2 text-[8px] text-cyan-900" aria-hidden="true">
        ◆
      </span>
    </span>
  );
}

export const GameLogTicker: React.FC<GameLogTickerProps> = ({ entries, total, isOpen, onOpen, buttonRef }) => {
  const newest = entries[0] ?? null;
  const characters = entries.reduce((sum, entry) => sum + entry.plainText.length, 0);
  const scrolls = characters > SCROLL_THRESHOLD_CHARS;
  const copies = scrolls ? [0, 1] : [0];

  return (
    <footer aria-label="Журнал действий партии" className="relative h-9 shrink-0 border-t border-cyan-900/80 bg-black">
      <button
        ref={buttonRef}
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="game-log-dialog"
        aria-label={`Открыть журнал действий: ${total} записей`}
        className="group flex h-full w-full items-center gap-2 px-2 text-left transition hover:bg-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cyan-400"
      >
        <span className="flex shrink-0 items-center gap-1.5 border-r border-slate-800 pr-2">
          <ScrollText size={14} className="text-cyan-300" aria-hidden="true" />
          <span className="hidden text-[10px] font-bold tracking-[0.16em] text-white sm:inline">ЖУРНАЛ</span>
          <span className="rounded border border-slate-700 px-1 font-mono text-[10px] text-slate-400">{total}</span>
        </span>

        <span
          className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-24px),transparent)]"
          aria-hidden="true"
        >
          <span
            key={newest?.id ?? 'empty'}
            data-ticker-scrolls={scrolls}
            className={`flex w-max ${
              scrolls
                ? 'motion-safe:animate-log-ticker motion-reduce:animate-none group-hover:[animation-play-state:paused] group-focus-visible:[animation-play-state:paused]'
                : ''
            }`}
            style={scrolls ? { animationDuration: `${tickerDurationSeconds(entries)}s` } : undefined}
          >
            {copies.map((copy) => (
              <span key={copy} className="flex shrink-0 items-center pl-3">
                {entries.map((entry, index) => (
                  <TickerItem key={entry.id} entry={entry} isNewest={copy === 0 && index === 0} />
                ))}
              </span>
            ))}
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-1 rounded border border-slate-700 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300 transition group-hover:border-cyan-500 group-hover:text-cyan-200">
          <Maximize2 size={12} aria-hidden="true" />
          <span className="hidden sm:inline">Подробнее</span>
        </span>
      </button>
      <p className="sr-only" aria-live="polite">
        {newest ? newest.plainText : ''}
      </p>
    </footer>
  );
};
