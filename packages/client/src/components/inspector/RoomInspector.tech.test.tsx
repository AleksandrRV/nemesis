import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';

/**
 * Шаг 3 этапа 0.5.0: клик по узлу вентиляции открывает панель Технических
 * Коридоров вместо инспектора отсека.
 */
vi.mock('../../store/gameStore', () => {
  const holder: { state: Record<string, unknown> } = { state: {} };
  const useGameStore = (selector: (state: Record<string, unknown>) => unknown) => selector(holder.state);
  (useGameStore as unknown as { __set: (state: Record<string, unknown>) => void }).__set = (
    state: Record<string, unknown>,
  ) => {
    holder.state = state;
  };
  return { useGameStore };
});

import { useGameStore } from '../../store/gameStore';
import { RoomInspector } from './RoomInspector';

describe('RoomInspector: локация Технических Коридоров', () => {
  it('открытая техническая зона показывает панель вентиляции вместо отсека', () => {
    const view = filterStateForPlayer(createInitialGameState('inspector-tech'), 'player-1');
    (useGameStore as unknown as { __set: (state: Record<string, unknown>) => void }).__set({
      view,
      selectedRoomId: 11,
      technicalCorridorsOpen: true,
      closeTechnicalCorridors: () => undefined,
      selectRoom: () => undefined,
      dispatch: () => undefined,
      rejection: null,
      consumePaymentCards: () => [],
      selectedCardIds: [],
      convertedCardIds: [],
      setShootModalOpen: () => undefined,
      setMeleeModalOpen: () => undefined,
    });

    const html = renderToStaticMarkup(<RoomInspector />);

    expect(html).toContain('ТЕХНИЧЕСКИЕ КОРИДОРЫ');
    expect(html).not.toContain('ОТСЕК #011');
  });
});
