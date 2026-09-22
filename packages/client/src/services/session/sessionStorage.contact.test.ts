import { describe, expect, it } from 'vitest';
import { createInitialGameState, findNoiseTarget, GameEngine, GAME_STATE_SCHEMA_VERSION } from '@nemesis/shared';
import type { GameState, SanitizedGameState } from '@nemesis/shared';
import {
  createMemoryStorage,
  createSessionStorage,
  isGameState,
  parseSession,
  serializeSession,
} from './sessionStorage';
import { LocalInMemoryTransport } from '../transport/LocalInMemoryTransport';

function suspendedContact(): GameState {
  const state = createInitialGameState('engine-test', { playerCount: 2 });
  state.ship.rooms[6]!.isExplored = false;
  state.ship.rooms[6]!.explorationEffect = null;
  const target = findNoiseTarget(state, 6, 3);
  if (target.kind !== 'CORRIDOR') throw new Error('Фикстуре нужен обычный Коридор');
  target.corridor.hasNoise = true;
  const player = state.players['player-1']!;
  player.actionDeck.hand = player.actionDeck.hand.slice(0, 1);
  const token = state.intrudersPool.bag.find((candidate) => candidate.type === 'ADULT')!;
  state.intrudersPool.supply.push(...state.intrudersPool.bag.filter((candidate) => candidate.id !== token.id));
  state.intrudersPool.bag = [{ ...token, escapeNumber: 4 }];
  for (const candidate of Object.values(state.players)) {
    candidate.objectives = [
      { id: `${candidate.id}-private-one`, kind: 'PERSONAL', name: 'Цель 1', description: 'Частная цель' },
      { id: `${candidate.id}-private-two`, kind: 'CORPORATE', name: 'Цель 2', description: 'Частная цель' },
    ];
  }
  return new GameEngine().processAction(state, {
    type: 'ACTION_MOVE',
    payload: { targetRoomId: 6, discardCardIds: [player.actionDeck.hand[0]!.id] },
  });
}

function choose(state: GameState, playerId: string): GameState {
  return new GameEngine().processAction(
    state,
    {
      type: 'ACTION_RESOLVE_DECISION',
      payload: { decisionId: state.pendingDecision!.id, selectedOption: `${playerId}-private-one` },
    },
    { actorId: playerId },
  );
}

describe('Сохранение незавершённого Контакта и возобновление транспорта', () => {
  it('serializeSession → parseSession продолжает цель → атаку → завершение действия без новых жетонов', () => {
    const state = choose(suspendedContact(), 'player-1');
    const restored = parseSession(serializeSession(state));
    if (!restored) throw new Error('Сохранение текущей схемы не загрузилось');
    expect(restored.pendingDecision?.playerId).toBe('player-2');
    expect(choose(restored, 'player-2')).toEqual(choose(state, 'player-2'));
    expect(restored.meta.nextEntitySequence).toBe(state.meta.nextEntitySequence);
  });

  it('реальный транспорт принимает обязательный выбор неактивного игрока и отдаёт только sanitized-срез', async () => {
    const state = choose(suspendedContact(), 'player-1');
    const session = createSessionStorage(createMemoryStorage());
    session.save(state);
    const transport = new LocalInMemoryTransport({ playerId: 'player-2', seed: 'ignored-on-restore', session });
    const views: SanitizedGameState[] = [];
    transport.subscribeToState((view) => views.push(view));
    await transport.init();
    expect(views[0]!.pendingDecision?.playerId).toBe('player-2');
    expect(views[0]!.meta.activePlayerId).toBe('player-1');
    expect(JSON.stringify(views[0])).not.toContain('player-1-private');
    transport.sendAction({
      type: 'ACTION_RESOLVE_DECISION',
      payload: { decisionId: state.pendingDecision!.id, selectedOption: 'player-2-private-one' },
    });
    expect(transport.getLocalState()).toEqual(choose(state, 'player-2'));
    expect(views.at(-1)!.pendingDecision).toBeNull();
    expect(views.at(-1)!.decks.intruderAttacks).not.toHaveProperty('drawPile');
    expect(views.at(-1)!.meta.rngDraws.bag).toBe(state.meta.rngDraws.bag);
    expect(session.load()).toEqual(transport.getLocalState());
  });

  it('версия 5 несовместима, даже если оболочка хранения объявлена текущей', () => {
    const state = createInitialGameState('old-contact-session');
    const oldState = { ...state, meta: { ...state.meta, schemaVersion: 5 } };
    expect(GAME_STATE_SCHEMA_VERSION).toBeGreaterThan(5);
    expect(parseSession(JSON.stringify({ version: GAME_STATE_SCHEMA_VERSION, state: oldState }))).toBeNull();
  });

  it.each(['firstEncounterOccurred', 'attackSuppression'] as const)(
    'отвергает повреждённое сохранение без intrudersPool.%s',
    (field) => {
      const state = createInitialGameState('corrupt-contact-session');
      const pool: Record<string, unknown> = { ...state.intrudersPool };
      delete pool[field];
      expect(isGameState({ ...state, intrudersPool: pool })).toBe(false);
    },
  );

  it('отвергает сохранение без маркера Личинки и без корректного счётчика ID', () => {
    const state = createInitialGameState('corrupt-contact-session');
    const player: Record<string, unknown> = { ...state.players['player-1'] };
    delete player.hasLarva;
    expect(isGameState({ ...state, players: { 'player-1': player } })).toBe(false);
    for (const nextEntitySequence of [undefined, -1, 0, 1.5]) {
      expect(isGameState({ ...state, meta: { ...state.meta, nextEntitySequence } })).toBe(false);
    }
  });
});
