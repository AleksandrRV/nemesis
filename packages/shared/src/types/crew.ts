import type { ObjectiveCard } from './cards.js';
import type { CharacterClass } from './entities.js';
import type { GameMode } from './state.js';

/** Кто сидит на месте за столом. Места — описание сессии, а не правило игры. */
export type SeatKind = 'LOCAL_HUMAN' | 'REMOTE_HUMAN' | 'BOT';

export type RoleSelectionMode = 'DRAFT' | 'FREE';

/** Сложность бота (план 0.8.0, В8-8-3): настройка места, а не правило игры. */
export const BOT_DIFFICULTIES = ['NOVICE', 'CREW', 'VETERAN'] as const;

export type BotDifficulty = (typeof BOT_DIFFICULTIES)[number];

export interface TableSeat {
  seatIndex: number;
  kind: SeatKind;
  /** Подпись места в лобби: «Вы», «Игрок 2», «Бот». */
  label: string;
  /** Только у места бота: пресет сложности. */
  difficulty?: BotDifficulty;
}

/** Место после раздачи карт Памятки (стр. 8, шаг 14): номер игрока решает очередь выбора и Цели «Игрок N». */
export interface CrewSeat extends TableSeat {
  playerId: string;
  orderNumber: number;
}

export interface CrewSetupState {
  seed: string;
  playerCount: number;
  gameMode: GameMode;
  roleSelection: RoleSelectionMode;
  seats: CrewSeat[];
  objectives: Record<string, ObjectiveCard[]>;
  /** Драфт (стр. 8, шаг 17): 2 открытые карты текущего игрока. */
  offers: Record<string, CharacterClass[]>;
  roles: Record<string, CharacterClass | null>;
  pickOrder: string[];
  rngDraws: number;
}

export interface CrewMember {
  playerId: string;
  orderNumber: number;
  characterClass: CharacterClass;
  objectives: ObjectiveCard[];
}

export interface CrewAssignment {
  roleSelection: RoleSelectionMode;
  members: CrewMember[];
  rngDraws: number;
}

/** Место партии после старта: кто управляет Персонажем. */
export interface TableSeating {
  playerId: string;
  kind: SeatKind;
  label: string;
  difficulty?: BotDifficulty;
}

/** Подготовка экипажа глазами одного места: чужие Цели скрыты. */
export interface SanitizedCrewSetup {
  viewerId: string;
  seed: string;
  playerCount: number;
  gameMode: GameMode;
  roleSelection: RoleSelectionMode;
  seats: CrewSeat[];
  objectives: ObjectiveCard[];
  objectiveCounts: Record<string, number>;
  roles: Record<string, CharacterClass | null>;
  pickOrder: string[];
  currentPicker: string | null;
  /** Драфт: 2 карты текущего игрока вскрыты для всех (стр. 8, шаг 17). */
  currentOffer: CharacterClass[];
  availableRoles: CharacterClass[];
  canPick: boolean;
  isReady: boolean;
}
