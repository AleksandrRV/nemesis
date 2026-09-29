import React from 'react';
import { ArrowLeft, Check, Cpu, Play, X } from 'lucide-react';
import type { RoomAbilityPayload, SanitizedGameState } from '@nemesis/shared';
import { getRoomDeckColor } from '@nemesis/shared';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import {
  autoFillPayment,
  buildFlowSteps,
  flowStepTitle,
  handPaymentCandidates,
  initialPayment,
  paymentBlocker,
  targetStepBlocker,
  type FlowStep,
} from '../hand/cardUseFlow';
import { PaymentStep, TargetStepView, VariantStep } from '../hand/CardUseSteps';
import { chosenRoomId } from '../hand/usagePayload';
import { getStepTargets } from '../hand/usageTargets';
import type { TargetSelection } from '../hand/usageTypes';
import { buildRoomAbilityPayload, type RoomConsole, type RoomConsoleVariant } from './roomConsoleModel';

const ROOM_ACCENTS: Record<string, { border: string; glow: string; stripe: string; text: string }> = {
  RED: {
    border: 'border-red-500/60',
    glow: 'shadow-[0_0_40px_rgba(239,68,68,0.25)]',
    stripe: 'bg-red-500',
    text: 'text-red-200',
  },
  YELLOW: {
    border: 'border-amber-400/60',
    glow: 'shadow-[0_0_40px_rgba(251,191,36,0.25)]',
    stripe: 'bg-amber-400',
    text: 'text-amber-100',
  },
  GREEN: {
    border: 'border-emerald-500/60',
    glow: 'shadow-[0_0_40px_rgba(16,185,129,0.25)]',
    stripe: 'bg-emerald-500',
    text: 'text-emerald-100',
  },
  WHITE: {
    border: 'border-slate-300/60',
    glow: 'shadow-[0_0_40px_rgba(226,232,240,0.18)]',
    stripe: 'bg-slate-200',
    text: 'text-slate-100',
  },
  NONE: {
    border: 'border-cyan-500/50',
    glow: 'shadow-[0_0_40px_rgba(6,182,212,0.25)]',
    stripe: 'bg-cyan-400',
    text: 'text-cyan-100',
  },
};

function accentOf(definitionId: string) {
  return ROOM_ACCENTS[getRoomDeckColor(definitionId) ?? 'NONE'] ?? ROOM_ACCENTS.NONE!;
}

const RoomPlate: React.FC<{ console: RoomConsole }> = ({ console: roomConsole }) => {
  const accent = accentOf(roomConsole.definitionId);
  return (
    <aside
      className={`relative flex flex-col gap-3 overflow-hidden rounded-2xl border-2 bg-slate-950 p-4 ${accent.border} ${accent.glow}`}
    >
      <span className={`absolute inset-x-0 top-0 h-1.5 ${accent.stripe}`} aria-hidden="true" />
      <span
        className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(148,163,184,0.05)_0px,rgba(148,163,184,0.05)_1px,transparent_1px,transparent_4px)]"
        aria-hidden="true"
      />
      <div className="relative flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900">
          <Cpu size={18} className={accent.text} aria-hidden="true" />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">Консоль отсека</p>
          <h3 className={`font-heading text-2xl uppercase tracking-wider ${accent.text}`}>{roomConsole.title}</h3>
        </div>
      </div>
      <p className="relative text-xs leading-relaxed text-slate-300">{roomConsole.description}</p>
      <p className="relative mt-auto inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-300">
        Цена <b className="text-white">[{roomConsole.cost}]</b> карты Действий
      </p>
    </aside>
  );
};

function stepBlocker(
  step: FlowStep,
  variant: RoomConsoleVariant | null,
  selection: TargetSelection,
  paymentError: string | null,
): string | null {
  if (step.kind === 'VARIANT') return variant ? null : 'Выберите Действие консоли';
  if (step.kind === 'TARGET') return targetStepBlocker(variant!.steps[step.index]!, selection[step.index] ?? []);
  if (step.kind === 'PAYMENT') return paymentError;
  return null;
}

export const RoomConsoleModal: React.FC<{
  view: SanitizedGameState;
  roomConsole: RoomConsole;
  preferredPaymentIds: readonly string[];
  onConfirm: (payload: RoomAbilityPayload) => void;
  onClose: () => void;
}> = ({ view, roomConsole, preferredPaymentIds, onConfirm, onClose }) => {
  const available = roomConsole.variants.filter((entry) => entry.available);
  const [variant, setVariant] = React.useState<RoomConsoleVariant | null>(
    available.length === 1 ? available[0]! : null,
  );
  const [stepIndex, setStepIndex] = React.useState(0);
  const [selection, setSelection] = React.useState<string[][]>([]);
  const [payment, setPayment] = React.useState<string[] | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, { onEscape: onClose });

  const cost = roomConsole.cost;
  const steps = buildFlowSteps(variant, cost);
  const step: FlowStep = steps[Math.min(stepIndex, steps.length - 1)]!;
  const candidates = handPaymentCandidates(view, new Map());
  const chosenPayment = payment ?? initialPayment(candidates, preferredPaymentIds, cost);
  const blocker = stepBlocker(step, variant, selection, paymentBlocker(candidates, chosenPayment, cost));

  const updateSelection = (index: number, ids: string[]) =>
    setSelection((current) => {
      const next = [...current];
      next[index] = ids;
      if (variant?.steps[index]?.kind === 'DOOR_ROOM') {
        variant.steps.forEach((entry, entryIndex) => {
          if (entry.kind === 'ROOM_DOORS_TO_CLOSE') next[entryIndex] = [];
        });
      }
      return next;
    });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (blocker || !variant) return;
    if (step.kind === 'CONFIRM') {
      onConfirm({ ...buildRoomAbilityPayload(variant, selection), discardCardIds: chosenPayment });
      return;
    }
    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-console-title"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-cyan-500/40 bg-slate-900 shadow-[0_0_60px_rgba(6,182,212,0.2)] motion-safe:animate-modal-enter"
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-3">
          <h2 id="room-console-title" className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
            Действие Комнаты: {roomConsole.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Отменить и закрыть"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X size={18} />
          </button>
        </header>

        <form
          onSubmit={submit}
          className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 md:grid-cols-[minmax(0,15rem)_1fr]"
        >
          <RoomPlate console={roomConsole} />

          <section className="flex min-w-0 flex-col gap-4">
            <ol className="flex flex-wrap items-center gap-1.5" aria-label="Шаги Действия">
              {steps.map((entry, index) => (
                <li
                  key={`${entry.kind}-${index}`}
                  aria-current={index === stepIndex ? 'step' : undefined}
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    index === stepIndex
                      ? 'border-cyan-400 bg-cyan-950 text-cyan-200'
                      : index < stepIndex
                        ? 'border-emerald-700 bg-emerald-950/50 text-emerald-300'
                        : 'border-slate-700 text-slate-500'
                  }`}
                >
                  {index < stepIndex ? (
                    <Check size={10} aria-hidden="true" />
                  ) : (
                    <span className="font-mono">{index + 1}</span>
                  )}
                  {flowStepTitle(entry, variant)}
                </li>
              ))}
            </ol>

            {step.kind === 'VARIANT' && (
              <VariantStep
                variants={roomConsole.variants}
                selectedId={variant?.id ?? null}
                onSelect={(next) => {
                  setVariant(next as RoomConsoleVariant);
                  setSelection([]);
                  setPayment(null);
                  setStepIndex(1);
                }}
              />
            )}

            {step.kind === 'TARGET' && variant && (
              <TargetStepView
                step={variant.steps[step.index]!}
                targets={getStepTargets(view, variant.steps[step.index]!.kind, [], chosenRoomId(variant, selection))}
                selected={selection[step.index] ?? []}
                onChange={(ids) => updateSelection(step.index, ids)}
              />
            )}

            {step.kind === 'PAYMENT' && (
              <PaymentStep
                cost={cost}
                candidates={candidates}
                chosen={chosenPayment}
                onChange={setPayment}
                onAutoFill={() => setPayment(autoFillPayment(candidates, chosenPayment, cost))}
              />
            )}

            {step.kind === 'CONFIRM' && variant && (
              <div className="flex flex-col gap-1 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Действие</p>
                <p className="font-semibold text-white">{variant.label}</p>
                {variant.hint && <p className="text-xs text-slate-400">{variant.hint}</p>}
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Оплата</p>
                <p className="text-slate-200">
                  {candidates
                    .filter((candidate) => chosenPayment.includes(candidate.id))
                    .map((candidate) => candidate.label)
                    .join(', ')}
                </p>
              </div>
            )}

            <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
              <p className="min-h-4 text-xs text-amber-300" role="status">
                {step.kind === 'VARIANT' ? '' : (blocker ?? '')}
              </p>
              <div className="flex items-center gap-2">
                {stepIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
                    className="flex items-center gap-1 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
                  >
                    <ArrowLeft size={13} aria-hidden="true" /> Назад
                  </button>
                )}
                {step.kind === 'VARIANT' && variant && (
                  <button
                    type="button"
                    onClick={() => setStepIndex(1)}
                    className="rounded-xl bg-cyan-500 px-5 py-2 font-heading text-xs font-bold uppercase tracking-wider text-slate-950 transition hover:bg-cyan-400"
                  >
                    Далее
                  </button>
                )}
                {step.kind !== 'VARIANT' && (
                  <button
                    type="submit"
                    disabled={blocker !== null}
                    className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-5 py-2 font-heading text-xs font-bold uppercase tracking-wider text-slate-950 shadow-lg transition hover:bg-cyan-400 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                  >
                    {step.kind === 'CONFIRM' && <Play size={13} fill="currentColor" aria-hidden="true" />}
                    {step.kind === 'CONFIRM' ? 'Выполнить' : 'Далее'}
                  </button>
                )}
              </div>
            </footer>
          </section>
        </form>
      </div>
    </div>
  );
};
