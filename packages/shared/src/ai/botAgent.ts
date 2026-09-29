import type { EngineAction } from '../types/actions.js';
import type { CommsDraft } from '../types/comms.js';
import type { SanitizedGameState } from '../types/sanitized.js';
import { initialEngineBeliefs, priorCoordinatesBelief } from './botBeliefs.js';
import { botSeedOf, effectiveKnobs, generateCharacter } from './botCharacter.js';
import { BOT_MIND_SCHEMA_VERSION, type BotMind } from './botMind.js';
import { observe } from './botObserver.js';
import { answerRequests } from './botRequests.js';
import { initialPlayerModel } from './botSocial.js';
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
    engineEpochs: { '1': 0, '2': 0, '3': 0 },
    players: Object.fromEntries(
      playerIds
        .filter((playerId) => playerId !== botId)
        .map((playerId) => [playerId, initialPlayerModel(initialTrust)]),
    ),
    claims: [],
    intents: [],
    objectiveGuesses: {},
    pendingMorale: 0,
    ownPromises: [],
    ownLies: [],
    plan: null,
  };
}

/**
 * Решение бота (план 0.8.0, В8-5-2): чистая функция среза и памяти. Сначала наблюдение, затем ответы на
 * Просьбы (В8-6-6) и выбор. До шага 7 выбор делает базовая политика; остальной голос появится на шаге 8.
 */
export const BotAgent = {
  decide(view: SanitizedGameState, mind: BotMind, tuning: BotTuning = BOT_TUNING): BotDecision {
    const answered = answerRequests(view, observe(view, mind, tuning), tuning);
    const action = decidePassiveBotAction(view, mind.botId);
    return { action, alternatives: [], mind: answered.mind, speech: answered.speech };
  },
};
