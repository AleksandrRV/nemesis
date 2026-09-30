import React from 'react';
import type { SimulationRecord, SimulationSummary } from '@nemesis/shared';
import { ArrowLeft, Cpu, RotateCcw, Square } from 'lucide-react';
import { createSeed } from '../../services/session/seed';
import { SERIES_SIZE, type SimulationRequest } from '../../services/simulation/simulationJobs';
import { startSimulation, type SimulationJob } from '../../services/simulation/SimulationRunner';
import { BOT_DIFFICULTY_LABELS } from '../lobby/lobbyModel';
import { SeriesReport } from './SeriesReport';
import { SimulationSetup } from './SimulationSetup';
import { SingleGameReport } from './SingleGameReport';
import type { SimulationConfig } from './simulationModel';

type Stage =
  | { kind: 'SETUP' }
  | { kind: 'RUNNING'; done: number; total: number; label: string; secondsLeft: number | null }
  | { kind: 'SINGLE'; record: SimulationRecord }
  | { kind: 'SERIES' }
  | { kind: 'FAILED'; reason: string };

interface SeriesResult {
  summary: SimulationSummary;
  records: SimulationRecord[];
}

function secondsLeft(startedAt: number, done: number, total: number): number | null {
  if (done === 0) return null;
  return Math.ceil((((Date.now() - startedAt) / done) * (total - done)) / 1000);
}

const Progress: React.FC<{
  done: number;
  total: number;
  label: string;
  secondsLeft: number | null;
  onCancel: () => void;
}> = ({ done, total, label, secondsLeft: left, onCancel }) => (
  <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 py-10 text-center" role="status">
    <Cpu size={36} aria-hidden="true" className="text-violet-300 motion-safe:animate-pulse" />
    <p className="font-heading text-lg tracking-widest text-white">{label}</p>
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
      <div
        className="h-full rounded-full bg-violet-400 motion-safe:transition-[width] motion-safe:duration-300"
        style={{ width: `${total === 0 ? 0 : (done / total) * 100}%` }}
      />
    </div>
    <p className="text-xs tabular-nums text-slate-400">
      {total > 1 ? `Партия ${done} из ${total}` : 'Боты играют партию…'}
      {total > 1 && left !== null && ` · осталось около ${left} с`}
    </p>
    <button
      type="button"
      onClick={onCancel}
      className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-4 py-1.5 text-xs text-slate-300 transition hover:border-red-700 hover:text-red-200"
    >
      <Square size={12} aria-hidden="true" /> Остановить
    </button>
  </div>
);

/** Окно симуляции (план 0.8.0, В8-9): партии из одних ботов — одна подробно или серия со статистикой. */
export const SimulationScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [config, setConfig] = React.useState<SimulationConfig>(() => ({
    botCount: 4,
    difficulty: 'CREW',
    seed: createSeed(),
    mode: 'SERIES',
  }));
  const [stage, setStage] = React.useState<Stage>({ kind: 'SETUP' });
  const [series, setSeries] = React.useState<SeriesResult | null>(null);
  const job = React.useRef<SimulationJob | null>(null);

  React.useEffect(() => () => job.current?.cancel(), []);

  const run = (request: SimulationRequest, label: string) => {
    job.current?.cancel();
    const startedAt = Date.now();
    const total = request.kind === 'SERIES' ? request.count : 1;
    setStage({ kind: 'RUNNING', done: 0, total, label, secondsLeft: null });
    job.current = startSimulation(request, (response) => {
      switch (response.kind) {
        case 'PROGRESS':
          setStage({
            kind: 'RUNNING',
            done: response.done,
            total: response.total,
            label,
            secondsLeft: secondsLeft(startedAt, response.done, response.total),
          });
          return;
        case 'SINGLE_DONE':
          setStage({ kind: 'SINGLE', record: response.record });
          return;
        case 'SERIES_DONE':
          setSeries({ summary: response.summary, records: response.records });
          setStage({ kind: 'SERIES' });
          return;
        case 'FAILED':
          setStage({ kind: 'FAILED', reason: response.reason });
      }
    });
  };

  const start = () => {
    const seed = config.seed.trim();
    const { botCount, difficulty } = config;
    if (config.mode === 'SINGLE') {
      setSeries(null);
      run({ kind: 'SINGLE', seed, botCount, difficulty }, 'Одна партия ботов');
    } else {
      run(
        { kind: 'SERIES', baseSeed: seed, count: SERIES_SIZE, botCount, difficulty },
        `Серия из ${SERIES_SIZE} партий`,
      );
    }
  };

  const openGame = (seed: string) => {
    const table = series?.summary ?? config;
    run({ kind: 'SINGLE', seed, botCount: table.botCount, difficulty: table.difficulty }, `Партия ${seed}`);
  };

  const cancel = () => {
    job.current?.cancel();
    job.current = null;
    setStage(series ? { kind: 'SERIES' } : { kind: 'SETUP' });
  };

  const subtitle = `${config.botCount === 1 ? 'Соло, 1 бот' : `${config.botCount} бота(ов)`} · ${BOT_DIFFICULTY_LABELS[config.difficulty]}`;

  return (
    <section
      aria-labelledby="simulation-title"
      className="flex w-full max-w-6xl flex-col gap-5 motion-safe:animate-lobby-rise"
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.5em] text-violet-300">Лаборатория ботов</span>
          <h2 id="simulation-title" className="mt-1 font-heading text-3xl tracking-[0.25em] text-white sm:text-4xl">
            СИМУЛЯЦИЯ
          </h2>
          {stage.kind !== 'SETUP' && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        <div className="flex gap-2">
          {stage.kind === 'SINGLE' && series && (
            <button
              type="button"
              onClick={() => setStage({ kind: 'SERIES' })}
              className="flex items-center gap-1.5 rounded-lg border border-violet-700 px-3 py-1.5 text-xs text-violet-200 transition hover:bg-violet-950/60"
            >
              <ArrowLeft size={13} aria-hidden="true" /> К статистике серии
            </button>
          )}
          {stage.kind !== 'SETUP' && stage.kind !== 'RUNNING' && (
            <button
              type="button"
              onClick={() => setStage({ kind: 'SETUP' })}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-slate-800"
            >
              <RotateCcw size={13} aria-hidden="true" /> Новая симуляция
            </button>
          )}
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-slate-800"
          >
            <ArrowLeft size={13} aria-hidden="true" /> В лобби
          </button>
        </div>
      </header>

      {stage.kind === 'SETUP' && (
        <SimulationSetup
          config={config}
          onChange={setConfig}
          onRerollSeed={() => setConfig((current) => ({ ...current, seed: createSeed() }))}
          onStart={start}
        />
      )}
      {stage.kind === 'RUNNING' && (
        <Progress
          done={stage.done}
          total={stage.total}
          label={stage.label}
          secondsLeft={stage.secondsLeft}
          onCancel={cancel}
        />
      )}
      {stage.kind === 'SINGLE' && <SingleGameReport record={stage.record} />}
      {stage.kind === 'SERIES' && series && (
        <SeriesReport summary={series.summary} records={series.records} onOpenGame={openGame} />
      )}
      {stage.kind === 'FAILED' && (
        <p role="alert" className="rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-100">
          Симуляция остановилась с ошибкой: {stage.reason}
        </p>
      )}
    </section>
  );
};
