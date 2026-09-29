import type { Commitment, CommitmentStatus, CommsMessage } from '../../types/comms.js';
import type { GameLogEntry } from '../../types/log.js';
import type { GameState } from '../../types/state.js';
import { appendGameLog } from '../gameLog.js';
import { findCommsMessage } from './commsState.js';

type Outcome = Exclude<CommitmentStatus, 'OPEN'>;
type RequestMessage = Extract<CommsMessage, { kind: 'REQUEST' }>;

function helperInPod(state: GameState, commitment: Commitment, podId: string): boolean {
  return state.players[commitment.helperId]?.boardedPodId === podId;
}

/** Таблица В8-3-4: чем выполняется или нарушается обещание — только по публичным записям журнала. */
function judge(state: GameState, commitment: Commitment, request: RequestMessage, entry: GameLogEntry): Outcome | null {
  const event = entry.event;
  const { helperId, requesterId } = commitment;
  const topic = request.body;
  switch (topic.topic) {
    case 'CHECK_ENGINE':
      return event.type === 'ENGINES_INSPECTED' &&
        event.playerId === helperId &&
        event.engines.some((engine) => engine.engineNumber === topic.engineNumber)
        ? 'FULFILLED'
        : null;
    case 'CHECK_COORDINATES':
      return event.type === 'COORDINATES_INSPECTED' && event.playerId === helperId ? 'FULFILLED' : null;
    case 'HELP_KILL':
      return (event.type === 'SHOOT_RESOLVED' || event.type === 'MELEE_RESOLVED') &&
        event.playerId === helperId &&
        event.roomId === topic.roomId
        ? 'FULFILLED'
        : null;
    case 'NEED_ITEM':
      return event.type === 'EXCHANGE_COMPLETED' &&
        event.entries.some((item) => item.fromPlayerId === helperId && item.toPlayerId === requesterId)
        ? 'FULFILLED'
        : null;
    case 'SET_DOOR':
      if (event.type !== 'DOOR_CHANGED' || event.playerId !== helperId || event.corridorId !== topic.corridorId) {
        return null;
      }
      return event.to === topic.doorState ? 'FULFILLED' : 'BROKEN';
    case 'EXTINGUISH':
      return event.type === 'FIRE_EXTINGUISHED' && event.playerId === helperId && event.roomId === topic.roomId
        ? 'FULFILLED'
        : null;
    case 'WAIT_IN_POD':
      if (event.type === 'ESCAPE_POD_LAUNCHED' && event.podId === topic.podId && event.occupantIds.includes(helperId)) {
        return event.occupantIds.includes(requesterId) ? 'FULFILLED' : 'BROKEN';
      }
      if (
        event.type === 'ESCAPE_POD_EXITED' &&
        event.reason === 'VOLUNTARY' &&
        event.playerId === helperId &&
        event.podId === topic.podId
      ) {
        return 'BROKEN';
      }
      return event.type === 'ESCAPE_POD_BOARDING_ATTEMPTED' &&
        event.playerId === requesterId &&
        event.podId === topic.podId &&
        event.success &&
        helperInPod(state, commitment, topic.podId)
        ? 'FULFILLED'
        : null;
    case 'NO_SELF_DESTRUCT':
      return event.type === 'SELF_DESTRUCT_TOGGLED' && event.playerId === helperId && event.isActive ? 'BROKEN' : null;
  }
}

function leftTheGame(state: GameState, playerId: string): boolean {
  const player = state.players[playerId];
  return !player || player.isDead;
}

/** Срок вышел: «не запускать» выполнено молчанием, остальное — истекло. Выбывший участник снимает обещание. */
function expiryOutcome(state: GameState, commitment: Commitment, request: RequestMessage): Outcome | null {
  if (leftTheGame(state, commitment.helperId) || leftTheGame(state, commitment.requesterId)) return 'EXPIRED';
  if (state.meta.phase !== 'GAME_OVER' && state.meta.currentRound <= commitment.expiresAtRound) return null;
  return request.body.topic === 'NO_SELF_DESTRUCT' ? 'FULFILLED' : 'EXPIRED';
}

function resolve(state: GameState, commitment: Commitment, status: Outcome, logSequence: number | null): void {
  commitment.status = status;
  commitment.resolvedRound = state.meta.currentRound;
  commitment.resolvedLogSequence = logSequence;
  appendGameLog(state, {
    type: 'COMMITMENT_RESOLVED',
    commitmentId: commitment.id,
    helperId: commitment.helperId,
    requesterId: commitment.requesterId,
    status,
  });
}

export function trackCommitments(state: GameState): void {
  const fresh = state.gameLog.filter((entry) => entry.sequence > state.comms.trackedLogSequence);
  for (const commitment of state.comms.commitments) {
    if (commitment.status !== 'OPEN') continue;
    const request = findCommsMessage(state, commitment.requestId) as RequestMessage;
    const decisive = fresh
      .map((entry) => ({ entry, outcome: judge(state, commitment, request, entry) }))
      .find((candidate) => candidate.outcome !== null);
    if (decisive) {
      resolve(state, commitment, decisive.outcome!, decisive.entry.sequence);
      continue;
    }
    const expired = expiryOutcome(state, commitment, request);
    if (expired) resolve(state, commitment, expired, null);
  }
  state.comms.trackedLogSequence = state.gameLog.at(-1)?.sequence ?? 0;
}
