import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { GameState, RoomId } from '@nemesis/shared';
import { createInitialGameState } from '../utils/initialState';
import {
  DEFAULT_SELECTED_ROOM_ID,
  mergeSession,
  migrateSession,
  partializeSession,
  SESSION_STORAGE_KEY,
  SESSION_STORAGE_VERSION,
  type PersistedSession,
} from './session';

interface GameStoreState {
  gameState: GameState;
  selectedRoomId: RoomId | null;

  // Экшены
  initNewGame: (seed?: string) => void;
  selectRoom: (roomId: RoomId | null) => void;
  toggleDoor: (corridorId: string) => void;
  toggleNoise: (corridorId: string) => void;
  exploreRoom: (roomId: RoomId) => void;
  movePlayer: (targetRoomId: RoomId) => void;
}

/** Сид новой партии: уникален, чтобы у игроков не было одинаковых раскладов. */
function createSeed(): string {
  return crypto.randomUUID();
}

export const useGameStore = create<GameStoreState>()(
  persist(
    immer<GameStoreState>((set) => ({
      gameState: createInitialGameState(createSeed()),
      selectedRoomId: DEFAULT_SELECTED_ROOM_ID,

      initNewGame: (seed) => {
        const nextSeed = seed || createSeed();

        set((state) => {
          state.gameState = createInitialGameState(nextSeed);
          state.selectedRoomId = DEFAULT_SELECTED_ROOM_ID;
        });
      },

      selectRoom: (roomId) => {
        set((state) => {
          state.selectedRoomId = roomId;
        });
      },

      toggleDoor: (corridorId) => {
        set((state) => {
          const corridor = state.gameState.ship.corridors[corridorId];
          if (!corridor) return;
          if (corridor.doorState === 'OPEN') corridor.doorState = 'CLOSED';
          else if (corridor.doorState === 'CLOSED') corridor.doorState = 'DESTROYED';
          else corridor.doorState = 'OPEN';
        });
      },

      toggleNoise: (corridorId) => {
        set((state) => {
          const corridor = state.gameState.ship.corridors[corridorId];
          if (corridor) {
            corridor.hasNoise = !corridor.hasNoise;
          }
        });
      },

      exploreRoom: (roomId) => {
        set((state) => {
          const room = state.gameState.ship.rooms[roomId];
          if (room) {
            room.isExplored = true;
          }
        });
      },

      movePlayer: (targetRoomId) => {
        set((state) => {
          const player = state.gameState.players['player-1'];
          if (!player) return;

          const oldRoom = state.gameState.ship.rooms[player.roomId];
          const newRoom = state.gameState.ship.rooms[targetRoomId];
          if (!newRoom) return;

          if (oldRoom) {
            oldRoom.occupantPlayerIds = oldRoom.occupantPlayerIds.filter((id) => id !== player.id);
          }
          newRoom.occupantPlayerIds.push(player.id);
          newRoom.isExplored = true; // Автооткрытие при входе для первого этапа
          player.roomId = targetRoomId;
          state.selectedRoomId = targetRoomId;
        });
      },
    })),
    {
      name: SESSION_STORAGE_KEY,
      version: SESSION_STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: partializeSession,
      migrate: (persistedState, version): PersistedSession => migrateSession(persistedState, version),
      // Проверяем сохранение и при совпадении версии: zustand зовёт migrate
      // только при её несовпадении, поэтому повреждённые данные той же версии
      // нужно отсеивать здесь — иначе стор получит мусор и приложение упадёт.
      merge: mergeSession,
    },
  ),
);
