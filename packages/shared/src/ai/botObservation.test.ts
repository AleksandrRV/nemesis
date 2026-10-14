import { describe, expect, it } from 'vitest';
import type { GameState } from '../types/state.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { putPlayer } from '../testing/contactFixtures.js';
import { roomOf, standAt } from '../testing/roomFixtures.js';
import { BOT, actionCardOfKind, agendaFor, botTable, handOf, neutralMind } from '../testing/botTacticsFixtures.js';
import { generateCandidates } from './botActions.js';
import { task } from './botTasks.js';
import { surpriseChance } from './botThreat.js';
import { BOT_TUNING, type BotTuning } from './botTuning.js';
import { scoreCandidates, type ScoredCandidate } from './botUtility.js';

const FULL_HAND = 5;
const PEEK_COST = 2;

/** Бот один в Комнате Наблюдения; Операционная ещё закрыта. */
function inObservation(seed: string, hand = FULL_HAND): GameState {
  const state = botTable(seed);
  standAt(state, BOT, 'OBSERVATION_ROOM');
  putPlayer(state, 'player-1', 19);
  const surgery = Object.values(state.ship.rooms).find((room) => room.definitionId === 'SURGERY');
  if (surgery) surgery.isExplored = false;
  handOf(
    state,
    Array.from({ length: hand }, () => actionCardOfKind('SEARCH')),
    hand,
  );
  return state;
}

function peeksWith(state: GameState, weight: number, tuning: BotTuning = BOT_TUNING): ScoredCandidate[] {
  const view = filterStateForPlayer(state, BOT);
  const mind = neutralMind(state);
  const cure = task('CURE', 'SURVIVE', weight, { definitionIds: ['SURGERY'] }, 'Удалить Личинку');
  const agenda = { ...agendaFor(state), tasks: [cure] };
  const candidates = generateCandidates(view, mind, agenda.tasks, tuning);
  return scoreCandidates(view, mind, agenda, candidates, tuning).filter((entry) =>
    entry.candidate.effects.some((produced) => produced.kind === 'OBSERVE'),
  );
}

const bestPeekValue = (state: GameState, weight: number, tuning?: BotTuning) =>
  Math.max(0, ...peeksWith(state, weight, tuning).map((entry) => entry.factors.taskValue));

describe('Комната Наблюдения: подгляд не опустошает руку (стр. 18, 25)', () => {
  it('шанс Внезапной Атаки — доля жетонов мешка с числом больше руки: пустая рука — все Чужие, полная — никто', () => {
    const view = filterStateForPlayer(inObservation('surprise-odds'), BOT);
    const bag = view.intrudersPool.bag;
    const total = Object.values(bag).reduce((sum, count) => sum + count, 0);
    expect(surpriseChance(view, 0)).toBeCloseTo((total - bag.BLANK) / total);
    expect(surpriseChance(view, FULL_HAND)).toBe(0);
    expect(surpriseChance(view, 1)).toBeLessThan(surpriseChance(view, 0));
  });

  it('с полной рукой подгляд предлагается, с рукой, которая после оплаты не держит Внезапную Атаку, — нет', () => {
    expect(peeksWith(inObservation('peek-full'), 3).length).toBeGreaterThan(0);
    const thin = inObservation('peek-thin', PEEK_COST);
    expect(surpriseChance(filterStateForPlayer(thin, BOT), 0)).toBeGreaterThan(BOT_TUNING.navigation.peekSurpriseCap);
    expect(peeksWith(thin, 3)).toHaveLength(0);
  });
});

describe('Комната Наблюдения: подглядывать лишь при неизвестной важной цели (стр. 25)', () => {
  it('Операционная не найдена — подгляд закрытого тайла стоит шанса найти её', () => {
    expect(bestPeekValue(inObservation('peek-unknown'), 3)).toBeGreaterThan(0);
  });

  it('Операционная уже открыта — искать её подглядом незачем', () => {
    const state = inObservation('peek-known');
    state.ship.rooms[roomOf(state, 'SURGERY')]!.isExplored = true;
    expect(bestPeekValue(state, 3)).toBe(0);
  });

  it('лёгкая задача (вес ниже `peekMinStake`) подгляда не стоит', () => {
    const light = BOT_TUNING.navigation.peekMinStake / 2;
    expect(bestPeekValue(inObservation('peek-light'), light)).toBe(0);
  });

  it('подгляд — не работа на месте: надбавка `localWork` его ценность не меняет', () => {
    const state = inObservation('peek-local');
    const lazy: BotTuning = { ...BOT_TUNING, tactics: { ...BOT_TUNING.tactics, localWork: 0 } };
    expect(bestPeekValue(state, 3)).toBeCloseTo(bestPeekValue(state, 3, lazy));
  });
});
