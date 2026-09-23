# NEMESIS DIGITAL — Карта проекта (`doc/project-map.md`)

> Для разработчиков и AI-агентов. Карта «экран / модуль / сущность → что делает → где в коде».
> Строки смещаются, главная опора — путь к файлу, имя функции/класса/типа.
> Архитектура и правила — `doc/tech_stack.md`, `doc/design_document.md`, `doc/rules.md`.
> **Версия документа:** 3.0 (актуализировано под v0.5.0, схема 19, 989 тестов, 29 коридоров, 2 пакета).

---

## 1. Архитектурное деление монорепозитория

| Пакет | Роль | Технологии | Вход |
|---|---|---|---|
| `packages/shared` | **Изоморфное ядро правил**: детерминированный движок FSM, состояние, данные, валидаторы, фильтр скрытой информации. Изолирован от DOM/React/Node API/сети. | TypeScript, Immer, seedrandom | `src/index.ts` |
| `packages/client` | **Клиент Web/PWA**: SVG-карта, инспектор, рука, модалки решений, журнал, транспорт офлайн-партии. | React 18, Vite 5, Tailwind 3, Zustand 4, Lucide | `src/main.tsx`, `App.tsx` |

---

## 2. Карта ядра правил (`packages/shared/`)

### A. Типы и Контракты (`src/types/`)

| Файл | Ключевые типы | Роль |
|---|---|---|
| `state.ts` | `GameState`, `ShipState`, `GameMeta`, `CoordinatesState`, `IntrudersPoolState`, `GAME_STATE_SCHEMA_VERSION = 19` | Корневой контракт состояния (история версий — `CHANGELOG.md`). |
| `actions.ts` | `GameAction`, `DevAction`, `RoomAbilityPayload` | Все легальные действия: `ACTION_MOVE`, `ACTION_SEARCH`, `ACTION_ROOM_ABILITY`, `ACTION_PASS`, `ACTION_SHOOT`, `ACTION_MELEE`, `ACTION_PICK_UP_OBJECT`, `ACTION_RESOLVE_DECISION`, dev. |
| `cards.ts` | `ActionCard`, `ItemCard`, `CraftedItemCard`, `ContaminationCard`, `SeriousWoundCard`, `IntruderAttackCard`, `EventCard`, `GameDecksState` | Контракты колод: предметы 90, крафт 12, заражение 27, травмы 16, атаки 20, события 20, действия 60. |
| `rooms.ts` | `RoomState`, `RoomDefinition`, `CorridorConnection`, `ExplorationEffect`, `RoomSlotCategory` | Комнаты, двери OPEN/CLOSED/DESTROYED, 29 коридоров, эффекты жетонов. |
| `entities.ts` | `PlayerState`, `CharacterClass`, `IntruderToken`, `IntruderEntity`, `BoardObject`, `HandSlotContent`, `EscapePodState`, `WeaknessSlotState` | Персонажи 6 классов, 2 слота рук, инвентарь, жетоны Чужих 27, миниатюры лимиты. |
| `decisions.ts` | `PendingDecision` | Отложенные решения: `CHOOSE_OBJECTIVE`, `CHOOSE_SEARCH_ITEM`, `CHOOSE_WHITE_ROOM_DECK`, `CHOOSE_EVENT_CARD`, `DISCARD_HEAVY_ITEM_FOR_NEW`, `ROOM_FIRE_CONTROL_TARGET`, `ROOM_GENERATOR_ACTION`, `CHOOSE_REST_CONTAMINATION_DISCARD`, `REROLL_COMBAT_DIE`. |
| `sanitized.ts` | `SanitizedGameState`, `SanitizedPlayerState` | Отфильтрованный срез: скрытое как `null`/счётчики. |
| `log.ts` | `GameLogEntry`, `EventEffectOutcome` (19), `HiveDevelopmentOutcome` (6) | Журнал партии + итоги эффектов Событий и Улья. |
| `interrupts.ts` | `InterruptEvent` | Стек прерываний: `EXPLORE_ROOM`, `NOISE_ROLL`, `CONTACT`, `SURPRISE_ATTACK`, `ESCAPE_ATTACK`, etc. |
| `contact.ts` | `IntruderRetreatOutcome`, `AttackVictimStatus`, `IntruderLogEvent` | Презентация Контакта/Атак/Отступления. |

### B. Логика движка (`src/logic/`)

| Модуль | Ключевые функции | Что делает |
|---|---|---|
| `fsm.ts` | `GameEngine.processAction()` | Сердце: атомарная транзакция Immer, валидация владельца, маршрутизация. |
| `interrupts.ts` | `drainInterrupts()`, `resolveInterrupt()` | Каскад прерываний, пауза на решении. |
| `setup.ts` | `createInitialGameState(seed)` | Детерминированная подготовка: тайлы 5+11+5 из 9, мешок по числу игроков, колоды, персонажи. |
| `cardsPayment.ts` | `validatePayment()`, `drawCardsToLimit()` | Оплата сбросом карт действий, запрет Заражения, добор до 5/6. |
| `turnCycle.ts` | `advanceTurn()`, `startNewRound()` | Микроходы по кругу, 2 действия, пас, урон от огня. |
| `eventsPhase.ts` | `runEventPhase()` | Оркестратор Фазы Событий 9 шагов (стр. 10): Время/Самоуничтожение → Атаки Чужих → Огонь → Карта События → Улей → проверка конца. |
| `hiveDevelopment.ts` | `resolveHiveDevelopment()` | Шаг 8: жетон из мешка `bag` — Личинка/Крипер в коробку + замена, Взрослая/Трутень — броски Шума, Королева — в Улей с Контактом или яйцо на планшет (8), Пустой — взрослая из запаса. |
| `eventsPhaseAttacks.ts` | `resolveEventPhaseAttacks()` | Шаг 5: каждый Чужой в Бою атакует, цель — наименьшая рука (Заражение считается), жетон Первого при равенстве. |
| `eventCardMovement.ts` | `resolveEventCardMovement()`, `playEventCard()` | Шаг 7а: карта События, Движение вне Боя по номеру коридора, разрушение дверей, уход в вентиляцию. |
| `eventEffects.ts` | `resolveEventCardEffect()`, `disposeEventCard()` | Шаг 7б: 19 эффектов (`doc/data/EVENTS.md`), судьба: удаление с замешиванием сброса / возврат / сброс. |
| `search.ts` | `validateSearchConditions()`, `placeItemToPlayer()` | Поиск: проверка отсека, 2 карты, выбор 1, тяжёлые в руки. |
| `roomAbilities.ts` | `executeRoomAbility()` | 11 базовых комнат «1» + логика особых. |
| `sanitizer.ts` | `filterStateForPlayer()` | Фильтр скрытой информации. |
| `markers.ts` | `placeFireMarker()`, `placeMalfunctionMarker()` | Лимиты 8/8/30/12, гибель корабля. |
| `contact.ts` | `resolveContact()` | Контакт: сброс шума, жетон из мешка `bag`, BLANK, Личинка-заражение, очередь Внезапной. |
| `shoot.ts` | `executeShoot()`, `checkInjuryResult()` | Стрельба: боезапас, кубик Боя, Стойкость, Отступление по карте События. |
| `intruderRetreat.ts` | `resolveIntruderRetreat()` | Отступление: карта События задаёт коридор, дверь/вентиляция/остаться. |
| `melee.ts` | `executeMelee()` | Рукопашная: Заражение до броска, 2 Раны=1, промах=Тяжёлая. |
| `weaknesses.ts` | `isWeaknessRevealed()` | Предикат раскрытых Слабостей. |
| `heavyObjects.ts` | `executePickUpObject()` | Поднять тяжёлый объект [1] в руку. |
| `escape.ts` | `resolveEscapeAttack()` | Побег: атаки в спину FAQ Rules 5, затем шаг и Шум. |
| `combatStatus.ts` | `isRoomInCombat()` | Статус Боя для блокировок. |
| `intruderPlacement.ts` | `placeIntruder()` | Миниатюры vs жетоны, лимиты 8/2/1. |
| `intruderAttacks.ts` | `performIntruderAttack()` | Ядро Атаки: 8 эффектов, Трансформация, Зов с подавлением. |
| `characterDamage.ts` | `sufferLightWounds()`, `killPlayer()` | Травмы, смерть с Трупом, разблокировка капсул. |
| `cardPiles.ts` | `reshuffleDiscard()` | Перетасовка потоком `cards` (n−1 чтений). |
| `combatDie.ts` | `rollCombatDie()` | Кубик Боя 6 граней, поток `combat`. |
| `gameLog.ts` | `appendGameLog()` | Журнал партии. |
| `movement.ts` | `movePlayer()` | Перемещения по открытым коридорам, осторожное движение. |
| `noise.ts` | `resolveNoiseRoll()` | Кубик Шума d10. |
| `noiseMarkers.ts` | `placeNoiseMarker()` | Маркеры Шума 30, причины ROLL/CAREFUL/DANGER/BLANK/EVENT. |
| `playerActions.ts` | `executePass()` | Пас, розыгрыш карты, использование предмета. |
| `roomExploration.ts` | `resolveExploreRoom()` | Вскрытие с жетоном Исследования. |
| `searchActions.ts` | `executeSearch()` | Точка входа поиска и решений. |
| `shipGraphQueries.ts` | `requireOpenPath()`, `corridorsLeadingInto()` | Запросы графа. |
| `classCombatCards.ts` | `executeCombatCard()` | Боевые классовые карты, переброс кубика. |
| `devActions.ts` | `executeToggleDoor()` | Dev-инструменты (IS_DEV). |

### C. Данные (`src/data/`)

| Файл | Константы | Назначение |
|---|---|---|
| `shipGraph.ts` | `SHIP_ROOM_NODES` 21, `SHIP_CORRIDORS` 29 | Геометрия поля, techNumbers (8 отсеков с входами). |
| `roomDefinitions.ts` | `BASIC_ROOMS_1` 11, `ADDITIONAL_ROOMS_2` 9, `SPECIAL_ROOMS` 5 | Свойства комнат: цвет, компьютер, действие. Цвета: ARMORY RED, COMM YELLOW, INFIRMARY GREEN, LAB GREEN, GENERATOR YELLOW, ESCAPE WHITE, FIRE_CONTROL YELLOW, NEST RED, STORAGE RED, SURGERY GREEN, AIRLOCK YELLOW, CABINS WHITE, CANTEEN GREEN, COMMAND_CENTER YELLOW, ENGINE_CONTROL YELLOW, HATCH_CONTROL GREEN, OBSERVATION RED, SLIME WHITE, SHOWER WHITE. |
| `actionCards.ts` | `ACTION_CARDS_BY_CHARACTER` 60 | 6×10 карт действий. |
| `itemCards.ts` | RED 30, YELLOW 30, GREEN 30 | Колоды стола 90. |
| `startingItems.ts` | `STARTING_WEAPONS` 6 | Револьвер 6, Дробовик 2, Обрез 2, Боевая винтовка 5, Энерговинтовка 4, Пистолет 3. |
| `crafting.ts` | 4 рецепта, 12 карт | Антидот, Тазер, Огнемёт 4, Молотов. |
| `contaminationCards.ts` | 27 (7 инфицированных) | Заражение. |
| `seriousWounds.ts` | 16 (4×4) | Травмы: нога/рука/спина/кровотечение. |
| `intruderAttacks.ts` | 20 | Атаки Чужих с эффектами. |
| `weaknesses.ts` | 8 | Слабости: 3 в слоты при подготовке. |
| `combatDie.ts` | 6 граней (2 промаха) | Кубик Боя. |
| `noiseDie.ts` | 10 граней (1-4×2 + Тишина + Опасность) | Кубик Шума. |
| `intruderMiniatures.ts` | лимиты 6/3/8/2/1 | Миниатюры. |
| `eventCards.ts` | 20 | События: 9 охота, 3 шум, 7 разрушение, 1 двери. |
| `explorationTokens.ts` | 20 (44 предмета) | Жетоны Исследования: 16 в партии. |
| `intruderPool.ts` | 27 жетонов, ADULT_ESCAPE_NUMBERS | Пул Чужих: 1 Пустой, 4 Личинки, 1 Крипер, 1 Королева, 3+1×игроков Взрослых + запас. |
| `cardsSetup.ts` | `createInitialDecks()` | Сборка колод по сиду. |
| `setup.ts` | константы подготовки | Капсулы по игрокам, треки 15/8, 2 слота рук, 2 цели, 3 взрослых база, координаты 4. |

---

## 3. Карта клиента (`packages/client/`)

### A. Корень и состояние

| Файл | Назначение | Экспорты |
|---|---|---|
| `App.tsx` | Каркас UI, HUD (раунд, фаза, активный, время, сид, dev). | `App` |
| `store/gameStore.ts` | Zustand-стор: `view`, `selectedRoomId`, `rejection`. | `useGameStore` |
| `services/transport/` | `ITransport`, `LocalInMemoryTransport`, `createLocalTransport` — изоляция движка. | — |
| `services/session/` | `sessionStorage.ts`, `seed.ts` — сохранение и сид. | — |

### B. Компоненты (`src/components/`)

| Компонент | Роль | Движок |
|---|---|---|
| **Карта** `board/ShipMapSVG.tsx`, `RoomHex.tsx`, `CorridorEdge.tsx`, `TechCorridorHub.tsx`, `VentShaftTraces.tsx`, `intruderMapModel.ts`, `intruderShapes.ts`, `IntruderBadge.tsx`, `BoardAnimationLayer.tsx` | SVG-карта 21/29, двери, шум, огонь, поломки, фишки, Чужие (масштабы, аура Трутня/Королевы, сетка 3+ типов, рамка В Бою), Технические Коридоры с трассами, анимации перемещений 750мс. | `selectRoom`, `openTechnicalCorridors`, дифф `SanitizedGameState`. |
| **Презентация Фазы Событий** `events/EventPhaseModal.tsx`, `eventPhasePresentation.tsx`, `EventPhaseBanner.tsx` | Оверлей 6 шагов Фазы Событий, баннер атак, подсветка отсеков `isHighlighted`. | Читает `gameLog`. |
| **Инспектор** `inspector/RoomInspector.tsx`, `TechCorridorPanel.tsx`, `RoomStatusGrid.tsx`, `FloorObjectsPanel.tsx`, `LaboratoryPanel.tsx`, `CarefulMovePanel.tsx`, `DisengagePanel.tsx`, `EscapeConfirmDialog.tsx` | Инфо отсека, кнопки действий, тяжёлые объекты на полу, Лаборатория, осторожное движение, отход, подтверждение Побега. | `ACTION_MOVE`, `ACTION_SEARCH`, `ACTION_ROOM_ABILITY`, `ACTION_PICK_UP_OBJECT`. |
| **Рука** `hand/PlayerHandPanel.tsx`, `HandConfirmModals.tsx` | Карты руки, цена, мультиселект, пас, счётчик 0/2, инвентарь/травмы. | `ACTION_PASS`, `ACTION_PLAY_CARD`, `ACTION_USE_ITEM`. |
| **Контакт** `contact/ContactOverlay.tsx`, `ContactModal.tsx`, `IntruderSilhouette.tsx` | Окна силуэта, Внезапной, боя, Побега. | Читает `gameLog`. |
| **Решения** `modals/DecisionModal.tsx` | Модалки `pendingDecision`: белая колода, поиск 1 из 2, сброс тяжёлого, цели, Подготовка 1 из 3, Пожарный контроль, Генератор, отдых, переброс. | `ACTION_RESOLVE_DECISION`. |
| **Новая партия** `modals/CharacterSelectModal.tsx`, `CardDetailsModal.tsx` | Выбор класса и сида, просмотр карты. | Транспорт / не меняет партию. |
| **Бой** `combat/ShootModal.tsx`, `MeleeModal.tsx`, `CombatActionButtons.tsx` | Стрельба/рукопашная, выбор оружия/цели, цена, отказы. | `ACTION_SHOOT`, `ACTION_MELEE`. |
| **Журнал** `log/GameLogPanel.tsx`, `gameLogModel.ts`, `intruderLogModel.ts`, `eventEffectLogModel.ts` | История ходов, 19 итогов Событий, 6 Улья. | Читает `view.gameLog`. |
| **Dev** `dev/DevPanel.tsx` | Переключение дверей/шума, сырое состояние (IS_DEV). | `DEV_TOGGLE_DOOR/NOISE`. |
| **HUD** `hud/SeedChip.tsx` | Сид с копированием. | `view.meta.seed`. |

---

## 4. Оригинальные материалы (`doc/original/`)

10 файлов PnP ~105 МБ, git-коммит `d0e4c67`, Adobe Illustrator CC 23.0, без текстового слоя — источник истины визуальный, набранные — `doc/rules.md` + `doc/data/*`, provenance — `doc/sources/data-sources.json`.

| Файл | Формат | Содержимое | Связь с кодом |
|---|---|---|---|
| `rules.pdf` | 31 стр. | Книга правил. | Первоисточник `doc/rules.md`, сноски в `logic/*`. |
| `cards_base.pdf` | 42 стр., 9 карт/лист | Атаки, травмы, памятки, действия классов, цели, драфт (в т.ч. МЕДИК промо). | `INTRUDER_ATTACK_CARDS`, `SERIOUS_WOUND_CARDS`, `ACTION_CARDS_BY_CHARACTER`. |
| `cards_additional.pdf` | 18 стр., 16 карт/лист | Предметы малые: изолента, инструменты, огнетушитель, скафандр, химикаты, одежда, энергозаряд, аптечка, граната, приманка, молотов, тазер, огнемёт, прототипы, стимуляторы, броня, набор хирурга, инъектор, ключ, сканер. | `RED/YELLOW/GREEN_ITEM_CARDS`, `CRAFTED_ITEM_CARDS`, `STARTING_WEAPONS`. |
| `dices.pdf` | 1 стр. | Наклейки кубиков: Шум 1-4×2 + Тишина + Опасность, Бой 6 граней (2 промаха). | `COMBAT_DIE_FACES`, `NOISE_DIE_FACES`. |
| `engines.pdf` | 2 стр. | Жетоны Двигатель 1/2/3 по 2 шт. | `EngineState { isWorking }`. |
| `fixes.pdf` | 2 стр. эррата | 3×Погоня, Реанимация, Оставить, Старый друг, Повадки атаки, Защита кладки, Неисправность. | Исправленные тексты в данных. |
| `map_fragments.pdf` | 16 стр. | Фрагменты поля 01-08 основное/альтернативное. | `shipGraph.ts`. |
| `map_full.jpg` | 7978×5456 | Собранное поле 21 слот, коридоры, вентиляция, треки 15/8, капсулы, Улей. | `SHIP_ROOM_NODES`, `SHIP_CORRIDORS`. |
| `roles.pdf` | 4 стр. планшеты | 7 планшетов (КАПИТАН, ПИЛОТ, МЕХАНИК, СОЛДАТ, УЧЁНЫЙ, СКАУТ + МЕДИК промо), рецепты, треки, ПЛАНШЕТ ЧУЖИХ (Слабости, Яйца 8). | `CharacterClass` 6 из 7, `CRAFTING_RECIPES`, `HIVE_EGG_CAPACITY`. |
| `rooms.pdf` | 11 стр. тайлы | Гексы 1/2 + особые, жетоны: пожар 8, неисправность 8, шум 30, яйца 8, 12 дверей, исследование 20, коридоры 1-5. | `BASIC_ROOMS_1` 11, `ADDITIONAL_ROOMS_2` 9, `SPECIAL_ROOMS` 5, лимиты 8/8/30/12. |

Регламент: новые файлы — только оригиналы; расхождение «картон ↔ данные» — чинится в данных + provenance.

---

## 5. Регламент правок

```
Цель:  <Что меняется в правилах/интерфейсе>
Где:   <Пакет> → <Файл> → <Функция/Компонент>
Связи: <Тесты, покрывающие место>
```

Золотые правила:
1. Правила — только `packages/shared/src/logic/`, клиент не мутирует стейт напрямую, только `dispatch`.
2. Zero Cheating — клиент видит мир через `filterStateForPlayer`.
3. Перед коммитом — `npm run verify` (typecheck, lint, format:check, test 989/82).
