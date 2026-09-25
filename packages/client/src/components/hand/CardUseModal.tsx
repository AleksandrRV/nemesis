import React from 'react';
import { ArrowLeft, Check, Play, X } from 'lucide-react';
import type { PlayCardActionPayload, SanitizedGameState, UseItemActionPayload } from '@nemesis/shared';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import type { CardUseRequest, TargetSelection, UsageVariant } from './usageTypes';
import { getActionCardUsage } from './actionCardUsage';
import { getItemUsage } from './itemUsage';
import { getStepTargets } from './usageTargets';
import { buildCombatPayload, buildUsePayload } from './usagePayload';
import {
  autoFillPayment,
  buildFlowSteps,
  flowStepTitle,
  initialPayment,
  paymentBlocker,
  paymentCandidates,
  reservedHandCardIds,
  targetStepBlocker,
  type FlowStep,
} from './cardUseFlow';
import { CardFace } from './CardFace';
import { PaymentStep, TargetStepView, VariantStep } from './CardUseSteps';

export interface CardUseConfirmation {
  variantLabel: string;
  payload: Omit<PlayCardActionPayload, 'discardCardIds'> | Omit<UseItemActionPayload, 'discardCardIds'>;
  discardCardIds: string[];
}

interface CardUseModalProps {
  view: SanitizedGameState;
  request: CardUseRequest;
  combatWeaponItemId: string | null;
  preferredPaymentIds: readonly string[];
  onConfirm: (confirmation: CardUseConfirmation) => void;
  onClose: () => void;
}

function onlyAvailable(variants: readonly UsageVariant[]): UsageVariant | null {
  const available = variants.filter((variant) => variant.available);
  return available.length === 1 ? available[0]! : null;
}

function targetLabels(view: SanitizedGameState, variant: UsageVariant, selection: TargetSelection): string[] {
  return variant.steps.map((step, index) => {
    const chosen = new Set(selection[index] ?? []);
    const labels = getStepTargets(view, step.kind)
      .filter((target) => chosen.has(target.id))
      .map((target) => target.label);
    return `${step.title}: ${labels.length > 0 ? labels.join(', ') : 'ничего'}`;
  });
}

function stepBlocker(
  step: FlowStep,
  variant: UsageVariant | null,
  selection: TargetSelection,
  paymentError: string | null,
): string | null {
  if (step.kind === 'VARIANT') return variant ? null : 'Выберите вариант использования';
  if (step.kind === 'TARGET') return targetStepBlocker(variant!.steps[step.index]!, selection[step.index] ?? []);
  if (step.kind === 'PAYMENT') return paymentError;
  return null;
}

export const CardUseModal: React.FC<CardUseModalProps> = ({
  view,
  request,
  combatWeaponItemId,
  preferredPaymentIds,
  onConfirm,
  onClose,
}) => {
  const usage =
    request.kind === 'ACTION'
      ? getActionCardUsage(request.card, view)
      : getItemUsage(request.card, view, request.location);
  const [variant, setVariant] = React.useState<UsageVariant | null>(() => onlyAvailable(usage.variants));
  const [stepIndex, setStepIndex] = React.useState(0);
  const [selection, setSelection] = React.useState<string[][]>([]);
  const [payment, setPayment] = React.useState<string[] | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, { onEscape: onClose });

  const steps = buildFlowSteps(variant, usage.cost);
  const step: FlowStep = steps[Math.min(stepIndex, steps.length - 1)]!;
  const candidates = paymentCandidates(view, request, reservedHandCardIds(variant, selection));
  const chosenPayment = payment ?? initialPayment(candidates, preferredPaymentIds, usage.cost);
  const blocker = stepBlocker(step, variant, selection, paymentBlocker(candidates, chosenPayment, usage.cost));
  const actionVerb = request.kind === 'ACTION' ? 'Разыграть' : 'Использовать';

  const selectVariant = (next: UsageVariant) => {
    setVariant(next);
    setSelection([]);
    setPayment(null);
    setStepIndex(1);
  };

  const confirm = () => {
    if (!variant) return;
    const discardCardIds = usage.cost > 0 ? chosenPayment : [];
    if (variant.combat) {
      const combat = buildCombatPayload(variant, combatWeaponItemId ?? '', selection);
      if (combat)
        onConfirm({ variantLabel: variant.label, payload: { cardId: request.card.id, combat }, discardCardIds });
      return;
    }
    const built = buildUsePayload(request, variant, selection);
    const payload =
      request.kind === 'ACTION' ? { ...built, cardId: request.card.id } : { ...built, itemId: request.card.id };
    onConfirm({ variantLabel: variant.label, payload, discardCardIds });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (blocker) return;
    if (step.kind === 'CONFIRM') {
      confirm();
      return;
    }
    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  };

  const updateSelection = (index: number, ids: string[]) =>
    setSelection((current) => {
      const next = [...current];
      next[index] = ids;
      return next;
    });

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
        aria-labelledby="card-use-title"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-cyan-500/40 bg-slate-900 shadow-[0_0_60px_rgba(6,182,212,0.2)] motion-safe:animate-modal-enter"
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-3">
          <h2 id="card-use-title" className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
            {actionVerb}: {usage.title}
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
          <CardFace usage={usage} />

          <section className="flex min-w-0 flex-col gap-4">
            <ol className="flex flex-wrap items-center gap-1.5" aria-label="Шаги розыгрыша">
              {steps.map((entry, index) => {
                const done = index < stepIndex;
                const current = index === stepIndex;
                return (
                  <li
                    key={`${entry.kind}-${index}`}
                    aria-current={current ? 'step' : undefined}
                    className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      current
                        ? 'border-cyan-400 bg-cyan-950 text-cyan-200'
                        : done
                          ? 'border-emerald-700 bg-emerald-950/50 text-emerald-300'
                          : 'border-slate-700 text-slate-500'
                    }`}
                  >
                    {done ? <Check size={10} aria-hidden="true" /> : <span className="font-mono">{index + 1}</span>}
                    {flowStepTitle(entry, variant)}
                  </li>
                );
              })}
            </ol>

            {step.kind === 'VARIANT' && (
              <VariantStep variants={usage.variants} selectedId={variant?.id ?? null} onSelect={selectVariant} />
            )}

            {step.kind === 'TARGET' && variant && (
              <TargetStepView
                step={variant.steps[step.index]!}
                targets={getStepTargets(view, variant.steps[step.index]!.kind)}
                selected={selection[step.index] ?? []}
                onChange={(ids) => updateSelection(step.index, ids)}
              />
            )}

            {step.kind === 'PAYMENT' && (
              <PaymentStep
                cost={usage.cost}
                candidates={candidates}
                chosen={chosenPayment}
                onChange={setPayment}
                onAutoFill={() => setPayment(autoFillPayment(candidates, chosenPayment, usage.cost))}
              />
            )}

            {step.kind === 'CONFIRM' && variant && (
              <dl className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Вариант</dt>
                  <dd className="font-semibold text-white">{variant.label}</dd>
                  {variant.hint && <dd className="text-xs text-slate-400">{variant.hint}</dd>}
                </div>
                {variant.steps.length > 0 && (
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Цели</dt>
                    {targetLabels(view, variant, selection).map((line) => (
                      <dd key={line} className="text-slate-200">
                        {line}
                      </dd>
                    ))}
                  </div>
                )}
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Оплата</dt>
                  <dd className="text-slate-200">
                    {usage.cost === 0
                      ? 'Без доплаты'
                      : candidates
                          .filter((candidate) => chosenPayment.includes(candidate.id))
                          .map((candidate) => candidate.label)
                          .join(', ')}
                  </dd>
                </div>
              </dl>
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
                    {step.kind === 'CONFIRM' ? actionVerb : 'Далее'}
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
