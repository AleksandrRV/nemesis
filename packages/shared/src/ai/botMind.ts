import type { CourseMarker, Destination } from '../types/state.js';
import type { BotDifficulty, BotTraitId } from './botTuning.js';
import { BOT_DIFFICULTIES, BOT_TRAITS } from './botTuning.js';

/** Версия схемы памяти бота: живёт в сохранении сессии, отдельно от `GameState`. */
export const BOT_MIND_SCHEMA_VERSION = 1;

export interface BotPersona {
  traits: BotTraitId[];
  morale: number;
}

export interface BotCharacter extends BotPersona {
  /** «Раздвоение личности»: вторая личность со своими чертами и знаком морали. */
  alterEgo: BotPersona | null;
  activePersona: 'PRIMARY' | 'ALTER';
}

export type EngineBeliefSource = 'PRIOR' | 'OWN_CHECK' | 'OWN_TOGGLE' | 'INFERRED' | 'CLAIMS';

export interface EngineBelief {
  pWorking: number;
  known: boolean | null;
  knownSinceRound: number | null;
  source: EngineBeliefSource;
}

export type DestinationDistribution = Record<Destination, number>;

export interface CoordinatesBelief {
  /** Карта Координат, если бот сам её видел. */
  cardId: string | null;
  byMarker: Record<CourseMarker, DestinationDistribution>;
}

/** Бета-распределение шкалы доверия: успехи и неудачи с априорным весом. */
export interface BetaScale {
  alpha: number;
  beta: number;
}

export interface PlayerModel {
  honesty: BetaScale;
  reliability: BetaScale;
  hostility: number;
  evidence: string[];
}

export type BotFact =
  | { kind: 'MOVED'; round: number; playerId: string; fromRoomId: number; toRoomId: number }
  | { kind: 'ENGINES_CHECKED'; round: number; playerId: string; engineNumbers: number[] }
  | { kind: 'ENGINE_TOUCHED'; round: number; playerId: string; engineNumber: number; orderChanged: boolean }
  | { kind: 'ENGINE_ORDER_CHANGED'; round: number; engineNumber: number }
  | { kind: 'COORDINATES_CHECKED'; round: number; playerId: string }
  | { kind: 'COURSE_SET'; round: number; playerId: string; toMarker: CourseMarker }
  | { kind: 'DOOR'; round: number; playerId: string; corridorId: string; to: string }
  | { kind: 'FIRE_EXTINGUISHED'; round: number; playerId: string; roomId: number }
  | { kind: 'SELF_DESTRUCT'; round: number; playerId: string; active: boolean }
  | { kind: 'POD_LOCK'; round: number; playerId: string; podId: string; locked: boolean }
  | { kind: 'DECOMPRESSION'; round: number; playerId: string; roomId: number }
  | { kind: 'EXCHANGE'; round: number; fromPlayerId: string; toPlayerId: string }
  | { kind: 'INTRUDER_KILLED'; round: number; playerId: string | null; roomId: number }
  | { kind: 'WOUNDED'; round: number; playerId: string; cause: 'FIRE' | 'BLEEDING' | 'ATTACK' }
  | { kind: 'SAID'; round: number; messageId: string; authorId: string | null; messageKind: string };

export interface OwnPromise {
  requestId: string;
  round: number;
}

export interface OwnLie {
  messageId: string;
  topic: string;
  round: number;
}

export interface BotPlan {
  desire: string;
  targetRoomId: number | null;
  sinceRound: number;
}

/** Память бота (план 0.8.0, В8-5-3): сериализуемая, со своей версией схемы. */
export interface BotMind {
  version: number;
  botId: string;
  /** Сид мыслей бота: из него рождается его личный поток `ai`. */
  seed: string;
  difficulty: BotDifficulty;
  character: BotCharacter;
  rngDraws: number;
  processedLogSequence: number;
  processedCommsSequence: number;
  observedRound: number;
  /** Свои перестановки жетонов: их системное объявление не должно переворачивать знание второй раз. */
  pendingOwnAnnouncements: Record<string, number>;
  facts: BotFact[];
  engines: Record<'1' | '2' | '3', EngineBelief>;
  coordinates: CoordinatesBelief;
  players: Record<string, PlayerModel>;
  ownPromises: OwnPromise[];
  ownLies: OwnLie[];
  plan: BotPlan | null;
}

export function serializeBotMind(mind: BotMind): string {
  return JSON.stringify(mind);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPersona(value: unknown): value is BotPersona {
  return (
    isRecord(value) &&
    Array.isArray(value.traits) &&
    value.traits.every((trait) => (BOT_TRAITS as readonly unknown[]).includes(trait)) &&
    isFiniteNumber(value.morale)
  );
}

function isEngineBelief(value: unknown): value is EngineBelief {
  return (
    isRecord(value) &&
    isFiniteNumber(value.pWorking) &&
    (value.known === null || typeof value.known === 'boolean') &&
    typeof value.source === 'string'
  );
}

/** Проверка памяти из сохранения: чужая версия или повреждённая запись — null, бот начнёт память заново. */
export function isBotMind(value: unknown): value is BotMind {
  if (!isRecord(value) || value.version !== BOT_MIND_SCHEMA_VERSION) return false;
  const { character, engines, coordinates } = value;
  return (
    typeof value.botId === 'string' &&
    typeof value.seed === 'string' &&
    (BOT_DIFFICULTIES as readonly unknown[]).includes(value.difficulty) &&
    isRecord(character) &&
    isPersona(character) &&
    (character.alterEgo === null || isPersona(character.alterEgo)) &&
    isFiniteNumber(value.rngDraws) &&
    isFiniteNumber(value.processedLogSequence) &&
    isFiniteNumber(value.processedCommsSequence) &&
    isFiniteNumber(value.observedRound) &&
    isRecord(value.pendingOwnAnnouncements) &&
    Array.isArray(value.facts) &&
    isRecord(engines) &&
    ['1', '2', '3'].every((engine) => isEngineBelief(engines[engine])) &&
    isRecord(coordinates) &&
    isRecord(coordinates.byMarker) &&
    isRecord(value.players) &&
    Array.isArray(value.ownPromises) &&
    Array.isArray(value.ownLies)
  );
}

export function parseBotMind(raw: string): BotMind | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isBotMind(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
