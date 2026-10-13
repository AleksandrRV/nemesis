import { describe, expect, it } from 'vitest';
import type { ActionCard } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { putPlayer } from '../testing/contactFixtures.js';
import { roomOf } from '../testing/roomFixtures.js';
import { BOT, botTable, neutralMind } from '../testing/botTacticsFixtures.js';
import { buildAgenda } from './botGoals.js';
import { repairOdds } from './botNeeds.js';
import { repairablePodDefinitions } from './botThreat.js';
import { BOT_TUNING } from './botTuning.js';

const REPAIR_KINDS = new Set(['BASIC_REPAIR', 'REPAIR', 'FAST_REPAIR']);

/** Разблокирована только Капсула B, её отсек открыт и Неисправен. */
function brokenPod(seed: string): GameState {
  const state = botTable(seed);
  for (const pod of Object.values(state.ship.escapePods)) pod.isLocked = pod.section !== 'B';
  const podRoom = state.ship.rooms[roomOf(state, 'ESCAPE_POD_B')]!;
  podRoom.isExplored = true;
  podRoom.hasMalfunction = true;
  putPlayer(state, 'player-1', 19);
  state.players[BOT]!.objectives = [];
  state.players[BOT]!.inventory = [];
  state.players[BOT]!.handSlots = state.players[BOT]!.handSlots.filter((slot) => slot.source !== 'ITEM');
  state.meta.timeTrackPosition = 6;
  return state;
}

/** Своя карта Ремонта бота — в руке, в колоде добора или в сбросе. */
function ownRepairIn(state: GameState, pile: 'hand' | 'drawPile' | 'discard'): void {
  const deck = state.players[BOT]!.actionDeck;
  const isRepair = (card: (typeof deck.hand)[number]): card is ActionCard =>
    'effect' in card && REPAIR_KINDS.has(card.effect.kind);
  const repair = [...deck.hand, ...deck.drawPile, ...deck.discard].find(isRepair)!;
  deck.hand = deck.hand.filter((card) => card !== repair);
  deck.drawPile = deck.drawPile.filter((card) => card !== repair);
  deck.discard = deck.discard.filter((card) => card !== repair);
  deck[pile] = [...deck[pile], repair];
}

function agenda(state: GameState) {
  return buildAgenda(filterStateForPlayer(state, BOT), neutralMind(state), BOT_TUNING);
}

const boardOf = (state: GameState) => agenda(state).tasks.find((entry) => entry.kind === 'BOARD_POD');
const odds = (state: GameState) => {
  const view = filterStateForPlayer(state, BOT);
  return repairOdds({ view, mind: neutralMind(state), self: view.players[BOT]! });
};

describe('Шанс починить к следующему раунду (стр. 17, 18)', () => {
  it('карта Ремонта в руке — наверняка; в колоде добора — по доле добора; в сбросе — до замеса никак', () => {
    const state = brokenPod('odds');
    ownRepairIn(state, 'hand');
    expect(odds(state)).toBe(1);
    ownRepairIn(state, 'drawPile');
    const deck = state.players[BOT]!.actionDeck;
    const handLimit = filterStateForPlayer(state, BOT).players[BOT]!.handLimit;
    expect(odds(state)).toBeCloseTo(Math.min(1, handLimit / deck.drawPile.length));
    ownRepairIn(state, 'discard');
    expect(odds(state)).toBe(0);
  });
});

describe('Капсула в Неисправном Спасательном отсеке — цель на шанс её починить (стр. 17, 26)', () => {
  it('такой отсек — не место посадки, но его Капсулу откроет Ремонт', () => {
    const view = filterStateForPlayer(brokenPod('repairable'), BOT);
    expect(repairablePodDefinitions(view)).toEqual(['ESCAPE_POD_B']);
  });

  it('с картой Ремонта в руке посадка — полноценная цель, а Ремонт отсека наследует её вес', () => {
    const state = brokenPod('repair-in-hand');
    ownRepairIn(state, 'hand');
    const tasks = agenda(state).tasks;
    const board = tasks.find((entry) => entry.kind === 'BOARD_POD')!;
    const podRoom = roomOf(state, 'ESCAPE_POD_B');
    const fix = tasks.find((entry) => entry.kind === 'FIX_MALFUNCTION' && entry.detail.roomId === podRoom)!;
    const otherFix = tasks.find((entry) => entry.kind === 'FIX_MALFUNCTION' && entry.detail.roomId !== podRoom);
    expect(board.place.definitionIds).toEqual(['ESCAPE_POD_B']);
    expect(fix.weight).toBeGreaterThan(board.weight * BOT_TUNING.tactics.repairInheritance);
    if (otherFix) expect(fix.weight).toBeGreaterThan(otherFix.weight);
  });

  it('карта Ремонта ещё в колоде — посадка весит долю шанса её вытянуть', () => {
    const state = brokenPod('repair-in-deck');
    ownRepairIn(state, 'hand');
    const sure = boardOf(state)!.weight;
    ownRepairIn(state, 'drawPile');
    const hoped = boardOf(state)!.weight;
    expect(hoped).toBeGreaterThan(0);
    expect(hoped).toBeCloseTo(sure * odds(state));
  });

  it('чинить нечем и до замеса не будет — задачи посадки нет', () => {
    const state = brokenPod('repair-none');
    ownRepairIn(state, 'discard');
    expect(boardOf(state)).toBeUndefined();
  });

  it('при открытом исправном отсеке сломанный добавляется к целям, только если чинить есть чем', () => {
    const state = brokenPod('repair-both');
    for (const pod of Object.values(state.ship.escapePods)) pod.isLocked = false;
    const podA = state.ship.rooms[roomOf(state, 'ESCAPE_POD_A')]!;
    podA.isExplored = true;
    podA.hasMalfunction = false;
    ownRepairIn(state, 'discard');
    expect(boardOf(state)!.place.definitionIds).toEqual(['ESCAPE_POD_A']);
    ownRepairIn(state, 'hand');
    expect(boardOf(state)!.place.definitionIds).toEqual(['ESCAPE_POD_A', 'ESCAPE_POD_B']);
  });
});
