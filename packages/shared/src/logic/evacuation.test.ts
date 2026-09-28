import { describe, expect, it } from 'vitest';
import { contactState, existingIntruder, expectEngineError } from '../testing/contactFixtures.js';
import type { GameState } from '../types/state.js';
import { HIBERNATION_OPENS_AT_TIME } from '../data/evacuation.js';
import { GameEngine } from './fsm.js';
import { guardEscapePods, podCommandsFor, resolveHibernationAttempt, resolvePodBoarding } from './evacuation.js';
import { executeRoomAbility } from './roomAbilities.js';
import { advanceTimeAndSelfDestruct } from './eventsPhase.js';

function stand(state: GameState, definitionId: string): number {
  const player = state.players['player-1']!;
  const room = state.ship.rooms[player.roomId]!;
  room.definitionId = definitionId;
  room.isExplored = true;
  room.hasMalfunction = false;
  return room.id;
}

function withPods(state: GameState): void {
  state.ship.escapePods = {
    'pod-1': { id: 'pod-1', number: 1, section: 'A', isLocked: false, isDestroyed: false, occupantIds: [] },
    'pod-2': { id: 'pod-2', number: 2, section: 'A', isLocked: true, isDestroyed: false, occupantIds: [] },
  };
}

function board(state: GameState): GameState {
  const roomId = stand(state, 'ESCAPE_POD_A');
  withPods(state);
  resolvePodBoarding(state, { type: 'ESCAPE_POD_BOARDING_INTERRUPT', playerId: 'player-1', roomId, podId: 'pod-1' });
  state.interruptQueue.push({ type: 'COMPLETE_ACTION_INTERRUPT', playerId: 'player-1' });
  return state;
}

function decide(state: GameState, selectedOption: string): GameState {
  return new GameEngine().processAction(state, {
    type: 'ACTION_RESOLVE_DECISION',
    payload: { decisionId: state.pendingDecision!.id, selectedOption },
  } as never);
}

describe('Камеры Анабиоза (стр. 11, 26)', () => {
  it('закрыты до синих полей трека Времени, открываются записью журнала', () => {
    const state = contactState(2, 'hib-closed');
    stand(state, 'HIBERNATORIUM');
    expect(() => executeRoomAbility(state, 'player-1', {})).toThrow(/синих полей/);
    state.meta.timeTrackPosition = HIBERNATION_OPENS_AT_TIME - 1;
    advanceTimeAndSelfDestruct(state);
    expect(state.gameLog.map((entry) => entry.event.type)).toContain('HIBERNATION_OPENED');
  });

  it('попытка: бросок Шума, затем проверка — Чужой в отсеке срывает вход', () => {
    const state = contactState(2, 'hib-attempt');
    const roomId = stand(state, 'HIBERNATORIUM');
    state.meta.timeTrackPosition = HIBERNATION_OPENS_AT_TIME;
    executeRoomAbility(state, 'player-1', {});
    expect(state.interruptQueue[0]).toMatchObject({ type: 'NOISE_ROLL_INTERRUPT', forceRoll: true });
    expect(state.interruptQueue[1]).toMatchObject({ type: 'HIBERNATION_ATTEMPT_INTERRUPT' });

    const failed = structuredClone(state);
    existingIntruder(failed, 'ADULT', roomId);
    resolveHibernationAttempt(failed, { type: 'HIBERNATION_ATTEMPT_INTERRUPT', playerId: 'player-1', roomId });
    expect(failed.players['player-1']!.isInHibernation).toBe(false);

    resolveHibernationAttempt(state, { type: 'HIBERNATION_ATTEMPT_INTERRUPT', playerId: 'player-1', roomId });
    expect(state.players['player-1']!.isInHibernation).toBe(true);
    expect(state.ship.rooms[roomId]!.occupantPlayerIds).not.toContain('player-1');
    expect(state.gameLog.at(-1)?.event).toMatchObject({ type: 'HIBERNATION_ATTEMPTED', success: true });
  });

  it('с Чужим в Криогенном отсеке действие недоступно', () => {
    const state = contactState(2, 'hib-intruder');
    const roomId = stand(state, 'HIBERNATORIUM');
    state.meta.timeTrackPosition = HIBERNATION_OPENS_AT_TIME;
    existingIntruder(state, 'ADULT', roomId);
    expectEngineError(() => executeRoomAbility(state, 'player-1', {}), 'ROOM_ABILITY_NOT_ALLOWED');
  });
});

describe('Спасательные Капсулы (стр. 24–26)', () => {
  it('вход только в Разблокированную Капсулу со свободным местом', () => {
    const state = contactState(2, 'pod-locked');
    stand(state, 'ESCAPE_POD_A');
    withPods(state);
    expectEngineError(
      () => executeRoomAbility(state, 'player-1', { targetEscapePodId: 'pod-2' }),
      'ROOM_ABILITY_NOT_ALLOWED',
    );
    executeRoomAbility(state, 'player-1', { targetEscapePodId: 'pod-1' });
    expect(state.interruptQueue[1]).toMatchObject({ type: 'ESCAPE_POD_BOARDING_INTERRUPT', podId: 'pod-1' });
  });

  it('после посадки — выбор: запустить немедленно', () => {
    const state = board(contactState(2, 'pod-launch'));
    expect(state.pendingDecision).toMatchObject({ type: 'ESCAPE_POD_LAUNCH_CHOICE', podId: 'pod-1' });
    const next = decide(state, 'LAUNCH');
    expect(next.players['player-1']!.hasEscapedInPod).toBe(true);
    expect(next.ship.escapePods['pod-1']!.isLaunched).toBe(true);
    expect(next.meta.activePlayerId).not.toBe('player-1');
  });

  it('ждать: в этом раунде можно только выйти или спасовать, запуск — со следующего', () => {
    const state = board(contactState(2, 'pod-wait'));
    let next = decide(state, 'WAIT');
    const player = next.players['player-1']!;
    expect(player.boardedPodId).toBe('pod-1');
    if (next.meta.activePlayerId === 'player-1') {
      expect(podCommandsFor(next, player)).toEqual(['EXIT', 'STAY']);
      expectEngineError(
        () => new GameEngine().processAction(next, { type: 'ACTION_PASS', payload: {} }),
        'CARD_NOT_USABLE_NOW',
      );
      expectEngineError(
        () => new GameEngine().processAction(next, { type: 'ACTION_ESCAPE_POD', payload: { command: 'LAUNCH' } }),
        'INVALID_DECISION_OPTION',
      );
      const exited = new GameEngine().processAction(next, { type: 'ACTION_ESCAPE_POD', payload: { command: 'EXIT' } });
      expect(exited.players['player-1']!.boardedPodId).toBeNull();
      expect(exited.ship.rooms[exited.players['player-1']!.roomId]!.occupantPlayerIds).toContain('player-1');
    }
    next = structuredClone(next);
    next.players['player-1']!.boardedRound = next.meta.currentRound - 1;
    expect(podCommandsFor(next, next.players['player-1']!)).toEqual(['LAUNCH', 'EXIT', 'STAY']);
  });

  it('Чужой в Спасательном отсеке возвращает ждущих из Капсулы', () => {
    const state = board(contactState(2, 'pod-guard'));
    state.pendingDecision = null;
    existingIntruder(state, 'ADULT', state.players['player-1']!.roomId);
    guardEscapePods(state);
    expect(state.players['player-1']!.boardedPodId).toBeNull();
    expect(state.ship.escapePods['pod-1']!.occupantIds).toEqual([]);
    expect(state.gameLog.at(-1)?.event).toMatchObject({ type: 'ESCAPE_POD_EXITED', reason: 'INTRUDER' });
  });

  it('Система блокировки капсул переключает замок выбранной Капсулы', () => {
    const state = contactState(2, 'pod-hatch');
    stand(state, 'HATCH_CONTROL');
    withPods(state);
    executeRoomAbility(state, 'player-1', { targetEscapePodId: 'pod-2' });
    expect(state.ship.escapePods['pod-2']!.isLocked).toBe(false);
    expect(state.gameLog.at(-1)?.event).toMatchObject({
      type: 'ESCAPE_POD_TOGGLED',
      source: 'HATCH_CONTROL',
      isLocked: false,
    });
  });
});
