import type { RoomId } from './rooms.js';

/** Взаимодействие Персонажей: согласие на перенос и цепочка «Отставить» (стр. 19, карты Действий). */
export type CrewLogEvent =
  | {
      type: 'REPOSITION_ANSWERED';
      playerId: string;
      requesterId: string;
      targetRoomId: RoomId;
      accepted: boolean;
    }
  | { type: 'DISMISS_PLAYED'; playerId: string; targetPlayerId: string; cardId: string }
  | {
      type: 'ACTION_DISMISSED';
      playerId: string;
      actionType: string;
      dismissedBy: string[];
      paidCardCount: number;
    }
  | { type: 'DISMISS_OVERRULED'; playerId: string; dismissedBy: string[] };
