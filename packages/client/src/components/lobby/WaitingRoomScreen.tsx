import React from 'react';
import { ArrowLeft, Bot, Loader2, MonitorSmartphone, Play, UserRound } from 'lucide-react';
import { seatLabel, type WaitingSeat, type WaitingSeatStatus } from './lobbyModel';

interface WaitingRoomScreenProps {
  seats: readonly WaitingSeat[];
  booting: boolean;
  onToggleSeat: (seatIndex: number) => void;
  onBack: () => void;
  onStart: () => void;
}

const STATUS_TEXT: Record<WaitingSeatStatus, string> = {
  YOU: 'подключился',
  LOCAL: 'подключился · это устройство',
  WAITING: 'ждём участника',
  BOT: 'бот',
};

function SeatIcon({ status }: { status: WaitingSeatStatus }) {
  if (status === 'BOT') return <Bot size={22} className="text-violet-300" aria-hidden="true" />;
  if (status === 'WAITING') return <Loader2 size={22} className="animate-spin text-slate-500" aria-hidden="true" />;
  if (status === 'LOCAL') return <MonitorSmartphone size={22} className="text-emerald-300" aria-hidden="true" />;
  return <UserRound size={22} className="text-cyan-300" aria-hidden="true" />;
}

const SEAT_FRAME: Record<WaitingSeatStatus, string> = {
  YOU: 'border-cyan-400/70 bg-cyan-950/40 motion-safe:animate-seat-join',
  LOCAL: 'border-emerald-400/70 bg-emerald-950/30 motion-safe:animate-seat-join',
  WAITING: 'border-dashed border-slate-700 bg-slate-950/60',
  BOT: 'border-violet-400/70 bg-violet-950/40 motion-safe:animate-seat-bot-boot',
};

export const WaitingRoomScreen: React.FC<WaitingRoomScreenProps> = ({
  seats,
  booting,
  onToggleSeat,
  onBack,
  onStart,
}) => {
  const waiting = seats.filter((seat) => seat.status === 'WAITING').length;
  return (
    <section
      aria-labelledby="waiting-title"
      className="flex w-full max-w-3xl flex-col gap-6 motion-safe:animate-lobby-rise"
    >
      <header className="relative text-center">
        <button
          type="button"
          onClick={onBack}
          disabled={booting}
          className="absolute left-0 top-1 flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-40"
        >
          <ArrowLeft size={14} aria-hidden="true" /> Лобби
        </button>
        <span className="font-mono text-[10px] uppercase tracking-[0.5em] text-cyan-400">Шлюз экипажа</span>
        <h2 id="waiting-title" className="mt-1 font-heading text-3xl tracking-[0.2em] text-white">
          ОЖИДАНИЕ УЧАСТНИКОВ
        </h2>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2" aria-live="polite">
        {seats.map((seat) => (
          <li
            key={`${seat.seatIndex}-${seat.status}`}
            className={`relative flex items-center gap-3 overflow-hidden rounded-2xl border-2 p-3 ${SEAT_FRAME[seat.status]}`}
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900/80">
              <SeatIcon status={seat.status} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block whitespace-nowrap font-heading text-sm uppercase tracking-widest text-white">
                {seat.status === 'WAITING' ? `Место ${seat.seatIndex + 1}` : seatLabel(seat)}
              </span>
              <span
                className={`block text-[11px] ${seat.status === 'WAITING' ? 'motion-safe:animate-seat-waiting text-slate-400' : 'text-slate-300'}`}
              >
                {STATUS_TEXT[seat.status]}
                {seat.status === 'WAITING' && '…'}
              </span>
            </span>
            {(seat.status === 'WAITING' || seat.status === 'LOCAL') && !booting && (
              <button
                type="button"
                onClick={() => onToggleSeat(seat.seatIndex)}
                className="shrink-0 rounded-lg border border-slate-700 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300 transition hover:border-emerald-500 hover:text-emerald-200"
              >
                {seat.status === 'WAITING' ? 'Сесть здесь' : 'Встать'}
              </button>
            )}
          </li>
        ))}
      </ul>

      <p className="text-center text-xs text-slate-400">
        {waiting > 0
          ? `Свободных мест: ${waiting}. По «Старт» их займут боты. Игроки за этим же устройством садятся кнопкой «Сесть здесь».`
          : 'Все места заняты — можно начинать.'}
      </p>

      <button
        type="button"
        onClick={onStart}
        disabled={booting}
        className="mx-auto flex items-center gap-2 rounded-xl bg-cyan-500 px-10 py-3 font-heading text-sm uppercase tracking-[0.3em] text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.35)] transition hover:bg-cyan-400 disabled:bg-violet-500 disabled:text-white"
      >
        <Play size={16} aria-hidden="true" /> {booting ? 'Боты занимают места…' : 'Старт'}
      </button>
    </section>
  );
};
