import { describe, expect, it } from 'vitest';
import type { TableSeat } from '../types/crew.js';
import { expectEngineError } from '../testing/contactFixtures.js';
import {
  DRAFT_OFFER_SIZE,
  availableRoles,
  canPickRole,
  crewAssignment,
  currentDraftPicker,
  isCrewReady,
  nextBotToPick,
  pickRandomRole,
  pickRole,
  startCrewSetup,
  takenRoles,
} from './crewSetup.js';
import { createInitialGameState } from './setup.js';

function seats(kinds: TableSeat['kind'][]): TableSeat[] {
  return kinds.map((kind, seatIndex) => ({
    seatIndex,
    kind,
    label: kind === 'BOT' ? 'Бот' : `Игрок ${seatIndex + 1}`,
  }));
}

function draftAll(seed: string, count: number) {
  let state = startCrewSetup(seed, seats(Array.from({ length: count }, () => 'LOCAL_HUMAN')), 'DRAFT');
  while (!isCrewReady(state)) {
    const picker = currentDraftPicker(state)!;
    state = pickRole(state, picker, availableRoles(state, picker)[0]!);
  }
  return state;
}

describe('Подготовка экипажа (стр. 8, шаги 14–17)', () => {
  it('номера игроков раздаются случайно и воспроизводимо, Цели — до выбора Персонажа', () => {
    const first = startCrewSetup('crew-numbers', seats(['LOCAL_HUMAN', 'BOT', 'BOT']), 'DRAFT');
    const again = startCrewSetup('crew-numbers', seats(['LOCAL_HUMAN', 'BOT', 'BOT']), 'DRAFT');
    expect(first.seats.map((seat) => seat.orderNumber)).toEqual(again.seats.map((seat) => seat.orderNumber));
    expect(first.seats.map((seat) => seat.orderNumber).sort()).toEqual([1, 2, 3]);
    expect(Object.values(first.objectives).every((hand) => hand.length === 2)).toBe(true);
    expect(Object.values(first.roles).every((role) => role === null)).toBe(true);
  });

  it('Соло: 2 Соло/Кооп Цели', () => {
    const solo = startCrewSetup('crew-solo', seats(['LOCAL_HUMAN']), 'FREE');
    expect(solo.gameMode).toBe('SOLO');
    expect(solo.objectives['player-1']!.every((card) => card.kind === 'SOLO_COOP')).toBe(true);
  });

  it('Драфт: по номерам, 2 случайные карты, одна берётся, вторая возвращается в колоду', () => {
    let state = startCrewSetup('crew-draft', seats(['LOCAL_HUMAN', 'LOCAL_HUMAN', 'BOT']), 'DRAFT');
    const first = currentDraftPicker(state)!;
    expect(first).toBe('player-1');
    const offer = availableRoles(state, first);
    expect(offer).toHaveLength(DRAFT_OFFER_SIZE);
    expectEngineError(() => pickRole(state, 'player-2', offer[0]!), 'NOT_YOUR_PICK');

    state = pickRole(state, first, offer[0]!);
    const nextOffer = availableRoles(state, 'player-2');
    expect(nextOffer).toHaveLength(DRAFT_OFFER_SIZE);
    expect(nextOffer).not.toContain(offer[0]);
    expect(takenRoles(state)).toEqual([offer[0]]);
  });

  it('Драфт на 5 игроков раздаёт каждому свою роль', () => {
    const state = draftAll('crew-draft-five', 5);
    expect(new Set(takenRoles(state)).size).toBe(5);
  });

  it('свободный выбор: занятая роль отклоняется, боты выбирают только после всех людей', () => {
    let state = startCrewSetup('crew-free', seats(['LOCAL_HUMAN', 'LOCAL_HUMAN', 'BOT']), 'FREE');
    const [humanA, humanB] = state.seats.filter((seat) => seat.kind !== 'BOT').map((seat) => seat.playerId);
    const bot = state.seats.find((seat) => seat.kind === 'BOT')!.playerId;
    expect(canPickRole(state, bot)).toBe(false);
    expect(nextBotToPick(state)).toBeNull();

    state = pickRole(state, humanB!, 'PILOT');
    expectEngineError(() => pickRole(state, humanA!, 'PILOT'), 'ROLE_NOT_AVAILABLE');
    state = pickRandomRole(state, humanA!);
    expect(nextBotToPick(state)).toBe(bot);
    state = pickRandomRole(state, bot);
    expect(isCrewReady(state)).toBe(true);
    expect(new Set(takenRoles(state)).size).toBe(3);
  });

  it('случайное назначение ролей воспроизводимо по сиду', () => {
    const run = () => {
      let state = startCrewSetup('crew-random', seats(['LOCAL_HUMAN', 'BOT', 'BOT', 'BOT']), 'FREE');
      state = pickRandomRole(state, state.seats[0]!.playerId);
      while (nextBotToPick(state)) state = pickRandomRole(state, nextBotToPick(state)!);
      return state.roles;
    };
    expect(run()).toEqual(run());
  });

  it('партия создаётся из готового экипажа: номера, Персонажи и розданные Цели', () => {
    const setup = draftAll('crew-game', 3);
    const assignment = crewAssignment(setup);
    const state = createInitialGameState('crew-game', { crew: assignment });

    for (const member of assignment.members) {
      const player = state.players[member.playerId]!;
      expect(player.characterClass).toBe(member.characterClass);
      expect(player.orderNumber).toBe(member.orderNumber);
      expect(player.objectives.map((card) => card.id)).toEqual(member.objectives.map((card) => card.id));
    }
    expect(state.meta.gameMode).toBe('SEMI_COOP');
    expect(state.meta.rngDraws.crew).toBe(setup.rngDraws);
  });

  it('незавершённая подготовка не даёт начать партию', () => {
    const setup = startCrewSetup('crew-not-ready', seats(['LOCAL_HUMAN', 'BOT']), 'DRAFT');
    expectEngineError(() => crewAssignment(setup), 'CREW_NOT_READY');
  });
});
