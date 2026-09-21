import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import type { GameLogEvent, SanitizedGameState } from '@nemesis/shared';
import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';

import { MeleeModal } from './MeleeModal';
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

function combatView(seed: string): SanitizedGameState {
  const state = createInitialGameState(seed, { playerCount: 1 });
  const player = state.players['player-1']!;

  state.intrudersPool.boardTokens.push({
    id: 'test-creeper-1',
    type: 'CREEPER',
    roomId: player.roomId,
    woundsCount: 1,
    token: { id: 'test-creeper-1', type: 'CREEPER', escapeNumber: 2 },
  });
  state.ship.rooms[player.roomId]!.occupantIntruderIds.push('test-creeper-1');

  return filterStateForPlayer(state, 'player-1');
}

function meleeEvent(overrides: Partial<Extract<GameLogEvent, { type: 'MELEE_ATTACKED' }>> = {}): GameLogEvent {
  return {
    type: 'MELEE_ATTACKED',
    playerId: 'player-1',
    roomId: 1,
    intruderId: 'test-creeper-1',
    intruderType: 'CREEPER',
    dieFace: 'TAIL',
    woundsDealt: 1,
    contaminationDealt: 1,
    seriousWoundDealt: 0,
    ...overrides,
  };
}

describe('MeleeModal: выбор цели', () => {
  it('показывает бейджи цены, цели и кнопку атаки', () => {
    storeState.view = combatView('melee-modal-select');
    storeState.selectedCardIds = ['pay-1'];
    const roomId = storeState.view.players['player-1']!.roomId;

    const html = renderToStaticMarkup(<MeleeModal roomId={roomId} onClose={() => undefined} />);

    expect(html).toContain('РУКОПАШНАЯ АТАКА');
    expect(html).toContain('+1 Заражение');
    expect(html).toContain('Риск Тяжёлой Травмы при промахе');
    expect(html).toContain('Крипер');
    expect(html).toContain('Ран: 1');
    expect(html).toContain('Атаковать [цена: 1]');
    expect(html).not.toContain('Выберите 1 карту оплаты');
  });

  it('подсказывает выбрать карту оплаты', () => {
    storeState.view = combatView('melee-modal-payment');
    storeState.selectedCardIds = [];
    const roomId = storeState.view.players['player-1']!.roomId;

    const html = renderToStaticMarkup(<MeleeModal roomId={roomId} onClose={() => undefined} />);

    expect(html).toContain('Выберите 1 карту оплаты в руке');
  });
});

describe('CombatResultView: результат рукопашной', () => {
  it('показывает попадание с ценой только в Заражение', () => {
    const view = combatView('melee-result-hit');

    const html = renderToStaticMarkup(
      <CombatResultView
        view={view}
        events={[
          meleeEvent({ dieFace: 'TAIL', woundsDealt: 1, seriousWoundDealt: 0 }),
          {
            type: 'TOUGHNESS_CHECKED',
            playerId: 'player-1',
            roomId: 1,
            intruderId: 'test-creeper-1',
            intruderType: 'CREEPER',
            attackCards: [{ id: 'a-1', name: 'Царапина', toughness: 5, hasRetreat: false }],
            woundsTotal: 2,
            killed: false,
            retreated: false,
          },
        ]}
      />,
    );

    expect(html).toContain('Рукопашная атака');
    expect(html).toContain('Хвост');
    expect(html).toContain('+1 Заражение');
    expect(html).not.toContain('Тяжёлая Травма');
    expect(html).toContain('Чужой выживает.');
  });

  it('показывает промах с Травмой и гибель атакующего', () => {
    const view = combatView('melee-result-miss');

    const missHtml = renderToStaticMarkup(
      <CombatResultView view={view} events={[meleeEvent({ dieFace: 'MISS', woundsDealt: 0, seriousWoundDealt: 1 })]} />,
    );

    expect(missHtml).toContain('Промах');
    expect(missHtml).toContain('+1 Тяжёлая Травма');
    expect(missHtml).not.toContain('Проверка Стойкости');

    const deathHtml = renderToStaticMarkup(
      <CombatResultView
        view={view}
        events={[
          meleeEvent({ dieFace: 'MISS', woundsDealt: 0, seriousWoundDealt: 1 }),
          { type: 'PLAYER_DIED', playerId: 'player-1', roomId: 1, cause: 'INTRUDER_ATTACK' },
        ]}
      />,
    );

    expect(deathHtml).toContain('Персонаж погибает от полученной Травмы.');
  });
});
