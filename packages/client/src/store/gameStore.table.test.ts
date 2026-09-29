import { describe, expect, it } from 'vitest';
import type { TableSeat } from '@nemesis/shared';

import { createMemoryStorage, createSessionStorage } from '../services/session/sessionStorage';
import { LocalInMemoryTransport } from '../services/transport/LocalInMemoryTransport';
import { createGameStore } from './gameStore';

function createStore() {
  const transport = new LocalInMemoryTransport({
    session: createSessionStorage(createMemoryStorage()),
    playerId: 'player-1',
    seed: 'store-table',
  });
  return createGameStore(() => transport);
}

function completeSetup(store: ReturnType<typeof createStore>, seats: TableSeat[]): void {
  store.getState().beginCrewSetup({ seed: 'store-lobby', seats, roleSelection: 'DRAFT' });
  for (let guard = 0; guard < 12 && !store.getState().crewSetup!.isReady; guard++) {
    const setup = store.getState().crewSetup!;
    if (store.getState().pendingBotId) store.getState().stepBot();
    else {
      if (setup.currentPicker !== setup.viewerId) store.getState().viewCrewSetupAs(setup.currentPicker!);
      store.getState().pickRole(store.getState().crewSetup!.availableRoles[0]!);
    }
  }
  store.getState().launchCrew();
}

describe('Стор: стол с местами', () => {
  it('после подготовки хранит места и ведёт ботов шагами, пока ход не вернётся человеку', () => {
    const store = createStore();
    completeSetup(store, [
      { seatIndex: 0, kind: 'LOCAL_HUMAN', label: 'Вы' },
      { seatIndex: 1, kind: 'BOT', label: 'Бот 2' },
      { seatIndex: 2, kind: 'BOT', label: 'Бот 3' },
    ]);
    const state = store.getState();
    expect(state.crewSetup).toBeNull();
    expect(state.seating.map((seat) => seat.kind).filter((kind) => kind === 'BOT')).toHaveLength(2);
    const human = state.seating.find((seat) => seat.kind === 'LOCAL_HUMAN')!.playerId;
    expect(state.view?.viewerId).toBe(human);

    for (let guard = 0; guard < 20 && store.getState().pendingBotId; guard++) store.getState().stepBot();
    expect(store.getState().pendingBotId).toBeNull();
    expect(store.getState().view?.meta.activePlayerId).toBe(human);
    expect(store.getState().lastBotAction?.action.type).toBe('ACTION_PASS');
    expect(store.getState().botTicks).toBeGreaterThan(0);
  });

  it('при двух людях за устройством показывает шторку передачи и снимает её подтверждением', () => {
    const store = createStore();
    completeSetup(store, [
      { seatIndex: 0, kind: 'LOCAL_HUMAN', label: 'Вы' },
      { seatIndex: 1, kind: 'LOCAL_HUMAN', label: 'Игрок 2' },
    ]);
    const first = store.getState().view!.viewerId;
    store.getState().dispatch({ type: 'ACTION_PASS', payload: {} });
    const second = store.getState().view!.viewerId;
    expect(second).not.toBe(first);
    expect(store.getState().handoffTo).toBe(second);
    store.getState().confirmHandoff();
    expect(store.getState().handoffTo).toBeNull();
  });

  it('скорость ботов переключается кнопкой HUD', () => {
    const store = createStore();
    expect(store.getState().botSpeed).toBe('NORMAL');
    store.getState().setBotSpeed('FAST');
    expect(store.getState().botSpeed).toBe('FAST');
  });
});
