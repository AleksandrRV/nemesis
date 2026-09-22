import { describe, expect, it } from 'vitest';

import type { GameLogEntry, GameLogEvent } from '@nemesis/shared';
import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';

import { buildEventPhaseModalModel } from './eventPhaseModalModel';

function entry(sequence: number, event: GameLogEvent): GameLogEntry {
  return { id: `log-${sequence}`, sequence, event };
}

const TIME_EVENT = {
  type: 'TIME_TRACK_ADVANCED',
  round: 1,
  timeTrackPosition: 1,
  selfDestructTrackPosition: null,
} satisfies GameLogEvent;

const ATTACK_EVENT = {
  type: 'EVENT_PHASE_ATTACK_RESOLVED',
  playerId: 'player-1',
  roomId: 11,
  intruderId: 'adult-1',
  intruderType: 'ADULT',
  card: null,
  outcome: 'HIT',
  victims: [
    { playerId: 'player-1', isDead: false, lightWounds: 1, seriousWounds: 0, hasLarva: false, hasSlime: false },
  ],
};

function baseView() {
  return filterStateForPlayer(createInitialGameState('modal-model'), 'player-1');
}

describe('eventPhaseModalModel: шесть шагов презентации Фазы Событий (Шаг 9)', () => {
  it('без завершённой Фазы Событий модель отсутствует', () => {
    expect(buildEventPhaseModalModel(baseView())).toBeNull();
  });

  it('раскладывает записи последней Фазы по шести шагам в порядке движка', () => {
    const view = baseView();
    view.gameLog = [
      entry(1, { ...TIME_EVENT }),
      entry(2, { ...ATTACK_EVENT } as GameLogEvent),
      entry(3, { type: 'FIRE_DAMAGE_TAKEN_BY_INTRUDER', roomId: 4, intruderId: 'adult-2', intruderType: 'ADULT' }),
      entry(4, { type: 'EGG_DESTROYED_BY_FIRE', roomId: 4, objectId: 'egg-1' }),
      entry(5, {
        type: 'EVENT_CARD_DRAWN',
        round: 1,
        card: {
          id: 'EV_SHORT_CIRCUIT',
          name: 'Короткое замыкание',
          description: 'Отказы систем',
          effect: 'SHORT_CIRCUIT',
          corridorNumber: 'ANY',
          intruderTypes: [],
          isDestroyedOnResolve: false,
          isReshuffledIntoDeck: false,
        },
      }),
      entry(6, {
        type: 'INTRUDER_MOVED',
        intruderId: 'adult-2',
        intruderType: 'ADULT',
        fromRoomId: 6,
        toRoomId: 7,
        corridorId: '6-7',
        corridorNumber: 3,
        technicalCorridors: false,
      }),
      entry(7, {
        type: 'INTRUDERS_BLOCKED_BY_DOOR',
        intruderIds: ['adult-3'],
        corridorId: '3-7',
        source: 'EVENT_PHASE',
      }),
      entry(8, {
        type: 'EVENT_EFFECT_RESOLVED',
        round: 1,
        cardId: 'EV_SHORT_CIRCUIT',
        effect: 'SHORT_CIRCUIT',
        outcome: { kind: 'SHORT_CIRCUIT', malfunctionRoomIds: [4, 7] },
      }),
      entry(9, {
        type: 'HIVE_DEVELOPMENT_RESOLVED',
        round: 1,
        tokenType: 'LARVA',
        outcome: { kind: 'LARVA', adultAdded: false },
      }),
      entry(10, { type: 'ROUND_STARTED', round: 2, firstPlayerId: 'player-1' }),
      entry(11, { type: 'PLAYER_TURN_STARTED', playerId: 'player-1', round: 2 }),
    ];

    const model = buildEventPhaseModalModel(view);
    expect(model).not.toBeNull();
    expect(model!.phaseKey).toBe(1);
    expect(model!.steps.map((step) => step.id)).toEqual(['TIME', 'ATTACKS', 'FIRE', 'EVENT_CARD', 'EFFECT', 'HIVE']);

    const stepEntries = (id: string) => model!.steps.find((step) => step.id === id)!.entries.map((log) => log.sequence);
    expect(stepEntries('TIME')).toEqual([1]);
    expect(stepEntries('ATTACKS')).toEqual([2]);
    expect(stepEntries('FIRE')).toEqual([3, 4]);
    expect(stepEntries('EVENT_CARD')).toEqual([5, 6, 7]);
    expect(stepEntries('EFFECT')).toEqual([8]);
    expect(stepEntries('HIVE')).toEqual([9]);
  });

  it('подсвечивает затронутые отсеки: атаки, огонь и текстовый эффект', () => {
    const view = baseView();
    view.gameLog = [
      entry(1, { ...TIME_EVENT }),
      entry(2, { ...ATTACK_EVENT } as GameLogEvent),
      entry(3, { type: 'EGG_DESTROYED_BY_FIRE', roomId: 4, objectId: 'egg-1' }),
      entry(4, {
        type: 'INTRUDER_MOVED',
        intruderId: 'adult-2',
        intruderType: 'ADULT',
        fromRoomId: 6,
        toRoomId: 7,
        corridorId: '6-7',
        corridorNumber: 3,
        technicalCorridors: false,
      }),
      entry(5, {
        type: 'EVENT_EFFECT_RESOLVED',
        round: 1,
        cardId: 'EV_SHORT_CIRCUIT',
        effect: 'SHORT_CIRCUIT',
        outcome: { kind: 'SHORT_CIRCUIT', malfunctionRoomIds: [7, 12] },
      }),
      entry(6, { type: 'ROUND_STARTED', round: 2, firstPlayerId: 'player-1' }),
    ];

    const model = buildEventPhaseModalModel(view)!;
    const highlight = (id: string) => model.steps.find((step) => step.id === id)!.highlightRoomIds;

    expect(highlight('TIME')).toEqual([]);
    expect(highlight('ATTACKS')).toEqual([11]);
    expect(highlight('FIRE')).toEqual([4]);
    expect(highlight('EVENT_CARD')).toEqual([6, 7]);
    expect(highlight('EFFECT')).toEqual([7, 12]);
  });

  it('окно ограничено последним Сдвигом Счётчиков: записи нового раунда игнорируются', () => {
    const view = baseView();
    view.gameLog = [
      entry(1, { ...TIME_EVENT }),
      entry(2, { type: 'ROUND_STARTED', round: 2, firstPlayerId: 'player-1' }),
      entry(3, { ...ATTACK_EVENT, roomId: 21 } as GameLogEvent), // атака следующей Фазы — вне окна
      entry(4, { type: 'TIME_TRACK_ADVANCED', round: 2, timeTrackPosition: 2, selfDestructTrackPosition: null }),
      entry(5, { ...ATTACK_EVENT, roomId: 12 } as GameLogEvent),
    ];

    const model = buildEventPhaseModalModel(view)!;
    expect(model.phaseKey).toBe(4);
    expect(model.steps.find((step) => step.id === 'ATTACKS')!.entries.map((log) => log.sequence)).toEqual([5]);
    expect(model.steps.find((step) => step.id === 'ATTACKS')!.highlightRoomIds).toEqual([12]);
  });
});
