import React from 'react';
import type { SanitizedGameState } from '@nemesis/shared';
import { Radio, X } from 'lucide-react';
import { lastSystemAnnouncement } from './commsFeedModel';

export const BROADCAST_DURATION_MS = 4200;

interface EngineBroadcastSceneProps {
  engineNumber: number;
  onClose: () => void;
}

const SwapToken: React.FC<{ side: 'left' | 'right' }> = ({ side }) => (
  <span
    aria-hidden="true"
    className={`flex h-14 w-14 items-center justify-center rounded-full border-2 border-amber-300/80 bg-slate-900 font-heading text-2xl text-amber-200 shadow-[0_0_24px_rgba(252,211,77,0.35)] ${
      side === 'left' ? 'motion-safe:animate-token-swap-left' : 'motion-safe:animate-token-swap-right'
    }`}
  >
    ?
  </span>
);

/** Сцена обязательного объявления (Р-4): все знают, что жетоны переставлены, но не знают, как. */
export const EngineBroadcastScene: React.FC<EngineBroadcastSceneProps> = ({ engineNumber, onClose }) => (
  <div
    role="alert"
    aria-live="assertive"
    className="pointer-events-auto fixed inset-x-0 top-1/2 z-[55] -translate-y-1/2 origin-center motion-safe:animate-broadcast-band"
  >
    <div className="relative overflow-hidden border-y-2 border-amber-400/70 bg-slate-950/95 shadow-[0_0_80px_rgba(251,191,36,0.25)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(251,191,36,0.06)_0_2px,transparent_2px_4px)] motion-safe:animate-broadcast-static"
      />
      <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 py-6 sm:flex-row sm:gap-8">
        <span className="relative flex h-16 w-16 shrink-0 items-center justify-center" aria-hidden="true">
          <span className="absolute inset-0 rounded-full border-2 border-amber-400/60 motion-safe:animate-radio-wave" />
          <span
            className="absolute inset-0 rounded-full border-2 border-amber-400/40 motion-safe:animate-radio-wave"
            style={{ animationDelay: '0.8s' }}
          />
          <Radio size={30} className="relative text-amber-300" />
        </span>
        <div className="flex-1 text-center sm:text-left">
          <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-amber-400">Рация корабля · всем постам</p>
          <h2 className="mt-1 font-heading text-2xl tracking-[0.2em] text-white motion-safe:animate-broadcast-glitch sm:text-3xl">
            ЖЕТОНЫ ДВИГАТЕЛЯ №{engineNumber} ПЕРЕСТАВЛЕНЫ
          </h2>
          <p className="mt-1 text-xs text-slate-300">
            Состояние Двигателя сменилось. На какое — знает только тот, кто его менял.
          </p>
        </div>
        <div className="flex items-center gap-4" aria-hidden="true">
          <SwapToken side="left" />
          <SwapToken side="right" />
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 rounded p-1 text-slate-500 transition hover:bg-slate-800 hover:text-white"
      >
        <X size={16} aria-hidden="true" />
        <span className="sr-only">Закрыть объявление</span>
      </button>
    </div>
  </div>
);

/** Показывает каждое новое системное объявление один раз; уже прозвучавшие после F5 не повторяются. */
export const EngineBroadcast: React.FC<{ view: SanitizedGameState; enabled: boolean }> = ({ view, enabled }) => {
  const latest = lastSystemAnnouncement(view);
  const [heardSequence, setHeardSequence] = React.useState(() => latest?.sequence ?? 0);
  const pending = latest && latest.sequence > heardSequence ? latest : null;

  React.useEffect(() => {
    if (!pending || !enabled) return undefined;
    const timer = window.setTimeout(() => setHeardSequence(pending.sequence), BROADCAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [pending, enabled]);

  if (!pending || !enabled) return null;
  return (
    <EngineBroadcastScene
      key={pending.id}
      engineNumber={pending.body.engineNumber}
      onClose={() => setHeardSequence(pending.sequence)}
    />
  );
};
