import { create } from 'zustand';
import type { BoardAnimation } from '../components/board/boardAnimationModel';
import type { ContactPresentationEntry } from '../components/contact/contactPresentationModel';
import type { NoiseDieFace } from '@nemesis/shared';

export type SequencedDieRoll = {
  key: string;
  sequence: number;
  roomId: number;
  result: NoiseDieFace;
  playerName: string;
};

export type SequencedItem =
  | { kind: 'PLAYER_MOVE'; key: string; sequence: number; animation: BoardAnimation }
  | { kind: 'INTRUDER_MOVE'; key: string; sequence: number; animation: BoardAnimation }
  | { kind: 'ROOM_REVEAL'; key: string; sequence: number; animation: BoardAnimation }
  | { kind: 'EXPLORATION_REVEAL'; key: string; sequence: number; animation: BoardAnimation }
  | { kind: 'NOISE_ROLL'; key: string; sequence: number; dieRoll: SequencedDieRoll; animation: BoardAnimation }
  | { kind: 'NOISE_POP'; key: string; sequence: number; animation: BoardAnimation }
  | { kind: 'CONTACT_TEASE'; key: string; sequence: number; animation: BoardAnimation }
  | { kind: 'CONTACT'; key: string; sequence: number; entry: ContactPresentationEntry }
  | { kind: 'DOOR_BREACHED'; key: string; sequence: number; animation: BoardAnimation }
  | { kind: 'INTRUDER_TO_TECH'; key: string; sequence: number; animation: BoardAnimation }
  | { kind: 'OTHER'; key: string; sequence: number; animation: BoardAnimation };

interface PresentationStoreState {
  queue: SequencedItem[];
  active: SequencedItem | null;
  lastDieRoll: BoardAnimation | null;
  contactSeen: number;
  activeBoardAnimations: BoardAnimation[];
  activeDieRoll: SequencedDieRoll | null;
  activeContact: ContactPresentationEntry | null;
  isIdle: boolean;

  setQueue: (updater: (prev: SequencedItem[]) => SequencedItem[]) => void;
  setActive: (item: SequencedItem | null) => void;
  setLastDieRoll: (anim: BoardAnimation | null) => void;
  setContactSeen: (seq: number) => void;
  dismissDieRoll: () => void;
  dismissContact: (seq: number) => void;
}

export const usePresentationStore = create<PresentationStoreState>((set, get) => ({
  queue: [],
  active: null,
  lastDieRoll: null,
  contactSeen: 0,
  activeBoardAnimations: [],
  activeDieRoll: null,
  activeContact: null,
  isIdle: true,

  setQueue: (updater) =>
    set((state) => {
      const newQueue = updater(state.queue);
      return { queue: newQueue, isIdle: !state.active && newQueue.length === 0 };
    }),

  setActive: (item) =>
    set((state) => {
      let activeBoardAnimations: BoardAnimation[] = [];
      let activeDieRoll: SequencedDieRoll | null = null;
      let activeContact: ContactPresentationEntry | null = null;

      if (!item) {
        activeBoardAnimations = [];
      } else if (
        item.kind === 'PLAYER_MOVE' ||
        item.kind === 'INTRUDER_MOVE' ||
        item.kind === 'INTRUDER_TO_TECH' ||
        item.kind === 'DOOR_BREACHED' ||
        item.kind === 'ROOM_REVEAL' ||
        item.kind === 'EXPLORATION_REVEAL' ||
        item.kind === 'CONTACT_TEASE' ||
        item.kind === 'OTHER'
      ) {
        activeBoardAnimations = [item.animation];
      } else if (item.kind === 'NOISE_ROLL') {
        activeBoardAnimations = [];
        activeDieRoll = item.dieRoll;
      } else if (item.kind === 'NOISE_POP') {
        const list: BoardAnimation[] = [item.animation];
        if (state.lastDieRoll) list.push(state.lastDieRoll);
        activeBoardAnimations = list;
      } else if (item.kind === 'CONTACT') {
        activeContact = item.entry;
      }

      return {
        active: item,
        activeBoardAnimations,
        activeDieRoll,
        activeContact,
        isIdle: !item && state.queue.length === 0,
      };
    }),

  setLastDieRoll: (anim) => set({ lastDieRoll: anim }),

  setContactSeen: (seq) => set({ contactSeen: seq }),

  dismissDieRoll: () => {
    const { active } = get();
    if (active?.kind === 'NOISE_ROLL') {
      get().setLastDieRoll(active.animation);
    }
    get().setActive(null);
  },

  dismissContact: (seq) => {
    set({ contactSeen: seq });
    get().setActive(null);
  },
}));
