import { describe, expect, it } from 'vitest';
import type { GameState } from '../types/state.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { putPlayer } from '../testing/contactFixtures.js';
import { roomOf } from '../testing/roomFixtures.js';
import { BOT, agendaFor, botTable, itemOfKind, neutralMind } from '../testing/botTacticsFixtures.js';
import { generateCandidates } from './botActions.js';
import { isRelocation } from './botForecast.js';
import { buildAgenda } from './botGoals.js';
import { boardablePodDefinitions, entryHarm, threatContext } from './botThreat.js';
import { BOT_TUNING, type BotTuning } from './botTuning.js';
import { scoreCandidates } from './botUtility.js';

function podOf(state: GameState, section: 'A' | 'B') {
  return Object.values(state.ship.escapePods).find((pod) => pod.section === section)!;
}

function unlockAllPods(state: GameState): void {
  for (const pod of Object.values(state.ship.escapePods)) pod.isLocked = false;
}

function boardTask(state: GameState) {
  return agendaFor(state).tasks.find((entry) => entry.kind === 'BOARD_POD');
}

describe('Капсулы: цель посадки — только отсек, где можно сесть (стр. 26)', () => {
  it('Капсула отсека A Заблокирована, в B Разблокирована — бот ищет Спасательный отсек B, даже не исследованный', () => {
    const state = botTable('evac-section');
    podOf(state, 'B').isLocked = false;
    expect(boardablePodDefinitions(filterStateForPlayer(state, BOT))).toEqual(['ESCAPE_POD_B']);
    expect(boardTask(state)?.place.definitionIds).toEqual(['ESCAPE_POD_B']);
  });

  it('Разблокированные Капсулы улетели или уничтожены — задачи сесть нет', () => {
    const state = botTable('evac-gone');
    unlockAllPods(state);
    podOf(state, 'A').isLaunched = true;
    podOf(state, 'B').isDestroyed = true;
    expect(boardablePodDefinitions(filterStateForPlayer(state, BOT))).toEqual([]);
    expect(boardTask(state)).toBeUndefined();
  });

  it('Капсула полна — её отсек не цель посадки', () => {
    const state = botTable('evac-full');
    unlockAllPods(state);
    podOf(state, 'A').occupantIds = ['player-1', 'player-1'];
    expect(boardablePodDefinitions(filterStateForPlayer(state, BOT))).toEqual(['ESCAPE_POD_B']);
  });

  it('в Неисправный Спасательный отсек не идут: войти в Капсулу там нельзя', () => {
    const state = botTable('evac-malfunction');
    unlockAllPods(state);
    const podRoom = state.ship.rooms[roomOf(state, 'ESCAPE_POD_A')]!;
    podRoom.isExplored = true;
    podRoom.hasMalfunction = true;
    expect(boardTask(state)?.place.definitionIds).toEqual(['ESCAPE_POD_B']);
  });
});

describe('Осторожность: Осторожное Движение тоже шумит (стр. 15)', () => {
  it('в пустую исследованную Комнату — цена маркера Шума; к союзнику — бесплатно', () => {
    const state = botTable('evac-careful');
    const here = state.players[BOT]!.roomId;
    const corridor = Object.values(state.ship.corridors).find(
      (candidate) => candidate.fromRoomId === here || candidate.toRoomId === here,
    )!;
    const target = corridor.fromRoomId === here ? corridor.toRoomId : corridor.fromRoomId;
    state.ship.rooms[target]!.isExplored = true;
    const alone = filterStateForPlayer(state, BOT);
    const aloneContext = threatContext(alone, alone.players[BOT]!, BOT_TUNING);
    expect(entryHarm(aloneContext, target, 4, true)).toBeCloseTo(BOT_TUNING.tactics.harm.noise);
    putPlayer(state, 'player-1', target);
    const together = filterStateForPlayer(state, BOT);
    expect(entryHarm(threatContext(together, together.players[BOT]!, BOT_TUNING), target, 4, true)).toBe(0);
  });
});

describe('Ручка localWork: Действие на месте против Движения', () => {
  it('надбавка поднимает ценность задачи только у Действий без Движения и Паса', () => {
    const state = botTable('evac-local');
    state.players[BOT]!.seriousWounds = state.decks.seriousWounds.drawPile
      .slice(0, 2)
      .map((wound) => ({ ...wound, kind: 'BACK', isTreated: true }));
    state.players[BOT]!.inventory = [itemOfKind('MEDKIT')];
    const view = filterStateForPlayer(state, BOT);
    const mind = neutralMind(state);
    const agenda = buildAgenda(view, mind, BOT_TUNING);
    const candidates = generateCandidates(view, mind, agenda.tasks, BOT_TUNING);
    const tuned: BotTuning = { ...BOT_TUNING, tactics: { ...BOT_TUNING.tactics, localWork: 0.5 } };
    const plain = new Map(scoreCandidates(view, mind, agenda, candidates, BOT_TUNING).map((e) => [e.candidate, e]));
    const boosted = scoreCandidates(view, mind, agenda, candidates, tuned);
    const local = boosted.filter((entry) => !isRelocation(entry.candidate) && entry.candidate.kind !== 'PASS');
    expect(local.some((entry) => entry.factors.taskValue > 0)).toBe(true);
    for (const entry of boosted) {
      const before = plain.get(entry.candidate);
      if (!before) continue;
      const factor = local.includes(entry) ? 1.5 : 1;
      expect(entry.factors.taskValue).toBeCloseTo(before.factors.taskValue * factor);
    }
  });
});
