import { describe, expect, it } from 'vitest';

import type { GameState, SanitizedGameState } from '@nemesis/shared';
import { GAME_STATE_SCHEMA_VERSION, createInitialGameState, filterStateForPlayer } from '@nemesis/shared';

import { DOOR_CYCLE_HINT, DOOR_LABELS, DOOR_TERMINAL_HINT, buildCorridorRows, buildDiagnostics } from './devPanelModel';

const VIEWER = 'player-1';

/** Состояние глазами первого персонажа: свежая партия на двух игроках. */
function freshView(): SanitizedGameState {
  return filterStateForPlayer(createInitialGameState('dev-panel-test', { playerCount: 2 }), VIEWER);
}

function rawState(): GameState {
  return createInitialGameState('dev-panel-test', { playerCount: 2 });
}

describe('Dev-панель: строки коридоров', () => {
  it('перечисляет все коридоры корабля в порядке номеров отсеков', () => {
    const rows = buildCorridorRows(freshView());

    expect(rows).toHaveLength(29);
    expect(rows[0]?.fromRoomId).toBe(1);

    for (let index = 1; index < rows.length; index++) {
      const previous = rows[index - 1]!;
      const current = rows[index]!;

      expect(previous.fromRoomId).toBeLessThanOrEqual(current.fromRoomId);
      expect(previous.id).not.toBe(current.id);
    }
  });

  it('показывает текущее состояние Двери и следующее — тем же переходом, что и движок', () => {
    const state = rawState();
    const firstCorridor = Object.values(state.ship.corridors)[0]!;

    firstCorridor.doorState = 'CLOSED';

    const row = buildCorridorRows(filterStateForPlayer(state, VIEWER)).find(
      (candidate) => candidate.id === firstCorridor.id,
    );

    expect(row?.doorState).toBe('CLOSED');
    expect(row?.doorLabel).toBe('закрыта');
    expect(row?.nextDoorLabel).toBe('разрушена');
  });

  it('не обещает переключение Разрушенной Двери: состояние терминально (стр. 17)', () => {
    const state = rawState();
    const corridor = Object.values(state.ship.corridors)[0]!;

    corridor.doorState = 'DESTROYED';

    const row = buildCorridorRows(filterStateForPlayer(state, VIEWER)).find(
      (candidate) => candidate.id === corridor.id,
    );

    expect(row?.doorLabel).toBe('разрушена');
    expect(row?.nextDoorLabel).toBe(DOOR_TERMINAL_HINT);
  });

  it('отдаёт маркер шума и легенду цикла Двери', () => {
    const state = rawState();
    const corridor = Object.values(state.ship.corridors)[0]!;

    corridor.hasNoise = true;

    const rows = buildCorridorRows(filterStateForPlayer(state, VIEWER));

    expect(rows.filter((row) => row.hasNoise)).toHaveLength(1);
    expect(DOOR_CYCLE_HINT).toBe(
      `${DOOR_LABELS.OPEN} → ${DOOR_LABELS.CLOSED} → ${DOOR_LABELS.DESTROYED} (${DOOR_TERMINAL_HINT})`,
    );
  });
});

describe('Dev-панель: диагностика', () => {
  it('описывает свежую партию: сид, режим, неисследованные отсеки и скрытые данные', () => {
    const view = freshView();
    const diagnostics = buildDiagnostics(view);
    const unexplored = Object.values(view.ship.rooms).filter((room) => !room.isExplored).length;

    expect(diagnostics.seed).toBe('dev-panel-test');
    expect(diagnostics.gameId).toContain('dev-panel-test');
    // Версия берётся из контракта, а не из числа в тесте: иначе каждый подъём
    // версии схемы (см. 0.1.10 → v2) ломает тест панели, а не проверяет её.
    expect(diagnostics.schemaVersion).toBe(GAME_STATE_SCHEMA_VERSION);
    expect(diagnostics.gameMode).toBe('SEMI_COOP');
    expect(diagnostics.round).toBe(1);
    expect(diagnostics.phase).toBe('PLAYER_PHASE');
    expect(diagnostics.activePlayerId).toBe(VIEWER);
    expect(diagnostics.rooms).toBe(21);
    expect(diagnostics.unexploredRooms).toBe(unexplored);
    expect(diagnostics.unexploredRooms).toBeGreaterThan(0);
    expect(diagnostics.unexploredRooms).toBeLessThan(diagnostics.rooms);
    expect(diagnostics.corridors).toBe(29);
    expect(diagnostics.noiseMarkers).toBe(0);
    expect(diagnostics.doors).toEqual({ open: 29, closed: 0, destroyed: 0 });
    expect(diagnostics.unknownEngines).toBe(3);
    expect(diagnostics.coordinatesHidden).toBe(true);
    // Второй персонаж — чужой: его инвентарь скрыт.
    expect(diagnostics.hiddenSecrets).toBe(1);
  });

  it('учитывает проверенные двигатели, открытые Координаты, шум и аварии дверей', () => {
    const state = rawState();
    const viewer = state.players[VIEWER]!;

    viewer.inspectedEngines = [1];
    viewer.inspectedCoordinates = true;

    const corridors = Object.values(state.ship.corridors);
    corridors[0]!.hasNoise = true;
    corridors[1]!.hasNoise = true;
    corridors[2]!.doorState = 'CLOSED';
    corridors[3]!.doorState = 'DESTROYED';

    const diagnostics = buildDiagnostics(filterStateForPlayer(state, VIEWER));

    expect(diagnostics.unknownEngines).toBe(2);
    expect(diagnostics.coordinatesHidden).toBe(false);
    expect(diagnostics.noiseMarkers).toBe(2);
    expect(diagnostics.doors).toEqual({ open: 27, closed: 1, destroyed: 1 });
  });
});
