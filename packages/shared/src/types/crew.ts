import type { ObjectiveCard } from './cards.js';
import type { CharacterClass } from './entities.js';
import type { GameMode } from './state.js';

/** Кто сидит на месте за столом. Места — описание сессии, а не правило игры. */
export type SeatKind = 'LOCAL_HUMAN' | 'REMOTE_HUMAN' | 'BOT';

export type RoleSelectionMode = 'DRAFT' | 'FREE';

export interface TableSeat {
  seatIndex: number;
  kind: SeatKind;
  /** Подпись места в лобби: «Вы», «Игрок 2», «Бот». */
  label: string;
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
}
