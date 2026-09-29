import type { EngineAction } from '../types/actions.js';
import type { CommsDraft } from '../types/comms.js';
import type { SanitizedGameState } from '../types/sanitized.js';
import { initialEngineBeliefs, priorCoordinatesBelief } from './botBeliefs.js';
import { botSeedOf, effectiveKnobs, generateCharacter } from './botCharacter.js';
import { BOT_MIND_SCHEMA_VERSION, type BotMind, type PlayerModel } from './botMind.js';
import { observe } from './botObserver.js';
import { BOT_TUNING, type BotDifficulty, type BotTuning } from './botTuning.js';
import { decidePassiveBotAction } from './passiveBotPolicy.js';

export interface BotDecision {
  /** null — ход или решение сейчас не за этим ботом. */
  action: EngineAction | null;
  /** Следующие кандидаты: если движок откажет, контроллер попробует их по порядку. */
  alternatives: EngineAction[];
  mind: BotMind;
  speech: CommsDraft[];
}

/** Априорная модель другого игрока: доверие по характеру бота, улик пока нет. */
function initialPlayerModel(initialTrust: number): PlayerModel {
  const weight = 2;
  const honesty = Math.min(0.95, Math.max(0.05, initialTrust));
  return {
    honesty: { alpha: honesty * weight, beta: (1 - honesty) * weight },
    reliability: { alpha: honesty * weight, beta: (1 - honesty) * weight },
    hostility: 0,
    evidence: [],
  };
}

/** Память нового бота: характер из его потока `ai`, априорные убеждения и модели остальных игроков. */
export function createBotMind(
  gameSeed: string,
  botId: string,
  playerIds: readonly string[],
  difficulty: BotDifficulty = 'CREW',
  tuning: BotTuning = BOT_TUNING,
): BotMind {
  const seed = botSeedOf(gameSeed, botId);
  const { character, draws } = generateCharacter(seed, difficulty, tuning);
  const initialTrust = tuning.trust.initial * effectiveKnobs(character, difficulty, tuning).initialTrust;
  return {
    version: BOT_MIND_SCHEMA_VERSION,
    botId,
    seed,
    difficulty,
    character,
    rngDraws: draws,
    processedLogSequence: 0,
    processedCommsSequence: 0,
    observedRound: 1,
    pendingOwnAnnouncements: {},
    facts: [],
    engines: initialEngineBeliefs(),
    coordinates: priorCoordinatesBelief(),
    players: Object.fromEntries(
      playerIds
        .filter((playerId) => playerId !== botId)
        .map((playerId) => [playerId, initialPlayerModel(initialTrust)]),
    ),
    ownPromises: [],
    ownLies: [],
    plan: null,
  };
}

/**
 * Решение бота (план 0.8.0, В8-5-2): чистая функция среза и памяти. Сначала наблюдение, затем выбор.
 * До шага 7 выбор делает базовая политика; голос появится на шаге 8.
 */
export const BotAgent = {
  decide(view: SanitizedGameState, mind: BotMind, tuning: BotTuning = BOT_TUNING): BotDecision {
    const observed = observe(view, mind, tuning);
    const action = decidePassiveBotAction(view, mind.botId);
    return { action, alternatives: [], mind: observed, speech: [] };
  },
};
