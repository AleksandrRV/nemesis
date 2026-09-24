import { describe, expect, it } from 'vitest';
import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';
import { buildCrewByRoom, crewTokenLabel, layoutRoomTopStrip, paintOrder, toCrewToken } from './crewTokenModel';

function partyView() {
  return filterStateForPlayer(createInitialGameState('crew-tokens', { playerCount: 3 }), 'player-1');
}

describe('Фишки экипажа: данные', () => {
  it('фишка несёт роль, номер игрока и признак хода', () => {
    const view = partyView();
    const token = toCrewToken(view, view.meta.activePlayerId)!;
    const player = view.players[view.meta.activePlayerId]!;
    expect(token.characterClass).toBe(player.characterClass);
    expect(token.orderNumber).toBe(player.orderNumber);
    expect(token.isActive).toBe(true);
    expect(toCrewToken(view, 'nobody')).toBeNull();
  });

  it('экипаж группируется по отсекам по номеру; погибшие, спасшиеся и «в пути» скрыты', () => {
    const view = partyView();
    const ids = Object.keys(view.players);
    view.players[ids[1]!]!.isDead = true;

    const crew = [...buildCrewByRoom(view, new Set([ids[2]!])).values()].flat();
    expect(crew.map((token) => token.playerId)).toEqual([ids[0]]);

    const all = [...buildCrewByRoom(partyView()).values()].flat();
    const numbers = all.map((token) => token.orderNumber);
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
  });

  it('подпись называет номер игрока, роль и состояние', () => {
    expect(
      crewTokenLabel({
        characterClass: 'PILOT',
        orderNumber: 2,
        isActive: true,
        hasPassed: false,
        isInHibernation: false,
      }),
    ).toBe('Игрок 2 — Пилот (сейчас ходит)');
    expect(
      crewTokenLabel({
        characterClass: 'SCOUT',
        orderNumber: 4,
        isActive: false,
        hasPassed: true,
        isInHibernation: false,
      }),
    ).toBe('Игрок 4 — Скаут (спасовал)');
  });

  it('активная фишка рисуется последней — поверх соседей', () => {
    const view = partyView();
    const tokens = [...buildCrewByRoom(view).values()].flat();
    expect(paintOrder(tokens).at(-1)?.isActive).toBe(true);
  });
});

describe('Фишки экипажа: ряд в верхней части отсека', () => {
  it('пустой отсек — пустой ряд', () => {
    expect(layoutRoomTopStrip(0, 0)).toEqual({ crew: [], objects: [], scale: 1 });
  });

  it('одна фишка — по центру, две — симметрично', () => {
    expect(layoutRoomTopStrip(1, 0).crew).toEqual([{ dx: 0 }]);
    const pair = layoutRoomTopStrip(2, 0).crew;
    expect(pair[0]!.dx).toBe(-pair[1]!.dx);
  });

  it('экипаж и объекты в одном ряду без наложения; переполненный ряд сжимается', () => {
    const mixed = layoutRoomTopStrip(2, 1);
    expect(mixed.objects[0]!.dx).toBeGreaterThan(mixed.crew[1]!.dx);
    expect(mixed.scale).toBe(1);

    const crowded = layoutRoomTopStrip(5, 2);
    const span = crowded.objects.at(-1)!.dx - crowded.crew[0]!.dx;
    expect(span).toBeLessThanOrEqual(64);
    expect(crowded.scale).toBeGreaterThanOrEqual(0.7);
    expect(crowded.scale).toBeLessThan(1);
  });
});
