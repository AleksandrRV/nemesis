import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialGameState, filterStateForPlayer, type SanitizedGameState } from '@nemesis/shared';

/**
 * Шаг 3 этапа 0.5.0: панель локации «Технические Коридоры» в инспекторе.
 * Среда Node: стор подменяется hook-функцией (см. RoomInspector.escape.test).
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
import { TechCorridorPanel } from './TechCorridorPanel';

function renderPanel(view: SanitizedGameState): string {
  (useGameStore as unknown as { __set: (state: Record<string, unknown>) => void }).__set({
    view,
    closeTechnicalCorridors: () => undefined,
  });
  return renderToStaticMarkup(<TechCorridorPanel />);
}

describe('Панель Технических Коридоров', () => {
  it('заголовок локации, правило стр. 16 и список входов вентиляции', () => {
    const view = filterStateForPlayer(createInitialGameState('tech-panel'), 'player-1');
    const html = renderPanel(view);

    expect(html).toContain('ТЕХНИЧЕСКИЕ КОРИДОРЫ');
    expect(html).toContain('ПОЛЕ ВЕНТИЛЯЦИИ');
    expect(html).toContain('Входы и само поле недоступны для Персонажей');
    expect(html).toContain('входы 1, 2');
    expect(html).toContain('aria-label="Закрыть панель Технических Коридоров"');
  });

  it('Шум в вентиляции и спокойное состояние показаны по-разному', () => {
    const quiet = filterStateForPlayer(createInitialGameState('tech-panel-quiet'), 'player-1');
    expect(renderPanel(quiet)).toContain('Шума нет: вентиляция спокойна');

    const noisy = filterStateForPlayer(createInitialGameState('tech-panel-noisy'), 'player-1');
    noisy.ship.technicalCorridorNoise = true;
    expect(renderPanel(noisy)).toContain('В вентиляции Шум');
  });

  it('исследованный отсек входа показывает имя, неисследованный — номер', () => {
    const raw = createInitialGameState('tech-panel-names');
    raw.ship.rooms[2]!.definitionId = 'ARMORY';
    raw.ship.rooms[2]!.isExplored = true;
    const view = filterStateForPlayer(raw, 'player-1');
    const html = renderPanel(view);

    expect(html).toContain('Оружейная');
    expect(html).toContain('Отсек #014');
    expect(html).toContain('не исследован');
  });

  it('карты доступа по книге правил отмечаются на руке Персонажа', () => {
    const raw = createInitialGameState('tech-panel-hand');
    const playerId = 'player-1';
    raw.players[playerId]!.actionDeck.hand.push({
      id: 'ACT_MEC_TECH_CORRIDORS',
      characterClass: 'MECHANIC',
      name: 'Технические коридоры',
      playCost: 1,
      description: '',
    });
    const view = filterStateForPlayer(raw, playerId);
    const html = renderPanel(view);

    expect(html).toContain('Механик, карта «Технические коридоры»');
    expect(html).toContain('Карта у вас на руке');
    expect(html).toContain('Предмет «Планы технических коридоров»');
    expect(html).toContain('Розыгрыш этих перемещений появится в следующих шагах разработки');
  });
});
