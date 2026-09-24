import React from 'react';
import { CheckCircle2, ChevronRight, Info, Play, X, XCircle } from 'lucide-react';
import type { SanitizedGameState } from '@nemesis/shared';
import type { CardUseRequest, UsageTarget, UsageVariant } from './cardUsageModel';
import {
  buildCombatPayload,
  buildUsePayload,
  getActionCardUsage,
  getItemUsage,
  getUsageTargets,
  isCombatCardVariant,
} from './cardUsageModel';

/**
 * Окно использования карты: название, ВСЕ варианты использования (каждый —
 * с доступностью и причиной отказа), отмена. После выбора варианта с целью —
 * шаг выбора цели (одна или две по цепочке, либо мультывыбор карт руки).
 * Подтверждение отправляет действие; результат покажет CardResultModal.
 */

interface CardUseModalProps {
  view: SanitizedGameState;
  request: CardUseRequest;
  /** Оружие для боевых карт: id слота с боезапасом (или null). */
  combatWeaponItemId: string | null;
  /** Сколько карт оплаты доступно (конвертированные очки + отмеченные карты). */
  availablePayment: number;
  onConfirm: (args: { variant: UsageVariant; payload: Record<string, unknown> }) => void;
  onClose: () => void;
}

export const CardUseModal: React.FC<CardUseModalProps> = ({
  view,
  request,
  combatWeaponItemId,
  availablePayment,
  onConfirm,
  onClose,
}) => {
  const usage = request.kind === 'ACTION' ? getActionCardUsage(request.card, view) : getItemUsage(request.card, view, request.location);
  const [variantId, setVariantId] = React.useState<string | null>(null);
  const [firstTargetId, setFirstTargetId] = React.useState<string | null>(null);
  const [secondTargetId, setSecondTargetId] = React.useState<string | null>(null);
  const [multiIds, setMultiIds] = React.useState<string[]>([]);

  const variant = usage.variants.find((entry) => entry.id === variantId) ?? null;
  const needsPayment = usage.cost > 0;
  const paymentMissing = needsPayment ? Math.max(0, usage.cost - availablePayment) : 0;

  const targets = variant ? getUsageTargets(view, variant.targetKind, variant.secondTargetKind) : { first: [], second: [] };
  const isMultiCardStep = variant?.targetKind === 'HAND_CARDS';

  React.useEffect(() => {
    setFirstTargetId(null);
    setSecondTargetId(null);
    setMultiIds([]);
  }, [variantId]);

  const targetReady = !variant
    ? false
    : isMultiCardStep
      ? multiIds.length > 0
      : variant.targetKind === 'NONE'
        ? true
        : variant.secondTargetKind
          ? firstTargetId !== null && secondTargetId !== null
          : firstTargetId !== null;

  const handleConfirm = () => {
    if (!variant || !variant.available || !targetReady) return;
    const payload: Record<string, unknown> = isCombatCardVariant(variant.id)
      ? { combat: buildCombatPayload(variant, combatWeaponItemId ?? '', firstTargetId, secondTargetId) }
      : { ...buildUsePayload(request, variant, firstTargetId, secondTargetId, multiIds) };
    onConfirm({ variant, payload });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-slate-900 border border-cyan-500/50 rounded-2xl p-5 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col space-y-4 max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">
              {usage.subtitle}
            </span>
            <h3 className="text-xl font-heading text-white tracking-wider mt-0.5">{usage.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Отмена"
          >
            <X size={20} />
          </button>
        </header>

        <p className="text-xs text-slate-300 leading-relaxed">{usage.description}</p>

        {/* Шаг 1: варианты использования */}
        {!variant && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Варианты использования
            </span>
            {usage.variants.map((entry) => (
              <button
                key={entry.id}
                type="button"
                disabled={!entry.available}
                onClick={() => setVariantId(entry.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border transition flex items-start justify-between gap-2 ${
                  entry.available
                    ? 'bg-slate-950 border-slate-700 hover:border-cyan-500 hover:bg-cyan-950/40'
                    : 'bg-slate-950/60 border-slate-800 opacity-70 cursor-not-allowed'
                }`}
              >
                <span className="flex flex-col gap-0.5">
                  <span className={`text-xs font-bold ${entry.available ? 'text-slate-100' : 'text-slate-400'}`}>
                    {entry.label}
                  </span>
                  {entry.hint && <span className="text-[11px] text-slate-500">{entry.hint}</span>}
                  {!entry.available && entry.reason && (
                    <span className="text-[11px] text-amber-400/90 flex items-center gap-1">
                      <XCircle size={11} /> {entry.reason}
                    </span>
                  )}
                </span>
                {entry.available && <ChevronRight size={15} className="text-slate-500 shrink-0 mt-0.5" />}
              </button>
            ))}
          </div>
        )}

        {/* Шаг 2: выбор цели */}
        {variant && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300">{variant.label}</span>
              <button
                type="button"
                onClick={() => setVariantId(null)}
                className="text-[11px] text-slate-400 hover:text-white underline"
              >
                другой вариант
              </button>
            </div>

            {isMultiCardStep ? (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Отметьте карты руки (сброс: {multiIds.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {targets.first.map((target: UsageTarget) => {
                    const checked = multiIds.includes(target.id);
                    return (
                      <button
                        key={target.id}
                        type="button"
                        onClick={() =>
                          setMultiIds((prev) => (prev.includes(target.id) ? prev.filter((id) => id !== target.id) : [...prev, target.id]))
                        }
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition ${
                          checked
                            ? 'bg-cyan-600/80 border-cyan-400 text-slate-950'
                            : 'bg-slate-950 border-slate-700 text-slate-200 hover:border-cyan-600'
                        }`}
                      >
                        {target.label}
                        {target.sublabel && <span className="ml-1 opacity-70">({target.sublabel})</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              variant.targetKind !== 'NONE' && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {targets.second.length > 0 ? (firstTargetId ? 'Шаг 2/2' : 'Шаг 1/2') : 'Выберите цель'}
                  </span>
                  <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                    {(firstTargetId && targets.second.length > 0 ? targets.second : targets.first).map((target: UsageTarget) => {
                      const selectedValue = firstTargetId && targets.second.length > 0 ? secondTargetId : firstTargetId;
                      const active = selectedValue === target.id;
                      return (
                        <button
                          key={target.id}
                          type="button"
                          onClick={() => {
                            if (firstTargetId && targets.second.length > 0) setSecondTargetId(target.id);
                            else {
                              setFirstTargetId(target.id);
                              setSecondTargetId(null);
                            }
                          }}
                          className={`px-3 py-2 rounded-lg border text-xs text-left transition flex items-center justify-between ${
                            active
                              ? 'bg-cyan-600/80 border-cyan-400 text-slate-950 font-bold'
                              : 'bg-slate-950 border-slate-700 text-slate-200 hover:border-cyan-600'
                          }`}
                        >
                          <span>
                            {target.label}
                            {target.sublabel && <span className="ml-1.5 text-[10px] opacity-70">{target.sublabel}</span>}
                          </span>
                          {active && <CheckCircle2 size={14} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* Оплата */}
        {needsPayment && variant?.available && (
          <div
            className={`text-[11px] px-3 py-2 rounded-lg border flex items-center gap-1.5 ${
              paymentMissing > 0
                ? 'bg-amber-950/40 border-amber-600/60 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <Info size={12} />
            {paymentMissing > 0
              ? `Нужна оплата: ${usage.cost}. Отметьте ещё ${paymentMissing} карт(ы) на руке или конвертируйте их в очки действия.`
              : `Оплата: ${usage.cost} (очки действия и/или отмеченные карты)`}
          </div>
        )}

        <footer className="pt-1 flex items-center justify-end gap-2.5 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Отмена
          </button>
          {variant && (
            <button
              type="button"
              disabled={!variant.available || !targetReady || paymentMissing > 0}
              onClick={handleConfirm}
              title={
                !variant.available
                  ? variant.reason
                  : paymentMissing > 0
                    ? `Не хватает ${paymentMissing} карт(ы) оплаты`
                    : !targetReady
                      ? 'Выберите цель'
                      : undefined
              }
              className={`px-5 py-2 rounded-xl text-xs font-heading font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg active:scale-95 transition ${
                variant.available && targetReady && paymentMissing === 0
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Play size={13} fill="currentColor" /> Использовать
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};
