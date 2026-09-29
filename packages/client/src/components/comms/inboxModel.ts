import type { Commitment, CommsDraft, CommsMessage, SanitizedGameState } from '@nemesis/shared';
import { commsUsageThisTurn, isRequestOpen } from '@nemesis/shared';
import { playerName } from '../log/gameLogModel';
import { draftText, requestText } from './commsPhrases';

type RequestMessage = Extract<CommsMessage, { kind: 'REQUEST' }>;

export type InboxItem =
  | {
      key: string;
      kind: 'REQUEST';
      request: RequestMessage;
      authorName: string;
      text: string;
      lastRound: boolean;
      personal: boolean;
    }
  | { key: string; kind: 'COMMITMENT'; commitment: Commitment; requesterName: string; text: string }
  | { key: string; kind: 'QUEUED'; index: number; draft: CommsDraft; text: string };

/** Ключ хода зрителя: «Позже» прячет пункт до конца этого хода. */
export function inboxTurnKey(view: SanitizedGameState): string {
  return `${view.meta.gameId}:${view.viewerId}:${commsUsageThisTurn(view, view.viewerId).turnMarker}`;
}

function answeredByViewer(view: SanitizedGameState, requestId: string): boolean {
  return view.comms.messages.some(
    (message) =>
      message.kind === 'ANSWER' && message.authorId === view.viewerId && message.body.requestId === requestId,
  );
}

function requestsForViewer(view: SanitizedGameState): InboxItem[] {
  return view.comms.messages
    .filter((message): message is RequestMessage => message.kind === 'REQUEST')
    .filter(
      (request) =>
        request.authorId !== view.viewerId &&
        (request.to === 'ALL' || request.to === view.viewerId) &&
        isRequestOpen(view, request) &&
        !answeredByViewer(view, request.id),
    )
    .map((request) => ({
      key: request.id,
      kind: 'REQUEST',
      request,
      authorName: playerName(view, request.authorId),
      text: requestText(view, request.body),
      lastRound: request.expiresAtRound === view.meta.currentRound,
      personal: request.to === view.viewerId,
    }));
}

function expiringCommitments(view: SanitizedGameState): InboxItem[] {
  return view.comms.commitments
    .filter(
      (commitment) =>
        commitment.helperId === view.viewerId &&
        commitment.status === 'OPEN' &&
        commitment.expiresAtRound === view.meta.currentRound,
    )
    .map((commitment) => {
      const request = view.comms.messages.find((message) => message.id === commitment.requestId);
      return {
        key: commitment.id,
        kind: 'COMMITMENT',
        commitment,
        requesterName: playerName(view, commitment.requesterId),
        text: request?.kind === 'REQUEST' ? requestText(view, request.body) : 'Просьба',
      };
    });
}

/** «Входящие» в начале хода (В8-4-3): Просьбы к вам и ко всем, истекающие обещания, отложенные Заявления. */
export function buildInbox(
  view: SanitizedGameState,
  postponedKeys: readonly string[],
  queued: readonly CommsDraft[],
): InboxItem[] {
  const queuedItems: InboxItem[] = queued.map((draft, index) => ({
    key: `queued-${index}`,
    kind: 'QUEUED',
    index,
    draft,
    text: draftText(view, draft),
  }));
  return [...queuedItems, ...requestsForViewer(view), ...expiringCommitments(view)].filter(
    (item) => !postponedKeys.includes(item.key),
  );
}
