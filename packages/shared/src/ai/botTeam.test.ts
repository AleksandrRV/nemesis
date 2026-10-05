import { describe, expect, it } from 'vitest';
import { PERSONAL_OBJECTIVE_CARDS } from '../data/objectiveCards.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { putPlayer } from '../testing/contactFixtures.js';
import { standAt } from '../testing/roomFixtures.js';
import { BOT, botTable, neutralMind } from '../testing/botTacticsFixtures.js';
import { planObjectives } from './botObjectivePlanner.js';
import { BOT_TUNING } from './botTuning.js';
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

describe('Ручка milestoneBoost: разовые вехи Целей', () => {
  it('множитель поднимает вес Сигнала, но не других шагов Цели', () => {
    const state = botTable('team-milestone');
    state.players[BOT]!.objectives = [
      structuredClone(PERSONAL_OBJECTIVE_CARDS.find((card) => card.id === 'OBJ_PERSONAL_DECENT_BURIAL')!),
    ];
    const view = filterStateForPlayer(state, BOT);
    const mind = neutralMind(state);
    const weightOf = (boost: number, kind: string) =>
      planObjectives(view, mind, { ...BOT_TUNING, tactics: { ...BOT_TUNING.tactics, milestoneBoost: boost } })
        .flatMap((plan) => plan.tasks)
        .find((entry) => entry.kind === kind)!.weight;
    expect(weightOf(3, 'SEND_SIGNAL')).toBeCloseTo(weightOf(1, 'SEND_SIGNAL') * 3);
    const other = planObjectives(view, mind, BOT_TUNING)
      .flatMap((plan) => plan.tasks)
      .find((entry) => entry.kind !== 'SEND_SIGNAL')!;
    expect(weightOf(3, other.kind)).toBeCloseTo(other.weight);
  });
});
