import React from 'react';
import {
  ArrowLeft,
  Bomb,
  Check,
  Equal,
  Flame,
  Hammer,
  Plus,
  Syringe,
  Wand2,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  hasFreeHandSlot,
  type ActionCard,
  type CraftComponent,
  type CraftedItemId,
  type SanitizedGameState,
} from '@nemesis/shared';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { PaymentStep } from '../hand/CardUseSteps';
import { autoFillPayment, handPaymentCandidates, initialPayment, paymentBlocker } from '../hand/cardUseFlow';
import { COMPONENT_META, RECIPE_TAGLINES } from './craftingLabels';
import {
  CRAFT_ACTION_COST,
  buildWorkshop,
  componentItems,
  selectionMatches,
  usefulFor,
  type WorkshopComponentItem,
  type WorkshopRecipe,
} from './workshopModel';

export type WorkshopMode = { kind: 'BASIC' } | { kind: 'CARD'; card: ActionCard };

export interface WorkshopConfirmation {
  recipeId: CraftedItemId;
  itemName: string;
  componentItemIds: [string, string];
  discardCardIds: string[];
}

interface WorkshopModalProps {
  view: SanitizedGameState;
  mode: WorkshopMode;
  preferredPaymentIds: readonly string[];
  onConfirm: (confirmation: WorkshopConfirmation) => void;
  onClose: () => void;
}

type Step = 'RECIPE' | 'COMPONENTS' | 'PAYMENT' | 'CONFIRM';

const RECIPE_ICONS: Record<CraftedItemId, LucideIcon> = {
  ANTIDOTE: Syringe,
  TASER: Zap,
  FLAMETHROWER: Flame,
  MOLOTOV_COCKTAIL: Bomb,
};

const STEP_TITLES: Record<Step, string> = {
  RECIPE: 'Чертёж',
  COMPONENTS: 'Компоненты',
  PAYMENT: 'Оплата',
  CONFIRM: 'Сборка',
};

function ComponentChip({
  component,
  filled,
  tone = 'gray',
}: {
  component: CraftComponent;
  filled?: boolean;
  tone?: 'gray' | 'blue';
}) {
  const meta = COMPONENT_META[component];
  return (
    <span
      className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${
        tone === 'blue'
          ? 'border-sky-500/70 bg-sky-950/70 text-sky-200'
          : filled
            ? 'border-emerald-500/70 bg-emerald-950/60 text-emerald-200'
            : 'border-slate-600 bg-slate-900 text-slate-300'
      }`}
    >
      <meta.Icon size={11} aria-hidden="true" /> {meta.label}
    </span>
  );
}

function RecipeCard({ entry, selected, onSelect }: { entry: WorkshopRecipe; selected: boolean; onSelect: () => void }) {
  const Icon = RECIPE_ICONS[entry.recipe.itemId];
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={!entry.available}
      onClick={onSelect}
      className={`group relative flex flex-col gap-2 overflow-hidden rounded-xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${
        selected
          ? 'border-sky-400 bg-sky-950/60 shadow-[0_0_24px_rgba(56,189,248,0.25)]'
          : entry.available
            ? 'border-slate-700 bg-slate-950/70 hover:border-sky-600'
            : 'cursor-not-allowed border-slate-800 bg-slate-950/40 opacity-70'
      }`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-2">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${entry.available ? 'bg-sky-900/60 text-sky-200' : 'bg-slate-900 text-slate-600'}`}
          >
            <Icon size={20} aria-hidden="true" />
          </span>
          <span className="font-heading text-lg tracking-wider text-white">{entry.recipe.name}</span>
        </span>
        <span
          className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-slate-400"
          title="Карт в синей колоде и её сбросе"
        >
          ×{entry.remaining}
        </span>
      </span>
      <span className="text-[11px] leading-snug text-slate-400">{RECIPE_TAGLINES[entry.recipe.itemId]}</span>
      <span className="flex flex-wrap items-center gap-1">
        <ComponentChip
          component={entry.recipe.components[0]}
          filled={!entry.missing.includes(entry.recipe.components[0])}
        />
        <Plus size={11} className="text-slate-500" aria-hidden="true" />
        <ComponentChip component={entry.recipe.components[1]} filled={entry.covered[1]} />
      </span>
      {entry.reason && <span className="text-[11px] text-amber-400/90">{entry.reason}</span>}
      {entry.available && <span className="text-[11px] font-semibold text-emerald-300">Можно собрать</span>}
    </button>
  );
}

function ComponentRow({
  entry,
  checked,
  useful,
  disabled,
  onToggle,
}: {
  entry: WorkshopComponentItem;
  checked: boolean;
  useful: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 disabled:cursor-not-allowed disabled:opacity-40 ${
        checked
          ? 'border-sky-400 bg-sky-950/60'
          : useful
            ? 'border-slate-700 bg-slate-950 hover:border-sky-600'
            : 'border-slate-800 bg-slate-950/40 opacity-60'
      }`}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-semibold text-white">{entry.item.name}</span>
        <span className="flex flex-wrap gap-1">
          {entry.provides.map((component) => (
            <ComponentChip key={component} component={component} tone="blue" />
          ))}
          {entry.toolsViaIngenuity && (
            <span className="flex items-center gap-1 rounded-md border border-amber-500/70 bg-amber-950/60 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
              <Wand2 size={11} aria-hidden="true" /> «Смекалка»: как ключ
            </span>
          )}
          <span className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-400">
            {entry.location === 'HAND_SLOT' ? 'В руке' : 'Инвентарь'}
          </span>
        </span>
      </span>
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${checked ? 'border-sky-300 bg-sky-400 text-slate-950' : 'border-slate-600'}`}
        aria-hidden="true"
      >
        {checked && <Check size={12} strokeWidth={3} />}
      </span>
    </button>
  );
}

export const WorkshopModal: React.FC<WorkshopModalProps> = ({
  view,
  mode,
  preferredPaymentIds,
  onConfirm,
  onClose,
}) => {
  const wildcard = mode.kind === 'CARD';
  const cost = mode.kind === 'CARD' ? mode.card.playCost : CRAFT_ACTION_COST;
  const recipes = buildWorkshop(view, wildcard);
  const items = componentItems(view, wildcard);
  const steps: Step[] = cost > 0 ? ['RECIPE', 'COMPONENTS', 'PAYMENT', 'CONFIRM'] : ['RECIPE', 'COMPONENTS', 'CONFIRM'];

  const [stepIndex, setStepIndex] = React.useState(0);
  const [recipeId, setRecipeId] = React.useState<CraftedItemId | null>(null);
  const [componentIds, setComponentIds] = React.useState<string[]>([]);
  const [payment, setPayment] = React.useState<string[] | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, { onEscape: onClose });

  const step = steps[stepIndex]!;
  const selected = recipes.find((entry) => entry.recipe.itemId === recipeId) ?? null;
  const excluded = new Map<string, string>(mode.kind === 'CARD' ? [[mode.card.id, 'Эту карту вы разыгрываете']] : []);
  const candidates = handPaymentCandidates(view, excluded);
  const chosenPayment = payment ?? initialPayment(candidates, preferredPaymentIds, cost);
  const componentsValid = selected !== null && selectionMatches(selected.recipe, items, componentIds, wildcard);

  const blocker =
    step === 'RECIPE'
      ? selected
        ? null
        : 'Выберите чертёж'
      : step === 'COMPONENTS'
        ? componentIds.length < 2
          ? `Отметьте ещё ${2 - componentIds.length} Предмет(а)`
          : componentsValid
            ? null
            : 'Символы Предметов не совпадают с рецептом'
        : step === 'PAYMENT'
          ? paymentBlocker(candidates, chosenPayment, cost)
          : null;

  const chooseRecipe = (entry: WorkshopRecipe) => {
    setRecipeId(entry.recipe.itemId);
    setComponentIds(entry.pairs.length === 1 ? [...entry.pairs[0]!] : []);
    setStepIndex(1);
  };

  const toggleComponent = (id: string) =>
    setComponentIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : current.length >= 2 ? current : [...current, id],
    );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (blocker || !selected) return;
    if (step !== 'CONFIRM') {
      setStepIndex((index) => Math.min(index + 1, steps.length - 1));
      return;
    }
    onConfirm({
      recipeId: selected.recipe.itemId,
      itemName: selected.recipe.name,
      componentItemIds: [componentIds[0]!, componentIds[1]!],
      discardCardIds: cost > 0 ? chosenPayment : [],
    });
  };

  const componentNames = componentIds.map((id) => items.find((entry) => entry.item.id === id)?.item.name ?? id);
  const player = view.players[view.meta.activePlayerId];
  const heavyBlocked = selected?.recipe.itemId === 'FLAMETHROWER' && player !== undefined && !hasFreeHandSlot(player);

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
        aria-labelledby="workshop-title"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-sky-500/40 bg-slate-950 bg-[linear-gradient(rgba(56,189,248,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.06)_1px,transparent_1px)] bg-[size:24px_24px] shadow-[0_0_60px_rgba(56,189,248,0.18)] motion-safe:animate-modal-enter"
      >
        <header className="flex items-center justify-between gap-3 border-b border-sky-900/60 px-5 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-400">
              {mode.kind === 'CARD'
                ? `Карта «${mode.card.name}» · любой желтый Предмет — символ ключа`
                : `Базовое Действие · цена ${cost}`}
            </p>
            <h2
              id="workshop-title"
              className="flex items-center gap-2 font-heading text-2xl tracking-[0.14em] text-white"
            >
              <Hammer size={20} className="text-sky-300" aria-hidden="true" /> СОЗДАНИЕ ПРЕДМЕТА
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть мастерскую"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <ol className="flex flex-wrap gap-1.5 px-5 pt-3" aria-label="Шаги создания">
            {steps.map((entry, index) => (
              <li
                key={entry}
                aria-current={index === stepIndex ? 'step' : undefined}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  index === stepIndex
                    ? 'border-sky-400 bg-sky-950 text-sky-200'
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
                {STEP_TITLES[entry]}
              </li>
            ))}
          </ol>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {step === 'RECIPE' && (
              <div role="radiogroup" aria-label="Создаваемые Предметы" className="grid gap-3 sm:grid-cols-2">
                {recipes.map((entry) => (
                  <RecipeCard
                    key={entry.recipe.itemId}
                    entry={entry}
                    selected={entry.recipe.itemId === recipeId}
                    onSelect={() => chooseRecipe(entry)}
                  />
                ))}
              </div>
            )}

            {step === 'COMPONENTS' && selected && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                  {[0, 1].map((slot) => (
                    <React.Fragment key={slot}>
                      <span
                        className={`flex min-w-32 flex-col gap-1 rounded-lg border border-dashed px-2 py-1.5 ${componentIds[slot] ? 'border-sky-500' : 'border-slate-700'}`}
                      >
                        <ComponentChip component={selected.recipe.components[slot]!} filled={componentsValid} />
                        <span className="truncate text-xs text-slate-300">{componentNames[slot] ?? 'Не выбран'}</span>
                      </span>
                      {slot === 0 && <Plus size={14} className="text-slate-500" aria-hidden="true" />}
                    </React.Fragment>
                  ))}
                  <Equal size={14} className="text-slate-500" aria-hidden="true" />
                  <span className="font-heading text-lg tracking-wider text-sky-200">{selected.recipe.name}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-400" aria-live="polite">
                    Выбрано {componentIds.length} из 2. Предметы-компоненты уйдут в сброс своих колод.
                  </p>
                  {selected.pairs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setComponentIds([...selected.pairs[0]!])}
                      className="rounded-md border border-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-300 transition hover:border-sky-500 hover:text-white"
                    >
                      Подобрать автоматически
                    </button>
                  )}
                </div>
                <div role="group" aria-label="Ваши Предметы-компоненты" className="flex flex-col gap-1.5">
                  {items.length === 0 && (
                    <p className="text-sm text-slate-500">У вас нет Предметов с синими символами Компонентов.</p>
                  )}
                  {[...items]
                    .sort(
                      (a, b) =>
                        Number(usefulFor(selected.recipe, b, wildcard)) -
                        Number(usefulFor(selected.recipe, a, wildcard)),
                    )
                    .map((entry) => (
                      <ComponentRow
                        key={entry.item.id}
                        entry={entry}
                        checked={componentIds.includes(entry.item.id)}
                        useful={usefulFor(selected.recipe, entry, wildcard)}
                        disabled={!componentIds.includes(entry.item.id) && componentIds.length >= 2}
                        onToggle={() => toggleComponent(entry.item.id)}
                      />
                    ))}
                </div>
              </div>
            )}

            {step === 'PAYMENT' && (
              <PaymentStep
                cost={cost}
                candidates={candidates}
                chosen={chosenPayment}
                onChange={setPayment}
                onAutoFill={() => setPayment(autoFillPayment(candidates, chosenPayment, cost))}
              />
            )}

            {step === 'CONFIRM' && selected && (
              <div className="flex flex-col items-center gap-4 py-2">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {componentNames.map((name) => (
                    <span
                      key={name}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 line-through decoration-sky-400/70"
                    >
                      {name}
                    </span>
                  ))}
                  <Equal size={18} className="text-sky-400" aria-hidden="true" />
                  <span className="rounded-xl border-2 border-sky-400 bg-sky-950/70 px-4 py-2 font-heading text-xl tracking-wider text-sky-100 shadow-[0_0_24px_rgba(56,189,248,0.35)]">
                    {selected.recipe.name}
                  </span>
                </div>
                <p className="max-w-md text-center text-xs leading-relaxed text-slate-400">
                  {cost > 0
                    ? `Оплата: ${candidates
                        .filter((entry) => chosenPayment.includes(entry.id))
                        .map((entry) => entry.label)
                        .join(', ')}. `
                    : ''}
                  {selected.recipe.itemId === 'FLAMETHROWER'
                    ? 'Огнемет — Тяжелый: он займет свободную руку. '
                    : 'Предмет попадёт в инвентарь. '}
                </p>
                {heavyBlocked && (
                  <p
                    role="alert"
                    className="rounded-lg border border-amber-600/60 bg-amber-950/40 px-3 py-2 text-xs text-amber-200"
                  >
                    Обе руки заняты: после сборки придётся сбросить один Тяжёлый предмет.
                  </p>
                )}
              </div>
            )}
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-5 py-3">
            <p className="min-h-4 text-xs text-amber-300" role="status">
              {step === 'RECIPE' ? '' : (blocker ?? '')}
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
              {step !== 'RECIPE' && (
                <button
                  type="submit"
                  disabled={blocker !== null}
                  className="flex items-center gap-1.5 rounded-xl bg-sky-500 px-5 py-2 font-heading text-xs font-bold uppercase tracking-wider text-slate-950 shadow-lg transition hover:bg-sky-400 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                >
                  {step === 'CONFIRM' && <Hammer size={13} aria-hidden="true" />}
                  {step === 'CONFIRM' ? 'Собрать' : 'Далее'}
                </button>
              )}
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
};
