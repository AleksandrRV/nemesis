import { SCAVENGER_ITEM_COUNT } from '../data/objectiveCards.js';
import type { ObjectiveCard } from '../types/cards.js';
import type { BoardObject } from '../types/entities.js';
import type { SanitizedGameState, SanitizedPlayerState } from '../types/sanitized.js';
import type { Destination } from '../types/state.js';
import { effectiveKnobs } from './botCharacter.js';
import { searchableRoomIds } from './botNavigation.js';
import type { BotMind } from './botMind.js';
import {
  ENGINE_NUMBERS,
  bestMarkerFor,
  destinationChance,
  isEngineUncertain,
  probabilityEnginesHold,
  probabilityWorking,
} from './botShipKnowledge.js';
import { task, type BotTask } from './botTasks.js';
import { boardablePodDefinitions, POD_DEFINITIONS } from './botThreat.js';
import type { BotTuning } from './botTuning.js';

/** Разовые вехи Целей в одной Комнате: Сигнал, Координаты, Курс. */
const MILESTONES: ReadonlySet<BotTask['kind']> = new Set(['SEND_SIGNAL', 'CHECK_COORDINATES', 'SET_COURSE']);

export type EvacuationRoute = 'HIBERNATION' | 'POD' | 'ANY';

interface Step {
  progress: number;
  tasks: BotTask[];
  evacuation: EvacuationRoute;
}

export interface PlanContext {
  view: SanitizedGameState;
  mind: BotMind;
  self: SanitizedPlayerState;
  weight: number;
  tuning: BotTuning;
}

type ConditionPlanner = (context: PlanContext) => Step;

function step(progress: number, tasks: BotTask[] = [], evacuation: EvacuationRoute = 'ANY'): Step {
  return { progress: Math.max(0, Math.min(1, progress)), tasks, evacuation };
}

const all =
  (...planners: ConditionPlanner[]): ConditionPlanner =>
  (context) => {
    const steps = planners.map((planner) => planner(context));
    const evacuation = steps.find((entry) => entry.evacuation !== 'ANY')?.evacuation ?? 'ANY';
    return step(
      steps.reduce((product, entry) => product * entry.progress, 1),
      steps.flatMap((entry) => entry.tasks),
      evacuation,
    );
  };

function holds(self: SanitizedPlayerState, matches: (object: BoardObject) => boolean): boolean {
  return self.handSlots.some((slot) => slot.source === 'OBJECT' && matches(slot.object));
}

const isBlueCorpse = (object: BoardObject) => object.kind === 'CORPSE' && object.characterClass === null;

function roomsWithObjects(view: SanitizedGameState, matches: (object: BoardObject) => boolean) {
  return Object.values(view.ship.rooms).flatMap((room) =>
    room.objects.filter(matches).map((object) => ({ roomId: room.id, object })),
  );
}

const signalSent: ConditionPlanner = ({ self, weight }) =>
  self.hasSignalSent
    ? step(1)
    : step(0.4, [
        task('SEND_SIGNAL', 'ADVANCE_OBJECTIVE', weight, { definitionIds: ['COMM_ROOM'] }, 'Отправить Сигнал'),
      ]);

/** «Корабль должен достигнуть …» (стр. 11): Координаты, Курс, 2 исправных Двигателя и Анабиоз к Прыжку. */
const reached =
  (destination: Destination): ConditionPlanner =>
  ({ view, mind, weight, tuning }) => {
    const current = view.ship.coordinates.currentCourseMarker;
    const tasks: BotTask[] = [];
    if (mind.coordinates.cardId === null) {
      tasks.push(task('CHECK_COORDINATES', 'LEARN_SHIP', weight, { definitionIds: ['COCKPIT'] }, 'Узнать Координаты'));
    }
    const best = bestMarkerFor(mind, destination);
    if (destinationChance(mind, best, destination) > destinationChance(mind, current, destination) + 0.1) {
      tasks.push(
        task('SET_COURSE', 'ADVANCE_OBJECTIVE', weight, { definitionIds: ['COCKPIT'] }, 'Установить Курс', {
          marker: best,
        }),
      );
    }
    const verification = effectiveKnobs(mind.character, mind.difficulty, tuning).selfVerification;
    for (const engineNumber of ENGINE_NUMBERS) {
      const working = probabilityWorking(mind, engineNumber);
      if (isEngineUncertain(mind, engineNumber)) {
        const uncertainty = 1 - Math.abs(working - 0.5) * 2;
        tasks.push(
          task(
            'CHECK_ENGINE',
            'LEARN_SHIP',
            weight * Math.min(1, uncertainty * verification) * 0.5,
            { definitionIds: [`ENGINE_0${engineNumber}`, 'ENGINE_CONTROL'] },
            'Проверить Двигатель',
            { engineNumber },
          ),
        );
      }
      if (working < 0.5) {
        tasks.push(
          task(
            'REPAIR_ENGINE',
            'ADVANCE_OBJECTIVE',
            weight * (1 + repairGain(mind, engineNumber)),
            { definitionIds: [`ENGINE_0${engineNumber}`] },
            'Починить Двигатель',
            { engineNumber },
          ),
        );
      }
    }
    return step(probabilityEnginesHold(mind) * destinationChance(mind, current, destination), tasks, 'HIBERNATION');
  };

/**
 * Полёт спящих в Анабиозе (стр. 11): не Земля или меньше 2 исправных Двигателей — гибель всех в Камерах. Те же
 * шаги, что у Цели «Земля», но ради собственной жизни.
 */
export function voyageTasks(context: PlanContext): BotTask[] {
  return reached('EARTH')(context).tasks.map((entry) => ({ ...entry, desire: 'PREPARE_EVACUATION' }));
}

/** Насколько починка Двигателя поднимает шанс, что исправны хотя бы 2 из 3. */
function repairGain(mind: BotMind, engineNumber: (typeof ENGINE_NUMBERS)[number]): number {
  const repaired: BotMind = {
    ...mind,
    engines: {
      ...mind.engines,
      [String(engineNumber)]: { ...mind.engines[String(engineNumber) as '1' | '2' | '3'], known: true, pWorking: 1 },
    },
  };
  return probabilityEnginesHold(repaired) - probabilityEnginesHold(mind);
}

function othersOnShip(view: SanitizedGameState, selfId: string): SanitizedPlayerState[] {
  return Object.values(view.players).filter(
    (player) => player.id !== selfId && !player.isDead && !player.hasEscapedInPod,
  );
}

function podEscape(view: SanitizedGameState, weight: number): BotTask[] {
  const boardable = boardablePodDefinitions(view);
  const definitionIds = boardable.length > 0 ? boardable : POD_DEFINITIONS;
  return [
    task('BOARD_POD', 'PREPARE_EVACUATION', weight, { definitionIds }, 'Сесть в Капсулу'),
    task('LAUNCH_POD', 'PREPARE_EVACUATION', weight, {}, 'Запустить Капсулу'),
  ];
}

const onlyYouSurvive: ConditionPlanner = ({ view, self, weight }) => {
  const players = Object.values(view.players).filter((player) => player.id !== self.id);
  const gone = players.filter((player) => player.isDead).length;
  return step(players.length === 0 ? 1 : (gone / players.length) * 0.8, [
    ...podEscape(view, weight),
    task('LOCK_POD', 'SABOTAGE', weight * 0.5, { definitionIds: ['HATCH_CONTROL'] }, 'Заблокировать чужие Капсулы'),
  ]);
};

const shipDestroyed: ConditionPlanner = ({ view, mind, weight }) => {
  const armed = view.meta.selfDestructTrackPosition !== null;
  const tasks = podEscape(view, weight);
  if (!armed) {
    tasks.push(
      task('SELF_DESTRUCT', 'SABOTAGE', weight, { definitionIds: ['GENERATOR'] }, 'Запустить Самоуничтожение'),
    );
  }
  for (const engineNumber of ENGINE_NUMBERS) {
    if (probabilityWorking(mind, engineNumber) > 0.5) {
      tasks.push(
        task(
          'DAMAGE_ENGINE',
          'SABOTAGE',
          weight * 0.6,
          { definitionIds: [`ENGINE_0${engineNumber}`] },
          'Повредить Двигатель',
          { engineNumber },
        ),
      );
    }
  }
  return step(armed ? 0.7 : 1 - probabilityEnginesHold(mind), tasks, 'POD');
};

const fightAtNest: ConditionPlanner = ({ weight }) =>
  step(0.05, [task('FIGHT', 'ADVANCE_OBJECTIVE', weight * 0.3, { definitionIds: ['NEST'] }, 'Атаковать Улей')]);

const queenKilled: ConditionPlanner = ({ view, weight }) => {
  const queens = view.intrudersPool.boardTokens.filter((token) => token.type === 'QUEEN');
  return step(
    0.05,
    queens.map((queen) =>
      task('FIGHT', 'ADVANCE_OBJECTIVE', weight * 0.4, { roomIds: [queen.roomId] }, 'Убить Королеву'),
    ),
  );
};

const allRoomsExplored: ConditionPlanner = ({ view, weight }) => {
  const rooms = Object.values(view.ship.rooms);
  const hidden = rooms.filter((room) => !room.isExplored).map((room) => room.id);
  return step(
    1 - hidden.length / Math.max(1, rooms.length),
    hidden.length > 0 ? [task('EXPLORE', 'SCOUT', weight, { roomIds: hidden }, 'Исследовать корабль')] : [],
  );
};

/** Добыть Объект: поднять с пола или взять Яйцо в Улье (стр. 22, 26). */
function acquire(
  context: PlanContext,
  kind: BoardObject['kind'],
  matches: (object: BoardObject) => boolean,
): BotTask[] {
  if (holds(context.self, matches)) return [];
  const onFloor = roomsWithObjects(context.view, matches);
  const tasks = onFloor.map(({ roomId, object }) =>
    task('PICK_UP', 'ADVANCE_OBJECTIVE', context.weight, { roomIds: [roomId] }, 'Поднять Объект', {
      objectKind: kind,
      objectId: object.id,
    }),
  );
  if (kind === 'EGG' && context.view.intrudersPool.eggsOnBoard > 0) {
    tasks.push(task('TAKE_EGG', 'ADVANCE_OBJECTIVE', context.weight * 0.8, { definitionIds: ['NEST'] }, 'Взять Яйцо'));
  }
  return tasks;
}

function ofKind(kind: BoardObject['kind']): (object: BoardObject) => boolean {
  return (object) => object.kind === kind;
}

function isStudied(view: SanitizedGameState, kind: BoardObject['kind']): boolean {
  return view.intrudersPool.weaknessSlots.some((slot) => slot.objectKind === kind && slot.visibility === 'REVEALED');
}

function studyPlan(context: PlanContext, kind: BoardObject['kind']): Step {
  if (isStudied(context.view, kind)) return step(1);
  const holding = holds(context.self, ofKind(kind));
  return step(holding ? 0.5 : 0.2, [
    ...acquire(context, kind, ofKind(kind)),
    task('STUDY', 'ADVANCE_OBJECTIVE', context.weight, { definitionIds: ['LABORATORY'] }, 'Изучить Объект', {
      objectKind: kind,
    }),
  ]);
}

const studied =
  (kind: BoardObject['kind']): ConditionPlanner =>
  (context) =>
    studyPlan(context, kind);

const twoWeaknessesStudied: ConditionPlanner = (context) => {
  const slots = context.view.intrudersPool.weaknessSlots;
  const revealed = slots.filter((slot) => slot.visibility === 'REVEALED').length;
  if (revealed >= 2) return step(1);
  const pending = slots
    .filter((slot) => slot.visibility === 'FACE_DOWN')
    .map((slot) => studyPlan(context, slot.objectKind));
  return step(
    revealed / 2 + 0.1,
    pending.flatMap((plan) => plan.tasks),
  );
};

const carriesEgg: ConditionPlanner = (context) =>
  holds(context.self, ofKind('EGG')) ? step(1) : step(0.2, acquire(context, 'EGG', ofKind('EGG')));

const carriesBlueCorpse: ConditionPlanner = (context) =>
  holds(context.self, isBlueCorpse)
    ? step(1)
    : step(
        roomsWithObjects(context.view, isBlueCorpse).length > 0 ? 0.3 : 0.05,
        acquire(context, 'CORPSE', isBlueCorpse),
      );

const endedInPod: ConditionPlanner = ({ view, self, weight }) =>
  step(self.boardedPodId ? 0.8 : 0.3, podEscape(view, weight), 'POD');

function ownedItems(self: SanitizedPlayerState): number {
  return (self.inventory?.length ?? 0) + self.handSlots.filter((slot) => slot.source === 'ITEM').length;
}

const ownsScavengedItems: ConditionPlanner = ({ view, self, weight }) => {
  const owned = ownedItems(self);
  return step(
    owned / SCAVENGER_ITEM_COUNT,
    owned >= SCAVENGER_ITEM_COUNT
      ? []
      : [task('SEARCH', 'EQUIP', weight, { roomIds: searchableRoomIds(view) }, 'Собрать Предметы')],
  );
};

const atLeastTwoSurvive: ConditionPlanner = ({ view, self }) => step(othersOnShip(view, self.id).length > 0 ? 0.5 : 0);

const playerNumberDoesNotSurvive =
  (playerNumber: number): ConditionPlanner =>
  ({ view }) => {
    const target = Object.values(view.players).find((player) => player.orderNumber === playerNumber);
    return step(!target || target.isDead ? 1 : 0.1);
  };

const blueCorpseInSurgery: ConditionPlanner = (context) => {
  const inSurgery = Object.values(context.view.ship.rooms).some(
    (room) => room.definitionId === 'SURGERY' && room.objects.some(isBlueCorpse),
  );
  if (inSurgery) return step(1);
  return step(holds(context.self, isBlueCorpse) ? 0.6 : 0.1, [
    ...acquire(context, 'CORPSE', isBlueCorpse),
    task(
      'DROP_OBJECT',
      'ADVANCE_OBJECTIVE',
      context.weight,
      { definitionIds: ['SURGERY'] },
      'Оставить Труп в Операционной',
      {
        objectKind: 'CORPSE',
      },
    ),
  ]);
};

/** Планировщики всех 25 Целей (В8-7-5) — варианты «ИЛИ» в порядке печати, как `OBJECTIVE_CONDITIONS` движка. */
export const OBJECTIVE_PLANNERS: Readonly<Record<string, readonly ConditionPlanner[]>> = {
  OBJ_PERSONAL_SAVE_PROPERTY: [reached('EARTH'), onlyYouSurvive],
  OBJ_PERSONAL_OLD_FRIEND: [reached('EARTH'), onlyYouSurvive],
  OBJ_PERSONAL_QUARANTINE: [reached('MARS'), all(reached('EARTH'), fightAtNest)],
  OBJ_PERSONAL_TIRELESS_EXPLORER: [all(signalSent, allRoomsExplored)],
  OBJ_PERSONAL_DECENT_BURIAL: [all(signalSent, carriesBlueCorpse)],
  OBJ_PERSONAL_SCAVENGER: [all(endedInPod, ownsScavengedItems)],
  OBJ_PERSONAL_BIG_HUNT: [all(signalSent, shipDestroyed), all(signalSent, queenKilled)],
  OBJ_PERSONAL_BEST_FRIENDS: [atLeastTwoSurvive],
  OBJ_PERSONAL_ALIENS_ON_BOARD: [all(signalSent, fightAtNest), all(signalSent, shipDestroyed)],
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
  OBJ_SOLO_CLEANUP_CREW: [all(signalSent, fightAtNest), all(signalSent, shipDestroyed)],
};

export interface ObjectivePlan {
  objectiveId: string;
  alternative: number;
  proximity: number;
  tasks: BotTask[];
  evacuation: EvacuationRoute;
}

/** Лучший вариант Цели по близости: его невыполненные шаги становятся задачами желания «продвинуть Цель». */
export function planObjective(
  view: SanitizedGameState,
  mind: BotMind,
  card: ObjectiveCard,
  weight: number,
  tuning: BotTuning,
): ObjectivePlan | null {
  const self = view.players[mind.botId];
  const planners = OBJECTIVE_PLANNERS[card.id];
  if (!self || !planners) return null;
  const context: PlanContext = { view, mind, self, weight, tuning };
  const steps = planners.map((planner) => planner(context));
  const bestIndex = steps.reduce((best, entry, index) => (entry.progress > steps[best]!.progress ? index : best), 0);
  const best = steps[bestIndex]!;
  return {
    objectiveId: card.id,
    alternative: bestIndex,
    proximity: best.progress,
    tasks: best.tasks,
    evacuation: best.evacuation,
  };
}

/** Планы по своим Целям: до Первого Контакта их две, и бот держит обе, отдавая вес более близкой. */
export function planObjectives(view: SanitizedGameState, mind: BotMind, tuning: BotTuning): ObjectivePlan[] {
  const cards = view.players[mind.botId]?.objectives ?? [];
  const base = tuning.desires.ADVANCE_OBJECTIVE / Math.max(1, cards.length);
  return cards
    .map((card) => planObjective(view, mind, card, base, tuning))
    .filter((plan): plan is ObjectivePlan => plan !== null)
    .map((plan) => ({
      ...plan,
      tasks: plan.tasks.map((entry) => ({
        ...entry,
        weight:
          entry.weight * (0.5 + plan.proximity) * (MILESTONES.has(entry.kind) ? tuning.tactics.milestoneBoost : 1),
      })),
    }));
}
