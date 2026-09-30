import { describe, expect, it } from 'vitest';
import { BOT_PHRASES, botPhraseById, voicedText } from '../data/botPhrases.js';
import type { CommsDraft } from '../types/comms.js';
import type { GameState } from '../types/state.js';
import { GameEngine } from '../logic/fsm.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { contactState, expectEngineError, putPlayer } from '../testing/contactFixtures.js';
import { roomOf } from '../testing/roomFixtures.js';
import { BOT, inspectEngine, mindFor, say, seen, withCharacter } from '../testing/botSocialFixtures.js';
import { actorOf, botTable, stepBots, tryAction } from '../testing/botTable.js';
import { generateCandidates } from './botActions.js';
import { buildAgenda } from './botGoals.js';
import { planEngineClaim } from './botLying.js';
import type { BotMind } from './botMind.js';
import { toneOf } from './botPhrases.js';
import { BOT_TRAITS, BOT_TUNING, type BotTraitId, type BotTuning } from './botTuning.js';
import { scoreCandidates } from './botUtility.js';
import { speak } from './botVoice.js';

function tuned(comms: Partial<BotTuning['comms']>): BotTuning {
  return { ...BOT_TUNING, comms: { ...BOT_TUNING.comms, ...comms } };
}

const TALKATIVE = tuned({ speakChance: 1, requestChance: 1 });
const SILENT = tuned({ speakChance: 0, requestChance: 0 });

function phraseOf(draft: CommsDraft): string {
  return 'phraseId' in draft && draft.phraseId !== undefined ? draft.phraseId : '';
}

function onBotTurn(state: GameState): GameState {
  const next = structuredClone(state);
  next.meta.activePlayerId = BOT;
  next.pendingDecision = null;
  next.players[BOT]!.hasPassed = false;
  return next;
}

function botWith(state: GameState, traits: BotTraitId[] = []): BotMind {
  return seen(state, withCharacter(mindFor(state), { traits }));
}

function voiceOf(state: GameState, mind: BotMind, tuning: BotTuning = TALKATIVE) {
  return speak(filterStateForPlayer(state, BOT), mind, null, tuning);
}

function sendAll(state: GameState, speech: readonly CommsDraft[]): GameState {
  return speech.reduce(
    (table, draft) => new GameEngine().processAction(table, { type: 'ACTION_COMMS', payload: draft }, { actorId: BOT }),
    state,
  );
}

function checkedEngineTwo(seed: string): GameState {
  return onBotTurn(inspectEngine(contactState(3, seed), BOT, 2));
}

function neighbourOf(state: GameState, roomId: number): number {
  const corridor = Object.values(state.ship.corridors).find(
    (candidate) => candidate.fromRoomId === roomId || candidate.toRoomId === roomId,
  )!;
  corridor.doorState = 'OPEN';
  return corridor.fromRoomId === roomId ? corridor.toRoomId : corridor.fromRoomId;
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

function stepTowardHibernation(state: GameState, mind: BotMind) {
  const view = filterStateForPlayer(state, BOT);
  const agenda = buildAgenda(view, mind, BOT_TUNING);
  const scored = scoreCandidates(
    view,
    mind,
    agenda,
    generateCandidates(view, mind, agenda.tasks, BOT_TUNING),
    BOT_TUNING,
  );
  return scored.find((entry) => entry.candidate.kind === 'MOVE' && entry.task?.kind === 'HIBERNATE');
}

function hibernationTrip(seed: string, far: boolean): GameState {
  const state = onBotTurn(contactState(3, seed));
  state.meta.timeTrackPosition = 13;
  const cryo = roomOf(state, 'HIBERNATORIUM');
  putPlayer(state, BOT, far ? farthestRoomFrom(state, cryo) : neighbourOf(state, cryo));
  return state;
}

describe('Голос бота: Заявление после своей Проверки (план 0.8.0, В8-8-2)', () => {
  it('после Проверки Двигателя бот заявляет по политике лжи, в интонации характера, и движок это принимает', () => {
    const state = checkedEngineTwo('voice-claim');
    const mind = botWith(state, ['PANICKER']);
    const { speech } = voiceOf(state, mind);
    const claim = speech.find((draft) => draft.kind === 'CLAIM')!;
    const plan = planEngineClaim(filterStateForPlayer(state, BOT), mind, 2, TALKATIVE)!;
    expect(claim).toMatchObject({ kind: 'CLAIM', to: 'ALL', body: plan.draft.body });
    expect(botPhraseById(phraseOf(claim))).toMatchObject({
      kind: 'CLAIM',
      tone: 'NERVOUS',
    });
    const told = sendAll(state, speech);
    expect(told.comms.messages.at(-1)).toMatchObject({ authorId: BOT, phraseId: phraseOf(claim) });
  });

  it('о той же Проверке бот не повторяется', () => {
    const state = checkedEngineTwo('voice-claim-once');
    const mind = botWith(state);
    const first = voiceOf(state, mind).speech.find((draft) => draft.kind === 'CLAIM')!;
    const told = say(state, BOT, first);
    const again = voiceOf(onBotTurn(told), seen(told, mind));
    expect(again.speech.some((draft) => draft.kind === 'CLAIM')).toBe(false);
  });

  it('молчание — тоже решение: без шанса говорить бот молчит и не тратит бросков', () => {
    const state = checkedEngineTwo('voice-silent');
    const mind = botWith(state);
    const silent = voiceOf(state, mind, SILENT);
    expect(silent.speech).toEqual([]);
    const quiet = voiceOf(contactState(3, 'voice-nothing'), botWith(contactState(3, 'voice-nothing')));
    expect(quiet.mind.rngDraws).toBe(botWith(contactState(3, 'voice-nothing')).rngDraws);
  });

  it('в одиночку бот не говорит: слушать некому', () => {
    const state = onBotTurn(inspectEngine(contactState(2, 'voice-alone'), BOT, 2));
    state.players['player-1']!.isDead = true;
    expect(voiceOf(state, botWith(state)).speech).toEqual([]);
  });
});

describe('Голос бота: Намерение перед дальним походом', () => {
  it('объявляет цель дальнего пути, по которому действительно идёт', () => {
    const state = hibernationTrip('voice-intent', true);
    const mind = botWith(state);
    const step = stepTowardHibernation(state, mind)!;
    const { speech } = speak(filterStateForPlayer(state, BOT), mind, step, TALKATIVE);
    const intent = speech.find((draft) => draft.kind === 'INTENT')!;
    expect(intent).toMatchObject({ kind: 'INTENT', to: 'ALL', body: { topic: 'GO_TO_HIBERNATION' } });
    expect(botPhraseById(phraseOf(intent))?.kind).toBe('INTENT');
    expect(() => sendAll(state, speech)).not.toThrow();
  });

  it('короткий шаг и вредительство не объявляются', () => {
    const near = hibernationTrip('voice-intent-near', false);
    const nearMind = botWith(near);
    const nearStep = stepTowardHibernation(near, nearMind);
    const nearSpeech = nearStep ? speak(filterStateForPlayer(near, BOT), nearMind, nearStep, TALKATIVE).speech : [];
    expect(nearSpeech.some((draft) => draft.kind === 'INTENT')).toBe(false);

    const far = hibernationTrip('voice-intent-secret', true);
    const mind = botWith(far);
    const step = stepTowardHibernation(far, mind)!;
    const sabotage = { ...step, task: { ...step.task!, desire: 'SABOTAGE' as const } };
    const { speech } = speak(filterStateForPlayer(far, BOT), mind, sabotage, TALKATIVE);
    expect(speech.some((draft) => draft.kind === 'INTENT')).toBe(false);
  });
});

describe('Голос бота: Просьба при нехватке ресурса', () => {
  it('Пожар в своей Комнате — просьба потушить; пока она открыта, новой нет', () => {
    const state = onBotTurn(contactState(3, 'voice-fire'));
    state.ship.rooms[state.players[BOT]!.roomId]!.hasFire = true;
    const mind = botWith(state);
    const { speech } = voiceOf(state, mind);
    const request = speech.find((draft) => draft.kind === 'REQUEST')!;
    expect(request).toMatchObject({ body: { topic: 'EXTINGUISH', roomId: state.players[BOT]!.roomId } });
    const asked = sendAll(state, speech);
    const again = voiceOf(onBotTurn(asked), seen(asked, mind));
    expect(again.speech.some((draft) => draft.kind === 'REQUEST')).toBe(false);
  });

  it('частоту Просьб задаёт ручка `requestRate`: «Эгоцентрист» при шансе ½ просит всегда', () => {
    const halfChance = tuned({ requestChance: 0.5 });
    for (const seed of ['voice-ask-1', 'voice-ask-2', 'voice-ask-3', 'voice-ask-4']) {
      const state = onBotTurn(contactState(3, seed));
      state.ship.rooms[state.players[BOT]!.roomId]!.hasFire = true;
      const { speech } = voiceOf(state, botWith(state, ['EGOCENTRIST']), halfChance);
      expect(speech.some((draft) => draft.kind === 'REQUEST')).toBe(true);
    }
  });
});

describe('Банк фраз', () => {
  it('у каждой интонации есть фразы на каждый тип сообщения, и каждая вставляет текст сообщения', () => {
    for (const phrase of BOT_PHRASES) expect(phrase.template).toContain('{text}');
    expect(new Set(BOT_PHRASES.map((phrase) => phrase.id)).size).toBe(BOT_PHRASES.length);
    expect(voicedText(BOT_PHRASES[0]!.id, 'Двигатель №1 исправен.')).toContain('Двигатель №1 исправен.');
    expect(voicedText(undefined, 'Иду в Анабиоз.')).toBe('Иду в Анабиоз.');
  });

  it('фразы не называют черт: характер слышен в подаче, но не раскрывается (Р-8)', () => {
    const labels = BOT_TRAITS.map((trait) => BOT_TUNING.traits.catalog[trait].label.toLowerCase());
    for (const phrase of BOT_PHRASES) {
      for (const label of labels) expect(phrase.template.toLowerCase()).not.toContain(label);
    }
  });

  it('интонация — от черты активной личности, без черты с голосом — от морали', () => {
    const base = { alterEgo: null, activePersona: 'PRIMARY' as const };
    expect(toneOf({ ...base, traits: ['PANICKER'], morale: 0 }, BOT_TUNING)).toBe('NERVOUS');
    expect(toneOf({ ...base, traits: ['EXPLORER'], morale: 80 }, BOT_TUNING)).toBe('WARM');
    expect(toneOf({ ...base, traits: ['EXPLORER'], morale: -80 }, BOT_TUNING)).toBe('COLD');
    expect(toneOf({ ...base, traits: ['EXPLORER'], morale: 0 }, BOT_TUNING)).toBe('CALM');
  });

  it('движок отклоняет чужую или неизвестную фразу явной ошибкой', () => {
    const state = onBotTurn(contactState(3, 'voice-engine'));
    const claim: CommsDraft = { kind: 'CLAIM', to: 'ALL', body: { topic: 'NOT_INFECTED' } };
    const send = (draft: CommsDraft) =>
      new GameEngine().processAction(state, { type: 'ACTION_COMMS', payload: draft }, { actorId: BOT });
    expectEngineError(() => send({ ...claim, phraseId: 'NO_SUCH_PHRASE' }), 'COMMS_FORBIDDEN');
    expectEngineError(() => send({ ...claim, phraseId: 'INTENT_CALM_1' }), 'COMMS_FORBIDDEN');
    expect(send({ ...claim, phraseId: 'CLAIM_CALM_1' }).comms.messages.at(-1)).toMatchObject({
      phraseId: 'CLAIM_CALM_1',
    });
  });
});

describe('Голос за столом ботов', () => {
  it('боты говорят сами, и каждая их реплика проходит проверки Рации', () => {
    let table = botTable('voice-table', 4);
    let voiced = 0;
    for (let step = 0; step < 160 && table.state.meta.phase !== 'GAME_OVER'; step++) {
      const actorId = actorOf(table.state);
      const next = stepBots(table);
      if (!next || !actorId) break;
      let state = table.state;
      for (const draft of next.decision.speech) {
        const said = tryAction(state, { type: 'ACTION_COMMS', payload: draft }, actorId);
        expect(said, JSON.stringify(draft)).not.toBeNull();
        state = said!;
        if ('phraseId' in draft && draft.phraseId) voiced += 1;
      }
      table = next.table;
    }
    expect(voiced).toBeGreaterThan(0);
  }, 60_000);
});
