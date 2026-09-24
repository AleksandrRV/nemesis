import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';

import { GameLogPanel } from './GameLogPanel';

function freshView() {
  return filterStateForPlayer(createInitialGameState('game-log-panel'), 'player-1');
}

describe('GameLogPanel: бегущая строка и полноценное окно журнала', () => {
  it('по умолчанию — узкая бегущая строка, окно истории закрыто', () => {
    const markup = renderToStaticMarkup(createElement(GameLogPanel, { view: freshView() }));

    expect(markup).toContain('aria-label="Журнал действий партии"');
    expect(markup).toContain('h-9');
    expect(markup).toContain('bg-black');
    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-controls="game-log-dialog"');
    expect(markup).toContain('Партия начата');
    expect(markup).not.toContain('role="dialog"');
  });

  it('открытое окно: модальный диалог поверх всего с поиском, категориями и раундами', () => {
    const markup = renderToStaticMarkup(createElement(GameLogPanel, { view: freshView(), initiallyOpen: true }));

    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('z-[100]');
    expect(markup).toContain('aria-label="Поиск по журналу"');
    expect(markup).toContain('aria-label="Категории событий"');
    expect(markup).toContain('Подготовка');
    expect(markup).toContain('aria-label="Закрыть журнал действий"');
  });
});
