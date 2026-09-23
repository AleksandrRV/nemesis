import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlayerHandPanel } from './PlayerHandPanel';
import { DecisionModal } from '../modals/DecisionModal';
import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';

describe('PlayerHandPanel', () => {
  it('рендерит карты руки активного игрока', () => {
    const rawState = createInitialGameState('test-hand-ui');
    const sanitized = filterStateForPlayer(rawState, 'player-1');

    const html = renderToStaticMarkup(<PlayerHandPanel view={sanitized} />);

    expect(html).toContain('РУКА ИГРОКА');
    expect(html).toContain('Действий в этом ходу');
    expect(html).toContain('Пас');
  });
});

describe('DecisionModal', () => {
  it('рендерит модалку выбора колоды белой комнаты', () => {
    const decision = {
      id: 'dec-1',
      playerId: 'player-1',
      type: 'CHOOSE_WHITE_ROOM_DECK' as const,
      roomId: 1,
    };

    const html = renderToStaticMarkup(<DecisionModal decision={decision} />);

    expect(html).toContain('ВЫБОР КОЛОДЫ ДЛЯ ПОИСКА');
    expect(html).toContain('Военная');
    expect(html).toContain('Техническая');
    expect(html).toContain('Медицинская');
  });

  it('рендерит модалку выбора предмета из найденных', () => {
    const decision = {
      id: 'dec-2',
      playerId: 'player-1',
      type: 'CHOOSE_SEARCH_ITEM' as const,
      roomId: 1,
      sourceDeck: 'YELLOW' as const,
      cards: [
        {
          id: 'ITEM_1',
          name: 'Аптечка',
          description: 'Лечит раны',
          color: 'GREEN',
          origin: 'ROOM_DECK',
          isHeavy: false,
          isSingleUse: true,
          componentSymbols: ['CHEMICALS'],
          actionCost: 1,
          isWeapon: false,
          ammo: null,
          maxAmmo: null,
        },
        {
          id: 'ITEM_2',
          name: 'Инструменты',
          description: 'Чинит',
          color: 'YELLOW',
          origin: 'ROOM_DECK',
          isHeavy: false,
          isSingleUse: false,
          componentSymbols: ['TOOLS'],
          actionCost: 1,
          isWeapon: false,
          ammo: null,
          maxAmmo: null,
        },
      ],
    } as never;

    const html = renderToStaticMarkup(<DecisionModal decision={decision} />);

    expect(html).toContain('ВЫБОР НАЙДЕННОГО ПРЕДМЕТА');
    expect(html).toContain('Аптечка');
    expect(html).toContain('Инструменты');
    expect(html).toContain('Лечит раны');
  });

  it('рендерит модалку склада с отдельным типом CHOOSE_STORAGE_ITEM', () => {
    const decision = {
      id: 'dec-3',
      playerId: 'player-1',
      type: 'CHOOSE_STORAGE_ITEM' as const,
      roomId: 1,
      sourceDeck: 'RED' as const,
      cards: [
        {
          id: 'ITEM_RED_1',
          name: 'Граната',
          description: 'Взрыв',
          color: 'RED',
          origin: 'ROOM_DECK',
          isHeavy: false,
          isSingleUse: true,
          componentSymbols: ['CHEMICALS'],
          actionCost: 1,
          isWeapon: false,
          ammo: null,
          maxAmmo: null,
        },
        {
          id: 'ITEM_RED_2',
          name: 'Энергозаряд',
          description: 'Заряд',
          color: 'RED',
          origin: 'ROOM_DECK',
          isHeavy: false,
          isSingleUse: true,
          componentSymbols: ['POWER_CELL'],
          actionCost: 1,
          isWeapon: false,
          ammo: null,
          maxAmmo: null,
        },
      ],
    } as never;

    const html = renderToStaticMarkup(<DecisionModal decision={decision} />);

    expect(html).toContain('СКЛАД');
    expect(html).toContain('Граната');
  });

  it('рендерит модалку выбора энергооружия в Оружейной', () => {
    const decision = {
      id: 'dec-4',
      playerId: 'player-1',
      type: 'CHOOSE_ENERGY_WEAPON' as const,
      roomId: 1,
      weaponIds: ['energy-1', 'energy-2'],
    };

    const html = renderToStaticMarkup(<DecisionModal decision={decision} />);

    expect(html).toContain('ОРУЖЕЙНАЯ');
    expect(html).toContain('ВЫБЕРИТЕ ЭНЕРГООРУЖИЕ');
  });
});
