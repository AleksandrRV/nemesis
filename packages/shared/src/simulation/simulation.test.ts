import { describe, expect, it } from 'vitest';
import { BOT_DIFFICULTIES } from '../ai/botTuning.js';
import type { GameLogEntry, GameLogEvent } from '../types/log.js';
import { GameEngine } from '../logic/fsm.js';
import { deathCauseInLog, deathsInLog } from './deathCauses.js';
import { seriesSeed, simulateGame, simulationStartState } from './simulateGame.js';
import { rateOf, summarizeSimulations } from './simulationStats.js';
import type { SimulatedBot, SimulationRecord } from './simulationTypes.js';

const MINIATURE_LIMIT = /свободной миниатюры нет/;

function logOf(events: GameLogEvent[]): GameLogEntry[] {
  return events.map((event, index) => ({ id: `log-${index + 1}`, sequence: index + 1, event }));
}

describe('Симулятор партий ботов (план 0.8.0, В8-9-2)', () => {
  it('воспроизводимость: один сид — одна и та же партия и один журнал', () => {
    const first = simulateGame({ seed: 'sim-repeat', botCount: 3, difficulty: 'CREW', detailed: true });
    const second = simulateGame({ seed: 'sim-repeat', botCount: 3, difficulty: 'CREW', detailed: true });
    expect(second).toEqual(first);
    expect(second.finalView!.gameLog).toEqual(first.finalView!.gameLog);
  });

  it('1:1: запись Действий ботов проигрывается обычным движком и даёт тот же журнал', () => {
    const record = simulateGame({ seed: 'sim-replay', botCount: 4, difficulty: 'VETERAN', detailed: true });
    const engine = new GameEngine();
    const replayed = record.transcript!.reduce(
      (state, move) => engine.processAction(state, move.action, { actorId: move.actorId }),
      simulationStartState({ seed: 'sim-replay', botCount: 4, difficulty: 'VETERAN' }),
    );
    expect(replayed.gameLog).toEqual(record.finalView!.gameLog);
    expect(record.transcript!.every((move) => move.action.type.startsWith('ACTION_'))).toBe(true);
  });

  it.each([1, 2, 3, 4, 5])(
    'нет зависаний: стол из %i ботов доходит до конца партии или встаёт только на исчерпанных миниатюрах (вопрос владельцу)',
    (botCount) => {
      for (const index of [0, 1, 2]) {
        const record = simulateGame({
          seed: seriesSeed(`sim-finish-${botCount}`, index),
          botCount,
          difficulty: 'CREW',
        });
        expect(record.finished || MINIATURE_LIMIT.test(record.stallReason ?? ''), record.seed).toBe(true);
        expect(record.bots).toHaveLength(botCount);
        expect(record.bots.every((bot) => bot.outcome === 'DIED' || bot.deathCause === null)).toBe(true);
      }
    },
    60_000,
  );

  it('один бот — Соло, несколько — полукооператив; сложность у каждого бота своя', () => {
    const solo = simulateGame({ seed: 'sim-solo', botCount: 1, difficulty: 'NOVICE' });
    expect(solo.mode).toBe('SOLO');
    expect(solo.bots[0]!.objectives.length).toBeGreaterThan(0);
    const crew = simulateGame({ seed: 'sim-crew', botCount: 2, difficulty: 'VETERAN' });
    expect(crew.mode).toBe('SEMI_COOP');
    expect(crew.difficulty).toBe('VETERAN');
  });

  it('отчёт бота: история морали по раундам, итог, причина и раунд гибели', () => {
    const record = simulateGame({ seed: 'sim-report', botCount: 3, difficulty: 'CREW' });
    for (const bot of record.bots) {
      expect(bot.moraleHistory[0]!.round).toBe(1);
      expect(bot.moraleHistory.map((point) => point.round)).toEqual(
        [...new Set(bot.moraleHistory.map((point) => point.round))].sort((left, right) => left - right),
      );
      if (bot.outcome === 'DIED') expect(bot.deathCause).not.toBeNull();
      if (bot.deathRound !== null) expect(bot.deathRound).toBeLessThanOrEqual(record.rounds);
      expect(Object.keys(bot.trust).sort()).toEqual(
        record.bots.filter((other) => other.playerId !== bot.playerId).map((other) => other.playerId),
      );
    }
  });

  it('предел шагов останавливает партию, и она помечается незавершённой', () => {
    const record = simulateGame({ seed: 'sim-limit', botCount: 2, difficulty: 'CREW', stepLimit: 5 });
    expect(record.steps).toBe(5);
    expect(record.finished).toBe(false);
    expect(record.stallReason).toBeNull();
  });
});

describe('Причины гибели по журналу', () => {
  it('урон рядом с записью о гибели называет причину; чужой урон не считается', () => {
    const log = logOf([
      { type: 'ROUND_STARTED', round: 4, firstPlayerId: 'player-1' },
      { type: 'FIRE_DAMAGE_TAKEN', playerId: 'player-2', roomId: 3, woundsCount: 1 },
      { type: 'PLAYER_DIED', playerId: 'player-1', roomId: 3 },
      { type: 'BLEEDING_WOUND_TAKEN', playerId: 'player-1' },
    ]);
    expect(deathCauseInLog(log, 2, 'player-1')).toBe('BLEEDING');
    expect(deathsInLog(log).get('player-1')).toEqual({ cause: 'BLEEDING', round: 4 });
  });

  it('Декомпрессия называет всех погибших в Комнате; без улик — «иное»', () => {
    const log = logOf([
      { type: 'PLAYER_DIED', playerId: 'player-3', roomId: 5 },
      {
        type: 'DECOMPRESSION_RESOLVED',
        targetRoomId: 5,
        startedBy: 'player-1',
        killedPlayerIds: ['player-3'],
        killedIntruderIds: [],
      },
    ]);
    expect(deathCauseInLog(log, 0, 'player-3')).toBe('DECOMPRESSION');
    expect(deathCauseInLog(logOf([{ type: 'PLAYER_DIED', playerId: 'player-1', roomId: 1 }]), 0, 'player-1')).toBe(
      'OTHER',
    );
  });
});

function syntheticBot(overrides: Partial<SimulatedBot>): SimulatedBot {
  return {
    playerId: 'player-1',
    orderNumber: 1,
    characterClass: 'SCOUT',
    characterName: 'Разведчица',
    traits: ['GENIUS'],
    alterTraits: null,
    startMorale: 30,
    finalMorale: 30,
    moraleHistory: [{ round: 1, morale: 30 }],
    objectives: [],
    outcome: 'DIED',
    deathCause: 'FIRE',
    deathRound: 3,
    escapeRoute: null,
    actions: { ACTION_MOVE: 2 },
    speech: {
      claims: 1,
      intents: 0,
      requests: 1,
      answers: 0,
      lies: 1,
      liesExposed: 1,
      promisesMade: 0,
      promisesKept: 0,
      promisesBroken: 0,
    },
    trust: {},
    ...overrides,
  };
}

function syntheticRecord(bots: SimulatedBot[], rounds: number): SimulationRecord {
  return {
    seed: 's',
    botCount: bots.length,
    difficulty: 'CREW',
    mode: bots.length === 1 ? 'SOLO' : 'SEMI_COOP',
    finished: true,
    stalled: false,
    stallReason: null,
    steps: 10,
    rounds,
    rejectedActions: 0,
    gameOverReason: 'HYPERSPACE_JUMP',
    destination: 'EARTH',
    shipDestroyed: false,
    bots,
    finalView: null,
    transcript: null,
  };
}

describe('Сводка серии', () => {
  it('считает победы по чертам, морали и Персонажам, причины и раунды гибели, речь', () => {
    const winner = syntheticBot({
      outcome: 'WON',
      deathCause: null,
      deathRound: null,
      traits: ['GENIUS', 'PARANOID'],
      startMorale: 80,
      escapeRoute: 'HIBERNATION',
    });
    const loser = syntheticBot({ playerId: 'player-2', startMorale: -60, characterClass: 'PILOT' });
    const summary = summarizeSimulations(
      [syntheticRecord([winner, loser], 15), syntheticRecord([loser], 5)],
      2,
      'CREW',
    );
    expect(summary).toMatchObject({ games: 2, bots: 3, wins: 1, survivals: 1, gamesWithWinner: 1, averageRounds: 10 });
    expect(summary.byTrait.GENIUS).toEqual({ games: 3, wins: 1, survivals: 1 });
    expect(summary.byTrait.PARANOID).toEqual({ games: 1, wins: 1, survivals: 1 });
    expect(summary.byMorale.find((band) => band.label === '50…100')!.stat.wins).toBe(1);
    expect(summary.byMorale.find((band) => band.label === '−100…−50')!.stat.games).toBe(2);
    expect(summary.deathCauses).toEqual({ FIRE: 2 });
    expect(summary.deathRounds).toEqual({ 3: 2 });
    expect(summary.byEscapeRoute).toEqual({ HIBERNATION: 1 });
    expect(summary.speech.lies).toBe(3);
    expect(summary.actions).toEqual({ ACTION_MOVE: 6 });
    expect(summary.roundsHistogram).toEqual({ 15: 1, 5: 1 });
    expect(rateOf(summary.wins, summary.bots)).toBeCloseTo(1 / 3);
    expect(rateOf(1, 0)).toBe(0);
  });

  it('все сложности проходят партию без зависаний', () => {
    for (const difficulty of BOT_DIFFICULTIES) {
      expect(simulateGame({ seed: `sim-${difficulty}`, botCount: 2, difficulty }).finished).toBe(true);
    }
  }, 30_000);
});
