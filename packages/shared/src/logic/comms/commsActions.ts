import type { CommsAnswer, CommsDraft, CommsMessage, CommsState, CommsTurnUsage } from '../../types/comms.js';
import type { GameState } from '../../types/state.js';
import { EngineError } from '../engineErrors.js';
import { appendCommsMessage, findCommsMessage } from './commsState.js';
import { COMMS_SETTINGS } from './commsSettings.js';
import {
  requireAddressee,
  requireClaimTarget,
  requireIntentTarget,
  requireReactionTarget,
  requireRequestTarget,
} from './commsTargets.js';

type RequestMessage = Extract<CommsMessage, { kind: 'REQUEST' }>;

/** Полное состояние или срез игрока: для лимитов нужны только журнал и Рация, обе публичны. */
export interface CommsLedger {
  gameLog: readonly { sequence: number; event: { type: string } }[];
  comms: Pick<CommsState, 'turnUsage'>;
}

function currentTurnMarker(state: CommsLedger): number {
  for (let index = state.gameLog.length - 1; index >= 0; index--) {
    const entry = state.gameLog[index]!;
    if (entry.event.type === 'PLAYER_TURN_STARTED') return entry.sequence;
  }
  return 0;
}

/** Лимиты Рации (Р-9) считаются за текущий ход: новый ход — новые счётчики. */
export function commsUsageThisTurn(state: CommsLedger, playerId: string): CommsTurnUsage {
  const turnMarker = currentTurnMarker(state);
  const usage = state.comms.turnUsage;
  if (usage && usage.playerId === playerId && usage.turnMarker === turnMarker) return usage;
  return { playerId, turnMarker, ordinary: 0, requests: 0 };
}

function spendLimit(state: GameState, authorId: string, draft: CommsDraft): void {
  if (draft.kind === 'ANSWER') return;
  const usage = { ...commsUsageThisTurn(state, authorId) };
  if (draft.kind === 'REQUEST') {
    if (usage.requests >= COMMS_SETTINGS.requestsPerTurn) {
      throw new EngineError('COMMS_LIMIT_REACHED', `Просьба — не больше ${COMMS_SETTINGS.requestsPerTurn} за ход.`);
    }
    usage.requests += 1;
  } else {
    if (usage.ordinary >= COMMS_SETTINGS.ordinaryMessagesPerTurn) {
      throw new EngineError(
        'COMMS_LIMIT_REACHED',
        `За ход — не больше ${COMMS_SETTINGS.ordinaryMessagesPerTurn} Заявлений, Намерений и Реакций.`,
      );
    }
    usage.ordinary += 1;
  }
  state.comms.turnUsage = usage;
}

export function isRequestOpen(state: Pick<GameState, 'meta'>, request: RequestMessage): boolean {
  return state.meta.currentRound <= request.expiresAtRound;
}

function requireAnswerableRequest(state: GameState, authorId: string, answer: CommsAnswer): RequestMessage {
  const request = findCommsMessage(state, answer.requestId);
  if (!request || request.kind !== 'REQUEST') throw new EngineError('COMMS_UNKNOWN_TARGET', 'Такой Просьбы нет.');
  if (request.authorId === authorId) throw new EngineError('COMMS_INVALID_ADDRESSEE', 'На свою Просьбу не ответить.');
  if (request.to !== 'ALL' && request.to !== authorId) {
    throw new EngineError('COMMS_INVALID_ADDRESSEE', 'Эта Просьба обращена к другому игроку.');
  }
  if (!isRequestOpen(state, request)) throw new EngineError('COMMS_UNKNOWN_TARGET', 'Срок этой Просьбы истёк.');
  const answered = state.comms.messages.some(
    (message) => message.kind === 'ANSWER' && message.authorId === authorId && message.body.requestId === request.id,
  );
  if (answered) throw new EngineError('COMMS_FORBIDDEN', 'Вы уже ответили на эту Просьбу.');
  return request;
}

function answerRequest(state: GameState, authorId: string, answer: CommsAnswer): void {
  const request = requireAnswerableRequest(state, authorId, answer);
  const stored = appendCommsMessage(state, { kind: 'ANSWER', authorId, to: request.authorId, body: answer });
  if (answer.answer !== 'WILL_HELP') return;
  state.comms.commitments.push({
    id: `commitment-${stored.sequence}`,
    requestId: request.id,
    answerId: stored.id,
    requesterId: request.authorId,
    helperId: authorId,
    createdRound: state.meta.currentRound,
    expiresAtRound: request.expiresAtRound,
    status: 'OPEN',
    resolvedRound: null,
    resolvedLogSequence: null,
  });
}

/** Рация (план 0.8.0, В8-3): бесплатно, только в свой ход, в пределах лимитов; содержание не проверяется — блеф законен. */
export function executeComms(state: GameState, authorId: string, draft: CommsDraft): void {
  if ((draft as { kind: string }).kind === 'SYSTEM') {
    throw new EngineError('COMMS_FORBIDDEN', 'Системные объявления делает только корабль.');
  }
  if (draft.kind === 'ANSWER') {
    answerRequest(state, authorId, draft.body);
    return;
  }
  requireAddressee(state, authorId, draft.to);
  switch (draft.kind) {
    case 'CLAIM':
      requireClaimTarget(state, draft.body);
      break;
    case 'INTENT':
      requireIntentTarget(state, authorId, draft.body);
      break;
    case 'REQUEST':
      requireRequestTarget(state, draft.body);
      break;
    case 'REACTION':
      requireReactionTarget(state, authorId, draft.body);
      break;
    default:
      throw new EngineError('COMMS_FORBIDDEN', 'Неизвестный тип сообщения Рации.');
  }
  spendLimit(state, authorId, draft);
  if (draft.kind === 'REQUEST') {
    appendCommsMessage(state, {
      kind: 'REQUEST',
      authorId,
      to: draft.to,
      body: draft.body,
      expiresAtRound: state.meta.currentRound + COMMS_SETTINGS.requestLifetimeRounds,
    });
    return;
  }
  appendCommsMessage(state, { ...draft, authorId });
}
