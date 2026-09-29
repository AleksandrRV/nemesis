import type { CommsClaim } from '../types/comms.js';
import type { RoomId } from '../types/rooms.js';
import type { CourseMarker, Destination } from '../types/state.js';
import type { BotDifficulty, BotTraitId, RequestTopic, SocialSignal } from './botTuning.js';
import { BOT_DIFFICULTIES, BOT_TRAITS } from './botTuning.js';

/** Версия схемы памяти бота: живёт в сохранении сессии, отдельно от `GameState`. */
export const BOT_MIND_SCHEMA_VERSION = 2;

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

export type SocialScale = 'HONESTY' | 'RELIABILITY' | 'GOODWILL';

export type EvidenceReason =
  | 'CLAIM_CONFIRMED'
  | 'CLAIM_REFUTED_BY_CHECK'
  | 'CLAIM_CONTRADICTED'
  | 'DEED_CLAIM_REFUTED'
  | 'COURSE_CLAIM_SELF_CONTRADICTED'
  | 'PROMISE_FULFILLED'
  | 'PROMISE_BROKEN'
  | 'PROMISE_EXPIRED'
  | 'INTENT_KEPT'
  | 'INTENT_ABANDONED'
  | SocialSignal;

/** Улика: почему шкала сдвинулась. `weight` положителен в пользу игрока, отрицателен — против. */
export interface SocialEvidence {
  round: number;
  scale: SocialScale;
  weight: number;
  reason: EvidenceReason;
}

/** Модель другого игрока (В8-6-1): три Бета-шкалы, скепсис после пойманной лжи и список улик. */
export interface PlayerModel {
  honesty: BetaScale;
  reliability: BetaScale;
  /** Помощь (alpha) против вреда (beta) по делам. */
  goodwill: BetaScale;
  /** 0 — слушает как всех, 1 — пойманный лжец почти не слышен. */
  skepticism: number;
  evidence: SocialEvidence[];
}

export type ClaimVerdict = 'OPEN' | 'CONFIRMED' | 'REFUTED';

/** Заявление другого игрока, которое бот может однажды проверить. `epoch` — число перестановок на момент слов. */
export interface TrackedClaim {
  messageId: string;
  authorId: string;
  to: string;
  round: number;
  body: CommsClaim;
  epoch: number;
  /** Маркер Курса на момент Заявления о Курсе. */
  marker: CourseMarker;
  verdict: ClaimVerdict;
}

/** Намерение другого игрока: цель по графу и расстояние в момент слов. */
export interface TrackedIntent {
  messageId: string;
  authorId: string;
  round: number;
  targetRoomIds: RoomId[];
  startDistance: number;
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
  requesterId: string;
  topic: RequestTopic;
  round: number;
  /** false — сознательный обман: бот не собирался помогать. */
  sincere: boolean;
}

/** Своя ложь: бот держит линию, пока не забудет (В8-6-5). */
export interface OwnLie {
  messageId: string;
  round: number;
  body: CommsClaim;
  epoch: number;
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
  /** Сколько объявлений о перестановке было по каждому Двигателю. */
  engineEpochs: Record<'1' | '2' | '3', number>;
  players: Record<string, PlayerModel>;
  claims: TrackedClaim[];
  intents: TrackedIntent[];
  /** Вероятности Целей других игроков по id карты (В8-6-4); пусто — ещё не оценивались. */
  objectiveGuesses: Record<string, Record<string, number>>;
  /** Накопленный за раунд сдвиг морали: применяется со сменой раунда в пределах шага. */
  pendingMorale: number;
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

function isBeta(value: unknown): value is BetaScale {
  return isRecord(value) && isFiniteNumber(value.alpha) && isFiniteNumber(value.beta);
}

function isPlayerModel(value: unknown): value is PlayerModel {
  return (
    isRecord(value) &&
    isBeta(value.honesty) &&
    isBeta(value.reliability) &&
    isBeta(value.goodwill) &&
    isFiniteNumber(value.skepticism) &&
    Array.isArray(value.evidence)
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
  const { character, engines, coordinates, engineEpochs, players } = value;
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
    isRecord(engineEpochs) &&
    ['1', '2', '3'].every((engine) => isFiniteNumber(engineEpochs[engine])) &&
    isRecord(players) &&
    Object.values(players).every(isPlayerModel) &&
    Array.isArray(value.claims) &&
    Array.isArray(value.intents) &&
    isRecord(value.objectiveGuesses) &&
    isFiniteNumber(value.pendingMorale) &&
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
