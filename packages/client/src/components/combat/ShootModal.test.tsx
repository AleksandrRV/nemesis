import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialGameState, filterStateForPlayer, type ItemCard } from '@nemesis/shared';

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
import { ShootModal } from './ShootModal';

function makeWeapon(ammo: number): ItemCard {
  return {
    id: 'w-modal',
    name: 'Пистолет учёного',
    color: 'YELLOW',
    origin: 'STARTING',
    isHeavy: true,
    isSingleUse: false,
    componentSymbols: [],
    actionCost: 0,
    description: '',
    isWeapon: true,
    ammo,
    maxAmmo: 6,
  };
}

function setup(options: { ammo: number; selectedCardIds?: string[]; rejection?: string | null }) {
  const raw = createInitialGameState('shoot-modal');
  const player = raw.players['player-1']!;
  raw.intrudersPool.boardTokens.push({ id: 'adult-1', type: 'ADULT', roomId: player.roomId, woundsCount: 1 });
  raw.ship.rooms[player.roomId]!.occupantIntruderIds.push('adult-1');
  player.handSlots.push({ source: 'ITEM', card: makeWeapon(options.ammo) });
  const view = filterStateForPlayer(raw, 'player-1');

  const dispatch = vi.fn();
  const setOpen = vi.fn();
  (useGameStore as unknown as { __set: (state: Record<string, unknown>) => void }).__set({
    view,
    shootModalOpen: true,
    setShootModalOpen: setOpen,
    selectedCardIds: options.selectedCardIds ?? [],
    convertedCardIds: [],
    consumePaymentCards: (count: number) => (options.selectedCardIds ?? []).slice(0, count),
    dispatch,
    rejection: options.rejection ?? null,
  });

  return { view, dispatch, setOpen, handCardId: view.players['player-1']!.actionDeck.hand[0]!.id };
}

function render(): string {
  return renderToStaticMarkup(<ShootModal />);
}

describe('ShootModal: панель выстрела', () => {
  it('показывает оружие с боезапасом и цели отсека', () => {
    setup({ ammo: 3, selectedCardIds: ['x'] });
    const html = render();

    expect(html).toContain('ВЫСТРЕЛ');
    expect(html).toContain('Пистолет учёного');
    expect(html).toContain('Боезапас: 3/6');
    expect(html).toContain('Взрослая особь');
    expect(html).toContain('Ран: 1');
  });

  it('без выделенной карты цены кнопка огня неактивна, с картой — активна', () => {
    setup({ ammo: 3 });
    expect(render()).toContain('disabled');

    setup({ ammo: 3, selectedCardIds: ['card-1'] });
    const html = render();
    expect(html).toContain('Карта цены выделена');
    expect(html).toContain('Огонь!');
  });

  it('пустое оружие не стреляет', () => {
    setup({ ammo: 0, selectedCardIds: ['card-1'] });
    const html = render();

    expect(html).toContain('нет боезапаса');
    expect(html).toContain('disabled');
  });

  it('показывает причину отказа движка', () => {
    setup({ ammo: 3, selectedCardIds: ['card-1'], rejection: 'Отступление Чужого требует карту События' });
    const html = render();

    expect(html).toContain('role="alert"');
    expect(html).toContain('карту События');
  });
});
