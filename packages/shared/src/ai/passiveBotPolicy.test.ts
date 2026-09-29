import { describe, expect, it } from 'vitest';
import { ACTION_CARDS } from '../data/actionCards.js';
import type { TableSeat } from '../types/crew.js';
import type { GameState } from '../types/state.js';
import { contactState } from '../testing/contactFixtures.js';
import { payWith } from '../testing/roomFixtures.js';
import {
  crewAssignment,
  currentDraftPicker,
  isCrewReady,
  nextBotToPick,
  pickRandomRole,
  startCrewSetup,
} from '../logic/crewSetup.js';
import { GameEngine } from '../logic/fsm.js';
import { playerToAct } from '../logic/playerToAct.js';
import { DISMISS_OPTION } from '../logic/reactions.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { createInitialGameState } from '../logic/setup.js';
import { findAdjacentOpenRoomIds } from '../logic/shipGraphQueries.js';
import { decidePassiveBotAction } from './passiveBotPolicy.js';

const engine = new GameEngine();

function botTable(seed: string, count: number): GameState {
  const seats: TableSeat[] = Array.from({ length: count }, (_, seatIndex) => ({
    seatIndex,
    kind: 'BOT',
    label: `Бот ${seatIndex + 1}`,
  }));
  let setup = startCrewSetup(seed, seats, 'DRAFT');
  while (!isCrewReady(setup)) {
    setup = pickRandomRole(setup, currentDraftPicker(setup) ?? nextBotToPick(setup)!);
  }
  return createInitialGameState(seed, { crew: crewAssignment(setup) });
}

function botStep(state: GameState): GameState {
  const actorId = playerToAct(state)!;
  const action = decidePassiveBotAction(filterStateForPlayer(state, actorId), actorId);
  expect(action, `бот ${actorId} не нашёл ответа`).not.toBeNull();
  return engine.processAction(state, action!, { actorId });
}

describe('Базовая политика бота (план 0.8.0, В8-2-4)', () => {
  it('стол из пяти ботов проходит несколько Раундов подряд без зависаний', () => {
    let state = botTable('bots-round-trip', 5);
    let steps = 0;
    while (state.meta.currentRound < 4 && playerToAct(state) !== null && steps < 400) {
      state = botStep(state);
      steps += 1;
    }
    expect(state.meta.currentRound).toBeGreaterThanOrEqual(4);
  });

  it('молчит, пока ход или решение принадлежат другому игроку', () => {
    const state = botTable('bots-idle', 3);
    const idleBot = Object.keys(state.players).find((playerId) => playerId !== playerToAct(state))!;
    expect(decidePassiveBotAction(filterStateForPlayer(state, idleBot), idleBot)).toBeNull();
  });

  it('в окне «Отставить» пропускает: карты на руке не тратит', () => {
    const state = contactState(2, 'bot-dismiss');
    const dismiss = structuredClone(ACTION_CARDS.find((card) => card.effect.kind === 'DISMISS')!);
    state.players['player-2']!.actionDeck.hand.push(dismiss);
    const target = findAdjacentOpenRoomIds(state, state.players['player-1']!.roomId)[0]!;
    const opened = engine.processAction(state, {
      type: 'ACTION_MOVE',
      payload: { targetRoomId: target, discardCardIds: payWith(state, 'player-1', 1) },
    });
    expect(opened.pendingDecision?.type).toBe('DISMISS_WINDOW');
    const action = decidePassiveBotAction(filterStateForPlayer(opened, 'player-2'), 'player-2');
    expect(action).toEqual({
      type: 'ACTION_RESOLVE_DECISION',
      payload: { decisionId: opened.pendingDecision!.id, selectedOption: DISMISS_OPTION.ALLOW },
    });
  });

  it('в Спасательной Капсуле на своём ходу остаётся ждать, а не пасует', () => {
    const state = contactState(2, 'bot-pod');
    state.players['player-1']!.boardedPodId = 'pod-1';
    state.players['player-1']!.boardedRound = state.meta.currentRound;
    const action = decidePassiveBotAction(filterStateForPlayer(state, 'player-1'), 'player-1');
    expect(action).toEqual({ type: 'ACTION_ESCAPE_POD', payload: { command: 'STAY' } });
  });

  it('после конца партии не действует', () => {
    const state = botTable('bots-over', 2);
    state.meta.phase = 'GAME_OVER';
    const actorId = state.meta.activePlayerId;
    expect(playerToAct(state)).toBeNull();
    expect(decidePassiveBotAction(filterStateForPlayer(state, actorId), actorId)).toBeNull();
  });
});
