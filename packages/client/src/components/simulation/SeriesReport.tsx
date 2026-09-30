import React from 'react';
import type { SimulationRecord, SimulationSummary } from '@nemesis/shared';
import { BOT_OUTCOMES, rateOf } from '@nemesis/shared';
import { FileText } from 'lucide-react';
import { BOT_DIFFICULTY_LABELS } from '../lobby/lobbyModel';
import { OUTCOME_LABELS, percent } from '../bots/botLabels';
import { BarList, ChartCard, ColumnChart, StackedBar, StatTile } from '../bots/charts';
import { OutcomeIcon } from './outcomeParts';
import { OUTCOME_STYLES } from './outcomeStyles';
import {
  MIN_TRAIT_SAMPLE,
  actionRows,
  characterRows,
  deathCauseRows,
  deathRoundColumns,
  gameOverRows,
  gameOverTitle,
  moraleRows,
  roundColumns,
  seriesGameLabel,
  survivorsOf,
  traitRows,
} from './simulationModel';

interface SeriesReportProps {
  summary: SimulationSummary;
  records: readonly SimulationRecord[];
  onOpenGame: (seed: string) => void;
}

function outcomeCounts(summary: SimulationSummary): Record<(typeof BOT_OUTCOMES)[number], number> {
  return { WON: summary.wins, SURVIVED: summary.survivals - summary.wins, DIED: summary.bots - summary.survivals };
}

const GamesTable: React.FC<{ records: readonly SimulationRecord[]; onOpenGame: (seed: string) => void }> = ({
  records,
  onOpenGame,
}) => (
  <div className="max-h-96 overflow-y-auto">
    <table className="w-full text-left text-xs">
      <thead className="sticky top-0 bg-slate-950 text-slate-500">
        <tr>
          <th className="py-1 font-normal">Партия</th>
          <th className="font-normal">Раундов</th>
          <th className="font-normal">Итог</th>
          <th className="font-normal">Выжили</th>
          <th className="font-normal">
            <span className="sr-only">Подробно</span>
          </th>
        </tr>
      </thead>
      <tbody className="tabular-nums text-slate-200">
        {records.map((record) => {
          const survivors = survivorsOf(record);
          const winners = record.bots.filter((bot) => bot.outcome === 'WON').length;
          return (
            <tr key={record.seed} className="border-t border-slate-800/70">
              <td className="py-1 font-mono text-[11px] text-slate-400" title={record.seed}>
                {seriesGameLabel(record.seed)}
              </td>
              <td>{record.rounds}</td>
              <td className={record.finished ? '' : 'text-red-300'}>{gameOverTitle(record)}</td>
              <td>
                {survivors.length}/{record.bots.length}
                {winners > 0 && (
                  <span className="ml-1 inline-flex items-center gap-0.5 text-emerald-300">
                    <OutcomeIcon outcome="WON" size={11} />
                    {winners}
                  </span>
                )}
              </td>
              <td className="text-right">
                <button
                  type="button"
                  onClick={() => onOpenGame(record.seed)}
                  className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-violet-300 hover:bg-violet-950/60 hover:text-violet-100"
                >
                  <FileText size={11} aria-hidden="true" /> подробно
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export const SeriesReport: React.FC<SeriesReportProps> = ({ summary, records, onOpenGame }) => {
  const counts = outcomeCounts(summary);
  const { speech } = summary;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile
          label="Выживаемость ботов"
          value={percent(rateOf(summary.survivals, summary.bots))}
          hint={`${summary.survivals} из ${summary.bots}`}
          accent
        />
        <StatTile
          label="Побед"
          value={percent(rateOf(summary.wins, summary.bots))}
          hint={`партий с победителем: ${summary.gamesWithWinner}`}
        />
        <StatTile label="Средняя длина" value={`${summary.averageRounds.toFixed(1)} р.`} hint="раундов в партии" />
        <StatTile
          label="Партий"
          value={String(summary.games)}
          hint={`${summary.botCount === 1 ? 'Соло' : `${summary.botCount} бота(ов)`} · ${BOT_DIFFICULTY_LABELS[summary.difficulty]}`}
        />
        <StatTile
          label="Зависаний"
          value={String(summary.stalled)}
          hint={`отказов движка: ${summary.rejectedActions}`}
        />
      </div>

      <ChartCard title="Исход для ботов" subtitle="Каждый бот каждой партии: победа, выжил без Цели, погиб">
        <StackedBar
          segments={BOT_OUTCOMES.map((outcome) => ({
            key: outcome,
            label: OUTCOME_LABELS[outcome],
            value: counts[outcome],
            swatch: OUTCOME_STYLES[outcome].swatch,
            icon: <OutcomeIcon outcome={outcome} size={11} />,
          }))}
        />
      </ChartCard>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Причины гибели" subtitle="Число погибших ботов и доля от всех ботов серии">
          <BarList rows={deathCauseRows(summary)} empty="Никто не погиб" />
        </ChartCard>
        <ChartCard title="Когда гибнут" subtitle="Раунд гибели во время партии">
          <ColumnChart columns={deathRoundColumns(summary)} unit="ботов" />
        </ChartCard>
        <ChartCard title="Длина партии" subtitle="Раунд, на котором партия закончилась">
          <ColumnChart columns={roundColumns(summary)} unit="партий" />
        </ChartCard>
        <ChartCard title="Чем кончаются партии" subtitle="Причина конца игры">
          <BarList rows={gameOverRows(summary)} />
        </ChartCard>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <ChartCard
          title="Выживаемость по чертам"
          subtitle={`Доля выживших · число ботов с чертой (от ${MIN_TRAIT_SAMPLE})`}
        >
          <BarList rows={traitRows(summary)} empty="Мало данных" />
        </ChartCard>
        <ChartCard title="По стартовой морали" subtitle="Доля выживших · число ботов">
          <BarList rows={moraleRows(summary)} />
        </ChartCard>
        <ChartCard title="По Персонажам" subtitle="Доля выживших · число ботов">
          <BarList rows={characterRows(summary)} />
        </ChartCard>
      </div>

      <ChartCard title="Слова и обещания" subtitle="Всё, что боты сказали в Рацию за серию">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Заявлений" value={String(speech.claims)} hint={`Намерений: ${speech.intents}`} />
          <StatTile
            label="Лжи"
            value={String(speech.lies)}
            hint={`поймано Проверкой: ${speech.liesExposed} (${percent(rateOf(speech.liesExposed, speech.lies))})`}
          />
          <StatTile label="Просьб" value={String(speech.requests)} hint={`ответов: ${speech.answers}`} />
          <StatTile
            label="Обещаний сдержано"
            value={percent(rateOf(speech.promisesKept, speech.promisesMade))}
            hint={`${speech.promisesKept} из ${speech.promisesMade}, нарушено ${speech.promisesBroken}`}
          />
        </div>
      </ChartCard>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Чем заняты боты" subtitle="Принятые движком Действия, доля от всех">
          <BarList rows={actionRows(summary.actions)} />
        </ChartCard>
        <ChartCard title="Партии серии" subtitle="Любую можно открыть подробным отчётом">
          <GamesTable records={records} onOpenGame={onOpenGame} />
        </ChartCard>
      </div>

      {Object.keys(summary.stallReasons).length > 0 && (
        <ChartCard title="Почему партии зависли" subtitle="Последний отказ движка перед остановкой">
          <ul className="space-y-1 text-xs text-red-100">
            {Object.entries(summary.stallReasons).map(([reason, count]) => (
              <li key={reason}>
                <b className="tabular-nums">{count}×</b> {reason}
              </li>
            ))}
          </ul>
        </ChartCard>
      )}
    </div>
  );
};
