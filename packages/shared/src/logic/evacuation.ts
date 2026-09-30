import type { EngineAction } from '../types/actions.js';
import type { PendingDecision } from '../types/decisions.js';
import type { EscapePodState, PlayerState } from '../types/entities.js';
import type { InterruptEvent } from '../types/interrupts.js';
import type { RoomId, RoomState } from '../types/rooms.js';
import type { GameState } from '../types/state.js';
import { EngineError, enforceRule } from './engineErrors.js';
import {
  boardablePods,
  hibernationBlock,
  isHibernationOpen as isTimeForHibernation,
  isPodUsable,
  podBoardingBlock,
} from './actionRules.js';
import { appendGameLog } from './gameLog.js';
import { allocateEntityId } from './stateIds.js';
import { performPass, advanceTurnWithoutFire } from './turnCycle.js';
import { isPlayerInPod, podCommandsFor } from './podQueries.js';

export { isPlayerInPod, podCommandsFor };

export { isPodUsable };

export function isHibernationOpen(state: GameState): boolean {
  return isTimeForHibernation(state.meta.timeTrackPosition);
}

function removeFromRoom(room: RoomState, playerId: string): void {
  room.occupantPlayerIds = room.occupantPlayerIds.filter((id) => id !== playerId);
}

function queueAttempt(state: GameState, playerId: string, roomId: RoomId, attempt: InterruptEvent): void {
  state.interruptQueue.push(
    { type: 'NOISE_ROLL_INTERRUPT', playerId, roomId, noise: { kind: 'ROLL' }, forceRoll: true },
    attempt,
  );
}

export function startHibernationAttempt(state: GameState, actorId: string, room: RoomState): void {
  enforceRule(hibernationBlock(state.meta.timeTrackPosition, room));
  queueAttempt(state, actorId, room.id, { type: 'HIBERNATION_ATTEMPT_INTERRUPT', playerId: actorId, roomId: room.id });
}

export function resolveHibernationAttempt(
  state: GameState,
  interrupt: Extract<InterruptEvent, { type: 'HIBERNATION_ATTEMPT_INTERRUPT' }>,
): void {
  const player = state.players[interrupt.playerId];
  const room = state.ship.rooms[interrupt.roomId];
  if (!player || !room || player.isDead) return;
  const success = room.occupantIntruderIds.length === 0;
  if (success) {
    player.isInHibernation = true;
    removeFromRoom(room, player.id);
  }
  appendGameLog(state, { type: 'HIBERNATION_ATTEMPTED', playerId: player.id, roomId: room.id, success });
}

export function startPodBoarding(state: GameState, actorId: string, room: RoomState, podId: string | undefined): void {
  const candidates = boardablePods(state.ship.escapePods, room.definitionId);
  enforceRule(podBoardingBlock(room, candidates, podId));
  const pod = (podId ? candidates.find((entry) => entry.id === podId) : candidates[0])!;
  queueAttempt(state, actorId, room.id, {
    type: 'ESCAPE_POD_BOARDING_INTERRUPT',
    playerId: actorId,
    roomId: room.id,
    podId: pod.id,
  });
}

export function resolvePodBoarding(
  state: GameState,
  interrupt: Extract<InterruptEvent, { type: 'ESCAPE_POD_BOARDING_INTERRUPT' }>,
): void {
  const player = state.players[interrupt.playerId];
  const room = state.ship.rooms[interrupt.roomId];
  const pod = state.ship.escapePods[interrupt.podId];
  if (!player || !room || !pod || player.isDead) return;
  const success = room.occupantIntruderIds.length === 0 && isPodUsable(pod) && pod.occupantIds.length < 2;
  appendGameLog(state, {
    type: 'ESCAPE_POD_BOARDING_ATTEMPTED',
    playerId: player.id,
    podId: pod.id,
    podNumber: pod.number,
    success,
  });
  if (!success) return;
  pod.occupantIds.push(player.id);
  player.boardedPodId = pod.id;
  player.boardedRound = state.meta.currentRound;
  removeFromRoom(room, player.id);
  state.pendingDecision = {
    id: allocateEntityId(state, 'escape-pod-launch'),
    playerId: player.id,
    type: 'ESCAPE_POD_LAUNCH_CHOICE',
    podId: pod.id,
  };
}

export function launchPod(state: GameState, pod: EscapePodState): void {
  const occupantIds = [...pod.occupantIds];
  for (const id of occupantIds) {
    const occupant = state.players[id];
    if (!occupant) continue;
    occupant.hasEscapedInPod = true;
    occupant.boardedPodId = null;
    occupant.boardedRound = null;
  }
  pod.isLaunched = true;
  appendGameLog(state, { type: 'ESCAPE_POD_LAUNCHED', podId: pod.id, podNumber: pod.number, occupantIds });
}

function returnToRoom(
  state: GameState,
  player: PlayerState,
  pod: EscapePodState,
  reason: 'VOLUNTARY' | 'INTRUDER' | 'POD_DESTROYED',
): void {
  pod.occupantIds = pod.occupantIds.filter((id) => id !== player.id);
  player.boardedPodId = null;
  player.boardedRound = null;
  const room = state.ship.rooms[player.roomId];
  if (room && !room.occupantPlayerIds.includes(player.id)) room.occupantPlayerIds.push(player.id);
  appendGameLog(state, {
    type: 'ESCAPE_POD_EXITED',
    playerId: player.id,
    podId: pod.id,
    podNumber: pod.number,
    reason,
  });
}

export function evacuatePod(state: GameState, pod: EscapePodState, reason: 'INTRUDER' | 'POD_DESTROYED'): void {
  for (const id of [...pod.occupantIds]) {
    const occupant = state.players[id];
    if (occupant && !occupant.hasEscapedInPod) returnToRoom(state, occupant, pod, reason);
  }
}

export function guardEscapePods(state: GameState): void {
  for (const pod of Object.values(state.ship.escapePods)) {
    if (pod.isLaunched || pod.occupantIds.length === 0) continue;
    const occupant = state.players[pod.occupantIds[0]!];
    const room = occupant ? state.ship.rooms[occupant.roomId] : undefined;
    if (room && room.occupantIntruderIds.length > 0) evacuatePod(state, pod, 'INTRUDER');
  }
}

export function resolvePodLaunchChoice(
  state: GameState,
  decision: Extract<PendingDecision, { type: 'ESCAPE_POD_LAUNCH_CHOICE' }>,
  selectedOption: string,
): void {
  if (selectedOption !== 'LAUNCH' && selectedOption !== 'WAIT') {
    throw new EngineError('INVALID_DECISION_OPTION', 'Допустимы только варианты LAUNCH или WAIT.');
  }
  state.pendingDecision = null;
  const pod = state.ship.escapePods[decision.podId]!;
  if (selectedOption === 'LAUNCH') {
    launchPod(state, pod);
    return;
  }
  appendGameLog(state, {
    type: 'ESCAPE_POD_WAITING',
    playerId: decision.playerId,
    podId: pod.id,
    podNumber: pod.number,
  });
}

export function executeEscapePodCommand(
  state: GameState,
  action: Extract<EngineAction, { type: 'ACTION_ESCAPE_POD' }>,
  actorId: string,
): void {
  const player = state.players[actorId]!;
  const pod = player.boardedPodId ? state.ship.escapePods[player.boardedPodId] : undefined;
  if (!pod) throw new EngineError('INVALID_DECISION_OPTION', 'Персонаж не находится в Капсуле.');
  const command = action.payload.command;
  if (!podCommandsFor(state, player).includes(command)) {
    throw new EngineError(
      'INVALID_DECISION_OPTION',
      'Запустить Капсулу, в которой вы ждёте, можно только в одной из следующих Фаз Игроков (стр. 26).',
    );
  }
  if (command === 'EXIT') {
    returnToRoom(state, player, pod, 'VOLUNTARY');
    return;
  }
  if (command === 'STAY') {
    performPass(state, actorId);
    return;
  }
  launchPod(state, pod);
  advanceTurnWithoutFire(state, actorId);
}

export function togglePodLock(
  state: GameState,
  actorId: string,
  podId: string | undefined,
  source: 'HATCH_CONTROL' | 'EVACUATION_KEY',
  section?: 'A' | 'B',
): void {
  const pod = podId ? state.ship.escapePods[podId] : undefined;
  if (!pod || (section && pod.section !== section)) {
    throw new EngineError(
      'INVALID_DECISION_OPTION',
      section ? 'Выберите Капсулу вашего Спасательного отсека.' : 'Выберите Капсулу.',
    );
  }
  if (!isPodUsable(pod)) throw new EngineError('INVALID_DECISION_OPTION', 'Эта Капсула уничтожена или уже улетела.');
  pod.isLocked = !pod.isLocked;
  appendGameLog(state, {
    type: 'ESCAPE_POD_TOGGLED',
    playerId: actorId,
    podId: pod.id,
    podNumber: pod.number,
    isLocked: pod.isLocked,
    source,
  });
}
