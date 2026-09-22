import type { CharacterClass, EngineAction, RoomId, SanitizedGameState } from '@nemesis/shared';
import { create } from 'zustand';

import { createLocalTransport } from '../services/transport/LocalInMemoryTransport';
import type { IGameTransport } from '../services/transport/ITransport';
import { IS_DEV } from '../utils/env';

/**
 * Стор интерфейса — тонкий клиент транспорта.
 *
 * Правила игры здесь не живут: стор хранит только то, что пришло по подписке
 * (`SanitizedGameState`), выбранный отсек и причину последнего отказа движка.
 * Любое изменение партии — это `dispatch(action)`: правил в сторе нет.
 */
export interface GameStoreState {
  /** Состояние глазами играющего персонажа; null — транспорт ещё не отдал первый снимок. */
  view: SanitizedGameState | null;
  /** Выбор в интерфейсе: не часть партии и не сохраняется. */
  selectedRoomId: RoomId | null;
  /** Открыта ли панель Технических Коридоров (Шаг 3 этапа 0.5.0): выбор локации, не партии. */
  technicalCorridorsOpen: boolean;
  /** Причина последнего отказа движка: показывается игроку и сбрасывается успешным действием. */
  rejection: string | null;

  /** Открыта ли интерактивная панель выстрела (только состояние интерфейса). */
  shootModalOpen: boolean;
  meleeModalOpen: boolean;
  /** Выбранные в текущий момент карты на руке */
  selectedCardIds: string[];
  /** Конвертированные в очки действий ID карт (в резерве) */
  convertedCardIds: string[];

  toggleSelectCard: (cardId: string) => void;
  clearSelection: () => void;
  convertToEnergy: () => void;
  refundConvertedCard: (cardId: string) => void;
  consumePaymentCards: (count: number) => string[];

  setShootModalOpen: (open: boolean) => void;
  setMeleeModalOpen: (open: boolean) => void;

  dispatch: (action: EngineAction) => void;
  selectRoom: (roomId: RoomId | null) => void;
  openTechnicalCorridors: () => void;
  closeTechnicalCorridors: () => void;
  startNewGame: (seed?: string, options?: { chosenCharacterClass?: CharacterClass }) => void;
}

/** Транспорт локальной партии умеет начинать новый стол; сетевой — нет (это дело сервера). */
export type TransportFactory = () => IGameTransport & {
  startNewGame?: (seed?: string, options?: { chosenCharacterClass?: CharacterClass }) => void;
};

/** Отсек, который открыт по умолчанию: там, где стоит играющий персонаж. */
function defaultRoomId(view: SanitizedGameState | null): RoomId | null {
  return view?.players[view.meta.activePlayerId]?.roomId ?? null;
}

export function createGameStore(createTransport: TransportFactory) {
  let transport = createTransport();
  let detach = (): void => undefined;

  const store = create<GameStoreState>()((set, get) => ({
    view: null,
    selectedRoomId: null,
    technicalCorridorsOpen: false,
    rejection: null,
    shootModalOpen: false,
    meleeModalOpen: false,
    selectedCardIds: [],
    convertedCardIds: [],

    toggleSelectCard: (cardId) => {
      const { selectedCardIds, convertedCardIds } = get();
      if (convertedCardIds.includes(cardId)) return; // конвертированные нельзя выбирать
      if (selectedCardIds.includes(cardId)) {
        set({ selectedCardIds: selectedCardIds.filter((id) => id !== cardId) });
      } else {
        set({ selectedCardIds: [...selectedCardIds, cardId] });
      }
    },

    clearSelection: () => {
      set({ selectedCardIds: [] });
    },

    convertToEnergy: () => {
      const { selectedCardIds, convertedCardIds, view } = get();
      if (!view) return;
      const player = view.players[view.meta.activePlayerId];
      if (!player) return;

      // Фильтруем только существующие на руке карты и не Заражение (Заражение нельзя конвертировать)
      const validToConvert = selectedCardIds.filter((id) => {
        const card = player.actionDeck.hand.find((c) => c.id === id);
        return card && 'characterClass' in card;
      });

      if (validToConvert.length === 0) return;

      set({
        convertedCardIds: [...convertedCardIds, ...validToConvert],
        selectedCardIds: selectedCardIds.filter((id) => !validToConvert.includes(id)),
      });
    },

    refundConvertedCard: (cardId) => {
      const { convertedCardIds } = get();
      set({
        convertedCardIds: convertedCardIds.filter((id) => id !== cardId),
      });
    },

    consumePaymentCards: (count) => {
      const { convertedCardIds, selectedCardIds, view } = get();
      const hand = view?.players[view?.meta.activePlayerId ?? '']?.actionDeck.hand ?? [];
      const handCardIds = new Set(hand.map((c) => c.id));

      // Сначала берём из конвертированных карт, если они есть
      const validConverted = convertedCardIds.filter((id) => handCardIds.has(id));
      const chosenFromConverted = validConverted.slice(0, count);
      const remainingNeeded = count - chosenFromConverted.length;

      // Если не хватает, берём из выделенных карт
      const validSelected = selectedCardIds.filter((id) => handCardIds.has(id) && !chosenFromConverted.includes(id));
      const chosenFromSelected = validSelected.slice(0, remainingNeeded);

      const result = [...chosenFromConverted, ...chosenFromSelected];

      // Оставшиеся конвертированные карты
      const remainingConverted = validConverted.filter((id) => !chosenFromConverted.includes(id));
      // Оставшиеся выделенные
      const remainingSelected = selectedCardIds.filter((id) => !result.includes(id));

      set({
        convertedCardIds: remainingConverted,
        selectedCardIds: remainingSelected,
      });

      return result;
    },

    dispatch: (action) => {
      transport.sendAction(action);
    },

    setShootModalOpen: (open) => {
      set({ shootModalOpen: open });
    },

    setMeleeModalOpen: (open) => {
      set({ meleeModalOpen: open });
    },

    selectRoom: (roomId) => {
      set({ selectedRoomId: roomId, technicalCorridorsOpen: false });
    },

    openTechnicalCorridors: () => {
      set({ technicalCorridorsOpen: true, selectedRoomId: null });
    },

    closeTechnicalCorridors: () => {
      set({ technicalCorridorsOpen: false });
    },

    startNewGame: (seed, options) => {
      if (transport.startNewGame) {
        // Локальная партия продолжается тем же транспортом: он уже держит
        // движок и сохранение, достаточно бросить новый стол.
        transport.startNewGame(seed, options);
        set({
          selectedRoomId: defaultRoomId(store.getState().view),
          technicalCorridorsOpen: false,
          rejection: null,
          shootModalOpen: false,
          meleeModalOpen: false,
          selectedCardIds: [],
          convertedCardIds: [],
        });
        return;
      }

      // Сетевой транспорт новой партии не начинает — её открывает сервер,
      // поэтому клиент отключается от прежнего стола и подключается к новому.
      detach();
      transport = createTransport();
      attach(transport);
      void transport.init();
      set({
        view: null,
        selectedRoomId: null,
        technicalCorridorsOpen: false,
        rejection: null,
        shootModalOpen: false,
        meleeModalOpen: false,
        selectedCardIds: [],
        convertedCardIds: [],
      });
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
 * только в dev-сборке.
 */
export const useGameStore = createGameStore(() => createLocalTransport({ allowDevActions: IS_DEV }));
