import React from 'react';
import type { BotInspection, SanitizedGameState } from '@nemesis/shared';
import { DESTINATION_LABELS } from '../endgame/endgameModel';
import { BrainCircuit, X } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { IS_DEV } from '../../utils/env';
import type { BotInspectionEntry } from '../../services/transport/BotController';
import { BOT_DIFFICULTY_LABELS } from '../lobby/lobbyModel';
import { claimText } from '../comms/commsPhrases';
import { playerName } from '../log/gameLogModel';
import {
  DESIRE_LABELS,
  ENGINE_SOURCE_LABELS,
  desireLabel,
  evidenceLabel,
  percent,
  signed,
  traitLabel,
} from '../bots/botLabels';
import { BarList, ChartCard, LineChart } from '../bots/charts';
import { FACTOR_LABELS, candidateLabel, objectiveName, shiftedKnobs } from './botInspectorModel';

const DESTINATIONS = ['EARTH', 'MARS', 'VENUS', 'DEEP_SPACE'] as const;
const COURSE_MARKERS = ['A', 'B', 'C', 'D'] as const;

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
    <h4 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-cyan-400">{title}</h4>
    {children}
  </section>
);

const Character: React.FC<{ entry: BotInspectionEntry }> = ({ entry }) => {
  const { inspection } = entry;
  return (
    <Section title="Характер">
      <p className="text-xs text-slate-300">
        Черты: <b className="text-white">{inspection.traits.map(traitLabel).join(', ')}</b>
        {inspection.alterTraits && (
          <>
            {' '}
            · альтер-эго: <b className="text-white">{inspection.alterTraits.map(traitLabel).join(', ')}</b> (сейчас{' '}
            {inspection.activePersona === 'ALTER' ? 'альтер-эго' : 'основная'})
          </>
        )}
      </p>
      <p className="mt-1 text-xs text-slate-300">
        Сложность: {BOT_DIFFICULTY_LABELS[inspection.difficulty]} · мораль{' '}
        <b className="tabular-nums text-white">{inspection.morale}</b>
      </p>
      <p className="mt-1 text-[11px] text-slate-500">
        Ручки:{' '}
        {shiftedKnobs(inspection)
          .map(({ knob, value }) => `${knob} ×${value.toFixed(2)}`)
          .join(' · ') || 'все по базе'}
      </p>
      {entry.moraleHistory.length > 1 && (
        <div className="mt-2">
          <LineChart
            series={[
              {
                key: 'morale',
                label: 'Мораль',
                slot: 0,
                points: entry.moraleHistory.map((point) => ({ x: point.round, y: point.morale })),
              },
            ]}
            yMin={-100}
            yMax={100}
            yTicks={[-100, -50, 0, 50, 100]}
            xLabel="Раунд"
          />
        </div>
      )}
    </Section>
  );
};

const Beliefs: React.FC<{ inspection: BotInspection }> = ({ inspection }) => (
  <Section title="Убеждения">
    <BarList
      max={1}
      rows={(['1', '2', '3'] as const).map((key) => ({
        key,
        label: `Двигатель №${key}`,
        value: inspection.engines[key].pWorking,
        display: `${percent(inspection.engines[key].pWorking)} · ${ENGINE_SOURCE_LABELS[inspection.engines[key].source]}`,
      }))}
    />
    <p className="mt-2 text-[11px] text-slate-400">
      Координаты: {inspection.coordinatesKnown ? 'карту видел сам' : 'карту не видел'}
    </p>
    <table className="mt-1 w-full text-left text-[11px]">
      <thead className="text-slate-500">
        <tr>
          <th className="font-normal">Маркер</th>
          {DESTINATIONS.map((destination) => (
            <th key={destination} className="font-normal">
              {DESTINATION_LABELS[destination]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="tabular-nums text-slate-200">
        {COURSE_MARKERS.map((marker) => (
          <tr key={marker}>
            <td className="text-slate-400">{marker}</td>
            {DESTINATIONS.map((destination) => (
              <td key={destination}>{percent(inspection.course[marker][destination])}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </Section>
);

const Trust: React.FC<{ inspection: BotInspection; view: SanitizedGameState }> = ({ inspection, view }) => (
  <Section title="Доверие">
    <table className="w-full text-left text-[11px]">
      <thead className="text-slate-500">
        <tr>
          <th className="font-normal">Игрок</th>
          <th className="font-normal">Доверие</th>
          <th className="font-normal">Честность</th>
          <th className="font-normal">Надёжность</th>
          <th className="font-normal">Помощь</th>
          <th className="font-normal">Скепсис</th>
        </tr>
      </thead>
      <tbody className="tabular-nums text-slate-200">
        {inspection.trust.map((row) => (
          <tr key={row.playerId} title={row.evidence.map((item) => evidenceLabel(item.reason)).join('; ')}>
            <td className="text-slate-300">{playerName(view, row.playerId)}</td>
            <td>{percent(row.trust)}</td>
            <td>{percent(row.honesty)}</td>
            <td>{percent(row.reliability)}</td>
            <td>{percent(row.goodwill)}</td>
            <td>{percent(row.skepticism)}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <ul className="mt-2 space-y-0.5 text-[11px] text-slate-400">
      {inspection.objectiveGuesses.map((guess) => (
        <li key={guess.playerId}>
          Цель {playerName(view, guess.playerId)}: «{objectiveName(guess.cardId)}» — {percent(guess.probability)}
        </li>
      ))}
    </ul>
  </Section>
);

const Decision: React.FC<{ inspection: BotInspection; view: SanitizedGameState }> = ({ inspection, view }) => (
  <Section title="Решение">
    <p className="text-xs text-slate-300">
      Желание: <b className="text-white">{inspection.plan ? desireLabel(inspection.plan.desire) : '—'}</b> · опасность
      Комнаты {percent(inspection.danger)} · давление времени {percent(inspection.timePressure)}
    </p>
    <div className="mt-2">
      <BarList
        rows={inspection.tasks.map((task, index) => ({
          key: `${task.kind}-${index}`,
          label: task.reason,
          value: task.weight,
          display: `${task.weight.toFixed(2)} · ${DESIRE_LABELS[task.desire]}`,
        }))}
      />
    </div>
    <table className="mt-3 w-full text-left text-[11px]">
      <thead className="text-slate-500">
        <tr>
          <th className="font-normal">Кандидат</th>
          <th className="font-normal">Полезность</th>
          {Object.values(FACTOR_LABELS).map((label) => (
            <th key={label} className="font-normal">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="tabular-nums text-slate-200">
        {inspection.candidates.map((candidate, index) => (
          <tr key={index} className={index === 0 ? 'text-cyan-200' : ''} title={candidate.task ?? ''}>
            <td className="pr-2 text-slate-300">{candidateLabel(view, candidate)}</td>
            <td>{candidate.utility.toFixed(3)}</td>
            {(Object.keys(FACTOR_LABELS) as (keyof typeof FACTOR_LABELS)[]).map((key) => (
              <td key={key}>{signed(candidate.factors[key])}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </Section>
);

const Conscience: React.FC<{ inspection: BotInspection; view: SanitizedGameState }> = ({ inspection, view }) => (
  <Section title="Ложь и обещания">
    <ul className="space-y-0.5 text-[11px] text-slate-300">
      {inspection.lies.map((lie) => (
        <li key={lie.messageId}>
          Раунд {lie.round}: солгал «{claimText(view, lie.body)}»
        </li>
      ))}
      {inspection.promises.map((promise) => (
        <li key={promise.requestId}>
          Раунд {promise.round}: пообещал {playerName(view, promise.requesterId)} ({promise.topic}){' '}
          {promise.sincere ? 'искренне' : 'не собираясь помогать'}
        </li>
      ))}
      {inspection.lies.length + inspection.promises.length === 0 && <li className="text-slate-500">Пока чисто.</li>}
    </ul>
  </Section>
);

/**
 * ИНСПЕКТОР БОТОВ (план 0.8.0, В8-9-1): черты, мораль, Цели, убеждения, доверие и разбор решения каждого бота.
 * Только dev-сборка: черты ботов скрыты от игроков (Р-8), CI проверяет, что этого текста нет в бандле.
 */
export const BotInspector: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const view = useGameStore((state) => state.view);
  const seating = useGameStore((state) => state.seating);
  const inspectBots = useGameStore((state) => state.inspectBots);
  const entries = React.useMemo(() => (view ? inspectBots() : []), [view, inspectBots]);
  const [selected, setSelected] = React.useState(0);
  if (!IS_DEV || !view) return null;
  const entry = entries[Math.min(selected, entries.length - 1)];
  const labelOf = (botId: string) =>
    `${seating.find((seat) => seat.playerId === botId)?.label ?? botId} · ${playerName(view, botId)}`;

  return (
    <aside
      aria-label="Инспектор ботов"
      className="fixed inset-y-4 right-4 z-50 flex w-[44rem] max-w-[calc(100vw-2rem)] flex-col rounded-xl border border-violet-800/70 bg-slate-950/95 font-mono shadow-2xl backdrop-blur"
    >
      <header className="flex items-center gap-2 border-b border-violet-900/60 px-3 py-2 text-violet-200">
        <BrainCircuit size={14} aria-hidden="true" />
        <span className="text-xs font-bold tracking-wider">ИНСПЕКТОР БОТОВ</span>
        <span className="text-[10px] text-slate-500">только dev-сборка · игроки этого не видят</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          title="Закрыть инспектор"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </header>
      {entries.length === 0 || !entry ? (
        <p className="p-4 text-xs text-slate-400">За столом нет ботов.</p>
      ) : (
        <>
          <nav className="flex flex-wrap gap-1 border-b border-slate-800 px-3 py-2" aria-label="Боты">
            {entries.map((item, index) => (
              <button
                key={item.inspection.botId}
                type="button"
                aria-pressed={item === entry}
                onClick={() => setSelected(index)}
                className={`rounded px-2 py-1 text-[11px] ${
                  item === entry ? 'bg-violet-800/70 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {labelOf(item.inspection.botId)}
              </button>
            ))}
          </nav>
          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            <Character entry={entry} />
            <ChartCard title="Свои Цели">
              <ul className="text-xs text-slate-300">
                {entry.inspection.objectives.map((objective) => (
                  <li key={objective.id}>«{objective.name}»</li>
                ))}
              </ul>
            </ChartCard>
            <Beliefs inspection={entry.inspection} />
            <Trust inspection={entry.inspection} view={view} />
            <Decision inspection={entry.inspection} view={view} />
            <Conscience inspection={entry.inspection} view={view} />
          </div>
        </>
      )}
    </aside>
  );
};
