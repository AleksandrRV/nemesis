import type { BotDifficulty, GameMode, RoleSelectionMode, SanitizedCrewSetup, TableSeat } from '@nemesis/shared';
import { MAX_PLAYER_COUNT, MIN_PLAYER_COUNT } from '@nemesis/shared';

export const ROLE_PICK_SECONDS = 45;
export const BOT_PICK_DELAY_MS = 1500;
export const BOT_BOOT_MS = 950;

export interface LobbyConfig {
  playerCount: number;
  roleSelection: RoleSelectionMode;
  seed: string;
  botDifficulty: BotDifficulty;
}

export type WaitingSeatStatus = 'YOU' | 'LOCAL' | 'WAITING' | 'BOT';

export interface WaitingSeat {
  seatIndex: number;
  status: WaitingSeatStatus;
}

export const PLAYER_COUNTS: readonly number[] = Array.from(
  { length: MAX_PLAYER_COUNT - MIN_PLAYER_COUNT + 1 },
  (_, index) => MIN_PLAYER_COUNT + index,
);

/** Режимы лобби (план 0.8.0, В8-2-2): полный Кооператив пока не предлагается. */
export type LobbyGameMode = Extract<GameMode, 'SOLO' | 'SEMI_COOP'>;

export function gameModeOf(playerCount: number): LobbyGameMode {
  return playerCount === MIN_PLAYER_COUNT ? 'SOLO' : 'SEMI_COOP';
}

export const GAME_MODE_LABELS: Record<LobbyGameMode, string> = {
  SOLO: 'Соло',
  SEMI_COOP: 'Полукооператив',
};

export const GAME_MODE_HINTS: Record<LobbyGameMode, string> = {
  SOLO: 'Один Персонаж против корабля. Цели — из колоды Соло/Кооперативных Целей.',
  SEMI_COOP: 'Экипаж выживает вместе, но у каждого — тайные Корпоративная и Личная Цели.',
};

export const ROLE_SELECTION_LABELS: Record<RoleSelectionMode, string> = {
  DRAFT: 'Драфт по правилам',
  FREE: 'Свободный выбор',
};

export const ROLE_SELECTION_HINTS: Record<RoleSelectionMode, string> = {
  DRAFT: 'По номерам Памятки: 2 случайные карты Персонажей, одна остаётся, вторая уходит обратно в колоду.',
  FREE: 'Люди выбирают из всех свободных Персонажей, занятые помечены; боты выбирают последними.',
};

export const BOT_DIFFICULTY_LABELS: Record<BotDifficulty, string> = {
  NOVICE: 'Новичок',
  CREW: 'Экипаж',
  VETERAN: 'Ветеран',
};

/** Сложность меняет расчёт, а не правила: черты и Цели у ботов остаются тайной (план 0.8.0, Р-8). */
export const BOT_DIFFICULTY_HINTS: Record<BotDifficulty, string> = {
  NOVICE: 'Действует порывисто, хуже чувствует опасность и чаще забывает увиденное.',
  CREW: 'Обычный член экипажа: взвешивает риск и держит в голове свою Цель.',
  VETERAN: 'Холодный расчёт, точная оценка риска и план на несколько ходов вперёд.',
};

export function initialWaitingSeats(playerCount: number): WaitingSeat[] {
  return Array.from({ length: playerCount }, (_, seatIndex) => ({
    seatIndex,
    status: seatIndex === 0 ? 'YOU' : 'WAITING',
  }));
}

/** Место можно занять человеком за этим же устройством и освободить обратно. */
export function toggleLocalSeat(seats: readonly WaitingSeat[], seatIndex: number): WaitingSeat[] {
  return seats.map((seat) => {
    if (seat.seatIndex !== seatIndex || seat.status === 'YOU' || seat.status === 'BOT') return seat;
    return { ...seat, status: seat.status === 'LOCAL' ? 'WAITING' : 'LOCAL' };
  });
}

/** По «Старт» свободные места занимают боты (план 0.8.0, В8-2-3). */
export function fillWithBots(seats: readonly WaitingSeat[]): WaitingSeat[] {
  return seats.map((seat) => (seat.status === 'WAITING' ? { ...seat, status: 'BOT' } : seat));
}

export function seatLabel(seat: WaitingSeat): string {
  if (seat.status === 'YOU') return 'Вы';
  if (seat.status === 'BOT') return `Бот ${seat.seatIndex + 1}`;
  return `Игрок ${seat.seatIndex + 1}`;
}

export function tableSeatsOf(seats: readonly WaitingSeat[], difficulty: BotDifficulty = 'CREW'): TableSeat[] {
  return fillWithBots(seats).map((seat) =>
    seat.status === 'BOT'
      ? { seatIndex: seat.seatIndex, kind: 'BOT', label: seatLabel(seat), difficulty }
      : { seatIndex: seat.seatIndex, kind: 'LOCAL_HUMAN', label: seatLabel(seat) },
  );
}

export function seatByPlayer(setup: SanitizedCrewSetup, playerId: string | null) {
  return setup.seats.find((seat) => seat.playerId === playerId) ?? null;
}

export function localHumansInOrder(setup: SanitizedCrewSetup): string[] {
  return [...setup.seats]
    .sort((left, right) => left.orderNumber - right.orderNumber)
    .filter((seat) => seat.kind === 'LOCAL_HUMAN')
    .map((seat) => seat.playerId);
}

export function isSeedValid(seed: string): boolean {
  return seed.trim().length > 0 && seed.trim().length <= 64;
}
