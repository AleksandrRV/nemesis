import React from 'react';
import { Check, CheckCircle2, Circle, KeyRound, X } from 'lucide-react';
import { QUEST_ACTIVATION_COST, type SanitizedGameState } from '@nemesis/shared';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { PaymentStep } from '../hand/CardUseSteps';
import { autoFillPayment, handPaymentCandidates, initialPayment, paymentBlocker } from '../hand/cardUseFlow';
import type { QuestView } from './questBoardModel';

export interface QuestActivationConfirmation {
  questItemId: string;
  sacrificeItemId?: string;
  discardCardIds: string[];
}

interface QuestActivationModalProps {
  view: SanitizedGameState;
  quest: QuestView;
  preferredPaymentIds: readonly string[];
  onConfirm: (confirmation: QuestActivationConfirmation) => void;
  onClose: () => void;
}

export const QuestActivationModal: React.FC<QuestActivationModalProps> = ({
  view,
  quest,
  preferredPaymentIds,
  onConfirm,
  onClose,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, { onEscape: onClose });
  const needsSacrifice = quest.definition.activation.kind === 'SACRIFICE_ITEM';
  const [sacrificeId, setSacrificeId] = React.useState<string | null>(
    quest.sacrificeItems.length === 1 ? quest.sacrificeItems[0]!.id : null,
  );
  const [payment, setPayment] = React.useState<string[] | null>(null);
  const candidates = handPaymentCandidates(view, new Map());
  const chosenPayment = payment ?? initialPayment(candidates, preferredPaymentIds, QUEST_ACTIVATION_COST);
  const blocker =
    needsSacrifice && !sacrificeId
      ? 'Выберите Предмет для сброса'
      : paymentBlocker(candidates, chosenPayment, QUEST_ACTIVATION_COST);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (blocker) return;
    onConfirm({
      questItemId: quest.quest.id,
      ...(needsSacrifice && sacrificeId ? { sacrificeItemId: sacrificeId } : {}),
      discardCardIds: chosenPayment,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quest-activation-title"
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-amber-400/50 bg-slate-950 shadow-[0_0_60px_rgba(252,211,77,0.15)] motion-safe:animate-modal-enter"
      >
        <header className="flex items-start justify-between gap-3 border-b border-amber-900/50 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
              Активация квеста · Действие [{QUEST_ACTIVATION_COST}]
            </p>
            <h2
              id="quest-activation-title"
              className="mt-0.5 flex items-center gap-2 font-heading text-2xl tracking-wider text-white"
            >
              <KeyRound size={20} className="text-amber-300" aria-hidden="true" /> {quest.definition.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
            <section className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Условие</p>
                <p className="mt-1 text-sm text-slate-100">{quest.definition.questText}</p>
                <ul className="mt-2 flex flex-col gap-1">
                  {quest.conditions.map((condition) => (
                    <li
                      key={condition.id}
                      className={`flex items-center gap-1.5 text-[11px] ${condition.met ? 'text-emerald-300' : 'text-slate-400'}`}
                    >
                      {condition.met ? (
                        <CheckCircle2 size={12} aria-hidden="true" />
                      ) : (
                        <Circle size={12} aria-hidden="true" />
                      )}
                      {condition.label}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-amber-700/60 bg-amber-950/30 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Станет Предметом</p>
                <p className="mt-1 text-sm leading-relaxed text-amber-50">{quest.definition.itemDescription}</p>
              </div>
            </section>

            {needsSacrifice && (
              <section aria-labelledby="quest-sacrifice" className="flex flex-col gap-2">
                <h3 id="quest-sacrifice" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Какой Предмет сбросить
                </h3>
                <div role="radiogroup" aria-labelledby="quest-sacrifice" className="flex flex-col gap-1.5">
                  {quest.sacrificeItems.map((item) => {
                    const checked = item.id === sacrificeId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        onClick={() => setSacrificeId(item.id)}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                          checked
                            ? 'border-amber-300 bg-amber-950/50 text-white'
                            : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-amber-600'
                        }`}
                      >
                        {item.name}
                        {checked && <Check size={14} className="text-amber-300" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <section aria-label="Оплата Действия">
              <PaymentStep
                cost={QUEST_ACTIVATION_COST}
                candidates={candidates}
                chosen={chosenPayment}
                onChange={setPayment}
                onAutoFill={() => setPayment(autoFillPayment(candidates, chosenPayment, QUEST_ACTIVATION_COST))}
              />
            </section>
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-slate-800 px-5 py-3">
            <p className="text-xs text-amber-300" role="status">
              {blocker ?? ''}
            </p>
            <button
              type="submit"
              disabled={blocker !== null}
              className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-5 py-2 font-heading text-xs font-bold uppercase tracking-wider text-slate-950 shadow-lg transition hover:bg-amber-300 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
            >
              <KeyRound size={13} aria-hidden="true" /> Активировать
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
