import React from 'react';
import { Fingerprint, MonitorSmartphone } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface HandoffShutterProps {
  recipient: string;
  detail?: string;
  onReady: () => void;
}

/** Шторка «Передайте устройство»: за ней уже срез следующего человека, поэтому она непрозрачна. */
export const HandoffShutter: React.FC<HandoffShutterProps> = ({ recipient, detail, onReady }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef);
  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="handoff-title"
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-slate-950"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1/2 border-b-2 border-cyan-500/40 bg-[repeating-linear-gradient(0deg,rgba(15,23,42,1)_0_10px,rgba(30,41,59,1)_10px_12px)] motion-safe:animate-handoff-shutter-top"
      />
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/2 border-t-2 border-cyan-500/40 bg-[repeating-linear-gradient(0deg,rgba(15,23,42,1)_0_10px,rgba(30,41,59,1)_10px_12px)] motion-safe:animate-handoff-shutter-bottom"
      />
      <div className="relative flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-cyan-500/40 bg-slate-950/95 p-6 text-center shadow-[0_0_60px_rgba(34,211,238,0.2)] motion-safe:animate-lobby-rise">
        <MonitorSmartphone size={34} className="text-cyan-300" aria-hidden="true" />
        <h2 id="handoff-title" className="font-heading text-xl tracking-[0.2em] text-white">
          ПЕРЕДАЙТЕ УСТРОЙСТВО
        </h2>
        <p className="text-sm text-slate-300">
          Следующий: <b className="text-cyan-200">{recipient}</b>
          {detail && <span className="block text-xs text-slate-400">{detail}</span>}
        </p>
        <p className="text-[11px] text-slate-500">Остальные — не подглядывайте: дальше тайная информация.</p>
        <button
          type="button"
          onClick={onReady}
          className="flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-2.5 font-heading text-sm uppercase tracking-[0.25em] text-slate-950 transition hover:bg-cyan-400"
        >
          <Fingerprint size={16} aria-hidden="true" /> Я — {recipient}
        </button>
      </div>
    </div>
  );
};
