import type { CharacterClass, Commitment, CommsKind, CommsMessage, SanitizedGameState } from '@nemesis/shared';
import { COMMS_SETTINGS, commsUsageThisTurn, isRequestOpen } from '@nemesis/shared';
import { playerName } from '../log/gameLogModel';
import { addresseeText, messageText } from './commsPhrases';

export interface FeedAnswer {
  authorName: string;
  willHelp: boolean;
  commitment: Commitment | null;
}

export interface FeedItem {
  id: string;
  kind: CommsKind;
  round: number;
  authorId: string | null;
  authorName: string;
  authorClass: CharacterClass | null;
  addressee: string;
  isForViewer: boolean;
  isFromViewer: boolean;
  text: string;
  request: { expiresAtRound: number; isOpen: boolean; answers: FeedAnswer[]; canAnswer: boolean } | null;
}

export interface FeedRound {
  round: number;
  items: FeedItem[];
}

export interface CommsUsageView {
  ordinaryLeft: number;
  requestsLeft: number;
  canSpeak: boolean;
}

function viewerCanSpeak(view: SanitizedGameState): boolean {
  const viewer = view.players[view.viewerId];
  return (
    view.meta.phase === 'PLAYER_PHASE' &&
    view.meta.activePlayerId === view.viewerId &&
    view.pendingDecisionPlayerId === null &&
    viewer !== undefined &&
    !viewer.isDead &&
    !viewer.hasPassed
  );
}

export function commsUsageView(view: SanitizedGameState): CommsUsageView {
  const usage = commsUsageThisTurn(view, view.viewerId);
  return {
    ordinaryLeft: Math.max(0, COMMS_SETTINGS.ordinaryMessagesPerTurn - usage.ordinary),
    requestsLeft: Math.max(0, COMMS_SETTINGS.requestsPerTurn - usage.requests),
    canSpeak: viewerCanSpeak(view),
  };
}

function answersTo(view: SanitizedGameState, requestId: string): FeedAnswer[] {
  return view.comms.messages
    .filter((message) => message.kind === 'ANSWER' && message.body.requestId === requestId)
    .map((message) => ({
      authorName: playerName(view, message.authorId!),
      willHelp: message.kind === 'ANSWER' && message.body.answer === 'WILL_HELP',
      commitment: view.comms.commitments.find((commitment) => commitment.answerId === message.id) ?? null,
    }));
}

function requestDetails(view: SanitizedGameState, message: Extract<CommsMessage, { kind: 'REQUEST' }>) {
  const isOpen = isRequestOpen(view, message);
  const answered = view.comms.messages.some(
    (candidate) =>
      candidate.kind === 'ANSWER' && candidate.authorId === view.viewerId && candidate.body.requestId === message.id,
  );
  const addressedToViewer = message.to === 'ALL' || message.to === view.viewerId;
  return {
    expiresAtRound: message.expiresAtRound,
    isOpen,
    answers: answersTo(view, message.id),
    canAnswer: isOpen && addressedToViewer && message.authorId !== view.viewerId && !answered && viewerCanSpeak(view),
  };
}

export function toFeedItem(view: SanitizedGameState, message: CommsMessage): FeedItem {
  const author = message.authorId === null ? undefined : view.players[message.authorId];
  return {
    id: message.id,
    kind: message.kind,
    round: message.round,
    authorId: message.authorId,
    authorName: message.authorId === null ? 'Корабль' : playerName(view, message.authorId),
    authorClass: author?.characterClass ?? null,
    addressee: addresseeText(view, message),
    isForViewer: message.to === view.viewerId,
    isFromViewer: message.authorId === view.viewerId,
    text: messageText(view, message),
    request: message.kind === 'REQUEST' ? requestDetails(view, message) : null,
  };
}

/** Лента Рации: ответы показываются под своей Просьбой, а не отдельной строкой. */
export function buildCommsFeed(view: SanitizedGameState): FeedRound[] {
  const rounds = new Map<number, FeedItem[]>();
  for (const message of view.comms.messages) {
    if (message.kind === 'ANSWER') continue;
    const items = rounds.get(message.round) ?? [];
    items.push(toFeedItem(view, message));
    rounds.set(message.round, items);
  }
  return [...rounds.entries()].sort(([left], [right]) => right - left).map(([round, items]) => ({ round, items }));
}

export function lastSystemAnnouncement(view: SanitizedGameState): Extract<CommsMessage, { kind: 'SYSTEM' }> | null {
  for (let index = view.comms.messages.length - 1; index >= 0; index--) {
    const message = view.comms.messages[index]!;
    if (message.kind === 'SYSTEM') return message;
  }
  return null;
}

export function lastCommsSequence(view: SanitizedGameState): number {
  return view.comms.messages.at(-1)?.sequence ?? 0;
}
