# ТЕХНОЛОГИЧЕСКИЙ СТЕК И СИСТЕМНАЯ АРХИТЕКТУРА
# Проект: Nemesis Digital

**Версия документа:** 2.1 (Актуализация под 0.5.0 — изоморфное ядро, 9 шагов Фазы Событий, фильтр скрытой информации, анимация карты)  
**Статус документа:** разделы про сервер, PWA, ботов — цель этапов 8–11; что уже работает — в [README](../README.md), фактические контракты — в `packages/shared/src/types/`, исполнение — в [CHANGELOG](../CHANGELOG.md).  
**Язык разработки:** TypeScript 5.x (Strict Mode)  
**Среда выполнения:** Evergreen Web Browsers (Blink / Gecko / WebKit), Node.js LTS  
**Архитектурный паттерн:** Isomorphic Shared Core + Event-Driven FSM + Transport Adapter

---

## 1. Обзор архитектурного решения

Проект организован как модульный монорепозиторий на базе **NPM Workspaces**.

Главный архитектурный принцип — **Изоморфное ядро (Isomorphic Shared Core)**: 100% правил настольной игры, структуры данных и математические функции вынесены в независимый от платформы пакет `packages/shared`. Это ядро одинаково компилируется и исполняется:
1. **В Node.js (Сервер, цель этапов 10–11):** Для сетевых матчей по локальной сети (LAN) или через Интернет. Сервер выступает в роли неподкупного судьи (Authoritative Server).
2. **В браузере смартфона/ПК (текущий офлайн-клиент, 0.5.0):** Для соло-режима без интернета и локального сервера; вся Фаза Событий, Контакты, Бой и анимация исполняются в том же ядре, но внутри `LocalInMemoryTransport`.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          NEMESIS MONOREPO WORKSPACE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  packages/shared                                                            │
│  • Типы и интерфейсы сущностей (Комнаты, Персонажи, Чужие, Карты)           │
│  • Чистая логика правил (Движение, Шум, Контакт, Бой, Фаза Событий)         │
│  • Граф корабля (21 отсек, 29 коридоров, техкоридоры) + запросы графа       │
│  • Детерминированный RNG (seedrandom) — 5 потоков                           │
│  • Стейт-машина фаз и прерываний (FSM + interrupts + gameLog)               │
│  (Зависимости: 0 внешних библиотек для DOM или Node — immer, seedrandom)    │
├──────────────────────────────────────┬──────────────────────────────────────┤
│  packages/server (цель)              │  packages/client (0.5.0)             │
│  • Node.js + Express (план)          │  • React 18 + Vite 5                 │
│  • Socket.io (план)                  │  • Tailwind CSS 3                    │
│  • Лобби и сессии (план)             │  • Zustand + Immer                   │
│  • Фильтрация (sanitizer — уже в     │  • Интерактивная SVG-карта +         │
│    shared, сервер её переиспользует) │    react-zoom-pan-pinch              │
│  • ИИ-боты Utility AI (план)         │  • Анимация карты (BoardAnimationLayer) │
│  • LAN 0.0.0.0 (план)                │  • Оверлей Фазы Событий (EventPhaseModal) │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

Текущая ревизия — два пакета, `packages/shared` и `packages/client`. `packages/server` появится на этапах 10–11 дорожной карты.

---

## 2. Детализация технологического стека по слоям

### 2.1. Базовый инструментарий
* **TypeScript 5.x (`strict: true`):** Абсолютный запрет на использование `any`. Все типы событий, действий и состояний строго типизированы через размеченные объединения (Discriminated Unions).
* **Vite 5.x:** Сборщик фронтенда с мгновенной перезагрузкой модулей (HMR).
* **NPM Workspaces:** Встроенный в npm менеджер монорепозитория без необходимости ставить тяжелые утилиты вроде Lerna или Nx.

### 2.2. Frontend (`packages/client`)
* **React 18:** Компонентная структура UI (карта корабля, инспектор отсека, рука игрока, модальные окна решений, журнал, боевые панели).
* **Tailwind CSS 3.x:** Полностью текстовое описание стилей прямо в разметке. Исключает ручную верстку отдельных CSS-файлов.
* **Zustand + Immer:** Легковесный менеджер состояния (`store/gameStore.ts`). В связке с Immer позволяет безопасно модифицировать сложные вложенные структуры стейта без громоздких редьюсеров.
* **Интерактивная векторная карта (SVG) + `react-zoom-pan-pinch`:**
  * Поле корабля — чистый векторный SVG (шестиугольники комнат, линии коридоров, маркеры).
  * `react-zoom-pan-pinch` — гладкий pinch-to-zoom и перетаскивание на мобильных и ПК.
* **Lucide React:** Набор векторных иконок для боезапаса, шума, огня, поломок, дверей и черепов.
* **Анимация карты (0.5.0):** `BoardAnimationLayer` + `boardAnimationModel` — чистый дифф двух `SanitizedGameState`, интерполяция от центра к центру, эффекты взлома двери и вентиляции; `usePrefersReducedMotion` уважает `prefers-reduced-motion`.
* **Презентация Фазы Событий (0.5.0):** `EventPhaseModal` + `eventPhasePresentation` — кинематографичный оверлей шести шагов фазы с янтарной подсветкой отсеков на карте.

> **Примечание про PWA/Howler/Framer Motion:** в GDD они — часть цели (этапы 9–11). Текущий клиент рендерит карту/журнал/бой без PWA-плагина и без звукового движка; анимации реализованы CSS keyframes + Tailwind `motion-safe`.

### 2.3. PWA и Офлайн-автономия (цель этапа 9)
* **`vite-plugin-pwa` (план):**
  * Манифест (`manifest.json`) и Service Worker через Workbox.
  * Кэширование HTML/JS/CSS/ассетов; запуск с иконки рабочего стола Android без сети.
* **Текущая офлайн-автономия (0.5.0):** партия сохраняется в `localStorage` через сервис `services/session/sessionStorage.ts` (ключ `nemesis-session`, версия схемы `GAME_STATE_SCHEMA_VERSION = 19`) и переживает перезагрузку вкладки; сеть не требуется.

### 2.4. Backend и Сеть (цель этапов 10–11)
* **Node.js LTS (v20+):** Среда выполнения будущего сервера.
* **Socket.io v4 (план):** WebSockets с авто-переподключением.
* **HTTP / LAN привязка (план):** `0.0.0.0` для подключения по Wi-Fi по IP-адресу.
* **Текущий транспорт (0.5.0):** `LocalInMemoryTransport` исполняет действия в `GameEngine` браузера и отдаёт наружу только `SanitizedGameState`; `SocketIoTransport` — цель сетевых этапов.

---

## 3. Архитектура стейта и данных (Data Contracts)

### 3.1. Полное состояние игры (`GameState`)
Фактический контракт — `packages/shared/src/types/state.ts` (схема **19**, см. `CHANGELOG.md`):

```typescript
export const GAME_STATE_SCHEMA_VERSION = 19;

export interface GameState {
  meta: {
    schemaVersion: number; // = GAME_STATE_SCHEMA_VERSION
    gameId: string;
    seed: string;
    nextEntitySequence: number;
    gameMode: 'SOLO' | 'COOP' | 'SEMI_COOP' | 'INTRUDER_PLAYER';
    currentRound: number;
    phase: 'PLAYER_PHASE' | 'EVENT_PHASE' | 'GAME_OVER';
    activePlayerId: string;
    firstPlayerId: string;
    timeTrackPosition: number; // 0..15 — 15=гиперпрыжок (стр. 11)
    selfDestructTrackPosition: number | null; // null|0..8 — 8=череп (стр. 11,24)
    rngDraws: Record<RngStream, number>; // layout|noise|bag|cards|combat
    gameOverReason: GameOverReason | null; // SHIP_EXPLODED|HULL_BREACH|HYPERSPACE_JUMP|NO_ACTIVE_CHARACTERS
  };
  ship: {
    rooms: Record<RoomId, RoomState>;
    corridors: Record<string, CorridorConnection>; // id "roomId1-roomId2"
    technicalCorridorNoise: boolean;
    engines: Record<EngineNumber, { isWorking: boolean }>; // верхний жетон — истина (стр. 6,26)
    coordinates: { destination: Destination; currentCourseMarker: CourseMarker }; // EARTH|MARS|DEEP_SPACE_*
    escapePods: Record<string, EscapePodState>; // isLocked + isDestroyed + occupantIds
  };
  intrudersPool: {
    firstEncounterOccurred: boolean;
    attackSuppression: Record<string, { round:number; phase:GamePhase }>; // Зов (CALL)
    bag: IntruderToken[]; // мешок (рубашкой вверх)
    supply: IntruderToken[]; // запас рядом с полем
    boardTokens: IntruderEntity[]; // миниатюры на поле (woundsCount, roomId)
    deadTokens: IntruderToken[];
    eggsOnBoard: number; // на Планшете Чужих (≤8)
    weaknessSlots: WeaknessSlotState[]; // 3 слота: Труп|Яйцо|Останки
  };
  decks: GameDecksState; // items (RED/YELLOW/GREEN), craftedItems, contamination, seriousWounds, events, intruderAttacks, objectives, weaknesses
  players: Record<string, PlayerState>; // actionDeck (draw/hand/discard), handSlots (2), inventory, questItems (2), wounds, slime/larva/signal/hibernation
  claimsLog: ClaimEvent[];
  gameLog: GameLogEntry[]; // 30+ типов, от GAME_STARTED до HIVE_DEVELOPMENT_*
  interruptQueue: InterruptEvent[]; // EXPLORE_ROOM_INTERRUPT, NOISE_ROLL_INTERRUPT и др.
  pendingDecision: PendingDecision | null; // CHOOSE_SEARCH_ITEM и еще 8 типов
}
```

Ключевые числа: `TIME_TRACK_LENGTH = 15`, `HAND_SLOT_COUNT = 2`, `INTRUDER_MINIATURE_LIMITS = {LARVA:6, CREEPER:3, ADULT:8, BREEDER:2, QUEEN:1}`, `FIRE/MALFUNCTION` — по 8, `DOOR_TOKEN_SUPPLY` — 12, `NOISE` — 30.

### 3.2. Скрытие информации и фильтрация (`Sanitization`)
Единственная точка наружу — `filterStateForPlayer(state, viewingPlayerId)` (`packages/shared/src/logic/sanitizer.ts`):

```typescript
// packages/shared/src/logic/sanitizer.ts (упрощено, факт — в коде)
export function filterStateForPlayer(state: GameState, viewingPlayerId: string): SanitizedGameState {
  const sanitized = structuredClone(state) as unknown as SanitizedGameState;
  sanitized.pendingDecisionPlayerId = state.pendingDecision?.playerId ?? null;

  // Мешок/запас — составом, а не порядком (иначе Контакт предсказуем)
  sanitized.intrudersPool.bag = countIntruderTokens(state.intrudersPool.bag);
  sanitized.intrudersPool.supply = countIntruderTokens(state.intrudersPool.supply);

  // Двигатели/Координаты — только после личной проверки
  for (const n of [1,2,3] as const) {
    if (!viewer.inspectedEngines.includes(n)) sanitized.ship.engines[n].isWorking = null;
  }
  if (!viewer.inspectedCoordinates) sanitized.ship.coordinates.destination = null;

  // Неисследованный отсек — null вместо «нет огня/поломки» (не раскрывает тайл)
  for (const room of Object.values(sanitized.ship.rooms)) if (!room.isExplored) sanitizeRoom(room);

  // Чужая рука/сброс — размерами, чужой инвентарь/цели — null, чужие решения — null
  sanitizePlayers(sanitized, viewingPlayerId);
  sanitizeDecks(sanitized); // колоды добора — числом, сбросы Предметов/Событий/Атак — лицом вверх, Заражения/Слабостей/Целей — числом

  // Карта Заражения: isInfected = null пока не просканирована (стр. 20)
  // isInfected раскрывается только после isScanned

  if (sanitized.pendingDecision && sanitized.pendingDecision.playerId !== viewingPlayerId) sanitized.pendingDecision = null;
  return sanitized;
}
```

Эффект — «нулевое читерство»: порядок мешка и колод закрыт числом, рука/сброс чужого — размерами (но размер руки чужих виден — нужен для проверки Внезапной атаки, стр. 18), `pendingDecision` — только владельцу, `SanitizedGameState` сериализуем.

### 3.3. Модель заявлений (задел под блеф и ботов, цель этапа 8)
```typescript
// GDD §4.1/§5.1 — пока без исполнения, но контракт уже есть (см. design_document.md)
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

Действие проходит через `GameEngine.processAction` (Immer-транзакция, полный откат при отказе) и каскад прерываний `interruptQueue`. На 0.5.0 реализованы:

```typescript
// packages/shared/src/types/interrupts.ts + logic/fsm.ts (факт — в коде)
export type InterruptEvent =
  | { type: 'EXPLORE_ROOM_INTERRUPT'; roomId: number; corridorId: string }
  | { type: 'NOISE_ROLL_INTERRUPT'; roomId: number; playerId: string }
  | { type: 'CONTACT_INTERRUPT'; roomId: number; playerId: string; source: 'NOISE'|'CALL'|'EVENT' }
  // + внутренние прерывания расширения (заявлено контрактом Шага 3: ESCAPE_ATTACK_INTERRUPT)
  ;

export class GameEngine {
  public processAction(state: GameState, action: GameAction): GameState {
    return produce(state, (draft) => {
      this.validateAction(draft, action);   // оплата картами, статус Боя, двери
      this.executeActionStep(draft, action); // движение/поиск/бой/комнаты/пас
      // Каскад прерываний: вскрытие → шум → контакт → внезапная атака → события фазы
      while (draft.interruptQueue.length > 0) {
        const next = draft.interruptQueue.shift()!;
        this.resolveInterrupt(draft, next); // может породить новые прерывания
      }
      // Фаза Событий (при всеобщем пасе): оркестратор runEventPhase — 9 шагов (стр. 10)
      // Шаг 9 завершает раунд startNewRound, но прерывания каскадов (Хива) разбираются до него
    });
  }
}
```

Фаза Событий (`logic/eventsPhase.ts`): `advanceTimeAndSelfDestruct` (Шаг 4) → `resolveEventPhaseAttacks` (Шаг 5) → `resolveFireDamage` (Шаг 6) → `resolveEventCardMovement` (Шаг 7а) → `resolveEventCardEffect` (Шаг 7б) → `resolveHiveDevelopment` (Шаг 8) → каскадный `drainInterrupts` → `startNewRound` (Шаг 9). Аварийный исход любого шага — `endGame` и останов фазы.

---

## 5. Сетевой транспорт и Паттерн Адаптера

`IGameTransport` изолирует React UI от местонахождения движка правил (`packages/client/src/services/transport/`):

```typescript
// packages/client/src/services/transport/ITransport.ts
export interface IGameTransport {
  init(): Promise<void>;
  sendAction(action: GameAction): void;
  subscribeToState(callback: (state: SanitizedGameState) => void): () => void;
  // + подписка на необработанные события (для баннеров/журнала)
}
```

### 5.1. Реализация для Мультиплеера (LAN / WAN, цель)
```typescript
// packages/client/src/services/transport/SocketIoTransport.ts (план этапов 10–11)
export class SocketIoTransport implements IGameTransport {
  private socket: Socket;
  constructor(serverUrl: string) { this.socket = io(serverUrl, { autoConnect: false }); }
  async init() { this.socket.connect(); }
  sendAction(action: GameAction) { this.socket.emit('client_game_action', action); }
  subscribeToState(cb: (s: SanitizedGameState) => void) {
    this.socket.on('server_state_sync', cb);
    return () => this.socket.off('server_state_sync', cb);
  }
}
```

### 5.2. Реализация для Офлайн Соло (0.5.0, браузер без сети)
```typescript
// packages/client/src/services/transport/LocalInMemoryTransport.ts
export class LocalInMemoryTransport implements IGameTransport {
  private engine = new GameEngine();
  private localState: GameState;
  private stateSubscribers: ((state: SanitizedGameState) => void)[] = [];
  private playerId: string;

  constructor(initialState: GameState, playerId: string) {
    this.engine = new GameEngine();
    this.localState = initialState; // из createInitialGameState(seed)
    this.playerId = playerId;
  }
  async init() { this.broadcast(); }
  sendAction(action: GameAction) {
    this.localState = this.engine.processAction(this.localState, action);
    this.broadcast(); // filterStateForPlayer + подписчики + сохранение в sessionStorage
    // Боты (GDD §5, этап 8): задел интерфейса, такт пока не реализован
  }
  private broadcast() {
    const sanitized = filterStateForPlayer(this.localState, this.playerId);
    this.stateSubscribers.forEach(cb => cb(sanitized));
  }
}
```

Клиент мутирует только через `dispatch` (`store/gameStore.ts`); полный `GameState` не покидает транспорт.

---

## 6. Математика, графы и поиск пути

### 6.1. Граф корабля и запросы
Граф — 21 отсек (`SHIP_ROOM_NODES`) и 29 коридоров (`SHIP_CORRIDORS`) с номерами выходов `fromNumbers`/`toNumbers` (1–4) и входами вентиляции `techNumbers` (см. `packages/shared/src/data/shipGraph.ts`). Данные помечены `UNVERIFIED_BOARD` в `data-sources.json` (читаются только с физического поля).

На 0.5.0 достижимость считается прямой проверкой открытых дверей (`logic/shipGraphQueries.ts`):

```typescript
export function findAdjacentOpenRoomIds(state: GameState, roomId: number): number[]
export function findOpenCorridors(state: GameState, roomId: number): CorridorConnection[]
export function roomHasTechnicalEntrance(room: RoomState): boolean
// + corridorsLeadingInto, requireOpenPath — запросы для движения Чужих и Побега
```

Собственный взвешенный A* с учётом огня/чужих описан в GDD как цель этапа ИИ (этап 8) и появится вместе с планированием ботов; сейчас планирование Чужих идёт детерминированными правилами книги (по номеру коридора карты События и приоритету наименьшего номера — «Охота»).

### 6.2. Детерминированный RNG
* Потоки `layout` (расклад тайлов/жетонов), `bag` (мешок Чужих), `cards` (тасовка колод стола и действий), `noise` (кубик Шума d10), `combat` (кубик Боя) — `packages/shared/src/utils/rng.ts` (`seedrandom`).
* Каждая партия — мастер-сид `meta.seed`; броски не сдвигают чужие потоки; партия воспроизводится по сиду (проверено тестами `rng.test.ts` и интеграцией `roundCycle`).

---

## 7. Сохранение сессии на мобильных устройствах (Persistence)

Сервис `packages/client/src/services/session/sessionStorage.ts` (а не `zustand/middleware/persist`):

```typescript
// packages/client/src/services/session/sessionStorage.ts
export const SESSION_KEY = 'nemesis-session';
export function createLocalSessionStorage(): SessionStorage {
  // get/set/clear — JSON-сериализация GameState + проверка GAME_STATE_SCHEMA_VERSION
  // Несовместимая версия (например, 18 → 19) — сохранение игнорируется, начинается новая партия
}
```

Сохранение вызывается транспортом после каждого успешного `processAction` и переживает перезагрузку вкладки браузера; версия схемы — **19** (чтобы история журнала не расходилась с полем). Хранилище тестируется в `services/session/sessionStorage.test.ts` (19 кейсов).

В сторе (`store/gameStore.ts`) состояние хранится как `view: SanitizedGameState | null` + `selectedRoomId` + `rejection`; прямых мутаций правил стор не делает.

---

## 8. Структура файловой системы репозитория

```text
nemesis-digital/
├── package.json                   # Workspaces: ["packages/*"]
├── tsconfig.base.json             # Общий строгий конфиг TypeScript
├── AGENTS.md                      # Инструкция для AI-агентов
├── doc/
│   ├── rules.md                   # Книга правил: источник истины по механике (оригинал)
│   ├── design_document.md         # GDD: целевое устройство игры (микрораунды, блеф, честный ИИ)
│   ├── tech_stack.md              # Данный документ
│   ├── project-map.md             # Карта: экран/модуль → где в коде
│   ├── roadmap.md                 # Этапы до релиза (0.5.0 завершён)
│   ├── game-log.md                # Контракт журнала партии
│   ├── data/                      # Транскрипты игровых данных (8 файлов)
│   └── sources/data-sources.json  # Пакет источника: откуда каждое число
│
├── packages/
│   ├── shared/                    # ИЗОМОРФНОЕ ЯДРО (Правила, 0 зависимостей от UI)
│   │   ├── src/
│   │   │   ├── types/             # state, actions, cards, rooms, entities, decisions, log, sanitized
│   │   │   ├── data/              # shipGraph, roomDefinitions, actionCards, itemCards, explorationTokens, eventCards, intruderAttacks, contaminationCards, seriousWounds, weaknesses, ...
│   │   │   ├── logic/             # fsm, interrupts, contact, shoot, melee, intruderRetreat, escape, hiveDevelopment, eventEffects, eventsPhase (+Attacks/Movement), turnCycle, roomAbilities, sanitizer, ...
│   │   │   ├── utils/             # rng
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── client/                    # КЛИЕНТ (React + PWA-задел)
│       ├── src/
│       │   ├── components/
│       │   │   ├── board/         # ShipMapSVG, RoomHex, CorridorEdge, TechCorridorHub, VentShaftTraces, BoardAnimationLayer (+model/useBoardAnimations)
│       │   │   ├── inspector/     # RoomInspector, TechCorridorPanel, LaboratoryPanel, ...
│       │   │   ├── hand/          # PlayerHandPanel
│       │   │   ├── events/        # EventPhaseModal, EventPhaseBanner (+models/presentation)
│       │   │   ├── combat/        # ShootModal, MeleeModal
│       │   │   ├── contact/       # ContactModal/Overlay, IntruderSilhouette
│       │   │   ├── log/           # GameLogPanel (+models)
│       │   │   ├── dev/           # DevPanel
│       │   │   └── modals/        # DecisionModal, CharacterSelectModal, CardDetailsModal
│       │   ├── services/
│       │   │   ├── transport/     # ITransport, LocalInMemoryTransport
│       │   │   └── session/       # sessionStorage, seed
│       │   ├── store/             # gameStore (Zustand + Immer, view: SanitizedGameState)
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       ├── package.json
│       └── tsconfig.json
│   └── (server — цель этапов 10–11, пока нет)
```

Реальная карта модулей с точками входа — в `doc/project-map.md`.

---

## 9. Команды сборки и запуска

Канонический список команд живёт в [`AGENTS.md`](../AGENTS.md) (раздел «Команды»): он сверен с
фактическими скриптами воркспейсов, а две копии команд разъезжаются.

Текущая ревизия — два пакета, `packages/shared` и `packages/client`: установка, dev-сервер,
проверки и сборка выполняются командами из `AGENTS.md`.

Когда появится `packages/server` (этапы 10–11 дорожной карты), к ним добавится сетевой запуск:

```bash
# Цель: раздача партии в локальную сеть Wi-Fi (LAN с мобилок)
HOST=0.0.0.0 PORT=3000 npm run start --workspace=packages/server
```
