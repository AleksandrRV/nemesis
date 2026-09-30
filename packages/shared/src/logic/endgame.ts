import type { ActionDeckCard, ContaminationCard } from '../types/cards.js';
import type { PlayerState } from '../types/entities.js';
import type {
  EndgameCharacterResult,
  EndgameCourseCheck,
  EndgameDeath,
  EndgameEngineCheck,
  EndgameFacts,
  EndgameFinalMarker,
  EndgameInfectionCheck,
  EndgameReport,
} from '../types/endgame.js';
import type { Destination, EngineNumber, GameOverReason, GameState } from '../types/state.js';
import { current, isDraft } from 'immer';
import { coursedDestination } from '../data/coordinateCards.js';
import { SELF_DESTRUCT_EXPLODES_AT } from '../data/evacuation.js';
import { TIME_TRACK_LENGTH } from '../data/setup.js';
import { drawFromStream, shuffle } from '../utils/rng.js';
import { killPlayer } from './characterDamage.js';
import { metObjectiveCondition, type ObjectiveContext } from './objectiveConditions.js';

export const FINAL_INFECTION_DRAW = 4;
export const ENGINE_FAILURES_TO_EXPLODE = 2;
const QUARANTINE_OBJECTIVE_ID = 'OBJ_PERSONAL_QUARANTINE';

/** Гибель всех на борту: Персонажи в запущенных Капсулах уже вне корабля (стр. 11, 24). */
export function killEveryoneAboard(state: GameState, includeHibernation: boolean): void {
  for (const player of Object.values(state.players)) {
    if (player.isDead || player.hasEscapedInPod) continue;
    if (!includeHibernation && player.isInHibernation) continue;
    killPlayer(state, player.id);
  }
}

function isShipDestroyedBy(reason: GameOverReason): boolean {
  return reason === 'SHIP_EXPLODED' || reason === 'HULL_BREACH';
}

/** Никого не осталось: маркер Самоуничтожения (если процесс идёт) или Времени — на последнее поле (стр. 11). */
function moveFinalMarker(state: GameState): EndgameFinalMarker {
  if (state.meta.selfDestructTrackPosition !== null) {
    state.meta.selfDestructTrackPosition = SELF_DESTRUCT_EXPLODES_AT;
    return 'SELF_DESTRUCT';
  }
  state.meta.timeTrackPosition = TIME_TRACK_LENGTH;
  return 'TIME';
}

function orderedPlayers(state: GameState): PlayerState[] {
  return Object.values(state.players).sort((left, right) => left.orderNumber - right.orderNumber);
}

function isSurvivor(player: PlayerState): boolean {
  return !player.isDead && (player.isInHibernation || player.hasEscapedInPod);
}

function checkEngines(state: GameState): EndgameEngineCheck {
  const engines = {
    1: state.ship.engines[1].isWorking,
    2: state.ship.engines[2].isWorking,
    3: state.ship.engines[3].isWorking,
  } satisfies Record<EngineNumber, boolean>;
  const failedCount = Object.values(engines).filter((isWorking) => !isWorking).length;
  return { engines, failedCount, shipExploded: failedCount >= ENGINE_FAILURES_TO_EXPLODE };
}

function checkCourse(state: GameState): EndgameCourseCheck {
  const { cardId, currentCourseMarker } = state.ship.coordinates;
  return {
    coordinateCardId: cardId,
    courseMarker: currentCourseMarker,
    destination: coursedDestination(cardId, currentCourseMarker),
  };
}

function isContamination(card: ActionDeckCard): card is ContaminationCard {
  return !('characterClass' in card);
}

function checkInfection(state: GameState, player: PlayerState): EndgameInfectionCheck {
  const deck = player.actionDeck;
  const allCards = [...deck.hand, ...deck.drawPile, ...deck.discard];
  const contamination = allCards.filter(isContamination);
  const hadLarva = player.hasLarva;
  const scanned = hadLarva ? [] : contamination;
  for (const card of scanned) card.isScanned = true;
  const infectedFound = scanned.some((card) => card.isInfected);
  if (!hadLarva && !infectedFound) {
    return { hadLarva, scannedCount: scanned.length, infectedFound, drawn: null, survived: true };
  }
  const reshuffled = shuffle(() => {
    const value = drawFromStream(state.meta.seed, 'cards', state.meta.rngDraws.cards);
    state.meta.rngDraws.cards += 1;
    return value;
  }, allCards);
  const drawnCards = reshuffled.slice(0, FINAL_INFECTION_DRAW);
  deck.hand = drawnCards;
  deck.drawPile = reshuffled.slice(FINAL_INFECTION_DRAW);
  deck.discard = [];
  const drawn = drawnCards.map((card) => (isContamination(card) ? 'CONTAMINATION' : 'ACTION'));
  return {
    hadLarva,
    scannedCount: scanned.length,
    infectedFound,
    drawn,
    survived: !drawn.includes('CONTAMINATION'),
  };
}

function collectFacts(state: GameState, shipDestroyed: boolean): EndgameFacts {
  const queenOnBoard = state.intrudersPool.boardTokens.some((token) => token.type === 'QUEEN');
  const queenShot = state.gameLog.some(
    (entry) => entry.event.type === 'INTRUDER_KILLED' && entry.event.targetType === 'QUEEN',
  );
  return {
    hiveDestroyed: state.intrudersPool.eggsOnBoard === 0,
    queenKilled: queenShot || (shipDestroyed && queenOnBoard),
    allRoomsExplored: Object.values(state.ship.rooms).every((room) => room.isExplored),
    studiedObjectKinds: state.intrudersPool.weaknessSlots
      .filter((slot) => slot.card?.isRevealed === true)
      .map((slot) => slot.objectKind),
  };
}

function markDeath(results: Map<string, EndgameCharacterResult>, player: PlayerState, death: EndgameDeath): void {
  player.isDead = true;
  results.get(player.id)!.death = death;
}

function initialResult(player: PlayerState, death: EndgameDeath): EndgameCharacterResult {
  return {
    playerId: player.id,
    escapeRoute: player.hasEscapedInPod ? 'POD' : player.isInHibernation ? 'HIBERNATION' : null,
    death: isSurvivor(player) ? null : death,
    infection: null,
    objectiveResults: [],
    isWinner: false,
  };
}

/**
 * Финальный Валидатор Победы (стр. 11): судьба корабля, затем Проверки Двигателей,
 * Курса, Заражения и Целей. Вызывается один раз, в момент окончания партии.
 */
export function resolveEndgame(state: GameState, cause: GameOverReason): EndgameReport {
  const diedBefore = new Set(
    orderedPlayers(state)
      .filter((player) => player.isDead)
      .map((player) => player.id),
  );
  let finalMarker: EndgameFinalMarker | null = null;
  let shipDestroyed = isShipDestroyedBy(cause);
  if (cause === 'NO_ACTIVE_CHARACTERS') {
    finalMarker = moveFinalMarker(state);
    shipDestroyed = finalMarker === 'SELF_DESTRUCT';
  }
  killEveryoneAboard(state, shipDestroyed);

  const results = new Map<string, EndgameCharacterResult>();
  for (const player of orderedPlayers(state)) {
    const death: EndgameDeath = diedBefore.has(player.id)
      ? 'DIED_DURING_GAME'
      : shipDestroyed
        ? 'SHIP_DESTROYED'
        : 'LEFT_ON_BOARD';
    results.set(player.id, initialResult(player, death));
  }

  const hasSurvivors = () => orderedPlayers(state).some(isSurvivor);
  const hibernating = () => orderedPlayers(state).filter((player) => isSurvivor(player) && player.isInHibernation);

  let engineCheck: EndgameEngineCheck | null = null;
  let courseCheck: EndgameCourseCheck | null = null;
  let destinationReached: Destination | null = null;

  if (!shipDestroyed && hasSurvivors()) {
    engineCheck = checkEngines(state);
    if (engineCheck.shipExploded) {
      shipDestroyed = true;
      for (const player of hibernating()) markDeath(results, player, 'ENGINES_FAILED');
    }
  }

  if (!shipDestroyed && hasSurvivors()) {
    courseCheck = checkCourse(state);
    destinationReached = courseCheck.destination;
    if (courseCheck.destination !== 'EARTH') {
      for (const player of hibernating()) {
        const quarantineOnMars =
          courseCheck.destination === 'MARS' &&
          player.objectives.some((objective) => objective.id === QUARANTINE_OBJECTIVE_ID);
        if (!quarantineOnMars) markDeath(results, player, 'WRONG_COORDINATES');
      }
    }
  }

  for (const player of orderedPlayers(state).filter(isSurvivor)) {
    const infection = checkInfection(state, player);
    results.get(player.id)!.infection = infection;
    if (!infection.survived) markDeath(results, player, 'INFECTION');
  }

  const facts = collectFacts(state, shipDestroyed);
  const survivors = orderedPlayers(state).filter(isSurvivor);
  const survivorIds = survivors.map((player) => player.id);
  for (const player of survivors) {
    const context: ObjectiveContext = { state, player, survivorIds, shipDestroyed, destinationReached, facts };
    const result = results.get(player.id)!;
    result.death = null;
    result.objectiveResults = player.objectives.map((objective) => ({
      objective: structuredClone(isDraft(objective) ? current(objective) : objective),
      metConditionIndex: metObjectiveCondition(objective, context),
    }));
    result.isWinner = result.objectiveResults.some((entry) => entry.metConditionIndex !== null);
  }

  const report: EndgameReport = {
    cause,
    finalMarker,
    shipDestroyed,
    destinationReached,
    engineCheck,
    courseCheck,
    facts,
    characters: [...results.values()],
  };
  state.endgame = report;
  return report;
}
