import React from 'react';
import type { CommsDraft, SanitizedGameState } from '@nemesis/shared';
import { MessageSquarePlus, Radio, X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useCommsUiStore } from '../../store/commsUiStore';
import { useGameStore } from '../../store/gameStore';
import { CommsComposer } from './CommsComposer';
import { buildCommsFeed, commsUsageView, lastCommsSequence } from './commsFeedModel';
import { FeedCard, type FeedCardHandlers } from './FeedCard';

interface RadioDrawerProps {
  view: SanitizedGameState;
  seenSequence: number;
  onClose: () => void;
}

export const RadioDrawer: React.FC<RadioDrawerProps> = ({ view, seenSequence, onClose }) => {
  const dispatch = useGameStore((state) => state.dispatch);
  const selectRoom = useGameStore((state) => state.selectRoom);
  const composerOpen = useCommsUiStore((state) => state.composerOpen);
  const setComposerOpen = useCommsUiStore((state) => state.setComposerOpen);
  const openDossier = useCommsUiStore((state) => state.openDossier);
  const containerRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, { onEscape: onClose });
  React.useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);
  const feed = React.useMemo(() => buildCommsFeed(view), [view]);
  const usage = commsUsageView(view);
  const sequenceOf = (id: string) => view.comms.messages.find((message) => message.id === id)?.sequence ?? 0;
  const send = (payload: CommsDraft) => dispatch({ type: 'ACTION_COMMS', payload });

  const handlers: FeedCardHandlers = {
    onAnswer: (requestId, willHelp) =>
      send({ kind: 'ANSWER', body: { topic: 'ANSWER', requestId, answer: willHelp ? 'WILL_HELP' : 'CANNOT' } }),
    onReact: (messageId, reaction) => {
      const target = view.comms.messages.find((message) => message.id === messageId);
      send({ kind: 'REACTION', to: target?.authorId ?? 'ALL', body: { topic: reaction, messageId } });
    },
    onShowOnMap: (roomId) => {
      selectRoom(roomId);
      onClose();
    },
    onOpenDossier: openDossier,
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50 backdrop-blur-[2px]" onClick={onClose}>
      <aside
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="radio-title"
        onClick={(event) => event.stopPropagation()}
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
                      {...handlers}
                    />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
        {composerOpen ? (
          <CommsComposer view={view} onSent={() => undefined} />
        ) : (
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            disabled={!usage.canSpeak}
            className="m-3 flex items-center justify-center gap-2 rounded-xl border border-cyan-500/50 bg-cyan-950/50 py-2.5 text-xs font-bold uppercase tracking-[0.25em] text-cyan-100 transition hover:bg-cyan-900/60 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-500"
          >
            <MessageSquarePlus size={15} aria-hidden="true" /> Сказать в эфир
          </button>
        )}
      </aside>
    </div>
  );
};

/** Кнопка Рации в HUD: счётчик непрочитанного и пульс, если к вам обратились. */
export const RadioButton: React.FC<{ view: SanitizedGameState }> = ({ view }) => {
  const openRadio = useCommsUiStore((state) => state.openRadio);
  const seenSequence = useCommsUiStore((state) => state.seenSequence);
  const markSeen = useCommsUiStore((state) => state.markSeen);
  const latest = lastCommsSequence(view);
  React.useEffect(() => {
    if (seenSequence === null) markSeen(latest);
  }, [seenSequence, latest, markSeen]);
  const unread = view.comms.messages.filter(
    (message) => message.sequence > (seenSequence ?? latest) && message.authorId !== view.viewerId,
  );
  const addressedToMe = unread.some((message) => message.to === view.viewerId);

  return (
    <button
      type="button"
      onClick={() => openRadio()}
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
  );
};

/** Панель Рации поверх всего экрана: живёт на уровне приложения, а не внутри шапки. */
export const RadioDrawerHost: React.FC<{ view: SanitizedGameState }> = ({ view }) => {
  const open = useCommsUiStore((state) => state.radioOpen);
  const closeRadio = useCommsUiStore((state) => state.closeRadio);
  const seenSequence = useCommsUiStore((state) => state.seenSequence);
  const markSeen = useCommsUiStore((state) => state.markSeen);
  if (!open) return null;
  const close = () => {
    markSeen(lastCommsSequence(view));
    closeRadio();
  };
  return <RadioDrawer view={view} seenSequence={seenSequence ?? lastCommsSequence(view)} onClose={close} />;
};
