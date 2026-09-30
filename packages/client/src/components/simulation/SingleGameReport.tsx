import React from 'react';
import type { SanitizedGameState, SimulatedBot, SimulationRecord } from '@nemesis/shared';
import { Check, Minus, X } from 'lucide-react';
import { BOT_DIFFICULTY_LABELS } from '../lobby/lobbyModel';
import { DESTINATION_LABELS } from '../endgame/endgameModel';
import { DEATH_CAUSE_LABELS, percent, traitLabel } from '../bots/botLabels';
import { BarList, ChartCard, LineChart, StatTile } from '../bots/charts';
import { seriesSwatch } from '../bots/chartPalette';
import { LogSegments } from '../log/LogSegments';
import { OutcomeBadge } from './outcomeParts';
import { actionRows, characterName, chronicle, gameOverTitle, radioTranscript, survivorsOf } from './simulationModel';

const ObjectiveMark: React.FC<{ met: boolean | null }> = ({ met }) => {
  if (met === true) return <Check size={12} aria-label="выполнена" className="text-emerald-300" />;
  if (met === false) return <X size={12} aria-label="не выполнена" className="text-red-300" />;
  return <Minus size={12} aria-label="не проверялась" className="text-slate-500" />;
};

function deathDetail(bot: SimulatedBot): string | undefined {
  if (!bot.deathCause) return undefined;
  return `${DEATH_CAUSE_LABELS[bot.deathCause]}${bot.deathRound ? `, раунд ${bot.deathRound}` : ''}`;
}

const CrewCard: React.FC<{ bot: SimulatedBot; slot: number }> = ({ bot, slot }) => (
  <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 motion-safe:animate-lobby-rise">
    <header className="flex items-start justify-between gap-2">
      <div>
        <h4 className="flex items-center gap-2 font-heading text-base tracking-wide text-white">
          <span aria-hidden="true" className={`inline-block h-3 w-3 rounded-sm ${seriesSwatch(slot)}`} />
          {bot.characterName}
        </h4>
        <p className="text-[11px] text-slate-500">
          Игрок {bot.orderNumber} · {characterName(bot.characterClass)}
        </p>
      </div>
      <OutcomeBadge outcome={bot.outcome} detail={deathDetail(bot)} />
    </header>
    <div className="mt-3 flex flex-wrap gap-1">
      {bot.traits.map((trait) => (
        <span key={trait} className="rounded bg-violet-900/50 px-1.5 py-0.5 text-[11px] text-violet-100">
          {traitLabel(trait)}
        </span>
      ))}
      {bot.alterTraits && (
        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300">
          альтер-эго: {bot.alterTraits.map(traitLabel).join(', ')}
        </span>
      )}
    </div>
    <p className="mt-2 text-xs text-slate-300">
      Мораль <b className="tabular-nums text-white">{bot.startMorale}</b> →{' '}
      <b className="tabular-nums text-white">{bot.finalMorale}</b>
      {bot.escapeRoute && <> · спасся {bot.escapeRoute === 'POD' ? 'в Капсуле' : 'в Анабиозе'}</>}
    </p>
    <ul className="mt-2 space-y-0.5 text-xs text-slate-300">
      {bot.objectives.map((objective) => (
        <li key={objective.id} className="flex items-center gap-1.5">
          <ObjectiveMark met={objective.met} /> «{objective.name}»
        </li>
      ))}
    </ul>
    <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
      {[
        ['Заявлений', bot.speech.claims],
        ['Лжи / поймано', `${bot.speech.lies} / ${bot.speech.liesExposed}`],
        ['Обещал / сдержал', `${bot.speech.promisesMade} / ${bot.speech.promisesKept}`],
      ].map(([label, value]) => (
        <div key={String(label)} className="rounded-lg bg-slate-950/70 px-1 py-1.5">
          <dt className="text-slate-500">{label}</dt>
          <dd className="font-semibold tabular-nums text-slate-100">{value}</dd>
        </div>
      ))}
    </dl>
    <div className="mt-3">
      <BarList rows={actionRows(bot.actions).slice(0, 4)} />
    </div>
  </article>
);

const TrustMatrix: React.FC<{ bots: readonly SimulatedBot[] }> = ({ bots }) => (
  <table className="w-full text-left text-xs">
    <thead className="text-slate-500">
      <tr>
        <th className="font-normal">Кто → кому</th>
        {bots.map((bot) => (
          <th key={bot.playerId} className="font-normal">
            {bot.characterName}
          </th>
        ))}
      </tr>
    </thead>
    <tbody className="tabular-nums text-slate-200">
      {bots.map((bot) => (
        <tr key={bot.playerId}>
          <td className="text-slate-300">{bot.characterName}</td>
          {bots.map((other) => (
            <td key={other.playerId}>
              {other.playerId === bot.playerId ? '—' : percent(bot.trust[other.playerId] ?? 0)}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

const Chronicle: React.FC<{ view: SanitizedGameState }> = ({ view }) => {
  const rounds = chronicle(view);
  return (
    <div className="space-y-1">
      {rounds.map((round, index) => (
        <details
          key={round.round}
          open={index === rounds.length - 1}
          className="rounded-lg bg-slate-900/60 px-3 py-1.5"
        >
          <summary className="cursor-pointer text-xs font-semibold text-slate-200">
            Раунд {round.round} <span className="font-normal text-slate-500">· {round.lines.length} записей</span>
          </summary>
          <ol className="mt-1 space-y-0.5 border-l border-slate-800 pl-3">
            {round.lines.map((line) => (
              <li key={line.id} className="text-[11px] leading-5 text-slate-200">
                <LogSegments segments={line.segments} />
              </li>
            ))}
          </ol>
        </details>
      ))}
    </div>
  );
};

const RadioLog: React.FC<{ view: SanitizedGameState }> = ({ view }) => {
  const lines = radioTranscript(view);
  if (lines.length === 0) return <p className="text-xs text-slate-500">В эфире было тихо.</p>;
  return (
    <ol className="max-h-80 space-y-1 overflow-y-auto pr-1">
      {lines.map((line) => (
        <li key={line.id} className="text-xs text-slate-300">
          <span className="mr-1 text-[10px] text-slate-500">Р{line.round}</span>
          <b className="text-cyan-200">{line.author}:</b> {line.text}
        </li>
      ))}
    </ol>
  );
};

export const SingleGameReport: React.FC<{ record: SimulationRecord }> = ({ record }) => {
  const survivors = survivorsOf(record);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile label="Итог" value={gameOverTitle(record)} accent />
        <StatTile label="Раундов" value={String(record.rounds)} />
        <StatTile
          label="Решений ботов"
          value={String(record.steps)}
          hint={`отказов движка: ${record.rejectedActions}`}
        />
        <StatTile label="Выжили" value={`${survivors.length} из ${record.bots.length}`} />
        <StatTile
          label="Прибыли"
          value={record.destination ? DESTINATION_LABELS[record.destination] : '—'}
          hint={`${record.mode === 'SOLO' ? 'Соло' : 'Полукооператив'} · ${BOT_DIFFICULTY_LABELS[record.difficulty]}`}
        />
      </div>
      {record.stallReason && (
        <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-xs text-red-100">
          Партия встала: {record.stallReason}
        </p>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {record.bots.map((bot, index) => (
          <CrewCard key={bot.playerId} bot={bot} slot={index} />
        ))}
      </div>
      <ChartCard title="Мораль по раундам" subtitle="Мораль активной личности; −100 — злорадство, +100 — альтруизм">
        <LineChart
          series={record.bots.map((bot, index) => ({
            key: bot.playerId,
            label: bot.characterName,
            slot: index,
            points: bot.moraleHistory.map((point) => ({ x: point.round, y: point.morale })),
          }))}
          yMin={-100}
          yMax={100}
          yTicks={[-100, -50, 0, 50, 100]}
          xLabel="Раунд"
        />
      </ChartCard>
      {record.bots.length > 1 && (
        <ChartCard title="Доверие в конце партии" subtitle="Строка — кто доверяет, столбец — кому">
          <TrustMatrix bots={record.bots} />
        </ChartCard>
      )}
      {record.finalView && (
        <div className="grid gap-3 lg:grid-cols-[3fr_2fr]">
          <ChartCard title="Хроника партии" subtitle="Публичный журнал по раундам">
            <Chronicle view={record.finalView} />
          </ChartCard>
          <ChartCard title="Эфир Рации" subtitle="Заявления, Намерения и Просьбы ботов в их интонации">
            <RadioLog view={record.finalView} />
          </ChartCard>
        </div>
      )}
    </div>
  );
};
