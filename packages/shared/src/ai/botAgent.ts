import type { EngineAction } from '../types/actions.js';
import type { CommsDraft } from '../types/comms.js';
import type { SanitizedGameState } from '../types/sanitized.js';
import { initialEngineBeliefs, priorCoordinatesBelief } from './botBeliefs.js';
import { botSeedOf, effectiveKnobs, generateCharacter } from './botCharacter.js';
import { isBotsTurn, generateCandidates } from './botActions.js';
import { decideChoice } from './botChoices.js';
import { buildAgenda, roomIdsOf } from './botGoals.js';
import { BOT_MIND_SCHEMA_VERSION, type BotMind, type BotPlan } from './botMind.js';
import { observe } from './botObserver.js';
import { answerRequests } from './botRequests.js';
import { initialPlayerModel } from './botSocial.js';
import { BOT_TUNING, type BotDifficulty, type BotTuning } from './botTuning.js';
import { chooseCandidate, scoreCandidates } from './botUtility.js';
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

const MAX_ALTERNATIVES = 8;

function onTurn(
  view: SanitizedGameState,
  mind: BotMind,
  tuning: BotTuning,
): { actions: EngineAction[]; mind: BotMind } {
  const agenda = buildAgenda(view, mind, tuning);
  const candidates = generateCandidates(view, mind, agenda.tasks, tuning);
  if (candidates.length === 0) return { actions: [], mind };
  const chosen = chooseCandidate(scoreCandidates(view, mind, agenda, candidates, tuning), mind, tuning);
  const best = chosen.ordered[0]!;
  const target = best.task ? (roomIdsOf(view, best.task.place)[0] ?? null) : null;
  const plan: BotPlan = {
    desire: best.task?.desire ?? 'SURVIVE',
    targetRoomId: best.candidate.kind === 'MOVE' ? best.candidate.roomId : target,
    sinceRound: view.meta.currentRound,
  };
  const actions = chosen.ordered.slice(0, MAX_ALTERNATIVES).map((entry) => entry.candidate.action);
  if (!actions.some((action) => action.type === 'ACTION_PASS' || action.type === 'ACTION_ESCAPE_POD')) {
    actions.push({ type: 'ACTION_PASS', payload: {} });
  }
  return { actions, mind: { ...chosen.mind, plan } };
}

/**
 * Решение бота (план 0.8.0, В8-5-2, В8-7): чистая функция среза и памяти. Наблюдение, ответы на Просьбы
 * (В8-6-6), затем обязательное решение или ход по Utility. Запасные кандидаты — по убыванию полезности.
 */
export const BotAgent = {
  decide(view: SanitizedGameState, mind: BotMind, tuning: BotTuning = BOT_TUNING): BotDecision {
    const answered = answerRequests(view, observe(view, mind, tuning), tuning);
    const fallback = decidePassiveBotAction(view, mind.botId);
    const choice = decideChoice(view, answered.mind, tuning);
    if (choice) {
      const alternatives = fallback && JSON.stringify(fallback) !== JSON.stringify(choice) ? [fallback] : [];
      return { action: choice, alternatives, mind: answered.mind, speech: answered.speech };
    }
    if (!isBotsTurn(view, mind.botId)) {
      return { action: fallback, alternatives: [], mind: answered.mind, speech: answered.speech };
    }
    const turn = onTurn(view, answered.mind, tuning);
    const [action = fallback, ...alternatives] = turn.actions;
    return { action, alternatives, mind: turn.mind, speech: answered.speech };
  },
};
