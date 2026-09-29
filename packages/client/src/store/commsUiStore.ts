import type { CommsDraft } from '@nemesis/shared';
import { create } from 'zustand';

/**
 * Состояние интерфейса Рации: не часть партии. Отложенные Заявления живут здесь до своего хода
 * и уходят в движок обычным `ACTION_COMMS` — только тогда их видят другие.
 */
export interface CommsUiState {
  radioOpen: boolean;
  composerOpen: boolean;
  dossierPlayerId: string | null;
  queuedDrafts: Record<string, CommsDraft[]>;
  postponed: Record<string, string[]>;
  seenSequence: number | null;

  openRadio: (withComposer?: boolean) => void;
  closeRadio: () => void;
  setComposerOpen: (open: boolean) => void;
  openDossier: (playerId: string) => void;
  closeDossier: () => void;
  queueDrafts: (viewerId: string, drafts: CommsDraft[]) => void;
  dropQueued: (viewerId: string, index: number) => void;
  postpone: (turnKey: string, itemId: string) => void;
  markSeen: (sequence: number) => void;
}

export const useCommsUiStore = create<CommsUiState>()((set) => ({
  radioOpen: false,
  composerOpen: false,
  dossierPlayerId: null,
  queuedDrafts: {},
  postponed: {},
  seenSequence: null,

  openRadio: (withComposer = false) => set({ radioOpen: true, composerOpen: withComposer }),
  closeRadio: () => set({ radioOpen: false, composerOpen: false }),
  setComposerOpen: (composerOpen) => set({ composerOpen }),
  openDossier: (dossierPlayerId) => set({ dossierPlayerId }),
  closeDossier: () => set({ dossierPlayerId: null }),
  queueDrafts: (viewerId, drafts) =>
    set((state) => ({
      queuedDrafts: { ...state.queuedDrafts, [viewerId]: [...(state.queuedDrafts[viewerId] ?? []), ...drafts] },
    })),
  dropQueued: (viewerId, index) =>
    set((state) => ({
      queuedDrafts: {
        ...state.queuedDrafts,
        [viewerId]: (state.queuedDrafts[viewerId] ?? []).filter((_, position) => position !== index),
      },
    })),
  markSeen: (seenSequence) => set({ seenSequence }),
  postpone: (turnKey, itemId) =>
    set((state) => ({ postponed: { ...state.postponed, [turnKey]: [...(state.postponed[turnKey] ?? []), itemId] } })),
}));
