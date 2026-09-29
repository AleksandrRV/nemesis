import type { CommsMessage, CommsState } from '../../types/comms.js';
import type { EngineNumber, GameState } from '../../types/state.js';

type WithoutEnvelope<Message> = Message extends CommsMessage
  ? Omit<Message, 'id' | 'sequence' | 'round' | 'logSequence'>
  : never;
type NewMessage = WithoutEnvelope<CommsMessage>;

export function createInitialComms(): CommsState {
  return { messages: [], commitments: [], turnUsage: null, trackedLogSequence: 0 };
}

export function appendCommsMessage(state: GameState, message: NewMessage): CommsMessage {
  const sequence = (state.comms.messages.at(-1)?.sequence ?? 0) + 1;
  const stored = {
    ...message,
    id: `comms-${sequence}`,
    sequence,
    round: state.meta.currentRound,
    logSequence: state.gameLog.at(-1)?.sequence ?? 0,
  } as CommsMessage;
  state.comms.messages.push(stored);
  return stored;
}

/** Обязательное объявление о перестановке жетонов Двигателя (решение Р-4): его не отправить и не подавить. */
export function announceEngineOrderChanged(state: GameState, engineNumber: EngineNumber): void {
  appendCommsMessage(state, {
    kind: 'SYSTEM',
    authorId: null,
    to: 'ALL',
    body: { topic: 'ENGINE_ORDER_CHANGED', engineNumber },
  });
}

export function findCommsMessage(state: GameState, messageId: string): CommsMessage | undefined {
  return state.comms.messages.find((message) => message.id === messageId);
}
