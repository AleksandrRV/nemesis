import {
  CORPORATE_OBJECTIVE_CARDS,
  PERSONAL_OBJECTIVE_CARDS,
  SOLO_COOP_OBJECTIVE_CARDS,
  objectivesForPlayerCount,
} from '../data/objectiveCards.js';
import type { ObjectiveCard, ObjectiveKind } from '../types/cards.js';
import type { SanitizedGameLogEvent, SanitizedGameState } from '../types/sanitized.js';
import type { BotMind } from './botMind.js';
import type { BotTuning, ObjectiveClue } from './botTuning.js';

/** Что Цель заставляет делать на виду у всех и против кого она направлена. */
export interface ObjectiveProfile {
  clues: readonly ObjectiveClue[];
  /** «Персонаж Игрока N не должен выжить». */
  targetPlayerNumber: number | null;
  /** Требует гибели других Персонажей или корабля: у такого игрока есть повод лгать и вредить. */
  hostileToCrew: boolean;
}

function profile(
  clues: readonly ObjectiveClue[],
  hostileToCrew = false,
  targetPlayerNumber: number | null = null,
): ObjectiveProfile {
  return { clues, targetPlayerNumber, hostileToCrew };
}

export const OBJECTIVE_PROFILES: Record<string, ObjectiveProfile> = {
  OBJ_PERSONAL_SAVE_PROPERTY: profile([], true),
  OBJ_PERSONAL_OLD_FRIEND: profile([], true),
  OBJ_PERSONAL_QUARANTINE: profile([]),
  OBJ_PERSONAL_TIRELESS_EXPLORER: profile(['SIGNAL_ROOM']),
  OBJ_PERSONAL_DECENT_BURIAL: profile(['SIGNAL_ROOM', 'CARRIES_CORPSE']),
  OBJ_PERSONAL_SCAVENGER: profile([]),
  OBJ_PERSONAL_BIG_HUNT: profile(['SIGNAL_ROOM'], true),
  OBJ_PERSONAL_BEST_FRIENDS: profile([]),
  OBJ_PERSONAL_ALIENS_ON_BOARD: profile(['SIGNAL_ROOM'], true),
  OBJ_CORPORATE_MY_PRECIOUS: profile(['SIGNAL_ROOM', 'CARRIES_EGG']),
  OBJ_CORPORATE_NECROSCOPY: profile(['SIGNAL_ROOM', 'CARRIES_REMAINS', 'LABORATORY']),
  OBJ_CORPORATE_AB_OVO: profile(['CARRIES_EGG', 'LABORATORY']),
  OBJ_CORPORATE_EXTREME_FIELD_BIOLOGY: profile(['LABORATORY']),
  OBJ_CORPORATE_BIDE_YOUR_TIME: profile([], true, 1),
  OBJ_CORPORATE_GREENER_GRASS: profile([], true, 2),
  OBJ_CORPORATE_OLD_FEUD: profile([], true, 3),
  OBJ_CORPORATE_ARMED_TAKEOVER: profile([], true, 4),
  OBJ_CORPORATE_OUTSIDE_INSIGHT: profile([], true, 5),
  OBJ_SOLO_DESTINATION_EARTH: profile([]),
  OBJ_SOLO_AUTOPSY: profile(['CARRIES_CORPSE', 'SURGERY']),
  OBJ_SOLO_CLOSE_CONTACT_PROTOCOL: profile(['LABORATORY']),
  OBJ_SOLO_BEHEAD_THE_ENEMY: profile(['SIGNAL_ROOM'], true),
  OBJ_SOLO_NO_ONE_LEFT_BEHIND: profile(['SIGNAL_ROOM']),
  OBJ_SOLO_SPECIAL_DELIVERY: profile(['CARRIES_EGG']),
  OBJ_SOLO_CLEANUP_CREW: profile(['SIGNAL_ROOM'], true),
};

const CLUE_ROOMS: Partial<Record<ObjectiveClue, string>> = {
  SIGNAL_ROOM: 'COMM_ROOM',
  LABORATORY: 'LABORATORY',
  SURGERY: 'SURGERY',
};

/** Публичный состав колод Целей этой партии (стр. 8, шаг 16; стр. 27). */
function objectiveDecks(view: SanitizedGameState): readonly ObjectiveCard[][] {
  const playerCount = Object.keys(view.players).length;
  if (view.meta.gameMode === 'SOLO' || view.meta.gameMode === 'COOP') return [[...SOLO_COOP_OBJECTIVE_CARDS]];
  return [
    objectivesForPlayerCount(CORPORATE_OBJECTIVE_CARDS, playerCount),
    objectivesForPlayerCount(PERSONAL_OBJECTIVE_CARDS, playerCount),
  ];
}

/** Априорно: каждая карта колоды, кроме своих, одинаково вероятна у каждого другого игрока. */
export function initialObjectiveGuesses(view: SanitizedGameState, botId: string): BotMind['objectiveGuesses'] {
  const own = new Set((view.players[botId]?.objectives ?? []).map((card) => card.id));
  const candidates = objectiveDecks(view)
    .flat()
    .filter((card) => !own.has(card.id));
  return Object.fromEntries(
    Object.keys(view.players)
      .filter((playerId) => playerId !== botId)
      .map((playerId) => [playerId, Object.fromEntries(candidates.map((card) => [card.id, 1]))]),
  );
}

function kindOf(cardId: string): ObjectiveKind | null {
  return (
    [...CORPORATE_OBJECTIVE_CARDS, ...PERSONAL_OBJECTIVE_CARDS, ...SOLO_COOP_OBJECTIVE_CARDS].find(
      (card) => card.id === cardId,
    )?.kind ?? null
  );
}

/** Вероятность, что у игрока есть карта: вес карты среди карт той же колоды. */
export function objectiveProbability(guesses: Record<string, number>, cardId: string): number {
  const kind = kindOf(cardId);
  const weight = guesses[cardId] ?? 0;
  const total = Object.entries(guesses)
    .filter(([id]) => kindOf(id) === kind)
    .reduce((sum, [, value]) => sum + value, 0);
  return total > 0 ? weight / total : 0;
}

function scaled(guesses: Record<string, number>, matches: (card: ObjectiveProfile) => boolean, factor: number) {
  return Object.fromEntries(
    Object.entries(guesses).map(([cardId, weight]) => {
      const cardProfile = OBJECTIVE_PROFILES[cardId];
      return [cardId, cardProfile && matches(cardProfile) ? weight * factor : weight];
    }),
  );
}

function withGuesses(mind: BotMind, playerId: string, guesses: Record<string, number> | undefined): BotMind {
  return guesses ? { ...mind, objectiveGuesses: { ...mind.objectiveGuesses, [playerId]: guesses } } : mind;
}

export function observeObjectiveClue(mind: BotMind, playerId: string, clue: ObjectiveClue, tuning: BotTuning): BotMind {
  const guesses = mind.objectiveGuesses[playerId];
  const factor = tuning.objectives.clueLikelihood[clue];
  return withGuesses(mind, playerId, guesses && scaled(guesses, (card) => card.clues.includes(clue), factor));
}

/** Шаг к игроку или вред ему уточняет Цель «Персонаж Игрока N не должен выжить». */
export function observeTargeting(mind: BotMind, playerId: string, targetPlayerNumber: number, factor: number): BotMind {
  const guesses = mind.objectiveGuesses[playerId];
  return withGuesses(
    mind,
    playerId,
    guesses && scaled(guesses, (card) => card.targetPlayerNumber === targetPlayerNumber, factor),
  );
}

const OBJECT_CLUES: Record<'CORPSE' | 'EGG' | 'INTRUDER_REMAINS', ObjectiveClue> = {
  CORPSE: 'CARRIES_CORPSE',
  EGG: 'CARRIES_EGG',
  INTRUDER_REMAINS: 'CARRIES_REMAINS',
};

function clueOfRoom(definitionId: string | null | undefined): ObjectiveClue | null {
  const entry = Object.entries(CLUE_ROOMS).find(([, roomDefinition]) => roomDefinition === definitionId);
  return entry ? (entry[0] as ObjectiveClue) : null;
}

/** Улика о Цели из записи журнала: поднятый Объект, вход в Радиорубку, Лабораторию или Операционную. */
export function objectiveClueOf(
  event: SanitizedGameLogEvent,
  view: Pick<SanitizedGameState, 'ship'>,
): { playerId: string; clue: ObjectiveClue } | null {
  switch (event.type) {
    case 'OBJECT_PICKED_UP':
      return { playerId: event.playerId, clue: OBJECT_CLUES[event.objectKind] };
    case 'ROOM_ABILITY_USED': {
      const clue = clueOfRoom(event.roomDefinitionId);
      return clue ? { playerId: event.playerId, clue } : null;
    }
    case 'PLAYER_MOVED': {
      const clue = clueOfRoom(view.ship.rooms[event.toRoomId]?.definitionId);
      return clue ? { playerId: event.playerId, clue } : null;
    }
    default:
      return null;
  }
}

/** Вероятность, что Цель игрока направлена против бота (В8-6-4). */
export function threatFrom(mind: BotMind, view: SanitizedGameState, playerId: string): number {
  const guesses = mind.objectiveGuesses[playerId];
  const myNumber = view.players[mind.botId]?.orderNumber;
  if (!guesses || myNumber === undefined) return 0;
  return Object.keys(guesses)
    .filter((cardId) => OBJECTIVE_PROFILES[cardId]?.targetPlayerNumber === myNumber)
    .reduce((sum, cardId) => sum + objectiveProbability(guesses, cardId), 0);
}

export function suspectedEnemies(mind: BotMind, view: SanitizedGameState, tuning: BotTuning): string[] {
  return Object.keys(mind.objectiveGuesses).filter(
    (playerId) => threatFrom(mind, view, playerId) > tuning.objectives.suspicionThreshold,
  );
}

/** Своя Цель требует чужой гибели или гибели корабля: у бота есть повод лгать о Двигателях и Курсе. */
export function ownObjectiveConflict(view: SanitizedGameState, botId: string): boolean {
  const own = view.players[botId]?.objectives ?? [];
  return own.length > 0 && own.every((card) => OBJECTIVE_PROFILES[card.id]?.hostileToCrew === true);
}
