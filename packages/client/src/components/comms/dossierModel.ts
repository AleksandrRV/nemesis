import type {
  CharacterClass,
  CommitmentStatus,
  CommsKind,
  CommsMessage,
  ItemColor,
  SanitizedGameState,
} from '@nemesis/shared';
import { COORDINATE_CARDS } from '@nemesis/shared';
import { playerName, roomLabel } from '../log/gameLogModel';
import { messageText, requestText } from './commsPhrases';

export type KnowledgeMark =
  'CONFIRMED' | 'CONTRADICTED' | 'PROMISE_KEPT' | 'PROMISE_BROKEN' | 'PROMISE_EXPIRED' | 'PROMISED';

export const KNOWLEDGE_MARK_LABELS: Record<KnowledgeMark, string> = {
  CONFIRMED: 'подтверждено вашей проверкой',
  CONTRADICTED: 'противоречит вашей проверке',
  PROMISE_KEPT: 'обещание выполнено',
  PROMISE_BROKEN: 'обещание нарушено',
  PROMISE_EXPIRED: 'обещание истекло',
  PROMISED: 'обещание в силе',
};

export interface DossierStatement {
  id: string;
  round: number;
  kind: CommsKind;
  text: string;
  mark: KnowledgeMark | null;
}

export interface DossierStatus {
  label: string;
  tone: 'danger' | 'warning' | 'info' | 'success' | 'muted';
}

export interface PlayerDossier {
  playerId: string;
  name: string;
  characterClass: CharacterClass;
  orderNumber: number;
  seatLabel: string | null;
  isBot: boolean;
  isViewer: boolean;
  location: string;
  lightWounds: number;
  seriousWounds: number;
  hasSlime: boolean;
  handCount: number;
  inventoryColors: ItemColor[];
  handSlots: string[];
  statuses: DossierStatus[];
  statements: DossierStatement[];
  honesty: { confirmed: number; contradicted: number; kept: number; broken: number };
}

const OBJECT_NAMES = { CORPSE: 'Труп', EGG: 'Яйцо', INTRUDER_REMAINS: 'Останки Чужого' } as const;

type ClaimMessage = Extract<CommsMessage, { kind: 'CLAIM' }>;

function engineChangesAfter(view: SanitizedGameState, engineNumber: number, sequence: number): number {
  return view.comms.messages.filter(
    (message) => message.kind === 'SYSTEM' && message.body.engineNumber === engineNumber && message.sequence > sequence,
  ).length;
}

/** Состояние Двигателя в момент Заявления по знанию зрителя: текущее знание минус объявленные позже перестановки. */
function knownEngineAt(view: SanitizedGameState, engineNumber: number, sequence: number): boolean | null {
  const current = view.ship.engines[engineNumber as 1 | 2 | 3]?.isWorking ?? null;
  if (current === null) return null;
  return engineChangesAfter(view, engineNumber, sequence) % 2 === 0 ? current : !current;
}

function destinationKnown(view: SanitizedGameState, marker: 'A' | 'B' | 'C' | 'D') {
  const cardId = view.ship.coordinates.cardId;
  const card = cardId === null ? undefined : COORDINATE_CARDS.find((entry) => entry.id === cardId);
  return card?.destinations[marker] ?? null;
}

/** Рация и журнал нумеруются отдельно: смену Курса в том же или позднем раунде считаем неизвестной по времени. */
function courseChangedSince(view: SanitizedGameState, round: number): boolean {
  const roundStart = view.gameLog.find((entry) => entry.event.type === 'ROUND_STARTED' && entry.event.round === round);
  const since = roundStart?.sequence ?? 0;
  return view.gameLog.some((entry) => entry.event.type === 'COURSE_SET' && entry.sequence >= since);
}

function verdict(matches: boolean | null): KnowledgeMark | null {
  if (matches === null) return null;
  return matches ? 'CONFIRMED' : 'CONTRADICTED';
}

/** Отметки только по тому, что знает зритель: его проверки, открытые тайлы, видимые Руки. */
export function claimMark(view: SanitizedGameState, message: ClaimMessage): KnowledgeMark | null {
  const claim = message.body;
  switch (claim.topic) {
    case 'ENGINE_STATUS': {
      const known = knownEngineAt(view, claim.engineNumber, message.sequence);
      return verdict(known === null ? null : known === (claim.status === 'WORKING'));
    }
    case 'COORDINATES': {
      const destination = destinationKnown(view, claim.marker);
      return verdict(destination === null ? null : destination === claim.destination);
    }
    case 'COURSE': {
      if (courseChangedSince(view, message.round)) return null;
      const destination = destinationKnown(view, view.ship.coordinates.currentCourseMarker);
      return verdict(destination === null ? null : (destination === 'EARTH') === claim.toEarth);
    }
    case 'ROOM_IDENTITY': {
      const definitionId = view.ship.rooms[claim.roomId]?.definitionId ?? null;
      return verdict(definitionId === null ? null : definitionId === claim.definitionId);
    }
    case 'HAS_ITEM': {
      const author = view.players[message.authorId];
      const holds = author?.handSlots.some((slot) => slot.source === 'ITEM' && slot.card.name === claim.itemName);
      return holds ? 'CONFIRMED' : null;
    }
    case 'ENGINE_DEED':
    case 'NOT_INFECTED':
      return null;
  }
}

const PROMISE_MARKS: Record<CommitmentStatus, KnowledgeMark> = {
  OPEN: 'PROMISED',
  FULFILLED: 'PROMISE_KEPT',
  BROKEN: 'PROMISE_BROKEN',
  EXPIRED: 'PROMISE_EXPIRED',
};

function statementOf(view: SanitizedGameState, message: CommsMessage): DossierStatement | null {
  switch (message.kind) {
    case 'CLAIM':
      return {
        id: message.id,
        round: message.round,
        kind: 'CLAIM',
        text: messageText(view, message),
        mark: claimMark(view, message),
      };
    case 'INTENT':
      return { id: message.id, round: message.round, kind: 'INTENT', text: messageText(view, message), mark: null };
    case 'ANSWER': {
      if (message.body.answer !== 'WILL_HELP') return null;
      const request = view.comms.messages.find((candidate) => candidate.id === message.body.requestId);
      const commitment = view.comms.commitments.find((candidate) => candidate.answerId === message.id);
      const about = request?.kind === 'REQUEST' ? requestText(view, request.body) : 'Просьба';
      return {
        id: message.id,
        round: message.round,
        kind: 'ANSWER',
        text: `Обещал помочь ${request ? playerName(view, request.authorId ?? '') : ''}: ${about}`,
        mark: commitment ? PROMISE_MARKS[commitment.status] : null,
      };
    }
    default:
      return null;
  }
}

function statusesOf(view: SanitizedGameState, playerId: string): DossierStatus[] {
  const player = view.players[playerId]!;
  const statuses: DossierStatus[] = [];
  if (player.isDead) statuses.push({ label: 'Погиб', tone: 'danger' });
  if (player.hasEscapedInPod) statuses.push({ label: 'Покинул корабль', tone: 'success' });
  if (player.isInHibernation) statuses.push({ label: 'В Анабиозе', tone: 'info' });
  if (player.boardedPodId) {
    statuses.push({
      label: `В Капсуле ${view.ship.escapePods[player.boardedPodId]?.number ?? ''}`.trim(),
      tone: 'info',
    });
  }
  if (player.hasSignalSent) statuses.push({ label: 'Сигнал отправлен', tone: 'success' });
  if (player.hasPassed) statuses.push({ label: 'Пас', tone: 'muted' });
  if (view.meta.activePlayerId === playerId && view.meta.phase === 'PLAYER_PHASE') {
    statuses.push({ label: 'Ходит', tone: 'warning' });
  }
  return statuses;
}

export function buildPlayerDossier(
  view: SanitizedGameState,
  playerId: string,
  seating: readonly { playerId: string; kind: string; label: string }[] = [],
): PlayerDossier | null {
  const player = view.players[playerId];
  if (!player) return null;
  const seat = seating.find((entry) => entry.playerId === playerId);
  const statements = view.comms.messages
    .filter((message) => message.authorId === playerId)
    .map((message) => statementOf(view, message))
    .filter((statement): statement is DossierStatement => statement !== null)
    .reverse();
  const count = (mark: KnowledgeMark) => statements.filter((statement) => statement.mark === mark).length;
  return {
    playerId,
    name: player.name,
    characterClass: player.characterClass,
    orderNumber: player.orderNumber,
    seatLabel: seat?.label ?? null,
    isBot: seat?.kind === 'BOT',
    isViewer: playerId === view.viewerId,
    location: player.isDead || player.hasEscapedInPod ? '—' : roomLabel(view, player.roomId),
    lightWounds: player.lightWounds,
    seriousWounds: player.seriousWounds.length,
    hasSlime: player.hasSlime,
    handCount: player.actionDeck.handCount,
    inventoryColors: [...player.inventoryColors],
    handSlots: player.handSlots.map((slot) =>
      slot.source === 'ITEM' ? slot.card.name : OBJECT_NAMES[slot.object.kind],
    ),
    statuses: statusesOf(view, playerId),
    statements,
    honesty: {
      confirmed: count('CONFIRMED'),
      contradicted: count('CONTRADICTED'),
      kept: count('PROMISE_KEPT'),
      broken: count('PROMISE_BROKEN'),
    },
  };
}
