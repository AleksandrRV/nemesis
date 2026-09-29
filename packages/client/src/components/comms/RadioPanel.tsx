import React from 'react';
import type { CommitmentStatus, CommsKind, SanitizedGameState } from '@nemesis/shared';
import {
  AlertTriangle,
  Check,
  Eye,
  Footprints,
  Hand,
  MessageSquareReply,
  Radio,
  Ship,
  ThumbsDown,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useGameStore } from '../../store/gameStore';
import { CREW_IDENTITIES } from '../../utils/crewIdentity';
import { COMMITMENT_STATUS_LABELS, COMMS_KIND_LABELS } from './commsPhrases';
import { buildCommsFeed, commsUsageView, lastCommsSequence, type FeedAnswer, type FeedItem } from './commsFeedModel';

const KIND_STYLES: Record<CommsKind, { icon: LucideIcon; chip: string; frame: string }> = {
  SYSTEM: { icon: AlertTriangle, chip: 'bg-amber-500/20 text-amber-200', frame: 'border-amber-500/60 bg-amber-950/40' },
  CLAIM: { icon: Eye, chip: 'bg-cyan-500/15 text-cyan-200', frame: 'border-slate-700 bg-slate-900/80' },
  INTENT: { icon: Footprints, chip: 'bg-emerald-500/15 text-emerald-200', frame: 'border-slate-700 bg-slate-900/80' },
  REQUEST: { icon: Hand, chip: 'bg-violet-500/20 text-violet-200', frame: 'border-violet-500/50 bg-violet-950/30' },
  ANSWER: { icon: MessageSquareReply, chip: 'bg-slate-700 text-slate-200', frame: 'border-slate-700 bg-slate-900/80' },
  REACTION: { icon: ThumbsDown, chip: 'bg-rose-500/15 text-rose-200', frame: 'border-slate-700 bg-slate-900/80' },
};

const STATUS_STYLES: Record<CommitmentStatus, string> = {
  OPEN: 'border-slate-500 text-slate-200',
  FULFILLED: 'border-emerald-400 text-emerald-300',
  BROKEN: 'border-red-500 text-red-300',
  EXPIRED: 'border-amber-500 text-amber-300',
};

const Avatar: React.FC<{ item: FeedItem }> = ({ item }) => {
  if (!item.authorClass) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-400/70 bg-amber-950/60">
        <Ship size={16} className="text-amber-300" aria-hidden="true" />
      </span>
    );
  }
  const identity = CREW_IDENTITIES[item.authorClass];
  return (
    <span
      style={{ borderColor: identity.color }}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-slate-950"
    >
      <identity.Icon size={16} color={identity.color} aria-hidden="true" />
    </span>
  );
};

const AnswerRow: React.FC<{ answer: FeedAnswer }> = ({ answer }) => (
  <li className="flex items-center justify-between gap-2 text-[11px]">
    <span className="text-slate-300">
      <b className="text-white">{answer.authorName}</b>: {answer.willHelp ? 'помогу' : 'не могу'}
    </span>
    {answer.commitment && (
      <span
        className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${STATUS_STYLES[answer.commitment.status]} ${
          answer.commitment.status === 'OPEN' ? '' : 'motion-safe:animate-stamp-in'
        }`}
      >
        {COMMITMENT_STATUS_LABELS[answer.commitment.status]}
      </span>
    )}
  </li>
);

const FeedCard: React.FC<{
  item: FeedItem;
  round: number;
  isNew: boolean;
  onAnswer: (requestId: string, willHelp: boolean) => void;
}> = ({ item, round, isNew, onAnswer }) => {
  const style = KIND_STYLES[item.kind];
  return (
    <li
      className={`flex gap-2.5 rounded-xl border p-2.5 ${style.frame} ${item.isForViewer ? 'ring-1 ring-cyan-400/60' : ''} ${
        isNew ? 'motion-safe:animate-lobby-rise' : ''
      }`}
    >
      <Avatar item={item} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          <b className="text-xs text-white">{item.authorName}</b>
          <span className="text-slate-500">→ {item.addressee}</span>
          <span
            className={`ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold uppercase tracking-wider ${style.chip}`}
          >
            <style.icon size={10} aria-hidden="true" /> {COMMS_KIND_LABELS[item.kind]}
          </span>
        </div>
        <p
          className={`mt-1 text-sm leading-snug ${item.kind === 'SYSTEM' ? 'font-semibold text-amber-100' : 'text-slate-100'}`}
        >
          {item.text}
        </p>
        {item.request && (
          <div className="mt-2 space-y-1.5 border-t border-slate-800 pt-1.5">
            <p className="text-[10px] text-slate-400">
              {item.request.isOpen
                ? `Срок — до конца раунда ${item.request.expiresAtRound}${item.request.expiresAtRound === round ? ' (последний)' : ''}`
                : 'Срок истёк'}
            </p>
            {item.request.answers.length > 0 && (
              <ul className="space-y-1">
                {item.request.answers.map((answer, index) => (
                  <AnswerRow key={`${answer.authorName}-${index}`} answer={answer} />
                ))}
              </ul>
            )}
            {item.request.canAnswer && (
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => onAnswer(item.id, true)}
                  className="flex items-center justify-center gap-1 rounded-lg bg-emerald-600 py-1.5 text-[11px] font-bold uppercase text-slate-950 transition hover:bg-emerald-500"
                >
                  <Check size={12} aria-hidden="true" /> Помогу
                </button>
                <button
                  type="button"
                  onClick={() => onAnswer(item.id, false)}
                  className="rounded-lg border border-slate-600 bg-slate-800 py-1.5 text-[11px] font-bold uppercase text-slate-200 transition hover:bg-slate-700"
                >
                  Не могу
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
};

interface RadioDrawerProps {
  view: SanitizedGameState;
  seenSequence: number;
  onClose: () => void;
}

export const RadioDrawer: React.FC<RadioDrawerProps> = ({ view, seenSequence, onClose }) => {
  const dispatch = useGameStore((state) => state.dispatch);
  const containerRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef);
  const feed = React.useMemo(() => buildCommsFeed(view), [view]);
  const usage = commsUsageView(view);
  const sequenceOf = (id: string) => view.comms.messages.find((message) => message.id === id)?.sequence ?? 0;

  const answer = (requestId: string, willHelp: boolean) =>
    dispatch({
      type: 'ACTION_COMMS',
      payload: { kind: 'ANSWER', body: { topic: 'ANSWER', requestId, answer: willHelp ? 'WILL_HELP' : 'CANNOT' } },
    });

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50 backdrop-blur-[2px]" onClick={onClose}>
      <aside
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="radio-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.key === 'Escape' && onClose()}
        className="flex h-full w-full max-w-md flex-col border-l border-cyan-500/30 bg-slate-950/95 shadow-2xl motion-safe:animate-drawer-in"
      >
        <header className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
          <Radio size={18} className="text-cyan-300" aria-hidden="true" />
          <h2 id="radio-title" className="font-heading text-lg tracking-[0.3em] text-white">
            РАЦИЯ
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X size={18} aria-hidden="true" />
            <span className="sr-only">Закрыть Рацию</span>
          </button>
        </header>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-4 py-2 text-[11px]">
          {usage.canSpeak ? (
            <>
              <span className="text-cyan-200">Ваш ход в эфире:</span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-200">сообщений {usage.ordinaryLeft}</span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-200">просьб {usage.requestsLeft}</span>
            </>
          ) : (
            <span className="text-slate-400">
              Говорить и отвечать можно в свой ход. Рация бесплатна и не тратит Действий.
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {feed.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-500">
              <Radio size={36} className="motion-safe:animate-radio-ping" aria-hidden="true" />
              <p className="max-w-xs text-sm">
                В эфире тишина. Заявления, Намерения, Просьбы и объявления корабля появятся здесь.
              </p>
            </div>
          ) : (
            feed.map((round) => (
              <section key={round.round} aria-label={`Раунд ${round.round}`} className="mb-4">
                <h3 className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">
                  <span className="h-px flex-1 bg-slate-800" /> Раунд {round.round}{' '}
                  <span className="h-px flex-1 bg-slate-800" />
                </h3>
                <ul className="space-y-2">
                  {round.items.map((item) => (
                    <FeedCard
                      key={item.id}
                      item={item}
                      round={view.meta.currentRound}
                      isNew={sequenceOf(item.id) > seenSequence}
                      onAnswer={answer}
                    />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </aside>
    </div>
  );
};

/** Кнопка Рации в HUD: счётчик непрочитанного и пульс, если к вам обратились. */
export const RadioButton: React.FC<{ view: SanitizedGameState }> = ({ view }) => {
  const [open, setOpen] = React.useState(false);
  const [seenSequence, setSeenSequence] = React.useState(() => lastCommsSequence(view));
  const unread = view.comms.messages.filter((message) => message.sequence > seenSequence);
  const addressedToMe = unread.some((message) => message.to === view.viewerId);

  const close = () => {
    setSeenSequence(lastCommsSequence(view));
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Рация экипажа"
        className={`relative flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
          addressedToMe
            ? 'border-cyan-400 bg-cyan-950/70 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.45)]'
            : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
        }`}
      >
        <Radio size={14} className={unread.length > 0 ? 'motion-safe:animate-radio-ping' : ''} aria-hidden="true" />
        <span className="hidden sm:inline">Рация</span>
        {unread.length > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-400 px-1 text-[9px] font-bold text-slate-950">
            {unread.length}
          </span>
        )}
      </button>
      {open && <RadioDrawer view={view} seenSequence={seenSequence} onClose={close} />}
    </>
  );
};
