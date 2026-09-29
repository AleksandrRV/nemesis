import React from 'react';
import { ArrowLeftRight, Check, Hand, Package, X } from 'lucide-react';
import { EXCHANGE_OPTION, type ExchangeTransfer, type PendingDecision, type SanitizedGameState } from '@nemesis/shared';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { autoFillPayment, handPaymentCandidates, initialPayment, paymentBlocker } from '../hand/cardUseFlow';
import { PaymentStep } from '../hand/CardUseSteps';
import { CREW_IDENTITIES } from '../../utils/crewIdentity';
import {
  EXCHANGE_COST,
  buildTransfers,
  exchangeBlocker,
  exchangePartners,
  giveableEntries,
  requestableEntries,
  type ExchangeEntryView,
} from './exchangeModel';

const EntryToggle: React.FC<{
  entry: ExchangeEntryView;
  checked: boolean;
  tone: 'give' | 'take';
  onToggle: () => void;
}> = ({ entry, checked, tone, onToggle }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    onClick={onToggle}
    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${
      checked
        ? tone === 'give'
          ? 'border-amber-400 bg-amber-950/50 text-white'
          : 'border-emerald-400 bg-emerald-950/50 text-white'
        : 'border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-500'
    }`}
  >
    {entry.isHeavy ? <Hand size={14} aria-hidden="true" /> : <Package size={14} aria-hidden="true" />}
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate font-semibold">{entry.label}</span>
      <span className="text-[10px] text-slate-400">{entry.sublabel}</span>
      {tone === 'give' && entry.ammo > 0 && checked && (
        <span className="text-[10px] text-amber-300">Боезапас не передаётся — {entry.ammo} маркера снимутся</span>
      )}
    </span>
    {checked && <Check size={14} aria-hidden="true" />}
  </button>
);

function toggleId(list: readonly string[], id: string): string[] {
  return list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id];
}

export const ExchangeModal: React.FC<{
  view: SanitizedGameState;
  selfId: string;
  preferredPaymentIds: readonly string[];
  onConfirm: (transfers: ExchangeTransfer[], discardCardIds: string[]) => void;
  onClose: () => void;
}> = ({ view, selfId, preferredPaymentIds, onConfirm, onClose }) => {
  const partners = exchangePartners(view, selfId);
  const self = view.players[selfId]!;
  const [partnerId, setPartnerId] = React.useState(partners[0]?.id ?? '');
  const [giveIds, setGiveIds] = React.useState<string[]>([]);
  const [takeIds, setTakeIds] = React.useState<string[]>([]);
  const [payment, setPayment] = React.useState<string[] | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, { onEscape: onClose });

  const partner = view.players[partnerId];
  const giveable = giveableEntries(self);
  const requestable = partner ? requestableEntries(partner) : [];
  const candidates = handPaymentCandidates(view, new Map());
  const chosenPayment = payment ?? initialPayment(candidates, preferredPaymentIds, EXCHANGE_COST);
  const blocker = partner
    ? (exchangeBlocker(
        self,
        partner,
        giveable.filter((entry) => giveIds.includes(entry.id)),
        requestable.filter((entry) => takeIds.includes(entry.id)),
      ) ?? paymentBlocker(candidates, chosenPayment, EXCHANGE_COST))
    : 'В Комнате нет других Персонажей';

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
        aria-labelledby="exchange-title"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-emerald-500/40 bg-slate-900 shadow-[0_0_60px_rgba(16,185,129,0.18)] motion-safe:animate-modal-enter"
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-3">
          <h2
            id="exchange-title"
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300"
          >
            <ArrowLeftRight size={15} aria-hidden="true" /> Обмен [1]
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X size={18} />
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
          <p className="text-xs leading-relaxed text-slate-400">
            Покажите друг другу Предметы и Объекты. Сделка состоится, если партнёр согласится; отдать можно и даром.
            Действие тратит только тот, кто начал Обмен. Боезапас не передаётся.
          </p>
          <div role="radiogroup" aria-label="Партнёр по Обмену" className="flex flex-wrap gap-2">
            {partners.map((candidate) => {
              const identity = CREW_IDENTITIES[candidate.characterClass];
              return (
                <button
                  key={candidate.id}
                  type="button"
                  role="radio"
                  aria-checked={candidate.id === partnerId}
                  onClick={() => {
                    setPartnerId(candidate.id);
                    setTakeIds([]);
                  }}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    candidate.id === partnerId
                      ? 'border-emerald-400 bg-emerald-950/60 text-white'
                      : 'border-slate-700 text-slate-300'
                  }`}
                >
                  <identity.Icon size={14} style={{ color: identity.color }} aria-hidden="true" />
                  {candidate.name}
                </button>
              );
            })}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <section aria-label="Отдаю" className="flex flex-col gap-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Отдаю</h3>
              {giveable.length === 0 && <p className="text-xs text-slate-500">Отдавать нечего.</p>}
              {giveable.map((entry) => (
                <EntryToggle
                  key={entry.id}
                  entry={entry}
                  tone="give"
                  checked={giveIds.includes(entry.id)}
                  onToggle={() => setGiveIds((ids) => toggleId(ids, entry.id))}
                />
              ))}
            </section>
            <section aria-label="Прошу" className="flex flex-col gap-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                Прошу · {partner?.name ?? 'партнёр'}
              </h3>
              <p className="text-[10px] text-slate-500">
                Инвентарь партнёра скрыт: просить можно то, что у него в руках.
              </p>
              {requestable.map((entry) => (
                <EntryToggle
                  key={entry.id}
                  entry={entry}
                  tone="take"
                  checked={takeIds.includes(entry.id)}
                  onToggle={() => setTakeIds((ids) => toggleId(ids, entry.id))}
                />
              ))}
            </section>
          </div>
          <PaymentStep
            cost={EXCHANGE_COST}
            candidates={candidates}
            chosen={chosenPayment}
            onChange={setPayment}
            onAutoFill={() => setPayment(autoFillPayment(candidates, chosenPayment, EXCHANGE_COST))}
          />
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-5 py-3">
          <p className="min-h-4 text-xs text-amber-300" role="status">
            {blocker ?? ''}
          </p>
          <button
            type="button"
            disabled={blocker !== null}
            onClick={() => onConfirm(buildTransfers(selfId, partnerId, giveIds, takeIds), chosenPayment)}
            className="rounded-xl bg-emerald-500 px-5 py-2 font-heading text-xs font-bold uppercase tracking-wider text-slate-950 transition hover:bg-emerald-400 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            Предложить Обмен
          </button>
        </footer>
      </div>
    </div>
  );
};

type ExchangeConsentDecision = Extract<PendingDecision, { type: 'EXCHANGE_CONSENT' }>;

export const ExchangeConsentDialog: React.FC<{
  decision: ExchangeConsentDecision;
  view: SanitizedGameState;
  onAnswer: (option: string) => void;
}> = ({ decision, view, onAnswer }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef);
  const name = (playerId: string) => view.players[playerId]?.name ?? playerId;
  const lines = decision.exchange.lines.filter(
    (line) => line.fromPlayerId === decision.playerId || line.toPlayerId === decision.playerId,
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exchange-consent-title"
        className="w-full max-w-md space-y-4 rounded-xl border border-emerald-500/50 bg-slate-900 p-5 shadow-2xl motion-safe:animate-modal-enter"
      >
        <h3
          id="exchange-consent-title"
          className="flex items-center gap-2 font-heading text-lg tracking-wider text-white"
        >
          <ArrowLeftRight size={18} className="text-emerald-300" aria-hidden="true" />{' '}
          {name(decision.exchange.initiatorId)} предлагает Обмен
        </h3>
        <ul className="flex flex-col gap-1.5">
          {lines.map((line) => (
            <li
              key={line.entryId}
              className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
            >
              <span className={line.toPlayerId === decision.playerId ? 'text-emerald-300' : 'text-amber-300'}>
                {line.toPlayerId === decision.playerId
                  ? `Получаете от ${name(line.fromPlayerId)}`
                  : `Отдаёте ${name(line.toPlayerId)}`}
              </span>
              <span className="font-semibold text-white">
                {line.name}
                {line.ammo > 0 ? ' (без Боезапаса)' : ''}
              </span>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onAnswer(EXCHANGE_OPTION.ACCEPT)}
            className="rounded-lg bg-emerald-600 py-3 text-xs font-bold uppercase text-slate-950 transition hover:bg-emerald-500"
          >
            Согласиться
          </button>
          <button
            type="button"
            onClick={() => onAnswer(EXCHANGE_OPTION.DECLINE)}
            className="rounded-lg border border-slate-600 bg-slate-800 py-3 text-xs font-bold uppercase text-slate-200 transition hover:bg-slate-700"
          >
            Отказаться
          </button>
        </div>
      </div>
    </div>
  );
};
