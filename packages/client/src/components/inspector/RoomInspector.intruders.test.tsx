import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  createInitialGameState,
  filterStateForPlayer,
  type IntruderEntity,
  type SanitizedGameState,
} from '@nemesis/shared';

/**
 * Тесты Node-среды рендерят компоненты в статичную разметку. Zustand v4 на
 * серверном снимке отдаёт `getInitialState` (состояние на момент создания
 * модуля), поэтому настоящий стор приложения не годится: подменяем модуль
 * стора hook-функцией, читающей подготовленное состояние.
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

function viewWithIntruders(seed: string, intruders: IntruderEntity[]) {
  const raw = createInitialGameState(seed);
  const roomId = raw.players['player-1']!.roomId;
  const placed = intruders.map((entry) => (entry.roomId === 0 ? { ...entry, roomId } : entry));
  raw.intrudersPool.boardTokens.push(...placed);
  raw.ship.rooms[roomId]!.occupantIntruderIds.push(...placed.map((entry) => entry.id));
  raw.ship.rooms[roomId]!.itemsCount = 2;
  return { view: filterStateForPlayer(raw, 'player-1'), roomId };
}

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

describe('RoomInspector: Чужие в отсеке и статус Боя', () => {
  it('показывает блок «Чужие в отсеке» с типом, числом ран и честной шкалой', () => {
    const { view, roomId } = viewWithIntruders('inspector-intruders', [
      { id: 'adult-1', type: 'ADULT', roomId: 0, woundsCount: 2 },
    ]);
    const html = renderInspector(view, roomId);

    expect(html).toContain('Чужие в отсеке');
    expect(html).toContain('Взрослая особь');
    expect(html).toContain('Ран: 2');
    expect(html).toContain('Стойкость Чужого неизвестна');
  });

  it('в Бою: баннер и блокировка Поиска, Действия Комнаты и Осторожного движения', () => {
    const { view, roomId } = viewWithIntruders('inspector-combat', [
      { id: 'adult-1', type: 'ADULT', roomId: 0, woundsCount: 0 },
    ]);
    const html = renderInspector(view, roomId);

    expect(html).toContain('ВЫ В БОЮ');
    expect(html).toContain('Поиск, Осторожное движение и Действия Комнат запрещены');
    expect(html).toContain('Стрелять');
    expect(html).toContain('Рукопашная');
    expect(html).toContain('disabled');
  });

  it('без Чужих: баннера нет, кнопки действий активны', () => {
    const { view, roomId } = viewWithIntruders('inspector-quiet', []);
    view.ship.rooms[roomId]!.objects = []; // стартовый Труп Криогенного отсека не нужен
    const html = renderInspector(view, roomId);

    expect(html).not.toContain('ВЫ В БОЮ');
    expect(html).not.toContain('Чужие в отсеке');
    expect(html).not.toContain('Стрелять');
    expect(html).not.toContain('disabled');
  });

  it('Чужой в другом отсеке не блокирует действия и не попадает в блок', () => {
    const { view, roomId } = viewWithIntruders('inspector-other-room', [
      { id: 'adult-1', type: 'ADULT', roomId: 999, woundsCount: 1 },
    ]);
    const html = renderInspector(view, roomId);

    expect(html).not.toContain('ВЫ В БОЮ');
    expect(html).not.toContain('Чужие в отсеке');
  });
});

describe('RoomInspector: Останки, подбор и Лаборатория (Шаг 6)', () => {
  function viewWithObjects(seed: string, setup: (raw: ReturnType<typeof createInitialGameState>) => void) {
    const raw = createInitialGameState(seed);
    setup(raw);
    const roomId = raw.players['player-1']!.roomId;
    return { view: filterStateForPlayer(raw, 'player-1'), roomId };
  }

  function renderWithPayment(view: SanitizedGameState, roomId: number, selectedCardIds: string[]): string {
    (useGameStore as unknown as { __set: (state: Record<string, unknown>) => void }).__set({
      view,
      selectedRoomId: roomId,
      rejection: null,
      selectRoom: () => undefined,
      dispatch: () => undefined,
      consumePaymentCards: () => selectedCardIds.slice(0, 1),
      selectedCardIds,
      convertedCardIds: [],
    });
    return renderToStaticMarkup(<RoomInspector />);
  }

  it('Останки на полу: подпись и кнопка «Поднять», активная при выделенной карте', () => {
    const { view, roomId } = viewWithObjects('inspector-remains', (raw) => {
      raw.ship.rooms[raw.players['player-1']!.roomId]!.objects.push({
        id: 'remains-x',
        kind: 'INTRUDER_REMAINS',
        intruderType: 'ADULT',
      });
    });

    const withoutPayment = renderWithPayment(view, roomId, []);
    expect(withoutPayment).toContain('Останки Чужого');
    expect(withoutPayment).toContain('Поднять');
    expect(withoutPayment).toContain('disabled');

    const withPayment = renderWithPayment(view, roomId, ['card-1']);
    expect(withPayment).toContain('Поднять [1]');
  });

  it('Лаборатория: кнопка изучения передаёт тип объекта; изученная Слабость не предлагается', () => {
    const { view, roomId } = viewWithObjects('inspector-lab', (raw) => {
      const room = raw.ship.rooms[raw.players['player-1']!.roomId]!;
      room.definitionId = 'LABORATORY';
      room.isExplored = true;
      room.objects.push({ id: 'remains-lab', kind: 'INTRUDER_REMAINS', intruderType: 'CREEPER' });
      raw.intrudersPool.weaknessSlots = [
        {
          objectKind: 'INTRUDER_REMAINS',
          card: {
            id: 'w-1',
            name: 'Уязвимость к энергии',
            description: 'эффект',
            effect: 'ENERGY_WEAKNESS',
            isRevealed: false,
          },
        },
        {
          objectKind: 'EGG',
          card: {
            id: 'w-2',
            name: 'Реакция на опасность',
            description: 'эффект',
            effect: 'DANGER_REACTION',
            isRevealed: true,
          },
        },
      ];
      raw.intrudersPool.eggsOnBoard = 0;
    });

    const html = renderWithPayment(view, roomId, ['card-1']);

    expect(html).toContain('Изучить: Останки Чужого');
    expect(html).not.toContain('Изучить: Яйцо Чужих');
    expect(html).toContain('Слабости Чужих');
    // Рубашка REMAINS скрыта, изученная EGG открыта.
    expect(html).not.toContain('Уязвимость к энергии');
    expect(html).toContain('Реакция на опасность');
    expect(html).toContain('не изучено');
  });

  it('рубашка Слабости не раскрывает имя в разметке', () => {
    const { view, roomId } = viewWithObjects('inspector-fakedown', (raw) => {
      const room = raw.ship.rooms[raw.players['player-1']!.roomId]!;
      room.isExplored = true;
      raw.intrudersPool.weaknessSlots = [
        {
          objectKind: 'CORPSE',
          card: {
            id: 'w-secret',
            name: 'Секретная Слабость',
            description: 'текст',
            effect: 'FIRE_WEAKNESS',
            isRevealed: false,
          },
        },
      ];
    });

    const html = renderWithPayment(view, roomId, []);
    expect(html).toContain('Слабости Чужих');
    expect(html).not.toContain('Секретная Слабость');
    expect(html).toContain('не изучено');
  });
});
