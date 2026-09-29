import type { CommsDraft, SanitizedGameState } from '@nemesis/shared';
import { useGameStore } from '../../store/gameStore';
import { useCommsUiStore } from '../../store/commsUiStore';
import { commsUsageView } from './commsFeedModel';

export interface CommsSender {
  canSpeakNow: boolean;
  ordinaryLeft: number;
  requestsLeft: number;
  send: (drafts: CommsDraft[]) => void;
  queue: (drafts: CommsDraft[]) => void;
}

/** Отправка в эфир в свой ход; вне хода Заявление откладывается до начала своего хода (попадёт во «Входящие»). */
export function useCommsSender(view: SanitizedGameState): CommsSender {
  const dispatch = useGameStore((state) => state.dispatch);
  const queueDrafts = useCommsUiStore((state) => state.queueDrafts);
  const usage = commsUsageView(view);
  return {
    canSpeakNow: usage.canSpeak,
    ordinaryLeft: usage.ordinaryLeft,
    requestsLeft: usage.requestsLeft,
    send: (drafts) => {
      for (const draft of drafts) dispatch({ type: 'ACTION_COMMS', payload: draft });
    },
    queue: (drafts) => queueDrafts(view.viewerId, drafts),
  };
}
