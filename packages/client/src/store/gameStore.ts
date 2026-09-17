import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { GameState, RoomId } from '@nemesis/shared';
import { createInitialGameState } from '../utils/initialState';

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

export const useGameStore = create<GameStoreState>()(
  persist(
    immer((set) => ({
      gameState: createInitialGameState(),
      selectedRoomId: 11, // По умолчанию выбран Криоотсек, где стоит игрок

      initNewGame: (seed) => {
        set((state) => {
          state.gameState = createInitialGameState(seed || String(Date.now()));
          state.selectedRoomId = 11;
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
      name: 'nemesis-v010-session',
      storage: createJSONStorage(() => localStorage),
    }
  )
);