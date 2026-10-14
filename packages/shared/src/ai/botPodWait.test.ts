import { describe, expect, it } from 'vitest';
import { CORPORATE_OBJECTIVE_CARDS } from '../data/objectiveCards.js';
import { SELF_DESTRUCT_EXPLODES_AT } from '../data/evacuation.js';
import type { GameState } from '../types/state.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { putIntruder, putPlayer } from '../testing/contactFixtures.js';
import { roomOf } from '../testing/roomFixtures.js';
import { BOT, botTable, rankedFor } from '../testing/botTacticsFixtures.js';
import { mindFor, seen, withCharacter } from '../testing/botSocialFixtures.js';
import type { BotMind } from './botMind.js';
import { decideChoice } from './botChoices.js';
import { corridorsAround, otherEnd } from './botGraph.js';
import { waitsForCompanion } from './botPodWait.js';
import { BOT_TUNING } from './botTuning.js';

const ALLY = 'player-1';
const EARLY = 4;

/** Бот только что сел в Капсулу отсека B со свободным местом; товарищ стоит в отсеке и ещё ходит в этом раунде. */
function boardedWithCompanion(seed: string): { state: GameState; podRoom: number } {
  const state = botTable(seed);
  for (const pod of Object.values(state.ship.escapePods)) pod.isLocked = pod.section !== 'B';
  const podRoom = roomOf(state, 'ESCAPE_POD_B');
  state.ship.rooms[podRoom]!.isExplored = true;
  putPlayer(state, BOT, podRoom);
  putPlayer(state, ALLY, podRoom);
  const pod = Object.values(state.ship.escapePods).find((candidate) => candidate.section === 'B')!;
  pod.occupantIds = [BOT];
  const bot = state.players[BOT]!;
  bot.boardedPodId = pod.id;
  bot.boardedRound = state.meta.currentRound;
  bot.objectives = [];
  state.ship.rooms[podRoom]!.occupantPlayerIds = state.ship.rooms[podRoom]!.occupantPlayerIds.filter(
    (id) => id !== BOT,
  );
  state.players[ALLY]!.hasPassed = false;
  state.meta.timeTrackPosition = EARLY;
  state.pendingDecision = { id: 'launch', playerId: BOT, type: 'ESCAPE_POD_LAUNCH_CHOICE', podId: pod.id };
  return { state, podRoom };
}

const mindOf = (state: GameState, morale = 0): BotMind => seen(state, withCharacter(mindFor(state), { morale }));
const waits = (state: GameState, mind: BotMind = mindOf(state)) =>
  waitsForCompanion(filterStateForPlayer(state, BOT), mind, BOT_TUNING);
const launchAnswer = (state: GameState) =>
  decideChoice(filterStateForPlayer(state, BOT), mindOf(state), BOT_TUNING)?.payload;

describe('Совместный взлёт: подождать товарища раунд (стр. 26)', () => {
  it('товарищ в отсеке, рядом тихо — бот ждёт с запуском', () => {
    const { state } = boardedWithCompanion('pod-wait');
    expect(waits(state)).toBe(true);
    expect(launchAnswer(state)).toEqual({ decisionId: 'launch', selectedOption: 'WAIT' });
  });

  it('в соседней Комнате Чужой — взлетать сразу', () => {
    const { state, podRoom } = boardedWithCompanion('pod-neighbour');
    const neighbour = corridorsAround(filterStateForPlayer(state, BOT), podRoom).map((corridor) =>
      otherEnd(corridor, podRoom),
    )[0]!;
    putIntruder(state, 'ADULT', neighbour);
    expect(launchAnswer(state)).toEqual({ decisionId: 'launch', selectedOption: 'LAUNCH' });
  });

  it('товарищ уже спасовал или сам сидит в Капсуле — ждать некого', () => {
    const passed = boardedWithCompanion('pod-passed');
    passed.state.players[ALLY]!.hasPassed = true;
    expect(waits(passed.state)).toBe(false);
    const away = boardedWithCompanion('pod-away');
    putPlayer(away.state, ALLY, 19);
    expect(waits(away.state)).toBe(false);
  });

  it('свободного места нет — ждать незачем', () => {
    const { state } = boardedWithCompanion('pod-full');
    const pod = state.ship.escapePods[state.players[BOT]!.boardedPodId!]!;
    pod.occupantIds = [BOT, 'player-other'];
    expect(waits(state)).toBe(false);
  });

  it('последний раунд или взрыв в Фазе Событий — до следующего хода не дожить', () => {
    const late = boardedWithCompanion('pod-last');
    late.state.meta.timeTrackPosition = 14;
    expect(waits(late.state)).toBe(false);
    const blast = boardedWithCompanion('pod-blast');
    blast.state.meta.selfDestructTrackPosition = SELF_DESTRUCT_EXPLODES_AT - 1;
    expect(waits(blast.state)).toBe(false);
  });

  it('товарища, которому своя Цель велит не выжить, бот не ждёт', () => {
    const { state } = boardedWithCompanion('pod-target');
    const allyNumber = state.players[ALLY]!.orderNumber;
    const feud = CORPORATE_OBJECTIVE_CARDS.find(
      (card) =>
        ['OBJ_CORPORATE_BIDE_YOUR_TIME', 'OBJ_CORPORATE_GREENER_GRASS', 'OBJ_CORPORATE_OLD_FEUD'][allyNumber - 1] ===
        card.id,
    )!;
    state.players[BOT]!.objectives = [structuredClone(feud)];
    expect(waits(state)).toBe(false);
  });

  it('равнодушный к чужому успеху бот (мораль на дне) взлетает сразу', () => {
    const { state } = boardedWithCompanion('pod-selfish');
    expect(waits(state, mindOf(state, -100))).toBe(false);
  });

  it('ждёт лишь раунд посадки: в следующем раунде не ждёт, а запускает', () => {
    const { state } = boardedWithCompanion('pod-next');
    state.pendingDecision = null;
    state.meta.currentRound += 1;
    expect(waits(state)).toBe(false);
    expect(rankedFor(state)[0]!.candidate.action).toEqual({
      type: 'ACTION_ESCAPE_POD',
      payload: { command: 'LAUNCH' },
    });
  });

  it('в раунде посадки бот остаётся в Капсуле, а не выходит из неё', () => {
    const { state } = boardedWithCompanion('pod-stay');
    state.pendingDecision = null;
    expect(rankedFor(state)[0]!.candidate.action).toEqual({ type: 'ACTION_ESCAPE_POD', payload: { command: 'STAY' } });
  });
});
