import type { CommsIntent, CommsMessage } from '../types/comms.js';
import type { RoomId } from '../types/rooms.js';
import type { SanitizedGameState, SanitizedPlayerState } from '../types/sanitized.js';
import { hopDistances } from './botGraph.js';
import type { BotMind } from './botMind.js';
import { trustIn } from './botSocial.js';
import { task, type BotTask, type TaskKind } from './botTasks.js';
import type { BotTuning } from './botTuning.js';

type IntentMessage = Extract<CommsMessage, { kind: 'INTENT' }>;

/** Задачи корабля, которые хватит сделать одному: их делят по Намерениям в Рации и по близости. */
export const SHARED_TASKS: ReadonlySet<TaskKind> = new Set([
  'CHECK_ENGINE',
  'REPAIR_ENGINE',
  'CHECK_COORDINATES',
  'SET_COURSE',
  'UNLOCK_POD',
  'EXTINGUISH',
  'FIX_MALFUNCTION',
]);

function isActiveCrew(player: SanitizedPlayerState): boolean {
  return !player.isDead && !player.isInHibernation && !player.hasEscapedInPod && !player.boardedPodId;
}

function targetRooms(view: SanitizedGameState, place: BotTask['place']): RoomId[] {
  const byDefinition = Object.values(view.ship.rooms)
    .filter((room) => room.definitionId !== null && (place.definitionIds ?? []).includes(room.definitionId))
    .map((room) => room.id);
  return [...(place.roomIds ?? []), ...byDefinition];
}

/** Как задача звучит в Рации (В8-3): Двигатели, Мостик, Укрытие, Прикрытие или конкретная Комната. */
export function intentForTask(view: SanitizedGameState, entry: BotTask): CommsIntent | null {
  switch (entry.kind) {
    case 'HIBERNATE':
      return { topic: 'GO_TO_HIBERNATION' };
    case 'CHECK_ENGINE':
    case 'REPAIR_ENGINE':
      return { topic: 'GO_TO_ENGINES' };
    case 'CHECK_COORDINATES':
    case 'SET_COURSE':
      return { topic: 'GO_TO_BRIDGE' };
    case 'HEAL':
      return { topic: 'GO_HEAL' };
    case 'EXPLORE':
      return { topic: 'EXPLORE' };
    case 'BOARD_POD':
      if (entry.detail.podId) return { topic: 'GO_TO_POD', podId: entry.detail.podId };
      break;
    case 'SHIELD_ALLY':
    case 'ESCORT':
      if (entry.detail.playerId) return { topic: 'COVER_PLAYER', playerId: entry.detail.playerId };
      break;
    default:
      break;
  }
  const [roomId] = targetRooms(view, entry.place);
  if (roomId !== undefined) return { topic: 'GO_TO_ROOM', roomId };
  const [definitionId] = entry.place.definitionIds ?? [];
  return definitionId === undefined ? null : { topic: 'SEEK_ROOM', definitionId };
}

const intentKey = (intent: CommsIntent): string => JSON.stringify(intent);

/** Свежие Намерения надёжных товарищей: по одному, последнему, от каждого — новое отменяет старое. */
function mateIntents(view: SanitizedGameState, mind: BotMind, tuning: BotTuning): IntentMessage[] {
  const since = view.meta.currentRound - tuning.trust.intentWindowRounds;
  const latest = new Map<string, IntentMessage>();
  for (const message of view.comms.messages) {
    if (message.kind !== 'INTENT' || message.authorId === mind.botId || message.round < since) continue;
    latest.set(message.authorId, message);
  }
  return [...latest.values()].filter((message) => {
    const author = view.players[message.authorId];
    const model = mind.players[message.authorId];
    return author && isActiveCrew(author) && model && trustIn(model, tuning) >= tuning.tactics.team.claimTrust;
  });
}

function distanceFrom(view: SanitizedGameState, roomId: RoomId, targets: readonly RoomId[]): number {
  if (targets.length === 0) return Number.POSITIVE_INFINITY;
  const distances = hopDistances(view, roomId);
  return Math.min(...targets.map((target) => distances.get(target) ?? Number.POSITIVE_INFINITY));
}

/** Общую задачу, которую объявил надёжный товарищ не дальше от неё, бот оставляет ему: вес — доля `claimedShare`. */
export function yieldClaimedTasks(
  view: SanitizedGameState,
  mind: BotMind,
  tasks: BotTask[],
  tuning: BotTuning,
): BotTask[] {
  const share = tuning.tactics.team.claimedShare;
  if (share >= 1) return tasks;
  const claims = mateIntents(view, mind, tuning);
  const self = view.players[mind.botId];
  if (claims.length === 0 || !self) return tasks;
  return tasks.map((entry) => {
    const intent = SHARED_TASKS.has(entry.kind) ? intentForTask(view, entry) : null;
    if (!intent) return entry;
    const targets = targetRooms(view, entry.place);
    const mine = distanceFrom(view, self.roomId, targets);
    const yielded = claims.some(
      (message) =>
        intentKey(message.body) === intentKey(intent) &&
        distanceFrom(view, view.players[message.authorId]!.roomId, targets) <= mine,
    );
    return yielded ? { ...entry, weight: entry.weight * share } : entry;
  });
}

/**
 * Прикрытие (группа по двое): бот без дела весомее прикрытия идёт за ближайшим товарищем, который объявил поход и
 * которого ещё никто не прикрывает. Вход в Комнату к товарищу не бросает кубик Шума (стр. 15).
 */
export function escortTasks(view: SanitizedGameState, mind: BotMind, tasks: BotTask[], tuning: BotTuning): BotTask[] {
  const value = tuning.tactics.team.escort;
  const self = view.players[mind.botId];
  if (value <= 0 || !self || !isActiveCrew(self)) return [];
  if (tasks.some((entry) => entry.weight >= value)) return [];
  const intents = mateIntents(view, mind, tuning);
  const covered = new Set(
    view.comms.messages
      .filter((message) => message.kind === 'INTENT' && message.authorId !== mind.botId)
      .flatMap((message) =>
        message.kind === 'INTENT' && message.body.topic === 'COVER_PLAYER' ? [message.body.playerId] : [],
      ),
  );
  const distances = hopDistances(view, self.roomId);
  const partner = intents
    .filter((message) => message.body.topic !== 'COVER_PLAYER' && !covered.has(message.authorId))
    .map((message) => view.players[message.authorId]!)
    .sort((left, right) => (distances.get(left.roomId) ?? Infinity) - (distances.get(right.roomId) ?? Infinity))[0];
  if (!partner) return [];
  return [task('ESCORT', 'HELP', value, { roomIds: [partner.roomId] }, 'Прикрыть товарища', { playerId: partner.id })];
}

/** Общая задача корабля достаётся ближайшему к ней члену экипажа: остальным она стоит доли `share`. */
export function teamShare(view: SanitizedGameState, selfId: string, place: BotTask['place'], share: number): number {
  if (share >= 1) return 1;
  const targets = targetRooms(view, place);
  const self = view.players[selfId];
  if (!self || targets.length === 0) return 1;
  const distanceFrom = (roomId: RoomId): number => {
    const distances = hopDistances(view, roomId);
    return Math.min(...targets.map((target) => distances.get(target) ?? Number.POSITIVE_INFINITY));
  };
  const mine = distanceFrom(self.roomId);
  const nearerMate = Object.values(view.players).some(
    (player) => player.id !== selfId && isActiveCrew(player) && distanceFrom(player.roomId) < mine,
  );
  return nearerMate ? share : 1;
}

export function sharedAmongCrew(view: SanitizedGameState, selfId: string, tasks: BotTask[], share: number): BotTask[] {
  return tasks.map((entry) => ({ ...entry, weight: entry.weight * teamShare(view, selfId, entry.place, share) }));
}
