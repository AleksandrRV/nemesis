import React from 'react';
import {
  Crosshair,
  Eye,
  Footprints,
  Hammer,
  Radio,
  RotateCcw,
  Search,
  Skull,
  Trophy,
  Map as MapIcon,
} from 'lucide-react';
import type { EndgameReport, SanitizedGameState } from '@nemesis/shared';
import { CREW_IDENTITIES } from '../../utils/crewIdentity';
import {
  CAUSE_TITLES,
  DESTINATION_LABELS,
  buildGameStats,
  characterOf,
  survivalLine,
  type PlayerStats,
} from './endgameModel';

const delay = (ms: number): React.CSSProperties => ({ animationDelay: `${ms}ms` });

const StatTile: React.FC<{ label: string; value: number; wait: number }> = ({ label, value, wait }) => (
  <div
    className="flex flex-col items-center rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 motion-safe:animate-step-enter"
    style={delay(wait)}
  >
    <span className="font-heading text-3xl text-white">{value}</span>
    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
  </div>
);

const PlayerStatLine: React.FC<{ stats: PlayerStats }> = ({ stats }) => (
  <dl className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
    <div className="flex items-center gap-1" title="Убито Чужих">
      <dt>
        <Skull size={12} aria-label="Убито Чужих" />
      </dt>
      <dd className="font-mono text-slate-200">{stats.kills}</dd>
    </div>
    <div className="flex items-center gap-1" title="Выстрелов">
      <dt>
        <Crosshair size={12} aria-label="Выстрелов" />
      </dt>
      <dd className="font-mono text-slate-200">{stats.shots}</dd>
    </div>
    <div className="flex items-center gap-1" title="Перемещений">
      <dt>
        <Footprints size={12} aria-label="Перемещений" />
      </dt>
      <dd className="font-mono text-slate-200">{stats.moves}</dd>
    </div>
    <div className="flex items-center gap-1" title="Обысков">
      <dt>
        <Search size={12} aria-label="Обысков" />
      </dt>
      <dd className="font-mono text-slate-200">{stats.searches}</dd>
    </div>
    <div className="flex items-center gap-1" title="Создано Предметов">
      <dt>
        <Hammer size={12} aria-label="Создано Предметов" />
      </dt>
      <dd className="font-mono text-slate-200">{stats.crafted}</dd>
    </div>
    <div className="flex items-center gap-1" title="Ранения: Лёгкие / Тяжёлые">
      <dt>Раны</dt>
      <dd className="font-mono text-slate-200">
        {stats.lightWounds}/{stats.seriousWounds}
      </dd>
    </div>
    <div className="flex items-center gap-1" title="Карт Заражения получено">
      <dt>Заражение</dt>
      <dd className="font-mono text-slate-200">{stats.contaminations}</dd>
    </div>
    {stats.signalSent && (
      <div className="flex items-center gap-1 text-cyan-300">
        <dt>
          <Radio size={12} aria-hidden="true" />
        </dt>
        <dd>Сигнал отправлен</dd>
      </div>
    )}
  </dl>
);

function headline(report: EndgameReport): { title: string; tone: string } {
  const winners = report.characters.filter((entry) => entry.isWinner).length;
  if (winners > 0) return { title: winners === 1 ? 'Есть победитель' : 'Есть победители', tone: 'text-amber-200' };
  if (report.characters.some((entry) => entry.death === null))
    return { title: 'Выжили, но не победили', tone: 'text-cyan-200' };
  return { title: 'Никто не выжил', tone: 'text-red-400' };
}

export const EndgameSummary: React.FC<{
  view: SanitizedGameState;
  report: EndgameReport;
  onNewGame: () => void;
  onViewBoard: () => void;
  onReplay: () => void;
}> = ({ view, report, onNewGame, onViewBoard, onReplay }) => {
  const stats = React.useMemo(() => buildGameStats(view), [view]);
  const { title, tone } = headline(report);
  return (
    <div className="flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-col items-center gap-2 text-center">
        <span className="text-[11px] font-bold uppercase tracking-[0.35em] text-slate-400">
          Итоги партии · {CAUSE_TITLES[report.cause]}
          {report.destinationReached ? ` · ${DESTINATION_LABELS[report.destinationReached]}` : ''}
        </span>
        <h2
          id="endgame-scene-title"
          className={`flex items-center gap-3 font-heading text-4xl uppercase tracking-[0.2em] motion-safe:animate-objective-glitch-in sm:text-5xl ${tone}`}
        >
          {report.characters.some((entry) => entry.isWinner) && <Trophy size={36} aria-hidden="true" />}
          {title}
        </h2>
      </header>

      <ul className="flex flex-col gap-3" aria-label="Экипаж">
        {stats.players.map((playerStats, index) => {
          const player = view.players[playerStats.playerId]!;
          const result = characterOf(report, player.id);
          const identity = CREW_IDENTITIES[player.characterClass];
          const met = result?.objectiveResults.filter((entry) => entry.metConditionIndex !== null) ?? [];
          return (
            <li
              key={player.id}
              className={`flex flex-col gap-2 rounded-2xl border bg-slate-950/80 p-4 motion-safe:animate-step-enter sm:flex-row sm:items-center sm:gap-4 ${
                result?.isWinner ? 'border-amber-400/70 shadow-[0_0_30px_rgba(251,191,36,0.18)]' : 'border-slate-800'
              }`}
              style={delay(200 + index * 180)}
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2"
                style={{ borderColor: identity.color, color: identity.color }}
              >
                <identity.Icon size={22} aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-heading text-xl tracking-wider text-white">{player.name}</span>
                  <span className="text-xs text-slate-400">
                    {player.name === identity.label ? '' : `${identity.label} · `}игрок {player.orderNumber}
                  </span>
                </div>
                <span className={`text-sm ${result?.death ? 'text-red-300' : 'text-emerald-300'}`}>
                  {result ? survivalLine(result) : 'Нет данных'}
                </span>
                <PlayerStatLine stats={playerStats} />
              </div>
              <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                {result?.isWinner ? (
                  <span
                    className="flex items-center gap-1 rounded-full border border-amber-400 bg-amber-950/60 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-200 motion-safe:animate-endgame-verdict"
                    style={delay(700 + index * 180)}
                  >
                    <Trophy size={14} aria-hidden="true" /> Победа
                  </span>
                ) : (
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                    Поражение
                  </span>
                )}
                {met.map((entry) => (
                  <span key={entry.objective.id} className="text-[11px] text-amber-100/80">
                    Цель «{entry.objective.name}»
                  </span>
                ))}
                {result && result.objectiveResults.length > 0 && met.length === 0 && (
                  <span className="text-[11px] text-slate-500">Цель не выполнена</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <section aria-label="Статистика партии" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <StatTile label="Раундов" value={stats.rounds} wait={900} />
        <StatTile label="Чужих убито" value={stats.intrudersKilled} wait={980} />
        <StatTile label="Встреч" value={stats.contacts} wait={1060} />
        <StatTile label="Комнат открыто" value={stats.roomsDiscovered} wait={1140} />
        <StatTile label="Бросков Шума" value={stats.noiseRolls} wait={1220} />
        <StatTile label="Событий" value={stats.eventCards} wait={1300} />
      </section>

      <footer className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onNewGame}
          className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-slate-950 transition hover:bg-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
        >
          <RotateCcw size={16} aria-hidden="true" /> Новая партия
        </button>
        <button
          type="button"
          onClick={onViewBoard}
          className="flex items-center gap-2 rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-400 hover:text-white"
        >
          <MapIcon size={16} aria-hidden="true" /> Смотреть поле
        </button>
        <button
          type="button"
          onClick={onReplay}
          className="flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-400 hover:text-white"
        >
          <Eye size={16} aria-hidden="true" /> Смотреть финал заново
        </button>
      </footer>
    </div>
  );
};
