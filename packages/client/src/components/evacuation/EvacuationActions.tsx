import React from 'react';
import { Lock, Rocket, Snowflake, Unlock, UserRound } from 'lucide-react';
import type { SanitizedGameState } from '@nemesis/shared';
import {
  EVACUATION_ACTION_COST,
  POD_STATUS_LABELS,
  boardingBlocker,
  cryoStatus,
  hibernationBlocker,
  podViews,
  sectionOfRoom,
  type PodView,
} from './evacuationModel';

interface EvacuationActionsProps {
  view: SanitizedGameState;
  roomId: number;
  definitionId: string | null;
  paymentReady: boolean;
  onHibernate: () => void;
  onBoard: (podId: string) => void;
  onTogglePod: (podId: string) => void;
}

function TimeTrack({ view }: { view: SanitizedGameState }) {
  const status = cryoStatus(view);
  return (
    <div className="flex flex-col gap-1">
      <div
        className="flex gap-0.5"
        role="img"
        aria-label={`Трек Времени: деление ${status.position} из ${status.length}, синие поля с ${status.opensAt}`}
      >
        {Array.from({ length: status.length }, (_, index) => {
          const blue = index >= status.opensAt && index < status.length - 1;
          const red = index === status.length - 1;
          const passed = index < status.position;
          const current = index === status.position;
          return (
            <span
              key={index}
              className={`h-2.5 flex-1 rounded-sm ${red ? 'bg-red-600' : blue ? 'bg-sky-500' : 'bg-slate-600'} ${passed ? 'opacity-30' : ''} ${
                current ? 'ring-2 ring-white' : ''
              }`}
            />
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400">
        {status.open
          ? 'Маркер на синем поле — Камеры открыты.'
          : `До синих полей: ${status.advancesUntilOpen} сдвиг(а) маркера Времени.`}
      </p>
    </div>
  );
}

function ActionButton({
  label,
  reason,
  onClick,
  tone,
}: {
  label: React.ReactNode;
  reason: string | null;
  onClick: () => void;
  tone: 'sky' | 'amber';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={reason !== null}
      title={reason ?? undefined}
      className={`flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 ${
        tone === 'sky' ? 'bg-sky-500 text-slate-950 hover:bg-sky-400' : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
      }`}
    >
      {label}
    </button>
  );
}

function PodCard({ entry, children }: { entry: PodView; children?: React.ReactNode }) {
  const gone = entry.status === 'LAUNCHED' || entry.status === 'DESTROYED';
  return (
    <li
      className={`flex flex-col gap-2 rounded-lg border p-2.5 ${
        gone
          ? 'border-slate-800 opacity-50'
          : entry.status === 'LOCKED'
            ? 'border-slate-700 bg-slate-950'
            : 'border-emerald-700/60 bg-emerald-950/20'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-heading text-sm tracking-wider text-white">
          {entry.status === 'LOCKED' ? (
            <Lock size={13} className="text-slate-400" aria-hidden="true" />
          ) : (
            <Unlock size={13} className="text-emerald-300" aria-hidden="true" />
          )}
          Капсула №{entry.pod.number} · {entry.pod.section}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-slate-400">{POD_STATUS_LABELS[entry.status]}</span>
      </div>
      <div className="flex gap-1.5" aria-label="Места в Капсуле">
        {[0, 1].map((seat) => (
          <span
            key={seat}
            className={`flex flex-1 items-center gap-1 rounded border px-1.5 py-1 text-[10px] ${
              entry.occupants[seat]
                ? 'border-amber-500/70 bg-amber-950/40 text-amber-100'
                : 'border-dashed border-slate-700 text-slate-600'
            }`}
          >
            <UserRound size={11} aria-hidden="true" /> {entry.occupants[seat] ?? 'Свободно'}
          </span>
        ))}
      </div>
      {children}
    </li>
  );
}

export const EvacuationActions: React.FC<EvacuationActionsProps> = ({
  view,
  roomId,
  definitionId,
  paymentReady,
  onHibernate,
  onBoard,
  onTogglePod,
}) => {
  const [confirmHibernation, setConfirmHibernation] = React.useState(false);

  if (definitionId === 'HIBERNATORIUM') {
    const reason = hibernationBlocker(view, roomId, paymentReady);
    return (
      <section
        aria-label="Камеры Анабиоза"
        className="flex flex-col gap-2 rounded-xl border border-sky-800/70 bg-sky-950/20 p-3"
      >
        <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-sky-300">
          <Snowflake size={13} aria-hidden="true" /> Камеры Анабиоза
        </h3>
        <TimeTrack view={view} />
        <p className="text-[11px] leading-snug text-slate-300">
          Бросок Шума: если в отсеке появится Чужой, попытка сорвётся. Уснувший Персонаж выходит из игры до её конца.
        </p>
        {confirmHibernation && reason === null ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmHibernation(false)}
              className="flex-1 rounded-lg bg-slate-800 py-2 text-xs text-slate-300 hover:bg-slate-700"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmHibernation(false);
                onHibernate();
              }}
              className="flex-[2] rounded-lg bg-sky-400 py-2 text-xs font-bold text-slate-950 hover:bg-sky-300"
            >
              Да, уснуть до конца игры
            </button>
          </div>
        ) : (
          <ActionButton
            tone="sky"
            reason={reason}
            onClick={() => setConfirmHibernation(true)}
            label={
              <>
                <Snowflake size={14} aria-hidden="true" /> Войти в Камеру Анабиоза [цена: {EVACUATION_ACTION_COST}]
              </>
            }
          />
        )}
        {reason && <p className="text-[10px] text-amber-300/90">{reason}</p>}
      </section>
    );
  }

  const section = sectionOfRoom(view, roomId);
  if (section) {
    const pods = podViews(view, section);
    return (
      <section
        aria-label={`Спасательный отсек ${section}`}
        className="flex flex-col gap-2 rounded-xl border border-amber-800/60 bg-amber-950/10 p-3"
      >
        <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-300">
          <Rocket size={13} aria-hidden="true" /> Спасательные Капсулы · отсек {section}
        </h3>
        <p className="text-[11px] leading-snug text-slate-300">
          Бросок Шума перед посадкой. После посадки — запустить сразу или ждать напарника.
        </p>
        {pods.length === 0 && <p className="text-[11px] text-slate-500">В этом отсеке нет Капсул.</p>}
        <ul className="flex flex-col gap-2">
          {pods.map((entry) => {
            const reason = boardingBlocker(view, roomId, entry, paymentReady);
            return (
              <PodCard key={entry.pod.id} entry={entry}>
                {entry.status !== 'LAUNCHED' && entry.status !== 'DESTROYED' && (
                  <ActionButton
                    tone="amber"
                    reason={reason}
                    onClick={() => onBoard(entry.pod.id)}
                    label={
                      <>
                        <Rocket size={14} aria-hidden="true" /> Сесть в Капсулу №{entry.pod.number} [цена:{' '}
                        {EVACUATION_ACTION_COST}]
                      </>
                    }
                  />
                )}
              </PodCard>
            );
          })}
        </ul>
      </section>
    );
  }

  if (definitionId === 'HATCH_CONTROL') {
    return (
      <section
        aria-label="Система блокировки капсул"
        className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-950/60 p-3"
      >
        <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300">
          <Lock size={13} aria-hidden="true" /> Система блокировки капсул
        </h3>
        <ul className="flex flex-col gap-2">
          {podViews(view).map((entry) => {
            const gone = entry.status === 'LAUNCHED' || entry.status === 'DESTROYED';
            return (
              <PodCard key={entry.pod.id} entry={entry}>
                {!gone && (
                  <ActionButton
                    tone="amber"
                    reason={paymentReady ? null : 'Отметьте 2 карты на руке для оплаты'}
                    onClick={() => onTogglePod(entry.pod.id)}
                    label={
                      entry.pod.isLocked
                        ? `Разблокировать №${entry.pod.number} [цена: 2]`
                        : `Заблокировать №${entry.pod.number} [цена: 2]`
                    }
                  />
                )}
              </PodCard>
            );
          })}
        </ul>
      </section>
    );
  }
  return null;
};
