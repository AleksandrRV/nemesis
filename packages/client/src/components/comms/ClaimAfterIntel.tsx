import React from 'react';
import type { CommsDraft, CourseMarker, Destination, EngineNumber, SanitizedGameState } from '@nemesis/shared';
import { COORDINATE_CARDS } from '@nemesis/shared';
import { Megaphone, VolumeX } from 'lucide-react';
import type { ClaimableScene } from './claimSceneModel';
import { roomLabel } from '../log/gameLogModel';
import { DESTINATION_OPTIONS, MARKER_OPTIONS, roomTypeOptions } from './composerModel';
import { useCommsSender } from './useCommsSender';

function Choice<Value extends string>({
  value,
  current,
  label,
  seen,
  tone = 'cyan',
  onPick,
}: {
  value: Value;
  current: Value | undefined;
  label: string;
  seen?: boolean;
  tone?: 'cyan' | 'red' | 'emerald';
  onPick: (value: Value | undefined) => void;
}) {
  const active = current === value;
  const tones = {
    cyan: 'border-cyan-400 bg-cyan-900/60 text-cyan-50',
    red: 'border-red-400 bg-red-900/60 text-red-50',
    emerald: 'border-emerald-400 bg-emerald-900/60 text-emerald-50',
  };
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onPick(active ? undefined : value)}
      className={`relative rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
        active ? `${tones[tone]} scale-105` : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
      }`}
    >
      {label}
      {seen && (
        <span className="absolute -right-1.5 -top-2 rounded bg-slate-700 px-1 text-[8px] uppercase tracking-wider text-slate-200">
          видели
        </span>
      )}
    </button>
  );
}

type EngineChoice = 'WORKING' | 'DAMAGED';
type DeedChoice = 'REPAIRED' | 'DAMAGED' | 'UNTOUCHED';

function EngineClaims({
  engines,
  choices,
  onChoose,
}: {
  engines: { engineNumber: EngineNumber; isWorking: boolean }[];
  choices: Partial<Record<EngineNumber, EngineChoice>>;
  onChoose: (engineNumber: EngineNumber, choice: EngineChoice | undefined) => void;
}) {
  return (
    <ul className="space-y-2">
      {engines.map((engine) => (
        <li key={engine.engineNumber} className="flex flex-wrap items-center justify-center gap-2">
          <span className="w-28 text-right text-xs text-slate-400">Двигатель №{engine.engineNumber}:</span>
          <Choice
            value="WORKING"
            current={choices[engine.engineNumber]}
            label="Заявить: Исправен"
            tone="emerald"
            seen={engine.isWorking}
            onPick={(choice) => onChoose(engine.engineNumber, choice)}
          />
          <Choice
            value="DAMAGED"
            current={choices[engine.engineNumber]}
            label="Заявить: Сломан"
            tone="red"
            seen={!engine.isWorking}
            onPick={(choice) => onChoose(engine.engineNumber, choice)}
          />
        </li>
      ))}
    </ul>
  );
}

function engineDrafts(choices: Partial<Record<EngineNumber, EngineChoice>>): CommsDraft[] {
  return (Object.entries(choices) as [string, EngineChoice | undefined][]).flatMap(([engineNumber, status]) =>
    status
      ? [
          {
            kind: 'CLAIM',
            to: 'ALL',
            body: { topic: 'ENGINE_STATUS', engineNumber: Number(engineNumber) as EngineNumber, status },
          },
        ]
      : [],
  );
}

/** Окно после Проверки и ремонта (В8-4-4): заявить правду, солгать или промолчать — решает игрок. */
export const ClaimAfterIntel: React.FC<{ scene: ClaimableScene; view: SanitizedGameState; onDone: () => void }> = ({
  scene,
  view,
  onDone,
}) => {
  const sender = useCommsSender(view);
  const [engineChoices, setEngineChoices] = React.useState<Partial<Record<EngineNumber, EngineChoice>>>({});
  const [deed, setDeed] = React.useState<DeedChoice | undefined>();
  const [marker, setMarker] = React.useState<CourseMarker>(view.ship.coordinates.currentCourseMarker);
  const [destination, setDestination] = React.useState<Destination | undefined>();
  const [roomType, setRoomType] = React.useState(scene.kind === 'OBSERVATION' ? scene.roomDefinitionId : '');

  const chooseEngine = (engineNumber: EngineNumber, choice: EngineChoice | undefined) =>
    setEngineChoices((current) => ({ ...current, [engineNumber]: choice }));

  let drafts: CommsDraft[] = [];
  let body: React.ReactNode = null;
  if (scene.kind === 'ENGINES') {
    drafts = engineDrafts(engineChoices);
    body = <EngineClaims engines={scene.engines} choices={engineChoices} onChoose={chooseEngine} />;
  }
  if (scene.kind === 'ENGINE_TOGGLED') {
    drafts = [
      ...(deed
        ? [
            {
              kind: 'CLAIM',
              to: 'ALL',
              body: { topic: 'ENGINE_DEED', engineNumber: scene.engineNumber, deed },
            } as CommsDraft,
          ]
        : []),
      ...engineDrafts(engineChoices),
    ];
    body = (
      <div className="space-y-2">
        <div className="flex flex-wrap justify-center gap-2">
          <Choice
            value="REPAIRED"
            current={deed}
            label="Я починил"
            tone="emerald"
            seen={scene.orderChanged && scene.isWorking}
            onPick={setDeed}
          />
          <Choice
            value="DAMAGED"
            current={deed}
            label="Я повредил"
            tone="red"
            seen={scene.orderChanged && !scene.isWorking}
            onPick={setDeed}
          />
          <Choice value="UNTOUCHED" current={deed} label="Я не трогал" seen={!scene.orderChanged} onPick={setDeed} />
        </div>
        <EngineClaims
          engines={[{ engineNumber: scene.engineNumber, isWorking: scene.isWorking }]}
          choices={engineChoices}
          onChoose={chooseEngine}
        />
      </div>
    );
  }
  if (scene.kind === 'COORDINATES') {
    const card = COORDINATE_CARDS.find((entry) => entry.id === scene.cardId);
    drafts = destination ? [{ kind: 'CLAIM', to: 'ALL', body: { topic: 'COORDINATES', marker, destination } }] : [];
    body = (
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-xs text-slate-400">Маркер:</span>
          {MARKER_OPTIONS.map((option) => (
            <Choice
              key={option.value}
              value={option.value}
              current={marker}
              label={option.label}
              onPick={(value) => value && setMarker(value)}
            />
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {DESTINATION_OPTIONS.map((option) => (
            <Choice
              key={option.value}
              value={option.value}
              current={destination}
              label={option.label}
              seen={card?.destinations[marker] === option.value}
              onPick={setDestination}
            />
          ))}
        </div>
      </div>
    );
  }
  if (scene.kind === 'OBSERVATION') {
    drafts = roomType
      ? [{ kind: 'CLAIM', to: 'ALL', body: { topic: 'ROOM_IDENTITY', roomId: scene.roomId, definitionId: roomType } }]
      : [];
    body = (
      <label className="flex items-center justify-center gap-2 text-xs text-slate-300">
        {roomLabel(view, scene.roomId)} — это
        <select
          value={roomType}
          onChange={(event) => setRoomType(event.target.value)}
          className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
        >
          {roomTypeOptions().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
              {option.value === scene.roomDefinitionId ? ' (видели)' : ''}
            </option>
          ))}
        </select>
      </label>
    );
  }

  const overLimit = sender.canSpeakNow && drafts.length > sender.ordinaryLeft;
  const announce = () => {
    if (sender.canSpeakNow) sender.send(drafts);
    else sender.queue(drafts);
    onDone();
  };

  return (
    <section
      aria-label="Заявить в Рации"
      className="w-full max-w-lg space-y-3 rounded-2xl border border-cyan-500/30 bg-slate-950/90 p-4 motion-safe:animate-step-enter"
      style={{ animationDelay: '1800ms' }}
    >
      <h3 className="flex items-center justify-center gap-2 font-heading text-sm uppercase tracking-[0.3em] text-cyan-200">
        <Megaphone size={15} aria-hidden="true" /> Сказать в эфир?
      </h3>
      {body}
      <p className="text-center text-[11px] text-slate-500">
        {sender.canSpeakNow
          ? `Правду говорить необязательно. Сообщений в этот ход: ${sender.ordinaryLeft}.`
          : 'Ход уже перешёл: Заявление уйдёт в эфир в начале вашего следующего хода.'}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={drafts.length === 0 || overLimit}
          onClick={announce}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-cyan-500 py-2 text-xs font-bold uppercase tracking-wider text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
        >
          <Megaphone size={14} aria-hidden="true" /> {sender.canSpeakNow ? 'Заявить' : 'Заявить в свой ход'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800 py-2 text-xs font-bold uppercase tracking-wider text-slate-200 transition hover:bg-slate-700"
        >
          <VolumeX size={14} aria-hidden="true" /> Промолчать
        </button>
      </div>
    </section>
  );
};
