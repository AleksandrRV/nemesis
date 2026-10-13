import { describe, expect, it } from 'vitest';
import { PERSONAL_OBJECTIVE_CARDS } from '../data/objectiveCards.js';
import { SELF_DESTRUCT_IRREVERSIBLE_AT } from '../data/evacuation.js';
import type { GameState } from '../types/state.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { putPlayer } from '../testing/contactFixtures.js';
import { roomOf, standAt } from '../testing/roomFixtures.js';
import { BOT, agendaFor, botTable, neutralMind, rankedFor } from '../testing/botTacticsFixtures.js';
import { planObjective } from './botObjectivePlanner.js';
import { explosionDeath } from './botSelfDestruct.js';
import { threatContext } from './botThreat.js';
import { BOT_TUNING } from './botTuning.js';

const LIFELINE = BOT_TUNING.desires.SURVIVE * BOT_TUNING.tactics.harm.weight;

function atGenerator(seed: string): GameState {
  const state = botTable(seed);
  standAt(state, BOT, 'GENERATOR');
  putPlayer(state, 'player-1', 19);
  state.meta.timeTrackPosition = 4;
  return state;
}

function deathAt(state: GameState, position: number): number {
  const view = filterStateForPlayer(state, BOT);
  return explosionDeath(threatContext(view, view.players[BOT]!, BOT_TUNING), position);
}

/** Спасательный отсек B открыт и пуст, бот стоит в нём. */
function besidePod(state: GameState): void {
  for (const pod of Object.values(state.ship.escapePods)) pod.isLocked = pod.section !== 'B';
  const podRoom = roomOf(state, 'ESCAPE_POD_B');
  state.ship.rooms[podRoom]!.isExplored = true;
  putPlayer(state, BOT, podRoom);
}

const generatorAction = (state: GameState, kind: string) =>
  rankedFor(state).find((entry) => entry.candidate.effects.some((produced) => produced.kind === kind));

describe('Гибель при взрыве (стр. 11, 12, 24)', () => {
  it('в открытом пустом Спасательном отсеке взрыв почти не страшен; без целых Капсул — верная гибель', () => {
    const state = atGenerator('blast-pods');
    besidePod(state);
    expect(deathAt(state, 0)).toBeLessThan(0.1);
    for (const pod of Object.values(state.ship.escapePods)) pod.isDestroyed = true;
    expect(deathAt(state, 0)).toBe(1);
  });

  it('запертые Капсулы откроются на жёлтом делении: время на посадку есть, но меньше', () => {
    const state = atGenerator('blast-locked');
    besidePod(state);
    for (const pod of Object.values(state.ship.escapePods)) pod.isLocked = true;
    expect(deathAt(state, 0)).toBeLessThan(0.5);
    state.meta.timeTrackPosition = 13;
    expect(deathAt(state, 0)).toBe(1);
  });
});

describe('Генератор: запуск Самоуничтожения с оглядкой на свою жизнь (стр. 24)', () => {
  it('запуск несёт шанс погибнуть при взрыве как прогноз вреда', () => {
    const state = atGenerator('arm-harm');
    for (const pod of Object.values(state.ship.escapePods)) pod.isDestroyed = true;
    const arm = generatorAction(state, 'SELF_DESTRUCT')!;
    expect(arm.factors.harm).toBeGreaterThanOrEqual(1);
  });

  it('пока кто-то в Анабиозе, запуск не предлагается', () => {
    const state = atGenerator('arm-hibernating');
    state.players['player-1']!.isInHibernation = true;
    expect(generatorAction(state, 'SELF_DESTRUCT')).toBeUndefined();
  });
});

describe('Остановить Самоуничтожение, пока маркер на зелёном (стр. 24)', () => {
  it('на зелёном делении Генератор предлагает останов, задача весит шанс погибнуть при взрыве', () => {
    const state = atGenerator('stop-green');
    state.meta.selfDestructTrackPosition = 1;
    const stop = agendaFor(state).tasks.find((entry) => entry.kind === 'STOP_SELF_DESTRUCT')!;
    expect(stop.weight).toBeCloseTo(LIFELINE * deathAt(state, 1));
    expect(generatorAction(state, 'STOP_SELF_DESTRUCT')).toBeDefined();
    expect(generatorAction(state, 'SELF_DESTRUCT')).toBeUndefined();
  });

  it('на жёлтом делении остановить нельзя — ни задачи, ни Действия', () => {
    const state = atGenerator('stop-yellow');
    state.meta.selfDestructTrackPosition = SELF_DESTRUCT_IRREVERSIBLE_AT;
    expect(agendaFor(state).tasks.some((entry) => entry.kind === 'STOP_SELF_DESTRUCT')).toBe(false);
    expect(generatorAction(state, 'STOP_SELF_DESTRUCT')).toBeUndefined();
  });

  it('бот, чья Цель требует гибели корабля, Самоуничтожение не останавливает', () => {
    const state = atGenerator('stop-saboteur');
    state.meta.selfDestructTrackPosition = 1;
    const bigHunt = PERSONAL_OBJECTIVE_CARDS.find((card) => card.id === 'OBJ_PERSONAL_BIG_HUNT')!;
    state.players[BOT]!.objectives = [bigHunt];
    const view = filterStateForPlayer(state, BOT);
    expect(planObjective(view, neutralMind(state), bigHunt, 1, BOT_TUNING)!.destroysShip).toBe(true);
    expect(agendaFor(state).tasks.some((entry) => entry.kind === 'STOP_SELF_DESTRUCT')).toBe(false);
  });
});

describe('Анабиоз при идущем Самоуничтожении не спасает (стр. 11, 24)', () => {
  it('задача «Лечь в Анабиоз» ничего не стоит, а без Самоуничтожения — стоит', () => {
    const state = botTable('cryo-armed');
    state.meta.timeTrackPosition = 10;
    const hibernate = () => agendaFor(state).tasks.find((entry) => entry.kind === 'HIBERNATE')?.weight ?? 0;
    expect(hibernate()).toBeGreaterThan(0);
    state.meta.selfDestructTrackPosition = 1;
    expect(hibernate()).toBe(0);
  });

  it('в последнем раунде лечь в Анабиоз при взведённом Самоуничтожении — та же гибель, что и Пас', () => {
    const state = botTable('cryo-last');
    standAt(state, BOT, 'HIBERNATORIUM');
    state.meta.timeTrackPosition = 14;
    state.meta.selfDestructTrackPosition = 4;
    const sleep = generatorAction(state, 'HIBERNATE')!;
    expect(sleep.factors.harm).toBeGreaterThanOrEqual(1);
  });
});
