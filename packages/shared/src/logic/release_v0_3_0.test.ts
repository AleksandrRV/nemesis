import { describe, expect, it } from 'vitest';
import { GameEngine, EngineError } from './fsm.js';
import { createInitialGameState } from './setup.js';
import { filterStateForPlayer } from './sanitizer.js';
import type { GameState } from '../types/state.js';

describe('Комплексная валидация релиза v0.3.0', () => {
  it('сериализация и восстановление состояния (JSON round-trip) сохраняет руку, колоды, сброс и pendingDecision', () => {
    const state = createInitialGameState('release-v0.3.0-test');
    const player = state.players['player-1']!;

    // Эмулируем активное промежуточное решение выбора карты поиска
    state.pendingDecision = {
      id: 'search-decision-test',
      playerId: 'player-1',
      type: 'CHOOSE_SEARCH_ITEM',
      drawnCardIds: ['ITEM_1', 'ITEM_2'],
      sourceDeck: 'YELLOW',
      roomId: 2,
    };

    const serialized = JSON.stringify(state);
    const restored = JSON.parse(serialized) as GameState;

    expect(restored.meta.schemaVersion).toBe(state.meta.schemaVersion);
    expect(restored.players['player-1']!.actionDeck.hand.length).toBe(player.actionDeck.hand.length);
    expect(restored.players['player-1']!.actionDeck.drawPile.length).toBe(player.actionDeck.drawPile.length);
    expect(restored.players['player-1']!.actionDeck.discard.length).toBe(player.actionDeck.discard.length);
    expect(restored.pendingDecision).toEqual(state.pendingDecision);
  });

  it('санитизация скрывает pendingDecision от чужих игроков, не допуская утечки скрытой информации', () => {
    const state = createInitialGameState('release-v0.3.0-test');
    state.pendingDecision = {
      id: 'private-decision',
      playerId: 'player-1',
      type: 'CHOOSE_SEARCH_ITEM',
      drawnCardIds: ['HIDDEN_SECRET_ITEM_1', 'HIDDEN_SECRET_ITEM_2'],
      sourceDeck: 'RED',
      roomId: 5,
    };

    // Для владельца (player-1) решение доступно
    const viewOwner = filterStateForPlayer(state, 'player-1');
    expect(viewOwner.pendingDecision).not.toBeNull();
    if (viewOwner.pendingDecision?.type === 'CHOOSE_SEARCH_ITEM') {
      expect(viewOwner.pendingDecision.drawnCardIds).toEqual(['HIDDEN_SECRET_ITEM_1', 'HIDDEN_SECRET_ITEM_2']);
    }

    // Для другого игрока (player-2) решение цензурируется в null
    state.players['player-2'] = {
      ...state.players['player-1']!,
      id: 'player-2',
      name: 'Игрок 2',
    };
    const viewOther = filterStateForPlayer(state, 'player-2');
    expect(viewOther.pendingDecision).toBeNull();
  });

  it('атомарность: при ошибке движка состояние полностью откатывается к исходному', () => {
    const engine = new GameEngine();
    const state = createInitialGameState('release-v0.3.0-test');

    const snapshot = JSON.stringify(state);

    // Попытка применить нелегальное действие (например, оплатить несуществующей картой)
    expect(() => {
      engine.processAction(state, {
        type: 'ACTION_MOVE',
        payload: {
          targetRoomId: 999,
          discardCardIds: ['non-existent-card'],
        },
      });
    }).toThrow(EngineError);

    expect(JSON.stringify(state)).toBe(snapshot);
  });
});
