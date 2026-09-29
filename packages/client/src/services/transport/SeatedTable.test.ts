import { describe, expect, it } from 'vitest';
import {
  CORPORATE_OBJECTIVE_CARDS,
  PERSONAL_OBJECTIVE_CARDS,
  createInitialGameState,
  findNoiseTarget,
} from '@nemesis/shared';
import type { GameState, SanitizedCrewSetup, SanitizedGameState, TableSeat, TableSeating } from '@nemesis/shared';

import {
  SESSION_STORAGE_KEY,
  createMemoryStorage,
  createSessionStorage,
  serializeSession,
} from '../session/sessionStorage';
import type { GameEvent } from './ITransport';
import { LocalInMemoryTransport } from './LocalInMemoryTransport';
import { MAX_BOT_REFUSALS } from './SeatController';

function seatingFor(state: GameState, humans: readonly string[]): TableSeating[] {
  return Object.keys(state.players)
    .sort()
    .map((playerId) => ({
      playerId,
      kind: humans.includes(playerId) ? 'LOCAL_HUMAN' : 'BOT',
      label: humans.includes(playerId) ? 'Вы' : 'Бот',
    }));
}

function tableFrom(state: GameState, humans: readonly string[]) {
  const storage = createMemoryStorage();
  storage.setItem(SESSION_STORAGE_KEY, serializeSession(state, seatingFor(state, humans)));
  const transport = new LocalInMemoryTransport({ session: createSessionStorage(storage), playerId: humans[0]! });
  const views: SanitizedGameState[] = [];
  const events: GameEvent[] = [];
  transport.subscribeToState((view) => views.push(view));
  transport.subscribeToEvents((event) => events.push(event));
  void transport.init();
  return { transport, views, events, storage };
}

function runBots(transport: LocalInMemoryTransport, limit = 200): number {
  let steps = 0;
  while (transport.pendingBotId() !== null && steps < limit && transport.stepBot()) steps += 1;
  return steps;
}

function suspendedFirstContact(playerCount: number): GameState {
  const state = createInitialGameState('seated-contact', { playerCount });
  state.ship.rooms[6]!.isExplored = false;
  state.ship.rooms[6]!.explorationEffect = null;
  for (const corridorNumber of [1, 2, 3, 4] as const) {
    const target = findNoiseTarget(state, 6, corridorNumber);
    if (target.kind === 'CORRIDOR') target.corridor.hasNoise = true;
  }
  const token = state.intrudersPool.bag.find((candidate) => candidate.type === 'ADULT')!;
  state.intrudersPool.supply.push(...state.intrudersPool.bag.filter((candidate) => candidate.id !== token.id));
  state.intrudersPool.bag = [{ ...token, escapeNumber: 4 }];
  for (const player of Object.values(state.players)) {
    player.objectives = [
      { ...PERSONAL_OBJECTIVE_CARDS[0]!, id: `${player.id}-one` },
      { ...CORPORATE_OBJECTIVE_CARDS[0]!, id: `${player.id}-two` },
    ];
  }
  return state;
}

describe('Стол с местами: 1 человек + 4 бота (план 0.8.0, В8-2-4)', () => {
  it('партия идёт по кругу: боты пасуют, ход возвращается к человеку, Раунды сменяются', () => {
    const state = createInitialGameState('seated-round', { playerCount: 5 });
    const { transport, views } = tableFrom(state, ['player-1']);
    const startRound = transport.getLocalState().meta.currentRound;

    for (let round = 0; round < 3; round++) {
      runBots(transport);
      expect(transport.pendingBotId()).toBeNull();
      expect(transport.getLocalState().meta.activePlayerId).toBe('player-1');
      transport.sendAction({ type: 'ACTION_PASS', payload: {} });
      runBots(transport);
    }

    expect(transport.getLocalState().meta.currentRound).toBeGreaterThan(startRound);
    expect(views.every((view) => view.viewerId === 'player-1')).toBe(true);
    expect(JSON.stringify(views.at(-1))).not.toContain('"isInfected":true');
  });

  it('действие человека вне его хода отклоняется, ход бота делает только оркестратор', () => {
    const state = createInitialGameState('seated-turn', { playerCount: 3 });
    state.meta.activePlayerId = 'player-2';
    const { transport, events } = tableFrom(state, ['player-1']);
    expect(transport.pendingBotId()).toBe('player-2');
    transport.sendAction({ type: 'ACTION_PASS', payload: {} });
    expect(events.at(-1)?.type).toBe('ACTION_REJECTED');
    expect(transport.stepBot()).toBe(true);
    expect(events.at(-1)).toMatchObject({ type: 'BOT_ACTED', botId: 'player-2' });
  });

  it('решения Первого Контакта приходят всем местам: человек выбирает сам, боты — через оркестратор', () => {
    const state = suspendedFirstContact(5);
    const { transport, views } = tableFrom(state, ['player-1']);
    const player = transport.getLocalState().players['player-1']!;
    transport.sendAction({
      type: 'ACTION_MOVE',
      payload: { targetRoomId: 6, discardCardIds: [player.actionDeck.hand[0]!.id] },
    });

    const asked = new Set<string>();
    for (let guard = 0; guard < 20 && transport.getLocalState().pendingDecision; guard++) {
      const decision = transport.getLocalState().pendingDecision!;
      if (decision.type === 'DISMISS_WINDOW') {
        transport.stepBot();
        continue;
      }
      expect(decision.type).toBe('CHOOSE_OBJECTIVE');
      asked.add(decision.playerId);
      if (decision.playerId === 'player-1') {
        expect(views.at(-1)?.pendingDecision?.type).toBe('CHOOSE_OBJECTIVE');
        transport.sendAction({
          type: 'ACTION_RESOLVE_DECISION',
          payload: { decisionId: decision.id, selectedOption: 'player-1-one' },
        });
      } else {
        expect(transport.pendingBotId()).toBe(decision.playerId);
        transport.stepBot();
      }
    }

    expect([...asked].sort()).toEqual(['player-1', 'player-2', 'player-3', 'player-4', 'player-5']);
    expect(Object.values(transport.getLocalState().players).every((entry) => entry.objectives.length === 1)).toBe(true);
  });

  it('бот, который не может ответить, после трёх отказов пасует, а затем стол сообщает о зависании', () => {
    const state = createInitialGameState('seated-stall', { playerCount: 2 });
    state.meta.activePlayerId = 'player-2';
    state.pendingDecision = {
      id: 'stuck',
      playerId: 'player-2',
      type: 'ROOM_GENERATOR_ACTION',
      currentSelfDestructActive: false,
    };
    const { transport, events } = tableFrom(state, ['player-1']);
    for (let attempt = 0; attempt <= MAX_BOT_REFUSALS + 1; attempt++) transport.stepBot();
    expect(events.at(-1)).toMatchObject({ type: 'BOT_STALLED', botId: 'player-2' });
    expect(transport.stepBot()).toBe(false);
  });

  it('места переживают перезагрузку вкладки', () => {
    const state = createInitialGameState('seated-restore', { playerCount: 3 });
    const { storage } = tableFrom(state, ['player-1']);
    const restored = createSessionStorage(storage).restore();
    expect(restored.seating.map((seat) => seat.kind)).toEqual(['LOCAL_HUMAN', 'BOT', 'BOT']);
  });
});

describe('Стол с местами: память ботов (план 0.8.0, В8-5-3)', () => {
  it('бот думает над своим срезом, а его память переживает перезагрузку вкладки', () => {
    const state = createInitialGameState('seated-minds', { playerCount: 3 });
    const { transport, storage } = tableFrom(state, ['player-1']);
    for (let guard = 0; guard < 6; guard++) {
      if (transport.pendingBotId()) transport.stepBot();
      else transport.sendAction({ type: 'ACTION_PASS', payload: {} });
    }
    const restored = createSessionStorage(storage).restore();
    expect(Object.keys(restored.bots).sort()).toEqual(['player-2', 'player-3']);
    expect(restored.bots['player-2']!.processedLogSequence).toBeGreaterThan(0);
    expect(restored.bots['player-2']!.seed).not.toBe(restored.bots['player-3']!.seed);

    const reloaded = new LocalInMemoryTransport({ session: createSessionStorage(storage), playerId: 'player-1' });
    void reloaded.init();
    expect(createSessionStorage(storage).restore().bots).toEqual(restored.bots);
  });

  it('мысли ботов не сдвигают потоки случайности партии', () => {
    const state = createInitialGameState('seated-minds-rng', { playerCount: 3 });
    state.meta.activePlayerId = 'player-2';
    const { transport } = tableFrom(state, ['player-1']);
    const before = structuredClone(transport.getLocalState().meta.rngDraws);
    transport.stepBot();
    expect(transport.getLocalState().meta.rngDraws.ai).toBe(before.ai);
  });
});

describe('Стол с местами: два человека за одним устройством', () => {
  it('экран переходит к человеку, чей ход, с шторкой передачи устройства', () => {
    const state = createInitialGameState('seated-hotseat', { playerCount: 3 });
    const { transport, events } = tableFrom(state, ['player-1', 'player-3']);
    const active = transport.getLocalState().meta.activePlayerId;
    expect(transport.getViewerId()).toBe(active === 'player-2' ? 'player-1' : active);

    for (let guard = 0; guard < 10 && transport.getViewerId() !== 'player-3'; guard++) {
      if (transport.pendingBotId()) transport.stepBot();
      else transport.sendAction({ type: 'ACTION_PASS', payload: {} });
    }

    expect(events).toContainEqual({ type: 'VIEWER_CHANGED', viewerId: 'player-3', handoff: true });
  });
});

const LOBBY_SEATS: TableSeat[] = [
  { seatIndex: 0, kind: 'LOCAL_HUMAN', label: 'Вы' },
  { seatIndex: 1, kind: 'BOT', label: 'Бот' },
  { seatIndex: 2, kind: 'BOT', label: 'Бот' },
];

function setupTable() {
  const { transport, views, events } = tableFrom(createInitialGameState('lobby-base'), ['player-1']);
  const setups: (SanitizedCrewSetup | null)[] = [];
  transport.subscribeToCrewSetup((setup) => setups.push(setup));
  return { transport, views, events, setups };
}

describe('Стол с местами: подготовка экипажа', () => {
  it('Драфт: Цели видны до выбора, боты выбирают по очереди, экипаж уходит в новую партию', () => {
    const { transport, views, setups } = setupTable();
    transport.beginCrewSetup({ seed: 'lobby-draft', seats: LOBBY_SEATS, roleSelection: 'DRAFT' });
    const first = setups.at(-1)!;
    expect(first.objectives.length).toBeGreaterThan(0);
    expect(Object.values(first.roles).every((role) => role === null)).toBe(true);

    for (let guard = 0; guard < 10 && !setups.at(-1)!.isReady; guard++) {
      const current = setups.at(-1)!;
      if (transport.pendingBotId()) transport.stepBot();
      else transport.pickRole(current.availableRoles[0]!);
    }
    const ready = setups.at(-1)!;
    expect(ready.isReady).toBe(true);
    expect(new Set(Object.values(ready.roles)).size).toBe(3);

    transport.launchCrew();
    expect(setups.at(-1)).toBeNull();
    const human = ready.seats.find((seat) => seat.kind === 'LOCAL_HUMAN')!.playerId;
    expect(views.at(-1)?.viewerId).toBe(human);
    expect(views.at(-1)?.players[human]?.characterClass).toBe(ready.roles[human]);
    expect(views.at(-1)?.players[human]?.objectives).toEqual(ready.objectives);
    expect(transport.getSeating().filter((seat) => seat.kind === 'BOT')).toHaveLength(2);
  });

  it('свободный выбор: занятую роль взять нельзя, боты ждут людей; тайм-аут назначает роль случайно', () => {
    const { transport, events, setups } = setupTable();
    transport.beginCrewSetup({ seed: 'lobby-free', seats: LOBBY_SEATS, roleSelection: 'FREE' });
    expect(transport.pendingBotId()).toBeNull();

    transport.pickRandomRole();
    const afterTimeout = setups.at(-1)!;
    const humanRole = afterTimeout.roles[afterTimeout.viewerId];
    expect(humanRole).not.toBeNull();
    expect(transport.pendingBotId()).not.toBeNull();

    transport.pickRole(humanRole!);
    expect(events.at(-1)?.type).toBe('SETUP_REJECTED');

    runBots(transport);
    expect(setups.at(-1)!.isReady).toBe(true);
    expect(new Set(Object.values(setups.at(-1)!.roles)).size).toBe(3);
  });

  it('запуск до конца выбора отклоняется явной причиной', () => {
    const { transport, events } = setupTable();
    transport.beginCrewSetup({ seed: 'lobby-early', seats: LOBBY_SEATS, roleSelection: 'DRAFT' });
    transport.launchCrew();
    expect(events.at(-1)).toMatchObject({ type: 'SETUP_REJECTED' });
  });
});
