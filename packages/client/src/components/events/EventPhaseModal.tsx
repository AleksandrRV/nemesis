/**
 * Кинематографичный оверлей Фазы Событий (Шаг 9).
 *
 * «ФАЗА СОБЫТИЙ: РАУНД N» — пошаговая презентация того, что разрешил движок:
 * счётчики → атаки → огонь → карта События → текстовый эффект → Улей.
 * Каждый шаг показывает записи Журнала и подсвечивает затронутые отсеки
 * на карте (через `onStepChange`). Полностью управляется с клавиатуры;
 * при `prefers-reduced-motion` не использует движение — только мягкие
 * смены контента без физических смещений.
 */
import React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatGameLogEntry, type FormattedGameLogEntry } from '../log/gameLogModel';
import { LogLine } from '../log/LogSegments';
import type { RoomId, SanitizedGameState } from '@nemesis/shared';

import type { EventPhaseModalModel, EventPhaseStepModel } from './eventPhaseModalModel';
import {
  AttackCardVisual,
  EventCardVisual,
  FireStepVisual,
  HiveTokenVisual,
  TimeTrackGauge,
} from './eventPhasePresentation';

interface EventPhaseModalProps {
  view: SanitizedGameState;
  model: EventPhaseModalModel;
  onClose: () => void;
  onStepChange: (highlightRoomIds: readonly RoomId[]) => void;
}

const EMPTY_STEP_HINTS: Record<EventPhaseStepModel['id'], string> = {
  TIME: 'Счётчики Времени сдвинуты.',
  ATTACKS: 'В эту Фазу никто не атаковал.',
  FIRE: 'Огонь никого не задел.',
  EVENT_CARD: 'Чужие не двигались.',
  EFFECT: 'У карты нет текстового эффекта.',
  HIVE: 'Развитие Улья не исполнялось.',
};

function StepEntries({ entries }: { entries: FormattedGameLogEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <ul className="space-y-1.5" aria-label="Записи Журнала шага">
      {entries.map((entry) => (
        <li key={entry.id} className="rounded border border-slate-800 bg-slate-950/70 px-2.5 py-1.5">
          <LogLine segments={entry.segments} />
        </li>
      ))}
    </ul>
  );
}

/** Кинематографичные виджеты шага: шкалы, карты, пламя, жетон Улья. */
function StepVisuals({ view, step }: { view: SanitizedGameState; step: EventPhaseStepModel }) {
  if (step.id === 'TIME') {
    const timeEntry = step.entries.find((entry) => entry.event.type === 'TIME_TRACK_ADVANCED');
    if (timeEntry && timeEntry.event.type === 'TIME_TRACK_ADVANCED') {
      return <TimeTrackGauge event={timeEntry.event} />;
    }
    return null;
  }

  if (step.id === 'ATTACKS') {
    const attacks = step.entries.filter((entry) => entry.event.type === 'EVENT_PHASE_ATTACK_RESOLVED');
    return (
      <div className="space-y-1.5">
        {attacks.map((entry) =>
          entry.event.type === 'EVENT_PHASE_ATTACK_RESOLVED' ? (
            <AttackCardVisual key={entry.id} view={view} event={entry.event} />
          ) : null,
        )}
      </div>
    );
  }

  if (step.id === 'FIRE') {
    const wounds = step.entries.filter((entry) => entry.event.type === 'FIRE_DAMAGE_TAKEN_BY_INTRUDER').length;
    const eggsDestroyed = step.entries.filter((entry) => entry.event.type === 'EGG_DESTROYED_BY_FIRE').length;
    return <FireStepVisual wounds={wounds} eggsDestroyed={eggsDestroyed} />;
  }

  if (step.id === 'EVENT_CARD') {
    const drawn = step.entries.find((entry) => entry.event.type === 'EVENT_CARD_DRAWN');
    if (drawn && drawn.event.type === 'EVENT_CARD_DRAWN') {
      return <EventCardVisual card={drawn.event.card} />;
    }
    return null;
  }

  if (step.id === 'HIVE') {
    const hiveEntry = step.entries.find((entry) => entry.event.type === 'HIVE_DEVELOPMENT_RESOLVED');
    if (hiveEntry && hiveEntry.event.type === 'HIVE_DEVELOPMENT_RESOLVED') {
      return <HiveTokenVisual event={hiveEntry.event} />;
    }
    return null;
  }

  return null;
}

export const EventPhaseModal: React.FC<EventPhaseModalProps> = ({ view, model, onClose, onStepChange }) => {
  const [stepIndex, setStepIndex] = React.useState(0);
  const stepCount = model.steps.length;
  const step = model.steps[stepIndex];

  const goToStep = React.useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(stepCount - 1, index));
      setStepIndex(clamped);
      onStepChange(model.steps[clamped]?.highlightRoomIds ?? []);
    },
    [model, onStepChange, stepCount],
  );

  React.useEffect(() => {
    onStepChange(model.steps[0]?.highlightRoomIds ?? []);
  }, [model.phaseKey]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') goToStep(stepIndex + 1);
      if (event.key === 'ArrowLeft') goToStep(stepIndex - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goToStep, onClose, stepIndex]);

  const formattedEntries = React.useMemo(
    () => (step ? step.entries.map((entry) => formatGameLogEntry(entry, view)) : []),
    [step, view],
  );

  // Шесть шагов гарантирует модель; защита — исключительно для компилятора.
  if (!step) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Фаза Событий, раунд ${model.round}`}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="motion-safe:animate-modal-enter flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-cyan-800/70 bg-slate-950 shadow-[0_0_60px_rgba(0,240,255,0.15)]">
        {/* Кинематографичные «шторки» кадра: чисто декоративны. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent" />
        <header className="flex items-center justify-between gap-3 border-b border-cyan-900/60 bg-gradient-to-r from-slate-950 via-cyan-950/40 to-slate-950 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.35em] text-cyan-500">НЕУМОЛИМОЕ ПРИБЛИЖЕНИЕ</p>
            <h2 className="truncate text-lg font-black tracking-[0.14em] text-white">
              ФАЗА СОБЫТИЙ: РАУНД {model.round}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть презентацию Фазы Событий"
            className="shrink-0 rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {/* Шаги презентации */}
        <nav aria-label="Шаги презентации Фазы Событий" className="border-b border-slate-800 px-3 py-2">
          <ol className="flex flex-wrap items-center gap-1.5">
            {model.steps.map((candidate, index) => (
              <li key={candidate.id}>
                <button
                  type="button"
                  onClick={() => goToStep(index)}
                  aria-current={index === stepIndex ? 'step' : undefined}
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide transition-colors ${
                    index === stepIndex
                      ? 'border-cyan-400 bg-cyan-950/70 text-cyan-200'
                      : index < stepIndex
                        ? 'border-emerald-700 bg-emerald-950/40 text-emerald-300'
                        : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {index + 1}. {candidate.title}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex-1 overflow-y-auto px-4 py-3" aria-live="polite">
          <h3 className="mb-2 text-sm font-bold tracking-[0.18em] text-cyan-300">
            ШАГ {stepIndex + 1} ИЗ {stepCount}: {step.title.toUpperCase()}
          </h3>
          {/* Контент шага перемонтируется при смене — анимация входа шага. */}
          <div key={step.id} className="motion-safe:animate-step-enter space-y-3">
            <StepVisuals view={view} step={step} />
            {step.entries.length === 0 ? (
              <p className="rounded border border-dashed border-slate-700 px-3 py-2 text-xs text-slate-400">
                {EMPTY_STEP_HINTS[step.id]}
              </p>
            ) : (
              <StepEntries entries={formattedEntries} />
            )}
          </div>
          {step.highlightRoomIds.length > 0 && (
            <p className="mt-3 text-[11px] text-amber-300/90">Затронутые отсеки подсвечены на карте корабля.</p>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-800 px-4 py-3">
          <button
            type="button"
            onClick={() => goToStep(stepIndex - 1)}
            disabled={stepIndex === 0}
            className="flex items-center gap-1 rounded border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:border-slate-500 disabled:opacity-40"
          >
            <ChevronLeft size={14} aria-hidden="true" />
            НАЗАД
          </button>
          <span className="font-mono text-[10px] text-slate-500">
            {stepIndex + 1} / {stepCount}
          </span>
          {stepIndex < stepCount - 1 ? (
            <button
              type="button"
              onClick={() => goToStep(stepIndex + 1)}
              className="flex items-center gap-1 rounded border border-cyan-600 bg-cyan-950/60 px-3 py-1.5 text-xs font-bold text-cyan-200 transition-colors hover:bg-cyan-900/60"
            >
              ДАЛЕЕ
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-emerald-600 bg-emerald-950/60 px-3 py-1.5 text-xs font-bold text-emerald-200 transition-colors hover:bg-emerald-900/60"
            >
              К ИГРЕ
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};
