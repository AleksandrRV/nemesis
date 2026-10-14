import { describe, expect, it } from 'vitest';
import type { ContaminationCard } from '../types/cards.js';
import type { ContaminationScanResult, ContaminationScanSource } from '../types/log.js';
import type { GameState } from '../types/state.js';
import { appendGameLog } from '../logic/gameLog.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { BOT, botTable, neutralMind } from '../testing/botTacticsFixtures.js';
import { finalCheckDeath } from './botFinale.js';
import { buildAgenda } from './botGoals.js';
import { isBotMind, type BotMind } from './botMind.js';
import { observe } from './botObserver.js';
import { BOT_TUNING } from './botTuning.js';

function scannedClean(index: number): ContaminationCard {
  return { id: `TEST_CLEAN_${index}`, isInfected: false, isScanned: true };
}

/** После Операции: две проверенные чистыми карты Заражения замешаны в колоду добора. */
function afterSurgery(seed: string, larva = false): GameState {
  const state = botTable(seed);
  const deck = state.players[BOT]!.actionDeck;
  deck.drawPile = [...deck.drawPile, scannedClean(1), scannedClean(2)];
  state.players[BOT]!.hasLarva = larva;
  state.meta.timeTrackPosition = 8;
  return state;
}

function scan(state: GameState, playerId: string, source: ContaminationScanSource, results: ContaminationScanResult[]) {
  appendGameLog(state, { type: 'CONTAMINATION_SCANNED', playerId, source, results, removedCount: 0, outcome: 'CLEAN' });
}

const seen = (state: GameState, mind: BotMind = neutralMind(state)) =>
  observe(filterStateForPlayer(state, BOT), mind, BOT_TUNING);

describe('Память об Операции и Антидоте (стр. 23, 25)', () => {
  it('своя Операция: бот запоминает, сколько карт Заражения осталось — все они чистые', () => {
    const state = afterSurgery('memory-surgery');
    scan(state, BOT, 'SURGERY', ['CLEAN', 'INFECTED', 'CLEAN']);
    expect(seen(state).cleanContamination).toBe(2);
  });

  it('Антидот проверяет всю колоду так же', () => {
    const state = afterSurgery('memory-antidote');
    scan(state, BOT, 'ANTIDOTE', ['CLEAN']);
    expect(seen(state).cleanContamination).toBe(1);
  });

  it('чужая Операция и скан руки память о своей колоде не меняют', () => {
    const state = afterSurgery('memory-other');
    scan(state, 'player-1', 'SURGERY', ['CLEAN', 'CLEAN']);
    scan(state, BOT, 'CANTEEN', ['CLEAN']);
    expect(seen(state).cleanContamination).toBe(0);
  });

  it('память без поля `cleanContamination` из старого сохранения не принимается', () => {
    const older: Partial<BotMind> = { ...neutralMind(botTable('memory-schema')) };
    delete older.cleanContamination;
    expect(isBotMind(older)).toBe(false);
  });
});

describe('Проверенные карты в колоде добора больше не тревожат (стр. 11)', () => {
  it('без памяти скрытые карты Заражения грозят финальной проверкой, с памятью — нет', () => {
    const state = afterSurgery('memory-final');
    const self = filterStateForPlayer(state, BOT).players[BOT]!;
    expect(finalCheckDeath(self)).toBeGreaterThan(0);
    expect(finalCheckDeath(self, 2)).toBe(0);
  });

  it('после Операции задачи «Удалить ИНФЕКЦИЮ» нет — бот не идёт оперироваться снова', () => {
    const state = afterSurgery('memory-cure');
    const view = filterStateForPlayer(state, BOT);
    const cures = (mind: BotMind) => buildAgenda(view, mind, BOT_TUNING).tasks.filter((t) => t.kind === 'CURE');
    expect(cures(neutralMind(state))).toHaveLength(1);
    expect(cures({ ...neutralMind(state), cleanContamination: 2 })).toHaveLength(0);
  });

  it('новая непроверенная карта Заражения снова делает излечение нужным', () => {
    const state = afterSurgery('memory-new');
    state.players[BOT]!.actionDeck.drawPile.push({ id: 'TEST_FRESH', isInfected: false, isScanned: false });
    const view = filterStateForPlayer(state, BOT);
    const mind = { ...neutralMind(state), cleanContamination: 2 };
    expect(buildAgenda(view, mind, BOT_TUNING).tasks.some((t) => t.kind === 'CURE')).toBe(true);
  });

  it('Личинку память не отменяет: её удаление остаётся задачей', () => {
    const state = afterSurgery('memory-larva', true);
    const mind = { ...neutralMind(state), cleanContamination: 2 };
    const tasks = buildAgenda(filterStateForPlayer(state, BOT), mind, BOT_TUNING).tasks;
    expect(tasks.some((t) => t.kind === 'CURE')).toBe(true);
  });
});
