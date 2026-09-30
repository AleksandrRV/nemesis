import { FIRE_MARKER_SUPPLY, MALFUNCTION_MARKER_SUPPLY } from '../data/markerSupply.js';
import { TIME_TRACK_LENGTH } from '../data/setup.js';
import type { CommsMessage } from '../types/comms.js';
import type { RoomId } from '../types/rooms.js';
import type { SanitizedGameState, SanitizedPlayerState } from '../types/sanitized.js';
import { isHibernationOpen } from '../logic/actionRules.js';
import { effectiveKnobs } from './botCharacter.js';
import { clamp01, evaluateCurve } from './botCurves.js';
import type { BotMind, OwnPromise } from './botMind.js';
import { isActionCard, unscannedContamination } from './botHand.js';
import { findRoomOfType, searchableRoomIds } from './botNavigation.js';
import { planObjectives, type EvacuationRoute, type ObjectivePlan } from './botObjectivePlanner.js';
import { hasAdjacentIntruders, roomThreat, roundsLeft } from './botRisk.js';
import { ENGINE_NUMBERS, isEngineUncertain, probabilityEnginesHold } from './botShipKnowledge.js';
import { othersSuccessWeight } from './botSocial.js';
import { task, type BotTask } from './botTasks.js';
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

const POD_ROOMS = ['ESCAPE_POD_A', 'ESCAPE_POD_B'];
/** Два Действия за ход (стр. 13): на путь к Анабиозу бот считает Движения парами. */
const ACTIONS_PER_TURN = 2;
const URGENT_DESIRES: ReadonlySet<BotTask['desire']> = new Set(['PREPARE_EVACUATION', 'SURVIVE']);
const KEY_ROOMS = ['ENGINE_01', 'ENGINE_02', 'ENGINE_03', 'ENGINE_CONTROL', 'COCKPIT', 'HIBERNATORIUM', ...POD_ROOMS];

const SCAN_ROOMS = ['CANTEEN', 'SHOWER'];

function hasRestCard(self: SanitizedPlayerState): boolean {
  return self.actionDeck.hand.some((card) => isActionCard(card) && card.effect.kind === 'REST');
}

export function hasLoadedWeapon(self: SanitizedPlayerState): boolean {
  return self.handSlots.some((slot) => slot.source === 'ITEM' && slot.card.isWeapon && (slot.card.ammo ?? 0) > 0);
}

function evacuationRoute(plans: readonly ObjectivePlan[], mind: BotMind): EvacuationRoute {
  if (plans.some((plan) => plan.evacuation === 'POD')) return 'POD';
  if (plans.some((plan) => plan.evacuation === 'HIBERNATION')) return 'HIBERNATION';
  return probabilityEnginesHold(mind) < 0.35 ? 'POD' : 'ANY';
}

/** Эвакуация (В8-7-3): время до Прыжка против пути до Анабиоза или Капсулы; два Движения за ход. */
function evacuationTasks(context: AgendaContext, route: EvacuationRoute, pressure: number): BotTask[] {
  const { view, self, tuning, mind } = context;
  if (self.boardedPodId) return podTasks(context, pressure);
  const base = tuning.desires.PREPARE_EVACUATION;
  const rounds = roundsLeft(view);
  const urgency = (definitionIds: string[]) => {
    const found = findRoomOfType(view, self.roomId, definitionIds, tuning, context.knobs.riskAversion);
    if (!found) return 0;
    const roundsNeeded = Math.ceil((found.route.path.length + 1) / ACTIONS_PER_TURN);
    return rounds - roundsNeeded <= tuning.time.evacuationMarginRounds * context.knobs.horizon ? 1 : pressure;
  };
  const tasks: BotTask[] = [];
  if (route !== 'POD') {
    const weight = base * urgency(['HIBERNATORIUM']) * (isHibernationOpen(view.meta.timeTrackPosition) ? 1 : 0.6);
    tasks.push(task('HIBERNATE', 'PREPARE_EVACUATION', weight, { definitionIds: ['HIBERNATORIUM'] }, 'Лечь в Анабиоз'));
  }
  if (route !== 'HIBERNATION') {
    const leaning = route === 'POD' ? 1 : 1 - probabilityEnginesHold(mind);
    tasks.push(
      task(
        'BOARD_POD',
        'PREPARE_EVACUATION',
        base * urgency(POD_ROOMS) * leaning,
        { definitionIds: POD_ROOMS },
        'Сесть в Капсулу',
      ),
    );
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
  const { tuning, knobs } = context;
  const waiting = waitsForAlly(context);
  const stay = waiting ? tuning.desires.KEEP_PROMISE * knobs.promiseDiligence * (1 - pressure) : 0;
  return [
    task(
      'LAUNCH_POD',
      'PREPARE_EVACUATION',
      tuning.desires.PREPARE_EVACUATION * (0.5 + pressure),
      {},
      'Запустить Капсулу',
    ),
    task('STAY_IN_POD', 'KEEP_PROMISE', stay, {}, 'Дождаться союзника в Капсуле'),
  ];
}

function survivalTasks({ view, mind, self, tuning, knobs }: AgendaContext): BotTask[] {
  const survive = tuning.desires.SURVIVE;
  const tasks: BotTask[] = [];
  const untreated = self.seriousWounds.filter((wound) => !wound.isTreated).length;
  const wounds = self.lightWounds + untreated * 2 + (self.seriousWounds.length - untreated);
  if (wounds > 0) {
    tasks.push(task('HEAL', 'SURVIVE', survive * clamp01(wounds / 4), { definitionIds: ['INFIRMARY'] }, 'Вылечиться'));
  }
  if (self.lightWounds > 0) {
    tasks.push(task('HEAL', 'SURVIVE', survive * 0.3, { definitionIds: ['CANTEEN'] }, 'Перекусить в Столовой'));
  }
  if (self.hasLarva)
    tasks.push(task('CLEANSE', 'SURVIVE', survive * 1.5, { definitionIds: ['SURGERY'] }, 'Удалить Личинку'));
  const contamination = unscannedContamination(view, mind.botId);
  if (contamination > 0) {
    const place = hasRestCard(self) ? {} : { definitionIds: SCAN_ROOMS };
    const weight = survive * clamp01(contamination * tuning.hand.scanPerContamination * knobs.scanRate);
    tasks.push(task('SCAN_HAND', 'SURVIVE', weight, place, 'Просканировать руку'));
  }
  return tasks;
}

function combatTasks({ view, self, tuning, knobs, altruism }: AgendaContext): BotTask[] {
  const tasks: BotTask[] = [];
  if (!hasLoadedWeapon(self)) {
    tasks.push(
      task(
        'SEARCH',
        'EQUIP',
        tuning.desires.EQUIP * knobs.itemHoarding,
        { roomIds: searchableRoomIds(view) },
        'Найти Оружие',
      ),
    );
  }
  const fightWeight = (tuning.desires.SURVIVE * 0.6 * knobs.combatDesire) / Math.max(knobs.combatFlight, 0.1);
  const hereIntruders = view.intrudersPool.boardTokens.some((token) => token.roomId === self.roomId);
  if (hereIntruders)
    tasks.push(task('FIGHT', 'SURVIVE', fightWeight, { roomIds: [self.roomId] }, 'Бой в своей Комнате'));
  const helpWeight = tuning.desires.HELP * knobs.killHelpValue * Math.max(0, 0.5 + altruism);
  for (const ally of Object.values(view.players)) {
    if (ally.id === self.id || ally.isDead || ally.isInHibernation || ally.hasEscapedInPod) continue;
    if (!view.intrudersPool.boardTokens.some((token) => token.roomId === ally.roomId)) continue;
    tasks.push(task('FIGHT', 'HELP', helpWeight, { roomIds: [ally.roomId] }, 'Помочь в Бою', { playerId: ally.id }));
  }
  return tasks;
}

/**
 * Запас маркеров на исходе (стр. 17): без маркера Пожара корабль взрывается, без маркера Неисправности —
 * разгерметизация. Чем ближе конец запаса, тем важнее тушить и чинить — ради собственного выживания.
 */
function supplyPressure(used: number, supply: number, tuning: BotTuning): number {
  return tuning.desires.SURVIVE * evaluateCurve(tuning.curves.timePressure, used / supply);
}

function shipCareTasks({ view, mind, tuning, knobs, altruism }: AgendaContext): BotTask[] {
  const care = tuning.desires.HELP * Math.max(0, 0.5 + altruism);
  const rooms = Object.values(view.ship.rooms);
  const fireUrgency = supplyPressure(rooms.filter((room) => room.hasFire).length, FIRE_MARKER_SUPPLY, tuning);
  const hullUrgency = supplyPressure(
    rooms.filter((room) => room.hasMalfunction).length,
    MALFUNCTION_MARKER_SUPPLY,
    tuning,
  );
  const tasks: BotTask[] = [];
  for (const room of rooms) {
    if (room.hasFire) {
      tasks.push(
        task('EXTINGUISH', 'HELP', care + fireUrgency, { definitionIds: ['FIRE_CONTROL'] }, 'Потушить Пожар', {
          roomId: room.id,
        }),
      );
    }
    if (room.hasMalfunction) {
      const key = room.definitionId !== null && KEY_ROOMS.includes(room.definitionId) ? care : 0;
      tasks.push(
        task('FIX_MALFUNCTION', 'HELP', key + hullUrgency, { roomIds: [room.id] }, 'Починить Комнату', {
          roomId: room.id,
        }),
      );
    }
  }
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
          task('BOARD_POD', 'KEEP_PROMISE', weight, { definitionIds: POD_ROOMS }, 'Ждать в Капсуле', {
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
  const route = evacuationRoute(plans, mind);
  const timePressure = evaluateCurve(tuning.curves.timePressure, 1 - roundsLeft(view) / TIME_TRACK_LENGTH);
  const danger = evaluateCurve(
    tuning.curves.danger,
    roomThreat(view, self.roomId, tuning, knobs.fear) / tuning.risk.seriousWound,
  );
  const tasks = scaledByDesire(
    [
      ...plans.flatMap((plan) => plan.tasks),
      ...evacuationTasks(context, route, timePressure),
      ...survivalTasks(context),
      ...combatTasks(context),
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
