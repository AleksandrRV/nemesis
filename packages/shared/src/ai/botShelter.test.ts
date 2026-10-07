import { describe, expect, it } from 'vitest';
import { EVENT_CARDS } from '../data/eventCards.js';
import type { GameState } from '../types/state.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { putIntruder, putPlayer } from '../testing/contactFixtures.js';
import { BOT, agendaFor, botTable, neutralMind, rankedFor } from '../testing/botTacticsFixtures.js';
import { generateCandidates } from './botActions.js';
import type { BotTask } from './botTasks.js';
import { eventLeaveChance, routeHarm, shelterAccess } from './botShelter.js';
import { entryHarm, intruderHarm, intrudersIn, threatContext } from './botThreat.js';
import { BOT_TUNING } from './botTuning.js';
import { scoreCandidates } from './botUtility.js';

const LAST_ROUNDS = 13;

/** Кладёт тайл в отсек (меняясь с отсеком, где он лежал) и открывает его. */
function tileAt(state: GameState, roomId: number, definitionId: string): number {
  const holder = Object.values(state.ship.rooms).find((room) => room.definitionId === definitionId);
  if (holder) holder.definitionId = state.ship.rooms[roomId]!.definitionId;
  state.ship.rooms[roomId]!.definitionId = definitionId;
  state.ship.rooms[roomId]!.isExplored = true;
  return roomId;
}

function contextOf(state: GameState) {
  const view = filterStateForPlayer(state, BOT);
  return threatContext(view, view.players[BOT]!, BOT_TUNING);
}

/** Ценность Движения в Комнату только по одной задаче повестки. */
function valueFor(state: GameState, kind: BotTask['kind'], roomId: number): number {
  const view = filterStateForPlayer(state, BOT);
  const mind = neutralMind(state);
  const agenda = agendaFor(state);
  const only = { ...agenda, tasks: agenda.tasks.filter((entry) => entry.kind === kind) };
  expect(only.tasks).toHaveLength(1);
  const scored = scoreCandidates(view, mind, only, generateCandidates(view, mind, only.tasks, BOT_TUNING), BOT_TUNING);
  return scored.find((entry) => entry.candidate.kind === 'MOVE' && entry.candidate.roomId === roomId)!.factors
    .taskValue;
}

/** Капсулы открыты в отсеках 2 и 10, бот в отсеке 6 — рядом с Капсулой A и в двух шагах от Капсулы B. */
function podRace(seed: string): GameState {
  const state = botTable(seed);
  tileAt(state, 2, 'ESCAPE_POD_A');
  tileAt(state, 10, 'ESCAPE_POD_B');
  for (const pod of Object.values(state.ship.escapePods)) pod.isLocked = false;
  for (const corridor of Object.values(state.ship.corridors)) corridor.doorState = 'OPEN';
  putPlayer(state, BOT, 6);
  putPlayer(state, 'player-1', 19);
  state.players[BOT]!.objectives = [];
  state.meta.timeTrackPosition = LAST_ROUNDS;
  return state;
}

describe('Путь к укрытию по цене всего маршрута (стр. 11, 19, 25)', () => {
  it('в последние раунды бот идёт к свободной Капсуле, а не к соседней, занятой Чужим', () => {
    const state = podRace('shelter-free-pod');
    state.players[BOT]!.handSlots = [];
    putIntruder(state, 'ADULT', 2);
    const board = agendaFor(state).tasks.find((entry) => entry.kind === 'BOARD_POD')!;
    expect(board.lifeline).toBe(true);
    expect(valueFor(state, 'BOARD_POD', 5)).toBeGreaterThan(valueFor(state, 'BOARD_POD', 2));
    expect(valueFor(state, 'BOARD_POD', 2)).toBeLessThan(board.weight);
    expect(rankedFor(state)[0]!.candidate.roomId).toBe(5);
  });

  it('свободная соседняя Капсула стоит всей задачи: шаг к ней — почти наверняка спасение', () => {
    const state = podRace('shelter-near-pod');
    const board = agendaFor(state).tasks.find((entry) => entry.kind === 'BOARD_POD')!;
    expect(valueFor(state, 'BOARD_POD', 2)).toBeGreaterThan(0.9 * board.weight);
  });

  it('соседняя Капсула занята — шаг к закрытому тайлу, где может быть второй Спасательный отсек, тоже ценен', () => {
    const state = podRace('shelter-unknown-pod');
    state.players[BOT]!.handSlots = [];
    state.ship.rooms[10]!.isExplored = false;
    putIntruder(state, 'ADULT', 2);
    const board = agendaFor(state).tasks.find((entry) => entry.kind === 'BOARD_POD')!;
    expect(board.lifeline).toBe(true);
    expect(board.place.definitionIds).toContain('ESCAPE_POD_B');
    expect(valueFor(state, 'BOARD_POD', 5)).toBeGreaterThan(0);
  });

  it('путь к Анабиозу в обход Комнаты с Чужим ценнее: уходя из неё, бот получит Атаку', () => {
    const state = botTable('shelter-detour');
    for (const corridor of Object.values(state.ship.corridors)) corridor.doorState = 'OPEN';
    putPlayer(state, BOT, 7);
    putPlayer(state, 'player-1', 19);
    putIntruder(state, 'ADULT', 6);
    state.meta.timeTrackPosition = LAST_ROUNDS;
    const hibernate = agendaFor(state).tasks.find((entry) => entry.kind === 'HIBERNATE')!;
    expect(hibernate.lifeline).toBe(true);
    expect(valueFor(state, 'HIBERNATE', 8)).toBeGreaterThan(valueFor(state, 'HIBERNATE', 6));
  });
});

describe('Доступность укрытия: Действие Комнаты в Бою не выполнить (стр. 25)', () => {
  it('пустое укрытие доступно; без Оружия занятое освобождается, только если Чужой уйдёт сам', () => {
    const state = podRace('shelter-access');
    state.players[BOT]!.handSlots = [];
    expect(shelterAccess(contextOf(state), 2)).toBe(1);
    putIntruder(state, 'ADULT', 2);
    const context = contextOf(state);
    const [intruder] = intrudersIn(context.view, 2);
    expect(shelterAccess(context, 2)).toBeCloseTo(eventLeaveChance(context.view, intruder!));
    expect(shelterAccess(context, 2)).toBeLessThan(1);
  });

  it('с заряженным Оружием занятое укрытие доступнее: Чужого можно убрать выстрелами', () => {
    const state = podRace('shelter-armed');
    putIntruder(state, 'ADULT', 2);
    const armed = shelterAccess(contextOf(state), 2);
    state.players[BOT]!.handSlots = [];
    expect(armed).toBeGreaterThan(shelterAccess(contextOf(state), 2));
  });
});

describe('Чужой уходит по карте События (стр. 10, 17)', () => {
  it('Чужой в Бою с Персонажем не уходит; без Персонажа — по доле карт с его символом и выходом', () => {
    const state = podRace('leave-crew');
    putIntruder(state, 'ADULT', 2);
    const free = eventLeaveChance(filterStateForPlayer(state, BOT), state.intrudersPool.boardTokens[0]!);
    expect(free).toBeGreaterThan(0);
    expect(free).toBeLessThan(1);
    putPlayer(state, 'player-1', 2);
    expect(eventLeaveChance(filterStateForPlayer(state, BOT), state.intrudersPool.boardTokens[0]!)).toBe(0);
  });

  it('закрытые Двери держат Чужого, а сыгранные карты из открытого сброса уже не сдвинут его до замеса', () => {
    const state = podRace('leave-doors');
    putIntruder(state, 'ADULT', 2);
    const intruder = state.intrudersPool.boardTokens[0]!;
    const open = eventLeaveChance(filterStateForPlayer(state, BOT), intruder);
    for (const corridor of Object.values(state.ship.corridors)) {
      if (corridor.fromRoomId === 2 || corridor.toRoomId === 2) corridor.doorState = 'CLOSED';
    }
    expect(eventLeaveChance(filterStateForPlayer(state, BOT), intruder)).toBeLessThan(open);
    state.decks.events.discard = EVENT_CARDS.filter((card) => card.intruderTypes.includes('ADULT')).map((card) => ({
      ...card,
      intruderTypes: [...card.intruderTypes],
    }));
    state.decks.events.drawPile = state.decks.events.drawPile.filter((card) => !card.intruderTypes.includes('ADULT'));
    expect(eventLeaveChance(filterStateForPlayer(state, BOT), intruder)).toBe(0);
  });
});

describe('Вред оставшегося пути (стр. 13–19)', () => {
  it('уходя из Комнаты с Чужим, бот получает его Атаку, а вход в соседнюю Комнату — бросок Шума', () => {
    const state = podRace('route-escape');
    putIntruder(state, 'ADULT', 6);
    const context = contextOf(state);
    const entry = entryHarm(context, 2, context.self.handLimit - 1, false);
    expect(entry).toBeGreaterThan(0);
    expect(routeHarm(context, 6, 2, 1)).toBeCloseTo(intruderHarm(context, 'ADULT') + entry);
  });

  it('в занятом укрытии Шум не бросают, но до его освобождения — Атаки', () => {
    const state = podRace('route-occupied');
    state.players[BOT]!.handSlots = [];
    putIntruder(state, 'ADULT', 2);
    const context = contextOf(state);
    const blocked = 1 - shelterAccess(context, 2);
    expect(entryHarm(context, 2, context.self.handLimit - 1, false)).toBe(0);
    expect(routeHarm(context, 6, 2, 1)).toBeCloseTo(blocked * intruderHarm(context, 'ADULT'));
  });

  it('уже в укрытии идти некуда: вред пути — ноль', () => {
    const state = podRace('route-here');
    expect(routeHarm(contextOf(state), 2, 2, 1)).toBe(0);
  });
});
