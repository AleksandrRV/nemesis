import { describe, expect, it } from 'vitest';

import type { GameLogEvent, IntruderLogEvent } from '@nemesis/shared';
import { INTRUDER_ATTACK_CARDS } from '@nemesis/shared';
import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';

import { buildEventPhaseBannerModel } from './eventPhaseBannerModel';

function entry(sequence: number, event: GameLogEvent) {
  return { id: `log-${sequence}`, sequence, event };
}

function attackEvent(overrides: Partial<Extract<IntruderLogEvent, { type: 'EVENT_PHASE_ATTACK_RESOLVED' }>> = {}) {
  const card = structuredClone(INTRUDER_ATTACK_CARDS.find((candidate) => candidate.id === 'IAT_SCRATCH_1')!);
  return {
    type: 'EVENT_PHASE_ATTACK_RESOLVED' as const,
    playerId: 'player-1',
    roomId: 11 as const,
    intruderId: 'adult-1',
    intruderType: 'ADULT' as const,
    card,
    outcome: 'HIT' as const,
    victims: [
      { playerId: 'player-1', isDead: false, lightWounds: 1, seriousWounds: 0, hasLarva: false, hasSlime: false },
    ],
    ...overrides,
  };
}

describe('eventPhaseBannerModel: сводка атак последней Фазы Событий', () => {
  it('собирает атаки окна между сдвигом счётчиков и новым раундом', () => {
    const view = filterStateForPlayer(createInitialGameState('banner-model-base'), 'player-1');
    view.gameLog = [
      entry(1, { type: 'TIME_TRACK_ADVANCED', round: 1, timeTrackPosition: 1, selfDestructTrackPosition: null }),
      entry(2, attackEvent()),
      entry(3, attackEvent({ outcome: 'MISS', victims: [] })),
      entry(4, { type: 'ROUND_STARTED', round: 2, firstPlayerId: 'player-1' }),
    ];

    const model = buildEventPhaseBannerModel(view);

    expect(model).toMatchObject({ phaseKey: 1, round: 1 });
    expect(model!.attacks).toHaveLength(2);
    expect(model!.attacks[0]).toMatchObject({
      intruderType: 'ADULT',
      targetName: view.players['player-1']!.name,
      outcome: 'HIT',
      cardName: 'Царапина',
      anyVictimDead: false,
    });
  });

  it('события после начала нового раунда в окно не попадают', () => {
    const view = filterStateForPlayer(createInitialGameState('banner-model-window'), 'player-1');
    view.gameLog = [
      entry(1, { type: 'TIME_TRACK_ADVANCED', round: 1, timeTrackPosition: 1, selfDestructTrackPosition: null }),
      entry(2, { type: 'ROUND_STARTED', round: 2, firstPlayerId: 'player-1' }),
      entry(3, attackEvent()),
    ];

    expect(buildEventPhaseBannerModel(view)).toBeNull();
  });

  it('фаза без атак баннер не заслуживает', () => {
    const view = filterStateForPlayer(createInitialGameState('banner-model-quiet'), 'player-1');
    view.gameLog = [
      entry(1, { type: 'TIME_TRACK_ADVANCED', round: 1, timeTrackPosition: 1, selfDestructTrackPosition: null }),
      entry(2, { type: 'FIRE_DAMAGE_TAKEN_BY_INTRUDER', roomId: 11, intruderId: 'adult-1', intruderType: 'ADULT' }),
      entry(3, { type: 'ROUND_STARTED', round: 2, firstPlayerId: 'player-1' }),
    ];

    expect(buildEventPhaseBannerModel(view)).toBeNull();
  });

  it('берёт только последнюю фазу: тихий раунд гасит сводку предыдущего', () => {
    const view = filterStateForPlayer(createInitialGameState('banner-model-latest'), 'player-1');
    view.gameLog = [
      entry(1, { type: 'TIME_TRACK_ADVANCED', round: 1, timeTrackPosition: 1, selfDestructTrackPosition: null }),
      entry(2, attackEvent()),
      entry(3, { type: 'ROUND_STARTED', round: 2, firstPlayerId: 'player-1' }),
      entry(4, { type: 'TIME_TRACK_ADVANCED', round: 2, timeTrackPosition: 2, selfDestructTrackPosition: null }),
      entry(5, { type: 'ROUND_STARTED', round: 3, firstPlayerId: 'player-1' }),
    ];

    expect(buildEventPhaseBannerModel(view)).toBeNull();
  });

  it('помечает гибель цели', () => {
    const view = filterStateForPlayer(createInitialGameState('banner-model-death'), 'player-1');
    view.gameLog = [
      entry(1, { type: 'TIME_TRACK_ADVANCED', round: 1, timeTrackPosition: 1, selfDestructTrackPosition: null }),
      entry(
        2,
        attackEvent({
          outcome: 'HIT',
          victims: [
            { playerId: 'player-1', isDead: true, lightWounds: 0, seriousWounds: 3, hasLarva: false, hasSlime: false },
          ],
        }),
      ),
    ];

    const model = buildEventPhaseBannerModel(view);
    expect(model!.attacks[0]!.anyVictimDead).toBe(true);
  });
});
