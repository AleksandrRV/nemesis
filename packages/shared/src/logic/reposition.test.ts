import { describe, expect, it } from 'vitest';
import { ACTION_CARDS } from '../data/actionCards.js';
import type { GameState } from '../types/state.js';
import { contactState, putIntruder } from '../testing/contactFixtures.js';
import { lastEvent } from '../testing/roomFixtures.js';
import { GameEngine } from './fsm.js';
import { CONSENT_OPTION } from './reposition.js';
import { findAdjacentOpenRoomIds } from './shipGraphQueries.js';

const engine = new GameEngine();

function inCombat(state: GameState): GameState {
  putIntruder(state, 'LARVA', state.players['player-1']!.roomId);
  return state;
}

function withCard(state: GameState, cardId: string): GameState {
  state.players['player-1']!.actionDeck.hand.push(structuredClone(ACTION_CARDS.find((card) => card.id === cardId)!));
  return state;
}

function weaponId(state: GameState): string {
  const slot = state.players['player-1']!.handSlots.find((entry) => entry.source === 'ITEM' && entry.card.isWeapon)!;
  return slot.source === 'ITEM' ? slot.card.id : '';
}

function suppress(state: GameState, cardId: string): { next: GameState; target: number } {
  const target = findAdjacentOpenRoomIds(state, state.players['player-2']!.roomId)[0]!;
  const next = engine.processAction(state, {
    type: 'ACTION_PLAY_CARD',
    payload: {
      cardId,
      combat: {
        kind: 'REPOSITION',
        weaponItemId: weaponId(state),
        moves: [{ playerId: 'player-2', targetRoomId: target }],
      },
    },
  });
  return { next, target };
}

function answer(state: GameState, option: string): GameState {
  return engine.processAction(
    state,
    { type: 'ACTION_RESOLVE_DECISION', payload: { decisionId: state.pendingDecision!.id, selectedOption: option } },
    { actorId: state.pendingDecision!.playerId },
  );
}

describe('Перенос другого Персонажа «если он согласен» (карты Действий)', () => {
  it('«Огонь на подавление» Скаута: партнёр соглашается — переносится без Атак', () => {
    const { next, target } = suppress(
      withCard(inCombat(contactState(2, 'scout-suppress')), 'ACT_SCO_SUPPRESSIVE_FIRE'),
      'ACT_SCO_SUPPRESSIVE_FIRE',
    );
    expect(next.pendingDecision).toMatchObject({
      type: 'REPOSITION_CONSENT',
      playerId: 'player-2',
      requesterId: 'player-1',
    });

    const agreed = answer(next, CONSENT_OPTION.ACCEPT);
    expect(agreed.players['player-2']!.roomId).toBe(target);
    expect(lastEvent(agreed, 'REPOSITION_ANSWERED')).toMatchObject({ accepted: true });
  });

  it('отказ: партнёр остаётся, карта и Боезапас потрачены, Действие засчитано', () => {
    const state = withCard(inCombat(contactState(2, 'captain-suppress-decline')), 'ACT_CAP_SUPPRESSIVE_FIRE');
    const start = state.players['player-2']!.roomId;
    const { next } = suppress(state, 'ACT_CAP_SUPPRESSIVE_FIRE');

    const declined = answer(next, CONSENT_OPTION.DECLINE);
    expect(declined.players['player-2']!.roomId).toBe(start);
    expect(declined.players['player-1']!.actionDeck.discard.map((card) => card.id)).toContain(
      'ACT_CAP_SUPPRESSIVE_FIRE',
    );
    expect(declined.players['player-1']!.actionsPerformedThisRound).toBe(1);
  });

  it('«Приказ» переносит без согласия', () => {
    const state = withCard(contactState(2, 'order-no-consent'), 'ACT_CAP_ORDER');
    const target = findAdjacentOpenRoomIds(state, state.players['player-2']!.roomId)[0]!;
    const next = engine.processAction(state, {
      type: 'ACTION_PLAY_CARD',
      payload: { cardId: 'ACT_CAP_ORDER', targetPlayerId: 'player-2', targetRoomId: target, discardCardIds: [] },
    });
    expect(next.pendingDecision).toBeNull();
    expect(next.players['player-2']!.roomId).toBe(target);
  });
});
