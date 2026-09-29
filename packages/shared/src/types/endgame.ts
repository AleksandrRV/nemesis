import type { ObjectiveCard } from './cards.js';
import type { BoardObject } from './entities.js';
import type { CourseMarker, Destination, EngineNumber, GameOverReason } from './state.js';

/** Что перенесено на конец трека, когда на борту не осталось активных Персонажей (стр. 11). */
export type EndgameFinalMarker = 'SELF_DESTRUCT' | 'TIME';

export type EndgameEscapeRoute = 'POD' | 'HIBERNATION';

/** Почему Персонаж не дожил до проверки Целей (стр. 11). */
export type EndgameDeath =
  'DIED_DURING_GAME' | 'LEFT_ON_BOARD' | 'SHIP_DESTROYED' | 'ENGINES_FAILED' | 'WRONG_COORDINATES' | 'INFECTION';

export type EndgameDrawnCard = 'ACTION' | 'CONTAMINATION';

/** Проверка Заражения (стр. 11, шаг 3): сканирование, затем при ИНФЕКЦИИ или Личинке — 4 карты. */
export interface EndgameInfectionCheck {
  hadLarva: boolean;
  scannedCount: number;
  infectedFound: boolean;
  drawn: EndgameDrawnCard[] | null;
  survived: boolean;
}

export interface EndgameObjectiveResult {
  objective: ObjectiveCard;
  /** Индекс выполненного варианта условия («ИЛИ» на карте) или null. */
  metConditionIndex: number | null;
}

export interface EndgameCharacterResult {
  playerId: string;
  escapeRoute: EndgameEscapeRoute | null;
  death: EndgameDeath | null;
  infection: EndgameInfectionCheck | null;
  /** Карты Целей вскрываются только у дошедших до Проверки Целей (стр. 11, шаг 4). */
  objectiveResults: EndgameObjectiveResult[];
  isWinner: boolean;
}

export interface EndgameEngineCheck {
  engines: Record<EngineNumber, boolean>;
  failedCount: number;
  shipExploded: boolean;
}

export interface EndgameCourseCheck {
  coordinateCardId: string;
  courseMarker: CourseMarker;
  destination: Destination;
}

export interface EndgameFacts {
  hiveDestroyed: boolean;
  queenKilled: boolean;
  allRoomsExplored: boolean;
  studiedObjectKinds: BoardObject['kind'][];
}

export interface EndgameReport {
  cause: GameOverReason;
  finalMarker: EndgameFinalMarker | null;
  shipDestroyed: boolean;
  destinationReached: Destination | null;
  engineCheck: EndgameEngineCheck | null;
  courseCheck: EndgameCourseCheck | null;
  facts: EndgameFacts;
  characters: EndgameCharacterResult[];
}
