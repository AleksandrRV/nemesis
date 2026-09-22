import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  createInitialGameState,
  filterStateForPlayer,
  findAdjacentOpenRoomIds,
  type SanitizedGameState,
} from '@nemesis/shared';

/**
 * Шаг 7: Побег в интерфейсе — разметка кнопки движения в Бою/вне Боя и диалог
 * подтверждения. Среда Node: компоненты рендерятся в статичную разметку,
 * стор подменяется hook-функцией (см. RoomInspector.intruders.test.tsx).
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
import { EscapeConfirmDialog } from './EscapeConfirmDialog';

function renderInspector(view: SanitizedGameState, roomId: number): string {
  (useGameStore as unknown as { __set: (state: Record<string, unknown>) => void }).__set({
    view,
    selectedRoomId: roomId,
    rejection: null,
    selectRoom: () => undefined,
    dispatch: () => undefined,
    consumePaymentCards: () => [],
    selectedCardIds: [],
    convertedCardIds: [],
  });
  return renderToStaticMarkup(<RoomInspector />);
}

describe('RoomInspector: Побег из Боя (Шаг 7)', () => {
  it('в Бою кнопка движения — красный «Побег [цена: 1]» (отсек персонажа, не просматриваемый)', () => {
    const raw = createInitialGameState('escape-ui-combat');
    const homeId = raw.players['player-1']!.roomId;
    raw.intrudersPool.boardTokens.push({ id: 'adult-esc', type: 'ADULT', roomId: homeId, woundsCount: 0 });
    raw.ship.rooms[homeId]!.occupantIntruderIds.push('adult-esc');
    const view = filterStateForPlayer(raw, 'player-1');
    const target = findAdjacentOpenRoomIds(view, homeId)[0]!;

    const html = renderInspector(view, target);

    expect(html).toContain('Побег [цена: 1]');
    expect(html).not.toContain('Движение [цена: 1]');
    expect(html).toContain('bg-red-600');
  });

  it('вне Боя — обычное «Движение [цена: 1]», без диалога побега', () => {
    const raw = createInitialGameState('escape-ui-quiet');
    const view = filterStateForPlayer(raw, 'player-1');
    const homeId = raw.players['player-1']!.roomId;
    const target = findAdjacentOpenRoomIds(view, homeId)[0]!;

    const html = renderInspector(view, target);

    expect(html).toContain('Движение [цена: 1]');
    expect(html).not.toContain('Побег [цена: 1]');
    expect(html).not.toContain('ВЫ В БОЮ');
  });
});

describe('EscapeConfirmDialog: подтверждение атаки в спину (стр. 19)', () => {
  function renderDialog(labels: string[]): string {
    return renderToStaticMarkup(
      <EscapeConfirmDialog intruderLabels={labels} onConfirm={() => undefined} onCancel={() => undefined} />,
    );
  }

  it('текст предупреждения и список атакующих от крупного к мелкому', () => {
    const html = renderDialog(['Королева', 'Взрослая особь']);

    expect(html).toContain('В отсеке находятся Чужие!');
    expect(html).toContain('внеочередную атаку монстров в спину');
    expect(html).toContain('Королева, Взрослая особь — от крупного к мелкому (FAQ Rules 5)');
    expect(html).toContain('Бежать [цена: 1]');
    expect(html).toContain('Остаться');
  });

  it('одиночный Чужой — без пометки о порядке', () => {
    const html = renderDialog(['Взрослая особь']);

    expect(html).toContain('Атакуют: Взрослая особь.');
    expect(html).not.toContain('от крупного к мелкому');
  });
});
