import React from 'react';
import type { ItemColor, SanitizedGameState } from '@nemesis/shared';
import { Bot, CheckCircle2, XCircle, FileText, Hand, MapPin, ShieldAlert, X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useCommsUiStore } from '../../store/commsUiStore';
import { useGameStore } from '../../store/gameStore';
import { CREW_IDENTITIES } from '../../utils/crewIdentity';
import { COMMS_KIND_LABELS } from './commsPhrases';
import {
  buildPlayerDossier,
  KNOWLEDGE_MARK_LABELS,
  type DossierStatus,
  type KnowledgeMark,
  type PlayerDossier,
} from './dossierModel';

const ITEM_COLOR_CLASSES: Record<ItemColor, string> = {
  RED: 'bg-red-500',
  YELLOW: 'bg-yellow-400',
  GREEN: 'bg-emerald-500',
  BLUE: 'bg-sky-500',
  QUEST: 'bg-violet-400',
};

const ITEM_COLOR_NAMES: Record<ItemColor, string> = {
  RED: 'красная',
  YELLOW: 'жёлтая',
  GREEN: 'зелёная',
  BLUE: 'синяя',
  QUEST: 'квестовая',
};

const STATUS_TONES: Record<DossierStatus['tone'], string> = {
  danger: 'border-red-500/60 bg-red-950/60 text-red-200',
  warning: 'border-amber-400/60 bg-amber-950/60 text-amber-200',
  info: 'border-sky-400/60 bg-sky-950/60 text-sky-200',
  success: 'border-emerald-400/60 bg-emerald-950/60 text-emerald-200',
  muted: 'border-slate-600 bg-slate-900 text-slate-300',
};

const MARK_STYLES: Record<KnowledgeMark, string> = {
  CONFIRMED: 'text-emerald-300 border-emerald-500/60',
  CONTRADICTED: 'text-red-300 border-red-500/60',
  PROMISE_KEPT: 'text-emerald-300 border-emerald-500/60',
  PROMISE_BROKEN: 'text-red-300 border-red-500/60',
  PROMISE_EXPIRED: 'text-amber-300 border-amber-500/60',
  PROMISED: 'text-slate-300 border-slate-500',
};

const Stat: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-2">
    <span className="block text-[9px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
    <span className="mt-0.5 block text-sm text-slate-100">{children}</span>
  </div>
);

const WoundPips: React.FC<{ light: number; serious: number }> = ({ light, serious }) => (
  <span className="flex items-center gap-1" aria-label={`Лёгких Травм: ${light}, Тяжёлых: ${serious}`}>
    {[0, 1].map((index) => (
      <span key={index} className={`h-2.5 w-2.5 rounded-full ${index < light ? 'bg-rose-400' : 'bg-slate-700'}`} />
    ))}
    <span className="ml-1 text-xs text-slate-300">тяжёлых: {serious}</span>
  </span>
);

function MarkBadge({ mark }: { mark: KnowledgeMark }) {
  const positive = mark === 'CONFIRMED' || mark === 'PROMISE_KEPT';
  const negative = mark === 'CONTRADICTED' || mark === 'PROMISE_BROKEN';
  return (
    <span
      className={`mt-1 inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${MARK_STYLES[mark]} ${
        mark === 'PROMISED' ? '' : 'motion-safe:animate-stamp-in'
      }`}
    >
      {positive && <CheckCircle2 size={11} aria-hidden="true" />}
      {negative && <XCircle size={11} aria-hidden="true" />}
      {KNOWLEDGE_MARK_LABELS[mark]}
    </span>
  );
}

export const DossierView: React.FC<{ dossier: PlayerDossier; onShowOnMap?: () => void; onClose: () => void }> = ({
  dossier,
  onShowOnMap,
  onClose,
}) => {
  const identity = CREW_IDENTITIES[dossier.characterClass];
  const { honesty } = dossier;
  return (
    <article className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl motion-safe:animate-lobby-rise">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: identity.color }} />
      <header className="flex items-center gap-3 border-b border-slate-800 p-4">
        <span
          style={{ borderColor: identity.color }}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 bg-slate-900"
        >
          <identity.Icon size={26} color={identity.color} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">
            <FileText size={11} aria-hidden="true" /> Досье · игрок {dossier.orderNumber}
          </p>
          <h2 id="dossier-title" className="font-heading text-xl tracking-widest text-white">
            {dossier.name}
          </h2>
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            {dossier.isBot && <Bot size={12} className="text-violet-300" aria-hidden="true" />}
            {dossier.isViewer ? 'Это вы' : (dossier.seatLabel ?? '')}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="self-start rounded p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          <X size={18} aria-hidden="true" />
          <span className="sr-only">Закрыть досье</span>
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {dossier.statuses.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {dossier.statuses.map((status) => (
              <li
                key={status.label}
                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONES[status.tone]}`}
              >
                {status.label}
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Stat label="Комната">
            <span className="flex items-center gap-2">
              {dossier.location}
              {onShowOnMap && (
                <button
                  type="button"
                  onClick={onShowOnMap}
                  className="text-cyan-300 hover:text-cyan-100"
                  title="Показать на карте"
                >
                  <MapPin size={13} aria-hidden="true" />
                  <span className="sr-only">Показать на карте</span>
                </button>
              )}
            </span>
          </Stat>
          <Stat label="Травмы">
            <WoundPips light={dossier.lightWounds} serious={dossier.seriousWounds} />
          </Stat>
          <Stat label="Карт в руке">{dossier.handCount}</Stat>
          <Stat label="Слизь">{dossier.hasSlime ? 'есть' : 'нет'}</Stat>
          <Stat label="Инвентарь (рубашки)">
            {dossier.inventoryColors.length === 0 ? (
              <span className="text-slate-500">пусто</span>
            ) : (
              <span className="flex flex-wrap gap-1">
                {dossier.inventoryColors.map((color, index) => (
                  <span
                    key={`${color}-${index}`}
                    title={`${ITEM_COLOR_NAMES[color]} карта`}
                    className={`h-4 w-3 rounded-sm ring-1 ring-black/40 ${ITEM_COLOR_CLASSES[color]}`}
                  />
                ))}
              </span>
            )}
          </Stat>
          <Stat label="В руках">
            {dossier.handSlots.length === 0 ? (
              <span className="text-slate-500">пусто</span>
            ) : (
              <span className="flex flex-col gap-0.5 text-xs">
                {dossier.handSlots.map((name, index) => (
                  <span key={`${name}-${index}`} className="flex items-center gap-1">
                    <Hand size={11} className="text-slate-500" aria-hidden="true" /> {name}
                  </span>
                ))}
              </span>
            )}
          </Stat>
        </div>

        <section aria-label="Слова и дела">
          <h3 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <ShieldAlert size={12} aria-hidden="true" /> Слова и дела
            <span className="ml-auto flex gap-2 normal-case tracking-normal">
              <span className="text-emerald-300">✓ {honesty.confirmed + honesty.kept}</span>
              <span className="text-red-300">✗ {honesty.contradicted + honesty.broken}</span>
            </span>
          </h3>
          {dossier.statements.length === 0 ? (
            <p className="text-xs text-slate-500">В эфире пока молчал.</p>
          ) : (
            <ol className="space-y-1.5">
              {dossier.statements.map((statement, index) => (
                <li
                  key={statement.id}
                  style={{ animationDelay: `${index * 60}ms` }}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 motion-safe:animate-step-enter"
                >
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    Раунд {statement.round} · {COMMS_KIND_LABELS[statement.kind]}
                  </p>
                  <p className="text-xs text-slate-100">{statement.text}</p>
                  {statement.mark && <MarkBadge mark={statement.mark} />}
                </li>
              ))}
            </ol>
          )}
        </section>
        <p className="text-[10px] text-slate-600">Только открытая информация и ваши собственные проверки.</p>
      </div>
    </article>
  );
};

/** Досье любого места, включая ботов (В8-4-6): открывается из ростера экипажа и из Рации. */
export const PlayerDossierPanel: React.FC<{ view: SanitizedGameState }> = ({ view }) => {
  const playerId = useCommsUiStore((state) => state.dossierPlayerId);
  const closeDossier = useCommsUiStore((state) => state.closeDossier);
  const closeRadio = useCommsUiStore((state) => state.closeRadio);
  const seating = useGameStore((state) => state.seating);
  const selectRoom = useGameStore((state) => state.selectRoom);
  const containerRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, { onEscape: closeDossier });
  const dossier = playerId ? buildPlayerDossier(view, playerId, seating) : null;
  if (!dossier) return null;
  const player = view.players[dossier.playerId]!;
  const onBoard = !player.isDead && !player.hasEscapedInPod;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={closeDossier}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dossier-title"
        onClick={(event) => event.stopPropagation()}
      >
        <DossierView
          dossier={dossier}
          onClose={closeDossier}
          onShowOnMap={
            onBoard
              ? () => {
                  selectRoom(player.roomId);
                  closeDossier();
                  closeRadio();
                }
              : undefined
          }
        />
      </div>
    </div>
  );
};
