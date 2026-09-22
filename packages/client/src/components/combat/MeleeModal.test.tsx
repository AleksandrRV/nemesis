import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';

/**
 * Node-среда рендерит компоненты в статичную разметку; zustand v4 на сервере
 * отдаёт getInitialState, поэтому стор подменяется hook-функцией с holder'ом.
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
import { MeleeModal } from './MeleeModal';

function setup(options: { selectedCardIds?: string[]; rejection?: string | null }) {
  const raw = createInitialGameState('melee-modal');
  const player = raw.players['player-1']!;
  raw.intrudersPool.boardTokens.push({ id: 'adult-1', type: 'ADULT', roomId: player.roomId, woundsCount: 2 });
  raw.intrudersPool.boardTokens.push({ id: 'larva-1', type: 'LARVA', roomId: player.roomId, woundsCount: 0 });
  raw.ship.rooms[player.roomId]!.occupantIntruderIds.push('adult-1', 'larva-1');
  const view = filterStateForPlayer(raw, 'player-1');

  const dispatch = vi.fn();
  const setOpen = vi.fn();
  (useGameStore as unknown as { __set: (state: Record<string, unknown>) => void }).__set({
    view,
    meleeModalOpen: true,
    setMeleeModalOpen: setOpen,
    selectedCardIds: options.selectedCardIds ?? [],
    convertedCardIds: [],
    consumePaymentCards: (count: number) => (options.selectedCardIds ?? []).slice(0, count),
    dispatch,
    rejection: options.rejection ?? null,
  });

  return { dispatch, setOpen };
}

function render(): string {
  return renderToStaticMarkup(<MeleeModal />);
}

describe('MeleeModal: панель рукопашной атаки', () => {
  it('показывает цели отсека и предупреждение о Заражении', () => {
    setup({ selectedCardIds: ['x'] });
    const html = render();

    expect(html).toContain('РУКОПАШНАЯ АТАКА');
    expect(html).toContain('Взрослая особь');
    expect(html).toContain('Личинка');
    expect(html).toContain('Ран: 2');
    expect(html).toContain('карта Заражения');
  });

  it('без выделенной карты цены атака неактивна, с картой — активна', () => {
    setup({});
    const closed = render();
    expect(closed).toContain('disabled');

    setup({ selectedCardIds: ['card-1'] });
    const ready = render();
    expect(ready).toContain('Карта цены выделена');
    expect(ready).toContain('Атаковать!');
  });

  it('показывает причину отказа движка', () => {
    setup({ selectedCardIds: ['card-1'], rejection: 'Отступление Чужого требует карту События' });
    const html = render();

    expect(html).toContain('role="alert"');
    expect(html).toContain('карту События');
  });
});
