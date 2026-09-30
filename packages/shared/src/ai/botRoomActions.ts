import type { RoomAbilityPayload } from '../types/actions.js';
import type { ItemDeckColor } from '../types/cards.js';
import { ROOM_OPTION } from '../types/cardOptions.js';
import type { EngineNumber } from '../types/state.js';
import {
  COURSE_MARKERS,
  boardablePods,
  courseBlock,
  hibernationBlock,
  isAnyoneInHibernation,
  isPodUsable,
  podBoardingBlock,
  roomAbilityBlock,
} from '../logic/actionRules.js';
import { hasFreeHandSlot } from '../logic/seriousWoundEffects.js';
import { effect, paidCandidate, type Candidate, type CandidateContext, type TaskEffect } from './botCandidates.js';
import { unscannedContamination } from './botHand.js';
import type { BotTask } from './botTasks.js';

/** Действие Комнаты стоит 2 карты (стр. 13). */
const ROOM_ACTION_COST = 2;
const ITEM_DECKS: readonly ItemDeckColor[] = ['RED', 'YELLOW', 'GREEN'];
const ENGINE_NUMBERS: readonly EngineNumber[] = [1, 2, 3];

function ability(context: CandidateContext, payload: RoomAbilityPayload, effects: TaskEffect[]): Candidate | null {
  return paidCandidate(
    context,
    'ABILITY',
    ROOM_ACTION_COST,
    (discardCardIds) => ({ type: 'ACTION_ROOM_ABILITY', payload: { ...payload, discardCardIds } }),
    effects,
  );
}

/** Столовая и Душевая (стр. 25): своё лечение и, по желанию, скан руки — только если на руке есть Заражение. */
function hygiene(context: CandidateContext, own: TaskEffect[]): (Candidate | null)[] {
  const scannable = unscannedContamination(context.view, context.botId) > 0;
  return [
    own.length > 0 ? ability(context, {}, own) : null,
    scannable ? ability(context, { scanContamination: true }, [...own, effect('SCAN_HAND')]) : null,
  ];
}

function infirmary(context: CandidateContext): (Candidate | null)[] {
  const { self } = context;
  const options: [string, TaskEffect][] = [];
  if (self.seriousWounds.some((wound) => !wound.isTreated)) options.push(['TREAT_SERIOUS', effect('TREAT_WOUND')]);
  if (self.seriousWounds.some((wound) => wound.isTreated)) options.push(['HEAL_SERIOUS', effect('HEAL')]);
  if (self.lightWounds > 0) options.push(['HEAL_LIGHT', effect('HEAL')]);
  return options.map(([option, produced]) => ability(context, { option }, [produced]));
}

function cockpit(context: CandidateContext, coordinatesKnown: boolean): (Candidate | null)[] {
  const { view, room } = context;
  const candidates = coordinatesKnown
    ? []
    : [ability(context, { option: ROOM_OPTION.CHECK_COORDINATES }, [effect('CHECK_COORDINATES')])];
  const current = view.ship.coordinates.currentCourseMarker;
  for (const marker of COURSE_MARKERS) {
    if (courseBlock(isAnyoneInHibernation(view), room, current, marker)) continue;
    candidates.push(
      ability(context, { option: ROOM_OPTION.SET_COURSE, targetCourseMarker: marker }, [
        effect('SET_COURSE', { marker }),
      ]),
    );
  }
  return candidates;
}

function laboratory(context: CandidateContext): (Candidate | null)[] {
  const { view, room, self } = context;
  return view.intrudersPool.weaknessSlots
    .filter((slot) => slot.visibility === 'FACE_DOWN')
    .filter(
      (slot) =>
        room.objects.some((object) => object.kind === slot.objectKind) ||
        self.handSlots.some((entry) => entry.source === 'OBJECT' && entry.object.kind === slot.objectKind),
    )
    .map((slot) =>
      ability(context, { targetObjectKind: slot.objectKind }, [effect('STUDY', { objectKind: slot.objectKind })]),
    );
}

function hatchControl(context: CandidateContext): (Candidate | null)[] {
  return Object.values(context.view.ship.escapePods)
    .filter(isPodUsable)
    .map((pod) =>
      ability(context, { targetEscapePodId: pod.id }, [
        effect(pod.isLocked ? 'UNLOCK_POD' : 'LOCK_POD', { podId: pod.id }),
      ]),
    );
}

function podBay(context: CandidateContext): (Candidate | null)[] {
  const { view, room } = context;
  const pods = boardablePods(view.ship.escapePods, room.definitionId);
  return pods
    .filter((pod) => podBoardingBlock(room, pods, pod.id) === null)
    .map((pod) => ability(context, { targetEscapePodId: pod.id }, [effect('BOARD_POD', { podId: pod.id })]));
}

/** Центр Управления (стр. 25): Двери выбранной Комнаты — перечисленные Закрываются, остальные Открываются. */
function commandCenter(context: CandidateContext, tasks: readonly BotTask[]): (Candidate | null)[] {
  const { view } = context;
  return tasks.flatMap((entry) => {
    if (entry.kind === 'SET_DOOR' && entry.detail.corridorId) {
      const corridor = view.ship.corridors[entry.detail.corridorId];
      if (!corridor || corridor.doorState === 'DESTROYED') return [];
      const target = corridor.fromRoomId;
      const closed = doorsOf(context, target).filter((door) =>
        door.id === corridor.id ? entry.detail.doorState === 'CLOSED' : door.doorState === 'CLOSED',
      );
      return [
        ability(context, { targetRoomId: target, closedCorridorIds: closed.map((door) => door.id) }, [
          effect('SET_DOOR', { corridorId: corridor.id, doorState: entry.detail.doorState }),
        ]),
      ];
    }
    if (entry.kind === 'SHIELD_ALLY' && entry.detail.roomId !== undefined) {
      const target = entry.detail.roomId;
      const toIntruders = doorsOf(context, target).filter((door) => {
        const other = door.fromRoomId === target ? door.toRoomId : door.fromRoomId;
        return door.doorState === 'CLOSED' || view.intrudersPool.boardTokens.some((token) => token.roomId === other);
      });
      return [
        ability(context, { targetRoomId: target, closedCorridorIds: toIntruders.map((door) => door.id) }, [
          effect('SHIELD_ALLY', { roomId: target, playerId: entry.detail.playerId }),
        ]),
      ];
    }
    return [];
  });
}

function doorsOf(context: CandidateContext, roomId: number) {
  return Object.values(context.view.ship.corridors).filter(
    (corridor) =>
      (corridor.fromRoomId === roomId || corridor.toRoomId === roomId) && corridor.doorState !== 'DESTROYED',
  );
}

function engineRoom(context: CandidateContext): (Candidate | null)[] {
  const match = /^ENGINE_0([123])$/.exec(context.room.definitionId ?? '');
  const engineNumber = match ? (Number(match[1]) as EngineNumber) : null;
  return engineNumber === null ? [] : [ability(context, {}, [effect('CHECK_ENGINE', { engineNumber })])];
}

/** Кандидаты Действия своей Комнаты (стр. 25–26) по тем же правилам допустимости, что у движка. */
export function roomActionCandidates(
  context: CandidateContext,
  tasks: readonly BotTask[],
  coordinatesKnown: boolean,
): Candidate[] {
  const { view, room, self, inCombat } = context;
  if (roomAbilityBlock(room, inCombat)) return [];
  const found: (Candidate | null)[] = [];
  switch (room.definitionId) {
    case 'COMM_ROOM':
      if (!self.hasSignalSent) found.push(ability(context, {}, [effect('SEND_SIGNAL')]));
      break;
    case 'INFIRMARY':
      found.push(...infirmary(context));
      break;
    case 'GENERATOR':
      if (view.meta.selfDestructTrackPosition === null) found.push(ability(context, {}, [effect('SELF_DESTRUCT')]));
      break;
    case 'FIRE_CONTROL':
      for (const target of Object.values(view.ship.rooms)) {
        if (target.hasFire)
          found.push(ability(context, { targetRoomId: target.id }, [effect('EXTINGUISH', { roomId: target.id })]));
      }
      break;
    case 'STORAGE':
      for (const color of ITEM_DECKS) {
        if (view.decks.items[color].drawPileCount > 0)
          found.push(ability(context, { targetDeckColor: color }, [effect('SEARCH')]));
      }
      break;
    case 'NEST':
      if (view.intrudersPool.eggsOnBoard > 0 && hasFreeHandSlot(self))
        found.push(ability(context, {}, [effect('TAKE_EGG')]));
      break;
    case 'LABORATORY':
      found.push(...laboratory(context));
      break;
    case 'ESCAPE_POD_A':
    case 'ESCAPE_POD_B':
      found.push(...podBay(context));
      break;
    case 'HIBERNATORIUM':
      if (!hibernationBlock(view.meta.timeTrackPosition, room)) found.push(ability(context, {}, [effect('HIBERNATE')]));
      break;
    case 'HATCH_CONTROL':
      found.push(...hatchControl(context));
      break;
    case 'SURGERY':
      found.push(ability(context, {}, [effect('CLEANSE')]));
      break;
    case 'ENGINE_01':
    case 'ENGINE_02':
    case 'ENGINE_03':
      found.push(...engineRoom(context));
      break;
    case 'ENGINE_CONTROL':
      found.push(
        ability(
          context,
          {},
          ENGINE_NUMBERS.map((engineNumber) => effect('CHECK_ENGINE', { engineNumber })),
        ),
      );
      break;
    case 'COCKPIT':
      found.push(...cockpit(context, coordinatesKnown));
      break;
    case 'COMMAND_CENTER':
      found.push(...commandCenter(context, tasks));
      break;
    case 'CANTEEN':
      found.push(...hygiene(context, self.lightWounds > 0 ? [effect('HEAL')] : []));
      break;
    case 'SHOWER':
      found.push(...hygiene(context, self.hasSlime ? [effect('CLEANSE')] : []));
      break;
    case 'ARMORY':
      if (
        self.handSlots.some(
          (slot) =>
            slot.source === 'ITEM' && slot.card.isEnergyWeapon && (slot.card.ammo ?? 0) < (slot.card.maxAmmo ?? 0),
        )
      ) {
        found.push(ability(context, {}, [effect('RELOAD')]));
      }
      break;
    default:
      break;
  }
  return found.filter((candidate): candidate is Candidate => candidate !== null);
}
