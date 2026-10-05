import { describe, expect, it } from 'vitest';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { putPlayer } from '../testing/contactFixtures.js';
import { standAt } from '../testing/roomFixtures.js';
import { BOT, botTable } from '../testing/botTacticsFixtures.js';
import { teamShare } from './botTeam.js';

const HATCH = { definitionIds: ['HATCH_CONTROL'] };

describe('Общие задачи корабля: берёт ближайший член экипажа', () => {
  it('товарищ уже в Контроле шлюзов — боту задача стоит доли share', () => {
    const state = botTable('team-nearer');
    standAt(state, 'player-1', 'HATCH_CONTROL');
    putPlayer(state, BOT, 11);
    expect(teamShare(filterStateForPlayer(state, BOT), BOT, HATCH, 0.3)).toBe(0.3);
  });

  it('бот ближе всех — задача его целиком', () => {
    const state = botTable('team-self');
    standAt(state, BOT, 'HATCH_CONTROL');
    putPlayer(state, 'player-1', 11);
    expect(teamShare(filterStateForPlayer(state, BOT), BOT, HATCH, 0.3)).toBe(1);
  });

  it('погибший товарищ задачу не забирает; share 1 — делёжки нет', () => {
    const state = botTable('team-dead');
    standAt(state, 'player-1', 'HATCH_CONTROL');
    putPlayer(state, BOT, 11);
    expect(teamShare(filterStateForPlayer(state, BOT), BOT, HATCH, 1)).toBe(1);
    state.players['player-1']!.isDead = true;
    expect(teamShare(filterStateForPlayer(state, BOT), BOT, HATCH, 0.3)).toBe(1);
  });
});
