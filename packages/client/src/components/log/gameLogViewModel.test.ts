import { describe, expect, it } from 'vitest';
import { createInitialGameState, filterStateForPlayer, type GameLogEntry } from '@nemesis/shared';
import { formatGameLog } from './gameLogModel';
import {
  buildLogRounds,
  categorizeLog,
  countByCategory,
  logHighlights,
  matchesLogFilter,
  tickerDurationSeconds,
  tickerEntries,
} from './gameLogViewModel';

function viewWithLog(events: GameLogEntry['event'][]) {
  const view = filterStateForPlayer(createInitialGameState('log-view-model'), 'player-1');
  const start = (view.gameLog.at(-1)?.sequence ?? 0) + 1;
  view.gameLog = [
    ...view.gameLog,
    ...events.map((event, index) => ({ id: `log-x${start + index}`, sequence: start + index, event })),
  ];
  return view;
}

const SAMPLE: GameLogEntry['event'][] = [
  { type: 'ROUND_STARTED', round: 1, firstPlayerId: 'player-1' },
  { type: 'PLAYER_TURN_STARTED', playerId: 'player-1', round: 1 },
  { type: 'NOISE_ROLLED', playerId: 'player-1', roomId: 12, result: { kind: 'CORRIDOR', number: 2 } },
  { type: 'ROUND_STARTED', round: 2, firstPlayerId: 'player-1' },
  { type: 'PLAYER_PASSED', playerId: 'player-1', discardedCount: 0 },
];

function categorized() {
  const view = viewWithLog(SAMPLE);
  return { view, entries: categorizeLog(formatGameLog(view), view.gameLog) };
}

describe('Журнал: категории, раунды и фильтр', () => {
  it('каждая запись получает категорию и плоский текст для поиска', () => {
    const { entries } = categorized();
    const roll = entries.find((entry) => entry.plainText.includes('Коридор 2'));
    expect(roll?.category).toBe('NOISE');
    expect(countByCategory(entries).NOISE).toBe(1);
    expect(countByCategory(entries).ALL).toBe(entries.length);
  });

  it('записи делятся по раундам, до первого раунда — «Подготовка»', () => {
    const { view, entries } = categorized();
    const rounds = buildLogRounds(entries, view.gameLog, { category: 'ALL', query: '' });
    expect(rounds.map((round) => round.title)).toEqual(['Подготовка', 'Раунд 1', 'Раунд 2']);
    expect(rounds.reduce((sum, round) => sum + round.entryCount, 0)).toBe(entries.length);
  });

  it('фильтр по категории и поиску без учёта регистра оставляет только совпадения', () => {
    const { view, entries } = categorized();
    const noiseOnly = buildLogRounds(entries, view.gameLog, { category: 'NOISE', query: '' });
    expect(noiseOnly.map((round) => round.title)).toEqual(['Раунд 1']);

    const roll = entries.find((entry) => entry.category === 'NOISE')!;
    expect(matchesLogFilter(roll, { category: 'ALL', query: 'КОРИДОР 2' })).toBe(true);
    expect(matchesLogFilter(roll, { category: 'COMBAT', query: '' })).toBe(false);
    expect(buildLogRounds(entries, view.gameLog, { category: 'ALL', query: 'нет-такого' })).toEqual([]);
  });
});

describe('Журнал: бегущая строка', () => {
  it('показывает последние записи, начиная с самой свежей', () => {
    const { entries } = categorized();
    const ticker = tickerEntries(entries, 3);
    expect(ticker).toHaveLength(3);
    expect(ticker[0]!.sequence).toBe(entries.at(-1)!.sequence);
    expect(ticker[0]!.sequence).toBeGreaterThan(ticker[2]!.sequence);
  });

  it('скорость прокрутки постоянна: длинная строка крутится дольше, но не быстрее минимума', () => {
    const { entries } = categorized();
    const short = tickerDurationSeconds(entries.slice(0, 1));
    const long = tickerDurationSeconds([...entries, ...entries, ...entries, ...entries, ...entries]);
    expect(short).toBe(18);
    expect(long).toBeGreaterThanOrEqual(short);
  });

  it('подсвечивает последний бросок Шума', () => {
    const { view } = categorized();
    const roll = view.gameLog.find((entry) => entry.event.type === 'NOISE_ROLLED')!;
    expect(logHighlights(view.gameLog).get(roll.id)).toBe('NOISE_ROLL');
  });
});
