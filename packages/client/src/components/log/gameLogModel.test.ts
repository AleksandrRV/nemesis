import { describe, expect, it } from 'vitest';

import type { GameLogEvent } from '@nemesis/shared';
import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';

import { formatGameLog } from './gameLogModel';

function eventEntry(sequence: number, event: GameLogEvent) {
  return { id: `log-${sequence}`, sequence, event };
}

describe('gameLogModel: русские сообщения и semantic tones', () => {
  it('форматирует перемещение с названиями отсеков и Коридором', () => {
    const state = createInitialGameState('game-log-model-move');
    const view = filterStateForPlayer(state, 'player-1');
    const corridor = Object.values(view.ship.corridors).find(
      (candidate) => candidate.fromRoomId === 11 || candidate.toRoomId === 11,
    );

    expect(corridor).toBeDefined();

    view.gameLog = [
      eventEntry(1, {
        type: 'PLAYER_MOVED',
        playerId: 'player-1',
        fromRoomId: 11,
        toRoomId: corridor!.fromRoomId === 11 ? corridor!.toRoomId : corridor!.fromRoomId,
        corridorId: corridor!.id,
        mode: 'CAREFUL',
      }),
    ];

    const [entry] = formatGameLog(view);
    const message = entry!.segments.map((segment) => segment.text).join('');

    expect(message).toContain('переместился');
    expect(message).toContain(`Коридору ${corridor!.id.replace('-', '–')}`);
    expect(message).toContain('Осторожное движение');
    expect(entry!.segments.some((segment) => segment.tone === 'player' && segment.strong)).toBe(true);
    expect(entry!.segments.some((segment) => segment.tone === 'corridor' && segment.strong)).toBe(true);
  });

  it('выделяет результат кубика, эффекты и размещение Шума', () => {
    const view = filterStateForPlayer(createInitialGameState('game-log-model-events'), 'player-1');
    const events: GameLogEvent[] = [
      { type: 'NOISE_ROLLED', playerId: 'player-1', roomId: 11, result: { kind: 'DANGER' } },
      {
        type: 'EXPLORATION_TOKEN_REVEALED',
        playerId: 'player-1',
        roomId: 11,
        itemsCount: 2,
        effect: 'FIRE',
      },
      {
        type: 'EXPLORATION_EFFECT_RESOLVED',
        playerId: 'player-1',
        roomId: 11,
        effect: 'FIRE',
        outcome: 'FIRE_PLACED',
      },
      {
        type: 'NOISE_MARKER_PLACED',
        playerId: 'player-1',
        roomId: 11,
        target: { kind: 'TECHNICAL_CORRIDOR' },
        reason: 'DANGER',
      },
    ];
    view.gameLog = events.map((event, index) => eventEntry(index + 1, event));

    const entries = formatGameLog(view);
    const messages = entries.map((entry) => entry.segments.map((segment) => segment.text).join(''));

    expect(messages[0]).toContain('Опасность');
    expect(messages[1]).toContain('жетон Исследования');
    expect(messages[1]).toContain('Пожар');
    expect(messages[2]).toContain('маркер Пожара установлен');
    expect(messages[3]).toContain('Технические Коридоры');
    expect(entries.flatMap((entry) => entry.segments).some((segment) => segment.tone === 'danger')).toBe(true);
    expect(entries.flatMap((entry) => entry.segments).some((segment) => segment.tone === 'fire')).toBe(true);
    expect(entries.flatMap((entry) => entry.segments).some((segment) => segment.tone === 'noise')).toBe(true);
  });

  it('оставляет неизвестный отсек без скрытого названия', () => {
    const state = createInitialGameState('game-log-model-hidden');
    const view = filterStateForPlayer(state, 'player-1');
    const hiddenRoomId = Object.values(view.ship.rooms).find((room) => !room.isExplored)?.id;

    expect(hiddenRoomId).toBeDefined();

    view.gameLog = [
      eventEntry(1, {
        type: 'NOISE_SKIPPED',
        playerId: 'player-1',
        roomId: hiddenRoomId!,
        reason: 'COMPANION',
      }),
    ];

    const message = formatGameLog(view)[0]!
      .segments.map((segment) => segment.text)
      .join('');

    expect(message).toContain(`отсек #${String(hiddenRoomId).padStart(3, '0')}`);
    expect(view.ship.rooms[hiddenRoomId!]?.definitionId).toBeNull();
  });
});
