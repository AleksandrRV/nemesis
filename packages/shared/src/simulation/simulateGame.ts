import { activePersona } from '../ai/botCharacter.js';
import { BotAgent, createBotMind } from '../ai/botAgent.js';
import type { BotMind } from '../ai/botMind.js';
import { trustIn } from '../ai/botSocial.js';
import { BOT_TUNING, type BotTuning } from '../ai/botTuning.js';
import type { EngineAction } from '../types/actions.js';
import type { CommsMessage } from '../types/comms.js';
import type { TableSeat } from '../types/crew.js';
import type { EndgameCharacterResult } from '../types/endgame.js';
import type { GameState } from '../types/state.js';
import { crewAssignment, nextBotToPick, pickRandomRole, startCrewSetup } from '../logic/crewSetup.js';
import { GameEngine } from '../logic/fsm.js';
import { filterStateForPlayer } from '../logic/sanitizer.js';
import { createInitialGameState } from '../logic/setup.js';
import { deathCauseAtEndgame, deathsInLog } from './deathCauses.js';
import type {
  BotOutcome,
  BotSpeechStats,
  MoralePoint,
  SimulatedBot,
  SimulatedObjective,
  SimulationOptions,
  SimulationMove,
  SimulationRecord,
} from './simulationTypes.js';

export const DEFAULT_SIMULATION_STEP_LIMIT = 4000;

const engine = new GameEngine();
const PASS: EngineAction = { type: 'ACTION_PASS', payload: {} };

interface BotLedger {
  mind: BotMind;
  actions: Record<string, number>;
  morale: MoralePoint[];
  lies: Set<string>;
}

export function simulationSeats(botCount: number, difficulty: TableSeat['difficulty']): TableSeat[] {
  return Array.from({ length: botCount }, (_, seatIndex) => ({
    seatIndex,
    kind: 'BOT' as const,
    label: `Бот ${seatIndex + 1}`,
    difficulty,
  }));
}

/** Подготовка экипажа как за настоящим столом: номера, Цели, Драфт; роли боты берут броском потока `crew`. */
export function simulationStartState(options: SimulationOptions): GameState {
  let setup = startCrewSetup(
    options.seed,
    simulationSeats(options.botCount, options.difficulty),
    options.roleSelection ?? 'DRAFT',
  );
  for (let botId = nextBotToPick(setup); botId !== null; botId = nextBotToPick(setup)) {
    setup = pickRandomRole(setup, botId);
  }
  return createInitialGameState(options.seed, { crew: crewAssignment(setup) });
}

function actorOf(state: GameState): string | null {
  if (state.meta.phase === 'GAME_OVER') return null;
  return state.pendingDecision?.playerId ?? state.meta.activePlayerId;
}

type Attempt = { state: GameState; error: null } | { state: null; error: string };

function attempt(state: GameState, action: EngineAction, actorId: string): Attempt {
  try {
    return { state: engine.processAction(state, action, { actorId }), error: null };
  } catch (error) {
    return { state: null, error: error instanceof Error ? error.message : String(error) };
  }
}

function recordMorale(ledger: BotLedger, round: number): void {
  const morale = activePersona(ledger.mind.character).morale;
  const last = ledger.morale.at(-1);
  if (last?.round === round) last.morale = morale;
  else ledger.morale.push({ round, morale });
}

function rememberLies(ledger: BotLedger): void {
  for (const lie of ledger.mind.ownLies) ledger.lies.add(lie.messageId);
}

function speechOf(state: GameState, botId: string, ledgers: Record<string, BotLedger>): BotSpeechStats {
  const own = state.comms.messages.filter((message: CommsMessage) => message.authorId === botId);
  const count = (kind: CommsMessage['kind']) => own.filter((message) => message.kind === kind).length;
  const lies = ledgers[botId]!.lies;
  const exposed = new Set(
    Object.values(ledgers).flatMap((ledger) =>
      ledger.mind.claims
        .filter((claim) => claim.authorId === botId && claim.verdict === 'REFUTED' && lies.has(claim.messageId))
        .map((claim) => claim.messageId),
    ),
  );
  const promises = state.comms.commitments.filter((commitment) => commitment.helperId === botId);
  return {
    claims: count('CLAIM'),
    intents: count('INTENT'),
    requests: count('REQUEST'),
    answers: count('ANSWER'),
    lies: lies.size,
    liesExposed: exposed.size,
    promisesMade: promises.length,
    promisesKept: promises.filter((promise) => promise.status === 'FULFILLED').length,
    promisesBroken: promises.filter((promise) => promise.status === 'BROKEN' || promise.status === 'EXPIRED').length,
  };
}

function objectivesOf(state: GameState, result: EndgameCharacterResult | undefined, botId: string) {
  if (result && result.objectiveResults.length > 0) {
    return result.objectiveResults.map((entry): SimulatedObjective => ({
      id: entry.objective.id,
      name: entry.objective.name,
      met: entry.metConditionIndex !== null,
    }));
  }
  return state.players[botId]!.objectives.map((objective): SimulatedObjective => ({
    id: objective.id,
    name: objective.name,
    met: null,
  }));
}

function outcomeOf(result: EndgameCharacterResult | undefined, died: boolean): BotOutcome {
  if (result?.isWinner) return 'WON';
  return died || result?.death ? 'DIED' : 'SURVIVED';
}

function botReport(
  state: GameState,
  botId: string,
  ledgers: Record<string, BotLedger>,
  tuning: BotTuning,
): SimulatedBot {
  const ledger = ledgers[botId]!;
  const player = state.players[botId]!;
  const character = ledger.mind.character;
  const result = state.endgame?.characters.find((entry) => entry.playerId === botId);
  const loggedDeath = deathsInLog(state.gameLog).get(botId);
  const endgameCause = result?.death ? deathCauseAtEndgame(result.death) : null;
  const trust = Object.fromEntries(
    Object.entries(ledger.mind.players).map(([playerId, model]) => [playerId, trustIn(model, tuning)]),
  );
  return {
    playerId: botId,
    orderNumber: player.orderNumber,
    characterClass: player.characterClass,
    characterName: player.name,
    traits: [...character.traits],
    alterTraits: character.alterEgo ? [...character.alterEgo.traits] : null,
    startMorale: ledger.morale[0]?.morale ?? character.morale,
    finalMorale: activePersona(character).morale,
    moraleHistory: ledger.morale,
    objectives: objectivesOf(state, result, botId),
    outcome: outcomeOf(result, player.isDead),
    deathCause: endgameCause ?? loggedDeath?.cause ?? null,
    deathRound: loggedDeath?.round ?? (endgameCause ? state.meta.currentRound : null),
    escapeRoute: result?.escapeRoute ?? null,
    actions: ledger.actions,
    speech: speechOf(state, botId, ledgers),
    trust,
  };
}

/**
 * Партия из одних ботов (план 0.8.0, В8-9-2): каждый бот думает над своим срезом, движок принимает первый
 * допустимый кандидат — ровно как транспорт за настоящим столом. Результат воспроизводим по сиду.
 */
export function simulateGame(options: SimulationOptions): SimulationRecord {
  const stepLimit = options.stepLimit ?? DEFAULT_SIMULATION_STEP_LIMIT;
  const tuning = options.tuning ?? BOT_TUNING;
  let state = simulationStartState(options);
  const botIds = Object.keys(state.players);
  const ledgers: Record<string, BotLedger> = Object.fromEntries(
    botIds.map((botId) => {
      const mind = createBotMind(options.seed, botId, botIds, options.difficulty, tuning);
      const ledger: BotLedger = { mind, actions: {}, morale: [], lies: new Set() };
      recordMorale(ledger, 1);
      return [botId, ledger];
    }),
  );
  const transcript: SimulationMove[] = [];
  let lastRejection: string | null = null;
  const apply = (actorId: string, action: EngineAction): boolean => {
    const next = attempt(state, action, actorId);
    if (!next.state) {
      lastRejection = next.error;
      return false;
    }
    state = next.state;
    if (options.detailed) transcript.push({ actorId, action });
    return true;
  };
  let steps = 0;
  let rejectedActions = 0;
  let stalled = false;
  for (let actorId = actorOf(state); actorId !== null && steps < stepLimit; actorId = actorOf(state)) {
    const ledger = ledgers[actorId]!;
    const decision = BotAgent.decide(filterStateForPlayer(state, actorId), ledger.mind, tuning);
    ledger.mind = decision.mind;
    rememberLies(ledger);
    recordMorale(ledger, state.meta.currentRound);
    for (const draft of decision.speech) apply(actorId, { type: 'ACTION_COMMS', payload: draft });
    const candidates = [decision.action, ...decision.alternatives, PASS].filter(
      (action): action is EngineAction => action !== null,
    );
    let accepted: EngineAction | null = null;
    for (const action of candidates) {
      if (apply(actorId, action)) {
        accepted = action;
        break;
      }
      rejectedActions += 1;
    }
    steps += 1;
    if (!accepted) {
      stalled = true;
      break;
    }
    ledger.actions[accepted.type] = (ledger.actions[accepted.type] ?? 0) + 1;
  }
  return {
    seed: options.seed,
    botCount: options.botCount,
    difficulty: options.difficulty,
    mode: state.meta.gameMode,
    finished: state.meta.phase === 'GAME_OVER',
    stalled,
    stallReason: stalled ? lastRejection : null,
    steps,
    rounds: state.meta.currentRound,
    rejectedActions,
    gameOverReason: state.meta.gameOverReason,
    destination: state.endgame?.destinationReached ?? null,
    shipDestroyed: state.endgame?.shipDestroyed ?? false,
    bots: botIds.map((botId) => botReport(state, botId, ledgers, tuning)),
    finalView: options.detailed ? filterStateForPlayer(state, botIds[0]!) : null,
    transcript: options.detailed ? transcript : null,
  };
}

export function seriesSeed(baseSeed: string, index: number): string {
  return `${baseSeed}#${index + 1}`;
}
