import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { GameLogEvent } from '@nemesis/shared';
import { INTRUDER_ATTACK_CARDS } from '@nemesis/shared';
import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';

import { EventPhaseBanner } from './EventPhaseBanner';

function entry(sequence: number, event: GameLogEvent) {
  return { id: `log-${sequence}`, sequence, event };
}

describe('EventPhaseBanner: сводка атак Фазы Событий', () => {
  it('при загрузке страницы история не проигрывается — баннер скрыт', () => {
    const view = filterStateForPlayer(createInitialGameState('banner-mount'), 'player-1');
    const card = structuredClone(INTRUDER_ATTACK_CARDS.find((candidate) => candidate.id === 'IAT_SCRATCH_1')!);
    view.gameLog = [
      entry(1, { type: 'TIME_TRACK_ADVANCED', round: 1, timeTrackPosition: 1, selfDestructTrackPosition: null }),
      entry(2, {
        type: 'EVENT_PHASE_ATTACK_RESOLVED',
        playerId: 'player-1',
        roomId: 11,
        intruderId: 'adult-1',
        intruderType: 'ADULT',
        card,
        outcome: 'HIT',
        victims: [
          { playerId: 'player-1', isDead: false, lightWounds: 1, seriousWounds: 0, hasLarva: false, hasSlime: false },
        ],
      }),
      entry(3, { type: 'ROUND_STARTED', round: 2, firstPlayerId: 'player-1' }),
    ];

    const markup = renderToStaticMarkup(createElement(EventPhaseBanner, { view }));

    expect(markup).toBe('');
  });

  it('без Фаз Событий баннер не появляется', () => {
    const view = filterStateForPlayer(createInitialGameState('banner-empty'), 'player-1');

    const markup = renderToStaticMarkup(createElement(EventPhaseBanner, { view }));

    expect(markup).toBe('');
  });
});
