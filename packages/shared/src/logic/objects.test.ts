import { describe, expect, it } from 'vitest';

import type { BoardObject, IntruderEntity, IntruderToken, IntruderType } from '../types/entities.js';
import type { GameLogEvent } from '../types/log.js';
import type { RoomId } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import { killIntruder } from './combat.js';
import type { EngineErrorCode } from './fsm.js';
import { EngineError, GameEngine } from './fsm.js';
import { performPickUpObject, validatePickUpConditions } from './objects.js';
import { createInitialGameState } from './setup.js';

function freshState(seed = 'pickup-test'): GameState {
  return createInitialGameState(seed, { playerCount: 1 });
}

function expectEngineError(run: () => unknown, code: EngineErrorCode): void {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(EngineError);
    expect((error as EngineError).code).toBe(code);
    return;
  }

  throw new Error(`Ожидалась ошибка движка с кодом ${code}, но действие прошло без ошибки.`);
}

function placeIntruder(state: GameState, type: IntruderType, roomId: RoomId): IntruderEntity {
  const n = state.intrudersPool.boardTokens.length + 1;
  const token: IntruderToken = { id: `token-test-${n}`, type, escapeNumber: 1 };
  const entity: IntruderEntity = { id: `intruder-test-${n}`, type, roomId, woundsCount: 0, token };

  state.intrudersPool.boardTokens.push(entity);
  state.ship.rooms[roomId]!.occupantIntruderIds.push(entity.id);

  return entity;
}

function logEvents(state: GameState): GameLogEvent[] {
  return state.gameLog.map((entry) => entry.event);
}

describe('validatePickUpConditions', () => {
  it('отклоняет подбор от неизвестного персонажа', () => {
    const state = freshState();

    expectEngineError(() => validatePickUpConditions(state, 'player-nope', 'obj-1'), 'UNKNOWN_PLAYER');
  });

  it('отклоняет подбор отсутствующего и чужого объекта', () => {
    const state = freshState();
    const player = state.players['player-1']!;

    expectEngineError(() => validatePickUpConditions(state, 'player-1', 'object-nope'), 'PICK_UP_OBJECT_NOT_HERE');

    const otherRoom = Number(Object.keys(state.ship.rooms).find((id) => Number(id) !== player.roomId)!);
    const egg: BoardObject = { id: 'egg-far', kind: 'EGG' };
    state.ship.rooms[otherRoom]!.objects.push(egg);

    expectEngineError(() => validatePickUpConditions(state, 'player-1', 'egg-far'), 'PICK_UP_OBJECT_NOT_HERE');
  });

  it('отклоняет подбор занятыми руками', () => {
    const state = freshState();
    const player = state.players['player-1']!;
    player.handSlots.push({ source: 'OBJECT', object: { id: 'egg-held', kind: 'EGG' } });
    const corpse = state.ship.rooms[player.roomId]!.objects[0]!;

    expectEngineError(() => validatePickUpConditions(state, 'player-1', corpse.id), 'PICK_UP_HANDS_FULL');
  });
});

describe('performPickUpObject', () => {
  it('поднимает Труп из стартовой комнаты в руки и пишет событие', () => {
    const state = freshState('pickup-corpse');
    const player = state.players['player-1']!;
    const room = state.ship.rooms[player.roomId]!;
    const corpse = room.objects[0]!;
    expect(corpse.kind).toBe('CORPSE');

    performPickUpObject(state, 'player-1', corpse.id);

    expect(room.objects).toHaveLength(0);
    expect(player.handSlots).toHaveLength(2);
    const held = player.handSlots[1]!;
    expect(held.source).toBe('OBJECT');
    if (held.source !== 'OBJECT') throw new Error('Ожидался Объект в руке.');
    expect(held.object.id).toBe(corpse.id);
    const picked = logEvents(state).find((event) => event.type === 'OBJECT_PICKED_UP');
    if (picked?.type !== 'OBJECT_PICKED_UP') throw new Error('Ожидалось событие OBJECT_PICKED_UP.');
    expect(picked.objectId).toBe(corpse.id);
    expect(picked.objectKind).toBe('CORPSE');
  });

  it('полный цикл: гибель Чужого → Останки на полу → подбор', () => {
    const state = freshState('pickup-remains');
    const player = state.players['player-1']!;
    const intruder = placeIntruder(state, 'ADULT', player.roomId);

    killIntruder(state, intruder, 'player-1');

    const room = state.ship.rooms[player.roomId]!;
    const remainsList = room.objects.filter((object) => object.kind === 'INTRUDER_REMAINS');
    expect(remainsList).toHaveLength(1);
    const remains = remainsList[0]!;

    performPickUpObject(state, 'player-1', remains.id);

    expect(room.objects.some((object) => object.kind === 'INTRUDER_REMAINS')).toBe(false);
    expect(player.handSlots.some((slot) => slot.source === 'OBJECT')).toBe(true);
  });
});

describe('ACTION_PICK_UP_OBJECT через GameEngine', () => {
  it('оплачивает 1 карту, подбирает и засчитывает действие раунда', () => {
    const engine = new GameEngine();
    const state = freshState('pickup-action-flow');
    const player = state.players['player-1']!;
    const objectId = state.ship.rooms[player.roomId]!.objects[0]!.id;
    const handBefore = player.actionDeck.hand.length;
    const payCardId = player.actionDeck.hand[0]!.id;

    const next = engine.processAction(state, {
      type: 'ACTION_PICK_UP_OBJECT',
      payload: { objectId, discardCardIds: [payCardId] },
    });

    expect(next.players['player-1']!.actionDeck.hand.length).toBe(handBefore - 1);
    expect(next.players['player-1']!.actionsPerformedThisRound).toBe(1);
    expect(logEvents(next).some((event) => event.type === 'OBJECT_PICKED_UP')).toBe(true);
  });

  it('проверяет условия до оплаты: неверный объект важнее пустой оплаты', () => {
    const engine = new GameEngine();
    const state = freshState('pickup-action-order');

    expectEngineError(
      () =>
        engine.processAction(state, {
          type: 'ACTION_PICK_UP_OBJECT',
          payload: { objectId: 'object-nope', discardCardIds: [] },
        }),
      'PICK_UP_OBJECT_NOT_HERE',
    );
  });

  it('без карты оплаты отклоняется ошибкой оплаты', () => {
    const engine = new GameEngine();
    const state = freshState('pickup-action-payment');
    const player = state.players['player-1']!;
    const objectId = state.ship.rooms[player.roomId]!.objects[0]!.id;

    expectEngineError(
      () =>
        engine.processAction(state, {
          type: 'ACTION_PICK_UP_OBJECT',
          payload: { objectId, discardCardIds: [] },
        }),
      'INSUFFICIENT_ACTION_CARDS',
    );
  });
});
