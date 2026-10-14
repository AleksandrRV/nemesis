import { describe, expect, it } from 'vitest';
import type { GameState } from '../types/state.js';
import { HIBERNATION_OPENS_AT_TIME } from '../data/evacuation.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { putIntruder, putPlayer } from '../testing/contactFixtures.js';
import { roomOf } from '../testing/roomFixtures.js';
import { BOT, botTable, rankedFor } from '../testing/botTacticsFixtures.js';
import { forecastHarm } from './botForecast.js';
import { corridorsAround, otherEnd } from './botGraph.js';
import { eventPursuitChance, followChance, returnTripHarm } from './botPursuit.js';
import { SILENCE_SHARE } from './botRisk.js';
import { eventLeaveChance, shelterAccess } from './botShelter.js';
import { attacksFromRoom, threatContext } from './botThreat.js';
import { BOT_TUNING } from './botTuning.js';

const context = (state: GameState) => {
  const view = filterStateForPlayer(state, BOT);
  return threatContext(view, view.players[BOT]!, BOT_TUNING);
};

function neighboursOf(state: GameState, roomId: number): number[] {
  return corridorsAround(filterStateForPlayer(state, BOT), roomId).map((corridor) => otherEnd(corridor, roomId));
}

function openAround(state: GameState, roomId: number): void {
  for (const corridor of Object.values(state.ship.corridors)) {
    if (corridor.fromRoomId === roomId || corridor.toRoomId === roomId) corridor.doorState = 'OPEN';
  }
}

/** Бот один на один со Взрослой в Спасательном отсеке B с открытой Капсулой; соседние Комнаты исследованы. */
function occupiedPod(seed: string): { state: GameState; pod: number; exit: number; intruder: string } {
  const state = botTable(seed);
  for (const escapePod of Object.values(state.ship.escapePods)) escapePod.isLocked = escapePod.section !== 'B';
  const pod = roomOf(state, 'ESCAPE_POD_B');
  state.ship.rooms[pod]!.isExplored = true;
  openAround(state, pod);
  for (const neighbour of neighboursOf(state, pod)) state.ship.rooms[neighbour]!.isExplored = true;
  putPlayer(state, BOT, pod);
  putPlayer(state, 'player-1', 19);
  const intruder = putIntruder(state, 'ADULT', pod);
  const exit = neighboursOf(state, pod).find((roomId) => state.ship.rooms[roomId]?.definitionId !== 'ESCAPE_POD_A')!;
  return { state, pod, exit, intruder };
}

describe('Чужой идёт следом за ботом (стр. 9, 15, 18)', () => {
  it('карта События ведёт Чужого в соседнюю Комнату: по всем соседям — не больше шанса уйти по карте', () => {
    const { state, pod } = occupiedPod('pursuit-event');
    putPlayer(state, BOT, 19);
    const ctx = context(state);
    const intruder = ctx.view.intrudersPool.boardTokens.find((token) => token.roomId === pod)!;
    const toNeighbours = neighboursOf(state, pod).reduce((sum, to) => sum + eventPursuitChance(ctx, intruder, to), 0);
    expect(toNeighbours).toBeGreaterThan(0);
    expect(toNeighbours).toBeLessThanOrEqual(eventLeaveChance(ctx.view, intruder) + 1e-9);
  });

  it('закрытая Дверь держит Чужого: по карте События он в ту Комнату не идёт', () => {
    const { state, pod, exit } = occupiedPod('pursuit-door');
    for (const corridor of Object.values(state.ship.corridors)) {
      const between = [corridor.fromRoomId, corridor.toRoomId];
      if (between.includes(pod) && between.includes(exit)) corridor.doorState = 'CLOSED';
    }
    const ctx = context(state);
    const intruder = ctx.view.intrudersPool.boardTokens.find((token) => token.roomId === pod)!;
    expect(eventPursuitChance(ctx, intruder, exit)).toBe(0);
  });

  it('Чужого, которого держит в Бою другой Персонаж, уход бота не освобождает', () => {
    const { state, pod, exit } = occupiedPod('pursuit-guarded');
    expect(followChance(context(state), pod, exit)).toBeGreaterThan(0);
    putPlayer(state, 'player-1', pod);
    expect(followChance(context(state), pod, exit)).toBe(0);
  });

  it('со Слизью «Тишина» на кубике — тоже «Опасность»: Чужой приходит следом чаще', () => {
    const { state, pod, exit } = occupiedPod('pursuit-slime');
    const clean = followChance(context(state), pod, exit);
    state.players[BOT]!.hasSlime = true;
    const slimed = followChance(context(state), pod, exit);
    const ctx = context(state);
    const intruder = ctx.view.intrudersPool.boardTokens.find((token) => token.roomId === pod)!;
    expect(slimed - clean).toBeCloseTo(SILENCE_SHARE * (1 - eventPursuitChance(ctx, intruder, exit)));
  });

  it('в Комнату с Персонажем бот входит без броска Шума: следом — только по карте События', () => {
    const { state, pod, exit } = occupiedPod('pursuit-company');
    putPlayer(state, 'player-1', exit);
    const ctx = context(state);
    const intruder = ctx.view.intrudersPool.boardTokens.find((token) => token.roomId === pod)!;
    expect(followChance(ctx, pod, exit)).toBeCloseTo(eventPursuitChance(ctx, intruder, exit));
  });
});

describe('Занятый Спасательный отсек: уход вместе с обратной дорогой (стр. 19, 26)', () => {
  it('уйти из занятого отсека — с шансом погони вернуться Побегом ещё раз', () => {
    const { state, pod, exit } = occupiedPod('return-trip');
    const ctx = context(state);
    expect(returnTripHarm(ctx, pod, exit, [pod])).toBeCloseTo(followChance(ctx, pod, exit) * attacksFromRoom(ctx, pod));
    expect(returnTripHarm(ctx, pod, exit, [pod])).toBeGreaterThan(0);
  });

  it('в свободное укрытие уходить можно без цены возврата, а в занятое — нет', () => {
    const { state, pod, exit } = occupiedPod('return-free');
    expect(returnTripHarm(context(state), pod, exit, [pod, exit])).toBe(0);
    putIntruder(state, 'CREEPER', exit);
    expect(returnTripHarm(context(state), pod, exit, [pod, exit])).toBeGreaterThan(0);
  });

  it('прогноз Побега из отсека с открытой Капсулой несёт обратную дорогу, из запертого — нет', () => {
    const { state, pod, exit } = occupiedPod('return-forecast');
    const escape = rankedFor(state).find(
      (entry) => entry.candidate.kind === 'ESCAPE' && entry.candidate.roomId === exit,
    )!;
    const open = forecastHarm(context(state), escape.candidate).later;
    const returning = returnTripHarm(context(state), pod, exit, [pod]);
    for (const escapePod of Object.values(state.ship.escapePods)) escapePod.isLocked = true;
    const locked = forecastHarm(context(state), escape.candidate).later;
    expect(open - locked).toBeCloseTo(returning);
  });

  it('Чужой в отсеке, куда бот входит сейчас, по карте События не уйдёт: укрытие доступно лишь под огнём', () => {
    const { state, pod } = occupiedPod('access-present');
    putPlayer(state, BOT, 19);
    state.players[BOT]!.handSlots = [];
    const ctx = context(state);
    expect(shelterAccess(ctx, pod)).toBeGreaterThan(0);
    expect(shelterAccess(ctx, pod, true)).toBe(0);
  });

  it('Криогенный отсек до синего поля — ещё не укрытие: уход из него без цены возврата, после — с ней', () => {
    const state = botTable('return-cryo');
    const cryo = roomOf(state, 'HIBERNATORIUM');
    openAround(state, cryo);
    for (const neighbour of neighboursOf(state, cryo)) state.ship.rooms[neighbour]!.isExplored = true;
    putPlayer(state, BOT, cryo);
    putPlayer(state, 'player-1', 19);
    putIntruder(state, 'ADULT', cryo);
    const exit = neighboursOf(state, cryo)[0]!;
    const escapeLater = () => {
      const escape = rankedFor(state).find(
        (entry) => entry.candidate.kind === 'ESCAPE' && entry.candidate.roomId === exit,
      )!;
      return forecastHarm(context(state), escape.candidate).later;
    };
    state.meta.timeTrackPosition = HIBERNATION_OPENS_AT_TIME - 1;
    const closed = escapeLater();
    state.meta.timeTrackPosition = HIBERNATION_OPENS_AT_TIME;
    expect(escapeLater() - closed).toBeCloseTo(returnTripHarm(context(state), cryo, exit, [cryo]));
    expect(returnTripHarm(context(state), cryo, exit, [cryo])).toBeGreaterThan(0);
  });
});
