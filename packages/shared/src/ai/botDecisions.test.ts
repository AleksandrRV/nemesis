import { describe, expect, it } from 'vitest';
import {
  CORPORATE_OBJECTIVE_CARDS,
  PERSONAL_OBJECTIVE_CARDS,
  SOLO_COOP_OBJECTIVE_CARDS,
} from '../data/objectiveCards.js';
import type { CommsRequestTopic } from '../types/comms.js';
import type { GameState } from '../types/state.js';
import { GameEngine } from '../logic/fsm.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { contactState, putPlayer } from '../testing/contactFixtures.js';
import { roomOf } from '../testing/roomFixtures.js';
import { BOT, inspectEngine, logged, mindFor, say, seen, withCharacter } from '../testing/botSocialFixtures.js';
import { BotAgent } from './botAgent.js';
import { planEngineClaim } from './botLying.js';
import type { BotMind } from './botMind.js';
import {
  OBJECTIVE_PROFILES,
  objectiveProbability,
  observeTargeting,
  suspectedEnemies,
  threatFrom,
} from './botObjectives.js';
import { assessRequest } from './botRequests.js';
import { BOT_TUNING } from './botTuning.js';

function card(id: string) {
  return [...CORPORATE_OBJECTIVE_CARDS, ...PERSONAL_OBJECTIVE_CARDS].find((objective) => objective.id === id)!;
}

function withObjectives(state: GameState, playerId: string, ids: readonly string[]): GameState {
  const next = structuredClone(state);
  next.players[playerId]!.objectives = ids.map(card);
  return next;
}

function request(state: GameState, authorId: string, body: CommsRequestTopic, to = BOT): GameState {
  return say(state, authorId, { kind: 'REQUEST', to, body });
}

function lastRequest(state: GameState) {
  const message = state.comms.messages.at(-1)!;
  if (message.kind !== 'REQUEST') throw new Error('Последнее сообщение — не Просьба.');
  return message;
}

const ALTRUIST = { morale: 100 };
const SPITEFUL = { morale: -90 };

describe('Угадывание чужих Целей (план 0.8.0, В8-6-4)', () => {
  it('у каждой Цели колод есть профиль', () => {
    for (const objective of [...CORPORATE_OBJECTIVE_CARDS, ...PERSONAL_OBJECTIVE_CARDS, ...SOLO_COOP_OBJECTIVE_CARDS]) {
      expect(OBJECTIVE_PROFILES[objective.id], objective.id).toBeDefined();
    }
  });

  it('априорно — публичный состав колод без своих карт', () => {
    const state = withObjectives(contactState(3, 'guess-prior'), BOT, [
      'OBJ_CORPORATE_AB_OVO',
      'OBJ_PERSONAL_SCAVENGER',
    ]);
    const mind = seen(state, mindFor(state));
    const guesses = mind.objectiveGuesses['player-1']!;
    expect(guesses).not.toHaveProperty('OBJ_CORPORATE_AB_OVO');
    expect(guesses).not.toHaveProperty('OBJ_CORPORATE_ARMED_TAKEOVER');
    const corporate = Object.keys(guesses).filter((id) => id.startsWith('OBJ_CORPORATE'));
    const total = corporate.reduce((sum, id) => sum + objectiveProbability(guesses, id), 0);
    expect(total).toBeCloseTo(1);
  });

  it('поднятое Яйцо делает «Мою прелесть» и «AB OVO» вероятнее', () => {
    const state = withObjectives(contactState(3, 'guess-egg'), BOT, [
      'OBJ_CORPORATE_OLD_FEUD',
      'OBJ_PERSONAL_SCAVENGER',
    ]);
    const prior = seen(state, mindFor(state)).objectiveGuesses['player-1']!;
    const roomId = state.players['player-1']!.roomId;
    const carried = logged(state, {
      type: 'OBJECT_PICKED_UP',
      playerId: 'player-1',
      roomId,
      objectId: 'egg-1',
      objectKind: 'EGG',
    });
    const guesses = seen(carried, mindFor(state)).objectiveGuesses['player-1']!;
    for (const id of ['OBJ_CORPORATE_MY_PRECIOUS', 'OBJ_CORPORATE_AB_OVO']) {
      expect(objectiveProbability(guesses, id)).toBeGreaterThan(objectiveProbability(prior, id));
    }
  });

  it('вред боту подсказывает Цель «Персонаж Игрока N не должен выжить» против него', () => {
    const state = withObjectives(contactState(3, 'guess-harm'), BOT, [
      'OBJ_CORPORATE_AB_OVO',
      'OBJ_PERSONAL_SCAVENGER',
    ]);
    const view = filterStateForPlayer(state, BOT);
    const before = threatFrom(seen(state, mindFor(state)), view, 'player-1');
    let burnt = state;
    for (let times = 0; times < 3; times++) {
      burnt = logged(burnt, { type: 'FIRE_STARTED', playerId: 'player-1', roomId: state.players[BOT]!.roomId });
    }
    const mind = seen(burnt, mindFor(state));
    expect(threatFrom(mind, view, 'player-1')).toBeGreaterThan(before * 2);
    expect(threatFrom(mind, view, 'player-3')).toBeCloseTo(before);
  });

  it('отказ в Просьбе — обида, но не улика Цели против бота', () => {
    let state = withObjectives(contactState(3, 'guess-refusal'), BOT, [
      'OBJ_CORPORATE_AB_OVO',
      'OBJ_PERSONAL_SCAVENGER',
    ]);
    const view = filterStateForPlayer(state, BOT);
    const before = threatFrom(seen(state, mindFor(state)), view, 'player-1');
    state = request(state, BOT, { topic: 'CHECK_COORDINATES' }, 'player-1');
    state = say(state, 'player-1', {
      kind: 'ANSWER',
      body: { topic: 'ANSWER', requestId: lastRequest(state).id, answer: 'CANNOT' },
    });
    const mind = seen(state, mindFor(state));
    expect(mind.players['player-1']!.evidence).toContainEqual(
      expect.objectContaining({ reason: 'REFUSED_MY_REQUEST' }),
    );
    expect(threatFrom(mind, view, 'player-1')).toBeCloseTo(before);
    expect(mind.pendingMorale).toBe(0);
  });

  it('угаданная враждебная Цель меняет поведение: подозреваемого бот в Капсуле не ждёт', () => {
    let state = withObjectives(contactState(3, 'guess-pod'), BOT, ['OBJ_CORPORATE_AB_OVO', 'OBJ_PERSONAL_SCAVENGER']);
    const pod = Object.values(state.ship.escapePods)[0]!;
    const podRoomId = roomOf(state, `ESCAPE_POD_${pod.section}`);
    state.ship.rooms[podRoomId]!.isExplored = true;
    putPlayer(state, BOT, podRoomId);
    state = request(state, 'player-1', { topic: 'WAIT_IN_POD', podId: pod.id });
    const fromSuspect = lastRequest(state);
    const view = filterStateForPlayer(state, BOT);
    const trusting = seen(state, withCharacter(mindFor(state), ALTRUIST));
    const myNumber = state.players[BOT]!.orderNumber;
    const wary = observeTargeting(trusting, 'player-1', myNumber, 20);

    expect(suspectedEnemies(trusting, view, BOT_TUNING)).toEqual([]);
    expect(suspectedEnemies(wary, view, BOT_TUNING)).toEqual(['player-1']);
    expect(assessRequest(view, trusting, fromSuspect, BOT_TUNING).answer).toBe('WILL_HELP');
    expect(assessRequest(view, wary, fromSuspect, BOT_TUNING).answer).toBe('CANNOT');
  });
});

describe('Политика лжи (В8-6-5)', () => {
  function checked(seed: string, playerCount = 2): { state: GameState; truth: boolean } {
    const table = contactState(playerCount, seed);
    return { state: inspectEngine(table, BOT, 2), truth: table.ship.engines[2]!.isWorking };
  }

  it('доброжелательный бот говорит правду, злой с враждебной Целью лжёт', () => {
    const { state, truth } = checked('lie-policy');
    const hostile = withObjectives(state, BOT, ['OBJ_CORPORATE_BIDE_YOUR_TIME', 'OBJ_PERSONAL_SAVE_PROPERTY']);
    const honest = planEngineClaim(
      filterStateForPlayer(state, BOT),
      seen(state, withCharacter(mindFor(state), ALTRUIST)),
      2,
      BOT_TUNING,
    )!;
    const liarMind = seen(hostile, withCharacter(mindFor(hostile), { ...SPITEFUL, traits: ['POTENTIAL_LIAR'] }));
    const liar = planEngineClaim(filterStateForPlayer(hostile, BOT), liarMind, 2, BOT_TUNING)!;
    expect(honest.isLie).toBe(false);
    expect(honest.draft.body).toMatchObject({ status: truth ? 'WORKING' : 'DAMAGED' });
    expect(liar.isLie).toBe(true);
    expect(liar.draft.body).toMatchObject({ status: truth ? 'DAMAGED' : 'WORKING' });
  });

  it('чем больше свидетелей проверяли Двигатель, тем выше шанс разоблачения — и бот не лжёт', () => {
    const { state } = checked('lie-witnesses', 3);
    const alone = seen(state, withCharacter(mindFor(state), SPITEFUL));
    const witnessed = inspectEngine(inspectEngine(state, 'player-1', 2), 'player-3', 2);
    const watched = seen(witnessed, withCharacter(mindFor(state), SPITEFUL));
    const lonePlan = planEngineClaim(filterStateForPlayer(state, BOT), alone, 2, BOT_TUNING)!;
    const watchedPlan = planEngineClaim(filterStateForPlayer(witnessed, BOT), watched, 2, BOT_TUNING)!;
    expect(watchedPlan.exposure).toBeGreaterThan(lonePlan.exposure);
    expect(lonePlan.isLie).toBe(true);
    expect(watchedPlan.isLie).toBe(false);
  });

  it('держит линию: однажды солгав, повторяет ложь, даже подобрев', () => {
    const { state } = checked('lie-line');
    const spiteful = seen(state, withCharacter(mindFor(state), SPITEFUL));
    const plan = planEngineClaim(filterStateForPlayer(state, BOT), spiteful, 2, BOT_TUNING)!;
    const said = say(state, BOT, plan.draft);
    const remembered = seen(said, spiteful);
    expect(remembered.ownLies).toHaveLength(1);
    const softened: BotMind = { ...remembered, character: { ...remembered.character, morale: 100 } };
    const again = planEngineClaim(filterStateForPlayer(said, BOT), softened, 2, BOT_TUNING)!;
    expect(again.isLie).toBe(true);
    expect(again.draft.body).toEqual(plan.draft.body);
  });

  it('о том, чего не знает, бот Заявления не планирует', () => {
    const state = contactState(2, 'lie-unknown');
    expect(planEngineClaim(filterStateForPlayer(state, BOT), seen(state, mindFor(state)), 1, BOT_TUNING)).toBeNull();
  });
});

describe('Ответы на Просьбы (В8-6-6)', () => {
  function onBotTurn(state: GameState): GameState {
    const next = structuredClone(state);
    next.meta.activePlayerId = BOT;
    return next;
  }

  it('в свой ход бот отвечает, движок принимает ответ, обещание запомнено с искренностью', () => {
    const state = onBotTurn(request(contactState(2, 'answer-yes'), 'player-1', { topic: 'NO_SELF_DESTRUCT' }));
    const mind = withCharacter(mindFor(state), ALTRUIST);
    const decision = BotAgent.decide(filterStateForPlayer(state, BOT), mind);
    expect(decision.speech).toEqual([
      { kind: 'ANSWER', body: { topic: 'ANSWER', requestId: lastRequest(state).id, answer: 'WILL_HELP' } },
    ]);
    expect(decision.mind.ownPromises).toEqual([expect.objectContaining({ requesterId: 'player-1', sincere: true })]);
    expect(decision.mind.plan).toMatchObject({ desire: 'KEEP_PROMISE' });

    const answered = new GameEngine().processAction(
      state,
      { type: 'ACTION_COMMS', payload: decision.speech[0]! },
      { actorId: BOT },
    );
    expect(answered.comms.commitments).toEqual([expect.objectContaining({ helperId: BOT, status: 'OPEN' })]);
    expect(BotAgent.decide(filterStateForPlayer(answered, BOT), decision.mind).speech).toEqual([]);
  });

  it('невыполнимую адресную Просьбу бот отклоняет, общую — пропускает молча', () => {
    let state = contactState(3, 'answer-no');
    state.players[BOT]!.inventory = [];
    state.players[BOT]!.handSlots = [];
    state = request(state, 'player-1', { topic: 'NEED_ITEM', need: 'WEAPON' });
    state = request(state, 'player-3', { topic: 'NEED_ITEM', need: 'HEALING' }, 'ALL');
    const decision = BotAgent.decide(
      filterStateForPlayer(onBotTurn(state), BOT),
      withCharacter(mindFor(state), ALTRUIST),
    );
    expect(decision.speech).toEqual([
      { kind: 'ANSWER', body: { topic: 'ANSWER', requestId: 'comms-1', answer: 'CANNOT' } },
    ]);
  });

  it('социопат обещает, не собираясь помогать', () => {
    let state = contactState(2, 'answer-deceit');
    state.players[BOT]!.inventory = [];
    state.players[BOT]!.handSlots = [];
    state = request(state, 'player-1', { topic: 'NEED_ITEM', need: 'WEAPON' });
    const sociopath = withCharacter(mindFor(state), { morale: -100, traits: ['SOCIOPATH'] });
    const view = filterStateForPlayer(onBotTurn(state), BOT);
    expect(assessRequest(view, sociopath, lastRequest(state), BOT_TUNING)).toMatchObject({
      answer: 'WILL_HELP',
      sincere: false,
    });
    const decision = BotAgent.decide(view, sociopath);
    expect(decision.mind.ownPromises).toEqual([expect.objectContaining({ sincere: false })]);
    expect(decision.mind.plan).toBeNull();
  });

  it('не в свой ход бот молчит', () => {
    const state = structuredClone(request(contactState(2, 'answer-wait'), 'player-1', { topic: 'NO_SELF_DESTRUCT' }));
    state.meta.activePlayerId = 'player-1';
    expect(BotAgent.decide(filterStateForPlayer(state, BOT), mindFor(state)).speech).toEqual([]);
  });
});
