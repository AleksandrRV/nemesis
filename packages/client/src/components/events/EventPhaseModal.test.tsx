import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import type { GameLogEntry, GameLogEvent } from '@nemesis/shared';
import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';

import { EventPhaseModal } from './EventPhaseModal';
import { buildEventPhaseModalModel } from './eventPhaseModalModel';

function entry(sequence: number, event: GameLogEvent): GameLogEntry {
  return { id: `log-${sequence}`, sequence, event };
}

function viewWithPhase() {
  const view = filterStateForPlayer(createInitialGameState('modal-component'), 'player-1');
  view.gameLog = [
    entry(1, { type: 'TIME_TRACK_ADVANCED', round: 3, timeTrackPosition: 3, selfDestructTrackPosition: null }),
    entry(2, {
      type: 'EVENT_PHASE_ATTACK_RESOLVED',
      playerId: 'player-1',
      roomId: 11,
      intruderId: 'adult-1',
      intruderType: 'ADULT',
      card: null,
      outcome: 'MISS',
      victims: [],
    }),
    entry(3, { type: 'HIVE_DEVELOPMENT_SKIPPED', round: 3, reason: 'EMPTY_BAG' }),
    entry(4, { type: 'ROUND_STARTED', round: 4, firstPlayerId: 'player-1' }),
  ];
  return view;
}

describe('EventPhaseModal: кинематографичный оверлей Фазы Событий (Шаг 9)', () => {
  it('заголовок объявляет раунд, все шесть шагов доступны', () => {
    const view = viewWithPhase();
    const model = buildEventPhaseModalModel(view)!;
    const html = renderToStaticMarkup(
      <EventPhaseModal view={view} model={model} onClose={vi.fn()} onStepChange={vi.fn()} />,
    );

    expect(html).toContain('ФАЗА СОБЫТИЙ: РАУНД 3');
    expect(html).toContain('1. Счётчики Времени и Самоуничтожения');
    expect(html).toContain('2. Атаки Чужих');
    expect(html).toContain('3. Урон от огня');
    expect(html).toContain('4. Карта События: движение Чужих');
    expect(html).toContain('5. Текстовый эффект карты');
    expect(html).toContain('6. Развитие Улья');
  });

  it('первый шаг показывает журнал Сдвига Счётчиков и подсказки для пустых шагов', () => {
    const view = viewWithPhase();
    const model = buildEventPhaseModalModel(view)!;
    const html = renderToStaticMarkup(
      <EventPhaseModal view={view} model={model} onClose={vi.fn()} onStepChange={vi.fn()} />,
    );

    expect(html).toContain('ШАГ 1 ИЗ 6');
    expect(html).toContain('маркер Времени — позиция 3');
    expect(html).toContain('ДАЛЕЕ');
  });

  it('диалог доступен: роль, подпись и живая область контента', () => {
    const view = viewWithPhase();
    const model = buildEventPhaseModalModel(view)!;
    const html = renderToStaticMarkup(
      <EventPhaseModal view={view} model={model} onClose={vi.fn()} onStepChange={vi.fn()} />,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-label="Фаза Событий, раунд 3"');
    expect(html).toContain('aria-live="polite"');
  });
});
