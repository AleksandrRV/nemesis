import { describe, expect, it } from 'vitest';
import { createBotMind, createInitialGameState } from '@nemesis/shared';
import type { TableSeating } from '@nemesis/shared';

import { BotController } from './BotController';

const state = createInitialGameState('bot-controller-difficulty', { playerCount: 3 });
const playerIds = Object.keys(state.players);

function seating(difficulty?: TableSeating['difficulty']): TableSeating[] {
  return [
    { playerId: 'player-1', kind: 'LOCAL_HUMAN', label: 'Вы' },
    { playerId: 'player-2', kind: 'BOT', label: 'Бот', ...(difficulty ? { difficulty } : {}) },
    { playerId: 'player-3', kind: 'BOT', label: 'Бот', ...(difficulty ? { difficulty } : {}) },
  ];
}

describe('Контроллер ботов: сложность места (план 0.8.0, В8-8-3)', () => {
  it('рождает память бота со сложностью его места', () => {
    const controller = BotController.forTable(state, seating('VETERAN'));
    expect(controller.mindOf('player-2')!.difficulty).toBe('VETERAN');
    expect(controller.mindOf('player-3')!.difficulty).toBe('VETERAN');
    expect(controller.mindOf('player-1')).toBeNull();
  });

  it('место без сложности (сохранение до 0.8.0) играет «Экипажем»', () => {
    expect(BotController.forTable(state, seating()).mindOf('player-2')!.difficulty).toBe('CREW');
  });

  it('сохранённая память другой сложности не подхватывается: бот рождается заново', () => {
    const novice = createBotMind(state.meta.seed, 'player-2', playerIds, 'NOVICE');
    const veteran = createBotMind(state.meta.seed, 'player-2', playerIds, 'VETERAN');
    const restoredNovice = { ...novice, processedLogSequence: 7 };
    const restoredVeteran = { ...veteran, processedLogSequence: 7 };
    expect(
      BotController.forTable(state, seating('VETERAN'), { 'player-2': restoredNovice }).mindOf('player-2'),
    ).toEqual(veteran);
    expect(
      BotController.forTable(state, seating('VETERAN'), { 'player-2': restoredVeteran }).mindOf('player-2'),
    ).toEqual(restoredVeteran);
  });
});
