import React from 'react';
import type { SanitizedCrewSetup } from '@nemesis/shared';
import { ChevronRight, EyeOff } from 'lucide-react';
import { ObjectiveCardFace } from '../objectives/ObjectiveCardView';
import { GAME_MODE_LABELS, gameModeOf, seatByPlayer } from './lobbyModel';

interface CrewBriefingScreenProps {
  setup: SanitizedCrewSetup;
  isLastBriefing: boolean;
  onDone: () => void;
}

/** Карта Памятки и Цели одного человека (стр. 8, шаги 14 и 16): до выбора Персонажа. */
export const CrewBriefingScreen: React.FC<CrewBriefingScreenProps> = ({ setup, isLastBriefing, onDone }) => {
  const seat = seatByPlayer(setup, setup.viewerId);
  if (!seat) return null;
  return (
    <section
      key={setup.viewerId}
      aria-labelledby="briefing-title"
      className="flex w-full max-w-4xl flex-col items-center gap-6 motion-safe:animate-lobby-rise"
    >
      <header className="text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.5em] text-cyan-400">
          {GAME_MODE_LABELS[gameModeOf(setup.playerCount)]} · секретный брифинг
        </span>
        <h2 id="briefing-title" className="mt-1 font-heading text-2xl tracking-[0.2em] text-white sm:text-3xl">
          {seat.label.toUpperCase()}: ВАШ НОМЕР
        </h2>
      </header>

      <div
        aria-label={`Номер игрока ${seat.orderNumber}`}
        className="relative flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-cyan-400 bg-slate-950 shadow-[0_0_40px_rgba(34,211,238,0.35)] motion-safe:animate-number-stamp"
      >
        <span className="font-heading text-6xl text-white">{seat.orderNumber}</span>
        <span className="absolute -bottom-2 rounded bg-cyan-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-950">
          Памятка
        </span>
      </div>
      <p className="max-w-xl text-center text-xs text-slate-400">
        Номер определяет очередь выбора Персонажа и важен для некоторых Целей. Ваши Цели видите только вы — выбирайте
        Персонажа, зная их.
      </p>

      <div className="flex flex-wrap justify-center gap-4">
        {setup.objectives.map((card, index) => (
          <div
            key={card.id}
            className="motion-safe:animate-objective-card-deal"
            style={{ animationDelay: `${450 + index * 220}ms` }}
          >
            <ObjectiveCardFace card={card} compact />
          </div>
        ))}
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-amber-200/90">
        <EyeOff size={13} aria-hidden="true" /> Храните Цели в тайне: при Первом Контакте нужно будет оставить одну.
      </p>

      <button
        type="button"
        onClick={onDone}
        className="flex items-center gap-2 rounded-xl bg-cyan-500 px-8 py-3 font-heading text-sm uppercase tracking-[0.3em] text-slate-950 transition hover:bg-cyan-400"
      >
        {isLastBriefing ? 'К выбору Персонажей' : 'Скрыть и передать'} <ChevronRight size={16} aria-hidden="true" />
      </button>
    </section>
  );
};
