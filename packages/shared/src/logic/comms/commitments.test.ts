import { describe, expect, it } from 'vitest';
import type { CommsDraft, CommsRequestTopic } from '../../types/comms.js';
import type { GameLogEvent } from '../../types/log.js';
import type { GameState } from '../../types/state.js';
import { contactState, expectEngineError } from '../../testing/contactFixtures.js';
import { lastEvent, standAt, useConsole } from '../../testing/roomFixtures.js';
import { appendGameLog } from '../gameLog.js';
import { GameEngine } from '../fsm.js';
import { trackCommitments } from './commitments.js';
import { COMMS_SETTINGS } from './commsSettings.js';

const engine = new GameEngine();

function say(state: GameState, playerId: string, draft: CommsDraft): GameState {
  const table = structuredClone(state);
  table.meta.activePlayerId = playerId;
  return engine.processAction(table, { type: 'ACTION_COMMS', payload: draft }, { actorId: playerId });
}

/** Игрок 1 просит, игрок 2 обещает помочь. */
function promised(topic: CommsRequestTopic, seed: string): GameState {
  const asked = say(contactState(2, seed), 'player-1', { kind: 'REQUEST', to: 'player-2', body: topic });
  return structuredClone(
    say(asked, 'player-2', { kind: 'ANSWER', body: { topic: 'ANSWER', requestId: 'comms-1', answer: 'WILL_HELP' } }),
  );
}

function afterEvent(state: GameState, event: GameLogEvent): GameState {
  const next = structuredClone(state);
  appendGameLog(next, event);
  trackCommitments(next);
  return next;
}

describe('Рация: ответы на Просьбы (В8-3-2)', () => {
  it('«помогу» создаёт открытое обещание; ответ вне лимитов хода', () => {
    let state = say(contactState(2, 'answer-open'), 'player-1', {
      kind: 'REQUEST',
      to: 'ALL',
      body: { topic: 'CHECK_ENGINE', engineNumber: 1 },
    });
    for (let index = 0; index < COMMS_SETTINGS.ordinaryMessagesPerTurn; index++) {
      state = say(state, 'player-2', { kind: 'INTENT', to: 'ALL', body: { topic: 'EXPLORE' } });
    }
    const answered = say(state, 'player-2', {
      kind: 'ANSWER',
      body: { topic: 'ANSWER', requestId: 'comms-1', answer: 'WILL_HELP' },
    });
    expect(answered.comms.messages.at(-1)).toMatchObject({ kind: 'ANSWER', to: 'player-1' });
    expect(answered.comms.commitments).toEqual([
      expect.objectContaining({ requesterId: 'player-1', helperId: 'player-2', status: 'OPEN' }),
    ]);
  });

  it('«не могу» обещания не создаёт; ответить дважды, на свою или чужую Просьбу нельзя', () => {
    const asked = say(contactState(3, 'answer-rules'), 'player-1', {
      kind: 'REQUEST',
      to: 'player-2',
      body: { topic: 'CHECK_COORDINATES' },
    });
    const answer: CommsDraft = { kind: 'ANSWER', body: { topic: 'ANSWER', requestId: 'comms-1', answer: 'CANNOT' } };
    const declined = say(asked, 'player-2', answer);
    expect(declined.comms.commitments).toEqual([]);
    expectEngineError(() => say(declined, 'player-2', answer), 'COMMS_FORBIDDEN');
    expectEngineError(() => say(asked, 'player-1', answer), 'COMMS_INVALID_ADDRESSEE');
    expectEngineError(() => say(asked, 'player-3', answer), 'COMMS_INVALID_ADDRESSEE');
  });

  it('после срока на Просьбу не ответить', () => {
    const asked = structuredClone(
      say(contactState(2, 'answer-late'), 'player-1', {
        kind: 'REQUEST',
        to: 'ALL',
        body: { topic: 'CHECK_COORDINATES' },
      }),
    );
    asked.meta.currentRound += COMMS_SETTINGS.requestLifetimeRounds + 1;
    expectEngineError(
      () =>
        say(asked, 'player-2', { kind: 'ANSWER', body: { topic: 'ANSWER', requestId: 'comms-1', answer: 'CANNOT' } }),
      'COMMS_UNKNOWN_TARGET',
    );
  });
});

describe('Рация: учёт обязательств по публичному журналу (В8-3-4)', () => {
  it('проверить Двигатель — выполнено Проверкой в нужном Отсеке', () => {
    const state = promised({ topic: 'CHECK_ENGINE', engineNumber: 2 }, 'commit-engine');
    standAt(state, 'player-2', 'ENGINE_02');
    const next = useConsole(state, 'player-2');
    expect(next.comms.commitments[0]).toMatchObject({ status: 'FULFILLED', resolvedRound: next.meta.currentRound });
    expect(lastEvent(next, 'COMMITMENT_RESOLVED')).toMatchObject({ helperId: 'player-2', status: 'FULFILLED' });
  });

  it('Дверь: нужное состояние выполняет обещание, обратное — нарушает', () => {
    const corridorId = Object.keys(contactState(2).ship.corridors)[0]!;
    const state = promised({ topic: 'SET_DOOR', corridorId, doorState: 'CLOSED' }, 'commit-door');
    const kept = afterEvent(state, {
      type: 'DOOR_CHANGED',
      playerId: 'player-2',
      corridorId,
      from: 'OPEN',
      to: 'CLOSED',
    });
    expect(kept.comms.commitments[0]!.status).toBe('FULFILLED');
    const broken = afterEvent(state, {
      type: 'DOOR_CHANGED',
      playerId: 'player-2',
      corridorId,
      from: 'CLOSED',
      to: 'OPEN',
    });
    expect(broken.comms.commitments[0]!.status).toBe('BROKEN');
  });

  it('поступок другого игрока обещание не выполняет', () => {
    const state = promised({ topic: 'EXTINGUISH', roomId: 11 }, 'commit-other');
    const next = afterEvent(state, { type: 'FIRE_EXTINGUISHED', playerId: 'player-1', roomId: 11 });
    expect(next.comms.commitments[0]!.status).toBe('OPEN');
    expect(
      afterEvent(state, { type: 'FIRE_EXTINGUISHED', playerId: 'player-2', roomId: 11 }).comms.commitments[0]!.status,
    ).toBe('FULFILLED');
  });

  it('«не запускайте Самоуничтожение»: запуск — нарушение, молчание до срока — выполнено', () => {
    const state = promised({ topic: 'NO_SELF_DESTRUCT' }, 'commit-self-destruct');
    const broken = afterEvent(state, { type: 'SELF_DESTRUCT_TOGGLED', playerId: 'player-2', isActive: true });
    expect(broken.comms.commitments[0]!.status).toBe('BROKEN');
    const quiet = structuredClone(state);
    quiet.meta.currentRound = state.comms.commitments[0]!.expiresAtRound + 1;
    trackCommitments(quiet);
    expect(quiet.comms.commitments[0]!.status).toBe('FULFILLED');
  });

  it('невыполненное к сроку обещание истекает', () => {
    const state = promised({ topic: 'HELP_KILL', roomId: 11 }, 'commit-expire');
    state.meta.currentRound = state.comms.commitments[0]!.expiresAtRound + 1;
    trackCommitments(state);
    expect(state.comms.commitments[0]!.status).toBe('EXPIRED');
  });

  it('подождать в Капсуле: улететь без просившего — нарушение, дождаться — выполнено', () => {
    const state = promised(
      { topic: 'WAIT_IN_POD', podId: Object.keys(contactState(2).ship.escapePods)[0]! },
      'commit-pod',
    );
    const podId = (state.comms.messages[0]!.body as { podId: string }).podId;
    const alone = afterEvent(state, { type: 'ESCAPE_POD_LAUNCHED', podId, podNumber: 1, occupantIds: ['player-2'] });
    expect(alone.comms.commitments[0]!.status).toBe('BROKEN');
    const together = afterEvent(state, {
      type: 'ESCAPE_POD_LAUNCHED',
      podId,
      podNumber: 1,
      occupantIds: ['player-2', 'player-1'],
    });
    expect(together.comms.commitments[0]!.status).toBe('FULFILLED');
  });

  it('нужен Предмет — выполнено Обменом с передачей просившему', () => {
    const state = promised({ topic: 'NEED_ITEM', need: 'WEAPON' }, 'commit-item');
    const next = afterEvent(state, {
      type: 'EXCHANGE_COMPLETED',
      playerId: 'player-2',
      roomId: 11,
      exchangeId: 'x',
      entries: [
        {
          fromPlayerId: 'player-2',
          toPlayerId: 'player-1',
          kind: 'ITEM',
          name: 'Пистолет',
          color: null,
          fromHandSlot: true,
          ammo: 1,
        },
      ],
    });
    expect(next.comms.commitments[0]!.status).toBe('FULFILLED');
  });
});

describe('Журнал поступков для обещаний', () => {
  it('Двери, переключённые Действием игрока, попадают в журнал с автором', () => {
    const state = contactState(1, 'deeds-doors');
    standAt(state, 'player-1', 'COMMAND_CENTER');
    const target = 11;
    const corridor = Object.values(state.ship.corridors).find(
      (entry) => (entry.fromRoomId === target || entry.toRoomId === target) && entry.doorState === 'OPEN',
    )!;
    const next = useConsole(state, 'player-1', { targetRoomId: target, closedCorridorIds: [corridor.id] });
    expect(lastEvent(next, 'DOOR_CHANGED')).toMatchObject({
      playerId: 'player-1',
      corridorId: corridor.id,
      from: 'OPEN',
      to: 'CLOSED',
    });
  });

  it('Рация и Пас поступков не пишут', () => {
    const state = contactState(2, 'deeds-pass');
    const next = engine.processAction(state, { type: 'ACTION_PASS', payload: {} });
    expect(next.gameLog.some((entry) => entry.event.type === 'DOOR_CHANGED')).toBe(false);
  });
});
