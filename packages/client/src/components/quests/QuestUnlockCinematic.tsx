import React from 'react';
import { KeyRound, Lock, Unlock } from 'lucide-react';
import { questDefinition, type SanitizedGameState } from '@nemesis/shared';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { latestLogSequence } from '../scanner/scanQueueModel';
import { collectQuestUnlocks, type QuestUnlock } from './questBoardModel';

const delay = (ms: number): React.CSSProperties => ({ animationDelay: `${ms}ms` });

export function QuestUnlockScene({ unlock, onDone }: { unlock: QuestUnlock; onDone: () => void }): React.ReactElement {
  const definition = questDefinition(unlock.questKey);
  const containerRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, { onEscape: onDone });

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onDone()}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quest-unlock-title"
        className="relative flex w-full max-w-lg flex-col items-center gap-6"
      >
        <div className="relative flex h-80 w-full items-center justify-center" aria-hidden="true">
          <div className="absolute h-[28rem] w-[28rem] rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(252,211,77,0.18)_20deg,transparent_40deg,transparent_90deg,rgba(252,211,77,0.14)_110deg,transparent_130deg,transparent_180deg,rgba(252,211,77,0.18)_200deg,transparent_220deg,transparent_270deg,rgba(252,211,77,0.14)_290deg,transparent_310deg)] motion-safe:animate-quest-rays" />
          <div
            className="absolute h-40 w-40 rounded-full border-4 border-amber-300 motion-safe:animate-quest-burst motion-reduce:hidden"
            style={delay(750)}
          />

          <div
            className="absolute flex h-40 w-72 flex-col justify-between rounded-xl border border-slate-600 bg-slate-900 p-4 motion-safe:animate-quest-turn-away motion-reduce:hidden"
            style={delay(650)}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Квест</p>
            <p className="font-heading text-xl tracking-wide text-white">{definition.name}</p>
            <p className="text-[11px] leading-snug text-slate-400">{definition.questText}</p>
            <span
              className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber-300 bg-amber-950 text-amber-200 motion-safe:animate-quest-seal-crack"
              style={delay(150)}
            >
              <Lock size={20} />
            </span>
          </div>

          <div
            className="relative flex h-72 w-48 flex-col overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-b from-amber-900/80 via-slate-950 to-slate-950 p-4 shadow-[0_0_60px_rgba(252,211,77,0.45)] motion-safe:animate-quest-item-reveal"
            style={delay(1300)}
          >
            <span className="absolute inset-x-0 top-0 h-1.5 bg-amber-300" />
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">
              <Unlock size={12} /> Предмет
            </span>
            <span className="mt-3 flex h-14 w-14 items-center justify-center self-center rounded-2xl bg-amber-400 text-slate-950">
              <KeyRound size={28} />
            </span>
            <p className="mt-3 text-center font-heading text-xl leading-tight tracking-wide text-white">
              {definition.name}
            </p>
            <p className="mt-2 text-center text-[11px] leading-snug text-amber-100/90">{definition.itemDescription}</p>
          </div>
        </div>

        <div
          className="flex flex-col items-center gap-2 text-center motion-safe:animate-scanner-reveal"
          style={delay(1700)}
        >
          <h2 id="quest-unlock-title" className="font-heading text-3xl tracking-[0.2em] text-amber-200">
            КВЕСТ ВЫПОЛНЕН
          </h2>
          <p className="text-sm text-slate-300">
            «{definition.name}» теперь обычный Предмет в вашем инвентаре
            {unlock.sacrificedItemName ? ` — «${unlock.sacrificedItemName}» сброшен.` : '.'}
          </p>
          <button
            type="button"
            onClick={onDone}
            className="mt-2 rounded-xl bg-amber-400 px-6 py-2 font-heading text-sm font-bold uppercase tracking-wider text-slate-950 shadow-lg transition hover:bg-amber-300 active:scale-95"
          >
            В инвентарь
          </button>
        </div>
      </div>
    </div>
  );
}

interface UnlockTracker {
  gameId: string;
  log: SanitizedGameState['gameLog'];
  seen: number;
}

export const QuestUnlockCinematic: React.FC<{ view: SanitizedGameState }> = ({ view }) => {
  const [tracker, setTracker] = React.useState<UnlockTracker>(() => ({
    gameId: view.meta.gameId,
    log: view.gameLog,
    seen: latestLogSequence(view.gameLog),
  }));
  const [queue, setQueue] = React.useState<QuestUnlock[]>([]);

  if (view.gameLog !== tracker.log) {
    const sameGame = view.meta.gameId === tracker.gameId;
    const fresh = sameGame ? collectQuestUnlocks(view, tracker.seen) : [];
    setTracker({ gameId: view.meta.gameId, log: view.gameLog, seen: latestLogSequence(view.gameLog) });
    if (!sameGame) setQueue([]);
    else if (fresh.length > 0) setQueue((current) => [...current, ...fresh]);
  }

  const current = queue[0];
  if (!current) return null;
  return <QuestUnlockScene key={current.key} unlock={current} onDone={() => setQueue((items) => items.slice(1))} />;
};
