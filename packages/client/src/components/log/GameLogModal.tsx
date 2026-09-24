import React from 'react';
import { Search, ScrollText, X } from 'lucide-react';
import type { GameLogEntry } from '@nemesis/shared';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { LogLine } from './LogSegments';
import { GAME_LOG_CATEGORY_ACCENTS, GAME_LOG_CATEGORY_ICONS } from './logCategoryIcons';
import {
  GAME_LOG_CATEGORIES,
  GAME_LOG_CATEGORY_LABELS,
  buildLogRounds,
  countByCategory,
  logHighlights,
  type CategorizedLogEntry,
  type GameLogFilter,
  type LogHighlight,
} from './gameLogViewModel';

interface GameLogModalProps {
  entries: readonly CategorizedLogEntry[];
  log: readonly GameLogEntry[];
  onClose: () => void;
}

const HIGHLIGHT_CLASSES: Record<LogHighlight, string> = {
  CONTACT: 'bg-red-950/30 ring-1 ring-red-900/60',
  NOISE_ROLL: 'bg-amber-950/25 ring-1 ring-amber-900/50',
};

function LogEntryRow({ entry, highlight }: { entry: CategorizedLogEntry; highlight: LogHighlight | undefined }) {
  const Icon = GAME_LOG_CATEGORY_ICONS[entry.category];
  return (
    <li
      className={`flex gap-2 rounded px-1.5 py-1 ${highlight ? HIGHLIGHT_CLASSES[highlight] : ''}`}
      data-log-category={entry.category}
    >
      <span className="w-9 shrink-0 pt-0.5 text-right font-mono text-[10px] text-slate-500">
        #{String(entry.sequence).padStart(3, '0')}
      </span>
      <Icon
        size={13}
        className={`mt-1 shrink-0 ${GAME_LOG_CATEGORY_ACCENTS[entry.category]}`}
        aria-label={GAME_LOG_CATEGORY_LABELS[entry.category]}
      />
      <LogLine segments={entry.segments} />
    </li>
  );
}

function FilterChip({
  label,
  count,
  pressed,
  onClick,
}: {
  label: string;
  count: number;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      disabled={count === 0 && !pressed}
      className={`flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold transition disabled:opacity-40 ${
        pressed
          ? 'border-cyan-400 bg-cyan-950/70 text-cyan-100'
          : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
      }`}
    >
      {label}
      <span className="font-mono text-[10px] text-slate-400">{count}</span>
    </button>
  );
}

export const GameLogModal: React.FC<GameLogModalProps> = ({ entries, log, onClose }) => {
  const [filter, setFilter] = React.useState<GameLogFilter>({ category: 'ALL', query: '' });
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, { onEscape: onClose });

  const counts = React.useMemo(() => countByCategory(entries), [entries]);
  const rounds = React.useMemo(() => buildLogRounds(entries, log, filter), [entries, log, filter]);
  const highlights = React.useMemo(() => logHighlights(log), [log]);
  const shown = rounds.reduce((sum, round) => sum + round.entryCount, 0);

  React.useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [rounds]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        id="game-log-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-log-dialog-title"
        className="flex h-full max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-cyan-900/70 bg-slate-950 shadow-[0_0_60px_rgba(6,182,212,0.12)] motion-safe:animate-modal-enter"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <ScrollText size={18} className="shrink-0 text-cyan-300" aria-hidden="true" />
            <h2 id="game-log-dialog-title" className="truncate font-heading text-xl tracking-widest text-white">
              ЖУРНАЛ ДЕЙСТВИЙ
            </h2>
            <span className="shrink-0 font-mono text-[11px] text-slate-400">
              {shown} из {entries.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть журнал действий"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X size={18} />
          </button>
        </header>

        <div className="shrink-0 space-y-2 border-b border-slate-800 px-4 py-3">
          <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 focus-within:border-cyan-500">
            <Search size={14} className="shrink-0 text-slate-500" aria-hidden="true" />
            <input
              type="search"
              value={filter.query}
              onChange={(event) => setFilter((current) => ({ ...current, query: event.target.value }))}
              placeholder="Поиск: игрок, отсек, Чужой, карта…"
              aria-label="Поиск по журналу"
              className="min-h-9 w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Категории событий">
            <FilterChip
              label="Все"
              count={counts.ALL}
              pressed={filter.category === 'ALL'}
              onClick={() => setFilter((current) => ({ ...current, category: 'ALL' }))}
            />
            {GAME_LOG_CATEGORIES.map((category) => (
              <FilterChip
                key={category}
                label={GAME_LOG_CATEGORY_LABELS[category]}
                count={counts[category]}
                pressed={filter.category === category}
                onClick={() => setFilter((current) => ({ ...current, category }))}
              />
            ))}
          </div>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-3 pb-4">
          {rounds.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">Нет записей, подходящих под фильтр.</p>
          )}
          {rounds.map((round) => (
            <section key={round.key} aria-label={round.title}>
              <h3 className="sticky top-0 z-10 -mx-3 mb-1 flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300 backdrop-blur">
                {round.title}
                <span className="font-mono text-[10px] tracking-normal text-slate-500">{round.entryCount} зап.</span>
              </h3>
              <ol className="space-y-1">
                {round.groups.map((group, index) =>
                  group.isMovement && group.entries.length > 1 ? (
                    <li
                      key={group.groupId ?? `group-${index}`}
                      className="rounded-r border-l-2 border-cyan-500/50 bg-cyan-950/10 py-1 pl-2"
                    >
                      <div className="mb-0.5 pl-1.5 font-mono text-[9px] uppercase tracking-widest text-cyan-400/70">
                        Цепочка движения • {group.entries.length} событий
                      </div>
                      <ol className="space-y-0.5">
                        {group.entries.map((entry) => (
                          <LogEntryRow key={entry.id} entry={entry} highlight={highlights.get(entry.id)} />
                        ))}
                      </ol>
                    </li>
                  ) : (
                    group.entries.map((entry) => (
                      <LogEntryRow key={entry.id} entry={entry} highlight={highlights.get(entry.id)} />
                    ))
                  ),
                )}
              </ol>
            </section>
          ))}
        </div>

        <footer className="shrink-0 border-t border-slate-800 px-4 py-2 font-mono text-[10px] text-slate-500">
          Новые записи — внизу списка • Esc — закрыть
        </footer>
      </div>
    </div>
  );
};
