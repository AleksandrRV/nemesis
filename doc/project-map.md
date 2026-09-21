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
| `state.ts` | `GameState`, `ShipState`, `GameMeta`, `CoordinatesState`, `IntrudersPoolState` | Главный корневой контракт состояния всей партии (версия схемы `GAME_STATE_SCHEMA_VERSION = 4`). |
| `actions.ts` | `EngineAction`, `GameAction`, `DevAction`, `RoomAbilityPayload` | Все легальные действия игроков (`ACTION_MOVE`, `ACTION_SEARCH`, `ACTION_ROOM_ABILITY`, `ACTION_PASS`, и др.) и dev-инструменты. |
| `cards.ts` | `ActionCard`, `ItemCard`, `CraftedItemCard`, `ContaminationCard`, `SeriousWoundCard`, `IntruderAttackCard` | Структура колод, предметов крафта, личных карт действий, карт заражения и атак Чужих. |
| `rooms.ts` | `RoomState`, `RoomDefinition`, `CorridorConnection`, `ExplorationEffect` | Модель комнат, дверей (OPEN/CLOSED/DESTROYED), коридоров и эффектов жетонов исследования. |
| `entities.ts` | `PlayerState`, `CharacterClass`, `IntruderToken`, `IntruderEntity`, `BoardObject`, `HandSlotContent` | Персонажи (6 классов), слоты рук (2 слота под тяжёлое), инвентарь, жетоны и особи Чужих (у особи — отложенный жетон, у персонажа — Личинка на планшете). |
| `decisions.ts` | `PendingDecision` | Контракт отложенных интерактивных решений игрока (`CHOOSE_SEARCH_ITEM`, `CHOOSE_WHITE_ROOM_DECK`, `CHOOSE_AIMED_REROLL`, и др.). |
| `sanitized.ts` | `SanitizedGameState`, `SanitizedPlayerState`, `SanitizedRoomState` | Контракт отфильтрованного среза состояния: всё скрытое строго типизировано как `null` / счетчики. |
| `log.ts` | `GameLogEntry`, `GameLogPayload` | События публичного журнала партии (перемещения, шум, обыск, использование консолей). |
| `interrupts.ts` | `InterruptEvent` | Стек прерываний движка (`EXPLORE_ROOM_INTERRUPT`, `NOISE_ROLL_INTERRUPT`). |

### B. Логика движка и правила (`packages/shared/src/logic/`)

| Модуль / Файл | Ключевые функции | Что делает |
|---|---|---|
| `fsm.ts` | `GameEngine.processAction()`, `drainInterrupts()`, `resolveInterrupt()`, `findAdjacentOpenRoomIds()` | **Сердце игрового движка**: атомарное применение действий к копии стейта (Immer), каскадный разбор прерываний (вскрытие отсека, кубик Шума, Контакт, Внезапная атака, Побег). |
| `setup.ts` | `createInitialGameState(seed)` | Детерминированная подготовка партии по сиду: расклад тайлов комнат, мешка Чужих, колод стола и раздача персонажей. |
| `cardsPayment.ts` | `validatePayment()`, `executeCardPayment()`, `drawCardsToLimit()`, `getPlayerHandLimit()` | Единый валидатор оплаты действий сбросом карт действий с руки, запрет оплаты Заражением, добор карт в начале раунда. |
| `turnCycle.ts` | `advanceTurn()`, `startNewRound()`, `findNextActivePlayer()`, `applyFireEndTurnEffect()` | Цикл микроходов: порядок игроков по кругу, учёт 2 действий, передача хода, урон от огня при завершении хода, запуск нового раунда. |
| `search.ts` | `validateSearchConditions()`, `drawSearchCards()`, `placeItemToPlayer()`, `getRoomDeckColor()` | Логика действия «Поиск»: проверка условий отсека, добор 2 карт из колоды, помещение в инвентарь или в руки. |
| `roomAbilities.ts` | `executeRoomAbility()` | Выполнение базовых действий 11 комнат категории «1» (Оружейная, Радиорубка, Лазарет, Генератор, Пожарная система, Улей, Лаборатория, Капсулы, Операционная). |
| `sanitizer.ts` | `filterStateForPlayer(state, viewingPlayerId)` | **Фильтр скрытой информации**: вырезает чужие руки, инвентарь, неисследованные тайлы и приватные решения других игроков. |
| `markers.ts` | `placeFireMarker()`, `placeMalfunctionMarker()`, `placeDoorToken()`, `noiseMarkersInSupply()` | Правила лимитов маркеров пожара (8), поломок (8), шума (30) и дверей (12). Условия гибели корабля. |
| `gameLog.ts` | `appendGameLog()` | Добавление типизированных событий в публичный журнал партии. |
| `contact.ts` | `resolveContactInterrupt()`, `resolveSurpriseAttackInterrupt()`, `resolveEscapeAttacks()`, `dealLightWounds()`, `dealSeriousWounds()`, `killPlayer()` | Розыгрыш Контакта, Внезапной атаки и Побега: сброс Шума, жетон из мешка, эффекты карт Атак, раны и смерть персонажей. |
| `combat.ts` | `performShoot()`, `validateShootConditions()`, `combatDieWoundsForShoot()`, `performMelee()`, `validateMeleeConditions()`, `combatDieWoundsForMelee()`, `resolveIntruderWounds()`, `killIntruder()`, `retreatIntruder()`, `performBurstFire()`, `applyShootFace()`, `drawCombatFace()` | Базовые действия «Стрельба» и «Рукопашная Атака» [1] + классовая «Стрельба очередью»: боезапас, кубик Боя через поток `combat`, особые свойства оружия, проверка Стойкости, гибель и стадийное отступление Чужих. |
| `objects.ts` | `performPickUpObject()`, `validatePickUpConditions()` | Базовое действие «Поднять Тяжёлый Объект» [1]: Труп, Останки или Яйцо с пола в свободный слот руки. |

### C. Статические данные и баланс (`packages/shared/src/data/`)

| Файл | Константы / Данные | Назначение |
|---|---|---|
| `shipGraph.ts` | `SHIP_ROOM_NODES`, `SHIP_CORRIDOR_EDGES` | Геометрический и логический граф корабля (21 отсек, коридоры, связи с вентиляцией). |
| `roomDefinitions.ts` | `BASIC_ROOMS_1`, `ADDITIONAL_ROOMS_2`, `SPECIAL_ROOMS` | Свойства комнат: тип, цвет колоды обыска, наличие компьютера, стоимость и текст действий. |
| `actionCards.ts` | `ACTION_CARDS_BY_CLASS` | Все 60 карт действий персонажей (по 10 на каждый из 6 классов) со стоимостью и текстом. |
| `itemCards.ts` | `RED_ITEM_CARDS`, `YELLOW_ITEM_CARDS`, `GREEN_ITEM_CARDS` | Колоды предметов стола: военные (30), технические (30), медицинские (30). |
| `startingItems.ts` | `STARTING_WEAPONS` | Стартовое оружие персонажей (включая разделение на классическое оружие и энергооружие). |
| `crafting.ts` | `CRAFTING_RECIPES`, `CRAFTED_ITEMS` | 4 рецепта и 12 карт колоды создаваемых предметов. |
| `weaknessCards.ts` | `WEAKNESS_CARDS` | 7 карт Слабостей Чужих (тексты — doc/data/INTRUDERS.md §6, восьмая отсутствует); раздаются в сетапе. |
| `contaminationCards.ts`| `CONTAMINATION_CARDS_DECK` | 27 карт заражения (7 инфицированных, 20 стерильных). |
| `seriousWounds.ts` | `SERIOUS_WOUNDS_DECK` | 16 карт тяжёлых травм (по 4 на руку, ногу, тело, кровотечение). |
| `noiseDie.ts` | `NOISE_DIE_FACES` | Грани кубика Шума d10 (номера 1..4, Тишина, Опасность). |
| `combatDie.ts` | `COMBAT_DIE_FACES`, `rollCombatDie` | Грани кубика Боя d6 (Промах ×2, Хвост, Силуэты, 1 и 2 Раны) и бросок через поток `combat`. |
| `intruderAttacks.ts` | `INTRUDER_ATTACK_CARDS` | 20 карт Атак Чужих: стойкость, отступление, типы атакующих и эффекты. |

---

## 3. Карта клиентского приложения (`packages/client/`)

### A. Корневой слой и состояние

| Файл | Назначение | Главные экспорты |
|---|---|---|
| `App.tsx` | Корневой каркас UI, верхний HUD (раунд, фаза, активный игрок, трек времени, сид, dev-кнопка), сборка слоёв карты и панелей. | `App` |
| `store/gameStore.ts` | Клиентский Zustand-стор: хранит отфильтрованное состояние `view`, выбранный отсек `selectedRoomId`, ошибки движка `rejection` и отметку показанных модалок Контакта. | `useGameStore` |
| `services/transport/` | Транспортный слой изоляции: `LocalInMemoryTransport` исполняет действия в `GameEngine` браузера и сохраняет снапшоты в `localStorage`. | `LocalInMemoryTransport`, `createLocalTransport` |
| `services/session/` | Хранилище сессий (`sessionStorage.ts`) и генерация сида (`seed.ts`). | `createLocalSessionStorage`, `createSeed` |

### B. Компоненты интерфейса (`packages/client/src/components/`)

| Компонент / Файл | Роль в интерфейсе | Взаимодействие с движком |
|---|---|---|
| **Карта корабля**<br>`board/ShipMapSVG.tsx`<br>`board/RoomHex.tsx`<br>`board/CorridorEdge.tsx` | Интерактивная векторная карта корабля с панорамированием и зумом (`react-zoom-pan-pinch`). Отображает комнаты, коридоры, двери, фишки игроков и Чужих (значок цветом типа, счётчик ран), маркеры шума/пожара/поломки. | Клик по комнате вызывает `selectRoom(id)`. |
| **Инспектор отсека**<br>`inspector/RoomInspector.tsx` | Боковая/нижняя панель информации об отсеке (исследованность, предметы, компьютер, огонь, поломка, игроки, Чужие в отсеке). Контекстные кнопки: переход (`ACTION_MOVE`), обыск (`ACTION_SEARCH`), консоль отсека (`ACTION_ROOM_ABILITY`). | Отправляет `dispatch(ACTION_MOVE)`, `dispatch(ACTION_SEARCH)`, `dispatch(ACTION_ROOM_ABILITY)`. |
| **Панель руки игрока**<br>`hand/PlayerHandPanel.tsx` | Нижняя выдвижная панель карт руки: отображает карты действий и заражения, цену сброса, мультиселект карт для оплаты, кнопку Паса, счётчик оставшихся действий в микроходе (0/2, 1/2), а также выдвижной инвентарь (слоты рук, предметы, травмы) и наведение классовых боевых карт (`hand/CardTargetingForm.tsx`: цель, оружие, отсек, спутник, режим). | Отправляет `dispatch(ACTION_PASS)` со сбросом выбранных карт и `dispatch(ACTION_PLAY_CARD)` с наведением. |
| **Модальные окна решений**<br>`modals/DecisionModal.tsx` | Всплывающие модальные окна для интерактивных решений `pendingDecision`: выбор колоды в белой комнате (`CHOOSE_WHITE_ROOM_DECK`), выбор 1 из 2 карт поиска (`CHOOSE_SEARCH_ITEM`), сброс тяжёлого предмета (`DISCARD_HEAVY_ITEM_FOR_NEW`), переброс Прицельного огня (`CHOOSE_AIMED_REROLL`). | Отправляет `dispatch(ACTION_RESOLVE_DECISION)`. |
| **Модалка Контакта**<br>`modals/ContactModal.tsx`<br>`modals/contactModalModel.ts` | Всплывающее окно «КОНТАКТ!»: вытянутый жетон, число Бегства, баннер первого Контакта и исходы Внезапной атаки. | Читает `view.gameLog`, закрытие запоминает в сторе (`dismissedContactSequence`). |
| **Журнал событий**<br>`log/GameLogPanel.tsx`<br>`log/gameLogModel.ts` | Нижняя сворачиваемая панель истории ходов и событий партии: форматирует лог с семантической подсветкой сущностей. | Читает `view.gameLog`. |
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
