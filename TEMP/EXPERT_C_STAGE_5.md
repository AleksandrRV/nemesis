From cfc28a60530ba18bb59a141a53a94108b03c54f1 Mon Sep 17 00:00:00 2001
From: Aleksandr Romanov <alex.romanov@bit.games>
Date: Tue, 22 Sep 2026 23:18:20 +0700
Subject: [PATCH] wip

---
 CHANGELOG.md                                  |  64 +++
 doc/roadmap.md                                |  20 +-
 doc/v0.5.0-cinematic-polish.md                |  57 +++
 doc/v0.5.0-step-4.md                          |  41 ++
 doc/v0.5.0-step-5.md                          |  31 ++
 doc/v0.5.0-step-6.md                          |  56 +++
 doc/v0.5.0-step-7.md                          |  39 ++
 doc/v0.5.0-step-8.md                          |  28 ++
 doc/v0.5.0-step-9.md                          |  15 +
 package-lock.json                             |   8 +-
 package.json                                  |   2 +-
 packages/client/package.json                  |   2 +-
 packages/client/src/App.tsx                   |  25 ++
 .../board/BoardAnimationLayer.test.tsx        |  14 +
 .../components/board/BoardAnimationLayer.tsx  | 202 +++++++++
 .../src/components/board/BoardCinematicFX.tsx |  60 +++
 .../src/components/board/IntruderBadge.tsx    |  42 +-
 .../board/RoomHex.intruders.test.tsx          |  32 ++
 .../client/src/components/board/RoomHex.tsx   |  35 +-
 .../src/components/board/ShipMapSVG.tsx       |  27 +-
 .../board/TechnicalCorridorsNode.test.tsx     |  75 ++++
 .../board/TechnicalCorridorsNode.tsx          | 191 +++++++++
 .../components/board/intruderMapModel.test.ts |   9 +-
 .../src/components/board/intruderMapModel.ts  |  95 ++---
 .../src/components/contact/ContactModal.tsx   |  12 +-
 .../contact/contactPresentationModel.ts       |   1 +
 .../src/components/dev/devPanelModel.ts       |   1 +
 .../TechnicalCorridorInspector.test.tsx       |  21 +
 .../inspector/TechnicalCorridorInspector.tsx  | 112 +++++
 .../log/gameLogModel.technical.test.ts        |  32 ++
 .../client/src/components/log/gameLogModel.ts |  83 +++-
 .../src/components/log/intruderLogModel.ts    |  39 +-
 .../src/components/modals/EventPhaseModal.tsx | 128 ++++++
 packages/client/src/index.css                 | 214 ++++++++++
 packages/client/src/store/gameStore.ts        |  12 +-
 packages/shared/package.json                  |   2 +-
 packages/shared/src/data/cardsSetup.ts        |   3 +-
 packages/shared/src/data/eventCards.ts        |  52 +++
 packages/shared/src/index.ts                  |   8 +
 packages/shared/src/logic/engineErrors.ts     |  12 +-
 .../shared/src/logic/eventEffects.test.ts     | 109 +++++
 packages/shared/src/logic/eventEffects.ts     | 346 +++++++++++++++
 packages/shared/src/logic/eventsPhase.test.ts | 396 ++++++++++++++++++
 packages/shared/src/logic/eventsPhase.ts      | 335 +++++++++++++++
 packages/shared/src/logic/fsm.ts              |   2 +
 .../shared/src/logic/hiveDevelopment.test.ts  |  81 ++++
 packages/shared/src/logic/hiveDevelopment.ts  | 189 +++++++++
 packages/shared/src/logic/intruderAttacks.ts  |   5 +-
 packages/shared/src/logic/intruderMovement.ts | 219 ++++++++++
 .../shared/src/logic/intruderRetreat.test.ts  | 122 ++++++
 packages/shared/src/logic/intruderRetreat.ts  | 200 +++++++++
 packages/shared/src/logic/melee.test.ts       |  19 +-
 .../shared/src/logic/release_v0_5_0.test.ts   |  26 ++
 packages/shared/src/logic/sanitizer.test.ts   |   4 +-
 packages/shared/src/logic/searchActions.ts    |   2 +
 packages/shared/src/logic/setup.test.ts       |   3 +-
 packages/shared/src/logic/setup.ts            |   3 +
 packages/shared/src/logic/shoot.test.ts       |  18 +-
 packages/shared/src/logic/shoot.ts            |  12 +-
 packages/shared/src/logic/turnCycle.test.ts   |   7 +-
 packages/shared/src/logic/turnCycle.ts        |  10 +-
 packages/shared/src/types/cards.ts            |  32 +-
 packages/shared/src/types/contact.ts          |  49 ++-
 packages/shared/src/types/log.ts              |  69 +++
 packages/shared/src/types/state.ts            |  12 +-
 65 files changed, 4007 insertions(+), 165 deletions(-)
 create mode 100644 doc/v0.5.0-cinematic-polish.md
 create mode 100644 doc/v0.5.0-step-4.md
 create mode 100644 doc/v0.5.0-step-5.md
 create mode 100644 doc/v0.5.0-step-6.md
 create mode 100644 doc/v0.5.0-step-7.md
 create mode 100644 doc/v0.5.0-step-8.md
 create mode 100644 doc/v0.5.0-step-9.md
 create mode 100644 packages/client/src/components/board/BoardAnimationLayer.test.tsx
 create mode 100644 packages/client/src/components/board/BoardAnimationLayer.tsx
 create mode 100644 packages/client/src/components/board/BoardCinematicFX.tsx
 create mode 100644 packages/client/src/components/board/TechnicalCorridorsNode.test.tsx
 create mode 100644 packages/client/src/components/board/TechnicalCorridorsNode.tsx
 create mode 100644 packages/client/src/components/inspector/TechnicalCorridorInspector.test.tsx
 create mode 100644 packages/client/src/components/inspector/TechnicalCorridorInspector.tsx
 create mode 100644 packages/client/src/components/log/gameLogModel.technical.test.ts
 create mode 100644 packages/client/src/components/modals/EventPhaseModal.tsx
 create mode 100644 packages/shared/src/data/eventCards.ts
 create mode 100644 packages/shared/src/logic/eventEffects.test.ts
 create mode 100644 packages/shared/src/logic/eventEffects.ts
 create mode 100644 packages/shared/src/logic/eventsPhase.test.ts
 create mode 100644 packages/shared/src/logic/eventsPhase.ts
 create mode 100644 packages/shared/src/logic/hiveDevelopment.test.ts
 create mode 100644 packages/shared/src/logic/hiveDevelopment.ts
 create mode 100644 packages/shared/src/logic/intruderMovement.ts
 create mode 100644 packages/shared/src/logic/intruderRetreat.test.ts
 create mode 100644 packages/shared/src/logic/intruderRetreat.ts
 create mode 100644 packages/shared/src/logic/release_v0_5_0.test.ts

diff --git a/CHANGELOG.md b/CHANGELOG.md
index d39369f..5822308 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -1,3 +1,57 @@
+# 0.5.0-step-7 — Event Effects Engine
+
+- Реализован Шаг 7б Фазы Событий: движок текстовых эффектов карт, включая Охоту, Защиту кладки, Выводок, Регенерацию, Затаившихся, Созревание, Разгром, шумовые эффекты, деградацию систем и Открытие отсеков.
+- Добавлена атомарная связка `движение → эффект → перемещение карты`, включая удаление одноразовых карт и возврат `Неисправности` в колоду.
+- Контакты и броски Шума из эффектов проходят через существующий стек прерываний.
+- Schema version повышена до 15.
+- Обновлены тесты и документация.
+
+> Примечание по источнику: текущий `data/eventCards.ts` содержит 20 физических карт, но не содержит физической карты «Подготовка», хотя `doc/data/EVENTS.md` описывает этот эффект. Контракт `EventEffect` уже предусматривает `PREPARATION`; попытка разыграть отсутствующую физическую карту завершается явной ошибкой вместо скрытого выбора без UI-решения.
+
+## v0.5.0-step-5 — Атаки Чужих в Фазе Событий
+## 0.5.0-step-6 — Intruder Movement
+
+### Cinematic Polish
+- Добавлен presentation-only `BoardCinematicFX` для мягкой виньетки, scanlines и событийных flash-эффектов.
+- Улучшен `BoardAnimationLayer`: quadratic Bézier-траектории, `animateMotion`, scale/fade для вентиляции и мягкие motion halos.
+- `EventPhaseModal` получил активный шаг, прогресс Фазы Событий и кинематографичный переход.
+- Все эффекты соблюдают `prefers-reduced-motion` и не изменяют игровой state.
+
+- Реализован Шаг 7а Фазы Событий: автономное движение Чужих по номеру Коридора верхней карты Событий.
+- Чужие в Бою не перемещаются; закрытые Двери разрушаются совместно; технические выходы отправляют миниатюры в Технические Коридоры с возвратом жетона в мешок и сбросом Ран.
+- Вход в неисследованный отсек не раскрывает комнату и не активирует жетон Исследования; вход к Персонажу не запускает Контакт/Внезапную атаку.
+- Добавлены `INTRUDER_MOVED` и persisted `meta.eventPhaseCardId`; schema version повышена до 14.
+- Фаза Событий после 7а остаётся открытой до реализации Шага 7б; добавлен единый continuation hook `completeEventPhaseAfterEventCard()`.
+
+
+- Добавлен детерминированный `resolveEventPhaseIntruderAttacks`.
+- Каждый Чужой в Бою атакует один раз за Фазу Событий.
+- Цель выбирается по минимальному числу карт Действий на руке; при равенстве — от `firstPlayerId` по часовой стрелке.
+- Переиспользован `performIntruderAttack`: Личинка, карты Атак, Слабости, Зов, Трансформация, Исступление и смерть не дублируются.
+- Добавлен публичный `EVENT_PHASE_ATTACK_RESOLVED`.
+- Добавлены регрессионные тесты на порядок атак, выбор цели, смерть цели и подавление Зовом.
+
+
+## [0.5.0-step-4] — Оркестратор Фазы Событий, счётчики и Урон от огня
+
+- Фаза Событий больше не пропускается фиктивным `EVENT_PHASE_SKIPPED`: общий пас переводит игру в реальный оркестратор.
+- Реализован Шаг 4 правил: сдвиг Времени, Самоуничтожение, автоматическая разблокировка Спасательных Капсул с жёлтой зоны и финальный взрыв/гиперпрыжок.
+- Реализован Шаг 6: 1 Рана каждому Чужому в горящем отсеке и уничтожение одного свободного Яйца на полу.
+- Смерть Чужого от огня проходит через существующую проверку Стойкости, включая Отступление и Останки.
+- `startNewRound()` больше не сдвигает маркер Времени: он изменяется ровно один раз в Фазе Событий.
+- Схема состояния повышена до 13 из-за нового публичного исхода `HYPERSPACE_JUMP`.
+- Добавлены типизированные события журнала и регрессионные тесты.
+
+## 0.5.0-step-3 — Technical Corridors Board Location
+
+- Добавлена отдельная интерактивная локация Технических коридоров на `ShipMapSVG`.
+- Добавлена визуальная сеть вентиляционных шахт от всех зарегистрированных входов `techNumbers` к центральному узлу.
+- `ship.technicalCorridorNoise` отображается на центральном узле тревожной подсветкой и пульсацией.
+- Добавлен `TechnicalCorridorInspector`: состояние шума, входы, номера вентиляции и правила зоны.
+- Уход Чужого в вентиляцию получает временную визуальную анимацию в узле.
+- В журнал добавлены человекочитаемые сообщения `INTRUDER_RETREATED` для перехода, разрушения Двери, вентиляции и отсутствия выхода.
+- Состояние выбора технической зоны остаётся UI-only и не изменяет `GameState`/schema version.
+
 # История изменений
 
 Формат — по версиям пакета (`package.json`): патч закрывает дефекты и честность среза,
@@ -492,3 +546,13 @@
 Базовая ревизия, разобранная в [doc/review-0.1.9.md](doc/review-0.1.9.md): карта корабля и инспектор
 отсека, подготовка партии по сиду, стек прерываний, фильтр скрытой информации, офлайн-сохранение.
 Известные дефекты ревизии — в плане исправлений (Э1-1…Э1-6 закрыты в 0.1.10).
+## 0.5.0-step-8
+
+- Реализовано Развитие Улья: один жетон из RNG-потока `bag`, каскад Шума/Контактов, замены Личинки/Крипера, Королева и лимит Яиц.
+- Расширено отображение Чужих в `RoomHex`: крупные силуэты, аура, адаптивная сетка и визуальный статус Боя.
+- Schema version повышена до 16.
+
+## 0.5.0 — Step 9
+- Added BoardAnimationLayer for player/intruder movement interpolation and technical-corridor fade.
+- Added EventPhaseModal with public-log-driven event-phase timeline.
+- Added release-cycle and sanitizer regression tests.
diff --git a/doc/roadmap.md b/doc/roadmap.md
index edb4bff..7f4a438 100644
--- a/doc/roadmap.md
+++ b/doc/roadmap.md
@@ -387,7 +387,7 @@
 
 ---
 
-### Шаг 3. Локация «Технические коридоры» и интерактивная вентиляция на карте (Technical Corridors Board Location)
+### Шаг 3. Локация «Технические коридоры» и интерактивная вентиляция на карте (Technical Corridors Board Location) — ВЫПОЛНЕНО в 0.5.0-step-3
 
 * **Модель данных и позиционирование отдельной локации:**
   * На игровом поле «Немезиды» Технические Коридоры (стр. 9, элемент 10; стр. 16) представляют собой отдельную обособленную локацию поля («Поле Технических Коридоров»), соединённую вентиляционными шахтами со всеми отсеками, имеющими Вход в Технические Коридоры (красный маячок/символ и номер tech-выхода);
@@ -401,7 +401,7 @@
 
 ---
 
-### Шаг 4. Оркестратор Фазы Событий, Шаг 4 (Счётчики Времени и Самоуничтожения) и Шаг 6 (Урон от огня)
+### Шаг 4. Оркестратор Фазы Событий, Шаг 4 (Счётчики Времени и Самоуничтожения) и Шаг 6 (Урон от огня) — ВЫПОЛНЕНО в 0.5.0-step-4
 
 * **Конечный автомат Фазы Событий (`turnCycle.ts`, `eventsPhase.ts`):**
   * Заменить безусловный пропуск `EVENT_PHASE_SKIPPED` на последовательное исполнение шагов книги правил (стр. 10):
@@ -427,7 +427,7 @@
 
 ---
 
-### Шаг 5. Шаг 5 Фазы Событий: Атаки Чужих в комнатах с игроками (Intruder Attacks in Combat)
+### Шаг 5. Шаг 5 Фазы Событий: Атаки Чужих в комнатах с игроками (Intruder Attacks in Combat) — ВЫПОЛНЕНО в 0.5.0-step-5
 
 * **Правило атак Чужих в Фазе Событий (стр. 10, 20):**
   * Каждый Чужой на корабле, находящийся в Бою с Персонажами (в одной комнате с одним или несколькими живыми не находящимися в капсуле/анабиозе персонажами), совершает атаку.
@@ -450,6 +450,8 @@
 
 ### Шаг 6. Шаг 7а Фазы Событий: Автономное Движение Чужих по коридорам и в вентиляцию (Intruder Movement)
 
+> **Статус: ВЫПОЛНЕНО в 0.5.0-step-6.** Реализованы выбор верхней карты Событий, фильтрация Чужих в Бою, движение по номеру Коридора, разрушение закрытых Дверей, переходы в Технические Коридоры, отсутствие раскрытия новых отсеков, отсутствие Контакта при входе и событие `INTRUDER_MOVED`. Карта фиксируется в `meta.eventPhaseCardId` до следующего Шага 7б.
+
 * **Механика Движения Чужих (стр. 10, 15):**
   * Из колоды Событий вытягивается верхняя карта.
   * Верхний блок карты определяет типы двигающихся Чужих (символы типов) и номер коридора (1, 2, 3 или 4).
@@ -467,7 +469,7 @@
 
 ---
 
-### Шаг 7. Шаг 7б Фазы Событий: Разрешение текстовых эффектов карт Событий (Event Effects Engine)
+### Шаг 7. Шаг 7б Фазы Событий: Разрешение текстовых эффектов карт Событий (Event Effects Engine) — ВЫПОЛНЕНО в 0.5.0-step-7
 
 * **Исполнение уникальных эффектов 20 карт Событий (стр. 10, `doc/data/EVENTS.md`):**
   * *Группа «Охота и Погоня»:*
@@ -501,7 +503,7 @@
 
 ---
 
-### Шаг 8. Этап «Развитие Улья» и расширенное отображение Чужих в локациях (Hive Development & Intruder Visuals)
+### Шаг 8. Этап «Развитие Улья» и расширенное отображение Чужих в локациях (Hive Development & Intruder Visuals) — ВЫПОЛНЕНО в 0.5.0-step-8
 
 * **Вытягивание жетона из Пула Чужих (стр. 10, 31):**
   * Из мешка Пула Чужих через поток RNG `bag` извлекается ровно 1 жетон.
@@ -687,4 +689,10 @@
    * Сквозное стресс-тестирование краевых правил по книге правил (`doc/rules.md`) — сверка каждой механики с оригиналом 1:1.
 
 **Результат этапа (v1.0.0 Gold Master):**  
-Завершенный цифровой продукт, на 100% воспроизводящий настольный шедевр со всеми режимами, ботами и мультиплеером.
\ No newline at end of file
+Завершенный цифровой продукт, на 100% воспроизводящий настольный шедевр со всеми режимами, ботами и мультиплеером.
+
+## v0.5.0 — Шаг 9
+- [x] Movement Interpolation / BoardAnimationLayer
+- [x] EventPhaseModal и read-only Event UI
+- [x] release regression tests и sanitizer boundary
+- [x] версия пакетов `0.5.0`
diff --git a/doc/v0.5.0-cinematic-polish.md b/doc/v0.5.0-cinematic-polish.md
new file mode 100644
index 0000000..6f3b3cc
--- /dev/null
+++ b/doc/v0.5.0-cinematic-polish.md
@@ -0,0 +1,57 @@
+# v0.5.0 — Cinematic Polish
+
+## Цель
+
+Усилить визуальную подачу уже реализованных игровых механик, не изменяя правила,
+GameState, RNG или порядок разрешения событий.
+
+## Реализовано
+
+### BoardAnimationLayer
+
+- траектория движения строится как мягкая quadratic Bézier-кривая;
+- `animateMotion` используется вместо линейного `translate`;
+- сохранено естественное ускорение/замедление через `keySplines`;
+- для вентиляции добавлены scale/fade эффекты;
+- для обычного движения — мягкая пульсирующая halo-обводка;
+- эффект разрушения двери остаётся отдельным transient FX;
+- `prefers-reduced-motion` сокращает длительность и исключает физическое смещение.
+
+### BoardCinematicFX
+
+Новый presentation-only слой:
+
+- постоянная мягкая виньетка;
+- тонкая scanline-текстура;
+- почти незаметный film-noise;
+- короткие импульсы для боя, огня, тревоги и вентиляции;
+- декоративные угловые HUD-маркеры.
+
+Слой не читает закрытые данные и не изменяет состояние партии.
+
+### EventPhaseModal
+
+- cinematic backdrop и входящий transition;
+- активный шаг (`LIVE`) вместо статического списка;
+- завершённые шаги отмечаются `OK`;
+- прогресс Фазы Событий;
+- мягкий световой sweep в заголовке;
+- карточка карты События и состояние протокола;
+- reduced-motion совместимость.
+
+## Производительность
+
+Все эффекты являются CSS/SVG presentation effects. Не используются canvas,
+requestAnimationFrame loops или постоянные React timers. Транзиентный FX создаётся
+только при появлении нового `gameLog.sequence`.
+
+## Игровая целостность
+
+Изменения не затрагивают:
+
+- правила;
+- RNG;
+- action validation;
+- SanitizedGameState;
+- server/transport contracts;
+- Event Phase state machine.
diff --git a/doc/v0.5.0-step-4.md b/doc/v0.5.0-step-4.md
new file mode 100644
index 0000000..34dc405
--- /dev/null
+++ b/doc/v0.5.0-step-4.md
@@ -0,0 +1,41 @@
+# v0.5.0 — Step 4
+
+## Оркестратор Фазы Событий, счётчики Времени/Самоуничтожения и Урон от огня
+
+### Граница реализации
+
+Этот шаг реализует только правила, перечисленные в Шаге 4 roadmap:
+
+1. вход в `EVENT_PHASE` после общего паса;
+2. Шаг 4 книги правил — Время и Самоуничтожение;
+3. Шаг 6 книги правил — Урон от огня;
+4. завершение реализованной части Фазы Событий и запуск нового раунда.
+
+Атаки Чужих (Шаг 5), автономное движение (Шаг 7a), текстовые эффекты Event Cards (Шаг 7b) и развитие Улья (Шаг 8) не эмулируются заглушками и остаются отдельными последующими шагами roadmap.
+
+### Время
+
+`meta.timeTrackPosition` увеличивается ровно на один в начале Фазы Событий. `startNewRound()` больше не изменяет этот счётчик. При достижении `TIME_TRACK_LENGTH` партия немедленно завершается с причиной `HYPERSPACE_JUMP`; персонажи вне Анабиоза погибают.
+
+### Самоуничтожение
+
+При активном `selfDestructTrackPosition` маркер увеличивается на один. Начиная с позиции 6 все Спасательные Капсулы разблокируются и остановка таймера запрещена существующим `GENERATOR`-правилом. На позиции 8 партия завершается с `SHIP_EXPLODED`.
+
+### Урон от огня
+
+Для каждого горящего отсека движок делает снимок находящихся в нём Чужих и наносит каждому ровно одну Рану. Проверка Стойкости использует существующий `checkInjuryResult`, поэтому сохраняются общие правила смерти, Останков и Отступления. Затем уничтожается не более одного свободного Яйца на полу отсека. Яйца, находящиеся в руках персонажей, не затрагиваются.
+
+### Журнал
+
+Добавлены публичные события:
+
+- `EVENT_PHASE_STARTED`;
+- `EVENT_PHASE_COUNTERS_RESOLVED`;
+- `SELF_DESTRUCT_ADVANCED`;
+- `FIRE_DAMAGE_TAKEN_BY_INTRUDER`;
+- `FIRE_DESTROYED_EGG`;
+- `EVENT_PHASE_COMPLETED`.
+
+### Совместимость
+
+`GAME_STATE_SCHEMA_VERSION` повышен с 12 до 13.
diff --git a/doc/v0.5.0-step-5.md b/doc/v0.5.0-step-5.md
new file mode 100644
index 0000000..994997e
--- /dev/null
+++ b/doc/v0.5.0-step-5.md
@@ -0,0 +1,31 @@
+# v0.5.0 — Шаг 5: Атаки Чужих в Фазе Событий
+
+## Контракт
+
+После счётчиков Фазы Событий и до Урона от Пожара каждый Чужой, находящийся в одной комнате с живым Персонажем вне Анабиоза/Спасательной Капсулы, совершает одну атаку.
+
+## Выбор цели
+
+1. Рассматриваются только живые Персонажи в той же комнате.
+2. Выбирается персонаж с минимальным числом карт Действий в `actionDeck.hand`.
+3. При равенстве используется порядок от `firstPlayerId` по часовой стрелке (`orderNumber`).
+4. Карты Заражения не находятся в руке: текущий контракт проекта хранит их в сбросе колоды Заражения.
+
+## Разрешение
+
+Используется существующий `performIntruderAttack`, поэтому правила Личинки, карт Атак, Слабостей, Зова, Трансформации, Исступления и смерти не дублируются.
+
+## Порядок
+
+```text
+COUNTERS
+  -> INTRUDER_ATTACKS
+  -> FIRE_DAMAGE
+  -> ROUND_END
+```
+
+Если атака убила последнего активного Персонажа и движок завершил партию, дальнейшие шаги Фазы Событий не выполняются.
+
+## Границы
+
+Движение Чужих, текстовые эффекты карт Событий и развитие Улья не входят в этот шаг.
diff --git a/doc/v0.5.0-step-6.md b/doc/v0.5.0-step-6.md
new file mode 100644
index 0000000..1b4b0b3
--- /dev/null
+++ b/doc/v0.5.0-step-6.md
@@ -0,0 +1,56 @@
+# v0.5.0 — Step 6 / Event Phase 7a: Intruder Movement
+
+## Scope
+
+Implemented autonomous Intruder Movement from the upper Event card. The upper
+block is consumed once per Event Phase and identifies both the Intruder types
+that move and the corridor number (1–4).
+
+## Rules implemented
+
+1. Intruders currently in Combat do not move.
+2. The initial eligible set is snapshotted before movement starts, so an
+   Intruder entering a new room cannot move a second time on the same card.
+3. The corridor number is resolved from the current room side.
+4. No matching corridor means no movement.
+5. A closed Door is destroyed and all matching movers from that room remain in
+   the room. A single Door is destroyed once even when several Intruders move
+   together.
+6. An open or destroyed Door permits movement into the adjacent room.
+7. A matching Technical Corridor entrance sends the Intruder to the Technical
+   Corridors: its miniature is removed, wounds are reset, and its token returns
+   to the Intruder bag.
+8. Entering an unexplored room does not reveal it and does not trigger its
+   Exploration token.
+9. Entering a room containing active Characters does not trigger Contact or a
+   Surprise Attack.
+
+## Event card lifecycle
+
+`meta.eventPhaseCardId` records the selected Event card. The card is moved to
+the public Event discard immediately after selection and is retained there by
+ID until Step 7b resolves its text effect. This prevents Step 7a from drawing
+another card and keeps movement and text effect tied to the same physical card.
+
+The Event Phase intentionally remains open after Step 7a. `completeEventPhaseAfterEventCard()`
+is the single continuation hook for Step 7b; it clears the pending card and
+starts the next player round.
+
+## Compatibility
+
+`GAME_STATE_SCHEMA_VERSION` is now 14 because the persisted Event Phase card
+identifier was added to `GameMeta`.
+
+## Logging
+
+Successful movement is recorded as `INTRUDER_MOVED` with:
+
+- Intruder id and type;
+- source room;
+- destination room or Technical Corridors;
+- corridor id when applicable;
+- Event card corridor number;
+- Event card id;
+- outcome.
+
+Door destruction continues to use `INTRUDERS_BLOCKED_BY_DOOR`.
diff --git a/doc/v0.5.0-step-7.md b/doc/v0.5.0-step-7.md
new file mode 100644
index 0000000..2b5e512
--- /dev/null
+++ b/doc/v0.5.0-step-7.md
@@ -0,0 +1,39 @@
+# v0.5.0 Step 7 — Event Effects Engine
+
+## Контур
+
+После Шага 7а выбранная карта События хранится в `meta.eventPhaseCardId`. Шаг 7б разрешает её текстовый эффект ровно один раз, после чего карта либо остаётся в публичном сбросе, либо удаляется/замешивается, либо замешивается обратно в колоду (`Неисправность`).
+
+## Реализованные эффекты
+
+- Охота
+- Защита кладки через `CONTACT_INTERRUPT`
+- Выводок
+- Регенерация
+- Затаившиеся
+- Созревание
+- Разгром
+- Запах добычи
+- Шум в технических коридорах через `NOISE_ROLL_INTERRUPT`
+- Улей
+- Воспламеняемый раствор
+- Пожирающее пламя
+- Разрушающее пламя
+- Катапультирование капсулы
+- Короткое замыкание
+- Утечка охладителя
+- Неполадка систем жизнеобеспечения
+- Неисправность
+- Открытие отсеков
+
+## Идемпотентность
+
+`eventPhaseEffectStarted` не позволяет повторно применить эффект при повторной доставке команды. Если эффект породил обязательное решение или прерывание, Фаза Событий остаётся открытой; после опустошения очереди `resumeEventPhaseAfterInterrupts()` завершает карту и запускает следующий раунд.
+
+## Карты
+
+Одноразовые карты удаляются до перемешивания оставшегося сброса. `Неисправность` вместе со сбросом перемешивается обратно. Остальные карты остаются в публичном сбросе.
+
+## Расхождение данных
+
+`doc/data/EVENTS.md` содержит описание «Подготовки», но текущий `data/eventCards.ts` не содержит физической карты с этим эффектом. Движок хранит `PREPARATION` в типизированном контракте, но намеренно не выполняет фиктивный автоматический выбор: при появлении такой карты потребуется добавить UI-решение «выбрать 1 из 3» и физические данные карты. Это предотвращает молчаливое нарушение правил.
diff --git a/doc/v0.5.0-step-8.md b/doc/v0.5.0-step-8.md
new file mode 100644
index 0000000..47d3cb6
--- /dev/null
+++ b/doc/v0.5.0-step-8.md
@@ -0,0 +1,28 @@
+# v0.5.0 — Шаг 8: Развитие Улья и расширенное отображение Чужих
+
+## Shared / rules engine
+
+- Добавлен `logic/hiveDevelopment.ts`.
+- На каждом завершении текстового эффекта Фазы Событий из `intrudersPool.bag` извлекается ровно один жетон через RNG stream `bag`.
+- Личинка и Крипер удаляются из пула (`deadTokens`) и при наличии доступного запаса заменяются соответственно Взрослой особью и Трутнем в мешке.
+- Взрослая особь и Трутень возвращаются в мешок и ставят `NOISE_ROLL_INTERRUPT` всем живым персонажам вне Боя в порядке ходов.
+- Королева возвращается в мешок; при исследованном Улье с персонажем ставится миниатюра Королевы и `CONTACT_INTERRUPT` с источником `CALL`, иначе добавляется Яйцо до лимита 8.
+- Пустой жетон возвращается в мешок; при наличии доступного Взрослого один такой жетон переносится из запаса в мешок.
+- Interrupt pipeline продолжает каскадировать Шум → Контакт → Внезапную атаку/решение Первого Контакта до завершения текущей Фазы Событий.
+- `eventPhaseHiveDevelopmentStarted` защищает Шаг 8 от повторного выполнения после сохранения/возобновления.
+- Schema version: 16.
+
+## Client / visuals
+
+`RoomHex` и `intruderMapModel` обновлены:
+
+- индивидуальные SVG-силуэты и цветовая кодировка типов;
+- отдельный размер бейджей для Трутня и Королевы;
+- пульсирующая аура крупных Чужих;
+- адаптивная сетка при 2+ разных типах;
+- красно-оранжевая пульсирующая рамка Боя при одновременном присутствии Персонажа и Чужого;
+- раны и количество миниатюр остаются публичными и не смешиваются с серверными правилами.
+
+## Границы
+
+Шаг не добавляет новую боевую механику: Контакт, Шум, Внезапная атака и цели проходят через существующий interrupt/combat pipeline.
diff --git a/doc/v0.5.0-step-9.md b/doc/v0.5.0-step-9.md
new file mode 100644
index 0000000..cb6a682
--- /dev/null
+++ b/doc/v0.5.0-step-9.md
@@ -0,0 +1,15 @@
+# v0.5.0 — Шаг 9: Movement Interpolation, Event UI и release gate
+
+## Карта
+`BoardAnimationLayer` находится поверх статического SVG и сравнивает два последовательных `SanitizedGameState`. Если ID игрока или Чужого сохранился, но `roomId` изменился, сущность скрывается в статическом гексе и проходит по cubic-bezier траектории от центра исходного отсека к центру назначения.
+
+Уход в Технические коридоры направляет сущность к HUB `(95, 900)` и растворяет её. Для `prefers-reduced-motion` физическое смещение сокращается до быстрого fade.
+
+## Event UI
+`EventPhaseModal` открывается по публичному `EVENT_PHASE_STARTED` и строит read-only timeline по публичному журналу. UI не изменяет GameState и не получает скрытые данные.
+
+## Release gate
+Добавлены интеграционные проверки замкнутого цикла раунда и sanitizer boundary. Версия пакетов уже зафиксирована на `0.5.0`.
+
+## Ограничение
+Полный `npm run verify` считается пройденным только при наличии установленных зависимостей и успешном запуске typecheck/lint/format/test/build. Этот шаг не подменяет CI фиктивным статусом.
diff --git a/package-lock.json b/package-lock.json
index 5df3997..62f8b1a 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,12 +1,12 @@
 {
   "name": "nemesis-digital",
-  "version": "0.4.0",
+  "version": "0.5.0",
   "lockfileVersion": 3,
   "requires": true,
   "packages": {
     "": {
       "name": "nemesis-digital",
-      "version": "0.4.0",
+      "version": "0.5.0",
       "workspaces": [
         "packages/*"
       ],
@@ -5235,7 +5235,7 @@
     },
     "packages/client": {
       "name": "@nemesis/client",
-      "version": "0.4.0",
+      "version": "0.5.0",
       "dependencies": {
         "@nemesis/shared": "*",
         "clsx": "^2.1.0",
@@ -5260,7 +5260,7 @@
     },
     "packages/shared": {
       "name": "@nemesis/shared",
-      "version": "0.4.0",
+      "version": "0.5.0",
       "dependencies": {
         "immer": "^10.0.3",
         "seedrandom": "^3.0.5"
diff --git a/package.json b/package.json
index c76a92f..918960b 100644
--- a/package.json
+++ b/package.json
@@ -1,6 +1,6 @@
 {
   "name": "nemesis-digital",
-  "version": "0.4.0",
+  "version": "0.5.0",
   "private": true,
   "description": "Digital PWA adaptation of the Nemesis board game",
   "workspaces": [
diff --git a/packages/client/package.json b/packages/client/package.json
index 74ff49a..8465f6e 100644
--- a/packages/client/package.json
+++ b/packages/client/package.json
@@ -1,6 +1,6 @@
 {
   "name": "@nemesis/client",
-  "version": "0.4.0",
+  "version": "0.5.0",
   "private": true,
   "type": "module",
   "scripts": {
diff --git a/packages/client/src/App.tsx b/packages/client/src/App.tsx
index dd5f00f..56809a0 100644
--- a/packages/client/src/App.tsx
+++ b/packages/client/src/App.tsx
@@ -4,6 +4,7 @@ import type { CharacterClass } from '@nemesis/shared';
 import { useGameStore } from './store/gameStore';
 import { ShipMapSVG } from './components/board/ShipMapSVG';
 import { RoomInspector } from './components/inspector/RoomInspector';
+import { TechnicalCorridorInspector } from './components/inspector/TechnicalCorridorInspector';
 import { SeedChip } from './components/hud/SeedChip';
 import { DevPanel } from './components/dev/DevPanel';
 import { GameLogPanel } from './components/log/GameLogPanel';
@@ -13,6 +14,7 @@ import { CharacterSelectModal } from './components/modals/CharacterSelectModal';
 import { ContactOverlay } from './components/contact/ContactOverlay';
 import { ShootModal } from './components/combat/ShootModal';
 import { MeleeModal } from './components/combat/MeleeModal';
+import { EventPhaseModal } from './components/modals/EventPhaseModal';
 import { PHASE_LABELS } from './utils/labels';
 import { IS_DEV } from './utils/env';
 import { RotateCcw, Clock, Shield, Bug } from 'lucide-react';
@@ -20,7 +22,10 @@ import { RotateCcw, Clock, Shield, Bug } from 'lucide-react';
 export const App: React.FC = () => {
   const view = useGameStore((state) => state.view);
   const startNewGame = useGameStore((state) => state.startNewGame);
+  const selectedTechnicalCorridor = useGameStore((state) => state.selectedTechnicalCorridor);
   const [devPanelOpen, setDevPanelOpen] = React.useState(false);
+  const [eventPhaseModalOpen, setEventPhaseModalOpen] = React.useState(false);
+  const [eventPhaseStartSequence, setEventPhaseStartSequence] = React.useState<number | null>(null);
   const [showCharacterSelect, setShowCharacterSelect] = React.useState(() => {
     return !view || view.gameLog.every((entry) => entry.event.type === 'GAME_STARTED');
   });
@@ -40,6 +45,22 @@ export const App: React.FC = () => {
 
   const activePlayerName = view.players[view.meta.activePlayerId]?.name ?? 'Экипаж';
 
+  React.useEffect(() => {
+    const latestStart = [...view.gameLog].reverse().find((entry) => entry.event.type === 'EVENT_PHASE_STARTED');
+    if (!latestStart || latestStart.sequence === eventPhaseStartSequence) return;
+    setEventPhaseStartSequence(latestStart.sequence);
+    setEventPhaseModalOpen(true);
+  }, [view.gameLog, eventPhaseStartSequence]);
+
+  React.useEffect(() => {
+    if (!eventPhaseModalOpen) return;
+    const hasPendingDecision = Boolean(view.pendingDecision);
+    const completed = [...view.gameLog].reverse().find((entry) => entry.event.type === 'EVENT_PHASE_COMPLETED' && eventPhaseStartSequence !== null && entry.sequence > eventPhaseStartSequence);
+    if (!completed || hasPendingDecision) return;
+    const timer = window.setTimeout(() => setEventPhaseModalOpen(false), 5200);
+    return () => window.clearTimeout(timer);
+  }, [eventPhaseModalOpen, view.gameLog, view.pendingDecision, eventPhaseStartSequence]);
+
   return (
     <div className="relative w-screen h-screen bg-nemesis-bg flex flex-col overflow-hidden">
       {/* Верхний HUD */}
@@ -99,6 +120,7 @@ export const App: React.FC = () => {
       <main className="relative flex-1 w-full h-full overflow-hidden">
         <ShipMapSVG />
         <RoomInspector />
+        {selectedTechnicalCorridor && <TechnicalCorridorInspector view={view} />}
         <PlayerHandPanel view={view} />
         <GameLogPanel view={view} />
         {showCharacterSelect && (
@@ -123,6 +145,9 @@ export const App: React.FC = () => {
         {!showCharacterSelect && <ContactOverlay view={view} />}
         <ShootModal />
         <MeleeModal />
+        {eventPhaseModalOpen && (
+          <EventPhaseModal view={view} onClose={() => setEventPhaseModalOpen(false)} />
+        )}
 
         {IS_DEV && devPanelOpen && <DevPanel onClose={() => setDevPanelOpen(false)} />}
       </main>
diff --git a/packages/client/src/components/board/BoardAnimationLayer.test.tsx b/packages/client/src/components/board/BoardAnimationLayer.test.tsx
new file mode 100644
index 0000000..dd1d530
--- /dev/null
+++ b/packages/client/src/components/board/BoardAnimationLayer.test.tsx
@@ -0,0 +1,14 @@
+import { describe, expect, it } from 'vitest';
+import { renderToStaticMarkup } from 'react-dom/server';
+import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';
+import { BoardAnimationLayer } from './BoardAnimationLayer';
+
+describe('BoardAnimationLayer', () => {
+  it('renders a motion layer without leaking hidden state', () => {
+    const view = filterStateForPlayer(createInitialGameState('animation'), 'player-1');
+    const html = renderToStaticMarkup(<svg><BoardAnimationLayer view={view} /></svg>);
+    expect(html).toContain('board-animation-layer');
+    expect(html).not.toContain('destination');
+    expect(html).not.toContain('objective');
+  });
+});
diff --git a/packages/client/src/components/board/BoardAnimationLayer.tsx b/packages/client/src/components/board/BoardAnimationLayer.tsx
new file mode 100644
index 0000000..ceaac8b
--- /dev/null
+++ b/packages/client/src/components/board/BoardAnimationLayer.tsx
@@ -0,0 +1,202 @@
+import React from 'react';
+import type { IntruderEntity, RoomId, SanitizedGameState } from '@nemesis/shared';
+import { SHIP_ROOM_NODES } from '@nemesis/shared';
+import { INTRUDER_COLORS, INTRUDER_SHAPES } from './intruderShapes';
+
+const TECH_HUB = { x: 95, y: 900 };
+const DURATION = 720;
+
+interface MovementAnimation {
+  key: string;
+  kind: 'PLAYER' | 'INTRUDER';
+  id: string;
+  from: { x: number; y: number };
+  to: { x: number; y: number };
+  color: string;
+  shape?: string;
+  label: string;
+  technical: boolean;
+}
+
+interface BoardAnimationLayerProps {
+  view: SanitizedGameState;
+  onActiveIdsChange?: (ids: { players: Set<string>; intruders: Set<string> }) => void;
+}
+
+function roomCenter(roomId: RoomId): { x: number; y: number } | null {
+  const node = SHIP_ROOM_NODES.find((candidate) => candidate.id === roomId);
+  return node ? { x: node.x, y: node.y } : null;
+}
+
+function movementPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
+  const dx = to.x - from.x;
+  const dy = to.y - from.y;
+  const length = Math.hypot(dx, dy) || 1;
+  const nx = -dy / length;
+  const ny = dx / length;
+  const bend = Math.min(38, Math.max(14, length * 0.08));
+  const cx = (from.x + to.x) / 2 + nx * bend;
+  const cy = (from.y + to.y) / 2 + ny * bend;
+  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
+}
+
+function intruderVisual(type: IntruderEntity['type']): { color: string; shape: string } {
+  return { color: INTRUDER_COLORS[type], shape: INTRUDER_SHAPES[type] };
+}
+
+function changedRoom(previous: SanitizedGameState, current: SanitizedGameState, id: string): { from: RoomId; to: RoomId | null } | null {
+  const before = previous.intrudersPool.boardTokens.find((item) => item.id === id);
+  const after = current.intrudersPool.boardTokens.find((item) => item.id === id);
+  if (!before || before.roomId === after?.roomId) return null;
+  return { from: before.roomId, to: after?.roomId ?? null };
+}
+
+function playerChangedRoom(previous: SanitizedGameState, current: SanitizedGameState, id: string): { from: RoomId; to: RoomId | null } | null {
+  const before = previous.players[id];
+  const after = current.players[id];
+  if (!before || before.roomId === after?.roomId) return null;
+  return { from: before.roomId, to: after?.roomId ?? null };
+}
+
+export const BoardAnimationLayer: React.FC<BoardAnimationLayerProps> = ({ view, onActiveIdsChange }) => {
+  const previousViewRef = React.useRef<SanitizedGameState | null>(null);
+  const [animations, setAnimations] = React.useState<MovementAnimation[]>([]);
+  const [doorImpacts, setDoorImpacts] = React.useState<Array<{ key: string; x: number; y: number }>>([]);
+  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
+
+  React.useEffect(() => {
+    const previous = previousViewRef.current;
+    previousViewRef.current = view;
+    if (!previous) return;
+
+    const next: MovementAnimation[] = [];
+    const latestMovement = [...view.gameLog].reverse().find((entry) =>
+      entry.event.type === 'PLAYER_MOVED' || entry.event.type === 'INTRUDER_MOVED' || entry.event.type === 'INTRUDERS_MOVED' || entry.event.type === 'INTRUDER_RETREATED' || entry.event.type === 'INTRUDERS_BLOCKED_BY_DOOR',
+    );
+    const latestSequence = latestMovement?.sequence ?? Number.MAX_SAFE_INTEGER;
+
+    for (const player of Object.values(view.players)) {
+      const movement = playerChangedRoom(previous, view, player.id);
+      if (!movement) continue;
+      const from = roomCenter(movement.from);
+      const to = movement.to === null ? TECH_HUB : roomCenter(movement.to);
+      if (!from || !to) continue;
+      next.push({
+        key: `player-${player.id}-${latestSequence}`,
+        kind: 'PLAYER', id: player.id, from, to,
+        color: '#22d3ee', label: player.name, technical: movement.to === null,
+      });
+    }
+
+    for (const current of view.intrudersPool.boardTokens) {
+      const movement = changedRoom(previous, view, current.id);
+      if (!movement) continue;
+      const from = roomCenter(movement.from);
+      const to = movement.to === null ? TECH_HUB : roomCenter(movement.to);
+      if (!from || !to) continue;
+      const visual = intruderVisual(current.type);
+      next.push({
+        key: `intruder-${current.id}-${latestSequence}`,
+        kind: 'INTRUDER', id: current.id, from, to,
+        color: visual.color, shape: visual.shape, label: current.type, technical: movement.to === null,
+      });
+    }
+
+    // A retreat to technical corridors removes the entity from the snapshot.
+    for (const before of previous.intrudersPool.boardTokens) {
+      if (view.intrudersPool.boardTokens.some((current) => current.id === before.id)) continue;
+      const currentLog = [...view.gameLog].reverse().find((entry) =>
+        (entry.event.type === 'INTRUDER_RETREATED' && entry.event.intruderId === before.id && entry.event.outcome === 'TECHNICAL_CORRIDOR') ||
+        (entry.event.type === 'INTRUDER_MOVED' && entry.event.intruderId === before.id && entry.event.outcome === 'TECHNICAL_CORRIDOR'),
+      );
+      if (!currentLog) continue;
+      const from = roomCenter(before.roomId);
+      if (!from) continue;
+      const visual = intruderVisual(before.type);
+      next.push({
+        key: `intruder-${before.id}-${currentLog.sequence}`,
+        kind: 'INTRUDER', id: before.id, from, to: TECH_HUB,
+        color: visual.color, shape: visual.shape, label: before.type, technical: true,
+      });
+    }
+
+    const impacts = [...view.gameLog].reverse().find((entry) => entry.event.type === 'INTRUDERS_BLOCKED_BY_DOOR');
+    if (impacts && impacts.event.type === 'INTRUDERS_BLOCKED_BY_DOOR') {
+      const corridor = view.ship.corridors[impacts.event.corridorId];
+      if (corridor) {
+        const from = roomCenter(corridor.fromRoomId);
+        const to = roomCenter(corridor.toRoomId);
+        if (from && to) {
+          setDoorImpacts([{ key: `${impacts.sequence}-${corridor.id}`, x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }]);
+          window.setTimeout(() => setDoorImpacts([]), reducedMotion ? 120 : 520);
+        }
+      }
+    }
+
+    if (next.length === 0) return;
+    setAnimations(next);
+    onActiveIdsChange?.({
+      players: new Set(next.filter((item) => item.kind === 'PLAYER').map((item) => item.id)),
+      intruders: new Set(next.filter((item) => item.kind === 'INTRUDER').map((item) => item.id)),
+    });
+    const timer = window.setTimeout(() => {
+      setAnimations([]);
+      onActiveIdsChange?.({ players: new Set(), intruders: new Set() });
+    }, reducedMotion ? 180 : DURATION + 40);
+    return () => window.clearTimeout(timer);
+  }, [view, reducedMotion, onActiveIdsChange]);
+
+  return (
+    <g id="board-animation-layer" pointerEvents="none">
+      {doorImpacts.map((impact) => (
+        <g key={impact.key} transform={`translate(${impact.x}, ${impact.y})`}>
+          <rect x="-16" y="-9" width="32" height="18" rx="3" fill="#f59e0b" fillOpacity="0.10" stroke="#f59e0b" strokeWidth="2">
+            <animate attributeName="stroke-width" values="2;7;1" dur={reducedMotion ? '0.12s' : '0.48s'} />
+            <animate attributeName="opacity" values="0.2;1;0" dur={reducedMotion ? '0.12s' : '0.48s'} fill="freeze" />
+          </rect>
+          <path d="M-11 -4 L-3 0 L-11 4 M11 -4 L3 0 L11 4" fill="none" stroke="#ff5a36" strokeWidth="2">
+            <animate attributeName="stroke-dashoffset" from="0" to="14" dur={reducedMotion ? '0.12s' : '0.48s'} />
+          </path>
+        </g>
+      ))}
+      {animations.map((animation) => (
+        <g key={animation.key}>
+          <path d={movementPath(animation.from, animation.to)} fill="none" stroke={animation.color} strokeOpacity={0.12} strokeWidth={2} strokeDasharray="5 7" />
+          <g>
+            <animateMotion
+              dur={`${reducedMotion ? 0.16 : DURATION / 1000}s`}
+              calcMode="spline"
+              keySplines="0.22 1 0.36 1"
+              path={movementPath(animation.from, animation.to)}
+              fill="freeze"
+            />
+            <animate attributeName="opacity" values={animation.technical ? '1;1;0' : '0.65;1;1'} dur={`${reducedMotion ? 0.16 : DURATION / 1000}s`} fill="freeze" />
+            <animateTransform attributeName="scale" type="scale" values={animation.technical ? '1;1.08;0.08' : '0.82;1;1'} dur={`${reducedMotion ? 0.16 : DURATION / 1000}s`} fill="freeze" />
+            {animation.kind === 'PLAYER' ? (
+              <g>
+                <circle r="12" fill={animation.color} stroke="#020617" strokeWidth="3" />
+                <circle r="6" fill="#020617" />
+              </g>
+            ) : (
+              <g transform="translate(-18,-18) scale(0.375)">
+                <path d={animation.shape} fill={animation.color} stroke="#020617" strokeWidth="3" />
+              </g>
+            )}
+            {animation.technical && (
+              <circle r="22" fill="none" stroke="#ef4444" strokeWidth="2">
+                <animate attributeName="r" from="8" to="28" dur="0.45s" fill="freeze" />
+                <animate attributeName="opacity" from="0.9" to="0" dur="0.45s" fill="freeze" />
+              </circle>
+            )}
+            {!animation.technical && (
+              <circle r="16" fill="none" stroke={animation.color} strokeWidth="1.5" opacity="0.25">
+                <animate attributeName="r" values="9;18;9" dur="0.7s" repeatCount="indefinite" />
+                <animate attributeName="opacity" values="0.35;0;0.35" dur="0.7s" repeatCount="indefinite" />
+              </circle>
+            )}
+          </g>
+        </g>
+      ))}
+    </g>
+  );
+};
diff --git a/packages/client/src/components/board/BoardCinematicFX.tsx b/packages/client/src/components/board/BoardCinematicFX.tsx
new file mode 100644
index 0000000..31e3e12
--- /dev/null
+++ b/packages/client/src/components/board/BoardCinematicFX.tsx
@@ -0,0 +1,60 @@
+import React from 'react';
+import type { SanitizedGameState } from '@nemesis/shared';
+
+interface BoardCinematicFXProps {
+  view: SanitizedGameState;
+}
+
+type FxKind = 'COMBAT' | 'FIRE' | 'ALERT' | 'VENT' | 'NONE';
+
+function classify(entry: SanitizedGameState['gameLog'][number]): FxKind {
+  switch (entry.event.type) {
+    case 'EVENT_PHASE_ATTACK_RESOLVED':
+    case 'SURPRISE_ATTACK_RESOLVED':
+    case 'ESCAPE_ATTACK_RESOLVED':
+    case 'SHOOT_RESOLVED':
+    case 'MELEE_RESOLVED':
+      return 'COMBAT';
+    case 'FIRE_DAMAGE_TAKEN_BY_INTRUDER':
+    case 'FIRE_DESTROYED_EGG':
+      return 'FIRE';
+    case 'INTRUDER_RETREATED':
+    case 'INTRUDER_MOVED':
+    case 'INTRUDERS_MOVED':
+      return 'VENT';
+    case 'CONTACT_OCCURRED':
+    case 'SELF_DESTRUCT_ADVANCED':
+      return 'ALERT';
+    default:
+      return 'NONE';
+  }
+}
+
+/** Presentation-only feedback. It never mutates game state and is intentionally cheap. */
+export const BoardCinematicFX: React.FC<BoardCinematicFXProps> = ({ view }) => {
+  const [fx, setFx] = React.useState<FxKind>('NONE');
+  const [sequence, setSequence] = React.useState<number | null>(null);
+
+  const latest = view.gameLog[view.gameLog.length - 1];
+
+  React.useEffect(() => {
+    if (!latest || latest.sequence === sequence) return;
+    setSequence(latest.sequence);
+    const next = classify(latest);
+    if (next === 'NONE') return;
+    setFx(next);
+    const timer = window.setTimeout(() => setFx('NONE'), 560);
+    return () => window.clearTimeout(timer);
+  }, [latest?.sequence, sequence]);
+
+  return (
+    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
+      <div className="board-vignette" />
+      <div className="board-scanlines" />
+      <div className="board-noise" />
+      {fx !== 'NONE' && <div className={`board-impact board-impact--${fx.toLowerCase()}`} />}
+      <div className="board-corner-marker board-corner-marker--tl" />
+      <div className="board-corner-marker board-corner-marker--br" />
+    </div>
+  );
+};
diff --git a/packages/client/src/components/board/IntruderBadge.tsx b/packages/client/src/components/board/IntruderBadge.tsx
index 7e9b925..aceb096 100644
--- a/packages/client/src/components/board/IntruderBadge.tsx
+++ b/packages/client/src/components/board/IntruderBadge.tsx
@@ -15,47 +15,31 @@ interface IntruderBadgeProps {
   y: number;
 }
 
-/**
- * Бейдж Чужих в узле отсека: цветной силуэт типа, число миниатюр и суммарные
- * раны. Появился на карте — значит движок разместил миниатюру в отсеке;
- * скрытых данных бейдж не содержит (состав отсеков и раны публичны, стр. 19).
- */
 export function IntruderBadge({ badge, x, y }: IntruderBadgeProps) {
   const color = INTRUDER_COLORS[badge.type];
+  const dominant = badge.type === 'BREEDER' || badge.type === 'QUEEN';
+  const width = (dominant ? (badge.type === 'QUEEN' ? 38 : 34) : 30) + (badge.wounds > 0 ? 14 : 0);
+  const height = dominant ? 18 : 16;
   const label = `${INTRUDER_NAMES_RU[badge.type]}: ${badge.count} шт., ран ${badge.wounds}`;
 
   return (
     <g transform={`translate(${x}, ${y})`} aria-label={label} className="pointer-events-none">
-      <rect
-        x={0}
-        y={0}
-        width={badge.wounds > 0 ? 40 : 26}
-        height={15}
-        rx={4}
-        fill="#05070c"
-        stroke={color}
-        strokeWidth={1.2}
-        strokeOpacity={0.9}
-      />
-      <svg x={2} y={1.5} width={12} height={12} viewBox="0 0 96 96" role="img" aria-hidden="true">
+      {dominant && (
+        <rect x={-2} y={-2} width={width + 4} height={height + 4} rx={5} fill={color} fillOpacity={0.08} stroke={color} strokeOpacity={0.3}>
+          <animate attributeName="opacity" values="0.25;0.8;0.25" dur="1.8s" repeatCount="indefinite" />
+        </rect>
+      )}
+      <rect x={0} y={0} width={width} height={height} rx={4} fill="#05070c" stroke={color} strokeWidth={dominant ? 1.5 : 1.2} strokeOpacity={0.95} />
+      <svg x={dominant ? 2 : 2.5} y={dominant ? 1 : 2} width={dominant ? 15 : 11} height={dominant ? 15 : 11} viewBox="0 0 96 96" role="img" aria-hidden="true">
         <path d={INTRUDER_SHAPES[badge.type]} fill={color} />
       </svg>
       {badge.count > 1 && (
-        <text x={17} y={11.5} className="fill-slate-200 font-mono text-[9px] font-bold">
-          ×{badge.count}
-        </text>
+        <text x={dominant ? 19 : 15.5} y={dominant ? 13.5 : 12} className="fill-slate-200 font-mono text-[8px] font-bold">×{badge.count}</text>
       )}
       {badge.wounds > 0 && (
         <>
-          <circle cx={badge.count > 1 ? 28 : 20} cy={7.5} r={4.6} fill="#7f1d1d" stroke="#f87171" strokeWidth={0.8} />
-          <text
-            x={badge.count > 1 ? 28 : 20}
-            y={10.3}
-            textAnchor="middle"
-            className="fill-red-200 font-mono text-[7px] font-bold"
-          >
-            {badge.wounds}
-          </text>
+          <circle cx={width - 6} cy={height / 2} r={4.7} fill="#7f1d1d" stroke="#f87171" strokeWidth={0.8} />
+          <text x={width - 6} y={height / 2 + 2.7} textAnchor="middle" className="fill-red-200 font-mono text-[7px] font-bold">{badge.wounds}</text>
         </>
       )}
     </g>
diff --git a/packages/client/src/components/board/RoomHex.intruders.test.tsx b/packages/client/src/components/board/RoomHex.intruders.test.tsx
index 8b0069c..55fdc08 100644
--- a/packages/client/src/components/board/RoomHex.intruders.test.tsx
+++ b/packages/client/src/components/board/RoomHex.intruders.test.tsx
@@ -72,3 +72,35 @@ describe('RoomHex: бейджи Чужих на карте', () => {
     expect(html).not.toContain('aria-label="Взрослая особь');
   });
 });
+
+describe('RoomHex: расширенная визуализация Шага 8', () => {
+  it('показывает пульсирующую рамку Боя при Персонаже и Чужом', () => {
+    const node = SHIP_ROOM_NODES.find((candidate) => candidate.id === 11)!;
+    const raw = createInitialGameState('combat-frame');
+    const player = raw.players['player-1']!;
+    player.roomId = 11;
+    raw.ship.rooms[11]!.occupantPlayerIds = [player.id];
+    const intruder = { id: 'adult-combat', type: 'ADULT' as const, roomId: 11, woundsCount: 0 };
+    raw.intrudersPool.boardTokens.push(intruder);
+    raw.ship.rooms[11]!.occupantIntruderIds = [intruder.id];
+    const view = filterStateForPlayer(raw, 'player-1');
+    const html = renderToStaticMarkup(
+      <svg>
+        <RoomHex room={view.ship.rooms[11]!} intruders={[intruder]} x={node.x} y={node.y} isSelected={false} onSelect={() => undefined} />
+      </svg>,
+    );
+    expect(html).toContain('#ff5a36');
+    expect(html).toContain('#ffb347');
+    expect(html).toContain('stroke-dasharray="5 4"');
+  });
+
+  it('выделяет Трутня и Королеву увеличенным силуэтом и аурой', () => {
+    const html = renderHex(11, [
+      { id: 'breeder-1', type: 'BREEDER', roomId: 0, woundsCount: 0 },
+      { id: 'queen-1', type: 'QUEEN', roomId: 0, woundsCount: 1 },
+    ]);
+    expect(html).toContain('dur="2s"');
+    expect(html).toContain('#9f1239');
+    expect(html).toContain('#a855f7');
+  });
+});
diff --git a/packages/client/src/components/board/RoomHex.tsx b/packages/client/src/components/board/RoomHex.tsx
index 14a616f..c3b3540 100644
--- a/packages/client/src/components/board/RoomHex.tsx
+++ b/packages/client/src/components/board/RoomHex.tsx
@@ -13,6 +13,8 @@ interface RoomHexProps {
   y: number;
   isSelected: boolean;
   onSelect: (roomId: number) => void;
+  hiddenIntruderIds?: ReadonlySet<string>;
+  hiddenPlayerIds?: ReadonlySet<string>;
 }
 
 const CANONICAL_ROOM_NAMES: Record<string, [string, string]> = {
@@ -43,7 +45,7 @@ const CANONICAL_ROOM_NAMES: Record<string, [string, string]> = {
   SHOWER: ['ДУШЕВАЯ', 'ЭКИПАЖА'],
 };
 
-export const RoomHex: React.FC<RoomHexProps> = ({ room, intruders, x, y, isSelected, onSelect }) => {
+export const RoomHex: React.FC<RoomHexProps> = ({ room, intruders, x, y, isSelected, onSelect, hiddenIntruderIds, hiddenPlayerIds }) => {
   const radius = 45;
 
   const points = React.useMemo(() => {
@@ -58,10 +60,17 @@ export const RoomHex: React.FC<RoomHexProps> = ({ room, intruders, x, y, isSelec
     return pts.join(' ');
   }, [x, y, radius]);
 
-  const intruderBadges = React.useMemo(() => groupIntrudersByRoom(intruders).get(room.id) ?? [], [intruders, room.id]);
+  const visibleIntruders = React.useMemo(
+    () => intruders.filter((intruder) => !hiddenIntruderIds?.has(intruder.id)),
+    [intruders, hiddenIntruderIds],
+  );
+  const intruderBadges = React.useMemo(() => groupIntrudersByRoom(visibleIntruders).get(room.id) ?? [], [visibleIntruders, room.id]);
 
   const layout = React.useMemo(() => layoutIntruderBadges(intruderBadges), [intruderBadges]);
   const layoutScale = layout.scale;
+  const visiblePlayers = room.occupantPlayerIds.filter((id) => !hiddenPlayerIds?.has(id));
+  const hasCombat = visiblePlayers.length > 0 && intruderBadges.length > 0;
+  const hasLargeIntruder = intruderBadges.some((badge) => badge.type === 'BREEDER' || badge.type === 'QUEEN');
 
   const nodeData = React.useMemo(() => SHIP_ROOM_NODES.find((node) => node.id === room.id), [room.id]);
 
@@ -100,6 +109,22 @@ export const RoomHex: React.FC<RoomHexProps> = ({ room, intruders, x, y, isSelec
       }}
       className="cursor-pointer transition-all duration-150 hover:brightness-125 select-none"
     >
+      {hasCombat && (
+        <>
+          <polygon points={points} fill="none" stroke="#ff5a36" strokeWidth="5" strokeOpacity="0.7" className="animate-pulse" />
+          <polygon points={points} fill="none" stroke="#ffb347" strokeWidth="2" strokeDasharray="5 4" strokeOpacity="0.95">
+            <animate attributeName="stroke-opacity" values="0.25;1;0.25" dur="1.2s" repeatCount="indefinite" />
+          </polygon>
+        </>
+      )}
+
+      {hasLargeIntruder && (
+        <circle cx={x} cy={y + 31} r={25} fill="#a855f7" fillOpacity="0.04" stroke="#a855f7" strokeOpacity="0.18" strokeWidth="2">
+          <animate attributeName="r" values="22;28;22" dur="2s" repeatCount="indefinite" />
+          <animate attributeName="opacity" values="0.2;0.7;0.2" dur="2s" repeatCount="indefinite" />
+        </circle>
+      )}
+
       {isSelected && (
         <polygon
           points={points}
@@ -189,7 +214,7 @@ export const RoomHex: React.FC<RoomHexProps> = ({ room, intruders, x, y, isSelec
       </g>
 
       {/* Персонажи */}
-      {room.occupantPlayerIds.length > 0 && (
+      {visiblePlayers.length > 0 && (
         <g transform={`translate(${x - 10}, ${y - 34})`} className="pointer-events-none">
           <circle cx={10} cy={10} r={10} fill="#00f0ff" stroke="#05070c" strokeWidth={2} />
 
@@ -201,9 +226,9 @@ export const RoomHex: React.FC<RoomHexProps> = ({ room, intruders, x, y, isSelec
       {/* Чужие в отсеке: цветной силуэт типа, число миниатюр и раны (стр. 19).
           Строка центрирована по гексу и сжимается целиком при переполнении. */}
       {intruderBadges.length > 0 && (
-        <g transform={`translate(${x - (layout.width * layoutScale) / 2}, ${y + 22}) scale(${layoutScale})`}>
+        <g transform={`translate(${x - (layout.width * layoutScale) / 2}, ${y + 18}) scale(${layoutScale})`}>
           {layout.items.map((item) => (
-            <IntruderBadge key={item.badge.type} badge={item.badge} x={item.x} y={0} />
+            <IntruderBadge key={item.badge.type} badge={item.badge} x={item.x} y={item.y} />
           ))}
         </g>
       )}
diff --git a/packages/client/src/components/board/ShipMapSVG.tsx b/packages/client/src/components/board/ShipMapSVG.tsx
index 8d90723..f102c4e 100644
--- a/packages/client/src/components/board/ShipMapSVG.tsx
+++ b/packages/client/src/components/board/ShipMapSVG.tsx
@@ -4,6 +4,9 @@ import { SHIP_ROOM_NODES } from '@nemesis/shared';
 import { useGameStore } from '../../store/gameStore';
 import { RoomHex } from './RoomHex';
 import { CorridorEdge } from './CorridorEdge';
+import { TechnicalCorridorsNode } from './TechnicalCorridorsNode';
+import { BoardAnimationLayer } from './BoardAnimationLayer';
+import { BoardCinematicFX } from './BoardCinematicFX';
 import { groupIntrudersByRoom } from './intruderMapModel';
 import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
 
@@ -11,6 +14,15 @@ export const ShipMapSVG: React.FC = () => {
   const view = useGameStore((state) => state.view);
   const selectedRoomId = useGameStore((state) => state.selectedRoomId);
   const selectRoom = useGameStore((state) => state.selectRoom);
+  const selectTechnicalCorridor = useGameStore((state) => state.selectTechnicalCorridor);
+  const selectedTechnicalCorridor = useGameStore((state) => state.selectedTechnicalCorridor);
+  const [hiddenAnimationIds, setHiddenAnimationIds] = React.useState<{ players: Set<string>; intruders: Set<string> }>({
+    players: new Set(),
+    intruders: new Set(),
+  });
+  const handleAnimationIdsChange = React.useCallback((ids: { players: Set<string>; intruders: Set<string> }) => {
+    setHiddenAnimationIds(ids);
+  }, []);
 
   const intrudersByRoom = React.useMemo(
     () => (view ? groupIntrudersByRoom(view.intrudersPool.boardTokens) : new Map()),
@@ -29,6 +41,7 @@ export const ShipMapSVG: React.FC = () => {
 
   return (
     <div className="relative w-full h-full touch-none bg-nemesis-bg overflow-hidden">
+      <BoardCinematicFX view={view} />
       <TransformWrapper
         initialScale={1}
         minScale={0.7}
@@ -93,7 +106,15 @@ export const ShipMapSVG: React.FC = () => {
                   })}
                 </g>
 
-                {/* 2. Слой комнат */}
+                {/* 2. Слой вентиляционной сети и центрального поля Технических коридоров */}
+                <TechnicalCorridorsNode
+                  view={view}
+                  coordsMap={coordsMap}
+                  isSelected={selectedTechnicalCorridor}
+                  onSelect={selectTechnicalCorridor}
+                />
+
+                {/* 3. Слой комнат */}
                 <g id="rooms-layer">
                   {Object.values(view.ship.rooms).map((room) => {
                     const coord = coordsMap.get(room.id);
@@ -108,10 +129,14 @@ export const ShipMapSVG: React.FC = () => {
                         y={coord.y}
                         isSelected={selectedRoomId === room.id}
                         onSelect={selectRoom}
+                        hiddenIntruderIds={hiddenAnimationIds.intruders}
+                        hiddenPlayerIds={hiddenAnimationIds.players}
                       />
                     );
                   })}
                 </g>
+
+                <BoardAnimationLayer view={view} onActiveIdsChange={handleAnimationIdsChange} />
               </svg>
             </TransformComponent>
           </>
diff --git a/packages/client/src/components/board/TechnicalCorridorsNode.test.tsx b/packages/client/src/components/board/TechnicalCorridorsNode.test.tsx
new file mode 100644
index 0000000..ec7c7e9
--- /dev/null
+++ b/packages/client/src/components/board/TechnicalCorridorsNode.test.tsx
@@ -0,0 +1,75 @@
+import { describe, expect, it } from 'vitest';
+import { renderToStaticMarkup } from 'react-dom/server';
+import { createInitialGameState, filterStateForPlayer, type GameLogEntry } from '@nemesis/shared';
+import { SHIP_ROOM_NODES } from '@nemesis/shared';
+import { TechnicalCorridorsNode } from './TechnicalCorridorsNode';
+
+describe('TechnicalCorridorsNode: интерактивная вентиляция', () => {
+  function renderNode(withNoise = false, withRetreat = false): string {
+    const state = createInitialGameState('technical-node-test');
+    state.ship.technicalCorridorNoise = withNoise;
+
+    if (withRetreat) {
+      const entry: GameLogEntry = {
+        id: 'log-tech-retreat',
+        sequence: 999,
+        event: {
+          type: 'INTRUDER_RETREATED',
+          intruderId: 'intruder-1',
+          intruderType: 'ADULT',
+          fromRoomId: 15,
+          toRoomId: null,
+          corridorId: null,
+          direction: 4,
+          outcome: 'TECHNICAL_CORRIDOR',
+          eventCardId: 'EVENT_HUNT_2',
+        },
+      };
+      state.gameLog.push(entry);
+    }
+
+    const view = filterStateForPlayer(state, 'player-1');
+    const coordsMap = new Map(SHIP_ROOM_NODES.map((node) => [node.id, { x: node.x, y: node.y }]));
+
+    return renderToStaticMarkup(
+      <svg>
+        <TechnicalCorridorsNode
+          view={view}
+          coordsMap={coordsMap}
+          isSelected={false}
+          onSelect={() => undefined}
+        />
+      </svg>,
+    );
+  }
+
+  it('рисует центральную отдельную локацию и все входы вентиляции', () => {
+    const html = renderNode();
+
+    expect(html).toContain('ТЕХ. КОРИДОРЫ');
+    expect(html).toContain('aria-label="Технические коридоры"');
+    expect(html).toContain('tech-link-2');
+    expect(html).toContain('tech-link-4');
+    expect(html).toContain('tech-link-5');
+    expect(html).toContain('tech-link-9');
+    expect(html).toContain('tech-link-14');
+    expect(html).toContain('tech-link-15');
+    expect(html).toContain('tech-link-19');
+    expect(html).toContain('tech-link-21');
+  });
+
+  it('показывает тревожное состояние при шуме в вентиляции', () => {
+    const html = renderNode(true);
+
+    expect(html).toContain('ШУМ / КОНТАКТ');
+    expect(html).toContain('#ff334f');
+    expect(html).toContain('animate-ping');
+  });
+
+  it('использует событие журнала для визуального перехода Чужого в вентиляцию', () => {
+    const html = renderNode(false, true);
+
+    expect(html).toContain('ЧУЖОЙ');
+    expect(html).toContain('В ВЕНТИЛЯЦИЮ');
+  });
+});
diff --git a/packages/client/src/components/board/TechnicalCorridorsNode.tsx b/packages/client/src/components/board/TechnicalCorridorsNode.tsx
new file mode 100644
index 0000000..64f9268
--- /dev/null
+++ b/packages/client/src/components/board/TechnicalCorridorsNode.tsx
@@ -0,0 +1,191 @@
+import React from 'react';
+import { SHIP_ROOM_NODES, type SanitizedGameState, type RoomId } from '@nemesis/shared';
+
+interface TechnicalCorridorsNodeProps {
+  view: SanitizedGameState;
+  coordsMap: Map<RoomId, { x: number; y: number }>;
+  isSelected: boolean;
+  onSelect: () => void;
+}
+
+const HUB = { x: 95, y: 900 };
+const TECH_ROOMS = SHIP_ROOM_NODES.filter((node) => node.techNumbers.length > 0);
+
+const TECH_ANCHOR_OFFSET = 39;
+
+function roomName(view: SanitizedGameState, roomId: RoomId): string {
+  const room = view.ship.rooms[roomId];
+  if (!room?.isExplored || !room.definitionId) return `Отсек ${String(roomId).padStart(3, '0')}`;
+  return room.definitionId.replaceAll('_', ' ');
+}
+
+export const TechnicalCorridorsNode: React.FC<TechnicalCorridorsNodeProps> = ({
+  view,
+  coordsMap,
+  isSelected,
+  onSelect,
+}) => {
+  const latestTechnicalRetreat = [...view.gameLog]
+    .reverse()
+    .find(
+      (entry) =>
+        entry.event.type === 'INTRUDER_RETREATED' &&
+        entry.event.outcome === 'TECHNICAL_CORRIDOR',
+    );
+
+  const [showRetreatAnimation, setShowRetreatAnimation] = React.useState(false);
+
+  React.useEffect(() => {
+    if (!latestTechnicalRetreat) {
+      setShowRetreatAnimation(false);
+      return;
+    }
+
+    setShowRetreatAnimation(true);
+    const timer = window.setTimeout(() => setShowRetreatAnimation(false), 1100);
+    return () => window.clearTimeout(timer);
+  }, [latestTechnicalRetreat?.sequence]);
+
+  const technicalNoise = view.ship.technicalCorridorNoise;
+  const connections = TECH_ROOMS.flatMap((node) => {
+    const room = coordsMap.get(node.id);
+    if (!room) return [];
+
+    const dx = HUB.x - room.x;
+    const dy = HUB.y - room.y;
+    const length = Math.hypot(dx, dy) || 1;
+    const ux = dx / length;
+    const uy = dy / length;
+
+    return [
+      {
+        node,
+        room,
+        startX: room.x + ux * TECH_ANCHOR_OFFSET,
+        startY: room.y + uy * TECH_ANCHOR_OFFSET,
+        endX: HUB.x - ux * 32,
+        endY: HUB.y - uy * 32,
+      },
+    ];
+  });
+
+  return (
+    <g id="technical-corridors-layer" className="select-none">
+      <defs>
+        <filter id="technical-glow" x="-80%" y="-80%" width="260%" height="260%">
+          <feGaussianBlur stdDeviation="4" result="blur" />
+          <feMerge>
+            <feMergeNode in="blur" />
+            <feMergeNode in="SourceGraphic" />
+          </feMerge>
+        </filter>
+      </defs>
+
+      {connections.map(({ node, startX, startY, endX, endY }) => {
+        const midX = (startX + endX) / 2;
+        const midY = (startY + endY) / 2;
+        const curve = Math.max(28, Math.min(95, Math.abs(endY - startY) * 0.18));
+        const path = `M ${startX} ${startY} Q ${midX + curve} ${midY - curve} ${endX} ${endY}`;
+
+        return (
+          <g key={`tech-link-${node.id}`} pointerEvents="none">
+            <path
+              d={path}
+              fill="none"
+              stroke={technicalNoise ? '#ff334f' : '#e34b72'}
+              strokeOpacity={technicalNoise ? 0.42 : 0.20}
+              strokeWidth={technicalNoise ? 7 : 4}
+              filter={technicalNoise ? 'url(#technical-glow)' : undefined}
+            />
+            <path
+              d={path}
+              fill="none"
+              stroke={technicalNoise ? '#ff9a3d' : '#a855f7'}
+              strokeOpacity={technicalNoise ? 0.95 : 0.58}
+              strokeWidth={technicalNoise ? 2.2 : 1.5}
+              strokeDasharray="5 8"
+            >
+              <animate attributeName="stroke-dashoffset" from="0" to="-26" dur="1.1s" repeatCount="indefinite" />
+            </path>
+          </g>
+        );
+      })}
+
+      <g
+        transform={`translate(${HUB.x}, ${HUB.y})`}
+        onClick={(event) => {
+          event.stopPropagation();
+          onSelect();
+        }}
+        role="button"
+        aria-label="Технические коридоры"
+        className="cursor-pointer"
+      >
+        {isSelected && <circle r="74" fill="none" stroke="#00f0ff" strokeWidth="5" strokeOpacity="0.42" className="animate-pulse" />}
+        {technicalNoise && <circle r="66" fill="none" stroke="#ff334f" strokeWidth="8" strokeOpacity="0.20" className="animate-ping" />}
+
+        <polygon
+          points="0,-57 49,-29 49,29 0,57 -49,29 -49,-29"
+          fill={technicalNoise ? '#2b0d15' : '#111827'}
+          stroke={isSelected ? '#00f0ff' : technicalNoise ? '#ff334f' : '#a855f7'}
+          strokeWidth={isSelected ? 3.5 : 2.5}
+          filter={technicalNoise ? 'url(#technical-glow)' : undefined}
+        />
+        <polygon
+          points="0,-46 39,-23 39,23 0,46 -39,23 -39,-23"
+          fill="none"
+          stroke={technicalNoise ? '#ff9a3d' : '#475569'}
+          strokeWidth="1"
+          strokeDasharray="3 4"
+        />
+
+        {/* Industrial ventilation grille */}
+        <g stroke={technicalNoise ? '#ff6b35' : '#64748b'} strokeWidth="2" opacity="0.9">
+          <line x1="-22" y1="-16" x2="22" y2="16" />
+          <line x1="-22" y1="0" x2="22" y2="0" />
+          <line x1="-22" y1="16" x2="22" y2="-16" />
+        </g>
+        <circle r="7" fill={technicalNoise ? '#ff334f' : '#0f172a'} stroke="#f59e0b" strokeWidth="1.5" />
+        <text y="-72" textAnchor="middle" className="text-[9px] font-mono fill-amber-300 font-bold tracking-wider">
+          TECHNICAL
+        </text>
+        <text y="86" textAnchor="middle" className="text-[10px] font-mono fill-slate-300 font-bold">
+          ТЕХ. КОРИДОРЫ
+        </text>
+        <text y="101" textAnchor="middle" className={`text-[8px] font-mono font-bold ${technicalNoise ? 'fill-red-400' : 'fill-slate-500'}`}>
+          {technicalNoise ? 'ШУМ / КОНТАКТ' : 'ВЕНТИЛЯЦИЯ'}
+        </text>
+
+        {showRetreatAnimation && latestTechnicalRetreat && (
+          <g className="pointer-events-none">
+            <circle r="17" fill="none" stroke="#e879f9" strokeWidth="3" opacity="0.8">
+              <animate attributeName="r" from="10" to="62" dur="1s" fill="freeze" />
+              <animate attributeName="opacity" from="0.95" to="0" dur="1s" fill="freeze" />
+            </circle>
+            <text y="-8" textAnchor="middle" className="text-[8px] font-mono fill-fuchsia-300 font-bold">
+              ЧУЖОЙ
+            </text>
+            <text y="5" textAnchor="middle" className="text-[7px] font-mono fill-white">
+              В ВЕНТИЛЯЦИЮ
+            </text>
+          </g>
+        )}
+      </g>
+
+      {/* Небольшие маячки у входов связывают номер вентиляции с общей сетью. */}
+      {TECH_ROOMS.map((node) => {
+        const coord = coordsMap.get(node.id);
+        if (!coord) return null;
+        return (
+          <g key={`tech-anchor-${node.id}`} transform={`translate(${coord.x}, ${coord.y})`} pointerEvents="none">
+            <circle cy="-39" r="3.5" fill={technicalNoise ? '#ff334f' : '#a855f7'} stroke="#05070c" strokeWidth="1" />
+            <text x="0" y="-46" textAnchor="middle" className="text-[6px] font-mono fill-fuchsia-300 font-bold">
+              {node.techNumbers.join('/')}
+            </text>
+            <title>{`${roomName(view, node.id)} → Технические коридоры`}</title>
+          </g>
+        );
+      })}
+    </g>
+  );
+};
diff --git a/packages/client/src/components/board/intruderMapModel.test.ts b/packages/client/src/components/board/intruderMapModel.test.ts
index a11879e..226642a 100644
--- a/packages/client/src/components/board/intruderMapModel.test.ts
+++ b/packages/client/src/components/board/intruderMapModel.test.ts
@@ -71,15 +71,18 @@ describe('Статус Боя по публичному состоянию (ст
 });
 
 describe('Раскладка строки бейджей', () => {
-  it('короткая строка масштаба 1 с правильными сдвигами', () => {
+  it('для 2+ разных типов включает адаптивную сетку', () => {
     const layout = layoutIntruderBadges([
       { type: 'LARVA', count: 1, wounds: 0 },
       { type: 'ADULT', count: 1, wounds: 2 },
     ]);
 
     expect(layout.scale).toBe(1);
-    expect(layout.width).toBe(26 + 4 + 40);
-    expect(layout.items.map((item) => item.x)).toEqual([0, 30]);
+    expect(layout.grid).toBe(true);
+    expect(layout.items[0]?.y).toBe(0);
+    expect(layout.items[1]?.y).toBe(0);
+    expect(layout.width).toBeGreaterThan(0);
+    expect(layout.height).toBeGreaterThan(0);
   });
 
   it('при переполнении сжимается целиком до максимальной ширины', () => {
diff --git a/packages/client/src/components/board/intruderMapModel.ts b/packages/client/src/components/board/intruderMapModel.ts
index 5fd0158..2f1f770 100644
--- a/packages/client/src/components/board/intruderMapModel.ts
+++ b/packages/client/src/components/board/intruderMapModel.ts
@@ -1,15 +1,5 @@
 import type { IntruderEntity, IntruderType, SanitizedGameState } from '@nemesis/shared';
 
-/**
- * Модель отображения Чужих на карте и статуса Боя (Этап 4, Шаг 3).
- *
- * Только чтение `SanitizedGameState`: клиент не вычисляет скрытых фактов —
- * состав отсеков и раны приходят из движка публичными (миниатюры и маркеры
- * Ран лежат на виду, стр. 19). Статус Боя (стр. 18) выводится из того же
- * публичного состава отсеков.
- */
-
-/** Порядок показа типов в узле отсека: от Личинки к Королеве. */
 const TYPE_ORDER: Record<IntruderType, number> = {
   LARVA: 0,
   CREEPER: 1,
@@ -18,85 +8,92 @@ const TYPE_ORDER: Record<IntruderType, number> = {
   QUEEN: 4,
 };
 
-/** Чужие одного типа в отсеке: иконка типа, число миниатюр и суммарные раны. */
 export interface IntruderBadgeModel {
   type: IntruderType;
   count: number;
   wounds: number;
 }
 
-/** Группирует публичный список Чужих по отсекам (id отсека -> бейджи по типам). */
 export function groupIntrudersByRoom(intruders: readonly IntruderEntity[]): Map<number, IntruderBadgeModel[]> {
   const byRoom = new Map<number, IntruderBadgeModel[]>();
-
   for (const intruder of intruders) {
     const badges = byRoom.get(intruder.roomId) ?? [];
     const existing = badges.find((badge) => badge.type === intruder.type);
-
     if (existing) {
       existing.count += 1;
       existing.wounds += intruder.woundsCount;
     } else {
       badges.push({ type: intruder.type, count: 1, wounds: intruder.woundsCount });
     }
-
     byRoom.set(intruder.roomId, badges);
   }
-
-  for (const badges of byRoom.values()) {
-    badges.sort((left, right) => TYPE_ORDER[left.type]! - TYPE_ORDER[right.type]!);
-  }
-
+  for (const badges of byRoom.values()) badges.sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type]);
   return byRoom;
 }
 
-/** Чужие выбранного отсека в порядке показа. */
 export function intrudersInRoom(intruders: readonly IntruderEntity[], roomId: number): IntruderEntity[] {
-  return intruders
-    .filter((intruder) => intruder.roomId === roomId)
-    .sort((left, right) => TYPE_ORDER[left.type]! - TYPE_ORDER[right.type]!);
+  return intruders.filter((intruder) => intruder.roomId === roomId).sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type]);
 }
 
-/**
- * Персонаж в Бою, если в его отсеке есть Чужой (стр. 18). Считывается из
- * публичных данных — ровно тот же предикат, что движок применяет для
- * блокировки Поиска, Осторожного движения и Действий Комнат.
- */
 export function isActivePlayerInCombat(view: SanitizedGameState): boolean {
   const player = view.players[view.meta.activePlayerId];
-
-  if (!player) return false;
-  if (player.isDead || player.isInHibernation || player.hasEscapedInPod) return false;
-
+  if (!player || player.isDead || player.isInHibernation || player.hasEscapedInPod) return false;
   return (view.ship.rooms[player.roomId]?.occupantIntruderIds.length ?? 0) > 0;
 }
 
-/** Ширина одного бейджа: с пилой ран шире, без — компактнее. */
 export function intruderBadgeWidth(badge: IntruderBadgeModel): number {
-  return badge.wounds > 0 ? 40 : 26;
+  const base = badge.type === 'QUEEN' ? 38 : badge.type === 'BREEDER' ? 34 : 30;
+  return badge.wounds > 0 ? base + 14 : base;
+}
+
+export interface IntruderBadgeLayoutItem {
+  badge: IntruderBadgeModel;
+  x: number;
+  y: number;
 }
 
 export interface IntruderBadgeLayout {
-  items: { badge: IntruderBadgeModel; x: number }[];
-  /** 1, если строка помещается; иначе коэффициент сжатия вдоль строки. */
+  items: IntruderBadgeLayoutItem[];
   scale: number;
-  /** Полная ширина строки до сжатия. */
   width: number;
+  height: number;
+  grid: boolean;
 }
 
 /**
- * Раскладывает бейджи в одну строку с зазором 4 и при переполнении сжимает
- * её целиком (масштаб SVG), чтобы бейджи не уезжали за пределы гекса.
+ * 2+ разных типа раскладываются адаптивной сеткой 2×N. Один тип остаётся
+ * компактной строкой. Сетка специально резервирует нижнюю часть гекса, чтобы
+ * номер и название отсека никогда не перекрывались миниатюрами.
  */
-export function layoutIntruderBadges(badges: readonly IntruderBadgeModel[], maxWidth = 88): IntruderBadgeLayout {
-  const gap = 4;
-  const width = badges.reduce((sum, badge, index) => sum + intruderBadgeWidth(badge) + (index > 0 ? gap : 0), 0);
-  let cursor = 0;
-  const items = badges.map((badge) => {
-    const item = { badge, x: cursor };
-    cursor += intruderBadgeWidth(badge) + gap;
-    return item;
+export function layoutIntruderBadges(badges: readonly IntruderBadgeModel[], maxWidth = 82): IntruderBadgeLayout {
+  if (badges.length === 0) return { items: [], scale: 1, width: 0, height: 0, grid: false };
+
+  const gap = 3;
+  const differentTypes = badges.length >= 2;
+  const columns = differentTypes ? Math.min(2, badges.length) : 1;
+  const rows = Math.ceil(badges.length / columns);
+  const cellWidths = badges.map(intruderBadgeWidth);
+  const width = columns === 1
+    ? cellWidths[0]!
+    : Math.max(...Array.from({ length: columns }, (_, column) =>
+        Math.max(...badges.filter((_, index) => index % columns === column).map(intruderBadgeWidth)),
+      )) * columns + gap * (columns - 1);
+  const rowHeight = 18;
+  const height = rows * rowHeight + Math.max(0, rows - 1) * gap;
+  const scale = width > maxWidth ? maxWidth / width : 1;
+
+  const items = badges.map((badge, index) => {
+    const row = differentTypes ? Math.floor(index / columns) : 0;
+    const column = differentTypes ? index % columns : 0;
+    let x = 0;
+    if (differentTypes) {
+      for (let c = 0; c < column; c++) {
+        const maxCell = Math.max(...badges.filter((_, i) => i % columns === c).map(intruderBadgeWidth));
+        x += maxCell + gap;
+      }
+    }
+    return { badge, x, y: row * (rowHeight + gap) };
   });
 
-  return { items, scale: width > maxWidth ? maxWidth / width : 1, width };
+  return { items, scale, width, height, grid: differentTypes };
 }
diff --git a/packages/client/src/components/contact/ContactModal.tsx b/packages/client/src/components/contact/ContactModal.tsx
index 3f27e8e..a5c0904 100644
--- a/packages/client/src/components/contact/ContactModal.tsx
+++ b/packages/client/src/components/contact/ContactModal.tsx
@@ -20,6 +20,7 @@ export function ContactModal({ entry, view, onClose }: ContactModalProps) {
   const isShoot = event.type === 'SHOOT_RESOLVED';
   const isMelee = event.type === 'MELEE_RESOLVED';
   const isEscape = event.type === 'ESCAPE_ATTACK_RESOLVED';
+  const isEventPhaseAttack = event.type === 'EVENT_PHASE_ATTACK_RESOLVED';
   const type = isContact ? event.tokenType : isShoot || isMelee ? event.targetType : event.intruderType;
   const playerName = view.players[event.playerId]?.name ?? event.playerId;
 
@@ -62,7 +63,9 @@ export function ContactModal({ entry, view, onClose }: ContactModalProps) {
                   ? 'РУКОПАШНАЯ АТАКА'
                   : isEscape
                     ? 'ПОБЕГ — АТАКА В СПИНУ'
-                    : 'ВНЕЗАПНАЯ АТАКА'}
+                    : isEventPhaseAttack
+                      ? 'АТАКА ЧУЖОГО — ФАЗА СОБЫТИЙ'
+                      : 'ВНЕЗАПНАЯ АТАКА'}
           </h2>
           <p className="mt-1 text-sm text-slate-400">{playerName}</p>
         </header>
@@ -309,10 +312,11 @@ export function ContactModal({ entry, view, onClose }: ContactModalProps) {
             </div>
           ) : (
             <div className="space-y-3 motion-safe:animate-contact-card motion-reduce:animate-none">
-              {isEscape && (
+              {(isEscape || isEventPhaseAttack) && (
                 <p className="rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
-                  Персонаж покидал отсек с Чужими: перед шагом каждый Чужой провёл Атаку в спину, от крупного к мелкому
-                  (стр. 19, FAQ Rules 5).
+                  {isEscape
+                    ? 'Персонаж покидал отсек с Чужими: перед шагом каждый Чужой провёл Атаку в спину, от крупного к мелкому (стр. 19, FAQ Rules 5).'
+                    : 'Атака выполнена автоматически в Фазе Событий. Цель выбрана движком по числу карт на руке и порядку Первого Игрока.'}
                 </p>
               )}
               <div className="rounded-xl border border-red-900/80 bg-slate-950/70 p-4">
diff --git a/packages/client/src/components/contact/contactPresentationModel.ts b/packages/client/src/components/contact/contactPresentationModel.ts
index 66ce74e..3c3b015 100644
--- a/packages/client/src/components/contact/contactPresentationModel.ts
+++ b/packages/client/src/components/contact/contactPresentationModel.ts
@@ -18,6 +18,7 @@ export function isContactPresentationEntry(entry: GameLogEntry): entry is Contac
     entry.event.type === 'CONTACT_OCCURRED' ||
     entry.event.type === 'SURPRISE_ATTACK_RESOLVED' ||
     entry.event.type === 'ESCAPE_ATTACK_RESOLVED' ||
+    entry.event.type === 'EVENT_PHASE_ATTACK_RESOLVED' ||
     entry.event.type === 'SHOOT_RESOLVED' ||
     entry.event.type === 'MELEE_RESOLVED'
   );
diff --git a/packages/client/src/components/dev/devPanelModel.ts b/packages/client/src/components/dev/devPanelModel.ts
index ffec640..9604149 100644
--- a/packages/client/src/components/dev/devPanelModel.ts
+++ b/packages/client/src/components/dev/devPanelModel.ts
@@ -22,6 +22,7 @@ export const GAME_OVER_REASON_LABELS: Record<NonNullable<SanitizedGameState['met
   SHIP_EXPLODED: 'корабль взорвался',
   HULL_BREACH: 'разрыв обшивки',
   NO_ACTIVE_CHARACTERS: 'на корабле не осталось активных персонажей',
+  HYPERSPACE_JUMP: 'корабль совершил гиперпрыжок',
 };
 
 /** Разрушенную Дверь снова не закрыть: переключать её некуда (стр. 17). */
diff --git a/packages/client/src/components/inspector/TechnicalCorridorInspector.test.tsx b/packages/client/src/components/inspector/TechnicalCorridorInspector.test.tsx
new file mode 100644
index 0000000..e95c746
--- /dev/null
+++ b/packages/client/src/components/inspector/TechnicalCorridorInspector.test.tsx
@@ -0,0 +1,21 @@
+import { describe, expect, it } from 'vitest';
+import { renderToStaticMarkup } from 'react-dom/server';
+import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';
+import { TechnicalCorridorInspector } from './TechnicalCorridorInspector';
+
+describe('TechnicalCorridorInspector', () => {
+  it('показывает состояние вентиляции и входы', () => {
+    const state = createInitialGameState('technical-inspector');
+    state.ship.technicalCorridorNoise = true;
+    const view = filterStateForPlayer(state, 'player-1');
+
+    const html = renderToStaticMarkup(<TechnicalCorridorInspector view={view} />);
+
+    expect(html).toContain('Технические коридоры');
+    expect(html).toContain('Вентиляция: обнаружен шум');
+    expect(html).toContain('Входы в вентиляцию');
+    expect(html).toContain('ВЫХОД 1 / 2');
+    expect(html).toContain('ВЫХОД 2 / 3');
+    expect(html).toContain('Классовые возможности');
+  });
+});
diff --git a/packages/client/src/components/inspector/TechnicalCorridorInspector.tsx b/packages/client/src/components/inspector/TechnicalCorridorInspector.tsx
new file mode 100644
index 0000000..e206d9e
--- /dev/null
+++ b/packages/client/src/components/inspector/TechnicalCorridorInspector.tsx
@@ -0,0 +1,112 @@
+import React from 'react';
+import { SHIP_ROOM_NODES, type SanitizedGameState } from '@nemesis/shared';
+import { Activity, Fan, MapPin, Volume2, X } from 'lucide-react';
+import { useGameStore } from '../../store/gameStore';
+
+interface TechnicalCorridorInspectorProps {
+  view: SanitizedGameState;
+}
+
+const TECH_ROOMS = SHIP_ROOM_NODES.filter((node) => node.techNumbers.length > 0);
+
+const ROOM_NAMES: Record<string, string> = {
+  COCKPIT: 'Мостик',
+  HIBERNATORIUM: 'Криогенный отсек',
+  ENGINE_01: 'Машинный отсек #01',
+  ENGINE_02: 'Машинный отсек #02',
+  ENGINE_03: 'Машинный отсек #03',
+};
+
+function displayRoomName(view: SanitizedGameState, roomId: number): string {
+  const room = view.ship.rooms[roomId];
+  if (!room) return `Отсек ${String(roomId).padStart(3, '0')}`;
+  if (!room.isExplored || !room.definitionId) return `Отсек ${String(roomId).padStart(3, '0')}`;
+  return ROOM_NAMES[room.definitionId] ?? room.definitionId.replaceAll('_', ' ');
+}
+
+export const TechnicalCorridorInspector: React.FC<TechnicalCorridorInspectorProps> = ({ view }) => {
+  const selectRoom = useGameStore((state) => state.selectRoom);
+  const selectTechnicalCorridor = useGameStore((state) => state.selectTechnicalCorridor);
+  const noise = view.ship.technicalCorridorNoise;
+
+  return (
+    <aside className="absolute right-4 top-4 z-30 w-[min(360px,calc(100%-2rem))] rounded-xl border border-fuchsia-900/60 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-md">
+      <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
+        <div className="flex items-center gap-3">
+          <div className={`rounded-lg border p-2 ${noise ? 'border-red-500/60 bg-red-950/40' : 'border-fuchsia-700/50 bg-fuchsia-950/30'}`}>
+            <Fan size={20} className={noise ? 'text-red-400 animate-pulse' : 'text-fuchsia-400'} />
+          </div>
+          <div>
+            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-fuchsia-400">Локация корабля</div>
+            <h2 className="mt-0.5 text-lg font-heading text-white">Технические коридоры</h2>
+          </div>
+        </div>
+        <button
+          onClick={() => selectRoom(null)}
+          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
+          aria-label="Закрыть инспектор"
+        >
+          <X size={18} />
+        </button>
+      </div>
+
+      <div className="space-y-3 py-3">
+        <div className={`rounded-lg border p-3 ${noise ? 'border-red-500/50 bg-red-950/30' : 'border-slate-800 bg-slate-900/60'}`}>
+          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
+            {noise ? <Volume2 size={15} className="text-red-400" /> : <Activity size={15} className="text-emerald-400" />}
+            <span className={noise ? 'text-red-300' : 'text-emerald-300'}>
+              {noise ? 'Вентиляция: обнаружен шум' : 'Вентиляция: тихо'}
+            </span>
+          </div>
+          <p className="mt-2 text-xs leading-relaxed text-slate-400">
+            {noise
+              ? 'Маркер Шума в технических коридорах действует на все входы в вентиляцию. Повторный шум приводит к Контакту по правилам игры.'
+              : 'Поле технических коридоров свободно от маркера Шума. Персонажи не могут использовать вентиляцию обычным перемещением.'}
+          </p>
+        </div>
+
+        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
+          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
+            <MapPin size={14} /> Входы в вентиляцию
+          </div>
+          <div className="grid grid-cols-2 gap-2">
+            {TECH_ROOMS.map((node) => (
+              <button
+                key={node.id}
+                onClick={() => selectRoom(node.id)}
+                className="rounded-md border border-slate-800 bg-slate-950/70 px-2 py-2 text-left hover:border-fuchsia-700/60 hover:bg-fuchsia-950/20"
+              >
+                <div className="text-[11px] font-bold text-slate-200">{displayRoomName(view, node.id)}</div>
+                <div className="mt-0.5 text-[9px] font-mono text-fuchsia-400">ВЫХОД {node.techNumbers.join(' / ')}</div>
+              </button>
+            ))}
+          </div>
+        </div>
+
+        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
+          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Правила зоны</div>
+          <ul className="space-y-1.5 text-[11px] leading-relaxed text-slate-400">
+            <li>• Дверей в технических коридорах нет.</li>
+            <li>• Персонажи не могут входить сюда обычным движением.</li>
+            <li>• Чужой, вошедший в вентиляцию, сбрасывает все Раны и возвращает жетон в Пул.</li>
+            <li>• Маркер Шума сохраняется, когда Чужой скрывается в вентиляции.</li>
+          </ul>
+        </div>
+
+        <div className="rounded-lg border border-cyan-900/40 bg-cyan-950/10 p-3">
+          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-cyan-400">Классовые возможности</div>
+          <p className="text-[11px] leading-relaxed text-slate-500">
+            Действие Механика «Технические коридоры» и предмет «Планы Технических коридоров» будут подключены к этому узлу отдельными игровыми действиями. Сейчас панель отображает доступность зоны, не добавляя несуществующих действий.
+          </p>
+        </div>
+      </div>
+
+      <button
+        onClick={selectTechnicalCorridor}
+        className="w-full rounded-lg border border-fuchsia-800/60 bg-fuchsia-950/30 px-3 py-2 text-xs font-bold uppercase tracking-wider text-fuchsia-200 hover:bg-fuchsia-900/30"
+      >
+        Зафиксировать инспектор вентиляции
+      </button>
+    </aside>
+  );
+};
diff --git a/packages/client/src/components/log/gameLogModel.technical.test.ts b/packages/client/src/components/log/gameLogModel.technical.test.ts
new file mode 100644
index 0000000..abb73ed
--- /dev/null
+++ b/packages/client/src/components/log/gameLogModel.technical.test.ts
@@ -0,0 +1,32 @@
+import { describe, expect, it } from 'vitest';
+import { createInitialGameState, filterStateForPlayer, type GameLogEntry } from '@nemesis/shared';
+import { formatGameLog } from './gameLogModel';
+
+describe('gameLogModel: технические коридоры', () => {
+  it('форматирует уход Чужого в вентиляцию как отдельное событие', () => {
+    const state = createInitialGameState('technical-log');
+    const view = filterStateForPlayer(state, 'player-1');
+    const entry: GameLogEntry = {
+      id: 'log-1',
+      sequence: 100,
+      event: {
+        type: 'INTRUDER_RETREATED',
+        intruderId: 'intruder-1',
+        intruderType: 'ADULT',
+        fromRoomId: 15,
+        toRoomId: null,
+        corridorId: null,
+        direction: 4,
+        outcome: 'TECHNICAL_CORRIDOR',
+        eventCardId: 'EVENT_HUNT_2',
+      },
+    };
+    view.gameLog.push(entry);
+
+    const text = formatGameLog(view).at(-1)!.segments.map((segment) => segment.text).join('');
+
+    expect(text).toContain('Взрослая особь');
+    expect(text).toContain('скрылся в Технических коридорах');
+    expect(text).toContain('коридор 4');
+  });
+});
diff --git a/packages/client/src/components/log/gameLogModel.ts b/packages/client/src/components/log/gameLogModel.ts
index 4bf56f3..b0c800c 100644
--- a/packages/client/src/components/log/gameLogModel.ts
+++ b/packages/client/src/components/log/gameLogModel.ts
@@ -97,6 +97,17 @@ function corridorLabel(corridorId: string): string {
   return corridorId.replace('-', '–');
 }
 
+function intruderTypeLabel(type: Extract<GameLogEvent, { type: 'INTRUDER_RETREATED' }>['intruderType']): string {
+  const labels: Record<typeof type, string> = {
+    LARVA: 'Личинка',
+    CREEPER: 'Крипер',
+    ADULT: 'Взрослая особь',
+    BREEDER: 'Трутень',
+    QUEEN: 'Королева',
+  };
+  return labels[type];
+}
+
 function noiseLabel(result: Extract<GameLogEvent, { type: 'NOISE_ROLLED' }>['result']): GameLogSegment {
   if (result.kind === 'CORRIDOR') {
     return { text: `Коридор ${result.number}`, tone: 'corridor', strong: true };
@@ -303,10 +314,52 @@ function formatEntry(entry: GameLogEntry, view: SanitizedGameState): GameLogSegm
               ? ': корабль взорвался.'
               : event.reason === 'HULL_BREACH'
                 ? ': произошёл разрыв обшивки.'
-                : ': на корабле не осталось активных персонажей.',
+                : event.reason === 'HYPERSPACE_JUMP'
+                  ? ': корабль совершил гиперпрыжок.'
+                  : ': на корабле не осталось активных персонажей.',
         },
       ];
 
+    case 'EVENT_PHASE_STARTED':
+      return [
+        { text: 'Фаза Событий', tone: 'system', strong: true },
+        { text: ` началась — раунд ${event.round}.` },
+      ];
+
+    case 'EVENT_PHASE_COUNTERS_RESOLVED':
+      return [
+        { text: 'Счётчик Времени', tone: 'warning', strong: true },
+        { text: ` сдвинут на ${event.timeTrackPosition}` },
+        ...(event.selfDestructTrackPosition !== null
+          ? [{ text: `; Самоуничтожение: ${event.selfDestructTrackPosition}` }]
+          : []),
+        { text: '.' },
+      ];
+
+    case 'SELF_DESTRUCT_ADVANCED':
+      return [
+        { text: 'Самоуничтожение', tone: 'error', strong: true },
+        { text: ` перешло на деление ${event.position}.` },
+      ];
+
+    case 'FIRE_DAMAGE_TAKEN_BY_INTRUDER':
+      return [
+        { text: intruderTypeLabel(event.intruderType), tone: 'warning', strong: true },
+        { text: ` получает 1 Рану от Пожара в ${roomLabel(view, event.roomId)}.` },
+      ];
+
+    case 'FIRE_DESTROYED_EGG':
+      return [
+        { text: 'Пожар', tone: 'error', strong: true },
+        { text: ` уничтожил Яйцо в ${roomLabel(view, event.roomId)}.` },
+      ];
+
+    case 'EVENT_PHASE_COMPLETED':
+      return [
+        { text: 'Фаза Событий', tone: 'system', strong: true },
+        { text: ` раунда ${event.round} завершена.` },
+      ];
+
     case 'PLAYER_PASSED':
       return [
         { text: playerName(view, event.playerId), tone: 'player', strong: true },
@@ -340,6 +393,34 @@ function formatEntry(entry: GameLogEntry, view: SanitizedGameState): GameLogSegm
         { text: ` в ${roomLabel(view, event.roomId)}.` },
       ];
     }
+    case 'INTRUDER_RETREATED': {
+      const typeName = intruderTypeLabel(event.intruderType);
+      if (event.outcome === 'TECHNICAL_CORRIDOR') {
+        return [
+          { text: typeName, tone: 'warning', strong: true },
+          { text: ' скрылся в Технических коридорах', tone: 'corridor' },
+          { text: ` (коридор ${event.direction ?? '—'})`, tone: 'corridor' },
+        ];
+      }
+      if (event.outcome === 'DOOR_DESTROYED') {
+        return [
+          { text: typeName, tone: 'warning', strong: true },
+          { text: ` отступил по коридору ${event.direction ?? '—'}, Дверь разрушена`, tone: 'door' },
+        ];
+      }
+      if (event.outcome === 'MOVED') {
+        return [
+          { text: typeName, tone: 'warning', strong: true },
+          { text: ` отступил по коридору ${event.direction ?? '—'} в `, tone: 'corridor' },
+          { text: roomLabel(view, event.toRoomId!), tone: 'room', strong: true },
+        ];
+      }
+      return [
+        { text: typeName, tone: 'warning', strong: true },
+        { text: ` не нашёл выхода №${event.direction ?? '—'} и остался в `, tone: 'corridor' },
+        { text: roomLabel(view, event.fromRoomId), tone: 'room', strong: true },
+      ];
+    }
     case 'DEV_STATE_CHANGED':
       return [
         { text: 'Dev-переключатель', tone: 'warning', strong: true },
diff --git a/packages/client/src/components/log/intruderLogModel.ts b/packages/client/src/components/log/intruderLogModel.ts
index 695dd18..4436e43 100644
--- a/packages/client/src/components/log/intruderLogModel.ts
+++ b/packages/client/src/components/log/intruderLogModel.ts
@@ -23,7 +23,7 @@ const NAMES_ACCUSATIVE: Record<IntruderToken['type'], string> = {
 
 export function formatIntruderLogEvent(event: IntruderLogEvent, view: SanitizedGameState): GameLogSegment[] {
   const name = 'playerId' in event ? (view.players[event.playerId]?.name ?? event.playerId) : '';
-  let text: string;
+  let text = '';
   switch (event.type) {
     case 'CONTACT_OCCURRED':
       text = `${name}: Контакт в отсеке #${event.roomId} — ${NAMES[event.tokenType]}. `;
@@ -47,11 +47,14 @@ export function formatIntruderLogEvent(event: IntruderLogEvent, view: SanitizedG
       text = `${name} выбрал Цель. Содержание выбранной и удалённой карт скрыто.`;
       break;
     case 'SURPRISE_ATTACK_RESOLVED':
-    case 'ESCAPE_ATTACK_RESOLVED': {
+    case 'ESCAPE_ATTACK_RESOLVED':
+    case 'EVENT_PHASE_ATTACK_RESOLVED': {
       text =
         event.type === 'ESCAPE_ATTACK_RESOLVED'
           ? `Побег: ${NAMES[event.intruderType]} атакует ${name} в спину — `
-          : `${NAMES[event.intruderType]} атакует ${name}: `;
+          : event.type === 'EVENT_PHASE_ATTACK_RESOLVED'
+            ? `Фаза Событий: ${NAMES[event.intruderType]} атакует ${name} — `
+            : `${NAMES[event.intruderType]} атакует ${name}: `;
       text +=
         event.outcome === 'MISS'
           ? `«${event.card?.name}» — промах, нет символа атакующего.`
@@ -101,6 +104,36 @@ export function formatIntruderLogEvent(event: IntruderLogEvent, view: SanitizedG
     case 'INTRUDERS_MOVED':
       text = `Опасность: ${event.intruderIds.length} Чужих перемещаются из отсека #${event.fromRoomId} в #${event.toRoomId}, без Контакта.`;
       break;
+    case 'INTRUDER_MOVED':
+      text =
+        event.outcome === 'TECHNICAL_CORRIDOR'
+          ? `Фаза Событий: ${NAMES[event.intruderType]} уходит из отсека #${event.fromRoomId} в Технические Коридоры через выход ${event.corridorNumber}. Контакт не разыгрывается.`
+          : `Фаза Событий: ${NAMES[event.intruderType]} перемещается из отсека #${event.fromRoomId} в #${event.toRoomId}, Коридор ${event.corridorNumber}. Контакт не разыгрывается.`;
+      break;
+    case 'EVENT_INTRUDER_EFFECT_MOVED':
+      text = `Эффект События: ${NAMES[event.intruderType]} перемещён из #${event.fromRoomId} в #${event.toRoomId}.`;
+      break;
+    case 'EVENT_EFFECT_RESOLVED':
+      text = `Фаза Событий: разрешён эффект карты ${event.eventCardId} (${event.effect}).`;
+      break;
+    case 'HIVE_DEVELOPMENT_RESOLVED':
+      text = `Развитие Улья: вытянут жетон ${NAMES[event.tokenType]}. `;
+      switch (event.outcome) {
+        case 'REMOVED_AND_ADULT_ADDED': text += 'Личинка удалена из Пула; Взрослая особь добавлена в мешок.'; break;
+        case 'REMOVED_ADULT_UNAVAILABLE': text += 'Личинка удалена из Пула; доступной Взрослой особи для замены нет.'; break;
+        case 'REMOVED_AND_BREEDER_ADDED': text += 'Крипер удалён из Пула; Трутень добавлен в мешок.'; break;
+        case 'REMOVED_BREEDER_UNAVAILABLE': text += 'Крипер удалён из Пула; доступного Трутня для замены нет.'; break;
+        case 'NOISE_FOR_NON_COMBAT_PLAYERS': text += `Бросок Шума назначен ${event.playerIds?.length ?? 0} персонажам вне Боя.`; break;
+        case 'QUEEN_CONTACT': text += 'Королева выставлена в Улье; Контакт поставлен в очередь.'; break;
+        case 'EGG_ADDED': text += 'На Планшет Чужих добавлено Яйцо.'; break;
+        case 'EGG_LIMIT_REACHED': text += 'Лимит 8 Яиц достигнут; дополнительных Яиц нет.'; break;
+        case 'BLANK_RETURNED_AND_ADULT_ADDED': text += 'Пустой жетон возвращён в мешок; Взрослая особь добавлена из запаса.'; break;
+        case 'BLANK_RETURNED_ADULT_UNAVAILABLE': text += 'Пустой жетон возвращён в мешок; доступной Взрослой особи нет.'; break;
+      }
+      break;
+    case 'HIVE_DEVELOPMENT_QUEEN_PLACED':
+      text = `Развитие Улья: Королева выставлена в отсеке #${event.roomId}; Контакт поставлен в очередь.`;
+      break;
     case 'INTRUDERS_BLOCKED_BY_DOOR':
       text = `Опасность: Чужие разрушили Дверь в Коридоре ${event.corridorId} и остались на месте.`;
       break;
diff --git a/packages/client/src/components/modals/EventPhaseModal.tsx b/packages/client/src/components/modals/EventPhaseModal.tsx
new file mode 100644
index 0000000..570ac07
--- /dev/null
+++ b/packages/client/src/components/modals/EventPhaseModal.tsx
@@ -0,0 +1,128 @@
+import React from 'react';
+import type { SanitizedGameState } from '@nemesis/shared';
+import { Activity, Flame, Skull, Timer, Wind, X, Radio, Check, LoaderCircle } from 'lucide-react';
+
+interface EventPhaseModalProps {
+  view: SanitizedGameState;
+  onClose: () => void;
+}
+
+const STEPS = [
+  ['COUNTERS', 'Сдвиг времени и реактора', Timer],
+  ['INTRUDER_ATTACKS', 'Атаки Чужих', Skull],
+  ['FIRE_DAMAGE', 'Урон от огня', Flame],
+  ['INTRUDER_MOVEMENT', 'Движение Чужих', Activity],
+  ['EVENT_EFFECT', 'Эффект карты События', Wind],
+  ['HIVE_DEVELOPMENT', 'Развитие Улья', Radio],
+] as const;
+
+type StepKey = (typeof STEPS)[number][0];
+
+function resolveStep(entry: SanitizedGameState['gameLog'][number]): StepKey | null {
+  switch (entry.event.type) {
+    case 'EVENT_PHASE_COUNTERS_RESOLVED':
+    case 'SELF_DESTRUCT_ADVANCED': return 'COUNTERS';
+    case 'EVENT_PHASE_ATTACK_RESOLVED': return 'INTRUDER_ATTACKS';
+    case 'FIRE_DAMAGE_TAKEN_BY_INTRUDER':
+    case 'FIRE_DESTROYED_EGG': return 'FIRE_DAMAGE';
+    case 'INTRUDER_MOVED':
+    case 'INTRUDERS_MOVED':
+    case 'INTRUDERS_BLOCKED_BY_DOOR': return 'INTRUDER_MOVEMENT';
+    case 'EVENT_EFFECT_RESOLVED': return 'EVENT_EFFECT';
+    case 'HIVE_DEVELOPMENT_RESOLVED':
+    case 'HIVE_DEVELOPMENT_QUEEN_PLACED': return 'HIVE_DEVELOPMENT';
+    default: return null;
+  }
+}
+
+export const EventPhaseModal: React.FC<EventPhaseModalProps> = ({ view, onClose }) => {
+  const started = [...view.gameLog].reverse().find((entry) => entry.event.type === 'EVENT_PHASE_STARTED');
+  const completed = started
+    ? [...view.gameLog].reverse().find((entry) => entry.event.type === 'EVENT_PHASE_COMPLETED' && entry.sequence >= started.sequence)
+    : undefined;
+  const relevant = started
+    ? view.gameLog.filter((entry) => entry.sequence >= started.sequence && (!completed || entry.sequence <= completed.sequence))
+    : [];
+
+  const done = new Set<StepKey>();
+  let latestSequence = started?.sequence ?? 0;
+  for (const entry of relevant) {
+    const step = resolveStep(entry);
+    if (!step) continue;
+    done.add(step);
+    latestSequence = Math.max(latestSequence, entry.sequence);
+  }
+
+  const firstPendingIndex = STEPS.findIndex(([key]) => !done.has(key));
+  const activeIndex = completed ? STEPS.length - 1 : Math.max(0, firstPendingIndex === -1 ? STEPS.length - 1 : firstPendingIndex);
+  const active = STEPS[activeIndex][0];
+  const progress = completed ? 100 : Math.round(((activeIndex + (done.has(active) ? 1 : 0)) / STEPS.length) * 100);
+
+  const effectEntry = [...view.gameLog].reverse().find((entry) => entry.event.type === 'EVENT_EFFECT_RESOLVED' && (!started || entry.sequence >= started.sequence));
+  const eventCardId = view.meta.eventPhaseCardId ?? (effectEntry?.event.type === 'EVENT_EFFECT_RESOLVED' ? effectEntry.event.eventCardId : null);
+  const card = eventCardId ? view.decks.events.discard.find((candidate) => candidate.id === eventCardId) : undefined;
+
+  return (
+    <div className="event-phase-backdrop fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-8" role="dialog" aria-label="Фаза Событий">
+      <div className="event-phase-shell w-full max-w-4xl overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-950/96">
+        <div className="event-phase-header border-b border-slate-800 px-5 py-5 sm:px-7">
+          <div className="relative z-10 flex items-start justify-between gap-4">
+            <div>
+              <div className="flex items-center gap-2 text-[10px] font-mono tracking-[0.3em] text-cyan-400">
+                <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(66,232,255,.9)]" />
+                NEMESIS / EVENT CONTROL
+              </div>
+              <h2 className="event-phase-title-glow mt-2 text-3xl font-heading tracking-widest text-white sm:text-4xl">
+                ФАЗА СОБЫТИЙ: РАУНД {started?.event.type === 'EVENT_PHASE_STARTED' ? started.event.round : view.meta.currentRound}
+              </h2>
+              <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.22em] text-slate-500">
+                Последовательность {latestSequence} • {completed ? 'Стабилизация завершена' : 'Система исполняет протокол'}
+              </div>
+            </div>
+            <button onClick={onClose} className="relative z-20 rounded-lg border border-slate-800 p-2 text-slate-400 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white" aria-label="Закрыть">
+              <X size={18} />
+            </button>
+          </div>
+          <div className="event-phase-progress mt-5" aria-label={`Прогресс Фазы Событий: ${progress}%`}><span style={{ width: `${progress}%` }} /></div>
+        </div>
+
+        <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-7 lg:grid-cols-3">
+          {STEPS.map(([key, label, Icon], index) => {
+            const isDone = done.has(key);
+            const isActive = key === active && !completed;
+            const state = isActive ? 'active' : isDone ? 'done' : 'waiting';
+            return (
+              <div key={key} className="event-step-card rounded-xl border border-slate-800 bg-slate-900/45 p-4" data-state={state}>
+                <div className="flex items-center gap-3">
+                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${isActive ? 'border-cyan-400/70 bg-cyan-400/10 text-cyan-200' : isDone ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-300' : 'border-slate-700 text-slate-600'}`}>
+                    {isDone ? <Check size={17} /> : isActive ? <LoaderCircle size={17} className="animate-spin" /> : <Icon size={17} />}
+                  </div>
+                  <div className="min-w-0 flex-1">
+                    <div className="text-[9px] font-mono tracking-[0.18em] text-slate-500">ШАГ {index + 1}</div>
+                    <div className="mt-0.5 text-sm font-semibold text-slate-100">{label}</div>
+                  </div>
+                  <span className={`text-[9px] font-mono ${isActive ? 'text-cyan-300' : isDone ? 'text-emerald-400' : 'text-slate-600'}`}>
+                    {isActive ? 'LIVE' : isDone ? 'OK' : 'WAIT'}
+                  </span>
+                </div>
+              </div>
+            );
+          })}
+        </div>
+
+        <div className="border-t border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900/70 to-slate-950 px-5 py-5 sm:px-7">
+          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
+            <div className="min-w-0">
+              <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-slate-500">Карта События</div>
+              <div className="mt-1 truncate text-xl font-heading tracking-wide text-white">{card?.name ?? 'Разрешение карты'}</div>
+            </div>
+            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
+              <Activity size={13} className="text-cyan-500" />
+              Каскадные эффекты проходят через стек прерываний
+            </div>
+          </div>
+        </div>
+      </div>
+    </div>
+  );
+};
diff --git a/packages/client/src/index.css b/packages/client/src/index.css
index 9bb8950..fb85015 100644
--- a/packages/client/src/index.css
+++ b/packages/client/src/index.css
@@ -20,3 +20,217 @@ body {
   overscroll-behavior-y: none;
   touch-action: manipulation;
 }
+
+/* Шаг 9: единый motion contract для карты. SVG-анимации остаются функциональными,
+   но при системном reduced-motion не создают физического перемещения. */
+@media (prefers-reduced-motion: reduce) {
+  *,
+  *::before,
+  *::after {
+    animation-duration: 0.01ms !important;
+    animation-iteration-count: 1 !important;
+    scroll-behavior: auto !important;
+    transition-duration: 0.01ms !important;
+  }
+}
+
+
+/* v0.5.0 cinematic polish -------------------------------------------------- */
+:root {
+  --cinema-cyan: #42e8ff;
+  --cinema-amber: #ffb347;
+  --cinema-red: #ff4d5a;
+  --cinema-purple: #bd72ff;
+  --cinema-bg: #03060b;
+}
+
+* {
+  scrollbar-color: #263449 #080d16;
+  scrollbar-width: thin;
+}
+
+::selection {
+  background: rgba(66, 232, 255, 0.22);
+  color: #fff;
+}
+
+button,
+[role='button'] {
+  -webkit-user-select: none;
+  user-select: none;
+}
+
+.board-vignette,
+.board-scanlines,
+.board-noise,
+.board-impact {
+  position: absolute;
+  inset: 0;
+  pointer-events: none;
+}
+
+.board-vignette {
+  z-index: 2;
+  background:
+    radial-gradient(circle at 50% 48%, transparent 42%, rgba(0, 0, 0, 0.12) 68%, rgba(0, 0, 0, 0.72) 100%),
+    linear-gradient(180deg, rgba(0, 0, 0, 0.18), transparent 16%, transparent 84%, rgba(0, 0, 0, 0.3));
+  mix-blend-mode: multiply;
+}
+
+.board-scanlines {
+  z-index: 3;
+  opacity: 0.12;
+  background: repeating-linear-gradient(180deg, rgba(255,255,255,.06) 0, rgba(255,255,255,.06) 1px, transparent 1px, transparent 4px);
+  animation: board-scan 9s linear infinite;
+}
+
+.board-noise {
+  z-index: 4;
+  opacity: 0.055;
+  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.92' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.32'/%3E%3C/svg%3E");
+  mix-blend-mode: screen;
+  animation: board-noise 0.32s steps(2) infinite;
+}
+
+.board-impact {
+  z-index: 5;
+  opacity: 0;
+}
+
+.board-impact--combat {
+  background: radial-gradient(circle at center, rgba(255, 79, 74, 0.18), transparent 48%);
+  animation: board-impact-combat .56s ease-out;
+}
+
+.board-impact--fire {
+  background: radial-gradient(circle at 50% 58%, rgba(255, 145, 45, 0.25), transparent 52%);
+  animation: board-impact-fire .56s ease-out;
+}
+
+.board-impact--alert {
+  background: radial-gradient(circle at center, rgba(255, 63, 89, 0.20), transparent 46%);
+  animation: board-impact-alert .56s ease-out;
+}
+
+.board-impact--vent {
+  background: radial-gradient(circle at 18% 84%, rgba(189, 114, 255, 0.18), transparent 44%);
+  animation: board-impact-vent .56s ease-out;
+}
+
+.board-corner-marker {
+  position: absolute;
+  z-index: 6;
+  width: 28px;
+  height: 28px;
+  opacity: .34;
+}
+
+.board-corner-marker::before,
+.board-corner-marker::after {
+  content: '';
+  position: absolute;
+  background: var(--cinema-cyan);
+  box-shadow: 0 0 10px rgba(66,232,255,.55);
+}
+
+.board-corner-marker::before { width: 28px; height: 1px; }
+.board-corner-marker::after { width: 1px; height: 28px; }
+.board-corner-marker--tl { top: 18px; left: 18px; }
+.board-corner-marker--br { right: 18px; bottom: 18px; transform: rotate(180deg); }
+
+.event-phase-backdrop {
+  background:
+    radial-gradient(circle at 50% 35%, rgba(31, 101, 130, .20), transparent 34%),
+    radial-gradient(circle at 50% 100%, rgba(112, 46, 125, .12), transparent 42%),
+    rgba(0, 2, 6, .84);
+  animation: event-backdrop-in .38s ease-out both;
+}
+
+.event-phase-shell {
+  animation: event-shell-in .48s cubic-bezier(.16,1,.3,1) both;
+  box-shadow: 0 28px 80px rgba(0,0,0,.62), 0 0 80px rgba(66,232,255,.08), inset 0 1px 0 rgba(255,255,255,.04);
+}
+
+.event-phase-header {
+  position: relative;
+  overflow: hidden;
+}
+
+.event-phase-header::after {
+  content: '';
+  position: absolute;
+  inset: 0;
+  background: linear-gradient(100deg, transparent 15%, rgba(66,232,255,.13) 50%, transparent 85%);
+  transform: translateX(-110%);
+  animation: event-sweep 2.8s ease-in-out infinite;
+}
+
+.event-phase-title-glow {
+  text-shadow: 0 0 20px rgba(66,232,255,.22);
+}
+
+.event-step-card {
+  position: relative;
+  overflow: hidden;
+  transition: transform .32s ease, border-color .32s ease, background .32s ease, box-shadow .32s ease;
+}
+
+.event-step-card::after {
+  content: '';
+  position: absolute;
+  left: 0;
+  bottom: 0;
+  width: 100%;
+  height: 1px;
+  transform: scaleX(0);
+  transform-origin: left;
+  background: linear-gradient(90deg, transparent, var(--cinema-cyan), transparent);
+  transition: transform .45s ease;
+}
+
+.event-step-card[data-state='active'] {
+  transform: translateY(-2px);
+  border-color: rgba(66,232,255,.58);
+  background: linear-gradient(135deg, rgba(10,38,52,.82), rgba(7,15,26,.78));
+  box-shadow: 0 0 26px rgba(66,232,255,.09), inset 0 1px 0 rgba(255,255,255,.04);
+}
+
+.event-step-card[data-state='active']::after { transform: scaleX(1); }
+.event-step-card[data-state='done'] { box-shadow: inset 0 0 24px rgba(52,211,153,.035); }
+
+.event-phase-progress {
+  position: relative;
+  height: 2px;
+  overflow: hidden;
+  background: #101a28;
+}
+
+.event-phase-progress > span {
+  display: block;
+  height: 100%;
+  background: linear-gradient(90deg, #24c7dd, #8b5cf6, #ff6b4a);
+  box-shadow: 0 0 12px rgba(66,232,255,.65);
+  transition: width .55s cubic-bezier(.16,1,.3,1);
+}
+
+@keyframes board-scan { to { background-position: 0 80px; } }
+@keyframes board-noise { 0%,100% { transform: translate(0,0); } 25% { transform: translate(1%, -1%); } 50% { transform: translate(-1%, 1%); } 75% { transform: translate(1%, 1%); } }
+@keyframes board-impact-combat { 0% { opacity:0; } 16% { opacity:1; } 100% { opacity:0; } }
+@keyframes board-impact-fire { 0% { opacity:0; } 18% { opacity:1; } 45% { opacity:.42; } 100% { opacity:0; } }
+@keyframes board-impact-alert { 0% { opacity:0; } 12% { opacity:1; } 30% { opacity:.2; } 48% { opacity:.8; } 100% { opacity:0; } }
+@keyframes board-impact-vent { 0% { opacity:0; transform:scale(.96); } 30% { opacity:.8; } 100% { opacity:0; transform:scale(1.04); } }
+@keyframes event-backdrop-in { from { opacity:0; } to { opacity:1; } }
+@keyframes event-shell-in { from { opacity:0; transform:translateY(18px) scale(.985); } to { opacity:1; transform:translateY(0) scale(1); } }
+@keyframes event-sweep { 0%, 22% { transform:translateX(-110%); } 58%,100% { transform:translateX(110%); } }
+
+@media (prefers-reduced-motion: reduce) {
+  .board-scanlines,
+  .board-noise,
+  .event-phase-backdrop,
+  .event-phase-shell,
+  .event-phase-header::after {
+    animation: none !important;
+  }
+  .event-step-card { transition-duration: .01ms !important; }
+  .board-impact { animation-duration: .12s !important; }
+}
diff --git a/packages/client/src/store/gameStore.ts b/packages/client/src/store/gameStore.ts
index 0fa3604..4c71f81 100644
--- a/packages/client/src/store/gameStore.ts
+++ b/packages/client/src/store/gameStore.ts
@@ -17,6 +17,8 @@ export interface GameStoreState {
   view: SanitizedGameState | null;
   /** Выбор в интерфейсе: не часть партии и не сохраняется. */
   selectedRoomId: RoomId | null;
+  /** Выбрана специальная локация Технических коридоров; это UI-state, не часть партии. */
+  selectedTechnicalCorridor: boolean;
   /** Причина последнего отказа движка: показывается игроку и сбрасывается успешным действием. */
   rejection: string | null;
 
@@ -39,6 +41,7 @@ export interface GameStoreState {
 
   dispatch: (action: EngineAction) => void;
   selectRoom: (roomId: RoomId | null) => void;
+  selectTechnicalCorridor: () => void;
   startNewGame: (seed?: string, options?: { chosenCharacterClass?: CharacterClass }) => void;
 }
 
@@ -59,6 +62,7 @@ export function createGameStore(createTransport: TransportFactory) {
   const store = create<GameStoreState>()((set, get) => ({
     view: null,
     selectedRoomId: null,
+    selectedTechnicalCorridor: false,
     rejection: null,
     shootModalOpen: false,
     meleeModalOpen: false,
@@ -148,7 +152,11 @@ export function createGameStore(createTransport: TransportFactory) {
     },
 
     selectRoom: (roomId) => {
-      set({ selectedRoomId: roomId });
+      set({ selectedRoomId: roomId, selectedTechnicalCorridor: false });
+    },
+
+    selectTechnicalCorridor: () => {
+      set({ selectedRoomId: null, selectedTechnicalCorridor: true });
     },
 
     startNewGame: (seed, options) => {
@@ -158,6 +166,7 @@ export function createGameStore(createTransport: TransportFactory) {
         transport.startNewGame(seed, options);
         set({
           selectedRoomId: defaultRoomId(store.getState().view),
+          selectedTechnicalCorridor: false,
           rejection: null,
           shootModalOpen: false,
           meleeModalOpen: false,
@@ -176,6 +185,7 @@ export function createGameStore(createTransport: TransportFactory) {
       set({
         view: null,
         selectedRoomId: null,
+        selectedTechnicalCorridor: false,
         rejection: null,
         shootModalOpen: false,
         meleeModalOpen: false,
diff --git a/packages/shared/package.json b/packages/shared/package.json
index 37cbf1b..d428202 100644
--- a/packages/shared/package.json
+++ b/packages/shared/package.json
@@ -1,6 +1,6 @@
 {
   "name": "@nemesis/shared",
-  "version": "0.4.0",
+  "version": "0.5.0",
   "private": true,
   "type": "module",
   "description": "Изоморфное ядро правил Nemesis Digital: типы, данные и логика без зависимостей от DOM/Node",
diff --git a/packages/shared/src/data/cardsSetup.ts b/packages/shared/src/data/cardsSetup.ts
index 54d989b..f77c85e 100644
--- a/packages/shared/src/data/cardsSetup.ts
+++ b/packages/shared/src/data/cardsSetup.ts
@@ -2,6 +2,7 @@ import type { ActionCard, CardPile, GameDecksState } from '../types/cards.js';
 import type { CharacterClass } from '../types/entities.js';
 import { ACTION_CARDS_BY_CHARACTER } from '../data/actionCards.js';
 import { CONTAMINATION_CARDS } from '../data/contaminationCards.js';
+import { EVENT_CARDS } from '../data/eventCards.js';
 import { CRAFTED_ITEM_CARDS } from '../data/crafting.js';
 import { GREEN_ITEM_CARDS, RED_ITEM_CARDS, YELLOW_ITEM_CARDS } from '../data/itemCards.js';
 import { INTRUDER_ATTACK_CARDS } from '../data/intruderAttacks.js';
@@ -47,7 +48,7 @@ export function createInitialDecks(seed: string, rng: Rng = createRng(seed, 'car
     craftedItems: { drawPile: [...CRAFTED_ITEM_CARDS], discard: [] },
     contamination: { drawPile: shuffle(rng, structuredClone(CONTAMINATION_CARDS)), discard: [] },
     seriousWounds: { drawPile: shuffle(rng, structuredClone(SERIOUS_WOUND_CARDS)), discard: [] },
-    events: { drawPile: [], discard: [] },
+    events: { drawPile: shuffle(rng, structuredClone(EVENT_CARDS)), discard: [] },
     intruderAttacks: { drawPile: shuffle(rng, structuredClone(INTRUDER_ATTACK_CARDS)), discard: [] },
     objectives: {
       personal: { drawPile: [], discard: [] },
diff --git a/packages/shared/src/data/eventCards.ts b/packages/shared/src/data/eventCards.ts
new file mode 100644
index 0000000..1abcbba
--- /dev/null
+++ b/packages/shared/src/data/eventCards.ts
@@ -0,0 +1,52 @@
+import type { EventCard, EventEffect } from '../types/cards.js';
+import type { IntruderType } from '../types/entities.js';
+
+const ALL_INTRUDER_TYPES: readonly IntruderType[] = ['LARVA', 'CREEPER', 'ADULT', 'BREEDER', 'QUEEN'];
+const HUNT_INTRUDERS: readonly IntruderType[] = ['ADULT', 'BREEDER', 'QUEEN'];
+const LARGE_INTRUDERS: readonly IntruderType[] = ['ADULT', 'BREEDER', 'QUEEN'];
+
+interface EventCardDefinition {
+  id: string;
+  name: string;
+  effect: EventEffect;
+  description: string;
+  corridorNumber: 1 | 2 | 3 | 4 | 'ANY' | null;
+  intruderTypes: readonly IntruderType[];
+  isDestroyedOnResolve?: boolean;
+  isReshuffledIntoDeck?: boolean;
+}
+
+function defineEventCard(definition: EventCardDefinition): EventCard {
+  return {
+    ...definition,
+    intruderTypes: [...definition.intruderTypes],
+    isDestroyedOnResolve: definition.isDestroyedOnResolve ?? false,
+    isReshuffledIntoDeck: definition.isReshuffledIntoDeck ?? false,
+  };
+}
+
+/** Базовая колода Событий: 20 физических карт. */
+export const EVENT_CARDS: readonly EventCard[] = [
+  defineEventCard({ id: 'EVENT_HUNT_2', name: 'Охота', effect: 'HUNT', description: 'Охота.', corridorNumber: 2, intruderTypes: HUNT_INTRUDERS }),
+  defineEventCard({ id: 'EVENT_HUNT_3', name: 'Охота', effect: 'HUNT', description: 'Охота.', corridorNumber: 3, intruderTypes: HUNT_INTRUDERS }),
+  defineEventCard({ id: 'EVENT_HIVE_PROTECTION', name: 'Защита кладки', effect: 'HIVE_PROTECTION', description: 'Защита кладки.', corridorNumber: 2, intruderTypes: ALL_INTRUDER_TYPES }),
+  defineEventCard({ id: 'EVENT_BROOD', name: 'Выводок', effect: 'BROOD', description: 'Выводок.', corridorNumber: 3, intruderTypes: ALL_INTRUDER_TYPES }),
+  defineEventCard({ id: 'EVENT_REGENERATION', name: 'Регенерация', effect: 'REGENERATION', description: 'Регенерация.', corridorNumber: 1, intruderTypes: ALL_INTRUDER_TYPES }),
+  defineEventCard({ id: 'EVENT_HIDDEN', name: 'Затаившиеся', effect: 'HIDDEN', description: 'Затаившиеся.', corridorNumber: 4, intruderTypes: ALL_INTRUDER_TYPES }),
+  defineEventCard({ id: 'EVENT_MATURATION', name: 'Созревание', effect: 'MATURATION', description: 'Созревание.', corridorNumber: 1, intruderTypes: ALL_INTRUDER_TYPES }),
+  defineEventCard({ id: 'EVENT_RAMPAGE', name: 'Разгром', effect: 'RAMPAGE', description: 'Разгром.', corridorNumber: 2, intruderTypes: ALL_INTRUDER_TYPES }),
+  defineEventCard({ id: 'EVENT_PREY_SCENT', name: 'Запах добычи', effect: 'PREY_SCENT', description: 'Запах добычи.', corridorNumber: 3, intruderTypes: ALL_INTRUDER_TYPES }),
+  defineEventCard({ id: 'EVENT_TECHNICAL_CORRIDORS_NOISE', name: 'Шум в тех. коридорах', effect: 'TECHNICAL_CORRIDORS_NOISE', description: 'Шум в тех. коридорах.', corridorNumber: 4, intruderTypes: ALL_INTRUDER_TYPES }),
+  defineEventCard({ id: 'EVENT_HIVE', name: 'Улей', effect: 'HIVE', description: 'Улей.', corridorNumber: 3, intruderTypes: ALL_INTRUDER_TYPES }),
+  defineEventCard({ id: 'EVENT_FLAMMABLE_SOLUTION', name: 'Воспламеняемый раствор', effect: 'FLAMMABLE_SOLUTION', description: 'Воспламеняемый раствор.', corridorNumber: 4, intruderTypes: LARGE_INTRUDERS }),
+  defineEventCard({ id: 'EVENT_CONSUMING_FIRE', name: 'Пожирающее пламя', effect: 'CONSUMING_FIRE', description: 'Пожирающее пламя.', corridorNumber: 4, intruderTypes: LARGE_INTRUDERS }),
+  defineEventCard({ id: 'EVENT_DESTRUCTIVE_FIRE', name: 'Разрушающее пламя', effect: 'DESTRUCTIVE_FIRE', description: 'Разрушающее пламя.', corridorNumber: 1, intruderTypes: LARGE_INTRUDERS }),
+  defineEventCard({ id: 'EVENT_EJECT_ESCAPE_POD', name: 'Катапультирование капсулы', effect: 'EJECT_ESCAPE_POD', description: 'Катапультирование капсулы.', corridorNumber: 3, intruderTypes: LARGE_INTRUDERS, isDestroyedOnResolve: true }),
+  defineEventCard({ id: 'EVENT_SHORT_CIRCUIT', name: 'Короткое замыкание', effect: 'SHORT_CIRCUIT', description: 'Короткое замыкание.', corridorNumber: 4, intruderTypes: LARGE_INTRUDERS, isDestroyedOnResolve: true }),
+  defineEventCard({ id: 'EVENT_COOLANT_LEAK', name: 'Утечка охладителя', effect: 'COOLANT_LEAK', description: 'Утечка охладителя.', corridorNumber: 1, intruderTypes: LARGE_INTRUDERS, isDestroyedOnResolve: true }),
+  defineEventCard({ id: 'EVENT_LIFE_SUPPORT_MALFUNCTION', name: 'Неполадка систем жизнеобеспечения', effect: 'LIFE_SUPPORT_MALFUNCTION', description: 'Неполадка систем жизнеобеспечения.', corridorNumber: 2, intruderTypes: LARGE_INTRUDERS, isDestroyedOnResolve: true }),
+  defineEventCard({ id: 'EVENT_MALFUNCTION', name: 'Неисправность', effect: 'MALFUNCTION', description: 'Неисправность.', corridorNumber: 2, intruderTypes: LARGE_INTRUDERS, isReshuffledIntoDeck: true }),
+  defineEventCard({ id: 'EVENT_OPEN_SECTIONS', name: 'Открытие отсеков', effect: 'OPEN_SECTIONS', description: 'Открытие отсеков.', corridorNumber: 1, intruderTypes: ALL_INTRUDER_TYPES }),
+];
+
+export const EVENT_CARD_COUNT = 20;
diff --git a/packages/shared/src/index.ts b/packages/shared/src/index.ts
index 17c59cf..871e89c 100644
--- a/packages/shared/src/index.ts
+++ b/packages/shared/src/index.ts
@@ -38,3 +38,11 @@ export * from './data/intruderPool.js';
 export * from './data/intruderMiniatures.js';
 export * from './data/setup.js';
 export * from './utils/rng.js';
+
+export * from './data/eventCards.js';
+export * from './logic/intruderRetreat.js';
+
+export * from './logic/eventsPhase.js';
+
+export * from './logic/eventEffects.js';
+export * from './logic/hiveDevelopment.js';
diff --git a/packages/shared/src/logic/engineErrors.ts b/packages/shared/src/logic/engineErrors.ts
index 4a19ebc..ad2b1bd 100644
--- a/packages/shared/src/logic/engineErrors.ts
+++ b/packages/shared/src/logic/engineErrors.ts
@@ -59,11 +59,13 @@ export type EngineErrorCode =
   | 'WEAPON_NOT_AVAILABLE'
   /** На выбранном Оружии не осталось Боезапаса (стр. 19). */
   | 'WEAPON_NO_AMMO'
-  /**
-   * Для направления Отступления нужна карта События (стр. 20); колода Событий
-   * и её сброс пусты — Фаза Событий не реализована (этап 0.5.0).
-   */
-  | 'EMPTY_EVENT_DECK';
+  /** Устаревший код совместимости: Шаг 2 разрешает Отступление через колоду Событий. */
+  | 'EMPTY_EVENT_DECK'
+  /** Нарушен инвариант: жетон отступившей миниатюры не найден в запасе. */
+  | 'INTRUDER_TOKEN_NOT_IN_SUPPLY'
+  | 'EVENT_PHASE_CARD_MISSING'
+  | 'EVENT_PHASE_CARD_NOT_SELECTED'
+  | 'EVENT_EFFECT_NOT_IMPLEMENTED';
 
 export class EngineError extends Error {
   readonly code: EngineErrorCode;
diff --git a/packages/shared/src/logic/eventEffects.test.ts b/packages/shared/src/logic/eventEffects.test.ts
new file mode 100644
index 0000000..3b5329a
--- /dev/null
+++ b/packages/shared/src/logic/eventEffects.test.ts
@@ -0,0 +1,109 @@
+import { describe, expect, it } from 'vitest';
+import { createInitialGameState } from './setup.js';
+import { resolveEventCardEffect, finalizeEventCard } from './eventEffects.js';
+import { resolveEventPhase } from './eventsPhase.js';
+import type { EventCard } from '../types/cards.js';
+
+function card(id: string, effect: EventCard['effect'], extra: Partial<EventCard> = {}): EventCard {
+  return {
+    id,
+    name: id,
+    description: id,
+    effect,
+    corridorNumber: 1,
+    intruderTypes: ['LARVA', 'CREEPER', 'ADULT', 'BREEDER', 'QUEEN'],
+    isDestroyedOnResolve: false,
+    isReshuffledIntoDeck: false,
+    ...extra,
+  };
+}
+
+describe('Event Effects Engine — 0.5.0 Step 7б', () => {
+  it('Регенерация снимает не более двух Ран с каждого Чужого', () => {
+    const state = createInitialGameState('event-effects-regeneration');
+    const intruder = state.intrudersPool.boardTokens;
+    state.ship.rooms[11]!.occupantIntruderIds.push('i-1');
+    intruder.push({ id: 'i-1', type: 'ADULT', roomId: 11, woundsCount: 4 });
+
+    resolveEventCardEffect(state, card('regen', 'REGENERATION'));
+    expect(intruder[0]!.woundsCount).toBe(2);
+  });
+
+  it('Открытие отсеков открывает только неразрушенные Двери', () => {
+    const state = createInitialGameState('event-effects-doors');
+    state.ship.corridors['1-2']!.doorState = 'CLOSED';
+    state.ship.corridors['1-3']!.doorState = 'DESTROYED';
+
+    resolveEventCardEffect(state, card('doors', 'OPEN_SECTIONS'));
+    expect(state.ship.corridors['1-2']!.doorState).toBe('OPEN');
+    expect(state.ship.corridors['1-3']!.doorState).toBe('DESTROYED');
+  });
+
+  it('Короткое замыкание ставит Неисправность только в жёлтые отсеки с Компьютером', () => {
+    const state = createInitialGameState('event-effects-short');
+    resolveEventCardEffect(state, card('short', 'SHORT_CIRCUIT'));
+    expect(state.ship.rooms[2]!.hasMalfunction).toBe(true);
+    expect(state.ship.rooms[3]!.hasMalfunction).toBe(false);
+  });
+
+  it('Утечка охладителя запускает Самоуничтожение только при неисправном Генераторе', () => {
+    const state = createInitialGameState('event-effects-coolant');
+    state.meta.selfDestructTrackPosition = null;
+    state.ship.rooms[2]!.hasMalfunction = true;
+    resolveEventCardEffect(state, card('coolant', 'COOLANT_LEAK'));
+    expect(state.meta.selfDestructTrackPosition).toBeNull();
+
+    const generator = Object.values(state.ship.rooms).find((room) => room.definitionId === 'GENERATOR')!;
+    generator.hasMalfunction = true;
+    resolveEventCardEffect(state, card('coolant-2', 'COOLANT_LEAK'));
+    expect(state.meta.selfDestructTrackPosition).toBe(0);
+  });
+
+  it('Неисправность выбирает исследованный отсек с минимальным номером', () => {
+    const state = createInitialGameState('event-effects-malfunction');
+    state.ship.rooms[2]!.isExplored = true;
+    state.ship.rooms[3]!.isExplored = true;
+    resolveEventCardEffect(state, card('malf', 'MALFUNCTION'));
+    expect(state.ship.rooms[2]!.hasMalfunction).toBe(true);
+    expect(state.ship.rooms[3]!.hasMalfunction).toBe(false);
+  });
+
+  it('Катапультирование удаляет капсулу с минимальным номером и не трогает остальные', () => {
+    const state = createInitialGameState('event-effects-pod');
+    const pods = Object.values(state.ship.escapePods).sort((a, b) => a.number - b.number);
+    const first = pods[0]!;
+    const second = pods[1]!;
+    resolveEventCardEffect(state, card('pod', 'EJECT_ESCAPE_POD'));
+    expect(state.ship.escapePods[first.id]).toBeUndefined();
+    expect(state.ship.escapePods[second.id]).toBeDefined();
+  });
+
+  it('Удаляемая карта не остаётся в сбросе, а остаток сброса замешивается', () => {
+    const state = createInitialGameState('event-effects-reshuffle');
+    const event = card('destroy-me', 'EJECT_ESCAPE_POD', { isDestroyedOnResolve: true });
+    state.decks.events.discard = [event, card('old', 'REGENERATION')];
+    finalizeEventCard(state, event);
+    expect(state.decks.events.discard).toEqual([]);
+    expect(state.decks.events.drawPile.some((candidate) => candidate.id === 'destroy-me')).toBe(false);
+    expect(state.decks.events.drawPile.some((candidate) => candidate.id === 'old')).toBe(true);
+  });
+
+  it('карта «Неисправность» после эффекта замешивается обратно вместе со сбросом', () => {
+    const state = createInitialGameState('event-effects-malfunction-reshuffle');
+    const event = card('malfunction', 'MALFUNCTION', { isReshuffledIntoDeck: true });
+    state.decks.events.discard = [event, card('old', 'REGENERATION')];
+    finalizeEventCard(state, event);
+    expect(state.decks.events.discard).toEqual([]);
+    expect(state.decks.events.drawPile.map((candidate) => candidate.id).sort()).toEqual(['malfunction', 'old']);
+  });
+
+  it('полная Фаза Событий не вытягивает новую карту после разрешения эффекта', () => {
+    const state = createInitialGameState('event-effects-lifecycle');
+    state.meta.phase = 'EVENT_PHASE';
+    const result = resolveEventPhase(state);
+    expect(result.executedSteps).toContain('EVENT_EFFECT');
+    expect(state.meta.eventPhaseCardId).toBeNull();
+    expect(state.meta.eventPhaseEffectStarted).toBe(false);
+    expect(state.meta.phase).toBe('PLAYER_PHASE');
+  });
+});
diff --git a/packages/shared/src/logic/eventEffects.ts b/packages/shared/src/logic/eventEffects.ts
new file mode 100644
index 0000000..d058ecf
--- /dev/null
+++ b/packages/shared/src/logic/eventEffects.ts
@@ -0,0 +1,346 @@
+import type { EventCard } from '../types/cards.js';
+import type { GameState } from '../types/state.js';
+import type { RoomId } from '../types/rooms.js';
+import { drawSharedCard } from './cardPiles.js';
+import { appendGameLog } from './gameLog.js';
+import { placeFireMarker, placeMalfunctionMarker, NOISE_MARKER_SUPPLY } from './markers.js';
+import { corridorsLeadingInto, findAdjacentOpenRoomIds } from './shipGraphQueries.js';
+import { livingPlayersInRoom, removeIntruder, returnTokenToBag, placeIntruder } from './intruderPlacement.js';
+import { receiveContamination, killPlayer } from './characterDamage.js';
+import { endGame } from './gameEnd.js';
+import { EngineError } from './engineErrors.js';
+import { drawFromStream, shuffle } from '../utils/rng.js';
+import { getRoomDeckColor } from './search.js';
+import type { InterruptEvent } from '../types/interrupts.js';
+import { drainInterrupts } from './interrupts.js';
+
+function livingPlayers(state: GameState) {
+  return Object.values(state.players).filter((p) => !p.isDead && !p.isInHibernation && !p.hasEscapedInPod);
+}
+
+function hasEggOnPlayer(player: GameState['players'][string]): boolean {
+  return player.handSlots.some((slot) => slot.source === 'OBJECT' && slot.object.kind === 'EGG');
+}
+
+function roomDefinition(state: GameState, roomId: RoomId): string | null {
+  return state.ship.rooms[roomId]?.definitionId ?? null;
+}
+
+function queueInterrupts(state: GameState, interrupts: InterruptEvent[]): void {
+  state.interruptQueue.push(...interrupts);
+  drainInterrupts(state);
+}
+
+function adjacentRoomsWithPlayers(state: GameState, roomId: RoomId): RoomId[] {
+  return findAdjacentOpenRoomIds(state, roomId).filter((id) => livingPlayersInRoom(state, id).length > 0).sort((a, b) => a - b);
+}
+
+function moveIntruder(state: GameState, intruderId: string, toRoomId: RoomId): void {
+  const intruder = state.intrudersPool.boardTokens.find((x) => x.id === intruderId);
+  if (!intruder) return;
+  const from = state.ship.rooms[intruder.roomId];
+  const to = state.ship.rooms[toRoomId];
+  if (!from || !to) throw new EngineError('UNKNOWN_ROOM', `Неверный отсек при эффекте События: ${toRoomId}.`);
+  from.occupantIntruderIds = from.occupantIntruderIds.filter((id) => id !== intruderId);
+  to.occupantIntruderIds.push(intruderId);
+  const fromRoomId = intruder.roomId;
+  intruder.roomId = toRoomId;
+  appendGameLog(state, {
+    type: 'EVENT_INTRUDER_EFFECT_MOVED',
+    intruderId,
+    intruderType: intruder.type,
+    fromRoomId,
+    toRoomId,
+  });
+}
+
+function resolveHunt(state: GameState): void {
+  const adults = [...state.intrudersPool.boardTokens]
+    .filter((i) => i.type === 'ADULT')
+    .filter((i) => livingPlayersInRoom(state, i.roomId).length === 0)
+    .sort((a, b) => a.id.localeCompare(b.id));
+
+  for (const adult of adults) {
+    const targets = adjacentRoomsWithPlayers(state, adult.roomId);
+    if (targets.length > 0) moveIntruder(state, adult.id, targets[0]!);
+  }
+}
+
+function resolveHiveProtection(state: GameState): void {
+  const targets = livingPlayers(state)
+    .filter((p) => roomDefinition(state, p.roomId) === 'NEST' || hasEggOnPlayer(p))
+    .sort((a, b) => a.orderNumber - b.orderNumber);
+
+  queueInterrupts(
+    state,
+    targets.map((p) => ({ type: 'CONTACT_INTERRUPT', playerId: p.id, roomId: p.roomId, source: 'CALL' as const })),
+  );
+}
+
+function resolveBrood(state: GameState): void {
+  if (state.intrudersPool.eggsOnBoard > 0) state.intrudersPool.eggsOnBoard -= 1;
+  const nestPlayers = livingPlayers(state).filter((p) => roomDefinition(state, p.roomId) === 'NEST');
+  let infected = false;
+  for (const player of nestPlayers) {
+    if (player.actionDeck.hand.length === 0) {
+      receiveContamination(state, player.id);
+      infected = true;
+    }
+  }
+  if (!infected) {
+    if (!returnTokenToBag(state, 'LARVA')) {
+      throw new EngineError('INTRUDER_TOKEN_NOT_IN_SUPPLY', 'Для эффекта «Выводок» нет жетона Личинки в запасе.');
+    }
+  }
+}
+
+function resolveRegeneration(state: GameState): void {
+  for (const intruder of state.intrudersPool.boardTokens) intruder.woundsCount = Math.max(0, intruder.woundsCount - 2);
+}
+
+function resolveHidden(state: GameState): void {
+  const ids = state.intrudersPool.boardTokens
+    .filter((i) => livingPlayersInRoom(state, i.roomId).length === 0)
+    .map((i) => i.id);
+  for (const id of ids) {
+    const intruder = state.intrudersPool.boardTokens.find((i) => i.id === id);
+    if (!intruder) continue;
+    const type = intruder.type;
+    removeIntruder(state, id);
+    intruder.woundsCount = 0;
+    if (!returnTokenToBag(state, type)) throw new EngineError('INTRUDER_TOKEN_NOT_IN_SUPPLY', `Жетон ${type} не найден в запасе.`);
+  }
+}
+
+function resolveMaturation(state: GameState): void {
+  const larvalPlayers = livingPlayers(state).filter((p) => p.hasLarva);
+  for (const player of larvalPlayers) {
+    const roomId = player.roomId;
+    killPlayer(state, player.id);
+    placeIntruder(state, 'CREEPER', roomId);
+  }
+
+  for (const player of livingPlayers(state)) {
+    let infected = false;
+    const drawn = [];
+    for (let i = 0; i < 4; i++) {
+      if (state.decks.contamination.drawPile.length === 0) break;
+      const card = drawSharedCard(state, state.decks.contamination, 'Заражение');
+      drawn.push(card);
+      if (card.isInfected) infected = true;
+    }
+    state.decks.contamination.discard.push(...drawn);
+    if (infected) player.hasLarva = true;
+  }
+}
+
+function resolveRampage(state: GameState): void {
+  for (const room of Object.values(state.ship.rooms)) {
+    const hasLarge = room.occupantIntruderIds.some((id) => {
+      const i = state.intrudersPool.boardTokens.find((x) => x.id === id);
+      return i && (i.type === 'ADULT' || i.type === 'BREEDER' || i.type === 'QUEEN');
+    });
+    if (!hasLarge) continue;
+    const result = placeMalfunctionMarker(state, room.id);
+    if (result === 'HULL_BREACH') {
+      endGame(state, 'HULL_BREACH');
+      return;
+    }
+  }
+}
+
+function placeNoiseDirect(state: GameState, corridorId: string): void {
+  const corridor = state.ship.corridors[corridorId];
+  if (!corridor || corridor.hasNoise) return;
+  const placed = Object.values(state.ship.corridors).filter((c) => c.hasNoise).length + (state.ship.technicalCorridorNoise ? 1 : 0);
+  if (placed >= NOISE_MARKER_SUPPLY) return;
+  corridor.hasNoise = true;
+}
+
+function resolvePreyScent(state: GameState): void {
+  const targets = new Set<string>();
+  for (const player of livingPlayers(state)) {
+    if (!player.hasSlime) continue;
+    for (const corridor of corridorsLeadingInto(state, player.roomId)) if (!corridor.hasNoise) targets.add(corridor.id);
+  }
+  for (const id of [...targets].sort()) placeNoiseDirect(state, id);
+}
+
+function resolveTechnicalNoise(state: GameState): void {
+  if (!state.ship.technicalCorridorNoise) {
+    state.ship.technicalCorridorNoise = true;
+    return;
+  }
+  const targets = livingPlayers(state)
+    .filter((p) => state.ship.rooms[p.roomId]?.hasTechnicalCorridorEntrance)
+    .sort((a, b) => a.orderNumber - b.orderNumber);
+  queueInterrupts(state, targets.map((p) => ({ type: 'NOISE_ROLL_INTERRUPT', playerId: p.id, roomId: p.roomId, noise: { kind: 'ROLL' as const } })));
+}
+
+function resolveHiveNoise(state: GameState): void {
+  const nest = Object.values(state.ship.rooms).find((r) => r.definitionId === 'NEST');
+  if (!nest || !nest.isExplored) return;
+  for (const corridor of corridorsLeadingInto(state, nest.id)) if (!corridor.hasNoise) placeNoiseDirect(state, corridor.id);
+}
+
+function openDoorSections(state: GameState): void {
+  for (const corridor of Object.values(state.ship.corridors)) if (corridor.doorState !== 'DESTROYED') corridor.doorState = 'OPEN';
+}
+
+function fireSpread(state: GameState, sourceRooms: RoomId[], malfunction: boolean, clearItems: boolean): void {
+  const targets = new Set<RoomId>();
+  for (const roomId of sourceRooms) {
+    const room = state.ship.rooms[roomId];
+    if (!room) continue;
+    if (clearItems) room.itemsCount = 0;
+    if (malfunction) {
+      const result = placeMalfunctionMarker(state, roomId);
+      if (result === 'HULL_BREACH') { endGame(state, 'HULL_BREACH'); return; }
+    }
+    for (const corridor of corridorsLeadingInto(state, roomId)) {
+      if (corridor.doorState === 'CLOSED') continue;
+      targets.add(corridor.fromRoomId === roomId ? corridor.toRoomId : corridor.fromRoomId);
+    }
+  }
+  for (const roomId of [...targets].sort((a, b) => a - b)) {
+    const result = placeFireMarker(state, roomId);
+    if (result === 'SHIP_EXPLODED') { endGame(state, 'SHIP_EXPLODED'); return; }
+  }
+}
+
+function resolveFlammableSolution(state: GameState): void {
+  const cryo = Object.values(state.ship.rooms).find((r) => r.definitionId === 'HIBERNATORIUM');
+  if (!cryo) return;
+  if (!cryo.hasFire) {
+    const result = placeFireMarker(state, cryo.id);
+    if (result === 'SHIP_EXPLODED') endGame(state, 'SHIP_EXPLODED');
+    return;
+  }
+  fireSpread(state, [cryo.id], false, false);
+}
+
+function resolveConsumingFire(state: GameState): void {
+  const burning = Object.values(state.ship.rooms).filter((r) => r.hasFire).map((r) => r.id);
+  fireSpread(state, burning, false, true);
+}
+
+function resolveDestructiveFire(state: GameState): void {
+  const burning = Object.values(state.ship.rooms).filter((r) => r.hasFire).map((r) => r.id);
+  fireSpread(state, burning, true, false);
+}
+
+function resolveEjectEscapePod(state: GameState): void {
+  const pods = Object.values(state.ship.escapePods).sort((a, b) => a.number - b.number);
+  const pod = pods[0];
+  if (!pod) return;
+  delete state.ship.escapePods[pod.id];
+}
+
+function resolveShortCircuit(state: GameState): void {
+  for (const room of Object.values(state.ship.rooms)) {
+    if (!room.hasComputer || getRoomDeckColor(room.definitionId) !== 'YELLOW') continue;
+    const result = placeMalfunctionMarker(state, room.id);
+    if (result === 'HULL_BREACH') { endGame(state, 'HULL_BREACH'); return; }
+  }
+}
+
+function resolveCoolantLeak(state: GameState): void {
+  const generator = Object.values(state.ship.rooms).find((r) => r.definitionId === 'GENERATOR');
+  if (generator?.hasMalfunction && state.meta.selfDestructTrackPosition === null) state.meta.selfDestructTrackPosition = 0;
+}
+
+function resolveLifeSupport(state: GameState): void {
+  for (const room of Object.values(state.ship.rooms)) {
+    if (getRoomDeckColor(room.definitionId) !== 'GREEN') continue;
+    const result = placeMalfunctionMarker(state, room.id);
+    if (result === 'HULL_BREACH') { endGame(state, 'HULL_BREACH'); return; }
+  }
+}
+
+function resolveMalfunction(state: GameState): void {
+  const room = Object.values(state.ship.rooms).filter((r) => r.isExplored).sort((a, b) => a.id - b.id)[0];
+  if (!room) return;
+  const result = placeMalfunctionMarker(state, room.id);
+  if (result === 'HULL_BREACH') endGame(state, 'HULL_BREACH');
+}
+
+function resolveEffect(state: GameState, card: EventCard): void {
+  switch (card.effect) {
+    case 'HUNT': return resolveHunt(state);
+    case 'HIVE_PROTECTION': return resolveHiveProtection(state);
+    case 'BROOD': return resolveBrood(state);
+    case 'REGENERATION': return resolveRegeneration(state);
+    case 'HIDDEN': return resolveHidden(state);
+    case 'MATURATION': return resolveMaturation(state);
+    case 'RAMPAGE': return resolveRampage(state);
+    case 'PREY_SCENT': return resolvePreyScent(state);
+    case 'TECHNICAL_CORRIDORS_NOISE': return resolveTechnicalNoise(state);
+    case 'HIVE': return resolveHiveNoise(state);
+    case 'FLAMMABLE_SOLUTION': return resolveFlammableSolution(state);
+    case 'CONSUMING_FIRE': return resolveConsumingFire(state);
+    case 'DESTRUCTIVE_FIRE': return resolveDestructiveFire(state);
+    case 'EJECT_ESCAPE_POD': return resolveEjectEscapePod(state);
+    case 'SHORT_CIRCUIT': return resolveShortCircuit(state);
+    case 'COOLANT_LEAK': return resolveCoolantLeak(state);
+    case 'LIFE_SUPPORT_MALFUNCTION': return resolveLifeSupport(state);
+    case 'MALFUNCTION': return resolveMalfunction(state);
+    case 'OPEN_SECTIONS': return openDoorSections(state);
+    case 'PREPARATION': {
+      // В текущем `eventCards.ts` физические карты «Подготовка» отсутствуют;
+      // эффект оставлен в контракте, чтобы добавление карт не требовало переписывать движок.
+      // При попытке разыграть такой отсутствующий в данных эффект лучше остановить
+      // движок, чем молча выбрать одну из трёх карт без пользовательского выбора.
+      throw new EngineError('EVENT_EFFECT_NOT_IMPLEMENTED', 'Эффект «Подготовка» описан в EVENTS.md, но отсутствует среди текущих физических карт eventCards.ts; требуется сверка набора карт.');
+    }
+    default: {
+      const exhaustive: never = card.effect;
+      throw new EngineError('EVENT_EFFECT_NOT_IMPLEMENTED', `Эффект ${String(exhaustive)} не реализован.`);
+    }
+  }
+}
+
+function finishEventCard(state: GameState, card: EventCard): void {
+  const index = state.decks.events.discard.findIndex((c) => c.id === card.id);
+  if (index >= 0) state.decks.events.discard.splice(index, 1);
+
+  if (card.isDestroyedOnResolve) {
+    shuffleDiscardIntoEventDeck(state);
+  } else if (card.isReshuffledIntoDeck) {
+    const cards = [...state.decks.events.discard, card];
+    state.decks.events.discard = [];
+    state.decks.events.drawPile = shuffle(() => {
+      const value = drawFromStream(state.meta.seed, 'cards', state.meta.rngDraws.cards);
+      state.meta.rngDraws.cards += 1;
+      return value;
+    }, cards);
+  } else {
+    state.decks.events.discard.push(card);
+  }
+}
+
+function shuffleDiscardIntoEventDeck(state: GameState): void {
+  if (state.decks.events.discard.length === 0) return;
+  const cards = [...state.decks.events.discard];
+  state.decks.events.discard = [];
+  state.decks.events.drawPile = shuffle(() => {
+    const value = drawFromStream(state.meta.seed, 'cards', state.meta.rngDraws.cards);
+    state.meta.rngDraws.cards += 1;
+    return value;
+  }, cards);
+}
+
+export function resolveEventCardEffect(state: GameState, card: EventCard): void {
+  resolveEffect(state, card);
+  appendGameLog(state, { type: 'EVENT_EFFECT_RESOLVED', eventCardId: card.id, effect: card.effect });
+}
+
+export function finalizeEventCard(state: GameState, card: EventCard): void {
+  finishEventCard(state, card);
+}
+
+/** Розыгрыш одной из 3 карт для будущего эффекта «Подготовка». */
+export function resolvePreparationChoice(state: GameState): EventCard[] {
+  const choices: EventCard[] = [];
+  for (let i = 0; i < 3; i++) choices.push(drawSharedCard(state, state.decks.events, 'События'));
+  return choices;
+}
diff --git a/packages/shared/src/logic/eventsPhase.test.ts b/packages/shared/src/logic/eventsPhase.test.ts
new file mode 100644
index 0000000..5c07458
--- /dev/null
+++ b/packages/shared/src/logic/eventsPhase.test.ts
@@ -0,0 +1,396 @@
+import { describe, expect, it } from 'vitest';
+import { FIRE_MARKER_SUPPLY, countFireMarkers } from './markers.js';
+import { createInitialGameState } from './setup.js';
+import { resolveEventPhase, resolveEventPhaseCounters, resolveEventPhaseFireDamage, resolveEventPhaseIntruderAttacks } from './eventsPhase.js';
+import { EVENT_CARDS } from '../data/eventCards.js';
+import { resolveIntruderMovement } from './intruderMovement.js';
+import { INTRUDER_ATTACK_CARDS } from '../data/intruderAttacks.js';
+import { placeIntruder } from './intruderPlacement.js';
+import type { GameState } from '../types/state.js';
+import type { IntruderType } from '../types/entities.js';
+
+const state = (playerCount = 1): GameState => createInitialGameState('events-phase-step-4', { playerCount });
+
+describe('Фаза Событий — Шаг 4–6 v0.5.0', () => {
+  it('сдвигает Время ровно один раз при входе в Фазу Событий', () => {
+    const game = state();
+    game.meta.phase = 'EVENT_PHASE';
+    game.meta.timeTrackPosition = 3;
+
+    resolveEventPhase(game);
+
+    expect(game.meta.timeTrackPosition).toBe(4);
+    expect(game.meta.currentRound).toBe(1);
+    expect(game.meta.phase).toBe('EVENT_PHASE');
+    expect(game.meta.eventPhaseCardId).not.toBeNull();
+  });
+
+  it('не сдвигает Время второй раз при старте нового раунда', () => {
+    const game = state();
+    game.meta.phase = 'EVENT_PHASE';
+    game.meta.timeTrackPosition = 14;
+
+    resolveEventPhase(game);
+
+    expect(game.meta.timeTrackPosition).toBe(15);
+    expect(game.meta.currentRound).toBe(1);
+    expect(game.meta.phase).toBe('GAME_OVER');
+    expect(game.meta.gameOverReason).toBe('HYPERSPACE_JUMP');
+  });
+
+  it('при гиперпрыжке убивает всех не находящихся в Анабиозе персонажей', () => {
+    const game = state(2);
+    game.meta.timeTrackPosition = 14;
+    game.meta.phase = 'EVENT_PHASE';
+    game.players['player-1']!.isInHibernation = false;
+    game.players['player-2']!.isInHibernation = true;
+
+    resolveEventPhaseCounters(game);
+
+    expect(game.players['player-1']!.isDead).toBe(true);
+    expect(game.players['player-2']!.isDead).toBe(false);
+    expect(game.meta.gameOverReason).toBe('HYPERSPACE_JUMP');
+  });
+
+  it('сдвигает Самоуничтожение и разблокирует капсулы с жёлтой зоны', () => {
+    const game = state();
+    game.meta.selfDestructTrackPosition = 5;
+
+    const ended = resolveEventPhaseCounters(game);
+
+    expect(ended).toBe(false);
+    expect(game.meta.selfDestructTrackPosition).toBe(6);
+    expect(Object.values(game.ship.escapePods).every((pod) => !pod.isLocked)).toBe(true);
+  });
+
+  it('взрывает корабль на последнем делении Самоуничтожения', () => {
+    const game = state();
+    game.meta.selfDestructTrackPosition = 7;
+
+    const ended = resolveEventPhaseCounters(game);
+
+    expect(ended).toBe(true);
+    expect(game.meta.phase).toBe('GAME_OVER');
+    expect(game.meta.gameOverReason).toBe('SHIP_EXPLODED');
+    expect(game.meta.selfDestructTrackPosition).toBe(8);
+  });
+
+  it('наносит ровно одну Рану каждому Чужому в горящем отсеке', () => {
+    const game = state();
+    const room = game.ship.rooms[11]!;
+    room.hasFire = true;
+
+    const first = placeIntruder(game, 'ADULT', 11);
+    const second = placeIntruder(game, 'CREEPER', 11);
+
+    resolveEventPhaseFireDamage(game);
+
+    expect(game.intrudersPool.boardTokens.find((i) => i.id === first.id)?.woundsCount).toBe(1);
+    expect(game.intrudersPool.boardTokens.find((i) => i.id === second.id)?.woundsCount).toBe(1);
+
+    const events = game.gameLog.filter((entry) => entry.event.type === 'FIRE_DAMAGE_TAKEN_BY_INTRUDER');
+    expect(events).toHaveLength(2);
+  });
+
+  it('уничтожает одно свободное Яйцо в горящем отсеке', () => {
+    const game = state();
+    const room = game.ship.rooms[11]!;
+    room.hasFire = true;
+    room.objects.push({ id: 'egg-fire-1', kind: 'EGG' });
+    room.objects.push({ id: 'egg-fire-2', kind: 'EGG' });
+
+    resolveEventPhaseFireDamage(game);
+
+    expect(room.objects.filter((object) => object.kind === 'EGG')).toHaveLength(1);
+    expect(game.gameLog.some((entry) => entry.event.type === 'FIRE_DESTROYED_EGG')).toBe(true);
+  });
+
+  it('не уничтожает Яйцо, перенесённое в руке персонажа', () => {
+    const game = state();
+    const room = game.ship.rooms[11]!;
+    const player = game.players['player-1']!;
+    room.hasFire = true;
+    player.roomId = 11;
+    room.occupantPlayerIds = [player.id];
+    player.handSlots.push({ source: 'OBJECT', object: { id: 'egg-carried', kind: 'EGG' } });
+
+    resolveEventPhaseFireDamage(game);
+
+    expect(player.handSlots.some((slot) => slot.source === 'OBJECT' && slot.object.kind === 'EGG')).toBe(true);
+  });
+
+  it('не считает уже занятые маркеры Пожара как новые', () => {
+    const game = state();
+    for (const room of Object.values(game.ship.rooms).slice(0, FIRE_MARKER_SUPPLY)) room.hasFire = true;
+    expect(countFireMarkers(game.ship)).toBe(FIRE_MARKER_SUPPLY);
+  });
+
+    it('каждый Чужой в Бою совершает ровно одну атаку', () => {
+      const game = state(1);
+      const room = game.ship.rooms[11]!;
+      const player = game.players['player-1']!;
+      player.roomId = 11;
+      room.occupantPlayerIds = [player.id];
+
+      const first = placeIntruder(game, 'CREEPER', 11);
+      const second = placeIntruder(game, 'ADULT', 11);
+      const scratch = INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_SCRATCH_2')!;
+      game.decks.intruderAttacks.drawPile = [
+        structuredClone(scratch),
+        structuredClone(scratch),
+        ...game.decks.intruderAttacks.drawPile.filter((card) => card.id !== scratch.id),
+      ];
+
+      resolveEventPhaseIntruderAttacks(game);
+
+      const events = game.gameLog
+        .map((entry) => entry.event)
+        .filter((event) => event.type === 'EVENT_PHASE_ATTACK_RESOLVED');
+
+      expect(events).toHaveLength(2);
+      expect(events.map((event) => event.intruderId)).toEqual([first.id, second.id]);
+      expect(events.every((event) => event.playerId === player.id)).toBe(true);
+    });
+
+    it('выбирает персонажа с меньшей рукой', () => {
+      const game = state(2);
+      const room = game.ship.rooms[11]!;
+      const first = game.players['player-1']!;
+      const second = game.players['player-2']!;
+      first.roomId = 11;
+      second.roomId = 11;
+      room.occupantPlayerIds = [first.id, second.id];
+      first.actionDeck.hand = first.actionDeck.hand.slice(0, 4);
+      second.actionDeck.hand = second.actionDeck.hand.slice(0, 1);
+
+      const intruder = placeIntruder(game, 'CREEPER', 11);
+      const scratch = INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_SCRATCH_2')!;
+      game.decks.intruderAttacks.drawPile = [
+        structuredClone(scratch),
+        ...game.decks.intruderAttacks.drawPile.filter((card) => card.id !== scratch.id),
+      ];
+
+      resolveEventPhaseIntruderAttacks(game);
+
+      const event = game.gameLog
+        .map((entry) => entry.event)
+        .find((candidate) => candidate.type === 'EVENT_PHASE_ATTACK_RESOLVED');
+
+      expect(event).toMatchObject({ intruderId: intruder.id, playerId: second.id });
+    });
+
+    it('при равной руке использует порядок от Первого Игрока по часовой стрелке', () => {
+      const game = state(2);
+      const room = game.ship.rooms[11]!;
+      const first = game.players['player-1']!;
+      const second = game.players['player-2']!;
+      first.roomId = 11;
+      second.roomId = 11;
+      room.occupantPlayerIds = [first.id, second.id];
+      first.actionDeck.hand = first.actionDeck.hand.slice(0, 2);
+      second.actionDeck.hand = second.actionDeck.hand.slice(0, 2);
+      game.meta.firstPlayerId = second.id;
+
+      const intruder = placeIntruder(game, 'ADULT', 11);
+      const scratch = INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_SCRATCH_2')!;
+      game.decks.intruderAttacks.drawPile = [
+        structuredClone(scratch),
+        ...game.decks.intruderAttacks.drawPile.filter((card) => card.id !== scratch.id),
+      ];
+
+      resolveEventPhaseIntruderAttacks(game);
+
+      const event = game.gameLog
+        .map((entry) => entry.event)
+        .find((candidate) => candidate.type === 'EVENT_PHASE_ATTACK_RESOLVED');
+
+      expect(event).toMatchObject({ intruderId: intruder.id, playerId: second.id });
+    });
+
+    it('не атакует Чужим персонажей в Анабиозе, в капсуле или мёртвых', () => {
+      const game = state(2);
+      const room = game.ship.rooms[11]!;
+      const first = game.players['player-1']!;
+      const second = game.players['player-2']!;
+      first.roomId = 11;
+      second.roomId = 11;
+      first.isInHibernation = true;
+      second.hasEscapedInPod = true;
+      room.occupantPlayerIds = [first.id, second.id];
+
+      placeIntruder(game, 'ADULT', 11);
+
+      resolveEventPhaseIntruderAttacks(game);
+
+      expect(
+        game.gameLog.some((entry) => entry.event.type === 'EVENT_PHASE_ATTACK_RESOLVED'),
+      ).toBe(false);
+    });
+
+    it('после смерти первой цели следующая атака выбирает оставшегося персонажа', () => {
+      const game = state(2);
+      const room = game.ship.rooms[11]!;
+      const first = game.players['player-1']!;
+      const second = game.players['player-2']!;
+      first.roomId = 11;
+      second.roomId = 11;
+      room.occupantPlayerIds = [first.id, second.id];
+      first.actionDeck.hand = [];
+      second.actionDeck.hand = [];
+      first.seriousWounds = first.seriousWounds.slice(0, 2);
+      second.seriousWounds = second.seriousWounds.slice(0, 0);
+
+      const firstIntruder = placeIntruder(game, 'ADULT', 11);
+      const secondIntruder = placeIntruder(game, 'ADULT', 11);
+      const bite = INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_BITE_1')!;
+      game.decks.intruderAttacks.drawPile = [
+        structuredClone(bite),
+        structuredClone(bite),
+        ...game.decks.intruderAttacks.drawPile.filter((card) => card.id !== bite.id),
+      ];
+
+      resolveEventPhaseIntruderAttacks(game);
+
+      const events = game.gameLog
+        .map((entry) => entry.event)
+        .filter((event) => event.type === 'EVENT_PHASE_ATTACK_RESOLVED');
+
+      expect(events).toHaveLength(2);
+      expect(events[0]).toMatchObject({ intruderId: firstIntruder.id, playerId: first.id });
+      expect(events[1]).toMatchObject({ intruderId: secondIntruder.id, playerId: second.id });
+      expect(first.isDead).toBe(true);
+      expect(game.meta.gameOverReason).toBeNull();
+    });
+
+    it('учитывает подавление атаки от Зова в текущей Фазе Событий', () => {
+      const game = state(1);
+      const room = game.ship.rooms[11]!;
+      const player = game.players['player-1']!;
+      player.roomId = 11;
+      room.occupantPlayerIds = [player.id];
+
+      const intruder = placeIntruder(game, 'QUEEN', 11);
+      game.meta.phase = 'EVENT_PHASE';
+      game.intrudersPool.attackSuppression[intruder.id] = {
+        round: game.meta.currentRound,
+        phase: 'EVENT_PHASE',
+      };
+
+      resolveEventPhaseIntruderAttacks(game);
+
+      const event = game.gameLog
+        .map((entry) => entry.event)
+        .find((candidate) => candidate.type === 'EVENT_PHASE_ATTACK_RESOLVED');
+
+      expect(event).toMatchObject({
+        intruderId: intruder.id,
+        outcome: 'SUPPRESSED',
+        card: null,
+      });
+      expect(game.decks.intruderAttacks.discard).toHaveLength(0);
+    });
+
+    it('завершает партию, если атака убивает последнего активного персонажа', () => {
+      const game = state(1);
+      const room = game.ship.rooms[11]!;
+      const player = game.players['player-1']!;
+      player.roomId = 11;
+      player.seriousWounds = player.seriousWounds.slice(0, 2);
+      room.occupantPlayerIds = [player.id];
+
+      placeIntruder(game, 'ADULT', 11);
+      const bite = INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_BITE_1')!;
+      game.decks.intruderAttacks.drawPile = [
+        structuredClone(bite),
+        ...game.decks.intruderAttacks.drawPile.filter((card) => card.id !== bite.id),
+      ];
+
+      resolveEventPhaseIntruderAttacks(game);
+
+      expect(player.isDead).toBe(true);
+      expect(game.meta.phase).toBe('GAME_OVER');
+      expect(game.meta.gameOverReason).toBe('NO_ACTIVE_CHARACTERS');
+    });
+
+  it('двигает соответствующих Чужих по номеру Коридора и не раскрывает новый отсек', () => {
+    const game = state();
+    game.meta.phase = 'EVENT_PHASE';
+    const intruder = placeIntruder(game, 'ADULT', 6);
+    game.ship.rooms[7]!.isExplored = false;
+
+    const card = structuredClone(EVENT_CARDS.find((candidate) => candidate.corridorNumber === 1 && candidate.intruderTypes.includes('ADULT'))!);
+    game.decks.events.drawPile = [card];
+
+    resolveIntruderMovement(game, card);
+
+    expect(intruder.roomId).toBe(5);
+    expect(game.ship.rooms[5]!.isExplored).toBe(false);
+    const event = game.gameLog.map((entry) => entry.event).find((candidate) => candidate.type === 'INTRUDER_MOVED');
+    expect(event).toMatchObject({
+      intruderId: intruder.id,
+      fromRoomId: 6,
+      toRoomId: 5,
+      corridorNumber: 1,
+      outcome: 'MOVED',
+    });
+  });
+
+  it('не двигает Чужого, находящегося в Бою, даже если он соответствует карте', () => {
+    const game = state();
+    const player = game.players['player-1']!;
+    player.roomId = 6;
+    game.ship.rooms[6]!.occupantPlayerIds = [player.id];
+    const intruder = placeIntruder(game, 'ADULT', 6);
+    const card = structuredClone(EVENT_CARDS.find((candidate) => candidate.corridorNumber === 1 && candidate.intruderTypes.includes('ADULT'))!);
+
+    resolveIntruderMovement(game, card);
+
+    expect(intruder.roomId).toBe(6);
+    expect(game.gameLog.some((entry) => entry.event.type === 'INTRUDER_MOVED')).toBe(false);
+  });
+
+  it('разрушает закрытую Дверь и оставляет всех движущихся Чужих в исходном отсеке', () => {
+    const game = state();
+    const first = placeIntruder(game, 'ADULT', 6);
+    const second = placeIntruder(game, 'BREEDER', 6);
+    const corridor = game.ship.corridors['5-6']!;
+    corridor.doorState = 'CLOSED';
+    const card = structuredClone(EVENT_CARDS.find((candidate) => candidate.corridorNumber === 1 && candidate.intruderTypes.includes('ADULT'))!);
+    (card.intruderTypes as IntruderType[]).push('BREEDER');
+
+    resolveIntruderMovement(game, card);
+
+    expect(corridor.doorState).toBe('DESTROYED');
+    expect(first.roomId).toBe(6);
+    expect(second.roomId).toBe(6);
+    expect(game.gameLog.some((entry) => entry.event.type === 'INTRUDERS_BLOCKED_BY_DOOR')).toBe(true);
+  });
+
+  it('отправляет Чужого в Технические Коридоры, сбрасывает Раны и возвращает жетон в мешок', () => {
+    const game = state();
+    const intruder = placeIntruder(game, 'ADULT', 5);
+    intruder.woundsCount = 2;
+    const bagBefore = game.intrudersPool.bag.filter((token) => token.type === 'ADULT').length;
+    const card = structuredClone(EVENT_CARDS.find((candidate) => candidate.corridorNumber === 4 && candidate.intruderTypes.includes('ADULT'))!);
+
+    resolveIntruderMovement(game, card);
+
+    expect(game.intrudersPool.boardTokens.some((candidate) => candidate.id === intruder.id)).toBe(false);
+    expect(game.intrudersPool.bag.filter((token) => token.type === 'ADULT').length).toBe(bagBefore + 1);
+    expect(game.gameLog.some((entry) => entry.event.type === 'INTRUDER_MOVED' && entry.event.outcome === 'TECHNICAL_CORRIDOR')).toBe(true);
+  });
+
+  it('фиксирует выбранную карту один раз для последующего Шага 7б', () => {
+    const game = state();
+    game.meta.phase = 'EVENT_PHASE';
+    resolveEventPhase(game);
+    const firstCardId = game.meta.eventPhaseCardId;
+    expect(firstCardId).not.toBeNull();
+    expect(game.decks.events.discard.some((card) => card.id === firstCardId)).toBe(true);
+
+    resolveEventPhase(game);
+    expect(game.meta.eventPhaseCardId).toBe(firstCardId);
+    expect(game.decks.events.discard.filter((card) => card.id === firstCardId)).toHaveLength(1);
+  });
+
+});
diff --git a/packages/shared/src/logic/eventsPhase.ts b/packages/shared/src/logic/eventsPhase.ts
new file mode 100644
index 0000000..e320f87
--- /dev/null
+++ b/packages/shared/src/logic/eventsPhase.ts
@@ -0,0 +1,335 @@
+import { TIME_TRACK_LENGTH } from '../data/setup.js';
+import type { GameState } from '../types/state.js';
+import { endGame } from './gameEnd.js';
+import { appendGameLog } from './gameLog.js';
+import { checkInjuryResult } from './shoot.js';
+import { startNewRound } from './turnCycle.js';
+import { killPlayer } from './characterDamage.js';
+import { performIntruderAttack } from './intruderAttacks.js';
+import { resolveIntruderMovement, drawEventPhaseCard, getPendingEventPhaseCard } from './intruderMovement.js';
+import { resolveEventCardEffect, finalizeEventCard } from './eventEffects.js';
+import { resolveHiveDevelopment } from './hiveDevelopment.js';
+
+/** Последовательность уже реализованных подшагов Фазы Событий. */
+export type EventPhaseStep = 'COUNTERS' | 'INTRUDER_ATTACKS' | 'FIRE_DAMAGE' | 'INTRUDER_MOVEMENT' | 'EVENT_EFFECT' | 'ROUND_END';
+
+export interface EventPhaseResolution {
+  executedSteps: EventPhaseStep[];
+  gameEnded: boolean;
+}
+
+/**
+ * Шаг 4 книги правил: маркер Времени и Самоуничтожение.
+ *
+ * Важно: этот шаг выполняется до Атак Чужих и Урона от Пожара.
+ * Если корабль погибает здесь, дальнейшая Фаза Событий не выполняется.
+ */
+export function resolveEventPhaseCounters(state: GameState): boolean {
+  state.meta.timeTrackPosition += 1;
+
+  appendGameLog(state, {
+    type: 'EVENT_PHASE_COUNTERS_RESOLVED',
+    round: state.meta.currentRound,
+    timeTrackPosition: state.meta.timeTrackPosition,
+    selfDestructTrackPosition: state.meta.selfDestructTrackPosition,
+  });
+
+  if (state.meta.timeTrackPosition >= TIME_TRACK_LENGTH) {
+    // На красном поле корабль совершает гиперпрыжок. Все персонажи, не
+    // находящиеся в Анабиозе, погибают; сама партия завершается немедленно.
+    for (const player of Object.values(state.players)) {
+      if (!player.isDead && !player.isInHibernation) {
+        killPlayer(state, player.id);
+      }
+    }
+    endGame(state, 'HYPERSPACE_JUMP');
+    return true;
+  }
+
+  if (state.meta.selfDestructTrackPosition !== null) {
+    state.meta.selfDestructTrackPosition += 1;
+
+    appendGameLog(state, {
+      type: 'SELF_DESTRUCT_ADVANCED',
+      round: state.meta.currentRound,
+      position: state.meta.selfDestructTrackPosition,
+    });
+
+    // С жёлтой зоны все Спасательные Капсулы автоматически разблокированы,
+    // остановить процесс уже нельзя.
+    if (state.meta.selfDestructTrackPosition >= 6) {
+      for (const pod of Object.values(state.ship.escapePods)) {
+        pod.isLocked = false;
+      }
+    }
+
+    if (state.meta.selfDestructTrackPosition >= 8) {
+      endGame(state, 'SHIP_EXPLODED');
+      return true;
+    }
+  }
+
+  return false;
+}
+
+
+/**
+ * Шаг 5 Фазы Событий: каждый Чужой, находящийся в Бою, атакует одного
+ * доступного Персонажа в своём отсеке. Порядок комнат и особей детерминирован
+ * состоянием поля, а цель при равном размере руки выбирается от Первого Игрока
+ * по часовой стрелке.
+ */
+export function resolveEventPhaseIntruderAttacks(state: GameState): void {
+  const roomIds = Object.values(state.ship.rooms)
+    .map((room) => room.id)
+    .sort((a, b) => a - b);
+
+  for (const roomId of roomIds) {
+    const room = state.ship.rooms[roomId];
+    if (!room) continue;
+
+    const intruderIds = [...room.occupantIntruderIds];
+
+    for (const intruderId of intruderIds) {
+      const intruder = state.intrudersPool.boardTokens.find((item) => item.id === intruderId);
+      if (!intruder || intruder.roomId !== roomId) continue;
+
+      const targetId = selectEventPhaseAttackTarget(state, roomId);
+      if (!targetId) continue;
+
+      performIntruderAttack(state, targetId, intruderId, (event) => {
+        appendGameLog(state, {
+          type: 'EVENT_PHASE_ATTACK_RESOLVED',
+          ...event,
+        });
+      });
+
+      if (!hasActivePlayers(state)) {
+        endGame(state, 'NO_ACTIVE_CHARACTERS');
+        return;
+      }
+    }
+
+    if (state.meta.gameOverReason !== null) return;
+  }
+}
+
+function hasActivePlayers(state: GameState): boolean {
+  return Object.values(state.players).some(
+    (player) =>
+      !player.isDead &&
+      !player.isInHibernation &&
+      !player.hasEscapedInPod,
+  );
+}
+
+function selectEventPhaseAttackTarget(state: GameState, roomId: number): string | null {
+  const candidates = Object.values(state.players)
+    .filter(
+      (player) =>
+        player.roomId === roomId &&
+        !player.isDead &&
+        !player.isInHibernation &&
+        !player.hasEscapedInPod,
+    );
+
+  if (candidates.length === 0) return null;
+
+  const firstPlayer = state.players[state.meta.firstPlayerId];
+  const firstOrder = firstPlayer?.orderNumber ?? 0;
+
+  return [...candidates]
+    .sort((a, b) => {
+      const handDifference =
+        a.actionDeck.hand.length - b.actionDeck.hand.length;
+
+      if (handDifference !== 0) return handDifference;
+
+      const distanceA = circularPlayerDistance(a.orderNumber, firstOrder);
+      const distanceB = circularPlayerDistance(b.orderNumber, firstOrder);
+
+      if (distanceA !== distanceB) return distanceA - distanceB;
+      return a.orderNumber - b.orderNumber;
+    })[0]!.id;
+}
+
+function circularPlayerDistance(orderNumber: number, firstOrder: number): number {
+  const PLAYER_ORDER_SIZE = 6;
+  return (orderNumber - firstOrder + PLAYER_ORDER_SIZE) % PLAYER_ORDER_SIZE;
+}
+
+/**
+ * Шаг 6 книги правил: огонь наносит 1 Рану каждому Чужому в горящем отсеке.
+ *
+ * Яйцо на полу уничтожается огнём. Яйца в руке персонажа сюда не попадают:
+ * они не являются объектами пола и не должны случайно уничтожаться.
+ */
+export function resolveEventPhaseFireDamage(state: GameState): void {
+  const burningRoomIds = Object.values(state.ship.rooms)
+    .filter((room) => room.hasFire)
+    .map((room) => room.id)
+    .sort((a, b) => a - b);
+
+  for (const roomId of burningRoomIds) {
+    const room = state.ship.rooms[roomId];
+    if (!room || !room.hasFire) continue;
+
+    // Снимок ID важен: проверка Стойкости может убить Чужого или отправить его
+    // в вентиляцию, поэтому нельзя итерировать живой occupantIntruderIds.
+    const intruderIds = [...room.occupantIntruderIds];
+    for (const intruderId of intruderIds) {
+      const intruder = state.intrudersPool.boardTokens.find((item) => item.id === intruderId);
+      if (!intruder) continue;
+
+      const woundsBefore = intruder.woundsCount;
+      const result = checkInjuryResult(state, intruderId, intruder.type, 1, 'SYSTEM_FIRE');
+
+      appendGameLog(state, {
+        type: 'FIRE_DAMAGE_TAKEN_BY_INTRUDER',
+        roomId,
+        intruderId,
+        intruderType: intruder.type,
+        woundsBefore,
+        woundsApplied: 1,
+        woundsAfter: state.intrudersPool.boardTokens.find((item) => item.id === intruderId)?.woundsCount ?? null,
+        killed: result.killed,
+      });
+    }
+
+    // Только одно яйцо на полу уничтожается за отсек и за шаг Фазы Событий.
+    const eggIndex = room.objects.findIndex((object) => object.kind === 'EGG');
+    if (eggIndex >= 0) {
+      const [egg] = room.objects.splice(eggIndex, 1);
+      if (egg?.kind === 'EGG') {
+        appendGameLog(state, {
+          type: 'FIRE_DESTROYED_EGG',
+          roomId,
+          objectId: egg.id,
+        });
+      }
+    }
+  }
+}
+
+/**
+ * Полный оркестратор реализованной части Фазы Событий.
+ *
+ * Движение Чужих, текстовые эффекты карт Событий и развитие Улья относятся
+ * к следующим шагам roadmap и здесь намеренно не имитируются фиктивными действиями.
+ */
+export function resolveEventPhase(state: GameState): EventPhaseResolution {
+  if (state.meta.phase !== 'EVENT_PHASE') {
+    return { executedSteps: [], gameEnded: state.meta.phase === 'GAME_OVER' };
+  }
+
+  // Идемпотентность: после Шага 7а карта уже выбрана, поэтому повторный
+  // вход в оркестратор не должен повторно сдвигать Время, атаковать или жечь.
+  if (state.meta.eventPhaseCardId) {
+    return { executedSteps: ['INTRUDER_MOVEMENT'], gameEnded: false };
+  }
+
+  const executedSteps: EventPhaseStep[] = [];
+
+  appendGameLog(state, {
+    type: 'EVENT_PHASE_STARTED',
+    round: state.meta.currentRound,
+  });
+
+  if (resolveEventPhaseCounters(state)) {
+    executedSteps.push('COUNTERS');
+    return { executedSteps, gameEnded: true };
+  }
+  executedSteps.push('COUNTERS');
+
+  resolveEventPhaseIntruderAttacks(state);
+  executedSteps.push('INTRUDER_ATTACKS');
+
+  if (state.meta.gameOverReason !== null) {
+    return { executedSteps, gameEnded: true };
+  }
+
+  resolveEventPhaseFireDamage(state);
+  executedSteps.push('FIRE_DAMAGE');
+
+  if (state.meta.gameOverReason !== null) {
+    return { executedSteps, gameEnded: true };
+  }
+
+  // Шаг 7а: выбираем карту один раз и разрешаем только её верхний блок.
+  // Текстовый эффект намеренно не выполняется до Шага 7б.
+  const eventCard = drawEventPhaseCard(state);
+  resolveIntruderMovement(state, eventCard);
+  executedSteps.push('INTRUDER_MOVEMENT');
+
+  if (!state.meta.eventPhaseEffectStarted) {
+    state.meta.eventPhaseEffectStarted = true;
+    resolveEventCardEffect(state, eventCard);
+    executedSteps.push('EVENT_EFFECT');
+  }
+
+  if (state.meta.gameOverReason !== null) return { executedSteps, gameEnded: true };
+  if (state.pendingDecision || state.interruptQueue.length > 0) {
+    return { executedSteps, gameEnded: false };
+  }
+
+  if (!state.meta.eventPhaseHiveDevelopmentStarted) {
+    state.meta.eventPhaseHiveDevelopmentStarted = true;
+    resolveHiveDevelopment(state);
+    executedSteps.push('HIVE_DEVELOPMENT');
+  }
+
+  if (state.meta.gameOverReason !== null) return { executedSteps, gameEnded: true };
+  if (state.pendingDecision || state.interruptQueue.length > 0) {
+    return { executedSteps, gameEnded: false };
+  }
+
+  finalizeEventCard(state, eventCard);
+  state.meta.eventPhaseEffectStarted = false;
+  state.meta.eventPhaseHiveDevelopmentStarted = false;
+  completeEventPhaseAfterEventCard(state);
+  executedSteps.push('ROUND_END');
+  return { executedSteps, gameEnded: false };
+}
+
+/**
+ * Закрывает текущую Фазу Событий после того, как Шаг 7б завершил текстовый
+ * эффект выбранной карты. Этот хук нужен, чтобы Шаг 7б не создавал второй
+ * путь перехода в PLAYER_PHASE.
+ */
+export function resumeEventPhaseAfterInterrupts(state: GameState): void {
+  if (state.meta.phase !== 'EVENT_PHASE') return;
+  if (!state.meta.eventPhaseCardId || !state.meta.eventPhaseEffectStarted) return;
+  if (state.pendingDecision || state.interruptQueue.length > 0) return;
+  const card = getPendingEventPhaseCard(state);
+
+  if (!state.meta.eventPhaseHiveDevelopmentStarted) {
+    state.meta.eventPhaseHiveDevelopmentStarted = true;
+    resolveHiveDevelopment(state);
+    if (state.pendingDecision || state.interruptQueue.length > 0) return;
+  }
+
+  finalizeEventCard(state, card);
+  state.meta.eventPhaseEffectStarted = false;
+  state.meta.eventPhaseHiveDevelopmentStarted = false;
+  completeEventPhaseAfterEventCard(state);
+}
+
+export function completeEventPhaseAfterEventCard(state: GameState): void {
+  if (state.meta.phase !== 'EVENT_PHASE') return;
+  if (!state.meta.eventPhaseCardId) {
+    throw new Error('Нельзя завершить Фазу Событий без выбранной карты.');
+  }
+
+  const completedRound = state.meta.currentRound;
+  state.meta.eventPhaseCardId = null;
+  state.meta.eventPhaseEffectStarted = false;
+  state.meta.phase = 'EVENT_PHASE';
+
+  startNewRound(state);
+
+  appendGameLog(state, {
+    type: 'EVENT_PHASE_COMPLETED',
+    round: completedRound,
+  });
+}
+
diff --git a/packages/shared/src/logic/fsm.ts b/packages/shared/src/logic/fsm.ts
index 0c141d4..a4394c9 100644
--- a/packages/shared/src/logic/fsm.ts
+++ b/packages/shared/src/logic/fsm.ts
@@ -17,6 +17,7 @@ import { executeRoomAbility } from './roomAbilities.js';
 import { executeDecision, executeSearch } from './searchActions.js';
 import { requireOpenPath } from './shipGraphQueries.js';
 import { queueActionCompletion } from './actionCompletion.js';
+import { resumeEventPhaseAfterInterrupts } from './eventsPhase.js';
 
 export { EngineError } from './engineErrors.js';
 export type { EngineErrorCode } from './engineErrors.js';
@@ -133,6 +134,7 @@ export class GameEngine {
       validateActor(draft, action, actorId, options);
       handleAction(draft, action, actorId);
       drainInterrupts(draft);
+      resumeEventPhaseAfterInterrupts(draft);
     });
   }
 }
diff --git a/packages/shared/src/logic/hiveDevelopment.test.ts b/packages/shared/src/logic/hiveDevelopment.test.ts
new file mode 100644
index 0000000..38a9d66
--- /dev/null
+++ b/packages/shared/src/logic/hiveDevelopment.test.ts
@@ -0,0 +1,81 @@
+import { describe, expect, it } from 'vitest';
+import { createInitialGameState } from './setup.js';
+import { resolveHiveDevelopment } from './hiveDevelopment.js';
+import { drawFromStream } from '../utils/rng.js';
+
+describe('Hive Development — Step 8', () => {
+  it('draws exactly one token through the bag stream', () => {
+    const state = createInitialGameState('hive-rng');
+    const before = state.meta.rngDraws.bag;
+    const bagBefore = state.intrudersPool.bag.length;
+    resolveHiveDevelopment(state);
+    expect(state.meta.rngDraws.bag).toBe(before + 1);
+    expect(state.intrudersPool.bag.length).toBe(bagBefore);
+  });
+
+  it('removes a Larva and replaces it with an Adult from supply', () => {
+    const state = createInitialGameState('hive-larva');
+    state.intrudersPool.bag = [{ id: 'larva-test', type: 'LARVA', escapeNumber: 1 }];
+    const adultSupplyBefore = state.intrudersPool.supply.filter((t) => t.type === 'ADULT').length;
+    resolveHiveDevelopment(state);
+    expect(state.intrudersPool.deadTokens.some((t) => t.type === 'LARVA')).toBe(true);
+    expect(state.intrudersPool.bag.some((t) => t.type === 'ADULT')).toBe(true);
+    expect(state.intrudersPool.supply.filter((t) => t.type === 'ADULT')).toHaveLength(adultSupplyBefore - 1);
+  });
+
+  it('removes a Creeper and replaces it with a Breeder', () => {
+    const state = createInitialGameState('hive-creeper');
+    state.intrudersPool.bag = [{ id: 'creeper-test', type: 'CREEPER', escapeNumber: 1 }];
+    resolveHiveDevelopment(state);
+    expect(state.intrudersPool.deadTokens.some((t) => t.type === 'CREEPER')).toBe(true);
+    expect(state.intrudersPool.bag.some((t) => t.type === 'BREEDER')).toBe(true);
+  });
+
+  it('returns an Adult and queues noise for non-combat living players in order', () => {
+    const state = createInitialGameState('hive-adult');
+    state.intrudersPool.bag = [{ id: 'adult-test', type: 'ADULT', escapeNumber: 2 }];
+    state.players['player-1']!.orderNumber = 2;
+    state.players['player-2']!.orderNumber = 1;
+    state.meta.firstPlayerId = 'player-2';
+    state.players['player-2']!.roomId = 6;
+    const room = state.ship.rooms[state.players['player-1']!.roomId]!;
+    room.occupantPlayerIds = ['player-1'];
+    state.ship.rooms[6]!.occupantPlayerIds = ['player-2'];
+    resolveHiveDevelopment(state);
+    expect(state.interruptQueue.map((i) => i.playerId)).toEqual(['player-2', 'player-1']);
+    expect(state.intrudersPool.bag).toHaveLength(1);
+  });
+
+  it('Queen in an explored Hive places a Queen and queues CALL Contact', () => {
+    const state = createInitialGameState('hive-queen');
+    const nest = Object.values(state.ship.rooms).find((room) => room.definitionId === 'NEST')!;
+    nest.isExplored = true;
+    state.players['player-1']!.roomId = nest.id;
+    nest.occupantPlayerIds = ['player-1'];
+    state.intrudersPool.bag = [{ id: 'queen-test', type: 'QUEEN', escapeNumber: 4 }];
+    resolveHiveDevelopment(state);
+    expect(state.intrudersPool.boardTokens.some((i) => i.type === 'QUEEN' && i.roomId === nest.id)).toBe(true);
+    expect(state.interruptQueue[0]).toEqual({ type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: nest.id, source: 'CALL' });
+  });
+
+  it('Queen without characters adds at most one egg up to 8', () => {
+    const state = createInitialGameState('hive-egg');
+    const nest = Object.values(state.ship.rooms).find((room) => room.definitionId === 'NEST')!;
+    nest.isExplored = true;
+    state.intrudersPool.eggsOnBoard = 7;
+    state.intrudersPool.bag = [{ id: 'queen-test', type: 'QUEEN', escapeNumber: 4 }];
+    resolveHiveDevelopment(state);
+    expect(state.intrudersPool.eggsOnBoard).toBe(8);
+    expect(state.intrudersPool.boardTokens).toHaveLength(0);
+    expect(state.intrudersPool.bag).toHaveLength(1);
+  });
+
+  it('Blank returns to the bag and adds an Adult when available', () => {
+    const state = createInitialGameState('hive-blank');
+    state.intrudersPool.bag = [{ id: 'blank-test', type: 'BLANK', escapeNumber: 0 }];
+    resolveHiveDevelopment(state);
+    expect(state.intrudersPool.deadTokens).toHaveLength(0);
+    expect(state.intrudersPool.bag.some((t) => t.type === 'BLANK')).toBe(true);
+    expect(state.intrudersPool.bag.some((t) => t.type === 'ADULT')).toBe(true);
+  });
+});
diff --git a/packages/shared/src/logic/hiveDevelopment.ts b/packages/shared/src/logic/hiveDevelopment.ts
new file mode 100644
index 0000000..0db2118
--- /dev/null
+++ b/packages/shared/src/logic/hiveDevelopment.ts
@@ -0,0 +1,189 @@
+import type { IntruderToken, IntruderType } from '../types/entities.js';
+import type { GameState } from '../types/state.js';
+import type { InterruptEvent } from '../types/interrupts.js';
+import { drawFromStream } from '../utils/rng.js';
+import { appendGameLog } from './gameLog.js';
+import { EngineError } from './engineErrors.js';
+import { livingPlayersInRoom, placeIntruder } from './intruderPlacement.js';
+
+const MAX_HIVE_EGGS = 8;
+
+function orderedLivingPlayers(state: GameState) {
+  const players = Object.values(state.players)
+    .filter((player) => !player.isDead && !player.isInHibernation && !player.hasEscapedInPod);
+  const firstOrder = state.players[state.meta.firstPlayerId]?.orderNumber ?? 0;
+  const distance = (order: number) => (order - firstOrder + players.length) % players.length;
+  return players.sort((a, b) => distance(a.orderNumber) - distance(b.orderNumber));
+}
+
+function isPlayerInCombat(state: GameState, playerId: string): boolean {
+  const player = state.players[playerId];
+  if (!player) return false;
+  return (state.ship.rooms[player.roomId]?.occupantIntruderIds.length ?? 0) > 0;
+}
+
+function takeFromSupplyToBag(state: GameState, type: IntruderType): boolean {
+  const index = state.intrudersPool.supply.findIndex((token) => token.type === type);
+  if (index < 0) return false;
+  const [token] = state.intrudersPool.supply.splice(index, 1);
+  if (!token) return false;
+  state.intrudersPool.bag.push(token);
+  return true;
+}
+
+function removeDrawnTokenFromPool(state: GameState, token: IntruderToken): void {
+  if (token.type === 'BLANK') {
+    state.intrudersPool.bag.push(token);
+    return;
+  }
+
+  state.intrudersPool.deadTokens.push(token);
+}
+
+function returnDrawnTokenToBag(state: GameState, token: IntruderToken): void {
+  state.intrudersPool.bag.push(token);
+}
+
+function drawIntruderToken(state: GameState): IntruderToken {
+  if (state.intrudersPool.bag.length === 0) {
+    throw new EngineError('EMPTY_INTRUDER_BAG', 'Развитие Улья не может вытянуть жетон: Пул Чужих пуст.');
+  }
+
+  const value = drawFromStream(state.meta.seed, 'bag', state.meta.rngDraws.bag);
+  state.meta.rngDraws.bag += 1;
+  const index = Math.floor(value * state.intrudersPool.bag.length);
+  const token = state.intrudersPool.bag.splice(index, 1)[0];
+  if (!token) throw new EngineError('EMPTY_INTRUDER_BAG', 'Не удалось получить жетон Чужого из Пула.');
+  return token;
+}
+
+function queueNoiseRollsForEligiblePlayers(state: GameState): void {
+  const interrupts: InterruptEvent[] = orderedLivingPlayers(state)
+    .filter((player) => !isPlayerInCombat(state, player.id))
+    .map((player) => ({
+      type: 'NOISE_ROLL_INTERRUPT' as const,
+      playerId: player.id,
+      roomId: player.roomId,
+      noise: { kind: 'ROLL' as const },
+    }));
+
+  state.interruptQueue.push(...interrupts);
+}
+
+function resolveQueen(state: GameState): 'QUEEN_CONTACT' | 'EGG_ADDED' | 'EGG_LIMIT_REACHED' {
+  const nest = Object.values(state.ship.rooms).find((room) => room.definitionId === 'NEST');
+  if (!nest || !nest.isExplored) {
+    if (state.intrudersPool.eggsOnBoard < MAX_HIVE_EGGS) {
+      state.intrudersPool.eggsOnBoard += 1;
+      return 'EGG_ADDED';
+    }
+    return 'EGG_LIMIT_REACHED';
+  }
+
+  const targetIds = new Set(livingPlayersInRoom(state, nest.id));
+  const targets = orderedLivingPlayers(state).filter((player) => targetIds.has(player.id));
+
+  if (targets.length === 0) {
+    if (state.intrudersPool.eggsOnBoard < MAX_HIVE_EGGS) {
+      state.intrudersPool.eggsOnBoard += 1;
+      return 'EGG_ADDED';
+    }
+    return 'EGG_LIMIT_REACHED';
+  }
+
+  const target = targets[0]!;
+  // Queen placed in the Hive first, then Contact is queued. `CALL` deliberately
+  // suppresses Surprise Attack: this is the explicit Queen-contact rule, not Noise.
+  const queen = placeIntruder(state, 'QUEEN', nest.id);
+  state.interruptQueue.unshift({
+    type: 'CONTACT_INTERRUPT',
+    playerId: target.id,
+    roomId: nest.id,
+    source: 'CALL',
+  });
+
+  appendGameLog(state, {
+    type: 'HIVE_DEVELOPMENT_QUEEN_PLACED',
+    roomId: nest.id,
+    intruderId: queen.id,
+    playerId: target.id,
+  });
+
+  return 'QUEEN_CONTACT';
+}
+
+/**
+ * Шаг 8 Фазы Событий: развитие Улья.
+ *
+ * Ровно один жетон извлекается из `bag`-потока RNG. Все последующие эффекты
+ * детерминированы состоянием поля; дополнительные случайные обращения здесь
+ * запрещены, чтобы не сдвигать последовательность мешка.
+ */
+export function resolveHiveDevelopment(state: GameState): void {
+  const token = drawIntruderToken(state);
+
+  switch (token.type) {
+    case 'LARVA': {
+      removeDrawnTokenFromPool(state, token);
+      const replaced = takeFromSupplyToBag(state, 'ADULT');
+      appendGameLog(state, {
+        type: 'HIVE_DEVELOPMENT_RESOLVED',
+        tokenType: token.type,
+        outcome: replaced ? 'REMOVED_AND_ADULT_ADDED' : 'REMOVED_ADULT_UNAVAILABLE',
+      });
+      return;
+    }
+
+    case 'CREEPER': {
+      removeDrawnTokenFromPool(state, token);
+      const replaced = takeFromSupplyToBag(state, 'BREEDER');
+      appendGameLog(state, {
+        type: 'HIVE_DEVELOPMENT_RESOLVED',
+        tokenType: token.type,
+        outcome: replaced ? 'REMOVED_AND_BREEDER_ADDED' : 'REMOVED_BREEDER_UNAVAILABLE',
+      });
+      return;
+    }
+
+    case 'ADULT':
+    case 'BREEDER': {
+      returnDrawnTokenToBag(state, token);
+      const eligible = orderedLivingPlayers(state).filter((player) => !isPlayerInCombat(state, player.id));
+      queueNoiseRollsForEligiblePlayers(state);
+      appendGameLog(state, {
+        type: 'HIVE_DEVELOPMENT_RESOLVED',
+        tokenType: token.type,
+        outcome: 'NOISE_FOR_NON_COMBAT_PLAYERS',
+        playerIds: eligible.map((player) => player.id),
+      });
+      return;
+    }
+
+    case 'QUEEN': {
+      const outcome = resolveQueen(state);
+      returnDrawnTokenToBag(state, token);
+      appendGameLog(state, {
+        type: 'HIVE_DEVELOPMENT_RESOLVED',
+        tokenType: token.type,
+        outcome,
+      });
+      return;
+    }
+
+    case 'BLANK': {
+      returnDrawnTokenToBag(state, token);
+      const replaced = takeFromSupplyToBag(state, 'ADULT');
+      appendGameLog(state, {
+        type: 'HIVE_DEVELOPMENT_RESOLVED',
+        tokenType: token.type,
+        outcome: replaced ? 'BLANK_RETURNED_AND_ADULT_ADDED' : 'BLANK_RETURNED_ADULT_UNAVAILABLE',
+      });
+      return;
+    }
+
+    default: {
+      const exhaustive: never = token.type;
+      throw new EngineError('INTRUDER_TOKEN_NOT_IN_SUPPLY', `Неизвестный тип жетона ${String(exhaustive)}.`);
+    }
+  }
+}
diff --git a/packages/shared/src/logic/intruderAttacks.ts b/packages/shared/src/logic/intruderAttacks.ts
index 12105dc..d929a18 100644
--- a/packages/shared/src/logic/intruderAttacks.ts
+++ b/packages/shared/src/logic/intruderAttacks.ts
@@ -73,7 +73,10 @@ function applyAttackEffect(
 }
 
 /** Общее тело события об атаке Чужого — Внезапная атака и Побег различаются только `type`. */
-export type AttackLogPayload = Omit<Extract<IntruderLogEvent, { type: 'SURPRISE_ATTACK_RESOLVED' }>, 'type'>;
+export type AttackLogPayload = Omit<
+  Extract<IntruderLogEvent, { type: 'SURPRISE_ATTACK_RESOLVED' }>,
+  'type'
+>;
 
 /**
  * Ядро Атаки Чужого (стр. 20): подавление Зовом, Личинка-инфицирование либо
diff --git a/packages/shared/src/logic/intruderMovement.ts b/packages/shared/src/logic/intruderMovement.ts
new file mode 100644
index 0000000..14c2199
--- /dev/null
+++ b/packages/shared/src/logic/intruderMovement.ts
@@ -0,0 +1,219 @@
+import type { EventCard } from '../types/cards.js';
+import type { IntruderType } from '../types/entities.js';
+import type { CorridorConnection, CorridorNumber, RoomId } from '../types/rooms.js';
+import type { GameState } from '../types/state.js';
+import { drawSharedCard } from './cardPiles.js';
+import { appendGameLog } from './gameLog.js';
+import { livingPlayersInRoom, removeIntruder, requireIntruder, returnTokenToBag } from './intruderPlacement.js';
+import { corridorNumbersOf, corridorsLeadingInto, findNoiseTarget } from './shipGraphQueries.js';
+import { EngineError } from './engineErrors.js';
+
+export interface IntruderMovementResult {
+  eventCard: EventCard;
+  movedIntruderIds: string[];
+  blockedIntruderIds: string[];
+  technicalCorridorIntruderIds: string[];
+}
+
+function isCorridorNumber(value: EventCard['corridorNumber']): value is CorridorNumber {
+  return value === 1 || value === 2 || value === 3 || value === 4;
+}
+
+function matchesEventCard(eventCard: EventCard, type: IntruderType): boolean {
+  return eventCard.intruderTypes.includes(type);
+}
+
+function activeIntrudersAtStart(state: GameState, eventCard: EventCard): string[] {
+  return state.intrudersPool.boardTokens
+    .filter((intruder) => matchesEventCard(eventCard, intruder.type))
+    .filter((intruder) => livingPlayersInRoom(state, intruder.roomId).length === 0)
+    .map((intruder) => intruder.id);
+}
+
+function findMovementCorridor(
+  state: GameState,
+  roomId: RoomId,
+  direction: CorridorNumber,
+): CorridorConnection | null {
+  return corridorsLeadingInto(state, roomId).find((corridor) => corridorNumbersOf(corridor, roomId).includes(direction)) ?? null;
+}
+
+function returnIntruderToTechnicalCorridors(state: GameState, intruderId: string): void {
+  const intruder = requireIntruder(state, intruderId);
+  const type = intruder.type;
+  intruder.woundsCount = 0;
+  removeIntruder(state, intruderId);
+  if (!returnTokenToBag(state, type)) {
+    throw new EngineError(
+      'INTRUDER_TOKEN_NOT_IN_SUPPLY',
+      `Жетон ${type} для Чужого ${intruderId}, ушедшего в Технические Коридоры, отсутствует в запасе.`,
+    );
+  }
+}
+
+function moveIntruderToRoom(state: GameState, intruderId: string, toRoomId: RoomId): void {
+  const intruder = requireIntruder(state, intruderId);
+  const type = intruder.type;
+  const woundsCount = intruder.woundsCount;
+  const fromRoomId = intruder.roomId;
+
+  const destination = state.ship.rooms[toRoomId];
+  if (!destination) {
+    throw new EngineError('UNKNOWN_ROOM', `Отсек ${toRoomId} не существует.`);
+  }
+
+  const source = state.ship.rooms[fromRoomId];
+  if (!source) {
+    throw new EngineError('UNKNOWN_ROOM', `Отсек ${fromRoomId} не существует.`);
+  }
+
+  source.occupantIntruderIds = source.occupantIntruderIds.filter((id) => id !== intruderId);
+  destination.occupantIntruderIds.push(intruderId);
+  intruder.roomId = toRoomId;
+  intruder.type = type;
+  intruder.woundsCount = woundsCount;
+}
+
+/**
+ * Шаг 7а Фазы Событий.
+ *
+ * Карта События выбирается один раз за Фазу и сохраняется в `meta.eventPhaseCardId`.
+ * Сама карта переносится в публичный сброс сразу после выбора: следующий Шаг 7б
+ * сможет найти её по ID, не вытягивая другую карту и не ломая lifecycle карт.
+ */
+export function drawEventPhaseCard(state: GameState): EventCard {
+  if (state.meta.eventPhaseCardId) {
+    const existing = state.decks.events.discard.find((card) => card.id === state.meta.eventPhaseCardId);
+    if (!existing) {
+      throw new EngineError('EVENT_PHASE_CARD_MISSING', `Карта События ${state.meta.eventPhaseCardId} отсутствует в сбросе.`);
+    }
+    return existing;
+  }
+
+  const card = drawSharedCard(state, state.decks.events, 'События');
+  state.decks.events.discard.push(card);
+  state.meta.eventPhaseCardId = card.id;
+  return card;
+}
+
+export function getPendingEventPhaseCard(state: GameState): EventCard {
+  if (!state.meta.eventPhaseCardId) {
+    throw new EngineError('EVENT_PHASE_CARD_NOT_SELECTED', 'Для текущей Фазы Событий ещё не выбрана карта.');
+  }
+
+  const card = state.decks.events.discard.find((candidate) => candidate.id === state.meta.eventPhaseCardId);
+  if (!card) {
+    throw new EngineError('EVENT_PHASE_CARD_MISSING', `Карта События ${state.meta.eventPhaseCardId} отсутствует в сбросе.`);
+  }
+  return card;
+}
+
+/**
+ * Разрешает движение всех соответствующих Чужих ровно один раз.
+ * Список кандидатов фиксируется до первого перемещения, поэтому Чужой,
+ * вошедший в новый отсек, не может тут же пройти второй Коридор по той же карте.
+ */
+export function resolveIntruderMovement(state: GameState, eventCard = drawEventPhaseCard(state)): IntruderMovementResult {
+  if (!isCorridorNumber(eventCard.corridorNumber)) {
+    return { eventCard, movedIntruderIds: [], blockedIntruderIds: [], technicalCorridorIntruderIds: [] };
+  }
+
+  const direction = eventCard.corridorNumber;
+  const candidates = activeIntrudersAtStart(state, eventCard);
+  const movedIntruderIds: string[] = [];
+  const blockedIntruderIds: string[] = [];
+  const technicalCorridorIntruderIds: string[] = [];
+  const processed = new Set<string>();
+
+  // Группируем по исходному отсеку: закрытая Дверь разрушается один раз,
+  // даже если через неё одновременно пытаются пройти несколько Чужих.
+  const byRoom = new Map<RoomId, string[]>();
+  for (const intruderId of candidates) {
+    const intruder = requireIntruder(state, intruderId);
+    const ids = byRoom.get(intruder.roomId) ?? [];
+    ids.push(intruderId);
+    byRoom.set(intruder.roomId, ids);
+  }
+
+  for (const [roomId, roomIntruderIds] of byRoom) {
+    const eligible = roomIntruderIds.filter((id) => !processed.has(id) && state.intrudersPool.boardTokens.some((intruder) => intruder.id === id));
+    if (eligible.length === 0) continue;
+
+    // Технический вход имеет приоритет над обычным коридором с тем же номером:
+    // это соответствует общей топологии `findNoiseTarget` и карте поля.
+    const noiseTarget = findNoiseTarget(state, roomId, direction);
+    if (noiseTarget.kind === 'TECHNICAL_CORRIDOR') {
+      for (const intruderId of eligible) {
+        const intruder = requireIntruder(state, intruderId);
+        const fromRoomId = intruder.roomId;
+        returnIntruderToTechnicalCorridors(state, intruderId);
+        processed.add(intruderId);
+        technicalCorridorIntruderIds.push(intruderId);
+        appendGameLog(state, {
+          type: 'INTRUDER_MOVED',
+          intruderId,
+          intruderType: intruder.type,
+          fromRoomId,
+          toRoomId: null,
+          corridorId: null,
+          corridorNumber: direction,
+          outcome: 'TECHNICAL_CORRIDOR',
+          eventCardId: eventCard.id,
+        });
+      }
+      continue;
+    }
+
+    const corridor = findMovementCorridor(state, roomId, direction);
+    if (!corridor) {
+      // Нет соответствующего выхода: Чужие остаются на месте.
+      for (const intruderId of eligible) processed.add(intruderId);
+      continue;
+    }
+
+    const toRoomId = corridor.fromRoomId === roomId ? corridor.toRoomId : corridor.fromRoomId;
+
+    if (corridor.doorState === 'CLOSED') {
+      corridor.doorState = 'DESTROYED';
+      blockedIntruderIds.push(...eligible);
+      for (const intruderId of eligible) processed.add(intruderId);
+      appendGameLog(state, {
+        type: 'INTRUDERS_BLOCKED_BY_DOOR',
+        intruderIds: [...eligible],
+        corridorId: corridor.id,
+      });
+      continue;
+    }
+
+    for (const intruderId of eligible) {
+      const intruder = requireIntruder(state, intruderId);
+      const fromRoomId = intruder.roomId;
+      const intruderType = intruder.type;
+      moveIntruderToRoom(state, intruderId, toRoomId);
+      processed.add(intruderId);
+      movedIntruderIds.push(intruderId);
+
+      appendGameLog(state, {
+        type: 'INTRUDER_MOVED',
+        intruderId,
+        intruderType,
+        fromRoomId,
+        toRoomId,
+        corridorId: corridor.id,
+        corridorNumber: direction,
+        outcome: 'MOVED',
+        eventCardId: eventCard.id,
+      });
+    }
+  }
+
+  return { eventCard, movedIntruderIds, blockedIntruderIds, technicalCorridorIntruderIds };
+}
+
+/**
+ * Завершение карты События после Шага 7б. На Шаге 6 только фиксируем выбранную
+ * карту и оставляем Фазу Событий открытой для следующего движка эффектов.
+ */
+export function clearPendingEventPhaseCard(state: GameState): void {
+  state.meta.eventPhaseCardId = null;
+}
diff --git a/packages/shared/src/logic/intruderRetreat.test.ts b/packages/shared/src/logic/intruderRetreat.test.ts
new file mode 100644
index 0000000..bd34cc3
--- /dev/null
+++ b/packages/shared/src/logic/intruderRetreat.test.ts
@@ -0,0 +1,122 @@
+import { describe, expect, it } from 'vitest';
+import { EVENT_CARDS } from '../data/eventCards.js';
+import { createInitialGameState } from './setup.js';
+import { placeIntruder } from './intruderPlacement.js';
+import { resolveIntruderRetreat } from './intruderRetreat.js';
+import type { EventCard } from '../types/cards.js';
+import type { GameState } from '../types/state.js';
+
+function retreatState(roomId = 11): { state: GameState; intruderId: string } {
+  const state = createInitialGameState('retreat-contract');
+  const intruder = placeIntruder(state, 'ADULT', roomId);
+  intruder.woundsCount = 2;
+  return { state, intruderId: intruder.id };
+}
+
+function setEventTop(state: GameState, eventCard: EventCard): void {
+  state.decks.events.drawPile = [
+    structuredClone(eventCard),
+    ...state.decks.events.drawPile.filter((card) => card.id !== eventCard.id),
+  ];
+}
+
+describe('Intruder Retreat: Шаг 2 v0.5.0', () => {
+  it('перемещает Чужого по номеру коридора, сохраняя накопленные Раны', () => {
+    const { state, intruderId } = retreatState(11);
+    const event = EVENT_CARDS.find((card) => card.corridorNumber === 1)!;
+    setEventTop(state, event);
+
+    const result = resolveIntruderRetreat(state, intruderId);
+
+    expect(result.outcome).toBe('MOVED');
+    expect(result.direction).toBe(1);
+    expect(result.toRoomId).toBe(15);
+    expect(state.ship.rooms[11]!.occupantIntruderIds).toEqual([]);
+    expect(state.ship.rooms[15]!.occupantIntruderIds).toEqual([intruderId]);
+    expect(state.intrudersPool.boardTokens.find((intruder) => intruder.id === intruderId)?.woundsCount).toBe(2);
+    expect(state.decks.events.discard.at(-1)?.id).toBe(event.id);
+  });
+
+  it('закрытая Дверь становится Разрушенной, но Чужой остаётся в исходном отсеке', () => {
+    const { state, intruderId } = retreatState(11);
+    state.ship.corridors['11-15']!.doorState = 'CLOSED';
+    const event = EVENT_CARDS.find((card) => card.corridorNumber === 1)!;
+    setEventTop(state, event);
+
+    const result = resolveIntruderRetreat(state, intruderId);
+
+    expect(result.outcome).toBe('DOOR_DESTROYED');
+    expect(state.ship.corridors['11-15']!.doorState).toBe('DESTROYED');
+    expect(state.ship.rooms[11]!.occupantIntruderIds).toEqual([intruderId]);
+    expect(state.ship.rooms[15]!.occupantIntruderIds).toEqual([]);
+  });
+
+  it('направление в Технические коридоры снимает миниатюру с поля, сбрасывает Раны и возвращает жетон в мешок', () => {
+    const { state, intruderId } = retreatState(15);
+    const event = EVENT_CARDS.find((card) => card.corridorNumber === 4)!;
+    setEventTop(state, event);
+    const supplyBefore = state.intrudersPool.supply.length;
+    const bagBefore = state.intrudersPool.bag.filter((token) => token.type === 'ADULT').length;
+
+    const result = resolveIntruderRetreat(state, intruderId);
+
+    expect(result.outcome).toBe('TECHNICAL_CORRIDOR');
+    expect(state.intrudersPool.boardTokens).toEqual([]);
+    expect(state.ship.rooms[15]!.occupantIntruderIds).toEqual([]);
+    expect(state.intrudersPool.supply).toHaveLength(supplyBefore - 1);
+    expect(state.intrudersPool.bag.filter((token) => token.type === 'ADULT')).toHaveLength(bagBefore + 1);
+    expect(state.gameLog.at(-1)?.event).toMatchObject({
+      type: 'INTRUDER_RETREATED',
+      intruderId,
+      outcome: 'TECHNICAL_CORRIDOR',
+      direction: 4,
+    });
+  });
+
+  it('если в отсеке нет выхода с указанным номером, Чужой остаётся на месте', () => {
+    const { state, intruderId } = retreatState(11);
+    const event = EVENT_CARDS.find((card) => card.corridorNumber === 3)!;
+    setEventTop(state, event);
+
+    const result = resolveIntruderRetreat(state, intruderId);
+
+    expect(result.outcome).toBe('NO_CORRIDOR');
+    expect(state.ship.rooms[11]!.occupantIntruderIds).toEqual([intruderId]);
+    expect(state.intrudersPool.boardTokens.find((intruder) => intruder.id === intruderId)?.woundsCount).toBe(2);
+  });
+
+  it('при пустой колоде сначала перетасовывает сброс потоком cards', () => {
+    const { state, intruderId } = retreatState(11);
+    const events = EVENT_CARDS.filter((card) => card.corridorNumber === 1).slice(0, 2);
+    state.decks.events = { drawPile: [], discard: structuredClone(events) };
+    const cardsBefore = state.meta.rngDraws.cards;
+
+    const result = resolveIntruderRetreat(state, intruderId);
+
+    expect(events.map((card) => card.id)).toContain(result.eventCard.id);
+    expect(state.meta.rngDraws.cards).toBeGreaterThan(cardsBefore);
+    expect(state.decks.events.discard).toHaveLength(1);
+  });
+
+  it('не исполняет текстовый эффект карты События', () => {
+    const { state, intruderId } = retreatState(11);
+    const event = EVENT_CARDS.find((card) => card.effect === 'OPEN_SECTIONS')!;
+    setEventTop(state, event);
+    state.ship.corridors['11-14']!.doorState = 'CLOSED';
+    const beforeUnrelatedDoor = state.ship.corridors['11-14']!.doorState;
+
+    resolveIntruderRetreat(state, intruderId);
+
+    expect(state.ship.corridors['11-14']!.doorState).toBe(beforeUnrelatedDoor);
+  });
+
+  it('одинаковый seed и одинаковое состояние дают одинаковое направление и результат', () => {
+    const a = retreatState(11);
+    const b = retreatState(11);
+    const event = EVENT_CARDS.find((card) => card.corridorNumber === 1)!;
+    setEventTop(a.state, event);
+    setEventTop(b.state, event);
+    expect(resolveIntruderRetreat(a.state, a.intruderId)).toEqual(resolveIntruderRetreat(b.state, b.intruderId));
+  });
+
+});
diff --git a/packages/shared/src/logic/intruderRetreat.ts b/packages/shared/src/logic/intruderRetreat.ts
new file mode 100644
index 0000000..fe02ac8
--- /dev/null
+++ b/packages/shared/src/logic/intruderRetreat.ts
@@ -0,0 +1,200 @@
+import type { EventCard } from '../types/cards.js';
+import type { CorridorNumber, RoomId } from '../types/rooms.js';
+import type { GameState } from '../types/state.js';
+import { drawSharedCard } from './cardPiles.js';
+import { EngineError } from './engineErrors.js';
+import { appendGameLog } from './gameLog.js';
+import { findNoiseTarget, corridorNumbersOf } from './shipGraphQueries.js';
+import { removeIntruder, requireIntruder, returnTokenToBag } from './intruderPlacement.js';
+
+export type IntruderRetreatOutcome =
+  | 'MOVED'
+  | 'DOOR_DESTROYED'
+  | 'TECHNICAL_CORRIDOR'
+  | 'NO_CORRIDOR';
+
+export interface IntruderRetreatResult {
+  eventCard: EventCard;
+  fromRoomId: RoomId;
+  toRoomId: RoomId | null;
+  corridorId: string | null;
+  direction: CorridorNumber | null;
+  outcome: IntruderRetreatOutcome;
+}
+
+/**
+ * Разрешает Отступление одного Чужого по верхней карте Событий.
+ *
+ * Карта События здесь используется исключительно как указатель направления:
+ * её текстовый эффект никогда не исполняется. После выбора направления карта
+ * немедленно уходит в публичный сброс. Если draw pile пуст, drawSharedCard
+ * сначала детерминированно перетасовывает discard через поток `cards`.
+ */
+export function resolveIntruderRetreat(state: GameState, intruderId: string): IntruderRetreatResult {
+  const intruder = requireIntruder(state, intruderId);
+  const fromRoomId = intruder.roomId;
+  const eventCard = drawSharedCard(state, state.decks.events, 'События');
+  const direction = isCorridorNumber(eventCard.corridorNumber) ? eventCard.corridorNumber : null;
+
+  // В процедуре Отступления карта всегда просто сбрасывается. Даже карты,
+  // которые при обычной Фазе Событий имеют специальный lifecycle, здесь не
+  // исполняются и не удаляются из игры.
+  state.decks.events.discard.push(eventCard);
+
+  if (direction === null) {
+    appendGameLog(state, {
+      type: 'INTRUDER_RETREATED',
+      intruderId,
+      intruderType: intruder.type,
+      fromRoomId,
+      toRoomId: null,
+      corridorId: null,
+      direction: null,
+      outcome: 'NO_CORRIDOR',
+      eventCardId: eventCard.id,
+    });
+    return {
+      eventCard,
+      fromRoomId,
+      toRoomId: null,
+      corridorId: null,
+      direction: null,
+      outcome: 'NO_CORRIDOR',
+    };
+  }
+
+  const target = findRetreatTarget(state, fromRoomId, direction);
+
+  if (target.kind === 'TECHNICAL_CORRIDOR') {
+    // До появления отдельного узла Технических коридоров (Шаг 3) состояние
+    // хранит Чужого вне корабельных комнат: миниатюра снимается с поля,
+    // накопленные Раны сбрасываются, жетон возвращается в Пул.
+    intruder.woundsCount = 0;
+    removeIntruder(state, intruderId);
+    if (!returnTokenToBag(state, intruder.type)) {
+      throw new EngineError(
+        'INTRUDER_TOKEN_NOT_IN_SUPPLY',
+        `Жетон ${intruder.type} для отступившего Чужого ${intruderId} отсутствует в запасе.`,
+      );
+    }
+
+    appendGameLog(state, {
+      type: 'INTRUDER_RETREATED',
+      intruderId,
+      intruderType: intruder.type,
+      fromRoomId,
+      toRoomId: null,
+      corridorId: null,
+      direction,
+      outcome: 'TECHNICAL_CORRIDOR',
+      eventCardId: eventCard.id,
+    });
+    return {
+      eventCard,
+      fromRoomId,
+      toRoomId: null,
+      corridorId: null,
+      direction,
+      outcome: 'TECHNICAL_CORRIDOR',
+    };
+  }
+
+  if (target.kind === 'NONE') {
+    appendGameLog(state, {
+      type: 'INTRUDER_RETREATED',
+      intruderId,
+      intruderType: intruder.type,
+      fromRoomId,
+      toRoomId: null,
+      corridorId: null,
+      direction,
+      outcome: 'NO_CORRIDOR',
+      eventCardId: eventCard.id,
+    });
+    return {
+      eventCard,
+      fromRoomId,
+      toRoomId: null,
+      corridorId: null,
+      direction,
+      outcome: 'NO_CORRIDOR',
+    };
+  }
+
+  const { corridor, toRoomId } = target;
+
+  if (corridor.doorState === 'CLOSED') {
+    corridor.doorState = 'DESTROYED';
+    appendGameLog(state, {
+      type: 'INTRUDER_RETREATED',
+      intruderId,
+      intruderType: intruder.type,
+      fromRoomId,
+      toRoomId: null,
+      corridorId: corridor.id,
+      direction,
+      outcome: 'DOOR_DESTROYED',
+      eventCardId: eventCard.id,
+    });
+    return {
+      eventCard,
+      fromRoomId,
+      toRoomId: null,
+      corridorId: corridor.id,
+      direction,
+      outcome: 'DOOR_DESTROYED',
+    };
+  }
+
+  const type = intruder.type;
+  removeIntruder(state, intruderId);
+  const moved = {
+    id: intruder.id,
+    type,
+    roomId: toRoomId,
+    woundsCount: intruder.woundsCount,
+  };
+  state.intrudersPool.boardTokens.push(moved);
+  state.ship.rooms[toRoomId]!.occupantIntruderIds.push(moved.id);
+
+  appendGameLog(state, {
+    type: 'INTRUDER_RETREATED',
+    intruderId,
+    intruderType: type,
+    fromRoomId,
+    toRoomId,
+    corridorId: corridor.id,
+    direction,
+    outcome: 'MOVED',
+    eventCardId: eventCard.id,
+  });
+
+  return {
+    eventCard,
+    fromRoomId,
+    toRoomId,
+    corridorId: corridor.id,
+    direction,
+    outcome: 'MOVED',
+  };
+}
+
+type RetreatTarget =
+  | { kind: 'TECHNICAL_CORRIDOR' }
+  | { kind: 'NONE' }
+  | { kind: 'CORRIDOR'; corridor: GameState['ship']['corridors'][string]; toRoomId: RoomId };
+
+function findRetreatTarget(state: GameState, roomId: RoomId, direction: CorridorNumber): RetreatTarget {
+  const noiseTarget = findNoiseTarget(state, roomId, direction);
+  if (noiseTarget.kind === 'TECHNICAL_CORRIDOR') return { kind: 'TECHNICAL_CORRIDOR' };
+  if (noiseTarget.kind === 'UNMAPPED') return { kind: 'NONE' };
+
+  const corridor = noiseTarget.corridor;
+  const toRoomId = corridor.fromRoomId === roomId ? corridor.toRoomId : corridor.fromRoomId;
+  if (!corridorNumbersOf(corridor, roomId).includes(direction)) return { kind: 'NONE' };
+  return { kind: 'CORRIDOR', corridor, toRoomId };
+}
+
+function isCorridorNumber(value: EventCard['corridorNumber']): value is CorridorNumber {
+  return value === 1 || value === 2 || value === 3 || value === 4;
+}
diff --git a/packages/shared/src/logic/melee.test.ts b/packages/shared/src/logic/melee.test.ts
index e35d838..d26819b 100644
--- a/packages/shared/src/logic/melee.test.ts
+++ b/packages/shared/src/logic/melee.test.ts
@@ -230,19 +230,16 @@ describe('Проверка Результата Атаки (стр. 20) в ру
     expect(next.intrudersPool.boardTokens[0]!.woundsCount).toBe(1);
   });
 
-  it('стрелка Отступления на карте выжившего: EMPTY_EVENT_DECK и полный откат', () => {
+  it('стрелка Отступления разрешается картой События и не откатывает действие', () => {
     forceCombatDie('ONE_WOUND');
-    const state = combatReady('melee-retreat', 'ADULT');
+    const state = combatReady('retreat-via-event', 'ADULT');
+    const event = state.decks.events.drawPile.find((card) => card.corridorNumber === 1)!;
+    state.decks.events.drawPile = [event, ...state.decks.events.drawPile.filter((card) => card.id !== event.id)];
     deckTop(state, [SCRATCH_1]);
-    const snapshot = structuredClone(state);
-    try {
-      melee(state);
-      expect.unreachable('ожидался отказ');
-    } catch (error) {
-      expect((error as { code: string }).code).toBe('EMPTY_EVENT_DECK');
-    }
-    // Полный откат: заражение, оплата, Раны и чтения колод не сохранились.
-    expect(state).toEqual(snapshot);
+
+    const next = melee(state);
+    expect(next.gameLog.some((entry) => entry.event.type === 'INTRUDER_RETREATED')).toBe(true);
+    expect(next.decks.events.discard.some((card) => card.id === event.id)).toBe(true);
   });
 
   it('перетасовка из сброса читает поток cards', () => {
diff --git a/packages/shared/src/logic/release_v0_5_0.test.ts b/packages/shared/src/logic/release_v0_5_0.test.ts
new file mode 100644
index 0000000..8ca4be3
--- /dev/null
+++ b/packages/shared/src/logic/release_v0_5_0.test.ts
@@ -0,0 +1,26 @@
+import { describe, expect, it } from 'vitest';
+import { createInitialGameState, filterStateForPlayer } from '../index.js';
+import { GameEngine } from './fsm.js';
+
+describe('v0.5.0 release loop and sanitizer boundary', () => {
+  it('closes a real player-pass → event-phase → next-round loop', () => {
+    const engine = new GameEngine();
+    const first = createInitialGameState('release-0.5.0', { playerCount: 2 });
+    const afterFirstPass = engine.processAction(first, { type: 'ACTION_PASS', payload: {} });
+    const afterSecondPass = engine.processAction(afterFirstPass, { type: 'ACTION_PASS', payload: {} });
+    expect(afterSecondPass.meta.currentRound).toBe(2);
+    expect(afterSecondPass.meta.phase).toBe('PLAYER_PHASE');
+    expect(afterSecondPass.meta.eventPhaseCardId).toBeNull();
+    expect(afterSecondPass.gameLog.some((entry) => entry.event.type === 'EVENT_PHASE_STARTED')).toBe(true);
+    expect(afterSecondPass.gameLog.some((entry) => entry.event.type === 'EVENT_PHASE_COMPLETED')).toBe(true);
+  });
+
+  it('does not expose hidden engine data through the client view', () => {
+    const state = createInitialGameState('sanitizer-release');
+    const view = filterStateForPlayer(state, 'player-1');
+    expect(JSON.stringify(view)).not.toContain('masterSeed');
+    expect(JSON.stringify(view)).not.toContain('privateObjective');
+    expect(JSON.stringify(view)).not.toContain('internalRngState');
+    expect(view.ship.technicalCorridorNoise).toBe(state.ship.technicalCorridorNoise);
+  });
+});
diff --git a/packages/shared/src/logic/sanitizer.test.ts b/packages/shared/src/logic/sanitizer.test.ts
index f44e89a..54ac375 100644
--- a/packages/shared/src/logic/sanitizer.test.ts
+++ b/packages/shared/src/logic/sanitizer.test.ts
@@ -413,8 +413,8 @@ describe('filterStateForPlayer: колоды корабля (Э2-5)', () => {
       discard: [itemCard('red-discard-1')],
     };
     state.decks.events = {
-      drawPile: [{ id: 'event-draw-1', name: 'Событие', description: '' }],
-      discard: [{ id: 'event-discard-1', name: 'Событие', description: '' }],
+      drawPile: [{ id: 'event-draw-1', name: 'Событие', description: '', effect: 'HUNT', corridorNumber: 1, intruderTypes: [], isDestroyedOnResolve: false, isReshuffledIntoDeck: false }],
+      discard: [{ id: 'event-discard-1', name: 'Событие', description: '', effect: 'HUNT', corridorNumber: 1, intruderTypes: [], isDestroyedOnResolve: false, isReshuffledIntoDeck: false }],
     } as never;
 
     const view = filterStateForPlayer(state, VIEWER);
diff --git a/packages/shared/src/logic/searchActions.ts b/packages/shared/src/logic/searchActions.ts
index cffdd76..57ae50c 100644
--- a/packages/shared/src/logic/searchActions.ts
+++ b/packages/shared/src/logic/searchActions.ts
@@ -10,6 +10,7 @@ import type { ItemDeckColor } from '../types/cards.js';
 import type { PendingDecision } from '../types/decisions.js';
 import { EngineError } from './engineErrors.js';
 import { allocateEntityId } from './stateIds.js';
+import { resumeEventPhaseAfterInterrupts } from './eventsPhase.js';
 
 export function executeSearch(
   state: GameState,
@@ -84,6 +85,7 @@ export function executeDecision(
     player.objectives = [selected];
     state.pendingDecision = null;
     appendGameLog(state, { type: 'OBJECTIVE_CHOSEN', playerId: actorId });
+    resumeEventPhaseAfterInterrupts(state);
     return;
   }
   if (decision.type === 'CHOOSE_WHITE_ROOM_DECK') {
diff --git a/packages/shared/src/logic/setup.test.ts b/packages/shared/src/logic/setup.test.ts
index af8ab99..2dd0e25 100644
--- a/packages/shared/src/logic/setup.test.ts
+++ b/packages/shared/src/logic/setup.test.ts
@@ -319,7 +319,8 @@ describe('createInitialGameState: колоды партии', () => {
     expect(seriousWounds.discard).toEqual([]);
 
     expect(weaknesses).toEqual({ drawPile: [], discard: [] });
-    expect(events).toEqual({ drawPile: [], discard: [] });
+    expect(events.drawPile).toHaveLength(20);
+    expect(events.discard).toEqual([]);
     expect(intruderAttacks.drawPile).toHaveLength(20);
     expect(intruderAttacks.discard).toEqual([]);
     expect(objectives.personal).toEqual({ drawPile: [], discard: [] });
diff --git a/packages/shared/src/logic/setup.ts b/packages/shared/src/logic/setup.ts
index befab5a..ac09267 100644
--- a/packages/shared/src/logic/setup.ts
+++ b/packages/shared/src/logic/setup.ts
@@ -325,6 +325,9 @@ export function createInitialGameState(seed: string = DEFAULT_SEED, options: Ini
 
       rngDraws,
       gameOverReason: null,
+      eventPhaseCardId: null,
+      eventPhaseEffectStarted: false,
+      eventPhaseHiveDevelopmentStarted: false,
     },
 
     ship: {
diff --git a/packages/shared/src/logic/shoot.test.ts b/packages/shared/src/logic/shoot.test.ts
index aaebdec..fe68adb 100644
--- a/packages/shared/src/logic/shoot.test.ts
+++ b/packages/shared/src/logic/shoot.test.ts
@@ -238,17 +238,19 @@ describe('Стрельба: оплата, боезапас и бросок (ст
   });
 });
 
-describe('Отступление: только карта События (стр. 20; ревью 0.4.0)', () => {
-  it('стрелка Отступления на карте Стойкости отклоняет выстрел целиком (EMPTY_EVENT_DECK)', () => {
+describe('Отступление: только карта События (стр. 20)', () => {
+  it('стрелка Отступления берёт направление из карты События и сбрасывает её без эффекта', () => {
     const state = combatReady('shoot-retreat');
     forceCombatDie('ONE_WOUND');
-    deckTop(state, [INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_SCRATCH_1')!]); // Стойкость 2, Отступление
-    const snapshot = structuredClone(state);
+    deckTop(state, [INTRUDER_ATTACK_CARDS.find((card) => card.id === 'IAT_SCRATCH_1')!]);
+    const event = state.decks.events.drawPile.find((card) => card.corridorNumber === 1)!;
+    state.decks.events.drawPile = [event, ...state.decks.events.drawPile.filter((card) => card.id !== event.id)];
 
-    expectEngineError(() => shoot(state), 'EMPTY_EVENT_DECK');
-
-    // Транзакция откатывается: состояние битом выстрела не искажается.
-    expect(state).toEqual(snapshot);
+    const next = shoot(state);
+    expect(next.decks.events.discard.map((card) => card.id)).toContain(event.id);
+    expect(next.gameLog.some((entry) => entry.event.type === 'INTRUDER_RETREATED')).toBe(true);
+    expect(next.ship.corridors['11-15']!.doorState).toBe('OPEN');
+    expect(next.ship.rooms[15]!.occupantIntruderIds).toHaveLength(1);
   });
 });
 
diff --git a/packages/shared/src/logic/shoot.ts b/packages/shared/src/logic/shoot.ts
index fc52783..484163e 100644
--- a/packages/shared/src/logic/shoot.ts
+++ b/packages/shared/src/logic/shoot.ts
@@ -13,6 +13,7 @@ import { placeIntruderRemains, removeIntruder, requireIntruder } from './intrude
 import { isWeaknessRevealed } from './weaknesses.js';
 import { queueActionCompletion } from './actionCompletion.js';
 import { allocateEntityId } from './stateIds.js';
+import { resolveIntruderRetreat } from './intruderRetreat.js';
 
 /**
  * Базовое действие «Стрельба» [1] (стр. 19; символ действия на стр. 714
@@ -147,16 +148,7 @@ export function checkInjuryResult(
   }
 
   if (toughnessCards.some((card) => card.hasRetreat)) {
-    // Направление Отступления определяет карта События (стр. 20; замечание
-    // ревью 0.4.0: подмена карты События соседним отсеком, d4 или броском
-    // не завершает процедуру). Колода Событий пуста до Фазы Событий
-    // (этап 0.5.0), поэтому выстрел, требующий Отступления, отклоняется
-    // целиком: Immer откатывает всю транзакцию — Боезапас, оплата, Раны и
-    // чтение колод не сохраняются, выдуманного исхода нет.
-    throw new EngineError(
-      'EMPTY_EVENT_DECK',
-      'Отступление Чужого требует карту События для направления (стр. 20). Колода Событий пуста — Фаза Событий появится в этапе 0.5.0. Действие отменено целиком.',
-    );
+    resolveIntruderRetreat(state, intruderId);
   }
 
   return { toughnessCards, toughnessTotal, killed: false };
diff --git a/packages/shared/src/logic/turnCycle.test.ts b/packages/shared/src/logic/turnCycle.test.ts
index c9156bd..9d27c25 100644
--- a/packages/shared/src/logic/turnCycle.test.ts
+++ b/packages/shared/src/logic/turnCycle.test.ts
@@ -136,7 +136,7 @@ describe('Цикл микроходов и порядок игроков (v0.3.0
     expect(state.gameLog.some((e) => e.event.type === 'FIRE_DAMAGE_TAKEN')).toBe(true);
   });
 
-  it('при общем пасе всех игроков автоматически пропускает нереализованную фазу событий и начинает новый раунд', () => {
+  it('при общем пасе всех игроков запускает Фазу Событий и начинает новый раунд', () => {
     const engine = new GameEngine();
     const state = createInitialGameState('test-turn-all-pass', { playerCount: 2 });
 
@@ -147,7 +147,8 @@ describe('Цикл микроходов и порядок игроков (v0.3.0
     // Автоматический переход к новому раунду
     expect(s2.meta.phase).toBe('PLAYER_PHASE');
     expect(s2.meta.currentRound).toBe(2);
-    expect(s2.gameLog.some((e) => e.event.type === 'EVENT_PHASE_SKIPPED')).toBe(true);
+    expect(s2.gameLog.some((e) => e.event.type === 'EVENT_PHASE_STARTED')).toBe(true);
+    expect(s2.gameLog.some((e) => e.event.type === 'EVENT_PHASE_COUNTERS_RESOLVED')).toBe(true);
   });
 
   it('startNewRound корректно начинает новый раунд: сброс паса, передача жетона 1-го игрока и добор', () => {
@@ -161,7 +162,7 @@ describe('Цикл микроходов и порядок игроков (v0.3.0
 
     expect(state.meta.phase).toBe('PLAYER_PHASE');
     expect(state.meta.currentRound).toBe(2);
-    expect(state.meta.timeTrackPosition).toBe(1);
+    expect(state.meta.timeTrackPosition).toBe(0);
     expect(state.meta.firstPlayerId).toBe('player-2');
     expect(state.meta.activePlayerId).toBe('player-2');
     expect(state.players['player-1']?.hasPassed).toBe(false);
diff --git a/packages/shared/src/logic/turnCycle.ts b/packages/shared/src/logic/turnCycle.ts
index e32db0b..3b84173 100644
--- a/packages/shared/src/logic/turnCycle.ts
+++ b/packages/shared/src/logic/turnCycle.ts
@@ -5,6 +5,7 @@ import type { PlayerState } from '../types/entities.js';
 import { appendGameLog } from './gameLog.js';
 import { drawCardsToLimit } from './cardsPayment.js';
 import { EngineError } from './engineErrors.js';
+import { resolveEventPhase } from './eventsPhase.js';
 
 /**
  * Возвращает отсортированный по orderNumber список живых игроков.
@@ -73,13 +74,7 @@ export function advanceTurn(state: GameState, completedPlayerId: string): void {
 
   if (allPassed) {
     state.meta.phase = 'EVENT_PHASE';
-    // В рамках текущей версии Фаза Событий (События, атаки Чужих) находится в разработке (этап v0.5.0).
-    // Чтобы игра не блокировалась, логируем пропуск и автоматически запускаем следующий раунд.
-    appendGameLog(state, {
-      type: 'EVENT_PHASE_SKIPPED',
-      round: state.meta.currentRound,
-    });
-    startNewRound(state);
+    resolveEventPhase(state);
     return;
   }
 
@@ -109,7 +104,6 @@ export function startNewRound(state: GameState): void {
   }
 
   state.meta.currentRound += 1;
-  state.meta.timeTrackPosition += 1;
 
   const players = getOrderedPlayers(state);
   if (players.length > 0) {
diff --git a/packages/shared/src/types/cards.ts b/packages/shared/src/types/cards.ts
index 9fb752a..7045e32 100644
--- a/packages/shared/src/types/cards.ts
+++ b/packages/shared/src/types/cards.ts
@@ -124,8 +124,36 @@ export interface ObjectiveCard extends CardDefinition {
   kind: 'PERSONAL' | 'CORPORATE';
 }
 
-/** Карта Событий: сдвигает Чужих по номерам коридоров и разыгрывает текст (стр. 10). */
-export type EventCard = CardDefinition;
+export type EventEffect =
+  | 'HUNT'
+  | 'HIVE_PROTECTION'
+  | 'BROOD'
+  | 'REGENERATION'
+  | 'HIDDEN'
+  | 'MATURATION'
+  | 'RAMPAGE'
+  | 'PREY_SCENT'
+  | 'TECHNICAL_CORRIDORS_NOISE'
+  | 'HIVE'
+  | 'FLAMMABLE_SOLUTION'
+  | 'CONSUMING_FIRE'
+  | 'DESTRUCTIVE_FIRE'
+  | 'EJECT_ESCAPE_POD'
+  | 'SHORT_CIRCUIT'
+  | 'COOLANT_LEAK'
+  | 'LIFE_SUPPORT_MALFUNCTION'
+  | 'MALFUNCTION'
+  | 'OPEN_SECTIONS'
+  | 'PREPARATION';
+
+/** Карта Событий: направление используется уже на Шаге 2 для Отступления. */
+export interface EventCard extends CardDefinition {
+  effect: EventEffect;
+  corridorNumber: 1 | 2 | 3 | 4 | 'ANY' | null;
+  intruderTypes: readonly IntruderType[];
+  isDestroyedOnResolve: boolean;
+  isReshuffledIntoDeck: boolean;
+}
 
 export type IntruderAttackEffect =
   'SCRATCH' | 'BITE' | 'CLAW_ATTACK' | 'TAIL_ATTACK' | 'TRANSFORMATION' | 'FRENZY' | 'SLIME' | 'CALL';
diff --git a/packages/shared/src/types/contact.ts b/packages/shared/src/types/contact.ts
index d7c877a..1f5dd8a 100644
--- a/packages/shared/src/types/contact.ts
+++ b/packages/shared/src/types/contact.ts
@@ -55,6 +55,41 @@ export type IntruderLogEvent =
       victims: AttackVictimStatus[];
     }
   | { type: 'CONTAMINATION_RECEIVED'; playerId: string }
+  | {
+      /** Атака Чужого в Фазе Событий (стр. 20). */
+      type: 'EVENT_PHASE_ATTACK_RESOLVED';
+      playerId: string;
+      roomId: RoomId;
+      intruderId: string;
+      intruderType: IntruderType;
+      card: IntruderAttackCard | null;
+      outcome: 'HIT' | 'MISS' | 'INFESTATION' | 'SUPPRESSED';
+      victims: AttackVictimStatus[];
+    }
+  | {
+      type: 'EVENT_INTRUDER_EFFECT_MOVED';
+      intruderId: string;
+      intruderType: IntruderType;
+      fromRoomId: RoomId;
+      toRoomId: RoomId;
+    }
+  | {
+      type: 'EVENT_EFFECT_RESOLVED';
+      eventCardId: string;
+      effect: import('./cards.js').EventEffect;
+    }
+  | {
+      /** Отступление по стрелке карты Стойкости: карта События используется только как направление (стр. 20). */
+      type: 'INTRUDER_RETREATED';
+      intruderId: string;
+      intruderType: IntruderType;
+      fromRoomId: RoomId;
+      toRoomId: RoomId | null;
+      corridorId: string | null;
+      direction: 1 | 2 | 3 | 4 | null;
+      outcome: 'MOVED' | 'DOOR_DESTROYED' | 'TECHNICAL_CORRIDOR' | 'NO_CORRIDOR';
+      eventCardId: string;
+    }
   | {
       type: 'SHOOT_RESOLVED';
       playerId: string;
@@ -117,6 +152,18 @@ export type IntruderLogEvent =
   | { type: 'ESCAPE_PODS_UNLOCKED' }
   | { type: 'INTRUDERS_WITHDRAWN'; intruderIds: string[] }
   | { type: 'INTRUDERS_MOVED'; intruderIds: string[]; fromRoomId: RoomId; toRoomId: RoomId }
+  | {
+      /** Успешное автономное движение по карте События (Шаг 7а). */
+      type: 'INTRUDER_MOVED';
+      intruderId: string;
+      intruderType: IntruderType;
+      fromRoomId: RoomId;
+      toRoomId: RoomId | null;
+      corridorId: string | null;
+      corridorNumber: 1 | 2 | 3 | 4 | null;
+      outcome: 'MOVED' | 'TECHNICAL_CORRIDOR';
+      eventCardId: string;
+    }
   | { type: 'INTRUDERS_BLOCKED_BY_DOOR'; intruderIds: string[]; corridorId: string }
   | { type: 'INTRUDER_TRANSFORMED'; intruderId: string; roomId: RoomId };
 
@@ -124,6 +171,6 @@ export type ContactPresentationEvent = Extract<
   IntruderLogEvent,
   {
     type:
-      'CONTACT_OCCURRED' | 'SURPRISE_ATTACK_RESOLVED' | 'ESCAPE_ATTACK_RESOLVED' | 'SHOOT_RESOLVED' | 'MELEE_RESOLVED';
+      'CONTACT_OCCURRED' | 'SURPRISE_ATTACK_RESOLVED' | 'ESCAPE_ATTACK_RESOLVED' | 'EVENT_PHASE_ATTACK_RESOLVED' | 'SHOOT_RESOLVED' | 'MELEE_RESOLVED';
   }
 >;
diff --git a/packages/shared/src/types/log.ts b/packages/shared/src/types/log.ts
index bdd295e..91cb610 100644
--- a/packages/shared/src/types/log.ts
+++ b/packages/shared/src/types/log.ts
@@ -2,6 +2,7 @@ import type { IntruderLogEvent } from './contact.js';
 import type { NoiseDieFace } from '../data/noiseDie.js';
 import type { GameOverReason } from './state.js';
 import type { ExplorationEffect, RoomId, RoomSlotCategory } from './rooms.js';
+import type { IntruderType } from './entities.js';
 
 export type GameLogMovementMode = 'NORMAL' | 'CAREFUL';
 
@@ -138,6 +139,74 @@ export type GameLogEvent =
       playerId: string;
       discardedCount: number;
     }
+  | {
+      type: 'EVENT_PHASE_STARTED';
+      round: number;
+    }
+  | {
+      type: 'EVENT_PHASE_COUNTERS_RESOLVED';
+      round: number;
+      timeTrackPosition: number;
+      selfDestructTrackPosition: number | null;
+    }
+  | {
+      type: 'SELF_DESTRUCT_ADVANCED';
+      round: number;
+      position: number;
+    }
+  | {
+      type: 'FIRE_DAMAGE_TAKEN_BY_INTRUDER';
+      roomId: RoomId;
+      intruderId: string;
+      intruderType: IntruderType;
+      woundsBefore: number;
+      woundsApplied: number;
+      woundsAfter: number | null;
+      killed: boolean;
+    }
+  | {
+      type: 'FIRE_DESTROYED_EGG';
+      roomId: RoomId;
+      objectId: string;
+    }
+  | {
+      type: 'EVENT_PHASE_COMPLETED';
+      round: number;
+    }
+  | {
+      type: 'EVENT_EFFECT_RESOLVED';
+      eventCardId: string;
+      effect: import('./cards.js').EventEffect;
+    }
+  | {
+      type: 'HIVE_DEVELOPMENT_RESOLVED';
+      tokenType: IntruderType | 'BLANK';
+      outcome:
+        | 'REMOVED_AND_ADULT_ADDED'
+        | 'REMOVED_ADULT_UNAVAILABLE'
+        | 'REMOVED_AND_BREEDER_ADDED'
+        | 'REMOVED_BREEDER_UNAVAILABLE'
+        | 'NOISE_FOR_NON_COMBAT_PLAYERS'
+        | 'QUEEN_CONTACT'
+        | 'EGG_ADDED'
+        | 'EGG_LIMIT_REACHED'
+        | 'BLANK_RETURNED_AND_ADULT_ADDED'
+        | 'BLANK_RETURNED_ADULT_UNAVAILABLE';
+      playerIds?: string[];
+    }
+  | {
+      type: 'HIVE_DEVELOPMENT_QUEEN_PLACED';
+      roomId: RoomId;
+      intruderId: string;
+      playerId: string;
+    }
+  | {
+      type: 'EVENT_INTRUDER_EFFECT_MOVED';
+      intruderId: string;
+      intruderType: IntruderType;
+      fromRoomId: RoomId;
+      toRoomId: RoomId;
+    }
   | {
       type: 'EVENT_PHASE_SKIPPED';
       round: number;
diff --git a/packages/shared/src/types/state.ts b/packages/shared/src/types/state.ts
index 1008b52..311fc4e 100644
--- a/packages/shared/src/types/state.ts
+++ b/packages/shared/src/types/state.ts
@@ -7,8 +7,8 @@ import type { GameLogEntry } from './log.js';
 import type { CorridorConnection, RoomId, RoomState } from './rooms.js';
 import type { RngStream } from '../utils/rng.js';
 
-// doc/v0.4.0-step-2.md — совместимость сохранений.
-export const GAME_STATE_SCHEMA_VERSION = 12;
+// doc/v0.5.0-step-6.md — совместимость сохранений.
+export const GAME_STATE_SCHEMA_VERSION = 16;
 
 /**
  * Режим партии (стр. 27 «Игровые Режимы»). Базовая игра полукооперативная:
@@ -18,7 +18,7 @@ export const GAME_STATE_SCHEMA_VERSION = 12;
 export type GameMode = 'SOLO' | 'COOP' | 'SEMI_COOP' | 'INTRUDER_PLAYER';
 
 /** Почему партия окончена: корабль взорвался или обшивка не выдержала (стр. 17). */
-export type GameOverReason = 'SHIP_EXPLODED' | 'HULL_BREACH' | 'NO_ACTIVE_CHARACTERS';
+export type GameOverReason = 'SHIP_EXPLODED' | 'HULL_BREACH' | 'NO_ACTIVE_CHARACTERS' | 'HYPERSPACE_JUMP';
 export type GamePhase = 'PLAYER_PHASE' | 'EVENT_PHASE' | 'GAME_OVER';
 export type Destination = 'EARTH' | 'MARS' | 'DEEP_SPACE_1' | 'DEEP_SPACE_2';
 export type CourseMarker = 'A' | 'B' | 'C' | 'D';
@@ -96,6 +96,12 @@ export interface GameMeta {
    * молчаливым пропуском розыгрыша.
    */
   gameOverReason: GameOverReason | null;
+  /** Карта События, выбранная для текущей Фазы Событий и ожидающая Шага 7б. */
+  eventPhaseCardId: string | null;
+  /** Шаг 7б уже запущен; нужен для идемпотентного возобновления после Interrupt. */
+  eventPhaseEffectStarted: boolean;
+  /** Шаг 8 уже запущен для текущей карты; предотвращает повторное развитие Улья после Interrupt. */
+  eventPhaseHiveDevelopmentStarted?: boolean;
 }
 
 export interface GameState {
-- 
2.49.0.windows.1

