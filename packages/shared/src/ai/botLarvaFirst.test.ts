import { describe, expect, it } from 'vitest';
import type { GameState } from '../types/state.js';
import { CRAFTED_ITEM_CARDS } from '../data/crafting.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { putPlayer } from '../testing/contactFixtures.js';
import { roomOf } from '../testing/roomFixtures.js';
import { BOT, botTable, neutralMind } from '../testing/botTacticsFixtures.js';
import { finalCheckDeath } from './botFinale.js';
import { buildAgenda } from './botGoals.js';
import { cureInTime } from './botNeeds.js';
import { BOT_TUNING, type BotTuning } from './botTuning.js';

const LIFELINE = BOT_TUNING.desires.SURVIVE * BOT_TUNING.tactics.harm.weight;
const EARLY = 4;
const LATE = 13;

/** Носитель Личинки с тремя непроверенными картами Заражения; Капсула B и Операционная открыты. */
function carrier(seed: string, time: number): GameState {
  const state = botTable(seed);
  for (const pod of Object.values(state.ship.escapePods)) pod.isLocked = pod.section !== 'B';
  state.ship.rooms[roomOf(state, 'ESCAPE_POD_B')]!.isExplored = true;
  state.ship.rooms[roomOf(state, 'SURGERY')]!.isExplored = true;
  for (const corridor of Object.values(state.ship.corridors)) corridor.doorState = 'OPEN';
  const player = state.players[BOT]!;
  player.hasLarva = true;
  player.objectives = [];
  player.actionDeck.drawPile.push(
    ...[1, 2, 3].map((index) => ({ id: `TEST_INFECTION_${index}`, isInfected: false, isScanned: false })),
  );
  putPlayer(state, 'player-1', 19);
  state.meta.timeTrackPosition = time;
  return state;
}

function weights(state: GameState, tuning: BotTuning = BOT_TUNING): { board: number; cure: number } {
  const tasks = buildAgenda(filterStateForPlayer(state, BOT), neutralMind(state), tuning).tasks;
  return {
    board: tasks.find((entry) => entry.kind === 'BOARD_POD')?.weight ?? 0,
    cure: tasks.find((entry) => entry.kind === 'CURE')?.weight ?? 0,
  };
}

const inTime = (state: GameState) => {
  const view = filterStateForPlayer(state, BOT);
  return cureInTime({ view, self: view.players[BOT]!, tuning: BOT_TUNING, knobs: BOT_TUNING.knobs });
};
const finalDeath = (state: GameState) => finalCheckDeath(filterStateForPlayer(state, BOT).players[BOT]!);
const withoutCure: BotTuning = { ...BOT_TUNING, tactics: { ...BOT_TUNING.tactics, larvaCure: 0 } };

describe('Носитель Личинки: сначала излечение, потом Капсула (стр. 11, 25)', () => {
  it('Операционная открыта и успевается: излечение весит гибель на проверке Заражения', () => {
    const state = carrier('larva-cure', EARLY);
    expect(inTime(state)).toBe(true);
    expect(finalDeath(state)).toBeGreaterThan(BOT_TUNING.tactics.harm.larva);
    expect(weights(state).cure).toBeCloseTo(LIFELINE * finalDeath(state));
  });

  it('посадка без излечения дешевле на ту же долю — излечение становится главнее', () => {
    const state = carrier('larva-board', EARLY);
    const plain = weights(state, withoutCure);
    const ordered = weights(state);
    expect(ordered.board).toBeCloseTo(plain.board * (1 - finalDeath(state)));
    expect(ordered.cure).toBeGreaterThan(ordered.board);
  });

  it('Неисправная Операционная — вылечиться не успеть: посадка весит как раньше', () => {
    const state = carrier('larva-broken', EARLY);
    state.ship.rooms[roomOf(state, 'SURGERY')]!.hasMalfunction = true;
    expect(inTime(state)).toBe(false);
    expect(weights(state).board).toBeCloseTo(weights(state, withoutCure).board);
  });

  it('к концу партии на Операцию и путь к укрытию раундов не хватит — садиться с Личинкой', () => {
    const state = carrier('larva-late', LATE);
    expect(inTime(state)).toBe(false);
    expect(weights(state).board).toBeCloseTo(weights(state, withoutCure).board);
  });

  it('Антидот лечит где угодно — успевается всегда', () => {
    const state = carrier('larva-antidote', LATE);
    state.ship.rooms[roomOf(state, 'SURGERY')]!.hasMalfunction = true;
    state.players[BOT]!.inventory = [structuredClone(CRAFTED_ITEM_CARDS.find((item) => item.recipeId === 'ANTIDOTE')!)];
    expect(inTime(state)).toBe(true);
  });

  it('без Личинки посадка не дешевеет', () => {
    const state = carrier('larva-none', EARLY);
    state.players[BOT]!.hasLarva = false;
    expect(weights(state).board).toBeCloseTo(weights(state, withoutCure).board);
  });
});
