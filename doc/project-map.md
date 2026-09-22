# NEMESIS DIGITAL — Карта проекта (`doc/project-map.md`)

> Для разработчиков и AI-агентов. Карта «экран / модуль / сущность → что делает → где в коде».
> Строки со временем смещаются, поэтому главная опора — **путь к файлу, имя функции, класса или типа** (агент находит их точно).
> Архитектура и правила — см. `doc/tech_stack.md`, `doc/design_document.md`, `doc/rules.md`.

---

## 1. Архитектурное деление монорепозитория

Проект построен как строгий NPM-монорепозиторий из двух ключевых пакетов:

| Пакет | Роль | Технологии | Главная точка входа |
|---|---|---|---|
| `packages/shared` | **Изоморфное ядро правил**: детерминированный движок FSM, состояние, данные компонентов, валидаторы оплаты и перемещения, фильтр скрытой информации. Полностью изолирован от DOM, React, Node.js API и сети. | TypeScript, Immer, seedrandom | `packages/shared/src/index.ts` |
| `packages/client` | **Клиентское Web/PWA-приложение**: визуализация интерактивной SVG-карты, инспектор отсеков, карточная рука игрока, модальные окна решений, журнал событий, транспорт локальной офлайн-партии. | React 18, Vite, Tailwind CSS, Zustand, Lucide-react | `packages/client/src/main.tsx`, `App.tsx` |

---

## 2. Карта ядра правил (`packages/shared/`)

### A. Типы и Контракты данных (`packages/shared/src/types/`)

| Файл | Что содержит / Ключевые типы | Описание роли |
|---|---|---|
| `state.ts` | `GameState`, `ShipState`, `GameMeta`, `CoordinatesState`, `IntrudersPoolState` | Главный корневой контракт состояния всей партии (версия схемы `GAME_STATE_SCHEMA_VERSION = 6`; совместимость — `doc/v0.4.0-step-2.md`). |
| `actions.ts` | `EngineAction`, `GameAction`, `DevAction`, `RoomAbilityPayload` | Все легальные действия игроков (`ACTION_MOVE`, `ACTION_SEARCH`, `ACTION_ROOM_ABILITY`, `ACTION_PASS`, и др.) и dev-инструменты. |
| `cards.ts` | `ActionCard`, `ItemCard`, `CraftedItemCard`, `ContaminationCard`, `SeriousWoundCard`, `IntruderAttackCard`, `IntruderAttackEffect`, `IntruderAttackerType` | Контракты карт; Атаки Чужих содержат машинный эффект, стойкость, стрелку и символы атакующих. |
| `rooms.ts` | `RoomState`, `RoomDefinition`, `CorridorConnection`, `ExplorationEffect` | Модель комнат, дверей (OPEN/CLOSED/DESTROYED), коридоров и эффектов жетонов исследования. |
| `entities.ts` | `PlayerState`, `CharacterClass`, `IntruderToken`, `IntruderEntity`, `BoardObject`, `HandSlotContent` | Персонажи (6 классов), слоты рук (2 слота под тяжёлое), инвентарь, жетоны Чужих. |
| `decisions.ts` | `PendingDecision` | Контракт отложенных интерактивных решений игрока (`CHOOSE_SEARCH_ITEM`, `CHOOSE_WHITE_ROOM_DECK`, `CHOOSE_EVENT_CARD` — выбор 1 из 3 карт «Подготовки», и др.). |
| `sanitized.ts` | `SanitizedGameState`, `SanitizedPlayerState`, `SanitizedRoomState` | Контракт отфильтрованного среза состояния: всё скрытое строго типизировано как `null` / счетчики. |
| `log.ts` | `GameLogEntry`, `GameLogPayload` | События публичного журнала партии (перемещения, шум, обыск, использование консолей). |
| `interrupts.ts` | `InterruptEvent` | Стек прерываний движка (`EXPLORE_ROOM_INTERRUPT`, `NOISE_ROLL_INTERRUPT`). |

### B. Логика движка и правила (`packages/shared/src/logic/`)

| Модуль / Файл | Ключевые функции | Что делает |
|---|---|---|
| `fsm.ts` | `GameEngine.processAction()` | **Сердце игрового движка**: атомарная транзакция Immer, проверка владельца действия и маршрутизация; вся логика живёт в соседних модулях подсистем. |
| `interrupts.ts` | `drainInterrupts()`, `resolveInterrupt()` | Каскад прерываний: вскрытие, Шум, Контакт, Внезапная атака, завершение действия; приостанавливается на обязательном решении. |
| `setup.ts` | `createInitialGameState(seed)` | Детерминированная подготовка партии по сиду: расклад тайлов комнат, мешка Чужих, колод стола и раздача персонажей. |
| `cardsPayment.ts` | `validatePayment()`, `executeCardPayment()`, `drawCardsToLimit()`, `getPlayerHandLimit()` | Единый валидатор оплаты действий сбросом карт действий с руки, запрет оплаты Заражением, добор карт в начале раунда. |
| `turnCycle.ts` | `advanceTurn()`, `startNewRound()`, `findNextActivePlayer()`, `applyFireEndTurnEffect()` | Цикл микроходов: порядок игроков по кругу, учёт 2 действий, передача хода, урон от огня при завершении хода; при всеобщем пасе передаёт управление оркестратору Фазы Событий. |
| `eventsPhase.ts` | `runEventPhase()`, `advanceTimeAndSelfDestruct()`, `resolveFireDamage()` | Оркестратор Фазы Событий (стр. 10): Шаг 4 — маркеры Времени и Самоуничтожения с аварийными финалами (`HYPERSPACE_JUMP`, `SHIP_EXPLODED`, разблокировка Капсул с жёлтой зоны); Шаг 5 — Атаки Чужих (`resolveEventPhaseAttacks`), при полной гибели активных Персонажей партия заканчивается; Шаг 6 — 1 Рана каждому Чужому в горящем отсеке с проверкой Стойкости и уничтожением одного Яйца на полу; Шаг 7 — карта Событий, Движение Чужих и текстовый эффект (`resolveEventCardMovement`); Шаг 8 — Развитие Улья (`resolveHiveDevelopment`) и каскады Шума/Контактов до нового раунда. Все девять шагов реализованы. |
| `hiveDevelopment.ts` | `resolveHiveDevelopment()`, `HIVE_EGG_CAPACITY` | Шаг 8 Фазы Событий (стр. 10, 31): жетон из мешка Пула Чужих потоком `bag` — Личинка/Крипер «в коробку» с заменой на Взрослую/Трутня, Взрослая/Трутень — броски Шума Персонажами вне Боя по очереди ходов, Королева — миниатюра в Улей с Контактом (`EVENT`) либо Яйцо на Планшет (вместимость 8), Пустой — Взрослая из запаса; итог `HIVE_DEVELOPMENT_RESOLVED`, пустой мешок — `HIVE_DEVELOPMENT_SKIPPED`. |
| `eventsPhaseAttacks.ts` | `resolveEventPhaseAttacks()`, `selectAttackTarget()` | Шаг 5 Фазы Событий (стр. 10, 20): каждый Чужой в Бою атакует — цель с наименьшей рукой (Заражение считается), при равенстве жетон Первого Игрока и ближайшие по часовой стрелке; исход каждой атаки — `EVENT_PHASE_ATTACK_RESOLVED`. |
| `eventCardMovement.ts` | `resolveEventCardMovement()`, `playEventCard()` | Шаг 7а Фазы Событий (стр. 10, 15): верхняя карта Событий (`EVENT_CARD_DRAWN`), Движение Чужих вне Боя по номеру Коридора — переход (`INTRUDER_MOVED`), совместное разрушение Закрытой Двери, уход в вентиляцию со сбросом Ран; `playEventCard()` — полный цикл «движение → эффект → судьба карты», повторно вызывается «Подготовкой» для выбранной карты. |
| `eventEffects.ts` | `resolveEventCardEffect()`, `disposeEventCard()` | Шаг 7б Фазы Событий (стр. 10, `doc/data/EVENTS.md`): 19 текстовых эффектов с итогом `EVENT_EFFECT_RESOLVED` — Охота, Защита кладки (Контакт источник `EVENT`), Выводок, Регенерация, Затаившиеся, Созревание, Разгром, Подготовка (`CHOOSE_EVENT_CARD` для Первого Игрока), Шум-группа (маркеры с причиной `EVENT`, `playerId = null`), Пожар/Неисправность-группа с распространением через открытые Двери, Катапультирование Капсулы (`isDestroyed`), Открытие отсеков; судьба карт: удаление с замешиванием сброса, возврат «Неисправности» в колоду, публичный сброс. |
| `search.ts` | `validateSearchConditions()`, `drawSearchCards()`, `placeItemToPlayer()`, `getRoomDeckColor()` | Логика действия «Поиск»: проверка условий отсека, добор 2 карт из колоды, помещение в инвентарь или в руки. |
| `roomAbilities.ts` | `executeRoomAbility()` | Выполнение базовых действий 11 комнат категории «1» (Оружейная, Радиорубка, Лазарет, Генератор, Пожарная система, Улей, Лаборатория, Капсулы, Операционная). |
| `sanitizer.ts` | `filterStateForPlayer(state, viewingPlayerId)` | **Фильтр скрытой информации**: вырезает чужие руки, инвентарь, неисследованные тайлы и приватные решения других игроков. |
| `markers.ts` | `placeFireMarker()`, `placeMalfunctionMarker()`, `placeDoorToken()`, `noiseMarkersInSupply()` | Правила лимитов маркеров пожара (8), поломок (8), шума (30) и дверей (12). Условия гибели корабля. |
| `contact.ts` | `resolveContact()` | Контакт: сброс Шума, жетон из мешка потоком `bag`, BLANK, Личинка (заражение вместо миниатюры), первая встреча и очередь Внезапной атаки. |
| `shoot.ts` | `executeShoot()`, `checkInjuryResult()` | Стрельба (ACTION_SHOOT, стр. 19–20): слот Рук с Боезапасом, цена картой, кубик Боя, общая проверка Стойкости, стрелка Отступления запускает розыгрыш направления по колоде Событий (Шаг 2 этапа 0.5.0). |
| `intruderRetreat.ts` | `resolveIntruderRetreat()` | Отступление Чужого в бою (стр. 20): верхняя карта Событий задаёт номер Коридора и уходит в сброс без эффекта; Закрытая Дверь разрушается (FAQ Rules 8), номер вентиляции снимает миниатюру, сбрасывает Раны и возвращает жетон в Пул (стр. 16, 18). |
| `melee.ts` | `executeMelee()` | Рукопашная атака (ACTION_MELEE, стр. 19): карта Заражения до броска, «2 Раны» = 1 Рана, промах = Тяжёлая Травма Персонажу; проверка Стойкости — общая `checkInjuryResult`. |
| `weaknesses.ts` | `isWeaknessRevealed()` | Раскрытые Слабости (стр. 21): единый предикат эффектов по слотам Планшета Чужих — бой, Внезапная атака, стойкость. |
| `heavyObjects.ts` | `executePickUpObject()` | Действие [1] «Поднять Тяжёлый объект» (стр. 22): Труп/Яйцо/Останки из отсека в свободный слот Руки за карту. |
| `escape.ts` | `resolveEscapeAttack()` | Побег из Боя (стр. 19): атаки в спину по FAQ Rules 5 (от крупных к мелким), затем шаг и Шум; завершение действия — после Шума. |
| `combatStatus.ts` | `isRoomInCombat()`, `isPlayerInCombat()` | Статус Боя (стр. 18): единый предикат для блокировок движка и интерфейса. |
| `intruderPlacement.ts` | `placeIntruder()`, `removeIntruder()`, `transformCreeper()` | Миниатюры и жетоны — раздельные запасы; лимиты фигурок (8 Взрослых) и отступление не участвующих в Бою. |
| `intruderAttacks.ts` | `performIntruderAttack()`, `resolveSurpriseAttack()` | Ядро Атаки Чужого для всех трёх случаев (Внезапная, Побег, Фаза Событий): символы атакующих, восемь эффектов колоды, Трансформация, Зов с подавлением до конца фазы, Личинка-инфицирование, перетасовка сброса. |
| `characterDamage.ts` | `sufferLightWounds()`, `sufferSeriousWound()`, `killPlayer()` | Пороги Травм, смерть с Трупом и раздачей Объектов, разблокировка капсул первой смертью. |
| `cardPiles.ts` | `reshuffleDiscard()`, `drawSharedCard()` | Перетасовка общих колод потоком `cards` (ровно n−1 чтений) и явная ошибка при исчерпании. |
| `stateIds.ts`, `engineErrors.ts`, `gameEnd.ts`, `actionCompletion.ts` | `allocateEntityId()`, `EngineError`, `endGame()`, `queueActionCompletion()` | Общие контракты: сохраняемые ID без часов, коды ошибок, окончание партии, завершение хода после прерываний. |
| `combatDie.ts` | `rollCombatDie(state)` | Один бросок шестигранного кубика Боя; продвигает только сохраняемый счётчик потока `combat`, не применяет урон. |
| `gameLog.ts` | `appendGameLog()` | Добавление типизированных событий в публичный журнал партии. |

### C. Статические данные и баланс (`packages/shared/src/data/`)

| Файл | Константы / Данные | Назначение |
|---|---|---|
| `shipGraph.ts` | `SHIP_ROOM_NODES`, `SHIP_CORRIDOR_EDGES` | Геометрический и логический граф корабля (21 отсек, коридоры, связи с вентиляцией). |
| `roomDefinitions.ts` | `BASIC_ROOMS_1`, `ADDITIONAL_ROOMS_2`, `SPECIAL_ROOMS` | Свойства комнат: тип, цвет колоды обыска, наличие компьютера, стоимость и текст действий. |
| `actionCards.ts` | `ACTION_CARDS_BY_CLASS` | Все 60 карт действий персонажей (по 10 на каждый из 6 классов) со стоимостью и текстом. |
| `itemCards.ts` | `RED_ITEM_CARDS`, `YELLOW_ITEM_CARDS`, `GREEN_ITEM_CARDS` | Колоды предметов стола: военные (30), технические (30), медицинские (30). |
| `startingItems.ts` | `STARTING_WEAPONS` | Стартовое оружие персонажей (включая разделение на классическое оружие и энергооружие). |
| `crafting.ts` | `CRAFTING_RECIPES`, `CRAFTED_ITEMS` | 4 рецепта и 12 карт колоды создаваемых предметов. |
| `contaminationCards.ts`| `CONTAMINATION_CARDS_DECK` | 27 карт заражения (7 инфицированных, 20 стерильных). |
| `seriousWounds.ts` | `SERIOUS_WOUNDS_DECK` | 16 карт тяжёлых травм (по 4 на руку, ногу, тело, кровотечение). |
| `intruderAttacks.ts` | `INTRUDER_ATTACK_CARDS` | 20 карт Атак с полным набором печатных полей и типизированным эффектом; provenance — `data-sources.json#intruder-attacks`. |
| `weaknesses.ts` | `WEAKNESS_CARDS` | 8 карт Слабостей с машинными эффектами; 3 случайные уходят в слоты Планшета Чужих при подготовке; provenance — `data-sources.json#weakness-cards`. |
| `combatDie.ts` | `COMBAT_DIE_FACES`, `CombatDieFace` | Шесть физических граней (два Промаха), пять различных результатов; provenance — `data-sources.json#combat-die`. |
| `intruderMiniatures.ts` | `INTRUDER_MINIATURE_LIMITS` | Физические лимиты миниатюр (6 Личинок, 3 Крипера, 8 Взрослых, 2 Трутня, 1 Королева); provenance — `data-sources.json#intruder-miniatures`. |
| `noiseDie.ts` | `NOISE_DIE_FACES` | Грани кубика Шума d10 (номера 1..4, Тишина, Опасность). |

---

## 3. Карта клиентского приложения (`packages/client/`)

### A. Корневой слой и состояние

| Файл | Назначение | Главные экспорты |
|---|---|---|
| `App.tsx` | Корневой каркас UI, верхний HUD (раунд, фаза, активный игрок, трек времени, сид, dev-кнопка), сборка слоёв карты и панелей. | `App` |
| `store/gameStore.ts` | Клиентский Zustand-стор: хранит отфильтрованное состояние `view`, выбранный отсек `selectedRoomId` и ошибки движка `rejection`. | `useGameStore` |
| `services/transport/` | Транспортный слой изоляции: `LocalInMemoryTransport` исполняет действия в `GameEngine` браузера и сохраняет снапшоты в `localStorage`. | `LocalInMemoryTransport`, `createLocalTransport` |
| `services/session/` | Хранилище сессий (`sessionStorage.ts`) и генерация сида (`seed.ts`). | `createLocalSessionStorage`, `createSeed` |

### B. Компоненты интерфейса (`packages/client/src/components/`)

| Компонент / Файл | Роль в интерфейсе | Взаимодействие с движком |
|---|---|---|
| **Карта корабля**<br>`board/ShipMapSVG.tsx`<br>`board/RoomHex.tsx`<br>`board/CorridorEdge.tsx`<br>`board/TechCorridorHub.tsx`<br>`board/VentShaftTraces.tsx`<br>`board/techCorridorModel.ts`<br>`board/intruderMapModel.ts`<br>`board/IntruderBadge.tsx` | Интерактивная векторная карта корабля с панорамированием и зумом (`react-zoom-pan-pinch`). Отображает комнаты, коридоры, двери, фишки игроков и маркеры шума/пожара/поломки; отдельный узел «Поле Технических Коридоров» (стр. 9, 16) соединён с входами вентиляции пунктирными трассами шахт, при Шуме пульсирует тревогой и дублирует её на маячках входов, а уходящие в вентиляцию Чужие видны силуэтами. Чужие в отсеках (стр. 19): индивидуальные масштабы классов, пульсирующая аура у Трутня и Королевы, адаптивная сетка миниатюр при 3+ типах, красно-оранжевая пульсирующая рамка «В Бою» при Персонаже и Чужом в одном отсеке. | Клик по комнате вызывает `selectRoom(id)`, клик по узлу вентиляции — `openTechnicalCorridors()`. |
| **Инспектор отсека**<br>`inspector/RoomInspector.tsx`<br>`inspector/TechCorridorPanel.tsx` | Боковая/нижняя панель информации об отсеке (исследованность, предметы, компьютер, огонь, поломка, игроки). Контекстные кнопки: переход (`ACTION_MOVE`), обыск (`ACTION_SEARCH`), консоль отсека (`ACTION_ROOM_ABILITY`). Выбранный узел вентиляции открывает отдельную панель Технических Коридоров: состояние Шума, список входов, доступы по книге правил. | Отправляет `dispatch(ACTION_MOVE)` (из отсека с Чужими — через диалог подтверждения Побега, Шаг 7), `dispatch(ACTION_SEARCH)`, `dispatch(ACTION_ROOM_ABILITY)` (Лаборатория — с типом объекта), `dispatch(ACTION_PICK_UP_OBJECT)`; показывает слоты Слабостей Планшета Чужих. |
| **Панель руки игрока**<br>`hand/PlayerHandPanel.tsx` | Нижняя выдвижная панель карт руки: отображает карты действий и заражения, цену сброса, мультиселект карт для оплаты, кнопку Паса, счётчик оставшихся действий в микроходе (0/2, 1/2), а также выдвижной инвентарь (слоты рук, предметы, травмы). | Отправляет `dispatch(ACTION_PASS)` со сбросом выбранных карт. |
| **Контакт и Внезапная атака**<br>`contact/ContactOverlay.tsx`<br>`contact/ContactModal.tsx`<br>`contact/IntruderSilhouette.tsx` | Последовательные окна результатов движка: силаэт жетона с числом и анимацией, предупреждение Внезапной атаки, затем открытая карта и итог; окна боя включают исход Побега («атака в спину», Шаг 7). Клавиатура, фокус и `prefers-reduced-motion`; закрытие не меняет партию. | Читает публичные события `view.gameLog`. |
| **Модальные окна решений**<br>`modals/DecisionModal.tsx` | Всплывающие модальные окна для интерактивных решений `pendingDecision`: выбор колоды в белой комнате (`CHOOSE_WHITE_ROOM_DECK`), выбор 1 из 2 карт поиска (`CHOOSE_SEARCH_ITEM`), сброс тяжёлого предмета (`DISCARD_HEAVY_ITEM_FOR_NEW`), тайный выбор Цели первого Контакта (`CHOOSE_OBJECTIVE`), розыгрыш 1 из 3 карт Событий «Подготовки» (`CHOOSE_EVENT_CARD`). | Отправляет `dispatch(ACTION_RESOLVE_DECISION)`. |
| **Бой: Стрельба и Рукопашная**<br>`combat/ShootModal.tsx`<br>`combat/MeleeModal.tsx`<br>`combat/shootPresentation.ts`<br>`combat/retreatPresentation.ts` | Панели боевых действий (стр. 19): выбор Оружия/цели и цели для драки, контроль карты цены, показ отказов движка; презентация граней кубика Боя и тексты исходов Отступления (стр. 20). | Отправляет `dispatch(ACTION_SHOOT)`, `dispatch(ACTION_MELEE)`; результат рендерит окно Контакта (`SHOOT_RESOLVED`/`MELEE_RESOLVED`, включая блок Отступления по карте Событий). |
| **Журнал событий**<br>`log/GameLogPanel.tsx`<br>`log/gameLogModel.ts`<br>`log/intruderLogModel.ts`<br>`log/eventEffectLogModel.ts` | Нижняя сворачиваемая панель истории ходов и событий партии: форматирует лог с семантической подсветкой сущностей; `eventEffectLogModel.ts` — русские тексты 19 итогов эффектов карт Событий (`EVENT_EFFECT_RESOLVED`) и выбора «Подготовки» (`EVENT_CARD_CHOSEN`). | Читает `view.gameLog`. |
| **Dev-панель**<br>`dev/DevPanel.tsx`<br>`dev/devPanelModel.ts` | Отладочная панель для разработчика (доступна только при `IS_DEV = true`): переключение дверей, шума, просмотр сырого состояния. Вырезается из продакшн-сборки. | Отправляет `DEV_TOGGLE_DOOR`, `DEV_TOGGLE_NOISE`. |
| **HUD-чип сида**<br>`hud/SeedChip.tsx` | Отображение сида генерации текущего матча с возможностью копирования в буфер обмена. | Читает `view.meta.seed`. |

---

## 4. Регламент внесения точечных правок

Чтобы правки не нарушали архитектуру «1:1» и детерминированность:

```
Цель:  <Что именно должно измениться в правилах или интерфейсе>
Где:   <Пакет> → <Файл> → <Имя функции/компонента>
Связи: <Какие тесты покрывают это место>
```

**Золотые правила проекта:**
1. **Правила живут только в `packages/shared/src/logic/`**: клиент никогда не мутирует стейт напрямую и не реализует собственные скрытые правила — он только отправляет действия (`dispatch`).
2. **Нулевое читерство (Zero Cheating)**: клиент видит мир строго через `filterStateForPlayer`. Никаких секретных карт чужих рук в DOM.
3. **Перед каждым коммитом**: обязательно выполнение `npm run verify` (`typecheck`, `lint`, `format:check`, `test`).
