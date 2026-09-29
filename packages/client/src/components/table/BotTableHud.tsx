import React from 'react';
import type { SanitizedGameState } from '@nemesis/shared';
import { AlertTriangle, Bot, FastForward } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { botActionLabel } from './botActivityModel';

function nameWithSeat(view: SanitizedGameState, label: string | undefined, playerId: string): string {
  const character = view.players[playerId]?.name ?? playerId;
  return label ? `${label} · ${character}` : character;
}

/** Кнопка «быстрее» в HUD: видна, только если за столом есть боты. */
export const BotTempoControl: React.FC = () => {
  const hasBots = useGameStore((state) => state.seating.some((seat) => seat.kind === 'BOT'));
  const botSpeed = useGameStore((state) => state.botSpeed);
  const setBotSpeed = useGameStore((state) => state.setBotSpeed);
  if (!hasBots) return null;
  const fast = botSpeed === 'FAST';
  return (
    <button
      type="button"
      aria-pressed={fast}
      onClick={() => setBotSpeed(fast ? 'NORMAL' : 'FAST')}
      title={fast ? 'Боты ходят быстро' : 'Ускорить ходы ботов'}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
        fast
          ? 'border-violet-400 bg-violet-900/60 text-violet-100 shadow-[0_0_14px_rgba(167,139,250,0.4)]'
          : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
      }`}
    >
      <FastForward size={14} aria-hidden="true" />
      <span className="hidden sm:inline">{fast ? 'Быстро' : 'Быстрее'}</span>
    </button>
  );
};

/** Что делает бот: всплывающая строка и индикатор «думает», не перекрывающий поле. */
export const BotActivity: React.FC<{ view: SanitizedGameState }> = ({ view }) => {
  const seating = useGameStore((state) => state.seating);
  const pendingBotId = useGameStore((state) => state.pendingBotId);
  const lastBotAction = useGameStore((state) => state.lastBotAction);
  const botStall = useGameStore((state) => state.botStall);
  const labelOf = (playerId: string) => seating.find((seat) => seat.playerId === playerId)?.label;

  return (
    <div className="pointer-events-none fixed bottom-40 right-4 z-30 flex flex-col items-end gap-2" aria-live="polite">
      {lastBotAction && (
        <p
          key={lastBotAction.sequence}
          className="flex items-center gap-2 rounded-lg border border-violet-500/50 bg-slate-950/90 px-3 py-1.5 text-xs text-violet-100 shadow-lg motion-safe:animate-bot-toast"
        >
          <Bot size={13} aria-hidden="true" />
          {nameWithSeat(view, labelOf(lastBotAction.botId), lastBotAction.botId)} {botActionLabel(lastBotAction.action)}
        </p>
      )}
      {pendingBotId && !botStall && (
        <p className="flex items-center gap-2 rounded-full border border-violet-500/40 bg-slate-950/80 px-3 py-1 text-[11px] text-violet-200">
          <Bot size={12} aria-hidden="true" /> {nameWithSeat(view, labelOf(pendingBotId), pendingBotId)} думает
          <span className="flex gap-0.5" aria-hidden="true">
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                className="h-1 w-1 rounded-full bg-violet-300 motion-safe:animate-bot-thinking"
                style={{ animationDelay: `${dot * 160}ms` }}
              />
            ))}
          </span>
        </p>
      )}
      {botStall && (
        <p
          role="alert"
          className="flex max-w-xs items-start gap-2 rounded-lg border border-red-500/60 bg-red-950/90 px-3 py-2 text-xs text-red-100"
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            {nameWithSeat(view, labelOf(botStall.botId), botStall.botId)} не может продолжить: {botStall.reason}
          </span>
        </p>
      )}
    </div>
  );
};
