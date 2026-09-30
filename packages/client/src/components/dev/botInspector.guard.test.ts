import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BOT_TUNING, createInitialGameState, filterStateForPlayer } from '@nemesis/shared';
import type { TableSeating } from '@nemesis/shared';

import { BotController } from '../../services/transport/BotController';

const noop = (): void => undefined;

function mockStoreWithBots(): string[] {
  const state = createInitialGameState('inspector-guard', { playerCount: 3 });
  const seating: TableSeating[] = [
    { playerId: 'player-1', kind: 'LOCAL_HUMAN', label: 'Вы' },
    { playerId: 'player-2', kind: 'BOT', label: 'Бот 2', difficulty: 'VETERAN' },
    { playerId: 'player-3', kind: 'BOT', label: 'Бот 3', difficulty: 'VETERAN' },
  ];
  const controller = BotController.forTable(state, seating);
  const entries = controller.inspect(state);
  const view = filterStateForPlayer(state, 'player-1');
  vi.doMock('../../store/gameStore', () => ({
    useGameStore: <T>(selector: (store: Record<string, unknown>) => T): T =>
      selector({ view, seating, inspectBots: () => entries }),
  }));
  return entries[0]!.inspection.traits.map((trait) => BOT_TUNING.traits.catalog[trait].label);
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock('../../store/gameStore');
  vi.resetModules();
});

describe('Инспектор ботов: только dev-сборка (план 0.8.0, В8-9-1)', () => {
  it('при DEV = false не рендерит ничего — черты ботов игрокам не видны (Р-8)', async () => {
    vi.resetModules();
    vi.stubEnv('DEV', false);
    mockStoreWithBots();
    const { BotInspector } = await import('./BotInspector');
    expect(renderToStaticMarkup(createElement(BotInspector, { onClose: noop }))).toBe('');
  });

  it('при DEV = true показывает черты, убеждения, доверие и разбор кандидатов', async () => {
    vi.resetModules();
    vi.stubEnv('DEV', true);
    const traitLabels = mockStoreWithBots();
    const { BotInspector } = await import('./BotInspector');
    const markup = renderToStaticMarkup(createElement(BotInspector, { onClose: noop }));
    expect(markup).toContain('ИНСПЕКТОР БОТОВ');
    expect(markup).toContain('Бот 2');
    for (const label of traitLabels) expect(markup).toContain(label);
    for (const section of ['Характер', 'Убеждения', 'Доверие', 'Решение', 'Ложь и обещания']) {
      expect(markup).toContain(section);
    }
    expect(markup).toContain('Ветеран');
  });

  it('транспорт без dev-действий не отдаёт разбор ботов', async () => {
    const { LocalInMemoryTransport } = await import('../../services/transport/LocalInMemoryTransport');
    const { createMemoryStorage, createSessionStorage } = await import('../../services/session/sessionStorage');
    const closed = new LocalInMemoryTransport({ session: createSessionStorage(createMemoryStorage()), playerId: 'p' });
    expect(closed.inspectBots()).toEqual([]);
  });
});
