import { CHARACTERS, MAX_PLAYER_COUNT, MIN_PLAYER_COUNT } from '../data/setup.js';
import type { CrewAssignment, CrewSetupState, RoleSelectionMode, TableSeat } from '../types/crew.js';
import type { CharacterClass } from '../types/entities.js';
import type { GameMode } from '../types/state.js';
import { createRng, shuffle, type Rng } from '../utils/rng.js';
import { EngineError } from './engineErrors.js';
import { dealObjectiveHands } from './objectives.js';

export const DRAFT_OFFER_SIZE = 2;

const ALL_ROLES: readonly CharacterClass[] = CHARACTERS.map((preset) => preset.characterClass);

/** Поток `crew` с продолжением с позиции `start`: подготовка воспроизводится по сиду. */
function crewStream(seed: string, start: number): { rng: Rng; used: () => number } {
  const generator = createRng(seed, 'crew');
  for (let index = 0; index < start; index++) generator();
  let used = start;
  return {
    rng: () => {
      used += 1;
      return generator();
    },
    used: () => used,
  };
}

function gameModeFor(playerCount: number): GameMode {
  return playerCount === MIN_PLAYER_COUNT ? 'SOLO' : 'SEMI_COOP';
}

function isHuman(kind: TableSeat['kind']): boolean {
  return kind !== 'BOT';
}

/**
 * Подготовка экипажа (стр. 8, шаги 14–16): карты Памятки случайно задают номера
 * игроков, затем раздаются Цели — до выбора Персонажа.
 */
export function startCrewSetup(
  seed: string,
  seats: readonly TableSeat[],
  roleSelection: RoleSelectionMode,
): CrewSetupState {
  const playerCount = seats.length;
  if (playerCount < MIN_PLAYER_COUNT || playerCount > MAX_PLAYER_COUNT) {
    throw new EngineError('CREW_NOT_READY', `Партия собирается на ${MIN_PLAYER_COUNT}–${MAX_PLAYER_COUNT} игроков.`);
  }
  const stream = crewStream(seed, 0);
  const numbers = shuffle(
    stream.rng,
    seats.map((_, index) => index + 1),
  );
  const crewSeats = seats.map((seat, index) => ({
    ...seat,
    orderNumber: numbers[index]!,
    playerId: `player-${numbers[index]!}`,
  }));
  const gameMode = gameModeFor(playerCount);
  const hands = dealObjectiveHands(playerCount, gameMode, stream.rng);
  const byNumber = [...crewSeats].sort((left, right) => left.orderNumber - right.orderNumber);
  const humansFirst = roleSelection === 'FREE';
  const pickOrder = [
    ...byNumber.filter((seat) => !humansFirst || isHuman(seat.kind)),
    ...(humansFirst ? byNumber.filter((seat) => !isHuman(seat.kind)) : []),
  ].map((seat) => seat.playerId);
  const setup: CrewSetupState = {
    seed,
    playerCount,
    gameMode,
    roleSelection,
    seats: crewSeats,
    objectives: Object.fromEntries(byNumber.map((seat, index) => [seat.playerId, hands[index]!])),
    offers: {},
    roles: Object.fromEntries(crewSeats.map((seat) => [seat.playerId, null])),
    pickOrder,
    rngDraws: stream.used(),
  };
  return dealDraftOffer(setup);
}

export function takenRoles(state: CrewSetupState): CharacterClass[] {
  return Object.values(state.roles).filter((role): role is CharacterClass => role !== null);
}

function seatOf(state: CrewSetupState, playerId: string) {
  const seat = state.seats.find((entry) => entry.playerId === playerId);
  if (!seat) throw new EngineError('UNKNOWN_PLAYER', `Места ${playerId} за столом нет.`);
  return seat;
}

function humansDone(state: CrewSetupState): boolean {
  return state.seats.every((seat) => !isHuman(seat.kind) || state.roles[seat.playerId] !== null);
}

/** Драфт — строго по номерам; свободный выбор — люди в любом порядке, боты после всех людей. */
export function canPickRole(state: CrewSetupState, playerId: string): boolean {
  if (state.roles[playerId] !== null) return false;
  if (state.roleSelection === 'DRAFT') return currentDraftPicker(state) === playerId;
  return isHuman(seatOf(state, playerId).kind) || humansDone(state);
}

export function currentDraftPicker(state: CrewSetupState): string | null {
  return state.pickOrder.find((playerId) => state.roles[playerId] === null) ?? null;
}

export function nextBotToPick(state: CrewSetupState): string | null {
  return (
    state.pickOrder.find((playerId) => !isHuman(seatOf(state, playerId).kind) && canPickRole(state, playerId)) ?? null
  );
}

/** Какие роли доступны игроку: в Драфте — его 2 открытые карты, в свободном выборе — все незанятые. */
export function availableRoles(state: CrewSetupState, playerId: string): CharacterClass[] {
  if (state.roleSelection === 'DRAFT') return [...(state.offers[playerId] ?? [])];
  const taken = new Set(takenRoles(state));
  return ALL_ROLES.filter((role) => !taken.has(role));
}

/** Драфт (стр. 8, шаг 17): текущий игрок открывает 2 случайные карты из колоды Драфта. */
export function dealDraftOffer(state: CrewSetupState): CrewSetupState {
  const picker = currentDraftPicker(state);
  if (state.roleSelection !== 'DRAFT' || picker === null || state.offers[picker]) return state;
  const taken = new Set(takenRoles(state));
  const stream = crewStream(state.seed, state.rngDraws);
  const offer = shuffle(
    stream.rng,
    ALL_ROLES.filter((role) => !taken.has(role)),
  ).slice(0, DRAFT_OFFER_SIZE);
  return { ...state, offers: { ...state.offers, [picker]: offer }, rngDraws: stream.used() };
}

function assignRole(state: CrewSetupState, playerId: string, role: CharacterClass): CrewSetupState {
  const next = { ...state, roles: { ...state.roles, [playerId]: role } };
  return next.roleSelection === 'DRAFT' ? dealDraftOffer(next) : next;
}

export function pickRole(state: CrewSetupState, playerId: string, role: CharacterClass): CrewSetupState {
  if (!canPickRole(state, playerId)) {
    throw new EngineError('NOT_YOUR_PICK', 'Сейчас выбирать Персонажа не ваша очередь.');
  }
  if (!availableRoles(state, playerId).includes(role)) {
    throw new EngineError('ROLE_NOT_AVAILABLE', 'Этот Персонаж уже занят или не выпал вам в Драфте.');
  }
  return assignRole(state, playerId, role);
}

/** Не успел выбрать или место занял бот: случайная роль из доступных, потоком `crew`. */
export function pickRandomRole(state: CrewSetupState, playerId: string): CrewSetupState {
  if (!canPickRole(state, playerId)) {
    throw new EngineError('NOT_YOUR_PICK', 'Сейчас выбирать Персонажа не ваша очередь.');
  }
  const options = availableRoles(state, playerId);
  const stream = crewStream(state.seed, state.rngDraws);
  const role = shuffle(stream.rng, options)[0]!;
  return assignRole({ ...state, rngDraws: stream.used() }, playerId, role);
}

export function isCrewReady(state: CrewSetupState): boolean {
  return state.seats.every((seat) => state.roles[seat.playerId] !== null);
}

export function crewAssignment(state: CrewSetupState): CrewAssignment {
  if (!isCrewReady(state)) throw new EngineError('CREW_NOT_READY', 'Не все места выбрали Персонажа.');
  return {
    roleSelection: state.roleSelection,
    rngDraws: state.rngDraws,
    members: [...state.seats]
      .sort((left, right) => left.orderNumber - right.orderNumber)
      .map((seat) => ({
        playerId: seat.playerId,
        orderNumber: seat.orderNumber,
        characterClass: state.roles[seat.playerId]!,
        objectives: state.objectives[seat.playerId]!,
      })),
  };
}
