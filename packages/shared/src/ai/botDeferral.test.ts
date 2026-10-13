import { describe, expect, it } from 'vitest';
import type { GameState } from '../types/state.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { putIntruder, putPlayer } from '../testing/contactFixtures.js';
import { BOT, agendaFor, botTable, rankedFor } from '../testing/botTacticsFixtures.js';
import { deferralCosts } from './botDeferral.js';
import { hopDistances } from './botGraph.js';
import { threatContext } from './botThreat.js';
import { BOT_TUNING, type BotTuning } from './botTuning.js';
import type { ScoredCandidate } from './botUtility.js';

const LAST_ROUND = 14;
const NEXT_TO_LAST = 13;
const LIFELINE = BOT_TUNING.desires.SURVIVE * BOT_TUNING.tactics.harm.weight;
const ENGINE_ROOM = 19;
const FAR_POD = 3;

function tileAt(state: GameState, roomId: number, definitionId: string): void {
  const holder = Object.values(state.ship.rooms).find((room) => room.definitionId === definitionId);
  if (holder) holder.definitionId = state.ship.rooms[roomId]!.definitionId;
  state.ship.rooms[roomId]!.definitionId = definitionId;
  state.ship.rooms[roomId]!.isExplored = true;
}

/** Корабль открыт, открыта только Капсула B в отсеке 3; бот в Машинном отсеке 19 — в шести Коридорах от неё. */
function farPod(seed: string, time: number): GameState {
  const state = botTable(seed);
  tileAt(state, FAR_POD, 'ESCAPE_POD_B');
  for (const room of Object.values(state.ship.rooms)) room.isExplored = true;
  for (const pod of Object.values(state.ship.escapePods)) pod.isLocked = pod.section !== 'B';
  for (const corridor of Object.values(state.ship.corridors)) corridor.doorState = 'OPEN';
  putPlayer(state, BOT, ENGINE_ROOM);
  putPlayer(state, 'player-1', 1);
  state.players[BOT]!.objectives = [];
  state.meta.timeTrackPosition = time;
  return state;
}

function boardStake(state: GameState): number {
  return agendaFor(state).tasks.find((entry) => entry.kind === 'BOARD_POD')!.weight / LIFELINE;
}

const passOf = (ranked: readonly ScoredCandidate[]) => ranked.find((entry) => entry.candidate.kind === 'PASS')!;
const withoutDeferral: BotTuning = {
  ...BOT_TUNING,
  tactics: { ...BOT_TUNING.tactics, deferral: { ...BOT_TUNING.tactics.deferral, weight: 0 } },
};

/** Обычное Движение в соседнюю Комнату, ближайшую к Капсуле. */
function stepTowardsPod(state: GameState, ranked: readonly ScoredCandidate[]): ScoredCandidate {
  const toPod = hopDistances(filterStateForPlayer(state, BOT), FAR_POD);
  const moves = ranked.filter((entry) => entry.candidate.kind === 'MOVE');
  return moves.reduce((best, entry) =>
    toPod.get(entry.candidate.roomId)! < toPod.get(best.candidate.roomId)! ? entry : best,
  );
}

describe('Цена откладывания укрытия (стр. 11: кто не укрылся к Прыжку, гибнет)', () => {
  it('Пас, после которого карт до Прыжка на путь не хватит, отнимает укрытие; шаг по пути — нет', () => {
    const state = farPod('deferral-deadline', NEXT_TO_LAST);
    const ranked = rankedFor(state);
    expect(passOf(ranked).factors.deferral).toBeGreaterThan(0.8 * boardStake(state));
    expect(stepTowardsPod(state, ranked).factors.deferral).toBeCloseTo(0);
    expect(passOf(ranked).factors.safety).toBeCloseTo(0);
  });

  it('где Капсула, неизвестно и шанс дойти мал, но Пас не оставляет никакого: с ценой откладывания бот идёт', () => {
    const state = farPod('deferral-flip', NEXT_TO_LAST);
    for (const [roomId, hops] of hopDistances(filterStateForPlayer(state, BOT), ENGINE_ROOM)) {
      const room = state.ship.rooms[roomId]!;
      if (hops >= 4 && room.category !== 'SPECIAL') room.isExplored = false;
      if (hops !== 1) continue;
      putIntruder(state, 'ADULT', roomId);
      putIntruder(state, 'ADULT', roomId);
    }
    const careless = rankedFor(state, withoutDeferral);
    expect(passOf(careless).utility).toBeGreaterThan(stepTowardsPod(state, careless).utility);
    const ranked = rankedFor(state);
    expect(passOf(ranked).factors.deferral).toBeCloseTo(boardStake(state));
    expect(stepTowardsPod(state, ranked).utility).toBeGreaterThan(passOf(ranked).utility);
  });

  it('в самом укрытии, пока до Прыжка есть раунд, ни посадка, ни Пас ничего не откладывают', () => {
    const state = farPod('deferral-board', NEXT_TO_LAST);
    putPlayer(state, BOT, FAR_POD);
    const ranked = rankedFor(state);
    const board = ranked.find((entry) => entry.candidate.effects.some((produced) => produced.kind === 'BOARD_POD'))!;
    expect(board.factors.deferral).toBe(0);
    expect(passOf(ranked).factors.deferral).toBe(0);
  });

  it('пока время есть, ожидание почти бесплатно: Пас теряет лишь рост опасности пути', () => {
    const state = farPod('deferral-early', 2);
    const pass = passOf(rankedFor(state)).factors.deferral;
    expect(pass).toBeGreaterThan(0);
    expect(pass).toBeLessThan(0.2 * boardStake(state));
  });

  it('без роста опасности за раунд ожидание дешевле', () => {
    const state = farPod('deferral-growth', 2);
    const calm: BotTuning = {
      ...BOT_TUNING,
      tactics: { ...BOT_TUNING.tactics, deferral: { ...BOT_TUNING.tactics.deferral, routeGrowth: 0 } },
    };
    expect(passOf(rankedFor(state)).factors.deferral).toBeGreaterThan(passOf(rankedFor(state, calm)).factors.deferral);
  });

  it('в последнем раунде цены откладывания нет: гибель при Прыжке уже в прогнозе вреда', () => {
    const state = farPod('deferral-last', LAST_ROUND);
    const ranked = rankedFor(state);
    expect(ranked.every((entry) => entry.factors.deferral === 0)).toBe(true);
    expect(passOf(ranked).factors.harm).toBeGreaterThanOrEqual(1);
  });

  it('без укрытий в повестке цены откладывания нет', () => {
    const state = farPod('deferral-none', NEXT_TO_LAST);
    const view = filterStateForPlayer(state, BOT);
    const threat = threatContext(view, view.players[BOT]!, BOT_TUNING);
    const candidates = rankedFor(state).map((entry) => entry.candidate);
    expect(deferralCosts(threat, [], candidates, 1).size).toBe(0);
  });
});
