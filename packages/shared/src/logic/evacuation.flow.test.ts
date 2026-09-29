import { afterEach, describe, expect, it, vi } from 'vitest';
import { HIBERNATION_OPENS_AT_TIME, SELF_DESTRUCT_IRREVERSIBLE_AT } from '../data/evacuation.js';
import { TIME_TRACK_LENGTH } from '../data/setup.js';
import { contactState, expectEngineError } from '../testing/contactFixtures.js';
import type { GameState } from '../types/state.js';
import * as rng from '../utils/rng.js';
import { killPlayer } from './characterDamage.js';
import { advanceTimeAndSelfDestruct } from './eventsPhase.js';
import { resolvePodBoarding } from './evacuation.js';
import { GameEngine } from './fsm.js';
import { getOrderedPlayers } from './turnCycle.js';

const SILENCE_ROLL = 0.85;

afterEach(() => vi.restoreAllMocks());

function silentNoise(): void {
  const original = rng.drawFromStream;
  vi.spyOn(rng, 'drawFromStream').mockImplementation((seed, stream, index) =>
    stream === 'noise' ? SILENCE_ROLL : original(seed, stream, index),
  );
}

function standIn(state: GameState, playerId: string, definitionId: string): number {
  const player = state.players[playerId]!;
  const room = state.ship.rooms[player.roomId]!;
  room.definitionId = definitionId;
  room.isExplored = true;
  room.hasMalfunction = false;
  return room.id;
}

function payment(state: GameState, playerId: string, count: number): string[] {
  return state.players[playerId]!.actionDeck.hand.filter((card) => 'characterClass' in card)
    .slice(0, count)
    .map((card) => card.id);
}

function useRoom(state: GameState, playerId: string, extra: Record<string, unknown> = {}): GameState {
  return new GameEngine().processAction(
    state,
    { type: 'ACTION_ROOM_ABILITY', payload: { discardCardIds: payment(state, playerId, 2), ...extra } },
    { actorId: playerId },
  );
}

function unlockedPods(state: GameState): GameState {
  for (const pod of Object.values(state.ship.escapePods)) pod.isLocked = false;
  return state;
}

describe('Анабиоз через движок (стр. 26)', () => {
  it('удачная попытка: Персонаж уснул, вне активной игры, ход передан дальше', () => {
    silentNoise();
    const state = contactState(2, 'hibernation-flow');
    standIn(state, 'player-1', 'HIBERNATORIUM');
    state.meta.timeTrackPosition = HIBERNATION_OPENS_AT_TIME;

    const next = useRoom(state, 'player-1');

    expect(next.players['player-1']!.isInHibernation).toBe(true);
    expect(getOrderedPlayers(next).map((player) => player.id)).toEqual(['player-2']);
    expect(next.meta.activePlayerId).toBe('player-2');
  });

  it('последний активный Персонаж уснул: партия окончена, маркер Времени — на прыжок, Финальный Валидатор', () => {
    silentNoise();
    const state = contactState(1, 'hibernation-last');
    standIn(state, 'player-1', 'HIBERNATORIUM');
    state.meta.timeTrackPosition = HIBERNATION_OPENS_AT_TIME;

    const next = useRoom(state, 'player-1');

    expect(next.meta).toMatchObject({ phase: 'GAME_OVER', gameOverReason: 'NO_ACTIVE_CHARACTERS' });
    expect(next.meta.timeTrackPosition).toBe(TIME_TRACK_LENGTH);
    expect(next.endgame).toMatchObject({ finalMarker: 'TIME' });
    expect(next.endgame!.characters[0]!.escapeRoute).toBe('HIBERNATION');
  });
});

describe('Спасательные Капсулы через движок (стр. 12, 24–26)', () => {
  it('разблокировка: первая смерть открывает все Капсулы', () => {
    const state = contactState(2, 'pods-first-death');
    killPlayer(state, 'player-2');
    expect(Object.values(state.ship.escapePods).every((pod) => !pod.isLocked)).toBe(true);
    expect(state.gameLog.at(-1)?.event).toMatchObject({ type: 'ESCAPE_PODS_UNLOCKED', cause: 'FIRST_DEATH' });
  });

  it('разблокировка: маркер Самоуничтожения на первом жёлтом поле', () => {
    const state = contactState(2, 'pods-self-destruct');
    state.meta.selfDestructTrackPosition = SELF_DESTRUCT_IRREVERSIBLE_AT - 1;
    advanceTimeAndSelfDestruct(state);
    expect(Object.values(state.ship.escapePods).every((pod) => !pod.isLocked)).toBe(true);
  });

  it('Неисправный Спасательный отсек: войти в Капсулу нельзя', () => {
    const state = unlockedPods(contactState(2, 'pods-malfunction'));
    const roomId = standIn(state, 'player-1', 'ESCAPE_POD_A');
    state.ship.rooms[roomId]!.hasMalfunction = true;
    expectEngineError(() => useRoom(state, 'player-1'), 'ROOM_ABILITY_NOT_ALLOWED');
  });

  it('второй Персонаж садится к ждущему и запускает Капсулу: улетают оба', () => {
    const state = unlockedPods(contactState(3, 'pods-together'));
    const pod = Object.values(state.ship.escapePods).find((candidate) => candidate.section === 'A')!;
    const roomId = standIn(state, 'player-1', 'ESCAPE_POD_A');
    state.players['player-2']!.roomId = roomId;
    for (const playerId of ['player-1', 'player-2']) {
      resolvePodBoarding(state, { type: 'ESCAPE_POD_BOARDING_INTERRUPT', playerId, roomId, podId: pod.id });
      if (playerId === 'player-1') state.pendingDecision = null;
    }

    const next = new GameEngine().processAction(
      state,
      { type: 'ACTION_RESOLVE_DECISION', payload: { decisionId: state.pendingDecision!.id, selectedOption: 'LAUNCH' } },
      { actorId: 'player-2' },
    );

    expect(next.players['player-1']!.hasEscapedInPod).toBe(true);
    expect(next.players['player-2']!.hasEscapedInPod).toBe(true);
    expect(next.ship.escapePods[pod.id]!.isLaunched).toBe(true);
  });
});
