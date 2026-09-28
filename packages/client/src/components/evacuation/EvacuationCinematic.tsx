import React from 'react';
import { Rocket, Snowflake } from 'lucide-react';
import type { SanitizedGameState } from '@nemesis/shared';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { playerName } from '../log/gameLogModel';
import { latestLogSequence } from '../scanner/scanQueueModel';
import { collectEvacuationScenes, type EvacuationScene } from './evacuationScenes';

const STREAKS = [8, 18, 27, 39, 52, 61, 73, 84, 92] as const;

function LaunchScene({
  scene,
  view,
}: {
  scene: Extract<EvacuationScene, { kind: 'LAUNCH' }>;
  view: SanitizedGameState;
}) {
  return (
    <>
      <div
        className="relative h-72 w-full overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-b from-slate-950 via-slate-900 to-amber-950/40"
        aria-hidden="true"
      >
        {STREAKS.map((left, index) => (
          <span
            key={left}
            className="absolute top-0 h-16 w-px bg-gradient-to-b from-transparent via-white/80 to-transparent motion-safe:animate-star-streak"
            style={{ left: `${left}%`, animationDelay: `${900 + index * 70}ms` }}
          />
        ))}
        <div
          className="absolute inset-x-0 bottom-6 flex justify-center motion-safe:animate-pod-liftoff"
          style={{ animationDelay: '900ms' }}
        >
          <div className="flex flex-col items-center motion-safe:animate-pod-shake">
            <div className="flex h-24 w-16 flex-col items-center justify-center rounded-t-full rounded-b-lg border-2 border-amber-300 bg-slate-800 shadow-[0_0_30px_rgba(251,191,36,0.4)]">
              <span className="mt-3 h-5 w-5 rounded-full border-2 border-sky-300 bg-sky-900" />
              <span className="mt-2 font-mono text-[10px] font-bold text-amber-200">№{scene.podNumber}</span>
            </div>
            <div className="h-10 w-8 origin-top rounded-b-full bg-gradient-to-b from-amber-200 via-orange-500 to-transparent motion-safe:animate-pod-thrust" />
          </div>
        </div>
      </div>
      <div
        className="flex flex-col items-center gap-1 text-center motion-safe:animate-scanner-reveal"
        style={{ animationDelay: '1500ms' }}
      >
        <h2
          id="evacuation-scene-title"
          className="flex items-center gap-2 font-heading text-2xl tracking-[0.16em] text-amber-200"
        >
          <Rocket size={26} aria-hidden="true" /> КАПСУЛА №{scene.podNumber} СТАРТОВАЛА
        </h2>
        <p className="text-sm text-slate-300">
          {scene.occupantIds.map((id) => playerName(view, id)).join(' и ')} покидает корабль. Итог — при проверке Целей
          в конце игры.
        </p>
      </div>
    </>
  );
}

function HibernationScene({
  scene,
  view,
}: {
  scene: Extract<EvacuationScene, { kind: 'HIBERNATION' }>;
  view: SanitizedGameState;
}) {
  return (
    <>
      <div
        className="relative flex h-72 w-full items-center justify-center overflow-hidden rounded-2xl border border-sky-400/40 bg-gradient-to-b from-slate-950 to-sky-950/60"
        aria-hidden="true"
      >
        <div className="flex h-56 w-32 flex-col items-center justify-center rounded-[3rem] border-2 border-sky-300/80 bg-sky-900/30 shadow-[0_0_40px_rgba(56,189,248,0.35)] motion-safe:animate-cryo-breath">
          <Snowflake size={40} className="text-sky-200" />
          <span className="mt-3 font-mono text-[10px] uppercase tracking-[0.3em] text-sky-200">Стазис</span>
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_40%,rgba(186,230,253,0.35))] motion-safe:animate-cryo-frost" />
      </div>
      <div
        className="flex flex-col items-center gap-1 text-center motion-safe:animate-scanner-reveal"
        style={{ animationDelay: '900ms' }}
      >
        <h2
          id="evacuation-scene-title"
          className="flex items-center gap-2 font-heading text-3xl tracking-[0.18em] text-sky-200"
        >
          <Snowflake size={26} aria-hidden="true" /> АНАБИОЗ
        </h2>
        <p className="text-sm text-slate-300">
          {playerName(view, scene.playerId)} засыпает в Камере. Выживет ли Персонаж — решится в конце игры.
        </p>
      </div>
    </>
  );
}

export function EvacuationSceneView({
  scene,
  view,
  onDone,
}: {
  scene: EvacuationScene;
  view: SanitizedGameState;
  onDone: () => void;
}): React.ReactElement {
  const containerRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, { onEscape: onDone });
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="evacuation-scene-title"
        className="flex w-full max-w-lg flex-col items-center gap-5"
      >
        {scene.kind === 'LAUNCH' ? (
          <LaunchScene scene={scene} view={view} />
        ) : (
          <HibernationScene scene={scene} view={view} />
        )}
        <button
          type="button"
          onClick={onDone}
          className="rounded-xl bg-slate-100 px-6 py-2 font-heading text-sm font-bold uppercase tracking-wider text-slate-950 transition hover:bg-white active:scale-95"
        >
          Продолжить
        </button>
      </div>
    </div>
  );
}

interface SceneTracker {
  gameId: string;
  log: SanitizedGameState['gameLog'];
  seen: number;
}

export const EvacuationCinematic: React.FC<{ view: SanitizedGameState }> = ({ view }) => {
  const [tracker, setTracker] = React.useState<SceneTracker>(() => ({
    gameId: view.meta.gameId,
    log: view.gameLog,
    seen: latestLogSequence(view.gameLog),
  }));
  const [queue, setQueue] = React.useState<EvacuationScene[]>([]);

  if (view.gameLog !== tracker.log) {
    const sameGame = view.meta.gameId === tracker.gameId;
    const fresh = sameGame ? collectEvacuationScenes(view.gameLog, tracker.seen) : [];
    setTracker({ gameId: view.meta.gameId, log: view.gameLog, seen: latestLogSequence(view.gameLog) });
    if (!sameGame) setQueue([]);
    else if (fresh.length > 0) setQueue((current) => [...current, ...fresh]);
  }

  const current = queue[0];
  if (!current) return null;
  return (
    <EvacuationSceneView
      key={current.key}
      scene={current}
      view={view}
      onDone={() => setQueue((items) => items.slice(1))}
    />
  );
};
