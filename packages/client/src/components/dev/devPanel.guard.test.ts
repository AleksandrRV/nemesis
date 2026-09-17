import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';

/**
 * Замок на критерий «отладочных инструментов нет в игровом интерфейсе»
 * (план 0.1.9, Э1-4).
 *
 * Сборку в юнит-тестах не проверить, поэтому проверяются два независимых звена:
 * здесь — что панель молчит, когда сборка не dev, и рендерится, когда dev;
 * в CI — что строки «DEV-ПАНЕЛЬ» нет в собранных файлах
 * (`.github/workflows/ci.yml`, шаг «Продакшн-сборка»).
 *
 * Панель рендерится в строку (`react-dom/server`), без DOM-окружения: тестам
 * клиента нужен только контракт компонента. Стор подменяется, потому что
 * zustand в серверном рендере намеренно отдаёт начальный снимок (до подключения
 * транспорта), а проверяется здесь не партия, а признак сборки.
 */

const noop = (): void => undefined;

/** Стор со готовым снимком: у панели остаётся один настоящий страж — `IS_DEV`. */
function mockStoreWithView(): void {
  const view = filterStateForPlayer(createInitialGameState('dev-guard'), 'player-1');

  vi.doMock('../../store/gameStore', () => ({
    useGameStore: <T>(selector: (state: Record<string, unknown>) => T): T =>
      selector({ view, dispatch: noop, selectRoom: noop, startNewGame: noop }),
  }));
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock('../../store/gameStore');
  vi.resetModules();
});

describe('Dev-панель: замок на продакшн-сборку', () => {
  it('при DEV = false не рендерит ничего: ни заголовка, ни кнопок', async () => {
    vi.resetModules();
    vi.stubEnv('DEV', false);
    mockStoreWithView();

    const { DevPanel } = await import('./DevPanel');

    expect(renderToStaticMarkup(createElement(DevPanel, { onClose: noop }))).toBe('');
  });

  it('контроль: при DEV = true та же панель рендерится', async () => {
    vi.resetModules();
    vi.stubEnv('DEV', true);
    mockStoreWithView();

    const { DevPanel } = await import('./DevPanel');

    const markup = renderToStaticMarkup(createElement(DevPanel, { onClose: noop }));

    expect(markup).toContain('DEV-ПАНЕЛЬ');
    expect(markup).toContain('только dev-сборка');
  });
});
