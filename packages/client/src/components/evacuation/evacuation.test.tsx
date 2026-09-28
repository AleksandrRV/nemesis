import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  HIBERNATION_OPENS_AT_TIME,
  createInitialGameState,
  filterStateForPlayer,
  type SanitizedGameState,
} from '@nemesis/shared';
import { boardingBlocker, cryoStatus, hibernationBlocker, podViews } from './evacuationModel';
import { EvacuationActions } from './EvacuationActions';
import { EscapePodConsole } from './EscapePodConsole';
import { EvacuationSceneView } from './EvacuationCinematic';
import { collectEvacuationScenes } from './evacuationScenes';
import { formatEvacuationLogEvent } from '../log/evacuationLogFormat';

function makeView(): SanitizedGameState {
  const view = filterStateForPlayer(createInitialGameState('evacuation-ui', { playerCount: 2 }), 'player-1');
  view.ship.escapePods = {
    'pod-1': { id: 'pod-1', number: 1, section: 'A', isLocked: false, isDestroyed: false, occupantIds: [] },
    'pod-2': { id: 'pod-2', number: 2, section: 'A', isLocked: true, isDestroyed: false, occupantIds: [] },
  };
  return view;
}

function roomOf(view: SanitizedGameState, definitionId: string): number {
  const room = view.ship.rooms[view.players['player-1']!.roomId]!;
  room.definitionId = definitionId;
  return room.id;
}

describe('Модель эвакуации', () => {
  it('Камеры закрыты до синих полей и открываются на них', () => {
    const view = makeView();
    expect(cryoStatus(view)).toMatchObject({ open: false, advancesUntilOpen: HIBERNATION_OPENS_AT_TIME });
    const roomId = roomOf(view, 'HIBERNATORIUM');
    expect(hibernationBlocker(view, roomId, true)).toContain('закрыты');
    view.meta.timeTrackPosition = HIBERNATION_OPENS_AT_TIME;
    expect(hibernationBlocker(view, roomId, false)).toContain('Отметьте 2 карты');
    expect(hibernationBlocker(view, roomId, true)).toBeNull();
  });

  it('Капсулы: статусы, места и причины блокировки посадки', () => {
    const view = makeView();
    const roomId = roomOf(view, 'ESCAPE_POD_A');
    const [open, locked] = podViews(view, 'A');
    expect(open).toMatchObject({ status: 'OPEN', seatsFree: 2 });
    expect(locked!.status).toBe('LOCKED');
    expect(boardingBlocker(view, roomId, locked!, true)).toBe('Капсула заблокирована');
    expect(boardingBlocker(view, roomId, open!, true)).toBeNull();
  });
});

describe('Интерфейс эвакуации', () => {
  it('панель Криогенного отсека: трек Времени с синими полями и подтверждение', () => {
    const view = makeView();
    const roomId = roomOf(view, 'HIBERNATORIUM');
    const html = renderToStaticMarkup(
      <EvacuationActions
        view={view}
        roomId={roomId}
        definitionId="HIBERNATORIUM"
        paymentReady
        onHibernate={() => undefined}
        onBoard={() => undefined}
        onTogglePod={() => undefined}
      />,
    );
    expect(html).toContain('Камеры Анабиоза');
    expect(html).toContain('bg-sky-500');
    expect(html).toContain('Войти в Камеру Анабиоза');
  });

  it('Спасательный отсек показывает Капсулы с местами и кнопками посадки', () => {
    const view = makeView();
    const roomId = roomOf(view, 'ESCAPE_POD_A');
    const html = renderToStaticMarkup(
      <EvacuationActions
        view={view}
        roomId={roomId}
        definitionId="ESCAPE_POD_A"
        paymentReady
        onHibernate={() => undefined}
        onBoard={() => undefined}
        onTogglePod={() => undefined}
      />,
    );
    expect(html).toContain('Капсула №1');
    expect(html).toContain('Сесть в Капсулу №1');
    expect(html).toContain('Заблокирована');
  });

  it('пульт Капсулы после посадки предлагает запуск или ожидание', () => {
    const view = makeView();
    view.pendingDecision = {
      id: 'd-1',
      playerId: 'player-1',
      type: 'ESCAPE_POD_LAUNCH_CHOICE',
      podId: 'pod-1',
    } as never;
    const html = renderToStaticMarkup(<EscapePodConsole view={view} />);
    expect(html).toContain('КАПСУЛА №1');
    expect(html).toContain('Запустить немедленно');
    expect(html).toContain('Ждать напарника');
  });

  it('сцены старта Капсулы и Анабиоза из журнала', () => {
    const view = makeView();
    const scenes = collectEvacuationScenes(
      [
        {
          id: 'a',
          sequence: 10,
          event: { type: 'ESCAPE_POD_LAUNCHED', podId: 'pod-1', podNumber: 1, occupantIds: ['player-1'] },
        },
        {
          id: 'b',
          sequence: 11,
          event: { type: 'HIBERNATION_ATTEMPTED', playerId: 'player-2', roomId: 11, success: false },
        },
        {
          id: 'c',
          sequence: 12,
          event: { type: 'HIBERNATION_ATTEMPTED', playerId: 'player-2', roomId: 11, success: true },
        },
      ],
      9,
    );
    expect(scenes.map((scene) => scene.kind)).toEqual(['LAUNCH', 'HIBERNATION']);
    const launch = renderToStaticMarkup(
      <EvacuationSceneView scene={scenes[0]!} view={view} onDone={() => undefined} />,
    );
    expect(launch).toContain('animate-pod-liftoff');
    expect(launch).toContain('СТАРТОВАЛА');
    const sleep = renderToStaticMarkup(<EvacuationSceneView scene={scenes[1]!} view={view} onDone={() => undefined} />);
    expect(sleep).toContain('АНАБИОЗ');
    expect(sleep).toContain('animate-cryo-frost');
  });

  it('журнал описывает посадку, старт и выброс из Капсулы', () => {
    const view = makeView();
    const text = (event: Parameters<typeof formatEvacuationLogEvent>[0]) =>
      formatEvacuationLogEvent(event, view)
        .map((segment) => segment.text)
        .join('');
    expect(
      text({ type: 'ESCAPE_POD_EXITED', playerId: 'player-1', podId: 'pod-1', podNumber: 1, reason: 'INTRUDER' }),
    ).toContain('ворвался Чужой');
    expect(text({ type: 'HIBERNATION_OPENED', round: 8, timeTrackPosition: 8 })).toContain('Камеры Анабиоза открыты');
    expect(
      text({
        type: 'ESCAPE_POD_TOGGLED',
        playerId: 'player-1',
        podId: 'pod-2',
        podNumber: 2,
        isLocked: false,
        source: 'HATCH_CONTROL',
      }),
    ).toContain('разблокирует');
  });
});
