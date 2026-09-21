import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import type { SanitizedGameState } from '@nemesis/shared';
import { createInitialGameState, filterStateForPlayer, findAdjacentOpenRoomIds } from '@nemesis/shared';

import { RoomInspector } from './RoomInspector';

const storeState: { view: SanitizedGameState | null; selectedRoomId: number | null } = {
  view: null,
  selectedRoomId: null,
};

vi.mock('../../store/gameStore', () => ({
  useGameStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      view: storeState.view,
      selectedRoomId: storeState.selectedRoomId,
      selectRoom: () => undefined,
      dispatch: () => undefined,
      rejection: null,
      consumePaymentCards: () => [],
    }),
}));

function showRoom(seed: string, withIntruders: boolean): void {
  const state = createInitialGameState(seed);

  if (withIntruders) {
    state.intrudersPool.boardTokens.push(
      {
        id: 'test-adult-1',
        type: 'ADULT',
        roomId: 11,
        woundsCount: 2,
        token: { id: 'test-adult-1', type: 'ADULT', escapeNumber: 4 },
      },
      {
        id: 'test-larva-1',
        type: 'LARVA',
        roomId: 11,
        woundsCount: 0,
        token: { id: 'test-larva-1', type: 'LARVA', escapeNumber: 1 },
      },
    );
    state.ship.rooms[11]!.occupantIntruderIds.push('test-adult-1', 'test-larva-1');
  }

  storeState.view = filterStateForPlayer(state, 'player-1');
  storeState.selectedRoomId = 11;
}

describe('RoomInspector: Чужие в отсеке', () => {
  it('показывает блок с типами и ранами каждой особи', () => {
    showRoom('room-inspector-intruders', true);

    const html = renderToStaticMarkup(<RoomInspector />);

    expect(html).toContain('Чужие в отсеке');
    expect(html).toContain('Взрослая Особь');
    expect(html).toContain('Личинка');
    expect(html).toContain('Ран:');
    expect(html.match(/rounded-\[2px\] bg-red-500/g)).toHaveLength(2);
  });

  it('без Чужих блок не показывает', () => {
    showRoom('room-inspector-calm', false);

    const html = renderToStaticMarkup(<RoomInspector />);

    expect(html).not.toContain('Чужие в отсеке');
  });
});

describe('RoomInspector: кнопка Стрельбы', () => {
  function showRoomWithPlayer(seed: string, withIntruders: boolean, playerRoomId: number): void {
    showRoom(seed, withIntruders);

    const view = storeState.view!;
    const playerId = view.meta.activePlayerId;
    const player = view.players[playerId]!;

    for (const room of Object.values(view.ship.rooms)) {
      room.occupantPlayerIds = room.occupantPlayerIds.filter((id) => id !== playerId);
    }

    view.ship.rooms[playerRoomId]!.occupantPlayerIds.push(playerId);
    player.roomId = playerRoomId;
  }

  it('показывает кнопку, когда игрок в бою', () => {
    showRoomWithPlayer('room-inspector-shoot', true, 11);

    const html = renderToStaticMarkup(<RoomInspector />);

    expect(html).toContain('Стрельба [цена: 1]');
  });

  it('прячет кнопку без Чужих и вне боя', () => {
    showRoomWithPlayer('room-inspector-nofight', false, 11);

    expect(renderToStaticMarkup(<RoomInspector />)).not.toContain('Стрельба [цена: 1]');

    showRoomWithPlayer('room-inspector-far', true, 1);

    expect(renderToStaticMarkup(<RoomInspector />)).not.toContain('Стрельба [цена: 1]');
  });
});

describe('RoomInspector: кнопка Рукопашной', () => {
  function showRoomWithPlayer(seed: string, withIntruders: boolean, playerRoomId: number): void {
    showRoom(seed, withIntruders);

    const view = storeState.view!;
    const playerId = view.meta.activePlayerId;
    const player = view.players[playerId]!;

    for (const room of Object.values(view.ship.rooms)) {
      room.occupantPlayerIds = room.occupantPlayerIds.filter((id) => id !== playerId);
    }

    view.ship.rooms[playerRoomId]!.occupantPlayerIds.push(playerId);
    player.roomId = playerRoomId;
  }

  it('показывает кнопку с бейджами цены, когда игрок в бою', () => {
    showRoomWithPlayer('room-inspector-melee', true, 11);

    const html = renderToStaticMarkup(<RoomInspector />);

    expect(html).toContain('Рукопашная атака [цена: 1]');
    expect(html).toContain('+1 Заражение');
    expect(html).toContain('Риск Тяжёлой Травмы');
  });

  it('прячет кнопку без Чужих и вне боя', () => {
    showRoomWithPlayer('room-inspector-melee-calm', false, 11);

    expect(renderToStaticMarkup(<RoomInspector />)).not.toContain('Рукопашная атака [цена: 1]');

    showRoomWithPlayer('room-inspector-melee-far', true, 1);

    expect(renderToStaticMarkup(<RoomInspector />)).not.toContain('Рукопашная атака [цена: 1]');
  });
});

describe('RoomInspector: подбор Тяжёлых Объектов', () => {
  it('показывает объект на полу и кнопку подбора, когда игрок в отсеке', () => {
    showRoom('room-inspector-pickup', false);

    const html = renderToStaticMarkup(<RoomInspector />);

    expect(html).toContain('Труп члена экипажа');
    expect(html).toContain('Поднять [цена: 1]');
  });

  it('прячет кнопку подбора, когда игрока нет в отсеке', () => {
    showRoom('room-inspector-pickup-far', false);

    const view = storeState.view!;
    const playerId = view.meta.activePlayerId;
    const player = view.players[playerId]!;

    for (const room of Object.values(view.ship.rooms)) {
      room.occupantPlayerIds = room.occupantPlayerIds.filter((id) => id !== playerId);
    }

    view.ship.rooms[1]!.occupantPlayerIds.push(playerId);
    player.roomId = 1;

    const html = renderToStaticMarkup(<RoomInspector />);

    expect(html).toContain('Труп члена экипажа');
    expect(html).not.toContain('Поднять [цена: 1]');
  });
});

describe('RoomInspector: предупреждение о Побеге', () => {
  function showEscapeTarget(seed: string, withIntruders: boolean): void {
    showRoom(seed, withIntruders);

    const view = storeState.view!;
    const playerId = view.meta.activePlayerId;
    const target = findAdjacentOpenRoomIds(view, view.players[playerId]!.roomId)[0]!;

    storeState.selectedRoomId = target;
  }

  it('показывает предупреждение, когда выход из отсека — Побег', () => {
    showEscapeTarget('room-inspector-escape', true);

    const html = renderToStaticMarkup(<RoomInspector />);

    expect(html).toContain('Движение [цена: 1]');
    expect(html).toContain('Побег: Чужие в отсеке атакуют в спину!');
  });

  it('без Чужих в отсеке предупреждения нет', () => {
    showEscapeTarget('room-inspector-escape-calm', false);

    const html = renderToStaticMarkup(<RoomInspector />);

    expect(html).toContain('Движение [цена: 1]');
    expect(html).not.toContain('атакуют в спину');
  });
});
