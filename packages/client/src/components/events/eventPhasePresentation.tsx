/**
 * Кинематографичные виджеты презентации Фазы Событий (Шаг 9, визуал).
 *
 * Чистые компонеты поверх записей Журнала: анимированные шкалы Времени и
 * Самоуничтожения, карты Атак Чужих, карта События, вспышки пламени и
 * вытянутый жетон Улья. Все движения — только под `motion-safe:`: при
 * `prefers-reduced-motion` виджеты статичны и читаемы без анимации.
 */
import React from 'react';
import { Flame } from 'lucide-react';
import { TIME_TRACK_LENGTH } from '@nemesis/shared';
import type { EventCard, SanitizedGameLogEntry } from '@nemesis/shared';

import { INTRUDER_COLORS, INTRUDER_SHAPES } from '../board/intruderShapes';
import { usePrefersReducedMotion } from '../board/useBoardAnimations';
import { INTRUDER_TYPE_NAMES } from '../log/intruderLogModel';
import { playerName } from '../log/gameLogModel';
import type { SanitizedGameState } from '@nemesis/shared';

/** Двойной requestAnimationFrame: переход стиля стартует после маунта. */
function useDeparted(reducedMotion: boolean): boolean {
  const [departed, setDeparted] = React.useState(reducedMotion);
  React.useEffect(() => {
    if (reducedMotion) return;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setDeparted(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);
  return departed;
}

function IntruderSilhouette({ type, size }: { type: keyof typeof INTRUDER_SHAPES; size: number }) {
  return (
    <svg viewBox="0 0 96 96" width={size} height={size} aria-hidden="true">
      <path d={INTRUDER_SHAPES[type]} fill={INTRUDER_COLORS[type]} stroke="#05070c" strokeWidth={2} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Шаг 1: шкалы Времени и Самоуничтожения                              */
/* ------------------------------------------------------------------ */

function GaugeBar({
  label,
  cells,
  position,
  dangerFrom,
  fillColor,
}: {
  label: string;
  cells: number;
  position: number;
  /** Клетки с этого номера — зона опасности (подкрашиваются). */
  dangerFrom: number | null;
  fillColor: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const departed = useDeparted(reducedMotion);
  // Маркер движется ровно на одно деление: старт — предыдущая позиция.
  const fromPct = (Math.max(position - 1, 0) / cells) * 100;
  const toPct = (position / cells) * 100;
  const width = departed ? toPct : fromPct;

  return (
    <div aria-label={`${label}: позиция ${position} из ${cells}`}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[0.2em] text-slate-400">{label}</span>
        <span className="font-mono text-[10px] text-slate-300">
          {position} / {cells}
        </span>
      </div>
      <div className="relative h-3.5 overflow-hidden rounded-sm border border-slate-700 bg-slate-950">
        {/* Зона опасности на подложке */}
        {dangerFrom !== null && (
          <div
            className="absolute inset-y-0 right-0 bg-red-950/70"
            style={{ width: `${((cells - dangerFrom + 1) / cells) * 100}%` }}
          />
        )}
        {/* Заполнение шкалы: анимированный сдвиг маркера на деление */}
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${width}%`,
            background: fillColor,
            transition: reducedMotion ? 'none' : 'width 900ms cubic-bezier(0.3, 0.8, 0.25, 1)',
          }}
        />
        {/* Деления */}
        <div className="absolute inset-0 flex" aria-hidden="true">
          {Array.from({ length: cells }, (_, index) => (
            <div key={index} className="h-full flex-1 border-r border-slate-950/70 last:border-r-0" />
          ))}
        </div>
        {/* Маркер на текущем делении */}
        <div
          className="absolute inset-y-0 w-1 bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] motion-safe:animate-gauge-flash"
          style={{ left: `calc(${toPct}% - 2px)` }}
        />
      </div>
    </div>
  );
}

export const TimeTrackGauge: React.FC<{
  event: Extract<SanitizedGameLogEntry['event'], { type: 'TIME_TRACK_ADVANCED' }>;
}> = ({ event }) => (
  <div className="space-y-3 rounded-lg border border-cyan-900/60 bg-slate-950/80 p-3">
    <GaugeBar
      label="МАРКЕР ВРЕМЕНИ"
      cells={TIME_TRACK_LENGTH}
      position={event.timeTrackPosition}
      dangerFrom={TIME_TRACK_LENGTH - 2}
      fillColor="linear-gradient(90deg, rgba(0,240,255,0.35), rgba(0,240,255,0.75))"
    />
    {event.selfDestructTrackPosition !== null && (
      <GaugeBar
        label="САМОУНИЧТОЖЕНИЕ"
        cells={8}
        position={event.selfDestructTrackPosition}
        dangerFrom={6}
        fillColor="linear-gradient(90deg, rgba(255,183,0,0.4), rgba(255,0,60,0.8))"
      />
    )}
  </div>
);

/* ------------------------------------------------------------------ */
/* Шаг 2: карты Атак Чужих                                             */
/* ------------------------------------------------------------------ */

const ATTACK_OUTCOME_LABELS: Record<
  'HIT' | 'MISS' | 'INFESTATION' | 'SUPPRESSED',
  { text: string; className: string }
> = {
  HIT: { text: 'РАНЕНИЕ', className: 'border-red-500 bg-red-950/60 text-red-300' },
  MISS: { text: 'ПРОМАХ', className: 'border-slate-500 bg-slate-900 text-slate-300' },
  INFESTATION: { text: 'ЗАРАЖЕНИЕ', className: 'border-lime-500 bg-lime-950/60 text-lime-300' },
  SUPPRESSED: { text: 'ПОДАВЛЕНИЕ', className: 'border-amber-500 bg-amber-950/60 text-amber-300' },
};

export const AttackCardVisual: React.FC<{
  view: SanitizedGameState;
  event: Extract<SanitizedGameLogEntry['event'], { type: 'EVENT_PHASE_ATTACK_RESOLVED' }>;
}> = ({ view, event }) => {
  const outcome = ATTACK_OUTCOME_LABELS[event.outcome];
  return (
    <div className="motion-safe:animate-card-reveal flex items-center gap-3 rounded-lg border border-red-900/70 bg-gradient-to-r from-red-950/40 to-slate-950/80 p-2.5">
      <div className="shrink-0">
        <IntruderSilhouette type={event.intruderType} size={44} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-white">{INTRUDER_TYPE_NAMES[event.intruderType]} атакует</p>
        <p className="truncate text-[11px] text-slate-300">
          {event.card
            ? `Карта Атаки: «${event.card.name}» (Стойкость ${event.card.toughness}${event.card.hasRetreat ? ', стрелка Отступления' : ''})`
            : 'Без карты Атаки — Личинка заражает'}
        </p>
        {event.victims.length > 0 && (
          <p className="truncate text-[11px] text-slate-400">
            {event.victims
              .map((victim) => {
                const name = playerName(view, victim.playerId);
                if (victim.isDead) return `${name}: гибель`;
                const parts: string[] = [];
                if (victim.lightWounds > 0) parts.push(`Лёгкие ×${victim.lightWounds}`);
                if (victim.seriousWounds > 0) parts.push(`Тяжёлые ×${victim.seriousWounds}`);
                if (victim.hasLarva) parts.push('Личинка');
                if (victim.hasSlime) parts.push('Слизь');
                return parts.length > 0 ? `${name}: ${parts.join(', ')}` : name;
              })
              .join(' • ')}
          </p>
        )}
      </div>
      <span className={`shrink-0 rounded border px-2 py-1 text-[10px] font-black tracking-widest ${outcome.className}`}>
        {outcome.text}
      </span>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Шаг 4: карта События                                                */
/* ------------------------------------------------------------------ */

export const EventCardVisual: React.FC<{ card: EventCard }> = ({ card }) => (
  <div className="motion-safe:animate-card-reveal mx-auto w-full max-w-xs rounded-lg border border-cyan-700/80 bg-gradient-to-b from-slate-900 to-slate-950 p-3 shadow-neon-cyan">
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className="text-[9px] font-bold tracking-[0.3em] text-cyan-500">КАРТА СОБЫТИЯ</span>
      <span className="rounded-full border border-cyan-500 bg-cyan-950/70 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-200">
        {card.corridorNumber === 'ANY' ? 'ЛЮБОЙ КОРИДОР' : `КОРИДОР ${card.corridorNumber}`}
      </span>
    </div>
    <div className="mb-2 flex min-h-10 items-center justify-center gap-1 rounded border border-slate-800 bg-black/50 py-1">
      {card.intruderTypes.length > 0 ? (
        card.intruderTypes.map((type, index) => (
          <span key={`${type}-${index}`} title={INTRUDER_TYPE_NAMES[type]}>
            <IntruderSilhouette type={type} size={30} />
          </span>
        ))
      ) : (
        <span className="text-[10px] text-slate-500">Движения Чужих нет</span>
      )}
    </div>
    <p className="text-center text-sm font-black tracking-wide text-white">{card.name}</p>
    <p className="mt-1 text-center text-[11px] leading-4 text-slate-300">{card.description}</p>
    {(card.isDestroyedOnResolve || card.isReshuffledIntoDeck) && (
      <p className="mt-2 rounded border border-amber-800/70 bg-amber-950/40 px-2 py-1 text-center text-[9px] font-bold tracking-wider text-amber-300">
        {card.isDestroyedOnResolve ? 'УДАЛИТЬ ИЗ ИГРЫ, ЗАМЕШАТЬ СБРОС' : 'ЗАМЕШАЕТСЯ ОБРАТНО В КОЛОДУ'}
      </p>
    )}
  </div>
);

/* ------------------------------------------------------------------ */
/* Шаг 3: урон от огня                                                  */
/* ------------------------------------------------------------------ */

export const FireStepVisual: React.FC<{ wounds: number; eggsDestroyed: number }> = ({ wounds, eggsDestroyed }) => (
  <div className="flex items-center justify-center gap-4 rounded-lg border border-orange-900/70 bg-gradient-to-r from-orange-950/30 to-slate-950/80 p-3">
    <Flame size={34} className="motion-safe:animate-flame-flicker shrink-0 text-nemesis-fire" aria-hidden="true" />
    <div className="text-xs leading-5 text-orange-200">
      {wounds > 0 && <p>Чужие в огне получили Ран: {wounds}.</p>}
      {eggsDestroyed > 0 && <p>Яиц уничтожено огнём: {eggsDestroyed}.</p>}
      {wounds === 0 && eggsDestroyed === 0 && <p>Огонь бушует, но пока никого не задел.</p>}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* Шаг 6: жетон Улья                                                    */
/* ------------------------------------------------------------------ */

function hiveOutcomeText(
  event: Extract<SanitizedGameLogEntry['event'], { type: 'HIVE_DEVELOPMENT_RESOLVED' }>,
): string {
  const outcome = event.outcome;
  if (!outcome) return 'Жетон Улья вытянут.';
  switch (outcome.kind) {
    case 'LARVA':
      return outcome.adultAdded
        ? 'Личинка убрана из Пула; в мешок добавлена Взрослая Особь.'
        : 'Личинка убрана из Пула Чужих.';
    case 'CREEPER':
      return outcome.breederAdded ? 'Крипер убран из Пула; в мешок добавлен Трутень.' : 'Крипер убран из Пула Чужих.';
    case 'ADULT':
      return outcome.rolledPlayerIds.length > 0
        ? `Взрослая Особь возвращается в мешок: кубик Шума бросают игроков — ${outcome.rolledPlayerIds.length}.`
        : 'Взрослая Особь возвращается в мешок: бросать Шум некому.';
    case 'BREEDER':
      return outcome.rolledPlayerIds.length > 0
        ? `Трутень возвращается в мешок: кубик Шума бросают игроков — ${outcome.rolledPlayerIds.length}.`
        : 'Трутень возвращается в мешок: бросать Шум некому.';
    case 'QUEEN':
      if (outcome.queenPlaced) return 'Королева выставлена в Улей — немедленный Контакт!';
      if (outcome.eggAdded) return 'Королева откладывает Яйцо на Планшет Чужих.';
      return 'Королева возвращается в мешок.';
    case 'BLANK':
      return outcome.adultAdded
        ? 'Пустой жетон: в мешок добавлена Взрослая Особь.'
        : 'Пустой жетон: Взрослых в запасе нет.';
  }
}

export const HiveTokenVisual: React.FC<{
  event: Extract<SanitizedGameLogEntry['event'], { type: 'HIVE_DEVELOPMENT_RESOLVED' }>;
}> = ({ event }) => (
  <div className="flex items-center justify-center gap-4 rounded-lg border border-purple-900/70 bg-gradient-to-r from-purple-950/30 to-slate-950/80 p-3">
    {/* Мешок Пула Чужих */}
    <svg viewBox="0 0 48 48" width={40} height={40} aria-hidden="true" className="shrink-0">
      <path
        d="M14 18c0-8 20-8 20 0l4 20c0 6-28 6-28 0z"
        fill="#1e1b2e"
        stroke="#a855f7"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path d="M14 18c3 3 17 3 20 0" fill="none" stroke="#a855f7" strokeWidth={2} />
    </svg>
    <div className="motion-safe:animate-token-pop shrink-0">
      <IntruderSilhouette type={event.tokenType} size={46} />
    </div>
    <div className="min-w-0 flex-1 text-xs leading-5 text-purple-200">
      <p className="font-bold text-white">Вытянут жетон: {INTRUDER_TYPE_NAMES[event.tokenType]}</p>
      <p>{hiveOutcomeText(event)}</p>
    </div>
  </div>
);
