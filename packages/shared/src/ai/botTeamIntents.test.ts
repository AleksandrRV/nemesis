import { describe, expect, it } from 'vitest';
import type { CommsIntent } from '../types/comms.js';
import type { GameState } from '../types/state.js';
import { GameEngine } from '../logic/fsm.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { contactState } from '../testing/contactFixtures.js';
import { BOT, neutralMind } from '../testing/botTacticsFixtures.js';
import { escortTasks, intentForTask, yieldClaimedTasks } from './botTeam.js';
import { task } from './botTasks.js';
import { BOT_TUNING, type BotTuning } from './botTuning.js';

function teamTuning(team: Partial<BotTuning['tactics']['team']>): BotTuning {
  return { ...BOT_TUNING, tactics: { ...BOT_TUNING.tactics, team: { ...BOT_TUNING.tactics.team, ...team } } };
}

function announce(state: GameState, authorId: string, body: CommsIntent): GameState {
  const table = structuredClone(state);
  table.meta.activePlayerId = authorId;
  table.pendingDecision = null;
  return new GameEngine().processAction(
    table,
    { type: 'ACTION_COMMS', payload: { kind: 'INTENT', to: 'ALL', body } },
    { actorId: authorId },
  );
}

const checkCoordinates = () =>
  task('CHECK_COORDINATES', 'LEARN_SHIP', 1, { definitionIds: ['COCKPIT'] }, 'Узнать Координаты');

describe('Намерения товарищей: общую задачу не дублируют', () => {
  it('товарищ объявил поход на Мостик — бот уступает ему Координаты', () => {
    const state = announce(contactState(3, 'team-claim'), 'player-1', { topic: 'GO_TO_BRIDGE' });
    const [entry] = yieldClaimedTasks(
      filterStateForPlayer(state, BOT),
      neutralMind(state),
      [checkCoordinates()],
      teamTuning({ claimedShare: 0.2 }),
    );
    expect(entry!.weight).toBeCloseTo(0.2);
  });

  it('свою, не общую задачу и задачу погибшего товарища бот не уступает', () => {
    const state = announce(contactState(3, 'team-claim-no'), 'player-1', { topic: 'GO_TO_BRIDGE' });
    const heal = task('HEAL', 'SURVIVE', 1, { definitionIds: ['COCKPIT'] }, 'Лечение');
    const tuning = teamTuning({ claimedShare: 0.2 });
    const view = filterStateForPlayer(state, BOT);
    expect(yieldClaimedTasks(view, neutralMind(state), [heal], tuning)[0]!.weight).toBe(1);
    const mourning = structuredClone(state);
    mourning.players['player-1']!.isDead = true;
    const afterDeath = filterStateForPlayer(mourning, BOT);
    expect(yieldClaimedTasks(afterDeath, neutralMind(state), [checkCoordinates()], tuning)[0]!.weight).toBe(1);
  });

  it('незнакомая Комната звучит как поиск её типа', () => {
    const state = contactState(3, 'team-seek');
    const unlock = task('UNLOCK_POD', 'PREPARE_EVACUATION', 1, { definitionIds: ['HATCH_CONTROL'] }, 'Капсулы');
    const known = Object.values(state.ship.rooms).some(
      (room) => room.isExplored && room.definitionId === 'HATCH_CONTROL',
    );
    if (!known) {
      expect(intentForTask(filterStateForPlayer(state, BOT), unlock)).toEqual({
        topic: 'SEEK_ROOM',
        definitionId: 'HATCH_CONTROL',
      });
    }
  });
});

describe('Группы по двое: прикрытие товарища', () => {
  it('товарищ объявил поход к Двигателям — свободный бот идёт за ним', () => {
    const state = announce(contactState(3, 'team-escort'), 'player-1', { topic: 'GO_TO_ENGINES' });
    const [escort] = escortTasks(filterStateForPlayer(state, BOT), neutralMind(state), [], teamTuning({ escort: 0.5 }));
    expect(escort).toMatchObject({ kind: 'ESCORT', weight: 0.5, detail: { playerId: 'player-1' } });
    expect(escort!.place.roomIds).toEqual([state.players['player-1']!.roomId]);
    expect(intentForTask(filterStateForPlayer(state, BOT), escort!)).toEqual({
      topic: 'COVER_PLAYER',
      playerId: 'player-1',
    });
  });

  it('товарища уже прикрывают или групп нет — прикрытия нет', () => {
    let state = announce(contactState(3, 'team-covered'), 'player-1', { topic: 'GO_TO_ENGINES' });
    expect(escortTasks(filterStateForPlayer(state, BOT), neutralMind(state), [], BOT_TUNING)).toEqual([]);
    state = announce(state, 'player-3', { topic: 'COVER_PLAYER', playerId: 'player-1' });
    const view = filterStateForPlayer(state, BOT);
    const tasks = escortTasks(view, neutralMind(state), [], teamTuning({ escort: 0.5 }));
    expect(tasks.every((entry) => entry.detail.playerId !== 'player-1')).toBe(true);
  });
});
