import React from 'react';
import type { SanitizedGameState } from '@nemesis/shared';
import { Check, Clock, Hand, Inbox, Megaphone, Trash2, X } from 'lucide-react';
import { useCommsUiStore } from '../../store/commsUiStore';
import { commsUsageView } from './commsFeedModel';
import { buildInbox, inboxTurnKey, type InboxItem } from './inboxModel';
import { useCommsSender } from './useCommsSender';

const EMPTY: readonly string[] = [];

const LaterButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center justify-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:bg-slate-800"
  >
    <Clock size={12} aria-hidden="true" /> Позже
  </button>
);

function InboxCard({
  item,
  index,
  onAnswer,
  onLater,
  onSendQueued,
  onDropQueued,
}: {
  item: InboxItem;
  index: number;
  onAnswer: (requestId: string, willHelp: boolean) => void;
  onLater: () => void;
  onSendQueued: (index: number) => void;
  onDropQueued: (index: number) => void;
}) {
  const delay = { animationDelay: `${index * 120}ms` };
  if (item.kind === 'REQUEST') {
    return (
      <li
        style={delay}
        className="rounded-xl border border-violet-500/50 bg-violet-950/40 p-3 motion-safe:animate-lobby-rise"
      >
        <p className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wider text-violet-200">
          <Hand size={11} aria-hidden="true" /> Просьба · {item.authorName}
          {item.personal && <span className="rounded bg-cyan-500/20 px-1.5 text-cyan-100">лично вам</span>}
          {item.lastRound && <span className="rounded bg-amber-500/20 px-1.5 text-amber-100">последний раунд</span>}
        </p>
        <p className="mt-1 text-sm text-white">{item.text}</p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onAnswer(item.request.id, true)}
            className="flex items-center justify-center gap-1 rounded-lg bg-emerald-600 py-1.5 text-[11px] font-bold uppercase text-slate-950 transition hover:bg-emerald-500"
          >
            <Check size={12} aria-hidden="true" /> Помогу
          </button>
          <button
            type="button"
            onClick={() => onAnswer(item.request.id, false)}
            className="rounded-lg border border-slate-600 bg-slate-800 py-1.5 text-[11px] font-bold uppercase text-slate-200 transition hover:bg-slate-700"
          >
            Не могу
          </button>
          <LaterButton onClick={onLater} />
        </div>
      </li>
    );
  }
  if (item.kind === 'COMMITMENT') {
    return (
      <li
        style={delay}
        className="rounded-xl border border-amber-500/60 bg-amber-950/40 p-3 motion-safe:animate-lobby-rise"
      >
        <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber-200">
          <Clock size={11} aria-hidden="true" /> Обещание истекает в этом раунде
        </p>
        <p className="mt-1 text-sm text-white">
          Вы обещали {item.requesterName}: {item.text}
        </p>
        <div className="mt-2 flex justify-end">
          <LaterButton onClick={onLater} />
        </div>
      </li>
    );
  }
  return (
    <li
      style={delay}
      className="rounded-xl border border-cyan-500/50 bg-cyan-950/30 p-3 motion-safe:animate-lobby-rise"
    >
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-cyan-200">
        <Megaphone size={11} aria-hidden="true" /> Отложенное Заявление
      </p>
      <p className="mt-1 text-sm text-white">{item.text}</p>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => onSendQueued(item.index)}
          className="flex items-center justify-center gap-1 rounded-lg bg-cyan-500 py-1.5 text-[11px] font-bold uppercase text-slate-950 transition hover:bg-cyan-400"
        >
          <Megaphone size={12} aria-hidden="true" /> В эфир
        </button>
        <button
          type="button"
          onClick={() => onDropQueued(item.index)}
          className="flex items-center justify-center gap-1 rounded-lg border border-slate-600 bg-slate-800 py-1.5 text-[11px] font-bold uppercase text-slate-200 transition hover:bg-slate-700"
        >
          <Trash2 size={12} aria-hidden="true" /> Не говорить
        </button>
      </div>
    </li>
  );
}

/** «Входящие» в начале хода (В8-4-3): всплывают, только когда говорить можно, и не мешают решениям. */
export const CommsInbox: React.FC<{ view: SanitizedGameState; enabled: boolean }> = ({ view, enabled }) => {
  const sender = useCommsSender(view);
  const turnKey = inboxTurnKey(view);
  const postponed = useCommsUiStore((state) => state.postponed[turnKey] ?? EMPTY);
  const queued = useCommsUiStore((state) => state.queuedDrafts[view.viewerId]);
  const postpone = useCommsUiStore((state) => state.postpone);
  const dropQueued = useCommsUiStore((state) => state.dropQueued);
  const items = React.useMemo(() => buildInbox(view, postponed, queued ?? []), [view, postponed, queued]);

  if (!enabled || !commsUsageView(view).canSpeak || items.length === 0) return null;

  const answer = (requestId: string, willHelp: boolean) =>
    sender.send([{ kind: 'ANSWER', body: { topic: 'ANSWER', requestId, answer: willHelp ? 'WILL_HELP' : 'CANNOT' } }]);
  const sendQueued = (index: number) => {
    const draft = queued?.[index];
    if (!draft) return;
    sender.send([draft]);
    dropQueued(view.viewerId, index);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-40 z-30 flex justify-center px-4">
      <aside
        aria-label="Входящие Рации"
        className="pointer-events-auto w-full max-w-md rounded-2xl border border-cyan-500/40 bg-slate-950/95 p-3 shadow-[0_0_50px_rgba(34,211,238,0.18)] backdrop-blur motion-safe:animate-lobby-rise"
      >
        <header className="mb-2 flex items-center gap-2">
          <Inbox size={16} className="text-cyan-300 motion-safe:animate-radio-ping" aria-hidden="true" />
          <h2 className="font-heading text-sm tracking-[0.3em] text-white">ВХОДЯЩИЕ</h2>
          <span className="rounded-full bg-cyan-500/20 px-2 text-[10px] font-bold text-cyan-100">{items.length}</span>
          <button
            type="button"
            onClick={() => items.forEach((item) => postpone(turnKey, item.key))}
            className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X size={12} aria-hidden="true" /> Всё позже
          </button>
        </header>
        <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {items.map((item, index) => (
            <InboxCard
              key={item.key}
              item={item}
              index={index}
              onAnswer={answer}
              onLater={() => postpone(turnKey, item.key)}
              onSendQueued={sendQueued}
              onDropQueued={(queuedIndex) => dropQueued(view.viewerId, queuedIndex)}
            />
          ))}
        </ul>
      </aside>
    </div>
  );
};
