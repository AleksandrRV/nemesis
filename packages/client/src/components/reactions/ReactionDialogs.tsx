import React from 'react';
import { CONSENT_OPTION, DISMISS_OPTION, type PendingDecision, type SanitizedGameState } from '@nemesis/shared';
import { Ban, ChevronRight, Footprints, Hand } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { dismissableActionLabel } from '../log/crewLogFormat';
import { roomLabel } from '../log/gameLogModel';

type DismissDecision = Extract<PendingDecision, { type: 'DISMISS_WINDOW' }>;
type RepositionDecision = Extract<PendingDecision, { type: 'REPOSITION_CONSENT' }>;

const DISMISS_CARD_TEXT =
  'Сбросьте эту карту, чтобы отменить Действие другого Игрока в вашей Комнате (этот Игрок оплачивает Цену отмененного Действия) ИЛИ Отмените Действие «Отставить» другого Игрока.';

function nameOf(view: SanitizedGameState, playerId: string): string {
  return view.players[playerId]?.name ?? playerId;
}

export const DismissChain: React.FC<{ view: SanitizedGameState; actorId: string; dismissedBy: readonly string[] }> = ({
  view,
  actorId,
  dismissedBy,
}) => (
  <ol aria-label="Цепочка «Отставить»" className="flex flex-wrap items-center gap-1.5 text-[11px]">
    <li className="rounded-full border border-cyan-500/50 bg-cyan-950/50 px-2.5 py-1 font-semibold text-cyan-100">
      {nameOf(view, actorId)}
    </li>
    {dismissedBy.map((playerId, index) => (
      <li key={`${playerId}-${index}`} className="flex items-center gap-1.5 motion-safe:animate-dismiss-stamp">
        <ChevronRight size={12} className="text-slate-500" aria-hidden="true" />
        <span className="rounded-full border border-red-500/60 bg-red-950/60 px-2.5 py-1 font-bold uppercase tracking-wider text-red-200">
          {nameOf(view, playerId)}: «Отставить»
        </span>
      </li>
    ))}
  </ol>
);

export const DismissWindowDialog: React.FC<{
  decision: DismissDecision;
  view: SanitizedGameState;
  onAnswer: (option: string) => void;
}> = ({ decision, view, onAnswer }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef);
  const { window } = decision;
  const isCounter = window.dismissedBy.length > 0;
  const actionLabel = dismissableActionLabel(window.actionType);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dismiss-window-title"
        className="relative w-full max-w-md space-y-4 overflow-hidden rounded-xl border border-red-500/50 bg-slate-900 p-5 shadow-[0_0_60px_rgba(239,68,68,0.18)] motion-safe:animate-modal-enter"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 top-5 rotate-12 select-none font-heading text-5xl tracking-widest text-red-500/10"
        >
          ОТСТАВИТЬ
        </span>
        <h3
          id="dismiss-window-title"
          className="flex items-center gap-2 font-heading text-lg tracking-wider text-white"
        >
          <Ban size={18} className="text-red-400" aria-hidden="true" />
          {isCounter ? 'Встречное «Отставить»?' : 'Отставить?'}
        </h3>
        <p className="text-sm text-slate-200">
          <b className="text-cyan-200">{nameOf(view, window.actorId)}</b> объявляет:{' '}
          <b className="text-white">{actionLabel}</b>.
          {isCounter && (
            <>
              {' '}
              Под отменой «Отставить»: <b className="text-red-200">{nameOf(view, window.targetPlayerId)}</b>.
            </>
          )}
        </p>
        <DismissChain view={view} actorId={window.actorId} dismissedBy={window.dismissedBy} />
        <blockquote className="rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-[11px] leading-relaxed text-slate-300">
          {DISMISS_CARD_TEXT}
        </blockquote>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onAnswer(DISMISS_OPTION.DISMISS)}
            className="rounded-lg bg-red-600 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-200"
          >
            Сыграть «Отставить»
          </button>
          <button
            type="button"
            onClick={() => onAnswer(DISMISS_OPTION.ALLOW)}
            className="rounded-lg border border-slate-600 bg-slate-800 py-3 text-xs font-bold uppercase text-slate-200 transition hover:bg-slate-700"
          >
            Пропустить
          </button>
        </div>
      </div>
    </div>
  );
};

export const RepositionConsentDialog: React.FC<{
  decision: RepositionDecision;
  view: SanitizedGameState;
  onAnswer: (option: string) => void;
}> = ({ decision, view, onAnswer }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reposition-consent-title"
        className="w-full max-w-md space-y-4 rounded-xl border border-emerald-500/50 bg-slate-900 p-5 shadow-2xl motion-safe:animate-modal-enter"
      >
        <h3
          id="reposition-consent-title"
          className="flex items-center gap-2 font-heading text-lg tracking-wider text-white"
        >
          <Footprints size={18} className="text-emerald-300" aria-hidden="true" />
          {nameOf(view, decision.requesterId)}: {decision.cardName}
        </h3>
        <p className="text-sm text-slate-200">
          Вас прикрывают огнём и предлагают отойти в{' '}
          <b className="text-emerald-200">{roomLabel(view, decision.targetRoomId)}</b> без Атак Чужих. Шум при входе —
          как обычно.
        </p>
        <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Hand size={12} aria-hidden="true" /> Карта и Боезапас уже потрачены: отказ их не вернёт.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onAnswer(CONSENT_OPTION.ACCEPT)}
            className="rounded-lg bg-emerald-600 py-3 text-xs font-bold uppercase text-slate-950 transition hover:bg-emerald-500"
          >
            Отойти
          </button>
          <button
            type="button"
            onClick={() => onAnswer(CONSENT_OPTION.DECLINE)}
            className="rounded-lg border border-slate-600 bg-slate-800 py-3 text-xs font-bold uppercase text-slate-200 transition hover:bg-slate-700"
          >
            Остаться
          </button>
        </div>
      </div>
    </div>
  );
};

/** Всем за столом видно, что Действие объявлено и ждёт ответов на «Отставить». */
export const ReactionBanner: React.FC<{ view: SanitizedGameState }> = ({ view }) => {
  const reaction = view.reaction;
  if (!reaction || view.pendingDecision?.type === 'DISMISS_WINDOW') return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed left-1/2 top-20 z-30 flex -translate-x-1/2 flex-col items-center gap-2 rounded-xl border border-red-500/40 bg-slate-950/90 px-4 py-2.5 shadow-xl motion-safe:animate-lobby-rise"
    >
      <span className="text-xs text-slate-200">
        <b className="text-cyan-200">{nameOf(view, reaction.actorId)}</b> объявляет:{' '}
        <b>{dismissableActionLabel(reaction.actionType)}</b> — ждём ответа на «Отставить»
      </span>
      {reaction.dismissedBy.length > 0 && (
        <DismissChain view={view} actorId={reaction.actorId} dismissedBy={reaction.dismissedBy} />
      )}
    </div>
  );
};
