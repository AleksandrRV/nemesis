import { describe, expect, it, vi } from 'vitest';

import type { EngineAction, SanitizedGameState } from '@nemesis/shared';
import { createInitialGameState, filterStateForPlayer, findAdjacentOpenRoomIds } from '@nemesis/shared';

import { createMemoryStorage, createSessionStorage } from '../services/session/sessionStorage';
import type { GameEvent, IGameTransport } from '../services/transport/ITransport';
import { LocalInMemoryTransport } from '../services/transport/LocalInMemoryTransport';
import { createGameStore } from './gameStore';

const SEED = 'store-test';
const PLAYER = 'player-1';

/** Стор всегда работает поверх интерфейса транспорта — в тестах это локальный транспорт. */
function createStore(allowDevActions = true, seed = SEED) {
  const transport = new LocalInMemoryTransport({
    session: createSessionStorage(createMemoryStorage()),
    playerId: PLAYER,
    seed,
    allowDevActions,
  });

  return { transport, store: createGameStore(() => transport) };
}

describe('Стор: представление и выбор отсека', () => {
  it('после подключения транспорта отдаёт состояние и открывает отсек персонажа', () => {
    const { store } = createStore();
    const state = store.getState();

    expect(state.view?.meta.seed).toBe(SEED);
    expect(state.selectedRoomId).toBe(11);
    expect(state.rejection).toBeNull();
  });

  it('хранит только отфильтрованное состояние: истина партии в стор не попадает', () => {
    const { store, transport } = createStore();
    const view = store.getState().view;

    expect(view?.ship.engines[1]?.isWorking).toBeNull();
    expect(view?.ship.coordinates.destination).toBeNull();
    expect(typeof transport.getLocalState().ship.engines[1]?.isWorking).toBe('boolean');
  });

  it('selectRoom меняет только выбор интерфейса', () => {
    const { store, transport } = createStore();

    store.getState().selectRoom(5);

    expect(store.getState().selectedRoomId).toBe(5);
    expect(transport.getLocalState().players[PLAYER]?.roomId).toBe(11);
  });

  it('сохраняет выбранный отсек при обновлении состояния партии', () => {
    const { store, transport } = createStore();

    store.getState().selectRoom(19);
    transport.sendAction({ type: 'DEV_TOGGLE_NOISE', payload: { corridorId: '1-2' } });

    expect(store.getState().selectedRoomId).toBe(19);
  });
});

describe('Стор: dispatch', () => {
  it('переводит персонажа в соседний отсек', () => {
    const { store, transport } = createStore();
    const target = findAdjacentOpenRoomIds(transport.getLocalState(), 11)[0]!;
    const discardCardId = transport.getLocalState().players[PLAYER]!.actionDeck.hand[0]!.id;

    store
      .getState()
      .dispatch({ type: 'ACTION_MOVE', payload: { targetRoomId: target, discardCardIds: [discardCardId] } });

    expect(store.getState().view?.players[PLAYER]?.roomId).toBe(target);
  });

  it('показывает причину отказа движка и сбрасывает её при успешном действии', () => {
    const { store, transport } = createStore();
    const farRoom = Object.keys(transport.getLocalState().ship.rooms)
      .map(Number)
      .find((roomId) => roomId !== 11 && !findAdjacentOpenRoomIds(transport.getLocalState(), 11).includes(roomId))!;

    store.getState().dispatch({ type: 'ACTION_MOVE', payload: { targetRoomId: farRoom, discardCardIds: [] } });

    expect(store.getState().rejection).toMatch(/открытой Дверью/);
    expect(store.getState().view?.players[PLAYER]?.roomId).toBe(11);

    store.getState().dispatch({ type: 'DEV_TOGGLE_NOISE', payload: { corridorId: '1-2' } });

    expect(store.getState().rejection).toBeNull();
  });
});

/**
 * Заглушка сетевого транспорта: партию начинает сервер, поэтому у неё нет
 * `startNewGame`, зато есть свои подписки — их нужно снять при переподключении.
 */
class FakeTransport implements IGameTransport {
  readonly init = vi.fn(async () => undefined);
  readonly unsubscribeState = vi.fn();
  readonly unsubscribeEvents = vi.fn();
  readonly sentActions: EngineAction[] = [];

  private stateListeners: ((view: SanitizedGameState) => void)[] = [];
  private eventListeners: ((event: GameEvent) => void)[] = [];

  sendAction(action: EngineAction): void {
    this.sentActions.push(action);
  }

  subscribeToState(listener: (view: SanitizedGameState) => void): () => void {
    this.stateListeners.push(listener);
    return this.unsubscribeState;
  }

  subscribeToEvents(listener: (event: GameEvent) => void): () => void {
    this.eventListeners.push(listener);
    return this.unsubscribeEvents;
  }

  emitState(view: SanitizedGameState): void {
    this.stateListeners.forEach((listener) => listener(view));
  }

  emitEvent(event: GameEvent): void {
    this.eventListeners.forEach((listener) => listener(event));
  }
}

describe('Стор: сетевой транспорт', () => {
  it('переподключается к новому столу, если транспорт не умеет начинать партию', () => {
    const first = new FakeTransport();
    const second = new FakeTransport();
    const queue = [first, second];
    const store = createGameStore(() => queue.shift()!);

    first.emitState(filterStateForPlayer(createInitialGameState('first-table'), PLAYER));
    first.emitEvent({ type: 'ACTION_REJECTED', action: { type: 'ACTION_PASS', payload: {} }, reason: 'ход не ваш' });

    expect(store.getState().rejection).toBe('ход не ваш');

    store.getState().startNewGame();

    expect(first.unsubscribeState).toHaveBeenCalledOnce();
    expect(first.unsubscribeEvents).toHaveBeenCalledOnce();
    expect(second.init).toHaveBeenCalledOnce();
    expect(second.sentActions).toEqual([]);
    // До первого снимка нового стола интерфейс не показывает старую партию.
    expect(store.getState().view).toBeNull();
    expect(store.getState().selectedRoomId).toBeNull();
    expect(store.getState().rejection).toBeNull();

    second.emitState(filterStateForPlayer(createInitialGameState('second-table'), PLAYER));
    expect(store.getState().view?.meta.seed).toBe('second-table');
    expect(store.getState().selectedRoomId).toBe(11);

    // Действия уходят в новый транспорт, а не в отключённый.
    store.getState().dispatch({ type: 'ACTION_PASS', payload: {} });
    expect(second.sentActions).toEqual([{ type: 'ACTION_PASS', payload: {} }]);
    expect(first.sentActions).toEqual([]);
  });
});

describe('Стор: новая партия', () => {
  it('бросает новый стол и открывает стартовый отсек', () => {
    const { store, transport } = createStore();

    store.getState().selectRoom(20);
    vi.stubGlobal('crypto', { randomUUID: () => 'store-new-seed' });
    store.getState().startNewGame();
    vi.unstubAllGlobals();

    expect(store.getState().view?.meta.seed).toBe('store-new-seed');
    expect(store.getState().selectedRoomId).toBe(11);
    expect(store.getState().rejection).toBeNull();
    expect(transport.getLocalState().meta.seed).toBe('store-new-seed');
  });

  it('принимает явный сид', () => {
    const { store } = createStore();

    store.getState().startNewGame('fixed-seed');

    expect(store.getState().view?.meta.seed).toBe('fixed-seed');
  });
});
