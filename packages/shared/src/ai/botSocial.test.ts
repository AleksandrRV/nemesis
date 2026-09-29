import { describe, expect, it } from 'vitest';
import type { GameState } from '../types/state.js';
import { contactState, putPlayer } from '../testing/contactFixtures.js';
import { roomOf } from '../testing/roomFixtures.js';
import {
  BOT,
  inspectEngine,
  laterRounds,
  logged,
  mindFor,
  say,
  seen,
  toggleEngine,
  withCharacter,
} from '../testing/botSocialFixtures.js';
import { BOT_MIND_SCHEMA_VERSION, isBotMind, parseBotMind, serializeBotMind } from './botMind.js';
import { scaleMean, trustIn } from './botSocial.js';
import { BOT_TUNING } from './botTuning.js';

function claimEngine(state: GameState, authorId: string, engineNumber: 1 | 2 | 3, working: boolean): GameState {
  return say(state, authorId, {
    kind: 'CLAIM',
    to: 'ALL',
    body: { topic: 'ENGINE_STATUS', engineNumber, status: working ? 'WORKING' : 'DAMAGED' },
  });
}

function corridorOf(state: GameState): string {
  return Object.values(state.ship.corridors)[0]!.id;
}

describe('Честность (план 0.8.0, В8-6-1)', () => {
  it('лжец разоблачается Проверкой: Заявление опровергнуто, улика записана, включён скепсис', () => {
    let state = contactState(2, 'social-liar');
    const truth = state.ship.engines[2]!.isWorking;
    state = claimEngine(state, 'player-1', 2, !truth);
    let mind = seen(state, mindFor(state));
    const before = scaleMean(mind.players['player-1']!.honesty);
    expect(mind.claims[0]).toMatchObject({ authorId: 'player-1', verdict: 'OPEN' });

    state = inspectEngine(state, BOT, 2);
    mind = seen(state, mind);
    const liar = mind.players['player-1']!;
    expect(mind.claims[0]!.verdict).toBe('REFUTED');
    expect(liar.evidence).toContainEqual(
      expect.objectContaining({ reason: 'CLAIM_REFUTED_BY_CHECK', scale: 'HONESTY' }),
    );
    expect(scaleMean(liar.honesty)).toBeLessThan(before);
    expect(liar.skepticism).toBeGreaterThan(0.5);
  });

  it('правда до перестановки подтверждается, хотя жетоны с тех пор переставляли', () => {
    let state = contactState(2, 'social-epoch');
    const truth = state.ship.engines[1]!.isWorking;
    state = claimEngine(state, 'player-1', 1, truth);
    state = toggleEngine(state, 'player-1', 1);
    state = inspectEngine(state, BOT, 1);
    const mind = seen(state, mindFor(state));
    expect(mind.engineEpochs['1']).toBe(1);
    expect(mind.claims[0]!.verdict).toBe('CONFIRMED');
    expect(scaleMean(mind.players['player-1']!.honesty)).toBeGreaterThan(BOT_TUNING.trust.initial);
  });

  it('«я не трогал» при объявлении о перестановке — ложь по журналу', () => {
    let state = toggleEngine(contactState(2, 'social-untouched'), 'player-1', 3);
    state = say(state, 'player-1', {
      kind: 'CLAIM',
      to: 'ALL',
      body: { topic: 'ENGINE_DEED', engineNumber: 3, deed: 'UNTOUCHED' },
    });
    const mind = seen(state, mindFor(state));
    expect(mind.claims[0]!.verdict).toBe('REFUTED');
    expect(mind.players['player-1']!.evidence).toContainEqual(
      expect.objectContaining({ reason: 'DEED_CLAIM_REFUTED' }),
    );
  });

  it('двое независимых против одного — слабая улика, без полного скепсиса', () => {
    let state = claimEngine(contactState(4, 'social-two'), 'player-1', 2, true);
    state = claimEngine(state, 'player-3', 2, false);
    state = claimEngine(state, 'player-4', 2, false);
    const mind = seen(state, mindFor(state));
    const lone = mind.players['player-1']!;
    expect(lone.evidence).toContainEqual(expect.objectContaining({ reason: 'CLAIM_CONTRADICTED' }));
    expect(lone.skepticism).toBeGreaterThan(0);
    expect(lone.skepticism).toBeLessThan(BOT_TUNING.trust.skepticismOnLie / 2);
    expect(mind.players['player-3']!.evidence).toEqual([]);
  });
});

describe('Доверие (В8-6-2)', () => {
  it('после опровержения Заявления игрока почти не сдвигают убеждения', () => {
    const fresh = contactState(2, 'social-deaf');
    const heard = seen(claimEngine(fresh, 'player-1', 3, true), mindFor(fresh));
    const trustingShift = heard.engines['3'].pWorking - 0.5;

    let state = claimEngine(fresh, 'player-1', 2, !fresh.ship.engines[2]!.isWorking);
    state = inspectEngine(state, BOT, 2);
    let mind = seen(state, mindFor(fresh));
    mind = seen(claimEngine(state, 'player-1', 3, true), mind);
    const skepticalShift = mind.engines['3'].pWorking - 0.5;

    expect(trustingShift).toBeGreaterThan(0.1);
    expect(skepticalShift).toBeLessThan(trustingShift / 5);
  });

  it('скепсис тает со временем, у «Обидчивого» почти не тает', () => {
    const table = contactState(2, 'social-grudge');
    const state = inspectEngine(claimEngine(table, 'player-1', 2, !table.ship.engines[2]!.isWorking), BOT, 2);
    const calm = seen(state, withCharacter(mindFor(state), {}));
    const touchy = seen(state, withCharacter(mindFor(state), { traits: ['TOUCHY'] }));
    const aged = laterRounds(state, 8);
    expect(seen(aged, calm).players['player-1']!.skepticism).toBeLessThan(calm.players['player-1']!.skepticism / 2);
    expect(seen(aged, touchy).players['player-1']!.skepticism).toBeGreaterThan(
      touchy.players['player-1']!.skepticism * 0.9,
    );
  });
});

describe('Надёжность и дела', () => {
  function promisedDoor(seed: string, doorState: 'OPEN' | 'CLOSED'): { state: GameState; corridorId: string } {
    let state = contactState(3, seed);
    const corridorId = corridorOf(state);
    state = say(state, BOT, {
      kind: 'REQUEST',
      to: 'player-1',
      body: { topic: 'SET_DOOR', corridorId, doorState },
    });
    const requestId = state.comms.messages.at(-1)!.id;
    state = say(state, 'player-1', { kind: 'ANSWER', body: { topic: 'ANSWER', requestId, answer: 'WILL_HELP' } });
    return { state, corridorId };
  }

  it('нарушенное обещание снижает надёжность у всех наблюдателей, просившему — ещё и обида', () => {
    const { state, corridorId } = promisedDoor('social-broken', 'OPEN');
    const observer = mindFor(state, 'player-3');
    const requester = mindFor(state);
    const broken = logged(state, {
      type: 'DOOR_CHANGED',
      playerId: 'player-1',
      corridorId,
      from: 'OPEN',
      to: 'CLOSED',
    });
    expect(broken.comms.commitments[0]!.status).toBe('BROKEN');

    for (const mind of [seen(broken, observer), seen(broken, requester)]) {
      const helper = mind.players['player-1']!;
      expect(scaleMean(helper.reliability)).toBeLessThan(BOT_TUNING.trust.initial);
      expect(helper.evidence).toContainEqual(expect.objectContaining({ reason: 'PROMISE_BROKEN' }));
    }
    expect(seen(broken, requester).players['player-1']!.evidence).toContainEqual(
      expect.objectContaining({ reason: 'BROKE_PROMISE_TO_ME', scale: 'GOODWILL' }),
    );
    expect(seen(broken, observer).players['player-1']!.evidence).not.toContainEqual(
      expect.objectContaining({ reason: 'BROKE_PROMISE_TO_ME' }),
    );
  });

  it('выполненное обещание поднимает надёжность, просившему — благодарность и мораль', () => {
    const { state, corridorId } = promisedDoor('social-kept', 'CLOSED');
    const kept = logged(state, { type: 'DOOR_CHANGED', playerId: 'player-1', corridorId, from: 'OPEN', to: 'CLOSED' });
    const mind = seen(kept, mindFor(state));
    const helper = mind.players['player-1']!;
    expect(scaleMean(helper.reliability)).toBeGreaterThan(BOT_TUNING.trust.initial);
    expect(helper.evidence).toContainEqual(expect.objectContaining({ reason: 'OPENED_DOOR_ON_REQUEST' }));
    expect(mind.pendingMorale).toBeGreaterThan(0);
    expect(trustIn(helper, BOT_TUNING)).toBeGreaterThan(trustIn(mindFor(state).players['player-1']!, BOT_TUNING));
  });

  it('Намерение исполнено, если автор приблизился к цели; брошенное — улика против', () => {
    let state = contactState(3, 'social-intent');
    state = say(state, 'player-1', { kind: 'INTENT', to: 'ALL', body: { topic: 'GO_TO_BRIDGE' } });
    state = say(state, 'player-3', { kind: 'INTENT', to: 'ALL', body: { topic: 'GO_TO_BRIDGE' } });
    let mind = seen(state, mindFor(state));
    expect(mind.intents).toHaveLength(2);

    const moved = structuredClone(state);
    putPlayer(moved, 'player-1', roomOf(moved, 'COCKPIT'));
    mind = seen(laterRounds(moved, BOT_TUNING.trust.intentWindowRounds), mind);
    expect(mind.players['player-1']!.evidence).toContainEqual(expect.objectContaining({ reason: 'INTENT_KEPT' }));
    expect(mind.players['player-3']!.evidence).toContainEqual(expect.objectContaining({ reason: 'INTENT_ABANDONED' }));
    expect(mind.intents).toEqual([]);
  });

  it('Пожар в Комнате бота — вред: шкала помощи, мораль падает не больше предела шага', () => {
    const state = contactState(2, 'social-fire');
    const roomId = state.players[BOT]!.roomId;
    let burnt = state;
    for (let times = 0; times < 4; times++) {
      burnt = logged(burnt, { type: 'FIRE_STARTED', playerId: 'player-1', roomId });
    }
    const base = withCharacter(mindFor(state), { morale: 50 });
    const mind = seen(burnt, base);
    expect(scaleMean(mind.players['player-1']!.goodwill)).toBeLessThan(0.5);
    expect(mind.players['player-1']!.evidence).toContainEqual(expect.objectContaining({ reason: 'FIRE_IN_MY_ROOM' }));
    expect(mind.pendingMorale).toBeLessThan(0);

    const later = seen(laterRounds(burnt, 1), mind);
    expect(later.character.morale).toBe(50 - BOT_TUNING.morale.driftLimitPerRound);
    expect(later.pendingMorale).toBe(0);
  });

  it('чужой Пожар в другой Комнате — не вред боту', () => {
    const state = contactState(2, 'social-far-fire');
    const elsewhere = Object.values(state.ship.rooms).find((room) => room.id !== state.players[BOT]!.roomId)!;
    const mind = seen(
      logged(state, { type: 'FIRE_STARTED', playerId: 'player-1', roomId: elsewhere.id }),
      mindFor(state),
    );
    expect(mind.players['player-1']!.evidence).toEqual([]);
  });
});

describe('Память социальной модели', () => {
  it('сериализуется туда и обратно, старая схема памяти отклоняется', () => {
    let state = claimEngine(contactState(3, 'social-roundtrip'), 'player-1', 2, true);
    state = inspectEngine(state, BOT, 2);
    const mind = seen(state, mindFor(state));
    expect(parseBotMind(serializeBotMind(mind))).toEqual(mind);
    expect(isBotMind({ ...mind, version: BOT_MIND_SCHEMA_VERSION - 1 })).toBe(false);
    expect(isBotMind({ ...mind, players: { 'player-1': { honesty: { alpha: 1, beta: 1 } } } })).toBe(false);
  });
});
