import { describe, expect, it } from 'vitest';
import {
  CORPORATE_OBJECTIVE_CARDS,
  PERSONAL_OBJECTIVE_CARDS,
  SOLO_COOP_OBJECTIVE_CARDS,
} from '../data/objectiveCards.js';
import { ACTION_CARDS } from '../data/actionCards.js';
import { CARD_OPTION } from '../types/cardOptions.js';
import type { GameState } from '../types/state.js';
import { OBJECTIVE_CONDITIONS } from '../logic/objectiveConditions.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { contactState, putIntruder, putPlayer } from '../testing/contactFixtures.js';
import { roomOf, standAt } from '../testing/roomFixtures.js';
import { BOT, inspectEngine, mindFor, seen, withCharacter } from '../testing/botSocialFixtures.js';
import { generateCandidates } from './botActions.js';
import { buildAgenda } from './botGoals.js';
import type { BotMind } from './botMind.js';
import { findRoute } from './botNavigation.js';
import { OBJECTIVE_PLANNERS } from './botObjectivePlanner.js';
import { BOT_TUNING } from './botTuning.js';
import { chooseCandidate, scoreCandidates } from './botUtility.js';

const EARTH = SOLO_COOP_OBJECTIVE_CARDS.find((card) => card.id === 'OBJ_SOLO_DESTINATION_EARTH')!;

function onBotTurn(state: GameState): GameState {
  const next = structuredClone(state);
  next.meta.activePlayerId = BOT;
  next.pendingDecision = null;
  next.players[BOT]!.hasPassed = false;
  return next;
}

function neutral(state: GameState): BotMind {
  return seen(state, withCharacter(mindFor(state), {}));
}

function ranked(state: GameState, mind: BotMind = neutral(state)) {
  const view = filterStateForPlayer(state, BOT);
  const agenda = buildAgenda(view, mind, BOT_TUNING);
  return scoreCandidates(view, mind, agenda, generateCandidates(view, mind, agenda.tasks, BOT_TUNING), BOT_TUNING);
}

function neighbourOf(state: GameState, roomId: number): number {
  const corridor = Object.values(state.ship.corridors).find(
    (candidate) => candidate.fromRoomId === roomId || candidate.toRoomId === roomId,
  )!;
  corridor.doorState = 'OPEN';
  return corridor.fromRoomId === roomId ? corridor.toRoomId : corridor.fromRoomId;
}

describe('Utility AI (план 0.8.0, В8-7)', () => {
  it('бот уходит из горящей Комнаты', () => {
    const state = onBotTurn(contactState(2, 'utility-fire'));
    state.ship.rooms[state.players[BOT]!.roomId]!.hasFire = true;
    const [best] = ranked(state);
    expect(best!.candidate.action.type).toBe('ACTION_MOVE');
    expect(state.ship.rooms[best!.candidate.roomId]!.hasFire).toBe(false);
  });

  it('ведёт себя к Анабиозу до Прыжка: входит в Криогенный отсек и ложится в Камеру', () => {
    const state = onBotTurn(contactState(2, 'utility-jump'));
    state.meta.timeTrackPosition = 13;
    state.players[BOT]!.objectives = [structuredClone(EARTH)];
    const cryo = roomOf(state, 'HIBERNATORIUM');
    const outside = neighbourOf(state, cryo);
    putPlayer(state, BOT, outside);
    const [step] = ranked(state);
    expect(step!.candidate.action).toMatchObject({ type: 'ACTION_MOVE', payload: { targetRoomId: cryo } });
    putPlayer(state, BOT, cryo);
    const [sleep] = ranked(state);
    expect(sleep!.candidate.action.type).toBe('ACTION_ROOM_ABILITY');
    expect(sleep!.candidate.effects).toContainEqual({ kind: 'HIBERNATE', detail: {} });
  });

  it('чинит Двигатель при своей Цели «Земля»', () => {
    const table = contactState(2, 'utility-repair');
    table.ship.engines[1]!.isWorking = false;
    const checked = onBotTurn(inspectEngine(table, BOT, 1));
    standAt(checked, BOT, 'ENGINE_01');
    checked.players[BOT]!.objectives = [structuredClone(EARTH)];
    const repair = ACTION_CARDS.find((card) => card.effect.kind === 'FAST_REPAIR')!;
    checked.players[BOT]!.actionDeck.hand.push(structuredClone(repair));
    const [best] = ranked(checked);
    expect(best!.candidate.action).toMatchObject({
      type: 'ACTION_PLAY_CARD',
      payload: { cardId: repair.id, option: CARD_OPTION.ENGINE_REPAIR },
    });
  });

  it('без своей Цели «Земля» и без повода бот не тратит карту на ремонт Двигателя', () => {
    const table = contactState(2, 'utility-no-repair');
    const checked = onBotTurn(inspectEngine(table, BOT, 1));
    standAt(checked, BOT, 'ENGINE_01');
    checked.players[BOT]!.objectives = [
      structuredClone(PERSONAL_OBJECTIVE_CARDS.find((card) => card.id === 'OBJ_PERSONAL_SCAVENGER')!),
    ];
    const repair = ACTION_CARDS.find((card) => card.effect.kind === 'FAST_REPAIR')!;
    checked.players[BOT]!.actionDeck.hand.push(structuredClone(repair));
    const [best] = ranked(checked);
    expect(best!.candidate.action).not.toMatchObject({ payload: { option: CARD_OPTION.ENGINE_REPAIR } });
  });

  it('в Бою с заряженным Оружием бот стреляет или бежит, но не стоит без дела', () => {
    const state = onBotTurn(contactState(2, 'utility-fight'));
    putIntruder(state, 'ADULT', state.players[BOT]!.roomId);
    const [best] = ranked(state);
    expect(['ACTION_SHOOT', 'ACTION_MELEE', 'ACTION_MOVE']).toContain(best!.candidate.action.type);
  });

  it('softmax воспроизводим по сиду и при низкой температуре берёт лучшего', () => {
    const state = onBotTurn(contactState(2, 'utility-softmax'));
    const mind = neutral(state);
    const scored = ranked(state, mind);
    const cold = { ...BOT_TUNING, choice: { ...BOT_TUNING.choice, temperature: 0.0001 } };
    expect(chooseCandidate(scored, mind, cold).ordered[0]!.utility).toBe(scored[0]!.utility);
    expect(chooseCandidate(scored, mind, BOT_TUNING)).toEqual(chooseCandidate(scored, mind, BOT_TUNING));
  });
});

function hopsAvoiding(state: GameState, from: number, to: number, avoided: number): number | null {
  const distances = new Map<number, number>([[from, 0]]);
  const queue = [from];
  while (queue.length > 0) {
    const room = queue.shift()!;
    for (const corridor of Object.values(state.ship.corridors)) {
      const next =
        corridor.fromRoomId === room ? corridor.toRoomId : corridor.toRoomId === room ? corridor.fromRoomId : null;
      if (next === null || next === avoided || distances.has(next)) continue;
      distances.set(next, distances.get(room)! + 1);
      queue.push(next);
    }
  }
  return distances.get(to) ?? null;
}

describe('A* по графу корабля (В8-7-4)', () => {
  it('обходит Пожар и Чужих, если есть обход не длиннее на один Коридор', () => {
    const state = contactState(2, 'astar');
    for (const room of Object.values(state.ship.rooms)) room.isExplored = true;
    for (const corridor of Object.values(state.ship.corridors)) corridor.doorState = 'OPEN';
    const rooms = Object.keys(state.ship.rooms).map(Number);
    let checked = 0;
    for (const from of rooms) {
      for (const to of rooms) {
        const view = filterStateForPlayer(state, BOT);
        const direct = findRoute(view, from, [to], BOT_TUNING);
        if (!direct || direct.path.length < 3) continue;
        const blocked = direct.path[0]!;
        const hazard = structuredClone(state);
        hazard.ship.rooms[blocked]!.hasFire = true;
        putIntruder(hazard, 'ADULT', blocked);
        const around = hopsAvoiding(state, from, to, blocked);
        if (around === null || around > direct.path.length + 1) continue;
        const detour = findRoute(filterStateForPlayer(hazard, BOT), from, [to], BOT_TUNING)!;
        expect(detour.path).not.toContain(blocked);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(5);
  });
});

describe('Планировщики Целей (В8-7-5)', () => {
  it('для каждой из 25 Целей есть планировщик с теми же вариантами, что у Финального Валидатора', () => {
    const cards = [...PERSONAL_OBJECTIVE_CARDS, ...CORPORATE_OBJECTIVE_CARDS, ...SOLO_COOP_OBJECTIVE_CARDS];
    expect(cards).toHaveLength(25);
    for (const card of cards) {
      expect(OBJECTIVE_PLANNERS[card.id]?.length, card.id).toBe(OBJECTIVE_CONDITIONS[card.id]?.length);
      expect(OBJECTIVE_PLANNERS[card.id]?.length, card.id).toBe(card.conditions.length);
    }
  });

  it('близость «Земли» растёт, когда бот узнаёт исправные Двигатели', () => {
    const table = contactState(2, 'planner-earth');
    for (const engine of Object.values(table.ship.engines)) engine.isWorking = true;
    table.players[BOT]!.objectives = [structuredClone(EARTH)];
    const before = buildAgenda(filterStateForPlayer(table, BOT), neutral(table), BOT_TUNING).plans[0]!.proximity;
    const checked = inspectEngine(inspectEngine(table, BOT, 1), BOT, 2);
    const after = buildAgenda(filterStateForPlayer(checked, BOT), neutral(checked), BOT_TUNING).plans[0]!.proximity;
    expect(after).toBeGreaterThan(before);
  });
});
