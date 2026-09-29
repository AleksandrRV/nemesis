import { describe, expect, it } from 'vitest';
import { contactState, expectEngineError, putIntruder, putPlayer } from '../testing/contactFixtures.js';
import { exploreAs, lastEvent, standAt, useConsole } from '../testing/roomFixtures.js';
import type { GameState } from '../types/state.js';
import { corridorsIntoRoom } from './doorControl.js';
import { resolveDecompressions } from './decompression.js';
import { GameEngine } from './fsm.js';

const TARGET_ROOM = 3;

function airlockTable(seed: string): GameState {
  const state = contactState(2, seed);
  standAt(state, 'player-1', 'AIRLOCK_CONTROL');
  exploreAs(state, TARGET_ROOM, 'GENERATOR');
  for (const corridor of corridorsIntoRoom(state, TARGET_ROOM)) corridor.doorState = 'OPEN';
  return state;
}

function pass(state: GameState, playerId: string): GameState {
  return new GameEngine().processAction(state, { type: 'ACTION_PASS', payload: {} }, { actorId: playerId });
}

describe('Контроль Воздушных Шлюзов [2]: Экстренная Декомпрессия (стр. 25)', () => {
  it('закрывает все Двери жёлтой Комнаты, снимает Пожар и кладёт жетон', () => {
    const state = airlockTable('decompression-start');
    state.ship.rooms[TARGET_ROOM]!.hasFire = true;

    const next = useConsole(state, 'player-1', { targetRoomId: TARGET_ROOM });

    expect(corridorsIntoRoom(next, TARGET_ROOM).every((corridor) => corridor.doorState === 'CLOSED')).toBe(true);
    expect(next.ship.rooms[TARGET_ROOM]).toMatchObject({ hasDecompressionToken: true, hasFire: false });
    expect(lastEvent(next, 'DECOMPRESSION_STARTED')).toMatchObject({ targetRoomId: TARGET_ROOM, fireRemoved: true });
  });

  it('только другая исследованная жёлтая Комната без Разрушенных Дверей', () => {
    const state = airlockTable('decompression-invalid');
    const consoleRoom = state.players['player-1']!.roomId;
    expectEngineError(() => useConsole(state, 'player-1', { targetRoomId: consoleRoom }), 'DECOMPRESSION_NOT_ALLOWED');

    exploreAs(state, TARGET_ROOM, 'STORAGE');
    expectEngineError(() => useConsole(state, 'player-1', { targetRoomId: TARGET_ROOM }), 'DECOMPRESSION_NOT_ALLOWED');

    exploreAs(state, TARGET_ROOM, 'GENERATOR');
    corridorsIntoRoom(state, TARGET_ROOM)[0]!.doorState = 'DESTROYED';
    expectEngineError(() => useConsole(state, 'player-1', { targetRoomId: TARGET_ROOM }), 'DECOMPRESSION_NOT_ALLOWED');
  });

  it('открытая до конца Фазы Игроков Дверь снимает жетон', () => {
    const state = airlockTable('decompression-cancel');
    const next = useConsole(state, 'player-1', { targetRoomId: TARGET_ROOM });
    const door = corridorsIntoRoom(next, TARGET_ROOM)[0]!;

    const opened = new GameEngine().processAction(
      next,
      { type: 'DEV_TOGGLE_DOOR', payload: { corridorId: door.id } },
      { actorId: 'player-1', allowDevActions: true },
    );

    expect(opened.ship.rooms[TARGET_ROOM]!.hasDecompressionToken).toBe(false);
    expect(lastEvent(opened, 'DECOMPRESSION_CANCELLED')).toMatchObject({
      targetRoomId: TARGET_ROOM,
      corridorId: door.id,
    });
  });

  it('в конце Фазы Игроков при закрытых Дверях гибнут все в Комнате — Персонажи и Чужие', () => {
    const state = airlockTable('decompression-resolve');
    putPlayer(state, 'player-2', TARGET_ROOM);
    const intruderId = putIntruder(state, 'ADULT', TARGET_ROOM);
    const armed = useConsole(state, 'player-1', { targetRoomId: TARGET_ROOM });

    const afterPhase = pass(pass(armed, 'player-1'), 'player-2');

    expect(afterPhase.players['player-2']!.isDead).toBe(true);
    expect(afterPhase.intrudersPool.boardTokens.some((token) => token.id === intruderId)).toBe(false);
    expect(lastEvent(afterPhase, 'DECOMPRESSION_RESOLVED')).toMatchObject({
      targetRoomId: TARGET_ROOM,
      startedBy: 'player-1',
      killedPlayerIds: ['player-2'],
      killedIntruderIds: [intruderId],
    });
    expect(lastEvent(afterPhase, 'INTRUDER_KILLED')).toMatchObject({ playerId: 'player-1', targetType: 'ADULT' });
  });

  it('без жетона разрешение ничего не делает', () => {
    const state = airlockTable('decompression-idle');
    const before = state.gameLog.length;
    resolveDecompressions(state);
    expect(state.gameLog).toHaveLength(before);
  });
});
