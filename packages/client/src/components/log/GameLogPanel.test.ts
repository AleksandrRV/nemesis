import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';

import { GameLogPanel } from './GameLogPanel';

describe('GameLogPanel: доступный нижний журнал', () => {
  it('рендерит чёрную панель и доступный переключатель видимости', () => {
    const view = filterStateForPlayer(createInitialGameState('game-log-panel'), 'player-1');
    const markup = renderToStaticMarkup(createElement(GameLogPanel, { view }));

    expect(markup).toContain('ЖУРНАЛ ДЕЙСТВИЙ');
    expect(markup).toContain('bg-black');
    expect(markup).toContain('aria-label="Журнал действий партии"');
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain('aria-controls="game-log-list"');
    expect(markup).toContain('Скрыть');
    expect(markup).toContain('Партия начата');
  });
});
