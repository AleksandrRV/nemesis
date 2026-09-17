# ТЕХНОЛОГИЧЕСКИЙ СТЕК И СИСТЕМНАЯ АРХИТЕКТУРА
# Проект: Nemesis Digital

**Версия документа:** 2.0 (Полная редакция с учетом офлайн-сохранений, FSM-прерываний, фильтрации скрытых данных и честного ИИ)  
**Язык разработки:** TypeScript 5.x (Strict Mode)  
**Среда выполнения:** Evergreen Web Browsers (Blink / Gecko / WebKit), Node.js LTS  
**Архитектурный паттерн:** Isomorphic Shared Core + Event-Driven FSM + Transport Adapter

---

## 1. Обзор архитектурного решения

Проект организован как модульный монорепозиторий на базе **NPM Workspaces**. 

Главный архитектурный принцип — **Изоморфное ядро (Isomorphic Shared Core)**: 100% правил настольной игры, структуры данных и математические функции вынесены в независимый от платформы пакет `packages/shared`. Это ядро одинаково компилируется и исполняется:
1. **В Node.js (Сервер):** Для сетевых матчей по локальной сети (LAN) или через Интернет. Сервер выступает в роли неподкупного судьи (Authoritative Server).
2. **В браузере смартфона/ПК (Офлайн-клиент):** Для соло-режима с ботами без интернета и локального сервера.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          NEMESIS MONOREPO WORKSPACE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  packages/shared                                                            │
│  • Типы и интерфейсы сущностей (Комнаты, Персонажи, Чужие, Карты)           │
│  • Чистая логика правил (Движение, Шум, Бой, Развитие улья)                │
│  • Собственный алгоритм поиска пути (A*)                                    │
│  • Детерминированный генератор RNG (seedrandom)                             │
│  • Стейт-машина фаз и прерываний (FSM Pipeline)                             │
│  (Зависимости: 0 внешних библиотек для DOM или Node)                        │
├──────────────────────────────────────┬──────────────────────────────────────┤
│  packages/server                     │  packages/client                     │
│  • Node.js + Express                 │  • React 18 + Vite                   │
│  • Socket.io (WebSocket сервер)      │  • Tailwind CSS                      │
│  • Управление лобби и сессиями       │  • Zustand + Immer + Persist         │
│  • Фильтрация стейта (Sanitization)  │  • Интерактивная SVG-карта           │
│  • Движок ИИ-ботов (Utility AI)      │  • Howler.js (Аудио)                 │
│  • LAN-раздача (0.0.0.0)             │  • PWA Service Worker (Офлайн-кэш)   │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

---

## 2. Детализация технологического стека по слоям

### 2.1. Базовый инструментарий
* **TypeScript 5.x (`strict: true`):** Абсолютный запрет на использование `any`. Все типы событий, действий и состояний строго типизированы через размеченные объединения (Discriminated Unions).
* **Vite 5.x:** Сборщик фронтенда с мгновенной перезагрузкой модулей (HMR).
* **NPM Workspaces:** Встроенный в npm менеджер монорепозитория без необходимости ставить тяжелые утилиты вроде Lerna или Nx.

### 2.2. Frontend (`packages/client`)
* **React 18:** Компонентная структура UI (Планшет игрока, Слот руки, Карта комнаты, Визор сканера).
* **Tailwind CSS 3.x:** Полностью текстовое описание стилей прямо в разметке. Исключает ручную верстку отдельных CSS-файлов. Адаптирован под генерацию через LLM.
* **Zustand + Immer:** Легковесный менеджер состояния. В связке с Immer позволяет безопасно модифицировать сложные вложенные структуры данных графа корабля без создания громоздких редьюсеров.
* **Zustand Persist Middleware:** Автоматическая синхронизация активной соло-сессии с `localStorage` / `IndexedDB` для защиты от закрытия вкладки на смартфоне.
* **Интерактивная векторная карта (SVG) + `react-zoom-pan-pinch`:**
  * Поле корабля рисуется в виде чистого векторного SVG (шестиугольники комнат, линии коридоров, маркеры).
  * `react-zoom-pan-pinch` обеспечивает гладкий зум щипком (pinch-to-zoom) и перетаскивание карты на мобильных устройствах.
* **Framer Motion:** Анимации интерфейса (раскрытие нижней шторки с картами, тряска экрана при получении тяжелой травмы, вытягивание карт).
* **Lucide React:** Набор чистых векторных иконок для боезапаса, шума, огня, поломок, дверей и черепов.
* **Howler.js:** Воспроизведение звуков шагов, тревожной сирены, шипения вентиляции и выстрелов. Обходит ограничения мобильных браузеров на автовоспроизведение звука.

### 2.3. PWA и Офлайн-автономия
* **`vite-plugin-pwa`:** 
  * Генерирует манифест веб-приложения (`manifest.json`) и сервисный рабочий поток (`Service Worker` через Workbox).
  * Кэширует все HTML, JS, CSS, картинки тайлов и звуковые файлы. Приложение запускается с иконки рабочего стола Android без наличия подключения к сети.

### 2.4. Backend и Сеть (`packages/server`)
* **Node.js LTS (v20+):** Среда выполнения сервера.
* **Socket.io v4:** Сетевой протокол реального времени поверх WebSockets с поддержкой авто-переподключения при потере связи на телефоне.
* **HTTP / LAN привязка:** Сервер слушает хост `0.0.0.0`, что позволяет подключаться любым устройствам из локальной подсети Wi-Fi по IP-адресу.

---

## 3. Архитектура стейта и данных (Data Contracts)

### 3.1. Полное состояние игры (`GameState`)
Хранится в `packages/shared/src/types/state.ts`:

```typescript
export interface GameState {
  meta: {
    gameId: string;
    seed: string;
    gameMode: 'SOLO' | 'COOP' | 'SEMI_COOP' | 'INTRUDER_PLAYER';
    currentRound: number;
    phase: 'PLAYER_PHASE' | 'EVENT_PHASE' | 'GAME_OVER';
    activePlayerId: string;
    firstPlayerId: string;
    timeTrackPosition: number; // 0..15
    selfDestructTrackPosition: number | null; // null если выключен, 0..8 (8 = взрыв)
  };
  ship: {
    rooms: { [id: number]: RoomState };
    corridors: { [id: string]: CorridorState }; // id: "roomId1-roomId2"
    technicalCorridorNoise: boolean;
    engines: {
      [engineNumber in 1 | 2 | 3]: {
        topTokenWorking: boolean; // Истинное состояние
        bottomTokenWorking: boolean;
      };
    };
    coordinates: {
      destination: 'EARTH' | 'MARS' | 'DEEP_SPACE_1' | 'DEEP_SPACE_2'; // Истинное
      currentCourseMarker: 'A' | 'B' | 'C' | 'D';
    };
    escapePods: { [podId: string]: EscapePodState };
  };
  intrudersPool: {
    bag: IntruderToken[]; // Токены в мешке
    boardTokens: IntruderEntity[]; // Физически на поле
    deadTokens: IntruderToken[];
    eggsOnBoard: number;
  };
  players: { [playerId: string]: PlayerState };
  claimsLog: ClaimEvent[]; // История публичных заявлений игроков
  interruptQueue: InterruptEvent[]; // Стек прерываний (FSM)
}
```

### 3.2. Скрытие информации и фильтрация (`Sanitization`)
Перед отправкой клиенту (или передаче ИИ-боту) полное состояние очищается функцией `filterStateForPlayer`:

```typescript
// packages/shared/src/logic/sanitizer.ts

export function filterStateForPlayer(state: GameState, viewingPlayerId: string): SanitizedGameState {
  const sanitized = cloneDeep(state);

  // 1. Скрываем статус двигателей, если игрок лично их не проверял
  for (const engineNum of [1, 2, 3] as const) {
    if (!sanitized.players[viewingPlayerId].inspectedEngines.includes(engineNum)) {
      sanitized.ship.engines[engineNum].topTokenWorking = undefined as any;
      sanitized.ship.engines[engineNum].bottomTokenWorking = undefined as any;
    }
  }

  // 2. Скрываем карту координат, если игрок не смотрел ее на Мостике
  if (!sanitized.players[viewingPlayerId].inspectedCoordinates) {
    sanitized.ship.coordinates.destination = undefined as any;
  }

  // 3. Скрываем чужие закрытые цели
  for (const [pId, player] of Object.entries(sanitized.players)) {
    if (pId !== viewingPlayerId) {
      player.secretObjective = undefined;
      player.inventory = player.inventory.map(item => ({ ...item, id: 'UNKNOWN', name: 'Скрытый предмет' }));
    }
  }

  // 4. Скрываем факт заражения несканированных карт в колоде игрока
  // (только модуль Сканера раскрывает конкретную карту)
  return sanitized as SanitizedGameState;
}
```

### 3.3. Модель заявлений (Блеф и общение с ботами)
```typescript
export interface ClaimEvent {
  id: string;
  authorPlayerId: string;
  timestamp: number;
  type: 'ENGINE_STATUS_CLAIM' | 'COORDINATES_CLAIM';
  payload: {
    targetSystemId: 1 | 2 | 3 | 'COORDINATES';
    declaredStatus: 'WORKING' | 'DAMAGED' | 'DESTINATION_EARTH' | 'DESTINATION_OTHER';
  };
}
```

---

## 4. Игровой цикл и пайплайн прерываний (FSM Pipeline)

Так как действия игрока порождают цепочки вложенных проверок (Interrupts), стейт-машина оперирует очередью прерываний:

```typescript
// packages/shared/src/logic/fsm.ts

export type InterruptEvent =
  | { type: 'ESCAPE_ATTACK_INTERRUPT'; playerId: string; intruderIds: string[]; targetRoomId: number }
  | { type: 'EXPLORE_ROOM_INTERRUPT'; roomId: number }
  | { type: 'NOISE_ROLL_INTERRUPT'; roomId: number }
  | { type: 'ENCOUNTER_INTERRUPT'; roomId: number; intruderToken: IntruderToken }
  | { type: 'SURPRISE_ATTACK_INTERRUPT'; playerId: string; intruderId: string };

export class GameEngine {
  // Главный диспетчер шага
  public processAction(state: GameState, action: GameAction): GameState {
    return produce(state, (draft) => {
      // 1. Валидация возможности действия (оплата картами, статус боя, двери)
      this.validateAction(draft, action);

      // 2. Инициализация первичного действия
      this.executeActionStep(draft, action);

      // 3. Цикл разрешения каскада прерываний
      while (draft.interruptQueue.length > 0) {
        const nextInterrupt = draft.interruptQueue.shift()!;
        this.resolveInterrupt(draft, nextInterrupt);
      }
    });
  }
}
```

---

## 5. Сетевой транспорт и Паттерн Адаптера

Интерфейс `IGameTransport` полностью изолирует React UI от физического местонахождения движка правил:

```typescript
// packages/client/src/services/transport/ITransport.ts

export interface IGameTransport {
  init(): Promise<void>;
  sendAction(action: GameAction): void;
  subscribeToState(callback: (state: SanitizedGameState) => void): () => void;
  subscribeToEvents(callback: (event: GameEvent) => void): () => void;
}
```

### 5.1. Реализация для Мультиплеера (LAN / WAN)
```typescript
// packages/client/src/services/transport/SocketIoTransport.ts

export class SocketIoTransport implements IGameTransport {
  private socket: Socket;

  constructor(serverUrl: string) {
    this.socket = io(serverUrl, { autoConnect: false });
  }

  async init() {
    this.socket.connect();
  }

  sendAction(action: GameAction) {
    this.socket.emit('client_game_action', action);
  }

  subscribeToState(callback: (state: SanitizedGameState) => void) {
    this.socket.on('server_state_sync', callback);
    return () => this.socket.off('server_state_sync', callback);
  }
  // ...
}
```

### 5.2. Реализация для Офлайн Соло (Работает в браузере смартфона без сети)
```typescript
// packages/client/src/services/transport/LocalInMemoryTransport.ts

export class LocalInMemoryTransport implements IGameTransport {
  private engine: GameEngine;
  private localState: GameState;
  private stateSubscribers: ((state: SanitizedGameState) => void)[] = [];
  private playerId: string;

  constructor(initialState: GameState, playerId: string) {
    this.engine = new GameEngine();
    this.localState = initialState;
    this.playerId = playerId;
  }

  async init() {
    this.broadcast();
  }

  sendAction(action: GameAction) {
    // 1. Выполняем действие человека
    this.localState = this.engine.processAction(this.localState, action);
    this.broadcast();

    // 2. Если ход перешел боту — запускаем такт локального ИИ
    this.triggerBotTurnIfNeeded();
  }

  private broadcast() {
    const sanitized = filterStateForPlayer(this.localState, this.playerId);
    this.stateSubscribers.forEach(cb => cb(sanitized));
  }

  private triggerBotTurnIfNeeded() {
    // Логика тактов ботов прямо в UI-потоке через setTimeout(..., 500)
  }
}
```

---

## 6. Математика, графы и поиск пути

### 6.1. Собственный A*-поиск пути (`packages/shared/src/utils/pathfinding.ts`)
Граф корабля содержит всего 21 комнату, что делает самописный A* легковесным, предсказуемым и лишенным внешних зависимостей:

```typescript
export interface PathNode {
  roomId: number;
  cost: number;
}

export function findOptimalPath(
  startRoomId: number,
  targetRoomId: number,
  rooms: { [id: number]: RoomState },
  corridors: { [id: string]: CorridorState }
): number[] | null {
  const openSet: PathNode[] = [{ roomId: startRoomId, cost: 0 }];
  const cameFrom = new Map<number, number>();
  const gScore = new Map<number, number>();
  gScore.set(startRoomId, 0);

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.cost - b.cost);
    const current = openSet.shift()!;

    if (current.roomId === targetRoomId) {
      const path: number[] = [current.roomId];
      let curr = current.roomId;
      while (cameFrom.has(curr)) {
        curr = cameFrom.get(curr)!;
        path.unshift(curr);
      }
      return path;
    }

    const currentRoom = rooms[current.roomId];
    for (const neighborId of currentRoom.connectedRoomIds) {
      const corridorKey = [current.roomId, neighborId].sort().join('-');
      const corridor = corridors[corridorKey];

      // Проверка запертых дверей
      if (corridor.doorState === 'CLOSED') continue;

      // Оценка опасности ребра (вес шага)
      let stepCost = 1;
      if (corridor.hasNoise) stepCost += 2; // Опасно идти по шуму
      if (rooms[neighborId].hasFire) stepCost += 5; // Огонь наносит травму
      if (rooms[neighborId].occupants.some(o => o.type === 'INTRUDER')) stepCost += 10; // Бой

      const tentativeG = (gScore.get(current.roomId) ?? Infinity) + stepCost;
      if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
        cameFrom.set(neighborId, current.roomId);
        gScore.set(neighborId, tentativeG);
        openSet.push({ roomId: neighborId, cost: tentativeG });
      }
    }
  }

  return null; // Путь заблокирован
}
```

### 6.2. Детерминированный генератор случайных чисел (RNG)
* Для всех бросков кубиков и вытягивания из пула Чужих используется библиотека `seedrandom`.
* Каждая игра инициализируется мастер-сидом: `const rng = seedrandom(matchSeed)`.
* Это гарантирует воспроизводимость отладочных логов и одинаковое развитие событий при тестировании.

---

## 7. Сохранение сессии на мобильных устройствах (Persistence)

Используется встроенный в `Zustand` middleware `persist`:

```typescript
// packages/client/src/store/gameStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export const useGameStore = create<GameClientStore>()(
  persist(
    immer((set, get) => ({
      gameState: null,
      transport: null,

      setGameState: (state) => set((draft) => { draft.gameState = state; }),
      // ... экшены стора
    })),
    {
      name: 'nemesis_active_game_session',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ gameState: state.gameState }), // Сериализуем только стейт
    }
  )
);
```

---

## 8. Структура файловой системы репозитория

```text
nemesis-digital/
├── package.json                   # Workspaces: ["packages/*"]
├── tsconfig.base.json             # Общий строгий конфиг TypeScript
├── AGENTS.md                      # Инструкция для AI-агентов
├── doc/
│   ├── design_document.md         # Геймдизайн и правила
│   ├── rules.md                   # Книга правил: только локально, в git не входит
│   └── tech_stack.md              # Данный документ
│
├── packages/
│   ├── shared/                    # ИЗОМОРФНОЕ ЯДРО (Правила, 0 зависимостей от UI)
│   │   ├── src/
│   │   │   ├── types/             # entities, actions, state, rooms
│   │   │   ├── logic/             # fsm.ts, combat.ts, noise.ts, rooms.ts, crafting.ts
│   │   │   ├── utils/             # pathfinding.ts, rng.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── server/                    # СЕРВЕР (Node.js)
│   │   ├── src/
│   │   │   ├── network/           # socketHandler.ts, lobby.ts
│   │   │   ├── bots/              # utilityAI.ts, botRunner.ts, beliefState.ts
│   │   │   ├── index.ts           # Express + HTTP + Socket.io listener (порт 3000)
│   │   │   └── sanitizer.ts       # Очистка скрытых данных
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── client/                    # КЛИЕНТ (React + PWA)
│       ├── src/
│       │   ├── assets/            # Звуки, иконки, SVG тайлов
│       │   ├── components/
│       │   │   ├── board/         # ShipMapSVG.tsx, RoomNode.tsx, CorridorLine.tsx
│       │   │   ├── player/        # PlayerSheet.tsx, HandDeck.tsx, InventoryDrawer.tsx
│       │   │   ├── scanner/       # InfectionScannerOverlay.tsx
│       │   │   └── modals/        # ActionModal.tsx, ClaimModal.tsx, CombatModal.tsx
│       │   ├── services/          # transport/ (SocketIoTransport, LocalInMemoryTransport)
│       │   ├── store/             # gameStore.ts
│       │   ├── hooks/             # useAudio.ts, useGestures.ts
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── vite.config.ts         # Настройка PWA и Vite
│       ├── tailwind.config.js     # Настройка Tailwind
│       ├── package.json
│       └── tsconfig.json
```

---

## 9. Команды сборки и запуска

```bash
# 1. Установка всех зависимостей в монорепозитории
npm install

# 2. Запуск в режиме разработки (Клиент + Сервер параллельно)
npm run dev

# 3. Запуск сервера для игры в локальной сети Wi-Fi (LAN с мобилок):
HOST=0.0.0.0 PORT=3000 npm run start --workspace=packages/server

# 4. Сборка продакшн PWA-клиента (папка dist готова для загрузки на хостинг)
npm run build --workspace=packages/client
```