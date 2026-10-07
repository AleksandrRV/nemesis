import { describe, expect, it } from 'vitest';
import type { ExplorationEffect } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import { GameEngine } from '../logic/fsm.js';
import { appendGameLog } from '../logic/gameLog.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { putIntruder, putPlayer } from '../testing/contactFixtures.js';
import { standAt } from '../testing/roomFixtures.js';
import { BOT, agendaFor, botTable, handOf, neutralMind } from '../testing/botTacticsFixtures.js';
import { generateCandidates } from './botActions.js';
import { roomTypeProbability } from './botNavigation.js';
import { dangerHarm, entryHarm, threatContext } from './botThreat.js';
import { BOT_TUNING, type BotTuning } from './botTuning.js';
import { scoreCandidates, type ScoredCandidate } from './botUtility.js';

const HATCH = 'HATCH_CONTROL';

function withFindShare(findShare: number): BotTuning {
  return { ...BOT_TUNING, navigation: { ...BOT_TUNING.navigation, findShare } };
}

/** Ценность Движения в Комнату только по задаче «Разблокировать Капсулы» — без примеси других задач. */
function unlockValue(state: GameState, roomId: number, tuning: BotTuning) {
  const view = filterStateForPlayer(state, BOT);
  const mind = neutralMind(state);
  const agenda = agendaFor(state);
  const unlock = agenda.tasks.find((entry) => entry.kind === 'UNLOCK_POD')!;
  const only = { ...agenda, tasks: [unlock] };
  const scored = scoreCandidates(view, mind, only, generateCandidates(view, mind, only.tasks, tuning), tuning);
  const move = scored.find((entry) => entry.candidate.kind === 'MOVE' && entry.candidate.roomId === roomId)!;
  return { taskValue: move.factors.taskValue, weight: unlock.weight };
}

function peek(
  state: GameState,
  playerId: string,
  roomId: number,
  roomDefinitionId: string,
  effect: ExplorationEffect | null = null,
): void {
  appendGameLog(state, {
    type: 'ROOM_PEEKED',
    playerId,
    roomId,
    roomName: roomDefinitionId,
    source: 'OBSERVATION_ROOM',
    roomDefinitionId,
    effect,
    itemsCount: null,
    peekCount: 1,
  });
}

/** Кладёт тайл Контроля шлюзов в отсек: меняется тайлами с отсеком, где он лежал, или вытесняет лишний тайл «2». */
function hatchAt(state: GameState, roomId: number): number {
  const holder = Object.values(state.ship.rooms).find((room) => room.definitionId === HATCH);
  if (holder) holder.definitionId = state.ship.rooms[roomId]!.definitionId;
  state.ship.rooms[roomId]!.definitionId = HATCH;
  return roomId;
}

function closedNeighbourOf(state: GameState, roomId: number): number {
  const corridor = Object.values(state.ship.corridors).find(
    (candidate) =>
      (candidate.fromRoomId === roomId || candidate.toRoomId === roomId) &&
      !state.ship.rooms[candidate.fromRoomId === roomId ? candidate.toRoomId : candidate.fromRoomId]!.isExplored &&
      state.ship.rooms[candidate.fromRoomId === roomId ? candidate.toRoomId : candidate.fromRoomId]!.category ===
        'ROOM_2',
  )!;
  corridor.doorState = 'OPEN';
  return corridor.fromRoomId === roomId ? corridor.toRoomId : corridor.fromRoomId;
}

describe('Разведка закрытых тайлов (стр. 6, 14): поиск цели задачи', () => {
  it('вход в закрытый тайл, который может оказаться Контролем шлюзов, прибавляет шанс находки × вес задачи', () => {
    const state = botTable('search-hatch');
    const tile = closedNeighbourOf(state, state.players[BOT]!.roomId);
    const found = roomTypeProbability(filterStateForPlayer(state, BOT), tile, HATCH);
    const plain = unlockValue(state, tile, withFindShare(0));
    const searching = unlockValue(state, tile, withFindShare(1));
    const travel = plain.taskValue / plain.weight;
    expect(found).toBeCloseTo(1 / 9);
    expect(searching.taskValue).toBeCloseTo(plain.weight * (travel + found * (1 - travel)));
    expect(searching.taskValue).toBeGreaterThan(plain.taskValue);
  });

  it('Контроль шлюзов уже открыт — закрытые тайлы его не прячут, прибавки за поиск нет', () => {
    const state = botTable('search-known');
    const tile = closedNeighbourOf(state, state.players[BOT]!.roomId);
    const known = Object.values(state.ship.rooms).find(
      (room) => room.category === 'ROOM_2' && room.id !== tile && !room.isExplored,
    )!;
    state.ship.rooms[hatchAt(state, known.id)]!.isExplored = true;
    expect(unlockValue(state, tile, withFindShare(1)).taskValue).toBeCloseTo(
      unlockValue(state, tile, withFindShare(0)).taskValue,
    );
  });

  it('в открытую Комнату поиск не ведёт: её тайл известен', () => {
    const state = botTable('search-explored');
    const tile = closedNeighbourOf(state, state.players[BOT]!.roomId);
    state.ship.rooms[tile]!.isExplored = true;
    expect(unlockValue(state, tile, withFindShare(1)).taskValue).toBeCloseTo(
      unlockValue(state, tile, withFindShare(0)).taskValue,
    );
  });
});

describe('Подсмотренный тайл (Комната Наблюдения, стр. 25) известен тому, кто подсмотрел', () => {
  it('свой подгляд раскрывает оборот и сужает стопку, чужой — ничего не говорит', () => {
    const state = botTable('search-peek');
    const [hatch, other] = Object.values(state.ship.rooms)
      .filter((room) => room.category === 'ROOM_2' && !room.isExplored)
      .map((room) => room.id);
    hatchAt(state, hatch!);
    peek(state, 'player-1', hatch!, HATCH);
    const blind = filterStateForPlayer(state, BOT);
    expect(roomTypeProbability(blind, hatch!, HATCH)).toBeCloseTo(1 / 9);
    peek(state, BOT, hatch!, HATCH);
    const seen = filterStateForPlayer(state, BOT);
    expect(roomTypeProbability(seen, hatch!, HATCH)).toBe(1);
    expect(roomTypeProbability(seen, hatch!, 'CABINS')).toBe(0);
    expect(roomTypeProbability(seen, other!, HATCH)).toBe(0);
    expect(roomTypeProbability(seen, other!, 'CABINS')).toBeCloseTo(1 / 8);
  });

  it('подсмотрев Контроль шлюзов за соседней Дверью, бот ценит шаг к нему выше шагов в другие закрытые тайлы', () => {
    const state = botTable('search-peek-move');
    const here = state.players[BOT]!.roomId;
    const exits = Object.values(state.ship.corridors).filter(
      (corridor) => corridor.fromRoomId === here || corridor.toRoomId === here,
    );
    for (const corridor of exits) corridor.doorState = 'OPEN';
    const tile = hatchAt(state, closedNeighbourOf(state, here));
    peek(state, BOT, tile, HATCH);
    const seen = unlockValue(state, tile, BOT_TUNING).taskValue;
    const others = exits
      .map((corridor) => (corridor.fromRoomId === here ? corridor.toRoomId : corridor.fromRoomId))
      .filter((roomId) => roomId !== tile && !state.ship.rooms[roomId]!.isExplored);
    expect(others.length).toBeGreaterThan(0);
    for (const roomId of others) expect(seen).toBeGreaterThan(unlockValue(state, roomId, BOT_TUNING).taskValue);
  });
});

describe('Комната Наблюдения (стр. 25): подсмотреть закрытый тайл и его жетон', () => {
  function observer(seed: string): GameState {
    const state = botTable(seed);
    standAt(state, BOT, 'OBSERVATION_ROOM');
    putPlayer(state, 'player-1', state.players[BOT]!.roomId);
    handOf(state, [], 5);
    return state;
  }

  function observations(state: GameState): ScoredCandidate[] {
    const view = filterStateForPlayer(state, BOT);
    const mind = neutralMind(state);
    const agenda = agendaFor(state);
    const unlock = { ...agenda, tasks: agenda.tasks.filter((entry) => entry.kind === 'UNLOCK_POD') };
    return scoreCandidates(
      view,
      mind,
      unlock,
      generateCandidates(view, mind, agenda.tasks, BOT_TUNING),
      BOT_TUNING,
    ).filter((entry) => entry.candidate.effects.some((produced) => produced.kind === 'OBSERVE'));
  }

  it('бот предлагает подсмотреть каждую закрытую Комнату, и движок принимает это Действие', () => {
    const state = observer('observe-offer');
    const closed = Object.values(state.ship.rooms).filter((room) => !room.isExplored);
    const offered = observations(state);
    expect(offered).toHaveLength(closed.length);
    const next = new GameEngine().processAction(state, offered[0]!.candidate.action, { actorId: BOT });
    expect(next.gameLog.at(-1)?.event).toMatchObject({ type: 'ROOM_PEEKED', playerId: BOT });
  });

  it('подсмотреть тайл, который может оказаться Контролем шлюзов, ценно; уже подсмотренный — не предлагается', () => {
    const state = observer('observe-value');
    const hatchSlot = Object.values(state.ship.rooms).find((room) => room.category === 'ROOM_2' && !room.isExplored)!;
    const stackOne = Object.values(state.ship.rooms).find((room) => room.category === 'ROOM_1' && !room.isExplored)!;
    const offered = observations(state);
    const valueOf = (roomId: number) =>
      offered.find((entry) => entry.candidate.effects.some((produced) => produced.detail.roomId === roomId))!.factors
        .taskValue;
    expect(valueOf(hatchSlot.id)).toBeGreaterThan(0);
    expect(valueOf(stackOne.id)).toBe(0);
    peek(state, BOT, hatchSlot.id, hatchSlot.definitionId!);
    expect(
      observations(state).some((entry) =>
        entry.candidate.effects.some((produced) => produced.detail.roomId === hatchSlot.id),
      ),
    ).toBe(false);
  });

  it('подсмотренный жетон бот знает точно: «Тишина» — вход без Шума, «Опасность» — приход соседнего Чужого', () => {
    const state = botTable('observe-token');
    const here = state.players[BOT]!.roomId;
    const corridor = Object.values(state.ship.corridors).find(
      (candidate) =>
        (candidate.fromRoomId === here || candidate.toRoomId === here) &&
        !state.ship.rooms[candidate.fromRoomId === here ? candidate.toRoomId : candidate.fromRoomId]!.isExplored,
    )!;
    corridor.doorState = 'OPEN';
    const target = corridor.fromRoomId === here ? corridor.toRoomId : corridor.fromRoomId;
    const lair = Object.values(state.ship.corridors)
      .filter((candidate) => candidate.fromRoomId === target || candidate.toRoomId === target)
      .map((candidate) => (candidate.fromRoomId === target ? candidate.toRoomId : candidate.fromRoomId))
      .find((roomId) => roomId !== here)!;
    putIntruder(state, 'ADULT', lair);
    const contextWith = (effect: ExplorationEffect | null) => {
      const copy = structuredClone(state);
      if (effect) peek(copy, BOT, target, copy.ship.rooms[target]!.definitionId!, effect);
      const view = filterStateForPlayer(copy, BOT);
      return threatContext(view, view.players[BOT]!, BOT_TUNING);
    };
    const unknown = entryHarm(contextWith(null), target, 4, false);
    expect(entryHarm(contextWith('SILENCE'), target, 4, false)).toBe(0);
    const danger = contextWith('DANGER');
    expect(entryHarm(danger, target, 4, false)).toBeCloseTo(dangerHarm(danger, target));
    expect(dangerHarm(danger, target)).toBeGreaterThan(0);
    expect(unknown).toBeGreaterThan(0);
  });
});
