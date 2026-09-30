import type { ObjectiveCard } from '../types/cards.js';
import type { BoardObject, PlayerState } from '../types/entities.js';
import type { EndgameFacts } from '../types/endgame.js';
import type { Destination, GameState } from '../types/state.js';
import { SCAVENGER_ITEM_COUNT } from '../data/objectiveCards.js';
import { EngineError } from './engineErrors.js';

export { SCAVENGER_ITEM_COUNT };

export interface ObjectiveContext {
  state: GameState;
  player: PlayerState;
  survivorIds: readonly string[];
  shipDestroyed: boolean;
  destinationReached: Destination | null;
  facts: EndgameFacts;
}

type ConditionCheck = (context: ObjectiveContext) => boolean;

const signalSent: ConditionCheck = ({ player }) => player.hasSignalSent;
const onlyYouSurvive: ConditionCheck = ({ player, survivorIds }) =>
  survivorIds.length === 1 && survivorIds[0] === player.id;
const reached =
  (destination: Destination): ConditionCheck =>
  ({ destinationReached }) =>
    destinationReached === destination;
const shipDestroyed: ConditionCheck = (context) => context.shipDestroyed;
const hiveDestroyed: ConditionCheck = ({ facts }) => facts.hiveDestroyed;
const queenKilled: ConditionCheck = ({ facts }) => facts.queenKilled;
const allRoomsExplored: ConditionCheck = ({ facts }) => facts.allRoomsExplored;
const studied =
  (kind: BoardObject['kind']): ConditionCheck =>
  ({ facts }) =>
    facts.studiedObjectKinds.includes(kind);
const twoWeaknessesStudied: ConditionCheck = ({ facts }) => facts.studiedObjectKinds.length >= 2;
const endedInPod: ConditionCheck = ({ player }) => player.hasEscapedInPod;

function carries(player: PlayerState, matches: (object: BoardObject) => boolean): boolean {
  return player.handSlots.some((slot) => slot.source === 'OBJECT' && matches(slot.object));
}

const isBlueCorpse = (object: BoardObject): boolean => object.kind === 'CORPSE' && object.characterClass === null;
const carriesBlueCorpse: ConditionCheck = ({ player }) => carries(player, isBlueCorpse);
const carriesEgg: ConditionCheck = ({ player }) => carries(player, (object) => object.kind === 'EGG');

const ownsScavengedItems: ConditionCheck = ({ player }) =>
  player.inventory.length + player.handSlots.filter((slot) => slot.source === 'ITEM').length >= SCAVENGER_ITEM_COUNT;

const blueCorpseInSurgery: ConditionCheck = ({ state }) =>
  Object.values(state.ship.rooms).some((room) => room.definitionId === 'SURGERY' && room.objects.some(isBlueCorpse));

const atLeastTwoSurvive: ConditionCheck = ({ player, survivorIds }) =>
  survivorIds.includes(player.id) && survivorIds.length >= 2;

function playerNumberDoesNotSurvive(playerNumber: number): ConditionCheck {
  return ({ state, survivorIds }) =>
    !Object.values(state.players).some(
      (candidate) => candidate.orderNumber === playerNumber && survivorIds.includes(candidate.id),
    );
}

const all =
  (...checks: ConditionCheck[]): ConditionCheck =>
  (context) =>
    checks.every((check) => check(context));

/** Варианты условий каждой карты в порядке печати, разделённые «ИЛИ» (`data/objectiveCards.ts`). */
export const OBJECTIVE_CONDITIONS: Readonly<Record<string, readonly ConditionCheck[]>> = {
  OBJ_PERSONAL_SAVE_PROPERTY: [reached('EARTH'), onlyYouSurvive],
  OBJ_PERSONAL_OLD_FRIEND: [reached('EARTH'), onlyYouSurvive],
  OBJ_PERSONAL_QUARANTINE: [reached('MARS'), all(reached('EARTH'), hiveDestroyed)],
  OBJ_PERSONAL_TIRELESS_EXPLORER: [all(signalSent, allRoomsExplored)],
  OBJ_PERSONAL_DECENT_BURIAL: [all(signalSent, carriesBlueCorpse)],
  OBJ_PERSONAL_SCAVENGER: [all(endedInPod, ownsScavengedItems)],
  OBJ_PERSONAL_BIG_HUNT: [all(signalSent, shipDestroyed), all(signalSent, queenKilled)],
  OBJ_PERSONAL_BEST_FRIENDS: [atLeastTwoSurvive],
  OBJ_PERSONAL_ALIENS_ON_BOARD: [all(signalSent, hiveDestroyed), all(signalSent, shipDestroyed)],
  OBJ_CORPORATE_MY_PRECIOUS: [all(signalSent, carriesEgg)],
  OBJ_CORPORATE_NECROSCOPY: [all(signalSent, studied('INTRUDER_REMAINS'))],
  OBJ_CORPORATE_AB_OVO: [studied('EGG')],
  OBJ_CORPORATE_EXTREME_FIELD_BIOLOGY: [twoWeaknessesStudied],
  OBJ_CORPORATE_BIDE_YOUR_TIME: [playerNumberDoesNotSurvive(1), onlyYouSurvive],
  OBJ_CORPORATE_GREENER_GRASS: [playerNumberDoesNotSurvive(2), onlyYouSurvive],
  OBJ_CORPORATE_OLD_FEUD: [playerNumberDoesNotSurvive(3), onlyYouSurvive],
  OBJ_CORPORATE_ARMED_TAKEOVER: [playerNumberDoesNotSurvive(4), onlyYouSurvive],
  OBJ_CORPORATE_OUTSIDE_INSIGHT: [playerNumberDoesNotSurvive(5), onlyYouSurvive],
  OBJ_SOLO_DESTINATION_EARTH: [reached('EARTH')],
  OBJ_SOLO_AUTOPSY: [blueCorpseInSurgery],
  OBJ_SOLO_CLOSE_CONTACT_PROTOCOL: [twoWeaknessesStudied],
  OBJ_SOLO_BEHEAD_THE_ENEMY: [all(signalSent, shipDestroyed), all(signalSent, queenKilled)],
  OBJ_SOLO_NO_ONE_LEFT_BEHIND: [all(signalSent, allRoomsExplored)],
  OBJ_SOLO_SPECIAL_DELIVERY: [carriesEgg],
  OBJ_SOLO_CLEANUP_CREW: [all(signalSent, hiveDestroyed), all(signalSent, shipDestroyed)],
};

/** Индекс первого выполненного варианта Цели или null (стр. 11, шаг 4). */
export function metObjectiveCondition(objective: ObjectiveCard, context: ObjectiveContext): number | null {
  const checks = OBJECTIVE_CONDITIONS[objective.id];
  if (!checks || checks.length !== objective.conditions.length) {
    throw new EngineError(
      'OBJECTIVE_NOT_EVALUABLE',
      `Для Цели «${objective.name}» нет проверки условий в Финальном Валидаторе.`,
    );
  }
  const index = checks.findIndex((check) => check(context));
  return index === -1 ? null : index;
}
