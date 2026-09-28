import React from 'react';
import { Biohazard, Bug, CheckCircle2, FastForward, HeartPulse, ShieldCheck, Skull } from 'lucide-react';
import type { SanitizedGameState } from '@nemesis/shared';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { usePrefersReducedMotion } from '../board/useBoardAnimations';
import { playerName } from '../log/gameLogModel';
import { InfectionScannerLens, type ScannerPhase } from './InfectionScannerLens';
import { SCAN_OUTCOME_COPY, SCAN_SOURCE_LABELS, type ScanOutcomeCopy } from './scanLabels';
import { collectScanReports, latestLogSequence, scanCardId, scanTally, type ScanReport } from './scanQueueModel';

const SCANNING_MS = 1150;
const REVEAL_MS = 850;

const OUTCOME_STYLES: Record<ScanOutcomeCopy['tone'], { panel: string; title: string; Icon: typeof Bug }> = {
  clean: { panel: 'border-emerald-500/70 bg-emerald-950/50', title: 'text-emerald-200', Icon: CheckCircle2 },
  cured: { panel: 'border-cyan-400/70 bg-cyan-950/50', title: 'text-cyan-100', Icon: ShieldCheck },
  infected: { panel: 'border-red-500/80 bg-red-950/60', title: 'text-red-200', Icon: Bug },
  lethal: { panel: 'border-red-600 bg-black/80', title: 'text-red-400', Icon: Skull },
};

function Heartbeat({ alarmed }: { alarmed: boolean }) {
  return (
    <svg viewBox="0 0 600 40" className="h-8 w-full" aria-hidden="true" preserveAspectRatio="none">
      <path
        d="M0 20 H140 L155 20 L165 6 L178 34 L190 12 L198 20 H330 L345 20 L355 4 L368 36 L380 10 L388 20 H600"
        fill="none"
        stroke={alarmed ? '#ff2d55' : '#22d3ee'}
        strokeWidth="2"
        strokeDasharray="600"
        className={alarmed ? 'motion-safe:animate-scanner-ecg-fast' : 'motion-safe:animate-scanner-ecg'}
      />
    </svg>
  );
}

export function ScanSession({
  report,
  view,
  onDone,
}: {
  report: ScanReport;
  view: SanitizedGameState;
  onDone: () => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const total = report.results.length;
  const finalStep = total * 2;
  const [step, setStep] = React.useState(() => (reducedMotion || total === 0 ? finalStep : 0));
  const containerRef = React.useRef<HTMLDivElement>(null);
  const finished = step >= finalStep;

  useFocusTrap(containerRef, { onEscape: () => (finished ? onDone() : setStep(finalStep)) });

  React.useEffect(() => {
    if (finished) return;
    const timer = window.setTimeout(() => setStep((value) => value + 1), step % 2 === 0 ? SCANNING_MS : REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [step, finished]);

  const focusIndex = finished ? total - 1 : Math.floor(step / 2);
  const phase: ScannerPhase = !finished && step % 2 === 0 ? 'SCANNING' : 'REVEALED';
  const revealedCount = finished ? total : Math.floor((step + 1) / 2);
  const tally = scanTally(report.results, revealedCount);
  const outcome = SCAN_OUTCOME_COPY[report.outcome];
  const style = OUTCOME_STYLES[outcome.tone];
  const OutcomeIcon = style.Icon;
  const alarmed = tally.infected > 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${alarmed ? 'opacity-100' : 'opacity-40'}`}
        style={{ boxShadow: 'inset 0 0 160px rgba(255, 0, 60, 0.45)' }}
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="scanner-title"
        className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-red-500/40 bg-slate-950 shadow-[0_0_80px_rgba(255,0,60,0.25)] motion-safe:animate-modal-enter"
      >
        <header className="border-b border-red-900/60 px-5 pb-2 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-red-400">
                {SCAN_SOURCE_LABELS[report.source]} · {playerName(view, report.playerId)}
              </p>
              <h2
                id="scanner-title"
                className="font-heading text-3xl tracking-[0.18em] text-white motion-safe:animate-scanner-glitch"
              >
                КРАСНЫЙ СКАНЕР
              </h2>
            </div>
            <dl className="flex gap-2 text-center font-mono" aria-live="polite">
              <div className="rounded-lg border border-slate-800 px-3 py-1">
                <dt className="text-[9px] uppercase tracking-wider text-slate-500">Карт</dt>
                <dd className="text-lg font-bold text-white">
                  {tally.scanned}/{tally.total}
                </dd>
              </div>
              <div className="rounded-lg border border-red-900/70 px-3 py-1">
                <dt className="text-[9px] uppercase tracking-wider text-red-400/80">Инфекция</dt>
                <dd className="text-lg font-bold text-red-300">{tally.infected}</dd>
              </div>
              <div className="rounded-lg border border-emerald-900/70 px-3 py-1">
                <dt className="text-[9px] uppercase tracking-wider text-emerald-400/80">Чисто</dt>
                <dd className="text-lg font-bold text-emerald-300">{tally.clean}</dd>
              </div>
            </dl>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <HeartPulse size={14} className={alarmed ? 'text-red-400' : 'text-cyan-400'} aria-hidden="true" />
            <Heartbeat alarmed={alarmed} />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col items-center gap-5 overflow-y-auto px-5 py-6">
          {total === 0 ? (
            <p className="py-10 text-sm text-slate-400">Карт Заражения для сканирования не было.</p>
          ) : (
            <InfectionScannerLens
              key={`${focusIndex}-${phase}`}
              cardId={scanCardId(report, focusIndex)}
              result={report.results[focusIndex]!}
              phase={phase}
              size="lg"
            />
          )}

          {total > 1 && (
            <ol className="flex flex-wrap justify-center gap-1.5" aria-label="Очередь сканирования">
              {report.results.map((result, index) => {
                const done = index < revealedCount;
                const current = index === focusIndex && !finished;
                return (
                  <li
                    key={index}
                    aria-current={current ? 'step' : undefined}
                    className={`flex h-8 w-6 items-center justify-center rounded border text-[10px] font-bold transition ${
                      !done
                        ? current
                          ? 'border-red-400 bg-red-950/60 text-red-200'
                          : 'border-slate-700 bg-slate-900 text-slate-600'
                        : result === 'INFECTED'
                          ? 'border-red-500 bg-red-600 text-white'
                          : 'border-emerald-600 bg-emerald-950 text-emerald-300'
                    }`}
                  >
                    {done ? (result === 'INFECTED' ? '✖' : '✓') : index + 1}
                  </li>
                );
              })}
            </ol>
          )}

          {finished && (
            <section
              role="status"
              className={`flex w-full max-w-xl items-start gap-4 rounded-2xl border-2 p-4 motion-safe:animate-scanner-reveal ${style.panel}`}
            >
              <span className={report.outcome === 'LARVA_PLACED' ? 'motion-safe:animate-larva-throb' : ''}>
                <OutcomeIcon size={40} className={style.title} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className={`font-heading text-2xl tracking-[0.12em] ${style.title}`}>{outcome.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-200">{outcome.detail}</p>
                {report.removedCount > 0 && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                    <Biohazard size={12} aria-hidden="true" /> Удалено из игры карт Заражения: {report.removedCount}
                  </p>
                )}
              </div>
            </section>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-800 px-5 py-3">
          {!finished ? (
            <button
              type="button"
              onClick={() => setStep(finalStep)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-red-500 hover:text-white"
            >
              <FastForward size={14} aria-hidden="true" /> Показать результат
            </button>
          ) : (
            <button
              type="button"
              onClick={onDone}
              className="rounded-xl bg-red-600 px-6 py-2 font-heading text-sm font-bold uppercase tracking-wider text-white shadow-lg transition hover:bg-red-500 active:scale-95"
            >
              Продолжить
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

interface ScanTracker {
  gameId: string;
  log: SanitizedGameState['gameLog'];
  seen: number;
}

export const InfectionScanOverlay: React.FC<{ view: SanitizedGameState }> = ({ view }) => {
  const [tracker, setTracker] = React.useState<ScanTracker>(() => ({
    gameId: view.meta.gameId,
    log: view.gameLog,
    seen: latestLogSequence(view.gameLog),
  }));
  const [queue, setQueue] = React.useState<ScanReport[]>([]);

  if (view.gameLog !== tracker.log) {
    const sameGame = view.meta.gameId === tracker.gameId;
    const fresh = sameGame ? collectScanReports(view.gameLog, tracker.seen) : [];
    setTracker({ gameId: view.meta.gameId, log: view.gameLog, seen: latestLogSequence(view.gameLog) });
    if (!sameGame) setQueue([]);
    else if (fresh.length > 0) setQueue((current) => [...current, ...fresh]);
  }

  const current = queue[0];
  if (!current) return null;
  return (
    <ScanSession key={current.key} report={current} view={view} onDone={() => setQueue((items) => items.slice(1))} />
  );
};
