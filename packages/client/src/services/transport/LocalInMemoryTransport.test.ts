import { describe, expect, it, vi } from 'vitest';

import type { GameEvent } from './ITransport';
import type { SanitizedGameState } from '@nemesis/shared';
import { GAME_STATE_SCHEMA_VERSION, createInitialGameState, findAdjacentOpenRoomIds } from '@nemesis/shared';

import type { StorageLike } from '../session/sessionStorage';
import {
  SESSION_STORAGE_KEY,
  createMemoryStorage,
  createSessionStorage,
  serializeSession,
} from '../session/sessionStorage';
import { LocalInMemoryTransport, rejectionReason } from './LocalInMemoryTransport';

const SEED = 'transport-test';
const PLAYER = 'player-1';

function createTransport(options: { storage?: StorageLike; allowDevActions?: boolean; seed?: string } = {}) {
  const storage = options.storage ?? createMemoryStorage();

  return {
    storage,
    transport: new LocalInMemoryTransport({
      session: createSessionStorage(storage),
      playerId: PLAYER,
      seed: options.seed ?? SEED,
      allowDevActions: options.allowDevActions,
    }),
  };
}

async function initAndCapture(transport: LocalInMemoryTransport): Promise<SanitizedGameState[]> {
  const views: SanitizedGameState[] = [];

  transport.subscribeToState((view) => views.push(view));
  await transport.init();

  return views;
}

describe('LocalInMemoryTransport: первое состояние', () => {
  it('отдаёт представление сразу после init', async () => {
    const { transport } = createTransport();
    const views = await initAndCapture(transport);

    expect(views).toHaveLength(1);
    expect(views[0]?.meta.seed).toBe(SEED);
  });

  it('не выпускает скрытые данные: двигатели и Координаты приходят неизвестными', async () => {
    const { transport } = createTransport();
    const [view] = await initAndCapture(transport);

    expect(view?.ship.engines[1]?.isWorking).toBeNull();
    expect(view?.ship.coordinates.destination).toBeNull();
    expect(view?.ship.rooms[2]?.definitionId).toBeNull();

    // Истина лежит в движке и в интерфейс не попадает.
    expect(typeof transport.getLocalState().ship.engines[1]?.isWorking).toBe('boolean');
    expect(transport.getLocalState().ship.coordinates.destination).not.toBeNull();
  });

  it('сразу сохраняет только что начатую партию', async () => {
    const { storage, transport } = createTransport();

    await initAndCapture(transport);

    expect(storage.getItem(SESSION_STORAGE_KEY)).not.toBeNull();
    expect(createSessionStorage(storage).load()?.meta.seed).toBe(SEED);
  });
});

describe('LocalInMemoryTransport: действия', () => {
  it('применяет действие, рассылает новое состояние и подтверждает его', async () => {
    const { transport } = createTransport();
    const views = await initAndCapture(transport);
    const events: GameEvent[] = [];

    transport.subscribeToEvents((event) => events.push(event));

    const target = findAdjacentOpenRoomIds(transport.getLocalState(), 11)[0]!;

    transport.sendAction({ type: 'ACTION_MOVE', payload: { targetRoomId: target, discardCardIds: [] } });

    expect(views).toHaveLength(2);
    expect(views[1]?.players[PLAYER]?.roomId).toBe(target);
    expect(events).toEqual([{ type: 'ACTION_APPLIED', action: expect.objectContaining({ type: 'ACTION_MOVE' }) }]);
  });

  it('сохраняет партию после действия: перезапуск продолжит её', async () => {
    const { storage, transport } = createTransport();

    await initAndCapture(transport);

    const target = findAdjacentOpenRoomIds(transport.getLocalState(), 11)[0]!;

    transport.sendAction({ type: 'ACTION_MOVE', payload: { targetRoomId: target, discardCardIds: [] } });

    const resumed = new LocalInMemoryTransport({ session: createSessionStorage(storage), playerId: PLAYER });
    const resumedViews = await initAndCapture(resumed);

    expect(resumedViews[0]?.players[PLAYER]?.roomId).toBe(target);
  });

  it('на отказ движка отвечает событием и не трогает партию', async () => {
    const { transport } = createTransport();
    const views = await initAndCapture(transport);
    const events: GameEvent[] = [];

    transport.subscribeToEvents((event) => events.push(event));

    const farRoom = Object.keys(transport.getLocalState().ship.rooms)
      .map(Number)
      .find((roomId) => roomId !== 11 && !findAdjacentOpenRoomIds(transport.getLocalState(), 11).includes(roomId))!;

    transport.sendAction({ type: 'ACTION_MOVE', payload: { targetRoomId: farRoom, discardCardIds: [] } });

    expect(views).toHaveLength(1);
    expect(events[0]?.type).toBe('ACTION_REJECTED');
    expect(events[0]).toMatchObject({ reason: expect.stringContaining('открытой Дверью') });
    expect(transport.getLocalState().players[PLAYER]?.roomId).toBe(11);
  });

  it('принимает отладочные действия только с явным разрешением', async () => {
    const strict = createTransport();
    const permissive = createTransport({ allowDevActions: true });

    await initAndCapture(strict.transport);
    await initAndCapture(permissive.transport);

    const corridorId = Object.keys(strict.transport.getLocalState().ship.corridors)[0]!;

    strict.transport.sendAction({ type: 'DEV_TOGGLE_NOISE', payload: { corridorId } });
    permissive.transport.sendAction({ type: 'DEV_TOGGLE_NOISE', payload: { corridorId } });

    expect(strict.transport.getLocalState().ship.corridors[corridorId]?.hasNoise).toBe(false);
    expect(permissive.transport.getLocalState().ship.corridors[corridorId]?.hasNoise).toBe(true);
  });
});

describe('LocalInMemoryTransport: сохранения', () => {
  it('продолжает совместимую партию вместо новой', async () => {
    const storage = createMemoryStorage();
    const saved = createInitialGameState('saved-game');

    storage.setItem(SESSION_STORAGE_KEY, serializeSession(saved));

    const { transport } = createTransport({ storage });
    const [view] = await initAndCapture(transport);

    expect(view?.meta.seed).toBe('saved-game');
  });

  it('начинает новую партию вместо сохранения чужой версии', async () => {
    const storage = createMemoryStorage();
    const legacy = JSON.stringify({ version: 0, state: { meta: {}, ship: {}, players: {} } });

    storage.setItem(SESSION_STORAGE_KEY, legacy);

    const { transport } = createTransport({ storage, seed: 'after-legacy' });
    const [view] = await initAndCapture(transport);

    expect(view?.meta.seed).toBe('after-legacy');
    expect(view?.meta.schemaVersion).toBe(GAME_STATE_SCHEMA_VERSION);
  });

  it('startNewGame стирает прежнюю партию и бросает новый стол', async () => {
    const { storage, transport } = createTransport();

    await initAndCapture(transport);

    vi.stubGlobal('crypto', { randomUUID: () => 'brand-new-seed' });
    transport.startNewGame();
    vi.unstubAllGlobals();

    expect(transport.getLocalState().meta.seed).toBe('brand-new-seed');
    expect(createSessionStorage(storage).load()?.meta.seed).toBe('brand-new-seed');
  });
});

describe('LocalInMemoryTransport: причина отказа', () => {
  it('на ошибку движка отдаёт её текст', () => {
    expect(rejectionReason(new Error('нет открытой Двери'))).toBe('нет открытой Двери');
  });

  it('не падает, если брошено не значение Error', () => {
    expect(rejectionReason('чужой формат ошибки')).toBe('чужой формат ошибки');
  });
});

describe('LocalInMemoryTransport: подписки', () => {
  it('после dispose состояние больше не приходит', async () => {
    const { transport } = createTransport();
    const onState = vi.fn();

    transport.subscribeToState(onState);
    await transport.init();
    expect(onState).toHaveBeenCalledTimes(1);

    transport.dispose();
    transport.sendAction({ type: 'ACTION_PASS', payload: {} });

    expect(onState).toHaveBeenCalledTimes(1);
  });

  it('отписка от событий прекращает доставку', async () => {
    const { transport } = createTransport();
    const onEvent = vi.fn();

    await initAndCapture(transport);

    const unsubscribe = transport.subscribeToEvents(onEvent);

    transport.sendAction({ type: 'ACTION_PASS', payload: {} });
    unsubscribe();
    transport.sendAction({ type: 'ACTION_PASS', payload: {} });

    expect(onEvent).toHaveBeenCalledTimes(1);
  });
});
