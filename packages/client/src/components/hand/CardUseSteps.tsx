import React from 'react';
import { Check, ChevronRight, Lock } from 'lucide-react';
import type { TargetStep, UsageTarget, UsageVariant } from './usageTypes';
import type { PaymentCandidate } from './cardUseFlow';
import { stepCountHint } from './cardUseFlow';
import { USAGE_ICONS } from './usageIcons';

export const VariantStep: React.FC<{
  variants: readonly UsageVariant[];
  selectedId: string | null;
  onSelect: (variant: UsageVariant) => void;
}> = ({ variants, selectedId, onSelect }) => {
  const ordered = [...variants].sort((a, b) => Number(b.available) - Number(a.available));
  return (
    <div role="radiogroup" aria-label="Вариант использования" className="flex flex-col gap-2">
      {ordered.map((variant) => {
        const Icon = USAGE_ICONS[variant.available ? variant.icon : 'lock'];
        const checked = variant.id === selectedId;
        return (
          <button
            key={variant.id}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-disabled={!variant.available}
            disabled={!variant.available}
            onClick={() => onSelect(variant)}
            className={`group flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${
              !variant.available
                ? 'cursor-not-allowed border-slate-800 bg-slate-950/50'
                : checked
                  ? 'border-cyan-400 bg-cyan-950/60 shadow-[0_0_18px_rgba(34,211,238,0.2)]'
                  : 'border-slate-700 bg-slate-950 hover:border-cyan-600 hover:bg-slate-900'
            }`}
          >
            <span
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                variant.available ? 'bg-slate-800 text-cyan-300' : 'bg-slate-900 text-slate-600'
              }`}
            >
              <Icon size={16} aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className={`text-sm font-bold ${variant.available ? 'text-white' : 'text-slate-500'}`}>
                {variant.label}
              </span>
              {variant.hint && variant.available && (
                <span className="text-xs leading-snug text-slate-400">{variant.hint}</span>
              )}
              {!variant.available && variant.reason && (
                <span className="text-xs leading-snug text-amber-400/90">{variant.reason}</span>
              )}
            </span>
            {variant.available && (
              <ChevronRight
                size={16}
                className="mt-2 shrink-0 text-slate-500 transition group-hover:text-cyan-300"
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

function groupTargets(targets: readonly UsageTarget[]): [string | null, UsageTarget[]][] {
  const groups = new Map<string | null, UsageTarget[]>();
  for (const target of targets) {
    const key = target.group ?? null;
    groups.set(key, [...(groups.get(key) ?? []), target]);
  }
  return [...groups.entries()];
}

export const TargetStepView: React.FC<{
  step: TargetStep;
  targets: readonly UsageTarget[];
  selected: readonly string[];
  onChange: (ids: string[]) => void;
}> = ({ step, targets, selected, onChange }) => {
  const multi = step.max > 1;
  const toggle = (id: string) => {
    if (!multi) return onChange([id]);
    if (selected.includes(id)) return onChange(selected.filter((entry) => entry !== id));
    if (selected.length >= step.max) return;
    onChange([...selected, id]);
  };
  if (targets.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
        Подходящих целей сейчас нет.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-slate-400" aria-live="polite">
        {stepCountHint(step, selected.length)}
      </p>
      <div
        role={multi ? 'group' : 'radiogroup'}
        aria-label={step.title}
        className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1"
      >
        {groupTargets(targets).map(([group, entries]) => (
          <div key={group ?? 'all'} className="flex flex-col gap-1.5">
            {group && <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{group}</p>}
            {entries.map((target) => {
              const Icon = USAGE_ICONS[target.icon];
              const checked = selected.includes(target.id);
              const full = multi && !checked && selected.length >= step.max;
              return (
                <button
                  key={target.id}
                  type="button"
                  role={multi ? 'checkbox' : 'radio'}
                  aria-checked={checked}
                  disabled={full}
                  onClick={() => toggle(target.id)}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 disabled:cursor-not-allowed disabled:opacity-40 ${
                    checked
                      ? 'border-cyan-400 bg-cyan-950/60 text-white'
                      : 'border-slate-700 bg-slate-950 text-slate-200 hover:border-cyan-600'
                  }`}
                >
                  <Icon size={15} className={checked ? 'text-cyan-300' : 'text-slate-500'} aria-hidden="true" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold">{target.label}</span>
                    {target.sublabel && <span className="text-[11px] text-slate-400">{target.sublabel}</span>}
                  </span>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center border ${multi ? 'rounded' : 'rounded-full'} ${
                      checked ? 'border-cyan-300 bg-cyan-400 text-slate-950' : 'border-slate-600'
                    }`}
                    aria-hidden="true"
                  >
                    {checked && <Check size={12} strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export const PaymentStep: React.FC<{
  cost: number;
  candidates: readonly PaymentCandidate[];
  chosen: readonly string[];
  onChange: (ids: string[]) => void;
  onAutoFill: () => void;
}> = ({ cost, candidates, chosen, onChange, onAutoFill }) => {
  const toggle = (id: string) => {
    if (chosen.includes(id)) return onChange(chosen.filter((entry) => entry !== id));
    if (chosen.length >= cost) return onChange([...chosen.slice(1), id]);
    onChange([...chosen, id]);
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-300" aria-live="polite">
          Сбросьте <b className="text-white">{cost}</b> карт(ы) Действий с руки · выбрано{' '}
          <b className={chosen.length === cost ? 'text-emerald-300' : 'text-amber-300'}>{chosen.length}</b>
        </p>
        <button
          type="button"
          onClick={onAutoFill}
          className="rounded-md border border-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-300 transition hover:border-cyan-500 hover:text-white"
        >
          Выбрать автоматически
        </button>
      </div>
      <div role="group" aria-label="Карты для оплаты" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {candidates.map((candidate) => {
          const checked = chosen.includes(candidate.id);
          return (
            <button
              key={candidate.id}
              type="button"
              role="checkbox"
              aria-checked={checked}
              disabled={!candidate.selectable}
              title={candidate.reason}
              onClick={() => toggle(candidate.id)}
              className={`relative flex min-h-16 flex-col justify-between rounded-lg border p-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                !candidate.selectable
                  ? 'cursor-not-allowed border-slate-800 bg-slate-950/40 text-slate-600'
                  : checked
                    ? 'border-amber-400 bg-amber-950/40 text-white'
                    : 'border-slate-700 bg-slate-950 text-slate-200 hover:border-amber-500'
              }`}
            >
              <span className="line-clamp-2 pr-4 text-xs font-bold">{candidate.label}</span>
              <span className="text-[10px] text-slate-500">
                {candidate.selectable ? candidate.sublabel : candidate.reason}
              </span>
              {!candidate.selectable && <Lock size={11} className="absolute right-2 top-2" aria-hidden="true" />}
              {checked && <Check size={13} className="absolute right-2 top-2 text-amber-300" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
