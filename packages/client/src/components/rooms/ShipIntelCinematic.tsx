import React from 'react';
import { ArrowRightLeft, Cog, EyeOff, Navigation, Radar, Siren, Wind } from 'lucide-react';
import type { SanitizedGameState } from '@nemesis/shared';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { DESTINATION_LABELS, courseRow } from '../endgame/endgameModel';
import { playerName, roomLabel } from '../log/gameLogModel';
import { roomDefinitionName } from '../log/roomNames';
import { viewerPlayer } from '../objectives/objectiveModel';
import { latestLogSequence } from '../scanner/scanQueueModel';
import { collectShipIntelScenes, type ShipIntelScene } from './shipIntelScenes';

const delay = (ms: number): React.CSSProperties => ({ animationDelay: `${ms}ms` });

const DEBRIS_ANGLES = Array.from({ length: 18 }, (_, index) => index * 20);

const EFFECT_NAMES = {
  FIRE: 'Пожар',
  MALFUNCTION: 'Неисправность',
  SLIME: 'Слизь',
  DOORS: 'Двери',
  DANGER: 'Опасность',
  SILENCE: 'Тишина',
} as const;

const Title: React.FC<{ icon: React.ReactNode; text: string; tone: string }> = ({ icon, text, tone }) => (
  <h2
    id="ship-intel-title"
    className={`flex items-center justify-center gap-2 text-center font-heading text-2xl uppercase tracking-[0.16em] motion-safe:animate-objective-glitch-in sm:text-3xl ${tone}`}
  >
    {icon}
    {text}
  </h2>
);

const SecretNote: React.FC = () => (
  <p className="flex items-center gap-1.5 text-xs text-slate-400 motion-safe:animate-step-enter" style={delay(1600)}>
    <EyeOff size={13} aria-hidden="true" /> Видно только вам. Другие знают лишь, что вы проверяли, — говорить правду
    необязательно.
  </p>
);

function EnginesScene({ scene }: { scene: Extract<ShipIntelScene, { kind: 'ENGINES' }> }) {
  return (
    <>
      <Title icon={<Cog size={28} aria-hidden="true" />} text="Состояние Двигателей" tone="text-cyan-100" />
      <ul className="flex flex-wrap justify-center gap-4" aria-label="Проверенные Двигатели">
        {scene.engines.map((engine, index) => (
          <li
            key={engine.engineNumber}
            className={`flex h-36 w-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 motion-safe:animate-endgame-flip ${
              engine.isWorking
                ? 'border-emerald-400/70 bg-emerald-950/60 text-emerald-200'
                : 'border-red-500/70 bg-red-950/60 text-red-200'
            }`}
            style={delay(250 + index * 450)}
            aria-label={`Двигатель ${engine.engineNumber}: ${engine.isWorking ? 'Исправен' : 'Неисправен'}`}
          >
            <Cog size={30} aria-hidden="true" className={engine.isWorking ? 'motion-safe:animate-spin' : ''} />
            <span className="font-heading text-2xl tracking-widest">#0{engine.engineNumber}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {engine.isWorking ? 'Исправен' : 'Неисправен'}
            </span>
          </li>
        ))}
      </ul>
      <SecretNote />
    </>
  );
}

function CoordinatesScene({
  scene,
  view,
}: {
  scene: Extract<ShipIntelScene, { kind: 'COORDINATES' }>;
  view: SanitizedGameState;
}) {
  const current = view.ship.coordinates.currentCourseMarker;
  return (
    <>
      <Title icon={<Navigation size={28} aria-hidden="true" />} text="Карта Координат" tone="text-amber-100" />
      <div
        className="grid w-full max-w-md grid-cols-2 gap-2 rounded-2xl border-2 border-amber-400/50 bg-slate-950 p-3 motion-safe:animate-endgame-flip"
        aria-label="Координаты и пункты назначения"
      >
        {courseRow(scene.cardId).map(({ marker, destination }, index) => (
          <div
            key={marker}
            className={`flex items-center gap-3 rounded-xl border p-3 motion-safe:animate-step-enter ${
              marker === current
                ? 'border-amber-300 bg-amber-950/50 motion-safe:animate-quest-ready-glow'
                : 'border-slate-800 bg-slate-900/60'
            }`}
            style={delay(500 + index * 180)}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-600 font-heading text-xl text-white">
              {marker}
            </span>
            <span
              className={`text-sm font-semibold ${destination === 'EARTH' ? 'text-emerald-200' : 'text-slate-200'}`}
            >
              {DESTINATION_LABELS[destination]}
            </span>
            {marker === current && <span className="ml-auto text-[10px] font-bold uppercase text-amber-300">Курс</span>}
          </div>
        ))}
      </div>
      <SecretNote />
    </>
  );
}

function CourseScene({ scene }: { scene: Extract<ShipIntelScene, { kind: 'COURSE' }> }) {
  return (
    <>
      <Title icon={<Navigation size={28} aria-hidden="true" />} text="Курс изменён" tone="text-amber-100" />
      <div className="flex items-center gap-3" aria-label={`Маркер Курса: ${scene.fromMarker} → ${scene.toMarker}`}>
        {(['A', 'B', 'C', 'D'] as const).map((marker) => (
          <span
            key={marker}
            className={`flex h-14 w-14 items-center justify-center rounded-full border-2 font-heading text-2xl transition ${
              marker === scene.toMarker
                ? 'border-amber-300 bg-amber-900/60 text-white motion-safe:animate-scanner-stamp'
                : marker === scene.fromMarker
                  ? 'border-slate-500 text-slate-500 line-through'
                  : 'border-slate-700 text-slate-400'
            }`}
            style={marker === scene.toMarker ? delay(500) : undefined}
          >
            {marker}
          </span>
        ))}
      </div>
      <p className="text-sm text-slate-300">Маркер Курса переставлен публично — все видят новые Координаты.</p>
    </>
  );
}

function ObservationScene({
  scene,
  view,
}: {
  scene: Extract<ShipIntelScene, { kind: 'OBSERVATION' }>;
  view: SanitizedGameState;
}) {
  const name = roomDefinitionName(scene.roomDefinitionId) ?? 'Неизвестная Комната';
  return (
    <>
      <Title icon={<Radar size={28} aria-hidden="true" />} text="Комната Наблюдения" tone="text-sky-100" />
      <div className="relative flex h-56 w-56 items-center justify-center overflow-hidden rounded-full border-2 border-sky-400/60 bg-sky-950/40 shadow-[0_0_50px_rgba(56,189,248,0.35)]">
        <span
          className="absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-sky-300/30 to-transparent motion-safe:animate-scanner-scanline"
          aria-hidden="true"
        />
        <div
          className="relative flex flex-col items-center gap-1 text-center motion-safe:animate-scanner-reveal"
          style={delay(600)}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-sky-300">
            {roomLabel(view, scene.roomId)}
          </span>
          <span className="font-heading text-2xl uppercase tracking-wider text-white">{name}</span>
          {scene.effect && <span className="text-xs text-sky-200">Жетон: {EFFECT_NAMES[scene.effect]}</span>}
          {scene.itemsCount !== null && <span className="text-xs text-sky-200">Предметов: {scene.itemsCount}</span>}
        </div>
      </div>
      <SecretNote />
    </>
  );
}

function DecompressionStartedScene({
  scene,
  view,
}: {
  scene: Extract<ShipIntelScene, { kind: 'DECOMPRESSION_STARTED' }>;
  view: SanitizedGameState;
}) {
  return (
    <>
      <div
        className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-2xl border border-red-500/50 bg-red-950/40"
        aria-hidden="true"
      >
        <span className="absolute inset-y-0 left-0 w-1/2 border-r-4 border-red-300 bg-[repeating-linear-gradient(135deg,#1e293b_0px,#1e293b_14px,#7f1d1d_14px,#7f1d1d_22px)] motion-safe:animate-airlock-left" />
        <span className="absolute inset-y-0 right-0 w-1/2 border-l-4 border-red-300 bg-[repeating-linear-gradient(45deg,#1e293b_0px,#1e293b_14px,#7f1d1d_14px,#7f1d1d_22px)] motion-safe:animate-airlock-right" />
        <span className="absolute inset-0 bg-red-600/40 mix-blend-screen motion-safe:animate-objective-alarm" />
        <span className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-red-300 bg-red-950/90 shadow-[0_0_40px_rgba(248,113,113,0.6)]">
          <Siren size={40} className="text-red-100 motion-safe:animate-pod-shake" />
        </span>
      </div>
      <Title icon={<Siren size={28} aria-hidden="true" />} text="Экстренная Декомпрессия" tone="text-red-300" />
      <p className="max-w-md text-center text-sm text-slate-300">
        {playerName(view, scene.playerId)} заблокировал {roomLabel(view, scene.targetRoomId)}. Если до конца Фазы
        Игроков никто не откроет Дверь — всех внутри выбросит в космос.
      </p>
    </>
  );
}

function DecompressionResolvedScene({
  scene,
  view,
}: {
  scene: Extract<ShipIntelScene, { kind: 'DECOMPRESSION_RESOLVED' }>;
  view: SanitizedGameState;
}) {
  const victims = [
    ...scene.killedPlayerIds.map((playerId) => playerName(view, playerId)),
    ...(scene.killedIntruderCount > 0 ? [`Чужих: ${scene.killedIntruderCount}`] : []),
  ];
  return (
    <>
      <div
        className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-2xl border border-sky-500/30 bg-[radial-gradient(circle_at_center,#0c4a6e_0%,#020617_70%)]"
        aria-hidden="true"
      >
        {DEBRIS_ANGLES.map((angle, index) => (
          <span key={angle} className="absolute left-1/2 top-1/2 h-0 w-0" style={{ transform: `rotate(${angle}deg)` }}>
            <span
              className="absolute left-6 top-0 block h-[3px] w-20 rounded-full bg-gradient-to-r from-sky-50 to-transparent opacity-0 motion-safe:animate-vacuum-debris"
              style={delay(((index * 7) % 18) * 60)}
            />
          </span>
        ))}
        <span className="absolute h-24 w-24 rounded-full border-4 border-sky-200/80 motion-safe:animate-endgame-shockwave" />
        <span
          className="absolute h-24 w-24 rounded-full border-2 border-slate-200/60 motion-safe:animate-endgame-shockwave"
          style={delay(250)}
        />
        <Wind size={64} className="relative text-sky-100 motion-safe:animate-pod-shake" />
      </div>
      <Title icon={<Wind size={28} aria-hidden="true" />} text="Шлюзы открыты" tone="text-sky-200" />
      <p className="max-w-md text-center text-sm text-slate-300">
        {roomLabel(view, scene.targetRoomId)}:{' '}
        {victims.length > 0 ? `выброшены в космос — ${victims.join(', ')}.` : 'Комната была пуста.'}
      </p>
    </>
  );
}

function ExchangeScene({
  scene,
  view,
}: {
  scene: Extract<ShipIntelScene, { kind: 'EXCHANGE' }>;
  view: SanitizedGameState;
}) {
  return (
    <>
      <Title icon={<ArrowRightLeft size={28} aria-hidden="true" />} text="Обмен состоялся" tone="text-emerald-200" />
      <ul className="flex w-full max-w-md flex-col gap-2">
        {scene.entries.map((entry, index) => (
          <li
            key={`${entry.fromPlayerId}-${entry.name}-${index}`}
            className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm motion-safe:animate-step-enter"
            style={delay(300 + index * 220)}
          >
            <span className="text-slate-300">{playerName(view, entry.fromPlayerId)}</span>
            <ArrowRightLeft size={14} className="text-emerald-300" aria-hidden="true" />
            <span className="text-slate-300">{playerName(view, entry.toPlayerId)}</span>
            <span className="ml-auto font-semibold text-white">{entry.name ?? 'Предмет'}</span>
            {entry.ammoRemoved > 0 && <span className="text-[10px] text-amber-300">без Боезапаса</span>}
          </li>
        ))}
      </ul>
    </>
  );
}

export function ShipIntelSceneView({
  scene,
  view,
  onDone,
}: {
  scene: ShipIntelScene;
  view: SanitizedGameState;
  onDone: () => void;
}): React.ReactElement {
  const containerRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, { onEscape: onDone });
  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm motion-safe:animate-endgame-curtain">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ship-intel-title"
        className="flex w-full max-w-xl flex-col items-center gap-5"
      >
        {scene.kind === 'ENGINES' && <EnginesScene scene={scene} />}
        {scene.kind === 'COORDINATES' && <CoordinatesScene scene={scene} view={view} />}
        {scene.kind === 'COURSE' && <CourseScene scene={scene} />}
        {scene.kind === 'OBSERVATION' && <ObservationScene scene={scene} view={view} />}
        {scene.kind === 'DECOMPRESSION_STARTED' && <DecompressionStartedScene scene={scene} view={view} />}
        {scene.kind === 'DECOMPRESSION_RESOLVED' && <DecompressionResolvedScene scene={scene} view={view} />}
        {scene.kind === 'EXCHANGE' && <ExchangeScene scene={scene} view={view} />}
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

export const ShipIntelCinematic: React.FC<{ view: SanitizedGameState }> = ({ view }) => {
  const [tracker, setTracker] = React.useState<SceneTracker>(() => ({
    gameId: view.meta.gameId,
    log: view.gameLog,
    seen: latestLogSequence(view.gameLog),
  }));
  const [queue, setQueue] = React.useState<ShipIntelScene[]>([]);

  if (view.gameLog !== tracker.log) {
    const sameGame = view.meta.gameId === tracker.gameId;
    const fresh = sameGame ? collectShipIntelScenes(view.gameLog, tracker.seen, viewerPlayer(view)?.id ?? null) : [];
    setTracker({ gameId: view.meta.gameId, log: view.gameLog, seen: latestLogSequence(view.gameLog) });
    if (!sameGame) setQueue([]);
    else if (fresh.length > 0) setQueue((current) => [...current, ...fresh]);
  }

  const current = queue[0];
  if (!current) return null;
  return (
    <ShipIntelSceneView
      key={current.key}
      scene={current}
      view={view}
      onDone={() => setQueue((items) => items.slice(1))}
    />
  );
};
