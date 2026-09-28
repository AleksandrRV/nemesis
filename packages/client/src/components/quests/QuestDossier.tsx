import React from 'react';
import { CheckCircle2, Circle, Crosshair, KeyRound, Lock, MapPin, Sparkles, Unlock } from 'lucide-react';
import type { QuestView } from './questBoardModel';

const EFFECT_MODE_LABELS = {
  ACTION: 'Действие',
  PASSIVE: 'Пассивный',
  REACTIVE: 'Срабатывает сам',
  PENDING: 'Эффект в разработке',
} as const;

interface QuestDossierProps {
  quest: QuestView;
  canAct: boolean;
  onActivate: () => void;
  onShowRoom: (roomId: number) => void;
}

export const QuestDossier: React.FC<QuestDossierProps> = ({ quest, canAct, onActivate, onShowRoom }) => {
  const { definition, status } = quest;
  if (status === 'ACTIVE') {
    return (
      <article
        aria-label={`Квест выполнен: ${definition.name}`}
        className="relative flex min-h-52 w-40 shrink-0 flex-col overflow-hidden rounded-xl border border-amber-300/70 bg-gradient-to-b from-amber-950/60 to-slate-950 p-3 shadow-[0_0_18px_rgba(252,211,77,0.15)]"
      >
        <span className="absolute inset-x-0 top-0 h-1 bg-amber-300" aria-hidden="true" />
        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-amber-300">
          <Unlock size={11} aria-hidden="true" /> Предмет активен
        </span>
        <p className="mt-1 font-heading text-lg leading-tight tracking-wide text-white">{definition.name}</p>
        <p className="mt-1 line-clamp-4 text-[11px] leading-snug text-amber-100/80">{definition.itemDescription}</p>
        <span className="mt-auto self-start rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
          {EFFECT_MODE_LABELS[definition.effectMode]} · в инвентаре
        </span>
      </article>
    );
  }

  const ready = status === 'READY';
  return (
    <article
      aria-label={`Квест: ${definition.name}${ready ? ' — можно активировать' : ''}`}
      className={`relative flex min-h-52 w-80 shrink-0 flex-col overflow-hidden rounded-xl border p-3 ${
        ready
          ? 'border-amber-300 bg-gradient-to-r from-amber-950/50 via-slate-950 to-slate-950 motion-safe:animate-quest-ready-glow'
          : 'border-slate-700 bg-[repeating-linear-gradient(135deg,rgba(148,163,184,0.05)_0px,rgba(148,163,184,0.05)_8px,transparent_8px,transparent_16px)] bg-slate-950'
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute -right-3 top-3 rotate-12 rounded border-2 px-2 py-0.5 font-heading text-xs tracking-[0.3em] ${
          ready ? 'border-amber-300/80 text-amber-200' : 'border-slate-600 text-slate-500'
        }`}
      >
        КВЕСТ
      </span>
      <header className="flex items-center gap-2 pr-14">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ready ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-500'}`}
        >
          {ready ? <KeyRound size={16} aria-hidden="true" /> : <Lock size={15} aria-hidden="true" />}
        </span>
        <div className="min-w-0">
          <p className="truncate font-heading text-lg leading-tight tracking-wide text-white">{definition.name}</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Не активен · ещё не Предмет</p>
        </div>
      </header>

      <ul className="mt-2 flex flex-col gap-1" aria-label="Условия квеста">
        {quest.conditions.map((condition) => (
          <li
            key={condition.id}
            className={`flex items-center gap-1.5 text-[11px] ${condition.met ? 'text-emerald-300' : 'text-slate-400'}`}
          >
            {condition.met ? <CheckCircle2 size={12} aria-hidden="true" /> : <Circle size={12} aria-hidden="true" />}
            <span>{condition.label}</span>
          </li>
        ))}
      </ul>

      <p className="mt-1.5 line-clamp-2 flex items-start gap-1 text-[11px] leading-snug text-slate-300">
        <Sparkles size={11} className="mt-0.5 shrink-0 text-amber-300/80" aria-hidden="true" />
        <span>
          Награда: <span className="text-slate-100">{definition.itemDescription}</span>
        </span>
      </p>

      <footer className="mt-auto flex items-center justify-between gap-2 pt-2">
        <span className="min-w-0 flex-1 text-[10px] leading-snug text-slate-500">{quest.hint}</span>
        <span className="flex shrink-0 gap-1.5">
          {!ready && quest.targetRoomId !== null && (
            <button
              type="button"
              onClick={() => onShowRoom(quest.targetRoomId!)}
              className="flex h-8 items-center gap-1 rounded-md border border-slate-700 px-2 text-[11px] font-semibold text-slate-300 transition hover:border-cyan-500 hover:text-white"
            >
              <MapPin size={12} aria-hidden="true" /> На карте
            </button>
          )}
          <button
            type="button"
            disabled={!ready || !canAct}
            onClick={onActivate}
            title={ready ? 'Активировать квест [1]' : quest.hint}
            className="flex h-8 items-center gap-1 rounded-md bg-amber-400 px-3 text-[11px] font-bold text-slate-950 transition hover:bg-amber-300 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            <Crosshair size={12} aria-hidden="true" /> Активировать
          </button>
        </span>
      </footer>
    </article>
  );
};
