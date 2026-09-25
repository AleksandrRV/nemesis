import React from 'react';
import { Biohazard, Check, Info, Lock, Play, Zap } from 'lucide-react';
import type { SanitizedPlayerState } from '@nemesis/shared';
import { CREW_IDENTITIES } from '../../utils/crewIdentity';

type HandEntry = SanitizedPlayerState['actionDeck']['hand'][number];

export interface HandCardPlayability {
  playable: boolean;
  reason?: string;
}

interface HandCardProps {
  card: HandEntry;
  isSelected: boolean;
  isConverted: boolean;
  playability: HandCardPlayability;
  onToggle: () => void;
  onPlay: () => void;
  onInspect: () => void;
  onRefund: () => void;
}

function contaminationStatus(card: Extract<HandEntry, { isScanned: boolean }>): string {
  if (!card.isScanned) return 'Не просканирована';
  return card.isInfected ? 'ИНФЕКЦИЯ' : 'Стерильна';
}

export const HandCard: React.FC<HandCardProps> = ({
  card,
  isSelected,
  isConverted,
  playability,
  onToggle,
  onPlay,
  onInspect,
  onRefund,
}) => {
  const isAction = 'characterClass' in card;
  const identity = isAction ? CREW_IDENTITIES[card.characterClass] : null;
  const title = isAction ? card.name : 'Карта Заражения';
  const stateLabel = isConverted ? 'В резерве оплаты' : isSelected ? 'Отмечена' : undefined;

  return (
    <div className="group relative flex w-40 shrink-0 flex-col items-stretch gap-1.5">
      <button
        type="button"
        disabled={isConverted}
        onClick={onToggle}
        aria-pressed={isSelected}
        aria-label={`${title}${stateLabel ? ` — ${stateLabel}` : ''}. Нажмите, чтобы отметить для сброса или оплаты`}
        className={`relative flex h-36 flex-col overflow-hidden rounded-xl border text-left transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 motion-safe:hover:-translate-y-1 ${
          isConverted
            ? 'cursor-not-allowed border-emerald-700/60 bg-emerald-950/40'
            : isSelected
              ? 'border-cyan-300 bg-cyan-950/70 shadow-[0_0_22px_rgba(34,211,238,0.45)] motion-safe:-translate-y-2'
              : isAction
                ? 'border-slate-700 bg-slate-900 hover:border-slate-500'
                : 'border-fuchsia-800/70 bg-fuchsia-950/40 hover:border-fuchsia-600'
        }`}
      >
        <span className="h-1 w-full" style={{ backgroundColor: identity?.color ?? '#a21caf' }} aria-hidden="true" />
        <span className="flex flex-1 flex-col gap-1 p-2.5">
          <span className="flex items-start justify-between gap-1.5 pr-5">
            {isAction ? (
              <span
                title={card.playCost === 0 ? 'Без доплаты' : `Доплата: ${card.playCost} карт(ы)`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-600 bg-slate-950 font-mono text-xs font-bold text-white"
              >
                {card.playCost}
              </span>
            ) : (
              <Biohazard size={18} className="shrink-0 text-fuchsia-300" aria-hidden="true" />
            )}
            <span className="line-clamp-2 flex-1 text-[13px] font-bold leading-tight text-white">{title}</span>
          </span>
          <span className="line-clamp-3 text-[10.5px] leading-snug text-slate-400">
            {isConverted
              ? 'Очко действия: будет сброшено в оплату'
              : isAction
                ? card.description
                : contaminationStatus(card)}
          </span>
        </span>
        {isAction && !playability.playable && !isConverted && (
          <span
            title={playability.reason}
            className="flex items-center gap-1 border-t border-slate-800 bg-slate-950/80 px-2.5 py-1 text-[9.5px] text-amber-400/90"
          >
            <Lock size={10} aria-hidden="true" />
            <span className="truncate">{playability.reason ?? 'Сейчас не разыграть'}</span>
          </span>
        )}
        {isSelected && !isConverted && (
          <span
            className="absolute right-2 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-400 text-slate-950"
            aria-hidden="true"
          >
            <Check size={11} strokeWidth={3} />
          </span>
        )}
        {isConverted && <Zap size={14} className="absolute right-2 top-2.5 text-emerald-400" aria-hidden="true" />}
      </button>

      <button
        type="button"
        onClick={onInspect}
        aria-label={`Подробнее о карте «${title}»`}
        className="absolute -top-2 right-1 z-10 rounded-full border border-slate-700 bg-slate-800 p-1 text-slate-300 shadow transition hover:bg-cyan-600 hover:text-white"
      >
        <Info size={12} />
      </button>

      {isConverted ? (
        <button
          type="button"
          onClick={onRefund}
          className="rounded-lg border border-emerald-700/60 py-1 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-950"
        >
          Вернуть в руку
        </button>
      ) : (
        isAction && (
          <button
            type="button"
            onClick={onPlay}
            disabled={!playability.playable}
            title={playability.playable ? 'Выбрать вариант, цель и оплату' : playability.reason}
            className={`flex items-center justify-center gap-1 rounded-lg py-1 text-[11px] font-bold transition active:scale-95 ${
              playability.playable
                ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                : 'cursor-not-allowed bg-slate-800 text-slate-500'
            }`}
          >
            <Play size={11} fill="currentColor" aria-hidden="true" /> Разыграть
          </button>
        )
      )}
    </div>
  );
};
