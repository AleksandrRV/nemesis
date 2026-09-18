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
      drawnCardIds: ['ITEM_1', 'ITEM_2'],
    };

    const html = renderToStaticMarkup(<DecisionModal decision={decision} />);

    expect(html).toContain('ВЫБОР НАЙДЕННОГО ПРЕДМЕТА');
    expect(html).toContain('ITEM_1');
    expect(html).toContain('ITEM_2');
  });
});
