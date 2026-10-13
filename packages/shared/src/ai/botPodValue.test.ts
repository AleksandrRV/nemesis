import { describe, expect, it } from 'vitest';
import { PERSONAL_OBJECTIVE_CARDS } from '../data/objectiveCards.js';
import type { GameState } from '../types/state.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { putPlayer } from '../testing/contactFixtures.js';
import { BOT, botTable, neutralMind } from '../testing/botTacticsFixtures.js';
import { buildAgenda } from './botGoals.js';
import type { BotMind } from './botMind.js';
import { planObjective } from './botObjectivePlanner.js';
import { BOT_TUNING, type BotTuning } from './botTuning.js';

const LIFELINE = BOT_TUNING.desires.SURVIVE * BOT_TUNING.tactics.harm.weight;
const EARLY = 2;
const MIDGAME = 8;
const LATE = 12;

function openPod(seed: string, time: number): GameState {
  const state = botTable(seed);
  const holder = Object.values(state.ship.rooms).find((room) => room.definitionId === 'ESCAPE_POD_B')!;
  holder.isExplored = true;
  for (const pod of Object.values(state.ship.escapePods)) pod.isLocked = pod.section !== 'B';
  putPlayer(state, BOT, 6);
  putPlayer(state, 'player-1', 19);
  state.players[BOT]!.objectives = [];
  state.meta.timeTrackPosition = time;
  return state;
}

/** Бот уверен в полёте спящих: все Двигатели исправны, Курс ведёт на Землю. */
function confidentFlight(state: GameState): BotMind {
  const mind = neutralMind(state);
  const marker = state.ship.coordinates.currentCourseMarker;
  const working = { pWorking: 1, known: true, knownSinceRound: 1, source: 'OWN_CHECK' as const };
  return {
    ...mind,
    engines: { '1': working, '2': working, '3': working },
    coordinates: {
      ...mind.coordinates,
      byMarker: { ...mind.coordinates.byMarker, [marker]: { EARTH: 1, MARS: 0, VENUS: 0, VOID: 0 } },
    },
  };
}

function boardTask(state: GameState, mind: BotMind = neutralMind(state), tuning: BotTuning = BOT_TUNING) {
  const agenda = buildAgenda(filterStateForPlayer(state, BOT), mind, tuning);
  return agenda.tasks.find((entry) => entry.kind === 'BOARD_POD');
}

function boardWeight(state: GameState, mind: BotMind = neutralMind(state)): number {
  return boardTask(state, mind)?.weight ?? 0;
}

describe('Открытая Капсула стоит шанса погибнуть без неё (стр. 11, 26)', () => {
  it('пока полёт спящих под вопросом, Капсула почти так же важна, как жизнь, — и в начале, и в конце партии', () => {
    expect(boardWeight(openPod('pod-early', EARLY))).toBeGreaterThan(0.8 * LIFELINE);
    expect(boardWeight(openPod('pod-late', LATE))).toBeGreaterThan(0.8 * LIFELINE);
  });

  it('чем вернее Анабиоз долетит, тем меньше нужда в Капсуле: остаётся лишь риск раундов на борту', () => {
    const state = openPod('pod-confident', MIDGAME);
    expect(boardWeight(state, confidentFlight(state))).toBeLessThan(0.75 * boardWeight(state));
  });

  it('сломанный Криогенный отсек делает Капсулу нужнее', () => {
    const state = openPod('pod-cryo', MIDGAME);
    const mind = confidentFlight(state);
    const intact = boardWeight(state, mind);
    Object.values(state.ship.rooms).find((room) => room.definitionId === 'HIBERNATORIUM')!.hasMalfunction = true;
    expect(boardWeight(state, mind)).toBeGreaterThan(intact);
  });

  it('запертые Капсулы — задачи посадки нет', () => {
    const state = openPod('pod-locked', EARLY);
    for (const pod of Object.values(state.ship.escapePods)) pod.isLocked = true;
    expect(boardWeight(state)).toBe(0);
  });
});

describe('Открытая Капсула — задача-«спасение», пока без неё скорее погибнуть (`podLifeline`)', () => {
  it('при сомнительном полёте спящих посадка — «спасение» с первых раундов', () => {
    expect(boardTask(openPod('pod-lifeline', EARLY))!.lifeline).toBe(true);
  });

  it('когда Анабиоз почти наверняка спасёт и время есть, посадка — обычная задача', () => {
    const state = openPod('pod-ordinary', MIDGAME);
    expect(boardTask(state, confidentFlight(state))!.lifeline).toBeUndefined();
  });

  it('порог 1 — прежнее правило: «спасение» лишь при весе жизни', () => {
    const state = openPod('pod-threshold', EARLY);
    const strict: BotTuning = {
      ...BOT_TUNING,
      tactics: { ...BOT_TUNING.tactics, evacuation: { ...BOT_TUNING.tactics.evacuation, podLifeline: 1 } },
    };
    const entry = boardTask(state, neutralMind(state), strict)!;
    expect(entry.weight).toBeLessThan(LIFELINE);
    expect(entry.lifeline).toBeUndefined();
  });
});

describe('Цель «Корабль должен достигнуть Земли» — о корабле, а не о Персонаже (стр. 11–12)', () => {
  const saveProperty = PERSONAL_OBJECTIVE_CARDS.find((card) => card.id === 'OBJ_PERSONAL_SAVE_PROPERTY')!;

  it('выжить для неё можно и в Капсуле: план не требует Анабиоза', () => {
    const state = openPod('objective-route', EARLY);
    const plan = planObjective(filterStateForPlayer(state, BOT), neutralMind(state), saveProperty, 1, BOT_TUNING);
    expect(plan!.evacuation).toBe('ANY');
  });

  it('бот с этой Целью при открытой Капсуле ценит посадку так же, как бот без Цели', () => {
    const state = openPod('objective-pod', EARLY);
    const free = boardWeight(state);
    state.players[BOT]!.objectives = [saveProperty];
    expect(boardWeight(state)).toBeCloseTo(free);
  });
});
