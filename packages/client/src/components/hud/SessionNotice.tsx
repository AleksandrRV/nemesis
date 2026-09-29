import React from 'react';
import { History, X } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';

export const SessionNoticeView: React.FC<{ notice: string; onDismiss: () => void }> = ({ notice, onDismiss }) => (
  <div
    role="status"
    aria-live="polite"
    className="fixed left-1/2 top-16 z-[80] flex w-[min(92vw,34rem)] -translate-x-1/2 items-start gap-3 rounded-xl border border-amber-500/60 bg-slate-950/95 p-3 shadow-[0_0_24px_rgba(245,158,11,0.25)] motion-safe:animate-modal-enter"
  >
    <History size={18} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
    <p className="flex-1 text-sm leading-snug text-amber-100">{notice}</p>
    <button
      type="button"
      onClick={onDismiss}
      aria-label="Закрыть сообщение"
      className="rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
    >
      <X size={16} aria-hidden="true" />
    </button>
  </div>
);

export const SessionNotice: React.FC = () => {
  const notice = useGameStore((state) => state.sessionNotice);
  const dismiss = useGameStore((state) => state.dismissSessionNotice);
  if (!notice) return null;
  return <SessionNoticeView notice={notice} onDismiss={dismiss} />;
};
