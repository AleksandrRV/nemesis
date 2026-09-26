import React from 'react';
import { Biohazard, HeartPulse, ShieldAlert } from 'lucide-react';
import type { SanitizedPlayerState } from '@nemesis/shared';
import { LIGHT_WOUND_LIMIT, SERIOUS_WOUND_LIMIT, contaminationSummary, type BoardStatus } from './playerBoardModel';

export const BoardVitalsSection: React.FC<{ player: SanitizedPlayerState; statuses: readonly BoardStatus[] }> = ({
  player,
  statuses,
}) => {
  const contamination = contaminationSummary(player);
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <section aria-labelledby="vitals-light" className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <h3
          id="vitals-light"
          className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-300"
        >
          <HeartPulse size={12} aria-hidden="true" /> Лёгкие Травмы
        </h3>
        <div className="flex gap-2">
          {Array.from({ length: LIGHT_WOUND_LIMIT }, (_, index) => (
            <span
              key={index}
              className={`flex h-12 flex-1 items-center justify-center rounded-lg border text-lg font-bold ${
                index < player.lightWounds
                  ? 'border-rose-400 bg-rose-950/60 text-rose-200'
                  : 'border-dashed border-slate-700 text-slate-700'
              }`}
            >
              {index < player.lightWounds ? '✚' : ''}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-snug text-slate-400">
          Третья Лёгкая Травма сбрасывает счётчик и даёт Тяжёлую Травму (стр. 21).
        </p>
      </section>

      <section aria-labelledby="vitals-serious" className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <h3
          id="vitals-serious"
          className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-red-300"
        >
          <ShieldAlert size={12} aria-hidden="true" /> Тяжёлые Травмы · {player.seriousWounds.length}/
          {SERIOUS_WOUND_LIMIT}
        </h3>
        <ul className="flex flex-col gap-1.5">
          {Array.from({ length: SERIOUS_WOUND_LIMIT }, (_, index) => {
            const wound = player.seriousWounds[index];
            return (
              <li
                key={index}
                title={wound?.description}
                className={`flex min-h-9 items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                  !wound
                    ? 'border-dashed border-slate-700 text-slate-600'
                    : wound.isTreated
                      ? 'border-emerald-700/60 bg-emerald-950/30 text-emerald-100'
                      : 'border-red-600/70 bg-red-950/40 text-red-100'
                }`}
              >
                <span className="font-semibold">{wound ? wound.name : 'Свободно'}</span>
                {wound && (
                  <span className="text-[9px] font-bold uppercase tracking-wider">
                    {wound.isTreated ? 'Обработана' : 'Действует'}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[11px] leading-snug text-slate-400">
          С 3 Тяжёлыми Травмами любая новая Травма смертельна (стр. 21).
        </p>
      </section>

      <section aria-labelledby="vitals-status" className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <h3
          id="vitals-status"
          className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-fuchsia-300"
        >
          <Biohazard size={12} aria-hidden="true" /> Заражение и маркеры
        </h3>
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-slate-950 p-2">
            <dt className="text-[9px] uppercase tracking-wider text-slate-500">На руке</dt>
            <dd className="font-mono text-lg font-bold text-white">{contamination.total}</dd>
          </div>
          <div className="rounded-lg bg-slate-950 p-2">
            <dt className="text-[9px] uppercase tracking-wider text-slate-500">Проверено</dt>
            <dd className="font-mono text-lg font-bold text-white">{contamination.scanned}</dd>
          </div>
          <div className="rounded-lg bg-slate-950 p-2">
            <dt className="text-[9px] uppercase tracking-wider text-slate-500">Инфекция</dt>
            <dd className={`font-mono text-lg font-bold ${contamination.infected > 0 ? 'text-red-400' : 'text-white'}`}>
              {contamination.infected}
            </dd>
          </div>
        </dl>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {statuses.length === 0 ? (
            <li className="text-[11px] text-slate-500">Особых состояний нет.</li>
          ) : (
            statuses.map((status) => (
              <li
                key={status.id}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-200"
                title={status.hint}
              >
                <b>{status.label}</b> — {status.hint}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
};
