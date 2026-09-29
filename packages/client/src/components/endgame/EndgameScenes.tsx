import React from 'react';
import { Biohazard, CheckCircle2, Cog, Navigation, Rocket, ScanLine, Skull, XCircle } from 'lucide-react';
import type { EndgameCharacterResult, EndgameReport, EngineNumber, SanitizedGameState } from '@nemesis/shared';
import { CREW_IDENTITIES } from '../../utils/crewIdentity';
import { ObjectiveCardFace } from '../objectives/ObjectiveCardView';
import { playerNumberHint } from '../objectives/objectiveModel';
import { DESTINATION_LABELS, courseRow, isExplosionFate, shipFateLines, survivalLine } from './endgameModel';

const delay = (ms: number): React.CSSProperties => ({ animationDelay: `${ms}ms` });

export const SceneTitle: React.FC<{ kicker: string; title: string; tone?: 'danger' | 'calm' | 'neutral' }> = ({
  kicker,
  title,
  tone = 'neutral',
}) => (
  <header className="flex flex-col items-center gap-1 text-center">
    <span className="text-[11px] font-bold uppercase tracking-[0.35em] text-slate-400 motion-safe:animate-step-enter">
      {kicker}
    </span>
    <h2
      id="endgame-scene-title"
      className={`font-heading text-4xl uppercase tracking-[0.22em] motion-safe:animate-objective-glitch-in sm:text-5xl ${
        tone === 'danger' ? 'text-red-400' : tone === 'calm' ? 'text-cyan-200' : 'text-white'
      }`}
    >
      {title}
    </h2>
  </header>
);

const Verdict: React.FC<{ ok: boolean; children: React.ReactNode; wait: number }> = ({ ok, children, wait }) => (
  <p
    role="status"
    className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold motion-safe:animate-endgame-verdict ${
      ok ? 'border-emerald-500/60 bg-emerald-950/60 text-emerald-200' : 'border-red-500/60 bg-red-950/60 text-red-200'
    }`}
    style={delay(wait)}
  >
    {ok ? <CheckCircle2 size={18} aria-hidden="true" /> : <XCircle size={18} aria-hidden="true" />}
    {children}
  </p>
);

export const ShipFateScene: React.FC<{ report: EndgameReport }> = ({ report }) => {
  const exploded = isExplosionFate(report);
  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className="relative flex h-56 w-full max-w-xl items-center justify-center overflow-hidden [mask-image:radial-gradient(closest-side,black_55%,transparent)]"
        aria-hidden="true"
      >
        {exploded ? (
          <>
            <span className="absolute h-40 w-40 rounded-full bg-orange-500/70 blur-2xl motion-safe:animate-endgame-flash" />
            <span className="absolute h-24 w-24 rounded-full border-4 border-orange-300 motion-safe:animate-endgame-shockwave" />
            <span
              className="absolute h-24 w-24 rounded-full border-2 border-red-400 motion-safe:animate-endgame-shockwave"
              style={delay(300)}
            />
            <Skull size={72} className="relative text-orange-100 motion-safe:animate-pod-shake" />
          </>
        ) : (
          <>
            {Array.from({ length: 14 }, (_, index) => (
              <span
                key={index}
                className="absolute h-px w-40 bg-gradient-to-r from-transparent via-cyan-200 to-transparent motion-safe:animate-star-streak"
                style={{ top: `${8 + index * 6.5}%`, left: `${(index * 37) % 70}%`, ...delay(index * 60) }}
              />
            ))}
            <span className="relative -rotate-45">
              <Rocket size={72} className="text-cyan-100 motion-safe:animate-pod-thrust" />
            </span>
          </>
        )}
      </div>
      <SceneTitle
        kicker="Окончание игры · стр. 11"
        title={exploded ? 'Корабль уничтожен' : 'Гиперпрыжок'}
        tone={exploded ? 'danger' : 'calm'}
      />
      <ul className="flex max-w-xl flex-col gap-2 text-center text-sm text-slate-300">
        {shipFateLines(report).map((line, index) => (
          <li key={line} className="motion-safe:animate-step-enter" style={delay(500 + index * 350)}>
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
};

export const EnginesScene: React.FC<{ report: EndgameReport }> = ({ report }) => {
  const check = report.engineCheck!;
  return (
    <div className="flex flex-col items-center gap-6">
      <SceneTitle kicker="Проверка 1 · стр. 11" title="Проверка Двигателей" />
      <p className="max-w-lg text-center text-sm text-slate-400">
        Верхние жетоны во всех Машинных Отсеках переворачиваются. Два Неисправных из трёх — корабль взрывается.
      </p>
      <ul className="flex flex-wrap justify-center gap-5" aria-label="Двигатели">
        {([1, 2, 3] as EngineNumber[]).map((engine, index) => {
          const working = check.engines[engine];
          return (
            <li
              key={engine}
              className={`flex h-36 w-32 flex-col items-center justify-center gap-2 rounded-2xl border-2 motion-safe:animate-endgame-flip ${
                working
                  ? 'border-emerald-400/70 bg-emerald-950/60 text-emerald-200'
                  : 'border-red-500/70 bg-red-950/60 text-red-200'
              }`}
              style={delay(300 + index * 550)}
              aria-label={`Двигатель ${engine}: ${working ? 'Исправен' : 'Неисправен'}`}
            >
              <Cog size={34} aria-hidden="true" className={working ? 'motion-safe:animate-spin' : ''} />
              <span className="font-heading text-2xl tracking-widest">#0{engine}</span>
              <span className="text-[11px] font-bold uppercase tracking-widest">
                {working ? 'Исправен' : 'Неисправен'}
              </span>
            </li>
          );
        })}
      </ul>
      <Verdict ok={!check.shipExploded} wait={2100}>
        {check.shipExploded
          ? `Неисправно ${check.failedCount} из 3 — корабль взрывается, Анабиоз гибнет.`
          : `Неисправно ${check.failedCount} из 3 — корабль цел.`}
      </Verdict>
    </div>
  );
};

export const CourseScene: React.FC<{ report: EndgameReport }> = ({ report }) => {
  const check = report.courseCheck!;
  return (
    <div className="flex flex-col items-center gap-6">
      <SceneTitle kicker="Проверка 2 · стр. 11" title="Проверка Курса" />
      <div
        className="grid w-full max-w-md grid-cols-2 gap-2 rounded-2xl border-2 border-cyan-500/50 bg-slate-950 p-3 motion-safe:animate-endgame-flip"
        style={delay(200)}
        aria-label="Карта Координат"
      >
        {courseRow(check.coordinateCardId).map(({ marker, destination }) => {
          const chosen = marker === check.courseMarker;
          return (
            <div
              key={marker}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                chosen
                  ? 'border-amber-300 bg-amber-950/50 shadow-[0_0_24px_rgba(252,211,77,0.4)] motion-safe:animate-quest-ready-glow'
                  : 'border-slate-800 bg-slate-900/60 opacity-60'
              }`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-600 font-heading text-xl text-white">
                {marker}
              </span>
              <span className="text-sm font-semibold text-slate-100">{DESTINATION_LABELS[destination]}</span>
              {chosen && <Navigation size={16} className="ml-auto text-amber-300" aria-label="Маркер Курса" />}
            </div>
          );
        })}
      </div>
      <Verdict ok={check.destination === 'EARTH'} wait={1300}>
        Курс {check.courseMarker}: {DESTINATION_LABELS[check.destination]}.
        {check.destination === 'EARTH'
          ? ' Корабль идёт домой.'
          : ' Все в Анабиозе погибают (кроме «Карантина» при Марсе).'}
      </Verdict>
    </div>
  );
};

export const InfectionScene: React.FC<{ view: SanitizedGameState; result: EndgameCharacterResult }> = ({
  view,
  result,
}) => {
  const check = result.infection!;
  const player = view.players[result.playerId]!;
  return (
    <div className="flex flex-col items-center gap-6">
      <SceneTitle kicker={`Проверка 3 · ${player.name}`} title="Проверка Заражения" tone="danger" />
      <p className="flex items-center gap-2 text-sm text-slate-300 motion-safe:animate-step-enter">
        <ScanLine size={16} className="text-red-400" aria-hidden="true" />
        {check.hadLarva
          ? 'На Планшете Личинка — сканирование пропускается, сразу 4 карты.'
          : `Просканировано карт Заражения: ${check.scannedCount}. ${check.infectedFound ? 'Найдена ИНФЕКЦИЯ!' : 'ИНФЕКЦИИ нет.'}`}
      </p>
      {check.drawn && (
        <ul className="flex flex-wrap justify-center gap-3" aria-label="Взятые карты">
          {check.drawn.map((card, index) => (
            <li
              key={index}
              className={`flex h-32 w-24 flex-col items-center justify-center gap-2 rounded-xl border-2 motion-safe:animate-endgame-flip ${
                card === 'CONTAMINATION'
                  ? 'border-fuchsia-500 bg-fuchsia-950/70 text-fuchsia-200'
                  : 'border-cyan-700 bg-slate-900 text-cyan-200'
              }`}
              style={delay(600 + index * 450)}
            >
              {card === 'CONTAMINATION' ? (
                <Biohazard size={30} aria-hidden="true" />
              ) : (
                <span className="font-heading text-3xl">⌁</span>
              )}
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {card === 'CONTAMINATION' ? 'Заражение' : 'Действие'}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Verdict ok={check.survived} wait={check.drawn ? 2600 : 900}>
        {check.survived ? `${player.name}: паразита нет — выжил.` : `${player.name}: паразит вырвался наружу — погиб.`}
      </Verdict>
    </div>
  );
};

export const ObjectivesScene: React.FC<{ view: SanitizedGameState; result: EndgameCharacterResult }> = ({
  view,
  result,
}) => {
  const player = view.players[result.playerId]!;
  const identity = CREW_IDENTITIES[player.characterClass];
  return (
    <div className="flex flex-col items-center gap-5">
      <SceneTitle kicker={`Проверка 4 · ${identity.label} · ${survivalLine(result)}`} title="Проверка Целей" />
      <ul className="flex flex-wrap justify-center gap-5">
        {result.objectiveResults.map((entry, index) => {
          const met = entry.metConditionIndex !== null;
          return (
            <li
              key={entry.objective.id}
              className="relative mb-5 motion-safe:animate-objective-card-deal"
              style={delay(index * 300)}
            >
              <ObjectiveCardFace
                card={entry.objective}
                compact
                playerHints={entry.objective.conditions.map((condition, conditionIndex) =>
                  conditionIndex === entry.metConditionIndex ? '✓ Выполнено' : playerNumberHint(view, condition),
                )}
              />
              <span className="pointer-events-none absolute inset-x-0 -bottom-4 flex justify-center">
                <span
                  className={`rounded-md border-4 bg-slate-950/90 px-3 py-0.5 font-heading text-xl uppercase tracking-[0.25em] motion-safe:animate-scanner-stamp motion-reduce:-rotate-6 ${
                    met ? 'border-emerald-400 text-emerald-300' : 'border-red-500 text-red-300'
                  }`}
                  style={delay(900 + index * 300)}
                >
                  {met ? 'Выполнена' : 'Провалена'}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <Verdict ok={result.isWinner} wait={1500}>
        {result.isWinner ? `${player.name} побеждает!` : `${player.name} выжил, но Цель не выполнена.`}
      </Verdict>
    </div>
  );
};
