import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ACTION_CARDS } from '../data/actionCards.js';
import type { ContaminationCard } from '../types/cards.js';
import type { GameState } from '../types/state.js';
import { GameEngine } from '../logic/fsm.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { contactState, putIntruder, putPlayer } from '../testing/contactFixtures.js';
import { roomOf, standAt } from '../testing/roomFixtures.js';
import { BOT, mindFor, seen, withCharacter } from '../testing/botSocialFixtures.js';
import { botTable, stepBots } from '../testing/botTable.js';
import { generateCandidates } from './botActions.js';
import { effectiveKnobs, personaForRound } from './botCharacter.js';
import { buildAgenda } from './botGoals.js';
import type { BotCharacter, BotMind } from './botMind.js';
import { observe } from './botObserver.js';
import { roomThreat } from './botRisk.js';
import { BOT_TRAITS, BOT_TUNING, type BotTraitId, type TuningKnob } from './botTuning.js';
import { scoreCandidates } from './botUtility.js';

const AI_DIRECTORY = fileURLToPath(new URL('.', import.meta.url));
const TUNING_FILES = new Set(['botTuning.ts', 'botTraitCatalog.ts']);

function onBotTurn(state: GameState): GameState {
  const next = structuredClone(state);
  next.meta.activePlayerId = BOT;
  next.pendingDecision = null;
  next.players[BOT]!.hasPassed = false;
  return next;
}

function botWith(state: GameState, traits: BotTraitId[]): BotMind {
  return seen(state, withCharacter(mindFor(state), { traits }));
}

function ranked(state: GameState, mind: BotMind) {
  const view = filterStateForPlayer(state, BOT);
  const agenda = buildAgenda(view, mind, BOT_TUNING);
  return scoreCandidates(view, mind, agenda, generateCandidates(view, mind, agenda.tasks, BOT_TUNING), BOT_TUNING);
}

function agendaOf(state: GameState, mind: BotMind) {
  return buildAgenda(filterStateForPlayer(state, BOT), mind, BOT_TUNING);
}

function contaminate(state: GameState, count = 1): void {
  for (let index = 0; index < count; index++) {
    const card: ContaminationCard = { id: `CONTAMINATION-test-${index}`, isInfected: false, isScanned: false };
    state.players[BOT]!.actionDeck.hand.push(card);
  }
}

function openNeighbours(state: GameState, roomId: number): number[] {
  return Object.values(state.ship.corridors).flatMap((corridor) => {
    if (corridor.fromRoomId !== roomId && corridor.toRoomId !== roomId) return [];
    corridor.doorState = 'OPEN';
    return [corridor.fromRoomId === roomId ? corridor.toRoomId : corridor.fromRoomId];
  });
}

function farthestRoomFrom(state: GameState, start: number): number {
  const distance = new Map([[start, 0]]);
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const corridor of Object.values(state.ship.corridors)) {
      if (corridor.fromRoomId !== current && corridor.toRoomId !== current) continue;
      const other = corridor.fromRoomId === current ? corridor.toRoomId : corridor.fromRoomId;
      if (distance.has(other)) continue;
      distance.set(other, distance.get(current)! + 1);
      queue.push(other);
    }
  }
  return [...distance.entries()].sort((left, right) => right[1] - left[1])[0]![0];
}

describe('Черты — только модификаторы настроек (план 0.8.0, В8-8-1)', () => {
  it('каждая ручка настроек читается кодом бота: у черты нет «мёртвых» модификаторов', () => {
    const sources = readdirSync(AI_DIRECTORY)
      .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts') && !TUNING_FILES.has(file))
      .map((file) => readFileSync(`${AI_DIRECTORY}${file}`, 'utf8'))
      .join('\n');
    const unread = (Object.keys(BOT_TUNING.knobs) as TuningKnob[]).filter(
      (knob) => !new RegExp(`\\.${knob}\\b`).test(sources),
    );
    expect(unread).toEqual([]);
  });

  it('страх (`fear`) масштабирует только угрозу Чужих: Пожар пугает всех одинаково', () => {
    const state = contactState(2, 'traits-fear');
    const room = state.players[BOT]!.roomId;
    const burning = farthestRoomFrom(state, room);
    putIntruder(state, 'ADULT', room);
    state.ship.rooms[burning]!.hasFire = true;
    const view = filterStateForPlayer(state, BOT);
    expect(roomThreat(view, room, BOT_TUNING, 0.5)).toBeLessThan(roomThreat(view, room, BOT_TUNING, 1));
    expect(roomThreat(view, burning, BOT_TUNING, 0.5)).toBe(roomThreat(view, burning, BOT_TUNING, 1));
    const psychopath = effectiveKnobs(withCharacter(mindFor(state), { traits: ['PSYCHOPATH'] }).character, 'CREW');
    expect(psychopath.fear).toBeLessThan(1);
  });

  it('Заражение на руке рождает желание просканировать её; «Параноик» хочет этого сильнее', () => {
    const state = onBotTurn(contactState(2, 'traits-scan'));
    contaminate(state, 2);
    const scanWeight = (mind: BotMind) =>
      agendaOf(state, mind).tasks.find((entry) => entry.kind === 'SCAN_HAND')?.weight ?? 0;
    const neutral = scanWeight(botWith(state, []));
    expect(neutral).toBeGreaterThan(0);
    expect(scanWeight(botWith(state, ['PARANOID']))).toBeGreaterThan(neutral);
  });

  it('в Столовой бот сканирует руку, и движок принимает этот вариант', () => {
    const state = onBotTurn(contactState(2, 'traits-canteen'));
    standAt(state, BOT, 'CANTEEN');
    contaminate(state);
    const mind = botWith(state, []);
    const scan = ranked(state, mind).find(
      (entry) =>
        entry.candidate.kind === 'ABILITY' && entry.candidate.effects.some((produced) => produced.kind === 'SCAN_HAND'),
    )!;
    expect(scan.candidate.action).toMatchObject({ type: 'ACTION_ROOM_ABILITY', payload: { scanContamination: true } });
    const after = new GameEngine().processAction(state, scan.candidate.action, { actorId: BOT });
    expect(after.players[BOT]!.actionDeck.hand.some((card) => !('characterClass' in card))).toBe(false);
  });

  it('с картой «Отдых» скан не привязан к Комнате, а без Заражения карта не предлагается', () => {
    const state = onBotTurn(contactState(2, 'traits-rest'));
    const rest = ACTION_CARDS.find((card) => card.effect.kind === 'REST')!;
    state.players[BOT]!.actionDeck.hand.push({ ...rest, id: 'rest-for-bot' });
    const clean = ranked(state, botWith(state, []));
    expect(clean.some((entry) => entry.candidate.effects.some((produced) => produced.kind === 'SCAN_HAND'))).toBe(
      false,
    );
    contaminate(state);
    const mind = botWith(state, []);
    expect(agendaOf(state, mind).tasks.find((entry) => entry.kind === 'SCAN_HAND')!.place).toEqual({});
    const play = ranked(state, mind).find((entry) => entry.candidate.kind === 'CARD')!;
    expect(play.candidate.action).toMatchObject({ type: 'ACTION_PLAY_CARD', payload: { cardId: 'rest-for-bot' } });
    expect(() => new GameEngine().processAction(state, play.candidate.action, { actorId: BOT })).not.toThrow();
  });

  it('«Параноик» (`sharedRoomAvoidance`) неохотнее бежит в Комнату, где уже кто-то стоит', () => {
    const state = onBotTurn(contactState(2, 'traits-company'));
    const here = state.players[BOT]!.roomId;
    state.ship.rooms[here]!.hasFire = true;
    const [crowded] = openNeighbours(state, here);
    putPlayer(state, 'player-1', crowded!);
    const moveInto = (mind: BotMind) =>
      ranked(state, mind).find((entry) => entry.candidate.kind === 'MOVE' && entry.candidate.roomId === crowded)!
        .utility;
    expect(moveInto(botWith(state, ['PARANOID']))).toBeLessThan(moveInto(botWith(state, [])));
  });

  it('«Стратег» (`horizon`) ценит шаг к далёкой цели выше обычного бота', () => {
    const state = onBotTurn(contactState(2, 'traits-horizon'));
    state.meta.timeTrackPosition = 13;
    putPlayer(state, BOT, farthestRoomFrom(state, roomOf(state, 'HIBERNATORIUM')));
    const bestStep = (mind: BotMind) =>
      Math.max(
        ...ranked(state, mind)
          .filter((entry) => entry.candidate.kind === 'MOVE')
          .map((entry) => entry.utility),
      );
    expect(bestStep(botWith(state, ['STRATEGIST']))).toBeGreaterThan(bestStep(botWith(state, [])));
  });
});

describe('Раздвоение личности (В8-8-1)', () => {
  const split: BotCharacter = {
    traits: ['SPLIT_PERSONALITY', 'GENIUS'],
    morale: 40,
    alterEgo: { traits: ['PANICKER'], morale: -40 },
    activePersona: 'PRIMARY',
  };

  it('личности сменяются каждые `splitPersonalitySwitchRounds` раундов, ручки — у активной', () => {
    const period = BOT_TUNING.traits.splitPersonalitySwitchRounds;
    expect(personaForRound(split, 1).activePersona).toBe('PRIMARY');
    expect(personaForRound(split, period).activePersona).toBe('PRIMARY');
    const alter = personaForRound(split, period + 1);
    expect(alter.activePersona).toBe('ALTER');
    expect(personaForRound(split, 2 * period + 1).activePersona).toBe('PRIMARY');
    expect(effectiveKnobs(alter, 'CREW').riskAversion).toBe(2);
    expect(effectiveKnobs(split, 'CREW').riskAversion).toBe(1);
  });

  it('бот без раздвоения всегда остаётся собой', () => {
    const plain: BotCharacter = { traits: ['GENIUS'], morale: 0, alterEgo: null, activePersona: 'PRIMARY' };
    expect(personaForRound(plain, 99)).toBe(plain);
  });

  it('наблюдатель переключает личность со сменой раунда', () => {
    const state = contactState(2, 'traits-split');
    const mind = withCharacter(mindFor(state), split);
    state.meta.currentRound = BOT_TUNING.traits.splitPersonalitySwitchRounds + 1;
    expect(observe(filterStateForPlayer(state, BOT), mind).character.activePersona).toBe('ALTER');
  });
});

describe('Черты скрыты (Р-8, В8-8-4)', () => {
  it('ни срез, ни эфир не называют черт ботов: видно только поведение', () => {
    let table = botTable('traits-hidden', 4);
    for (let step = 0; step < 80 && table.state.meta.phase !== 'GAME_OVER'; step++) {
      const next = stepBots(table);
      if (!next) break;
      table = next.table;
    }
    expect(table.state.comms.messages.some((message) => message.authorId !== null)).toBe(true);
    const secrets = BOT_TRAITS.flatMap((trait) => [`"${trait}"`, `"${BOT_TUNING.traits.catalog[trait].label}"`]);
    for (const playerId of Object.keys(table.state.players)) {
      const view = JSON.stringify(filterStateForPlayer(table.state, playerId));
      expect(secrets.filter((secret) => view.includes(secret))).toEqual([]);
    }
  }, 60_000);
});
