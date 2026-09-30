import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BOT_TUNING, simulateGame, summarizeSimulations } from '@nemesis/shared';
import type { SimulationRecord } from '@nemesis/shared';

import { startSimulation } from '../../services/simulation/SimulationRunner';
import type { SimulationResponse } from '../../services/simulation/simulationJobs';
import { SeriesReport } from './SeriesReport';
import { SimulationScreen } from './SimulationScreen';
import { SimulationSetup } from './SimulationSetup';
import { SingleGameReport } from './SingleGameReport';
import { chronicle, radioTranscript, roundColumns, traitRows, type SimulationConfig } from './simulationModel';

const noop = () => undefined;
const detailed = simulateGame({ seed: 'ui-single', botCount: 3, difficulty: 'CREW', detailed: true });
const series: SimulationRecord[] = ['ui-series#1', 'ui-series#2', 'ui-series#3'].map((seed) =>
  simulateGame({ seed, botCount: 2, difficulty: 'NOVICE' }),
);
const summary = summarizeSimulations(series, 2, 'NOVICE');

function setupHtml(config: SimulationConfig): string {
  return renderToStaticMarkup(<SimulationSetup config={config} onChange={noop} onRerollSeed={noop} onStart={noop} />);
}

describe('Окно симуляции: настройка (план 0.8.0, В8-9)', () => {
  it('две опции — одна партия с отчётом и серия из 100; 1–5 ботов и три сложности', () => {
    const html = setupHtml({ botCount: 4, difficulty: 'VETERAN', seed: 'abc', mode: 'SERIES' });
    expect(html).toContain('Одна партия');
    expect(html).toContain('100 партий');
    expect(html).toContain('Число ботов');
    for (const label of ['Новичок', 'Экипаж', 'Ветеран']) expect(html).toContain(label);
    expect(html).toMatch(/aria-checked="true"[^>]*>(?:(?!<\/button>).)*100 партий/);
    expect(html).toContain('«abc#1»');
  });

  it('один бот — Соло', () => {
    expect(setupHtml({ botCount: 1, difficulty: 'CREW', seed: 's', mode: 'SINGLE' })).toContain(
      'Соло: один бот против корабля',
    );
  });

  it('окно открывается на настройке', () => {
    const html = renderToStaticMarkup(<SimulationScreen onBack={noop} />);
    expect(html).toContain('СИМУЛЯЦИЯ');
    expect(html).toContain('Запустить');
  });
});

describe('Раннер симуляции без Web Worker', () => {
  it('серия сообщает прогресс по каждой партии и отдаёт сводку', () => {
    const responses: SimulationResponse[] = [];
    startSimulation(
      { kind: 'SERIES', baseSeed: 'runner', count: 3, botCount: 1, difficulty: 'CREW' },
      (response) => responses.push(response),
      { useWorker: false, schedule: (task) => task() },
    );
    expect(responses.filter((response) => response.kind === 'PROGRESS').map((response) => response.kind)).toHaveLength(
      3,
    );
    const done = responses.at(-1)!;
    expect(done.kind).toBe('SERIES_DONE');
    if (done.kind === 'SERIES_DONE') {
      expect(done.records.map((record) => record.seed)).toEqual(['runner#1', 'runner#2', 'runner#3']);
      expect(done.summary.games).toBe(3);
      expect(done.records.every((record) => record.mode === 'SOLO')).toBe(true);
    }
  });

  it('одна партия приходит с подробным срезом; остановка обрывает серию', () => {
    const single: SimulationResponse[] = [];
    startSimulation(
      { kind: 'SINGLE', seed: 'runner-one', botCount: 2, difficulty: 'VETERAN' },
      (response) => single.push(response),
      { useWorker: false, schedule: (task) => task() },
    );
    expect(single).toHaveLength(1);
    expect(single[0]!.kind === 'SINGLE_DONE' && single[0]!.record.finalView !== null).toBe(true);

    const queue: (() => void)[] = [];
    const stopped: SimulationResponse[] = [];
    const job = startSimulation(
      { kind: 'SERIES', baseSeed: 'runner-stop', count: 5, botCount: 1, difficulty: 'CREW' },
      (response) => stopped.push(response),
      { useWorker: false, schedule: (task) => queue.push(task) },
    );
    queue.shift()!();
    job.cancel();
    while (queue.length > 0) queue.shift()!();
    expect(stopped).toHaveLength(1);
  });
});

describe('Отчёт одной партии', () => {
  it('экипаж с характерами и исходами, мораль, доверие, хроника по раундам и эфир', () => {
    const html = renderToStaticMarkup(<SingleGameReport record={detailed} />);
    for (const bot of detailed.bots) {
      expect(html).toContain(bot.characterName);
      for (const trait of bot.traits) expect(html).toContain(BOT_TUNING.traits.catalog[trait].label);
    }
    for (const title of ['Мораль по раундам', 'Доверие в конце партии', 'Хроника партии', 'Эфир Рации']) {
      expect(html).toContain(title);
    }
    expect(html).toContain(`Раунд ${detailed.rounds}`);
  });

  it('хроника идёт по раундам по порядку, эфир — в словах ботов', () => {
    const rounds = chronicle(detailed.finalView!).map((round) => round.round);
    expect(rounds).toEqual([...rounds].sort((left, right) => left - right));
    expect(rounds[0]).toBe(1);
    expect(radioTranscript(detailed.finalView!).length).toBe(detailed.finalView!.comms.messages.length);
  });
});

describe('Отчёт серии', () => {
  it('инфографика: исходы, причины и раунды гибели, длина партий, черты, мораль, слова, таблица партий', () => {
    const html = renderToStaticMarkup(<SeriesReport summary={summary} records={series} onOpenGame={noop} />);
    for (const title of [
      'Выживаемость ботов',
      'Исход для ботов',
      'Когда гибнут',
      'Длина партии',
      'Выживаемость по чертам',
      'По стартовой морали',
      'Слова и обещания',
      'Партии серии',
    ]) {
      expect(html).toContain(title);
    }
    for (const record of series) expect(html).toContain(`title="${record.seed}"`);
    expect(html).toContain('>#2<');
    expect(html.match(/подробно/g)).toHaveLength(series.length);
  });

  it('гистограмма раундов не пропускает пустые раунды, черты с малой выборкой не показываются', () => {
    const columns = roundColumns(summary);
    expect(columns.map((column) => column.label)).toEqual(
      Array.from({ length: columns.length }, (_, index) => String(index + 1)),
    );
    expect(columns.reduce((sum, column) => sum + column.value, 0)).toBe(series.length);
    for (const row of traitRows(summary)) {
      expect(summary.byTrait[row.key as keyof typeof summary.byTrait]!.games).toBeGreaterThanOrEqual(3);
    }
  });
});
