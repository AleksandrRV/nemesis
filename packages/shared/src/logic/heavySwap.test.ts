import { describe, expect, it } from 'vitest';
import { CRAFTED_ITEM_CARDS } from '../data/crafting.js';
import type { GameState } from '../types/state.js';
import { expectEngineError } from '../testing/contactFixtures.js';
import { GameEngine } from './fsm.js';
import { createInitialGameState } from './setup.js';

const FLAMETHROWER = CRAFTED_ITEM_CARDS.find((card) => card.recipeId === 'FLAMETHROWER')!;

function handsFullOfObjects(): { state: GameState; decisionId: string; roomId: number } {
  const engine = new GameEngine();
  const state = createInitialGameState('heavy-swap');
  const player = state.players['player-1']!;
  const room = state.ship.rooms[player.roomId]!;
  room.isExplored = true;
  room.definitionId = 'ARMORY';
  room.itemsCount = 1;
  player.handSlots = [
    { source: 'OBJECT', object: { id: 'corpse-1', kind: 'CORPSE', characterClass: null } },
    { source: 'OBJECT', object: { id: 'egg-1', kind: 'EGG' } },
  ];
  state.decks.items.RED.drawPile = [structuredClone(FLAMETHROWER)];
  const searched = engine.processAction(state, {
    type: 'ACTION_SEARCH',
    payload: { discardCardIds: [player.actionDeck.hand[0]!.id] },
  });
  const decision = searched.pendingDecision;
  if (decision?.type !== 'DISCARD_HEAVY_ITEM_FOR_NEW') throw new Error('Ожидалось решение о сбросе Тяжёлого');
  return { state: searched, decisionId: decision.id, roomId: room.id };
}

function resolve(state: GameState, decisionId: string, selectedOption: string): GameState {
  return new GameEngine().processAction(state, {
    type: 'ACTION_RESOLVE_DECISION',
    payload: { decisionId, selectedOption },
  });
}

describe('Руки заняты при новом Тяжёлом Предмете (стр. 22)', () => {
  it('сброшенный Объект ложится на пол Комнаты, новый Предмет занимает его слот', () => {
    const { state, decisionId, roomId } = handsFullOfObjects();
    const next = resolve(state, decisionId, 'corpse-1');
    expect(next.pendingDecision).toBeNull();
    expect(next.players['player-1']!.handSlots).toEqual([
      { source: 'ITEM', card: expect.objectContaining({ id: FLAMETHROWER.id }) },
      { source: 'OBJECT', object: { id: 'egg-1', kind: 'EGG' } },
    ]);
    expect(next.ship.rooms[roomId]!.objects).toContainEqual({ id: 'corpse-1', kind: 'CORPSE', characterClass: null });
    expect(next.ship.rooms[roomId]!.itemsCount).toBe(0);
  });

  it('от находки можно отказаться: руки не меняются, Предмет уходит в сброс', () => {
    const { state, decisionId } = handsFullOfObjects();
    const next = resolve(state, decisionId, FLAMETHROWER.id);
    expect(next.pendingDecision).toBeNull();
    expect(next.players['player-1']!.handSlots.map((slot) => slot.source)).toEqual(['OBJECT', 'OBJECT']);
    expect(next.decks.craftedItems.discard.map((card) => card.id)).toContain(FLAMETHROWER.id);
  });

  it('чужой ответ отклоняется явной ошибкой', () => {
    const { state, decisionId } = handsFullOfObjects();
    expectEngineError(() => resolve(state, decisionId, 'no-such-slot'), 'INVALID_DECISION_OPTION');
  });
});
