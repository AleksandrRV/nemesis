import type { BotDifficulty, BotTraitId, BotTuning } from '../ai/botTuning.js';
import type { RoleSelectionMode } from '../types/crew.js';
import type { CharacterClass } from '../types/entities.js';
import type { EndgameEscapeRoute } from '../types/endgame.js';
import type { EngineAction } from '../types/actions.js';
import type { SanitizedGameState } from '../types/sanitized.js';
import type { Destination, GameMode, GameOverReason } from '../types/state.js';

/** Параметры одной партии из ботов (план 0.8.0, В8-9-2): 1 бот — Соло, 2–5 — полукооператив. */
export interface SimulationOptions {
  seed: string;
  botCount: number;
  difficulty: BotDifficulty;
  roleSelection?: RoleSelectionMode;
  /** Предел решений партии: партия, которая его не прошла, считается зависшей. */
  stepLimit?: number;
  /** Настройки ботов для балансировки; по умолчанию — `BOT_TUNING`. */
  tuning?: BotTuning;
  /** Подробный отчёт: итоговый срез наблюдателя (журнал, Рация, итоги) и запись всех принятых Действий. */
  detailed?: boolean;
}

/** Отчего погиб Персонаж: во время партии — по журналу, в финале — по проверкам стр. 11. */
export const DEATH_CAUSES = [
  'SURPRISE_ATTACK',
  'ESCAPE_ATTACK',
  'EVENT_ATTACK',
  'MELEE',
  'FIRE',
  'BLEEDING',
  'DECOMPRESSION',
  'INFECTION',
  'EVENT',
  'SHIP_DESTROYED',
  'ENGINES_FAILED',
  'WRONG_COORDINATES',
  'LEFT_ON_BOARD',
  'OTHER',
] as const;
export type DeathCause = (typeof DEATH_CAUSES)[number];

export const BOT_OUTCOMES = ['WON', 'SURVIVED', 'DIED'] as const;
export type BotOutcome = (typeof BOT_OUTCOMES)[number];

export interface MoralePoint {
  round: number;
  morale: number;
}

export interface SimulatedObjective {
  id: string;
  name: string;
  met: boolean | null;
}

/** Слова и обещания бота за партию. */
export interface BotSpeechStats {
  claims: number;
  intents: number;
  requests: number;
  answers: number;
  lies: number;
  /** Ложь, которую другой бот опроверг своей Проверкой. */
  liesExposed: number;
  promisesMade: number;
  promisesKept: number;
  promisesBroken: number;
}

export interface SimulatedBot {
  playerId: string;
  orderNumber: number;
  characterClass: CharacterClass;
  characterName: string;
  traits: BotTraitId[];
  alterTraits: BotTraitId[] | null;
  startMorale: number;
  finalMorale: number;
  moraleHistory: MoralePoint[];
  objectives: SimulatedObjective[];
  outcome: BotOutcome;
  deathCause: DeathCause | null;
  deathRound: number | null;
  escapeRoute: EndgameEscapeRoute | null;
  actions: Record<string, number>;
  speech: BotSpeechStats;
  /** Доверие к остальным в конце партии (0–1). */
  trust: Record<string, number>;
}

/** Принятое движком Действие бота: партию можно проиграть заново тем же `GameEngine`. */
export interface SimulationMove {
  actorId: string;
  action: EngineAction;
}

export interface SimulationRecord {
  seed: string;
  botCount: number;
  difficulty: BotDifficulty;
  mode: GameMode;
  /** Партия дошла до конца (`GAME_OVER`); иначе — зависание или предел шагов. */
  finished: boolean;
  stalled: boolean;
  /** Последний отказ движка, на котором партия встала. */
  stallReason: string | null;
  steps: number;
  rounds: number;
  /** Действия, которые движок отклонил, пока бот не нашёл допустимое. */
  rejectedActions: number;
  gameOverReason: GameOverReason | null;
  destination: Destination | null;
  shipDestroyed: boolean;
  bots: SimulatedBot[];
  /** Итоговый срез наблюдателя (первое место): публичный журнал, Рация и итоги. */
  finalView: SanitizedGameState | null;
  transcript: SimulationMove[] | null;
}

export interface RateStat {
  games: number;
  wins: number;
  survivals: number;
}

export interface SimulationSummary {
  games: number;
  botCount: number;
  difficulty: BotDifficulty;
  finished: number;
  stalled: number;
  stallReasons: Record<string, number>;
  bots: number;
  wins: number;
  survivals: number;
  gamesWithWinner: number;
  averageRounds: number;
  averageSteps: number;
  roundsHistogram: Record<number, number>;
  gameOverReasons: Partial<Record<GameOverReason, number>>;
  deathCauses: Partial<Record<DeathCause, number>>;
  deathRounds: Record<number, number>;
  byTrait: Partial<Record<BotTraitId, RateStat>>;
  byMorale: { label: string; min: number; max: number; stat: RateStat }[];
  byCharacter: Partial<Record<CharacterClass, RateStat>>;
  byEscapeRoute: Partial<Record<EndgameEscapeRoute, number>>;
  speech: BotSpeechStats;
  actions: Record<string, number>;
  rejectedActions: number;
}
