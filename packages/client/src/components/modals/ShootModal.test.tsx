import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import type { GameLogEvent, SanitizedGameState } from '@nemesis/shared';
import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';

import { ShootModal } from './ShootModal';
import { CombatResultView } from './CombatResultView';

const storeState: { view: SanitizedGameState | null; selectedCardIds: string[] } = {
  view: null,
  selectedCardIds: [],
};

vi.mock('../../store/gameStore', () => ({
  useGameStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      view: storeState.view,
      dispatch: () => undefined,
      rejection: null,
      consumePaymentCards: () => [],
      selectedCardIds: storeState.selectedCardIds,
    }),
}));

function combatView(seed: string, weaponAmmo: number | null = null): SanitizedGameState {
  const state = createInitialGameState(seed, { playerCount: 1 });
  const player = state.players['player-1']!;
  const slot = player.handSlots[0]!;

  if (slot.source !== 'ITEM') throw new Error('В сетапе ожидалось оружие в руке.');
  if (weaponAmmo !== null) slot.card.ammo = weaponAmmo;

  state.intrudersPool.boardTokens.push({
    id: 'test-adult-1',
    type: 'ADULT',
    roomId: player.roomId,
    woundsCount: 2,
    token: { id: 'test-adult-1', type: 'ADULT', escapeNumber: 4 },
  });
  state.ship.rooms[player.roomId]!.occupantIntruderIds.push('test-adult-1');

  return filterStateForPlayer(state, 'player-1');
}

function shotEvent(overrides: Partial<Extract<GameLogEvent, { type: 'SHOT_FIRED' }>> = {}): GameLogEvent {
  return {
    type: 'SHOT_FIRED',
    playerId: 'player-1',
    roomId: 1,
    intruderId: 'test-adult-1',
    intruderType: 'ADULT',
    weaponId: 'w-1',
    weaponName: 'Пистолет',
    dieFace: 'ONE_WOUND',
    woundsDealt: 1,
    ...overrides,
  };
}

function toughnessEvent(overrides: Partial<Extract<GameLogEvent, { type: 'TOUGHNESS_CHECKED' }>> = {}): GameLogEvent {
  return {
    type: 'TOUGHNESS_CHECKED',
    playerId: 'player-1',
    roomId: 1,
    intruderId: 'test-adult-1',
    intruderType: 'ADULT',
    attackCards: [{ id: 'a-1', name: 'Царапина', toughness: 5, hasRetreat: false }],
    woundsTotal: 3,
    killed: false,
    retreated: false,
    ...overrides,
  };
}

describe('ShootModal: выбор оружия и цели', () => {
  it('показывает оружие с боезапасом, цели с ранами и кнопку огня', () => {
    storeState.view = combatView('shoot-modal-select');
    storeState.selectedCardIds = ['pay-1'];
    const roomId = storeState.view.players['player-1']!.roomId;

    const html = renderToStaticMarkup(<ShootModal roomId={roomId} onClose={() => undefined} />);

    expect(html).toContain('СТРЕЛЬБА');
    expect(html).toContain('Боезапас:');
    expect(html).toContain('Взрослая Особь');
    expect(html).toContain('Ран: 2');
    expect(html).toContain('Огонь [цена: 1]');
    expect(html).not.toContain('Выберите 1 карту оплаты');
  });

  it('подсказывает выбрать карту оплаты и блокирует пустое оружие', () => {
    storeState.view = combatView('shoot-modal-noammo', 0);
    storeState.selectedCardIds = [];
    const roomId = storeState.view.players['player-1']!.roomId;

    const html = renderToStaticMarkup(<ShootModal roomId={roomId} onClose={() => undefined} />);

    expect(html).toContain('Выберите 1 карту оплаты в руке');
    expect(html).toContain('disabled');
  });

  it('честно показывает отсутствие оружия и целей', () => {
    const state = createInitialGameState('shoot-modal-empty', { playerCount: 1 });
    const player = state.players['player-1']!;
    player.handSlots = [];
    storeState.view = filterStateForPlayer(state, 'player-1');
    storeState.selectedCardIds = [];

    const html = renderToStaticMarkup(<ShootModal roomId={player.roomId} onClose={() => undefined} />);

    expect(html).toContain('Нет оружия в руках');
    expect(html).toContain('Целей в отсеке не осталось');
  });
});

describe('CombatResultView: результат выстрела', () => {
  it('показывает промах без проверки Стойкости', () => {
    const view = combatView('shoot-result-miss');

    const html = renderToStaticMarkup(
      <CombatResultView view={view} events={[shotEvent({ dieFace: 'MISS', woundsDealt: 0 })]} />,
    );

    expect(html).toContain('Промах');
    expect(html).not.toContain('Проверка Стойкости');
  });

  it('показывает попадание, карты Стойкости и выживание', () => {
    const view = combatView('shoot-result-survive');

    const html = renderToStaticMarkup(
      <CombatResultView
        view={view}
        events={[
          shotEvent({ dieFace: 'ONE_WOUND', woundsDealt: 1 }),
          toughnessEvent({ woundsTotal: 3, killed: false, retreated: false }),
        ]}
      />,
    );

    expect(html).toContain('1 Рана');
    expect(html).toContain('Ран нанесено: 1');
    expect(html).toContain('«Царапина» (5)');
    expect(html).toContain('Чужой выживает.');
  });

  it('показывает гибель, отступление и Личинку', () => {
    const view = combatView('shoot-result-outcomes');

    const killedHtml = renderToStaticMarkup(
      <CombatResultView
        view={view}
        events={[
          shotEvent({ dieFace: 'TWO_WOUNDS', woundsDealt: 2 }),
          toughnessEvent({ woundsTotal: 5, killed: true }),
          {
            type: 'INTRUDER_KILLED',
            playerId: 'player-1',
            roomId: 1,
            intruderId: 'test-adult-1',
            intruderType: 'ADULT',
          },
        ]}
      />,
    );
    expect(killedHtml).toContain('Чужой убит!');

    const retreatedHtml = renderToStaticMarkup(
      <CombatResultView
        view={view}
        events={[
          shotEvent({ woundsDealt: 1 }),
          toughnessEvent({
            attackCards: [{ id: 'a-9', name: 'Укус', toughness: 2, hasRetreat: true }],
            retreated: true,
          }),
          {
            type: 'INTRUDER_RETREATED',
            playerId: 'player-1',
            intruderId: 'test-adult-1',
            intruderType: 'ADULT',
            fromRoomId: 1,
            toRoomId: 2,
          },
        ]}
      />,
    );
    expect(retreatedHtml).toContain('↩');
    expect(retreatedHtml).toContain('Чужой отступает!');
    expect(retreatedHtml).toContain('Чужой отступает в');

    const fizzleHtml = renderToStaticMarkup(
      <CombatResultView view={view} events={[shotEvent({ woundsDealt: 1 }), toughnessEvent({ retreated: true })]} />,
    );
    expect(fizzleHtml).toContain('Отступать некуда');

    const larvaHtml = renderToStaticMarkup(
      <CombatResultView
        view={view}
        events={[
          shotEvent({ intruderType: 'LARVA', woundsDealt: 1 }),
          {
            type: 'INTRUDER_KILLED',
            playerId: 'player-1',
            roomId: 1,
            intruderId: 'test-larva-1',
            intruderType: 'LARVA',
          },
        ]}
      />,
    );
    expect(larvaHtml).toContain('Личинка погибает от любой Раны.');
  });
});
