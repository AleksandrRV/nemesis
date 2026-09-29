import React from 'react';
import { AlertTriangle, CheckCircle2, PauseCircle, RotateCcw, Trash2 } from 'lucide-react';
import type { ObjectiveCard, SanitizedGameState } from '@nemesis/shared';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { ObjectiveCardFace } from './ObjectiveCardView';
import { playerNumberHint, prefersReducedMotion } from './objectiveModel';

export type ChoiceStage = 'ALARM' | 'CHOOSE' | 'CONFIRM' | 'SEAL';

export const ALARM_DURATION_MS = 1800;
export const SEAL_DURATION_MS = 1500;

const delay = (ms: number): React.CSSProperties => ({ animationDelay: `${ms}ms` });

interface FirstContactObjectiveChoiceProps {
  view: SanitizedGameState;
  objectives: readonly ObjectiveCard[];
  onKeep: (objectiveId: string) => void;
}

const AlarmBackdrop: React.FC<{ intense: boolean }> = ({ intense }) => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(127,29,29,0.75)_100%)]" />
    <div
      className={`absolute left-1/2 top-1/2 h-[180vmax] w-[180vmax] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(239,68,68,0.35)_14deg,transparent_36deg,transparent_180deg,rgba(239,68,68,0.35)_194deg,transparent_216deg)] motion-safe:animate-objective-klaxon ${intense ? 'opacity-100' : 'opacity-30'} transition-opacity duration-700`}
    />
    <div className="absolute inset-0 bg-red-700 mix-blend-overlay motion-safe:animate-objective-alarm" />
    <div className="absolute inset-x-0 top-0 h-2 bg-[repeating-linear-gradient(135deg,#facc15_0px,#facc15_14px,#0f172a_14px,#0f172a_28px)] motion-safe:animate-objective-lockdown" />
    <div className="absolute inset-x-0 bottom-0 h-2 bg-[repeating-linear-gradient(135deg,#facc15_0px,#facc15_14px,#0f172a_14px,#0f172a_28px)] motion-safe:animate-objective-lockdown" />
  </div>
);

const ChoiceHeader: React.FC = () => (
  <header className="flex flex-col items-center gap-2 text-center">
    <span className="flex items-center gap-1.5 rounded-full border border-yellow-400/70 bg-yellow-400/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-[0.25em] text-yellow-200">
      <PauseCircle size={13} aria-hidden="true" /> Игра приостановлена
    </span>
    <h2
      id="first-contact-title"
      className="font-heading text-5xl uppercase tracking-[0.25em] text-red-400 drop-shadow-[0_0_18px_rgba(248,113,113,0.8)] motion-safe:animate-objective-glitch-in sm:text-6xl"
    >
      Первый Контакт
    </h2>
    <p className="max-w-xl text-sm text-slate-300 motion-safe:animate-step-enter" style={delay(400)}>
      Бортовой ИИ: на борту неизвестная форма жизни. Выполнять распоряжение корпорации — или преследовать личные цели?
    </p>
  </header>
);

function hintsFor(view: SanitizedGameState, card: ObjectiveCard): (string | null)[] {
  return card.conditions.map((condition) => playerNumberHint(view, condition));
}

export interface StageProps {
  view: SanitizedGameState;
  objectives: readonly ObjectiveCard[];
  selectedId: string | null;
  onSelect: (objectiveId: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}

export const ChooseStage: React.FC<StageProps> = ({ view, objectives, selectedId, onSelect }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  useFocusTrap(ref);
  return (
    <div ref={ref} className="flex flex-col items-center gap-4">
      <ul className="flex flex-wrap items-stretch justify-center gap-5" aria-label="Ваши Цели">
        {objectives.map((card, index) => (
          <li key={card.id} className="motion-safe:animate-objective-card-deal" style={delay(index * 220)}>
            <button
              type="button"
              onClick={() => onSelect(card.id)}
              aria-pressed={selectedId === card.id}
              aria-label={`Оставить Цель «${card.name}»`}
              className="group rounded-2xl outline-none transition duration-200 hover:-translate-y-2 focus-visible:-translate-y-2 focus-visible:ring-4 focus-visible:ring-red-400/70"
            >
              <ObjectiveCardFace card={card} playerHints={hintsFor(view, card)} />
              <span className="mt-2 block text-center text-xs font-bold uppercase tracking-widest text-slate-400 transition group-hover:text-white">
                Оставить эту Цель
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="max-w-lg text-center text-xs leading-relaxed text-slate-400">
        Оставьте одну Цель — вторая будет удалена из игры лицевой стороной вниз. Выбор скрыт от остальных игроков; после
        него Контакт продолжится по обычным правилам.
      </p>
    </div>
  );
};

export const ConfirmStage: React.FC<StageProps> = ({ view, objectives, selectedId, onConfirm, onBack }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  useFocusTrap(ref, { onEscape: onBack });
  const kept = objectives.find((card) => card.id === selectedId);
  const dropped = objectives.filter((card) => card.id !== selectedId);
  if (!kept) return null;
  return (
    <div ref={ref} className="flex flex-col items-center gap-4 motion-safe:animate-modal-enter">
      <div className="flex flex-wrap items-end justify-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-emerald-300">
            <CheckCircle2 size={14} aria-hidden="true" /> Остаётся
          </span>
          <ObjectiveCardFace card={kept} playerHints={hintsFor(view, kept)} />
        </div>
        {dropped.map((card) => (
          <div key={card.id} className="flex flex-col items-center gap-2 opacity-60 grayscale">
            <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-red-300">
              <Trash2 size={14} aria-hidden="true" /> Уйдёт из игры
            </span>
            <ObjectiveCardFace card={card} compact />
          </div>
        ))}
      </div>
      <p className="max-w-md text-center text-sm text-slate-200">
        Оставить «{kept.name}»? Вторую Цель вернуть будет нельзя.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-xl bg-red-500 px-6 py-2.5 font-heading text-base font-bold uppercase tracking-wider text-white shadow-[0_0_24px_rgba(239,68,68,0.55)] transition hover:bg-red-400 active:scale-95"
        >
          Подтвердить выбор
        </button>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-bold text-slate-200 transition hover:border-slate-400 hover:text-white"
        >
          <RotateCcw size={14} aria-hidden="true" /> Передумать
        </button>
      </div>
    </div>
  );
};

export const SealStage: React.FC<Pick<StageProps, 'view' | 'objectives' | 'selectedId'>> = ({
  view,
  objectives,
  selectedId,
}) => (
  <div className="flex flex-wrap items-center justify-center gap-6" role="status" aria-live="polite">
    {objectives.map((card) =>
      card.id === selectedId ? (
        <div key={card.id} className="relative motion-safe:animate-objective-card-keep">
          <ObjectiveCardFace card={card} playerHints={hintsFor(view, card)} />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-md border-4 border-emerald-400 bg-slate-950/80 px-3 py-1 font-heading text-2xl uppercase tracking-[0.3em] text-emerald-300 motion-safe:animate-scanner-stamp">
            Цель принята
          </span>
        </div>
      ) : (
        <div key={card.id} className="motion-safe:animate-objective-card-discard motion-reduce:hidden">
          <ObjectiveCardFace card={card} compact />
        </div>
      ),
    )}
    <span className="sr-only">Цель принята, вторая удалена из игры.</span>
  </div>
);

export const FirstContactObjectiveChoice: React.FC<FirstContactObjectiveChoiceProps> = ({
  view,
  objectives,
  onKeep,
}) => {
  const [stage, setStage] = React.useState<ChoiceStage>(() => (prefersReducedMotion() ? 'CHOOSE' : 'ALARM'));
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const onKeepRef = React.useRef(onKeep);
  React.useLayoutEffect(() => {
    onKeepRef.current = onKeep;
  }, [onKeep]);

  React.useEffect(() => {
    if (stage === 'ALARM') {
      const timer = window.setTimeout(() => setStage('CHOOSE'), ALARM_DURATION_MS);
      return () => window.clearTimeout(timer);
    }
    if (stage === 'SEAL' && selectedId) {
      const timer = window.setTimeout(
        () => onKeepRef.current(selectedId),
        prefersReducedMotion() ? 0 : SEAL_DURATION_MS,
      );
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [stage, selectedId]);

  const stageProps: StageProps = {
    view,
    objectives,
    selectedId,
    onSelect: (objectiveId) => {
      setSelectedId(objectiveId);
      setStage('CONFIRM');
    },
    onConfirm: () => setStage('SEAL'),
    onBack: () => setStage('CHOOSE'),
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/95 p-4"
      data-stage={stage}
    >
      <AlarmBackdrop intense={stage === 'ALARM'} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-contact-title"
        className="relative flex w-full max-w-4xl flex-col items-center gap-6 py-6"
      >
        <ChoiceHeader />
        {stage === 'ALARM' && (
          <p className="flex items-center gap-2 font-heading text-xl uppercase tracking-[0.3em] text-red-300 motion-safe:animate-contact-warning">
            <AlertTriangle size={20} aria-hidden="true" /> Тревога · протокол Целей
          </p>
        )}
        {stage === 'CHOOSE' && <ChooseStage key="choose" {...stageProps} />}
        {stage === 'CONFIRM' && <ConfirmStage key="confirm" {...stageProps} />}
        {stage === 'SEAL' && <SealStage view={view} objectives={objectives} selectedId={selectedId} />}
      </section>
    </div>
  );
};
