import { describe, expect, it } from 'vitest';
import type { GameState } from '../types/state.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { putIntruder, putPlayer } from '../testing/contactFixtures.js';
import { standAt } from '../testing/roomFixtures.js';
import {
  BOT,
  actionCardOfKind,
  botTable,
  handOf,
  neutralMind,
  rankedFor,
  weaponOf,
} from '../testing/botTacticsFixtures.js';
import { buildAgenda } from './botGoals.js';
import { withRepairValue } from './botRepairs.js';
import { task } from './botTasks.js';
import { BOT_TUNING, type BotTuning } from './botTuning.js';
import { chooseCandidate, type ScoredCandidate } from './botUtility.js';

describe('Ремонт ключевой Комнаты наследует ценность того, что она открывает (стр. 17, 25)', () => {
  function brokenFireControl(seed: string): { state: GameState; fireControl: number } {
    const state = botTable(seed);
    const fireControl = standAt(state, 'player-1', 'FIRE_CONTROL');
    state.ship.rooms[fireControl]!.hasMalfunction = true;
    const burning = Object.values(state.ship.rooms).find((room) => room.isExplored && room.id !== fireControl)!;
    burning.hasFire = true;
    putPlayer(state, 'player-1', burning.id === 11 ? 1 : 11);
    handOf(state, [actionCardOfKind('REPAIR')], 5);
    return { state, fireControl };
  }

  function repairWeight(state: GameState, roomId: number, tuning: BotTuning): number {
    const view = filterStateForPlayer(state, BOT);
    const agenda = buildAgenda(view, neutralMind(state), tuning);
    return agenda.tasks.find((entry) => entry.kind === 'FIX_MALFUNCTION' && entry.detail.roomId === roomId)!.weight;
  }

  it('неисправная Пожарная служба при Пожаре на борту — ремонт дороже: он открывает тушение', () => {
    const { state, fireControl } = brokenFireControl('repair-fire');
    const alone = repairWeight(state, fireControl, {
      ...BOT_TUNING,
      tactics: { ...BOT_TUNING.tactics, repairInheritance: 0 },
    });
    const view = filterStateForPlayer(state, BOT);
    const extinguish = buildAgenda(view, neutralMind(state), BOT_TUNING).tasks.find(
      (entry) => entry.kind === 'EXTINGUISH',
    )!;
    expect(repairWeight(state, fireControl, BOT_TUNING)).toBeGreaterThan(alone);
    expect(extinguish.weight).toBeGreaterThan(0);
  });

  it('задача, которую можно выполнить в другом месте, ремонт не дорожит', () => {
    const { state, fireControl } = brokenFireControl('repair-elsewhere');
    const view = filterStateForPlayer(state, BOT);
    const fix = task('FIX_MALFUNCTION', 'SURVIVE', 1, { roomIds: [fireControl] }, 'Починить Комнату', {
      roomId: fireControl,
    });
    const anywhere = task('EXTINGUISH', 'SURVIVE', 3, { roomIds: [5], definitionIds: ['FIRE_CONTROL'] }, 'Потушить');
    const onlyThere = task('EXTINGUISH', 'SURVIVE', 3, { definitionIds: ['FIRE_CONTROL'] }, 'Потушить');
    expect(withRepairValue(view, [fix, anywhere], BOT_TUNING)[0]!.weight).toBe(1);
    expect(withRepairValue(view, [fix, onlyThere], BOT_TUNING)[0]!.weight).toBeCloseTo(
      1 + 3 * BOT_TUNING.tactics.repairInheritance,
    );
  });
});

describe('Меньше случайности в рискованных решениях', () => {
  function scored(state: GameState): ScoredCandidate[] {
    const [best, second, third] = rankedFor(state);
    return [
      { ...best!, utility: 1, factors: { ...best!.factors, harm: 0 } },
      { ...second!, utility: 0.99, factors: { ...second!.factors, harm: 0.3 } },
      { ...third!, utility: 0.98, factors: { ...third!.factors, harm: 0.02 } },
    ];
  }

  it('Действие заметно опаснее лучшего не разыгрывается, равноценное по риску — разыгрывается', () => {
    const state = botTable('discipline-risk');
    const options = scored(state);
    const picks = new Set<ScoredCandidate>();
    let mind = neutralMind(state);
    for (let draw = 0; draw < 60; draw++) {
      const choice = chooseCandidate(options, mind, BOT_TUNING);
      picks.add(choice.ordered[0]!);
      mind = choice.mind;
    }
    expect(picks.has(options[1]!)).toBe(false);
    expect(picks.has(options[2]!)).toBe(true);
  });

  it('без предела риска случайный выбор доходит и до опасного Действия', () => {
    const state = botTable('discipline-loose');
    const options = scored(state);
    const loose = { ...BOT_TUNING, choice: { ...BOT_TUNING.choice, riskSpread: 10 } };
    const picks = new Set<ScoredCandidate>();
    let mind = neutralMind(state);
    for (let draw = 0; draw < 60; draw++) {
      const choice = chooseCandidate(options, mind, loose);
      picks.add(choice.ordered[0]!);
      mind = choice.mind;
    }
    expect(picks.has(options[1]!)).toBe(true);
  });
});

describe('«Стрельба очередью» (стр. 26): весь Боезапас — только когда это вернее обычных выстрелов', () => {
  function soldier(seed: string, ammo: number, hand: number): GameState {
    const state = botTable(seed);
    const here = state.players[BOT]!.roomId;
    putPlayer(state, 'player-1', 1);
    putIntruder(state, 'ADULT', here);
    state.players[BOT]!.handSlots = [{ source: 'ITEM', card: { ...weaponOf(state), ammo, maxAmmo: 5 } }];
    handOf(state, [actionCardOfKind('BURST_FIRE')], hand);
    return state;
  }

  const bursts = (state: GameState) =>
    rankedFor(state).filter((entry) => JSON.stringify(entry.candidate.action).includes('BURST_SHOOT'));

  it('при двух патронах и полной руке два обычных выстрела вернее «Очереди» — её не предлагают', () => {
    expect(bursts(soldier('burst-weak', 2, 5))).toHaveLength(0);
  });

  it('при полном Боезапасе и двух картах «Очередь» убирает Чужого вернее — её предлагают', () => {
    expect(bursts(soldier('burst-strong', 5, 2)).length).toBeGreaterThan(0);
  });
});
