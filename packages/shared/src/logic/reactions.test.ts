import { describe, expect, it } from 'vitest';
import { ACTION_CARDS } from '../data/actionCards.js';
import type { GameState } from '../types/state.js';
import { contactState, expectEngineError } from '../testing/contactFixtures.js';
import { lastEvent, payWith } from '../testing/roomFixtures.js';
import { GameEngine } from './fsm.js';
import { DISMISS_OPTION } from './reactions.js';
import { filterStateForPlayer } from './sanitizer.js';
import { findAdjacentOpenRoomIds } from './shipGraphQueries.js';

const engine = new GameEngine();

function giveDismiss(state: GameState, playerId: string): void {
  const card = structuredClone(ACTION_CARDS.find((entry) => entry.effect.kind === 'DISMISS')!);
  card.id = `${card.id}-${playerId}`;
  state.players[playerId]!.actionDeck.hand.push(card);
}

function moveAway(state: GameState): GameState {
  const target = findAdjacentOpenRoomIds(state, state.players['player-1']!.roomId)[0]!;
  return engine.processAction(state, {
    type: 'ACTION_MOVE',
    payload: { targetRoomId: target, discardCardIds: payWith(state, 'player-1', 1) },
  });
}

function answer(state: GameState, option: string): GameState {
  return engine.processAction(
    state,
    { type: 'ACTION_RESOLVE_DECISION', payload: { decisionId: state.pendingDecision!.id, selectedOption: option } },
    { actorId: state.pendingDecision!.playerId },
  );
}

describe('«Отставить»: окно реакции на Действие в Комнате (карта Действий)', () => {
  it('держатель «Отставить» в той же Комнате получает окно; пропуск — Действие выполняется', () => {
    const state = contactState(3, 'dismiss-allow');
    giveDismiss(state, 'player-2');
    const start = state.players['player-1']!.roomId;

    const declared = moveAway(state);
    expect(declared.players['player-1']!.roomId).toBe(start);
    expect(declared.pendingDecision).toMatchObject({ type: 'DISMISS_WINDOW', playerId: 'player-2' });

    const done = answer(declared, DISMISS_OPTION.ALLOW);
    expect(done.players['player-1']!.roomId).not.toBe(start);
    expect(done.reaction).toBeNull();
  });

  it('«Отставить» отменяет Действие, его Цена оплачена и Действие потрачено', () => {
    const state = contactState(3, 'dismiss-cancel');
    giveDismiss(state, 'player-2');
    const start = state.players['player-1']!.roomId;
    const paid = payWith(state, 'player-1', 1)[0]!;

    const done = answer(moveAway(state), DISMISS_OPTION.DISMISS);

    expect(done.players['player-1']!.roomId).toBe(start);
    expect(done.players['player-1']!.actionDeck.discard.map((card) => card.id)).toContain(paid);
    expect(done.players['player-1']!.actionsPerformedThisRound).toBe(1);
    expect(
      done.players['player-2']!.actionDeck.hand.some(
        (card) => card.id.startsWith('ACT_') && card.id.includes('DISMISS'),
      ),
    ).toBe(false);
    expect(lastEvent(done, 'ACTION_DISMISSED')).toMatchObject({ playerId: 'player-1', dismissedBy: ['player-2'] });
  });

  it('встречное «Отставить» отменяет первое: Действие выполняется', () => {
    const state = contactState(3, 'dismiss-counter');
    giveDismiss(state, 'player-2');
    giveDismiss(state, 'player-1');
    const start = state.players['player-1']!.roomId;

    const dismissed = answer(moveAway(state), DISMISS_OPTION.DISMISS);
    expect(dismissed.pendingDecision).toMatchObject({ playerId: 'player-1', window: { targetPlayerId: 'player-2' } });
    const countered = answer(dismissed, DISMISS_OPTION.DISMISS);

    expect(countered.players['player-1']!.roomId).not.toBe(start);
    expect(lastEvent(countered, 'DISMISS_OVERRULED')).toMatchObject({ dismissedBy: ['player-2', 'player-1'] });
  });

  it('третий Персонаж тоже может отменить чужое «Отставить»', () => {
    const state = contactState(3, 'dismiss-third');
    giveDismiss(state, 'player-2');
    giveDismiss(state, 'player-3');

    let current = moveAway(state);
    expect(current.pendingDecision?.playerId).toBe('player-2');
    current = answer(current, DISMISS_OPTION.DISMISS);
    expect(current.pendingDecision?.playerId).toBe('player-3');
    current = answer(current, DISMISS_OPTION.DISMISS);

    expect(current.reaction).toBeNull();
    expect(lastEvent(current, 'DISMISS_OVERRULED')).toMatchObject({ dismissedBy: ['player-2', 'player-3'] });
  });

  it('срез показывает объявленное Действие без платёжных карт', () => {
    const state = contactState(2, 'dismiss-view');
    giveDismiss(state, 'player-2');
    const declared = moveAway(state);

    const seen = filterStateForPlayer(declared, 'player-1').reaction;
    expect(seen).toEqual({
      actorId: 'player-1',
      actionType: 'ACTION_MOVE',
      targetPlayerId: 'player-1',
      dismissedBy: [],
    });
  });

  it('без карты «Отставить» у соседей окна нет; недопустимое Действие отклоняется до окна; Пас не отменяется', () => {
    const calm = contactState(2, 'dismiss-none');
    expect(moveAway(calm).pendingDecision).toBeNull();

    const state = contactState(2, 'dismiss-invalid');
    giveDismiss(state, 'player-2');
    expectEngineError(
      () =>
        engine.processAction(state, {
          type: 'ACTION_MOVE',
          payload: { targetRoomId: 1, discardCardIds: payWith(state, 'player-1', 1) },
        }),
      'NO_OPEN_DOOR_BETWEEN_ROOMS',
    );
    const passed = engine.processAction(state, { type: 'ACTION_PASS', payload: {} });
    expect(passed.reaction).toBeNull();
  });
});
