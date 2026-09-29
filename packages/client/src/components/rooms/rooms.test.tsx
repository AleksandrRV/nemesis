import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  EXCHANGE_OPTION,
  ROOM_OPTION,
  createInitialGameState,
  filterStateForPlayer,
  type GameState,
  type PendingDecision,
  type SanitizedGameState,
} from '@nemesis/shared';
import { formatGameLogEntry } from '../log/gameLogModel';
import { ExchangeConsentDialog } from './ExchangeModal';
import { RoomConsoleModal } from './RoomConsoleModal';
import { ShipIntelSceneView } from './ShipIntelCinematic';
import { buildTransfers, exchangeBlocker, exchangePartners, giveableEntries } from './exchangeModel';
import { buildRoomAbilityPayload, getRoomConsole, type RoomConsoleVariant } from './roomConsoleModel';
import { collectShipIntelScenes } from './shipIntelScenes';

const noop = () => undefined;

function table(definitionId: string, seed = 'rooms-ui'): GameState {
  const state = createInitialGameState(seed, { playerCount: 2 });
  const room = Object.values(state.ship.rooms).find((entry) => entry.category === 'ROOM_1')!;
  room.definitionId = definitionId;
  room.isExplored = true;
  room.hasMalfunction = false;
  for (const player of Object.values(state.players)) {
    for (const entry of Object.values(state.ship.rooms)) {
      entry.occupantPlayerIds = entry.occupantPlayerIds.filter((id) => id !== player.id);
    }
    player.roomId = room.id;
    room.occupantPlayerIds.push(player.id);
  }
  return state;
}

function viewOf(state: GameState): SanitizedGameState {
  return filterStateForPlayer(state, 'player-1');
}

function variantById(view: SanitizedGameState, id: string): RoomConsoleVariant {
  return getRoomConsole(view)!.variants.find((entry) => entry.id === id)!;
}

describe('Консоль отсека: модель', () => {
  it('Мостик: Проверка Координат и Установка Курса с выбором маркера', () => {
    const view = viewOf(table('COCKPIT'));
    const course = variantById(view, 'SET_COURSE');
    expect(course.steps.map((step) => step.kind)).toEqual(['COURSE_MARKER']);
    expect(buildRoomAbilityPayload(course, [['C']])).toEqual({
      option: ROOM_OPTION.SET_COURSE,
      targetCourseMarker: 'C',
    });
    expect(variantById(view, 'CHECK_COORDINATES').payload).toEqual({ option: ROOM_OPTION.CHECK_COORDINATES });
  });

  it('Центр Управления: Комната и Двери для закрытия уходят в payload', () => {
    const view = viewOf(table('COMMAND_CENTER'));
    const doors = variantById(view, 'DOORS');
    expect(buildRoomAbilityPayload(doors, [['11'], ['1-11']])).toEqual({
      targetRoomId: 11,
      closedCorridorIds: ['1-11'],
    });
  });

  it('Столовая без Травм: лечение недоступно с причиной, скан без карт Заражения — тоже', () => {
    const view = viewOf(table('CANTEEN'));
    expect(variantById(view, 'CANTEEN')).toMatchObject({ available: false, reason: 'Лёгких Травм нет' });
    expect(variantById(view, 'CANTEEN_SCAN')).toMatchObject({ available: false, reason: 'На руке нет карт Заражения' });
  });

  it('Неисправность блокирует все варианты с понятной причиной', () => {
    const state = table('ENGINE_CONTROL');
    state.ship.rooms[state.players['player-1']!.roomId]!.hasMalfunction = true;
    const variants = getRoomConsole(viewOf(state))!.variants;
    expect(variants.every((entry) => !entry.available && entry.reason?.includes('Неисправность'))).toBe(true);
  });

  it('Комнаты со своими панелями и пассивные Комнаты консоли не имеют', () => {
    expect(getRoomConsole(viewOf(table('LABORATORY')))).toBeNull();
    expect(getRoomConsole(viewOf(table('CABINS')))).toBeNull();
  });

  it('окно консоли показывает плашку Комнаты и варианты', () => {
    const view = viewOf(table('AIRLOCK_CONTROL'));
    const html = renderToStaticMarkup(
      <RoomConsoleModal
        view={view}
        roomConsole={getRoomConsole(view)!}
        preferredPaymentIds={[]}
        onConfirm={noop}
        onClose={noop}
      />,
    );
    expect(html).toContain('Контроль шлюзов');
    expect(html).toContain('Запустить Экстренную Декомпрессию');
  });
});

describe('Сцены тайных проверок', () => {
  it('результат видит только проверивший; Декомпрессию — все', () => {
    const state = table('ENGINE_CONTROL');
    state.gameLog.push(
      {
        id: 'e1',
        sequence: 900,
        event: {
          type: 'ENGINES_INSPECTED',
          playerId: 'player-2',
          roomId: 3,
          source: 'ENGINE_CONTROL',
          engines: [
            { engineNumber: 1, isWorking: true },
            { engineNumber: 2, isWorking: false },
            { engineNumber: 3, isWorking: true },
          ],
        },
      },
      {
        id: 'e2',
        sequence: 901,
        event: { type: 'DECOMPRESSION_STARTED', playerId: 'player-2', roomId: 3, targetRoomId: 5, fireRemoved: false },
      },
    );
    const forViewer = collectShipIntelScenes(viewOf(state).gameLog, 899, 'player-1');
    expect(forViewer.map((scene) => scene.kind)).toEqual(['DECOMPRESSION_STARTED']);
    const forInspector = collectShipIntelScenes(filterStateForPlayer(state, 'player-2').gameLog, 899, 'player-2');
    expect(forInspector.map((scene) => scene.kind)).toEqual(['ENGINES', 'DECOMPRESSION_STARTED']);
  });

  it('сцена Двигателей показывает состояние и напоминание о тайне', () => {
    const html = renderToStaticMarkup(
      <ShipIntelSceneView
        scene={{ kind: 'ENGINES', key: 'k', source: 'ENGINE_ROOM', engines: [{ engineNumber: 2, isWorking: false }] }}
        view={viewOf(table('ENGINE_CONTROL'))}
        onDone={noop}
      />,
    );
    expect(html).toContain('Двигатель 2: Неисправен');
    expect(html).toContain('Видно только вам');
  });

  it('журнал: проверку другого игрока видно без результата', () => {
    const state = table('ENGINE_CONTROL');
    state.gameLog.push({
      id: 'e3',
      sequence: 902,
      event: {
        type: 'ENGINES_INSPECTED',
        playerId: 'player-2',
        roomId: 3,
        source: 'ENGINE_ROOM',
        engines: [{ engineNumber: 3, isWorking: true }],
      },
    });
    const view = viewOf(state);
    const text = formatGameLogEntry(view.gameLog.at(-1)!, view)
      .segments.map((segment) => segment.text)
      .join('');
    expect(text).toContain('тайно проверяет Двигатель №3');
    expect(text).not.toContain('Исправен');
  });
});

describe('Обмен: модель и согласие', () => {
  it('партнёры — живые в той же Комнате; передачи строятся в обе стороны', () => {
    const view = viewOf(table('STORAGE'));
    expect(exchangePartners(view, 'player-1').map((player) => player.id)).toEqual(['player-2']);
    expect(buildTransfers('player-1', 'player-2', ['a'], ['b'])).toEqual([
      { fromPlayerId: 'player-1', toPlayerId: 'player-2', entryId: 'a' },
      { fromPlayerId: 'player-2', toPlayerId: 'player-1', entryId: 'b' },
    ]);
  });

  it('пустой Обмен и нехватка слотов Рук блокируются подсказкой', () => {
    const view = viewOf(table('STORAGE'));
    const self = view.players['player-1']!;
    const partner = view.players['player-2']!;
    expect(exchangeBlocker(self, partner, [], [])).toBe('Отметьте, что отдаёте или о чём просите');
    const heavy = giveableEntries(self).filter((entry) => entry.isHeavy);
    const fullPartner = { ...partner, handSlots: [...partner.handSlots, ...partner.handSlots, ...partner.handSlots] };
    expect(heavy.length).toBeGreaterThan(0);
    expect(exchangeBlocker(self, fullPartner, heavy, [])).toContain('не хватит свободных слотов Рук');
  });

  it('диалог согласия показывает, что получает и что отдаёт партнёр', () => {
    const view = viewOf(table('STORAGE'));
    const decision: Extract<PendingDecision, { type: 'EXCHANGE_CONSENT' }> = {
      id: 'd1',
      playerId: 'player-1',
      type: 'EXCHANGE_CONSENT',
      exchange: {
        exchangeId: 'x1',
        initiatorId: 'player-2',
        roomId: 2,
        lines: [
          {
            fromPlayerId: 'player-2',
            toPlayerId: 'player-1',
            entryId: 'i1',
            kind: 'ITEM',
            name: 'Аптечка',
            color: 'GREEN',
            isHeavy: false,
            ammo: 0,
          },
        ],
        acceptedPlayerIds: [],
        declinedPlayerIds: [],
        awaitingPlayerIds: ['player-1'],
      },
    };
    const html = renderToStaticMarkup(<ExchangeConsentDialog decision={decision} view={view} onAnswer={noop} />);
    expect(html).toContain('предлагает Обмен');
    expect(html).toContain('Аптечка');
    expect(EXCHANGE_OPTION.ACCEPT).toBe('ACCEPT');
  });
});
