import { TIME_TRACK_LENGTH } from '../data/setup.js';
import type { CommsMessage } from '../types/comms.js';
import type { RoomId } from '../types/rooms.js';
import type { SanitizedGameState, SanitizedPlayerState } from '../types/sanitized.js';
import { isHibernationOpen, isPodUsable } from '../logic/actionRules.js';
import { effectiveKnobs } from './botCharacter.js';
import { evaluateCurve } from './botCurves.js';
import type { BotMind, OwnPromise } from './botMind.js';
import { findRoomOfType } from './botNavigation.js';
import { earthProbability } from './botBeliefs.js';
import { canRepair, needTasks } from './botNeeds.js';
import { fragilityCost, vitalityOf } from './botHarm.js';
import { breachChance, markersLeft } from './botShipDoom.js';
import { planObjectives, voyageTasks, type EvacuationRoute, type ObjectivePlan } from './botObjectivePlanner.js';
import { hasAdjacentIntruders, roomThreat, roundsLeft } from './botRisk.js';
import { boardablePodDefinitions, POD_DEFINITIONS } from './botThreat.js';
import { ENGINE_NUMBERS, isEngineUncertain, probabilityEnginesHold } from './botShipKnowledge.js';
import { othersSuccessWeight } from './botSocial.js';
import { task, type BotTask } from './botTasks.js';
import { sharedAmongCrew } from './botTeam.js';
import type { BotTuning, TuningKnob } from './botTuning.js';

export interface BotAgenda {
  tasks: BotTask[];
  plans: ObjectivePlan[];
  /** Опасность своей Комнаты (0–1) и давление времени (0–1): их читают кривые Utility. */
  danger: number;
  timePressure: number;
  evacuation: EvacuationRoute;
}

interface AgendaContext {
  view: SanitizedGameState;
  mind: BotMind;
  self: SanitizedPlayerState;
  tuning: BotTuning;
  knobs: Record<TuningKnob, number>;
  altruism: number;
}

/** Два Действия за ход (стр. 13): на путь к Анабиозу бот считает Движения парами. */
const ACTIONS_PER_TURN = 2;
const MISSION_DONE = 0.99;
const URGENT_DESIRES: ReadonlySet<BotTask['desire']> = new Set(['PREPARE_EVACUATION', 'SURVIVE']);
export function hasLoadedWeapon(self: SanitizedPlayerState): boolean {
  return self.handSlots.some((slot) => slot.source === 'ITEM' && slot.card.isWeapon && (slot.card.ammo ?? 0) > 0);
}

/**
 * Путь спасения: запущенной Капсуле не страшны ни гибель корабля, ни Двигатели, ни Курс (стр. 11, 29), поэтому
 * открытые Капсулы надёжнее Анабиоза — если Цели не требуют иного.
 */
function evacuationRoute(view: SanitizedGameState, plans: readonly ObjectivePlan[], mind: BotMind): EvacuationRoute {
  if (plans.some((plan) => plan.evacuation === 'POD')) return 'POD';
  if (plans.some((plan) => plan.evacuation === 'HIBERNATION')) return 'HIBERNATION';
  return boardablePodDefinitions(view).length > 0 || probabilityEnginesHold(mind) < 0.35 ? 'POD' : 'ANY';
}

/** Эвакуация (В8-7-3): время до Прыжка против пути до Анабиоза или Капсулы; два Движения за ход. */
function evacuationTasks(
  context: AgendaContext,
  route: EvacuationRoute,
  pressure: number,
  plans: readonly ObjectivePlan[],
): BotTask[] {
  const { view, self, tuning, mind } = context;
  if (self.boardedPodId) return podTasks(context, pressure);
  const base = tuning.desires.PREPARE_EVACUATION;
  const lifeline = tuning.desires.SURVIVE * tuning.tactics.harm.weight;
  const rounds = roundsLeft(view);
  const weightFor = (definitionIds: string[]) => {
    const found = findRoomOfType(view, self.roomId, definitionIds, tuning, context.knobs.riskAversion);
    if (!found) return 0;
    const roundsNeeded = Math.ceil((found.route.path.length + 1) / ACTIONS_PER_TURN);
    const urgent = rounds - roundsNeeded <= tuning.time.evacuationMarginRounds * context.knobs.horizon;
    const shelterEarly =
      lifeline * tuning.tactics.roundExposure * rounds * (1 + fragilityCost(vitalityOf(self), tuning));
    const voyage = definitionIds.includes('HIBERNATORIUM') ? voyageChance(view, mind, tuning) : 1;
    return urgent ? Math.max(base, lifeline) : Math.max(base * pressure, pressure * shelterEarly * voyage);
  };
  const onBoard = stayOnBoardRisk(view, self, tuning);
  const marked = (entry: BotTask): BotTask => (entry.weight >= lifeline ? { ...entry, lifeline: true } : entry);
  const tasks: BotTask[] = [];
  const cryo = Object.values(view.ship.rooms).find((room) => room.definitionId === 'HIBERNATORIUM');
  const cryoBroken = cryo?.hasMalfunction === true && !canRepair(context);
  const podTargets = boardablePodDefinitions(view);
  const podsOpen = podTargets.length > 0;
  if (route !== 'POD' || !podsOpen) {
    const open = isHibernationOpen(view.meta.timeTrackPosition) ? 1 : 0.6;
    const weight = weightFor(['HIBERNATORIUM']) * open * (cryoBroken ? tuning.tactics.evacuation.blockedRoute : 1);
    tasks.push(
      marked(task('HIBERNATE', 'PREPARE_EVACUATION', weight, { definitionIds: ['HIBERNATORIUM'] }, 'Лечь в Анабиоз')),
    );
  }
  if (podsOpen) {
    const leaning =
      route === 'POD' || cryoBroken
        ? 1
        : route === 'HIBERNATION'
          ? shipLossRisk(view, tuning)
          : 1 - probabilityEnginesHold(mind) * (1 - shipLossRisk(view, tuning));
    const preferred = Math.min(1, leaning * tuning.tactics.evacuation.podPreference);
    const over = missionOver(context, plans) ? lifeline * tuning.tactics.evacuation.missionOver : 0;
    tasks.push(
      marked(
        task(
          'BOARD_POD',
          'PREPARE_EVACUATION',
          Math.max(Math.max(weightFor(podTargets), lifeline * onBoard) * preferred, over),
          { definitionIds: podTargets },
          'Сесть в Капсулу',
        ),
      ),
    );
  }
  const lockedPods = Object.values(view.ship.escapePods).some((pod) => isPodUsable(pod) && pod.isLocked);
  if (!podsOpen && lockedPods) {
    tasks.push(
      ...sharedAmongCrew(
        view,
        self.id,
        [
          task(
            'UNLOCK_POD',
            'PREPARE_EVACUATION',
            lifeline * onBoard * tuning.tactics.evacuation.unlockPods,
            { definitionIds: ['HATCH_CONTROL'] },
            'Разблокировать Капсулы',
          ),
        ],
        tuning.tactics.teamShare,
      ),
    );
  }
  if (route !== 'POD' || !podsOpen) {
    const voyage = voyageTasks({
      view,
      mind,
      self,
      tuning,
      weight: lifeline * pressure * tuning.tactics.evacuation.voyage,
    });
    tasks.push(...sharedAmongCrew(view, self.id, voyage, tuning.tactics.teamShare));
  }
  const here = view.ship.rooms[self.roomId];
  const shelterTaken =
    here?.definitionId !== null &&
    tasks.some((entry) => entry.lifeline && entry.place.definitionIds?.includes(here?.definitionId ?? '')) &&
    view.intrudersPool.boardTokens.some((token) => token.roomId === self.roomId);
  if (shelterTaken) {
    tasks.push(task('FIGHT', 'SURVIVE', lifeline, { roomIds: [self.roomId] }, 'Отбить Анабиоз или Капсулу'));
  }
  return tasks;
}

function waitsForAlly(context: AgendaContext): OwnPromise | undefined {
  return context.mind.ownPromises.find(
    (promise) =>
      promise.sincere &&
      promise.topic === 'WAIT_IN_POD' &&
      context.view.players[promise.requesterId]?.boardedPodId !== context.self.boardedPodId,
  );
}

function podTasks(context: AgendaContext, pressure: number): BotTask[] {
  const { view, self, tuning, knobs } = context;
  const waiting = waitsForAlly(context);
  const stay = waiting ? tuning.desires.KEEP_PROMISE * knobs.promiseDiligence * (1 - pressure) : 0;
  const lifeline = tuning.desires.SURVIVE * tuning.tactics.harm.weight;
  const launch = Math.max(
    tuning.desires.PREPARE_EVACUATION * (0.5 + pressure),
    lifeline * stayOnBoardRisk(view, self, tuning),
  );
  return [
    task('LAUNCH_POD', 'PREPARE_EVACUATION', launch, {}, 'Запустить Капсулу'),
    task('STAY_IN_POD', 'KEEP_PROMISE', stay, {}, 'Дождаться союзника в Капсуле'),
  ];
}

/**
 * Шанс погибнуть, оставаясь на борту до Прыжка: гибель корабля от Неисправностей или Пожаров (стр. 11, 17) и вред
 * каждого раунда рядом с Чужими — то, от чего спасает запущенная Капсула.
 */
function stayOnBoardRisk(view: SanitizedGameState, self: SanitizedPlayerState, tuning: BotTuning): number {
  const alarm = 1 + view.intrudersPool.boardTokens.length * tuning.tactics.intruderAlarm;
  const exposure = tuning.tactics.roundExposure * alarm * (1 + fragilityCost(vitalityOf(self), tuning));
  const rounds = Math.max(0, roundsLeft(view));
  return 1 - (1 - shipLossRisk(view, tuning)) * Math.pow(1 - Math.min(1, exposure), rounds);
}

/**
 * Задание закончено: все Цели выполнены или безнадёжны к концу партии и ни одна не требует Анабиоза — дальше на борту
 * только риск, пора в Капсулу.
 */
function missionOver(context: AgendaContext, plans: readonly ObjectivePlan[]): boolean {
  const { evacuation } = context.tuning.tactics;
  const late = roundsLeft(context.view) <= evacuation.missionOverRounds;
  return (
    plans.length > 0 &&
    plans.every(
      (plan) =>
        plan.evacuation !== 'HIBERNATION' &&
        (plan.proximity >= MISSION_DONE || (late && plan.proximity < evacuation.missionHopeless)),
    )
  );
}

/**
 * Шанс, что спящие в Анабиозе долетят (стр. 11): хотя бы 2 исправных Двигателя, Курс на Землю и корабль цел до
 * Прыжка — по убеждениям бота. Лечь рано без этого — уснуть навсегда: когда все в Анабиозе, Прыжок наступает сразу.
 */
function voyageChance(view: SanitizedGameState, mind: BotMind, tuning: BotTuning): number {
  const earth = earthProbability(mind.coordinates, view.ship.coordinates.currentCourseMarker);
  return probabilityEnginesHold(mind) * earth * (1 - shipLossRisk(view, tuning));
}

/** Шанс, что корабль погибнет до Прыжка — вместе со всеми, кто лежит в Анабиозе (стр. 11). */
function shipLossRisk(view: SanitizedGameState, tuning: BotTuning): number {
  const hull = breachChance(view, 'MALFUNCTION', markersLeft(view, 'MALFUNCTION'), tuning);
  const fire = breachChance(view, 'FIRE', markersLeft(view, 'FIRE'), tuning);
  return 1 - (1 - hull) * (1 - fire);
}

function shipCareTasks({ view, mind, tuning, knobs, altruism }: AgendaContext): BotTask[] {
  const care = tuning.desires.HELP * Math.max(0, 0.5 + altruism);
  const tasks: BotTask[] = [];
  for (const ally of Object.values(view.players)) {
    if (ally.id === mind.botId || ally.isDead || ally.isInHibernation || ally.hasEscapedInPod) continue;
    if (
      hasAdjacentIntruders(view, ally.roomId) &&
      !view.intrudersPool.boardTokens.some((t) => t.roomId === ally.roomId)
    ) {
      tasks.push(
        task('SHIELD_ALLY', 'HELP', care * 0.6, { definitionIds: ['COMMAND_CENTER'] }, 'Закрыть Двери от Чужих', {
          roomId: ally.roomId,
          playerId: ally.id,
        }),
      );
    }
  }
  const curiosity = tuning.desires.LEARN_SHIP * 0.3 * knobs.selfVerification;
  for (const engineNumber of ENGINE_NUMBERS) {
    if (!isEngineUncertain(mind, engineNumber)) continue;
    tasks.push(
      task(
        'CHECK_ENGINE',
        'LEARN_SHIP',
        curiosity,
        { definitionIds: [`ENGINE_0${engineNumber}`, 'ENGINE_CONTROL'] },
        'Проверить Двигатель',
        { engineNumber },
      ),
    );
  }
  const hidden = Object.values(view.ship.rooms)
    .filter((room) => !room.isExplored)
    .map((room) => room.id);
  if (hidden.length > 0) {
    const share = hidden.length / Object.keys(view.ship.rooms).length;
    tasks.push(
      task('EXPLORE', 'SCOUT', tuning.desires.SCOUT * knobs.explorationBonus * share, { roomIds: hidden }, 'Разведка'),
    );
  }
  return tasks;
}

function requestOf(view: SanitizedGameState, requestId: string) {
  const message = view.comms.messages.find((entry) => entry.id === requestId);
  return message?.kind === 'REQUEST' ? (message as Extract<CommsMessage, { kind: 'REQUEST' }>) : null;
}

/** Сдержать слово (В8-7-6): каждое искреннее обещание — шаг туда, где оно исполняется. */
function promiseTasks({ view, mind, tuning, knobs }: AgendaContext): BotTask[] {
  const weight = tuning.desires.KEEP_PROMISE * knobs.promiseDiligence;
  return mind.ownPromises.flatMap((promise): BotTask[] => {
    const request = promise.sincere ? requestOf(view, promise.requestId) : null;
    if (!request) return [];
    const requesterRoom = view.players[promise.requesterId]?.roomId;
    const body = request.body;
    switch (body.topic) {
      case 'NEED_ITEM':
        return requesterRoom === undefined
          ? []
          : [
              task('GIVE_ITEM', 'KEEP_PROMISE', weight, { roomIds: [requesterRoom] }, 'Отдать Предмет', {
                playerId: promise.requesterId,
              }),
            ];
      case 'HELP_KILL':
        return [task('FIGHT', 'KEEP_PROMISE', weight, { roomIds: [body.roomId] }, 'Помочь убить')];
      case 'CHECK_ENGINE':
        return [
          task(
            'CHECK_ENGINE',
            'KEEP_PROMISE',
            weight,
            { definitionIds: [`ENGINE_0${body.engineNumber}`] },
            'Проверить Двигатель',
            {
              engineNumber: body.engineNumber,
            },
          ),
        ];
      case 'CHECK_COORDINATES':
        return [
          task('CHECK_COORDINATES', 'KEEP_PROMISE', weight, { definitionIds: ['COCKPIT'] }, 'Проверить Координаты'),
        ];
      case 'SET_DOOR':
        return [
          task('SET_DOOR', 'KEEP_PROMISE', weight, { definitionIds: ['COMMAND_CENTER'] }, 'Переключить Дверь', {
            corridorId: body.corridorId,
            doorState: body.doorState,
          }),
        ];
      case 'EXTINGUISH':
        return [
          task('EXTINGUISH', 'KEEP_PROMISE', weight, { definitionIds: ['FIRE_CONTROL'] }, 'Потушить Пожар', {
            roomId: body.roomId,
          }),
        ];
      case 'WAIT_IN_POD':
        return [
          task('BOARD_POD', 'KEEP_PROMISE', weight, { definitionIds: POD_DEFINITIONS }, 'Ждать в Капсуле', {
            podId: body.podId,
          }),
        ];
      case 'NO_SELF_DESTRUCT':
        return [];
    }
  });
}

/** Черты усиливают вред, а давление времени гасит всё, кроме выживания и эвакуации. */
function scaledByDesire(tasks: BotTask[], knobs: Record<TuningKnob, number>, timePressure: number): BotTask[] {
  return tasks
    .map((entry) => {
      const harm = entry.desire === 'SABOTAGE' ? knobs.harmWillingness : 1;
      const late = URGENT_DESIRES.has(entry.desire) ? 1 : 1 - timePressure * 0.8;
      return { ...entry, weight: entry.weight * harm * late };
    })
    .filter((entry) => entry.weight > 0);
}

/** Повестка хода (В8-7-2): задачи всех желаний с весами по кривым, чертам и Целям. */
export function buildAgenda(view: SanitizedGameState, mind: BotMind, tuning: BotTuning): BotAgenda {
  const self = view.players[mind.botId]!;
  const knobs = effectiveKnobs(mind.character, mind.difficulty, tuning);
  const context: AgendaContext = {
    view,
    mind,
    self,
    tuning,
    knobs,
    altruism: othersSuccessWeight(mind.character, mind.difficulty, tuning),
  };
  const plans = planObjectives(view, mind, tuning);
  const route = evacuationRoute(view, plans, mind);
  const timePressure = evaluateCurve(tuning.curves.timePressure, 1 - roundsLeft(view) / TIME_TRACK_LENGTH);
  const danger = evaluateCurve(
    tuning.curves.danger,
    roomThreat(view, self.roomId, tuning, knobs.fear) / tuning.risk.seriousWound,
  );
  const tasks = scaledByDesire(
    [
      ...plans.flatMap((plan) => plan.tasks),
      ...evacuationTasks(context, route, timePressure, plans),
      ...needTasks(context),
      ...shipCareTasks(context),
      ...promiseTasks(context),
    ],
    knobs,
    timePressure,
  );
  return { tasks, plans, danger, timePressure, evacuation: route };
}

export function roomIdsOf(view: SanitizedGameState, place: BotTask['place']): RoomId[] {
  const byDefinition = Object.values(view.ship.rooms)
    .filter((room) => room.definitionId !== null && (place.definitionIds ?? []).includes(room.definitionId))
    .map((room) => room.id);
  return [...(place.roomIds ?? []), ...byDefinition];
}
