import { describe, expect, it } from 'vitest';
import type { GameState } from '../types/state.js';
import { CARD_OPTION } from '../types/cardOptions.js';
import { contactState } from '../testing/contactFixtures.js';
import { standAt, useConsole } from '../testing/roomFixtures.js';
import { setEngineState } from '../logic/cardEffectsShared.js';
import { GameEngine } from '../logic/fsm.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { BotAgent, createBotMind } from './botAgent.js';
import { earthProbability, priorCoordinatesBelief } from './botBeliefs.js';
import { botSeedOf, effectiveKnobs, generateCharacter } from './botCharacter.js';
import { BOT_MIND_SCHEMA_VERSION, parseBotMind, serializeBotMind, type BotMind } from './botMind.js';
import { observe } from './botObserver.js';
import { BOT_TRAITS, BOT_TUNING } from './botTuning.js';

const BOT = 'player-2';

function mindFor(state: GameState, seed = 'bot-core'): BotMind {
  return createBotMind(seed, BOT, Object.keys(state.players));
}

function seen(state: GameState, mind: BotMind): BotMind {
  return observe(filterStateForPlayer(state, BOT), mind);
}

function toggleEngine(state: GameState, playerId: string, engineNumber: 1 | 2 | 3): GameState {
  const next = structuredClone(state);
  standAt(next, playerId, `ENGINE_0${engineNumber}`);
  const option = next.ship.engines[engineNumber]!.isWorking ? CARD_OPTION.ENGINE_DAMAGE : CARD_OPTION.ENGINE_REPAIR;
  setEngineState(next, playerId, option);
  return next;
}

function inspectEngine(state: GameState, playerId: string, engineNumber: 1 | 2 | 3): GameState {
  const next = structuredClone(state);
  standAt(next, playerId, `ENGINE_0${engineNumber}`);
  return structuredClone(useConsole(next, playerId));
}

describe('Характер бота (план 0.8.0, В8-5-7)', () => {
  it('воспроизводится по сиду, у разных ботов — свой', () => {
    const first = generateCharacter(botSeedOf('seed-a', 'player-2'), 'CREW');
    expect(generateCharacter(botSeedOf('seed-a', 'player-2'), 'CREW')).toEqual(first);
    const others = ['player-3', 'player-4', 'player-5'].map((id) => generateCharacter(botSeedOf('seed-a', id), 'CREW'));
    expect(others.some((other) => JSON.stringify(other.character) !== JSON.stringify(first.character))).toBe(true);
  });

  it('1–3 черты без несовместимых пар, мораль в пределах и смещена вверх двумя бросками', () => {
    const characters = Array.from({ length: 300 }, (_, index) => generateCharacter(`many-${index}`, 'CREW').character);
    for (const character of characters) {
      expect(character.traits.length).toBeGreaterThanOrEqual(1);
      expect(character.traits.length).toBeLessThanOrEqual(3);
      expect(new Set(character.traits).size).toBe(character.traits.length);
      for (const trait of character.traits) {
        for (const other of character.traits) {
          expect(BOT_TUNING.traits.catalog[trait].incompatibleWith).not.toContain(other);
        }
      }
      expect(character.morale).toBeGreaterThanOrEqual(-100);
      expect(character.morale).toBeLessThanOrEqual(100);
      expect(Boolean(character.alterEgo)).toBe(character.traits.includes('SPLIT_PERSONALITY'));
      expect(character.alterEgo?.traits ?? []).not.toContain('SPLIT_PERSONALITY');
    }
    const mean = characters.reduce((sum, character) => sum + character.morale, 0) / characters.length;
    expect(mean).toBeGreaterThan(15);
    expect(new Set(characters.flatMap((character) => character.traits)).size).toBeGreaterThan(BOT_TRAITS.length / 2);
  });

  it('черты и сложность сдвигают ручки: «Склеротик» добавляет шанс забыть, «Паникёр» удваивает риск', () => {
    const base = { traits: [], morale: 0, alterEgo: null, activePersona: 'PRIMARY' as const };
    expect(effectiveKnobs({ ...base, traits: ['FORGETFUL'] }, 'CREW').forgetChance).toBe(1);
    expect(effectiveKnobs({ ...base, traits: ['PANICKER'] }, 'CREW').riskAversion).toBe(2);
    expect(effectiveKnobs(base, 'VETERAN').temperature).toBeLessThan(effectiveKnobs(base, 'NOVICE').temperature);
  });
});

describe('Память бота (В8-5-3)', () => {
  it('сериализуется туда и обратно без потерь', () => {
    const state = inspectEngine(contactState(3, 'mind-roundtrip'), BOT, 2);
    const mind = seen(state, mindFor(state));
    expect(parseBotMind(serializeBotMind(mind))).toEqual(mind);
  });

  it('чужая версия и мусор отклоняются: бот начнёт память заново', () => {
    const mind = mindFor(contactState(2, 'mind-bad'));
    expect(parseBotMind(serializeBotMind({ ...mind, version: BOT_MIND_SCHEMA_VERSION + 1 }))).toBeNull();
    expect(parseBotMind('{"version":1')).toBeNull();
    expect(parseBotMind(JSON.stringify({ ...mind, engines: {} }))).toBeNull();
  });
});

describe('Убеждения о Двигателях (В8-5-5)', () => {
  it('своя Проверка даёт точное знание, чужая — только факт проверки', () => {
    let state = contactState(2, 'belief-check');
    const truth = state.ship.engines[2]!.isWorking;
    state = inspectEngine(state, 'player-1', 2);
    let mind = seen(state, mindFor(state));
    expect(mind.engines['2']).toMatchObject({ known: null, pWorking: 0.5 });
    expect(mind.facts).toContainEqual(expect.objectContaining({ kind: 'ENGINES_CHECKED', playerId: 'player-1' }));
    state = inspectEngine(state, BOT, 2);
    mind = seen(state, mind);
    expect(mind.engines['2']).toMatchObject({ known: truth, source: 'OWN_CHECK' });
  });

  it('после объявления о перестановке бот выводит новое состояние сам: знал S — теперь не S', () => {
    let state = inspectEngine(contactState(2, 'belief-flip'), BOT, 1);
    const truth = state.ship.engines[1]!.isWorking;
    let mind = seen(state, mindFor(state));
    state = toggleEngine(state, 'player-1', 1);
    mind = seen(state, mind);
    expect(mind.engines['1']).toMatchObject({ known: !truth, source: 'INFERRED' });
    expect(mind.facts).toContainEqual(expect.objectContaining({ kind: 'ENGINE_ORDER_CHANGED', engineNumber: 1 }));
  });

  it('своя перестановка не переворачивает знание второй раз', () => {
    let state = contactState(2, 'belief-own-toggle');
    const truth = state.ship.engines[3]!.isWorking;
    state = toggleEngine(state, BOT, 3);
    const mind = seen(state, mindFor(state));
    expect(mind.engines['3']).toMatchObject({ known: !truth, source: 'OWN_TOGGLE' });
  });

  it('Заявление сдвигает незнание пропорционально доверию, но не отменяет свою проверку', () => {
    const engine = new GameEngine();
    const say = (state: GameState, status: 'WORKING' | 'DAMAGED') => {
      const table = structuredClone(state);
      table.meta.activePlayerId = 'player-1';
      return engine.processAction(
        table,
        {
          type: 'ACTION_COMMS',
          payload: { kind: 'CLAIM', to: 'ALL', body: { topic: 'ENGINE_STATUS', engineNumber: 2, status } },
        },
        { actorId: 'player-1' },
      );
    };
    const claimed = seen(say(contactState(2, 'belief-claim'), 'WORKING'), mindFor(contactState(2, 'belief-claim')));
    expect(claimed.engines['2'].pWorking).toBeGreaterThan(0.6);
    expect(claimed.engines['2'].source).toBe('CLAIMS');

    const checked = inspectEngine(contactState(2, 'belief-claim-known'), BOT, 2);
    const truth = checked.ship.engines[2]!.isWorking;
    const mind = seen(say(checked, truth ? 'DAMAGED' : 'WORKING'), mindFor(checked));
    expect(mind.engines['2'].known).toBe(truth);
  });

  it('бот не подглядывает: убеждения собираются из журнала, а не из состояния Двигателей в срезе', () => {
    const state = inspectEngine(contactState(2, 'belief-no-peek'), BOT, 1);
    const mind = seen(state, mindFor(state));
    const hacked = structuredClone(state);
    hacked.ship.engines[1]!.isWorking = !hacked.ship.engines[1]!.isWorking;
    expect(seen(hacked, mindFor(state)).engines).toEqual(mind.engines);
  });
});

describe('Убеждения о Курсе', () => {
  it('до проверки — доли колоды Координат; после своей проверки — точно', () => {
    const prior = priorCoordinatesBelief();
    for (const marker of ['A', 'B', 'C', 'D'] as const) {
      const total = Object.values(prior.byMarker[marker]).reduce((sum, value) => sum + value, 0);
      expect(total).toBeCloseTo(1);
    }
    const state = contactState(2, 'belief-coordinates');
    standAt(state, BOT, 'COCKPIT');
    const next = useConsole(state, BOT, { option: 'CHECK_COORDINATES' });
    const mind = seen(next, mindFor(state));
    expect(mind.coordinates.cardId).toBe(state.ship.coordinates.cardId);
    const marker = state.ship.coordinates.currentCourseMarker;
    expect([0, 1]).toContain(earthProbability(mind.coordinates, marker));
  });
});

describe('Наблюдатель и агент', () => {
  it('«Склеротик» забывает по своему потоку воспроизводимо', () => {
    const state = inspectEngine(contactState(2, 'forgetful'), BOT, 2);
    const base = mindFor(state);
    const forgetful: BotMind = { ...base, character: { ...base.character, traits: ['FORGETFUL'], alterEgo: null } };
    let later = seen(state, forgetful);
    const aged = structuredClone(state);
    aged.meta.currentRound += 12;
    later = seen(aged, later);
    expect(later.engines['2'].known).toBeNull();
    expect(later.rngDraws).toBeGreaterThan(forgetful.rngDraws);
    expect(seen(aged, seen(state, forgetful))).toEqual(later);
    expect(aged.meta.rngDraws.ai).toBe(0);
  });

  it('решение — чистая функция: память на входе не меняется, журнал читается один раз', () => {
    const state = contactState(2, 'agent-pure');
    state.meta.activePlayerId = BOT;
    const view = filterStateForPlayer(state, BOT);
    const mind = mindFor(state);
    const snapshot = structuredClone(mind);
    const decision = BotAgent.decide(view, mind);
    expect(mind).toEqual(snapshot);
    expect(decision.action).not.toBeNull();
    expect(BotAgent.decide(view, mind)).toEqual(decision);
    expect(decision.speech).toEqual([]);
    expect(decision.mind.processedLogSequence).toBe(view.gameLog.at(-1)!.sequence);
    expect(BotAgent.decide(view, decision.mind).mind.facts).toEqual(decision.mind.facts);
  });
});
