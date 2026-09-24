import { create } from 'zustand';
import { mergeBatchBaselines, type BatchBaseline, type BoardAnimation } from '../components/board/boardAnimationModel';
import type { ContactPresentationEntry } from '../components/contact/contactPresentationModel';
import type { NoiseDieFace } from '@nemesis/shared';

export type SequencedDieRoll = {
  key: string;
  sequence: number;
  roomId: number;
  result: NoiseDieFace;
  playerName: string;
};

/**
 * Элемент очереди презентации. Порядок воспроизведения задаётся
 * `sequence` (секвенс записи журнала) и приоритетом внутри одного секвенса:
 * движение → вскрытие (скан → карточка → имя/иконки) → бросок Шума →
 * маркер Шума → Контакт.
 */
export type SequencedItem =
  | { kind: 'PLAYER_MOVE'; key: string; sequence: number; animation: Extract<BoardAnimation, { kind: 'PLAYER_MOVE' }> }
  | {
      kind: 'INTRUDER_MOVE';
      key: string;
      sequence: number;
      animation: Extract<BoardAnimation, { kind: 'INTRUDER_MOVE' }>;
    }
  | { kind: 'ROOM_REVEAL'; key: string; sequence: number; animation: Extract<BoardAnimation, { kind: 'ROOM_REVEAL' }> }
  | {
      kind: 'EXPLORATION_REVEAL';
      key: string;
      sequence: number;
      animation: Extract<BoardAnimation, { kind: 'EXPLORATION_REVEAL' }>;
    }
  | {
      /** Удержка очереди, пока RoomHex переворачивает туман и печатает имя. */
      kind: 'REVEAL_SETTLE';
      key: string;
      sequence: number;
      roomId: number;
    }
  | {
      kind: 'NOISE_ROLL';
      key: string;
      sequence: number;
      dieRoll: SequencedDieRoll;
      animation: Extract<BoardAnimation, { kind: 'NOISE_ROLL' }>;
    }
  | { kind: 'NOISE_POP'; key: string; sequence: number; animation: Extract<BoardAnimation, { kind: 'NOISE_POP' }> }
  | {
      kind: 'CONTACT_TEASE';
      key: string;
      sequence: number;
      animation: Extract<BoardAnimation, { kind: 'CONTACT_TEASE' }>;
    }
  | {
      kind: 'CONTACT';
      key: string;
      sequence: number;
      entry: ContactPresentationEntry;
      /** Миниатюра, поставленная этим Контактом: прячется с поля до закрытия окна. */
      intruderId: string | null;
    }
  | { kind: 'DOOR_BREACHED'; key: string; sequence: number; animation: Extract<BoardAnimation, { kind: 'DOOR_BREACHED' }> }
  | {
      kind: 'INTRUDER_TO_TECH';
      key: string;
      sequence: number;
      animation: Extract<BoardAnimation, { kind: 'INTRUDER_TO_TECH' }>;
    }
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
  /** Что изменилось в недоигранной пачке: для отката маркеров Шума и новых Чужих. */
  batchBaseline: BatchBaseline | null;

  setQueue: (updater: (prev: SequencedItem[]) => SequencedItem[]) => void;
  setActive: (item: SequencedItem | null) => void;
  setLastDieRoll: (anim: BoardAnimation | null) => void;
  setContactSeen: (seq: number) => void;
  mergeBatchBaseline: (baseline: BatchBaseline) => void;
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
  batchBaseline: null,

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

      if (item) {
        if (
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
          activeDieRoll = item.dieRoll;
        } else if (item.kind === 'NOISE_POP') {
          const list: BoardAnimation[] = [item.animation];
          if (state.lastDieRoll) list.push(state.lastDieRoll);
          activeBoardAnimations = list;
        } else if (item.kind === 'CONTACT') {
          activeContact = item.entry;
        }
        // REVEAL_SETTLE — без визуального слоя: играет сам RoomHex.
      }

      // Пачка доиграна целиком — базлайн больше не нужен: откат снимается.
      const batchBaseline = !item && state.queue.length === 0 ? null : state.batchBaseline;

      return {
        active: item,
        activeBoardAnimations,
        activeDieRoll,
        activeContact,
        batchBaseline,
        isIdle: !item && state.queue.length === 0,
      };
    }),

  setLastDieRoll: (anim) => set({ lastDieRoll: anim }),

  setContactSeen: (seq) => set({ contactSeen: seq }),

  mergeBatchBaseline: (baseline) =>
    set((state) => ({ batchBaseline: mergeBatchBaselines(state.batchBaseline, baseline) })),

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
