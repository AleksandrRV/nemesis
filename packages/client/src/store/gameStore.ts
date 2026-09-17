import type { EngineAction, RoomId, SanitizedGameState } from '@nemesis/shared';
import { create } from 'zustand';

import { createLocalTransport } from '../services/transport/LocalInMemoryTransport';
import type { IGameTransport } from '../services/transport/ITransport';
import { IS_DEV } from '../utils/env';

/**
 * Стор интерфейса — тонкий клиент транспорта.
 *
 * Правила игры здесь не живут: стор хранит только то, что пришло по подписке
 * (`SanitizedGameState`), выбранный отсек и причину последнего отказа движка.
 * Любое изменение партии — это `dispatch(action)` (аудит №6, №10).
 */
export interface GameStoreState {
  /** Состояние глазами играющего персонажа; null — транспорт ещё не отдал первый снимок. */
  view: SanitizedGameState | null;
  /** Выбор в интерфейсе: не часть партии и не сохраняется. */
  selectedRoomId: RoomId | null;
  /** Причина последнего отказа движка: показывается игроку и сбрасывается успешным действием. */
  rejection: string | null;

  dispatch: (action: EngineAction) => void;
  selectRoom: (roomId: RoomId | null) => void;
  startNewGame: (seed?: string) => void;
}

/** Транспорт локальной партии умеет начинать новый стол; сетевой — нет (это дело сервера). */
export type TransportFactory = () => IGameTransport & { startNewGame?: (seed?: string) => void };

/** Отсек, который открыт по умолчанию: там, где стоит играющий персонаж. */
function defaultRoomId(view: SanitizedGameState | null): RoomId | null {
  return view?.players[view.meta.activePlayerId]?.roomId ?? null;
}

export function createGameStore(createTransport: TransportFactory) {
  let transport = createTransport();
  let detach = (): void => undefined;

  const store = create<GameStoreState>()((set) => ({
    view: null,
    selectedRoomId: null,
    rejection: null,

    dispatch: (action) => {
      transport.sendAction(action);
    },

    selectRoom: (roomId) => {
      set({ selectedRoomId: roomId });
    },

    startNewGame: (seed) => {
      if (transport.startNewGame) {
        // Локальная партия продолжается тем же транспортом: он уже держит
        // движок и сохранение, достаточно бросить новый стол.
        transport.startNewGame(seed);
        set({ selectedRoomId: defaultRoomId(store.getState().view), rejection: null });
        return;
      }

      // Сетевой транспорт новой партии не начинает — её открывает сервер,
      // поэтому клиент отключается от прежнего стола и подключается к новому.
      detach();
      transport = createTransport();
      attach(transport);
      void transport.init();
      set({ view: null, selectedRoomId: null, rejection: null });
    },
  }));

  function attach(instance: IGameTransport): void {
    const unsubscribeState = instance.subscribeToState((view) => {
      // Выбор отсека — состояние интерфейса: когда приходит новый снимок,
      // уже открытый отсек остаётся открытым.
      store.setState((state) => ({ view, selectedRoomId: state.selectedRoomId ?? defaultRoomId(view) }));
    });

    const unsubscribeEvents = instance.subscribeToEvents((event) => {
      store.setState(event.type === 'ACTION_REJECTED' ? { rejection: event.reason } : { rejection: null });
    });

    detach = () => {
      unsubscribeState();
      unsubscribeEvents();
    };
  }

  attach(transport);
  void transport.init();

  return store;
}

/**
 * Стор приложения: офлайн-партия в браузере. Отладочные действия разрешены
 * только в dev-сборке (аудит №22).
 */
export const useGameStore = createGameStore(() => createLocalTransport({ allowDevActions: IS_DEV }));
