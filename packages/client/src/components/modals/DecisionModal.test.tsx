import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import type { PendingDecision } from '@nemesis/shared';

import { DecisionModal } from './DecisionModal';

vi.mock('../../store/gameStore', () => ({
  useGameStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ dispatch: () => undefined, view: null }),
}));

describe('DecisionModal: переброс Прицельного огня', () => {
  const decision: PendingDecision = {
    id: 'aimed-test',
    playerId: 'player-1',
    type: 'CHOOSE_AIMED_REROLL',
    firstFace: 'MISS',
    targetIntruderId: 't-adult',
    weaponSlotIndex: 0,
  };

  it('показывает первую грань и оба варианта', () => {
    const html = renderToStaticMarkup(<DecisionModal decision={decision} />);

    expect(html).toContain('ПЕРЕБРОС');
    expect(html).toContain('Промах');
    expect(html).toContain('Оставить: Промах');
    expect(html).toContain('Перебросить');
  });
});
