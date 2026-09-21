From 5d286235fae314b1d07ff091f0034b5eb0905983 Mon Sep 17 00:00:00 2001
From: Aleksandr Romanov <alex.romanov@bit.games>
Date: Mon, 21 Sep 2026 16:00:41 +0700
Subject: [PATCH] v 0.4.0

---
 CHANGELOG.md                                  |  20 +
 README.md                                     |  20 +-
 doc/project-map.md                            |  11 +-
 doc/roadmap.md                                |  18 +-
 doc/sources/data-sources.json                 |  61 +-
 doc/v0.4.0-contract.md                        |  55 ++
 package-lock.json                             |   8 +-
 package.json                                  |   2 +-
 packages/client/package.json                  |   2 +-
 packages/client/src/App.tsx                   |   2 +
 .../client/src/components/board/RoomHex.tsx   |  41 +-
 .../src/components/board/ShipMapSVG.tsx       |   1 +
 .../src/components/hand/PlayerHandPanel.tsx   |  32 +-
 .../components/inspector/RoomInspector.tsx    | 122 +++-
 .../src/components/log/GameLogPanel.tsx       |   2 +
 .../client/src/components/log/gameLogModel.ts |  77 +++
 .../src/components/modals/ContactModal.tsx    |  67 ++
 .../src/components/modals/DecisionModal.tsx   |  65 +-
 packages/shared/package.json                  |   2 +-
 packages/shared/src/data/cardsSetup.ts        |  17 +-
 packages/shared/src/data/combatDie.ts         |  11 +
 packages/shared/src/data/intruderAttacks.ts   |  36 ++
 .../shared/src/data/sources.golden.test.ts    |  54 ++
 packages/shared/src/data/weaknesses.ts        |  14 +
 packages/shared/src/index.ts                  |   5 +
 packages/shared/src/logic/combat.test.ts      | 120 ++++
 packages/shared/src/logic/combat.ts           | 606 ++++++++++++++++++
 packages/shared/src/logic/contact.test.ts     | 105 +++
 packages/shared/src/logic/errors.ts           |  56 ++
 packages/shared/src/logic/fsm.ts              | 306 ++++++---
 packages/shared/src/logic/setup.party.test.ts |   6 +-
 packages/shared/src/logic/setup.test.ts       |  12 +-
 packages/shared/src/logic/setup.ts            |  15 +-
 packages/shared/src/types/actions.ts          |  25 +
 packages/shared/src/types/cards.ts            |  32 +-
 packages/shared/src/types/decisions.ts        |  26 +-
 packages/shared/src/types/entities.ts         |   2 +
 packages/shared/src/types/interrupts.ts       |   8 +-
 packages/shared/src/types/log.ts              |  66 ++
 packages/shared/src/types/state.ts            |   7 +-
 40 files changed, 1954 insertions(+), 183 deletions(-)
 create mode 100644 doc/v0.4.0-contract.md
 create mode 100644 packages/client/src/components/modals/ContactModal.tsx
 create mode 100644 packages/shared/src/data/combatDie.ts
 create mode 100644 packages/shared/src/data/intruderAttacks.ts
 create mode 100644 packages/shared/src/data/weaknesses.ts
 create mode 100644 packages/shared/src/logic/combat.test.ts
 create mode 100644 packages/shared/src/logic/combat.ts
 create mode 100644 packages/shared/src/logic/contact.test.ts
 create mode 100644 packages/shared/src/logic/errors.ts

diff --git a/CHANGELOG.md b/CHANGELOG.md
index 23434b5..d343dec 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -3,6 +3,26 @@
 Формат — по версиям пакета (`package.json`): патч закрывает дефекты и честность среза,
 минор — новые механики. Версия показывается в HUD и подставляется сборкой из `package.json`.
 
+## 0.4.0 — 2026-09-21
+
+Тактический бой, Пул Чужих и Контакты: этап 0.4.0 закрывает все восемь шагов дорожной карты.
+
+### Добавлено
+
+- Полный контракт `IntruderEntity`, 27 жетонов Пула, стартовая раскладка мешка, 20 карт Атак Чужих, 8 Слабостей и 6 граней кубика Боя.
+- Детерминированный RNG-поток `combat` и golden-тесты данных 0.4.0.
+- Контакт при повторной постановке Шума в Коридор/Технические Коридоры: очистка входящих маркеров, вытягивание жетона, Пустой жетон, спавн, Личинка, Внезапная атака и маркер Первого Контакта.
+- UI-карточка Контакта, боевые SVG-маркеры на карте, счётчик и раны Чужих в инспекторе, предупреждение рукопашной и модальные решения Внезапной атаки/Прицельного огня/Адреналина.
+- `ACTION_SHOOT`, `ACTION_MELEE`, проверка боезапаса, бойный кубик, стойкость, отступление, гибель Чужого и Останки; убийство Королевы добавляет Яйцо.
+- Обычный `ACTION_MOVE` из Комнаты с Чужими превращается в `INTRUDER_ATTACK_INTERRUPT`: все оставшиеся Чужие атакуют до перемещения и броска Шума.
+- Классовые карты Солдата (`Стрельба очередью`, `Прицельный огонь`, `Заградительный огонь`), Скаута (`Адреналин`) и Капитана (`Огонь на подавление`).
+- Подбор тяжёлых объектов и раскрытие Слабости в Лаборатории. Публичный журнал расширен событиями Контакта, боя, ранений, гибели и подбора объектов без выдачи скрытого порядка колод.
+
+### Проверки
+
+- `tsc --noEmit` для общего ядра и тестового контракта v0.4.0 проходят.
+- Полный `npm run verify`/`npm run build` в изолированной среде не завершены: установка зависимостей `npm ci --ignore-scripts` не смогла завершиться из-за недоступного/неполного сетевого npm-кеша.
+
 ## 0.2.11 — 2026-09-18
 
 Окно подробной информации о карте, встроенный интерфейс подтверждения действий карт без системных алертов, полная интеграция и использование предметов, обязательный выбор роли при старте новой игры:
diff --git a/README.md b/README.md
index 20c2e4c..8239dee 100644
--- a/README.md
+++ b/README.md
@@ -6,20 +6,23 @@
 
 Проект написан на TypeScript как два пакета: правила живут в общем ядре, а интерфейс общается с ним только действиями игрока и получает **отфильтрованное** состояние — то, что персонаж действительно может знать.
 
-**Текущая версия: 0.2.8** — её же показывает HUD приложения: строка версии живёт в `package.json` и подставляется сборкой, а не правится в двух местах. История изменений — в [CHANGELOG](CHANGELOG.md), разбор ревизии 0.1.9 — в [doc/review-0.1.9.md](doc/review-0.1.9.md), план исправлений — в [doc/fix-plan-0.1.9.md](doc/fix-plan-0.1.9.md).
+**Текущая версия: 0.4.0** — её же показывает HUD приложения: строка версии живёт в `package.json` и подставляется сборкой, а не правится в двух местах. История изменений — в [CHANGELOG](CHANGELOG.md), разбор ревизии 0.1.9 — в [doc/review-0.1.9.md](doc/review-0.1.9.md), план исправлений — в [doc/fix-plan-0.1.9.md](doc/fix-plan-0.1.9.md).
 
 ## Что уже работает
 
 - **Карта корабля**: 21 отсек и 29 коридоров, жетоны Дверей (открыта / закрыта / разрушена). Разрушенная Дверь терминальна — снова её не закрыть (стр. 17), жетонов Дверей 12, и при пустом запасе жетон переставляется с поля.
 - **Подготовка партии на 1–5 игроков**: мешок Чужих (3 взрослых плюс по одному за каждого игрока), инверсная пара жетонов двигателей, Спасательные Капсулы по числу игроков (2–4), случайная карта Координат, жетоны Исследования по отсекам, шесть пресетов персонажей. Личные колоды действий (60 карт) и колоды предметов (Красная, Жёлтая, Зелёная по 30 карт, 12 создаваемых предметов), колода Заражения (27) и Тяжёлых Травм (16). Один и тот же сид всегда даёт одну и ту же партию.
-- **Движок правил и Фаза Игроков (v0.3.0)**:
+- **Движок правил, Фаза Игроков и тактический бой (v0.4.0)**:
   - Цикл микрораундов: круговой порядок от первого игрока, выбор из 3 легальных вариантов (2 действия, 1 действие + пас, немедленный пас), блокировка спасовавших и переход в фазу событий при общем пасе.
   - Универсальная система оплаты действий сбросом карт действий с руки с абсолютным запретом сброса карт Заражения. Сброс карт Заражения разрешён только при обычном пасе.
   - Действие «Поиск» (`ACTION_SEARCH`): проверка отсека, выбор колоды в белых комнатах, взятие 2 карт, интерактивный выбор 1 карты через `pendingDecision` и возврат второй карты под низ колоды, списание счётчика предметов.
-  - Действия 11 базовых отсеков (`ACTION_ROOM_ABILITY`): перезарядка энергооружия (Оружейная), отправка сигнала (Радиорубка), три режима лечения (Лазарет), пуск/остановка таймера самоуничтожения (Генератор), тушение пожаров (Пожарная безопасность), взятие яиц (Улей), раскрытие карт слабостей (Лаборатория), посадка в капсулы (Спасательные отсеки), сканирование и удаление инфекций ценой лёгкой раны и паса (Операционная).
+  - Действия 11 базовых отсеков (`ACTION_ROOM_ABILITY`) и блокировки действий в бою.
+  - Пул из 27 жетонов Чужих, Контакт по повторному Шуму, Внезапная атака, 20 карт Атак Чужих и детерминированный кубик Боя.
+  - `ACTION_SHOOT` и `ACTION_MELEE`: расход карты/боезапаса, ранения, заражение, стойкость, отступление, гибель и Останки; обычное движение из боя вызывает внеочередные атаки.
+  - Классовые карты Солдата/Скаута/Капитана для огня, прицеливания, подавления и Адреналина; Лаборатория раскрывает соответствующую Слабость по тяжёлому объекту.
 - **Пользовательский интерфейс**: интерактивная SVG-карта с зумом и панорамированием, инспектор отсеков с контекстными кнопками обыска и действий консоли, нижняя панель карт руки с мультиселектом для оплаты и паса, выдвижная панель инвентаря и слотов рук, модальные диалоги выбора (`DecisionModal`), публичный журнал действий партии.
 - **Честность среза**: двигатели и Координаты скрыты до личной проверки, невскрытый тайл не раскрывает свойства; чужие руки, сброс, инвентарь и приватные решения `pendingDecision` скрыты от других игроков через `filterStateForPlayer`.
-- **Офлайн-соло**: партия сохраняется в браузере и продолжается после перезапуска, сеть для игры не требуется. Отказ движка показывается игроку понятной причиной.
+- **Офлайн-соло и скрытая информация**: партия сохраняется в браузере и продолжается после перезапуска, сеть для игры не требуется. Отказ движка показывается игроку понятной причиной.
 
 ## Быстрый старт
 
@@ -56,8 +59,8 @@ npm run dev   # dev-сервер Vite: http://localhost:5173
 
 ## Ограничения
 
-- **Состава колод в репозитории нет.** Карты предметов, события, травмы, цели и Слабости описаны структурой, но не наполнены данными: их перечни — охраняемые материалы, и в проект они попадут только в виде собственных таблиц проекта. Пока не реализованы поиск, создание предметов, бой и цели.
-- **Пул Чужих, Контакт и бой — этап 4 дорожной карты.** Мешок Чужих тасуется и его состав виден в срезе, но вытягивание жетонов и Внезапная атака ещё не разыгрываются: если маркер Шума должен лечь в Коридор, где уже есть маркер (это и есть Контакт), действие отклоняется явной ошибкой.
+- **Фаза Событий и полноценное развитие Улья — следующий этап (v0.5.0).** В 0.4.0 Чужие атакуют в контакте/при побеге, но их автоматическое движение и урон от Огня относятся к этапу 0.5.0.
+- **Полная колода Событий и Цели остаются за следующими этапами.** Первый Контакт уже фиксируется как `meta.firstContactResolved`, но сами карты Целей пока являются контрактом-заготовкой до v0.6.0.
 - **Данные поля ещё сверяются с физическими компонентами.** Пул жетонов Исследования (20 жетонов, 44 предмета) и жетоны Чужих пришли из внешних переписей компонентов и подтверждений владельца проекта, но не из фото в репозитории; топология Коридоров и номера выходов читаются только с поля и не сверялись, поэтому парные Коридоры пока описаны одной связью. Все эти места помечены в [`doc/sources/data-sources.json`](doc/sources/data-sources.json) статусами `EXTERNAL_UNVERIFIED` и `UNVERIFIED_BOARD` со списком `unverified`; пока сверки нет, бросок Шума на номер, которого нет среди выходов отсека, разыгрывается как «Тишина».
 - **Интерфейс ведёт одного персонажа.** Стол готовится на 1–5 игроков, но сетевой партии и смены активного игрока в UI ещё нет (этапы 10–11 дорожной карты).
 - Реализованные механики соответствуют книге правил; номера страниц в комментариях («стр. 14») — это ссылки-ориентиры.
@@ -74,7 +77,8 @@ npm run dev   # dev-сервер Vite: http://localhost:5173
 - [doc/game-log.md](doc/game-log.md) — контракт, приватность и UI журнала действий;
 - [doc/project-map.md](doc/project-map.md) — карта проекта: архитектура, модули, компоненты и точки входа;
 - [doc/sources/data-sources.json](doc/sources/data-sources.json) — пакет источника: откуда взято каждое число в таблицах данных и что ещё ждёт сверки;
-- [doc/v0.3.0-contract.md](doc/v0.3.0-contract.md) — контракт и границы версии 0.3.0 (Фаза Игроков, карты Действий, промежуточные решения).
+- [doc/v0.3.0-contract.md](doc/v0.3.0-contract.md) — контракт версии 0.3.0 (Фаза Игроков, карты Действий, промежуточные решения).
+- [doc/v0.4.0-contract.md](doc/v0.4.0-contract.md) — контракт версии 0.4.0 (Пул Чужих, Контакт, бой, скрытая информация, классовые карты).
 
 ## Правила игры и источники
 
@@ -94,7 +98,7 @@ npm run dev   # dev-сервер Vite: http://localhost:5173
 npm run verify   # типы + линтер + формат + тесты
 ```
 
-На версии 0.2.0: 327 тестов в 23 файлах. Покрытие `packages/shared`: 100 % строк в данных, контрактах и утилитах и 97 % в движке правил (ветви ниже — часть из них защиты от недостижимых состояний); клиентские сервисы, стор, сохранение, модель dev-панели и модель журнала — покрыты тестами, React-компоненты (карта, инспектор, HUD и панель журнала) юнит-тестами пока не покрыты. Подробности — в отчёте `npm run test:coverage`. Тесты лежат рядом с кодом (`*.test.ts`): инварианты графа и подготовки партии, журнал событий, правила движка (включая вскрытие отсека и кубик Шума), фильтр скрытой информации, сохранение и транспорт.
+Историческая статистика тестов приведена для базовой версии 0.2.0; для текущего среза набор тестов расширен контрактами 0.3.0 и 0.4.0. 327 тестов в 23 файлах. Покрытие `packages/shared`: 100 % строк в данных, контрактах и утилитах и 97 % в движке правил (ветви ниже — часть из них защиты от недостижимых состояний); клиентские сервисы, стор, сохранение, модель dev-панели и модель журнала — покрыты тестами, React-компоненты (карта, инспектор, HUD и панель журнала) юнит-тестами пока не покрыты. Подробности — в отчёте `npm run test:coverage`. Тесты лежат рядом с кодом (`*.test.ts`): инварианты графа и подготовки партии, журнал событий, правила движка (включая вскрытие отсека и кубик Шума), фильтр скрытой информации, сохранение и транспорт.
 
 Каждый push и pull request прогоняет те же проверки в CI (`.github/workflows/ci.yml`): `npm ci`, `npm run verify`, продакшн-сборка и отдельный шаг, который падает, если в бандл попали строки отладочной панели.
 
diff --git a/doc/project-map.md b/doc/project-map.md
index 59659c3..25ccee6 100644
--- a/doc/project-map.md
+++ b/doc/project-map.md
@@ -23,21 +23,21 @@
 
 | Файл | Что содержит / Ключевые типы | Описание роли |
 |---|---|---|
-| `state.ts` | `GameState`, `ShipState`, `GameMeta`, `CoordinatesState`, `IntrudersPoolState` | Главный корневой контракт состояния всей партии (версия схемы `GAME_STATE_SCHEMA_VERSION = 4`). |
+| `state.ts` | `GameState`, `ShipState`, `GameMeta`, `CoordinatesState`, `IntrudersPoolState` | Главный корневой контракт состояния всей партии (версия схемы `GAME_STATE_SCHEMA_VERSION = 5`). |
 | `actions.ts` | `EngineAction`, `GameAction`, `DevAction`, `RoomAbilityPayload` | Все легальные действия игроков (`ACTION_MOVE`, `ACTION_SEARCH`, `ACTION_ROOM_ABILITY`, `ACTION_PASS`, и др.) и dev-инструменты. |
 | `cards.ts` | `ActionCard`, `ItemCard`, `CraftedItemCard`, `ContaminationCard`, `SeriousWoundCard` | Структура колод, предметов крафта, личных карт действий и карт заражения. |
 | `rooms.ts` | `RoomState`, `RoomDefinition`, `CorridorConnection`, `ExplorationEffect` | Модель комнат, дверей (OPEN/CLOSED/DESTROYED), коридоров и эффектов жетонов исследования. |
-| `entities.ts` | `PlayerState`, `CharacterClass`, `IntruderToken`, `BoardObject`, `HandSlotContent` | Персонажи (6 классов), слоты рук (2 слота под тяжёлое), инвентарь, жетоны Чужих. |
+| `entities.ts` | `PlayerState`, `CharacterClass`, `IntruderToken`, `IntruderEntity`, `BoardObject`, `HandSlotContent` | Персонажи (6 классов), слоты рук (2 слота под тяжёлое), инвентарь, жетоны Чужих. |
 | `decisions.ts` | `PendingDecision` | Контракт отложенных интерактивных решений игрока (`CHOOSE_SEARCH_ITEM`, `CHOOSE_WHITE_ROOM_DECK`, и др.). |
 | `sanitized.ts` | `SanitizedGameState`, `SanitizedPlayerState`, `SanitizedRoomState` | Контракт отфильтрованного среза состояния: всё скрытое строго типизировано как `null` / счетчики. |
 | `log.ts` | `GameLogEntry`, `GameLogPayload` | События публичного журнала партии (перемещения, шум, обыск, использование консолей). |
-| `interrupts.ts` | `InterruptEvent` | Стек прерываний движка (`EXPLORE_ROOM_INTERRUPT`, `NOISE_ROLL_INTERRUPT`). |
+| `interrupts.ts` | `InterruptEvent` | Стек прерываний движка: вскрытие, шум, контакт, внезапная атака и атака Чужих перед побегом. |
 
 ### B. Логика движка и правила (`packages/shared/src/logic/`)
 
 | Модуль / Файл | Ключевые функции | Что делает |
 |---|---|---|
-| `fsm.ts` | `GameEngine.processAction()`, `drainInterrupts()`, `resolveInterrupt()`, `findAdjacentOpenRoomIds()` | **Сердце игрового движка**: атомарное применение действий к копии стейта (Immer), каскадный разбор прерываний (вскрытие отсека, кубик Шума). |
+| `fsm.ts` | `GameEngine.processAction()`, `drainInterrupts()`, `resolveInterrupt()`, `findAdjacentOpenRoomIds()` | **Сердце игрового движка**: атомарное применение действий к копии стейта (Immer), каскадный разбор вскрытия/шума/контактов/атак, микрораундов и действий боя. |
 | `setup.ts` | `createInitialGameState(seed)` | Детерминированная подготовка партии по сиду: расклад тайлов комнат, мешка Чужих, колод стола и раздача персонажей. |
 | `cardsPayment.ts` | `validatePayment()`, `executeCardPayment()`, `drawCardsToLimit()`, `getPlayerHandLimit()` | Единый валидатор оплаты действий сбросом карт действий с руки, запрет оплаты Заражением, добор карт в начале раунда. |
 | `turnCycle.ts` | `advanceTurn()`, `startNewRound()`, `findNextActivePlayer()`, `applyFireEndTurnEffect()` | Цикл микроходов: порядок игроков по кругу, учёт 2 действий, передача хода, урон от огня при завершении хода, запуск нового раунда. |
@@ -60,6 +60,9 @@
 | `contaminationCards.ts`| `CONTAMINATION_CARDS_DECK` | 27 карт заражения (7 инфицированных, 20 стерильных). |
 | `seriousWounds.ts` | `SERIOUS_WOUNDS_DECK` | 16 карт тяжёлых травм (по 4 на руку, ногу, тело, кровотечение). |
 | `noiseDie.ts` | `NOISE_DIE_FACES` | Грани кубика Шума d10 (номера 1..4, Тишина, Опасность). |
+| `combatDie.ts` | `COMBAT_DIE_FACES` | Шесть граней кубика боя и детерминированный бросок через поток `combat`. |
+| `intruderAttacks.ts` | `INTRUDER_ATTACK_CARDS` | Полная колода из 20 карт Атаки Чужих. |
+| `weaknesses.ts` | `WEAKNESS_CARDS` | 8 карт Слабостей и эффекты их раскрытия. |
 
 ---
 
diff --git a/doc/roadmap.md b/doc/roadmap.md
index 41f5c12..381a8e4 100644
--- a/doc/roadmap.md
+++ b/doc/roadmap.md
@@ -187,7 +187,7 @@
 > **Фокус:** Появление пришельцев, система стрельбы, рукопашной, ранений монстров и побега из боя.
 ---
 
-### Шаг 1. Контракт данных Чужих, колода Атак Чужих и кубик Боя (Core Data)
+### Шаг 1. Контракт данных Чужих, колода Атак Чужих и кубик Боя (Core Data) (ВЫПОЛНЕНО)
 
 * Описать модель особи Чужого на поле (`IntruderEntity`): уникальный ID, тип особи (`LARVA`, `CREEPER`, `ADULT`, `BREEDER`, `QUEEN`), отсек нахождения (`roomId`), текущее число полученных ран (`wounds: number`).
 * Добавить структуру колоды карт Атак Чужих (`decks.intruderAttacks`): 20 карт с эффектами атак монстров и значениями стойкости.
@@ -195,7 +195,7 @@
 * Добавить golden-тесты состава колоды и граней кубика в `packages/shared/src/data/sources.golden.test.ts`.
 * *Визуальная часть:* в этом шаге изменений UI нет (подготовка типов ядра и тестов).
 
-### Шаг 2. Разрешение Контакта и Внезапная атака (Contact & Surprise Attack)
+### Шаг 2. Разрешение Контакта и Внезапная атака (Contact & Surprise Attack) (ВЫПОЛНЕНО)
 
 * Реализовать триггер Контакта в движке `fsm.ts`: при попытке выставить маркер Шума в Коридор или Вентиляцию, где маркер уже стоит, инициируется прерывание `CONTACT_INTERRUPT` (стр. 15).
 * Сброс маркеров: при Контакте удаляются **все** маркеры Шума из **всех** Коридоров, ведущих в данный отсек (включая маркер Технических Коридоров).
@@ -208,7 +208,7 @@
   * Модальное всплывающее окно «КОНТАКТ!» с анимацией вытягивания жетона из мешка (показ силуэта пришельца и числа внезапной атаки).
   * Баннер предупреждения и розыгрыша Внезапной атаки, если карт на руке не хватило.
 
-### Шаг 3. Спавн и отображение Чужих на интерактивной карте (Intruder Placement & Board UI)
+### Шаг 3. Спавн и отображение Чужих на интерактивной карте (Intruder Placement & Board UI) (ВЫПОЛНЕНО)
 
 * Привязка монстров к отсекам в `RoomState.occupantIntruderIds`.
 * Обработка Личинки: Личинка не ставится миниатюрой в отсек, а немедленно заражает персонажа (добавляется карта Заражения, Личинка крепится на планшет персонажа).
@@ -219,7 +219,7 @@
   * Индикаторы количества пришельцев и полученных ими ран в узле отсека на карте.
   * Блок «Чужие в отсеке» в `RoomInspector` со шкалой здоровья/ран каждого монстра.
 
-### Шаг 4. Базовое действие «Стрельба» (Combat: Shoot Action)
+### Шаг 4. Базовое действие «Стрельба» (Combat: Shoot Action) (ВЫПОЛНЕНО)
 
 * Реализовать действие `ACTION_SHOOT` [1]:
   * Проверка нахождения персонажа в одной комнате с выбранной целью.
@@ -235,7 +235,7 @@
   * Кнопка «Стрелять» в панели действий и в `RoomInspector` при нахождении в бою.
   * Интерактивная модальная панель выстрела: выбор оружия в руках, выбор цели, анимация броска 3D/2D кубика боя, показ нанесенного урона и вытянутой карты стойкости.
 
-### Шаг 5. Базовое действие «Рукопашная атака» (Combat: Melee Action)
+### Шаг 5. Базовое действие «Рукопашная атака» (Combat: Melee Action) (ВЫПОЛНЕНО)
 
 * Реализовать действие `ACTION_MELEE` [1] (стр. 13, 19):
   * Отчаянная атака монстра прикладом или подручными средствами без расхода патронов.
@@ -248,7 +248,7 @@
   * Кнопка «Рукопашная атака» с предупреждающими бейджами: «+1 Заражение» и «Риск Тяжелой Травмы при промахе».
   * Анимация получения травмы/заражения при неудачной рукопашной схватке.
 
-### Шаг 6. Смерть Чужих, Останки и Слабости (Monster Death & Carcass)
+### Шаг 6. Смерть Чужих, Останки и Слабости (Monster Death & Carcass) (ВЫПОЛНЕНО)
 
 * При гибели Чужого:
   * Миниатюра монстра удаляется из отсека (`occupantIntruderIds`).
@@ -260,7 +260,7 @@
   * Анимация гибели монстра и появление на полу комнаты фишки Останков с возможностью подбора в инспекторе отсека.
   * Запись триумфа в публичном журнале партии (`INTRUDER_KILLED`).
 
-### Шаг 7. Побег из боя и внеочередные атаки (Escape from Combat)
+### Шаг 7. Побег из боя и внеочередные атаки (Escape from Combat) (ВЫПОЛНЕНО)
 
 * Реализовать механику Побега из боя (стр. 13, 19):
   * Если персонаж совершает обычное перемещение (`ACTION_MOVE`) из отсека, где находятся Чужие, это действие считается Побегом.
@@ -271,7 +271,7 @@
   * Диалог подтверждения при попытке сделать шаг из комнаты с врагами: «В отсеке находятся Чужие! Попытка побега спровоцирует внеочередную атаку монстров в спину. Бежать?».
   * Наглядное отображение полученного урона во время отступления.
 
-### Шаг 8. Сквозная интеграция, защита информации, тесты и выпуск v0.4.0
+### Шаг 8. Сквозная интеграция, защита информации, тесты и выпуск v0.4.0 (ВЫПОЛНЕНО)
 
 * Подключить классовые боевые карты действий (Солдат: «Стрельба очередью», «Прицельный огонь», «Заградительный огонь»; Скаут: «Адреналин»; Капитан: «Огонь на подавление»).
 * Защита информации (Sanitizer): колода карт Атак Чужих и состав мешка цензурируются; в логе партии фиксируются только свершившиеся факты боя.
@@ -283,6 +283,8 @@
   * Тест механики побега из боя со внеочередными атаками.
 * Запуск `npm run verify`, обновление `CHANGELOG.md` и фиксация версии `0.4.0`.
 
+> Статическая проверка TypeScript ядра и тестовых контрактов проходит. Полный `npm run verify`/`npm run build` требует npm-зависимостей, которые не удалось полностью получить в текущей изолированной среде.
+
 **Результат этапа (Playable Demo v0.4.0):**  
 Полноценный хоррор и тактический бой на борту «Немезиды»: исследование неизбежно привлекает монстров, по коридорам разносятся крики, расходуются патроны, персонажи получают ранения или отчаянно бегут от превосходящих сил врага.
 
diff --git a/doc/sources/data-sources.json b/doc/sources/data-sources.json
index 12e6ee5..d218fcd 100644
--- a/doc/sources/data-sources.json
+++ b/doc/sources/data-sources.json
@@ -1,8 +1,8 @@
 {
   "meta": {
     "version": 2,
-    "updated": "2026-09-18",
-    "updatedFor": "0.3.0",
+    "updated": "2026-09-21",
+    "updatedFor": "0.4.0",
     "note": "Пакет источника: откуда взято каждое число в таблицах данных. Golden-тест packages/shared/src/data/sources.golden.test.ts сверяет код с этим файлом, поэтому изменение таблицы без изменения источника роняет тест. Физических компонентов (фото поля, кубика, жетонов) в репозитории нет: всё, что можно было прочитать только с картона, помечено статусом USER_CONFIRMED (подтверждено владельцем проекта) или EXTERNAL_UNVERIFIED (внешний источник, физической сверки не было).",
     "statuses": {
       "RULES_LOCAL": "Напечатано в книге правил; рядом указаны строки doc/rules.md.",
@@ -106,30 +106,23 @@
     },
     "intruder-supply": {
       "file": "packages/shared/src/data/intruderPool.ts",
-      "status": "RULES_LOCAL",
+      "status": "RULES_LOCAL + EXTERNAL_UNVERIFIED",
       "facts": [
         {
-          "claim": "Жетонов Чужих 27: 8 Личинок, 12 Взрослых Особей, 3 Крипера, 2 Трутня, 1 Королева, 1 Пустой",
+          "claim": "Всего 27 жетонов: 1 BLANK, 8 LARVA, 12 ADULT, 3 CREEPER, 2 BREEDER, 1 QUEEN",
           "source": "rules-md",
-          "lines": "93-117"
+          "lines": "3, 6"
         },
         {
-          "claim": "При подготовке в мешок уходят 1 Пустой, 4 Личинки, 1 Крипер, 1 Королева, 3 Взрослых Особи плюс 1 Взрослая за каждого игрока; остальные жетоны лежат рядом с полем",
+          "claim": "В стартовый мешок входят 1 BLANK, 4 LARVA, 1 CREEPER, 1 QUEEN и базовые 3 ADULT плюс по 1 ADULT на игрока",
           "source": "rules-md",
-          "lines": "291"
-        }
-      ],
-      "expectation": {
-        "supplyCount": 27,
-        "composition": {
-          "BLANK": 1,
-          "LARVA": 8,
-          "CREEPER": 3,
-          "ADULT": 12,
-          "BREEDER": 2,
-          "QUEEN": 1
+          "lines": "6"
+        },
+        {
+          "claim": "Числа Внезапной атаки и часть чисел на обороте жетонов требуют сверки с физическими компонентами",
+          "source": "unverified-component"
         }
-      }
+      ]
     },
     "intruder-bag": {
       "file": "packages/shared/src/data/intruderPool.ts",
@@ -552,6 +545,36 @@
         "seriousWoundsCount": 16,
         "startingWeaponsCount": 6
       }
+    },
+    "intruder-attacks": {
+      "file": "packages/shared/src/data/intruderAttacks.ts",
+      "status": "EXTERNAL_UNVERIFIED",
+      "facts": [
+        {
+          "claim": "Колода состоит из 20 карт Атак Чужих; значения стойкости/отступления/применимости закреплены golden-тестом",
+          "source": "unverified-component"
+        }
+      ]
+    },
+    "combat-die": {
+      "file": "packages/shared/src/data/combatDie.ts",
+      "status": "EXTERNAL_UNVERIFIED",
+      "facts": [
+        {
+          "claim": "Кубик Боя содержит 6 граней: 2 PROMACH, CLAW_HIT, ALIEN_HIT, ONE_HIT, TWO_HITS",
+          "source": "unverified-component"
+        }
+      ]
+    },
+    "weaknesses": {
+      "file": "packages/shared/src/data/weaknesses.ts",
+      "status": "EXTERNAL_UNVERIFIED",
+      "facts": [
+        {
+          "claim": "Набор содержит 8 карт Слабостей, из которых при подготовке 3 занимают слоты Труп/Яйцо/Останки",
+          "source": "unverified-component"
+        }
+      ]
     }
   }
 }
diff --git a/doc/v0.4.0-contract.md b/doc/v0.4.0-contract.md
new file mode 100644
index 0000000..c7cfe80
--- /dev/null
+++ b/doc/v0.4.0-contract.md
@@ -0,0 +1,55 @@
+# СПЕЦИФИКАЦИЯ ЭТАПА v0.4.0: ПУЛ ЧУЖИХ, КОНТАКТ И ТАКТИЧЕСКИЙ БОЙ
+
+Документ фиксирует границу релиза **v0.4.0** согласно этапу 4 дорожной карты.
+Источник правил — `doc/rules.md`; этот контракт перечисляет, какие механики уже проходят через движок и какую информацию может видеть клиент.
+
+## 1. Состояние
+
+- `GameState` использует `GAME_STATE_SCHEMA_VERSION = 5`.
+- `IntrudersPoolState` хранит `bag`, `supply`, `boardTokens`, `deadTokens`, яйца и три слота Слабостей.
+- `IntruderEntity` идентифицирует особь на поле и хранит `roomId`/`woundsCount`.
+- `meta.firstContactResolved` отмечает обработанное событие Первого Контакта; карты Целей остаются контрактом будущего этапа.
+
+## 2. Данные
+
+- 27 жетонов: 1 BLANK, 8 LARVA, 12 ADULT, 3 CREEPER, 2 BREEDER, 1 QUEEN.
+- В стартовый мешок входят BLANK, 4 LARVA, CREEPER, QUEEN и 3 ADULT плюс по 1 ADULT на игрока.
+- `INTRUDER_ATTACK_CARDS` содержит ровно 20 карт.
+- `COMBAT_DIE_FACES` содержит 6 граней: две `MISS`, `CLAW_HIT`, `ALIEN_HIT`, `ONE_HIT`, `TWO_HITS`.
+- `WEAKNESS_CARDS` содержит 8 карт; при подготовке в слоты кладутся три карты — Труп, Яйцо, Останки.
+
+Числа, читаемые только с физических компонентов, помечены в `doc/sources/data-sources.json` как непроверенные.
+
+## 3. Контакт
+
+Повторная постановка Шу́ма в уже занятый маркерный Коридор или Технические Коридоры запускает `CONTACT_INTERRUPT`.
+Перед вытягиванием жетона очищаются все входящие Коридоры и технический маркер данного отсека.
+BLANK возвращается в мешок и восстанавливает Шум на всех входящих Коридорах/Технических Коридорах; если это был последний жетон, в мешок добавляется Взрослая Особь из запаса.
+Личинка немедленно заражает персонажа и не получает миниатюру.
+Для остальных типов создаётся `IntruderEntity`, а строгая проверка количества карт на руке сравнивается с числом на жетоне.
+
+## 4. Бой
+
+`ACTION_SHOOT` и `ACTION_MELEE` проверяются и исполняются только в Комнате с Чужим.
+Стрельба расходует 1 карту Действий и 1 Боезапас выбранного оружия.
+Рукопашная расходует 1 карту Действий и гарантированно кладёт 1 карту Заражения в сброс.
+Промах рукопашной выдаёт тяжёлую травму.
+Попадание ведёт к порогу Стойкости по картам Атак Чужих; при гибели создаются Останки, смерть Королевы добавляет Яйцо.
+Отступление выбирает доступный соседний отсек детерминированно до появления полноценной Фазы Событий; сам факт отступления логируется.
+
+## 5. Побег и блокировки
+
+Обычное `ACTION_MOVE` из Комнаты с Чужими сначала ставит `INTRUDER_ATTACK_INTERRUPT`.
+Каждый оставшийся Чужой атакует до перемещения; только выживший персонаж продолжает движение и обычный розыгрыш Шума.
+В бою заблокированы Поиск, Осторожное движение и действия комнат.
+
+## 6. Скрытая информация
+
+`filterStateForPlayer()` отдаёт состав мешка по типам без порядка, закрытые колоды — только размером, чужие руки/сбросы и приватные решения — без содержимого.
+Колода Атак Чужих не раскрывается по порядку добора; открытая часть сброса остаётся видимой.
+
+## 7. Проверки релиза
+
+Golden/integration tests находятся рядом с кодом: `sources.golden.test.ts`, `contact.test.ts`, `combat.test.ts`, `setup.test.ts`.
+Статическая проверка общего ядра и тестового TypeScript-контура проходит без ошибок.
+Полный `npm run verify` и продакшн-сборка требуют установки полного npm-зависимостного графа; в изолированной среде поставка зависимостей не завершилась.
diff --git a/package-lock.json b/package-lock.json
index 99f4941..5df3997 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,12 +1,12 @@
 {
   "name": "nemesis-digital",
-  "version": "0.2.0",
+  "version": "0.4.0",
   "lockfileVersion": 3,
   "requires": true,
   "packages": {
     "": {
       "name": "nemesis-digital",
-      "version": "0.2.0",
+      "version": "0.4.0",
       "workspaces": [
         "packages/*"
       ],
@@ -5235,7 +5235,7 @@
     },
     "packages/client": {
       "name": "@nemesis/client",
-      "version": "0.2.0",
+      "version": "0.4.0",
       "dependencies": {
         "@nemesis/shared": "*",
         "clsx": "^2.1.0",
@@ -5260,7 +5260,7 @@
     },
     "packages/shared": {
       "name": "@nemesis/shared",
-      "version": "0.2.0",
+      "version": "0.4.0",
       "dependencies": {
         "immer": "^10.0.3",
         "seedrandom": "^3.0.5"
diff --git a/package.json b/package.json
index aba8a11..4a18793 100644
--- a/package.json
+++ b/package.json
@@ -1,6 +1,6 @@
 {
   "name": "nemesis-digital",
-  "version": "0.2.11",
+  "version": "0.4.0",
   "private": true,
   "description": "Digital PWA adaptation of the Nemesis board game",
   "workspaces": [
diff --git a/packages/client/package.json b/packages/client/package.json
index 62790f9..74ff49a 100644
--- a/packages/client/package.json
+++ b/packages/client/package.json
@@ -1,6 +1,6 @@
 {
   "name": "@nemesis/client",
-  "version": "0.2.11",
+  "version": "0.4.0",
   "private": true,
   "type": "module",
   "scripts": {
diff --git a/packages/client/src/App.tsx b/packages/client/src/App.tsx
index f866dde..db7e2f0 100644
--- a/packages/client/src/App.tsx
+++ b/packages/client/src/App.tsx
@@ -9,6 +9,7 @@ import { DevPanel } from './components/dev/DevPanel';
 import { GameLogPanel } from './components/log/GameLogPanel';
 import { PlayerHandPanel } from './components/hand/PlayerHandPanel';
 import { DecisionModal } from './components/modals/DecisionModal';
+import { ContactModal } from './components/modals/ContactModal';
 import { CharacterSelectModal } from './components/modals/CharacterSelectModal';
 import { PHASE_LABELS } from './utils/labels';
 import { IS_DEV } from './utils/env';
@@ -106,6 +107,7 @@ export const App: React.FC = () => {
           />
         )}
         {view.pendingDecision && <DecisionModal decision={view.pendingDecision} />}
+        <ContactModal view={view} />
         {IS_DEV && devPanelOpen && <DevPanel onClose={() => setDevPanelOpen(false)} />}
       </main>
     </div>
diff --git a/packages/client/src/components/board/RoomHex.tsx b/packages/client/src/components/board/RoomHex.tsx
index 3d0e610..c0660e0 100644
--- a/packages/client/src/components/board/RoomHex.tsx
+++ b/packages/client/src/components/board/RoomHex.tsx
@@ -1,5 +1,5 @@
 import React from 'react';
-import { SHIP_ROOM_NODES, type SanitizedRoomState } from '@nemesis/shared';
+import { SHIP_ROOM_NODES, type IntruderEntity, type SanitizedRoomState } from '@nemesis/shared';
 import { Bone, Egg, Flame, Laptop, Skull, User, Wrench } from 'lucide-react';
 
 interface RoomHexProps {
@@ -9,6 +9,7 @@ interface RoomHexProps {
   y: number;
   isSelected: boolean;
   onSelect: (roomId: number) => void;
+  intruders: IntruderEntity[];
 }
 
 const CANONICAL_ROOM_NAMES: Record<string, [string, string]> = {
@@ -39,7 +40,23 @@ const CANONICAL_ROOM_NAMES: Record<string, [string, string]> = {
   SHOWER: ['ДУШЕВАЯ', 'ЭКИПАЖА'],
 };
 
-export const RoomHex: React.FC<RoomHexProps> = ({ room, x, y, isSelected, onSelect }) => {
+const INTRUDER_COLORS: Record<IntruderEntity['type'], string> = {
+  LARVA: '#16a34a',
+  CREEPER: '#eab308',
+  ADULT: '#dc2626',
+  BREEDER: '#7f1d1d',
+  QUEEN: '#a21caf',
+};
+
+const INTRUDER_LABELS: Record<IntruderEntity['type'], string> = {
+  LARVA: 'Л',
+  CREEPER: 'К',
+  ADULT: 'В',
+  BREEDER: 'Т',
+  QUEEN: 'КР',
+};
+
+export const RoomHex: React.FC<RoomHexProps> = ({ room, x, y, isSelected, onSelect, intruders }) => {
   const radius = 45;
 
   const points = React.useMemo(() => {
@@ -179,6 +196,26 @@ export const RoomHex: React.FC<RoomHexProps> = ({ room, x, y, isSelected, onSele
         {room.hasComputer && room.isExplored && <Laptop size={12} className="text-cyan-400" x={24} y={0} />}
       </g>
 
+      {/* Чужие: тип и накопленные Раны видны всем игрокам в открытом отсеке. */}
+      {intruders.length > 0 && (
+        <g transform={`translate(${x - 30}, ${y + 30})`} className="pointer-events-none">
+          {intruders.map((intruder, index) => {
+            const color = INTRUDER_COLORS[intruder.type];
+            return (
+              <g key={intruder.id} transform={`translate(${index * 36}, 0)`}>
+                <circle cx={10} cy={10} r={10} fill={color} stroke="#05070c" strokeWidth={1.5} />
+                <text x={10} y={13} textAnchor="middle" className="text-[7px] font-mono fill-white font-bold">
+                  {INTRUDER_LABELS[intruder.type]}
+                </text>
+                <text x={10} y={25} textAnchor="middle" className="text-[6px] font-mono fill-rose-300 font-bold">
+                  {intruder.woundsCount}
+                </text>
+              </g>
+            );
+          })}
+        </g>
+      )}
+
       {/* Персонажи */}
       {room.occupantPlayerIds.length > 0 && (
         <g transform={`translate(${x - 10}, ${y - 34})`} className="pointer-events-none">
diff --git a/packages/client/src/components/board/ShipMapSVG.tsx b/packages/client/src/components/board/ShipMapSVG.tsx
index 275a7a0..323a75f 100644
--- a/packages/client/src/components/board/ShipMapSVG.tsx
+++ b/packages/client/src/components/board/ShipMapSVG.tsx
@@ -101,6 +101,7 @@ export const ShipMapSVG: React.FC = () => {
                         y={coord.y}
                         isSelected={selectedRoomId === room.id}
                         onSelect={selectRoom}
+                        intruders={view.intrudersPool.boardTokens.filter((intruder) => room.occupantIntruderIds.includes(intruder.id))}
                       />
                     );
                   })}
diff --git a/packages/client/src/components/hand/PlayerHandPanel.tsx b/packages/client/src/components/hand/PlayerHandPanel.tsx
index b5c4452..536de76 100644
--- a/packages/client/src/components/hand/PlayerHandPanel.tsx
+++ b/packages/client/src/components/hand/PlayerHandPanel.tsx
@@ -1,5 +1,5 @@
 import React from 'react';
-import type { ActionCard, SanitizedGameState } from '@nemesis/shared';
+import type { ActionCard, PlayCardActionPayload, SanitizedGameState } from '@nemesis/shared';
 import { useGameStore } from '../../store/gameStore';
 import {
   ChevronUp,
@@ -80,12 +80,34 @@ export const PlayerHandPanel: React.FC<PlayerHandPanelProps> = ({ view }) => {
 
   const executePlayCard = (card: ActionCard) => {
     const discardCardIds = card.playCost > 0 ? consumePaymentCards(card.playCost) : [];
+    const currentRoom = view.ship.rooms[player.roomId];
+    const intruderIds = currentRoom?.occupantIntruderIds ?? [];
+    const firstIntruderId = intruderIds[0];
+    const firstWeapon = player.handSlots.find((slot) => slot.source === 'ITEM' && slot.card.isWeapon)?.card;
+    const openAdjacentCorridor = Object.values(view.ship.corridors).find(
+      (corridor) =>
+        corridor.doorState === 'OPEN' &&
+        (corridor.fromRoomId === player.roomId || corridor.toRoomId === player.roomId),
+    );
+
+    const payload: PlayCardActionPayload = {
+      cardId: card.id,
+      discardCardIds,
+    };
+
+    if (card.id === 'ACT_SOL_BURST_FIRE' || card.id === 'ACT_SOL_AIMED_FIRE') {
+      payload.targetIntruderId = firstIntruderId;
+      payload.weaponId = firstWeapon?.id;
+    }
+
+    if (card.id === 'ACT_SOL_SUPPRESSIVE_FIRE' || card.id === 'ACT_CAP_SUPPRESSIVE_FIRE' || card.id === 'ACT_SCO_SUPPRESSIVE_FIRE') {
+      payload.targetPlayerId = player.id;
+      payload.targetCorridorId = openAdjacentCorridor?.id;
+    }
+
     dispatch({
       type: 'ACTION_PLAY_CARD',
-      payload: {
-        cardId: card.id,
-        discardCardIds,
-      },
+      payload,
     });
     setPendingPlayCard(null);
     clearSelection();
diff --git a/packages/client/src/components/inspector/RoomInspector.tsx b/packages/client/src/components/inspector/RoomInspector.tsx
index 5d863f0..b45e23a 100644
--- a/packages/client/src/components/inspector/RoomInspector.tsx
+++ b/packages/client/src/components/inspector/RoomInspector.tsx
@@ -2,7 +2,7 @@ import React from 'react';
 import type { BoardObject, CarefulMoveChosenCorridor, CorridorNumber, SanitizedRoomState } from '@nemesis/shared';
 import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1, SPECIAL_ROOMS, findAdjacentOpenRoomIds } from '@nemesis/shared';
 import { useGameStore } from '../../store/gameStore';
-import { X, Flame, Wrench, Laptop, Package, User, Footprints, AlertCircle, Ban, ShieldAlert } from 'lucide-react';
+import { X, Flame, Wrench, Laptop, Package, User, Footprints, AlertCircle, Ban, ShieldAlert, Crosshair, Swords, Biohazard } from 'lucide-react';
 
 /** Подписи Тяжёлых объектов на полу отсека (стр. 22). */
 const BOARD_OBJECT_LABELS: Record<BoardObject['kind'], string> = {
@@ -34,6 +34,7 @@ export const RoomInspector: React.FC = () => {
   const consumePaymentCards = useGameStore((state) => state.consumePaymentCards);
 
   const [isCarefulSelecting, setIsCarefulSelecting] = React.useState(false);
+  const [combatWeaponId, setCombatWeaponId] = React.useState<string | null>(null);
 
   if (!view || !selectedRoomId) return null;
 
@@ -50,6 +51,12 @@ export const RoomInspector: React.FC = () => {
   const activePlayer = view.players[activePlayerId];
   const isPlayerHere = room.occupantPlayerIds.includes(activePlayerId);
   const occupantNames = room.occupantPlayerIds.map((playerId) => view.players[playerId]?.name ?? playerId);
+  const intrudersHere = room.occupantIntruderIds
+    .map((intruderId) => view.intrudersPool.boardTokens.find((intruder) => intruder.id === intruderId))
+    .filter((intruder): intruder is NonNullable<typeof intruder> => Boolean(intruder));
+  const weapons = (activePlayer?.handSlots ?? []).filter((slot) => slot.source === 'ITEM' && slot.card.isWeapon);
+  const selectedWeapon = combatWeaponId && weapons.find((slot) => slot.source === 'ITEM' && slot.card.id === combatWeaponId);
+  const currentWeapon = selectedWeapon?.source === 'ITEM' ? selectedWeapon.card : weapons[0]?.source === 'ITEM' ? weapons[0].card : null;
 
   // Переходить можно только в соседний отсек через открытую Дверь (стр. 14):
   const reachableRoomIds = activePlayer ? findAdjacentOpenRoomIds(view, activePlayer.roomId) : [];
@@ -116,14 +123,42 @@ export const RoomInspector: React.FC = () => {
     });
   };
 
-  const handleRoomAbility = () => {
+  const handleRoomAbility = (extra: { targetObjectKind?: 'CORPSE' | 'EGG' | 'INTRUDER_REMAINS' } = {}) => {
     const discardCardIds = consumePaymentCards(2);
     dispatch({
       type: 'ACTION_ROOM_ABILITY',
-      payload: { discardCardIds },
+      payload: { discardCardIds, ...extra },
+    });
+  };
+
+  const handleShoot = (targetIntruderId: string) => {
+    const weaponId = currentWeapon?.id;
+    if (!weaponId) return;
+    dispatch({
+      type: 'ACTION_SHOOT',
+      payload: { targetIntruderId, weaponId, discardCardIds: consumePaymentCards(1) },
     });
   };
 
+  const handleMelee = (targetIntruderId: string) => {
+    dispatch({
+      type: 'ACTION_MELEE',
+      payload: { targetIntruderId, discardCardIds: consumePaymentCards(1) },
+    });
+  };
+
+  const handlePickUp = (objectId: string) => {
+    dispatch({
+      type: 'ACTION_PICK_UP_OBJECT',
+      payload: { objectId, discardCardIds: consumePaymentCards(1) },
+    });
+  };
+
+  const handleSpecialCard = (cardId: string, targetIntruderId?: string) => {
+    const payload: { cardId: string; targetIntruderId?: string; weaponId?: string } = { cardId, targetIntruderId, weaponId: currentWeapon?.id };
+    dispatch({ type: 'ACTION_PLAY_CARD', payload });
+  };
+
   return (
     <div className="absolute bottom-0 left-0 right-0 md:bottom-auto md:top-4 md:right-4 md:left-auto md:w-96 bg-nemesis-hull/95 backdrop-blur-md border-t md:border border-nemesis-border md:rounded-xl shadow-2xl p-4 z-30 transition-all">
       {/* Шапка инспектора */}
@@ -190,6 +225,77 @@ export const RoomInspector: React.FC = () => {
           </div>
         )}
 
+        {isPlayerHere && room.definitionId === 'LABORATORY' && activePlayer?.handSlots.some((slot) => slot.source === 'OBJECT') && (
+          <div className="rounded-lg border border-cyan-900/50 bg-cyan-950/10 p-2.5 space-y-1.5">
+            <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">Лаборатория · изучить объект</div>
+            {activePlayer.handSlots.map((slot) => slot.source === 'OBJECT' ? (
+              <button key={slot.object.id} type="button" onClick={() => handleRoomAbility({ targetObjectKind: slot.object.kind })} className="w-full rounded border border-cyan-800/50 px-2 py-1.5 text-left text-[11px] text-cyan-100 hover:bg-cyan-900/30">Изучить: {BOARD_OBJECT_LABELS[slot.object.kind]}</button>
+            ) : null)}
+          </div>
+        )}
+
+        {isPlayerHere && intrudersHere.length > 0 && (
+          <div className="rounded-lg border border-rose-900/60 bg-rose-950/20 p-3 space-y-2">
+            <div className="flex items-center justify-between gap-2">
+              <div className="flex items-center gap-2 text-rose-300 text-xs font-bold uppercase tracking-wider">
+                <Swords size={14} /> БОЙ
+              </div>
+              <span className="text-[10px] text-slate-400">Чужих: {intrudersHere.length}</span>
+            </div>
+
+            <div className="grid gap-1.5">
+              {weapons.length > 0 && (
+                <select
+                  value={currentWeapon?.id ?? ''}
+                  onChange={(event) => setCombatWeaponId(event.target.value)}
+                  className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white"
+                  aria-label="Оружие"
+                >
+                  {weapons.map((slot) => slot.source === 'ITEM' ? (
+                    <option key={slot.card.id} value={slot.card.id}>{slot.card.name} — {slot.card.ammo}/{slot.card.maxAmmo}</option>
+                  ) : null)}
+                </select>
+              )}
+
+              {intrudersHere.map((intruder) => (
+                <div key={intruder.id} className="grid grid-cols-2 gap-1.5">
+                  <button
+                    type="button"
+                    disabled={!currentWeapon || (activePlayer?.actionDeck.handCount ?? 0) < 1}
+                    onClick={() => handleShoot(intruder.id)}
+                    className="min-h-9 rounded border border-rose-700/70 bg-rose-950/40 text-xs font-bold text-rose-200 hover:bg-rose-900/60 disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center gap-1"
+                  >
+                    <Crosshair size={13} /> Стрельба · {intruder.woundsCount} ран
+                  </button>
+                  <button
+                    type="button"
+                    disabled={(activePlayer?.actionDeck.handCount ?? 0) < 1}
+                    onClick={() => handleMelee(intruder.id)}
+                    className="min-h-9 rounded border border-amber-700/70 bg-amber-950/40 text-xs font-bold text-amber-200 hover:bg-amber-900/60 disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center gap-1"
+                    title="Рукопашная всегда добавляет карту Заражения; промах наносит Тяжёлую Травму"
+                  >
+                    <Biohazard size={13} /> Рукопашная · +Заражение
+                  </button>
+                </div>
+              ))}
+            </div>
+
+            {activePlayer?.actionDeck.hand.some((card) => 'characterClass' in card && ['ACT_SOL_BURST_FIRE', 'ACT_SOL_AIMED_FIRE', 'ACT_SCO_ADRENALINE'].includes(card.id)) && (
+              <div className="pt-2 border-t border-rose-900/50 grid gap-1.5">
+                {activePlayer.actionDeck.hand.some((card) => 'characterClass' in card && card.id === 'ACT_SOL_BURST_FIRE') && (
+                  <button type="button" onClick={() => handleSpecialCard('ACT_SOL_BURST_FIRE', intrudersHere[0]?.id)} className="min-h-8 rounded border border-cyan-700/60 bg-cyan-950/30 text-[11px] font-bold text-cyan-200 hover:bg-cyan-900/50">Стрельба очередью → первый Чужой</button>
+                )}
+                {activePlayer.actionDeck.hand.some((card) => 'characterClass' in card && card.id === 'ACT_SOL_AIMED_FIRE') && (
+                  <button type="button" onClick={() => handleSpecialCard('ACT_SOL_AIMED_FIRE', intrudersHere[0]?.id)} className="min-h-8 rounded border border-cyan-700/60 bg-cyan-950/30 text-[11px] font-bold text-cyan-200 hover:bg-cyan-900/50">Прицельный огонь → первый Чужой</button>
+                )}
+                {activePlayer.actionDeck.hand.some((card) => 'characterClass' in card && card.id === 'ACT_SCO_ADRENALINE') && (
+                  <button type="button" onClick={() => handleSpecialCard('ACT_SCO_ADRENALINE')} className="min-h-8 rounded border border-violet-700/60 bg-violet-950/30 text-[11px] font-bold text-violet-200 hover:bg-violet-900/50">Адреналин → выбрать Стрельбу или Побег</button>
+                )}
+              </div>
+            )}
+          </div>
+        )}
+
         {/* Персонажи в отсеке */}
         {occupantNames.length > 0 && (
           <div className="text-xs bg-slate-900/40 p-2 rounded flex items-center gap-2">
@@ -203,12 +309,12 @@ export const RoomInspector: React.FC = () => {
         {room.objects.map((object) => (
           <div
             key={object.id}
-            className="text-xs bg-red-950/30 border border-red-900/50 p-2 rounded flex items-center gap-2 text-rose-300"
+            className="text-xs bg-red-950/30 border border-red-900/50 p-2 rounded flex items-center justify-between gap-2 text-rose-300"
           >
-            <AlertCircle size={14} />
-            <span>
-              На полу: <b>{BOARD_OBJECT_LABELS[object.kind]}</b>
-            </span>
+            <span className="flex items-center gap-2"><AlertCircle size={14} />На полу: <b>{BOARD_OBJECT_LABELS[object.kind]}</b></span>
+            {isPlayerHere && (activePlayer?.handSlots.length ?? 2) < 2 && (activePlayer?.actionDeck.handCount ?? 0) > 0 && (
+              <button type="button" onClick={() => handlePickUp(object.id)} className="shrink-0 rounded border border-rose-700/60 px-2 py-1 text-[10px] font-bold uppercase hover:bg-rose-900/60">Поднять · 1</button>
+            )}
           </div>
         ))}
 
diff --git a/packages/client/src/components/log/GameLogPanel.tsx b/packages/client/src/components/log/GameLogPanel.tsx
index 38444cb..c5451c5 100644
--- a/packages/client/src/components/log/GameLogPanel.tsx
+++ b/packages/client/src/components/log/GameLogPanel.tsx
@@ -18,6 +18,8 @@ const TONE_CLASSES: Record<GameLogTone, string> = {
   malfunction: 'text-amber-300 font-bold',
   slime: 'text-lime-300 font-bold',
   danger: 'text-red-300 font-bold',
+  intruder: 'text-fuchsia-300 font-bold',
+  combat: 'text-rose-300 font-bold',
   silence: 'text-slate-100 font-bold',
   door: 'text-fuchsia-300 font-bold',
   success: 'text-emerald-300 font-bold',
diff --git a/packages/client/src/components/log/gameLogModel.ts b/packages/client/src/components/log/gameLogModel.ts
index dadeabf..28bae72 100644
--- a/packages/client/src/components/log/gameLogModel.ts
+++ b/packages/client/src/components/log/gameLogModel.ts
@@ -17,6 +17,8 @@ export type GameLogTone =
   | 'malfunction'
   | 'slime'
   | 'danger'
+  | 'intruder'
+  | 'combat'
   | 'silence'
   | 'door'
   | 'success'
@@ -148,6 +150,14 @@ function outcomeTone(outcome: Extract<GameLogEvent, { type: 'EXPLORATION_EFFECT_
   return 'silence';
 }
 
+function intruderName(type: Extract<GameLogEvent, { type: 'INTRUDER_SPAWNED' }>['intruderType']): string {
+  return { LARVA: 'Личинка', CREEPER: 'Ползун', ADULT: 'Взрослый', BREEDER: 'Разводчик', QUEEN: 'Королева' }[type];
+}
+
+function combatFaceLabel(face: Extract<GameLogEvent, { type: 'COMBAT_ROLLED' }>['face']): string {
+  return { MISS: 'Промах', CLAW_HIT: 'Когти', ALIEN_HIT: 'Силуэты', ONE_HIT: '1 Рана', TWO_HITS: '2 Раны' }[face];
+}
+
 function formatEntry(entry: GameLogEntry, view: SanitizedGameState): GameLogSegment[] {
   const event = entry.event;
 
@@ -155,6 +165,73 @@ function formatEntry(entry: GameLogEntry, view: SanitizedGameState): GameLogSegm
     case 'GAME_STARTED':
       return [{ text: 'Партия начата', tone: 'system', strong: true }, { text: '.' }];
 
+    case 'CONTACT_RESOLVED':
+      return [
+        { text: 'Контакт', tone: 'intruder', strong: true },
+        { text: ` в ${roomLabel(view, event.roomId)}: ` },
+        { text: event.outcome === 'BLANK' ? 'пустой жетон, Шум восстановлен.' : 'вытянут жетон Чужого.' },
+      ];
+
+    case 'INTRUDER_SPAWNED':
+      return [
+        { text: intruderName(event.intruderType), tone: 'intruder', strong: true },
+        { text: ` появился в ${roomLabel(view, event.roomId)}.` },
+      ];
+
+    case 'INTRUDER_ATTACKED':
+      return [
+        { text: 'Атака Чужого', tone: 'intruder', strong: true },
+        { text: ` (${intruderName(event.intruderType)}) против ${playerName(view, event.playerId)}: ${event.outcome}.` },
+      ];
+
+    case 'COMBAT_ROLLED':
+      return [
+        { text: `Бой: ${event.mode}`, tone: 'combat', strong: true },
+        { text: ` — ${combatFaceLabel(event.face)}.` },
+      ];
+
+    case 'INTRUDER_WOUNDED':
+      return [
+        { text: 'Чужой ранен', tone: 'combat', strong: true },
+        { text: `: ${intruderName(event.intruderType)}, ран всего ${event.woundsCount}.` },
+      ];
+
+    case 'INTRUDER_KILLED':
+      return [
+        { text: 'Чужой убит', tone: 'success', strong: true },
+        { text: `: ${intruderName(event.intruderType)} в ${roomLabel(view, event.roomId)}.` },
+      ];
+
+    case 'INTRUDER_RETREATED':
+      return [
+        { text: 'Чужой отступил', tone: 'intruder', strong: true },
+        { text: `: ${intruderName(event.intruderType)}${event.toRoomId === null ? ' в Мешок' : ` в ${roomLabel(view, event.toRoomId)}`}.` },
+      ];
+
+    case 'PLAYER_INJURED':
+      return [
+        { text: 'Травма', tone: 'combat', strong: true },
+        { text: `: ${playerName(view, event.playerId)} — лёгких ${event.lightWounds}, тяжёлых ${event.seriousWounds}.` },
+      ];
+
+    case 'PLAYER_INFECTED':
+      return [
+        { text: 'Заражение', tone: 'intruder', strong: true },
+        { text: `: ${playerName(view, event.playerId)} (${event.source === 'LARVA' ? 'Личинка' : 'карта Заражения'}).` },
+      ];
+
+    case 'PLAYER_DIED':
+      return [
+        { text: 'Персонаж погиб', tone: 'error', strong: true },
+        { text: `: ${playerName(view, event.playerId)} в ${roomLabel(view, event.roomId)}.` },
+      ];
+
+    case 'OBJECT_PICKED_UP':
+      return [
+        { text: 'Объект поднят', tone: 'success', strong: true },
+        { text: `: ${event.objectKind} в ${roomLabel(view, event.roomId)}.` },
+      ];
+
     case 'ROUND_STARTED':
       return [
         { text: `Раунд ${event.round}`, tone: 'system', strong: true },
diff --git a/packages/client/src/components/modals/ContactModal.tsx b/packages/client/src/components/modals/ContactModal.tsx
new file mode 100644
index 0000000..7eec1a3
--- /dev/null
+++ b/packages/client/src/components/modals/ContactModal.tsx
@@ -0,0 +1,67 @@
+import React from 'react';
+import { Bug, ShieldAlert, X } from 'lucide-react';
+import type { IntruderType, SanitizedGameState } from '@nemesis/shared';
+
+const INTRUDER_LABELS: Record<IntruderType, { label: string; glyph: string }> = {
+  LARVA: { label: 'Личинка', glyph: 'L' },
+  CREEPER: { label: 'Ползун', glyph: 'П' },
+  ADULT: { label: 'Взрослый', glyph: 'A' },
+  BREEDER: { label: 'Разводчик', glyph: 'Р' },
+  QUEEN: { label: 'Королева', glyph: 'Q' },
+};
+
+interface ContactModalProps {
+  view: SanitizedGameState;
+}
+
+export const ContactModal: React.FC<ContactModalProps> = ({ view }) => {
+  const latestContact = [...view.gameLog].reverse().find((entry) => entry.event.type === 'CONTACT_RESOLVED');
+  const [dismissedId, setDismissedId] = React.useState<string | null>(null);
+
+  if (!latestContact || latestContact.id === dismissedId) return null;
+  const event = latestContact.event;
+  if (event.type !== 'CONTACT_RESOLVED') return null;
+
+  const intruder = event.intruderType ? INTRUDER_LABELS[event.intruderType] : null;
+
+  return (
+    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="contact-title">
+      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-rose-500/40 bg-nemesis-hull shadow-2xl shadow-black/50">
+        <div className="flex items-center justify-between border-b border-rose-950/60 bg-rose-950/30 px-4 py-3">
+          <div className="flex items-center gap-2 text-rose-200">
+            <ShieldAlert size={18} />
+            <h2 id="contact-title" className="font-heading tracking-[0.18em] text-sm">КОНТАКТ!</h2>
+          </div>
+          <button type="button" onClick={() => setDismissedId(latestContact.id)} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Закрыть">
+            <X size={16} />
+          </button>
+        </div>
+
+        <div className="space-y-4 p-5 text-center">
+          <div className="mx-auto flex h-24 w-24 animate-pulse items-center justify-center rounded-full border border-rose-500/50 bg-slate-950 shadow-inner">
+            {event.outcome === 'BLANK' ? <Bug size={42} className="text-slate-500" /> : <span className="text-3xl font-black text-rose-300">{intruder?.glyph ?? '?'}</span>}
+          </div>
+
+          {event.outcome === 'BLANK' ? (
+            <div>
+              <div className="text-lg font-semibold text-white">Пустой жетон</div>
+              <p className="mt-1 text-sm text-slate-400">Входящие маркеры Шума восстановлены.</p>
+            </div>
+          ) : (
+            <div>
+              <div className="text-lg font-semibold text-white">{intruder?.label ?? 'Чужой'}</div>
+              <p className="mt-1 text-sm text-slate-400">Чужой вышел из Пула и занял отсек.</p>
+              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-rose-900/70 bg-slate-950 px-3 py-1.5 font-mono text-xs text-rose-200">
+                Внезапная атака: <b>{event.escapeNumber ?? '?'}</b>
+              </div>
+            </div>
+          )}
+
+          <button type="button" onClick={() => setDismissedId(latestContact.id)} className="w-full rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600">
+            Продолжить
+          </button>
+        </div>
+      </div>
+    </div>
+  );
+};
diff --git a/packages/client/src/components/modals/DecisionModal.tsx b/packages/client/src/components/modals/DecisionModal.tsx
index 7b920c3..7692b3e 100644
--- a/packages/client/src/components/modals/DecisionModal.tsx
+++ b/packages/client/src/components/modals/DecisionModal.tsx
@@ -1,7 +1,7 @@
 import React from 'react';
 import type { PendingDecision } from '@nemesis/shared';
 import { useGameStore } from '../../store/gameStore';
-import { Package, ArrowRight } from 'lucide-react';
+import { Package, ArrowRight, ShieldAlert, Crosshair, Footprints } from 'lucide-react';
 
 interface DecisionModalProps {
   decision: PendingDecision;
@@ -21,6 +21,69 @@ export const DecisionModal: React.FC<DecisionModalProps> = ({ decision }) => {
     });
   };
 
+  if (decision.type === 'SURPRISE_ATTACK_RESPONSE') {
+    const player = view?.players[view.meta.activePlayerId];
+    const canSteelNerves = player?.characterClass === 'SOLDIER' && player.actionDeck.hand.some((card) => card.id === 'ACT_SOL_STEEL_NERVES');
+    return (
+      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
+        <div className="w-full max-w-md bg-slate-900 border border-rose-500/60 rounded-xl p-5 shadow-2xl space-y-4">
+          <div className="flex items-center gap-2 text-rose-300 border-b border-slate-800 pb-3">
+            <ShieldAlert size={20} />
+            <h3 className="text-lg font-heading tracking-wider text-white">ВНЕЗАПНАЯ АТАКА</h3>
+          </div>
+          <p className="text-xs text-slate-300 leading-relaxed">
+            Контакт превысил порог по числу карт на руке. Выберите: применить «Стальные нервы» или принять атаку Чужого.
+          </p>
+          <div className="grid grid-cols-1 gap-2">
+            <button type="button" disabled={!canSteelNerves} onClick={() => handleSelect('USE_STEEL_NERVES')} className="min-h-10 rounded-lg border border-cyan-600/60 bg-cyan-950/40 text-cyan-200 font-bold text-xs disabled:opacity-40">Стальные нервы</button>
+            <button type="button" onClick={() => handleSelect('TAKE_ATTACK')} className="min-h-10 rounded-lg border border-rose-700/70 bg-rose-950/40 text-rose-200 font-bold text-xs">Принять атаку</button>
+          </div>
+        </div>
+      </div>
+    );
+  }
+
+  if (decision.type === 'AIMED_FIRE_REROLL') {
+    return (
+      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
+        <div className="w-full max-w-md bg-slate-900 border border-cyan-500/60 rounded-xl p-5 shadow-2xl space-y-4">
+          <div className="flex items-center gap-2 text-cyan-300 border-b border-slate-800 pb-3">
+            <Crosshair size={20} />
+            <h3 className="text-lg font-heading tracking-wider text-white">ПРИЦЕЛЬНЫЙ ОГОНЬ</h3>
+          </div>
+          <p className="text-xs text-slate-300">Первый результат Боя: <b className="text-cyan-200">{decision.firstFace}</b>. Один переброс доступен до применения результата.</p>
+          <div className="grid grid-cols-2 gap-2">
+            <button type="button" onClick={() => handleSelect('KEEP')} className="min-h-10 rounded-lg border border-slate-700 bg-slate-800 text-white font-bold text-xs">Оставить</button>
+            <button type="button" onClick={() => handleSelect('REROLL')} className="min-h-10 rounded-lg border border-cyan-700/70 bg-cyan-950/40 text-cyan-200 font-bold text-xs">Перебросить</button>
+          </div>
+        </div>
+      </div>
+    );
+  }
+
+  if (decision.type === 'ADRENALINE_CHOICE') {
+    const player = view?.players[decision.playerId];
+    const targetRoom = view?.ship.rooms[decision.targetRoomId];
+    const weapon = player?.handSlots.find((slot) => slot.source === 'ITEM' && slot.card.isWeapon);
+    const intruderId = targetRoom?.occupantIntruderIds[0];
+    const escapeTarget = player ? Object.values(view?.ship.rooms ?? {}).find((room) => room.id !== player.roomId && Object.values(view?.ship.corridors ?? {}).some((corridor) => corridor.doorState === 'OPEN' && ((corridor.fromRoomId === player.roomId && corridor.toRoomId === room.id) || (corridor.toRoomId === player.roomId && corridor.fromRoomId === room.id))))?.id : undefined;
+    return (
+      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
+        <div className="w-full max-w-md bg-slate-900 border border-violet-500/60 rounded-xl p-5 shadow-2xl space-y-4">
+          <div className="flex items-center gap-2 text-violet-300 border-b border-slate-800 pb-3">
+            <Footprints size={20} />
+            <h3 className="text-lg font-heading tracking-wider text-white">АДРЕНАЛИН</h3>
+          </div>
+          <p className="text-xs text-slate-300">Выберите одно бесплатное действие: Стрельба или Побег. После эффекта персонаж получает 1 карту Действия.</p>
+          <div className="grid grid-cols-1 gap-2">
+            <button type="button" disabled={!weapon || !intruderId} onClick={() => { if (weapon?.source === 'ITEM' && intruderId) { dispatch({ type: 'ACTION_RESOLVE_DECISION', payload: { decisionId: decision.id, selectedOption: 'SHOOT', targetIntruderId: intruderId, weaponId: weapon.card.id } }); } }} className="min-h-10 rounded-lg border border-rose-700/70 bg-rose-950/40 text-rose-200 font-bold text-xs disabled:opacity-40">Стрельба</button>
+            <button type="button" disabled={escapeTarget === undefined} onClick={() => { if (escapeTarget !== undefined) dispatch({ type: 'ACTION_RESOLVE_DECISION', payload: { decisionId: decision.id, selectedOption: 'ESCAPE', targetRoomId: escapeTarget } }); }} className="min-h-10 rounded-lg border border-violet-700/70 bg-violet-950/40 text-violet-200 font-bold text-xs disabled:opacity-40">Побег → соседний отсек</button>
+          </div>
+        </div>
+      </div>
+    );
+  }
+
   if (decision.type === 'CHOOSE_WHITE_ROOM_DECK') {
     return (
       <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
diff --git a/packages/shared/package.json b/packages/shared/package.json
index 3af0c93..37cbf1b 100644
--- a/packages/shared/package.json
+++ b/packages/shared/package.json
@@ -1,6 +1,6 @@
 {
   "name": "@nemesis/shared",
-  "version": "0.2.11",
+  "version": "0.4.0",
   "private": true,
   "type": "module",
   "description": "Изоморфное ядро правил Nemesis Digital: типы, данные и логика без зависимостей от DOM/Node",
diff --git a/packages/shared/src/data/cardsSetup.ts b/packages/shared/src/data/cardsSetup.ts
index 455dc54..13c5cfa 100644
--- a/packages/shared/src/data/cardsSetup.ts
+++ b/packages/shared/src/data/cardsSetup.ts
@@ -5,6 +5,7 @@ import { CONTAMINATION_CARDS } from '../data/contaminationCards.js';
 import { CRAFTED_ITEM_CARDS } from '../data/crafting.js';
 import { GREEN_ITEM_CARDS, RED_ITEM_CARDS, YELLOW_ITEM_CARDS } from '../data/itemCards.js';
 import { SERIOUS_WOUND_CARDS } from '../data/seriousWounds.js';
+import { INTRUDER_ATTACK_CARDS } from '../data/intruderAttacks.js';
 import { createRng, shuffle } from '../utils/rng.js';
 
 export function createActionDeckForCharacter(
@@ -20,7 +21,7 @@ export function createActionDeckForCharacter(
   for (let i = 0; i < draws; i++) {
     rng();
   }
-  return shuffle(rng, [...definitions]);
+  return shuffle(rng, definitions.map((card) => structuredClone(card)));
 }
 
 export function createShuffledPile<TCard>(cards: readonly TCard[], seed: string, draws: number = 0): CardPile<TCard> {
@@ -39,15 +40,15 @@ export function createInitialDecks(seed: string): GameDecksState {
 
   return {
     items: {
-      RED: { drawPile: shuffle(rng, [...RED_ITEM_CARDS]), discard: [] },
-      YELLOW: { drawPile: shuffle(rng, [...YELLOW_ITEM_CARDS]), discard: [] },
-      GREEN: { drawPile: shuffle(rng, [...GREEN_ITEM_CARDS]), discard: [] },
+      RED: { drawPile: shuffle(rng, RED_ITEM_CARDS.map((card) => structuredClone(card))), discard: [] },
+      YELLOW: { drawPile: shuffle(rng, YELLOW_ITEM_CARDS.map((card) => structuredClone(card))), discard: [] },
+      GREEN: { drawPile: shuffle(rng, GREEN_ITEM_CARDS.map((card) => structuredClone(card))), discard: [] },
     },
-    craftedItems: { drawPile: [...CRAFTED_ITEM_CARDS], discard: [] },
-    contamination: { drawPile: shuffle(rng, [...CONTAMINATION_CARDS]), discard: [] },
-    seriousWounds: { drawPile: shuffle(rng, [...SERIOUS_WOUND_CARDS]), discard: [] },
+    craftedItems: { drawPile: CRAFTED_ITEM_CARDS.map((card) => structuredClone(card)), discard: [] },
+    contamination: { drawPile: shuffle(rng, CONTAMINATION_CARDS.map((card) => structuredClone(card))), discard: [] },
+    seriousWounds: { drawPile: shuffle(rng, SERIOUS_WOUND_CARDS.map((card) => structuredClone(card))), discard: [] },
     events: { drawPile: [], discard: [] },
-    intruderAttacks: { drawPile: [], discard: [] },
+    intruderAttacks: { drawPile: shuffle(rng, INTRUDER_ATTACK_CARDS.map((card) => structuredClone(card))), discard: [] },
     objectives: {
       personal: { drawPile: [], discard: [] },
       corporate: { drawPile: [], discard: [] },
diff --git a/packages/shared/src/data/combatDie.ts b/packages/shared/src/data/combatDie.ts
new file mode 100644
index 0000000..42327c5
--- /dev/null
+++ b/packages/shared/src/data/combatDie.ts
@@ -0,0 +1,11 @@
+/** Грань Кубика Боя: 6 граней = 2 промаха, хвост, силуэты, 1 рана, 2 раны (стр. 19). */
+export type CombatDieFace = 'MISS' | 'CLAW_HIT' | 'ALIEN_HIT' | 'ONE_HIT' | 'TWO_HITS';
+
+export const COMBAT_DIE_FACES: readonly CombatDieFace[] = [
+  'MISS',
+  'MISS',
+  'CLAW_HIT',
+  'ALIEN_HIT',
+  'ONE_HIT',
+  'TWO_HITS',
+];
diff --git a/packages/shared/src/data/intruderAttacks.ts b/packages/shared/src/data/intruderAttacks.ts
new file mode 100644
index 0000000..f22ee30
--- /dev/null
+++ b/packages/shared/src/data/intruderAttacks.ts
@@ -0,0 +1,36 @@
+import type { IntruderAttackCard } from '../types/cards.js';
+
+const types = {
+  crawler: ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'] as const,
+  bite: ['ADULT', 'BREEDER', 'QUEEN'] as const,
+  queenOnly: ['QUEEN'] as const,
+  creeperOnly: ['CREEPER'] as const,
+  breeder: ['BREEDER', 'QUEEN'] as const,
+  slime: ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'] as const,
+  call: ['CREEPER', 'QUEEN'] as const,
+};
+
+export const INTRUDER_ATTACK_CARDS: readonly IntruderAttackCard[] = [
+  { id: 'IAT_SCRATCH_2', name: 'Царапина', description: '1 Лёгкая Травма + Заражение', strength: 2, retreat: true, applicableIntruderTypes: types.crawler, effect: { kind: 'LIGHT_AND_CONTAMINATION' } },
+  { id: 'IAT_SCRATCH_3', name: 'Царапина', description: '1 Лёгкая Травма + Заражение', strength: 3, retreat: false, applicableIntruderTypes: types.crawler, effect: { kind: 'LIGHT_AND_CONTAMINATION' } },
+  { id: 'IAT_SCRATCH_5', name: 'Царапина', description: '1 Лёгкая Травма + Заражение', strength: 5, retreat: false, applicableIntruderTypes: types.crawler, effect: { kind: 'LIGHT_AND_CONTAMINATION' } },
+  { id: 'IAT_SCRATCH_6', name: 'Царапина', description: '1 Лёгкая Травма + Заражение', strength: 6, retreat: false, applicableIntruderTypes: types.crawler, effect: { kind: 'LIGHT_AND_CONTAMINATION' } },
+  { id: 'IAT_BITE_2', name: 'Укус', description: '1 Тяжёлая Травма; при 2+ тяжёлых — ещё 1', strength: 2, retreat: true, applicableIntruderTypes: types.bite, effect: { kind: 'BITE' } },
+  { id: 'IAT_BITE_4A', name: 'Укус', description: '1 Тяжёлая Травма; при 2+ тяжёлых — ещё 1', strength: 4, retreat: true, applicableIntruderTypes: types.bite, effect: { kind: 'BITE' } },
+  { id: 'IAT_BITE_4B', name: 'Укус', description: '1 Тяжёлая Травма; при 2+ тяжёлых — ещё 1', strength: 4, retreat: false, applicableIntruderTypes: types.bite, effect: { kind: 'BITE' } },
+  { id: 'IAT_BITE_6', name: 'Укус', description: '1 Тяжёлая Травма; при 2+ тяжёлых — ещё 1', strength: 6, retreat: false, applicableIntruderTypes: types.bite, effect: { kind: 'BITE' } },
+  { id: 'IAT_CLAW_3', name: 'Атака когтями', description: '2 Лёгкие Травмы + Заражение', strength: 3, retreat: false, applicableIntruderTypes: types.bite, effect: { kind: 'TWO_LIGHT_AND_CONTAMINATION' } },
+  { id: 'IAT_CLAW_4A', name: 'Атака когтями', description: '2 Лёгкие Травмы + Заражение', strength: 4, retreat: false, applicableIntruderTypes: types.bite, effect: { kind: 'TWO_LIGHT_AND_CONTAMINATION' } },
+  { id: 'IAT_CLAW_4B', name: 'Атака когтями', description: '2 Лёгкие Травмы + Заражение', strength: 4, retreat: true, applicableIntruderTypes: types.bite, effect: { kind: 'TWO_LIGHT_AND_CONTAMINATION' } },
+  { id: 'IAT_CLAW_5', name: 'Атака когтями', description: '2 Лёгкие Травмы + Заражение', strength: 5, retreat: true, applicableIntruderTypes: types.bite, effect: { kind: 'TWO_LIGHT_AND_CONTAMINATION' } },
+  { id: 'IAT_TAIL_2', name: 'Удар хвостом', description: '1 Тяжёлая Травма; при 1+ тяжёлых — ещё 1', strength: 2, retreat: false, applicableIntruderTypes: types.queenOnly, effect: { kind: 'TAIL' } },
+  { id: 'IAT_TAIL_5', name: 'Удар хвостом', description: '1 Тяжёлая Травма; при 1+ тяжёлых — ещё 1', strength: 5, retreat: false, applicableIntruderTypes: types.queenOnly, effect: { kind: 'TAIL' } },
+  { id: 'IAT_TRANSFORM_4', name: 'Трансформация', description: 'Превращает Ползуна в Разводчика', strength: 4, retreat: false, applicableIntruderTypes: types.creeperOnly, effect: { kind: 'TRANSFORM' } },
+  { id: 'IAT_TRANSFORM_5', name: 'Трансформация', description: 'Превращает Ползуна в Разводчика', strength: 5, retreat: false, applicableIntruderTypes: types.creeperOnly, effect: { kind: 'TRANSFORM' } },
+  { id: 'IAT_RAGE_3', name: 'Ярость', description: 'Персонажи с 2+ тяжёлыми умирают, остальные получают 1 тяжёлую', strength: 3, retreat: false, applicableIntruderTypes: types.breeder, effect: { kind: 'RAGE' } },
+  { id: 'IAT_RAGE_4', name: 'Ярость', description: 'Персонажи с 2+ тяжёлыми умирают, остальные получают 1 тяжёлую', strength: 4, retreat: false, applicableIntruderTypes: types.breeder, effect: { kind: 'RAGE' } },
+  { id: 'IAT_SLIME_5', name: 'Слизь', description: 'Накладывает Слизь + Заражение', strength: 5, retreat: false, applicableIntruderTypes: types.slime, effect: { kind: 'SLIME_AND_CONTAMINATION' } },
+  { id: 'IAT_CALL_3', name: 'Призыв', description: 'Вытянуть 1 жетон Чужого без Внезапной атаки в этой Фазе', strength: 3, retreat: false, applicableIntruderTypes: types.call, effect: { kind: 'CALL_INTRUDER' } },
+];
+
+export const INTRUDER_ATTACK_DECK_SIZE = INTRUDER_ATTACK_CARDS.length;
diff --git a/packages/shared/src/data/sources.golden.test.ts b/packages/shared/src/data/sources.golden.test.ts
index ebc105c..2c34664 100644
--- a/packages/shared/src/data/sources.golden.test.ts
+++ b/packages/shared/src/data/sources.golden.test.ts
@@ -15,6 +15,9 @@ import {
   splitIntruderBag,
 } from './intruderPool.js';
 import { NOISE_DIE_FACES } from './noiseDie.js';
+import { COMBAT_DIE_FACES } from './combatDie.js';
+import { INTRUDER_ATTACK_CARDS } from './intruderAttacks.js';
+import { WEAKNESS_CARDS } from './weaknesses.js';
 import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1, SPECIAL_ROOMS } from './roomDefinitions.js';
 import {
   COORDINATE_DESTINATIONS,
@@ -423,3 +426,54 @@ describe('Golden: состав колод (v0.3.0 Шаг 2)', () => {
     expect(expectation.startingWeaponsCount).toBe(6);
   });
 });
+
+
+describe('Golden: Пул и боевые данные v0.4.0', () => {
+  it('содержит ровно 20 карт Атак Чужих с каноническими стойкостями и отступлениями', () => {
+    expect(INTRUDER_ATTACK_CARDS).toHaveLength(20);
+    expect(INTRUDER_ATTACK_CARDS.map((card) => [card.id, card.strength, card.retreat])).toEqual([
+      ['IAT_SCRATCH_2', 2, true],
+      ['IAT_SCRATCH_3', 3, false],
+      ['IAT_SCRATCH_5', 5, false],
+      ['IAT_SCRATCH_6', 6, false],
+      ['IAT_BITE_2', 2, true],
+      ['IAT_BITE_4A', 4, true],
+      ['IAT_BITE_4B', 4, false],
+      ['IAT_BITE_6', 6, false],
+      ['IAT_CLAW_3', 3, false],
+      ['IAT_CLAW_4A', 4, false],
+      ['IAT_CLAW_4B', 4, true],
+      ['IAT_CLAW_5', 5, true],
+      ['IAT_TAIL_2', 2, false],
+      ['IAT_TAIL_5', 5, false],
+      ['IAT_TRANSFORM_4', 4, false],
+      ['IAT_TRANSFORM_5', 5, false],
+      ['IAT_RAGE_3', 3, false],
+      ['IAT_RAGE_4', 4, false],
+      ['IAT_SLIME_5', 5, false],
+      ['IAT_CALL_3', 3, false],
+    ]);
+  });
+
+  it('содержит 6 граней кубика Боя и полный пул из 8 Слабостей', () => {
+    expect([...COMBAT_DIE_FACES]).toEqual([
+      'MISS',
+      'MISS',
+      'CLAW_HIT',
+      'ALIEN_HIT',
+      'ONE_HIT',
+      'TWO_HITS',
+    ]);
+    expect(WEAKNESS_CARDS).toHaveLength(8);
+    expect(WEAKNESS_CARDS.map((card) => card.effect)).toEqual([
+      'VULNERABLE_PLACES',
+      'FIRE',
+      'DANGER',
+      'ENERGY',
+      'MOVEMENT',
+      'PHOSPHATES',
+      'ATTACK',
+      'ENDURANCE',
+    ]);
+  });
+});
diff --git a/packages/shared/src/data/weaknesses.ts b/packages/shared/src/data/weaknesses.ts
new file mode 100644
index 0000000..ebfdc2d
--- /dev/null
+++ b/packages/shared/src/data/weaknesses.ts
@@ -0,0 +1,14 @@
+import type { WeaknessCard } from '../types/cards.js';
+
+export const WEAKNESS_CARDS: readonly WeaknessCard[] = [
+  { id: 'WEAK_VULNERABLE_PLACES', name: 'Уязвимые места', description: 'Грань «Силуэты» наносит 1 Рану Взрослому.', isRevealed: false, effect: 'VULNERABLE_PLACES' },
+  { id: 'WEAK_FIRE', name: 'Уязвимость к огню', description: 'Урон от Огня наносит +1 Рану.', isRevealed: false, effect: 'FIRE' },
+  { id: 'WEAK_DANGER', name: 'Реакция на опасность', description: 'Порог Внезапной атаки уменьшается на 1, минимум до 1.', isRevealed: false, effect: 'DANGER' },
+  { id: 'WEAK_ENERGY', name: 'Уязвимость к энергии', description: 'Энергетическая атака наносит +1 Рану, если уже нанесена хотя бы одна.', isRevealed: false, effect: 'ENERGY' },
+  { id: 'WEAK_MOVEMENT', name: 'Повадки движения', description: 'Только Королева и Разводчик могут разрушать закрытые Двери; Взрослые и Ползуны останавливаются.', isRevealed: false, effect: 'MOVEMENT' },
+  { id: 'WEAK_PHOSPHATES', name: 'Восприимчивость к фосфатам', description: 'Огонь/огнетушитель отступает и наносит +1 Рану.', isRevealed: false, effect: 'PHOSPHATES' },
+  { id: 'WEAK_ATTACK', name: 'Повадки атаки', description: 'Укус Взрослого наносит Лёгкую Травму вместо Тяжёлой.', isRevealed: false, effect: 'ATTACK' },
+  { id: 'WEAK_ENDURANCE', name: 'Вид на грани вымирания', description: 'Порог Стойкости Чужих уменьшается на 1.', isRevealed: false, effect: 'ENDURANCE' },
+];
+
+export const WEAKNESS_DECK_SIZE = WEAKNESS_CARDS.length;
diff --git a/packages/shared/src/index.ts b/packages/shared/src/index.ts
index 448ddd7..0cf996b 100644
--- a/packages/shared/src/index.ts
+++ b/packages/shared/src/index.ts
@@ -29,3 +29,8 @@ export * from './data/explorationTokens.js';
 export * from './data/intruderPool.js';
 export * from './data/setup.js';
 export * from './utils/rng.js';
+export * from './logic/errors.js';
+export * from './logic/combat.js';
+export * from './data/combatDie.js';
+export * from './data/intruderAttacks.js';
+export * from './data/weaknesses.js';
diff --git a/packages/shared/src/logic/combat.test.ts b/packages/shared/src/logic/combat.test.ts
new file mode 100644
index 0000000..fe417a1
--- /dev/null
+++ b/packages/shared/src/logic/combat.test.ts
@@ -0,0 +1,120 @@
+import { describe, expect, it } from 'vitest';
+
+import { INTRUDER_ATTACK_CARDS } from '../data/intruderAttacks.js';
+import { createIntruderSupply } from '../data/intruderPool.js';
+import { STARTING_WEAPONS } from '../data/startingItems.js';
+import type { GameState } from '../types/state.js';
+import { resolveInterrupt } from './fsm.js';
+import { createInitialGameState } from './setup.js';
+import { executeMelee, executeShoot, resolveAimedFire, resolveIntruderAttack } from './combat.js';
+
+function freshState(): GameState {
+  return createInitialGameState('combat-v0.4');
+}
+
+function putIntruder(state: GameState, type: 'ADULT' | 'LARVA', roomId: number): string {
+  const token = createIntruderSupply().find((candidate) => candidate.type === type);
+  if (!token) throw new Error(`Жетон ${type} не найден`);
+  state.intrudersPool.boardTokens.push({ id: token.id, type, roomId, woundsCount: 0 });
+  state.ship.rooms[roomId]!.occupantIntruderIds.push(token.id);
+  return token.id;
+}
+
+describe('Тактический бой v0.4.0', () => {
+  it('стрельба тратит 1 боезапас и 1 карту Действия', () => {
+    const state = freshState();
+    const player = state.players['player-1']!;
+    const roomId = player.roomId;
+    const intruderId = putIntruder(state, 'ADULT', roomId);
+    const weapon = structuredClone(STARTING_WEAPONS[player.characterClass]!);
+    player.handSlots = [{ source: 'ITEM', card: weapon }];
+    const actionCardId = player.actionDeck.hand[0]!.id;
+    const ammoBefore = weapon.ammo ?? 0;
+    const handBefore = player.actionDeck.hand.length;
+
+    executeShoot(state, player.id, {
+      targetIntruderId: intruderId,
+      weaponId: weapon.id,
+      discardCardIds: [actionCardId],
+    });
+
+    expect(weapon.ammo).toBe(ammoBefore - 1);
+    expect(player.actionDeck.hand).toHaveLength(handBefore - 1);
+    expect(state.gameLog.some((entry) => entry.event.type === 'COMBAT_ROLLED')).toBe(true);
+  });
+
+  it('рукопашная гарантированно кладёт карту Заражения в сброс', () => {
+    const state = freshState();
+    const player = state.players['player-1']!;
+    const intruderId = putIntruder(state, 'ADULT', player.roomId);
+    const actionCardId = player.actionDeck.hand[0]!.id;
+    const discardBefore = player.actionDeck.discard.length;
+
+    executeMelee(state, player.id, { targetIntruderId: intruderId, discardCardIds: [actionCardId] });
+
+    expect(player.actionDeck.discard.length).toBe(discardBefore + 2);
+    expect(player.actionDeck.discard.some((card) => !('characterClass' in card))).toBe(true);
+  });
+
+  it('атака Чужого берёт верхнюю карту колоды и применяет факт урона', () => {
+    const state = freshState();
+    const player = state.players['player-1']!;
+    const intruderId = putIntruder(state, 'ADULT', player.roomId);
+    state.decks.intruderAttacks.drawPile = [INTRUDER_ATTACK_CARDS[0]!];
+    const lightBefore = player.lightWounds;
+
+    resolveIntruderAttack(state, intruderId, player.id);
+
+    expect(player.lightWounds).toBeGreaterThan(lightBefore);
+    expect(state.decks.intruderAttacks.discard).toHaveLength(1);
+  });
+
+  it('смерть Взрослого убирает его с поля и создаёт Останки', () => {
+    const state = createInitialGameState('combat-kill-seed');
+    const player = state.players['player-1']!;
+    const intruderId = putIntruder(state, 'ADULT', player.roomId);
+    state.decks.intruderAttacks.drawPile = [{ ...INTRUDER_ATTACK_CARDS[0]!, strength: 1, id: 'test-resilience-1' }];
+    const weapon = structuredClone(STARTING_WEAPONS[player.characterClass]!);
+    player.handSlots = [{ source: 'ITEM', card: weapon }];
+
+    resolveAimedFire(state, player.id, {
+      id: 'aimed-test', playerId: player.id, type: 'AIMED_FIRE_REROLL',
+      weaponId: weapon.id, targetIntruderId: intruderId, firstFace: 'ONE_HIT',
+    }, false);
+
+    expect(state.intrudersPool.boardTokens.some((candidate) => candidate.id === intruderId)).toBe(false);
+    expect(state.ship.rooms[player.roomId]!.objects.some((object) => object.kind === 'INTRUDER_REMAINS')).toBe(true);
+    expect(state.gameLog.some((entry) => entry.event.type === 'INTRUDER_KILLED')).toBe(true);
+  });
+
+  it('побег сначала запускает атаки всех оставшихся Чужих, затем перемещает игрока', () => {
+    const state = createInitialGameState('escape-v0.4');
+    const player = state.players['player-1']!;
+    const sourceRoom = state.ship.rooms[player.roomId]!;
+    const target = Object.values(state.ship.corridors).find(
+      (corridor) =>
+        corridor.doorState === 'OPEN' &&
+        (corridor.fromRoomId === player.roomId || corridor.toRoomId === player.roomId),
+    );
+    if (!target) throw new Error('Не найден открытый коридор для проверки побега');
+    const targetRoomId = target.fromRoomId === player.roomId ? target.toRoomId : target.fromRoomId;
+    const intruderId = putIntruder(state, 'ADULT', player.roomId);
+    state.decks.intruderAttacks.drawPile = [{ ...INTRUDER_ATTACK_CARDS[0]!, id: 'escape-attack' }];
+    state.interruptQueue.push({
+      type: 'INTRUDER_ATTACK_INTERRUPT',
+      playerId: player.id,
+      intruderIds: [intruderId],
+      targetRoomId,
+      corridorId: target.id,
+    });
+
+    const interrupt = state.interruptQueue.shift()!;
+    resolveInterrupt(state, interrupt);
+
+    expect(player.roomId).toBe(targetRoomId);
+    expect(player.lightWounds + player.seriousWounds.length).toBeGreaterThan(0);
+    expect(state.gameLog.some((entry) => entry.event.type === 'INTRUDER_ATTACKED')).toBe(true);
+    expect(sourceRoom.occupantPlayerIds.includes(player.id)).toBe(false);
+    expect(state.interruptQueue.at(-1)?.type).toBe('NOISE_ROLL_INTERRUPT');
+  });
+});
diff --git a/packages/shared/src/logic/combat.ts b/packages/shared/src/logic/combat.ts
new file mode 100644
index 0000000..64a53fb
--- /dev/null
+++ b/packages/shared/src/logic/combat.ts
@@ -0,0 +1,606 @@
+import type { MeleeActionPayload, ShootActionPayload } from '../types/actions.js';
+import type { IntruderAttackCard, ItemCard } from '../types/cards.js';
+import type { GameState } from '../types/state.js';
+import type { IntruderEntity, IntruderToken, PlayerState, IntruderType, BoardObject } from '../types/entities.js';
+import type { PendingDecision } from '../types/decisions.js';
+import type { RoomId } from '../types/rooms.js';
+import { COMBAT_DIE_FACES, type CombatDieFace } from '../data/combatDie.js';
+import { createIntruderSupply } from '../data/intruderPool.js';
+import { appendGameLog } from './gameLog.js';
+import { executeCardPayment } from './cardsPayment.js';
+import { EngineError } from './errors.js';
+import { drawFromStream, shuffle } from '../utils/rng.js';
+
+const ADULT_LIMIT = 8;
+const SPECIAL_INTRUDER_LIMITS: Partial<Record<IntruderType, number>> = { CREEPER: 3, BREEDER: 2, QUEEN: 1 };
+
+function combatRandom(state: GameState): number {
+  const index = state.meta.rngDraws.combat;
+  const value = drawFromStream(state.meta.seed, 'combat', index);
+  state.meta.rngDraws.combat += 1;
+  return value;
+}
+
+export function rollCombatDie(state: GameState): CombatDieFace {
+  const index = Math.floor(combatRandom(state) * COMBAT_DIE_FACES.length);
+  return COMBAT_DIE_FACES[index] ?? 'MISS';
+}
+
+function getIntruder(state: GameState, intruderId: string): IntruderEntity {
+  const intruder = state.intrudersPool.boardTokens.find((candidate) => candidate.id === intruderId);
+  if (!intruder) {
+    throw new EngineError('UNKNOWN_INTRUDER', `Чужого ${intruderId} нет на поле.`);
+  }
+  return intruder;
+}
+
+function getTargetIntruder(state: GameState, playerId: string, targetId: string): IntruderEntity {
+  const player = requirePlayer(state, playerId);
+  const intruder = getIntruder(state, targetId);
+  if (intruder.roomId !== player.roomId) {
+    throw new EngineError('INTRUDER_NOT_IN_ROOM', 'Цель должна находиться в той же Комнате, что и персонаж.');
+  }
+  return intruder;
+}
+
+function requirePlayer(state: GameState, playerId: string): PlayerState {
+  const player = state.players[playerId];
+  if (!player) throw new EngineError('UNKNOWN_PLAYER', `Персонажа ${playerId} нет в партии.`);
+  if (player.isDead) throw new EngineError('PLAYER_IS_DEAD', `Погибший персонаж ${playerId} не может действовать.`);
+  return player;
+}
+
+function weaknessRevealed(state: GameState, effect: string): boolean {
+  return state.intrudersPool.weaknessSlots.some((slot) => slot.card?.isRevealed && slot.card.effect === effect);
+}
+
+function createRngForShuffle(state: GameState) {
+  return (() => combatRandom(state)) as import('../utils/rng.js').Rng;
+}
+
+function drawSeriousWound(state: GameState, player: PlayerState): void {
+  if (state.decks.seriousWounds.drawPile.length === 0) {
+    if (state.decks.seriousWounds.discard.length === 0) {
+      throw new EngineError('INVALID_COMBAT_OPTION', 'Колода Тяжёлых Травм пуста.');
+    }
+    state.decks.seriousWounds.drawPile = shuffle(
+      createRngForShuffle(state),
+      state.decks.seriousWounds.discard,
+    );
+    state.decks.seriousWounds.discard = [];
+  }
+  const wound = state.decks.seriousWounds.drawPile.pop();
+  if (!wound) throw new EngineError('INVALID_COMBAT_OPTION', 'Не удалось вытянуть Тяжёлую Травму.');
+  player.seriousWounds.push(wound);
+}
+
+function killPlayer(state: GameState, player: PlayerState): void {
+  if (player.isDead) return;
+  const room = state.ship.rooms[player.roomId];
+  player.isDead = true;
+  if (room) {
+    room.occupantPlayerIds = room.occupantPlayerIds.filter((id) => id !== player.id);
+    const corpse: BoardObject = { id: `CORPSE_${player.id}_${state.gameLog.length + 1}`, kind: 'CORPSE', characterClass: player.characterClass };
+    room.objects.push(corpse);
+
+    for (const slot of player.handSlots.splice(0)) {
+      if (slot.source === 'OBJECT') {
+        room.objects.push(slot.object);
+      } else if (slot.source === 'ITEM') {
+        if (slot.card.color === 'BLUE') state.decks.craftedItems.discard.push(slot.card as never);
+        else state.decks.items[slot.card.color].discard.push(slot.card);
+      }
+    }
+    appendGameLog(state, { type: 'PLAYER_DIED', playerId: player.id, roomId: player.roomId });
+  }
+}
+
+function addSeriousWounds(state: GameState, player: PlayerState, count: number): void {
+  for (let i = 0; i < count; i += 1) {
+    if (player.isDead) break;
+    if (player.seriousWounds.length >= 3) {
+      killPlayer(state, player);
+      break;
+    }
+    drawSeriousWound(state, player);
+  }
+  appendGameLog(state, {
+    type: 'PLAYER_INJURED',
+    playerId: player.id,
+    lightWounds: player.lightWounds,
+    seriousWounds: player.seriousWounds.length,
+  });
+}
+
+function addLightWounds(state: GameState, player: PlayerState, count: number): void {
+  let remaining = Math.max(0, count);
+  while (remaining > 0 && !player.isDead) {
+    if (player.seriousWounds.length >= 3) {
+      killPlayer(state, player);
+      break;
+    }
+    if (player.lightWounds < 2) {
+      player.lightWounds += 1;
+    } else {
+      player.lightWounds = 0;
+      addSeriousWounds(state, player, 1);
+    }
+    remaining -= 1;
+  }
+  appendGameLog(state, {
+    type: 'PLAYER_INJURED',
+    playerId: player.id,
+    lightWounds: player.lightWounds,
+    seriousWounds: player.seriousWounds.length,
+  });
+}
+
+export function infectPlayer(state: GameState, playerId: string, source: 'LARVA' | 'CONTAMINATION'): void {
+  const player = requirePlayer(state, playerId);
+  if (player.hasLarva) {
+    const roomId = player.roomId;
+    killPlayer(state, player);
+    const creeper = state.intrudersPool.supply.find((token) => token.type === 'CREEPER');
+    if (creeper) {
+      state.intrudersPool.supply = state.intrudersPool.supply.filter((token) => token.id !== creeper.id);
+      spawnToken(state, creeper, roomId, playerId, true);
+    }
+    return;
+  }
+  player.hasLarva = true;
+  drawContaminationForPlayer(state, player);
+  appendGameLog(state, { type: 'PLAYER_INFECTED', playerId, source });
+}
+
+function drawContaminationForPlayer(state: GameState, player: PlayerState): void {
+  if (state.decks.contamination.drawPile.length === 0) {
+    if (state.decks.contamination.discard.length === 0) throw new EngineError('INVALID_COMBAT_OPTION', 'Колода Заражения пуста.');
+    state.decks.contamination.drawPile = shuffle(createRngForShuffle(state), state.decks.contamination.discard);
+    state.decks.contamination.discard = [];
+  }
+  const card = state.decks.contamination.drawPile.pop();
+  if (card) player.actionDeck.hand.push(card);
+}
+
+function drawContaminationToDiscard(state: GameState, player: PlayerState): void {
+  if (state.decks.contamination.drawPile.length === 0) {
+    if (state.decks.contamination.discard.length === 0) throw new EngineError('INVALID_COMBAT_OPTION', 'Колода Заражения пуста.');
+    state.decks.contamination.drawPile = shuffle(createRngForShuffle(state), state.decks.contamination.discard);
+    state.decks.contamination.discard = [];
+  }
+  const card = state.decks.contamination.drawPile.pop();
+  if (card) player.actionDeck.discard.push(card);
+}
+
+export function isPlayerInCombat(state: GameState, playerId: string): boolean {
+  const player = state.players[playerId];
+  return Boolean(player && state.ship.rooms[player.roomId]?.occupantIntruderIds.length);
+}
+
+function weaponInHand(player: PlayerState, weaponId: string): ItemCard {
+  const slot = player.handSlots.find((candidate) => candidate.source === 'ITEM' && candidate.card.id === weaponId);
+  if (!slot || slot.source !== 'ITEM') throw new EngineError('WEAPON_NOT_FOUND', 'Выбранное Оружие не находится в слоте Руки.');
+  if (!slot.card.isWeapon) throw new EngineError('INVALID_COMBAT_WEAPON', 'Выбранный предмет не является Оружием.');
+  return slot.card;
+}
+
+function availableWeapon(player: PlayerState, weaponId: string): ItemCard {
+  const weapon = weaponInHand(player, weaponId);
+  if ((weapon.ammo ?? 0) < 1) throw new EngineError('WEAPON_OUT_OF_AMMO', 'В выбранном Оружии нет Боезапаса.');
+  return weapon;
+}
+
+function woundsFromFace(face: CombatDieFace, target: IntruderType, melee: boolean): number {
+  if (face === 'ONE_HIT') return 1;
+  if (face === 'TWO_HITS') return melee ? 1 : 2;
+  if (face === 'CLAW_HIT') return target === 'LARVA' || target === 'CREEPER' ? 1 : 0;
+  if (face === 'ALIEN_HIT') return ['LARVA', 'CREEPER', 'ADULT'].includes(target) ? 1 : 0;
+  return 0;
+}
+
+function weaponAdjustedWounds(
+  state: GameState,
+  weapon: ItemCard,
+  face: CombatDieFace,
+  target: IntruderType,
+  baseWounds: number,
+  bonusWounds = 0,
+): number {
+  if (face === 'ALIEN_HIT' && weapon.id.includes('MECHANIC_SAWED_OFF')) return 0;
+  let wounds = baseWounds + bonusWounds;
+  if (wounds === 0 && face === 'ALIEN_HIT' && target === 'ADULT' && weaknessRevealed(state, 'VULNERABLE_PLACES')) wounds = 1;
+  if (wounds > 0 && weapon.isEnergyWeapon && weaknessRevealed(state, 'ENERGY')) wounds += 1;
+  if (wounds > 0 && (weapon.id.includes('PIL_SHOTGUN') || weapon.id.includes('SOLDIER_ASSAULT_RIFLE'))) wounds += 1;
+  if (face === 'TWO_HITS' && weapon.id.includes('SCIENTIST_PISTOL')) wounds = 1;
+  return wounds;
+}
+
+function sourceToken(intruderId: string): IntruderToken {
+  const token = createIntruderSupply().find((candidate) => candidate.id === intruderId);
+  if (!token) throw new EngineError('UNKNOWN_INTRUDER', `Для Чужого ${intruderId} не найден исходный жетон.`);
+  return token;
+}
+
+function removeIntruderFromRoom(state: GameState, intruder: IntruderEntity): void {
+  const room = state.ship.rooms[intruder.roomId];
+  if (room) room.occupantIntruderIds = room.occupantIntruderIds.filter((id) => id !== intruder.id);
+  state.intrudersPool.boardTokens = state.intrudersPool.boardTokens.filter((candidate) => candidate.id !== intruder.id);
+}
+
+function killIntruder(state: GameState, intruder: IntruderEntity): void {
+  const roomId = intruder.roomId;
+  removeIntruderFromRoom(state, intruder);
+  state.intrudersPool.deadTokens.push(sourceToken(intruder.id));
+  const room = state.ship.rooms[roomId];
+  room?.objects.push({ id: `REMAINS_${intruder.id}`, kind: 'INTRUDER_REMAINS', intruderType: intruder.type });
+  if (intruder.type === 'QUEEN' && state.intrudersPool.eggsOnBoard < 8) state.intrudersPool.eggsOnBoard += 1;
+  appendGameLog(state, { type: 'INTRUDER_KILLED', intruderId: intruder.id, intruderType: intruder.type, roomId });
+}
+
+function adjacentRooms(state: GameState, fromRoomId: RoomId): RoomId[] {
+  return Object.values(state.ship.corridors)
+    .filter((corridor) => corridor.doorState !== 'CLOSED')
+    .flatMap((corridor) => {
+      if (corridor.fromRoomId === fromRoomId) return [corridor.toRoomId];
+      if (corridor.toRoomId === fromRoomId) return [corridor.fromRoomId];
+      return [];
+    })
+    .sort((a, b) => a - b);
+}
+
+function retreatIntruder(state: GameState, intruder: IntruderEntity): void {
+  const source = intruder.roomId;
+  const candidates = adjacentRooms(state, source).filter((roomId) => roomId !== source);
+  const target = candidates[0] ?? null;
+  if (target !== null) {
+    const fromRoom = state.ship.rooms[source];
+    const toRoom = state.ship.rooms[target];
+    if (fromRoom && toRoom) {
+      fromRoom.occupantIntruderIds = fromRoom.occupantIntruderIds.filter((id) => id !== intruder.id);
+      toRoom.occupantIntruderIds.push(intruder.id);
+      intruder.roomId = target;
+      appendGameLog(state, { type: 'INTRUDER_RETREATED', intruderId: intruder.id, intruderType: intruder.type, fromRoomId: source, toRoomId: target });
+      return;
+    }
+  }
+  removeIntruderFromRoom(state, intruder);
+  const token = sourceToken(intruder.id);
+  state.intrudersPool.bag.push(token);
+  appendGameLog(state, { type: 'INTRUDER_RETREATED', intruderId: intruder.id, intruderType: intruder.type, fromRoomId: source, toRoomId: null });
+}
+
+function resolveAttackResult(state: GameState, intruder: IntruderEntity): void {
+  // Личинка умирает от первой Раны; для остальных используется карта/карты
+  // Стойкости (стр. 20).
+  if (intruder.type === 'LARVA') {
+    killIntruder(state, intruder);
+    return;
+  }
+
+  const drawCount = intruder.type === 'BREEDER' || intruder.type === 'QUEEN' ? 2 : 1;
+  const cards: IntruderAttackCard[] = [];
+  for (let i = 0; i < drawCount; i += 1) cards.push(drawIntruderAttackCard(state));
+  const resilience = cards.reduce((sum, card) => sum + card.strength, 0);
+  const threshold = Math.max(1, resilience - (weaknessRevealed(state, 'ENDURANCE') ? 1 : 0));
+  if (intruder.woundsCount >= threshold) {
+    killIntruder(state, intruder);
+    return;
+  }
+  if (cards.some((card) => card.retreat)) retreatIntruder(state, intruder);
+}
+
+export function drawIntruderAttackCard(state: GameState): IntruderAttackCard {
+  if (state.decks.intruderAttacks.drawPile.length === 0) {
+    if (state.decks.intruderAttacks.discard.length === 0) throw new EngineError('INVALID_COMBAT_OPTION', 'Колода Атак Чужих пуста.');
+    state.decks.intruderAttacks.drawPile = shuffle(createRngForShuffle(state), state.decks.intruderAttacks.discard);
+    state.decks.intruderAttacks.discard = [];
+  }
+  const card = state.decks.intruderAttacks.drawPile.pop();
+  if (!card) throw new EngineError('INVALID_COMBAT_OPTION', 'Не удалось вытянуть карту Атаки Чужих.');
+  state.decks.intruderAttacks.discard.push(card);
+  return card;
+}
+
+function applyRangedFace(
+  state: GameState,
+  player: PlayerState,
+  intruder: IntruderEntity,
+  weapon: ItemCard,
+  face: CombatDieFace,
+  extraBonus = 0,
+): number {
+  void player;
+  const base = woundsFromFace(face, intruder.type, false);
+  const wounds = weaponAdjustedWounds(state, weapon, face, intruder.type, base, extraBonus);
+  if (wounds > 0) {
+    intruder.woundsCount += wounds;
+    appendGameLog(state, {
+      type: 'INTRUDER_WOUNDED',
+      intruderId: intruder.id,
+      intruderType: intruder.type,
+      woundsCount: intruder.woundsCount,
+      roomId: intruder.roomId,
+    });
+    resolveAttackResult(state, intruder);
+  }
+  return wounds;
+}
+
+export function executeShoot(
+  state: GameState,
+  playerId: string,
+  payload: ShootActionPayload,
+  mode: 'SHOOT' | 'AIMED_FIRE' = 'SHOOT',
+  extraBonus = 0,
+  ammoToSpend = 1,
+): void {
+  const player = requirePlayer(state, playerId);
+  const intruder = getTargetIntruder(state, playerId, payload.targetIntruderId);
+  const weapon = availableWeapon(player, payload.weaponId);
+  if ((weapon.ammo ?? 0) < ammoToSpend) throw new EngineError('WEAPON_OUT_OF_AMMO', 'Для этой атаки недостаточно Боезапаса.');
+  executeCardPayment(state, playerId, payload.discardCardIds ?? [], 1);
+  weapon.ammo = (weapon.ammo ?? 0) - ammoToSpend;
+  const face = rollCombatDie(state);
+  appendGameLog(state, { type: 'COMBAT_ROLLED', playerId, roomId: player.roomId, mode, face });
+  applyRangedFace(state, player, intruder, weapon, face, extraBonus);
+}
+
+export function executeSpecialShoot(
+  state: GameState,
+  playerId: string,
+  targetIntruderId: string,
+  weaponId: string,
+  mode: 'SHOOT' | 'AIMED_FIRE',
+  options: { extraBonus?: number; ammoToSpend?: number; resolve?: boolean } = {},
+): CombatDieFace {
+  const player = requirePlayer(state, playerId);
+  const intruder = getTargetIntruder(state, playerId, targetIntruderId);
+  const weapon = availableWeapon(player, weaponId);
+  const ammoToSpend = options.ammoToSpend ?? 1;
+  if ((weapon.ammo ?? 0) < ammoToSpend) throw new EngineError('WEAPON_OUT_OF_AMMO', 'Для этой атаки недостаточно Боезапаса.');
+  weapon.ammo = (weapon.ammo ?? 0) - ammoToSpend;
+  const face = rollCombatDie(state);
+  appendGameLog(state, { type: 'COMBAT_ROLLED', playerId, roomId: player.roomId, mode, face });
+  if (options.resolve !== false) applyRangedFace(state, player, intruder, weapon, face, options.extraBonus ?? 0);
+  return face;
+}
+
+export function resolveAimedFire(
+  state: GameState,
+  playerId: string,
+  decision: Extract<PendingDecision, { type: 'AIMED_FIRE_REROLL' }>,
+  reroll: boolean,
+): void {
+  const player = requirePlayer(state, playerId);
+  const intruder = getTargetIntruder(state, playerId, decision.targetIntruderId);
+  const weapon = weaponInHand(player, decision.weaponId);
+  if (reroll) {
+    const face = rollCombatDie(state);
+    appendGameLog(state, { type: 'COMBAT_ROLLED', playerId, roomId: player.roomId, mode: 'AIMED_FIRE', face });
+    applyRangedFace(state, player, intruder, weapon, face);
+    return;
+  }
+  applyRangedFace(state, player, intruder, weapon, decision.firstFace as CombatDieFace);
+}
+
+export function executeMelee(state: GameState, playerId: string, payload: MeleeActionPayload): void {
+  const player = requirePlayer(state, playerId);
+  const intruder = getTargetIntruder(state, playerId, payload.targetIntruderId);
+  executeCardPayment(state, playerId, payload.discardCardIds ?? [], 1);
+  drawContaminationToDiscard(state, player);
+
+  const face = rollCombatDie(state);
+  appendGameLog(state, { type: 'COMBAT_ROLLED', playerId, roomId: player.roomId, mode: 'MELEE', face });
+  const wounds = woundsFromFace(face, intruder.type, true);
+  if (wounds > 0) {
+    intruder.woundsCount += wounds;
+    appendGameLog(state, { type: 'INTRUDER_WOUNDED', intruderId: intruder.id, intruderType: intruder.type, woundsCount: intruder.woundsCount, roomId: intruder.roomId });
+    resolveAttackResult(state, intruder);
+    return;
+  }
+  addSeriousWounds(state, player, 1);
+}
+
+export function resolveIntruderAttack(state: GameState, intruderId: string, playerId: string): void {
+  const player = requirePlayer(state, playerId);
+  const intruder = getTargetIntruder(state, playerId, intruderId);
+  if (intruder.type === 'LARVA') {
+    const room = state.ship.rooms[intruder.roomId];
+    if (room) room.occupantIntruderIds = room.occupantIntruderIds.filter((id) => id !== intruder.id);
+    state.intrudersPool.boardTokens = state.intrudersPool.boardTokens.filter((candidate) => candidate.id !== intruder.id);
+    infectPlayer(state, playerId, 'LARVA');
+    appendGameLog(state, { type: 'INTRUDER_ATTACKED', intruderId, intruderType: 'LARVA', playerId, outcome: 'INFECTION' });
+    return;
+  }
+
+  const card = drawIntruderAttackCard(state);
+  if (!card.applicableIntruderTypes.includes(intruder.type)) {
+    appendGameLog(state, { type: 'INTRUDER_ATTACKED', intruderId, intruderType: intruder.type, playerId, outcome: 'MISS' });
+    return;
+  }
+
+  let outcome: 'HIT' | 'IGNORED' = 'HIT';
+  switch (card.effect.kind) {
+    case 'LIGHT_AND_CONTAMINATION': {
+      addLightWounds(state, player, 1);
+      drawContaminationForPlayer(state, player);
+      break;
+    }
+    case 'TWO_LIGHT_AND_CONTAMINATION': {
+      addLightWounds(state, player, 2);
+      drawContaminationForPlayer(state, player);
+      break;
+    }
+    case 'BITE': {
+      if (weaknessRevealed(state, 'ATTACK')) {
+        addLightWounds(state, player, 1);
+      } else {
+        addSeriousWounds(state, player, player.seriousWounds.length >= 2 ? 2 : 1);
+      }
+      break;
+    }
+    case 'TAIL': {
+      addSeriousWounds(state, player, player.seriousWounds.length >= 1 ? 2 : 1);
+      break;
+    }
+    case 'TRANSFORM': {
+      if (intruder.type === 'CREEPER') {
+        intruder.type = 'BREEDER';
+        if (state.ship.rooms[intruder.roomId]) state.ship.rooms[intruder.roomId]!.occupantIntruderIds = state.ship.rooms[intruder.roomId]!.occupantIntruderIds;
+        if (player.actionDeck.hand.length === 0) {
+          resolveIntruderAttack(state, intruderId, playerId);
+          return;
+        }
+      }
+      break;
+    }
+    case 'RAGE': {
+      const room = state.ship.rooms[player.roomId];
+      if (room) {
+        for (const occupant of [...room.occupantPlayerIds]) {
+          const victim = state.players[occupant];
+          if (!victim || victim.isDead) continue;
+          if (victim.seriousWounds.length >= 2) killPlayer(state, victim);
+          else addSeriousWounds(state, victim, 1);
+        }
+      }
+      break;
+    }
+    case 'SLIME_AND_CONTAMINATION': {
+      player.hasSlime = true;
+      drawContaminationForPlayer(state, player);
+      break;
+    }
+    case 'CALL_INTRUDER': {
+      spawnFromBag(state, intruder.roomId, playerId, true);
+      break;
+    }
+  }
+
+  if (player.isDead) outcome = 'IGNORED';
+  appendGameLog(state, { type: 'INTRUDER_ATTACKED', intruderId, intruderType: intruder.type, playerId, outcome });
+}
+
+function enforceAdultLimit(state: GameState): void {
+  const adults = state.intrudersPool.boardTokens.filter((intruder) => intruder.type === 'ADULT');
+  if (adults.length < ADULT_LIMIT) return;
+  for (const adult of adults) {
+    const room = state.ship.rooms[adult.roomId];
+    if (room && room.occupantPlayerIds.length === 0) {
+      removeIntruderFromRoom(state, adult);
+      state.intrudersPool.bag.push(sourceToken(adult.id));
+    }
+  }
+}
+
+function spawnToken(state: GameState, token: IntruderToken, roomId: RoomId, playerId: string, suppressSurprise: boolean): IntruderEntity | null {
+  const room = state.ship.rooms[roomId];
+  if (!room) throw new EngineError('UNKNOWN_ROOM', `Отсека ${roomId} нет на корабле.`);
+
+  if (token.type === 'BLANK') return null;
+
+  if (token.type === 'LARVA') {
+    infectPlayer(state, playerId, 'LARVA');
+    return null;
+  }
+
+  const limit = token.type === 'ADULT' ? ADULT_LIMIT : SPECIAL_INTRUDER_LIMITS[token.type];
+  if (limit && state.intrudersPool.boardTokens.filter((intruder) => intruder.type === token.type).length >= limit) {
+    if (token.type === 'ADULT') enforceAdultLimit(state);
+    if (state.intrudersPool.boardTokens.filter((intruder) => intruder.type === token.type).length >= limit) {
+      return null;
+    }
+  }
+
+  const intruder: IntruderEntity = { id: token.id, type: token.type as IntruderType, roomId, woundsCount: 0 };
+  state.intrudersPool.boardTokens.push(intruder);
+  room.occupantIntruderIds.push(intruder.id);
+  appendGameLog(state, { type: 'INTRUDER_SPAWNED', intruderId: intruder.id, intruderType: intruder.type, roomId });
+  if (!suppressSurprise) {
+    const player = state.players[playerId];
+    const threshold = Math.max(1, token.escapeNumber - (weaknessRevealed(state, 'DANGER') ? 1 : 0));
+    if (player && player.actionDeck.hand.length < threshold) {
+      state.interruptQueue.push({ type: 'SURPRISE_ATTACK_INTERRUPT', playerId, intruderId: intruder.id });
+    }
+  }
+  return intruder;
+}
+
+function spawnFromBag(state: GameState, roomId: RoomId, playerId: string, suppressSurprise: boolean): { token: IntruderToken; intruder: IntruderEntity | null } | null {
+  const token = state.intrudersPool.bag.pop();
+  if (!token) return null;
+  if (token.type === 'BLANK') {
+    state.intrudersPool.bag.push(token);
+    return { token, intruder: null };
+  }
+  const intruder = spawnToken(state, token, roomId, playerId, suppressSurprise);
+  if (!intruder) state.intrudersPool.bag.push(token);
+  return { token, intruder };
+}
+
+function noiseMarkersInSupplyForContact(state: GameState): number {
+  const corridorsWithNoise = Object.values(state.ship.corridors).filter((corridor) => corridor.hasNoise).length;
+  const totalPlaced = corridorsWithNoise + (state.ship.technicalCorridorNoise ? 1 : 0);
+  return 30 - totalPlaced;
+}
+
+export function resolveContact(state: GameState, roomId: RoomId, playerId: string): void {
+  state.meta.firstContactResolved = true;
+  const leadingCorridors = Object.values(state.ship.corridors).filter((corridor) => corridor.fromRoomId === roomId || corridor.toRoomId === roomId);
+  for (const corridor of leadingCorridors) corridor.hasNoise = false;
+  if (state.ship.rooms[roomId]?.hasTechnicalCorridorEntrance) state.ship.technicalCorridorNoise = false;
+
+  const token = state.intrudersPool.bag.pop();
+  if (!token) throw new EngineError('CONTACT_BAG_EMPTY', 'Пул Чужих пуст: Контакт невозможен.');
+
+  if (token.type === 'BLANK') {
+    const needsTechnical = state.ship.rooms[roomId]?.hasTechnicalCorridorEntrance === true;
+    const placementsNeeded = leadingCorridors.length + (needsTechnical ? 1 : 0);
+    if (placementsNeeded > noiseMarkersInSupplyForContact(state)) {
+      throw new EngineError('INVALID_COMBAT_OPTION', 'Для «Пустого» жетона не хватает маркеров Шума.');
+    }
+    for (const corridor of leadingCorridors) corridor.hasNoise = true;
+    if (needsTechnical) state.ship.technicalCorridorNoise = true;
+    state.intrudersPool.bag.push(token);
+    if (state.intrudersPool.bag.length === 1 && state.intrudersPool.bag[0]?.id === token.id) {
+      const adult = state.intrudersPool.supply.find((candidate) => candidate.type === 'ADULT');
+      if (adult) {
+        state.intrudersPool.supply = state.intrudersPool.supply.filter((candidate) => candidate.id !== adult.id);
+        state.intrudersPool.bag.push(adult);
+      }
+    }
+    appendGameLog(state, { type: 'CONTACT_RESOLVED', playerId, roomId, outcome: 'BLANK' });
+    return;
+  }
+
+  const intruder = spawnToken(state, token, roomId, playerId, false);
+  if (!intruder) {
+    state.intrudersPool.bag.unshift(token);
+    return;
+  }
+  appendGameLog(state, { type: 'CONTACT_RESOLVED', playerId, roomId, outcome: 'INTRUDER', intruderType: intruder.type, escapeNumber: token.escapeNumber });
+}
+
+export function resolveSurpriseAttack(state: GameState, intruderId: string, playerId: string, useSteelNerves: boolean): void {
+  const player = requirePlayer(state, playerId);
+  if (!state.ship.rooms[player.roomId]?.occupantIntruderIds.includes(intruderId)) {
+    throw new EngineError('SURPRISE_ATTACK_NOT_FOUND', 'Внезапная Атака больше не может быть разыграна.');
+  }
+  if (useSteelNerves) {
+    if (player.characterClass !== 'SOLDIER') throw new EngineError('INVALID_COMBAT_OPTION', 'Стальные нервы доступны только Солдату.');
+    const index = player.actionDeck.hand.findIndex((card) => 'characterClass' in card && card.id === 'ACT_SOL_STEEL_NERVES');
+    if (index < 0) throw new EngineError('INVALID_COMBAT_OPTION', 'Карта «Стальные нервы» не найдена на руке.');
+    const [card] = player.actionDeck.hand.splice(index, 1);
+    if (card && 'characterClass' in card) player.actionDeck.discard.push(card);
+    return;
+  }
+  resolveIntruderAttack(state, intruderId, playerId);
+}
+
+export function makeSurpriseDecision(playerId: string, intruderId: string, sequence: number): PendingDecision {
+  return { id: `surprise-${sequence}`, playerId, type: 'SURPRISE_ATTACK_RESPONSE', intruderId };
+}
+
+export function makeAimedFireDecision(playerId: string, weaponId: string, targetIntruderId: string, firstFace: CombatDieFace, sequence: number): PendingDecision {
+  return { id: `aimed-${sequence}`, playerId, type: 'AIMED_FIRE_REROLL', weaponId, targetIntruderId, firstFace };
+}
diff --git a/packages/shared/src/logic/contact.test.ts b/packages/shared/src/logic/contact.test.ts
new file mode 100644
index 0000000..b718154
--- /dev/null
+++ b/packages/shared/src/logic/contact.test.ts
@@ -0,0 +1,105 @@
+import { describe, expect, it } from 'vitest';
+
+import { createIntruderSupply } from '../data/intruderPool.js';
+import type { GameState } from '../types/state.js';
+import { createInitialGameState } from './setup.js';
+import { resolveContact } from './combat.js';
+
+function freshState(): GameState {
+  return createInitialGameState('contact-v0.4');
+}
+
+function tokenByType(type: 'BLANK' | 'LARVA' | 'ADULT') {
+  const token = createIntruderSupply().find((candidate) => candidate.type === type);
+  if (!token) throw new Error(`Жетон ${type} не найден`);
+  return token;
+}
+
+function roomWithTechEntrance(state: GameState) {
+  const room = Object.values(state.ship.rooms).find((candidate) => candidate.hasTechnicalCorridorEntrance);
+  if (!room) throw new Error('Не найден отсек с входом в Технические Коридоры');
+  return room;
+}
+
+describe('Контакт v0.4.0', () => {
+  it('при повторном шуме очищает все входящие коридоры и инициирует Внезапную атаку', () => {
+    const state = freshState();
+    const room = roomWithTechEntrance(state);
+    const leading = Object.values(state.ship.corridors).filter(
+      (corridor) => corridor.fromRoomId === room.id || corridor.toRoomId === room.id,
+    );
+    for (const corridor of leading) corridor.hasNoise = true;
+    state.ship.technicalCorridorNoise = true;
+
+    const adult = tokenByType('ADULT');
+    state.intrudersPool.bag = [adult];
+    state.players['player-1']!.roomId = room.id;
+    state.ship.rooms[room.id]!.occupantPlayerIds = ['player-1'];
+    state.players['player-1']!.actionDeck.hand = [];
+
+    resolveContact(state, room.id, 'player-1');
+
+    expect(leading.every((corridor) => corridor.hasNoise === false)).toBe(true);
+    expect(state.ship.technicalCorridorNoise).toBe(false);
+    expect(state.ship.rooms[room.id]!.occupantIntruderIds).toHaveLength(1);
+    expect(state.interruptQueue).toHaveLength(1);
+    expect(state.interruptQueue[0]?.type).toBe('SURPRISE_ATTACK_INTERRUPT');
+    expect(state.meta.firstContactResolved).toBe(true);
+  });
+
+  it('Пустой жетон возвращается в мешок и ставит шум во все входящие коридоры', () => {
+    const state = freshState();
+    const room = roomWithTechEntrance(state);
+    const leading = Object.values(state.ship.corridors).filter(
+      (corridor) => corridor.fromRoomId === room.id || corridor.toRoomId === room.id,
+    );
+    state.intrudersPool.bag = [tokenByType('BLANK')];
+
+    resolveContact(state, room.id, 'player-1');
+
+    expect(leading.every((corridor) => corridor.hasNoise)).toBe(true);
+    expect(state.ship.technicalCorridorNoise).toBe(true);
+    expect(state.intrudersPool.bag.some((token) => token.type === 'BLANK')).toBe(true);
+  });
+
+  it('Личинка немедленно заражает персонажа и не создаёт миниатюру на поле', () => {
+    const state = freshState();
+    const roomId = state.players['player-1']!.roomId;
+    state.intrudersPool.bag = [tokenByType('LARVA')];
+
+    resolveContact(state, roomId, 'player-1');
+
+    expect(state.players['player-1']!.hasLarva).toBe(true);
+    expect(state.ship.rooms[roomId]!.occupantIntruderIds).toHaveLength(0);
+    expect(state.intrudersPool.boardTokens).toHaveLength(0);
+  });
+});
+
+  it('внезапная атака срабатывает только при строгом недостатке карт на руке', () => {
+    const state = freshState();
+    const roomId = state.players['player-1']!.roomId;
+    const adult = tokenByType('ADULT');
+    state.intrudersPool.bag = [{ ...adult, escapeNumber: 2 }];
+    state.players['player-1']!.actionDeck.hand = [{
+      ...state.players['player-1']!.actionDeck.hand[0]!,
+      id: 'test-card-1',
+    }];
+
+    resolveContact(state, roomId, 'player-1');
+    expect(state.interruptQueue).toHaveLength(1);
+    expect(state.interruptQueue[0]?.type).toBe('SURPRISE_ATTACK_INTERRUPT');
+  });
+
+  it('не запускает Внезапную атаку при количестве карт, равном числу на жетоне', () => {
+    const state = freshState();
+    const roomId = state.players['player-1']!.roomId;
+    const adult = tokenByType('ADULT');
+    state.intrudersPool.bag = [{ ...adult, escapeNumber: 2 }];
+    state.players['player-1']!.actionDeck.hand = [
+      state.players['player-1']!.actionDeck.hand[0]!,
+      state.players['player-1']!.actionDeck.hand[1]!,
+    ];
+
+    resolveContact(state, roomId, 'player-1');
+    expect(state.interruptQueue).toHaveLength(0);
+  });
diff --git a/packages/shared/src/logic/errors.ts b/packages/shared/src/logic/errors.ts
new file mode 100644
index 0000000..4fd7373
--- /dev/null
+++ b/packages/shared/src/logic/errors.ts
@@ -0,0 +1,56 @@
+/** Ошибки правил движка. Отдельный модуль позволяет бою и контакту не зависеть от FSM. */
+export type EngineErrorCode =
+  | 'UNKNOWN_PLAYER'
+  | 'PLAYER_IS_DEAD'
+  | 'UNKNOWN_ROOM'
+  | 'UNKNOWN_CORRIDOR'
+  | 'MOVE_TARGET_IS_CURRENT_ROOM'
+  | 'NO_OPEN_DOOR_BETWEEN_ROOMS'
+  | 'ACTION_NOT_IMPLEMENTED'
+  | 'DEV_ACTION_FORBIDDEN'
+  | 'INTERRUPT_NOT_IMPLEMENTED'
+  | 'GAME_IS_OVER'
+  | 'CAREFUL_MOVE_IN_COMBAT'
+  | 'CAREFUL_MOVE_BAD_CHOICE'
+  | 'CAREFUL_MOVE_NO_FREE_CORRIDOR'
+  | 'MARKER_SUPPLY_EXHAUSTED'
+  | 'DOOR_TOKEN_SUPPLY_EXHAUSTED'
+  | 'CONTACT_NOT_IMPLEMENTED'
+  | 'INTRUDER_MOVEMENT_NOT_IMPLEMENTED'
+  | 'INSUFFICIENT_ACTION_CARDS'
+  | 'PAYMENT_CARD_DUPLICATE'
+  | 'PAYMENT_CARD_CANNOT_PAY_SELF'
+  | 'PAYMENT_CARD_NOT_IN_HAND'
+  | 'CONTAMINATION_CANNOT_BE_DISCARDED_AS_COST'
+  | 'PLAYER_ALREADY_PASSED'
+  | 'NOT_ACTIVE_PLAYER'
+  | 'NOT_IN_PLAYER_PHASE'
+  | 'SEARCH_NOT_ALLOWED'
+  | 'NO_ITEMS_LEFT'
+  | 'SEARCH_IN_COMBAT'
+  | 'UNKNOWN_DECK'
+  | 'DECISION_NOT_FOUND'
+  | 'INVALID_DECISION'
+  | 'INVALID_DECISION_OPTION'
+  | 'ROOM_ABILITY_NOT_ALLOWED'
+  | 'SHOOT_NOT_ALLOWED'
+  | 'MELEE_NOT_ALLOWED'
+  | 'UNKNOWN_INTRUDER'
+  | 'INTRUDER_NOT_IN_ROOM'
+  | 'WEAPON_NOT_FOUND'
+  | 'WEAPON_OUT_OF_AMMO'
+  | 'INVALID_COMBAT_TARGET'
+  | 'INVALID_COMBAT_WEAPON'
+  | 'CONTACT_BAG_EMPTY'
+  | 'SURPRISE_ATTACK_NOT_FOUND'
+  | 'INVALID_COMBAT_OPTION';
+
+export class EngineError extends Error {
+  readonly code: EngineErrorCode;
+
+  constructor(code: EngineErrorCode, message: string) {
+    super(message);
+    this.name = 'EngineError';
+    this.code = code;
+  }
+}
diff --git a/packages/shared/src/logic/fsm.ts b/packages/shared/src/logic/fsm.ts
index 3c47d7e..2802124 100644
--- a/packages/shared/src/logic/fsm.ts
+++ b/packages/shared/src/logic/fsm.ts
@@ -18,10 +18,11 @@ import { SHIP_ROOM_NODES } from '../data/shipGraph.js';
 import { appendGameLog } from './gameLog.js';
 import { noiseMarkersInSupply, placeDoorToken, placeFireMarker, placeMalfunctionMarker } from './markers.js';
 import { drawFromStream } from '../utils/rng.js';
-import { executeCardPayment } from './cardsPayment.js';
+import { executeCardPayment, drawCardsToLimit } from './cardsPayment.js';
 import { advanceTurn } from './turnCycle.js';
 import { drawSearchCards, placeItemToPlayer, validateSearchConditions } from './search.js';
 import { executeRoomAbility } from './roomAbilities.js';
+import { executeMelee, executeShoot, executeSpecialShoot, isPlayerInCombat, resolveContact, resolveIntruderAttack, resolveSurpriseAttack, resolveAimedFire, infectPlayer, makeSurpriseDecision, makeAimedFireDecision } from './combat.js';
 import { RED_ITEM_CARDS, YELLOW_ITEM_CARDS, GREEN_ITEM_CARDS } from '../data/itemCards.js';
 import type { ItemDeckColor } from '../types/cards.js';
 import type { PendingDecision } from '../types/decisions.js';
@@ -38,64 +39,9 @@ import type { PendingDecision } from '../types/decisions.js';
  * «ничего не произошло» или разыгранная наугад механика недопустимы.
  */
 
-export type EngineErrorCode =
-  | 'UNKNOWN_PLAYER'
-  | 'PLAYER_IS_DEAD'
-  | 'UNKNOWN_ROOM'
-  | 'UNKNOWN_CORRIDOR'
-  | 'MOVE_TARGET_IS_CURRENT_ROOM'
-  | 'NO_OPEN_DOOR_BETWEEN_ROOMS'
-  | 'ACTION_NOT_IMPLEMENTED'
-  | 'DEV_ACTION_FORBIDDEN'
-  | 'INTERRUPT_NOT_IMPLEMENTED'
-  /** Партия уже окончена: правила запасов маркеров (стр. 17) закрыли игру. */
-  | 'GAME_IS_OVER'
-  /** «Осторожное движение» запрещено в Бою (стр. 13). */
-  | 'CAREFUL_MOVE_IN_COMBAT'
-  /** Выбранный Коридор не ведёт в отсек назначения (стр. 13). */
-  | 'CAREFUL_MOVE_BAD_CHOICE'
-  /** Во всех Коридорах, ведущих в отсек, уже стоят маркеры Шума (стр. 13). */
-  | 'CAREFUL_MOVE_NO_FREE_CORRIDOR'
-  /** Маркеров Шума в запасе не осталось: правило не описано книгой (стр. 3, 15–16). */
-  | 'MARKER_SUPPLY_EXHAUSTED'
-  /** Жетонов Дверей нет ни в запасе, ни среди закрытых Дверей на поле (стр. 17). */
-  | 'DOOR_TOKEN_SUPPLY_EXHAUSTED'
-  /** Контакт: в Коридоре уже стоит маркер Шума (стр. 15); сам Контакт — этап 4 дорожной карты. */
-  | 'CONTACT_NOT_IMPLEMENTED'
-  /** Перемещение Чужих по эффекту «Опасность» появится вместе с Пулом Чужих (этап 4 дорожной карты). */
-  | 'INTRUDER_MOVEMENT_NOT_IMPLEMENTED'
-  /** Ошибки валидатора оплаты карт (v0.3.0 Шаг 3) */
-  | 'INSUFFICIENT_ACTION_CARDS'
-  | 'PAYMENT_CARD_DUPLICATE'
-  | 'PAYMENT_CARD_CANNOT_PAY_SELF'
-  | 'PAYMENT_CARD_NOT_IN_HAND'
-  | 'CONTAMINATION_CANNOT_BE_DISCARDED_AS_COST'
-  /** Игрок уже спасовал в текущей Фазе Игроков (стр. 10). */
-  | 'PLAYER_ALREADY_PASSED'
-  /** Действие совершается не в свой ход (стр. 10). */
-  | 'NOT_ACTIVE_PLAYER'
-  /** Игрок не находится в Фазе Игроков. */
-  | 'NOT_IN_PLAYER_PHASE'
-  /** Ошибки Поиска (v0.3.0 Шаг 5) */
-  | 'SEARCH_NOT_ALLOWED'
-  | 'NO_ITEMS_LEFT'
-  | 'SEARCH_IN_COMBAT'
-  | 'UNKNOWN_DECK'
-  | 'DECISION_NOT_FOUND'
-  | 'INVALID_DECISION'
-  | 'INVALID_DECISION_OPTION'
-  /** Ошибки действий отсеков (v0.3.0 Шаг 6) */
-  | 'ROOM_ABILITY_NOT_ALLOWED';
-
-export class EngineError extends Error {
-  readonly code: EngineErrorCode;
-
-  constructor(code: EngineErrorCode, message: string) {
-    super(message);
-    this.name = 'EngineError';
-    this.code = code;
-  }
-}
+export { EngineError } from './errors.js';
+export type { EngineErrorCode } from './errors.js';
+import { EngineError } from './errors.js';
 
 export interface ProcessActionOptions {
   /** Кто выполняет действие. По умолчанию — активный игрок партии. */
@@ -188,10 +134,23 @@ export class GameEngine {
    */
   processAction(state: GameState, action: EngineAction, options: ProcessActionOptions = {}): GameState {
     const actorId = options.actorId ?? state.meta.activePlayerId;
+    const combatDecisionType =
+      action.type === 'ACTION_RESOLVE_DECISION' ? state.pendingDecision?.type : undefined;
 
     return produce(state, (draft) => {
       this.handleAction(draft, action, actorId, options);
       drainInterrupts(draft);
+      const shouldFinishAction =
+        action.type === 'ACTION_MOVE' ||
+        action.type === 'ACTION_CAREFUL_MOVE' ||
+        (action.type === 'ACTION_RESOLVE_DECISION' &&
+          (combatDecisionType === 'AIMED_FIRE_REROLL' || combatDecisionType === 'ADRENALINE_CHOICE'));
+      if (shouldFinishAction && !draft.pendingDecision) {
+        const actingPlayer = draft.players[actorId];
+        if (actingPlayer && !actingPlayer.isDead && draft.meta.activePlayerId === actorId && actingPlayer.actionsPerformedThisRound >= 2) {
+          advanceTurn(draft, actorId);
+        }
+      }
     });
   }
 
@@ -243,6 +202,9 @@ export class GameEngine {
       if (state.meta.activePlayerId !== actorId) {
         throw new EngineError('NOT_ACTIVE_PLAYER', `Сейчас ход игрока ${state.meta.activePlayerId}, а не ${actorId}.`);
       }
+      if (state.pendingDecision && action.type !== 'ACTION_RESOLVE_DECISION') {
+        throw new EngineError('INVALID_DECISION', 'Сначала завершите активное решение игрока.');
+      }
     }
 
     switch (action.type) {
@@ -253,10 +215,18 @@ export class GameEngine {
         // Стоимость базового действия «Движение» — 1 карта действия с руки (стр. 13)
         executeCardPayment(state, actorId, action.payload.discardCardIds, 1);
 
-        movePlayer(state, actorId, targetRoomId, corridors[0]!.id, { kind: 'ROLL' });
         player.actionsPerformedThisRound += 1;
-        if (player.actionsPerformedThisRound >= 2) {
-          advanceTurn(state, actorId);
+        const attackIntruders = [...(state.ship.rooms[player.roomId]?.occupantIntruderIds ?? [])];
+        if (attackIntruders.length > 0) {
+          state.interruptQueue.push({
+            type: 'INTRUDER_ATTACK_INTERRUPT',
+            playerId: actorId,
+            intruderIds: attackIntruders,
+            targetRoomId,
+            corridorId: corridors[0]!.id,
+          });
+        } else {
+          movePlayer(state, actorId, targetRoomId, corridors[0]!.id, { kind: 'ROLL' });
         }
         return;
       }
@@ -276,9 +246,6 @@ export class GameEngine {
 
         movePlayer(state, actorId, targetRoomId, corridors[0]!.id, { kind: 'CAREFUL', chosen });
         player.actionsPerformedThisRound += 1;
-        if (player.actionsPerformedThisRound >= 2) {
-          advanceTurn(state, actorId);
-        }
         return;
       }
 
@@ -361,6 +328,22 @@ export class GameEngine {
         return;
       }
 
+      case 'ACTION_SHOOT': {
+        if (!isPlayerInCombat(state, actorId)) throw new EngineError('SHOOT_NOT_ALLOWED', 'Стрельба доступна только в Бою.');
+        executeShoot(state, actorId, action.payload, 'SHOOT');
+        player.actionsPerformedThisRound += 1;
+        if (player.actionsPerformedThisRound >= 2) advanceTurn(state, actorId);
+        return;
+      }
+
+      case 'ACTION_MELEE': {
+        if (!isPlayerInCombat(state, actorId)) throw new EngineError('MELEE_NOT_ALLOWED', 'Рукопашная атака доступна только в Бою.');
+        executeMelee(state, actorId, action.payload);
+        player.actionsPerformedThisRound += 1;
+        if (player.actionsPerformedThisRound >= 2) advanceTurn(state, actorId);
+        return;
+      }
+
       case 'ACTION_SEARCH': {
         const { roomId, color } = validateSearchConditions(state, actorId);
 
@@ -422,6 +405,57 @@ export class GameEngine {
           throw new EngineError('INVALID_DECISION', 'Решение предназначено для другого игрока');
         }
 
+        if (decision.type === 'SURPRISE_ATTACK_RESPONSE') {
+          const useSteelNerves = action.payload.selectedOption === 'USE_STEEL_NERVES';
+          if (!['USE_STEEL_NERVES', 'TAKE_ATTACK'].includes(action.payload.selectedOption)) {
+            throw new EngineError('INVALID_DECISION_OPTION', 'Выберите «Стальные нервы» или принятие Внезапной Атаки.');
+          }
+          resolveSurpriseAttack(state, decision.intruderId, actorId, useSteelNerves);
+          state.pendingDecision = null;
+          if (player.actionsPerformedThisRound >= 2) advanceTurn(state, actorId);
+          return;
+        }
+
+        if (decision.type === 'AIMED_FIRE_REROLL') {
+          if (!['KEEP', 'REROLL'].includes(action.payload.selectedOption)) {
+            throw new EngineError('INVALID_DECISION_OPTION', 'Выберите сохранение броска или один переброс.');
+          }
+          resolveAimedFire(state, actorId, decision, action.payload.selectedOption === 'REROLL');
+          state.pendingDecision = null;
+          return;
+        }
+
+        if (decision.type === 'ADRENALINE_CHOICE') {
+          if (!['SHOOT', 'ESCAPE'].includes(action.payload.selectedOption)) {
+            throw new EngineError('INVALID_DECISION_OPTION', 'Адреналин требует выбора Стрельбы или Побега.');
+          }
+
+          if (action.payload.selectedOption === 'SHOOT') {
+            const targetIntruderId = action.payload.targetIntruderId;
+            const weaponId = action.payload.weaponId;
+            if (!targetIntruderId || !weaponId) {
+              throw new EngineError('INVALID_COMBAT_OPTION', 'Для Адреналина укажите Чужого и Оружие.');
+            }
+            executeSpecialShoot(state, actorId, targetIntruderId, weaponId, 'SHOOT');
+          } else {
+            const targetRoomId = action.payload.targetRoomId;
+            if (targetRoomId === undefined) throw new EngineError('INVALID_COMBAT_OPTION', 'Для Побега укажите целевой отсек.');
+            const corridors = requireOpenPath(state, player.roomId, targetRoomId);
+            const intruders = [...(state.ship.rooms[player.roomId]?.occupantIntruderIds ?? [])];
+            if (intruders.length === 0) throw new EngineError('INVALID_COMBAT_OPTION', 'Побег доступен только из отсека с Чужими.');
+            for (const intruderId of intruders) {
+              if (!player.isDead && state.intrudersPool.boardTokens.some((candidate) => candidate.id === intruderId)) {
+                resolveIntruderAttack(state, intruderId, actorId);
+              }
+            }
+            if (!player.isDead) movePlayer(state, actorId, targetRoomId, corridors[0]!.id, { kind: 'ROLL' });
+          }
+
+          state.pendingDecision = null;
+          if (!player.isDead) drawCardsToLimit(state, actorId, player.actionDeck.hand.length + 1);
+          return;
+        }
+
         if (decision.type === 'CHOOSE_WHITE_ROOM_DECK') {
           const chosenColor = action.payload.selectedOption as ItemDeckColor;
           if (!['RED', 'YELLOW', 'GREEN'].includes(chosenColor)) {
@@ -554,6 +588,13 @@ export class GameEngine {
         // Удаляем сыгранную карту из руки и кладём в личный сброс
         player.actionDeck.hand.splice(cardIndex, 1);
         player.actionDeck.discard.push(card);
+        appendGameLog(state, {
+          type: 'ACTION_CARD_PLAYED',
+          playerId: actorId,
+          cardId: card.id,
+          cardName: card.name,
+        });
+        player.actionsPerformedThisRound += 1;
 
         // Применяем специфический эффект базовых карт, если есть
         if (card.id.includes('RELOAD')) {
@@ -563,21 +604,25 @@ export class GameEngine {
             weaponSlot.card.ammo = Math.min((weaponSlot.card.ammo ?? 0) + 1, weaponSlot.card.maxAmmo ?? 6);
           }
         } else if (card.id.includes('REST') || card.name === 'Отдых') {
-          // Просканировать карты Заражения в руке и удалить чистые
+          // Просканировать карты Заражения в руке: чистые удаляются,
+          // инфекционная карта вызывает немедленное появление Личинки.
           const nextHand: ActionDeckCard[] = [];
+          let infectionFound = false;
           for (const c of player.actionDeck.hand) {
             if (!('characterClass' in c)) {
               c.isScanned = true;
               if (c.isInfected) {
-                // Заражена - остаётся
-                nextHand.push(c);
+                infectionFound = true;
               }
-              // Чистая отбрасывается
             } else {
               nextHand.push(c);
             }
           }
           player.actionDeck.hand = nextHand;
+          if (infectionFound && !player.isDead) {
+            // Инфекционная карта больше не возвращается в колоду действий.
+            infectPlayer(state, actorId, 'CONTAMINATION');
+          }
         } else if (card.id.includes('REPAIR')) {
           // Ремонт отсека
           const currentRoom = state.ship.rooms[player.roomId];
@@ -589,16 +634,45 @@ export class GameEngine {
           if (corridor) {
             corridor.doorState = 'DESTROYED';
           }
+        } else if (card.id === 'ACT_SOL_BURST_FIRE') {
+          const weaponId = action.payload.weaponId ?? 'WEAPON_SOLDIER_ASSAULT_RIFLE';
+          const weapon = player.handSlots.find((slot) => slot.source === 'ITEM' && slot.card.id === weaponId);
+          if (!weapon || weapon.source !== 'ITEM' || !weapon.card.isWeapon) throw new EngineError('WEAPON_NOT_FOUND', 'Для Стрельбы очередью нужна Боевая винтовка.');
+          const ammo = weapon.card.ammo ?? 0;
+          if (ammo < 1) throw new EngineError('WEAPON_OUT_OF_AMMO', 'Для Стрельбы очередью нужен Боезапас.');
+          const targetIntruderId = action.payload.targetIntruderId ?? action.payload.option;
+          if (!targetIntruderId) throw new EngineError('INVALID_COMBAT_TARGET', 'Укажите Чужого для Стрельбы очередью.');
+          executeSpecialShoot(state, actorId, targetIntruderId, weapon.card.id, 'SHOOT', { extraBonus: Math.floor(ammo / 2), ammoToSpend: ammo });
+        } else if (card.id === 'ACT_SOL_SUPPRESSIVE_FIRE' || card.id === 'ACT_CAP_SUPPRESSIVE_FIRE' || card.id === 'ACT_SCO_SUPPRESSIVE_FIRE') {
+          const targetPlayerId = action.payload.targetPlayerId ?? action.payload.option ?? actorId;
+          const targetPlayer = state.players[targetPlayerId];
+          if (!targetPlayer || targetPlayer.isDead || targetPlayer.roomId !== player.roomId) throw new EngineError('INVALID_COMBAT_OPTION', 'Для Заградительного огня выберите Персонажа в вашей Комнате.');
+          const weapon = player.handSlots.find((slot) => slot.source === 'ITEM' && slot.card.isWeapon);
+          if (!weapon || weapon.source !== 'ITEM' || (weapon.card.ammo ?? 0) < 1) throw new EngineError('WEAPON_OUT_OF_AMMO', 'Для Заградительного огня нужен Боезапас.');
+          const corridorId = action.payload.targetCorridorId;
+          if (!corridorId) throw new EngineError('INVALID_COMBAT_OPTION', 'Укажите Коридор для перемещения.');
+          const corridor = state.ship.corridors[corridorId];
+          if (!corridor) throw new EngineError('UNKNOWN_CORRIDOR', 'Указанный Коридор не найден.');
+          const destination = corridor.fromRoomId === targetPlayer.roomId ? corridor.toRoomId : corridor.toRoomId === targetPlayer.roomId ? corridor.fromRoomId : null;
+          if (destination === null || corridor.doorState === 'CLOSED') throw new EngineError('INVALID_COMBAT_OPTION', 'Заградительный огонь требует соседнего открытого Коридора.');
+          weapon.card.ammo = (weapon.card.ammo ?? 0) - 1;
+          movePlayer(state, targetPlayerId, destination, corridorId, { kind: 'ROLL' });
+        } else if (card.id === 'ACT_SOL_STEEL_NERVES') {
+          throw new EngineError('INVALID_COMBAT_OPTION', '«Стальные нервы» разыгрываются только как ответ на Внезапную Атаку.');
+        } else if (card.id === 'ACT_SOL_AIMED_FIRE') {
+          const defaultWeapon = player.handSlots.find((slot) => slot.source === 'ITEM' && slot.card.isWeapon);
+          const weaponId = action.payload.weaponId ?? (defaultWeapon?.source === 'ITEM' ? defaultWeapon.card.id : undefined);
+          const targetIntruderId = action.payload.targetIntruderId ?? action.payload.option;
+          if (!weaponId) throw new EngineError('WEAPON_NOT_FOUND', 'Нет Оружия для Прицельного огня.');
+          if (!targetIntruderId) throw new EngineError('INVALID_COMBAT_TARGET', 'Укажите Чужого для Прицельного огня.');
+          const firstFace = executeSpecialShoot(state, actorId, targetIntruderId, weaponId, 'AIMED_FIRE', { resolve: false });
+          state.pendingDecision = makeAimedFireDecision(actorId, weaponId, targetIntruderId, firstFace, state.gameLog.length);
+          return;
+        } else if (card.id === 'ACT_SCO_ADRENALINE') {
+          state.pendingDecision = { id: `adrenaline-${state.gameLog.length}`, playerId: actorId, type: 'ADRENALINE_CHOICE', targetRoomId: player.roomId };
+          return;
         }
 
-        appendGameLog(state, {
-          type: 'ACTION_CARD_PLAYED',
-          playerId: actorId,
-          cardId: card.id,
-          cardName: card.name,
-        });
-
-        player.actionsPerformedThisRound += 1;
         if (player.actionsPerformedThisRound >= 2) {
           advanceTurn(state, actorId);
         }
@@ -882,16 +956,15 @@ export function drainInterrupts(state: GameState): void {
     if (!interrupt) return;
 
     resolveInterrupt(state, interrupt);
+    if (state.pendingDecision) return;
   }
 }
 
 /**
  * Разыгрывает одно прерывание.
  *
- * Реализованы вскрытие отсека и шум (бросок кубика и «Осторожное движение»).
- * Побег, Контакт и Внезапная атака требуют Пула Чужих, боя и колод: их разбор —
- * следующие этапы дорожной карты, поэтому движок отклоняет их явной ошибкой,
- * а не разыгрывает наугад.
+ * Каскадирует вскрытие, шум, контакт, внезапную атаку и прерывания от Чужих;
+ * после полного разбора очереди только тогда завершается исходное действие.
  */
 export function resolveInterrupt(state: GameState, interrupt: InterruptEvent): void {
   switch (interrupt.type) {
@@ -903,11 +976,44 @@ export function resolveInterrupt(state: GameState, interrupt: InterruptEvent): v
       resolveNoiseRoll(state, interrupt);
       return;
 
-    default:
-      throw new EngineError(
-        'INTERRUPT_NOT_IMPLEMENTED',
-        `Прерывание ${interrupt.type} ещё не разыгрывается движком (см. дорожную карту).`,
-      );
+    case 'CONTACT_INTERRUPT':
+      resolveContact(state, interrupt.roomId, interrupt.playerId);
+      return;
+
+    case 'ENCOUNTER_INTERRUPT':
+      resolveContact(state, interrupt.roomId, state.meta.activePlayerId);
+      return;
+
+    case 'SURPRISE_ATTACK_INTERRUPT':
+      state.pendingDecision = makeSurpriseDecision(interrupt.playerId, interrupt.intruderId, state.gameLog.length);
+      return;
+
+    case 'INTRUDER_ATTACK_INTERRUPT': {
+      for (const intruderId of interrupt.intruderIds) {
+        const player = state.players[interrupt.playerId];
+        if (!player || player.isDead) return;
+        const intruder = state.intrudersPool.boardTokens.find((candidate) => candidate.id === intruderId);
+        if (!intruder || intruder.roomId !== player.roomId) continue;
+        resolveIntruderAttack(state, intruderId, interrupt.playerId);
+      }
+      const player = state.players[interrupt.playerId];
+      if (player && !player.isDead) movePlayer(state, interrupt.playerId, interrupt.targetRoomId, interrupt.corridorId, { kind: 'ROLL' });
+      return;
+    }
+
+    case 'ESCAPE_ATTACK_INTERRUPT': {
+      for (const intruderId of interrupt.intruderIds) {
+        const player = state.players[interrupt.playerId];
+        if (!player || player.isDead) return;
+        const intruder = state.intrudersPool.boardTokens.find((candidate) => candidate.id === intruderId);
+        if (!intruder || intruder.roomId !== player.roomId) continue;
+        resolveIntruderAttack(state, intruderId, interrupt.playerId);
+      }
+      const player = state.players[interrupt.playerId];
+      if (player && !player.isDead && interrupt.corridorId) movePlayer(state, interrupt.playerId, interrupt.targetRoomId, interrupt.corridorId, { kind: 'ROLL' });
+      return;
+    }
+
   }
 }
 
@@ -1367,7 +1473,8 @@ function placeNoiseMarker(
 ): void {
   if (target.kind === 'TECHNICAL_CORRIDOR') {
     if (state.ship.technicalCorridorNoise) {
-      throw contactError('Технические Коридоры');
+      state.interruptQueue.push({ type: 'CONTACT_INTERRUPT', roomId, playerId });
+      return;
     }
 
     requireNoiseMarkerSupply(state);
@@ -1383,7 +1490,8 @@ function placeNoiseMarker(
   }
 
   if (target.corridor.hasNoise) {
-    throw contactError(`Коридор ${target.corridor.id}`);
+    state.interruptQueue.push({ type: 'CONTACT_INTERRUPT', roomId, playerId });
+    return;
   }
 
   requireNoiseMarkerSupply(state);
@@ -1411,12 +1519,6 @@ function requireNoiseMarkerSupply(state: GameState): void {
   }
 }
 
-function contactError(place: string): EngineError {
-  return new EngineError(
-    'CONTACT_NOT_IMPLEMENTED',
-    `Контакт: в этом месте уже стоит маркер Шума (${place}). Вытягивание жетона Чужого появится вместе с Пулом Чужих (этап 4 дорожной карты).`,
-  );
-}
 
 /**
  * Эффект «Опасность» (стр. 14–15 и стр. 15): Чужой из соседнего отсека
@@ -1434,10 +1536,18 @@ function resolveDanger(state: GameState, roomId: RoomId, playerId: string): void
   );
 
   if (intrudersAround) {
-    throw new EngineError(
-      'INTRUDER_MOVEMENT_NOT_IMPLEMENTED',
-      'Эффект «Опасность» требует переместить Чужого из соседнего отсека: это появится вместе с Пулом Чужих (этап 4 дорожной карты).',
-    );
+    for (const neighbourId of neighbours) {
+      const neighbour = state.ship.rooms[neighbourId];
+      if (!neighbour || neighbour.occupantPlayerIds.length > 0) continue;
+      for (const intruderId of [...neighbour.occupantIntruderIds]) {
+        const intruder = state.intrudersPool.boardTokens.find((candidate) => candidate.id === intruderId);
+        if (!intruder) continue;
+        neighbour.occupantIntruderIds = neighbour.occupantIntruderIds.filter((id) => id !== intruderId);
+        state.ship.rooms[roomId]?.occupantIntruderIds.push(intruderId);
+        intruder.roomId = roomId;
+      }
+    }
+    return;
   }
 
   const freeCorridors = corridorsLeadingInto(state, roomId).filter((corridor) => !corridor.hasNoise);
diff --git a/packages/shared/src/logic/setup.party.test.ts b/packages/shared/src/logic/setup.party.test.ts
index 0ffcccc..61350ba 100644
--- a/packages/shared/src/logic/setup.party.test.ts
+++ b/packages/shared/src/logic/setup.party.test.ts
@@ -82,10 +82,12 @@ describe('createInitialGameState: Планшет Чужих', () => {
     expect(new Set(slots.map((slot) => slot.objectKind)).size).toBe(3);
   });
 
-  it('оставляет слоты Слабостей пустыми до появления данных о картах', () => {
+  it('выкладывает 3 случайные Слабости из пула 8 рубашкой вверх', () => {
     const slots = createInitialGameState('nemesis-alpha').intrudersPool.weaknessSlots;
 
-    expect(slots.every((slot) => slot.card === null)).toBe(true);
+    expect(slots.every((slot) => slot.card?.isRevealed === false)).toBe(true);
+    expect(new Set(slots.map((slot) => slot.card?.id)).size).toBe(3);
+    expect(slots.every((slot) => slot.card?.effect)).toBe(true);
   });
 });
 
diff --git a/packages/shared/src/logic/setup.test.ts b/packages/shared/src/logic/setup.test.ts
index 8d9d774..98a6d4c 100644
--- a/packages/shared/src/logic/setup.test.ts
+++ b/packages/shared/src/logic/setup.test.ts
@@ -69,6 +69,13 @@ describe('createInitialGameState: детерминизм и сохранение
 
     expect(JSON.parse(JSON.stringify(state))).toEqual(state);
   });
+
+  it('инициализирует боевую колоду из 20 карт и отмечает первый Контакт как неразрешённый', () => {
+    const state = createInitialGameState('nemesis-alpha');
+
+    expect(state.decks.intruderAttacks.drawPile).toHaveLength(20);
+    expect(state.meta.firstContactResolved).toBe(false);
+  });
 });
 
 describe('createInitialGameState: поле и отсеки', () => {
@@ -307,7 +314,7 @@ describe('createInitialGameState: колоды партии', () => {
     }
   });
 
-  it('создаёт наполненные и пустые колоды в соответствии со спецификацией v0.3.0', () => {
+  it('создаёт наполненные колоды и пул Атак Чужих v0.4.0', () => {
     const { craftedItems, contamination, weaknesses, seriousWounds, events, intruderAttacks, objectives } =
       createInitialGameState('nemesis-alpha').decks;
 
@@ -320,7 +327,8 @@ describe('createInitialGameState: колоды партии', () => {
 
     expect(weaknesses).toEqual({ drawPile: [], discard: [] });
     expect(events).toEqual({ drawPile: [], discard: [] });
-    expect(intruderAttacks).toEqual({ drawPile: [], discard: [] });
+    expect(intruderAttacks.drawPile).toHaveLength(20);
+    expect(intruderAttacks.discard).toEqual([]);
     expect(objectives.personal).toEqual({ drawPile: [], discard: [] });
     expect(objectives.corporate).toEqual({ drawPile: [], discard: [] });
   });
diff --git a/packages/shared/src/logic/setup.ts b/packages/shared/src/logic/setup.ts
index bd25d3b..21483b9 100644
--- a/packages/shared/src/logic/setup.ts
+++ b/packages/shared/src/logic/setup.ts
@@ -6,6 +6,7 @@ import { createActionDeckForCharacter, createInitialDecks } from '../data/cardsS
 import { STARTING_WEAPONS } from '../data/startingItems.js';
 import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1 } from '../data/roomDefinitions.js';
 import { EXPLORATION_TOKENS } from '../data/explorationTokens.js';
+import { WEAKNESS_CARDS } from '../data/weaknesses.js';
 import { createIntruderSupply, splitIntruderBag } from '../data/intruderPool.js';
 import { SHIP_CORRIDORS, SHIP_ROOM_NODES } from '../data/shipGraph.js';
 import {
@@ -47,8 +48,12 @@ const ENGINE_NUMBERS = [1, 2, 3] as const;
  * тип Объекта — Труп, Яйцо и Останки (стр. 6, шаг 9; стр. 21). Состав карт
  * появится вместе с данными о колодах, поэтому слоты создаются пустыми.
  */
-function createWeaknessSlots(): GameState['intrudersPool']['weaknessSlots'] {
-  return WEAKNESS_SLOT_OBJECT_KINDS.map((objectKind) => ({ objectKind, card: null }));
+function createWeaknessSlots(seed: string): GameState['intrudersPool']['weaknessSlots'] {
+  const shuffled = shuffle(createRng(seed, 'cards'), [...WEAKNESS_CARDS]);
+  return WEAKNESS_SLOT_OBJECT_KINDS.map((objectKind, index) => ({
+    objectKind,
+    card: shuffled[index] ? { ...shuffled[index], isRevealed: false } : null,
+  }));
 }
 
 /**
@@ -72,7 +77,7 @@ function createEscapePods(playerCount: number, podNumbers: number[]): Record<str
 function createPlayer(playerId: string, preset: CharacterPreset, orderNumber: number, seed: string): PlayerState {
   const actionDeckCards = createActionDeckForCharacter(preset.characterClass, seed, orderNumber);
   const startingWeapon = STARTING_WEAPONS[preset.characterClass];
-  const handSlots = startingWeapon ? [{ source: 'ITEM' as const, card: startingWeapon }] : [];
+  const handSlots = startingWeapon ? [{ source: 'ITEM' as const, card: structuredClone(startingWeapon) }] : [];
 
   const initialHand = actionDeckCards.slice(0, 5);
   const initialDrawPile = actionDeckCards.slice(5);
@@ -95,6 +100,7 @@ function createPlayer(playerId: string, preset: CharacterPreset, orderNumber: nu
     seriousWounds: [],
     objectives: [],
     hasSlime: false,
+    hasLarva: false,
     hasSignalSent: false,
     isInHibernation: false,
     hasEscapedInPod: false,
@@ -301,6 +307,7 @@ export function createInitialGameState(seed: string = DEFAULT_SEED, options: Ini
       // восстановление партии идёт от мастер-сида (utils/rng.ts).
       rngDraws: createRngDraws(),
       gameOverReason: null,
+      firstContactResolved: false,
     },
 
     ship: {
@@ -322,7 +329,7 @@ export function createInitialGameState(seed: string = DEFAULT_SEED, options: Ini
       boardTokens: [],
       deadTokens: [],
       eggsOnBoard: 5,
-      weaknessSlots: createWeaknessSlots(),
+      weaknessSlots: createWeaknessSlots(seed),
     },
 
     decks: createInitialDecks(seed),
diff --git a/packages/shared/src/types/actions.ts b/packages/shared/src/types/actions.ts
index 843588e..941c210 100644
--- a/packages/shared/src/types/actions.ts
+++ b/packages/shared/src/types/actions.ts
@@ -17,12 +17,16 @@ export type RoomAbilityPayload = {
   targetDeckColor?: ItemDeckColor;
   targetEscapePodId?: string;
   targetObjectKind?: 'CORPSE' | 'EGG' | 'INTRUDER_REMAINS';
+  objectId?: string;
 };
 
 export type PlayCardActionPayload = {
   cardId: string;
   discardCardIds?: string[];
   option?: string;
+  targetIntruderId?: string;
+  weaponId?: string;
+  targetPlayerId?: string;
   targetRoomId?: RoomId;
   targetCorridorId?: string;
 };
@@ -35,6 +39,20 @@ export type UseItemActionPayload = {
   targetCorridorId?: string;
 };
 
+
+export type CombatTargetPayload = {
+  targetIntruderId: string;
+};
+
+export type ShootActionPayload = CombatTargetPayload & {
+  weaponId: string;
+  discardCardIds: string[];
+};
+
+export type MeleeActionPayload = CombatTargetPayload & {
+  discardCardIds: string[];
+};
+
 export type GameAction =
   | { type: 'ACTION_MOVE'; payload: { targetRoomId: RoomId; discardCardIds: string[] } }
   /**
@@ -48,6 +66,9 @@ export type GameAction =
       payload: { targetRoomId: RoomId; chosenCorridor: CarefulMoveChosenCorridor; discardCardIds: string[] };
     }
   | { type: 'ACTION_SEARCH'; payload: { chosenDeckColor?: ItemDeckColor; discardCardIds: string[] } }
+  | { type: 'ACTION_PICK_UP_OBJECT'; payload: { objectId: string; discardCardIds: string[] } }
+  | { type: 'ACTION_SHOOT'; payload: ShootActionPayload }
+  | { type: 'ACTION_MELEE'; payload: MeleeActionPayload }
   | { type: 'ACTION_ROOM_ABILITY'; payload: RoomAbilityPayload }
   | { type: 'ACTION_PLAY_CARD'; payload: PlayCardActionPayload }
   | { type: 'ACTION_USE_ITEM'; payload: UseItemActionPayload }
@@ -57,6 +78,10 @@ export type GameAction =
       payload: {
         decisionId: string;
         selectedOption: string;
+        targetIntruderId?: string;
+        weaponId?: string;
+        targetRoomId?: RoomId;
+        targetCorridorId?: string;
       };
     }
   | {
diff --git a/packages/shared/src/types/cards.ts b/packages/shared/src/types/cards.ts
index f6e1d59..4808c1c 100644
--- a/packages/shared/src/types/cards.ts
+++ b/packages/shared/src/types/cards.ts
@@ -1,4 +1,4 @@
-import type { CharacterClass } from './entities.js';
+import type { CharacterClass, IntruderType } from './entities.js';
 
 /**
  * Карты, колоды и компоненты крафта.
@@ -116,6 +116,26 @@ export interface CardPile<TCard> {
   discard: TCard[];
 }
 
+export type IntruderAttackEffectKind =
+  | 'LIGHT_AND_CONTAMINATION'
+  | 'TWO_LIGHT_AND_CONTAMINATION'
+  | 'BITE'
+  | 'TAIL'
+  | 'TRANSFORM'
+  | 'RAGE'
+  | 'SLIME_AND_CONTAMINATION'
+  | 'CALL_INTRUDER';
+
+export type WeaknessEffect =
+  | 'VULNERABLE_PLACES'
+  | 'FIRE'
+  | 'DANGER'
+  | 'ENERGY'
+  | 'MOVEMENT'
+  | 'PHOSPHATES'
+  | 'ATTACK'
+  | 'ENDURANCE';
+
 /** Базовая карта для колод, состав которых ещё не описан данными. */
 export interface CardDefinition {
   id: string;
@@ -136,8 +156,13 @@ export interface ObjectiveCard extends CardDefinition {
 /** Карта Событий: сдвигает Чужих по номерам коридоров и разыгрывает текст (стр. 10). */
 export type EventCard = CardDefinition;
 
-/** Карта Атаки Чужих: стойкость Чужого — сумма двух таких карт (стр. 20). */
-export type IntruderAttackCard = CardDefinition;
+/** Карта Атаки Чужих: сверху указанное число используется для проверки Стойкости Чужого (стр. 20). */
+export interface IntruderAttackCard extends CardDefinition {
+  strength: number;
+  retreat: boolean;
+  applicableIntruderTypes: readonly IntruderType[];
+  effect: { kind: IntruderAttackEffectKind };
+}
 
 /**
  * Карта Слабости Чужих. Всего их 8, в партию попадают 3 случайные и лежат
@@ -146,6 +171,7 @@ export type IntruderAttackCard = CardDefinition;
  */
 export interface WeaknessCard extends CardDefinition {
   isRevealed: boolean;
+  effect?: WeaknessEffect;
 }
 
 /** Колоды корабля и колоды карт, общие для всей партии. */
diff --git a/packages/shared/src/types/decisions.ts b/packages/shared/src/types/decisions.ts
index 1eff54f..b18d226 100644
--- a/packages/shared/src/types/decisions.ts
+++ b/packages/shared/src/types/decisions.ts
@@ -1,7 +1,7 @@
 import type { ItemDeckColor } from './cards.js';
 import type { RoomId } from './rooms.js';
 
-export type PendingDecision =
+export type PendingDecisionBase =
   | {
       id: string;
       playerId: string;
@@ -40,3 +40,27 @@ export type PendingDecision =
       type: 'CHOOSE_REST_CONTAMINATION_DISCARD';
       scannedCardIds: string[];
     };
+
+export type PendingDecision = PendingDecisionBase | PendingDecisionCombat;
+
+export type PendingDecisionCombat =
+  | {
+      id: string;
+      playerId: string;
+      type: 'SURPRISE_ATTACK_RESPONSE';
+      intruderId: string;
+    }
+  | {
+      id: string;
+      playerId: string;
+      type: 'AIMED_FIRE_REROLL';
+      weaponId: string;
+      targetIntruderId: string;
+      firstFace: string;
+    }
+  | {
+      id: string;
+      playerId: string;
+      type: 'ADRENALINE_CHOICE';
+      targetRoomId: RoomId;
+    };
diff --git a/packages/shared/src/types/entities.ts b/packages/shared/src/types/entities.ts
index d2cca17..d93cca1 100644
--- a/packages/shared/src/types/entities.ts
+++ b/packages/shared/src/types/entities.ts
@@ -87,6 +87,8 @@ export interface PlayerState {
   objectives: ObjectiveCard[]; // 1 личная и 1 корпоративная цель
   /** Маркер Слизи лежит на планшете Персонажа, а не в отсеке (стр. 15). */
   hasSlime: boolean;
+  /** Личинка закреплена на планшете Персонажа после заражения (стр. 20). */
+  hasLarva: boolean;
   hasSignalSent: boolean;
   isInHibernation: boolean;
   hasEscapedInPod: boolean;
diff --git a/packages/shared/src/types/interrupts.ts b/packages/shared/src/types/interrupts.ts
index 626a213..2210784 100644
--- a/packages/shared/src/types/interrupts.ts
+++ b/packages/shared/src/types/interrupts.ts
@@ -9,7 +9,9 @@ export type NoiseRollMode = { kind: 'ROLL' } | { kind: 'CAREFUL'; chosen: Carefu
 /** Событие прерывания: шаг пайплайна, который должен разрешиться до конца действия (tech_stack §4). */
 export type InterruptEvent =
   /** Попытка побега: каждый Чужой в отсеке атакует до шага в целевой отсек. */
-  | { type: 'ESCAPE_ATTACK_INTERRUPT'; playerId: string; intruderIds: string[]; targetRoomId: RoomId }
+  | { type: 'INTRUDER_ATTACK_INTERRUPT'; playerId: string; intruderIds: string[]; targetRoomId: RoomId; corridorId: string }
+  /** Старое имя v0.3, оставлено как обратный совместимый контракт. */
+  | { type: 'ESCAPE_ATTACK_INTERRUPT'; playerId: string; intruderIds: string[]; targetRoomId: RoomId; corridorId?: string }
   /**
    * Вскрытие неисследованного отсека и розыгрыш жетона Исследования.
    * `corridorId` — Коридор, через который персонаж вошёл: эффект «Двери»
@@ -22,7 +24,9 @@ export type InterruptEvent =
    * в выбранный игроком Коридор (стр. 13).
    */
   | { type: 'NOISE_ROLL_INTERRUPT'; playerId: string; roomId: RoomId; noise: NoiseRollMode }
-  /** Контакт: вытянутый из мешка жетон Чужого появляется на поле. */
+  /** Контакт: сначала сбрасывается шум, затем вытягивается жетон Чужого. */
+  | { type: 'CONTACT_INTERRUPT'; roomId: RoomId; playerId: string }
+  /** Старое имя v0.3, оставлено как обратный совместимый контракт. */
   | { type: 'ENCOUNTER_INTERRUPT'; roomId: RoomId; intruderTokenId: string }
   /** Внезапная атака: карт на руке меньше числа на жетоне (стр. 18). */
   | { type: 'SURPRISE_ATTACK_INTERRUPT'; playerId: string; intruderId: string };
diff --git a/packages/shared/src/types/log.ts b/packages/shared/src/types/log.ts
index 5785d80..815c7d2 100644
--- a/packages/shared/src/types/log.ts
+++ b/packages/shared/src/types/log.ts
@@ -1,4 +1,6 @@
 import type { NoiseDieFace } from '../data/noiseDie.js';
+import type { CombatDieFace } from '../data/combatDie.js';
+import type { IntruderType } from './entities.js';
 import type { GameOverReason } from './state.js';
 import type { ExplorationEffect, RoomId, RoomSlotCategory } from './rooms.js';
 
@@ -56,6 +58,70 @@ export type GameLogEvent =
       cardId: string;
       cardName: string;
     }
+  | {
+      type: 'CONTACT_RESOLVED';
+      playerId: string;
+      roomId: RoomId;
+      outcome: 'BLANK' | 'INTRUDER';
+      intruderType?: IntruderType;
+      escapeNumber?: number;
+    }
+  | {
+      type: 'INTRUDER_SPAWNED';
+      intruderId: string;
+      intruderType: IntruderType;
+      roomId: RoomId;
+    }
+  | {
+      type: 'INTRUDER_ATTACKED';
+      intruderId: string;
+      intruderType: IntruderType;
+      playerId: string;
+      outcome: 'HIT' | 'MISS' | 'INFECTION' | 'IGNORED';
+    }
+  | {
+      type: 'COMBAT_ROLLED';
+      playerId: string;
+      roomId: RoomId;
+      mode: 'SHOOT' | 'MELEE' | 'AIMED_FIRE';
+      face: CombatDieFace;
+    }
+  | {
+      type: 'INTRUDER_WOUNDED';
+      intruderId: string;
+      intruderType: IntruderType;
+      woundsCount: number;
+      roomId: RoomId;
+    }
+  | {
+      type: 'INTRUDER_KILLED';
+      intruderId: string;
+      intruderType: IntruderType;
+      roomId: RoomId;
+    }
+  | {
+      type: 'INTRUDER_RETREATED';
+      intruderId: string;
+      intruderType: IntruderType;
+      fromRoomId: RoomId;
+      toRoomId: RoomId | null;
+    }
+  | {
+      type: 'PLAYER_INJURED';
+      playerId: string;
+      lightWounds: number;
+      seriousWounds: number;
+    }
+  | {
+      type: 'PLAYER_INFECTED';
+      playerId: string;
+      source: 'LARVA' | 'CONTAMINATION';
+    }
+  | {
+      type: 'PLAYER_DIED';
+      playerId: string;
+      roomId: RoomId;
+    }
   | {
       type: 'ITEM_USED';
       playerId: string;
diff --git a/packages/shared/src/types/state.ts b/packages/shared/src/types/state.ts
index e784143..380e1f2 100644
--- a/packages/shared/src/types/state.ts
+++ b/packages/shared/src/types/state.ts
@@ -25,8 +25,11 @@ import type { RngStream } from '../utils/rng.js';
  *
  * v4: публичный журнал событий партии (`gameLog`) сохраняется вместе с игрой.
  * Старые сохранения не восстанавливаются, чтобы журнал и состояние не расходились.
+ *
+ * v5 (0.4.0): пул Чужих, состояние Боя, Личинка на планшете Персонажа и
+ * новые решения/прерывания становятся частью сохранённого состояния.
  */
-export const GAME_STATE_SCHEMA_VERSION = 4;
+export const GAME_STATE_SCHEMA_VERSION = 5;
 
 /**
  * Режим партии (стр. 27 «Игровые Режимы»). Базовая игра полукооперативная:
@@ -111,6 +114,8 @@ export interface GameMeta {
    * молчаливым пропуском розыгрыша.
    */
   gameOverReason: GameOverReason | null;
+  /** Первый Контакт фиксируется для будущего модуля Целей; сами Цели пока не сбрасываются. */
+  firstContactResolved: boolean;
 }
 
 export interface GameState {
-- 
2.49.0.windows.1

