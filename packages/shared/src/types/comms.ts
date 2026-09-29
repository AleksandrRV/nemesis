import type { RoomId } from './rooms.js';
import type { CourseMarker, Destination, EngineNumber } from './state.js';

/** Рация (план 0.8.0, шаг 3): цифровая форма разговора за столом — публична, бесплатна, правил не меняет. */
export type CommsAddressee = 'ALL' | string;

export type CommsKind = 'SYSTEM' | 'CLAIM' | 'INTENT' | 'REQUEST' | 'ANSWER' | 'REACTION';

export type SystemAnnouncement = { topic: 'ENGINE_ORDER_CHANGED'; engineNumber: EngineNumber };

export type CommsClaim =
  | { topic: 'ENGINE_STATUS'; engineNumber: EngineNumber; status: 'WORKING' | 'DAMAGED' }
  | { topic: 'ENGINE_DEED'; engineNumber: EngineNumber; deed: 'REPAIRED' | 'DAMAGED' | 'UNTOUCHED' }
  | { topic: 'COORDINATES'; marker: CourseMarker; destination: Destination }
  | { topic: 'COURSE'; toEarth: boolean }
  | { topic: 'ROOM_IDENTITY'; roomId: RoomId; definitionId: string }
  | { topic: 'NOT_INFECTED' }
  | { topic: 'HAS_ITEM'; itemName: string };

export type CommsIntent =
  | { topic: 'EXPLORE' }
  | { topic: 'SEEK_ROOM'; definitionId: string }
  | { topic: 'GO_TO_ENGINES' }
  | { topic: 'GO_TO_BRIDGE' }
  | { topic: 'GO_HEAL' }
  | { topic: 'GO_TO_HIBERNATION' }
  | { topic: 'GO_TO_POD'; podId: string }
  | { topic: 'COVER_PLAYER'; playerId: string }
  | { topic: 'GO_TO_ROOM'; roomId: RoomId };

export type ItemNeed = 'WEAPON' | 'ENERGY_CHARGE' | 'EXTENDED_MAGAZINE' | 'HEALING' | 'SPECIFIC';

export type CommsRequestTopic =
  | { topic: 'NEED_ITEM'; need: ItemNeed; itemName?: string }
  | { topic: 'HELP_KILL'; roomId: RoomId }
  | { topic: 'CHECK_ENGINE'; engineNumber: EngineNumber }
  | { topic: 'CHECK_COORDINATES' }
  | { topic: 'SET_DOOR'; corridorId: string; doorState: 'OPEN' | 'CLOSED' }
  | { topic: 'EXTINGUISH'; roomId: RoomId }
  | { topic: 'WAIT_IN_POD'; podId: string }
  | { topic: 'NO_SELF_DESTRUCT' };

export type CommsAnswer = { topic: 'ANSWER'; requestId: string; answer: 'WILL_HELP' | 'CANNOT' };

export type CommsReaction =
  | { topic: 'DISBELIEVE'; messageId: string }
  | { topic: 'THANKS'; messageId: string }
  | { topic: 'THANKS_FOR_DEED'; logSequence: number };

/** Что игрок может отправить действием `ACTION_COMMS`: системных объявлений здесь нет. */
export type CommsDraft =
  | { kind: 'CLAIM'; to: CommsAddressee; body: CommsClaim }
  | { kind: 'INTENT'; to: CommsAddressee; body: CommsIntent }
  | { kind: 'REQUEST'; to: CommsAddressee; body: CommsRequestTopic }
  | { kind: 'ANSWER'; body: CommsAnswer }
  | { kind: 'REACTION'; to: CommsAddressee; body: CommsReaction };

interface CommsEnvelope {
  id: string;
  sequence: number;
  round: number;
  /** Последняя запись журнала к моменту сообщения: Рация и журнал читаются в одном порядке. */
  logSequence: number;
  to: CommsAddressee;
}

export type CommsMessage =
  | (CommsEnvelope & { kind: 'SYSTEM'; authorId: null; body: SystemAnnouncement })
  | (CommsEnvelope & { kind: 'CLAIM'; authorId: string; body: CommsClaim })
  | (CommsEnvelope & { kind: 'INTENT'; authorId: string; body: CommsIntent })
  | (CommsEnvelope & { kind: 'REQUEST'; authorId: string; body: CommsRequestTopic; expiresAtRound: number })
  | (CommsEnvelope & { kind: 'ANSWER'; authorId: string; body: CommsAnswer })
  | (CommsEnvelope & { kind: 'REACTION'; authorId: string; body: CommsReaction });

export type CommitmentStatus = 'OPEN' | 'FULFILLED' | 'BROKEN' | 'EXPIRED';

/** Обещание помочь («помогу» на Просьбу): статус отмечает движок по публичному журналу. */
export interface Commitment {
  id: string;
  requestId: string;
  answerId: string;
  requesterId: string;
  helperId: string;
  createdRound: number;
  expiresAtRound: number;
  status: CommitmentStatus;
  resolvedRound: number | null;
  resolvedLogSequence: number | null;
}

export interface CommsTurnUsage {
  playerId: string;
  turnMarker: number;
  ordinary: number;
  requests: number;
}

export interface CommsState {
  messages: CommsMessage[];
  commitments: Commitment[];
  turnUsage: CommsTurnUsage | null;
  trackedLogSequence: number;
}
