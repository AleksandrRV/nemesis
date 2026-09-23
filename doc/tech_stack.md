# ТЕХНОЛОГИЧЕСКИЙ СТЕК И СИСТЕМНАЯ АРХИТЕКТУРА
# Проект: Nemesis Digital

**Версия документа:** 3.0 (актуализировано под v0.5.0, схема 19, 989 тестов, 2 пакета)  
**Статус документа:** цель + факт текущей ревизии. Что уже работает — в [README](../README.md), фактические контракты — в `packages/shared/src/types/`, план этапов — в [roadmap.md](roadmap.md), история — в [CHANGELOG.md](../CHANGELOG.md).  
**Язык:** TypeScript 5.x (Strict Mode)  
**Среда:** Evergreen Browsers, Node.js LTS (для тестов/будущего сервера)  
**Паттерн:** Isomorphic Shared Core + Event-Driven FSM + Transport Adapter + Sanitized State

---

## 1. Обзор архитектуры

Монорепозиторий NPM Workspaces из 2 пакетов (факт v0.5.0):

* **`packages/shared`** — изоморфное ядро: типы, данные компонентов (20 комнат, 60 карт действий, 90 предметов, 20 атак, 20 событий, 20 жетонов исследования, пул Чужих, кубики), логика правил (FSM, прерывания, бой, шум, Фазы), детерминированный RNG (seedrandom, 3 потока `layout`/`bag`/`cards`/`noise`/`combat`), golden-тесты provenance.
* **`packages/client`** — React 18 + Vite 5 + Tailwind 3 + Zustand 4 + Immer 10 + Lucide + react-zoom-pan-pinch 3. SVG-карта корабля (21 отсек, 29 коридоров), инспектор, рука, модалки решений, журнал (19 исходов эффектов Событий, 6 исходов Улья), локальный транспорт `LocalInMemoryTransport`, сохранение в `localStorage`.

Принцип **Isomorphic Shared Core**: 100% правил в `shared`, одинаково компилируется в браузере (офлайн-соло) и в будущем на Node-сервере (авторитетный судья для LAN/WAN).

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        NEMESIS MONOREPO WORKSPACE                       │
├─────────────────────────────────────────────────────────────────────────┤
│ packages/shared                                                         │
│ • Типы (state, actions, rooms, entities, cards, log, contact, etc.)    │
│ • Данные: roomDefinitions (5+11+9), shipGraph (21 узел, 29 коридоров), │
│   actionCards (60), itemCards (90), crafting (12), startingItems (6),  │
│   contamination (27), seriousWounds (16), intruderAttacks (20),        │
│   eventCards (20), explorationTokens (20), intruderPool (27),          │
│   combatDie (6 граней), noiseDie (10), weaknesses (8)                  │
│ • Логика: fsm, interrupts, setup, cardsPayment, turnCycle,            │
│   eventsPhase (9 шагов), eventEffects (19), eventCardMovement,        │
│   hiveDevelopment, eventsPhaseAttacks, contact, shoot, melee,          │
│   intruderRetreat, intruderAttacks, characterDamage, markers,          │
│   search, roomAbilities, sanitizer, etc.                               │
│ • Утилиты: rng (seedrandom), детерминированные тасовки                 │
│ (Зависимости: immer, seedrandom — 0 DOM/Node)                           │
├──────────────────────────────────────┬──────────────────────────────────┤
│ packages/server (план этапы 10-11)   │ packages/client (факт)           │
│ • Node.js + Express (план)           │ • React 18 + Vite 5              │
│ • WebSocket (план)                   │ • Tailwind CSS 3                 │
│ • Лобби и сессии (план)              │ • Zustand 4 + Immer 10 + Persist │
│ • Фильтр стейта (sanitizer в shared) │ • SVG-карта + zoom-pan-pinch     │
│ • ИИ-боты Utility AI (план)          │ • Lucide-react (иконки)          │
│ • LAN 0.0.0.0 (план)                 │ • PWA план (vite-plugin-pwa)     │
└──────────────────────────────────────┴──────────────────────────────────┘
```

---

## 2. Стек по слоям (факт v0.5.0)

### 2.1. База
* **TypeScript 5.x strict** — запрет `any`, дискриминированные объединения для всех действий/событий.
* **Vite 5.x** — HMR, билд клиента.
* **NPM Workspaces** — без Lerna/Nx.
* **Vitest** — 989 тестов / 82 файла (shared + client).

### 2.2. Frontend (`packages/client`)
* **React 18** — компоненты: планшет игрока, слоты рук, карта, сканер, модалки.
* **Tailwind CSS 3.x** — utility-классы, без отдельных CSS-файлов.
* **Zustand 4 + Immer 10** — стор `useGameStore`, атомарные транзакции движка, безопасные вложенные мутации.
* **Zustand Persist** — `localStorage` ключ `nemesis_active_game_session`, восстановление с проверкой схемы 19.
* **SVG-карта + react-zoom-pan-pinch 3.4.3** — 21 гекс, 29 коридоров, двери, шум, огонь, поломки, фишки игроков и Чужих (масштабы классов, аура Трутня/Королевы, сетка при 3+ типах, рамка «В Бою»), поле Технических Коридоров с трассами вентиляции.
* **Lucide-react** — иконки боезапаса, шума, огня, поломок, дверей.
* **clsx + tailwind-merge** — композиция классов.
* Нет Howler.js / Framer Motion в текущей ревизии — звук и анимации через CSS `motion-safe` и `prefers-reduced-motion`.

### 2.3. Shared (`packages/shared`)
* **seedrandom 3.x** — детерминированный RNG, 5 потоков: `layout` (расклад поля/колод), `bag` (мешок Чужих), `cards` (общие колоды), `noise` (кубик Шума), `combat` (кубик Боя). Позиция каждого потока — `meta.rngDraws`, восстановление реплеем от мастер-сида.
* **Immer 10.x** — `produce` в `GameEngine.processAction()` для атомарности.
* **Golden-тесты provenance** — `sources.golden.test.ts` сверяет данные с `doc/sources/data-sources.json`.

### 2.4. PWA и офлайн (план/частично)
* PWA (`vite-plugin-pwa` + Workbox) — план этапа 10: манифест, Service Worker, кэш HTML/JS/CSS/SVG. Текущая ревизия работает как Web-app с сохранением в `localStorage`.

### 2.5. Backend (план этапы 10–11)
* Node.js LTS, WebSocket (Socket.io или ws), HTTP 0.0.0.0 для LAN.
* Авторитетный сервер: `GameEngine` из `shared` + `filterStateForPlayer` + `LocalInMemoryTransport` → `SocketIoTransport`.

---

## 3. Архитектура стейта и данных

### 3.1. Полное состояние (`GameState`, схема 19)

```typescript
// packages/shared/src/types/state.ts
export const GAME_STATE_SCHEMA_VERSION = 19;

export interface GameState {
  meta: {
    schemaVersion: number;
    gameId: string;
    seed: string;
    nextEntitySequence: number;
    gameMode: 'SOLO'|'COOP'|'SEMI_COOP'|'INTRUDER_PLAYER';
    currentRound: number;
    phase: 'PLAYER_PHASE'|'EVENT_PHASE'|'GAME_OVER';
    activePlayerId: string;
    firstPlayerId: string;
    timeTrackPosition: number; // 0..15, 15=красный прыжок
    selfDestructTrackPosition: number | null; // null=выкл, 0..8 (8=череп)
    rngDraws: Record<RngStream, number>; // layout,bag,cards,noise,combat
    gameOverReason: GameOverReason | null; // SHIP_EXPLODED/HULL_BREACH/HYPERSPACE_JUMP/NO_ACTIVE_CHARACTERS
  };
  ship: {
    rooms: Record<RoomId, RoomState>; // 21 узел
    corridors: Record<string, CorridorConnection>; // 29 коридоров
    technicalCorridorNoise: boolean;
    engines: Record<EngineNumber, EngineState>; // { isWorking: boolean } — второй жетон парный
    coordinates: { destination: Destination; currentCourseMarker: CourseMarker; }; // EARTH/MARS/DEEP_SPACE_1/2, A/B/C/D
    escapePods: Record<string, EscapePodState>; // 2-4 по числу игроков, LOCKED/UNLOCKED, isDestroyed, occupantIds
  };
  intrudersPool: {
    firstEncounterOccurred: boolean;
    attackSuppression: Record<string, { round, phase }>; // подавление Зова до конца фазы
    bag: IntruderToken[]; // мешок (рубашка вверх)
    supply: IntruderToken[]; // запас рядом с полем
    boardTokens: IntruderEntity[]; // миниатюры на поле с woundsCount
    deadTokens: IntruderToken[]; // резерв контракта
    eggsOnBoard: number; // 0..8, вместимость HIVE_EGG_CAPACITY
    weaknessSlots: WeaknessSlotState[]; // 3 слота: Труп/Яйцо/Останки
  };
  decks: GameDecksState; // exploration (20), events (20), items (30/30/30), crafted (12), contamination (27), wounds (16), attacks (20), objectives (заглушка)
  players: Record<string, PlayerState>; // 6 классов, 2 слота рук, инвентарь, травмы, слизь, сигнал
  claimsLog: ClaimEvent[];
  gameLog: GameLogEntry[]; // публичный журнал, 19 EventEffectOutcome + 6 HiveDevelopmentOutcome
  interruptQueue: InterruptEvent[]; // каскад: EXPLORE_ROOM, NOISE_ROLL, CONTACT, SURPRISE_ATTACK, ESCAPE_ATTACK, etc.
  pendingDecision: PendingDecision | null; // CHOOSE_OBJECTIVE, CHOOSE_SEARCH_ITEM, CHOOSE_WHITE_ROOM_DECK, CHOOSE_EVENT_CARD, etc.
}
```

**Двигатели:** на отсеке 2 жетона (Исправный/Неисправный), верхний — истина. Второй всегда парный, поэтому хранится только `isWorking` (упрощение по книге правил стр. 26).

**Коридоры:** 29 (код) — каждый с номерами выходов 1–4 с двух сторон, дверью OPEN/CLOSED/DESTROYED, флагом Шума, входом в техкоридоры. Парные коридоры (два независимых между парой отсеков) — одна запись с общим маркером Шума/двери (известное расхождение, зафиксировано тестом-снимком).

### 3.2. Скрытие информации (`sanitizer.ts`)

```typescript
export function filterStateForPlayer(state: GameState, viewingPlayerId: string): SanitizedGameState
```

* Чужие руки/инвентарь — `null`/счётчики, неисследованные тайлы — `null`, чужие `pendingDecision` — скрыты.
* Двигатели/координаты — тайные до проверки (действие [2] на Мостике/Машинных), игрок может солгать (система заявлений — этап 0.8.0).
* Колоды — только размеры, порядок скрыт, поток `cards` детерминирован.
* Журнал публичен, скрытых данных не содержит.

### 3.3. Заявления (блеф)

```typescript
export interface ClaimEvent {
  id: string;
  authorPlayerId: string;
  timestamp: number;
  type: 'ENGINE_STATUS_CLAIM' | 'COORDINATES_CLAIM';
  payload: { targetSystemId: 1|2|3|'COORDINATES'; declaredStatus: 'WORKING'|'DAMAGED'|'DESTINATION_EARTH'|'DESTINATION_OTHER'; };
}
```

---

## 4. Игровой цикл и прерывания (FSM)

```typescript
// fsm.ts
export class GameEngine {
  public processAction(state: GameState, action: GameAction): GameState {
    return produce(state, draft => {
      this.validateAction(draft, action);
      this.executeActionStep(draft, action);
      while (draft.interruptQueue.length > 0) {
        const next = draft.interruptQueue.shift()!;
        this.resolveInterrupt(draft, next);
      }
    });
  }
}
```

**Фаза Игроков:** добор до 5 (6 в Каютах), жетон Первого Игрока, микроходы по 2 действия / 1+пас / пас, урон от огня при завершении хода в горящей комнате.

**Фаза Событий (9 шагов, стр. 10):** Время+Самоуничтожение → Атаки Чужих (цель — наименьшая рука, жетон Первого) → Урон от Огня (1 Рана Чужому + яйцо на полу) → Карта События (Движение по номеру коридора + текстовый эффект 19 вариантов) → Развитие Улья (6 исходов) → проверка конца партии.

**Прерывания:** `EXPLORE_ROOM_INTERRUPT` → `EXPLORATION_TOKEN_REVEALED` → `NOISE_ROLL_INTERRUPT` → `CONTACT` → `SURPRISE_ATTACK` → `ESCAPE_ATTACK`. Очередь разыгрывается до пустой, приостанавливается на `pendingDecision`.

---

## 5. Транспорт (Adapter)

```typescript
// services/transport/ITransport.ts (план + факт Local)
export interface IGameTransport {
  init(): Promise<void>;
  sendAction(action: GameAction): void;
  subscribeToState(cb: (state: SanitizedGameState) => void): () => void;
}
```

* **LocalInMemoryTransport** (факт): исполняет `GameEngine` в браузере, сохраняет снапшот в `localStorage`, `filterStateForPlayer`.
* **SocketIoTransport** (план): `client_game_action` → сервер → `server_state_sync`.

---

## 6. Математика и детерминизм

* **A* / графовые запросы** — `shipGraphQueries.ts`: `requireOpenPath()`, `findOpenCorridors()`, `corridorsLeadingInto()`, `roomHasTechnicalEntrance()`. Веса: шум +2, огонь +5, бой +10 (для будущего ИИ).
* **RNG** — `seedrandom`, 5 потоков, счётчики в `meta.rngDraws`, реплей от мастер-сида для воспроизводимости логов и тестов.

---

## 7. Сохранение сессии

* Zustand Persist — `nemesis_active_game_session` в `localStorage`, `partialize: { gameState }`.
* При старте — проверка `schemaVersion` (19), несовместимые сохранения не восстанавливаются, начинается новая партия.
* Журнал — часть состояния, версия 4→19 из-за `gameLog`.

---

## 8. Структура репозитория (факт v0.5.0)

```
nemesis/
├── package.json (workspaces: packages/*)
├── tsconfig.base.json
├── AGENTS.md, NOTICE.md, README.md, CHANGELOG.md
├── doc/
│   ├── rules.md (книга правил, источник истины)
│   ├── design_document.md, tech_stack.md, project-map.md, game-log.md
│   ├── roadmap.md, original/ (10 файлов PnP, 105 МБ), data/ (10 транскриптов), sources/data-sources.json
│   └── prompts/ (архив)
├── packages/
│   ├── shared/ (ядро, 0 DOM-зависимостей)
│   │   ├── src/types/ (state, actions, rooms, entities, cards, log, contact, decisions, sanitized, etc.)
│   │   ├── src/logic/ (fsm, interrupts, setup, turnCycle, eventsPhase, eventEffects, hiveDevelopment, contact, shoot, melee, etc.)
│   │   ├── src/data/ (shipGraph 21/29, roomDefinitions 5+11+9, actionCards 60, itemCards 90, crafting 12, etc.)
│   │   └── src/utils/ (rng)
│   └── client/ (React)
│       ├── src/components/ (board, inspector, hand, contact, combat, log, events, dev, hud, modals)
│       ├── src/services/ (transport, session)
│       ├── src/store/ (gameStore)
│       └── vite.config.ts, tailwind.config.js
```

---

## 9. Команды (факт)

```bash
npm ci                      # установка обоих пакетов
npm run verify              # typecheck + lint + format:check + test (989/82)
npm run dev --workspace=@nemesis/client  # Vite --host
npm run build --workspace=@nemesis/client
# План LAN:
HOST=0.0.0.0 PORT=3000 npm run start --workspace=@nemesis/server
```
