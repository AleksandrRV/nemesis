import { describe, expect, it } from 'vitest';
import { createInitialGameState, filterStateForPlayer, type SanitizedGameState } from '@nemesis/shared';
import { BOARD_ANIMATION_TTL_MS, diffBoardSnapshots, inTransitIds } from './boardAnimationModel';

function snapshot(seed = 'anim-diff'): SanitizedGameState {
  return filterStateForPlayer(createInitialGameState(seed), 'player-1');
}

/** Дочерний срез: копия с применённым изменением. */
function mutate(view: SanitizedGameState, apply: (draft: SanitizedGameState) => void): SanitizedGameState {
  const draft = structuredClone(view);
  apply(draft);
  return draft;
}

describe('Дифф срезов карты: плавные перемещения вместо скачков (Шаг 9)', () => {
  it('первый срез анимаций не рождает — история при загрузке не играет', () => {
    expect(diffBoardSnapshots(null, snapshot())).toEqual([]);
  });

  it('Персонаж сменил отсек: анимация перехода игрока', () => {
    const before = snapshot();
    const after = mutate(before, (draft) => {
      draft.players['player-1']!.roomId = 12;
    });

    expect(diffBoardSnapshots(before, after)).toEqual([
      { kind: 'PLAYER_MOVE', key: expect.any(String), playerId: 'player-1', fromRoomId: 11, toRoomId: 12 },
    ]);
  });

  it('погибший Персонаж не анимируется', () => {
    const before = snapshot();
    const after = mutate(before, (draft) => {
      draft.players['player-1']!.roomId = 12;
      draft.players['player-1']!.isDead = true;
    });

    expect(diffBoardSnapshots(before, after)).toEqual([]);
  });

  it('миниатюра Чужого сменила отсек: анимация перехода', () => {
    const before = mutate(snapshot(), (draft) => {
      draft.intrudersPool.boardTokens.push({ id: 'adult-1', type: 'ADULT', roomId: 6, woundsCount: 0 });
    });
    const after = mutate(before, (draft) => {
      draft.intrudersPool.boardTokens[0]!.roomId = 7;
    });

    expect(diffBoardSnapshots(before, after)).toEqual([
      {
        kind: 'INTRUDER_MOVE',
        key: expect.any(String),
        intruderId: 'adult-1',
        intruderType: 'ADULT',
        fromRoomId: 6,
        toRoomId: 7,
      },
    ]);
  });

  it('уход в вентиляцию читается из новых записей журнала, миниатюры уже нет на поле', () => {
    const before = snapshot();
    const after = mutate(before, (draft) => {
      draft.gameLog.push({
        id: 'log-vent',
        sequence: draft.gameLog[draft.gameLog.length - 1]!.sequence + 1,
        event: {
          type: 'INTRUDER_MOVED',
          intruderId: 'adult-9',
          intruderType: 'ADULT',
          fromRoomId: 5,
          toRoomId: null,
          corridorId: null,
          corridorNumber: 4,
          technicalCorridors: true,
        },
      });
    });

    expect(diffBoardSnapshots(before, after)).toEqual([
      {
        kind: 'INTRUDER_TO_TECH',
        key: expect.any(String),
        intruderId: 'adult-9',
        intruderType: 'ADULT',
        fromRoomId: 5,
      },
    ]);
  });

  it('совместный взлом Закрытой Двери даёт эффект разрушения переборки', () => {
    const before = snapshot();
    const after = mutate(before, (draft) => {
      draft.gameLog.push({
        id: 'log-door',
        sequence: draft.gameLog[draft.gameLog.length - 1]!.sequence + 1,
        event: {
          type: 'INTRUDERS_BLOCKED_BY_DOOR',
          intruderIds: ['adult-1', 'adult-2'],
          corridorId: '6-11',
          source: 'EVENT_PHASE',
        },
      });
    });

    expect(diffBoardSnapshots(before, after)).toEqual([
      { kind: 'DOOR_BREACHED', key: expect.any(String), corridorId: '6-11' },
    ]);
  });

  it('старые записи журнала повторно не анимируются', () => {
    const before = mutate(snapshot(), (draft) => {
      draft.gameLog.push({
        id: 'log-old',
        sequence: draft.gameLog[draft.gameLog.length - 1]!.sequence + 1,
        event: {
          type: 'INTRUDERS_BLOCKED_BY_DOOR',
          intruderIds: ['adult-1'],
          corridorId: '6-11',
          source: 'EVENT_PHASE',
        },
      });
    });
    // Срез без изменений — та же запись уже учтена в предыдущем срезе.
    expect(diffBoardSnapshots(before, structuredClone(before))).toEqual([]);
  });

  it('identификаторы в пути собираются для скрытия статических фишек', () => {
    const { playerIds, intruderIds } = inTransitIds([
      { kind: 'PLAYER_MOVE', key: '1', playerId: 'player-1', fromRoomId: 11, toRoomId: 12 },
      { kind: 'INTRUDER_MOVE', key: '2', intruderId: 'adult-1', intruderType: 'ADULT', fromRoomId: 6, toRoomId: 7 },
      { kind: 'DOOR_BREACHED', key: '3', corridorId: '6-11' },
    ]);

    expect([...playerIds]).toEqual(['player-1']);
    expect([...intruderIds]).toEqual(['adult-1']);
  });

  it('TTL анимации покрывает полный проход по Коридору', () => {
    expect(BOARD_ANIMATION_TTL_MS).toBeGreaterThanOrEqual(1000);
  });
});
