import { describe, expect, it } from 'vitest';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { contactState } from '../testing/contactFixtures.js';
import { BOT, mindFor, seen, withCharacter } from '../testing/botSocialFixtures.js';
import { inspectBot } from './botInspection.js';
import { BOT_TUNING } from './botTuning.js';

describe('Инспектор ботов (план 0.8.0, В8-9-1)', () => {
  it('показывает черты, ручки, убеждения, доверие и 5 лучших кандидатов с разбором факторов', () => {
    const state = contactState(3, 'inspect-bot');
    state.meta.activePlayerId = BOT;
    state.ship.rooms[state.players[BOT]!.roomId]!.hasFire = true;
    const mind = seen(state, withCharacter(mindFor(state), { traits: ['PANICKER'], morale: 20 }));
    const before = structuredClone(mind);
    const inspection = inspectBot(filterStateForPlayer(state, BOT), mind, BOT_TUNING);

    expect(mind).toEqual(before);
    expect(inspection).toMatchObject({ botId: BOT, traits: ['PANICKER'], morale: 20, difficulty: 'CREW' });
    expect(inspection.knobs.riskAversion).toBe(2);
    expect(inspection.trust.map((entry) => entry.playerId).sort()).toEqual(['player-1', 'player-3']);
    expect(inspection.candidates.length).toBeGreaterThan(0);
    expect(inspection.candidates.length).toBeLessThanOrEqual(5);
    const utilities = inspection.candidates.map((entry) => entry.utility);
    expect(utilities).toEqual([...utilities].sort((left, right) => right - left));
    const [best] = inspection.candidates;
    const { taskValue, cleanup, safety, endTurn, handReserve, economy } = best!.factors;
    expect(best!.utility).toBeCloseTo((taskValue + cleanup) * economy + safety + endTurn - handReserve);
    expect(inspection.tasks.length).toBeGreaterThan(0);
    expect(inspection.objectives.length).toBeGreaterThan(0);
  });
});
