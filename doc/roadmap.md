# ROADMAP — ПЛАН РЕАЛИЗАЦИИ ПРОЕКТА
# Проект: Nemesis Digital (Web / PWA)

**Ориентир темпа:** 1 этап (минорная версия) $\approx$ 1 неделя разработки одним опытным разработчиком при поддержке AI-агентов.  
**Главный приоритет:** Поэтапное создание полноценного **одиночного режима (Solo) с ботами**, работающего офлайн на PC и смартфонах. Серверная часть и мультиплеер вынесены в заключительные этапы.

---

```
                       ДИАГРАММА ЭТАПОВ РАЗРАБОТКИ
                       
 [v0.1.0] Каркас, Граф и Интерактивная Карта
    │
 [v0.2.0] Перемещение, Туман войны, Шум и A*-навигация
    │
 [v0.3.0] Колода действий, Микрораунды и Экономика комнат
    │
 [v0.4.0] Пул Чужих, Контакты и Тактический Бой
    │
 [v0.5.0] Фаза Событий, Пожары, Поломки и Таймер
    │
 [v0.6.0] Красный Сканер, Инфекции, Крафт и Квесты
    │
 [v0.7.0] Эвакуация, Анабиоз и Финальный Валидатор Победы
    │
 [v0.8.0] Честный ИИ: Боты (Utility AI) и Система Заявлений ◄── [ГОТОВОЕ СОЛО]
    │
 [v0.9.0] Мобильная полировка, PWA, Звук и Автосохранение   ◄── [ГОТОВЫЙ ОФЛАЙН PWA]
    │
 [v0.10.0] Серверная часть: Лобби и Мультиплеер (LAN / WAN)
    │
 [v1.0.0] Режим Чужого, Альтернативное поле и Релиз
```

---

## Этап 1 (v0.1.0) — Архитектурный каркас, Граф корабля и SVG-карта
> **Срок:** Неделя 1  
> **Фокус:** Базовая архитектура монорепозитория, детерминированное ядро, топология 21/29 и интерактивная векторная карта.  
> **Статус на 17.09.2026 (версия 0.1.9 → 0.1.11):** каркас готов и зафиксирован как **v0.1.0**. Ниже этап разделён на 7 последовательных шагов. На старте проекта репозиторий был пустым — сканов `doc/original/` ещё не было, источником служили `doc/rules.md` и внешние переписи компонентов. Каждый шаг явно перечисляет файлы, контракты и тесты, которые его закрывают.

### Шаг 1. Инициализация монорепозитория и базовый tooling (Scaffolding) — ВЫПОЛНЕНО в 0.1.0

* **Workspaces:** корневой `package.json` с `workspaces: ["packages/*"]`, `packages/shared` (`immer`, `seedrandom`) и `packages/client` (`react 18`, `vite 5`, `tailwind 3`, `zustand 4`, `lucide-react`, `react-zoom-pan-pinch 3.4.3`), `packages/server` — заглушка (цель этапов 10–11, не создавать в этом этапе).
* **Строгий TypeScript:** `tsconfig.base.json` — `strict: true`, `noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`, `esModuleInterop`, отдельные `tsconfig.json` для shared/client/test/node.
* **Линтер и формат:** `eslint.config.mjs` — `max-lines` 500 (предупреждение), 1000 — рефакторинг, `no-restricted-imports` (запрет React/DOM/Node в shared, запрет `Math.random` в логике), `import/no-restricted`, `eslint` + `prettier`, `.prettierignore` исключает `TEMP/EXPERT_*`.
* **Сборка и тесты:** `vite.config.ts` с `@vitejs/plugin-react`, `tailwind.config.js` + `postcss.config.js` + `src/index.css` (только директивы Tailwind), `vitest` с проектами `shared` и `client`, `jsdom` для клиента.
* **Документация каркаса:** `AGENTS.md` (регламент агента), `NOTICE.md` (статус фанатского проекта, правило 1:1), `README.md` stub, `doc/rules.md` — текст книги правил (источник истины), `doc/design_document.md` / `tech_stack.md` / `project-map.md` — цель, не факт.
* **Скрипты:** `npm ci`, `npm run dev` (`vite --host`), `npm run verify` (`typecheck + lint + format:check + test`), `npm run build`, `npm run test:coverage`.
* *Результат:* `npm ci` ставит оба воркспейса, `npm run verify` зелёный на пустых модулях, dev-сервер отдаёт пустую страницу с HUD-заглушкой.

### Шаг 2. Контракты типов и детерминированный RNG (Core Types & RNG) — ВЫПОЛНЕНО в 0.1.0

* **Корневой контракт:** `packages/shared/src/types/state.ts` — `GAME_STATE_SCHEMA_VERSION`, `GameMeta` (`gameId`, `seed`, `nextEntitySequence`, `gameMode SOLO/COOP/SEMI_COOP/INTRUDER_PLAYER`, `currentRound`, `phase PLAYER_PHASE/EVENT_PHASE/GAME_OVER`, `activePlayerId`, `firstPlayerId`, `timeTrackPosition 0..15`, `selfDestructTrackPosition null|0..8`, `rngDraws Record<RngStream, number>`, `gameOverReason SHIP_EXPLODED/HULL_BREACH/HYPERSPACE_JUMP/NO_ACTIVE_CHARACTERS`), `ShipState` (`rooms Record<RoomId, RoomState>`, `corridors Record<string, CorridorConnection>`, `technicalCorridorNoise boolean`, `engines Record<EngineNumber, EngineState {isWorking}>`, `coordinates {destination EARTH/MARS/DEEP_SPACE_1/2, currentCourseMarker A/B/C/D}`, `escapePods`), `IntrudersPoolState` (`bag`, `supply`, `boardTokens`, `eggsOnBoard 0..8`, `weaknessSlots`, `firstEncounterOccurred`, `attackSuppression`), `GameState` (`meta`, `ship`, `intrudersPool`, `decks`, `players`, `claimsLog`, `gameLog`, `interruptQueue`, `pendingDecision`).
* **Остальные контракты:** `rooms.ts` — `RoomState` (`id`, `definitionId`, `category SPECIAL/ROOM_1/ROOM_2`, `isExplored`, `itemsCount`, `hasComputer`, `hasFire`, `hasMalfunction`, `hasSlime`, `hasDecompressionToken`, `occupantIntruderIds`, `objects`), `CorridorConnection` (`id`, `fromRoomId`, `toRoomId`, `exits {from:1..4, to:1..4}`, `doorState OPEN/CLOSED/DESTROYED`, `hasNoise`, `techNumbers`), `ExplorationEffect`; `entities.ts` — `CharacterClass` 6 классов (CAPTAIN/PILOT/MECHANIC/SOLDIER/SCOUT/SCIENTIST, Медик промо документируется отдельно), `PlayerState` (2 слота рук), `IntruderToken` (27 шт.), `IntruderEntity woundsCount`; `actions.ts` — `GameAction` discriminated union (`ACTION_MOVE`, `ACTION_SEARCH`, `ACTION_ROOM_ABILITY`, `ACTION_PASS`, `ACTION_SHOOT`, `ACTION_MELEE`, `ACTION_PICK_UP_OBJECT`, `ACTION_RESOLVE_DECISION`), `DevAction`; `cards.ts` — `ActionCard`, `ItemCard`, `ContaminationCard`, `SeriousWoundCard`, `IntruderAttackCard`, `EventCard`, `GameDecksState`; `sanitized.ts` — `SanitizedGameState` (скрытое как `null`/счётчики); `log.ts` — `GameLogEntry id sequence`; `interrupts.ts`, `decisions.ts`, `contact.ts`.
* **RNG:** `packages/shared/src/utils/rng.ts` — `seedrandom` мастер-сид, 5 потоков `layout` (расклад поля/колод), `bag` (мешок Чужих), `cards` (общие колоды), `noise` (кубик Шума d10), `combat` (кубик Боя d6), `createRng`, `shuffle` (Fisher-Yates, ровно n-1 чтений), `rollDie`/`pickIndex`, восстановление реплеем от сида по `rngDraws`.
* **Пакет источника:** `doc/sources/data-sources.json` — `meta` + `tables` с `status` (`RULES_LOCAL`, `USER_CONFIRMED`, `EXTERNAL_UNVERIFIED`, `UNVERIFIED_BOARD`) и `unverified` списком; golden-тест `sources.golden.test.ts` сверяет код с JSON.
* *Тесты:* `index.test.ts` (экспорт ядра), `types/rooms.test.ts` (контракты), `rng` determinism (один сид → одна последовательность).
* *Результат:* ядро компилируется без DOM/Node, типы строгие, RNG детерминирован, `filterStateForPlayer` ещё не реализован.

### Шаг 3. Топология корабля — граф 21/29 и определения комнат (Ship Graph & Room Definitions) — ВЫПОЛНЕНО в 0.1.0

* **Граф:** `packages/shared/src/data/shipGraph.ts` — `SHIP_ROOM_NODES` 21 узел (001 Мостик, 011 Криогенный, 019/020/021 Машинные — SPECIAL всегда исследованы; 16 неособых слотов для тайлов), `SHIP_CORRIDORS` **29** коридоров (каждый: `id`, `fromRoomId`, `toRoomId`, `exits {from:1..4, to:1..4}`, `doorState OPEN`, `hasNoise false`, `techNumbers` — входы в вентиляцию). Геометрия: 8 отсеков с входами — 2:[1,2], 4:[2,3], 5:[4], 9:[3], 14:[3], 15:[4], 19:[3,4], 21:[2,3] (из `map_full.jpg`). Известное расхождение: парные коридоры (два независимых между одной парой отсеков) описаны одной записью с общим маркером Шума/двери — зафиксировано тестом-снимком `shipGraph.test.ts`, ждёт сверки с физическим полем (`UNVERIFIED_BOARD`).
* **Определения комнат:** `packages/shared/src/data/roomDefinitions.ts` — `SPECIAL_ROOMS` 5 (COCKPIT, HIBERNATORIUM, ENGINE_01/02/03), `BASIC_ROOMS_1` 11 (ARMORY RED, COMM YELLOW, INFIRMARY GREEN, LABORATORY GREEN, GENERATOR YELLOW, ESCAPE_POD_A/B WHITE, FIRE_CONTROL YELLOW, NEST RED, STORAGE RED, SURGERY GREEN), `ADDITIONAL_ROOMS_2` 9 (AIRLOCK_CONTROL YELLOW, CABINS WHITE, CANTEEN GREEN, COMMAND_CENTER YELLOW, ENGINE_CONTROL YELLOW, HATCH_CONTROL GREEN, OBSERVATION_ROOM RED, SLIME_ROOM WHITE, SHOWER WHITE). Поля: `id`, `name`, `color`, `hasComputer`, `actionCost [2]`, `description`. Цвета сверены с кодом (ранее в доках были ошибки: COMMAND_CENTER RED→YELLOW, HATCH_CONTROL WHITE→GREEN, OBSERVATION WHITE→RED).
* **Тесты:** `shipGraph.test.ts` 17 кейсов (связность графа, уникальность ID, snapshot коридоров), `roomDefinitions.test.ts` 11 кейсов (уникальность ID, категории, цвета, компьютеры).
* **Прованс:** `map_full.jpg` 7978×5456 (21 слот 001–021, коридоры с номерами, вентиляция, треки 15/8), `rooms.pdf` 11 стр. (гексы 1/2 + особые, жетоны), `data-sources.json#ship-graph-rooms/corridors`, `#room-definitions` — `UNVERIFIED_BOARD` для геометрии, `RULES_LOCAL` для категорий.
* *Результат:* граф готов для запросов `findAdjacentOpenRoomIds`, `findOpenCorridors`, `roomHasTechnicalEntrance`.

### Шаг 4. Запросы графа, маркеры и детерминированная подготовка партии (Setup, Markers & Queries) — ВЫПОЛНЕНО в 0.1.0–0.1.9

* **Константы подготовки:** `packages/shared/src/data/setup.ts` — `TIME_TRACK_LENGTH 15`, `SELF_DESTRUCT_TRACK_LENGTH 8` (жёлтая зона ≥6, череп 8), `ESCAPE_PODS_BY_PLAYER_COUNT` (1–2→2, 3–4→3, 5→4), `ESCAPE_POD_CAPACITY 2`, `HAND_SLOT_COUNT 2`, `QUEST_ITEM_COUNT 2`, `BASE_ADULT_COUNT 3`, `BAG_ADULTS_PER_PLAYER 1`, `COORDINATE_DESTINATIONS` 4 (EARTH/MARS/DEEP_SPACE_1/2 упрощение, полный маппинг A-D — этап 0.6), `HIVE_EGG_CAPACITY 8`.
* **Колоды стола:** `packages/shared/src/data/cardsSetup.ts` — `createInitialDecks()` (поток `cards`), `createActionDeckForCharacter()` (60 карт действий 6×10), `createShuffledPile()` (ровно n-1 чтений), `explorationTokens.ts` 20 жетонов (44 предмета: 8 Неисправность, 2 Пожар, 2 Тишина, 2 Слизь, 2 Опасность, 4 Двери), `intruderPool.ts` 27 жетонов (1 BLANK, 8 LARVA, 3 CREEPER, 12 ADULT, 2 BREEDER, 1 QUEEN), `ADULT_ESCAPE_NUMBERS` [2,3,4,4,1,2,3,1,2,3,4,1], `contaminationCards.ts` 27 (7 инфицированных), `seriousWounds.ts` 16 (4×4), `eventCards.ts` 20, `intruderAttacks.ts` 20, `weaknesses.ts` 8, `itemCards.ts` 90 (30/30/30), `crafting.ts` 12, `startingItems.ts` 6, `combatDie.ts` 6 граней (2 промаха), `noiseDie.ts` 10 граней.
* **Логика подготовки:** `packages/shared/src/logic/setup.ts` — `createInitialGameState(seed)` детерминированно: тасует тайлы (11 всегда +5 из 9) потоком `layout`, жетоны Исследования 20→16 (4 в коробку, стр. 6 шаг 4), мешок Чужих `splitIntruderBag()` по числу игроков (3+1×игроков взрослых), колоды стола потоком `cards`, персонажей `CHARACTERS` (6 пресетов), капсулы `createEscapePods()` (LOCKED, наименьший номер в Отсек А), двигатели `isWorking` (инверсная пара, верхний — истина, стр. 6 шаг 8), координаты случайный destination, треки 0, RNG счётчики.
* **Запросы графа:** `packages/shared/src/logic/shipGraphQueries.ts` — `requireOpenPath()`, `findOpenCorridors()`, `findAdjacentOpenRoomIds()`, `roomHasTechnicalEntrance()`, `corridorsLeadingInto()` — единый источник для движения игроков и Чужих.
* **Маркеры и лимиты:** `packages/shared/src/logic/markers.ts` — `placeFireMarker()` лимит 8→`SHIP_EXPLODED`, `placeMalfunctionMarker()` 8→`HULL_BREACH` (запрет в NEST/SLIME_ROOM), `placeDoorToken()` 12 с перестановкой (разрушенные не трогаются, стр. 17), `noiseMarkersInSupply()` 30, `requireNoiseMarkerSupply()`. Разрушенная дверь терминальна (OPEN→CLOSED→DESTROYED).
* **Тесты:** `setup.test.ts` 10 кейсов (детерминизм сида, капсулы по игрокам, мешок по игрокам, тайлы), `shipGraph.test.ts`, `markers.test.ts` 14 кейсов (лимиты, перестановка дверей, взрыв/разрыв).
* *Результат:* `createInitialGameState('test-seed')` всегда даёт одну и ту же партию, лимиты маркеров соблюдены.

### Шаг 5. Санитайзер, транспорт и сохранение сессии (Sanitizer, Transport & Persistence) — ВЫПОЛНЕНО в 0.1.9–0.1.10

* **Фильтр скрытой информации:** `packages/shared/src/logic/sanitizer.ts` — `filterStateForPlayer(state, viewingPlayerId): SanitizedGameState` — чужие руки/инвентарь → `null`/счётчики, неисследованные тайлы → `null`, чужие `pendingDecision` → `null`, порядок колод → только `drawPileCount`, сброс → лицом вверх, жетоны Чужих в мешке — только состав по типам, а не порядок. Ни один компонент не получает полный `GameState`.
* **Транспорт:** `packages/client/src/services/transport/ITransport.ts` — интерфейс `init()`, `sendAction(action)`, `subscribeToState(cb)`. `LocalInMemoryTransport.ts` — исполняет `GameEngine.processAction()` в браузере (Immer produce), хранит `GameState`, отдаёт наружу только `filterStateForPlayer`, сохраняет снапшот после каждого действия через `sessionStorage`. Будущий `SocketIoTransport` — план этапов 10–11.
* **Сохранение:** `packages/client/src/services/session/sessionStorage.ts` — `createLocalSessionStorage()` ключ `nemesis_active_game_session` (ранее `nemesis-session`), `createLocalSessionStorage` + `createSeed()` — `crypto.randomUUID` с fallback на `crypto.getRandomValues` (Э1-2, LAN http без secure context), `seed.ts`. Проверка `schemaVersion` — несовместимые сохранения не восстанавливаются, начинается новая партия.
* **Стор:** `packages/client/src/store/gameStore.ts` — `Zustand 4 + Immer 10 + persist`, `view: SanitizedGameState|null`, `selectedRoomId`, `rejection: EngineError|null`, `dispatch(action)` → транспорт, `selectRoom()`, `openTechnicalCorridors()`.
* **Каркас UI:** `App.tsx` — верхний HUD (раунд, фаза, активный игрок, трек времени, сид с копированием `SeedChip`, версия из `package.json` через Vite define), сборка слоёв карты и панелей; `main.tsx`.
* **Тесты:** `sanitizer.test.ts` (чужая рука скрыта, порядок колоды скрыт), `sessionStorage.test.ts` (сериализация/десериализация, версия схемы), `transport` (локальный транспорт, broadcast).
* *Результат:* партия сохраняется в `localStorage` и переживает перезагрузку вкладки, Zero Cheating соблюдён.

### Шаг 6. Интерактивная SVG-карта и инспектор отсеков (Board UI & Inspector) — ВЫПОЛНЕНО в 0.1.0–0.1.11

* **SVG-карта:** `packages/client/src/components/board/ShipMapSVG.tsx` — `viewBox` с полями под узел Технических Коридоров, фон (сетка, градиент корпуса), 21 гекс + 29 коридоров + поле вентиляции. `RoomHex.tsx` — шестиугольник с названием, категорией (SPECIAL/ROOM_1/ROOM_2), бейджами (огонь, поломка, слизь, предметы `itemsCount`, компьютер), фишками игроков, кликабельность ≥44×44px, `hiddenPlayerIds`, `isHighlighted` (янтарное кольцо для Фазы Событий). `CorridorEdge.tsx` — линия коридора + круглая точка двери (OPEN/CLOSED/DESTROYED) и шума (hasNoise), `isHighlighted` при анимации взлома.
* **Вентиляция:** `TechCorridorHub.tsx` — индустриальный шестиугольник-хаб (решётка, заклёпки, датчик давления, ротор, аварийная красно-жёлтая разметка), пульсация тревоги при `technicalCorridorNoise`, звуковые волны. `VentShaftTraces.tsx` — пунктирные неоновые трассы шахт от каждого красного маячка входа (8 входов) к узлу, обход корпуса, подсветка тревогой и «течение» при шуме. `techCorridorModel.ts` — геометрия трасс, `intruderMapModel.ts` — модель отображения Чужих, `intruderShapes.ts` — единый источник векторных силуэтов (зелёная Личинка, жёлтый Крипер, красная Взрослая, бордовый Трутень, фиолетовая Королева), `IntruderBadge.tsx`.
* **Zoom & Pan:** `react-zoom-pan-pinch 3.4.3` — `TransformWrapper`/`TransformComponent`, pinch-zoom двумя пальцами, drag, minScale 0.5, maxScale 3, double-click zoom, `panning` с `excluded` для кнопок.
* **Инспектор:** `inspector/RoomInspector.tsx` — боковая/нижняя панель: исследованность, название, категория, предметы, компьютер, огонь/поломка/слизь/декомпрессия, occupants (персонажи, Чужие с `woundsCount`, объекты `CORPSE/EGG/INTRUDER_REMAINS`). `RoomStatusGrid.tsx` — скрытое как «?» при санитайзере, `FloorObjectsPanel.tsx` — тяжёлые объекты на полу (заглушка кнопки «Поднять [1]» в этапе 1), `TechCorridorPanel.tsx` — состояние вентиляции, список входов (имя только для исследованных), доступы по книге правил (карта Механика «Технические коридоры», предмет «Планы техкоридоров» — розыгрыш в этапах 2+). `CarefulMovePanel.tsx` — заглушка.
* **Стили:** только Tailwind классы, единственный CSS — `src/index.css` (директивы Tailwind, токены шрифтов), без отдельных `.css` под компоненты.
* **Тесты:** `board/ShipMapSVG.test.tsx`, `RoomHex.test.tsx`, `CorridorEdge.test.tsx`, `techCorridorModel.test.ts` (покрытие входов, геометрия), `intruderMapModel.test.ts`, `RoomInspector.test.tsx` (отображение скрытого).
* *Результат:* карта открывается в браузере, зумится пальцем/мышью, клик по комнате — инспектор с названием/типом/коридорами, клик по вентиляции — панель техкоридоров.

### Шаг 7. Журнал-заглушка, dev-панель, CI и выпуск v0.1.0 (Log, Dev & Release) — ВЫПОЛНЕНО в 0.1.9–0.1.11

* **Журнал:** `packages/shared/src/types/log.ts` — `GameLogEntry {id: log-1, sequence монотонный, event: GameLogEvent}` (на этапе 1: `GAME_STARTED`, `PLAYER_MOVED`, `ROOM_DISCOVERED`, `EXPLORATION_TOKEN_REVEALED`, `NOISE_ROLLED`, `GAME_OVER`). `logic/gameLog.ts` — `appendGameLog()`, добавление в той же транзакции Immer, откат при отклонённом действии. `components/log/GameLogPanel.tsx` — нижняя чёрная панель, сворачивание «Скрыть/Показать» с `aria-expanded`/`aria-controls`, моноширинный номер, семантические tone-классы, `gameLogModel.ts` форматирует русские сообщения. Панель получает только `SanitizedGameState`.
* **Dev-панель:** `components/dev/DevPanel.tsx` + `devPanelModel.ts` — доступна только при `IS_DEV=true` (Vite define), диагностика (сид, режим, схема, `view`), старт с заданным сидом, переключатели `DEV_TOGGLE_DOOR`/`DEV_TOGGLE_NOISE` (разрушенную дверь не чинит, стр. 17). Вырезается из prod-бандла, CI проверяет отсутствие строк dev-панели в бандле.
* **CI:** `.github/workflows/ci.yml` — на push/PR: `npm ci`, `npm run verify` (typecheck + lint + format:check + test), `npm run build`, отдельный шаг `grep` dev-строк в `dist`.
* **Качество:** `AGENTS.md` чек-лист перед сдачей (verify зелёный, нет `any`/`Math.random()`/TODO, файлы ≤500 строк цель, ≤1000 рефакторинг, shared без React/DOM/Node, только `SanitizedGameState` наружу, Tailwind классы). `npm run verify` — обязателен.
* **Релиз:** версия в 3 `package.json` (корень, shared, client) — HUD берёт из сборки, `CHANGELOG.md` запись v0.1.0 (каркас, граф, карта), `README.md` — что работает (карта 21/29, подготовка детерминированная, санитайзер, сохранение, журнал-заглушка, dev-панель), ограничения (нет Контакта/Боя/Целей/Событий, геометрия UNVERIFIED_BOARD, парные коридоры — одна связь, бросок Шума на отсутствующий номер — Тишина).
* *Результат этапа (Playable Demo v0.1.0) — ДОСТИГНУТ:* в браузере открывается интерактивная карта «Немезиды» 21 отсек / 29 коридоров с узлом Технических Коридоров-заглушкой, можно зумить/панорамировать, кликать по комнатам и видеть инспектор (название, тип, коридоры, бейджи), партия детерминированно готовится по сиду, сохраняется в `localStorage`, журнал показывает `GAME_STARTED`, dev-панель доступна в dev-сборке, `verify` и prod-build зелёные, CI проходит.

---

## Этап 2 (v0.2.0) — Перемещение, Туман войны, Механика Шума и A*
> **Срок:** Неделя 2  
> **Фокус:** Фишка персонажа на поле, открытие тайлов, жетоны Исследования 20/44, кубик Шума d10, Осторожное движение [2], маркеры 30, каскад прерываний, граф-запросы.  
> **Статус на 18.09.2026 (версия 0.2.0):** перемещение, туман войны и Шум работают: `ACTION_MOVE` [1] и «Осторожное движение» [2] (маркер в выбранный Коридор вместо броска, выбор номера 1-4 и Технических Коридоров), вскрытие тайла и жетона Исследования со всеми эффектами (Пожар/Поломка/Слизь/Двери/Тишина/Опасность), кубик d10 (1,1,2,2,3,3,4,4,Тишина,Опасность) через поток `noise`, маркеры в Коридорах и на поле Технических Коридоров, Контакт отклоняется явной ошибкой до этапа 4. Ниже этап разделён на 6 последовательных шагов. **Не реализован собственный взвешенный A\***: доступные отсеки считаются прямым перебором Коридоров с открытой Дверью (`findAdjacentOpenRoomIds`), а полноценный A* с весами огонь/шум/бой — цель этапа 4/8 для ботов (GDD §5.2). Каждый шаг перечисляет файлы, контракты и тесты.

### Шаг 1. Контракт перемещения и базовое действие «Движение» [1] (Movement Contract) — ВЫПОЛНЕНО в 0.2.0

* **Типы действий:** `types/actions.ts` — `ACTION_MOVE {targetRoomId, discardCardIds}` стоимость [1], `ACTION_CAREFUL_MOVE {targetRoomId, chosenCorridor, discardCardIds}` стоимость [2] (стр.13). `types/rooms.ts` — `CarefulMoveChosenCorridor` discriminated union: `CORRIDOR {corridorId}`, `CORRIDOR_NUMBER {corridorNumber 1..4}`, `TECHNICAL_CORRIDOR`. `types/interrupts.ts` — `NoiseRollMode ROLL|CAREFUL`, `EXPLORE_ROOM_INTERRUPT {playerId, roomId, corridorId}`, `NOISE_ROLL_INTERRUPT {playerId, roomId, noise}`.
* **Валидация пути:** `logic/shipGraphQueries.ts` — `findOpenCorridors(state, from, to)` (doorState !== CLOSED), `requireOpenPath` бросает `UNKNOWN_ROOM`, `MOVE_TARGET_IS_CURRENT_ROOM`, `NO_OPEN_DOOR_BETWEEN_ROOMS` (стр.14). `findAdjacentOpenRoomIds` — прямой перебор открытых коридоров, без A*.
* **Статус Боя:** `logic/combatStatus.ts` — `isRoomInCombat(roomId)` по `occupantIntruderIds.length>0`, `isPlayerInCombat(playerId)` с проверкой жив/не в анабиозе/капсуле. В Бою движение = Побег (на этапе 2 отклоняется `ESCAPE_NOT_IMPLEMENTED`, с этапа 4 — атаки в спину).
* **Исполнение:** `logic/movement.ts` — `movePlayer(state, playerId, targetRoomId, corridorId, noise)` — снимает игрока из `oldRoom.occupantPlayerIds`, добавляет в `targetRoom.occupantPlayerIds`, `player.roomId = targetRoomId`, `appendGameLog PLAYER_MOVED {from, to, corridorId, mode NORMAL|CAREFUL}`, формирует очередь прерываний: если `!isExplored` → `EXPLORE_ROOM_INTERRUPT` + всегда `NOISE_ROLL_INTERRUPT`. `fsm.ts` `handleAction` — `executeCardPayment` [1]/[2] до перемещения, `queueActionCompletion` после.
* **Журнал:** `PLAYER_MOVED` — персонаж, исходный/целевой отсек, коридор ID, режим.
* **Тесты:** `movement.test.ts` (открытый коридор → перемещение, закрытая дверь → `NO_OPEN_DOOR_BETWEEN_ROOMS`, цель = текущий → ошибка), `combatStatus.test.ts`, `shipGraphQueries.test.ts`.
* *Результат:* фишка перемещается по открытым коридорам за карту действия, очередь прерываний запускается.

### Шаг 2. Туман войны — вскрытие тайлов комнат (Fog of War & Room Reveal) — ВЫПОЛНЕНО в 0.2.0

* **Состояние комнаты:** `types/rooms.ts` `RoomState` — `isExplored boolean`, `definitionId string|null`, `itemsCount number`, `explorationEffect ExplorationEffect|null`, `hasFire/hasMalfunction/hasSlime`. `SPECIAL_ROOMS` всегда `isExplored=true` (стр.5), неособые — рубашкой вверх.
* **Логика вскрытия:** `logic/roomExploration.ts` — `resolveExploreRoom(state, EXPLORE_ROOM_INTERRUPT)` — `room.isExplored=true`, `appendGameLog ROOM_DISCOVERED {playerId, roomId, roomName из roomDefinitions, category}`. Если `explorationEffect != null` → `EXPLORATION_TOKEN_REVEALED {itemsCount, effect}`. Эффект разыгрывается сразу (см. шаг 3), но исходный `explorationEffect` тайла не затирается — нужен следующему прерыванию шума (`SILENCE`/`DANGER`).
* **Определение имени:** `roomNameForLog` — берёт `name` из `SPECIAL_ROOMS|BASIC_ROOMS_1|ADDITIONAL_ROOMS_2` по `definitionId`, иначе `Отсек #id` — журнал не раскрывает скрытый тайл задним числом.
* **Санитайзер:** `sanitizer.ts` — неисследованные комнаты → `definitionId=null`, `isExplored=false`, скрывает `explorationEffect` и `itemsCount` как «?» в `RoomStatusGrid`.
* **Тесты:** `roomExploration.test.ts` 15 кейсов (вскрытие, лог ROOM_DISCOVERED, сохранение explorationEffect), `sanitizer.test.ts` (неисследованный отсек скрыт).
* *Результат:* вход в неисследованный слот переворачивает тайл, показывает имя/категорию в журнале, готовит жетон.

### Шаг 3. Жетоны Исследования — пул 20/44 и эффекты (Exploration Tokens) — ВЫПОЛНЕНО в 0.1.11→0.2.0

* **Данные:** `data/explorationTokens.ts` — `EXPLORATION_TOKENS` 20 жетонов, 44 предмета: 8×MALFUNCTION (4,3,2,2,2,2,1,1), 2×FIRE (2,1), 2×SILENCE (1,1), 2×SLIME (4,3), 2×DANGER (3,2), 4×DOORS (4,3,2,1). Прованс `data-sources.json#exploration-tokens` — `EXTERNAL_UNVERIFIED` для состава (числа на картоне), `RULES_LOCAL` для правила 20→16 (стр.3 компоненты, стр.6 шаг4). `setup.ts` — `explorationPool = shuffle(rng layout, EXPLORATION_TOKENS)`, раздача по 1 на 16 неособых слотов через `explorationTokenAt(pool,index)` с явной ошибкой при нехватке.
* **Исполнение эффектов:** `roomExploration.ts` switch `explorationEffect`:
  - `FIRE` → `placeFireMarker` (лимит 8→`SHIP_EXPLODED` через `endGame`), лог `EXPLORATION_EFFECT_RESOLVED outcome FIRE_PLACED|FIRE_ALREADY_PRESENT|SHIP_EXPLODED`.
  - `MALFUNCTION` → `placeMalfunctionMarker` (запрет NEST/SLIME_ROOM → `MALFUNCTION_FORBIDDEN`, лимит 8→`HULL_BREACH`), outcome `MALFUNCTION_PLACED|ALREADY_PRESENT|FORBIDDEN|HULL_BREACH`.
  - `SLIME` → `player.hasSlime=true` (макс 1, стр.17), outcome `SLIME_APPLIED|ALREADY_PRESENT`.
  - `DOORS` → `closeDoorOfEntry` → `placeDoorToken` (12 жетонов, при пустом — перестановка с поля, разрушенные не трогаются, стр.17), outcome `DOOR_CLOSED|ALREADY_CLOSED|DESTROYED|MOVED_FROM_BOARD`.
  - `SILENCE`/`DANGER`/null — откладываются до броска шума (стр.14-15), не исполняются здесь.
* **Маркеры:** `markers.ts` `FIRE_MARKER_SUPPLY 8`, `MALFUNCTION_MARKER_SUPPLY 8`, `DOOR_TOKEN_SUPPLY 12`, `MALFUNCTION_FORBIDDEN_ROOM_DEFINITIONS ['NEST','SLIME_ROOM']`, функции `countPlaced*`, `*InSupply`, `place*` с явными результатами.
* **Тесты:** `explorationTokens` golden, `roomExploration.test.ts` (огонь→взрыв, поломка→разрыв, двери→перестановка, слизь→hasSlime), `markers.test.ts`.
* *Результат:* каждый вход в новый отсек даёт предметы по числу жетона и один эффект по книге правил.

### Шаг 4. Кубик Шума и маркеры — d10 и лимит 30 (Noise Die & Markers) — ВЫПОЛНЕНО в 0.2.0

* **Кубик:** `data/noiseDie.ts` — `NoiseDieFace = {CORRIDOR number 1..4}|{SILENCE}|{DANGER}`, `NOISE_DIE_FACES` 10 граней: 1,1,2,2,3,3,4,4,SILENCE,DANGER. Прованс `data-sources.json#noise-die` — состав подтверждён владельцем по физическому кубику 17.09.2026 (`USER_CONFIRMED`), эффекты — `RULES_LOCAL` стр.15.
* **RNG:** `logic/noise.ts` — `rollNoiseDie(state)` — `drawFromStream(seed, 'noise', rngDraws.noise)` → `faceIndex = floor(value*10)`, `rngDraws.noise++`, `appendGameLog NOISE_ROLLED {playerId, roomId, result}`. Поток `noise` изолирован от `layout/bag/cards/combat`.
* **Маркеры:** `logic/noiseMarkers.ts` — `placeNoiseMarker(state, playerId, roomId, target, reason ROLL|CAREFUL|DANGER|BLANK|EVENT)` — если `target.hasNoise` → `CONTACT_INTERRUPT` в начало очереди (повторный шум = Контакт, стр.15), иначе `requireNoiseMarkerSupply` (30) → `hasNoise=true` + `NOISE_MARKER_PLACED {playerId, roomId, target CORRIDOR|TECHNICAL_CORRIDOR, reason}`. `placeCarefulNoiseMarker` — для `CORRIDOR_NUMBER` кладёт шум во все коридоры с этим номером без дублирования Контакта (стр.13). `clearRoomNoise` снимает шум вокруг комнаты, `fillRoomNoise` — для BLANK/DANGER заполняет все свободные коридоры + техкоридор, с проверкой запаса.
* **Лимиты:** `markers.ts` `NOISE_MARKER_SUPPLY 30`, `countPlacedNoiseMarkers` (коридоры + `technicalCorridorNoise`), `noiseMarkersInSupply`, `requireNoiseMarkerSupply` → `MARKER_SUPPLY_EXHAUSTED` с явной ошибкой (книга не описывает исчерпание, но движок не молчит).
* **Тесты:** `noise.test.ts` (бросок детерминирован, SILENCE/DANGER ветки), `noiseMarkers.test.ts` (размещение, повторный шум → CONTACT_INTERRUPT, лимит 30, careful number → все коридоры), `fsm.test.ts` (интеграция шума).
* *Результат:* каждый вход в пустую комнату бросает d10 и ставит маркер по номеру или вызывает DANGER/SILENCE.

### Шаг 5. Осторожное движение [2] и логика Тишины/Опасности/Компаньона (Careful Move & Danger/Silence) — ВЫПОЛНЕНО в 0.2.0

* **Осторожное движение:** `logic/movement.ts` `requireCarefulMoveAllowed(state, playerId, targetRoomId, chosen)` — проверка: не в Бою (`CAREFUL_MOVE_IN_COMBAT`), `TECHNICAL_CORRIDOR` требует `roomHasTechnicalEntrance`, `CORRIDOR_NUMBER` требует наличия коридоров с номером, `CORRIDOR` требует `corridorsLeadingInto`. Свободный коридор: `freeCorridor = some(!hasNoise)` или `freeTechnical = hasEntrance && !technicalCorridorNoise`, иначе `CAREFUL_MOVE_NO_FREE_CORRIDOR` (стр.13). Выбранное место уже с шумом → та же ошибка. `fsm.ts` — оплата [2] через `executeCardPayment` до проверки.
* **Тишина:** `logic/noise.ts` `resolveNoiseRoll` — если `explorationEffect SILENCE` или `result SILENCE`:
  - при `player.hasSlime` → трактуется как DANGER (стр.15,17),
  - иначе → `NOISE_SKIPPED reason EXPLORATION_SILENCE|NOISE_SILENCE`, без маркера, без Контакта.
* **Опасность:** `resolveNoiseRoll` + `handleDanger` — `explorationEffect DANGER` или `result DANGER`:
  - найти соседние комнаты через `corridorsLeadingInto` + `SHIP_ROOM_NODES techNumbers`,
  - если есть Чужие вне Боя (`boardTokens` не в комнате игрока, `isRoomInCombat` false) → притянуть всех таких в комнату игрока: проверка дверей — CLOSED → `DESTROYED` + лог `INTRUDERS_BLOCKED_BY_DOOR source DANGER`, иначе перемещение `roomId` + `occupantIntruderIds` + лог `INTRUDERS_MOVED` (стр.15,18). Контакт не разыгрывается при притяжении.
  - если Чужих рядом нет → `fillRoomNoise` с reason DANGER (шум во все пустые коридоры вокруг комнаты, включая техкоридор).
* **Компаньон:** если в целевой комнате есть живой игрок (`livingPlayersInRoom`) или Чужой (`occupantIntruderIds`) — бросок Шума не делается, лог `NOISE_SKIPPED reason COMPANION` (стр.15 «если в отсеке есть персонаж/чужой — конец движения, бросок не нужен»).
* **Несуществующий номер:** `findNoiseTarget` возвращает `UNMAPPED` если номера нет среди `corridorNumbersOf` и `techNumbers` — трактуется как Тишина `NOISE_SKIPPED UNMAPPED` (решение до физической сверки топологии, `UNVERIFIED_BOARD`).
* **Тесты:** `carefulMovement.test.ts` 5 кейсов (выбор коридора/номера/техкоридора, занятый → ошибка, все заняты → ошибка), `roomExploration.test.ts` (SILENCE→DANGER при слизи), `noise.test.ts` (COMPANION→пропуск, DANGER→притяжение/заполнение), `fsm.test.ts` интеграция.
* *Результат:* игрок может заплатить [2] и выбрать, куда положить шум, избежав броска; Тишина/Опасность/Компаньон работают по книге правил.

### Шаг 6. Граф-запросы, UI перемещения и выпуск v0.2.0 (Graph Queries, Board UI & Release) — ВЫПОЛНЕНО в 0.2.0

* **Запросы графа:** `shipGraphQueries.ts` — `findOpenCorridors` (doorState !== CLOSED), `findAdjacentOpenRoomIds` — прямой перебор открытых коридоров (без весов), `corridorsLeadingInto(roomId)` — все коридоры, ведущие в отсек, `roomHasTechnicalEntrance` по `SHIP_ROOM_NODES.techNumbers`, `corridorNumbersOf(corridor, roomId)` → `fromNumbers/toNumbers`, `findNoiseTarget(roomId, number)` → `TECHNICAL_CORRIDOR|CORRIDOR|UNMAPPED`. **A\* не реализован**: взвешенный A* с огнём +2, шумом +2, боем +10 (GDD §5.2) — цель этапа 8 для ботов, на этапе 2 достаточно `findAdjacentOpenRoomIds`. Задокументировано в статусе этапа как осознанное ограничение.
* **UI перемещения:** `board/ShipMapSVG.tsx` — подсветка доступных для хода отсеков (соседние с открытой дверью) через `findAdjacentOpenRoomIds(view)`, `RoomHex.tsx` — кликабельность ≥44px, бейджи шума/дверей. `inspector/RoomInspector.tsx` — кнопки «Движение [1]» (обычное) и «Осторожное движение [2]» с `CarefulMovePanel.tsx` + `carefulMoveModel.ts` — выбор номера коридора 1-4 или техкоридора, валидация свободных коридоров. `RoomStatusGrid.tsx` — «?» для скрытого. `GameLogPanel` — форматирует `PLAYER_MOVED`, `ROOM_DISCOVERED`, `EXPLORATION_TOKEN_REVEALED`, `EXPLORATION_EFFECT_RESOLVED`, `NOISE_ROLLED`, `NOISE_MARKER_PLACED`, `NOISE_SKIPPED` с tone-классами.
* **Санитайзер и честность:** `sanitizer.ts` скрывает неисследованные тайлы, `SanitizedGameState` наружу, `LocalInMemoryTransport` + `sessionStorage` сохранение после каждого действия, восстановление с проверкой схемы.
* **Тесты и релиз:** `movement.test.ts`, `roomExploration.test.ts`, `noise.test.ts`, `noiseMarkers.test.ts`, `carefulMovement.test.ts`, `shipGraph.test.ts`, `markers.test.ts`, `gameLog.test.ts` (последовательность событий перемещения), `GameLogPanel.test.ts`, `ShipMapSVG.test.tsx`, `RoomInspector.test.tsx`. `npm run verify` зелёный, `npm run build` зелёный, `CHANGELOG.md` запись v0.2.0, `README.md` — что работает (движение, туман, шум, осторожное, жетоны 20/44, лимиты 8/8/30/12), ограничения (нет Контакта/Боя, нет A*, парные коридоры — одна связь, UNMAPPED→Тишина).
* *Результат этапа (Playable Demo v0.2.0) — ДОСТИГНУТ:* фишка персонажа на поле 21/29, перемещение по открытым коридорам за [1]/[2], открытие тумана с жетонами 20/44 и эффектами Пожар/Поломка/Слизь/Двери/Тишина/Опасность, кубик Шума d10 детерминированный, маркеры 30 с лимитом, Осторожное движение с выбором коридора, логика Компаньона/Слизи/Опасности по книге правил, журнал действий, сохранение сессии, карта с зумом/паном. A* отложен до ботов.

---

## Этап 3 (v0.3.0) — Карты Действий, Микрораунды и Экономика комнат
> **Срок:** Неделя 3  
> **Фокус:** Карточный движок игрока, руки, оплата действий сбросом, цикл микроходов, Поиск и действия 11 базовых отсеков категории «1».  
> **Статус на 18.09.2026 (версия 0.3.0):** Фаза Игроков полностью работает: рука 5 карт (6 в Каютах), оплата [1]/[2] с запретом Заражения, три варианта микрохода (2 действия, 1+пас, немедленный пас), круговой порядок от `firstPlayerId`, блокировка спасовавших, урон от огня при завершении хода, Поиск с приватным выбором 1 из 2 через `pendingDecision`, 11 действий комнат с ценой [2], UI руки/инвентаря/модалок и журнал без утечек. Ниже этап разделён на **8 последовательных шагов**. Каждый шаг перечисляет файлы, контракты и тесты. Источник правил — `doc/rules.md` (стр. 6–9, 13–14, 22), состав колод 60/30/30/30/12/27/16 сверен с книгой правил и помечен `RULES_LOCAL` в `data-sources.json#deck-composition`, точные componentSymbols и тексты — по-прежнему `unverified` до сверки с картоном.

### Шаг 1. Контракт v0.3.0, границы Фазы Игроков и источники данных (Contracts & Scope) — ВЫПОЛНЕНО в 0.2.1

* **Границы Фазы Игроков:** `types/state.ts` — `phase PLAYER_PHASE|EVENT_PHASE|GAME_OVER`, `PlayerState {orderNumber, hasPassed, actionsPerformedThisRound, handSlots 2, actionDeck {hand, drawPile, discard}, contaminationDeck, lightWounds, seriousWounds, hasSlime, hasLarva}`, `meta.activePlayerId`, `firstPlayerId`, `currentRound`. Правила: порядок от первого игрока по часовой стрелке, 2 действия за микроход, варианты «действие+пас» и «немедленный пас», блокировка после паса до общего паса, сброс `hasPassed`/`actionsPerformedThisRound` в `startNewRound`, травма от огня при завершении хода в горящем отсеке (стр. 9, 25).
* **Карты Действия:** `types/cards.ts` — `ActionCard {id, name, description, playCost 0..3, classRestriction CAPTAIN|PILOT|MECHANIC|SOLDIER|SCOUT|SCIENTIST|null, effect {kind}, componentSymbols BLUE|YELLOW|RED}`. 6 классов ×10 карт =60, `BASIC_ROOMS_1` 11 комнат входят в v0.3.0, зависимости с v0.4–v0.6 изолированы: Чужие/бой/инфекции/События/Слабости — заглушки с явным отказом.
* **PendingDecision:** `types/decisions.ts` — `PendingDecision = {type: CHOOSE_WHITE_ROOM_DECK, playerId}|{CHOOSE_SEARCH_ITEM, playerId, cards [2]}|{DISCARD_HEAVY_ITEM_FOR_NEW, playerId, newItemId}|{CHOOSE_ROOM_ABILITY_PARAMS, ...}` — приватное промежуточное состояние, видимое только владельцу через санитайзер.
* **Действия:** `types/actions.ts` — `ACTION_MOVE/ACTION_CAREFUL_MOVE` уже есть (этап 2) + `ACTION_SEARCH {discardCardIds}`, `ACTION_ROOM_ABILITY {roomId, params, discardCardIds}`, `ACTION_PASS {discardCardIds}`, `ACTION_RESOLVE_DECISION {decisionId, choice}`. Стоимость: Движение [1], Осторожное [2], Поиск [1], Комната [2], Пас 0 с опциональным сбросом.
* **Документы:** `doc/v0.3.0-contract.md` (создан на шаге, затем удалён из репозитория; актуальный контракт — `packages/shared/src/types/`), `doc/sources/data-sources.json#deck-composition` — 60/90/12/27/16 состав, `AGENTS.md` — правило 1:1.
* *Тесты:* `types/rooms.test.ts` (категории), `sources.golden.test.ts` (схема контракта).
* *Результат:* границы v0.3.0 зафиксированы: 11 комнат «1» входят, всё что требует Чужих — граница с этапами 4–6.

### Шаг 2. Колоды Действий, Предметов, Заражения и Травм (Decks & Data) — ВЫПОЛНЕНО в 0.2.2

* **Личные колоды:** `data/cards.ts` — `ACTION_CARDS` 60 карт (Капитан 10, Пилот 10, Механик 10, Солдат 10, Разведчик 10, Учёный 10) с именами («Прицельный огонь», «Адреналин» и т.д.), `playCost`, `componentSymbols`, `isClassCard`. `createActionDeckForCharacter(class)` — `shuffle(cards stream, 10)` → `drawPile 5 + hand 5`.
* **Предметы:** `data/itemCards.ts` — `ITEM_CARDS` 90 карт: Красная 30 (военные: Пистолет, Дробовик, Огнемёт и т.д.), Жёлтая 30 (технические: Инструменты, Планы техкоридоров, Энергозаряд), Зелёная 30 (медицинские: Аптечка, Антидот-заготовка). Поля: `color RED|YELLOW|GREEN|BLUE`, `isWeapon`, `ammo`, `maxAmmo`, `isHeavy`, `isQuest`, `componentSymbols`, `craftingComponents`. `data/crafting.ts` — 12 карт создаваемых (4 рецепта ×3 копии: Антидот, Тазер, Огнемёт, Коктейль Молотова) синяя колода.
* **Стартовое оружие:** `data/startingItems.ts` — 6 карт: Капитан Пистолет, Пилот Пистолет, Механик Гаечный ключ, Солдат Штурмовая винтовка, Разведчик Энерговинтовка (энерго, `isEnergyWeapon`), Учёный Пистолет. Различие энерго/классика: `isEnergyWeapon` + `maxAmmo` + перезарядка в Оружейной.
* **Заражение/Травмы:** `data/contaminationCards.ts` 27 карт (7 `isInfected=true`), `data/seriousWounds.ts` 16 карт (4× Рука, Нога, Тело, Кровотечение). `data/cardsSetup.ts` — `createInitialDecks()` тасует все колоды стола потоком `cards` (ровно n-1 чтений на колоду), `rngDraws.cards` детерминирован.
* **Пакет источника:** `data-sources.json#deck-composition` `RULES_LOCAL` для количества карт (60/30/30/30/12/27/16/20) + `unverified` для componentSymbols/effect.kind/боезапаса, golden-тест `sources.golden.test.ts` сверяет количества и уникальность ID.
* *Тесты:* `cards.test.ts` 11 кейсов (уникальность, классовые ограничения, тасовка детерминирована), `crafting.test.ts` 7 кейсов (рецепты), `setup.test.ts` (персонаж начинает с 5+5 карт и оружием в руке).
* *Результат:* все колоды стола и личные колоды наполнены, партия воспроизводима по сиду, оружие в слотах рук.

### Шаг 3. Рука, добор и универсальная оплата действий (Hand & Payment) — ВЫПОЛНЕНО в 0.2.3

* **Добор:** `logic/cardsPayment.ts` — `getPlayerHandLimit(state, playerId)`: базовый 5, 6 если начало Фазы Игроков, персонаж в исправной Каюте (`CABINS` без огня/поломки/Чужих) и не в Бою (стр. 9). `drawCardsToLimit(player)`: пока `hand.length < limit` — `drawPile.pop()`, при пустой колоде — `shuffle(cards stream, discard)` → `drawPile`, `discard=[]`. `rngDraws.cards` инкрементируется.
* **Оплата:** `validatePayment(player, discardCardIds, requiredCost)`: проверка `length===cost`, все ID в `hand`, без дубликатов, не содержит карту за саму себя (при разыгрывании карты Действия), абсолютный запрет `isContamination` (`CONTAMINATION_CANNOT_BE_DISCARDED`), проверка `isActionCard`. `executeCardPayment`: атомарно `hand → discard`, в той же транзакции Immer, откат при ошибке.
* **Пас с Заражением:** `ACTION_PASS` — особый путь: `discardCardIds` может содержать Заражение, сбрасывается любое количество карт с руки (и Действия, и Заражения), `hasPassed=true`, лог `PLAYER_PASSED {discardedCount}`.
* **Интеграция:** `logic/fsm.ts` / `GameEngine` — `ACTION_MOVE` требует 1, `CAREFUL_MOVE` 2, `SEARCH` 1, `ROOM_ABILITY` 2 через `executeCardPayment` до исполнения эффекта; `consumePaymentCards` в сторе — выбор карт UI.
* **Инициализация:** `logic/setup.ts` — при `createInitialGameState` персонаж получает `hand 5 + drawPile 5` из своей 10-карточной колоды.
* *Тесты:* `cardsPayment.test.ts` 14 кейсов (добор до 5/6, перетасовка сброса, запрет Заражения, дубликаты, карта не с руки, атомарность), `cardPiles.test.ts` 6 кейсов (пустая колода → перетасовка), `setup.party.test.ts` (рука 5 при старте).
* *Результат:* рука, лимиты и оплата работают по книге правил, Заражение нельзя сбросить кроме паса.

### Шаг 4. Фаза Игроков и цикл микроходов (Turn Cycle & Player Phase) — ВЫПОЛНЕНО в 0.2.4

* **Цикл:** `logic/turnCycle.ts` — `getOrderedPlayers(state)`: живые не в анабиозе/капсуле, сорт по `orderNumber`. `findNextActivePlayer(state, fromId)`: круговой обход, пропуск `hasPassed=true` и мёртвых. `advanceTurn(state)`: `player.actionsPerformedThisRound++`, если 2 — `applyFireEndTurnEffect` + сброс счётчика + передача хода; если <2 — остаётся активным. `applyFireEndTurnEffect`: если `ship.rooms[player.roomId].hasFire` — `player.lightWounds++`, лог `FIRE_DAMAGE_TAKEN`. При общем пасе (`all hasPassed`) — `meta.phase=EVENT_PHASE`.
* **Старт раунда:** `startNewRound(state)`: `currentRound++`, `firstPlayerId` по часовой стрелке, сброс `hasPassed=false`, `actionsPerformedThisRound=0` у всех, `timeTrackPosition` двигался здесь до этапа 0.5.0 (с 0.5.0 — в Фазе Событий), добор до лимита через `drawCardsToLimit`.
* **Валидация фазы:** `GameEngine` — `NOT_IN_PLAYER_PHASE` если фаза не `PLAYER_PHASE`, `NOT_ACTIVE_PLAYER` если не активный, `PLAYER_ALREADY_PASSED` если уже спасовал.
* **Микроварианты:** 2 действия подряд → автопередача; 1 действие + пас → `ACTION_PASS` в том же микроходе; немедленный пас → 0 действий + `hasPassed`.
* **Журнал:** `types/log.ts` — `ROUND_STARTED {round, firstPlayerId}`, `PLAYER_TURN_STARTED {playerId}`, `FIRE_DAMAGE_TAKEN {playerId, roomId, woundsCount}`, `PLAYER_PASSED`. `gameLogModel.ts` форматирует.
* *Тесты:* `turnCycle.test.ts` 8 кейсов (порядок, круговой обход, блокировка спасовавших, огонь, общий пас → EVENT_PHASE, старт нового раунда с добором), `fsm.test.ts` интеграция.
* *Результат:* микрораунды, передача хода и огонь при завершении хода работают, фаза корректно переходит в События.

### Шаг 5. Поиск и экономика Предметов (Search & Item Economy) — ВЫПОЛНЕНО в 0.2.5

* **Типы решений:** `types/decisions.ts` — `PendingDecision` discriminated union: `CHOOSE_WHITE_ROOM_DECK {playerId, roomId}`, `CHOOSE_SEARCH_ITEM {playerId, roomId, deckColor, cards: [ItemCard, ItemCard]}`, `DISCARD_HEAVY_ITEM_FOR_NEW {playerId, roomId, newItemId, heavySlotIds}`.
* **Логика:** `logic/search.ts` — `validateSearchConditions(state, playerId)`: комната исследована, `itemsCount>0`, не Улей `NEST` и не Комната со Слизью `SLIME_ROOM` (стр. 13), не в Бою, не с огнём? (огонь не запрещает поиск, только действие комнаты). `getRoomDeckColor(roomDef)`: `RED|YELLOW|GREEN|WHITE` по `roomDef.color`. `drawSearchCards(state, deckColor)`: `drawPile.pop()` 2 карты из соответствующей колоды стола. `placeItemToPlayer`: если есть свободный `handSlots` (<2) — в руки, иначе — в инвентарь? Тяжёлые — только в руки, лёгкие — в инвентарь. При занятых руках тяжёлого — инициирует `DISCARD_HEAVY_ITEM_FOR_NEW`.
* **FSM:** `ACTION_SEARCH` — оплата [1], если белая комната — ставит `CHOOSE_WHITE_ROOM_DECK`, иначе `drawSearchCards` → `CHOOSE_SEARCH_ITEM` (приватное). `ACTION_RESOLVE_DECISION` — выбор 1 карты: выбранная → игроку, вторая → `drawPile.unshift()` (вниз колоды), `room.itemsCount--`, `actionsPerformedThisRound++`, лог `SEARCH_PERFORMED {playerId, roomId}` без названия предмета (скрытность). При замене — старый тяжёлый в сброс соответствующей колоды.
* **Санитайзер:** `logic/sanitizer.ts` — `pendingDecision` виден только `playerId`, остальным `null`; `itemsCount` виден всем, содержимое колоды — только `drawPileCount`.
* *Тесты:* `search.test.ts` 7 кейсов (валидация NEST/SLIME_ROOM/неисследованный/пустой/бой, белый выбор колоды, выбор 1 из 2, возврат второй вниз, уменьшение itemsCount, замена тяжёлого), `sanitizer.test.ts` (чужой не видит `CHOOSE_SEARCH_ITEM`), `gameLog.test.ts` (SEARCH_PERFORMED без утечки имени).
* *Результат:* Поиск полностью по книге правил: 2 карты → выбор 1, приватность, счётчик предметов, журнал без спойлера.

### Шаг 6. Действия 11 базовых отсеков категории «1» (Room Abilities) — ВЫПОЛНЕНО в 0.2.6

* **Модуль:** `logic/roomAbilities.ts` — `executeRoomAbility(state, playerId, roomId, params)` с общими проверками: комната исследована, `hasMalfunction=false` (стр. 24), не в Бою, персонаж в этой комнате, оплата [2] уже списана. Switch по `room.definitionId` из `BASIC_ROOMS_1`.
* **11 комнат (стр. 13–14, 16, 22–24):**
  - **ARMORY (Оружейная) RED:** зарядка энергооружия в руках — `ammo = min(maxAmmo, ammo+2)` для каждого `isEnergyWeapon`.
  - **COMM_ROOM (Радиорубка) YELLOW:** `ship.hasSignalSent=true` (цель, этап 6).
  - **INFIRMARY (Лазарет) GREEN:** 3 режима — `TREAT_SERIOUS` перевязка всех тяжёлых (флаг `isTreated`), `HEAL_SERIOUS` удаление 1 перевязанной, `HEAL_LIGHT` удаление всех лёгких ран.
  - **LABORATORY (Лаборатория) GREEN:** анализ тяжёлого объекта — вход: объект с пола **или** из рук (Труп/Яйцо/Останки), выход: объект сохраняется (с пола — остаётся? по книге сброс, но v0.3.0 — сброс и раскрытие Слабости), `weaknessSlots` `FACE_DOWN→REVEALED`. Повторное — `WEAKNESS_ALREADY_REVEALED`.
  - **GENERATOR (Генератор) YELLOW:** `START_SELF_DESTRUCT` — `selfDestructTrackPosition=0` если null, `STOP` — `null` если `<6`, запрет остановки в жёлтой зоне ≥6 (необратимо, стр. 11, 24), запрет при персонажах в анабиозе.
  - **FIRE_CONTROL (Пожарная безопасность) YELLOW:** тушение — `targetRoomId` → `hasFire=false`.
  - **NEST (Улей) RED:** взятие Яйца — `eggsOnBoard--`, в свободный слот руки, `HAND_SLOTS_FULL` если занято.
  - **STORAGE (Склад) RED:** бесплатный поиск — выбор колоды, 2 карты → выбор 1 без уменьшения `itemsCount` отсека (особое свойство).
  - **SURGERY (Операционная) GREEN:** сканирование Заражения — все `contaminationDeck` проверяются на `isInfected`, инфицированные удаляются из игры, чистые замешиваются в `actionDeck.drawPile` (поток `cards`), `lightWounds++`, `hasPassed=true` (микроход завершается пасом, стр. 16).
  - **ESCAPE_POD_A/B (Спасательные отсеки) WHITE:** посадка — если капсула разблокирована (`isLocked=false`) и есть место (`occupants<capacity`), `player.isInEscapePod=true`, `escapePodId`.
  - **CABINS (Каюты) WHITE:** нет активного действия [2] в v0.3.0, но даёт лимит руки 6 (реализовано в Шаге 3).
* **Интеграция:** `ACTION_ROOM_ABILITY` — `executeCardPayment` 2 карты → `executeRoomAbility` → `appendGameLog ROOM_ABILITY_USED {playerId, roomId, detail}`.
* *Тесты:* `roomAbilities.test.ts` 18 кейсов (все 11 комнат, лимиты ammo, необратимость генератора, NEST HAND_SLOTS_FULL, SURGERY удаление инфекций + рана + пас, FIRE_CONTROL тушение, STORAGE без уменьшения itemsCount, ESCAPE_POD locked/capacity, LABORATORY уже раскрыта).
* *Результат:* все 11 действий комнат категории «1» работают по книге правил с ценой [2] и проверками неисправности/боя.

### Шаг 7. UI Фазы Игроков, руки, инвентаря и приватных решений (Player Phase UI) — ВЫПОЛНЕНО в 0.2.7

* **Рука:** `components/hand/PlayerHandPanel.tsx` — нижняя панель с картами руки (название, стоимость `playCost`, описание, `componentSymbols` синие), мультиселект для оплаты (`selectedCardIds`, `convertedCardIds`), счётчик действий `0/2 1/2`, кнопка Паса `ACTION_PASS` с опциональным сбросом Заражения, счётчики `drawPileCount/discardCount`, индикация Заражения (`isInfected` скрыто до скана).
* **Инвентарь:** выдвижная панель — 2 слота рук (оружие с `ammo/maxAmmo`, тяжёлые объекты `CORPSE/EGG/INTRUDER_REMAINS`), карманные предметы с цветовой кодировкой `RED/YELLOW/GREEN/BLUE`, счётчики лёгких/тяжёлых травм, `hasSlime/hasLarva`.
* **Модалки:** `components/modals/DecisionModal.tsx` — `CHOOSE_WHITE_ROOM_DECK`: 3 кнопки Красная/Жёлтая/Зелёная с иконками; `CHOOSE_SEARCH_ITEM`: 2 карты лицом вверх, выбор 1, вторая вниз колоды; `DISCARD_HEAVY_ITEM_FOR_NEW`: список тяжёлых в руках для сброса.
* **Инспектор:** `RoomInspector.tsx` — кнопки «Обыскать отсек [цена: 1]» (проверка `itemsCount>0`, не NEST/SLIME_ROOM, не в Бою) и «Использовать консоль отсека [цена: 2]» (проверка `hasMalfunction`, Боя), `RoomStatusGrid` с «?» для скрытого, `FloorObjectsPanel` — тяжёлые на полу.
* **Компоновка:** `App.tsx` — верхний HUD (раунд, фаза, активный игрок, время, сид), карта `ShipMapSVG` с зумом/паном, инспектор справа/снизу, рука внизу, журнал `GameLogPanel` снизу, модалки поверх. Без перекрытия: `bottom-0 left-0 right-0 md:bottom-auto md:top-4` и т.д.
* **Честность:** только `SanitizedGameState` — чужая рука/инвентарь/`pendingDecision` = `null`/счётчики, `filterStateForPlayer` в транспорте.
* *Тесты:* `PlayerHandPanel.test.tsx` 3 кейса (рендер руки, мультиселект оплаты, модалки), `RoomInspector.escape.test.tsx` (кнопки поиска/консоли), `ShipMapSVG.test.tsx` (карта с рукой).
* *Результат:* игрок видит свою руку, инвентарь, может платить картами, искать и использовать консоли, приватные решения не утекают.

### Шаг 8. Интеграция, защита информации, тесты и выпуск v0.3.0 (Integration & Release) — ВЫПОЛНЕНО в 0.3.0

* **Интеграционные тесты:** `logic/release_v0_3_0.test.ts` — round-trip JSON сериализация/десериализация `GameState` (колоды, рука, сброс, `pendingDecision`), санитайзер privacy (чужой не видит `CHOOSE_SEARCH_ITEM` и вытянутых предметов), атомарность (откат при ошибке оплаты/поиска/комнаты).
* **Модульные тесты:** `cardsPayment.test.ts` (добор, лимит 6 в Каютах, запрет Заражения), `search.test.ts` (приватный выбор, возврат вниз, `itemsCount`), `roomAbilities.test.ts` (11 комнат, необратимость генератора, `HAND_SLOTS_FULL`), `turnCycle.test.ts` (микрораунды, огонь, общий пас), `sanitizer.test.ts` (чужая рука скрыта, порядок колоды скрыт), `gameLog.test.ts` (SEARCH_PERFORMED без имени предмета).
* **Сериализация:** `sessionStorage.ts` — сохранение `hand/drawPile/discard/pendingDecision` после каждого действия, восстановление с проверкой `GAME_STATE_SCHEMA_VERSION` (схема 4 на v0.3.0), несовместимые — новая партия.
* **Документация:** `README.md` — что работает (Фаза Игроков, рука, Поиск, 11 комнат, инвентарь, модалки), ограничения (нет Контакта/Боя/Событий/Целей, геометрия `UNVERIFIED_BOARD`), `CHANGELOG.md` 8 записей 0.2.1–0.3.0, `doc/project-map.md` — карта модулей.
* **Качество:** `npm run verify` (typecheck + lint + format:check + test) зелёный, `npm run build` зелёный, версия в 3 `package.json` (корень, shared, client) — HUD берёт из сборки.
* *Результат этапа (Playable Demo v0.3.0) — ДОСТИГНУТ:* полноценная Фаза Игроков: внизу рука карт, игрок тратит карты на перемещение [1]/[2], обыск [1] с выбором 1 из 2 и инвентарём, активацию 11 консолей [2], передаёт ход или пасует. Сохранение, журнал и защита информации работают.

**Результат этапа (Playable Demo v0.3.0):**  
Полноценная Фаза Игроков: внизу экрана отображается рука карт. Игрок тратит карты с руки на перемещение, обыск комнат и активацию консолей корабля, передает ход или пасует. Рука 5 (6 в Каютах), оплата с запретом Заражения, Поиск с приватным выбором, 11 действий комнат, инвентарь 2 слота, травмы, журнал без утечек.

---

## Этап 4 (v0.4.0) — Пул Чужих, Контакты и Тактический Бой
> **Срок:** Неделя 4  
> **Фокус:** Появление пришельцев, система стрельбы, рукопашной, ранений монстров и побега из боя.
---

### Шаг 1. Контракт данных Чужих, колода Атак Чужих и кубик Боя (Core Data) — ВЫПОЛНЕНО в 0.2.12

* Сохранена существующая модель `IntruderEntity`: уникальный `id`, тип (`LARVA`, `CREEPER`, `ADULT`, `BREEDER`, `QUEEN`), `roomId`, `woundsCount: number`. Дублирующее поле `wounds` не вводится.
* `IntruderAttackCard` описывает машинный `effect`, текст, стойкость, стрелку Отступления и типы атакующих. `decks.intruderAttacks` получает 20 карт при подготовке партии, с детерминированной тасовкой и независимыми экземплярами.
* `CombatDieFace`: Промах ×2, Хвост, три Силуэта, 1 Рана, 2 Раны. Отдельной грани «Лапа» нет (книга, стр. 18). `rollCombatDie` использует существующий поток `combat` и сохраняемый счётчик `meta.rngDraws.combat`.
* Golden-тесты в `packages/shared/src/data/sources.golden.test.ts` сверяют все поля 20 карт и точную последовательность/кратность граней с пакетом источника. Данные физических компонентов из `doc/data/INTRUDERS.md` помечены `EXTERNAL_UNVERIFIED`, а не выданы за независимо сверенные.
* Проверены изоляция партий, непрерывность RNG после сохранения, скрытый порядок добора и публичный сброс. Схема состояния — 5; старые сохранения несовместимы.
* *Визуальная часть:* изменений UI нет. Контакт, применение эффектов Атак и боевые действия относятся к следующим шагам, не объявлены готовыми.

Контракт и границы реализации зафиксированы в описании этого шага и в `CHANGELOG.md` (отдельный документ `v0.4.0-step-1.md` удалён из репозитория).

### Шаг 2. Разрешение Контакта и Внезапная атака (Contact & Surprise Attack) — ВЫПОЛНЕНО в 0.2.13

* Триггер Контакта — в движке: повторный маркер Шума в Коридоре или на поле Технических Коридоров ставит `CONTACT_INTERRUPT` в начало очереди, до завершения действия (стр. 15).
* При Контакте снимается Шум со всех Коридоров, ведущих в отсек (двери не важны), и с Технических Коридоров при наличии Входа (стр. 18, шаг 1).
* Жетон выбирается одним чтением сохраняемого потока `bag` из всего текущего мешка; BLANK возвращается и участвует в следующем извлечении (стр. 18; FAQ Rules 19). При BLANK: Шум во все свободные ведущие Коридоры, при последнем жетоне — существующий Взрослый из запаса; первое появление Чужого не засчитывается.
* Миниатюры и жетоны — раздельные запасы (6 Личинок, 3 Крипера, 8 Взрослых, 2 Трутня, 1 Королева): при исчерпании Взрослые вне Боя отступают, их жетоны возвращаются в мешок (стр. 2, 15). Если свободной миниатюры нет — явная ошибка без выдуманного исхода.
* Внезапная атака: строгое сравнение числа жетона с рукой **после оплаты** (стр. 18, шаг 4). Реализованы все 8 эффектов колоды Шага 1, немедленные Травмы и смерть, Трансформация до завершения действия, Зов с подавлением атак, инфицирование Личинкой без карты и без самопроизвольной гибели при повторной атаке (стр. 20–21; FAQ Rules 12). Сброс Атак перетасовывается сразу после разыгранной карты.
* Первый настоящий Контакт: `firstEncounterOccurred`, приватный выбор одной из двух Целей каждым владельцем с приостановкой очереди; при пустой колоде Целей событие фиксируется без генерации карт (стр. 12).
* Смерть: один Труп, сброс Тяжёлых Объектов, правила Предметов по режимам, разблокировка капсул первой смертью; передача хода по часовой стрелке; конец при отсутствии активных персонажей (стр. 12, 21).
* *Визуальная часть:* окна Контакта и Внезапной атаки: силуэт жетона с анимацией, число и рука, баннер атаки, открытая карта и итог; доступность (фокус, клавиатура, reduced motion). Окно только показывает результат движка и не меняет партию.
* Стрельба, рукопашная, Побег, Фаза Событий и иконки Чужих на карте — не в этом шаге; обычный выход из Боя отклоняется явной ошибкой до реализации Побега.

Контракт, источники и совместимость зафиксированы в описании этого шага и в `CHANGELOG.md` (отдельный документ `v0.4.0-step-2.md` удалён из репозитория).

### Шаг 3. Спавн и отображение Чужих на интерактивной карте (Intruder Placement & Board UI) — ВЫПОЛНЕНО в 0.2.14

* Жетон Личинки при Контакте не ставит миниатюру: персонаж немедленно заражён — карта Заражения в личный сброс, Личинка на планшет (`hasLarva`); повторная Личинка исчезает без гибели (стр. 18, 20; FAQ Rules 12). Заражение — не Первый Контакт (миниатюры нет, стр. 12), Внезапная атака не проверяется. Жетон возвращается в запас (FAQ Rules 19); фактом партии остаётся `hasLarva`.
* Привязка монстров к отсекам `RoomState.occupantIntruderIds` — с Шага 2; на этом шаге покрыта тестами санитайзера: состав отсеков и раны (`woundsCount`) публичны, Стойкость в состоянии отсутствует до карты Атаки.
* Статус Боя (стр. 18) — единый предикат `combatStatus.ts` для движка и клиента: в Бою заблокированы обычный Поиск, Осторожное движение и Действия Комнат (коды `SEARCH_IN_COMBAT`, `CAREFUL_MOVE_IN_COMBAT`, `ROOM_ABILITY_NOT_ALLOWED`), движение из отсека — Побег (`ESCAPE_NOT_IMPLEMENTED` до Шага 7).
* Карта: цветные SVG-силуэты типов (зелёный/жёлтый/красный/бордовый/фиолетовый), счётчики миниатюр и суммарных ран в узле отсека; строка центрируется и сжимается при переполнении. Инспектор: блок «Чужие в отсеке» со шкалой ран и честной пометкой о неизвестной Стойкости; баннер «В БОЮ» с блокировкой запрещённых действий. Окно Контакта и журнал показывают заражение без сравнения чисел.
* Схема состояния — 7 (аддитивное поле `infestation` в событии Контакта); сохранения схемы 6 не восстанавливаются.
* Не в этом шаге: Стрельба и Рукопашная (Шаги 4–5), Останки и Слабости (Шаг 6), Побег (Шаг 7), Фаза Событий и Развитие Улья (обработка мешка на 8-м шаге этапа).


* Привязка монстров к отсекам в `RoomState.occupantIntruderIds`.
* Обработка Личинки: Личинка не ставится миниатюрой в отсек, а немедленно заражает персонажа (добавляется карта Заражения, Личинка крепится на планшет персонажа).
* Правило статуса Боя (In Combat, стр. 18): персонаж в отсеке с Чужим считается находящимся в Бою. В Бою заблокированы обычный Поиск, Осторожное движение и действия комнат.
* Фильтрация `sanitizer.ts`: список монстров в отсеке и их раны передаются в клиентское состояние `SanitizedGameState`.
* *Визуальная часть:*
  * Векторные SVG-иконки монстров на карте корабля поверх гекса комнаты (цветовая кодировка по типам: зеленая Личинка, желтый Крипер, красная Взрослая особь, бордовый Трутень, фиолетовая Королева).
  * Индикаторы количества пришельцев и полученных ими ран в узле отсека на карте.
  * Блок «Чужие в отсеке» в `RoomInspector` со шкалой здоровья/ран каждого монстра.

### Шаг 4. Базовое действие «Стрельба» (Combat: Shoot Action) — ВЫПОЛНЕНО в 0.2.15

* Действие `ACTION_SHOOT` (стр. 19): Оружие только из слотов Рук с Боезапасом ≥ 1 (`WEAPON_NOT_AVAILABLE`, `WEAPON_NO_AMMO`), цель — Чужой своего отсека; цена — 1 карта Действия и 1 ед. Боезапаса, тратятся даже при промахе.
* Кубик Боя через сохраняемый поток `combat`: матрица граней×типов (Хвост — Личинка/Крипер, Силуэты — до Взрослой, «1/2 Раны» — все; промах не читает колоду Атак).
* Проверка Результата Атаки (стр. 20): Личинка — 1 Рана без карты; Крипер/Взрослая — 1 карта; Трутень/Королева — 2 с суммой; раны копятся на миниатюре (`woundsCount`); карты проверки — в публичный сброс с мгновенной перетасовкой пустой колоды. Смерть Королевы не создаёт Яйцо (граница этапа).
* Отступление по стрелке — только картой События (вердикт ревью 0.4.0): выживший со стрелкой отклоняет выстрел целиком (`EMPTY_EVENT_DECK`, полный откат Immer — снапшот-тест), подмены направления нет.
* Публичное событие `SHOOT_RESOLVED` и окно результата (кубик с анимацией, карты Стойкости лицом вверх, исход); панель выстрела с выбором Оружия и цели; кнопки «Стрелять» в панели руки и инспекторе — только в Бою. Схема состояния — 8.
* Не в этом шаге: Рукопашная (Шаг 5), Останки и Слабости (Шаг 6), Побег (Шаг 7), особые свойства Оружия (классовые карты, Шаг 8), Фаза Событий (этап 0.5.0).

Контракт и границы реализации зафиксированы в описании этого шага и в `CHANGELOG.md` (отдельный документ `v0.4.0-step-4.md` удалён из репозитория).

* Реализовать действие `ACTION_SHOOT` [1]:
  * Проверка нахождения персонажа в одной комнате с выбранной целью.
  * Проверка наличия патронов в оружии (или сброс боеприпаса/заряда).
  * Расход 1 карты Действия на оплату базового действия стрельбы (если стреляют не через особую карту Действия).
* Бросок кубика Боя через поток RNG `combat`:
  * Сопоставление выпавшей грани с типом цели (Хвост ранит только Личинку/Крипера; Силуэты ранят определенных монстров; 1 и 2 Раны наносят прямой урон).
* Проверка стойкости Чужого (стр. 19):
  * При нанесении хотя бы 1 раны берется верхняя карта колоды Атак Чужих.
  * Нанесенные суммарные раны монстра сравниваются со значением стойкости на карте атаки.
  * Если раны $\ge$ стойкости — монстр погибает. Если на карте нарисован символ отступления — монстр отступает в соседний отсек/вентиляцию.
* *Визуальная часть:*
  * Кнопка «Стрелять» в панели действий и в `RoomInspector` при нахождении в бою.
  * Интерактивная модальная панель выстрела: выбор оружия в руках, выбор цели, анимация броска 3D/2D кубика боя, показ нанесенного урона и вытянутой карты стойкости.

### Шаг 5. Базовое действие «Рукопашная атака» (Combat: Melee Action) — ВЫПОЛНЕНО в 0.2.16

* Действие `ACTION_MELEE` (стр. 19): Персонаж в Бою атакует 1 Чужого своего отсека без Оружия; цена — 1 карта Действия.
* Карта Заражения — **до броска**, в личный сброс (шаг 1 процедуры; заражение неизбежно, `CONTAMINATION_RECEIVED` в журнале).
* Кубик Боя: соответствие грани типу цели — как в Стрельбе, но «2 Раны» считается 1 Раной (стр. 19: «да, лишь 1!»).
* Промах (включая грань не по типу цели): атакованный Чужой немедленно наносит 1 Тяжёлую Травму; третья Тяжёлая Травма убивает Персонажа (стр. 21, ревью 0.4.0) — Труп и Объекты по общим правилам.
* Проверка Стойкости — общая процедура со Стрельбой (`checkInjuryResult`): Личинка без карты, 1/2 карты, публичный сброс, `EMPTY_EVENT_DECK` с полным откатом при стрелке Отступления у выжившего.
* Публичное событие `MELEE_RESOLVED`: окно результата с Заражением, Травмой и гибелью Персонажа; панель атаки с выбором цели; кнопки «Рукопашная» рядом со «Стрелять». Схема состояния — 9.
* Не в этом шаге: Останки и Слабости (Шаг 6), Побег (Шаг 7), классовые боевые карты (Шаг 8), Фаза Событий (этап 0.5.0).

Контракт и границы реализации зафиксированы в описании этого шага и в `CHANGELOG.md` (отдельный документ `v0.4.0-step-5.md` удалён из репозитория).

* Реализовать действие `ACTION_MELEE` [1] (стр. 13, 19):
  * Отчаянная атака монстра прикладом или подручными средствами без расхода патронов.
  * Оплата 1 картой действия с руки.
  * Персонаж гарантированно берет 1 карту Заражения в сброс (риск заразиться паразитами при контакте плоть к плоти).
  * Бросок кубика Боя.
  * При результате «Промах» (`MISS`) персонаж немедленно получает 1 Тяжелую Травму из колоды Травм.
  * При попадании наносятся раны и проверяется стойкость монстра.
* *Визуальная часть:*
  * Кнопка «Рукопашная атака» с предупреждающими бейджами: «+1 Заражение» и «Риск Тяжелой Травмы при промахе».
  * Анимация получения травмы/заражения при неудачной рукопашной схватке.

### Шаг 6. Смерть Чужих, Останки и Слабости (Monster Death & Carcass) — ВЫПОЛНЕНО в 0.2.17

* Смерть Чужого (стр. 20): миниатюра снимается, жетон Останков (`INTRUDER_REMAINS` с типом) кладётся в отсек — любой Чужой, кроме Личинки (стр. 22; ревью 0.4.0). **Пункт исходного плана «Яйцо при гибели Королевы» не реализован: такого правила в книге нет** (Яйца появляются на Планшете в Фазу Событий и берутся в Улье, стр. 10; ревью помечает «яйцо Королевы» ошибкой).
* Подбор объектов — базовое действие [1] «Поднять Тяжёлый объект» (`ACTION_PICK_UP_OBJECT`, стр. 13, 22): Труп/Яйцо/Останки из отсека в свободный слот Руки за 1 карту; `HAND_SLOTS_FULL` при занятых руках.
* 8 карт Слабостей (`WEAKNESS_CARDS`): 7 из транскрипта + «Вид на грани вымирания» из `doc/data/WEAKNESSES.md` (ревью: неполнота транскрипта не оправдывает потерю карты). Подготовка: 3 случайные — в слоты Планшета (Труп/Яйцо/Останки) рубашкой вниз, остальные — в коробку.
* Лаборатория [2] по книге (стр. 16): изучает объект с пола **или** из рук, объект сохраняется; опциональный сброс с руки без действия; повторное изучение — `WEAKNESS_ALREADY_REVEALED`.
* Эффекты боевых Слабостей применяются движком: Энергооружие +1 Рана, Стойкость −1 («Вид на грани вымирания»), порог Внезапной атаки −1 («Реакция на опасность»), Укус Взрослой — Лёгкая Травма («Повадки атаки»); огонь/фосфаты/Двери — в будущих механиках.
* UI: «Поднять [1]» у объектов, «Изучить: …» в Лаборатории (тип объекта обязателен — фикс D9), блок «Слабости Чужих (Планшет)», событие `INTRUDER_KILLED` в журнале, упоминание Останков в окнах боя. Схема состояния — 10.
* Не в этом шаге: Побег (Шаг 7), классовые карты (Шаг 8), эффекты огня/фосфатов/Дверей, изучение Трупа ради цели (этап целей).

Контракт и границы реализации зафиксированы в описании этого шага и в `CHANGELOG.md` (отдельный документ `v0.4.0-step-6.md` удалён из репозитория).

* При гибели Чужого:
  * Миниатюра монстра удаляется из отсека (`occupantIntruderIds`).
  * На пол отсека выкладывается тяжелый объект «Останки Чужого» (`kind: 'INTRUDER_REMAINS'`).
  * При гибели Королевы на пол дополнительно выкладывается жетон Яйца (`kind: 'EGG'`).
  * Персонажи могут подбирать Останки в свободный слот руки (`handSlots`) и переносить их по кораблю.
* Лаборатория (`LABORATORY`): сброс Останков из рук в Лаборатории активирует анализ Слабости Чужих и переворачивает соответствующую карту Слабости лицом вверх.
* *Визуальная часть:*
  * Анимация гибели монстра и появление на полу комнаты фишки Останков с возможностью подбора в инспекторе отсека.
  * Запись триумфа в публичном журнале партии (`INTRUDER_KILLED`).

### Шаг 7. Побег из боя и внеочередные атаки (Escape from Combat) — ВЫПОЛНЕНО в 0.2.18

* Побег — это обычное `ACTION_MOVE` из отсека с Чужими (стр. 19): оплата [1] до атак; затем каждый Чужой отсека проводит отдельную Атаку по убегающему — от крупного к мелкому (FAQ Rules 5: Королева → Трутень → Взрослая → Личинка; Крипер — между Трутнем и Взрослой, в FAQ не упомянут).
* Выживший завершает Движение: вскрытие и бросок Шума — штатными прерываниями `movePlayer`; погибший остаётся Трупом в исходном отсеке (`killPlayer` кладёт его до перемещения). Прерывание `ESCAPE_ATTACK_INTERRUPT` объявлено контрактом Шага 3 — реализовано без изменения формы.
* Завершение действия ставится после Шума: счёт действий и смена хода не обгоняют розыгрыш входа в отсек.
* Эффекты атак — общее ядро `performIntruderAttack` (подавление Зовом действует и на Побег; Личинка инфицирует вместо карты Атаки); `ESCAPE_ATTACK_RESOLVED` в журнале, окно боя «Побег — атака в спину», красная кнопка «Побег [цена: 1]» и диалог подтверждения со списком атакующих. Схема состояния — 11.
* Не в этом шаге: альтернативные Побеги картами Действий («Заградительный Огонь», «Огонь на Подавление» — Шаг 8), Фаза Событий (этап 0.5.0), Спасательные Капсулы вне рамок боя.

Контракт и границы реализации зафиксированы в описании этого шага и в `CHANGELOG.md` (отдельный документ `v0.4.0-step-7.md` удалён из репозитория).

* Реализовать механику Побега из боя (стр. 13, 19):
  * Если персонаж совершает обычное перемещение (`ACTION_MOVE`) из отсека, где находятся Чужие, это действие считается Побегом.
  * Перед выходом из комнаты инициируется прерывание внеочередной атаки (`INTRUDER_ATTACK_INTERRUPT`): каждый оставшийся в отсеке Чужой по очереди атакует убегающего персонажа.
  * Вытягиваются карты из колоды Атак Чужих: персонаж получает раны/травмы согласно типу атакующего монстра.
  * Если персонаж выжил — он переходит в целевой отсек и совершает стандартный бросок Шума.
* *Визуальная часть:*
  * Диалог подтверждения при попытке сделать шаг из комнаты с врагами: «В отсеке находятся Чужие! Попытка побега спровоцирует внеочередную атаку монстров в спину. Бежать?».
  * Наглядное отображение полученного урона во время отступления.

### Шаг 8. Сквозная интеграция, защита информации, тесты и выпуск v0.4.0 — ВЫПОЛНЕНО в 0.4.0

* Классовые боевые карты (стр. 19, 24–28) — атомарные действия «карта + бой»: «Прицельный огонь» (переброс кубика решением по выпавшей грани), «Стрельба очередью» (весь Боезапас, +1 Рана/2 ед. — FAQ Actions 8; бонус винтовки суммируется), «Заградительный огонь»/«Огонь на подавление» (отход без Атак Чужих: Солдат — себя и/или другого, Капитан — себя ИЛИ другого), «Адреналин» (Стрельба или Побег + добор карты). Бонус Боевой винтовки (≥1 Раны от выстрела → ещё 1) применён во всех режимах стрельбы.
* Защита информации подтверждена тестами: порядок колоды Атак закрыт числом, сброс лицом вверх — свершившиеся факты; мешок/запас — только состав по типам; интеграционный `combat.test.ts` проходит полный боевой цикл через FSM (вход → выстрелы → гибель → Останки → подбор → отход без атак).
* UI: режимы выстрела в ShootModal, диалог переброса, панель «Отход без атак», «Бежать с Адреналином»; журнал — `ACTION_CARD_DRAWN`. Схема состояния — 12 (`SHOOT_RESOLVED` получил `rerolled`/`burstAmmoSpent`/`rifleBonusApplied`).
* Не в релизе: Фаза Событий (этап 0.5.0), небоевые классовые карты, Отступление по карте События.

Контракт и границы реализации зафиксированы в описании этого шага и в `CHANGELOG.md` (отдельный документ `v0.4.0-step-8.md` удалён из репозитория).

* Подключить классовые боевые карты действий (Солдат: «Стрельба очередью», «Прицельный огонь», «Заградительный огонь»; Скаут: «Адреналин»; Капитан: «Огонь на подавление»).
* Защита информации (Sanitizer): колода карт Атак Чужих и состав мешка цензурируются; в логе партии фиксируются только свершившиеся факты боя.
* Комплексные интеграционные тесты (`combat.test.ts`, `contact.test.ts`):
  * Тест срабатывания контакта при повторном шуме и очистки соседних коридоров.
  * Тест проверки внезапной атаки по числу карт на руке.
  * Тесты расхода патронов при стрельбе и гарантированного заражения в рукопашной.
  * Тесты проверки порога стойкости и спавна останков при гибели Чужого.
  * Тест механики побега из боя со внеочередными атаками.
* Запуск `npm run verify`, обновление `CHANGELOG.md` и фиксация версии `0.4.0`.

**Результат этапа (Playable Demo v0.4.0) — ДОСТИГНУТ в 0.4.0:**  
Полноценный хоррор и тактический бой на борту «Немезиды»: исследование неизбежно привлекает монстров, по коридорам разносятся крики, расходуются патроны, персонажи получают ранения или отчаянно бегут от превосходящих сил врага.

---

## Этап 5 (v0.5.0) — Фаза Событий, Жизненный цикл Чужих, Технические туннели и Деградация корабля
> **Срок:** Неделя 5  
> **Фокус:** Полноценная вторая половина раунда (Шаги 4–9 по книге правил), автономное поведение пришельцев, локация «Технические коридоры» на карте, распространение катастроф, отображение монстров и плавная кинематографичная анимация перемещений без мгновенных скачков.

> **Статус планирования на 22.09.2026:** релиз версии зафиксирован как **0.4.0** (полный боевой контур, схема состояния — 12). Ниже этап v0.5.0 разделён на 9 детальных шагов. На текущий момент при всеобщем пасе Фаза Событий пропускается фиктивным событием `EVENT_PHASE_SKIPPED`, поле Технических коридоров (стр. 9, 16) присутствует только логическим флагом `technicalCorridorNoise` без отдельного узла локации на карте, а перемещения персонажей и монстров происходят мгновенными скачками между координатами. Этап 0.5.0 устраняет эти разрывы и выводит визуальную и игровую симуляцию корабля на новый уровень.
>
> **Статус на 22.09.2026 (Шаг 1, версия 0.4.1):** колода Событий наполнена — 20 карт с машинными эффектами, направлениями и флагами тасуются при подготовке через поток `cards` (схема состояния — 13). Карты ещё не разыгрываются: Фаза Событий остаётся заглушкой `EVENT_PHASE_SKIPPED`, а Отступление по карте События по-прежнему отклоняется до Шага 2. Состав колоды ждёт физической сверки (см. `unverified` таблицы `event-cards`).
>
> **Статус на 22.09.2026 (Шаг 2, версия 0.4.2):** Отступление Чужих в бою разыгрывается по колоде Событий (стр. 20): верхняя карта задаёт направление, уходит в сброс без розыгрыша эффекта; Закрытая Дверь направления разрушается (FAQ Rules 8), номер вентиляции снимает миниатюру и сбрасывает Раны (стр. 16). Отказ `EMPTY_EVENT_DECK` удалён, схема состояния — 14. Трактовка Отступления по карте «Подготовка» (направление «Любое»): Чужой остаётся на месте — помечено в `unverified` таблицы `event-cards` до официального разъяснения. Фаза Событий по-прежнему пропускается заглушкой.
>
> **Статус на 22.09.2026 (Шаг 3, версия 0.4.3):** Поле Технических Коридоров (стр. 9, 16) показано на карте отдельным узлом-хабом под корпусом корабля: индустриальный шестиугольник с решёткой, датчиком давления и аварийной разметкой, к которому от каждого красного маячка входа проложены пунктирные трассы шахт. Шум в вентиляции (`ship.technicalCorridorNoise`) пульсирует тревогой на узле, звуковыми волнами и дублируется на всех отсеках с входами; Чужие, ушедшие в вентиляцию при Отступлении, на пару секунд видны силуэтами во тьме узла. Клик по узлу открывает панель локации: состояние вентиляции, список входов и доступы по книге правил (Механик, «Планы технических коридоров» — розыгрыш перемещений в следующих шагах). Схема состояния не менялась.
>
> **Статус на 22.09.2026 (Шаг 4, версия 0.4.4):** Фаза Событий получила оркестратор (`logic/eventsPhase.ts`): заглушка `EVENT_PHASE_SKIPPED` удалена, при всеобщем пасе движок последовательно исполняет шаги книги правил (стр. 10). Реализованы Шаг 4 и Шаг 6 правил. Счётчик Времени двигается в Фазе Событий (а не при старте раунда): последнее красное поле немедленно завершает партию гиперпрыжком (`HYPERSPACE_JUMP`, вне Анабиоза все гибнут от перегрузок, стр. 11). Активный маркер Самоуничтожения двигается вместе со Временем: с жёлтой зоны (≥6) все Капсулы автоматически разблокируются и процесс необратим, последнее деление с черепом взрывает корабль (`SHIP_EXPLODED`, гибнут все на борту, включая Анабиоз; стр. 11, 24). Урон от огня: каждый Чужой в горящем отсеке получает 1 Рану с полной проверкой Результата Атаки — гибель с Останками, гибель Личинки без Останков или Отступление по карте События; одно свободное Яйцо на полу отсека сгорает (стр. 25, Улей). Журнал пополнился событиями `TIME_TRACK_ADVANCED`, `EVENT_PHASE_STEP_SKIPPED` (честные пропуски ещё не реализованных Шагов 5/7/8), `FIRE_DAMAGE_TAKEN_BY_INTRUDER` и `EGG_DESTROYED_BY_FIRE`; разблокировка Капсул помечает причину. Схема состояния — **15**. Яйца на Планшете Улец огнём пока не уничтожаются (только Яйца на полу отсеков) — границы шага.
>
> **Статус на 22.09.2026 (Шаг 5, версия 0.4.5):** Фаза Событий исполняет Шаг 5 книги правил — Атаки Чужих (стр. 10, 20). Каждый Чужой, находящийся в Бою с Персонажами, атакует: цель выбирается заново перед каждой атакой — Персонаж с наименьшим числом карт на руке (карты Заражения считаются), при равенстве — владелец жетона Первого Игрока или ближайший по часовой стрелке. Разрешение идёт через общее ядро `performIntruderAttack`: Личинка инфицирует без карты Атаки, остальные тянут карту Атак Чужих — символы решают попадание, восемь эффектов исполняются с учётом раскрытых Слабостей («Повадки атаки») и смертью при третьей Тяжёлой Травме. Каждая атака — публичное событие `EVENT_PHASE_ATTACK_RESOLVED`; клиент показывает сводку атак баннером Фазы Событий (при загрузке страницы история не проигрывается). Полная гибель активных Персонажей в Фазе Событий немедленно завершает партию. Схема состояния — **16**. Честные пропуски остались у Шагов 7 (карта События) и 8 (Развитие Улья).
>
> **Статус на 22.09.2026 (Шаг 6, версия 0.4.6):** Фаза Событий исполняет Шаг 7а книги правил — Автономное Движение Чужих (стр. 10, 15). Верхняя карта Событий вытягивается лицом вверх (`EVENT_CARD_DRAWN`), её верхний блок задаёт двигающиеся типы и номер Коридора; Чужие в Бою остаются на месте. Для каждого подходящего Чужого вне Боя: открытый (или уже Разрушенный) Коридор — переход в соседний отсек (`INTRUDER_MOVED`), Закрытая Дверь — разрушается сообща всеми идущими в неё и Чужие остаются (стр. 17), номер входа вентиляции — миниатюра снимается, Раны сбрасываются, жетон в Пул (стр. 16), отсутствие выхода — Чужой на месте. Неисследованные отсеки не раскрываются; вход в отсек с Персонажем объявляет Бой без Контакта и Внезапной атаки (стр. 18). Карта уходит в сброс; её текстовый эффект (нижний блок) — следующий шаг этапа. Честный пропуск остался у Шага 8 (Развитие Улья). Схема состояния — **17**.
>
> **Статус на 22.09.2026 (Шаг 7, версия 0.4.7):** Фаза Событий исполняет Шаг 7б книги правил — текстовые эффекты карт Событий (`logic/eventEffects.ts`, 19 эффектов по `doc/data/EVENTS.md`). После Движения Чужих разыгрывается нижний блок карты и публикуется событие `EVENT_EFFECT_RESOLVED` с машиночитаемым итогом. Реализованы: Охота (Взрослые вне Боя — к Персонажам, приоритет меньшего номера, Закрытые Двери не пропускают), Защита кладки (Контакт с источником `EVENT` для Персонажей в Улье и несущих Яйцо), Выводок, Регенерация, Затаившиеся, Созревание (гибель носителей Личинки со спавном Крипера + скан 4 карт Заражения на ИНФЕКЦИЮ), Разгром, Подготовка (решение `CHOOSE_EVENT_CARD`: Первый Игрок выбирает 1 из 3 вытянутых карт — `EVENT_CARD_CHOSEN`, остальные в сброс), Запах добычи и Улей (маркеры Шума с причиной `EVENT`, `playerId = null`), Шум в тех. коридорах (маркер на поле вентиляции либо броски Шума у входов), Воспламеняемый раствор (Пожар в Криогенный Отсек, при повторе — распространение; Закрытые Двери не пропускают огонь), Разрушающее пламя, Катапультирование капсулы (`EscapePodState.isDestroyed`, посадка в разрушенную Капсулу запрещена), Короткое замыкание, Утечка охладителя (взведение Самоуничтожения неисправным Генератором), Неполадка жизнеобеспечения, Неисправность, Открытие отсеков. Судьба карт: «удалите карту, замешайте сброс» — карта из игры, сброс замешивается под колоду (поток `cards`); «Неисправность» замешивается обратно; остальные — в публичный сброс. Исчерпание запасов жетонов Пожара/Неисправности ведёт к Взрыву/Разрыву Обшивки. «Пожирающее пламя» не входит в колоду (решение владельца, шаг 1) — эффект не реализован. Честный пропуск остался у Шага 8 (Развитие Улья). Схема состояния — **18**.
>
> **Статус на 22.09.2026 (Шаг 8, версия 0.4.8):** Фаза Событий исполняет Шаг 8 книги правил — Развитие Улья (`logic/hiveDevelopment.ts`, стр. 10, 31). Из мешка Пула Чужих потоком `bag` вытягивается ровно 1 жетон и разыгрывается по типу (`HIVE_DEVELOPMENT_RESOLVED`): Личинка и Крипер удаляются из Пула «в коробку» (взамен в мешок приходят Взрослая/Трутень), Взрослая Особь и Трутень заставляют всех Персонажей вне Боя бросить кубик Шума по очереди ходов, Королева при Персонаже в Улье выставляется миниатюрой с немедленным Контактом (источник `EVENT`), иначе добавляет Яйцо на Планшет Чужих (вместимость 8), Пустой жетон добавляет Взрослую из запаса. Каскады Шума и Контактов разыгрываются движком до перехода к новому раунду; пустой мешок честно пропускается (`HIVE_DEVELOPMENT_SKIPPED`). Попутно исполнено правило стр. 18: жетон Чужого, спрятавшегося в Технические Коридоры (Отступление, карта Событий, «Затаившиеся»), возвращается из запаса в мешок Пула. Все девять шагов Фазы Событий реализованы — честных пропусков не осталось. Визуал Чужих на карте: индивидуальные масштабы классов (Трутень ×1.2, Королева ×1.3), пульсирующая аура биоугрозы у доминантных классов, адаптивная сетка миниатюр при 3+ типах, пульсирующая красно-оранжевая рамка «В Бою» при Персонаже и Чужом в одном отсеке. Схема состояния — **19**.

---

### Шаг 1. Контракт данных Событий, колода из 20 карт и подготовка партии (Core Data & Setup) — ВЫПОЛНЕНО в 0.4.1

* Контракт `EventCard` (`types/cards.ts`): машинный `effect: EventEffect` (19 кодов на 20 карт), направление `corridorNumber: 1|2|3|4|'ANY'` («Подготовка» — любой Коридор), символы Чужих `intruderTypes`, флаги `isDestroyedOnResolve` (4 карты: Капсула, Замыкание, Утечка, Жизнеобеспечение) и `isReshuffledIntoDeck` («Неисправность»).
* Колода `EVENT_CARDS` (`data/eventCards.ts`) — 20 карт по `doc/data/EVENTS.md`. Транскрипт перечисляет 22 пункта при 20 картах в книге правил: по решению владельца (22.09.2026) в код вошли одна «Подготовка» (направление — любое) и 7 карт группы «Разрушение корабля» — без «Пожирающего пламени» (наименее подтверждена внешними упоминаниями; точный недостающий элемент ждёт физической сверки — см. `unverified` таблицы `event-cards`).
* Подготовка: `createInitialDecks` тасует колоду через поток `cards`; счётчик `meta.rngDraws.cards` и последующие колоды сдвинуты согласованно, партия воспроизводима по сиду. Санитайзер отдаёт колоду добора числом, сброс — лицом вверх. Схема состояния — 13; сохранения схемы 12 не восстанавлируются.
* Пакет источника: таблица `event-cards` и источник `events-transcript`; golden-тест сверяет все поля 20 карт, флаги и направления. Эффекты карт, Движение Чужих и Фаза Событий — Шаги 2–8, не в этом шаге.

* **Контракт данных:**
  * Добавить строгую типизацию карты События `EventCard` в `packages/shared/src/types/cards.ts`: уникальный устойчивый `id`, машинный код эффекта `effect: EventEffect`, русское название `name`, текстовое описание `description`, направление перемещения `corridorNumber: 1 | 2 | 3 | 4 | null` (или `'ANY'` для карт «Подготовка»), целевые типы Чужих `intruderTypes: readonly IntruderType[]`, флаг уничтожения карты `isDestroyedOnResolve: boolean` (для 4 карт, уходящих в коробку с замешиванием сброса), флаг замешивания в колоду `isReshuffledIntoDeck: boolean` (для карты «Неисправность»).
* **Наполнение колоды 20 карт (`packages/shared/src/data/eventCards.ts`):**
  * Сформировать точный состав из 20 карт по источнику `doc/data/EVENTS.md`:
    * *Охота и погоня (9 карт):* «Охота» (коридор 2), «Охота» (коридор 3), «Защита кладки» (коридор 2), «Выводок» (коридор 3), «Регенерация» (коридор 1), «Затаившиеся» (коридор 4), «Созревание» (коридор 1), «Разгром» (коридор 2), «Подготовка» (Любое направление / коридор 4).
    * *Скрытая угроза / Шум (3 карты):* «Запах добычи» (коридор 3), «Шум в тех. коридорах» (коридор 4), «Улей» (коридор 3).
    * *Разрушение корабля (7 карт):* «Воспламеняемый раствор» (коридор 4), «Пожирающее пламя» (коридор 4), «Разрушающее пламя» (коридор 1), «Катапультирование капсулы» (коридор 3, удаление), «Короткое замыкание» (коридор 4, удаление), «Утечка охладителя» (коридор 1, удаление), «Неполадка систем жизнеобеспечения» (коридор 2, удаление), «Неисправность» (коридор 2, замешивание в колоду).
    * *Двери (1 карта):* «Открытие отсеков» (коридор 1).
* **Генерация и детерминизм:**
  * Интегрировать наполнение и тасовку колоды Событий в `cardsSetup.ts` через генератор псевдослучайных чисел `cards` при инициализации стола `createInitialDecks`.
  * Пакет источников: добавить спецификацию и golden-тест колоды Событий в `doc/sources/data-sources.json` и `sources.golden.test.ts`.
  * Защита информации (Sanitizer): колода добора закрыта числом карт `drawPileCount`, сброс `discard` публичен лицом вверх.

---

### Шаг 2. Разрешение Отступления Чужих в Бою через колоду Событий (Combat Retreat Resolution) — ВЫПОЛНЕНО в 0.4.2

* **Устранение временного ограничения боя:**
  * Разблокировать обработку стрелки Отступления (`hasRetreat = true`) в `checkInjuryResult` при Стрельбе (`shoot.ts`) и Рукопашной (`melee.ts`), устранив отказ `EMPTY_EVENT_DECK`.
* **Правило перемещения при Отступлении (стр. 20 книги правил):**
  * Если выживший после проверки Стойкости Чужой получил карту со стрелкой Отступления (или хотя бы одну стрелку при двух картах у Королевы/Трутня):
    * Вытягивается верхняя карта из колоды Событий `decks.events` (при пустой колоде сброс немедленно перетасовывается через поток `cards`);
    * Чужой перемещается в направлении коридора с номером, указанным на вытянутой карте События;
    * Вытянутая карта События сбрасывается в публичный сброс `decks.events.discard` без розыгрыша её текстового эффекта (стр. 20: «Затем сбросьте эту карту Событий»);
    * Если целевой коридор заблокирован Закрытой Дверью: Дверь становится Разрушенной (`corridor.doorState = 'DESTROYED'`), а Чужой остаётся в исходном отсеке (FAQ Rules 8);
    * Если целевой коридор ведёт в Технические Коридоры (вентиляцию): миниатюра Чужого уходит в локацию Технических туннелей, с неё сбрасываются все маркеры Ран, а жетон возвращается в мешок Пула Чужих (стр. 16, 20);
    * Если коридора с таким номером в отсеке нет: Чужой никуда не перемещается и остаётся на месте.
* **События журнала и UI:**
  * Добавить событие журнала `INTRUDER_RETREATED` (отсек, особь, номер коридора, направление, уход в вентиляцию или снос двери).
  * Обновить боевые модальные окна (`ShootModal`, `MeleeModal`), отображая факт и направление отступления монстра.

---

### Шаг 3. Локация «Технические коридоры» и интерактивная вентиляция на карте (Technical Corridors Board Location) — ВЫПОЛНЕНО в 0.4.3

* **Модель данных и позиционирование отдельной локации:**
  * На игровом поле «Немезиды» Технические Коридоры (стр. 9, элемент 10; стр. 16) представляют собой отдельную обособленную локацию поля («Поле Технических Коридоров»), соединённую вентиляционными шахтами со всеми отсеками, имеющими Вход в Технические Коридоры (красный маячок/символ и номер tech-выхода);
  * Добавить выделенный узел локации в визуальную топологию `ShipMapSVG` (специальный стилизованный шестиугольник/хаб вентиляционной шахты с характерным индустриальным оформлением: решётки, датчики давления, предупреждающие красно-жёлтые полосы опасности);
  * Визуализировать пунктирные/неоновые трассы вентиляционных шахт, связывающие выходы отсеков с центральным узлом Технических туннелей.
* **Индикация состояния Технических коридоров:**
  * Индикатор маркера Шума в вентиляции (`ship.technicalCorridorNoise`): при наличии шума узел Технических туннелей пульсирует тревожным красным свечением и звуковыми волнами, дублируя статус на всех отсеках с выходами вентиляции;
  * Отображение скрывающихся в вентиляции Чужих: при уходе монстров в технические туннели (в результате отступления или событий) локация временно отображает силуэты уходящих во тьму паразитов перед сбросом в мешок.
* **Инспектор локации и контекст:**
  * Клик по узлу Технических коридоров открывает в `RoomInspector` отдельную панель технической зоны: описание состояния вентиляции, наличие шума, список соединённых комнат корабля и доступных классовых действий (например, перемещение Механика или карта «Планы Технических Коридоров»).

---

### Шаг 4. Оркестратор Фазы Событий, Шаг 4 (Счётчики Времени и Самоуничтожения) и Шаг 6 (Урон от огня) — ВЫПОЛНЕНО в 0.4.4

* **Конечный автомат Фазы Событий (`turnCycle.ts`, `eventsPhase.ts`):**
  * Заменить безусловный пропуск `EVENT_PHASE_SKIPPED` на последовательное исполнение шагов книги правил (стр. 10):
    * Шаг 4: Счётчик времени и Самоуничтожения;
    * Шаг 5: Атаки Чужих;
    * Шаг 6: Урон от огня;
    * Шаг 7: Разыгрывание карты События (Движение Чужих + Эффект);
    * Шаг 8: Развитие Улья;
    * Шаг 9: Завершение раунда и старт нового (`startNewRound`).
* **Шаг 4 правил — Счётчики и аварийные триггеры финала:**
  * Сдвиг маркера времени: `meta.timeTrackPosition += 1`.
  * Если достигнуто последнее красное поле трека времени (`timeTrackPosition >= TIME_TRACK_LENGTH`): игра немедленно заканчивается гиперпрыжком (`endGame(state, 'HYPERSPACE_JUMP')`, все персонажи вне камер Анабиоза погибают от перегрузок, стр. 11).
  * Если процесс Самоуничтожения активен (`selfDestructTrackPosition !== null`):
    * Сдвиг маркера: `selfDestructTrackPosition += 1`;
    * При достижении жёлтой зоны (`>= 6`): все капсулы автоматически разблокируются, процесс становится необратимым;
    * При достижении последнего деления с черепом (`position === 8`): немедленный взрыв корабля (`endGame(state, 'SHIP_EXPLODED')`, стр. 11, 24).
* **Шаг 6 правил — Урон от огня (Fire Damage Phase):**
  * Для каждого отсека с маркером Пожара (`room.hasFire = true`):
    * Каждый находящийся там Чужой получает ровно 1 Рану (`intruder.woundsCount += 1`);
    * Проводится проверка Результата Атаки по стойкости (`checkInjuryResult`): при ранах $\ge$ стойкости Чужой погибает с образованием Останков; при стрелке Отступления разыгрывается отступление по карте События;
    * Если на полу отсека лежат свободные Яйца Чужих (не в руках персонажей): 1 Яйцо уничтожается огнём (стр. 25 правил);
    * Фиксация событий урона огня монстрам в журнале партии (`FIRE_DAMAGE_TAKEN_BY_INTRUDER`).

---

### Шаг 5. Шаг 5 Фазы Событий: Атаки Чужих в комнатах с игроками (Intruder Attacks in Combat) — ВЫПОЛНЕНО в 0.4.5

* **Правило атак Чужих в Фазе Событий (стр. 10, 20):**
  * Каждый Чужой на корабле, находящийся в Бою с Персонажами (в одной комнате с одним или несколькими живыми не находящимися в капсуле/анабиозе персонажами), совершает атаку.
* **Алгоритм выбора цели (стр. 20, шаг 1):**
  * Чужой атакует Персонажа в своём отсеке с **наименьшим количеством карт на руке** (с учётом карт Заражения).
  * В случае равенства карт: атакуется персонаж с жетоном Первого Игрока или ближайший к нему по часовой стрелке (по порядку `orderNumber`).
* **Разрешение атаки монстра (`performIntruderAttack`):**
  * Личинка: заражение паразитом без карты Атаки (размещение на планшете `hasLarva = true`, добавление карты Заражения в сброс, снятие Личинки с поля).
  * Крипер, Взрослая, Трутень, Королева: вытягивание карты из `decks.intruderAttacks` лицом вверх;
  * Проверка совпадения типа атакующего монстра с символами на карте:
    * При несовпадении: «Промах» (атака проходит мимо);
    * При совпадении: исполнение эффекта (Царапина, Укус, Удар хвостом, Когти, Слизь, Зов, Трансформация, Исступление);
    * Учёт раскрытых карт Слабостей: например, при раскрытой слабости «Повадки атаки» укус Взрослой Особи наносит Лёгкую травму вместо Тяжёлой;
    * Обработка смерти персонажа при третьей Тяжёлой травме (выкладывание Трупа, сброс переносимых объектов, разблокировка капсул).
* **Журнал и интерфейс:**
  * Публичное событие `EVENT_PHASE_ATTACK_RESOLVED`.
  * Интерактивное всплывающее окно / баннер Фазы Событий с показом атак по игрокам.

---

### Шаг 6. Шаг 7а Фазы Событий: Автономное Движение Чужих по коридорам и в вентиляцию (Intruder Movement) — ВЫПОЛНЕНО в 0.4.6

* **Механика Движения Чужих (стр. 10, 15):**
  * Из колоды Событий вытягивается верхняя карта.
  * Верхний блок карты определяет типы двигающихся Чужих (символы типов) и номер коридора (1, 2, 3 или 4).
  * Правило исключения: Чужие, **находящиеся в Бою** (в одной комнате с персонажем), **НЕ перемещаются** (стр. 10).
* **Алгоритм перемещения не находящихся в бою Чужих:**
  * Для каждого соответствующего Чужого на поле проверяются коридоры его текущего отсека:
    * Поиск коридора, номер которого со стороны текущей комнаты совпадает с номером на карте События;
    * Если такого коридора нет: Чужой остаётся на месте;
    * Если коридор перекрыт Закрытой Дверью: Чужой разрушает дверь (`doorState = 'DESTROYED'`) и остаётся на месте (стр. 17). Если в отсеке было несколько движущихся Чужих, они разрушают дверь совместно и остаются в отсеке;
    * Если коридор открыт или дверь разрушена: Чужой переходит в смежный отсек;
    * Если переход совершается через Вход в Технические Коридоры (номер соответствует вентиляции отсека): Чужой перемещается в узел Технических коридоров, миниатюра удаляется с карты, раны сбрасываются, а жетон возвращается в мешок Пула Чужих (стр. 16);
    * Если Чужой вошёл в неисследованный отсек: комната **НЕ раскрывается** и жетон исследования не активируется (стр. 15);
    * Если Чужой вошёл в отсек с Персонажем: вход фиксируется, объявляется статус Боя (но Контакт и Внезапная атака не разыгрываются, стр. 18).
* **Событие журнала:** `INTRUDER_MOVED` с указанием особи, начального и конечного отсеков, номера коридора или ухода в технические туннели.

---

### Шаг 7. Шаг 7б Фазы Событий: Разрешение текстовых эффектов карт Событий (Event Effects Engine) — ВЫПОЛНЕНО в 0.4.7

* **Исполнение уникальных эффектов 20 карт Событий (стр. 10, `doc/data/EVENTS.md`):**
  * *Группа «Охота и Погоня»:*
    * «Охота»: перемещение свободных Взрослых Особей в соседние отсеки с людьми (с приоритетом наименьшего номера комнаты);
    * «Защита кладки»: запуск прерывания Контакта для персонажей в Улье или несущих Яйцо;
    * «Выводок»: сброс Яйца с Планшета; персонажи в Улье без карт на руке получают карту Заражения, иначе Личинка добавляется в мешок;
    * «Регенерация»: снятие до 2 ран со всех Чужих на поле;
    * «Затаившиеся»: снятие Чужих вне боя с возвратом жетонов в мешок через вентиляцию;
    * «Созревание»: персонажи с Личинкой на планшете погибают (спавн Крипера); проверка 4 карт на скрытую инфекцию;
    * «Разгром»: поломка во всех отсеках с крупными Чужими;
    * «Подготовка»: розыгрыш дополнительного выбора из 3 карт Событий.
  * *Группа «Шум и Вентиляция»:*
    * «Запах добычи»: размещение шума во все пустые коридоры комнат со Слизью;
    * «Шум в тех. коридорах»: маркер шума на поле техкоридоров либо броски шума персонажами у вентиляции;
    * «Улей»: маркеры шума вокруг исследованного Улья.
  * *Группа «Разрушение корабля» (Деградация систем):*
    * «Воспламеняемый раствор»: пожар в Криокамеру или его распространение в соседние отсеки (не через двери);
    * «Пожирающее пламя»: сгорание предметов (`itemsCount = 0`) в горящих комнатах и распространение огня;
    * «Разрушающее пламя»: маркер Неисправности в горящие комнаты + распространение огня;
    * «Катапультирование капсулы»: безвозвратное уничтожение капсулы с наименьшим номером;
    * «Короткое замыкание»: поломка во всех жёлтых отсеках с Компьютером;
    * «Утечка охладителя»: взведение таймера Самоуничтожения при неисправном Генераторе;
    * «Неполадка систем жизнеобеспечения»: маркер Неисправности во все зелёные комнаты;
    * «Неисправность»: поломка в исследованный отсек с наименьшим номером.
  * *Группа «Двери»:*
    * «Открытие отсеков»: перевод всех дверей на корабле (кроме Разрушенных) в состояние `OPEN`.
* **Правила перемещения карт после розыгрыша:**
  * Карты с пометкой «Удалить карту, замешать сброс»: удаляются из игры, а сброс замешивается в колоду;
  * Карта «Неисправность»: замешивается обратно в колоду Событий;
  * Остальные карты уходят в публичный сброс `decks.events.discard`.

---

### Шаг 8. Этап «Развитие Улья» и расширенное отображение Чужих в локациях (Hive Development & Intruder Visuals) — ВЫПОЛНЕНО в 0.4.8

* **Вытягивание жетона из Пула Чужих (стр. 10, 31):**
  * Из мешка Пула Чужих через поток RNG `bag` извлекается ровно 1 жетон.
* **Обработка жетона согласно книге правил:**
  * **ЛИЧИНКА:** жетон Личинки удаляется из Пула Чужих («в коробку»); в мешок добавляется 1 жетон Взрослой Особи из запаса на столе.
  * **КРИПЕР:** жетон Крипера удаляется из Пула Чужих; в мешок добавляется 1 жетон Трутня из запаса на столе.
  * **ВЗРОСЛАЯ ОСОБЬ:** все живые персонажи, **НЕ находящиеся в Бою**, обязаны совершить бросок кубика Шума (по очереди ходов). Персонажи в Бою бросок игнорируют. Жетон Взрослой Особи возвращается в мешок.
  * **ТРУТЕНЬ:** все персонажи вне Боя совершают бросок кубика Шума. Жетон Трутня возвращается в мешок.
  * **КОРОЛЕВА:**
    * Если хотя бы один Персонаж находится в Улье (исследованном): туда выставляется миниатюра Королевы и немедленно разыгрывается Контакт;
    * Если в Улье нет Персонажей (или Улей ещё не исследован): на Планшет Чужих добавляется 1 жетон Яйца (до максимума 8 жетонов);
    * Жетон Королевы возвращается в мешок.
  * **ПУСТОЙ:** в мешок добавляется 1 жетон Взрослой Особи из запаса (если в запасе есть доступные жетоны Взрослых). Пустой жетон возвращается в мешок.
* **Каскадные эффекты:** броски шума могут вызывать повторный шум и Контакты с Внезапными атаками, которые полноценно разыгрываются движком до перехода к новому раунду (стр. 10, шаг 9).
* **Визуальные доработки отображения «Чужих» на карте и в локациях:**
  * Обновление отображения пришельцев в `RoomHex`: раздельное масштабирование и позиционирование для каждого класса (Личинка, Крипер, Взрослая, Трутень, Королева) с индивидуальными SVG-силуэтами, цветовой кодировкой, шкалами стойкости/ран и бейджами количества;
  * Отображение чудовищ повышенного размера: Трутень и Королева рендерятся увеличенными доминантными силуэтами с пульсирующей аурой биоугрозы;
  * Визуализация скоплений врагов: адаптивная сетка размещения миниатюр внутри гекса при нахождении 2+ Чужих разных типов в одной комнате (без взаимного перекрытия и скрытия текста комнаты);
  * Отображение статуса «В Бою»: когда в комнате одновременно находятся Персонаж и Чужой, вокруг гекса активируется тревожная контрастная красно-оранжевая рамка боя со звуковым визуальным пульсом.

---

### Шаг 9. Плавная анимация перемещений по карте (Movement Interpolation), Event UI и выпуск v0.5.0 — ВЫПОЛНЕНО в 0.5.0

* **Визуализация перемещений между локациями без мгновенных скачков (Smooth Movement Interpolation):**
  * Полный отказ от мгновенной телепортации фишек при любых перемещениях:
    * Базовое движение игрока (`ACTION_MOVE`, `ACTION_CAREFUL_MOVE`, Побег);
    * Перемещение Чужих при розыгрыше карты События («Движение Чужих», «Охота»);
    * Отступление монстров по стрелке карты боя в соседнюю комнату;
    * Уход монстров и вход Механика в локацию Технических туннелей;
  * **Архитектура анимационного слоя карты (`BoardAnimationLayer`):**
    * Слой интерполяции поверх статических SVG-гексов: анимируемая сущность (фишка игрока или фигурка Чужого) плавно скользит по траектории коридора от центра исходной комнаты к центру целевой комнаты (`cubic-bezier` с естественным ускорением/замедлением);
    * Анимация прохождения дверей: при проходе через Закрытую Дверь монстр на мгновение замирает у переборки, проигрывается визуальный эффект деформации и взлома металла, дверь переходит в состояние `DESTROYED`, после чего монстр завершает шаг или остаётся на месте по правилам;
    * Анимация затягивания в вентиляцию: при уходе в технические коридоры фигурка плавно стягивается к красному маячку вентиляционной шахты и растворяется в узле Технических туннелей;
    * Поддержка доступности: строгое соблюдение медиа-запроса `prefers-reduced-motion` (при включении режима анимация сокращается до быстрого мягкого растворения без физического смещения камеры).
* **Интерфейс Фазы Событий (`EventPhaseModal.tsx`):**
  * Кинематографичный оверлей смены фазы («ФАЗА СОБЫТИЙ: РАУНД N») с пошаговой наглядной презентацией:
    * 1. Сдвиг маркеров времени и реактора (анимация шкал);
    * 2. Атаки монстров в комнатах с людьми (показ вытянутых карт и нанесённых травм);
    * 3. Урон от огня (вспышки пламени и получение ран монстрами/яйцами);
    * 4. Показ карты События с плавным перемещением фигурок монстров по палубам и в вентиляцию;
    * 5. Разрешение текстового эффекта с подсветкой затронутых отсеков на карте;
    * 6. Вытягивание жетона из мешка и визуальная эволюция Улья.
* **Сквозная интеграция, тесты и выпуск v0.5.0:**
  * Интеграционные тесты замкнутого игрового цикла раунда (Фаза Игроков $\rightarrow$ Всеобщий пас $\rightarrow$ Фаза Событий $\rightarrow$ Новый раунд);
  * Тесты целостности узла Технических коридоров и валидация защиты закрытых данных (Sanitizer);
  * Запуск `npm run verify` и сборки продакшн-бандла;
  * Фиксация версии **v0.5.0**.

> **Статус на 22.09.2026 (Шаг 9, версия 0.5.0 — этап завершён):** перемещения Персонажей и Чужих больше не телепортируются: слой `BoardAnimationLayer` (`client/components/board`) интерполирует каждое движение поверх статических гексов (`cubic-bezier(0.45, 0.05, 0.25, 1)`, 750 мс). Источник истины — чистый дифф двух снимков `SanitizedGameState` (`boardAnimationModel.ts`), движок не менялся. Взлом Закрытой Двери рисует вспышку деформации металла с ударной волной и искрами (`animate-door-breach`, `door-shockwave`, `door-spark`), уход в вентиляцию стягивает фигурку к узлу Технических Коридоров, растворяет её и расходится кругами (`hub-ripple`). Статические фишки скрываются на время перехода. При `prefers-reduced-motion` движение заменяется мягким растворением без смещения (`usePrefersReducedMotion`, `animate-token-fade`). Функционирует кинематографичный оверлей «ФАЗА СОБЫТИЙ: РАУНД N» (`EventPhaseModal.tsx` + `eventPhaseModalModel.ts` + `eventPhasePresentation.tsx`): шесть шагов в порядке движка с записями Журнала и янтарной подсветкой затронутых отсеков на карте; шаги предъявляются анимированными шкалами Времени и Самоуничтожения, картами Атак Чужих, полноразмерной картой События, вспышками пламени и вытянутым жетоном Улья — все движения только `motion-safe`; открывается автоматически один раз на Фазу. Сквозные интеграционные тесты замкнутого цикла (`roundCycle.integration.test.ts`, 8 кейсов): Фаза Игроков → Всеобщий пас → Фаза Событий → Новый раунд через `GameEngine.processAction`, три цикла подряд, целостность узла Технических Коридоров (входы вентиляции и Отступление по стрелке в вентиляцию с возвратом жетона в мешок), защита Санитайзера (порядок колоды Событий, Заражение и чужие Цели скрыты). **989 тестов в 82 файлах**, `npm run verify` и продакшн-сборка зелёные. Этап 0.5.0 закрыт полностью: все девять шагов Фазы Событий исполняются движком, визуальная симуляция корабля непрерывна.

---

**Результат этапа (Playable Demo v0.5.0):**  
Замкнут полноценный раунд игры «Немезида»: корабль оживает на экране. Появилась физическая локация Технических туннелей с интерактивной вентиляционной сетью. Чужие и игроки плавно скользят по коридорам без резких скачков, ломают переборки и растворяются в шахтах. Вторая половина раунда держит в напряжении: время тает, огонь пожирает палубы, системы выходят из строя, а пришельцы рыщут во тьме и эволюционируют.

---

---

## Этап 5.5 (текущая разработка) — Планшет Чужих: цифровая копия настольного планшета

> **Статус на 24.09.2026 (после v0.5.0):** Планшет Чужих реализован полностью по плану 8 шагов (`doc/intruder-board-ui.md`) — цифровой аналог физического планшета рядом с полем (стр. 6, шаг 9), только публичная информация, ноль новых движковых экшенов.

* **Шаг 1 — Единый справочник:** `board/intruderReference.ts` — `INTRUDER_NAMES_RU` (один источник для карты, Контактов, боя и журнала — убраны три дубликата), `HIVE_DEFINITION_ID='NEST'`, `HIVE_EGGS_CAPACITY=8`, карточки 5 классов (стойкость/лимиты 6-3-8-2-1/атаки/особенности из INTRUDERS §4–§5), памятка Внезапной Атаки без оборотов жетонов (анти-чит тестом).
* **Шаг 2 — Модель:** `intruders/intruderBoardModel.ts` — чистая агрегация `SanitizedGameState`: составы мешка/запаса/коробки (инвариант «мешок+запас=полный состав»), шансы Развития Улья методом наибольших остатков (сумма ровно 100), «анатомия колоды Атак» (`INTRUDER_ATTACK_CARDS` минус лицевой сброс по id), `boardByRoom` с Боем/Пожаром/подавлением и честной переживаемостью проверки Стойкости, BFS `roomsWithinDistance` (закрытые двери непроходимы), хроника через `formatGameLogEntry`, `boardChangeKey`/`boardChangeDelta`, `filterBoardRooms`. 33 unit-теста, без мутаций входа.
* **Шаг 3 — Кнопка и каркас:** чип HUD «ЧУЖИЕ N» с янтарной точкой «улей шевелился» (снимок последнего просмотра); модалка `z-[45]` — решения движка (`z-50`) всегда поверх; `useFocusTrap` вынесен в общий хук (`hooks/useFocusTrap.ts`, опция `onEscape`); открытие — local state в `App`, F5 окно закрывает (история презентации не затронута).
* **Шаги 4–6 — Секции:** Улей (фишки типов с шансами, полоса опустшения против всего Пула, запас/коробка, Первый Контакт, бейдж «МЕШОК ПУСТ»); Кладка (SVG-яйца с фазовым пульсом, 5/8→8/8); Слабости (рубашки с узором/раскрытые с описанием/пустые, подсказка про Лабораторию); Колода Атак (веер лицевого сброса с наклонами и hover-подъёмом, поповер карточки, бейдж «ПЕРЕТАСОВКА», «анатомия угрозы» в `<details>` с барами по атакующим и эффектам); На борту (фильтры Все/В Бою/Рядом со мной, клик по отсеку → `selectRoom` и подсветка на карте); Хроника улья (тональные сегменты как в Журнале, счётчики, отсылка к Журналу).
* **Шаг 7 — Кинематографика и доступность:** каскад открытия (stagger 70 мс), скан-линия, «дыхание» рамки, кардиограмма Королевы (`board-heartbeat` + rose-glow), дельта-подсветки изменений между просмотрами, фазовый пульс яиц; `prefers-reduced-motion` глушит всё через `usePrefersReducedMotion` + `motion-reduce`; мобайл-табы (`role=tablist`) «Улей · Атаки · На борту · Хроника».
* **Приёмка:** vitest 1116 passed (88 файлов, +50 к старту этапа), tsc client+shared чист, `npm run build` ok; окно не воспроизводится при F5, решения движка поверх планшета, скрытая информация (порядок мешка, обороты жетонов, будущие RNG) не показывается.

---

## Этап 6 (v0.6.0) — Красный Сканер, Инфекции, Крафт и Квесты
> **Срок:** Неделя 6  
> **Фокус:** Механика скрытого заражения, создание предметов и квесты оружия.

### Задачи:
1. **Модуль «Красного Сканера» (`InfectionScanner`):**
   * Карта Заражения с булевым флагом `isInfected`.
   * UI-компонент оптического сканера: красный светофильтр и шейдер помех, проявляющий слово «ИНФЕКЦИЯ».
   * Разрешение инфекции: посадка Личинки на планшет, смерть при повторном заражении.
   * Очищение организма в Операционной или через Антидот.
2. **Система Крафта:**
   * Базовое действие «Создать предмет»: сброс 2 карт с синими значками компонентов для сборки (Антидот, Тазер, Огнемет, Коктейль Молотова).
3. **Квестовые предметы:**
   * Разблокировка квестов персонажей (переворот карты из горизонтального в вертикальное положение).
4. **Выбор Цели:**
   * Получение 1 Личной и 1 Корпоративной цели на старте.
   * Автоматическая пауза игры при «Первом Контакте» для сброса одной из целей.

**Результат этапа (Playable Demo v0.6.0):**  
Полноценный хоррор-пласт: игрок собирает самодельное оружие из подручного хлама, сканирует карты через виртуальный красный сканер с замиранием сердца и пытается выполнить тайную цель.

---

## Этап 7 (v0.7.0) — Эвакуация, Анабиоз и Финальный Валидатор Победы
> **Срок:** Неделя 7  
> **Фокус:** Способы спасения с корабля, финал партии и подведение итогов.

### Задачи:
1. **Камеры Анабиоза (Криогенный отсек):**
   * Разблокировка камер на синих полях трека времени.
   * Действие входа в анабиоз (с броском шума). Засыпание персонажа и выход из активной игры.
2. **Спасательные Капсулы:**
   * Разблокировка капсул (вручную в спецкомнате, по таймеру самоуничтожения или при первой смерти).
   * Вход в капсулу, возможность ждать напарника или запустить немедленно.
3. **Финальный Валидатор Победы (Endgame Engine):**
   * Проверка статуса двигателей (вскрытие верхних жетонов 1, 2, 3: если $\ge 2$ сломаны — взрыв).
   * Проверка карты Координат (сопоставление с маркером курса: Земля / Марс / Глубокий космос).
   * Итоговое сканирование колод всех выживших на скрытую инфекцию (вытягивание 4 карт).
   * Проверка условий персональных карт Целей.
   * Экран статистики и итогов партии.

**Результат этапа (Playable Demo v0.7.0):**  
Игра полностью проходима от начала до победного или трагического конца в одиночном режиме (ручное управление персонажем).

---

## Этап 8 (v0.8.0) — Честный ИИ: Боты (Utility AI) и Система Заявлений
> **Срок:** Неделя 8  
> **Фокус:** Настоящая игра в одиночку с виртуальными товарищами.

### Задачи:
1. **Интерфейс Заявлений (Claims / Блеф):**
   * Модальное окно после проверки двигателя или курса: `[Заявить: Исправен]`, `[Заявить: Сломан]`, `[Скрыть]`.
   * Регистрация события `ClaimEvent` в публичном логе.
2. **Архитектура Честного Бота (`BotAgent`):**
   * Бот оперирует строго через `SanitizedGameState` (не знает закрытых карт и статусов).
   * Внутренняя память `BotBeliefState`: матрица доверия к игрокам, предположения о курсе и двигателях.
3. **Utility AI движок принятия решений:**
   * Вычисление полезности действий: Приоритет выживания (бегство от огня/ран) -> Приоритет личной цели -> Поиск лута -> Пас.
   * Навигация ботов по графу корабля через собственный A*.
4. **Кооперативное поведение:**
   * Починка двигателей, тушение пожаров, обмен патронами при совпадении комнат.

**Результат этапа (Playable Demo v0.8.0) — [ОСНОВНОЙ ВЕХОВЫЙ БИЛД]:**  
Полноценный **Solo-режим Nemesis**: вы играете с 1–4 ботами, которые исследуют корабль, заявляют о состоянии двигателей, дерутся с чужими, помогают или преследуют свои цели. Игра полностью самодостаточна.

---

## Этап 9 (v0.9.0) — Мобильная адаптация, PWA, Звуковой движок и Офлайн-сейв
> **Срок:** Неделя 9  
> **Фокус:** Превращение веб-страницы в идеальное мобильное офлайн-приложение.

### Задачи:
1. **Автосохранение сессии (Mobile Persistence):**
   * Настройка Zustand `persist` middleware с сохранением снапшотов стейта в `localStorage`.
   * Бесшовное восстановление партии при сворачивании браузера или звонке на смартфон.
2. **Адаптивный тач-интерфейс:**
   * Нижняя выдвижная шторка (Bottom Sheet) для руки карт.
   * Радиальные тач-кнопки комнат с минимальным размером 44x44px.
3. **PWA и Service Worker (`vite-plugin-pwa`):**
   * Манифест приложения, полноэкранный режим без адресной строки (`display: standalone`).
   * 100% офлайн-кэширование всех скриптов и ассетов.
4. **Аудио-атмосфера (`Howler.js`):**
   * Фоновый эмбиент гула корабля, тревожная сирена, визг Чужих, выстрелы, щелчки дверей.

**Результат этапа (Playable Demo v0.9.0):**  
Игра устанавливается на смартфон как PWA-приложение в один клик. Работает в авиарежиме без интернета, управляется пальцами, звучит как полноценный sci-fi хоррор и сохраняет каждый шаг.

---

## Этап 10 (v0.10.0) — Серверная часть, Лобби и Мультиплеер (LAN / WAN)
> **Срок:** Неделя 10  
> **Фокус:** Сетевой код, совместная игра по Wi-Fi с телефонов и через Интернет.

### Задачи:
1. **Бэкенд `packages/server`:**
   * Node.js + Express + Socket.io сервер.
   * Комнаты лобби, выбор персонажей на драфте, синхронизация сида матча.
2. **Авторитарный цикл и Фильтрация:**
   * Перенос валидации действий на сервер.
   * Реализация `filterStateForPlayer`: цензурирование скрытой информации перед отправкой клиентам.
3. **Транспортный слой (`SocketIoTransport`):**
   * Подключение клиента через единый интерфейс `IGameTransport`.
   * Сетевой лог чата и заявлений.
4. **LAN-раздача:**
   * Запуск сервера на ПК хоста с привязкой `0.0.0.0:3000`. Друзья заходят со своих смартфонов по локальному IP.

**Результат этапа (Playable Demo v0.10.0):**  
Полноценный кроссплатформенный мультиплеер (PC + Android). Можно играть компанией в локальной сети или через интернет, при желании заменяя недостающих игроков ботами.

---

## Этап 11 (v1.0.0) — Режим Чужого, Альтернативное поле и Релизный полишинг
> **Срок:** Неделя 11  
> **Фокус:** Дополнительные режимы из настольной игры, баланс и финальный релиз.

### Задачи:
1. **Режим «Игра за Чужого»:**
   * Колода карт действий Чужих для первого погибшего игрока.
   * Управление перемещением монстров и атаками из вентиляции.
2. **Альтернативная сторона поля:**
   * Переключатель на вторую карту корабля (2 независимые сети техкоридоров, сдвоенные проходы).
3. **Финальная полировка:**
   * Оптимизация рендеринга SVG-карты.
   * Сквозное стресс-тестирование краевых правил по книге правил (`doc/rules.md`) — сверка каждой механики с оригиналом 1:1.

**Результат этапа (v1.0.0 Gold Master):**  
Завершенный цифровой продукт, на 100% воспроизводящий настольный шедевр со всеми режимами, ботами и мультиплеером.