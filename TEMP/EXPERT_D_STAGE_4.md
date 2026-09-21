From 31d2f499581f853a623ead0068df20b626f5866e Mon Sep 17 00:00:00 2001
From: AleksandrRV <9302944+AleksandrRV@users.noreply.github.com>
Date: Mon, 21 Sep 2026 15:17:05 +0000
Subject: [PATCH] =?UTF-8?q?=D0=AD=D1=82=D0=B0=D0=BF=200.4.0=20=C2=AB=D0=9F?=
 =?UTF-8?q?=D1=83=D0=BB=20=D0=A7=D1=83=D0=B6=D0=B8=D1=85,=20=D0=9A=D0=BE?=
 =?UTF-8?q?=D0=BD=D1=82=D0=B0=D0=BA=D1=82=D1=8B=20=D0=B8=20=D0=A2=D0=B0?=
 =?UTF-8?q?=D0=BA=D1=82=D0=B8=D1=87=D0=B5=D1=81=D0=BA=D0=B8=D0=B9=20=D0=91?=
 =?UTF-8?q?=D0=BE=D0=B9=C2=BB=20(=D0=A8=D0=B0=D0=B3=D0=B8=201=E2=80=938,?=
 =?UTF-8?q?=20v0.4.0)?=
MIME-Version: 1.0
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: 8bit

- Шаг 1: модель особи, колода Атак Чужих (20 карт), кубик Боя, поток combat
- Шаг 2: Контакт и Внезапные атаки (все 8 эффектов карт)
- Шаг 3: иконки Чужих на карте, Личинка как легальная цель
- Шаг 4: Стрельба, Стойкость, отступление
- Шаг 5: Рукопашная (Заражение, Травма при промахе)
- Шаг 6: Останки, подбор объектов, Слабости (7/8), Лаборатория
- Шаг 7: Побег из боя (ESCAPE_ATTACK_INTERRUPT, атаки в спину)
- Шаг 8: 5 классовых боевых карт, переброс Прицельного огня,
  аудит санитайзера, сквозной e2e-тест цикла боя

Verify: 43 файла / 615 тестов, прод-билд зелёный.

Co-authored-by: arena-agent <297053741+arena-agent@users.noreply.github.com>
---
 CHANGELOG.md                                  | 159 ++++
 README.md                                     |   4 +-
 doc/game-log.md                               |  25 +-
 doc/project-map.md                            |  25 +-
 doc/roadmap.md                                |  49 +-
 doc/sources/data-sources.json                 | 175 +++-
 package.json                                  |   2 +-
 packages/client/package.json                  |   2 +-
 packages/client/src/App.tsx                   |   5 +
 .../src/components/board/RoomHex.test.tsx     |  65 ++
 .../client/src/components/board/RoomHex.tsx   |  37 +-
 .../src/components/board/ShipMapSVG.tsx       |   2 +
 .../src/components/dev/devPanelModel.ts       |   1 +
 .../hand/CardTargetingForm.test.tsx           | 193 ++++
 .../src/components/hand/CardTargetingForm.tsx | 265 ++++++
 .../src/components/hand/PlayerHandPanel.tsx   |  33 +-
 .../inspector/RoomInspector.test.tsx          | 206 ++++
 .../components/inspector/RoomInspector.tsx    | 173 +++-
 .../src/components/log/gameLogModel.test.ts   | 413 ++++++++
 .../client/src/components/log/gameLogModel.ts | 232 ++++-
 .../components/modals/CombatResultView.tsx    |  88 ++
 .../components/modals/ContactModal.test.tsx   | 151 +++
 .../src/components/modals/ContactModal.tsx    | 136 +++
 .../components/modals/DecisionModal.test.tsx  |  31 +
 .../src/components/modals/DecisionModal.tsx   |  36 +-
 .../src/components/modals/MeleeModal.test.tsx | 139 +++
 .../src/components/modals/MeleeModal.tsx      | 162 ++++
 .../src/components/modals/ShootModal.test.tsx | 215 +++++
 .../src/components/modals/ShootModal.tsx      | 213 +++++
 .../components/modals/contactModalModel.ts    |  46 +
 packages/client/src/store/gameStore.test.ts   |  15 +
 packages/client/src/store/gameStore.ts        |  21 +-
 packages/client/src/utils/labels.ts           |  44 +-
 .../client/src/utils/roomIntruders.test.ts    |  38 +
 packages/client/src/utils/roomIntruders.ts    |  19 +
 packages/shared/package.json                  |   2 +-
 packages/shared/src/data/cards.test.ts        |  37 +
 packages/shared/src/data/cardsSetup.ts        |   3 +-
 packages/shared/src/data/combatDie.test.ts    |  30 +
 packages/shared/src/data/combatDie.ts         |  18 +
 packages/shared/src/data/intruderAttacks.ts   | 170 ++++
 .../shared/src/data/sources.golden.test.ts    |  63 ++
 .../shared/src/data/weaknessCards.test.ts     |  18 +
 packages/shared/src/data/weaknessCards.ts     |  51 +
 packages/shared/src/index.test.ts             |  29 +
 packages/shared/src/index.ts                  |   6 +
 packages/shared/src/logic/combat.test.ts      | 891 ++++++++++++++++++
 packages/shared/src/logic/combat.ts           | 463 +++++++++
 packages/shared/src/logic/contact.test.ts     | 856 +++++++++++++++++
 packages/shared/src/logic/contact.ts          | 658 +++++++++++++
 packages/shared/src/logic/fsm.test.ts         | 612 +++++++++++-
 packages/shared/src/logic/fsm.ts              | 470 ++++++++-
 packages/shared/src/logic/objects.test.ts     | 163 ++++
 packages/shared/src/logic/objects.ts          |  71 ++
 .../shared/src/logic/roomAbilities.test.ts    |  61 ++
 packages/shared/src/logic/roomAbilities.ts    |  26 +-
 packages/shared/src/logic/sanitizer.test.ts   |  80 ++
 packages/shared/src/logic/setup.party.test.ts |  12 +-
 packages/shared/src/logic/setup.test.ts       |  59 +-
 packages/shared/src/logic/setup.ts            |  24 +-
 packages/shared/src/types/actions.ts          |  24 +
 packages/shared/src/types/cards.ts            |   9 +-
 packages/shared/src/types/decisions.ts        |  10 +
 packages/shared/src/types/entities.ts         |   6 +-
 packages/shared/src/types/interrupts.ts       |   5 +
 packages/shared/src/types/log.ts              | 142 ++-
 packages/shared/src/types/state.ts            |  11 +-
 67 files changed, 8341 insertions(+), 159 deletions(-)
 create mode 100644 packages/client/src/components/board/RoomHex.test.tsx
 create mode 100644 packages/client/src/components/hand/CardTargetingForm.test.tsx
 create mode 100644 packages/client/src/components/hand/CardTargetingForm.tsx
 create mode 100644 packages/client/src/components/inspector/RoomInspector.test.tsx
 create mode 100644 packages/client/src/components/modals/CombatResultView.tsx
 create mode 100644 packages/client/src/components/modals/ContactModal.test.tsx
 create mode 100644 packages/client/src/components/modals/ContactModal.tsx
 create mode 100644 packages/client/src/components/modals/DecisionModal.test.tsx
 create mode 100644 packages/client/src/components/modals/MeleeModal.test.tsx
 create mode 100644 packages/client/src/components/modals/MeleeModal.tsx
 create mode 100644 packages/client/src/components/modals/ShootModal.test.tsx
 create mode 100644 packages/client/src/components/modals/ShootModal.tsx
 create mode 100644 packages/client/src/components/modals/contactModalModel.ts
 create mode 100644 packages/client/src/utils/roomIntruders.test.ts
 create mode 100644 packages/client/src/utils/roomIntruders.ts
 create mode 100644 packages/shared/src/data/combatDie.test.ts
 create mode 100644 packages/shared/src/data/combatDie.ts
 create mode 100644 packages/shared/src/data/intruderAttacks.ts
 create mode 100644 packages/shared/src/data/weaknessCards.test.ts
 create mode 100644 packages/shared/src/data/weaknessCards.ts
 create mode 100644 packages/shared/src/logic/combat.test.ts
 create mode 100644 packages/shared/src/logic/combat.ts
 create mode 100644 packages/shared/src/logic/contact.test.ts
 create mode 100644 packages/shared/src/logic/contact.ts
 create mode 100644 packages/shared/src/logic/objects.test.ts
 create mode 100644 packages/shared/src/logic/objects.ts

diff --git a/CHANGELOG.md b/CHANGELOG.md
index 23434b5..24b847b 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -3,6 +3,165 @@
 Формат — по версиям пакета (`package.json`): патч закрывает дефекты и честность среза,
 минор — новые механики. Версия показывается в HUD и подставляется сборкой из `package.json`.
 
+## 0.4.0 — 2026-09-21
+
+Этап 0.4.0 «Пул Чужих, Контакты и Тактический Бой» завершён (Шаги 1–8). Шаг 8: классовые боевые карты, аудит защиты информации, сквозная интеграция.
+
+### Добавлено
+
+- **Классовые боевые карты (`fsm.ts`, `combat.ts`)**: все 5 эффектов через `ACTION_PLAY_CARD` — «Стрельба очередью» (весь боезапас Винтовки, +1 Рана за каждые 2 ед. поверх кубика), «Прицельный огонь» (выстрел + решение `CHOOSE_AIMED_REROLL` с видимой первой гранью), «Заградительный огонь» / «Огонь на подавление» (1 боезапас, увод себя и/или другого без Атак Чужих), «Адреналин» (выстрел или настоящий Побег + добор карты). Принятые решения: первая грань переброса видна только стрелку; «другой» и цель — в том же отсеке; боезапас увода — из первого заряженного оружия в руках.
+- **Выстрел по частям (`combat.ts`)**: `performShoot` разложен на бросок (`drawCombatFace`) и применение (`applyShootFace`) — переброс и бонусы без дублирования; движение/Побег переиспользуются через `startMoveOrEscape`.
+- **UI**: наведение боевых карт в подтверждении розыгрыша (цель, оружие, отсек, кого увести, режим Адреналина) с блокировкой неполного выбора; модалка переброса «Оставить / Перебросить».
+- **Тесты**: 4 (очередь) + 13 (карты и решения) + сквозной цикл «шум → Контакт → очередь с убийством → Останки → Побег»; цензура колоды Атак и приватность переброса.
+
+### Защита информации
+
+- Аудит пройден: порядок колоды Атак и мешка скрыт (числа и состав), сбросы Атак открыты, журнал хранит только свершившиеся факты (грани, попадания, раны), чужие решения невидимы.
+
+### Исправлено
+
+- Формулировки плана: цензура мешка (состав открыт по книге) и файлы интеграционных тестов (по принадлежности механики).
+
+## 0.2.18 — 2026-09-21
+
+Шаг 7 этапа 0.4.0: Побег из боя — выход из отсека с Чужими разыгрывает внеочередную атаку каждой особи:
+
+### Добавлено
+
+- **Прерывание (`fsm.ts`, `contact.ts`)**: `ACTION_MOVE` из отсека с Чужими кладёт в очередь `ESCAPE_ATTACK_INTERRUPT` (тип из объявленного контракта); обработчик разыгрывает атаки снимка и, если персонаж выжил, завершает шаг с обычным броском Шума.
+- **Общая процедура (`contact.ts`)**: `resolveEscapeAttacks` + выделенное ядро `resolveIntruderAttackOnPlayer` — та же Атака Чужих, что при Внезапной (стр. 20); событие `ESCAPE_ATTACK_RESOLVED` на каждую особь. Личинка заражает без карты, «Зов» и «Трансформация» не дают лишних атак.
+- **Гибель в Побеге**: перемещения и Шума нет, Труп остаётся в отсеке, ход закрывает `settleDeadActivePlayer`.
+- **UI**: подтверждение «В отсеке находятся Чужие! … Бежать?» с кнопками «Бежать [цена: 1]» / «Отмена», статическое предупреждение «Побег: Чужие в отсеке атакуют в спину!»; урон отступления виден в журнале (`ESCAPE_ATTACK_RESOLVED`: мимо/раны/заражение/гибель).
+- **Тесты**: промах и попадание, очередь атак, гибель без перемещения и Шума, Личинка без карты, «Зов», «Трансформация», цепочка прерывания, форматы журнала и предупреждение инспектора.
+
+### Исправлено
+
+- Имя прерывания в плане (`INTRUDER_ATTACK_INTERRUPT`) приведено к объявленному контракту: `ESCAPE_ATTACK_INTERRUPT`.
+
+## 0.2.17 — 2026-09-21
+
+Шаг 6 этапа 0.4.0: гибель Чужих оставляет Останки, Тяжёлые Объекты подбираются, Лаборатория раскрывает Слабости:
+
+### Добавлено
+
+- **Останки (`combat.ts`)**: гибель Чужого выкладывает на пол `INTRUDER_REMAINS` с типом погибшего — от любого, кроме Личинки (стр. 22); id уникальны при повторной гибели того же жетона.
+- **Подбор (`packages/shared/src/logic/objects.ts`)**: действие `ACTION_PICK_UP_OBJECT` [1] — Труп, Останки или Яйцо с пола своего отсека в свободный слот руки; событие `OBJECT_PICKED_UP`.
+- **Слабости (`packages/shared/src/data/weaknessCards.ts`, `setup.ts`)**: 7 карт из doc/data/INTRUDERS.md §6, сетап раздаёт 3 случайные рубашкой вверх потоком `layout`.
+- **Лаборатория (`roomAbilities.ts`)**: изученный объект остаётся на полу (стр. 22), в журнал пишется имя раскрытой Слабости; пустой слот отклоняется явной ошибкой вместо молчания.
+- **UI**: кнопка «Поднять [цена: 1]» у объектов на полу (когда игрок в отсеке); общие подписи `HEAVY_OBJECT_LABELS`.
+- **Тесты**: Останки (типы, Личинка, Королева без яйца, уникальность id), подбор (условия, цикл гибель→подбор, оплата), раздача слабостей, Лаборатория, форматы журнала и инспектор.
+
+### Исправлено
+
+- Пункт плана про яйцо за Королеву приведён к книге: такого правила нет (все 5 жетонов Яиц — для Улья), Королева оставляет только Останки.
+- Указание шага в ошибке Огнемёта: механика огня — этап 0.5.0, а не Шаг 6.
+
+### Известные ограничения
+
+- Восьмая карта Слабости отсутствует в транскрипте (книга говорит о 8) — будет добавлена с её текстом.
+- Эффекты раскрытых Слабостей движок пока не применяет (будущий этап за пределами 0.4.0).
+
+## 0.2.16 — 2026-09-21
+
+Шаг 5 этапа 0.4.0: базовое действие «Рукопашная Атака» [1] — отчаянная атака без патронов с гарантированной ценой:
+
+### Добавлено
+
+- **Рукопашная (`packages/shared/src/logic/combat.ts`, `fsm.ts`)**:
+  - Действие `ACTION_MELEE`: цель в том же отсеке, оплата 1 картой Действия; оружие и патроны не требуются.
+  - Порядок по книге (стр. 19): сначала 1 Заражение в сброс, затем бросок кубика Боя через поток `combat`.
+  - Маппинг граней: [++] наносит лишь 1 Рану; Хвост и Силуэты по невосприимчивому типу — промах.
+  - Промах наносит атакующему 1 Тяжёлую Травму (может убить — следом идёт `PLAYER_DIED`); попадание — Раны и общая со стрельбой проверка Стойкости.
+  - Событие журнала `MELEE_ATTACKED`: грань, Раны, Заражение и Травма.
+- **Модалка «Рукопашная атака» (`MeleeModal.tsx`)**: бейджи «+1 Заражение» и «Риск Тяжёлой Травмы при промахе», выбор цели, результат из журнала; кнопка «Рукопашная атака [цена: 1]» с бейджами в действиях инспектора.
+- **Общий `CombatResultView.tsx`**: результат боя для обеих модалок (бросок, цена, Стойкость, гибель/отступление Чужого, гибель атакующего).
+- **Тесты**: 31 тест рукопашной (матрица граней, иммунитет-как-промах, порядок Заражения, исчерпание колод, смертельная Травма, оплата), форматы журнала и модалка.
+
+## 0.2.15 — 2026-09-21
+
+Шаг 4 этапа 0.4.0: базовое действие «Стрельба» [1] — выстрел, кубик Боя, проверка Стойкости, гибель и отступление Чужих:
+
+### Добавлено
+
+- **Стрельба (`packages/shared/src/logic/combat.ts`, `fsm.ts`)**:
+  - Действие `ACTION_SHOOT`: цель в том же отсеке, оружие в руке с ≥1 Боезапаса, оплата 1 картой Действия; сброс 1 Боезапаса и бросок кубика Боя через поток `combat`.
+  - Маппинг граней по типу цели (стр. 18): Хвост — только Личинка/Крипер, Силуэты — все, кроме Трутня/Королевы, [1]/[2] Раны — любому.
+  - Особые свойства оружия (стр. 22): Пистолет и Револьвер ([2 Раны] → 1), Обрез (Силуэты — промах), Дробовик и Боевая винтовка (+1 Рана), Огнемёт (минимум 1 Рана, кроме Промаха).
+  - Проверка Стойкости: Личинка гибнет от любой Раны без карты; Крипер/Взрослая — 1 карта; Трутень/Королева — 2 карты с суммой; стрелка Отступления перекрывает смерть.
+  - События журнала: `SHOT_FIRED`, `TOUGHNESS_CHECKED`, `INTRUDER_KILLED`, `INTRUDER_RETREATED`.
+- **Модалка «Стрельба» (`ShootModal.tsx`)**: выбор оружия и цели, показ броска, карт Стойкости и исхода; кнопка «Стрельба [цена: 1]» в действиях инспектора при нахождении в Бою.
+- **Тесты**: 53 теста боя (матрица граней × типы × оружие, Стойкость, отступление, оплата и счётчик действий), форматы журнала и модалка.
+
+### Промежуточные правила (заменятся позже)
+
+- **Отступление без колоды Событий**: по книге направление задаёт карта События (стр. 18), но колода появится в 0.5.0 — до тех пор направление выбирает поток `combat` среди соседних отсеков через открытые Двери; вентиляция исключена, без открытых дверей Чужой остаётся на месте и выживает.
+- **Огнемёт при [2 Ранах]** требует маркера Пожара (этап 0.5.0: урон от огня резолвится в Фазе Событий): такой выстрел отклоняется ошибкой `SHOOT_FIRE_NOT_IMPLEMENTED`.
+- **Останки** убитых Чужих не выкладываются (Шаг 6): жетоны уходят в `deadTokens`.
+
+### Исправлено
+
+- Сетап выдавал оружие ссылкой на общий объект данных: выстрелы одной партии тратили боезапас всех следующих. Теперь каждая партия получает независимую копию.
+
+## 0.2.14 — 2026-09-21
+
+Шаг 3 этапа 0.4.0: Чужие видны на карте и в инспекторе отсека. Поведение движка не менялось — привязка монстров к отсекам, статус Боя и передача Чужих в срез уже были реализованы ранее:
+
+### Добавлено
+
+- **Значки Чужих на карте (`RoomHex.tsx`, `ShipMapSVG.tsx`)**:
+  - Под гексом отсека — значок каждой особи цветом типа: зелёная Личинка, жёлтый Крипер, красная Взрослая Особь, бордовый Трутень, фиолетовая Королева.
+  - Счётчик полученных ран на значке и подсказка с типом и числом ран.
+- **Блок «Чужие в отсеке» в инспекторе (`RoomInspector.tsx`)**: строка каждой особи с типом цветом миниатюры и шкалой полученных ран.
+- **Селектор `roomIntruders` (`utils/roomIntruders.ts`)**: карта и инспектор разрешают id отсека в сущности Чужих одним способом.
+- **Тесты**: срез передаёт монстров исследованного отсека и их раны; селектор, значки карты и блок инспектора покрыты клиентскими тестами.
+
+### Исправлено
+
+- Пункт плана про Личинку приведён к книге правил: Личинка ставится миниатюрой в отсек, а заражает через свою Внезапную атаку без карты — код Шага 2 уже следует книге, изменений не потребовалось.
+
+## 0.2.13 — 2026-09-21
+
+Шаг 2 этапа 0.4.0: Контакт и Внезапная атака разыгрываются движком, в интерфейсе — модалка «КОНТАКТ!»:
+
+### Добавлено
+
+- **Контакт (`packages/shared/src/logic/contact.ts`, `fsm.ts`)**:
+  - Второй маркер Шума в Коридоре или вентиляции ставит в очередь `CONTACT_INTERRUPT` вместо ошибки `CONTACT_NOT_IMPLEMENTED`.
+  - Сброс всех маркеров Шума из Коридоров отсека и вентиляции, вытягивание жетона из мешка.
+  - Пустой жетон возвращается в мешок (ретасование потоком `bag`) и шумит во все Коридоры отсека; последний жетон в мешке добавляет Взрослую Особь из запаса.
+  - Монстр появляется в отсеке с отложенным жетоном (`IntruderEntity.token`); Внезапная атака — при числе карт на руке строго меньше числа Бегства.
+  - Первый Контакт партии помечается флагом `isFirstContact` (заготовка сброса Целей).
+- **Внезапная атака (`SURPRISE_ATTACK_INTERRUPT`)**:
+  - Разбор всех 8 эффектов колоды Атак: Царапина, Укус, Атака когтями, Атака хвостом, Трансформация (с цепочкой при пустой руке), Ярость, Слизь, Зов; промах без символа атакующего.
+  - Личинка заражает без карты: уходит с поля на планшет (`PlayerState.hasLarva`), +1 Заражение.
+  - Раны и смерть: третья Лёгкая Травма превращается в Тяжёлую, четвёртая Травма при трёх Тяжёлых убивает; в отсеке остаются Труп и сброшенные Тяжёлые Объекты.
+  - Гибель активного игрока завершает его ход; гибель всех персонажей завершает партию (`ALL_PLAYERS_DEAD`).
+  - Пустые колоды Атак, Заражения и Травм тасуются из сброса потоком `combat`; двойное дно — явные ошибки.
+- **Журнал**: события `CONTACT_OCCURRED`, `SURPRISE_ATTACK_TRIGGERED`, `SURPRISE_ATTACK_RESOLVED`, `INTRUDER_TRANSFORMED`, `INTRUDER_CALLED`, `PLAYER_DIED`, причина Шума `BLANK`; версия схемы состояния — **5** (старые сохранения не восстанавливаются).
+- **Интерфейс**:
+  - Модалка «КОНТАКТ!» (`ContactModal.tsx`): жетон, число Бегства, баннер первого Контакта, баннеры исхода Внезапной атаки; закрытие запоминается в сторе.
+  - Русские сообщения и подсветка новых событий в журнале.
+
+### Изменено
+
+- Завершение партии в журнале различает взрыв корабля, разрыв обшивки и гибель всех персонажей.
+
+## 0.2.12 — 2026-09-21
+
+Шаг 1 этапа 0.4.0: контракт данных Чужих, колода Атак Чужих и кубик Боя. Только ядро правил, изменений интерфейса нет:
+
+### Добавлено
+
+- **Колода Атак Чужих (`packages/shared/src/data/intruderAttacks.ts`)**:
+  - Тип карты расширен: стойкость (`toughness`), стрелка Отступления (`hasRetreat`), символы атакующих типов (`attackerTypes`).
+  - 20 карт: Царапина ×4, Укус ×4, Атака когтями ×4, Атака хвостом ×2, Трансформация ×2, Ярость ×2, Слизь ×1, Зов ×1.
+  - Колода тасуется при подготовке партии через поток `cards`; порядок воспроизводится по сиду.
+- **Кубик Боя (`packages/shared/src/data/combatDie.ts`)**:
+  - Грани `CombatDieFace`: Промах ×2, Хвост, Силуэты, 1 Рана, 2 Раны.
+  - Бросок `rollCombatDie` через детерминированный RNG-поток `combat`.
+- **Модель особи Чужого**: существующий `IntruderEntity` (`id`, `type`, `roomId`, `woundsCount`) покрывает контракт шага, изменений не потребовалось.
+- **Пакет источника и golden-тесты**: таблицы `combat-die` и `intruder-attacks` в `doc/sources/data-sources.json` со статусом `EXTERNAL_UNVERIFIED` (состав граней и карт читается только с физических компонентов, сверки не было); тесты сверяют код с пакетом.
+
 ## 0.2.11 — 2026-09-18
 
 Окно подробной информации о карте, встроенный интерфейс подтверждения действий карт без системных алертов, полная интеграция и использование предметов, обязательный выбор роли при старте новой игры:
diff --git a/README.md b/README.md
index 20c2e4c..7b1f757 100644
--- a/README.md
+++ b/README.md
@@ -6,7 +6,7 @@
 
 Проект написан на TypeScript как два пакета: правила живут в общем ядре, а интерфейс общается с ним только действиями игрока и получает **отфильтрованное** состояние — то, что персонаж действительно может знать.
 
-**Текущая версия: 0.2.8** — её же показывает HUD приложения: строка версии живёт в `package.json` и подставляется сборкой, а не правится в двух местах. История изменений — в [CHANGELOG](CHANGELOG.md), разбор ревизии 0.1.9 — в [doc/review-0.1.9.md](doc/review-0.1.9.md), план исправлений — в [doc/fix-plan-0.1.9.md](doc/fix-plan-0.1.9.md).
+**Текущая версия: 0.4.0** — её же показывает HUD приложения: строка версии живёт в `package.json` и подставляется сборкой, а не правится в двух местах. История изменений — в [CHANGELOG](CHANGELOG.md), разбор ревизии 0.1.9 — в [doc/review-0.1.9.md](doc/review-0.1.9.md), план исправлений — в [doc/fix-plan-0.1.9.md](doc/fix-plan-0.1.9.md).
 
 ## Что уже работает
 
@@ -57,7 +57,7 @@ npm run dev   # dev-сервер Vite: http://localhost:5173
 ## Ограничения
 
 - **Состава колод в репозитории нет.** Карты предметов, события, травмы, цели и Слабости описаны структурой, но не наполнены данными: их перечни — охраняемые материалы, и в проект они попадут только в виде собственных таблиц проекта. Пока не реализованы поиск, создание предметов, бой и цели.
-- **Пул Чужих, Контакт и бой — этап 4 дорожной карты.** Мешок Чужих тасуется и его состав виден в срезе, но вытягивание жетонов и Внезапная атака ещё не разыгрываются: если маркер Шума должен лечь в Коридор, где уже есть маркер (это и есть Контакт), действие отклоняется явной ошибкой.
+- **Контакт, Внезапная атака и Чужие на поле (этап 4, шаги 1–3).** Второй маркер Шума вытягивает жетон из мешка, ставит Чужого в отсек и при нехватке карт на руке атакует; интерфейс показывает модалку «КОНТАКТ!», значки Чужих на карте и блок «Чужие в отсеке» в инспекторе. Бой (стрельба, рукопашная), Побег и Фаза Событий — следующие шаги этапа.
 - **Данные поля ещё сверяются с физическими компонентами.** Пул жетонов Исследования (20 жетонов, 44 предмета) и жетоны Чужих пришли из внешних переписей компонентов и подтверждений владельца проекта, но не из фото в репозитории; топология Коридоров и номера выходов читаются только с поля и не сверялись, поэтому парные Коридоры пока описаны одной связью. Все эти места помечены в [`doc/sources/data-sources.json`](doc/sources/data-sources.json) статусами `EXTERNAL_UNVERIFIED` и `UNVERIFIED_BOARD` со списком `unverified`; пока сверки нет, бросок Шума на номер, которого нет среди выходов отсека, разыгрывается как «Тишина».
 - **Интерфейс ведёт одного персонажа.** Стол готовится на 1–5 игроков, но сетевой партии и смены активного игрока в UI ещё нет (этапы 10–11 дорожной карты).
 - Реализованные механики соответствуют книге правил; номера страниц в комментариях («стр. 14») — это ссылки-ориентиры.
diff --git a/doc/game-log.md b/doc/game-log.md
index ebeb752..6918862 100644
--- a/doc/game-log.md
+++ b/doc/game-log.md
@@ -37,7 +37,20 @@
 | `NOISE_MARKER_PLACED` | Место и причина установки маркера Шума |
 | `NOISE_SKIPPED` | Почему бросок или размещение Шума не состоялись |
 | `DEV_STATE_CHANGED` | Изменение Двери или маркера Шума из dev-инструмента |
-| `GAME_OVER` | Завершение партии из-за взрыва корабля или разрыва обшивки |
+| `CONTACT_OCCURRED` | Контакт: вытянутый жетон, число Бегства, карты на руке, флаг первого Контакта, сброшенный Шум |
+| `SURPRISE_ATTACK_TRIGGERED` | Объявление Внезапной атаки: атакующий Чужой, карты на руке, число Бегства |
+| `SURPRISE_ATTACK_RESOLVED` | Исход Внезапной атаки: карта Атаки, попадание, раны и Заражение |
+| `INTRUDER_TRANSFORMED` | Трансформация Крипера в Трутня из запаса |
+| `INTRUDER_CALLED` | Зов: пришедший в отсек Чужой или Пустой жетон |
+| `SHOT_FIRED` | Выстрел: стрелок, оружие, грань кубика Боя и нанесённые Раны |
+| `TOUGHNESS_CHECKED` | Проверка Стойкости: карты Атак, суммарные Раны, гибель или отступление |
+| `INTRUDER_KILLED` | Гибель Чужого: стрелок, отсек; жетон уходит в `deadTokens` |
+| `INTRUDER_RETREATED` | Отступление Чужого: исходный и целевой отсеки |
+| `MELEE_ATTACKED` | Рукопашная атака: грань кубика, Раны, Заражение и Травма атакующего |
+| `OBJECT_PICKED_UP` | Подбор Тяжёлого Объекта с пола: персонаж, отсек, тип объекта |
+| `ESCAPE_ATTACK_RESOLVED` | Внеочередная атака при Побеге: особь, карта, попадание, раны/заражение убегающего |
+| `PLAYER_DIED` | Гибель персонажа: отсек и причина; Труп остаётся на поле |
+| `GAME_OVER` | Завершение партии: взрыв корабля, разрыв обшивки или гибель всех персонажей |
 
 События добавляются в тех же ветках движка, где изменяется состояние: запись
 о перемещении появляется при успешном переходе, а записи о вскрытии,
@@ -64,8 +77,10 @@
 ## Хранение и совместимость
 
 Журнал является частью состояния партии и сохраняется вместе с остальными
-данными в браузере. Из-за обязательного поля `gameLog` версия схемы состояния
-повышена до **4**. Сохранения без журнала или с прежней версией считаются
+данными в браузере. Версия схемы состояния — **5**: v4 ввела обязательный
+журнал, v5 добавляет Контакт (отложенный жетон особи, Личинка на планшете
+персонажа и завершение партии гибелью всех). Сохранения без журнала или
+с прежней версией считаются
 несовместимыми и не восстанавливаются: клиент начинает новую партию, вместо
 того чтобы показывать неполную историю, не совпадающую с состоянием поля.
 
@@ -74,9 +89,11 @@
 - `packages/shared/src/types/log.ts` — публичный контракт событий;
 - `packages/shared/src/logic/gameLog.ts` — создание и последовательное добавление;
 - `packages/shared/src/logic/fsm.ts` — запись событий правил;
+- `packages/shared/src/logic/contact.ts` — розыгрыш Контакта и Внезапной атаки;
 - `packages/shared/src/logic/sanitizer.ts` — передача журнала в срез игрока;
 - `packages/client/src/components/log/GameLogPanel.tsx` — нижняя панель и переключатель;
-- `packages/client/src/components/log/gameLogModel.ts` — русские сообщения и выделение.
+- `packages/client/src/components/log/gameLogModel.ts` — русские сообщения и выделение;
+- `packages/client/src/components/modals/ContactModal.tsx` — модалка «КОНТАКТ!» с исходом Внезапной атаки.
 
 Покрытие находится в `packages/shared/src/logic/gameLog.test.ts`,
 `packages/client/src/components/log/gameLogModel.test.ts` и
diff --git a/doc/project-map.md b/doc/project-map.md
index 59659c3..06719e1 100644
--- a/doc/project-map.md
+++ b/doc/project-map.md
@@ -25,10 +25,10 @@
 |---|---|---|
 | `state.ts` | `GameState`, `ShipState`, `GameMeta`, `CoordinatesState`, `IntrudersPoolState` | Главный корневой контракт состояния всей партии (версия схемы `GAME_STATE_SCHEMA_VERSION = 4`). |
 | `actions.ts` | `EngineAction`, `GameAction`, `DevAction`, `RoomAbilityPayload` | Все легальные действия игроков (`ACTION_MOVE`, `ACTION_SEARCH`, `ACTION_ROOM_ABILITY`, `ACTION_PASS`, и др.) и dev-инструменты. |
-| `cards.ts` | `ActionCard`, `ItemCard`, `CraftedItemCard`, `ContaminationCard`, `SeriousWoundCard` | Структура колод, предметов крафта, личных карт действий и карт заражения. |
+| `cards.ts` | `ActionCard`, `ItemCard`, `CraftedItemCard`, `ContaminationCard`, `SeriousWoundCard`, `IntruderAttackCard` | Структура колод, предметов крафта, личных карт действий, карт заражения и атак Чужих. |
 | `rooms.ts` | `RoomState`, `RoomDefinition`, `CorridorConnection`, `ExplorationEffect` | Модель комнат, дверей (OPEN/CLOSED/DESTROYED), коридоров и эффектов жетонов исследования. |
-| `entities.ts` | `PlayerState`, `CharacterClass`, `IntruderToken`, `BoardObject`, `HandSlotContent` | Персонажи (6 классов), слоты рук (2 слота под тяжёлое), инвентарь, жетоны Чужих. |
-| `decisions.ts` | `PendingDecision` | Контракт отложенных интерактивных решений игрока (`CHOOSE_SEARCH_ITEM`, `CHOOSE_WHITE_ROOM_DECK`, и др.). |
+| `entities.ts` | `PlayerState`, `CharacterClass`, `IntruderToken`, `IntruderEntity`, `BoardObject`, `HandSlotContent` | Персонажи (6 классов), слоты рук (2 слота под тяжёлое), инвентарь, жетоны и особи Чужих (у особи — отложенный жетон, у персонажа — Личинка на планшете). |
+| `decisions.ts` | `PendingDecision` | Контракт отложенных интерактивных решений игрока (`CHOOSE_SEARCH_ITEM`, `CHOOSE_WHITE_ROOM_DECK`, `CHOOSE_AIMED_REROLL`, и др.). |
 | `sanitized.ts` | `SanitizedGameState`, `SanitizedPlayerState`, `SanitizedRoomState` | Контракт отфильтрованного среза состояния: всё скрытое строго типизировано как `null` / счетчики. |
 | `log.ts` | `GameLogEntry`, `GameLogPayload` | События публичного журнала партии (перемещения, шум, обыск, использование консолей). |
 | `interrupts.ts` | `InterruptEvent` | Стек прерываний движка (`EXPLORE_ROOM_INTERRUPT`, `NOISE_ROLL_INTERRUPT`). |
@@ -37,7 +37,7 @@
 
 | Модуль / Файл | Ключевые функции | Что делает |
 |---|---|---|
-| `fsm.ts` | `GameEngine.processAction()`, `drainInterrupts()`, `resolveInterrupt()`, `findAdjacentOpenRoomIds()` | **Сердце игрового движка**: атомарное применение действий к копии стейта (Immer), каскадный разбор прерываний (вскрытие отсека, кубик Шума). |
+| `fsm.ts` | `GameEngine.processAction()`, `drainInterrupts()`, `resolveInterrupt()`, `findAdjacentOpenRoomIds()` | **Сердце игрового движка**: атомарное применение действий к копии стейта (Immer), каскадный разбор прерываний (вскрытие отсека, кубик Шума, Контакт, Внезапная атака, Побег). |
 | `setup.ts` | `createInitialGameState(seed)` | Детерминированная подготовка партии по сиду: расклад тайлов комнат, мешка Чужих, колод стола и раздача персонажей. |
 | `cardsPayment.ts` | `validatePayment()`, `executeCardPayment()`, `drawCardsToLimit()`, `getPlayerHandLimit()` | Единый валидатор оплаты действий сбросом карт действий с руки, запрет оплаты Заражением, добор карт в начале раунда. |
 | `turnCycle.ts` | `advanceTurn()`, `startNewRound()`, `findNextActivePlayer()`, `applyFireEndTurnEffect()` | Цикл микроходов: порядок игроков по кругу, учёт 2 действий, передача хода, урон от огня при завершении хода, запуск нового раунда. |
@@ -46,6 +46,9 @@
 | `sanitizer.ts` | `filterStateForPlayer(state, viewingPlayerId)` | **Фильтр скрытой информации**: вырезает чужие руки, инвентарь, неисследованные тайлы и приватные решения других игроков. |
 | `markers.ts` | `placeFireMarker()`, `placeMalfunctionMarker()`, `placeDoorToken()`, `noiseMarkersInSupply()` | Правила лимитов маркеров пожара (8), поломок (8), шума (30) и дверей (12). Условия гибели корабля. |
 | `gameLog.ts` | `appendGameLog()` | Добавление типизированных событий в публичный журнал партии. |
+| `contact.ts` | `resolveContactInterrupt()`, `resolveSurpriseAttackInterrupt()`, `resolveEscapeAttacks()`, `dealLightWounds()`, `dealSeriousWounds()`, `killPlayer()` | Розыгрыш Контакта, Внезапной атаки и Побега: сброс Шума, жетон из мешка, эффекты карт Атак, раны и смерть персонажей. |
+| `combat.ts` | `performShoot()`, `validateShootConditions()`, `combatDieWoundsForShoot()`, `performMelee()`, `validateMeleeConditions()`, `combatDieWoundsForMelee()`, `resolveIntruderWounds()`, `killIntruder()`, `retreatIntruder()`, `performBurstFire()`, `applyShootFace()`, `drawCombatFace()` | Базовые действия «Стрельба» и «Рукопашная Атака» [1] + классовая «Стрельба очередью»: боезапас, кубик Боя через поток `combat`, особые свойства оружия, проверка Стойкости, гибель и стадийное отступление Чужих. |
+| `objects.ts` | `performPickUpObject()`, `validatePickUpConditions()` | Базовое действие «Поднять Тяжёлый Объект» [1]: Труп, Останки или Яйцо с пола в свободный слот руки. |
 
 ### C. Статические данные и баланс (`packages/shared/src/data/`)
 
@@ -57,9 +60,12 @@
 | `itemCards.ts` | `RED_ITEM_CARDS`, `YELLOW_ITEM_CARDS`, `GREEN_ITEM_CARDS` | Колоды предметов стола: военные (30), технические (30), медицинские (30). |
 | `startingItems.ts` | `STARTING_WEAPONS` | Стартовое оружие персонажей (включая разделение на классическое оружие и энергооружие). |
 | `crafting.ts` | `CRAFTING_RECIPES`, `CRAFTED_ITEMS` | 4 рецепта и 12 карт колоды создаваемых предметов. |
+| `weaknessCards.ts` | `WEAKNESS_CARDS` | 7 карт Слабостей Чужих (тексты — doc/data/INTRUDERS.md §6, восьмая отсутствует); раздаются в сетапе. |
 | `contaminationCards.ts`| `CONTAMINATION_CARDS_DECK` | 27 карт заражения (7 инфицированных, 20 стерильных). |
 | `seriousWounds.ts` | `SERIOUS_WOUNDS_DECK` | 16 карт тяжёлых травм (по 4 на руку, ногу, тело, кровотечение). |
 | `noiseDie.ts` | `NOISE_DIE_FACES` | Грани кубика Шума d10 (номера 1..4, Тишина, Опасность). |
+| `combatDie.ts` | `COMBAT_DIE_FACES`, `rollCombatDie` | Грани кубика Боя d6 (Промах ×2, Хвост, Силуэты, 1 и 2 Раны) и бросок через поток `combat`. |
+| `intruderAttacks.ts` | `INTRUDER_ATTACK_CARDS` | 20 карт Атак Чужих: стойкость, отступление, типы атакующих и эффекты. |
 
 ---
 
@@ -70,7 +76,7 @@
 | Файл | Назначение | Главные экспорты |
 |---|---|---|
 | `App.tsx` | Корневой каркас UI, верхний HUD (раунд, фаза, активный игрок, трек времени, сид, dev-кнопка), сборка слоёв карты и панелей. | `App` |
-| `store/gameStore.ts` | Клиентский Zustand-стор: хранит отфильтрованное состояние `view`, выбранный отсек `selectedRoomId` и ошибки движка `rejection`. | `useGameStore` |
+| `store/gameStore.ts` | Клиентский Zustand-стор: хранит отфильтрованное состояние `view`, выбранный отсек `selectedRoomId`, ошибки движка `rejection` и отметку показанных модалок Контакта. | `useGameStore` |
 | `services/transport/` | Транспортный слой изоляции: `LocalInMemoryTransport` исполняет действия в `GameEngine` браузера и сохраняет снапшоты в `localStorage`. | `LocalInMemoryTransport`, `createLocalTransport` |
 | `services/session/` | Хранилище сессий (`sessionStorage.ts`) и генерация сида (`seed.ts`). | `createLocalSessionStorage`, `createSeed` |
 
@@ -78,10 +84,11 @@
 
 | Компонент / Файл | Роль в интерфейсе | Взаимодействие с движком |
 |---|---|---|
-| **Карта корабля**<br>`board/ShipMapSVG.tsx`<br>`board/RoomHex.tsx`<br>`board/CorridorEdge.tsx` | Интерактивная векторная карта корабля с панорамированием и зумом (`react-zoom-pan-pinch`). Отображает комнаты, коридоры, двери, фишки игроков и маркеры шума/пожара/поломки. | Клик по комнате вызывает `selectRoom(id)`. |
-| **Инспектор отсека**<br>`inspector/RoomInspector.tsx` | Боковая/нижняя панель информации об отсеке (исследованность, предметы, компьютер, огонь, поломка, игроки). Контекстные кнопки: переход (`ACTION_MOVE`), обыск (`ACTION_SEARCH`), консоль отсека (`ACTION_ROOM_ABILITY`). | Отправляет `dispatch(ACTION_MOVE)`, `dispatch(ACTION_SEARCH)`, `dispatch(ACTION_ROOM_ABILITY)`. |
-| **Панель руки игрока**<br>`hand/PlayerHandPanel.tsx` | Нижняя выдвижная панель карт руки: отображает карты действий и заражения, цену сброса, мультиселект карт для оплаты, кнопку Паса, счётчик оставшихся действий в микроходе (0/2, 1/2), а также выдвижной инвентарь (слоты рук, предметы, травмы). | Отправляет `dispatch(ACTION_PASS)` со сбросом выбранных карт. |
-| **Модальные окна решений**<br>`modals/DecisionModal.tsx` | Всплывающие модальные окна для интерактивных решений `pendingDecision`: выбор колоды в белой комнате (`CHOOSE_WHITE_ROOM_DECK`), выбор 1 из 2 карт поиска (`CHOOSE_SEARCH_ITEM`), сброс тяжёлого предмета (`DISCARD_HEAVY_ITEM_FOR_NEW`). | Отправляет `dispatch(ACTION_RESOLVE_DECISION)`. |
+| **Карта корабля**<br>`board/ShipMapSVG.tsx`<br>`board/RoomHex.tsx`<br>`board/CorridorEdge.tsx` | Интерактивная векторная карта корабля с панорамированием и зумом (`react-zoom-pan-pinch`). Отображает комнаты, коридоры, двери, фишки игроков и Чужих (значок цветом типа, счётчик ран), маркеры шума/пожара/поломки. | Клик по комнате вызывает `selectRoom(id)`. |
+| **Инспектор отсека**<br>`inspector/RoomInspector.tsx` | Боковая/нижняя панель информации об отсеке (исследованность, предметы, компьютер, огонь, поломка, игроки, Чужие в отсеке). Контекстные кнопки: переход (`ACTION_MOVE`), обыск (`ACTION_SEARCH`), консоль отсека (`ACTION_ROOM_ABILITY`). | Отправляет `dispatch(ACTION_MOVE)`, `dispatch(ACTION_SEARCH)`, `dispatch(ACTION_ROOM_ABILITY)`. |
+| **Панель руки игрока**<br>`hand/PlayerHandPanel.tsx` | Нижняя выдвижная панель карт руки: отображает карты действий и заражения, цену сброса, мультиселект карт для оплаты, кнопку Паса, счётчик оставшихся действий в микроходе (0/2, 1/2), а также выдвижной инвентарь (слоты рук, предметы, травмы) и наведение классовых боевых карт (`hand/CardTargetingForm.tsx`: цель, оружие, отсек, спутник, режим). | Отправляет `dispatch(ACTION_PASS)` со сбросом выбранных карт и `dispatch(ACTION_PLAY_CARD)` с наведением. |
+| **Модальные окна решений**<br>`modals/DecisionModal.tsx` | Всплывающие модальные окна для интерактивных решений `pendingDecision`: выбор колоды в белой комнате (`CHOOSE_WHITE_ROOM_DECK`), выбор 1 из 2 карт поиска (`CHOOSE_SEARCH_ITEM`), сброс тяжёлого предмета (`DISCARD_HEAVY_ITEM_FOR_NEW`), переброс Прицельного огня (`CHOOSE_AIMED_REROLL`). | Отправляет `dispatch(ACTION_RESOLVE_DECISION)`. |
+| **Модалка Контакта**<br>`modals/ContactModal.tsx`<br>`modals/contactModalModel.ts` | Всплывающее окно «КОНТАКТ!»: вытянутый жетон, число Бегства, баннер первого Контакта и исходы Внезапной атаки. | Читает `view.gameLog`, закрытие запоминает в сторе (`dismissedContactSequence`). |
 | **Журнал событий**<br>`log/GameLogPanel.tsx`<br>`log/gameLogModel.ts` | Нижняя сворачиваемая панель истории ходов и событий партии: форматирует лог с семантической подсветкой сущностей. | Читает `view.gameLog`. |
 | **Dev-панель**<br>`dev/DevPanel.tsx`<br>`dev/devPanelModel.ts` | Отладочная панель для разработчика (доступна только при `IS_DEV = true`): переключение дверей, шума, просмотр сырого состояния. Вырезается из продакшн-сборки. | Отправляет `DEV_TOGGLE_DOOR`, `DEV_TOGGLE_NOISE`. |
 | **HUD-чип сида**<br>`hud/SeedChip.tsx` | Отображение сида генерации текущего матча с возможностью копирования в буфер обмена. | Читает `view.meta.seed`. |
diff --git a/doc/roadmap.md b/doc/roadmap.md
index 41f5c12..cca0d3b 100644
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
@@ -208,10 +208,10 @@
   * Модальное всплывающее окно «КОНТАКТ!» с анимацией вытягивания жетона из мешка (показ силуэта пришельца и числа внезапной атаки).
   * Баннер предупреждения и розыгрыша Внезапной атаки, если карт на руке не хватило.
 
-### Шаг 3. Спавн и отображение Чужих на интерактивной карте (Intruder Placement & Board UI)
+### Шаг 3. Спавн и отображение Чужих на интерактивной карте (Intruder Placement & Board UI) (ВЫПОЛНЕНО)
 
 * Привязка монстров к отсекам в `RoomState.occupantIntruderIds`.
-* Обработка Личинки: Личинка не ставится миниатюрой в отсек, а немедленно заражает персонажа (добавляется карта Заражения, Личинка крепится на планшет персонажа).
+* Обработка Личинки — по книге: Личинка ставится миниатюрой в отсек как остальные особи (стр. 18 — легальная цель стрельбы и рукопашной), а заражает через свою Внезапную атаку без карты (стр. 20, реализовано в Шаге 2).
 * Правило статуса Боя (In Combat, стр. 18): персонаж в отсеке с Чужим считается находящимся в Бою. В Бою заблокированы обычный Поиск, Осторожное движение и действия комнат.
 * Фильтрация `sanitizer.ts`: список монстров в отсеке и их раны передаются в клиентское состояние `SanitizedGameState`.
 * *Визуальная часть:*
@@ -219,7 +219,7 @@
   * Индикаторы количества пришельцев и полученных ими ран в узле отсека на карте.
   * Блок «Чужие в отсеке» в `RoomInspector` со шкалой здоровья/ран каждого монстра.
 
-### Шаг 4. Базовое действие «Стрельба» (Combat: Shoot Action)
+### Шаг 4. Базовое действие «Стрельба» (Combat: Shoot Action) (ВЫПОЛНЕНО)
 
 * Реализовать действие `ACTION_SHOOT` [1]:
   * Проверка нахождения персонажа в одной комнате с выбранной целью.
@@ -227,15 +227,15 @@
   * Расход 1 карты Действия на оплату базового действия стрельбы (если стреляют не через особую карту Действия).
 * Бросок кубика Боя через поток RNG `combat`:
   * Сопоставление выпавшей грани с типом цели (Хвост ранит только Личинку/Крипера; Силуэты ранят определенных монстров; 1 и 2 Раны наносят прямой урон).
-* Проверка стойкости Чужого (стр. 19):
-  * При нанесении хотя бы 1 раны берется верхняя карта колоды Атак Чужих.
-  * Нанесенные суммарные раны монстра сравниваются со значением стойкости на карте атаки.
-  * Если раны $\ge$ стойкости — монстр погибает. Если на карте нарисован символ отступления — монстр отступает в соседний отсек/вентиляцию.
+* Проверка Стойкости Чужого (стр. 18):
+  * Личинка погибает от любой Раны без карты; Крипер и Взрослая тянут 1 карту, Трутень и Королева — 2 карты (Стойкость суммируется).
+  * Суммарные раны монстра сравниваются со Стойкостью: если раны ≥ стойкости — монстр погибает, жетон уходит в `deadTokens` (Останки — Шаг 6).
+  * Стрелка Отступления хотя бы на одной карте перекрывает смерть: монстр сбегает. Промежуточное правило: до колоды Событий (этап 0.5.0) направление выбирает поток `combat` среди соседних отсеков через открытые Двери, вентиляция исключена.
 * *Визуальная часть:*
   * Кнопка «Стрелять» в панели действий и в `RoomInspector` при нахождении в бою.
-  * Интерактивная модальная панель выстрела: выбор оружия в руках, выбор цели, анимация броска 3D/2D кубика боя, показ нанесенного урона и вытянутой карты стойкости.
+  * Интерактивная модальная панель выстрела: выбор оружия в руках, выбор цели, показ результата броска кубика боя, нанесённого урона и вытянутых карт Стойкости (без анимации кубика).
 
-### Шаг 5. Базовое действие «Рукопашная атака» (Combat: Melee Action)
+### Шаг 5. Базовое действие «Рукопашная атака» (Combat: Melee Action) (ВЫПОЛНЕНО)
 
 * Реализовать действие `ACTION_MELEE` [1] (стр. 13, 19):
   * Отчаянная атака монстра прикладом или подручными средствами без расхода патронов.
@@ -243,39 +243,40 @@
   * Персонаж гарантированно берет 1 карту Заражения в сброс (риск заразиться паразитами при контакте плоть к плоти).
   * Бросок кубика Боя.
   * При результате «Промах» (`MISS`) персонаж немедленно получает 1 Тяжелую Травму из колоды Травм.
+  * Хвост и Силуэты по невосприимчивому типу — тоже промах с Травмой; [++] наносит лишь 1 Рану (стр. 19).
   * При попадании наносятся раны и проверяется стойкость монстра.
 * *Визуальная часть:*
   * Кнопка «Рукопашная атака» с предупреждающими бейджами: «+1 Заражение» и «Риск Тяжелой Травмы при промахе».
-  * Анимация получения травмы/заражения при неудачной рукопашной схватке.
+  * Показ полученной Травмы/Заражения и гибели атакующего в результате атаки (без анимации).
 
-### Шаг 6. Смерть Чужих, Останки и Слабости (Monster Death & Carcass)
+### Шаг 6. Смерть Чужих, Останки и Слабости (Monster Death & Carcass) (ВЫПОЛНЕНО)
 
 * При гибели Чужого:
   * Миниатюра монстра удаляется из отсека (`occupantIntruderIds`).
-  * На пол отсека выкладывается тяжелый объект «Останки Чужого» (`kind: 'INTRUDER_REMAINS'`).
-  * При гибели Королевы на пол дополнительно выкладывается жетон Яйца (`kind: 'EGG'`).
-  * Персонажи могут подбирать Останки в свободный слот руки (`handSlots`) и переносить их по кораблю.
-* Лаборатория (`LABORATORY`): сброс Останков из рук в Лаборатории активирует анализ Слабости Чужих и переворачивает соответствующую карту Слабости лицом вверх.
+  * На пол отсека выкладывается тяжелый объект «Останки Чужого» (`kind: 'INTRUDER_REMAINS'`) — от любого Чужого, кроме Личинки (стр. 22).
+  * Яйца за Королеву книга не даёт (в коробке всего 5 жетонов Яиц, все — для Улья): Королева оставляет только Останки.
+  * Персонажи могут подбирать Останки в свободный слот руки (`handSlots`) и переносить их по кораблю. Общее действие «Поднять Тяжёлый Объект» [1] работает и для Трупа с Яйцом (стр. 13).
+* Лаборатория (`LABORATORY`): сброс Останков из рук в Лаборатории активирует анализ Слабости Чужих и переворачивает соответствующую карту Слабости лицом вверх. Изученный объект остаётся на полу Лаборатории (стр. 22). Карты: 7 из 8 (тексты — doc/data/INTRUDERS.md §6, восьмая в транскрипте отсутствует); эффекты раскрытых Слабостей пока не применяются (будущий этап).
 * *Визуальная часть:*
-  * Анимация гибели монстра и появление на полу комнаты фишки Останков с возможностью подбора в инспекторе отсека.
+  * Появление на полу комнаты фишки Останков с кнопкой подбора в инспекторе отсека (без анимации).
   * Запись триумфа в публичном журнале партии (`INTRUDER_KILLED`).
 
-### Шаг 7. Побег из боя и внеочередные атаки (Escape from Combat)
+### Шаг 7. Побег из боя и внеочередные атаки (Escape from Combat) (ВЫПОЛНЕНО)
 
 * Реализовать механику Побега из боя (стр. 13, 19):
   * Если персонаж совершает обычное перемещение (`ACTION_MOVE`) из отсека, где находятся Чужие, это действие считается Побегом.
-  * Перед выходом из комнаты инициируется прерывание внеочередной атаки (`INTRUDER_ATTACK_INTERRUPT`): каждый оставшийся в отсеке Чужой по очереди атакует убегающего персонажа.
-  * Вытягиваются карты из колоды Атак Чужих: персонаж получает раны/травмы согласно типу атакующего монстра.
+  * Перед выходом из комнаты инициируется прерывание внеочередной атаки (`ESCAPE_ATTACK_INTERRUPT`: имя из объявленного контракта прерываний): каждый оставшийся в отсеке Чужой по очереди атакует убегающего персонажа.
+  * Вытягиваются карты из колоды Атак Чужих: персонаж получает раны/травмы согласно типу атакующего монстра. Личинка заражает без карты (как при Внезапной атаке, стр. 18, 20).
   * Если персонаж выжил — он переходит в целевой отсек и совершает стандартный бросок Шума.
 * *Визуальная часть:*
   * Диалог подтверждения при попытке сделать шаг из комнаты с врагами: «В отсеке находятся Чужие! Попытка побега спровоцирует внеочередную атаку монстров в спину. Бежать?».
   * Наглядное отображение полученного урона во время отступления.
 
-### Шаг 8. Сквозная интеграция, защита информации, тесты и выпуск v0.4.0
+### Шаг 8. Сквозная интеграция, защита информации, тесты и выпуск v0.4.0 (ВЫПОЛНЕНО)
 
 * Подключить классовые боевые карты действий (Солдат: «Стрельба очередью», «Прицельный огонь», «Заградительный огонь»; Скаут: «Адреналин»; Капитан: «Огонь на подавление»).
-* Защита информации (Sanitizer): колода карт Атак Чужих и состав мешка цензурируются; в логе партии фиксируются только свершившиеся факты боя.
-* Комплексные интеграционные тесты (`combat.test.ts`, `contact.test.ts`):
+* Защита информации (Sanitizer): колода карт Атак Чужих и состав мешка цензурируются (порядок мешка скрыт, состав открыт по книге — стр. 6, шаг 10; сброс Атак лежит лицом вверх); в логе партии фиксируются только свершившиеся факты боя.
+* Комплексные интеграционные тесты (`combat.test.ts`, `contact.test.ts`, `fsm.test.ts` — по принадлежности механики) + сквозной тест цикла боя в `contact.test.ts`:
   * Тест срабатывания контакта при повторном шуме и очистки соседних коридоров.
   * Тест проверки внезапной атаки по числу карт на руке.
   * Тесты расхода патронов при стрельбе и гарантированного заражения в рукопашной.
diff --git a/doc/sources/data-sources.json b/doc/sources/data-sources.json
index 12e6ee5..0189916 100644
--- a/doc/sources/data-sources.json
+++ b/doc/sources/data-sources.json
@@ -1,8 +1,8 @@
 {
   "meta": {
-    "version": 2,
-    "updated": "2026-09-18",
-    "updatedFor": "0.3.0",
+    "version": 3,
+    "updated": "2026-09-21",
+    "updatedFor": "0.4.0 (шаг 1)",
     "note": "Пакет источника: откуда взято каждое число в таблицах данных. Golden-тест packages/shared/src/data/sources.golden.test.ts сверяет код с этим файлом, поэтому изменение таблицы без изменения источника роняет тест. Физических компонентов (фото поля, кубика, жетонов) в репозитории нет: всё, что можно было прочитать только с картона, помечено статусом USER_CONFIRMED (подтверждено владельцем проекта) или EXTERNAL_UNVERIFIED (внешний источник, физической сверки не было).",
     "statuses": {
       "RULES_LOCAL": "Напечатано в книге правил; рядом указаны строки doc/rules.md.",
@@ -30,6 +30,11 @@
         "kind": "EXTERNAL_UNVERIFIED",
         "title": "UltraBoardGames: Nemesis — Movement and Exploration",
         "location": "https://www.ultraboardgames.com/nemesis/movement-and-exploration.php"
+      },
+      "intruders-doc": {
+        "kind": "EXTERNAL_UNVERIFIED",
+        "title": "doc/data/INTRUDERS.md — сводная таблица данных по Чужим (§1 кубик Боя, §4 колода Атак); сканов компонентов в репозитории нет, сверка с физическими кубиком и картами не проводилась",
+        "location": "doc/data/INTRUDERS.md"
       }
     }
   },
@@ -507,6 +512,170 @@
         "recipeCount": 4
       }
     },
+    "combat-die": {
+      "file": "packages/shared/src/data/combatDie.ts",
+      "status": "EXTERNAL_UNVERIFIED",
+      "facts": [
+        {
+          "claim": "В коробке 2 кубика Боя d6",
+          "source": "rules-md",
+          "lines": "70, 309"
+        },
+        {
+          "claim": "Бросок кубика Боя даёт 5 исходов: промах (перечёркнутый прицел), хвост (Личинка/Крипер), три силуэта (Личинка/Крипер/Взрослая), 1 рана, 2 раны",
+          "source": "rules-md",
+          "lines": "1133-1138, 1157-1162"
+        },
+        {
+          "claim": "Раскладка 6 граней: Промах продублирован (MISS, MISS, TAIL, SILHOUETTES, ONE_WOUND, TWO_WOUNDS)",
+          "source": "intruders-doc",
+          "note": "Книга правил печатает только исходы броска, состав граней виден лишь на физическом кубике"
+        }
+      ],
+      "expectation": {
+        "faceCount": 6,
+        "faces": [
+          "MISS",
+          "MISS",
+          "TAIL",
+          "SILHOUETTES",
+          "ONE_WOUND",
+          "TWO_WOUNDS"
+        ]
+      },
+      "unverified": [
+        "Какая грань продублирована на d6, читается только с физического кубика: сверки не было, принято допущение из doc/data/INTRUDERS.md §1.",
+        "Формулировка шага 1 этапа 0.4.0 в roadmap упоминает грань «Лапа» — в исходах книги правил (стр. 18–19) ей нет соответствия; грани следуют книге правил."
+      ]
+    },
+    "intruder-attacks": {
+      "file": "packages/shared/src/data/intruderAttacks.ts",
+      "status": "EXTERNAL_UNVERIFIED",
+      "facts": [
+        {
+          "claim": "Карт Атаки Чужих в коробке 20; колода тасуется и кладётся лицом вниз рядом с полем",
+          "source": "rules-md",
+          "lines": "114, 296"
+        },
+        {
+          "claim": "Карта несёт число стойкости (символ Раны), символы типов Чужих и текст эффекта; Крипер/Взрослая проверяются 1 картой, Трутень/Королева — суммой 2 карт",
+          "source": "rules-md",
+          "lines": "1206-1212, 1255-1257"
+        },
+        {
+          "claim": "Стрелка Отступления на символе Раны заставляет Чужого сбежать при проверке результата атаки",
+          "source": "rules-md",
+          "lines": "1219-1224"
+        },
+        {
+          "claim": "Точный состав 20 карт: стойкость, отступление, типы атакующих и эффекты",
+          "source": "intruders-doc",
+          "note": "Значения напечатаны на физических картах; в книге правил их нет"
+        }
+      ],
+      "expectation": {
+        "cardCount": 20,
+        "byName": {
+          "Царапина": 4,
+          "Укус": 4,
+          "Атака когтями": 4,
+          "Атака хвостом": 2,
+          "Трансформация": 2,
+          "Ярость": 2,
+          "Слизь": 1,
+          "Зов": 1
+        },
+        "toughnessByName": {
+          "Царапина": [
+            2,
+            3,
+            5,
+            6
+          ],
+          "Укус": [
+            2,
+            4,
+            4,
+            6
+          ],
+          "Атака когтями": [
+            3,
+            4,
+            4,
+            5
+          ],
+          "Атака хвостом": [
+            2,
+            5
+          ],
+          "Трансформация": [
+            4,
+            5
+          ],
+          "Ярость": [
+            3,
+            4
+          ],
+          "Слизь": [
+            5
+          ],
+          "Зов": [
+            3
+          ]
+        },
+        "retreatCountByName": {
+          "Царапина": 1,
+          "Укус": 2,
+          "Атака когтями": 2,
+          "Атака хвостом": 0,
+          "Трансформация": 0,
+          "Ярость": 0,
+          "Слизь": 0,
+          "Зов": 0
+        },
+        "attackerTypesByName": {
+          "Царапина": [
+            "CREEPER",
+            "ADULT",
+            "BREEDER",
+            "QUEEN"
+          ],
+          "Укус": [
+            "ADULT",
+            "BREEDER",
+            "QUEEN"
+          ],
+          "Атака когтями": [
+            "ADULT",
+            "BREEDER",
+            "QUEEN"
+          ],
+          "Атака хвостом": [
+            "QUEEN"
+          ],
+          "Трансформация": [
+            "CREEPER"
+          ],
+          "Ярость": [
+            "BREEDER",
+            "QUEEN"
+          ],
+          "Слизь": [
+            "CREEPER",
+            "ADULT",
+            "BREEDER",
+            "QUEEN"
+          ],
+          "Зов": [
+            "CREEPER",
+            "QUEEN"
+          ]
+        }
+      },
+      "unverified": [
+        "Стойкость, отступление, символы типов и тексты эффектов напечатаны на физических картах; сверки колоды с картоном не было — состав зафиксирован по doc/data/INTRUDERS.md §4."
+      ]
+    },
     "deck-composition": {
       "file": "packages/shared/src/data/actionCards.ts, packages/shared/src/data/itemCards.ts, packages/shared/src/data/contaminationCards.ts, packages/shared/src/data/seriousWounds.ts",
       "status": "RULES_LOCAL",
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
index f866dde..379388e 100644
--- a/packages/client/src/App.tsx
+++ b/packages/client/src/App.tsx
@@ -9,6 +9,8 @@ import { DevPanel } from './components/dev/DevPanel';
 import { GameLogPanel } from './components/log/GameLogPanel';
 import { PlayerHandPanel } from './components/hand/PlayerHandPanel';
 import { DecisionModal } from './components/modals/DecisionModal';
+import { ContactModal } from './components/modals/ContactModal';
+import { selectContactEntry } from './components/modals/contactModalModel';
 import { CharacterSelectModal } from './components/modals/CharacterSelectModal';
 import { PHASE_LABELS } from './utils/labels';
 import { IS_DEV } from './utils/env';
@@ -17,6 +19,7 @@ import { RotateCcw, Clock, Shield, Bug } from 'lucide-react';
 export const App: React.FC = () => {
   const view = useGameStore((state) => state.view);
   const startNewGame = useGameStore((state) => state.startNewGame);
+  const dismissedContactSequence = useGameStore((state) => state.dismissedContactSequence);
   const [devPanelOpen, setDevPanelOpen] = React.useState(false);
   const [showCharacterSelect, setShowCharacterSelect] = React.useState(() => {
     return !localStorage.getItem('nemesis_offline_session');
@@ -36,6 +39,7 @@ export const App: React.FC = () => {
   }
 
   const activePlayerName = view.players[view.meta.activePlayerId]?.name ?? 'Экипаж';
+  const contactEntry = selectContactEntry(view, dismissedContactSequence);
 
   return (
     <div className="relative w-screen h-screen bg-nemesis-bg flex flex-col overflow-hidden">
@@ -106,6 +110,7 @@ export const App: React.FC = () => {
           />
         )}
         {view.pendingDecision && <DecisionModal decision={view.pendingDecision} />}
+        {contactEntry && <ContactModal entry={contactEntry} view={view} />}
         {IS_DEV && devPanelOpen && <DevPanel onClose={() => setDevPanelOpen(false)} />}
       </main>
     </div>
diff --git a/packages/client/src/components/board/RoomHex.test.tsx b/packages/client/src/components/board/RoomHex.test.tsx
new file mode 100644
index 0000000..d6a6564
--- /dev/null
+++ b/packages/client/src/components/board/RoomHex.test.tsx
@@ -0,0 +1,65 @@
+import { describe, expect, it } from 'vitest';
+import { renderToStaticMarkup } from 'react-dom/server';
+
+import type { IntruderEntity } from '@nemesis/shared';
+import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';
+
+import { RoomHex } from './RoomHex';
+import { INTRUDER_TYPE_COLORS } from '../../utils/labels';
+
+function roomProps(intruders: IntruderEntity[] = []) {
+  const view = filterStateForPlayer(createInitialGameState('room-hex-intruders'), 'player-1');
+
+  return {
+    room: view.ship.rooms[11]!,
+    x: 100,
+    y: 100,
+    isSelected: false,
+    onSelect: () => undefined,
+    intruders,
+  };
+}
+
+describe('RoomHex: Чужие в отсеке', () => {
+  it('красит значок по типу особи и показывает счётчик ран', () => {
+    const intruders: IntruderEntity[] = [
+      {
+        id: 'test-adult-1',
+        type: 'ADULT',
+        roomId: 11,
+        woundsCount: 0,
+        token: { id: 'test-adult-1', type: 'ADULT', escapeNumber: 4 },
+      },
+      {
+        id: 'test-queen-1',
+        type: 'QUEEN',
+        roomId: 11,
+        woundsCount: 3,
+        token: { id: 'test-queen-1', type: 'QUEEN', escapeNumber: 4 },
+      },
+    ];
+
+    const html = renderToStaticMarkup(
+      <svg>
+        <RoomHex {...roomProps(intruders)} />
+      </svg>,
+    );
+
+    expect(html).toContain(`fill="${INTRUDER_TYPE_COLORS.ADULT.fill}"`);
+    expect(html).toContain(`fill="${INTRUDER_TYPE_COLORS.QUEEN.fill}"`);
+    expect(html).toContain('Взрослая Особь — ран: 0');
+    expect(html).toContain('Королева — ран: 3');
+    expect(html).toContain('>3</text>');
+  });
+
+  it('без Чужих значки не рисует', () => {
+    const html = renderToStaticMarkup(
+      <svg>
+        <RoomHex {...roomProps()} />
+      </svg>,
+    );
+
+    expect(html).not.toContain('<title>');
+    expect(html).not.toContain(INTRUDER_TYPE_COLORS.ADULT.fill);
+  });
+});
diff --git a/packages/client/src/components/board/RoomHex.tsx b/packages/client/src/components/board/RoomHex.tsx
index 3d0e610..c01711d 100644
--- a/packages/client/src/components/board/RoomHex.tsx
+++ b/packages/client/src/components/board/RoomHex.tsx
@@ -1,6 +1,8 @@
 import React from 'react';
-import { SHIP_ROOM_NODES, type SanitizedRoomState } from '@nemesis/shared';
-import { Bone, Egg, Flame, Laptop, Skull, User, Wrench } from 'lucide-react';
+import { SHIP_ROOM_NODES, type IntruderEntity, type SanitizedRoomState } from '@nemesis/shared';
+import { Bone, Bug, Egg, Flame, Laptop, Skull, User, Wrench } from 'lucide-react';
+
+import { INTRUDER_TYPE_COLORS, INTRUDER_TYPE_LABELS } from '../../utils/labels';
 
 interface RoomHexProps {
   /** Отсек глазами игрока: невскрытый тайл приходит без названия и жетона (стр. 14). */
@@ -9,6 +11,8 @@ interface RoomHexProps {
   y: number;
   isSelected: boolean;
   onSelect: (roomId: number) => void;
+  /** Особи Чужих в отсеке: значок красится по типу, счётчик показывает раны. */
+  intruders: IntruderEntity[];
 }
 
 const CANONICAL_ROOM_NAMES: Record<string, [string, string]> = {
@@ -39,7 +43,7 @@ const CANONICAL_ROOM_NAMES: Record<string, [string, string]> = {
   SHOWER: ['ДУШЕВАЯ', 'ЭКИПАЖА'],
 };
 
-export const RoomHex: React.FC<RoomHexProps> = ({ room, x, y, isSelected, onSelect }) => {
+export const RoomHex: React.FC<RoomHexProps> = ({ room, x, y, isSelected, onSelect, intruders }) => {
   const radius = 45;
 
   const points = React.useMemo(() => {
@@ -209,6 +213,33 @@ export const RoomHex: React.FC<RoomHexProps> = ({ room, x, y, isSelected, onSele
           </g>
         );
       })}
+
+      {/* Чужие в отсеке: значок по типу особи, счётчик — полученные раны */}
+      {intruders.length > 0 && (
+        <g className="pointer-events-none">
+          {intruders.map((entity, index) => {
+            const colors = INTRUDER_TYPE_COLORS[entity.type];
+            const cx = x + (index - (intruders.length - 1) / 2) * 19;
+            const cy = y + 34;
+
+            return (
+              <g key={entity.id} transform={`translate(${cx}, ${cy})`}>
+                <title>{`${INTRUDER_TYPE_LABELS[entity.type]} — ран: ${entity.woundsCount}`}</title>
+                <circle cx={0} cy={0} r={8} fill={colors.fill} stroke="#05070c" strokeWidth={1.5} />
+                <Bug size={11} x={-5.5} y={-5.5} style={{ color: colors.ink }} />
+                {entity.woundsCount > 0 && (
+                  <g>
+                    <circle cx={7} cy={-7} r={5} fill="#ff003c" stroke="#05070c" strokeWidth={1} />
+                    <text x={7} y={-4.5} textAnchor="middle" className="text-[7px] font-mono fill-white font-bold">
+                      {entity.woundsCount}
+                    </text>
+                  </g>
+                )}
+              </g>
+            );
+          })}
+        </g>
+      )}
     </g>
   );
 };
diff --git a/packages/client/src/components/board/ShipMapSVG.tsx b/packages/client/src/components/board/ShipMapSVG.tsx
index 275a7a0..c4572ee 100644
--- a/packages/client/src/components/board/ShipMapSVG.tsx
+++ b/packages/client/src/components/board/ShipMapSVG.tsx
@@ -3,6 +3,7 @@ import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
 import { SHIP_ROOM_NODES } from '@nemesis/shared';
 import { useGameStore } from '../../store/gameStore';
 import { RoomHex } from './RoomHex';
+import { roomIntruders } from '../../utils/roomIntruders';
 import { CorridorEdge } from './CorridorEdge';
 import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
 
@@ -101,6 +102,7 @@ export const ShipMapSVG: React.FC = () => {
                         y={coord.y}
                         isSelected={selectedRoomId === room.id}
                         onSelect={selectRoom}
+                        intruders={roomIntruders(view, room.id)}
                       />
                     );
                   })}
diff --git a/packages/client/src/components/dev/devPanelModel.ts b/packages/client/src/components/dev/devPanelModel.ts
index ab432be..b1a10ed 100644
--- a/packages/client/src/components/dev/devPanelModel.ts
+++ b/packages/client/src/components/dev/devPanelModel.ts
@@ -21,6 +21,7 @@ export const DOOR_LABELS: Record<DoorState, string> = {
 export const GAME_OVER_REASON_LABELS: Record<NonNullable<SanitizedGameState['meta']['gameOverReason']>, string> = {
   SHIP_EXPLODED: 'корабль взорвался',
   HULL_BREACH: 'разрыв обшивки',
+  ALL_PLAYERS_DEAD: 'погибли все персонажи',
 };
 
 /** Разрушенную Дверь снова не закрыть: переключать её некуда (стр. 17). */
diff --git a/packages/client/src/components/hand/CardTargetingForm.test.tsx b/packages/client/src/components/hand/CardTargetingForm.test.tsx
new file mode 100644
index 0000000..eaf2206
--- /dev/null
+++ b/packages/client/src/components/hand/CardTargetingForm.test.tsx
@@ -0,0 +1,193 @@
+import { describe, expect, it } from 'vitest';
+import { renderToStaticMarkup } from 'react-dom/server';
+
+import type { SanitizedGameState } from '@nemesis/shared';
+import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';
+
+import {
+  CardTargetingForm,
+  TARGETED_COMBAT_CARD_IDS,
+  defaultCardSelection,
+  isSelectionComplete,
+  isTargetedCombatCard,
+} from './CardTargetingForm';
+
+function combatView(): SanitizedGameState {
+  const state = createInitialGameState('card-targeting', { playerCount: 2 });
+
+  state.intrudersPool.boardTokens.push({
+    id: 't-adult',
+    type: 'ADULT',
+    roomId: 11,
+    woundsCount: 1,
+    token: { id: 't-adult', type: 'ADULT', escapeNumber: 4 },
+  });
+  state.ship.rooms[11]!.occupantIntruderIds.push('t-adult');
+
+  return filterStateForPlayer(state, 'player-1');
+}
+
+describe('isTargetedCombatCard', () => {
+  it('знает все 5 боевых карт', () => {
+    for (const id of Object.values(TARGETED_COMBAT_CARD_IDS)) {
+      expect(isTargetedCombatCard(id)).toBe(true);
+    }
+
+    expect(isTargetedCombatCard('ACT_SOL_SEARCH_1')).toBe(false);
+  });
+});
+
+describe('defaultCardSelection', () => {
+  it('стрелковым даёт особь и заряженное оружие', () => {
+    const defaults = defaultCardSelection(TARGETED_COMBAT_CARD_IDS.AIMED_FIRE, combatView(), 'player-1');
+
+    expect(defaults.targetIntruderId).toBe('t-adult');
+    expect(defaults.weaponSlotIndex).toBe(0);
+  });
+
+  it('уводу даёт соседний отсек и «Я сам»', () => {
+    const defaults = defaultCardSelection(TARGETED_COMBAT_CARD_IDS.BARRAGE, combatView(), 'player-1');
+
+    expect(defaults.targetRoomId).not.toBe(11);
+    expect(defaults.option).toBe('SELF');
+  });
+
+  it('адреналину даёт режим выстрела со всеми целями', () => {
+    const defaults = defaultCardSelection(TARGETED_COMBAT_CARD_IDS.ADRENALINE, combatView(), 'player-1');
+
+    expect(defaults.option).toBe('SHOOT');
+    expect(defaults.targetIntruderId).toBe('t-adult');
+    expect(defaults.weaponSlotIndex).toBe(0);
+    expect(defaults.targetRoomId).not.toBe(11);
+  });
+});
+
+describe('isSelectionComplete', () => {
+  it('стрелковым нужны цель и оружие', () => {
+    expect(isSelectionComplete(TARGETED_COMBAT_CARD_IDS.BURST_FIRE, {})).toBe(false);
+    expect(
+      isSelectionComplete(TARGETED_COMBAT_CARD_IDS.BURST_FIRE, {
+        targetIntruderId: 't-adult',
+        weaponSlotIndex: 0,
+      }),
+    ).toBe(true);
+  });
+
+  it('уводу нужны отсек и вариант', () => {
+    expect(isSelectionComplete(TARGETED_COMBAT_CARD_IDS.SUPPRESSIVE_FIRE, { option: 'SELF' })).toBe(false);
+    expect(isSelectionComplete(TARGETED_COMBAT_CARD_IDS.SUPPRESSIVE_FIRE, { targetRoomId: 6, option: 'SELF' })).toBe(
+      true,
+    );
+  });
+
+  it('адреналин проверяет по режиму', () => {
+    const shoot = { option: 'SHOOT', targetIntruderId: 't-adult', weaponSlotIndex: 0, targetRoomId: 6 };
+    const escape = { option: 'ESCAPE', targetRoomId: 6 };
+
+    expect(isSelectionComplete(TARGETED_COMBAT_CARD_IDS.ADRENALINE, shoot)).toBe(true);
+    expect(isSelectionComplete(TARGETED_COMBAT_CARD_IDS.ADRENALINE, escape)).toBe(true);
+    expect(isSelectionComplete(TARGETED_COMBAT_CARD_IDS.ADRENALINE, { option: 'ESCAPE' })).toBe(false);
+    expect(isSelectionComplete(TARGETED_COMBAT_CARD_IDS.ADRENALINE, {})).toBe(false);
+  });
+
+  it('обычные карты полны всегда', () => {
+    expect(isSelectionComplete('ACT_SOL_SEARCH_1', {})).toBe(true);
+  });
+});
+
+describe('CardTargetingForm', () => {
+  const noop = () => undefined;
+
+  it('стрелковая карта: селекты цели и оружия', () => {
+    const html = renderToStaticMarkup(
+      <CardTargetingForm
+        cardId={TARGETED_COMBAT_CARD_IDS.AIMED_FIRE}
+        view={combatView()}
+        playerId="player-1"
+        selection={{ targetIntruderId: 't-adult', weaponSlotIndex: 0 }}
+        onSelectionChange={noop}
+      />,
+    );
+
+    expect(html).toContain('Цель выстрела');
+    expect(html).toContain('Взрослая Особь');
+    expect(html).toContain('Оружие');
+    expect(html).not.toContain('Целевой отсек');
+  });
+
+  it('заградительный огонь: отсек и вариант «Я + спутник»', () => {
+    const html = renderToStaticMarkup(
+      <CardTargetingForm
+        cardId={TARGETED_COMBAT_CARD_IDS.BARRAGE}
+        view={combatView()}
+        playerId="player-1"
+        selection={{ targetRoomId: 6, option: 'SELF' }}
+        onSelectionChange={noop}
+      />,
+    );
+
+    expect(html).toContain('Целевой отсек');
+    expect(html).toContain('Кого увести');
+    expect(html).toContain('Я сам');
+    expect(html).toContain('Я +');
+  });
+
+  it('подавление: без варианта «Я + спутник»', () => {
+    const html = renderToStaticMarkup(
+      <CardTargetingForm
+        cardId={TARGETED_COMBAT_CARD_IDS.SUPPRESSIVE_FIRE}
+        view={combatView()}
+        playerId="player-1"
+        selection={{ targetRoomId: 6, option: 'SELF' }}
+        onSelectionChange={noop}
+      />,
+    );
+
+    expect(html).toContain('Кого увести');
+    expect(html).not.toContain('Я +');
+  });
+
+  it('адреналин: секции переключаются режимом', () => {
+    const view = combatView();
+    const shootHtml = renderToStaticMarkup(
+      <CardTargetingForm
+        cardId={TARGETED_COMBAT_CARD_IDS.ADRENALINE}
+        view={view}
+        playerId="player-1"
+        selection={{ option: 'SHOOT', targetIntruderId: 't-adult', weaponSlotIndex: 0 }}
+        onSelectionChange={noop}
+      />,
+    );
+    const escapeHtml = renderToStaticMarkup(
+      <CardTargetingForm
+        cardId={TARGETED_COMBAT_CARD_IDS.ADRENALINE}
+        view={view}
+        playerId="player-1"
+        selection={{ option: 'ESCAPE', targetRoomId: 6 }}
+        onSelectionChange={noop}
+      />,
+    );
+
+    expect(shootHtml).toContain('Выстрел');
+    expect(shootHtml).toContain('Цель выстрела');
+    expect(escapeHtml).toContain('Побег');
+    expect(escapeHtml).toContain('Целевой отсек');
+    expect(escapeHtml).not.toContain('Цель выстрела');
+  });
+
+  it('без Чужих и пути честно пишет об этом', () => {
+    const state = createInitialGameState('card-targeting-calm', { playerCount: 1 });
+    const view = filterStateForPlayer(state, 'player-1');
+    const html = renderToStaticMarkup(
+      <CardTargetingForm
+        cardId={TARGETED_COMBAT_CARD_IDS.AIMED_FIRE}
+        view={view}
+        playerId="player-1"
+        selection={{}}
+        onSelectionChange={noop}
+      />,
+    );
+
+    expect(html).toContain('Нет Чужих в отсеке');
+  });
+});
diff --git a/packages/client/src/components/hand/CardTargetingForm.tsx b/packages/client/src/components/hand/CardTargetingForm.tsx
new file mode 100644
index 0000000..d43dbaa
--- /dev/null
+++ b/packages/client/src/components/hand/CardTargetingForm.tsx
@@ -0,0 +1,265 @@
+import React from 'react';
+import type { SanitizedGameState } from '@nemesis/shared';
+import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1, SPECIAL_ROOMS, findAdjacentOpenRoomIds } from '@nemesis/shared';
+import { roomIntruders } from '../../utils/roomIntruders';
+import { INTRUDER_TYPE_LABELS } from '../../utils/labels';
+
+/** Боевые карты с наведением (id из data/actionCards.ts, v0.4.0 Шаг 8). */
+export const TARGETED_COMBAT_CARD_IDS = {
+  BURST_FIRE: 'ACT_SOL_BURST_FIRE',
+  AIMED_FIRE: 'ACT_SOL_AIMED_FIRE',
+  BARRAGE: 'ACT_SOL_SUPPRESSIVE_FIRE',
+  SUPPRESSIVE_FIRE: 'ACT_CAP_SUPPRESSIVE_FIRE',
+  ADRENALINE: 'ACT_SCO_ADRENALINE',
+} as const;
+
+const TARGETED_ID_SET: ReadonlySet<string> = new Set(Object.values(TARGETED_COMBAT_CARD_IDS));
+
+export function isTargetedCombatCard(cardId: string): boolean {
+  return TARGETED_ID_SET.has(cardId);
+}
+
+export interface CardTargetSelection {
+  targetIntruderId?: string;
+  weaponSlotIndex?: number;
+  targetRoomId?: number;
+  option?: string;
+}
+
+function roomName(view: SanitizedGameState, roomId: number): string {
+  const room = view.ship.rooms[roomId];
+  const def =
+    (room
+      ? (SPECIAL_ROOMS.find((d) => d.id === room.definitionId) ??
+        BASIC_ROOMS_1.find((d) => d.id === room.definitionId) ??
+        ADDITIONAL_ROOMS_2.find((d) => d.id === room.definitionId))
+      : null) ?? null;
+
+  return def ? `${def.name} (#${roomId})` : `Отсек #${roomId}`;
+}
+
+/** Разумные defaults: первая особь, первое заряженное оружие, первый сосед, «Я сам»/«Выстрел». */
+export function defaultCardSelection(cardId: string, view: SanitizedGameState, playerId: string): CardTargetSelection {
+  const player = view.players[playerId];
+
+  if (!player) return {};
+
+  const intruders = roomIntruders(view, player.roomId);
+  const weaponIndex = player.handSlots.findIndex(
+    (slot) => slot.source === 'ITEM' && slot.card.isWeapon === true && (slot.card.ammo ?? 0) > 0,
+  );
+  const rooms = findAdjacentOpenRoomIds(view, player.roomId);
+  const shootDefaults: CardTargetSelection = {
+    ...(intruders[0] ? { targetIntruderId: intruders[0].id } : {}),
+    ...(weaponIndex >= 0 ? { weaponSlotIndex: weaponIndex } : {}),
+  };
+  const roomDefault: CardTargetSelection = rooms[0] !== undefined ? { targetRoomId: rooms[0] } : {};
+
+  switch (cardId) {
+    case TARGETED_COMBAT_CARD_IDS.BURST_FIRE:
+    case TARGETED_COMBAT_CARD_IDS.AIMED_FIRE:
+      return shootDefaults;
+
+    case TARGETED_COMBAT_CARD_IDS.BARRAGE:
+    case TARGETED_COMBAT_CARD_IDS.SUPPRESSIVE_FIRE:
+      return { ...roomDefault, option: 'SELF' };
+
+    case TARGETED_COMBAT_CARD_IDS.ADRENALINE:
+      return { ...shootDefaults, ...roomDefault, option: 'SHOOT' };
+
+    default:
+      return {};
+  }
+}
+
+/** Полнота наведения: кнопка «Подтвердить» без неё неактивна (движок — истина в последней инстанции). */
+export function isSelectionComplete(cardId: string, selection: CardTargetSelection): boolean {
+  switch (cardId) {
+    case TARGETED_COMBAT_CARD_IDS.BURST_FIRE:
+    case TARGETED_COMBAT_CARD_IDS.AIMED_FIRE:
+      return selection.targetIntruderId !== undefined && selection.weaponSlotIndex !== undefined;
+
+    case TARGETED_COMBAT_CARD_IDS.BARRAGE:
+    case TARGETED_COMBAT_CARD_IDS.SUPPRESSIVE_FIRE:
+      return selection.targetRoomId !== undefined && selection.option !== undefined;
+
+    case TARGETED_COMBAT_CARD_IDS.ADRENALINE:
+      if (selection.option === 'SHOOT') {
+        return selection.targetIntruderId !== undefined && selection.weaponSlotIndex !== undefined;
+      }
+
+      if (selection.option === 'ESCAPE') {
+        return selection.targetRoomId !== undefined;
+      }
+
+      return false;
+
+    default:
+      return true;
+  }
+}
+
+interface CardTargetingFormProps {
+  cardId: string;
+  view: SanitizedGameState;
+  playerId: string;
+  selection: CardTargetSelection;
+  onSelectionChange: (selection: CardTargetSelection) => void;
+}
+
+const SELECT_CLASS =
+  'w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none';
+
+const LABEL_CLASS = 'text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1';
+
+export const CardTargetingForm: React.FC<CardTargetingFormProps> = ({
+  cardId,
+  view,
+  playerId,
+  selection,
+  onSelectionChange,
+}) => {
+  const player = view.players[playerId];
+
+  if (!player) return null;
+
+  const intruders = roomIntruders(view, player.roomId);
+  const weapons = player.handSlots
+    .map((slot, index) => ({ slot, index }))
+    .filter(({ slot }) => slot.source === 'ITEM' && slot.card.isWeapon === true);
+  const rooms = findAdjacentOpenRoomIds(view, player.roomId);
+  const room = view.ship.rooms[player.roomId];
+  const companions = (room?.occupantPlayerIds ?? []).filter((id) => id !== playerId && !view.players[id]?.isDead);
+  const allowBoth = cardId === TARGETED_COMBAT_CARD_IDS.BARRAGE;
+  const isMoveCard =
+    cardId === TARGETED_COMBAT_CARD_IDS.BARRAGE || cardId === TARGETED_COMBAT_CARD_IDS.SUPPRESSIVE_FIRE;
+  const isAdrenaline = cardId === TARGETED_COMBAT_CARD_IDS.ADRENALINE;
+  const adrenalineMode = selection.option === 'ESCAPE' ? 'ESCAPE' : 'SHOOT';
+
+  const shootSection = (
+    <>
+      <div>
+        <span className={LABEL_CLASS}>Цель выстрела</span>
+        <select
+          aria-label="Цель выстрела"
+          className={SELECT_CLASS}
+          value={selection.targetIntruderId ?? ''}
+          onChange={(event) => onSelectionChange({ ...selection, targetIntruderId: event.target.value || undefined })}
+        >
+          {intruders.length === 0 && <option value="">Нет Чужих в отсеке</option>}
+          {intruders.map((intruder) => (
+            <option key={intruder.id} value={intruder.id}>
+              {INTRUDER_TYPE_LABELS[intruder.type]} (Ран: {intruder.woundsCount})
+            </option>
+          ))}
+        </select>
+      </div>
+      <div>
+        <span className={LABEL_CLASS}>Оружие</span>
+        <select
+          aria-label="Оружие"
+          className={SELECT_CLASS}
+          value={selection.weaponSlotIndex ?? ''}
+          onChange={(event) =>
+            onSelectionChange({
+              ...selection,
+              weaponSlotIndex: event.target.value === '' ? undefined : Number(event.target.value),
+            })
+          }
+        >
+          {weapons.length === 0 && <option value="">Нет оружия в руках</option>}
+          {weapons.map(({ slot, index }) => (
+            <option key={index} value={index}>
+              {slot.source === 'ITEM' ? `${slot.card.name} (патроны: ${slot.card.ammo ?? 0})` : ''}
+            </option>
+          ))}
+        </select>
+      </div>
+    </>
+  );
+
+  const roomSection = (
+    <div>
+      <span className={LABEL_CLASS}>Целевой отсек</span>
+      <select
+        aria-label="Целевой отсек"
+        className={SELECT_CLASS}
+        value={selection.targetRoomId ?? ''}
+        onChange={(event) =>
+          onSelectionChange({
+            ...selection,
+            targetRoomId: event.target.value === '' ? undefined : Number(event.target.value),
+          })
+        }
+      >
+        {rooms.length === 0 && <option value="">Нет пути через открытую Дверь</option>}
+        {rooms.map((roomId) => (
+          <option key={roomId} value={roomId}>
+            {roomName(view, roomId)}
+          </option>
+        ))}
+      </select>
+    </div>
+  );
+
+  const whoSection = (
+    <div>
+      <span className={LABEL_CLASS}>Кого увести</span>
+      <select
+        aria-label="Кого увести"
+        className={SELECT_CLASS}
+        value={selection.option ?? 'SELF'}
+        onChange={(event) => onSelectionChange({ ...selection, option: event.target.value })}
+      >
+        <option value="SELF">Я сам</option>
+        {companions.map((id) => (
+          <option key={`other-${id}`} value={`OTHER:${id}`}>
+            {view.players[id]?.name ?? id} (я остаюсь)
+          </option>
+        ))}
+        {allowBoth &&
+          companions.map((id) => (
+            <option key={`both-${id}`} value={`BOTH:${id}`}>
+              Я + {view.players[id]?.name ?? id}
+            </option>
+          ))}
+      </select>
+    </div>
+  );
+
+  return (
+    <div className="space-y-2.5 bg-slate-950/60 border border-slate-800 rounded-xl p-3">
+      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">Наведение карты</span>
+      {isAdrenaline && (
+        <div>
+          <span className={LABEL_CLASS}>Режим</span>
+          <div className="grid grid-cols-2 gap-2">
+            <button
+              type="button"
+              onClick={() => onSelectionChange({ ...selection, option: 'SHOOT' })}
+              className={`py-2 rounded-lg text-xs font-bold uppercase transition border ${adrenalineMode === 'SHOOT' ? 'bg-cyan-950 border-cyan-500 text-cyan-300' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
+            >
+              Выстрел
+            </button>
+            <button
+              type="button"
+              onClick={() => onSelectionChange({ ...selection, option: 'ESCAPE' })}
+              className={`py-2 rounded-lg text-xs font-bold uppercase transition border ${adrenalineMode === 'ESCAPE' ? 'bg-cyan-950 border-cyan-500 text-cyan-300' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
+            >
+              Побег
+            </button>
+          </div>
+        </div>
+      )}
+      {isMoveCard && (
+        <>
+          {roomSection}
+          {whoSection}
+        </>
+      )}
+      {isAdrenaline && adrenalineMode === 'SHOOT' && shootSection}
+      {isAdrenaline && adrenalineMode === 'ESCAPE' && roomSection}
+      {!isMoveCard && !isAdrenaline && shootSection}
+    </div>
+  );
+};
diff --git a/packages/client/src/components/hand/PlayerHandPanel.tsx b/packages/client/src/components/hand/PlayerHandPanel.tsx
index b5c4452..3dc932c 100644
--- a/packages/client/src/components/hand/PlayerHandPanel.tsx
+++ b/packages/client/src/components/hand/PlayerHandPanel.tsx
@@ -17,6 +17,13 @@ import {
   X,
 } from 'lucide-react';
 import { CardDetailsModal, type CardDetailsTarget } from '../modals/CardDetailsModal';
+import {
+  CardTargetingForm,
+  defaultCardSelection,
+  isSelectionComplete,
+  isTargetedCombatCard,
+  type CardTargetSelection,
+} from './CardTargetingForm';
 
 interface PlayerHandPanelProps {
   view: SanitizedGameState;
@@ -31,6 +38,7 @@ export const PlayerHandPanel: React.FC<PlayerHandPanelProps> = ({ view }) => {
 
   // Состояние подтверждения разыгрывания выбранной карты
   const [pendingPlayCard, setPendingPlayCard] = React.useState<ActionCard | null>(null);
+  const [cardTargets, setCardTargets] = React.useState<CardTargetSelection>({});
 
   const selectedCardIds = useGameStore((state) => state.selectedCardIds);
   const convertedCardIds = useGameStore((state) => state.convertedCardIds);
@@ -49,6 +57,7 @@ export const PlayerHandPanel: React.FC<PlayerHandPanelProps> = ({ view }) => {
     setPrevTurnKey(currentTurnKey);
     clearSelection();
     setPendingPlayCard(null);
+    setCardTargets({});
   }
 
   if (!player) return null;
@@ -78,6 +87,11 @@ export const PlayerHandPanel: React.FC<PlayerHandPanelProps> = ({ view }) => {
     setPendingPlayCard(null);
   };
 
+  const openPlayConfirm = (card: ActionCard) => {
+    setPendingPlayCard(card);
+    setCardTargets(defaultCardSelection(card.id, view, activePlayerId));
+  };
+
   const executePlayCard = (card: ActionCard) => {
     const discardCardIds = card.playCost > 0 ? consumePaymentCards(card.playCost) : [];
     dispatch({
@@ -85,9 +99,11 @@ export const PlayerHandPanel: React.FC<PlayerHandPanelProps> = ({ view }) => {
       payload: {
         cardId: card.id,
         discardCardIds,
+        ...cardTargets,
       },
     });
     setPendingPlayCard(null);
+    setCardTargets({});
     clearSelection();
   };
 
@@ -115,7 +131,7 @@ export const PlayerHandPanel: React.FC<PlayerHandPanelProps> = ({ view }) => {
           onClose={() => setInspectCardTarget(null)}
           onPlay={
             inspectCardTarget.kind === 'ACTION'
-              ? () => setPendingPlayCard(inspectCardTarget.card)
+              ? () => openPlayConfirm(inspectCardTarget.card)
               : inspectCardTarget.kind === 'ITEM'
                 ? () => handleUseItem(inspectCardTarget.card.id, inspectCardTarget.card.actionCost)
                 : undefined
@@ -437,7 +453,7 @@ export const PlayerHandPanel: React.FC<PlayerHandPanelProps> = ({ view }) => {
                       type="button"
                       onClick={(e) => {
                         e.stopPropagation();
-                        setPendingPlayCard(card as ActionCard);
+                        openPlayConfirm(card as ActionCard);
                       }}
                       className="mt-1 w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] py-1 rounded-lg shadow-lg flex items-center justify-center gap-1 active:scale-95 transition animate-in fade-in slide-in-from-top-1"
                     >
@@ -523,6 +539,16 @@ export const PlayerHandPanel: React.FC<PlayerHandPanelProps> = ({ view }) => {
               {pendingPlayCard.description}
             </div>
 
+            {isTargetedCombatCard(pendingPlayCard.id) && (
+              <CardTargetingForm
+                cardId={pendingPlayCard.id}
+                view={view}
+                playerId={activePlayerId}
+                selection={cardTargets}
+                onSelectionChange={setCardTargets}
+              />
+            )}
+
             {pendingPlayCard.playCost > 0 && (
               <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-900/50 p-2.5 rounded-lg flex items-center gap-2">
                 <Zap size={14} className="shrink-0" />
@@ -543,7 +569,8 @@ export const PlayerHandPanel: React.FC<PlayerHandPanelProps> = ({ view }) => {
               <button
                 type="button"
                 onClick={() => executePlayCard(pendingPlayCard)}
-                className="flex-1 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-heading font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition"
+                disabled={!isSelectionComplete(pendingPlayCard.id, cardTargets)}
+                className={`flex-1 py-2.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg transition ${isSelectionComplete(pendingPlayCard.id, cardTargets) ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 active:scale-95' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
               >
                 <Check size={14} /> Подтвердить
               </button>
diff --git a/packages/client/src/components/inspector/RoomInspector.test.tsx b/packages/client/src/components/inspector/RoomInspector.test.tsx
new file mode 100644
index 0000000..51ca179
--- /dev/null
+++ b/packages/client/src/components/inspector/RoomInspector.test.tsx
@@ -0,0 +1,206 @@
+import { describe, expect, it, vi } from 'vitest';
+import { renderToStaticMarkup } from 'react-dom/server';
+
+import type { SanitizedGameState } from '@nemesis/shared';
+import { createInitialGameState, filterStateForPlayer, findAdjacentOpenRoomIds } from '@nemesis/shared';
+
+import { RoomInspector } from './RoomInspector';
+
+const storeState: { view: SanitizedGameState | null; selectedRoomId: number | null } = {
+  view: null,
+  selectedRoomId: null,
+};
+
+vi.mock('../../store/gameStore', () => ({
+  useGameStore: (selector: (state: Record<string, unknown>) => unknown) =>
+    selector({
+      view: storeState.view,
+      selectedRoomId: storeState.selectedRoomId,
+      selectRoom: () => undefined,
+      dispatch: () => undefined,
+      rejection: null,
+      consumePaymentCards: () => [],
+    }),
+}));
+
+function showRoom(seed: string, withIntruders: boolean): void {
+  const state = createInitialGameState(seed);
+
+  if (withIntruders) {
+    state.intrudersPool.boardTokens.push(
+      {
+        id: 'test-adult-1',
+        type: 'ADULT',
+        roomId: 11,
+        woundsCount: 2,
+        token: { id: 'test-adult-1', type: 'ADULT', escapeNumber: 4 },
+      },
+      {
+        id: 'test-larva-1',
+        type: 'LARVA',
+        roomId: 11,
+        woundsCount: 0,
+        token: { id: 'test-larva-1', type: 'LARVA', escapeNumber: 1 },
+      },
+    );
+    state.ship.rooms[11]!.occupantIntruderIds.push('test-adult-1', 'test-larva-1');
+  }
+
+  storeState.view = filterStateForPlayer(state, 'player-1');
+  storeState.selectedRoomId = 11;
+}
+
+describe('RoomInspector: Чужие в отсеке', () => {
+  it('показывает блок с типами и ранами каждой особи', () => {
+    showRoom('room-inspector-intruders', true);
+
+    const html = renderToStaticMarkup(<RoomInspector />);
+
+    expect(html).toContain('Чужие в отсеке');
+    expect(html).toContain('Взрослая Особь');
+    expect(html).toContain('Личинка');
+    expect(html).toContain('Ран:');
+    expect(html.match(/rounded-\[2px\] bg-red-500/g)).toHaveLength(2);
+  });
+
+  it('без Чужих блок не показывает', () => {
+    showRoom('room-inspector-calm', false);
+
+    const html = renderToStaticMarkup(<RoomInspector />);
+
+    expect(html).not.toContain('Чужие в отсеке');
+  });
+});
+
+describe('RoomInspector: кнопка Стрельбы', () => {
+  function showRoomWithPlayer(seed: string, withIntruders: boolean, playerRoomId: number): void {
+    showRoom(seed, withIntruders);
+
+    const view = storeState.view!;
+    const playerId = view.meta.activePlayerId;
+    const player = view.players[playerId]!;
+
+    for (const room of Object.values(view.ship.rooms)) {
+      room.occupantPlayerIds = room.occupantPlayerIds.filter((id) => id !== playerId);
+    }
+
+    view.ship.rooms[playerRoomId]!.occupantPlayerIds.push(playerId);
+    player.roomId = playerRoomId;
+  }
+
+  it('показывает кнопку, когда игрок в бою', () => {
+    showRoomWithPlayer('room-inspector-shoot', true, 11);
+
+    const html = renderToStaticMarkup(<RoomInspector />);
+
+    expect(html).toContain('Стрельба [цена: 1]');
+  });
+
+  it('прячет кнопку без Чужих и вне боя', () => {
+    showRoomWithPlayer('room-inspector-nofight', false, 11);
+
+    expect(renderToStaticMarkup(<RoomInspector />)).not.toContain('Стрельба [цена: 1]');
+
+    showRoomWithPlayer('room-inspector-far', true, 1);
+
+    expect(renderToStaticMarkup(<RoomInspector />)).not.toContain('Стрельба [цена: 1]');
+  });
+});
+
+describe('RoomInspector: кнопка Рукопашной', () => {
+  function showRoomWithPlayer(seed: string, withIntruders: boolean, playerRoomId: number): void {
+    showRoom(seed, withIntruders);
+
+    const view = storeState.view!;
+    const playerId = view.meta.activePlayerId;
+    const player = view.players[playerId]!;
+
+    for (const room of Object.values(view.ship.rooms)) {
+      room.occupantPlayerIds = room.occupantPlayerIds.filter((id) => id !== playerId);
+    }
+
+    view.ship.rooms[playerRoomId]!.occupantPlayerIds.push(playerId);
+    player.roomId = playerRoomId;
+  }
+
+  it('показывает кнопку с бейджами цены, когда игрок в бою', () => {
+    showRoomWithPlayer('room-inspector-melee', true, 11);
+
+    const html = renderToStaticMarkup(<RoomInspector />);
+
+    expect(html).toContain('Рукопашная атака [цена: 1]');
+    expect(html).toContain('+1 Заражение');
+    expect(html).toContain('Риск Тяжёлой Травмы');
+  });
+
+  it('прячет кнопку без Чужих и вне боя', () => {
+    showRoomWithPlayer('room-inspector-melee-calm', false, 11);
+
+    expect(renderToStaticMarkup(<RoomInspector />)).not.toContain('Рукопашная атака [цена: 1]');
+
+    showRoomWithPlayer('room-inspector-melee-far', true, 1);
+
+    expect(renderToStaticMarkup(<RoomInspector />)).not.toContain('Рукопашная атака [цена: 1]');
+  });
+});
+
+describe('RoomInspector: подбор Тяжёлых Объектов', () => {
+  it('показывает объект на полу и кнопку подбора, когда игрок в отсеке', () => {
+    showRoom('room-inspector-pickup', false);
+
+    const html = renderToStaticMarkup(<RoomInspector />);
+
+    expect(html).toContain('Труп члена экипажа');
+    expect(html).toContain('Поднять [цена: 1]');
+  });
+
+  it('прячет кнопку подбора, когда игрока нет в отсеке', () => {
+    showRoom('room-inspector-pickup-far', false);
+
+    const view = storeState.view!;
+    const playerId = view.meta.activePlayerId;
+    const player = view.players[playerId]!;
+
+    for (const room of Object.values(view.ship.rooms)) {
+      room.occupantPlayerIds = room.occupantPlayerIds.filter((id) => id !== playerId);
+    }
+
+    view.ship.rooms[1]!.occupantPlayerIds.push(playerId);
+    player.roomId = 1;
+
+    const html = renderToStaticMarkup(<RoomInspector />);
+
+    expect(html).toContain('Труп члена экипажа');
+    expect(html).not.toContain('Поднять [цена: 1]');
+  });
+});
+
+describe('RoomInspector: предупреждение о Побеге', () => {
+  function showEscapeTarget(seed: string, withIntruders: boolean): void {
+    showRoom(seed, withIntruders);
+
+    const view = storeState.view!;
+    const playerId = view.meta.activePlayerId;
+    const target = findAdjacentOpenRoomIds(view, view.players[playerId]!.roomId)[0]!;
+
+    storeState.selectedRoomId = target;
+  }
+
+  it('показывает предупреждение, когда выход из отсека — Побег', () => {
+    showEscapeTarget('room-inspector-escape', true);
+
+    const html = renderToStaticMarkup(<RoomInspector />);
+
+    expect(html).toContain('Движение [цена: 1]');
+    expect(html).toContain('Побег: Чужие в отсеке атакуют в спину!');
+  });
+
+  it('без Чужих в отсеке предупреждения нет', () => {
+    showEscapeTarget('room-inspector-escape-calm', false);
+
+    const html = renderToStaticMarkup(<RoomInspector />);
+
+    expect(html).toContain('Движение [цена: 1]');
+    expect(html).not.toContain('атакуют в спину');
+  });
+});
diff --git a/packages/client/src/components/inspector/RoomInspector.tsx b/packages/client/src/components/inspector/RoomInspector.tsx
index 5d863f0..81d05c0 100644
--- a/packages/client/src/components/inspector/RoomInspector.tsx
+++ b/packages/client/src/components/inspector/RoomInspector.tsx
@@ -1,15 +1,26 @@
 import React from 'react';
-import type { BoardObject, CarefulMoveChosenCorridor, CorridorNumber, SanitizedRoomState } from '@nemesis/shared';
+import type { CarefulMoveChosenCorridor, CorridorNumber, IntruderEntity, SanitizedRoomState } from '@nemesis/shared';
 import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1, SPECIAL_ROOMS, findAdjacentOpenRoomIds } from '@nemesis/shared';
 import { useGameStore } from '../../store/gameStore';
-import { X, Flame, Wrench, Laptop, Package, User, Footprints, AlertCircle, Ban, ShieldAlert } from 'lucide-react';
-
-/** Подписи Тяжёлых объектов на полу отсека (стр. 22). */
-const BOARD_OBJECT_LABELS: Record<BoardObject['kind'], string> = {
-  CORPSE: 'Труп члена экипажа',
-  EGG: 'Яйцо Чужих',
-  INTRUDER_REMAINS: 'Останки Чужого',
-};
+import {
+  X,
+  Flame,
+  Wrench,
+  Laptop,
+  Package,
+  User,
+  Footprints,
+  AlertCircle,
+  Ban,
+  ShieldAlert,
+  Bug,
+  Crosshair,
+  Swords,
+} from 'lucide-react';
+import { HEAVY_OBJECT_LABELS, INTRUDER_TYPE_COLORS, INTRUDER_TYPE_LABELS } from '../../utils/labels';
+import { roomIntruders } from '../../utils/roomIntruders';
+import { ShootModal } from '../modals/ShootModal';
+import { MeleeModal } from '../modals/MeleeModal';
 
 const CATEGORY_LABELS: Record<SanitizedRoomState['category'], string> = {
   SPECIAL: 'ОСОБАЯ',
@@ -25,6 +36,31 @@ function unknown(value: string | number | boolean | null): string {
   return String(value);
 }
 
+/** Строка особи Чужого: тип цветом миниатюры и шкала полученных ран. */
+function IntruderRow({ entity }: { entity: IntruderEntity }): React.ReactElement {
+  const colors = INTRUDER_TYPE_COLORS[entity.type];
+
+  return (
+    <div className="flex items-center gap-2 text-xs bg-slate-900/60 p-1.5 rounded">
+      <span
+        className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/60"
+        style={{ backgroundColor: colors.fill }}
+      />
+      <b className="text-white">{INTRUDER_TYPE_LABELS[entity.type]}</b>
+      <span className="ml-auto flex items-center gap-1 text-slate-400">
+        Ран: {entity.woundsCount}
+        {entity.woundsCount > 0 && (
+          <span className="flex gap-0.5">
+            {Array.from({ length: entity.woundsCount }).map((_, index) => (
+              <span key={index} className="w-2 h-2 rounded-[2px] bg-red-500" />
+            ))}
+          </span>
+        )}
+      </span>
+    </div>
+  );
+}
+
 export const RoomInspector: React.FC = () => {
   const view = useGameStore((state) => state.view);
   const selectedRoomId = useGameStore((state) => state.selectedRoomId);
@@ -34,6 +70,9 @@ export const RoomInspector: React.FC = () => {
   const consumePaymentCards = useGameStore((state) => state.consumePaymentCards);
 
   const [isCarefulSelecting, setIsCarefulSelecting] = React.useState(false);
+  const [showShootModal, setShowShootModal] = React.useState(false);
+  const [showMeleeModal, setShowMeleeModal] = React.useState(false);
+  const [showEscapeConfirm, setShowEscapeConfirm] = React.useState(false);
 
   if (!view || !selectedRoomId) return null;
 
@@ -50,11 +89,16 @@ export const RoomInspector: React.FC = () => {
   const activePlayer = view.players[activePlayerId];
   const isPlayerHere = room.occupantPlayerIds.includes(activePlayerId);
   const occupantNames = room.occupantPlayerIds.map((playerId) => view.players[playerId]?.name ?? playerId);
+  const intruders = roomIntruders(view, room.id);
 
   // Переходить можно только в соседний отсек через открытую Дверь (стр. 14):
   const reachableRoomIds = activePlayer ? findAdjacentOpenRoomIds(view, activePlayer.roomId) : [];
   const canMoveHere = !isPlayerHere && reachableRoomIds.includes(room.id);
 
+  // Побег (стр. 19): уход из отсека с Чужими — только через подтверждение.
+  const activeRoomIntruders = activePlayer ? roomIntruders(view, activePlayer.roomId) : [];
+  const isEscape = canMoveHere && activeRoomIntruders.length > 0;
+
   // Коридоры, ведущие в целевой отсек (для выбора коридора при осторожном движении)
   const corridorsIntoTarget = Object.values(view.ship.corridors).filter(
     (c) => c.fromRoomId === room.id || c.toRoomId === room.id,
@@ -95,6 +139,16 @@ export const RoomInspector: React.FC = () => {
     });
   };
 
+  const handleMoveClick = () => {
+    if (isEscape && !showEscapeConfirm) {
+      setShowEscapeConfirm(true);
+      return;
+    }
+
+    setShowEscapeConfirm(false);
+    handleNormalMove();
+  };
+
   const handleCarefulMove = (chosen: CarefulMoveChosenCorridor) => {
     const discardCardIds = consumePaymentCards(2);
     dispatch({
@@ -124,6 +178,14 @@ export const RoomInspector: React.FC = () => {
     });
   };
 
+  const handlePickUpObject = (objectId: string) => {
+    const discardCardIds = consumePaymentCards(1);
+    dispatch({
+      type: 'ACTION_PICK_UP_OBJECT',
+      payload: { objectId, discardCardIds },
+    });
+  };
+
   return (
     <div className="absolute bottom-0 left-0 right-0 md:bottom-auto md:top-4 md:right-4 md:left-auto md:w-96 bg-nemesis-hull/95 backdrop-blur-md border-t md:border border-nemesis-border md:rounded-xl shadow-2xl p-4 z-30 transition-all">
       {/* Шапка инспектора */}
@@ -200,6 +262,19 @@ export const RoomInspector: React.FC = () => {
           </div>
         )}
 
+        {/* Чужие в отсеке */}
+        {intruders.length > 0 && (
+          <div className="bg-red-950/30 border border-red-900/50 p-2 rounded space-y-1.5">
+            <div className="text-[11px] text-rose-300 flex items-center gap-2 font-bold uppercase tracking-wider">
+              <Bug size={14} />
+              <span>Чужие в отсеке: {intruders.length}</span>
+            </div>
+            {intruders.map((entity) => (
+              <IntruderRow key={entity.id} entity={entity} />
+            ))}
+          </div>
+        )}
+
         {room.objects.map((object) => (
           <div
             key={object.id}
@@ -207,8 +282,17 @@ export const RoomInspector: React.FC = () => {
           >
             <AlertCircle size={14} />
             <span>
-              На полу: <b>{BOARD_OBJECT_LABELS[object.kind]}</b>
+              На полу: <b>{HEAVY_OBJECT_LABELS[object.kind]}</b>
             </span>
+            {isPlayerHere && (
+              <button
+                type="button"
+                onClick={() => handlePickUpObject(object.id)}
+                className="ml-auto px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[11px] active:scale-95 transition"
+              >
+                Поднять [цена: 1]
+              </button>
+            )}
           </div>
         ))}
 
@@ -306,13 +390,75 @@ export const RoomInspector: React.FC = () => {
                 <span>Использовать консоль отсека [цена: {roomDef.actionCost}]</span>
               </button>
             )}
+
+            {/* Стрельба по Чужим в отсеке */}
+            {intruders.length > 0 && (
+              <button
+                type="button"
+                onClick={() => setShowShootModal(true)}
+                className="w-full min-h-[38px] bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
+              >
+                <Crosshair size={14} /> Стрельба [цена: 1]
+              </button>
+            )}
+
+            {/* Рукопашная атака: без патронов, но с гарантированной ценой */}
+            {intruders.length > 0 && (
+              <button
+                type="button"
+                onClick={() => setShowMeleeModal(true)}
+                className="w-full min-h-[38px] bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
+              >
+                <Swords size={14} /> Рукопашная атака [цена: 1]
+              </button>
+            )}
+            {intruders.length > 0 && (
+              <div className="flex gap-1.5">
+                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 border border-amber-500/60 text-amber-300">
+                  +1 Заражение
+                </span>
+                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950/60 border border-rose-500/60 text-rose-300">
+                  Риск Тяжёлой Травмы
+                </span>
+              </div>
+            )}
           </div>
         )}
 
-        {canMoveHere && !isCarefulSelecting && (
+        {showEscapeConfirm && canMoveHere && (
+          <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-lg mb-2 space-y-2">
+            <div className="text-xs text-red-200">
+              В отсеке находятся Чужие! Попытка побега спровоцирует внеочередную атаку монстров в спину. Бежать?
+            </div>
+            <div className="flex gap-2">
+              <button
+                type="button"
+                onClick={handleMoveClick}
+                className="flex-1 min-h-[36px] bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs active:scale-95 transition"
+              >
+                Бежать [цена: 1]
+              </button>
+              <button
+                type="button"
+                onClick={() => setShowEscapeConfirm(false)}
+                className="flex-1 min-h-[36px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs active:scale-95 transition"
+              >
+                Отмена
+              </button>
+            </div>
+          </div>
+        )}
+
+        {canMoveHere && !isCarefulSelecting && !showEscapeConfirm && (
           <div className="flex flex-col gap-1.5">
+            {isEscape && (
+              <div className="text-[11px] bg-red-950/40 border border-red-900/60 p-2 rounded flex items-start gap-2 text-red-200">
+                <AlertCircle size={14} className="mt-0.5 shrink-0" />
+                <span>Побег: Чужие в отсеке атакуют в спину!</span>
+              </div>
+            )}
             <button
-              onClick={handleNormalMove}
+              onClick={handleMoveClick}
               className="w-full min-h-[40px] bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
             >
               <Footprints size={14} /> Движение [цена: 1]
@@ -332,6 +478,9 @@ export const RoomInspector: React.FC = () => {
           </div>
         )}
       </div>
+
+      {showShootModal && <ShootModal roomId={room.id} onClose={() => setShowShootModal(false)} />}
+      {showMeleeModal && <MeleeModal roomId={room.id} onClose={() => setShowMeleeModal(false)} />}
     </div>
   );
 };
diff --git a/packages/client/src/components/log/gameLogModel.test.ts b/packages/client/src/components/log/gameLogModel.test.ts
index 3dd8ae9..89bcb9d 100644
--- a/packages/client/src/components/log/gameLogModel.test.ts
+++ b/packages/client/src/components/log/gameLogModel.test.ts
@@ -105,3 +105,416 @@ describe('gameLogModel: русские сообщения и semantic tones', ()
     expect(view.ship.rooms[hiddenRoomId!]?.definitionId).toBeNull();
   });
 });
+describe('gameLogModel: Контакт и Внезапная атака', () => {
+  it('форматирует Контакт с жетоном, первым флагом и сбросом Шума', () => {
+    const view = filterStateForPlayer(createInitialGameState('game-log-model-contact'), 'player-1');
+
+    view.gameLog = [
+      eventEntry(1, {
+        type: 'CONTACT_OCCURRED',
+        playerId: 'player-1',
+        roomId: 6,
+        tokenType: 'QUEEN',
+        escapeNumber: 4,
+        handCount: 2,
+        isFirstContact: true,
+        clearedCorridorIds: ['3-6'],
+        clearedTechnical: true,
+      }),
+    ];
+
+    const [entry] = formatGameLog(view);
+    const message = entry!.segments.map((segment) => segment.text).join('');
+
+    expect(message).toContain('КОНТАКТ');
+    expect(message).toContain('Королева');
+    expect(message).toContain('число Бегства 4');
+    expect(message).toContain('Первый Контакт партии');
+    expect(message).toContain('Маркеры Шума сброшены (включая Технические Коридоры)');
+    expect(entry!.segments.some((segment) => segment.tone === 'danger' && segment.strong)).toBe(true);
+  });
+
+  it('форматирует Пустой жетон и причину шума от него', () => {
+    const view = filterStateForPlayer(createInitialGameState('game-log-model-blank'), 'player-1');
+
+    view.gameLog = [
+      eventEntry(1, {
+        type: 'CONTACT_OCCURRED',
+        playerId: 'player-1',
+        roomId: 6,
+        tokenType: 'BLANK',
+        escapeNumber: 0,
+        handCount: 5,
+        isFirstContact: false,
+        clearedCorridorIds: [],
+        clearedTechnical: false,
+      }),
+      eventEntry(2, {
+        type: 'NOISE_MARKER_PLACED',
+        playerId: 'player-1',
+        roomId: 6,
+        target: { kind: 'CORRIDOR', corridorId: '3-6' },
+        reason: 'BLANK',
+      }),
+    ];
+
+    const messages = formatGameLog(view).map((entry) => entry.segments.map((segment) => segment.text).join(''));
+
+    expect(messages[0]).toContain('Пустой');
+    expect(messages[0]).not.toContain('Первый Контакт партии');
+    expect(messages[1]).toContain('Пустой жетон');
+  });
+
+  it('форматирует триггер и все исходы Внезапной атаки', () => {
+    const view = filterStateForPlayer(createInitialGameState('game-log-model-surprise'), 'player-1');
+
+    view.gameLog = [
+      eventEntry(1, {
+        type: 'SURPRISE_ATTACK_TRIGGERED',
+        playerId: 'player-1',
+        intruderId: 'test-adult-1',
+        intruderType: 'ADULT',
+        handCount: 2,
+        escapeNumber: 4,
+      }),
+      eventEntry(2, {
+        type: 'SURPRISE_ATTACK_RESOLVED',
+        playerId: 'player-1',
+        intruderId: 'test-adult-1',
+        intruderType: 'ADULT',
+        attackCardId: 'TAIL_1',
+        attackCardName: 'Атака хвостом',
+        hit: false,
+        outcome: 'MISSED',
+        lightWoundsDealt: 0,
+        seriousWoundsDealt: 0,
+        contaminationDealt: 0,
+      }),
+      eventEntry(3, {
+        type: 'SURPRISE_ATTACK_RESOLVED',
+        playerId: 'player-1',
+        intruderId: 'test-adult-1',
+        intruderType: 'ADULT',
+        attackCardId: 'SCRATCH_1',
+        attackCardName: 'Царапина',
+        hit: true,
+        outcome: 'HIT_SURVIVED',
+        lightWoundsDealt: 1,
+        seriousWoundsDealt: 0,
+        contaminationDealt: 1,
+      }),
+      eventEntry(4, {
+        type: 'SURPRISE_ATTACK_RESOLVED',
+        playerId: 'player-1',
+        intruderId: 'test-larva-1',
+        intruderType: 'LARVA',
+        attackCardId: null,
+        attackCardName: null,
+        hit: true,
+        outcome: 'LARVA_INFECTION',
+        lightWoundsDealt: 0,
+        seriousWoundsDealt: 0,
+        contaminationDealt: 1,
+      }),
+      eventEntry(5, {
+        type: 'SURPRISE_ATTACK_RESOLVED',
+        playerId: 'player-1',
+        intruderId: 'test-adult-1',
+        intruderType: 'ADULT',
+        attackCardId: 'BITE_1',
+        attackCardName: 'Укус',
+        hit: true,
+        outcome: 'HIT_DIED',
+        lightWoundsDealt: 0,
+        seriousWoundsDealt: 0,
+        contaminationDealt: 0,
+      }),
+    ];
+
+    const messages = formatGameLog(view).map((entry) => entry.segments.map((segment) => segment.text).join(''));
+
+    expect(messages[0]).toContain('ВНЕЗАПНАЯ АТАКА');
+    expect(messages[0]).toContain('Взрослая Особь');
+    expect(messages[1]).toContain('Мимо');
+    expect(messages[2]).toContain('пережил Внезапную атаку («Царапина»): 1 Лёгкая Травма, 1 Заражение.');
+    expect(messages[3]).toContain('заражает');
+    expect(messages[4]).toContain('погибает от Внезапной атаки («Укус»)!');
+  });
+
+  it('форматирует все исходы внеочередной атаки при Побеге', () => {
+    const view = filterStateForPlayer(createInitialGameState('game-log-model-escape'), 'player-1');
+
+    view.gameLog = [
+      eventEntry(1, {
+        type: 'ESCAPE_ATTACK_RESOLVED',
+        playerId: 'player-1',
+        intruderId: 'test-adult-1',
+        intruderType: 'ADULT',
+        attackCardId: 'TAIL_1',
+        attackCardName: 'Атака хвостом',
+        hit: false,
+        outcome: 'MISSED',
+        lightWoundsDealt: 0,
+        seriousWoundsDealt: 0,
+        contaminationDealt: 0,
+      }),
+      eventEntry(2, {
+        type: 'ESCAPE_ATTACK_RESOLVED',
+        playerId: 'player-1',
+        intruderId: 'test-adult-1',
+        intruderType: 'ADULT',
+        attackCardId: 'SCRATCH_1',
+        attackCardName: 'Царапина',
+        hit: true,
+        outcome: 'HIT_SURVIVED',
+        lightWoundsDealt: 1,
+        seriousWoundsDealt: 0,
+        contaminationDealt: 1,
+      }),
+      eventEntry(3, {
+        type: 'ESCAPE_ATTACK_RESOLVED',
+        playerId: 'player-1',
+        intruderId: 'test-larva-1',
+        intruderType: 'LARVA',
+        attackCardId: null,
+        attackCardName: null,
+        hit: true,
+        outcome: 'LARVA_INFECTION',
+        lightWoundsDealt: 0,
+        seriousWoundsDealt: 0,
+        contaminationDealt: 1,
+      }),
+      eventEntry(4, {
+        type: 'ESCAPE_ATTACK_RESOLVED',
+        playerId: 'player-1',
+        intruderId: 'test-adult-1',
+        intruderType: 'ADULT',
+        attackCardId: 'BITE_1',
+        attackCardName: 'Укус',
+        hit: true,
+        outcome: 'HIT_DIED',
+        lightWoundsDealt: 0,
+        seriousWoundsDealt: 0,
+        contaminationDealt: 0,
+      }),
+    ];
+
+    const messages = formatGameLog(view).map((entry) => entry.segments.map((segment) => segment.text).join(''));
+
+    expect(messages[0]).toContain('Мимо');
+    expect(messages[0]).toContain('убегающего');
+    expect(messages[1]).toContain('пережил атаку в спину («Царапина»): 1 Лёгкая Травма, 1 Заражение.');
+    expect(messages[2]).toContain('заражает убегающего');
+    expect(messages[3]).toContain('погибает при Побеге («Укус»)!');
+  });
+
+  it('форматирует Трансформацию, Зов и гибель персонажа', () => {
+    const view = filterStateForPlayer(createInitialGameState('game-log-model-specials'), 'player-1');
+
+    view.gameLog = [
+      eventEntry(1, {
+        type: 'INTRUDER_TRANSFORMED',
+        roomId: 6,
+        oldIntruderId: 'test-creeper-1',
+        newIntruderId: 'test-breeder-1',
+      }),
+      eventEntry(2, {
+        type: 'INTRUDER_CALLED',
+        roomId: 6,
+        intruderId: 'test-adult-9',
+        tokenType: 'ADULT',
+      }),
+      eventEntry(3, { type: 'INTRUDER_CALLED', roomId: 6, intruderId: null, tokenType: 'BLANK' }),
+      eventEntry(4, { type: 'PLAYER_DIED', playerId: 'player-1', roomId: 6, cause: 'INTRUDER_ATTACK' }),
+    ];
+
+    const messages = formatGameLog(view).map((entry) => entry.segments.map((segment) => segment.text).join(''));
+
+    expect(messages[0]).toContain('Трансформация');
+    expect(messages[0]).toContain('Крипер становится Трутнем');
+    expect(messages[1]).toContain('появляется');
+    expect(messages[1]).toContain('Взрослая Особь');
+    expect(messages[2]).toContain('никто не пришёл');
+    expect(messages[3]).toContain('погибает');
+    expect(messages[3]).toContain('Труп остаётся в отсеке');
+  });
+
+  it('форматирует завершение партии гибелью всех персонажей', () => {
+    const view = filterStateForPlayer(createInitialGameState('game-log-model-all-dead'), 'player-1');
+
+    view.gameLog = [eventEntry(1, { type: 'GAME_OVER', reason: 'ALL_PLAYERS_DEAD' })];
+
+    const message = formatGameLog(view)[0]!
+      .segments.map((segment) => segment.text)
+      .join('');
+
+    expect(message).toContain('ПАРТИЯ ЗАВЕРШЕНА');
+    expect(message).toContain('погибли все персонажи');
+  });
+});
+
+describe('gameLogModel: Стрельба и Стойкость', () => {
+  it('форматирует выстрел, проверку Стойкости, гибель и отступление', () => {
+    const view = filterStateForPlayer(createInitialGameState('game-log-model-shoot'), 'player-1');
+
+    view.gameLog = [
+      eventEntry(1, {
+        type: 'SHOT_FIRED',
+        playerId: 'player-1',
+        roomId: 1,
+        intruderId: 'i-1',
+        intruderType: 'ADULT',
+        weaponId: 'w-1',
+        weaponName: 'Пистолет',
+        dieFace: 'ONE_WOUND',
+        woundsDealt: 1,
+      }),
+      eventEntry(2, {
+        type: 'TOUGHNESS_CHECKED',
+        playerId: 'player-1',
+        roomId: 1,
+        intruderId: 'i-1',
+        intruderType: 'ADULT',
+        attackCards: [{ id: 'a-1', name: 'Царапина', toughness: 2, hasRetreat: false }],
+        woundsTotal: 1,
+        killed: false,
+        retreated: false,
+      }),
+      eventEntry(3, {
+        type: 'SHOT_FIRED',
+        playerId: 'player-1',
+        roomId: 1,
+        intruderId: 'i-1',
+        intruderType: 'ADULT',
+        weaponId: 'w-1',
+        weaponName: 'Пистолет',
+        dieFace: 'MISS',
+        woundsDealt: 0,
+      }),
+      eventEntry(4, {
+        type: 'INTRUDER_KILLED',
+        playerId: 'player-1',
+        roomId: 1,
+        intruderId: 'i-1',
+        intruderType: 'ADULT',
+      }),
+      eventEntry(5, {
+        type: 'INTRUDER_RETREATED',
+        playerId: 'player-1',
+        intruderId: 'i-2',
+        intruderType: 'CREEPER',
+        fromRoomId: 1,
+        toRoomId: 2,
+      }),
+    ];
+
+    const messages = formatGameLog(view).map((entry) => entry.segments.map((segment) => segment.text).join(''));
+
+    expect(messages[0]).toContain('стреляет из «Пистолет»');
+    expect(messages[0]).toContain('1 Рана');
+    expect(messages[0]).toContain('Ран нанесено: 1');
+    expect(messages[1]).toContain('Проверка Стойкости');
+    expect(messages[1]).toContain('«Царапина» (Стойкость 2)');
+    expect(messages[1]).toContain('Чужой выживает.');
+    expect(messages[2]).toContain('Промах');
+    expect(messages[3]).toContain('убивает');
+    expect(messages[4]).toContain('отступить');
+  });
+
+  it('показывает отступление и гибель в проверке Стойкости', () => {
+    const view = filterStateForPlayer(createInitialGameState('game-log-model-toughness'), 'player-1');
+
+    view.gameLog = [
+      eventEntry(1, {
+        type: 'TOUGHNESS_CHECKED',
+        playerId: 'player-1',
+        roomId: 1,
+        intruderId: 'i-1',
+        intruderType: 'CREEPER',
+        attackCards: [{ id: 'a-1', name: 'Укус', toughness: 2, hasRetreat: true }],
+        woundsTotal: 6,
+        killed: false,
+        retreated: true,
+      }),
+      eventEntry(2, {
+        type: 'TOUGHNESS_CHECKED',
+        playerId: 'player-1',
+        roomId: 1,
+        intruderId: 'i-2',
+        intruderType: 'BREEDER',
+        attackCards: [
+          { id: 'a-2', name: 'Царапина', toughness: 3, hasRetreat: false },
+          { id: 'a-3', name: 'Укус', toughness: 4, hasRetreat: false },
+        ],
+        woundsTotal: 7,
+        killed: true,
+        retreated: false,
+      }),
+    ];
+
+    const messages = formatGameLog(view).map((entry) => entry.segments.map((segment) => segment.text).join(''));
+
+    expect(messages[0]).toContain('отступление!');
+    expect(messages[0]).toContain('Чужой отступает!');
+    expect(messages[1]).toContain(' + ');
+    expect(messages[1]).toContain('Чужой убит!');
+  });
+
+  it('форматирует рукопашную с ценой и промахом', () => {
+    const view = filterStateForPlayer(createInitialGameState('game-log-model-melee'), 'player-1');
+
+    view.gameLog = [
+      eventEntry(1, {
+        type: 'MELEE_ATTACKED',
+        playerId: 'player-1',
+        roomId: 1,
+        intruderId: 'i-1',
+        intruderType: 'CREEPER',
+        dieFace: 'TAIL',
+        woundsDealt: 1,
+        contaminationDealt: 1,
+        seriousWoundDealt: 0,
+      }),
+      eventEntry(2, {
+        type: 'MELEE_ATTACKED',
+        playerId: 'player-1',
+        roomId: 1,
+        intruderId: 'i-1',
+        intruderType: 'ADULT',
+        dieFace: 'MISS',
+        woundsDealt: 0,
+        contaminationDealt: 1,
+        seriousWoundDealt: 1,
+      }),
+    ];
+
+    const messages = formatGameLog(view).map((entry) => entry.segments.map((segment) => segment.text).join(''));
+
+    expect(messages[0]).toContain('атакует врукопашную');
+    expect(messages[0]).toContain('Хвост');
+    expect(messages[0]).toContain('Заражение: +1');
+    expect(messages[1]).toContain('промах');
+    expect(messages[1]).toContain('Тяжёлая Травма: +1');
+  });
+
+  it('форматирует подбор Тяжёлого Объекта', () => {
+    const view = filterStateForPlayer(createInitialGameState('game-log-model-pickup'), 'player-1');
+
+    view.gameLog = [
+      eventEntry(1, {
+        type: 'OBJECT_PICKED_UP',
+        playerId: 'player-1',
+        roomId: 1,
+        objectId: 'remains-1',
+        objectKind: 'INTRUDER_REMAINS',
+      }),
+    ];
+
+    const message = formatGameLog(view)[0]!
+      .segments.map((segment) => segment.text)
+      .join('');
+
+    expect(message).toContain('подбирает');
+    expect(message).toContain('Останки Чужого');
+  });
+});
diff --git a/packages/client/src/components/log/gameLogModel.ts b/packages/client/src/components/log/gameLogModel.ts
index dadeabf..eae644b 100644
--- a/packages/client/src/components/log/gameLogModel.ts
+++ b/packages/client/src/components/log/gameLogModel.ts
@@ -4,9 +4,17 @@ import {
   SPECIAL_ROOMS,
   type GameLogEntry,
   type GameLogEvent,
+  type GameOverReason,
   type SanitizedGameState,
 } from '@nemesis/shared';
 
+import {
+  COMBAT_DIE_FACE_LABELS,
+  HEAVY_OBJECT_LABELS,
+  INTRUDER_TOKEN_LABELS,
+  INTRUDER_TYPE_LABELS,
+} from '../../utils/labels';
+
 export type GameLogTone =
   | 'system'
   | 'player'
@@ -57,6 +65,12 @@ const CATEGORY_LABELS: Record<Extract<GameLogEvent, { type: 'ROOM_DISCOVERED' }>
   ROOM_2: 'дополнительная «2»',
 };
 
+const GAME_OVER_LABELS: Record<GameOverReason, string> = {
+  SHIP_EXPLODED: ': корабль взорвался.',
+  HULL_BREACH: ': произошёл разрыв обшивки.',
+  ALL_PLAYERS_DEAD: ': погибли все персонажи.',
+};
+
 const OUTCOME_LABELS: Record<Extract<GameLogEvent, { type: 'EXPLORATION_EFFECT_RESOLVED' }>['outcome'], string> = {
   FIRE_PLACED: 'маркер Пожара установлен',
   FIRE_ALREADY_PRESENT: 'Пожар уже был в отсеке',
@@ -79,7 +93,7 @@ function playerName(view: SanitizedGameState, playerId: string): string {
   return view.players[playerId]?.name ?? playerId;
 }
 
-function roomLabel(view: SanitizedGameState, roomId: number): string {
+export function roomLabel(view: SanitizedGameState, roomId: number): string {
   const room = view.ship.rooms[roomId];
   const numberLabel = `#${String(roomId).padStart(3, '0')}`;
 
@@ -117,6 +131,7 @@ function targetLabel(target: Extract<GameLogEvent, { type: 'NOISE_MARKER_PLACED'
 function reasonLabel(reason: Extract<GameLogEvent, { type: 'NOISE_MARKER_PLACED' }>['reason']): string {
   if (reason === 'CAREFUL') return 'Осторожное движение';
   if (reason === 'DANGER') return 'Опасность';
+  if (reason === 'BLANK') return 'Пустой жетон';
 
   return 'бросок Шума';
 }
@@ -148,6 +163,19 @@ function outcomeTone(outcome: Extract<GameLogEvent, { type: 'EXPLORATION_EFFECT_
   return 'silence';
 }
 
+export function woundsSummary(light: number, serious: number, contamination: number): string | null {
+  const parts: string[] = [];
+
+  if (light > 0) parts.push(light === 1 ? '1 Лёгкая Травма' : `${light} Лёгкие Травмы`);
+  if (serious > 0) parts.push(serious === 1 ? '1 Тяжёлая Травма' : `${serious} Тяжёлые Травмы`);
+
+  if (contamination > 0) {
+    parts.push(contamination === 1 ? '1 Заражение' : `${contamination} Заражения`);
+  }
+
+  return parts.length > 0 ? parts.join(', ') : null;
+}
+
 function formatEntry(entry: GameLogEntry, view: SanitizedGameState): GameLogSegment[] {
   const event = entry.event;
 
@@ -286,11 +314,207 @@ function formatEntry(entry: GameLogEntry, view: SanitizedGameState): GameLogSegm
         { text: 'Выпавший номер не имеет выхода из отсека: маркер не установлен.', tone: 'warning', strong: true },
       ];
 
-    case 'GAME_OVER':
+    case 'CONTACT_OCCURRED': {
+      const cleared: GameLogSegment[] =
+        event.clearedCorridorIds.length > 0 || event.clearedTechnical
+          ? [
+              {
+                text: ` Маркеры Шума сброшены${event.clearedTechnical ? ' (включая Технические Коридоры)' : ''}.`,
+                tone: 'noise',
+              },
+            ]
+          : [];
+
+      return [
+        { text: 'КОНТАКТ', tone: 'danger', strong: true },
+        { text: '! ' },
+        { text: playerName(view, event.playerId), tone: 'player', strong: true },
+        { text: ` в ${roomLabel(view, event.roomId)} — жетон «` },
+        { text: INTRUDER_TOKEN_LABELS[event.tokenType], tone: 'danger', strong: true },
+        {
+          text: `» (число Бегства ${event.escapeNumber}, карт на руке: ${event.handCount}).`,
+        },
+        ...(event.isFirstContact ? [{ text: ' Первый Контакт партии!', tone: 'warning' as const, strong: true }] : []),
+        ...cleared,
+      ];
+    }
+
+    case 'SURPRISE_ATTACK_TRIGGERED':
+      return [
+        { text: 'ВНЕЗАПНАЯ АТАКА', tone: 'error', strong: true },
+        { text: '! ' },
+        { text: INTRUDER_TYPE_LABELS[event.intruderType], tone: 'danger', strong: true },
+        { text: ' атакует ' },
+        { text: playerName(view, event.playerId), tone: 'player', strong: true },
+        { text: ` (карт на руке: ${event.handCount}, число Бегства: ${event.escapeNumber}).` },
+      ];
+
+    case 'SURPRISE_ATTACK_RESOLVED': {
+      if (event.outcome === 'MISSED') {
+        return [
+          { text: 'Мимо', tone: 'success', strong: true },
+          { text: `! Карта «${event.attackCardName ?? '—'}» не задела ` },
+          { text: playerName(view, event.playerId), tone: 'player', strong: true },
+          { text: '.' },
+        ];
+      }
+
+      if (event.outcome === 'LARVA_INFECTION') {
+        return [
+          { text: 'Личинка', tone: 'danger', strong: true },
+          { text: ' заражает ' },
+          { text: playerName(view, event.playerId), tone: 'player', strong: true },
+          { text: ': +1 Заражение, Личинка уходит на планшет персонажа.' },
+        ];
+      }
+
+      if (event.outcome === 'HIT_DIED') {
+        return [
+          { text: playerName(view, event.playerId), tone: 'player', strong: true },
+          { text: ` погибает от Внезапной атаки («${event.attackCardName ?? '—'}»)!` },
+        ];
+      }
+
+      const summary = woundsSummary(event.lightWoundsDealt, event.seriousWoundsDealt, event.contaminationDealt);
+
+      return [
+        { text: playerName(view, event.playerId), tone: 'player', strong: true },
+        { text: ` пережил Внезапную атаку («${event.attackCardName ?? '—'}»)` },
+        ...(summary ? [{ text: `: ${summary}.` }] : [{ text: ' без ран и Заражения.' }]),
+      ];
+    }
+
+    case 'ESCAPE_ATTACK_RESOLVED': {
+      if (event.outcome === 'MISSED') {
+        return [
+          { text: 'Мимо', tone: 'success', strong: true },
+          { text: `! Карта «${event.attackCardName ?? '—'}» не задела убегающего ` },
+          { text: playerName(view, event.playerId), tone: 'player', strong: true },
+          { text: '.' },
+        ];
+      }
+
+      if (event.outcome === 'LARVA_INFECTION') {
+        return [
+          { text: 'Личинка', tone: 'danger', strong: true },
+          { text: ' заражает убегающего ' },
+          { text: playerName(view, event.playerId), tone: 'player', strong: true },
+          { text: ': +1 Заражение, Личинка уходит на планшет персонажа.' },
+        ];
+      }
+
+      if (event.outcome === 'HIT_DIED') {
+        return [
+          { text: playerName(view, event.playerId), tone: 'player', strong: true },
+          { text: ` погибает при Побеге («${event.attackCardName ?? '—'}»)!` },
+        ];
+      }
+
+      const summary = woundsSummary(event.lightWoundsDealt, event.seriousWoundsDealt, event.contaminationDealt);
+
+      return [
+        { text: playerName(view, event.playerId), tone: 'player', strong: true },
+        { text: ` пережил атаку в спину («${event.attackCardName ?? '—'}»)` },
+        ...(summary ? [{ text: `: ${summary}.` }] : [{ text: ' без ран и Заражения.' }]),
+      ];
+    }
+
+    case 'INTRUDER_TRANSFORMED':
+      return [
+        { text: 'Трансформация', tone: 'danger', strong: true },
+        { text: ` в ${roomLabel(view, event.roomId)}: Крипер становится Трутнем.` },
+      ];
+
+    case 'INTRUDER_CALLED':
+      if (!event.intruderId) {
+        return [
+          { text: 'Зов', tone: 'danger', strong: true },
+          { text: ` в ${roomLabel(view, event.roomId)}: Пустой жетон — никто не пришёл.` },
+        ];
+      }
+
+      return [
+        { text: 'Зов', tone: 'danger', strong: true },
+        { text: ` в ${roomLabel(view, event.roomId)}: появляется ` },
+        { text: INTRUDER_TOKEN_LABELS[event.tokenType], tone: 'danger', strong: true },
+        { text: '!' },
+      ];
+
+    case 'SHOT_FIRED':
+      return [
+        { text: playerName(view, event.playerId), tone: 'player', strong: true },
+        { text: ` стреляет из «${event.weaponName}» по ` },
+        { text: INTRUDER_TYPE_LABELS[event.intruderType], tone: 'danger', strong: true },
+        { text: ` в ${roomLabel(view, event.roomId)}: кубик — «` },
+        { text: COMBAT_DIE_FACE_LABELS[event.dieFace], tone: 'warning', strong: true },
+        { text: event.woundsDealt > 0 ? `», Ран нанесено: ${event.woundsDealt}.` : '» — промах.' },
+      ];
+
+    case 'TOUGHNESS_CHECKED': {
+      const cards = event.attackCards
+        .map((card) => `«${card.name}» (Стойкость ${card.toughness}${card.hasRetreat ? ', отступление!' : ''})`)
+        .join(' + ');
+      const outcome = event.retreated
+        ? { text: 'Чужой отступает!', tone: 'warning' as const }
+        : event.killed
+          ? { text: 'Чужой убит!', tone: 'success' as const }
+          : { text: 'Чужой выживает.', tone: 'danger' as const };
       return [
-        { text: 'ПАРТИЯ ЗАВЕРШЕНА', tone: 'error', strong: true },
-        { text: event.reason === 'SHIP_EXPLODED' ? ': корабль взорвался.' : ': произошёл разрыв обшивки.' },
+        { text: 'Проверка Стойкости', tone: 'system', strong: true },
+        { text: ': ' },
+        { text: INTRUDER_TYPE_LABELS[event.intruderType], tone: 'danger', strong: true },
+        { text: ` — ${cards} против ${event.woundsTotal} Ран(ы). ` },
+        { text: outcome.text, tone: outcome.tone, strong: true },
       ];
+    }
+
+    case 'INTRUDER_KILLED':
+      return [
+        { text: playerName(view, event.playerId), tone: 'player', strong: true },
+        { text: ' убивает ' },
+        { text: INTRUDER_TYPE_LABELS[event.intruderType], tone: 'danger', strong: true },
+        { text: ` в ${roomLabel(view, event.roomId)}.` },
+      ];
+
+    case 'INTRUDER_RETREATED':
+      return [
+        { text: playerName(view, event.playerId), tone: 'player', strong: true },
+        { text: ' заставляет ' },
+        { text: INTRUDER_TYPE_LABELS[event.intruderType], tone: 'danger', strong: true },
+        { text: ` отступить: ${roomLabel(view, event.fromRoomId)} → ${roomLabel(view, event.toRoomId)}.` },
+      ];
+
+    case 'MELEE_ATTACKED':
+      return [
+        { text: playerName(view, event.playerId), tone: 'player', strong: true },
+        { text: ' атакует врукопашную ' },
+        { text: INTRUDER_TYPE_LABELS[event.intruderType], tone: 'danger', strong: true },
+        { text: ` в ${roomLabel(view, event.roomId)}: кубик — «` },
+        { text: COMBAT_DIE_FACE_LABELS[event.dieFace], tone: 'warning', strong: true },
+        {
+          text:
+            event.woundsDealt > 0
+              ? `», Ран нанесено: ${event.woundsDealt}. Заражение: +${event.contaminationDealt}.`
+              : `» — промах. Заражение: +${event.contaminationDealt}, Тяжёлая Травма: +${event.seriousWoundDealt}.`,
+        },
+      ];
+
+    case 'OBJECT_PICKED_UP':
+      return [
+        { text: playerName(view, event.playerId), tone: 'player', strong: true },
+        { text: ' подбирает ' },
+        { text: HEAVY_OBJECT_LABELS[event.objectKind], tone: 'system', strong: true },
+        { text: ` в ${roomLabel(view, event.roomId)}.` },
+      ];
+
+    case 'PLAYER_DIED':
+      return [
+        { text: playerName(view, event.playerId), tone: 'player', strong: true },
+        { text: ` погибает в ${roomLabel(view, event.roomId)} от атаки Чужого. Труп остаётся в отсеке.` },
+      ];
+
+    case 'GAME_OVER':
+      return [{ text: 'ПАРТИЯ ЗАВЕРШЕНА', tone: 'error', strong: true }, { text: GAME_OVER_LABELS[event.reason] }];
 
     case 'PLAYER_PASSED':
       return [
diff --git a/packages/client/src/components/modals/CombatResultView.tsx b/packages/client/src/components/modals/CombatResultView.tsx
new file mode 100644
index 0000000..99894eb
--- /dev/null
+++ b/packages/client/src/components/modals/CombatResultView.tsx
@@ -0,0 +1,88 @@
+import React from 'react';
+import type { GameLogEvent, SanitizedGameState } from '@nemesis/shared';
+import { COMBAT_DIE_FACE_LABELS } from '../../utils/labels';
+import { roomLabel } from '../log/gameLogModel';
+
+interface CombatResultViewProps {
+  view: SanitizedGameState;
+  events: GameLogEvent[];
+}
+
+/**
+ * Результат боевой атаки (Стрельба или Рукопашная) из событий журнала: бросок
+ * кубика, цена рукопашной (Заражение и Травма), карты Стойкости, гибель или
+ * отступление Чужого, гибель атакующего. Чистый компонент — тестируется
+ * SSR-рендером через тесты модалок.
+ */
+export const CombatResultView: React.FC<CombatResultViewProps> = ({ view, events }) => {
+  const strike = events.find((event) => event.type === 'SHOT_FIRED' || event.type === 'MELEE_ATTACKED');
+  const toughness = events.find((event) => event.type === 'TOUGHNESS_CHECKED');
+  const killed = events.find((event) => event.type === 'INTRUDER_KILLED');
+  const retreated = events.find((event) => event.type === 'INTRUDER_RETREATED');
+  const attackerDied = events.find((event) => event.type === 'PLAYER_DIED');
+
+  return (
+    <>
+      {strike?.type === 'SHOT_FIRED' && (
+        <div className="text-xs text-slate-300 leading-relaxed">
+          Выстрел из «{strike.weaponName}»: кубик —{' '}
+          <strong className="text-white">{COMBAT_DIE_FACE_LABELS[strike.dieFace]}</strong>
+          {strike.woundsDealt > 0 ? `, Ран нанесено: ${strike.woundsDealt}.` : ' — промах.'}
+        </div>
+      )}
+
+      {strike?.type === 'MELEE_ATTACKED' && (
+        <div className="text-xs text-slate-300 leading-relaxed">
+          Рукопашная атака: кубик — <strong className="text-white">{COMBAT_DIE_FACE_LABELS[strike.dieFace]}</strong>
+          {strike.woundsDealt > 0 ? `, Ран нанесено: ${strike.woundsDealt}.` : ' — промах.'}
+        </div>
+      )}
+
+      {strike?.type === 'MELEE_ATTACKED' && (
+        <div className="text-xs text-slate-300 leading-relaxed">
+          Цена атаки: <strong className="text-amber-300">+1 Заражение</strong>
+          {strike.seriousWoundDealt > 0 && (
+            <>
+              {', '}
+              <strong className="text-rose-300">+1 Тяжёлая Травма</strong>
+            </>
+          )}
+          .
+        </div>
+      )}
+
+      {toughness?.type === 'TOUGHNESS_CHECKED' && (
+        <div className="text-xs text-slate-300 leading-relaxed">
+          Проверка Стойкости:{' '}
+          {toughness.attackCards
+            .map((card) => `«${card.name}» (${card.toughness}${card.hasRetreat ? ', ↩' : ''})`)
+            .join(' + ')}{' '}
+          против {toughness.woundsTotal} Ран(ы).{' '}
+          {toughness.retreated ? (
+            <strong className="text-amber-300">Чужой отступает!</strong>
+          ) : toughness.killed ? (
+            <strong className="text-emerald-300">Чужой убит!</strong>
+          ) : (
+            <strong className="text-rose-300">Чужой выживает.</strong>
+          )}
+        </div>
+      )}
+
+      {killed?.type === 'INTRUDER_KILLED' && !toughness && (
+        <div className="text-xs text-emerald-300">Личинка погибает от любой Раны.</div>
+      )}
+
+      {retreated?.type === 'INTRUDER_RETREATED' && (
+        <div className="text-xs text-slate-300">Чужой отступает в {roomLabel(view, retreated.toRoomId)}.</div>
+      )}
+
+      {toughness?.type === 'TOUGHNESS_CHECKED' && toughness.retreated && !retreated && (
+        <div className="text-xs text-slate-300">Отступать некуда: Чужой остаётся в отсеке.</div>
+      )}
+
+      {attackerDied?.type === 'PLAYER_DIED' && (
+        <div className="text-xs text-rose-400">Персонаж погибает от полученной Травмы.</div>
+      )}
+    </>
+  );
+};
diff --git a/packages/client/src/components/modals/ContactModal.test.tsx b/packages/client/src/components/modals/ContactModal.test.tsx
new file mode 100644
index 0000000..be86e35
--- /dev/null
+++ b/packages/client/src/components/modals/ContactModal.test.tsx
@@ -0,0 +1,151 @@
+import { describe, expect, it } from 'vitest';
+import { renderToStaticMarkup } from 'react-dom/server';
+
+import type { GameLogEvent, SanitizedGameState } from '@nemesis/shared';
+import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';
+
+import { ContactModal } from './ContactModal';
+import { selectContactEntry } from './contactModalModel';
+
+function contactView(seed: string, events: GameLogEvent[]): SanitizedGameState {
+  const view = filterStateForPlayer(createInitialGameState(seed), 'player-1');
+
+  view.gameLog = events.map((event, index) => ({ id: `log-${index + 1}`, sequence: index + 1, event }));
+
+  return view;
+}
+
+function contactEvent(overrides: Partial<Extract<GameLogEvent, { type: 'CONTACT_OCCURRED' }>> = {}): GameLogEvent {
+  return {
+    type: 'CONTACT_OCCURRED',
+    playerId: 'player-1',
+    roomId: 6,
+    tokenType: 'ADULT',
+    escapeNumber: 4,
+    handCount: 2,
+    isFirstContact: true,
+    clearedCorridorIds: ['3-6'],
+    clearedTechnical: false,
+    ...overrides,
+  };
+}
+
+function resolvedEvent(
+  overrides: Partial<Extract<GameLogEvent, { type: 'SURPRISE_ATTACK_RESOLVED' }>> = {},
+): GameLogEvent {
+  return {
+    type: 'SURPRISE_ATTACK_RESOLVED',
+    playerId: 'player-1',
+    intruderId: 'test-adult-1',
+    intruderType: 'ADULT',
+    attackCardId: 'SCRATCH_1',
+    attackCardName: 'Царапина',
+    hit: true,
+    outcome: 'HIT_SURVIVED',
+    lightWoundsDealt: 1,
+    seriousWoundsDealt: 0,
+    contaminationDealt: 1,
+    ...overrides,
+  };
+}
+
+describe('ContactModal: выбор записи для показа', () => {
+  it('без Контактов модалка не выбирается', () => {
+    const view = contactView('contact-select-none', [{ type: 'GAME_STARTED' }]);
+
+    expect(selectContactEntry(view, null)).toBeNull();
+  });
+
+  it('выбирает последний Контакт и уважает отметку закрытия', () => {
+    const view = contactView('contact-select-latest', [
+      contactEvent({ tokenType: 'CREEPER' }),
+      { type: 'GAME_STARTED' },
+      contactEvent({ tokenType: 'QUEEN' }),
+    ]);
+
+    expect(selectContactEntry(view, null)?.sequence).toBe(3);
+    expect(selectContactEntry(view, 3)).toBeNull();
+    expect(selectContactEntry(view, 1)?.sequence).toBe(3);
+  });
+});
+
+describe('ContactModal: содержимое', () => {
+  it('показывает жетон, число Бегства и баннер первого Контакта', () => {
+    const view = contactView('contact-modal-token', [contactEvent()]);
+    const entry = selectContactEntry(view, null)!;
+
+    const html = renderToStaticMarkup(<ContactModal entry={entry} view={view} />);
+
+    expect(html).toContain('КОНТАКТ!');
+    expect(html).toContain('Взрослая Особь');
+    expect(html).toContain('Число Бегства 4');
+    expect(html).toContain('Первый Контакт партии');
+    expect(html).toContain('Маркеры Шума сброшены');
+    expect(html).toContain('Понятно');
+  });
+
+  it('Пустой жетон показывается без блока Внезапной атаки', () => {
+    const view = contactView('contact-modal-blank', [
+      contactEvent({ tokenType: 'BLANK', escapeNumber: 0, isFirstContact: false }),
+    ]);
+    const entry = selectContactEntry(view, null)!;
+
+    const html = renderToStaticMarkup(<ContactModal entry={entry} view={view} />);
+
+    expect(html).toContain('Пустой');
+    expect(html).toContain('Чужой не появился');
+    expect(html).not.toContain('Внезапная атака');
+  });
+
+  it('попадание Внезапной атаки показывается баннером с ранами', () => {
+    const view = contactView('contact-modal-hit', [contactEvent(), resolvedEvent()]);
+    const entry = selectContactEntry(view, null)!;
+
+    const html = renderToStaticMarkup(<ContactModal entry={entry} view={view} />);
+
+    expect(html).toContain('Внезапная атака: попадание!');
+    expect(html).toContain('Царапина');
+    expect(html).toContain('1 Лёгкая Травма, 1 Заражение');
+  });
+
+  it('мимо, заражение и гибель показываются своими баннерами', () => {
+    const view = contactView('contact-modal-outcomes', [
+      contactEvent(),
+      resolvedEvent({
+        outcome: 'MISSED',
+        hit: false,
+        attackCardName: 'Атака хвостом',
+        lightWoundsDealt: 0,
+        contaminationDealt: 0,
+      }),
+      resolvedEvent({ outcome: 'LARVA_INFECTION', intruderType: 'LARVA', attackCardName: null }),
+      resolvedEvent({ outcome: 'HIT_DIED', attackCardName: 'Укус' }),
+    ]);
+    const entry = selectContactEntry(view, null)!;
+
+    const html = renderToStaticMarkup(<ContactModal entry={entry} view={view} />);
+
+    expect(html).toContain('Внезапная атака — мимо!');
+    expect(html).toContain('Внезапная атака: заражение!');
+    expect(html).toContain('Внезапная атака: гибель!');
+  });
+
+  it('без Внезапной атаки показывается спокойный баннер', () => {
+    const view = contactView('contact-modal-calm', [
+      contactEvent({ escapeNumber: 1, handCount: 4, isFirstContact: false }),
+    ]);
+    const entry = selectContactEntry(view, null)!;
+
+    const html = renderToStaticMarkup(<ContactModal entry={entry} view={view} />);
+
+    expect(html).toContain('Внезапная атака не сработала');
+  });
+
+  it('неконтактная запись не рендерит модалку', () => {
+    const view = contactView('contact-modal-other', [{ type: 'GAME_STARTED' }]);
+
+    const html = renderToStaticMarkup(<ContactModal entry={view.gameLog[0]!} view={view} />);
+
+    expect(html).toBe('');
+  });
+});
diff --git a/packages/client/src/components/modals/ContactModal.tsx b/packages/client/src/components/modals/ContactModal.tsx
new file mode 100644
index 0000000..db8fa70
--- /dev/null
+++ b/packages/client/src/components/modals/ContactModal.tsx
@@ -0,0 +1,136 @@
+import React from 'react';
+
+import type { GameLogEntry, SanitizedGameState } from '@nemesis/shared';
+import { Bug } from 'lucide-react';
+
+import { roomLabel, woundsSummary } from '../log/gameLogModel';
+import { useGameStore } from '../../store/gameStore';
+import { INTRUDER_TOKEN_LABELS, INTRUDER_TYPE_LABELS } from '../../utils/labels';
+import { surpriseOutcomes, surpriseTriggered, type SurpriseResolvedEvent } from './contactModalModel';
+
+function SurpriseBanner({
+  outcome,
+  playerName,
+}: {
+  outcome: SurpriseResolvedEvent;
+  playerName: string;
+}): React.ReactElement {
+  const base = 'rounded-lg border px-3 py-2 text-xs leading-relaxed';
+  const intruder = INTRUDER_TYPE_LABELS[outcome.intruderType];
+
+  switch (outcome.outcome) {
+    case 'MISSED':
+      return (
+        <div className={`${base} bg-emerald-950/60 border-emerald-600/60 text-emerald-200`}>
+          <span className="font-bold uppercase">Внезапная атака — мимо! </span>
+          {intruder}: карта «{outcome.attackCardName ?? '—'}» не задела {playerName}.
+        </div>
+      );
+
+    case 'LARVA_INFECTION':
+      return (
+        <div className={`${base} bg-red-950/60 border-red-600/60 text-red-200`}>
+          <span className="font-bold uppercase">Внезапная атака: заражение! </span>
+          Личинка уходит на планшет {playerName}, +1 Заражение.
+        </div>
+      );
+
+    case 'HIT_DIED':
+      return (
+        <div className={`${base} bg-red-950/60 border-red-600/60 text-red-200`}>
+          <span className="font-bold uppercase">Внезапная атака: гибель! </span>
+          {playerName} погибает от карты «{outcome.attackCardName ?? '—'}».
+        </div>
+      );
+
+    case 'HIT_SURVIVED': {
+      const summary = woundsSummary(outcome.lightWoundsDealt, outcome.seriousWoundsDealt, outcome.contaminationDealt);
+
+      return (
+        <div className={`${base} bg-amber-950/60 border-amber-500/60 text-amber-200`}>
+          <span className="font-bold uppercase">Внезапная атака: попадание! </span>
+          {intruder}, карта «{outcome.attackCardName ?? '—'}»{summary ? `: ${summary}` : ' — без ран и Заражения'}.
+        </div>
+      );
+    }
+  }
+}
+
+interface ContactModalProps {
+  entry: GameLogEntry;
+  view: SanitizedGameState;
+}
+
+export const ContactModal: React.FC<ContactModalProps> = ({ entry, view }) => {
+  const dismissContact = useGameStore((state) => state.dismissContact);
+
+  if (entry.event.type !== 'CONTACT_OCCURRED') return null;
+
+  const contact = entry.event;
+  const playerName = view.players[contact.playerId]?.name ?? contact.playerId;
+  const isBlank = contact.tokenType === 'BLANK';
+  const outcomes = surpriseOutcomes(view, contact, entry.sequence);
+  const triggered = outcomes.length === 0 && surpriseTriggered(view, contact, entry.sequence);
+  const clearedAny = contact.clearedCorridorIds.length > 0 || contact.clearedTechnical;
+
+  return (
+    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
+      <div className="w-full max-w-md bg-slate-900 border border-red-500/50 rounded-xl p-5 shadow-2xl space-y-4">
+        <div className="flex items-center gap-2 text-red-400 border-b border-slate-800 pb-3">
+          <Bug size={20} />
+          <h3 className="text-lg font-heading tracking-wider text-white">КОНТАКТ!</h3>
+        </div>
+
+        {contact.isFirstContact && (
+          <div className="rounded-lg bg-amber-950/60 border border-amber-500/60 px-3 py-2 text-xs font-bold text-amber-200 uppercase tracking-wide">
+            Первый Контакт партии
+          </div>
+        )}
+
+        <p className="text-xs text-slate-300 leading-relaxed">
+          <span className="font-bold text-cyan-300">{playerName}</span> в {roomLabel(view, contact.roomId)} вытягивает
+          жетон:
+        </p>
+
+        <div className="rounded-lg bg-slate-800/80 border border-red-600/40 p-3 text-center space-y-1">
+          <div className="text-xl font-bold text-red-300">{INTRUDER_TOKEN_LABELS[contact.tokenType]}</div>
+          {!isBlank && (
+            <div className="text-[11px] text-slate-400">
+              Число Бегства {contact.escapeNumber} • карт на руке: {contact.handCount}
+            </div>
+          )}
+          {isBlank && <div className="text-[11px] text-slate-400">Шум во всех Коридорах отсека, Чужой не появился</div>}
+        </div>
+
+        {clearedAny && (
+          <p className="text-[11px] text-slate-400">
+            Маркеры Шума сброшены{contact.clearedTechnical ? ' (включая Технические Коридоры)' : ''}.
+          </p>
+        )}
+
+        {!isBlank && outcomes.length === 0 && !triggered && (
+          <div className="rounded-lg bg-emerald-950/60 border border-emerald-600/60 px-3 py-2 text-xs text-emerald-200">
+            Внезапная атака не сработала: карт на руке хватило.
+          </div>
+        )}
+
+        {triggered && (
+          <div className="rounded-lg bg-amber-950/60 border border-amber-500/60 px-3 py-2 text-xs text-amber-200">
+            Внезапная атака разыгрывается…
+          </div>
+        )}
+
+        {outcomes.map((outcome, index) => (
+          <SurpriseBanner key={index} outcome={outcome} playerName={playerName} />
+        ))}
+
+        <button
+          onClick={() => dismissContact(entry.sequence)}
+          className="w-full py-2.5 rounded-lg bg-red-950/60 border border-red-600/60 hover:bg-red-900/80 text-red-200 font-bold text-xs uppercase transition"
+        >
+          Понятно
+        </button>
+      </div>
+    </div>
+  );
+};
diff --git a/packages/client/src/components/modals/DecisionModal.test.tsx b/packages/client/src/components/modals/DecisionModal.test.tsx
new file mode 100644
index 0000000..a7e7a86
--- /dev/null
+++ b/packages/client/src/components/modals/DecisionModal.test.tsx
@@ -0,0 +1,31 @@
+import { describe, expect, it, vi } from 'vitest';
+import { renderToStaticMarkup } from 'react-dom/server';
+
+import type { PendingDecision } from '@nemesis/shared';
+
+import { DecisionModal } from './DecisionModal';
+
+vi.mock('../../store/gameStore', () => ({
+  useGameStore: (selector: (state: Record<string, unknown>) => unknown) =>
+    selector({ dispatch: () => undefined, view: null }),
+}));
+
+describe('DecisionModal: переброс Прицельного огня', () => {
+  const decision: PendingDecision = {
+    id: 'aimed-test',
+    playerId: 'player-1',
+    type: 'CHOOSE_AIMED_REROLL',
+    firstFace: 'MISS',
+    targetIntruderId: 't-adult',
+    weaponSlotIndex: 0,
+  };
+
+  it('показывает первую грань и оба варианта', () => {
+    const html = renderToStaticMarkup(<DecisionModal decision={decision} />);
+
+    expect(html).toContain('ПЕРЕБРОС');
+    expect(html).toContain('Промах');
+    expect(html).toContain('Оставить: Промах');
+    expect(html).toContain('Перебросить');
+  });
+});
diff --git a/packages/client/src/components/modals/DecisionModal.tsx b/packages/client/src/components/modals/DecisionModal.tsx
index 7b920c3..7c93586 100644
--- a/packages/client/src/components/modals/DecisionModal.tsx
+++ b/packages/client/src/components/modals/DecisionModal.tsx
@@ -1,7 +1,8 @@
 import React from 'react';
 import type { PendingDecision } from '@nemesis/shared';
 import { useGameStore } from '../../store/gameStore';
-import { Package, ArrowRight } from 'lucide-react';
+import { Package, ArrowRight, Crosshair } from 'lucide-react';
+import { COMBAT_DIE_FACE_LABELS } from '../../utils/labels';
 
 interface DecisionModalProps {
   decision: PendingDecision;
@@ -130,5 +131,38 @@ export const DecisionModal: React.FC<DecisionModalProps> = ({ decision }) => {
     );
   }
 
+  if (decision.type === 'CHOOSE_AIMED_REROLL') {
+    const firstLabel = COMBAT_DIE_FACE_LABELS[decision.firstFace];
+
+    return (
+      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
+        <div className="w-full max-w-md bg-slate-900 border border-orange-500/50 rounded-xl p-5 shadow-2xl space-y-4">
+          <div className="flex items-center gap-2 text-orange-400 border-b border-slate-800 pb-3">
+            <Crosshair size={20} />
+            <h3 className="text-lg font-heading tracking-wider text-white">ПРИЦЕЛЬНЫЙ ОГОНЬ: ПЕРЕБРОС?</h3>
+          </div>
+          <p className="text-xs text-slate-300 leading-relaxed">
+            Первая грань кубика Боя: <b className="text-white">{firstLabel}</b>. Оставить результат или перебросить
+            кубик один раз?
+          </p>
+          <div className="flex gap-2.5">
+            <button
+              onClick={() => handleSelect('KEEP')}
+              className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
+            >
+              Оставить: {firstLabel}
+            </button>
+            <button
+              onClick={() => handleSelect('REROLL')}
+              className="flex-1 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold uppercase transition"
+            >
+              Перебросить
+            </button>
+          </div>
+        </div>
+      </div>
+    );
+  }
+
   return null;
 };
diff --git a/packages/client/src/components/modals/MeleeModal.test.tsx b/packages/client/src/components/modals/MeleeModal.test.tsx
new file mode 100644
index 0000000..418a308
--- /dev/null
+++ b/packages/client/src/components/modals/MeleeModal.test.tsx
@@ -0,0 +1,139 @@
+import { describe, expect, it, vi } from 'vitest';
+import { renderToStaticMarkup } from 'react-dom/server';
+
+import type { GameLogEvent, SanitizedGameState } from '@nemesis/shared';
+import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';
+
+import { MeleeModal } from './MeleeModal';
+import { CombatResultView } from './CombatResultView';
+
+const storeState: { view: SanitizedGameState | null; selectedCardIds: string[] } = {
+  view: null,
+  selectedCardIds: [],
+};
+
+vi.mock('../../store/gameStore', () => ({
+  useGameStore: (selector: (state: Record<string, unknown>) => unknown) =>
+    selector({
+      view: storeState.view,
+      dispatch: () => undefined,
+      rejection: null,
+      consumePaymentCards: () => [],
+      selectedCardIds: storeState.selectedCardIds,
+    }),
+}));
+
+function combatView(seed: string): SanitizedGameState {
+  const state = createInitialGameState(seed, { playerCount: 1 });
+  const player = state.players['player-1']!;
+
+  state.intrudersPool.boardTokens.push({
+    id: 'test-creeper-1',
+    type: 'CREEPER',
+    roomId: player.roomId,
+    woundsCount: 1,
+    token: { id: 'test-creeper-1', type: 'CREEPER', escapeNumber: 2 },
+  });
+  state.ship.rooms[player.roomId]!.occupantIntruderIds.push('test-creeper-1');
+
+  return filterStateForPlayer(state, 'player-1');
+}
+
+function meleeEvent(overrides: Partial<Extract<GameLogEvent, { type: 'MELEE_ATTACKED' }>> = {}): GameLogEvent {
+  return {
+    type: 'MELEE_ATTACKED',
+    playerId: 'player-1',
+    roomId: 1,
+    intruderId: 'test-creeper-1',
+    intruderType: 'CREEPER',
+    dieFace: 'TAIL',
+    woundsDealt: 1,
+    contaminationDealt: 1,
+    seriousWoundDealt: 0,
+    ...overrides,
+  };
+}
+
+describe('MeleeModal: выбор цели', () => {
+  it('показывает бейджи цены, цели и кнопку атаки', () => {
+    storeState.view = combatView('melee-modal-select');
+    storeState.selectedCardIds = ['pay-1'];
+    const roomId = storeState.view.players['player-1']!.roomId;
+
+    const html = renderToStaticMarkup(<MeleeModal roomId={roomId} onClose={() => undefined} />);
+
+    expect(html).toContain('РУКОПАШНАЯ АТАКА');
+    expect(html).toContain('+1 Заражение');
+    expect(html).toContain('Риск Тяжёлой Травмы при промахе');
+    expect(html).toContain('Крипер');
+    expect(html).toContain('Ран: 1');
+    expect(html).toContain('Атаковать [цена: 1]');
+    expect(html).not.toContain('Выберите 1 карту оплаты');
+  });
+
+  it('подсказывает выбрать карту оплаты', () => {
+    storeState.view = combatView('melee-modal-payment');
+    storeState.selectedCardIds = [];
+    const roomId = storeState.view.players['player-1']!.roomId;
+
+    const html = renderToStaticMarkup(<MeleeModal roomId={roomId} onClose={() => undefined} />);
+
+    expect(html).toContain('Выберите 1 карту оплаты в руке');
+  });
+});
+
+describe('CombatResultView: результат рукопашной', () => {
+  it('показывает попадание с ценой только в Заражение', () => {
+    const view = combatView('melee-result-hit');
+
+    const html = renderToStaticMarkup(
+      <CombatResultView
+        view={view}
+        events={[
+          meleeEvent({ dieFace: 'TAIL', woundsDealt: 1, seriousWoundDealt: 0 }),
+          {
+            type: 'TOUGHNESS_CHECKED',
+            playerId: 'player-1',
+            roomId: 1,
+            intruderId: 'test-creeper-1',
+            intruderType: 'CREEPER',
+            attackCards: [{ id: 'a-1', name: 'Царапина', toughness: 5, hasRetreat: false }],
+            woundsTotal: 2,
+            killed: false,
+            retreated: false,
+          },
+        ]}
+      />,
+    );
+
+    expect(html).toContain('Рукопашная атака');
+    expect(html).toContain('Хвост');
+    expect(html).toContain('+1 Заражение');
+    expect(html).not.toContain('Тяжёлая Травма');
+    expect(html).toContain('Чужой выживает.');
+  });
+
+  it('показывает промах с Травмой и гибель атакующего', () => {
+    const view = combatView('melee-result-miss');
+
+    const missHtml = renderToStaticMarkup(
+      <CombatResultView view={view} events={[meleeEvent({ dieFace: 'MISS', woundsDealt: 0, seriousWoundDealt: 1 })]} />,
+    );
+
+    expect(missHtml).toContain('Промах');
+    expect(missHtml).toContain('+1 Тяжёлая Травма');
+    expect(missHtml).not.toContain('Проверка Стойкости');
+
+    const deathHtml = renderToStaticMarkup(
+      <CombatResultView
+        view={view}
+        events={[
+          meleeEvent({ dieFace: 'MISS', woundsDealt: 0, seriousWoundDealt: 1 }),
+          { type: 'PLAYER_DIED', playerId: 'player-1', roomId: 1, cause: 'INTRUDER_ATTACK' },
+        ]}
+      />,
+    );
+
+    expect(deathHtml).toContain('Персонаж погибает от полученной Травмы.');
+  });
+});
diff --git a/packages/client/src/components/modals/MeleeModal.tsx b/packages/client/src/components/modals/MeleeModal.tsx
new file mode 100644
index 0000000..9f6a243
--- /dev/null
+++ b/packages/client/src/components/modals/MeleeModal.tsx
@@ -0,0 +1,162 @@
+import React from 'react';
+import type { GameLogEvent, RoomId } from '@nemesis/shared';
+import { Swords, X } from 'lucide-react';
+import { useGameStore } from '../../store/gameStore';
+import { INTRUDER_TYPE_LABELS } from '../../utils/labels';
+import { roomIntruders } from '../../utils/roomIntruders';
+import { CombatResultView } from './CombatResultView';
+
+interface MeleeModalProps {
+  roomId: RoomId;
+  onClose: () => void;
+}
+
+/**
+ * Модалка Рукопашной Атаки [1] (стр. 19): выбор цели, затем результат атаки
+ * из журнала партии. Оружие не требуется, но цена неизбежна: +1 Заражение
+ * в сброс всегда и +1 Тяжёлая Травма при промахе — бейджи предупреждают.
+ */
+export const MeleeModal: React.FC<MeleeModalProps> = ({ roomId, onClose }) => {
+  const view = useGameStore((state) => state.view);
+  const dispatch = useGameStore((state) => state.dispatch);
+  const rejection = useGameStore((state) => state.rejection);
+  const consumePaymentCards = useGameStore((state) => state.consumePaymentCards);
+  const selectedCardIds = useGameStore((state) => state.selectedCardIds);
+
+  const [selectedTarget, setSelectedTarget] = React.useState<string | null>(null);
+  const [logStart, setLogStart] = React.useState<number | null>(null);
+
+  if (!view) return null;
+
+  const targets = roomIntruders(view, roomId);
+  const resultEvents: GameLogEvent[] =
+    logStart === null ? [] : view.gameLog.slice(logStart).map((entry) => entry.event);
+
+  const handleAttack = () => {
+    if (selectedTarget === null) return;
+
+    const discardCardIds = consumePaymentCards(1);
+    setLogStart(view.gameLog.length);
+    dispatch({
+      type: 'ACTION_MELEE',
+      payload: { targetIntruderId: selectedTarget, discardCardIds },
+    });
+  };
+
+  const handleAgain = () => {
+    setLogStart(null);
+    setSelectedTarget(null);
+  };
+
+  const hasPaymentSelected = selectedCardIds.length > 0;
+
+  return (
+    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
+      <div className="w-full max-w-md bg-slate-900 border border-orange-500/50 rounded-xl p-5 shadow-2xl space-y-4">
+        <div className="flex items-center justify-between gap-2 text-orange-400 border-b border-slate-800 pb-3">
+          <div className="flex items-center gap-2">
+            <Swords size={20} />
+            <h3 className="text-lg font-heading tracking-wider text-white">РУКОПАШНАЯ АТАКА</h3>
+          </div>
+          <button
+            type="button"
+            onClick={onClose}
+            aria-label="Закрыть"
+            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
+          >
+            <X size={18} />
+          </button>
+        </div>
+
+        {logStart === null ? (
+          <div className="space-y-4">
+            <div className="flex gap-2">
+              <span className="px-2 py-1 rounded text-[11px] font-bold bg-amber-950/60 border border-amber-500/60 text-amber-300">
+                +1 Заражение
+              </span>
+              <span className="px-2 py-1 rounded text-[11px] font-bold bg-rose-950/60 border border-rose-500/60 text-rose-300">
+                Риск Тяжёлой Травмы при промахе
+              </span>
+            </div>
+
+            <div>
+              <p className="text-xs text-slate-400 mb-1.5">Цель в отсеке:</p>
+              {targets.length === 0 && <p className="text-xs text-slate-500">Целей в отсеке не осталось.</p>}
+              <div className="flex flex-col gap-1.5">
+                {targets.map((target) => {
+                  const isSelected = selectedTarget === target.id;
+                  return (
+                    <button
+                      key={target.id}
+                      type="button"
+                      onClick={() => setSelectedTarget(target.id)}
+                      className={`w-full px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between gap-2 transition ${
+                        isSelected ? 'bg-orange-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
+                      }`}
+                    >
+                      <span>{INTRUDER_TYPE_LABELS[target.type]}</span>
+                      <span>Ран: {target.woundsCount}</span>
+                    </button>
+                  );
+                })}
+              </div>
+            </div>
+
+            {!hasPaymentSelected && (
+              <p className="text-xs text-amber-300">Выберите 1 карту оплаты в руке: без неё атака будет отклонена.</p>
+            )}
+
+            <button
+              type="button"
+              disabled={selectedTarget === null}
+              onClick={handleAttack}
+              className="w-full min-h-[40px] bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-lg text-sm active:scale-95 transition"
+            >
+              Атаковать [цена: 1]
+            </button>
+          </div>
+        ) : (
+          <div className="space-y-3">
+            {resultEvents.length === 0 && !rejection && (
+              <p className="text-xs text-slate-400">Результат обрабатывается…</p>
+            )}
+
+            {resultEvents.length === 0 && rejection && (
+              <div className="space-y-3">
+                <p className="text-xs text-rose-400">Атака отклонена: {rejection}</p>
+                <button
+                  type="button"
+                  onClick={handleAgain}
+                  className="w-full min-h-[36px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition"
+                >
+                  Назад к выбору
+                </button>
+              </div>
+            )}
+
+            <CombatResultView view={view} events={resultEvents} />
+
+            {resultEvents.length > 0 && (
+              <div className="flex gap-2 pt-1">
+                <button
+                  type="button"
+                  onClick={handleAgain}
+                  className="flex-1 min-h-[36px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition"
+                >
+                  Ещё атака [цена: 1]
+                </button>
+                <button
+                  type="button"
+                  onClick={onClose}
+                  className="flex-1 min-h-[36px] bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs transition"
+                >
+                  Закрыть
+                </button>
+              </div>
+            )}
+          </div>
+        )}
+      </div>
+    </div>
+  );
+};
diff --git a/packages/client/src/components/modals/ShootModal.test.tsx b/packages/client/src/components/modals/ShootModal.test.tsx
new file mode 100644
index 0000000..6559d9e
--- /dev/null
+++ b/packages/client/src/components/modals/ShootModal.test.tsx
@@ -0,0 +1,215 @@
+import { describe, expect, it, vi } from 'vitest';
+import { renderToStaticMarkup } from 'react-dom/server';
+
+import type { GameLogEvent, SanitizedGameState } from '@nemesis/shared';
+import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';
+
+import { ShootModal } from './ShootModal';
+import { CombatResultView } from './CombatResultView';
+
+const storeState: { view: SanitizedGameState | null; selectedCardIds: string[] } = {
+  view: null,
+  selectedCardIds: [],
+};
+
+vi.mock('../../store/gameStore', () => ({
+  useGameStore: (selector: (state: Record<string, unknown>) => unknown) =>
+    selector({
+      view: storeState.view,
+      dispatch: () => undefined,
+      rejection: null,
+      consumePaymentCards: () => [],
+      selectedCardIds: storeState.selectedCardIds,
+    }),
+}));
+
+function combatView(seed: string, weaponAmmo: number | null = null): SanitizedGameState {
+  const state = createInitialGameState(seed, { playerCount: 1 });
+  const player = state.players['player-1']!;
+  const slot = player.handSlots[0]!;
+
+  if (slot.source !== 'ITEM') throw new Error('В сетапе ожидалось оружие в руке.');
+  if (weaponAmmo !== null) slot.card.ammo = weaponAmmo;
+
+  state.intrudersPool.boardTokens.push({
+    id: 'test-adult-1',
+    type: 'ADULT',
+    roomId: player.roomId,
+    woundsCount: 2,
+    token: { id: 'test-adult-1', type: 'ADULT', escapeNumber: 4 },
+  });
+  state.ship.rooms[player.roomId]!.occupantIntruderIds.push('test-adult-1');
+
+  return filterStateForPlayer(state, 'player-1');
+}
+
+function shotEvent(overrides: Partial<Extract<GameLogEvent, { type: 'SHOT_FIRED' }>> = {}): GameLogEvent {
+  return {
+    type: 'SHOT_FIRED',
+    playerId: 'player-1',
+    roomId: 1,
+    intruderId: 'test-adult-1',
+    intruderType: 'ADULT',
+    weaponId: 'w-1',
+    weaponName: 'Пистолет',
+    dieFace: 'ONE_WOUND',
+    woundsDealt: 1,
+    ...overrides,
+  };
+}
+
+function toughnessEvent(overrides: Partial<Extract<GameLogEvent, { type: 'TOUGHNESS_CHECKED' }>> = {}): GameLogEvent {
+  return {
+    type: 'TOUGHNESS_CHECKED',
+    playerId: 'player-1',
+    roomId: 1,
+    intruderId: 'test-adult-1',
+    intruderType: 'ADULT',
+    attackCards: [{ id: 'a-1', name: 'Царапина', toughness: 5, hasRetreat: false }],
+    woundsTotal: 3,
+    killed: false,
+    retreated: false,
+    ...overrides,
+  };
+}
+
+describe('ShootModal: выбор оружия и цели', () => {
+  it('показывает оружие с боезапасом, цели с ранами и кнопку огня', () => {
+    storeState.view = combatView('shoot-modal-select');
+    storeState.selectedCardIds = ['pay-1'];
+    const roomId = storeState.view.players['player-1']!.roomId;
+
+    const html = renderToStaticMarkup(<ShootModal roomId={roomId} onClose={() => undefined} />);
+
+    expect(html).toContain('СТРЕЛЬБА');
+    expect(html).toContain('Боезапас:');
+    expect(html).toContain('Взрослая Особь');
+    expect(html).toContain('Ран: 2');
+    expect(html).toContain('Огонь [цена: 1]');
+    expect(html).not.toContain('Выберите 1 карту оплаты');
+  });
+
+  it('подсказывает выбрать карту оплаты и блокирует пустое оружие', () => {
+    storeState.view = combatView('shoot-modal-noammo', 0);
+    storeState.selectedCardIds = [];
+    const roomId = storeState.view.players['player-1']!.roomId;
+
+    const html = renderToStaticMarkup(<ShootModal roomId={roomId} onClose={() => undefined} />);
+
+    expect(html).toContain('Выберите 1 карту оплаты в руке');
+    expect(html).toContain('disabled');
+  });
+
+  it('честно показывает отсутствие оружия и целей', () => {
+    const state = createInitialGameState('shoot-modal-empty', { playerCount: 1 });
+    const player = state.players['player-1']!;
+    player.handSlots = [];
+    storeState.view = filterStateForPlayer(state, 'player-1');
+    storeState.selectedCardIds = [];
+
+    const html = renderToStaticMarkup(<ShootModal roomId={player.roomId} onClose={() => undefined} />);
+
+    expect(html).toContain('Нет оружия в руках');
+    expect(html).toContain('Целей в отсеке не осталось');
+  });
+});
+
+describe('CombatResultView: результат выстрела', () => {
+  it('показывает промах без проверки Стойкости', () => {
+    const view = combatView('shoot-result-miss');
+
+    const html = renderToStaticMarkup(
+      <CombatResultView view={view} events={[shotEvent({ dieFace: 'MISS', woundsDealt: 0 })]} />,
+    );
+
+    expect(html).toContain('Промах');
+    expect(html).not.toContain('Проверка Стойкости');
+  });
+
+  it('показывает попадание, карты Стойкости и выживание', () => {
+    const view = combatView('shoot-result-survive');
+
+    const html = renderToStaticMarkup(
+      <CombatResultView
+        view={view}
+        events={[
+          shotEvent({ dieFace: 'ONE_WOUND', woundsDealt: 1 }),
+          toughnessEvent({ woundsTotal: 3, killed: false, retreated: false }),
+        ]}
+      />,
+    );
+
+    expect(html).toContain('1 Рана');
+    expect(html).toContain('Ран нанесено: 1');
+    expect(html).toContain('«Царапина» (5)');
+    expect(html).toContain('Чужой выживает.');
+  });
+
+  it('показывает гибель, отступление и Личинку', () => {
+    const view = combatView('shoot-result-outcomes');
+
+    const killedHtml = renderToStaticMarkup(
+      <CombatResultView
+        view={view}
+        events={[
+          shotEvent({ dieFace: 'TWO_WOUNDS', woundsDealt: 2 }),
+          toughnessEvent({ woundsTotal: 5, killed: true }),
+          {
+            type: 'INTRUDER_KILLED',
+            playerId: 'player-1',
+            roomId: 1,
+            intruderId: 'test-adult-1',
+            intruderType: 'ADULT',
+          },
+        ]}
+      />,
+    );
+    expect(killedHtml).toContain('Чужой убит!');
+
+    const retreatedHtml = renderToStaticMarkup(
+      <CombatResultView
+        view={view}
+        events={[
+          shotEvent({ woundsDealt: 1 }),
+          toughnessEvent({
+            attackCards: [{ id: 'a-9', name: 'Укус', toughness: 2, hasRetreat: true }],
+            retreated: true,
+          }),
+          {
+            type: 'INTRUDER_RETREATED',
+            playerId: 'player-1',
+            intruderId: 'test-adult-1',
+            intruderType: 'ADULT',
+            fromRoomId: 1,
+            toRoomId: 2,
+          },
+        ]}
+      />,
+    );
+    expect(retreatedHtml).toContain('↩');
+    expect(retreatedHtml).toContain('Чужой отступает!');
+    expect(retreatedHtml).toContain('Чужой отступает в');
+
+    const fizzleHtml = renderToStaticMarkup(
+      <CombatResultView view={view} events={[shotEvent({ woundsDealt: 1 }), toughnessEvent({ retreated: true })]} />,
+    );
+    expect(fizzleHtml).toContain('Отступать некуда');
+
+    const larvaHtml = renderToStaticMarkup(
+      <CombatResultView
+        view={view}
+        events={[
+          shotEvent({ intruderType: 'LARVA', woundsDealt: 1 }),
+          {
+            type: 'INTRUDER_KILLED',
+            playerId: 'player-1',
+            roomId: 1,
+            intruderId: 'test-larva-1',
+            intruderType: 'LARVA',
+          },
+        ]}
+      />,
+    );
+    expect(larvaHtml).toContain('Личинка погибает от любой Раны.');
+  });
+});
diff --git a/packages/client/src/components/modals/ShootModal.tsx b/packages/client/src/components/modals/ShootModal.tsx
new file mode 100644
index 0000000..df76897
--- /dev/null
+++ b/packages/client/src/components/modals/ShootModal.tsx
@@ -0,0 +1,213 @@
+import React from 'react';
+import type { GameLogEvent, RoomId, SanitizedGameState } from '@nemesis/shared';
+import { Crosshair, X } from 'lucide-react';
+import { useGameStore } from '../../store/gameStore';
+import { INTRUDER_TYPE_LABELS } from '../../utils/labels';
+import { roomIntruders } from '../../utils/roomIntruders';
+import { CombatResultView } from './CombatResultView';
+
+interface ShootModalProps {
+  roomId: RoomId;
+  onClose: () => void;
+}
+
+interface WeaponOption {
+  slotIndex: number;
+  name: string;
+  ammo: number | null;
+  maxAmmo: number | null;
+}
+
+/** Оружие в руках активного игрока — только из него можно стрелять (стр. 18). */
+function weaponOptions(view: SanitizedGameState, playerId: string): WeaponOption[] {
+  const player = view.players[playerId];
+
+  if (!player) return [];
+
+  return player.handSlots.flatMap((slot, slotIndex) =>
+    slot.source === 'ITEM' && slot.card.isWeapon
+      ? [{ slotIndex, name: slot.card.name, ammo: slot.card.ammo, maxAmmo: slot.card.maxAmmo }]
+      : [],
+  );
+}
+
+/**
+ * Модалка Стрельбы [1] (стр. 18): выбор оружия и цели, затем результат
+ * выстрела из журнала партии. Оплата — выбранные карты руки, как у остальных
+ * действий; результат читается из новых записей журнала после отправки.
+ */
+export const ShootModal: React.FC<ShootModalProps> = ({ roomId, onClose }) => {
+  const view = useGameStore((state) => state.view);
+  const dispatch = useGameStore((state) => state.dispatch);
+  const rejection = useGameStore((state) => state.rejection);
+  const consumePaymentCards = useGameStore((state) => state.consumePaymentCards);
+  const selectedCardIds = useGameStore((state) => state.selectedCardIds);
+
+  const [selectedWeapon, setSelectedWeapon] = React.useState<number | null>(null);
+  const [selectedTarget, setSelectedTarget] = React.useState<string | null>(null);
+  const [logStart, setLogStart] = React.useState<number | null>(null);
+
+  if (!view) return null;
+
+  const activePlayerId = view.meta.activePlayerId;
+  const weapons = weaponOptions(view, activePlayerId);
+  const targets = roomIntruders(view, roomId);
+  const resultEvents: GameLogEvent[] =
+    logStart === null ? [] : view.gameLog.slice(logStart).map((entry) => entry.event);
+
+  const handleFire = () => {
+    if (selectedWeapon === null || selectedTarget === null) return;
+
+    const discardCardIds = consumePaymentCards(1);
+    setLogStart(view.gameLog.length);
+    dispatch({
+      type: 'ACTION_SHOOT',
+      payload: {
+        targetIntruderId: selectedTarget,
+        weaponSlotIndex: selectedWeapon,
+        discardCardIds,
+      },
+    });
+  };
+
+  const handleAgain = () => {
+    setLogStart(null);
+    setSelectedTarget(null);
+  };
+
+  const hasPaymentSelected = selectedCardIds.length > 0;
+
+  return (
+    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
+      <div className="w-full max-w-md bg-slate-900 border border-red-500/50 rounded-xl p-5 shadow-2xl space-y-4">
+        <div className="flex items-center justify-between gap-2 text-red-400 border-b border-slate-800 pb-3">
+          <div className="flex items-center gap-2">
+            <Crosshair size={20} />
+            <h3 className="text-lg font-heading tracking-wider text-white">СТРЕЛЬБА</h3>
+          </div>
+          <button
+            type="button"
+            onClick={onClose}
+            aria-label="Закрыть"
+            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
+          >
+            <X size={18} />
+          </button>
+        </div>
+
+        {logStart === null ? (
+          <div className="space-y-4">
+            <div>
+              <p className="text-xs text-slate-400 mb-1.5">Оружие в руках:</p>
+              {weapons.length === 0 && (
+                <p className="text-xs text-slate-500">Нет оружия в руках — стрелять не из чего.</p>
+              )}
+              <div className="flex flex-col gap-1.5">
+                {weapons.map((weapon) => {
+                  const hasAmmo = (weapon.ammo ?? 0) > 0;
+                  const isSelected = selectedWeapon === weapon.slotIndex;
+                  return (
+                    <button
+                      key={weapon.slotIndex}
+                      type="button"
+                      disabled={!hasAmmo}
+                      onClick={() => setSelectedWeapon(weapon.slotIndex)}
+                      className={`w-full px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between gap-2 transition ${
+                        isSelected
+                          ? 'bg-red-600 text-white'
+                          : hasAmmo
+                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
+                            : 'bg-slate-900 text-slate-600 cursor-not-allowed'
+                      }`}
+                    >
+                      <span>{weapon.name}</span>
+                      <span>
+                        Боезапас: {weapon.ammo ?? '—'}/{weapon.maxAmmo ?? '—'}
+                      </span>
+                    </button>
+                  );
+                })}
+              </div>
+            </div>
+
+            <div>
+              <p className="text-xs text-slate-400 mb-1.5">Цель в отсеке:</p>
+              {targets.length === 0 && <p className="text-xs text-slate-500">Целей в отсеке не осталось.</p>}
+              <div className="flex flex-col gap-1.5">
+                {targets.map((target) => {
+                  const isSelected = selectedTarget === target.id;
+                  return (
+                    <button
+                      key={target.id}
+                      type="button"
+                      onClick={() => setSelectedTarget(target.id)}
+                      className={`w-full px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between gap-2 transition ${
+                        isSelected ? 'bg-red-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
+                      }`}
+                    >
+                      <span>{INTRUDER_TYPE_LABELS[target.type]}</span>
+                      <span>Ран: {target.woundsCount}</span>
+                    </button>
+                  );
+                })}
+              </div>
+            </div>
+
+            {!hasPaymentSelected && (
+              <p className="text-xs text-amber-300">Выберите 1 карту оплаты в руке: без неё выстрел будет отклонён.</p>
+            )}
+
+            <button
+              type="button"
+              disabled={selectedWeapon === null || selectedTarget === null}
+              onClick={handleFire}
+              className="w-full min-h-[40px] bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-lg text-sm active:scale-95 transition"
+            >
+              Огонь [цена: 1]
+            </button>
+          </div>
+        ) : (
+          <div className="space-y-3">
+            {resultEvents.length === 0 && !rejection && (
+              <p className="text-xs text-slate-400">Результат обрабатывается…</p>
+            )}
+
+            {resultEvents.length === 0 && rejection && (
+              <div className="space-y-3">
+                <p className="text-xs text-rose-400">Выстрел отклонён: {rejection}</p>
+                <button
+                  type="button"
+                  onClick={handleAgain}
+                  className="w-full min-h-[36px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition"
+                >
+                  Назад к выбору
+                </button>
+              </div>
+            )}
+
+            <CombatResultView view={view} events={resultEvents} />
+
+            {resultEvents.length > 0 && (
+              <div className="flex gap-2 pt-1">
+                <button
+                  type="button"
+                  onClick={handleAgain}
+                  className="flex-1 min-h-[36px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition"
+                >
+                  Ещё выстрел [цена: 1]
+                </button>
+                <button
+                  type="button"
+                  onClick={onClose}
+                  className="flex-1 min-h-[36px] bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs transition"
+                >
+                  Закрыть
+                </button>
+              </div>
+            )}
+          </div>
+        )}
+      </div>
+    </div>
+  );
+};
diff --git a/packages/client/src/components/modals/contactModalModel.ts b/packages/client/src/components/modals/contactModalModel.ts
new file mode 100644
index 0000000..0181ca3
--- /dev/null
+++ b/packages/client/src/components/modals/contactModalModel.ts
@@ -0,0 +1,46 @@
+import type { GameLogEntry, SanitizedGameState } from '@nemesis/shared';
+
+export type ContactEvent = Extract<GameLogEntry['event'], { type: 'CONTACT_OCCURRED' }>;
+export type SurpriseResolvedEvent = Extract<GameLogEntry['event'], { type: 'SURPRISE_ATTACK_RESOLVED' }>;
+
+/** Последний Контакт, который игрок ещё не закрывал: каждый новый Контакт показывает модалку заново. */
+export function selectContactEntry(view: SanitizedGameState, dismissedSequence: number | null): GameLogEntry | null {
+  let latest: GameLogEntry | null = null;
+
+  for (const entry of view.gameLog) {
+    if (entry.event.type !== 'CONTACT_OCCURRED') continue;
+    if (dismissedSequence !== null && entry.sequence <= dismissedSequence) continue;
+    latest = entry;
+  }
+
+  return latest;
+}
+
+/** Разыгранные Внезапные атаки этого Контакта: обычно одна, после Трансформации — цепочка. */
+export function surpriseOutcomes(
+  view: SanitizedGameState,
+  contact: ContactEvent,
+  sequence: number,
+): SurpriseResolvedEvent[] {
+  const outcomes: SurpriseResolvedEvent[] = [];
+
+  for (const entry of view.gameLog) {
+    if (entry.sequence <= sequence) continue;
+    if (entry.event.type !== 'SURPRISE_ATTACK_RESOLVED') continue;
+    if (entry.event.playerId !== contact.playerId) continue;
+
+    outcomes.push(entry.event);
+  }
+
+  return outcomes;
+}
+
+/** Внезапная атака объявлена, но итога в журнале пока нет (оборона от рассинхрона снимка). */
+export function surpriseTriggered(view: SanitizedGameState, contact: ContactEvent, sequence: number): boolean {
+  return view.gameLog.some(
+    (entry) =>
+      entry.sequence > sequence &&
+      entry.event.type === 'SURPRISE_ATTACK_TRIGGERED' &&
+      entry.event.playerId === contact.playerId,
+  );
+}
diff --git a/packages/client/src/store/gameStore.test.ts b/packages/client/src/store/gameStore.test.ts
index ea9001f..1555d6c 100644
--- a/packages/client/src/store/gameStore.test.ts
+++ b/packages/client/src/store/gameStore.test.ts
@@ -185,3 +185,18 @@ describe('Стор: новая партия', () => {
     expect(store.getState().view?.meta.seed).toBe('fixed-seed');
   });
 });
+describe('Стор: модалка Контакта', () => {
+  it('dismissContact запоминает sequence, новая партия сбрасывает отметку', () => {
+    const { store } = createStore();
+
+    expect(store.getState().dismissedContactSequence).toBeNull();
+
+    store.getState().dismissContact(7);
+
+    expect(store.getState().dismissedContactSequence).toBe(7);
+
+    store.getState().startNewGame('contact-dismiss-seed');
+
+    expect(store.getState().dismissedContactSequence).toBeNull();
+  });
+});
diff --git a/packages/client/src/store/gameStore.ts b/packages/client/src/store/gameStore.ts
index 95e47d3..12e5515 100644
--- a/packages/client/src/store/gameStore.ts
+++ b/packages/client/src/store/gameStore.ts
@@ -9,7 +9,8 @@ import { IS_DEV } from '../utils/env';
  * Стор интерфейса — тонкий клиент транспорта.
  *
  * Правила игры здесь не живут: стор хранит только то, что пришло по подписке
- * (`SanitizedGameState`), выбранный отсек и причину последнего отказа движка.
+ * (`SanitizedGameState`), выбранный отсек, причину последнего отказа движка
+ * и отметку уже показанных модалок Контакта.
  * Любое изменение партии — это `dispatch(action)`: правил в сторе нет.
  */
 export interface GameStoreState {
@@ -19,6 +20,8 @@ export interface GameStoreState {
   selectedRoomId: RoomId | null;
   /** Причина последнего отказа движка: показывается игроку и сбрасывается успешным действием. */
   rejection: string | null;
+  /** До какого Контакта (sequence в журнале) игрок уже видел модалку. */
+  dismissedContactSequence: number | null;
 
   /** Выбранные в текущий момент карты на руке */
   selectedCardIds: string[];
@@ -33,6 +36,7 @@ export interface GameStoreState {
 
   dispatch: (action: EngineAction) => void;
   selectRoom: (roomId: RoomId | null) => void;
+  dismissContact: (sequence: number) => void;
   startNewGame: (seed?: string, options?: { chosenCharacterClass?: CharacterClass }) => void;
 }
 
@@ -54,6 +58,7 @@ export function createGameStore(createTransport: TransportFactory) {
     view: null,
     selectedRoomId: null,
     rejection: null,
+    dismissedContactSequence: null,
     selectedCardIds: [],
     convertedCardIds: [],
 
@@ -135,6 +140,10 @@ export function createGameStore(createTransport: TransportFactory) {
       set({ selectedRoomId: roomId });
     },
 
+    dismissContact: (sequence) => {
+      set({ dismissedContactSequence: sequence });
+    },
+
     startNewGame: (seed, options) => {
       if (transport.startNewGame) {
         // Локальная партия продолжается тем же транспортом: он уже держит
@@ -143,6 +152,7 @@ export function createGameStore(createTransport: TransportFactory) {
         set({
           selectedRoomId: defaultRoomId(store.getState().view),
           rejection: null,
+          dismissedContactSequence: null,
           selectedCardIds: [],
           convertedCardIds: [],
         });
@@ -155,7 +165,14 @@ export function createGameStore(createTransport: TransportFactory) {
       transport = createTransport();
       attach(transport);
       void transport.init();
-      set({ view: null, selectedRoomId: null, rejection: null, selectedCardIds: [], convertedCardIds: [] });
+      set({
+        view: null,
+        selectedRoomId: null,
+        rejection: null,
+        dismissedContactSequence: null,
+        selectedCardIds: [],
+        convertedCardIds: [],
+      });
     },
   }));
 
diff --git a/packages/client/src/utils/labels.ts b/packages/client/src/utils/labels.ts
index e0267b5..081dabc 100644
--- a/packages/client/src/utils/labels.ts
+++ b/packages/client/src/utils/labels.ts
@@ -1,4 +1,4 @@
-import type { GameMode, GamePhase } from '@nemesis/shared';
+import type { BoardObject, CombatDieFace, GameMode, GamePhase, IntruderToken, IntruderType } from '@nemesis/shared';
 
 /**
  * Подписи состояний партии для интерфейса.
@@ -20,3 +20,45 @@ export const GAME_MODE_LABELS: Record<GameMode, string> = {
   SEMI_COOP: 'ПОЛУКООПЕРАТИВ',
   INTRUDER_PLAYER: 'ИГРОК-ЧУЖОЙ',
 };
+
+export const INTRUDER_TOKEN_LABELS: Record<IntruderToken['type'], string> = {
+  BLANK: 'Пустой',
+  LARVA: 'Личинка',
+  CREEPER: 'Крипер',
+  ADULT: 'Взрослая Особь',
+  BREEDER: 'Трутень',
+  QUEEN: 'Королева',
+};
+
+export const INTRUDER_TYPE_LABELS: Record<IntruderType, string> = {
+  LARVA: 'Личинка',
+  CREEPER: 'Крипер',
+  ADULT: 'Взрослая Особь',
+  BREEDER: 'Трутень',
+  QUEEN: 'Королева',
+};
+
+/** Цветовая кодировка Чужих на карте и в инспекторе: зелёная Личинка, жёлтый Крипер, красная Особь, бордовый Трутень, фиолетовая Королева. */
+export const INTRUDER_TYPE_COLORS: Record<IntruderType, { fill: string; ink: string }> = {
+  LARVA: { fill: '#22c55e', ink: '#05070c' },
+  CREEPER: { fill: '#eab308', ink: '#05070c' },
+  ADULT: { fill: '#ef4444', ink: '#05070c' },
+  BREEDER: { fill: '#881337', ink: '#ffffff' },
+  QUEEN: { fill: '#a855f7', ink: '#05070c' },
+};
+
+/** Подписи граней кубика Боя для журнала и модалки Стрельбы (стр. 18). */
+export const COMBAT_DIE_FACE_LABELS: Record<CombatDieFace, string> = {
+  MISS: 'Промах',
+  TAIL: 'Хвост',
+  SILHOUETTES: 'Силуэты',
+  ONE_WOUND: '1 Рана',
+  TWO_WOUNDS: '2 Раны',
+};
+
+/** Подписи Тяжёлых объектов на полу отсека (стр. 22). */
+export const HEAVY_OBJECT_LABELS: Record<BoardObject['kind'], string> = {
+  CORPSE: 'Труп члена экипажа',
+  EGG: 'Яйцо Чужих',
+  INTRUDER_REMAINS: 'Останки Чужого',
+};
diff --git a/packages/client/src/utils/roomIntruders.test.ts b/packages/client/src/utils/roomIntruders.test.ts
new file mode 100644
index 0000000..d9d9dbd
--- /dev/null
+++ b/packages/client/src/utils/roomIntruders.test.ts
@@ -0,0 +1,38 @@
+import { describe, expect, it } from 'vitest';
+
+import { createInitialGameState, filterStateForPlayer } from '@nemesis/shared';
+
+import { roomIntruders } from './roomIntruders';
+
+describe('roomIntruders: Чужие в отсеке', () => {
+  it('разрешает id отсека в сущности с типом и ранами', () => {
+    const state = createInitialGameState('room-intruders-resolve');
+    const token = { id: 'test-adult-1', type: 'ADULT', escapeNumber: 4 } as const;
+
+    state.intrudersPool.boardTokens.push({
+      id: token.id,
+      type: 'ADULT',
+      roomId: 11,
+      woundsCount: 2,
+      token: { ...token },
+    });
+    state.ship.rooms[11]!.occupantIntruderIds.push(token.id);
+
+    const view = filterStateForPlayer(state, 'player-1');
+    const intruders = roomIntruders(view, 11);
+
+    expect(intruders).toHaveLength(1);
+    expect(intruders[0]).toMatchObject({ id: 'test-adult-1', type: 'ADULT', woundsCount: 2 });
+  });
+
+  it('возвращает пустой список без отсека, без Чужих и при битых id', () => {
+    const state = createInitialGameState('room-intruders-empty');
+
+    state.ship.rooms[11]!.occupantIntruderIds.push('ghost');
+
+    const view = filterStateForPlayer(state, 'player-1');
+
+    expect(roomIntruders(view, 11)).toEqual([]);
+    expect(roomIntruders(view, 999)).toEqual([]);
+  });
+});
diff --git a/packages/client/src/utils/roomIntruders.ts b/packages/client/src/utils/roomIntruders.ts
new file mode 100644
index 0000000..77daf56
--- /dev/null
+++ b/packages/client/src/utils/roomIntruders.ts
@@ -0,0 +1,19 @@
+import type { IntruderEntity, SanitizedGameState } from '@nemesis/shared';
+
+/** Особи Чужих в отсеке: карта и инспектор разрешают id в сущности одним способом. */
+export function roomIntruders(view: SanitizedGameState, roomId: number): IntruderEntity[] {
+  const room = view.ship.rooms[roomId];
+
+  if (!room) return [];
+
+  const byId = new Map(view.intrudersPool.boardTokens.map((entity) => [entity.id, entity]));
+  const intruders: IntruderEntity[] = [];
+
+  for (const id of room.occupantIntruderIds) {
+    const entity = byId.get(id);
+
+    if (entity) intruders.push(entity);
+  }
+
+  return intruders;
+}
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
diff --git a/packages/shared/src/data/cards.test.ts b/packages/shared/src/data/cards.test.ts
index 6a9ee57..e7fca29 100644
--- a/packages/shared/src/data/cards.test.ts
+++ b/packages/shared/src/data/cards.test.ts
@@ -4,6 +4,7 @@ import { ACTION_CARDS_BY_CHARACTER } from './actionCards.js';
 import { CONTAMINATION_CARDS } from './contaminationCards.js';
 import { CRAFTED_ITEM_CARDS } from './crafting.js';
 import { GREEN_ITEM_CARDS, RED_ITEM_CARDS, YELLOW_ITEM_CARDS } from './itemCards.js';
+import { INTRUDER_ATTACK_CARDS } from './intruderAttacks.js';
 import { SERIOUS_WOUND_CARDS } from './seriousWounds.js';
 import { STARTING_WEAPONS } from './startingItems.js';
 import { createActionDeckForCharacter, createInitialDecks } from './cardsSetup.js';
@@ -94,6 +95,40 @@ describe('Колода Заражения и Тяжёлых Травм', () => {
   });
 });
 
+describe('Колода Атак Чужих (Intruder Attacks, v0.4.0 Шаг 1)', () => {
+  it('содержит ровно 20 карт с уникальными идентификаторами', () => {
+    expect(INTRUDER_ATTACK_CARDS).toHaveLength(20);
+    expect(new Set(INTRUDER_ATTACK_CARDS.map((card) => card.id)).size).toBe(20);
+  });
+
+  it('каждая карта несёт стойкость, флаг отступления, типы атакующих и эффект', () => {
+    const intruderTypes = ['LARVA', 'CREEPER', 'ADULT', 'BREEDER', 'QUEEN'];
+
+    for (const card of INTRUDER_ATTACK_CARDS) {
+      expect(card.name.length).toBeGreaterThan(0);
+      expect(card.description.length).toBeGreaterThan(0);
+      expect(Number.isInteger(card.toughness)).toBe(true);
+      expect(card.toughness).toBeGreaterThanOrEqual(1);
+      expect(typeof card.hasRetreat).toBe('boolean');
+      expect(card.attackerTypes.length).toBeGreaterThan(0);
+
+      for (const attackerType of card.attackerTypes) {
+        expect(intruderTypes).toContain(attackerType);
+      }
+    }
+  });
+
+  it('тасуется в колоду партии детерминированно через поток cards', () => {
+    const deckIds = (seed: string): string[] =>
+      createInitialDecks(seed).intruderAttacks.drawPile.map((card) => card.id);
+
+    expect(deckIds('seed-test')).toHaveLength(20);
+    expect(deckIds('seed-test')).toEqual(deckIds('seed-test'));
+    expect(deckIds('seed-other')).not.toEqual(deckIds('seed-test'));
+    expect([...deckIds('seed-other')].sort()).toEqual([...deckIds('seed-test')].sort());
+  });
+});
+
 describe('Инициализация колод партии (createInitialDecks)', () => {
   it('создаёт корректно наполненные и перетасованные колоды', () => {
     const decks = createInitialDecks('seed-test');
@@ -103,5 +138,7 @@ describe('Инициализация колод партии (createInitialDecks
     expect(decks.craftedItems.drawPile).toHaveLength(12);
     expect(decks.contamination.drawPile).toHaveLength(27);
     expect(decks.seriousWounds.drawPile).toHaveLength(16);
+    expect(decks.intruderAttacks.drawPile).toHaveLength(20);
+    expect(decks.intruderAttacks.discard).toEqual([]);
   });
 });
diff --git a/packages/shared/src/data/cardsSetup.ts b/packages/shared/src/data/cardsSetup.ts
index 455dc54..d6cb250 100644
--- a/packages/shared/src/data/cardsSetup.ts
+++ b/packages/shared/src/data/cardsSetup.ts
@@ -4,6 +4,7 @@ import { ACTION_CARDS_BY_CHARACTER } from '../data/actionCards.js';
 import { CONTAMINATION_CARDS } from '../data/contaminationCards.js';
 import { CRAFTED_ITEM_CARDS } from '../data/crafting.js';
 import { GREEN_ITEM_CARDS, RED_ITEM_CARDS, YELLOW_ITEM_CARDS } from '../data/itemCards.js';
+import { INTRUDER_ATTACK_CARDS } from '../data/intruderAttacks.js';
 import { SERIOUS_WOUND_CARDS } from '../data/seriousWounds.js';
 import { createRng, shuffle } from '../utils/rng.js';
 
@@ -47,7 +48,7 @@ export function createInitialDecks(seed: string): GameDecksState {
     contamination: { drawPile: shuffle(rng, [...CONTAMINATION_CARDS]), discard: [] },
     seriousWounds: { drawPile: shuffle(rng, [...SERIOUS_WOUND_CARDS]), discard: [] },
     events: { drawPile: [], discard: [] },
-    intruderAttacks: { drawPile: [], discard: [] },
+    intruderAttacks: { drawPile: shuffle(rng, [...INTRUDER_ATTACK_CARDS]), discard: [] },
     objectives: {
       personal: { drawPile: [], discard: [] },
       corporate: { drawPile: [], discard: [] },
diff --git a/packages/shared/src/data/combatDie.test.ts b/packages/shared/src/data/combatDie.test.ts
new file mode 100644
index 0000000..e99055e
--- /dev/null
+++ b/packages/shared/src/data/combatDie.test.ts
@@ -0,0 +1,30 @@
+import { describe, expect, it } from 'vitest';
+
+import { COMBAT_DIE_FACES, rollCombatDie } from './combatDie.js';
+import { createRng } from '../utils/rng.js';
+
+describe('Кубик Боя (CombatDie, v0.4.0 Шаг 1)', () => {
+  it('d6: шесть граней с продублированным промахом', () => {
+    expect(COMBAT_DIE_FACES).toHaveLength(6);
+    expect(COMBAT_DIE_FACES.filter((face) => face === 'MISS')).toHaveLength(2);
+  });
+
+  it('бросается детерминированно через поток combat', () => {
+    const rollSequence = (seed: string): string[] => {
+      const rng = createRng(seed, 'combat');
+
+      return Array.from({ length: 30 }, () => rollCombatDie(rng));
+    };
+
+    expect(rollSequence('nemesis-alpha')).toEqual(rollSequence('nemesis-alpha'));
+    expect(rollSequence('nemesis-beta')).not.toEqual(rollSequence('nemesis-alpha'));
+  });
+
+  it('возвращает только грани из набора кубика', () => {
+    const rng = createRng('nemesis-alpha', 'combat');
+
+    for (let roll = 0; roll < 200; roll++) {
+      expect(COMBAT_DIE_FACES).toContain(rollCombatDie(rng));
+    }
+  });
+});
diff --git a/packages/shared/src/data/combatDie.ts b/packages/shared/src/data/combatDie.ts
new file mode 100644
index 0000000..7a8595b
--- /dev/null
+++ b/packages/shared/src/data/combatDie.ts
@@ -0,0 +1,18 @@
+import type { Rng } from '../utils/rng.js';
+import { pickIndex } from '../utils/rng.js';
+
+// doc/sources/data-sources.json#combat-die
+export type CombatDieFace = 'MISS' | 'TAIL' | 'SILHOUETTES' | 'ONE_WOUND' | 'TWO_WOUNDS';
+
+export const COMBAT_DIE_FACES: readonly CombatDieFace[] = [
+  'MISS',
+  'MISS',
+  'TAIL',
+  'SILHOUETTES',
+  'ONE_WOUND',
+  'TWO_WOUNDS',
+];
+
+export function rollCombatDie(rng: Rng): CombatDieFace {
+  return COMBAT_DIE_FACES[pickIndex(rng, COMBAT_DIE_FACES.length)]!;
+}
diff --git a/packages/shared/src/data/intruderAttacks.ts b/packages/shared/src/data/intruderAttacks.ts
new file mode 100644
index 0000000..8796712
--- /dev/null
+++ b/packages/shared/src/data/intruderAttacks.ts
@@ -0,0 +1,170 @@
+import type { IntruderAttackCard } from '../types/cards.js';
+
+// doc/sources/data-sources.json#intruder-attacks
+export const INTRUDER_ATTACK_CARDS: readonly IntruderAttackCard[] = [
+  {
+    id: 'INTRUDER_ATTACK_SCRATCH_1',
+    name: 'Царапина',
+    description: 'Атакованный Персонаж получает 1 Лёгкую Травму и 1 карту Заражения.',
+    toughness: 2,
+    hasRetreat: true,
+    attackerTypes: ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'],
+  },
+  {
+    id: 'INTRUDER_ATTACK_SCRATCH_2',
+    name: 'Царапина',
+    description: 'Атакованный Персонаж получает 1 Лёгкую Травму и 1 карту Заражения.',
+    toughness: 3,
+    hasRetreat: false,
+    attackerTypes: ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'],
+  },
+  {
+    id: 'INTRUDER_ATTACK_SCRATCH_3',
+    name: 'Царапина',
+    description: 'Атакованный Персонаж получает 1 Лёгкую Травму и 1 карту Заражения.',
+    toughness: 5,
+    hasRetreat: false,
+    attackerTypes: ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'],
+  },
+  {
+    id: 'INTRUDER_ATTACK_SCRATCH_4',
+    name: 'Царапина',
+    description: 'Атакованный Персонаж получает 1 Лёгкую Травму и 1 карту Заражения.',
+    toughness: 6,
+    hasRetreat: false,
+    attackerTypes: ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'],
+  },
+  {
+    id: 'INTRUDER_ATTACK_BITE_1',
+    name: 'Укус',
+    description: 'Если у Персонажа 2 или больше Тяжёлых Травм, он погибает. Иначе он получает 1 Тяжёлую Травму.',
+    toughness: 2,
+    hasRetreat: true,
+    attackerTypes: ['ADULT', 'BREEDER', 'QUEEN'],
+  },
+  {
+    id: 'INTRUDER_ATTACK_BITE_2',
+    name: 'Укус',
+    description: 'Если у Персонажа 2 или больше Тяжёлых Травм, он погибает. Иначе он получает 1 Тяжёлую Травму.',
+    toughness: 4,
+    hasRetreat: true,
+    attackerTypes: ['ADULT', 'BREEDER', 'QUEEN'],
+  },
+  {
+    id: 'INTRUDER_ATTACK_BITE_3',
+    name: 'Укус',
+    description: 'Если у Персонажа 2 или больше Тяжёлых Травм, он погибает. Иначе он получает 1 Тяжёлую Травму.',
+    toughness: 4,
+    hasRetreat: false,
+    attackerTypes: ['ADULT', 'BREEDER', 'QUEEN'],
+  },
+  {
+    id: 'INTRUDER_ATTACK_BITE_4',
+    name: 'Укус',
+    description: 'Если у Персонажа 2 или больше Тяжёлых Травм, он погибает. Иначе он получает 1 Тяжёлую Травму.',
+    toughness: 6,
+    hasRetreat: false,
+    attackerTypes: ['ADULT', 'BREEDER', 'QUEEN'],
+  },
+  {
+    id: 'INTRUDER_ATTACK_CLAWS_1',
+    name: 'Атака когтями',
+    description: 'Атакованный Персонаж получает 2 Лёгкие Травмы и 1 карту Заражения.',
+    toughness: 3,
+    hasRetreat: false,
+    attackerTypes: ['ADULT', 'BREEDER', 'QUEEN'],
+  },
+  {
+    id: 'INTRUDER_ATTACK_CLAWS_2',
+    name: 'Атака когтями',
+    description: 'Атакованный Персонаж получает 2 Лёгкие Травмы и 1 карту Заражения.',
+    toughness: 4,
+    hasRetreat: false,
+    attackerTypes: ['ADULT', 'BREEDER', 'QUEEN'],
+  },
+  {
+    id: 'INTRUDER_ATTACK_CLAWS_3',
+    name: 'Атака когтями',
+    description: 'Атакованный Персонаж получает 2 Лёгкие Травмы и 1 карту Заражения.',
+    toughness: 4,
+    hasRetreat: true,
+    attackerTypes: ['ADULT', 'BREEDER', 'QUEEN'],
+  },
+  {
+    id: 'INTRUDER_ATTACK_CLAWS_4',
+    name: 'Атака когтями',
+    description: 'Атакованный Персонаж получает 2 Лёгкие Травмы и 1 карту Заражения.',
+    toughness: 5,
+    hasRetreat: true,
+    attackerTypes: ['ADULT', 'BREEDER', 'QUEEN'],
+  },
+  {
+    id: 'INTRUDER_ATTACK_TAIL_1',
+    name: 'Атака хвостом',
+    description: 'Если у Персонажа есть хотя бы 1 Тяжёлая Травма, он погибает. Иначе он получает 1 Тяжёлую Травму.',
+    toughness: 2,
+    hasRetreat: false,
+    attackerTypes: ['QUEEN'],
+  },
+  {
+    id: 'INTRUDER_ATTACK_TAIL_2',
+    name: 'Атака хвостом',
+    description: 'Если у Персонажа есть хотя бы 1 Тяжёлая Травма, он погибает. Иначе он получает 1 Тяжёлую Травму.',
+    toughness: 5,
+    hasRetreat: false,
+    attackerTypes: ['QUEEN'],
+  },
+  {
+    id: 'INTRUDER_ATTACK_TRANSFORMATION_1',
+    name: 'Трансформация',
+    description:
+      'Замените атакующего Крипера на Трутня. Если у игрока нет карт на руке, Трутень совершает Внезапную Атаку.',
+    toughness: 4,
+    hasRetreat: false,
+    attackerTypes: ['CREEPER'],
+  },
+  {
+    id: 'INTRUDER_ATTACK_TRANSFORMATION_2',
+    name: 'Трансформация',
+    description:
+      'Замените атакующего Крипера на Трутня. Если у игрока нет карт на руке, Трутень совершает Внезапную Атаку.',
+    toughness: 5,
+    hasRetreat: false,
+    attackerTypes: ['CREEPER'],
+  },
+  {
+    id: 'INTRUDER_ATTACK_FURY_1',
+    name: 'Ярость',
+    description:
+      'Каждый Персонаж в отсеке с 2 или больше Тяжёлыми Травмами погибает. Остальные получают по 1 Тяжёлой Травме.',
+    toughness: 3,
+    hasRetreat: false,
+    attackerTypes: ['BREEDER', 'QUEEN'],
+  },
+  {
+    id: 'INTRUDER_ATTACK_FURY_2',
+    name: 'Ярость',
+    description:
+      'Каждый Персонаж в отсеке с 2 или больше Тяжёлыми Травмами погибает. Остальные получают по 1 Тяжёлой Травме.',
+    toughness: 4,
+    hasRetreat: false,
+    attackerTypes: ['BREEDER', 'QUEEN'],
+  },
+  {
+    id: 'INTRUDER_ATTACK_SLIME_1',
+    name: 'Слизь',
+    description: 'Атакованный Персонаж получает маркер Слизи и 1 карту Заражения.',
+    toughness: 5,
+    hasRetreat: false,
+    attackerTypes: ['CREEPER', 'ADULT', 'BREEDER', 'QUEEN'],
+  },
+  {
+    id: 'INTRUDER_ATTACK_CALL_1',
+    name: 'Зов',
+    description:
+      'Вытяните 1 жетон из Пула Чужих и поместите его в этот отсек. Он не совершает Внезапных Атак и не атакует в этой фазе.',
+    toughness: 3,
+    hasRetreat: false,
+    attackerTypes: ['CREEPER', 'QUEEN'],
+  },
+];
diff --git a/packages/shared/src/data/sources.golden.test.ts b/packages/shared/src/data/sources.golden.test.ts
index ebc105c..52b98cc 100644
--- a/packages/shared/src/data/sources.golden.test.ts
+++ b/packages/shared/src/data/sources.golden.test.ts
@@ -3,8 +3,10 @@ import { fileURLToPath } from 'node:url';
 
 import { describe, expect, it } from 'vitest';
 
+import { COMBAT_DIE_FACES } from './combatDie.js';
 import { CRAFTING_RECIPES } from './crafting.js';
 import { EXPLORATION_TOKENS } from './explorationTokens.js';
+import { INTRUDER_ATTACK_CARDS } from './intruderAttacks.js';
 import {
   ADULT_ESCAPE_NUMBERS,
   BAG_ADULTS_PER_PLAYER,
@@ -123,6 +125,8 @@ describe('Пакет источника: структура и статусы (
       'setup-plan',
       'crafting-recipes',
       'deck-composition',
+      'combat-die',
+      'intruder-attacks',
     ];
 
     expect(Object.keys(dataSources.tables).sort()).toEqual([...expectedTables].sort());
@@ -400,6 +404,65 @@ describe('Golden: подготовка стола (Э2-1)', () => {
   });
 });
 
+describe('Golden: кубик Боя (v0.4.0 Шаг 1)', () => {
+  it('совпадает с источником по числу и составу граней', () => {
+    const expectation = table('combat-die').expectation as {
+      faceCount: number;
+      faces: string[];
+    };
+
+    expect(COMBAT_DIE_FACES).toHaveLength(expectation.faceCount);
+    expect([...COMBAT_DIE_FACES]).toEqual(expectation.faces);
+  });
+});
+
+describe('Golden: колода Атак Чужих (v0.4.0 Шаг 1)', () => {
+  it('совпадает с источником по числу карт и названиям', () => {
+    const expectation = table('intruder-attacks').expectation as {
+      cardCount: number;
+      byName: Record<string, number>;
+    };
+
+    expect(INTRUDER_ATTACK_CARDS).toHaveLength(expectation.cardCount);
+
+    const byName: Record<string, number> = {};
+
+    for (const card of INTRUDER_ATTACK_CARDS) {
+      byName[card.name] = (byName[card.name] ?? 0) + 1;
+    }
+
+    expect(byName).toEqual(expectation.byName);
+  });
+
+  it('совпадает с источником по стойкости, отступлению и типам атакующих', () => {
+    const expectation = table('intruder-attacks').expectation as {
+      toughnessByName: Record<string, number[]>;
+      retreatCountByName: Record<string, number>;
+      attackerTypesByName: Record<string, string[]>;
+    };
+
+    const toughnessByName: Record<string, number[]> = {};
+    const retreatCountByName: Record<string, number> = {};
+    const attackerTypesByName: Record<string, string[]> = {};
+
+    for (const card of INTRUDER_ATTACK_CARDS) {
+      toughnessByName[card.name] = [...(toughnessByName[card.name] ?? []), card.toughness];
+      retreatCountByName[card.name] = (retreatCountByName[card.name] ?? 0) + (card.hasRetreat ? 1 : 0);
+      attackerTypesByName[card.name] = [...card.attackerTypes].sort();
+    }
+
+    for (const [name, toughness] of Object.entries(expectation.toughnessByName)) {
+      expect(toughnessByName[name]?.sort((a, b) => a - b)).toEqual([...toughness].sort((a, b) => a - b));
+    }
+
+    expect(retreatCountByName).toEqual(expectation.retreatCountByName);
+
+    for (const [name, attackerTypes] of Object.entries(expectation.attackerTypesByName)) {
+      expect(attackerTypesByName[name]).toEqual([...attackerTypes].sort());
+    }
+  });
+});
+
 describe('Golden: состав колод (v0.3.0 Шаг 2)', () => {
   it('совпадает с источником по размерам и количеству карт в колодах', () => {
     const expectation = table('deck-composition').expectation as {
diff --git a/packages/shared/src/data/weaknessCards.test.ts b/packages/shared/src/data/weaknessCards.test.ts
new file mode 100644
index 0000000..2ce543e
--- /dev/null
+++ b/packages/shared/src/data/weaknessCards.test.ts
@@ -0,0 +1,18 @@
+import { describe, expect, it } from 'vitest';
+
+import { WEAKNESS_CARDS } from './weaknessCards.js';
+
+describe('WEAKNESS_CARDS: транскрипт doc/data/INTRUDERS.md §6', () => {
+  it('содержит 7 карт с уникальными id и названиями', () => {
+    expect(WEAKNESS_CARDS).toHaveLength(7);
+    expect(new Set(WEAKNESS_CARDS.map((card) => card.id)).size).toBe(7);
+    expect(new Set(WEAKNESS_CARDS.map((card) => card.name)).size).toBe(7);
+  });
+
+  it('у каждой карты непустое описание и рубашка вверх', () => {
+    for (const card of WEAKNESS_CARDS) {
+      expect(card.description.length).toBeGreaterThan(0);
+      expect(card.isRevealed).toBe(false);
+    }
+  });
+});
diff --git a/packages/shared/src/data/weaknessCards.ts b/packages/shared/src/data/weaknessCards.ts
new file mode 100644
index 0000000..b2668fe
--- /dev/null
+++ b/packages/shared/src/data/weaknessCards.ts
@@ -0,0 +1,51 @@
+import type { WeaknessCard } from '../types/cards.js';
+
+// Источник текстов: doc/data/INTRUDERS.md §6 «СИСТЕМА СЛАБОСТЕЙ».
+// В транскрипте 7 карт, книга говорит о 8 — восьмая карта в документе
+// отсутствует и будет добавлена, когда появится её текст. Эффекты раскрытых
+// Слабостей движок пока не применяет (будущий этап за пределами 0.4.0):
+// Шаг 6 требует только раздачу и переворот карт.
+export const WEAKNESS_CARDS: readonly WeaknessCard[] = [
+  {
+    id: 'WEAKNESS_VULNERABLE_SPOTS',
+    name: 'Уязвимые места',
+    description: 'Символ Силуэтов на кубике Боя = 1 Рана по Взрослым.',
+    isRevealed: false,
+  },
+  {
+    id: 'WEAKNESS_FIRE_VULNERABILITY',
+    name: 'Уязвимость к огню',
+    description: 'Урон от Огня наносит 1 доп. Рану.',
+    isRevealed: false,
+  },
+  {
+    id: 'WEAKNESS_DANGER_REACTION',
+    name: 'Реакция на опасность',
+    description: 'Число проверки Внезапной Атаки снижено на 1 (минимум 1).',
+    isRevealed: false,
+  },
+  {
+    id: 'WEAKNESS_ENERGY_VULNERABILITY',
+    name: 'Уязвимость к энергии',
+    description: 'Энергооружие наносит 1 доп. Рану.',
+    isRevealed: false,
+  },
+  {
+    id: 'WEAKNESS_MOVEMENT_HABITS',
+    name: 'Повадки движения',
+    description: 'Закрытые Двери разрушают только Королева или Трутни (Взрослые останавливаются).',
+    isRevealed: false,
+  },
+  {
+    id: 'WEAKNESS_PHOSPHATE_SUSCEPTIBILITY',
+    name: 'Восприимчивость к фосфатам',
+    description: 'Огнетушитель / Система Пожаротушения заставляет Чужого отступить и наносит ему 1 Рану.',
+    isRevealed: false,
+  },
+  {
+    id: 'WEAKNESS_ATTACK_HABITS',
+    name: 'Повадки атаки',
+    description: 'Атака «Укус» от Взрослой Особи наносит Лёгкую Травму вместо Тяжёлой.',
+    isRevealed: false,
+  },
+];
diff --git a/packages/shared/src/index.test.ts b/packages/shared/src/index.test.ts
index ff02e12..f9ae4b9 100644
--- a/packages/shared/src/index.test.ts
+++ b/packages/shared/src/index.test.ts
@@ -21,6 +21,7 @@ const PUBLIC_RUNTIME_EXPORTS = [
   'BASIC_ROOMS_1',
   'CABINS_HAND_SIZE',
   'CHARACTERS',
+  'COMBAT_DIE_FACES',
   'COMPONENT_FAMILY',
   'CONTAMINATION_CARDS',
   'CONTAMINATION_CARDS_COUNT',
@@ -39,11 +40,30 @@ const PUBLIC_RUNTIME_EXPORTS = [
   'EXPLORATION_EFFECTS',
   'EXPLORATION_TOKENS',
   'EngineError',
+  'combatDieWoundsForShoot',
+  'combatDieWoundsForMelee',
+  'performPickUpObject',
+  'validatePickUpConditions',
+  'resolveEscapeAttacks',
+  'drawCombatFace',
+  'applyShootFace',
+  'assertShootFaceAllowed',
+  'performBurstFire',
+  'WEAKNESS_CARDS',
+  'killIntruder',
+  'performMelee',
+  'performShoot',
+  'validateMeleeConditions',
+  'removeIntruder',
+  'resolveIntruderWounds',
+  'retreatIntruder',
+  'validateShootConditions',
   'FIRE_MARKER_SUPPLY',
   'GAME_STATE_SCHEMA_VERSION',
   'GREEN_ITEM_CARDS',
   'GameEngine',
   'HAND_SLOT_COUNT',
+  'INTRUDER_ATTACK_CARDS',
   'INTRUDER_SUPPLY_COMPOSITION',
   'MALFUNCTION_FORBIDDEN_ROOM_DEFINITIONS',
   'MALFUNCTION_MARKER_SUPPLY',
@@ -85,6 +105,7 @@ const PUBLIC_RUNTIME_EXPORTS = [
   'isRngStream',
   'pickIndex',
   'placeItemToPlayer',
+  'rollCombatDie',
   'rollDie',
   'shuffle',
   'startNewRound',
@@ -114,6 +135,14 @@ const PUBLIC_RUNTIME_EXPORTS = [
   'splitIntruderBag',
   'validatePayment',
   'validateSearchConditions',
+  'dealLightWounds',
+  'dealSeriousWounds',
+  'drawIntruderAttackCard',
+  'giveContaminationCards',
+  'killPlayer',
+  'queueContact',
+  'resolveContactInterrupt',
+  'resolveSurpriseAttackInterrupt',
 ];
 
 describe('Публичное API ядра', () => {
diff --git a/packages/shared/src/index.ts b/packages/shared/src/index.ts
index 448ddd7..f680776 100644
--- a/packages/shared/src/index.ts
+++ b/packages/shared/src/index.ts
@@ -15,6 +15,9 @@ export * from './logic/cardsPayment.js';
 export * from './logic/turnCycle.js';
 export * from './logic/search.js';
 export * from './logic/roomAbilities.js';
+export * from './logic/contact.js';
+export * from './logic/combat.js';
+export * from './logic/objects.js';
 export * from './data/shipGraph.js';
 export * from './data/roomDefinitions.js';
 export * from './data/crafting.js';
@@ -25,7 +28,10 @@ export * from './data/contaminationCards.js';
 export * from './data/seriousWounds.js';
 export * from './data/cardsSetup.js';
 export * from './data/noiseDie.js';
+export * from './data/combatDie.js';
 export * from './data/explorationTokens.js';
 export * from './data/intruderPool.js';
+export * from './data/intruderAttacks.js';
+export * from './data/weaknessCards.js';
 export * from './data/setup.js';
 export * from './utils/rng.js';
diff --git a/packages/shared/src/logic/combat.test.ts b/packages/shared/src/logic/combat.test.ts
new file mode 100644
index 0000000..3076087
--- /dev/null
+++ b/packages/shared/src/logic/combat.test.ts
@@ -0,0 +1,891 @@
+import { describe, expect, it } from 'vitest';
+
+import type { CombatDieFace } from '../data/combatDie.js';
+import { CRAFTED_ITEM_CARDS } from '../data/crafting.js';
+import type { IntruderEntity, IntruderToken, IntruderType } from '../types/entities.js';
+import type { GameLogEvent } from '../types/log.js';
+import type { RoomId } from '../types/rooms.js';
+import type { GameState } from '../types/state.js';
+import {
+  combatDieWoundsForMelee,
+  combatDieWoundsForShoot,
+  killIntruder,
+  performBurstFire,
+  performMelee,
+  performShoot,
+  resolveIntruderWounds,
+  retreatIntruder,
+  validateMeleeConditions,
+  validateShootConditions,
+} from './combat.js';
+import type { EngineErrorCode } from './fsm.js';
+import { EngineError, GameEngine } from './fsm.js';
+import { createInitialGameState } from './setup.js';
+
+/** Оружие без особых свойств для базовых строк матрицы. */
+const GENERIC_WEAPON = 'Энерговинтовка';
+
+function freshState(seed = 'shoot-test'): GameState {
+  const state = createInitialGameState(seed, { playerCount: 1 });
+
+  // Оружие из сетапа клонируем: выстрел мутирует боезапас, а записи
+  // STARTING_WEAPONS — общие объекты данных (см. тест независимости ниже).
+  for (const player of Object.values(state.players)) {
+    player.handSlots = player.handSlots.map((slot) =>
+      slot.source === 'ITEM' ? { source: 'ITEM' as const, card: { ...slot.card } } : slot,
+    );
+  }
+
+  return state;
+}
+
+function expectEngineError(run: () => unknown, code: EngineErrorCode): void {
+  try {
+    run();
+  } catch (error) {
+    expect(error).toBeInstanceOf(EngineError);
+    expect((error as EngineError).code).toBe(code);
+    return;
+  }
+
+  throw new Error(`Ожидалась ошибка движка с кодом ${code}, но действие прошло без ошибки.`);
+}
+
+function placeIntruder(state: GameState, type: IntruderType, roomId: RoomId, woundsCount = 0): IntruderEntity {
+  const n = state.intrudersPool.boardTokens.length + 1;
+  const token: IntruderToken = { id: `token-test-${n}`, type, escapeNumber: 1 };
+  const entity: IntruderEntity = { id: `intruder-test-${n}`, type, roomId, woundsCount, token };
+
+  state.intrudersPool.boardTokens.push(entity);
+  state.ship.rooms[roomId]!.occupantIntruderIds.push(entity.id);
+
+  return entity;
+}
+
+function forceAttackTopById(state: GameState, cardId: string): void {
+  const pile = state.decks.intruderAttacks.drawPile;
+  const index = pile.findIndex((card) => card.id === cardId);
+
+  if (index === -1) throw new Error(`В колоде Атак Чужих нет карты ${cardId}.`);
+
+  const [card] = pile.splice(index, 1);
+  pile.unshift(card!);
+}
+
+function logEvents(state: GameState): GameLogEvent[] {
+  return state.gameLog.map((entry) => entry.event);
+}
+
+function closeAllDoorsExcept(state: GameState, keepCorridorId: string | null): void {
+  for (const corridor of Object.values(state.ship.corridors)) {
+    if (corridor.id !== keepCorridorId) {
+      corridor.doorState = 'CLOSED';
+    }
+  }
+}
+
+describe('combatDieWoundsForShoot', () => {
+  const cases: Array<[CombatDieFace, IntruderType, string, number]> = [
+    // Промах — всегда 0.
+    ['MISS', 'LARVA', GENERIC_WEAPON, 0],
+    ['MISS', 'ADULT', GENERIC_WEAPON, 0],
+    ['MISS', 'QUEEN', GENERIC_WEAPON, 0],
+    // Хвост — только Личинка и Крипер.
+    ['TAIL', 'LARVA', GENERIC_WEAPON, 1],
+    ['TAIL', 'CREEPER', GENERIC_WEAPON, 1],
+    ['TAIL', 'ADULT', GENERIC_WEAPON, 0],
+    ['TAIL', 'BREEDER', GENERIC_WEAPON, 0],
+    ['TAIL', 'QUEEN', GENERIC_WEAPON, 0],
+    // Силуэты — все, кроме Трутня и Королевы.
+    ['SILHOUETTES', 'LARVA', GENERIC_WEAPON, 1],
+    ['SILHOUETTES', 'CREEPER', GENERIC_WEAPON, 1],
+    ['SILHOUETTES', 'ADULT', GENERIC_WEAPON, 1],
+    ['SILHOUETTES', 'BREEDER', GENERIC_WEAPON, 0],
+    ['SILHOUETTES', 'QUEEN', GENERIC_WEAPON, 0],
+    // Раны — любому.
+    ['ONE_WOUND', 'LARVA', GENERIC_WEAPON, 1],
+    ['ONE_WOUND', 'QUEEN', GENERIC_WEAPON, 1],
+    ['TWO_WOUNDS', 'ADULT', GENERIC_WEAPON, 2],
+    ['TWO_WOUNDS', 'ADULT', 'Тестовый бластер', 2],
+    // Револьвер и Пистолет: [2 Раны] считаются 1 Раной.
+    ['TWO_WOUNDS', 'ADULT', 'Револьвер', 1],
+    ['TWO_WOUNDS', 'QUEEN', 'Пистолет', 1],
+    ['ONE_WOUND', 'ADULT', 'Пистолет', 1],
+    // Обрез: Силуэты считаются промахом.
+    ['SILHOUETTES', 'ADULT', 'Обрез', 0],
+    ['ONE_WOUND', 'ADULT', 'Обрез', 1],
+    // Дробовик и Боевая винтовка: +1 Рана, если нанесена хотя бы 1.
+    ['TAIL', 'CREEPER', 'Дробовик', 2],
+    ['ONE_WOUND', 'ADULT', 'Дробовик', 2],
+    ['TWO_WOUNDS', 'ADULT', 'Боевая винтовка', 3],
+    ['MISS', 'ADULT', 'Дробовик', 0],
+    ['SILHOUETTES', 'QUEEN', 'Дробовик', 0],
+    // Огнемёт: минимум 1 Рана, кроме Промаха.
+    ['TAIL', 'ADULT', 'Огнемёт', 1],
+    ['SILHOUETTES', 'QUEEN', 'Огнемёт', 1],
+    ['MISS', 'ADULT', 'Огнемёт', 0],
+    ['ONE_WOUND', 'ADULT', 'Огнемёт', 1],
+  ];
+
+  it.each(cases)('грань %s по %s из «%s» наносит %i Ран(ы)', (face, targetType, weaponName, wounds) => {
+    expect(combatDieWoundsForShoot(face, targetType, weaponName)).toBe(wounds);
+  });
+});
+
+describe('validateShootConditions', () => {
+  it('отклоняет выстрел по Чужому, которого нет на поле', () => {
+    const state = freshState();
+
+    expectEngineError(() => validateShootConditions(state, 'player-1', 'intruder-nope', 0), 'UNKNOWN_INTRUDER');
+  });
+
+  it('отклоняет выстрел по Чужому в другом отсеке', () => {
+    const state = freshState();
+    const playerRoom = state.players['player-1']!.roomId;
+    const otherRoom = Number(Object.keys(state.ship.rooms).find((id) => Number(id) !== playerRoom)!);
+    const intruder = placeIntruder(state, 'ADULT', otherRoom);
+
+    expectEngineError(() => validateShootConditions(state, 'player-1', intruder.id, 0), 'SHOOT_TARGET_NOT_IN_ROOM');
+  });
+
+  it('отклоняет выстрел из пустого слота руки', () => {
+    const state = freshState();
+    const playerRoom = state.players['player-1']!.roomId;
+    const intruder = placeIntruder(state, 'ADULT', playerRoom);
+
+    expectEngineError(() => validateShootConditions(state, 'player-1', intruder.id, 5), 'SHOOT_INVALID_WEAPON');
+  });
+
+  it('отклоняет выстрел Тяжёлым объектом и не-оружием', () => {
+    const state = freshState();
+    const playerRoom = state.players['player-1']!.roomId;
+    const intruder = placeIntruder(state, 'ADULT', playerRoom);
+    const player = state.players['player-1']!;
+    const slot0 = player.handSlots[0]!;
+    if (slot0.source !== 'ITEM') throw new Error('В сетапе ожидалось оружие в руке.');
+    const weaponCard = { ...slot0.card };
+
+    player.handSlots[0] = { source: 'OBJECT', object: { id: 'egg-1', kind: 'EGG' } };
+
+    expectEngineError(() => validateShootConditions(state, 'player-1', intruder.id, 0), 'SHOOT_INVALID_WEAPON');
+
+    player.handSlots[0] = { source: 'ITEM', card: { ...weaponCard, isWeapon: false } };
+
+    expectEngineError(() => validateShootConditions(state, 'player-1', intruder.id, 0), 'SHOOT_INVALID_WEAPON');
+  });
+
+  it('отклоняет выстрел без Боезапаса и из оружия без боезапаса в модели', () => {
+    const state = freshState();
+    const playerRoom = state.players['player-1']!.roomId;
+    const intruder = placeIntruder(state, 'ADULT', playerRoom);
+    const slot = state.players['player-1']!.handSlots[0]!;
+
+    if (slot.source !== 'ITEM') throw new Error('В сетапе ожидалось оружие в руке.');
+    slot.card.ammo = 0;
+
+    expectEngineError(() => validateShootConditions(state, 'player-1', intruder.id, 0), 'SHOOT_NO_AMMO');
+
+    slot.card.ammo = null;
+
+    expectEngineError(() => validateShootConditions(state, 'player-1', intruder.id, 0), 'SHOOT_INVALID_WEAPON');
+  });
+
+  it('отклоняет выстрел от неизвестного персонажа', () => {
+    const state = freshState();
+
+    expectEngineError(() => validateShootConditions(state, 'player-nope', 'intruder-1', 0), 'UNKNOWN_PLAYER');
+  });
+});
+
+describe('performShoot', () => {
+  it('тратит 1 Боезапас, бросает кубик и наносит Раны по маппингу грани', () => {
+    const state = freshState();
+    const player = state.players['player-1']!;
+    const slot = player.handSlots[0]!;
+    if (slot.source !== 'ITEM') throw new Error('В сетапе ожидалось оружие в руке.');
+    const weaponName = slot.card.name;
+    const ammoBefore = slot.card.ammo!;
+    const intruder = placeIntruder(state, 'ADULT', player.roomId);
+    const logBefore = state.gameLog.length;
+
+    performShoot(state, 'player-1', intruder.id, 0);
+
+    expect(slot.card.ammo).toBe(ammoBefore - 1);
+    expect(state.meta.rngDraws.combat).toBeGreaterThan(0);
+
+    const shot = logEvents(state)[logBefore]!;
+    expect(shot.type).toBe('SHOT_FIRED');
+    if (shot.type !== 'SHOT_FIRED') throw new Error('Ожидалось событие SHOT_FIRED.');
+    expect(shot.playerId).toBe('player-1');
+    expect(shot.intruderId).toBe(intruder.id);
+    expect(shot.intruderType).toBe('ADULT');
+    expect(shot.weaponName).toBe(weaponName);
+    expect(shot.woundsDealt).toBe(combatDieWoundsForShoot(shot.dieFace, 'ADULT', weaponName));
+    expect(intruder.woundsCount).toBe(shot.woundsDealt);
+  });
+
+  it('при промахе не проверяет Стойкость, но Боезапас тратит', () => {
+    for (let probe = 0; probe < 40; probe++) {
+      const state = freshState(`shoot-miss-${probe}`);
+      const player = state.players['player-1']!;
+      const slot = player.handSlots[0]!;
+      if (slot.source !== 'ITEM') throw new Error('В сетапе ожидалось оружие в руке.');
+      const ammoBefore = slot.card.ammo!;
+      const intruder = placeIntruder(state, 'ADULT', player.roomId);
+
+      performShoot(state, 'player-1', intruder.id, 0);
+
+      const shot = logEvents(state).find((event) => event.type === 'SHOT_FIRED');
+      if (shot?.type !== 'SHOT_FIRED' || shot.woundsDealt !== 0) {
+        continue;
+      }
+
+      expect(slot.card.ammo).toBe(ammoBefore - 1);
+      expect(intruder.woundsCount).toBe(0);
+      expect(logEvents(state).some((event) => event.type === 'TOUGHNESS_CHECKED')).toBe(false);
+      expect(state.intrudersPool.boardTokens).toContain(intruder);
+      return;
+    }
+
+    throw new Error('За 40 сидов не выпал ни один промах — сломан кубик Боя.');
+  });
+
+  it('Огнемёт при [2 Ранах] отклоняется ошибкой огня без траты Боезапаса', () => {
+    const flamethrower = CRAFTED_ITEM_CARDS.find((card) => card.name === 'Огнемёт');
+    if (!flamethrower) throw new Error('В данных крафта нет Огнемёта.');
+
+    for (let probe = 0; probe < 60; probe++) {
+      const state = freshState(`shoot-flame-${probe}`);
+      const player = state.players['player-1']!;
+      player.handSlots[0] = { source: 'ITEM', card: { ...flamethrower } };
+      const intruder = placeIntruder(state, 'ADULT', player.roomId);
+
+      try {
+        performShoot(state, 'player-1', intruder.id, 0);
+      } catch (error) {
+        expect(error).toBeInstanceOf(EngineError);
+        expect((error as EngineError).code).toBe('SHOOT_FIRE_NOT_IMPLEMENTED');
+        const slot = player.handSlots[0]!;
+        expect(slot.source === 'ITEM' ? slot.card.ammo : null).toBe(flamethrower.ammo);
+        return;
+      }
+    }
+
+    throw new Error('За 60 сидов не выпали [2 Раны] — сломан кубик Боя.');
+  });
+});
+
+describe('resolveIntruderWounds', () => {
+  it('Личинка погибает от любой Раны без карты Стойкости', () => {
+    const state = freshState();
+    const player = state.players['player-1']!;
+    const intruder = placeIntruder(state, 'LARVA', player.roomId);
+    const discardBefore = state.decks.intruderAttacks.discard.length;
+
+    resolveIntruderWounds(state, intruder, 'player-1', 1);
+
+    expect(state.intrudersPool.boardTokens).not.toContain(intruder);
+    expect(state.ship.rooms[player.roomId]!.occupantIntruderIds).not.toContain(intruder.id);
+    expect(state.intrudersPool.deadTokens).toContain(intruder.token);
+    expect(state.decks.intruderAttacks.discard.length).toBe(discardBefore);
+    const events = logEvents(state);
+    expect(events.some((event) => event.type === 'TOUGHNESS_CHECKED')).toBe(false);
+    const killed = events[events.length - 1]!;
+    expect(killed.type).toBe('INTRUDER_KILLED');
+    if (killed.type !== 'INTRUDER_KILLED') throw new Error('Ожидалось событие INTRUDER_KILLED.');
+    expect(killed.intruderId).toBe(intruder.id);
+    expect(killed.intruderType).toBe('LARVA');
+  });
+
+  it('Крипер погибает, когда суммарные Раны достигают Стойкости одной карты', () => {
+    const state = freshState();
+    const player = state.players['player-1']!;
+    const intruder = placeIntruder(state, 'CREEPER', player.roomId, 4);
+    forceAttackTopById(state, 'INTRUDER_ATTACK_SCRATCH_3'); // Стойкость 5, без отступления
+
+    resolveIntruderWounds(state, intruder, 'player-1', 1);
+
+    const toughness = logEvents(state).find((event) => event.type === 'TOUGHNESS_CHECKED');
+    expect(toughness?.type).toBe('TOUGHNESS_CHECKED');
+    if (toughness?.type !== 'TOUGHNESS_CHECKED') throw new Error('Ожидалось событие TOUGHNESS_CHECKED.');
+    expect(toughness.attackCards).toHaveLength(1);
+    expect(toughness.attackCards[0]).toMatchObject({ toughness: 5, hasRetreat: false });
+    expect(toughness.woundsTotal).toBe(5);
+    expect(toughness.killed).toBe(true);
+    expect(toughness.retreated).toBe(false);
+    expect(logEvents(state).some((event) => event.type === 'INTRUDER_KILLED')).toBe(true);
+    expect(state.intrudersPool.boardTokens).not.toContain(intruder);
+  });
+
+  it('Взрослая выживает, когда Ран меньше Стойкости', () => {
+    const state = freshState();
+    const player = state.players['player-1']!;
+    const intruder = placeIntruder(state, 'ADULT', player.roomId);
+    forceAttackTopById(state, 'INTRUDER_ATTACK_SCRATCH_3'); // Стойкость 5, без отступления
+
+    resolveIntruderWounds(state, intruder, 'player-1', 2);
+
+    expect(intruder.woundsCount).toBe(2);
+    const events = logEvents(state);
+    const toughness = events.find((event) => event.type === 'TOUGHNESS_CHECKED');
+    if (toughness?.type !== 'TOUGHNESS_CHECKED') throw new Error('Ожидалось событие TOUGHNESS_CHECKED.');
+    expect(toughness.killed).toBe(false);
+    expect(toughness.retreated).toBe(false);
+    expect(events.some((event) => event.type === 'INTRUDER_KILLED')).toBe(false);
+    expect(events.some((event) => event.type === 'INTRUDER_RETREATED')).toBe(false);
+    expect(state.intrudersPool.boardTokens).toContain(intruder);
+  });
+
+  it('Трутень тянет 2 карты: Стойкость суммируется', () => {
+    const state = freshState();
+    const player = state.players['player-1']!;
+    const intruder = placeIntruder(state, 'BREEDER', player.roomId);
+    forceAttackTopById(state, 'INTRUDER_ATTACK_SCRATCH_2'); // Стойкость 3
+    forceAttackTopById(state, 'INTRUDER_ATTACK_BITE_3'); // Стойкость 4, обе без отступления
+
+    resolveIntruderWounds(state, intruder, 'player-1', 6);
+
+    const toughness = logEvents(state).find((event) => event.type === 'TOUGHNESS_CHECKED');
+    if (toughness?.type !== 'TOUGHNESS_CHECKED') throw new Error('Ожидалось событие TOUGHNESS_CHECKED.');
+    expect(toughness.attackCards).toHaveLength(2);
+    expect(toughness.killed).toBe(false);
+    expect(state.intrudersPool.boardTokens).toContain(intruder);
+
+    resolveIntruderWounds(state, intruder, 'player-1', 1);
+
+    const second = logEvents(state).filter((event) => event.type === 'TOUGHNESS_CHECKED')[1]!;
+    if (second?.type !== 'TOUGHNESS_CHECKED') throw new Error('Ожидалось второе событие TOUGHNESS_CHECKED.');
+    expect(second.attackCards).toHaveLength(2);
+  });
+
+  it('Королева тянет 2 карты и погибает от суммарных Ран', () => {
+    const state = freshState();
+    const player = state.players['player-1']!;
+    const intruder = placeIntruder(state, 'QUEEN', player.roomId);
+    forceAttackTopById(state, 'INTRUDER_ATTACK_SCRATCH_2'); // Стойкость 3
+    forceAttackTopById(state, 'INTRUDER_ATTACK_BITE_3'); // Стойкость 4
+
+    resolveIntruderWounds(state, intruder, 'player-1', 7);
+
+    const toughness = logEvents(state).find((event) => event.type === 'TOUGHNESS_CHECKED');
+    if (toughness?.type !== 'TOUGHNESS_CHECKED') throw new Error('Ожидалось событие TOUGHNESS_CHECKED.');
+    expect(toughness.attackCards).toHaveLength(2);
+    expect(toughness.killed).toBe(true);
+    expect(logEvents(state).some((event) => event.type === 'INTRUDER_KILLED')).toBe(true);
+  });
+
+  it('стрелка Отступления перекрывает смерть: Чужой сбегает вместо гибели', () => {
+    const state = freshState();
+    const player = state.players['player-1']!;
+    const intruder = placeIntruder(state, 'CREEPER', player.roomId);
+    forceAttackTopById(state, 'INTRUDER_ATTACK_SCRATCH_1'); // Стойкость 2, есть отступление
+
+    resolveIntruderWounds(state, intruder, 'player-1', 6);
+
+    const events = logEvents(state);
+    const toughness = events.find((event) => event.type === 'TOUGHNESS_CHECKED');
+    if (toughness?.type !== 'TOUGHNESS_CHECKED') throw new Error('Ожидалось событие TOUGHNESS_CHECKED.');
+    expect(toughness.retreated).toBe(true);
+    expect(toughness.killed).toBe(false);
+    expect(events.some((event) => event.type === 'INTRUDER_KILLED')).toBe(false);
+    expect(state.intrudersPool.boardTokens).toContain(intruder);
+    expect(intruder.roomId).not.toBe(player.roomId);
+  });
+
+  it('отступление без открытых дверей: Чужой остаётся, но выживает', () => {
+    const state = freshState();
+    const player = state.players['player-1']!;
+    const intruder = placeIntruder(state, 'CREEPER', player.roomId);
+    closeAllDoorsExcept(state, null);
+    forceAttackTopById(state, 'INTRUDER_ATTACK_SCRATCH_1'); // Стойкость 2, есть отступление
+
+    resolveIntruderWounds(state, intruder, 'player-1', 6);
+
+    const events = logEvents(state);
+    const toughness = events.find((event) => event.type === 'TOUGHNESS_CHECKED');
+    if (toughness?.type !== 'TOUGHNESS_CHECKED') throw new Error('Ожидалось событие TOUGHNESS_CHECKED.');
+    expect(toughness.retreated).toBe(true);
+    expect(events.some((event) => event.type === 'INTRUDER_RETREATED')).toBe(false);
+    expect(intruder.roomId).toBe(player.roomId);
+    expect(state.intrudersPool.boardTokens).toContain(intruder);
+  });
+});
+
+describe('retreatIntruder', () => {
+  it('уводит Чужого через открытую Дверь и обновляет occupants отсеков', () => {
+    const state = freshState();
+    const corridor = Object.values(state.ship.corridors)[0]!;
+    closeAllDoorsExcept(state, corridor.id);
+    const intruder = placeIntruder(state, 'ADULT', corridor.fromRoomId);
+
+    retreatIntruder(state, intruder, 'player-1');
+
+    expect(intruder.roomId).toBe(corridor.toRoomId);
+    expect(state.ship.rooms[corridor.fromRoomId]!.occupantIntruderIds).not.toContain(intruder.id);
+    expect(state.ship.rooms[corridor.toRoomId]!.occupantIntruderIds).toContain(intruder.id);
+    const retreated = logEvents(state).find((event) => event.type === 'INTRUDER_RETREATED');
+    if (retreated?.type !== 'INTRUDER_RETREATED') throw new Error('Ожидалось событие INTRUDER_RETREATED.');
+    expect(retreated.fromRoomId).toBe(corridor.fromRoomId);
+    expect(retreated.toRoomId).toBe(corridor.toRoomId);
+  });
+
+  it('детерминировано: одинаковые партии отступают в один отсек', () => {
+    const runRetreat = (): RoomId => {
+      const state = freshState('shoot-retreat-determinism');
+      const player = state.players['player-1']!;
+      const intruder = placeIntruder(state, 'ADULT', player.roomId);
+      retreatIntruder(state, intruder, 'player-1');
+      return intruder.roomId;
+    };
+
+    expect(runRetreat()).toBe(runRetreat());
+  });
+});
+
+describe('killIntruder', () => {
+  it('снимает миниатюру, откладывает жетон в deadTokens и пишет событие', () => {
+    const state = freshState();
+    const player = state.players['player-1']!;
+    const intruder = placeIntruder(state, 'ADULT', player.roomId, 3);
+
+    killIntruder(state, intruder, 'player-1');
+
+    expect(state.intrudersPool.boardTokens).not.toContain(intruder);
+    expect(state.ship.rooms[player.roomId]!.occupantIntruderIds).not.toContain(intruder.id);
+    expect(state.intrudersPool.deadTokens).toContain(intruder.token);
+    const killed = logEvents(state).find((event) => event.type === 'INTRUDER_KILLED');
+    if (killed?.type !== 'INTRUDER_KILLED') throw new Error('Ожидалось событие INTRUDER_KILLED.');
+    expect(killed.roomId).toBe(player.roomId);
+    expect(killed.playerId).toBe('player-1');
+  });
+});
+
+describe('ACTION_SHOOT через GameEngine', () => {
+  it('оплачивает 1 карту, стреляет и засчитывает действие раунда', () => {
+    const engine = new GameEngine();
+    const state = freshState('shoot-action-flow');
+    const player = state.players['player-1']!;
+    const intruder = placeIntruder(state, 'ADULT', player.roomId);
+    const intruderId = intruder.id;
+    const handBefore = player.actionDeck.hand.length;
+    const payCardId = player.actionDeck.hand[0]!.id;
+
+    const next = engine.processAction(state, {
+      type: 'ACTION_SHOOT',
+      payload: { targetIntruderId: intruderId, weaponSlotIndex: 0, discardCardIds: [payCardId] },
+    });
+
+    expect(next.players['player-1']!.actionDeck.hand.length).toBe(handBefore - 1);
+    expect(next.players['player-1']!.actionsPerformedThisRound).toBe(1);
+    expect(logEvents(next).some((event) => event.type === 'SHOT_FIRED')).toBe(true);
+  });
+
+  it('проверяет условия до оплаты: неверная цель важнее пустой оплаты', () => {
+    const engine = new GameEngine();
+    const state = freshState('shoot-action-order');
+
+    expectEngineError(
+      () =>
+        engine.processAction(state, {
+          type: 'ACTION_SHOOT',
+          payload: { targetIntruderId: 'intruder-nope', weaponSlotIndex: 0, discardCardIds: [] },
+        }),
+      'UNKNOWN_INTRUDER',
+    );
+  });
+
+  it('без карты оплаты отклоняется ошибкой оплаты', () => {
+    const engine = new GameEngine();
+    const state = freshState('shoot-action-payment');
+    const player = state.players['player-1']!;
+    const intruder = placeIntruder(state, 'ADULT', player.roomId);
+
+    expectEngineError(
+      () =>
+        engine.processAction(state, {
+          type: 'ACTION_SHOOT',
+          payload: { targetIntruderId: intruder.id, weaponSlotIndex: 0, discardCardIds: [] },
+        }),
+      'INSUFFICIENT_ACTION_CARDS',
+    );
+  });
+});
+
+describe('combatDieWoundsForMelee', () => {
+  const cases: Array<[CombatDieFace, IntruderType, number]> = [
+    // Промах — всегда 0.
+    ['MISS', 'LARVA', 0],
+    ['MISS', 'ADULT', 0],
+    ['MISS', 'QUEEN', 0],
+    // Хвост — только Личинка и Крипер, иначе промах.
+    ['TAIL', 'LARVA', 1],
+    ['TAIL', 'CREEPER', 1],
+    ['TAIL', 'ADULT', 0],
+    ['TAIL', 'BREEDER', 0],
+    ['TAIL', 'QUEEN', 0],
+    // Силуэты — все, кроме Трутня и Королевы, иначе промах.
+    ['SILHOUETTES', 'LARVA', 1],
+    ['SILHOUETTES', 'CREEPER', 1],
+    ['SILHOUETTES', 'ADULT', 1],
+    ['SILHOUETTES', 'BREEDER', 0],
+    ['SILHOUETTES', 'QUEEN', 0],
+    // [+] и [++] наносят лишь 1 Рану любому.
+    ['ONE_WOUND', 'LARVA', 1],
+    ['ONE_WOUND', 'QUEEN', 1],
+    ['TWO_WOUNDS', 'LARVA', 1],
+    ['TWO_WOUNDS', 'ADULT', 1],
+    ['TWO_WOUNDS', 'QUEEN', 1],
+  ];
+
+  it.each(cases)('грань %s по %s наносит %i Ран(у)', (face, targetType, wounds) => {
+    expect(combatDieWoundsForMelee(face, targetType)).toBe(wounds);
+  });
+});
+
+describe('validateMeleeConditions', () => {
+  it('отклоняет атаку по Чужому, которого нет на поле', () => {
+    const state = freshState();
+
+    expectEngineError(() => validateMeleeConditions(state, 'player-1', 'intruder-nope'), 'UNKNOWN_INTRUDER');
+  });
+
+  it('отклоняет атаку по Чужому в другом отсеке', () => {
+    const state = freshState();
+    const playerRoom = state.players['player-1']!.roomId;
+    const otherRoom = Number(Object.keys(state.ship.rooms).find((id) => Number(id) !== playerRoom)!);
+    const intruder = placeIntruder(state, 'ADULT', otherRoom);
+
+    expectEngineError(() => validateMeleeConditions(state, 'player-1', intruder.id), 'MELEE_TARGET_NOT_IN_ROOM');
+  });
+
+  it('отклоняет атаку от неизвестного персонажа', () => {
+    const state = freshState();
+
+    expectEngineError(() => validateMeleeConditions(state, 'player-nope', 'intruder-1'), 'UNKNOWN_PLAYER');
+  });
+});
+
+describe('performMelee', () => {
+  it('берёт Заражение, бросает кубик и разбирает исход по маппингу грани', () => {
+    const state = freshState('melee-flow');
+    const player = state.players['player-1']!;
+    const intruder = placeIntruder(state, 'ADULT', player.roomId);
+    const discardBefore = player.actionDeck.discard.length;
+    const woundsBefore = player.seriousWounds.length;
+    const logBefore = state.gameLog.length;
+
+    performMelee(state, 'player-1', intruder.id);
+
+    expect(player.actionDeck.discard.length).toBe(discardBefore + 1);
+
+    const melee = logEvents(state)[logBefore]!;
+    expect(melee.type).toBe('MELEE_ATTACKED');
+    if (melee.type !== 'MELEE_ATTACKED') throw new Error('Ожидалось событие MELEE_ATTACKED.');
+    expect(melee.playerId).toBe('player-1');
+    expect(melee.intruderId).toBe(intruder.id);
+    expect(melee.woundsDealt).toBe(combatDieWoundsForMelee(melee.dieFace, 'ADULT'));
+    expect(melee.contaminationDealt).toBe(1);
+
+    if (melee.woundsDealt === 0) {
+      expect(melee.seriousWoundDealt).toBe(1);
+      expect(player.seriousWounds.length).toBe(woundsBefore + 1);
+      expect(intruder.woundsCount).toBe(0);
+    } else {
+      expect(melee.seriousWoundDealt).toBe(0);
+      expect(player.seriousWounds.length).toBe(woundsBefore);
+      expect(intruder.woundsCount).toBe(melee.woundsDealt);
+    }
+  });
+
+  it('промах наносит Тяжёлую Травму, но Заражение уже взято', () => {
+    for (let probe = 0; probe < 40; probe++) {
+      const state = freshState(`melee-miss-${probe}`);
+      const player = state.players['player-1']!;
+      const intruder = placeIntruder(state, 'ADULT', player.roomId);
+      const discardBefore = player.actionDeck.discard.length;
+
+      performMelee(state, 'player-1', intruder.id);
+
+      const melee = logEvents(state).find((event) => event.type === 'MELEE_ATTACKED');
+      if (melee?.type !== 'MELEE_ATTACKED' || melee.woundsDealt !== 0) {
+        continue;
+      }
+
+      expect(player.actionDeck.discard.length).toBe(discardBefore + 1);
+      expect(melee.seriousWoundDealt).toBe(1);
+      expect(player.seriousWounds.length).toBe(1);
+      expect(intruder.woundsCount).toBe(0);
+      expect(logEvents(state).some((event) => event.type === 'TOUGHNESS_CHECKED')).toBe(false);
+      return;
+    }
+
+    throw new Error('За 40 сидов не выпал ни один промах — сломан кубик Боя.');
+  });
+
+  it('иммунитет типа — тоже промах с Травмой, а не просто 0 Ран', () => {
+    for (let probe = 0; probe < 40; probe++) {
+      const state = freshState(`melee-immune-${probe}`);
+      const player = state.players['player-1']!;
+      const intruder = placeIntruder(state, 'QUEEN', player.roomId);
+
+      performMelee(state, 'player-1', intruder.id);
+
+      const melee = logEvents(state).find((event) => event.type === 'MELEE_ATTACKED');
+      if (melee?.type !== 'MELEE_ATTACKED' || melee.woundsDealt !== 0 || melee.dieFace === 'MISS') {
+        continue;
+      }
+
+      // Хвост или Силуэты по Королеве: грань не задела — персонаж травмирован.
+      expect(['TAIL', 'SILHOUETTES']).toContain(melee.dieFace);
+      expect(melee.seriousWoundDealt).toBe(1);
+      expect(player.seriousWounds.length).toBe(1);
+      expect(intruder.woundsCount).toBe(0);
+      return;
+    }
+
+    throw new Error('За 40 сидов не выпал иммунитет типа — сломан кубик Боя.');
+  });
+
+  it('попадание по Личинке убивает её без карты Стойкости', () => {
+    for (let probe = 0; probe < 40; probe++) {
+      const state = freshState(`melee-larva-${probe}`);
+      const player = state.players['player-1']!;
+      const intruder = placeIntruder(state, 'LARVA', player.roomId);
+
+      performMelee(state, 'player-1', intruder.id);
+
+      const melee = logEvents(state).find((event) => event.type === 'MELEE_ATTACKED');
+      if (melee?.type !== 'MELEE_ATTACKED' || melee.woundsDealt !== 1) {
+        continue;
+      }
+
+      expect(logEvents(state).some((event) => event.type === 'TOUGHNESS_CHECKED')).toBe(false);
+      expect(logEvents(state).some((event) => event.type === 'INTRUDER_KILLED')).toBe(true);
+      expect(state.intrudersPool.boardTokens).not.toContain(intruder);
+      return;
+    }
+
+    throw new Error('За 40 сидов не выпало ни одного попадания — сломан кубик Боя.');
+  });
+
+  it('без Заражения в запасах атака отклоняется до броска и журнала', () => {
+    const state = freshState('melee-no-contamination');
+    const player = state.players['player-1']!;
+    const intruder = placeIntruder(state, 'LARVA', player.roomId);
+    state.decks.contamination.drawPile = [];
+    state.decks.contamination.discard = [];
+    const logBefore = state.gameLog.length;
+    const drawsBefore = state.meta.rngDraws.combat;
+
+    expectEngineError(() => performMelee(state, 'player-1', intruder.id), 'NO_CONTAMINATION_LEFT');
+    expect(state.gameLog.length).toBe(logBefore);
+    expect(state.meta.rngDraws.combat).toBe(drawsBefore);
+  });
+
+  it('без Тяжёлых Травм в запасах промах отклоняется после записи события', () => {
+    for (let probe = 0; probe < 40; probe++) {
+      const state = freshState(`melee-no-wounds-${probe}`);
+      const player = state.players['player-1']!;
+      const intruder = placeIntruder(state, 'ADULT', player.roomId);
+      state.decks.seriousWounds.drawPile = [];
+      state.decks.seriousWounds.discard = [];
+      const discardBefore = player.actionDeck.discard.length;
+
+      try {
+        performMelee(state, 'player-1', intruder.id);
+      } catch (error) {
+        expect(error).toBeInstanceOf(EngineError);
+        expect((error as EngineError).code).toBe('NO_SERIOUS_WOUNDS_LEFT');
+        // Событие уже записано, Заражение уже взято: журнал честен.
+        expect(logEvents(state).some((event) => event.type === 'MELEE_ATTACKED')).toBe(true);
+        expect(player.actionDeck.discard.length).toBe(discardBefore + 1);
+        return;
+      }
+    }
+
+    throw new Error('За 40 сидов не выпал ни один промах — сломан кубик Боя.');
+  });
+
+  it('смертельная Травма: событие атаки идёт раньше гибели', () => {
+    for (let probe = 0; probe < 40; probe++) {
+      const state = freshState(`melee-death-${probe}`);
+      const player = state.players['player-1']!;
+      const intruder = placeIntruder(state, 'ADULT', player.roomId);
+      player.seriousWounds.push(...state.decks.seriousWounds.drawPile.splice(0, 3));
+
+      performMelee(state, 'player-1', intruder.id);
+
+      const events = logEvents(state);
+      const meleeIndex = events.findIndex((event) => event.type === 'MELEE_ATTACKED');
+      const diedIndex = events.findIndex((event) => event.type === 'PLAYER_DIED');
+      if (diedIndex === -1) {
+        continue;
+      }
+
+      expect(player.isDead).toBe(true);
+      expect(meleeIndex).toBeGreaterThanOrEqual(0);
+      expect(meleeIndex).toBeLessThan(diedIndex);
+      const melee = events[meleeIndex]!;
+      if (melee.type !== 'MELEE_ATTACKED') throw new Error('Ожидалось событие MELEE_ATTACKED.');
+      expect(melee.seriousWoundDealt).toBe(1);
+      expect(intruder.woundsCount).toBe(0);
+      return;
+    }
+
+    throw new Error('За 40 сидов персонаж ни разу не погиб — сломана Травма.');
+  });
+});
+
+describe('ACTION_MELEE через GameEngine', () => {
+  it('оплачивает 1 карту, атакует и засчитывает действие раунда', () => {
+    const engine = new GameEngine();
+    const state = freshState('melee-action-flow');
+    const player = state.players['player-1']!;
+    const intruder = placeIntruder(state, 'ADULT', player.roomId);
+    const handBefore = player.actionDeck.hand.length;
+    const payCardId = player.actionDeck.hand[0]!.id;
+
+    const next = engine.processAction(state, {
+      type: 'ACTION_MELEE',
+      payload: { targetIntruderId: intruder.id, discardCardIds: [payCardId] },
+    });
+
+    expect(next.players['player-1']!.actionDeck.hand.length).toBe(handBefore - 1);
+    expect(next.players['player-1']!.actionsPerformedThisRound).toBe(1);
+    expect(logEvents(next).some((event) => event.type === 'MELEE_ATTACKED')).toBe(true);
+  });
+
+  it('проверяет условия до оплаты: неверная цель важнее пустой оплаты', () => {
+    const engine = new GameEngine();
+    const state = freshState('melee-action-order');
+
+    expectEngineError(
+      () =>
+        engine.processAction(state, {
+          type: 'ACTION_MELEE',
+          payload: { targetIntruderId: 'intruder-nope', discardCardIds: [] },
+        }),
+      'UNKNOWN_INTRUDER',
+    );
+  });
+
+  it('без карты оплаты отклоняется ошибкой оплаты', () => {
+    const engine = new GameEngine();
+    const state = freshState('melee-action-payment');
+    const player = state.players['player-1']!;
+    const intruder = placeIntruder(state, 'ADULT', player.roomId);
+
+    expectEngineError(
+      () =>
+        engine.processAction(state, {
+          type: 'ACTION_MELEE',
+          payload: { targetIntruderId: intruder.id, discardCardIds: [] },
+        }),
+      'INSUFFICIENT_ACTION_CARDS',
+    );
+  });
+});
+
+describe('killIntruder: Останки на полу отсека', () => {
+  it('выкладывает Останки с типом погибшего Чужого', () => {
+    const state = freshState('remains-adult');
+    const player = state.players['player-1']!;
+    const intruder = placeIntruder(state, 'ADULT', player.roomId);
+
+    killIntruder(state, intruder, 'player-1');
+
+    const remains = state.ship.rooms[player.roomId]!.objects.filter((object) => object.kind === 'INTRUDER_REMAINS');
+    expect(remains).toHaveLength(1);
+    expect(remains[0]).toMatchObject({ kind: 'INTRUDER_REMAINS', intruderType: 'ADULT' });
+  });
+
+  it('Личинка Останков не оставляет', () => {
+    const state = freshState('remains-larva');
+    const player = state.players['player-1']!;
+    const intruder = placeIntruder(state, 'LARVA', player.roomId);
+    const objectsBefore = state.ship.rooms[player.roomId]!.objects.length;
+
+    killIntruder(state, intruder, 'player-1');
+
+    expect(state.ship.rooms[player.roomId]!.objects.length).toBe(objectsBefore);
+  });
+
+  it('Королева оставляет Останки, но не Яйцо: книга такого правила не знает', () => {
+    const state = freshState('remains-queen');
+    const player = state.players['player-1']!;
+    const intruder = placeIntruder(state, 'QUEEN', player.roomId);
+
+    killIntruder(state, intruder, 'player-1');
+
+    const objects = state.ship.rooms[player.roomId]!.objects;
+    expect(objects.filter((object) => object.kind === 'INTRUDER_REMAINS')).toHaveLength(1);
+    expect(objects.some((object) => object.kind === 'EGG')).toBe(false);
+  });
+
+  it('повторная гибель того же жетона даёт Останки с уникальным id', () => {
+    const state = freshState('remains-respawn');
+    const player = state.players['player-1']!;
+
+    // Жетон возвращается в игру и гибнет снова: id сущности повторяется.
+    killIntruder(state, placeIntruder(state, 'ADULT', player.roomId), 'player-1');
+    killIntruder(state, placeIntruder(state, 'ADULT', player.roomId), 'player-1');
+
+    const remains = state.ship.rooms[player.roomId]!.objects.filter((object) => object.kind === 'INTRUDER_REMAINS');
+    expect(remains).toHaveLength(2);
+    expect(new Set(remains.map((object) => object.id)).size).toBe(2);
+  });
+});
+
+function soldierState(seed = 'burst-test'): GameState {
+  return createInitialGameState(seed, { playerCount: 1, chosenCharacterClass: 'SOLDIER' });
+}
+
+describe('performBurstFire: «Стрельба очередью» (Солдат)', () => {
+  it('сбрасывает весь боезапас и добавляет +1 Рану за каждые 2 ед. поверх кубика', () => {
+    const state = soldierState();
+    const intruder = placeIntruder(state, 'ADULT', 11);
+
+    const { ammoSpent, bonusWounds } = performBurstFire(state, 'player-1', intruder.id, 0);
+    const slot = state.players['player-1']!.handSlots[0]!;
+
+    expect(ammoSpent).toBe(5);
+    expect(bonusWounds).toBe(2);
+    expect(slot.source === 'ITEM' ? slot.card.ammo : -1).toBe(0);
+
+    const shot = logEvents(state).find((event) => event.type === 'SHOT_FIRED');
+
+    expect(shot?.type).toBe('SHOT_FIRED');
+
+    if (shot?.type === 'SHOT_FIRED') {
+      expect(shot.woundsDealt).toBe(combatDieWoundsForShoot(shot.dieFace, 'ADULT', 'Боевая винтовка') + 2);
+    }
+  });
+
+  it('убивает Личинку при любом броске: бонус гарантирует Раны', () => {
+    const state = soldierState('burst-larva');
+    const larva = placeIntruder(state, 'LARVA', 11);
+
+    performBurstFire(state, 'player-1', larva.id, 0);
+
+    expect(state.intrudersPool.deadTokens.some((token) => token.id === larva.token.id)).toBe(true);
+    expect(state.ship.rooms[11]!.objects.some((object) => object.kind === 'INTRUDER_REMAINS')).toBe(false);
+  });
+
+  it('требует Боевую Винтовку, а не любое оружие', () => {
+    const state = createInitialGameState('burst-no-rifle', { playerCount: 1, chosenCharacterClass: 'SCOUT' });
+    const intruder = placeIntruder(state, 'ADULT', 11);
+
+    expectEngineError(() => performBurstFire(state, 'player-1', intruder.id, 0), 'BURST_FIRE_REQUIRES_RIFLE');
+  });
+
+  it('без патронов стрелять нечем: проверка раньше сброса', () => {
+    const state = soldierState('burst-empty');
+    const slot = state.players['player-1']!.handSlots[0]!;
+
+    if (slot.source === 'ITEM') slot.card.ammo = 0;
+
+    const intruder = placeIntruder(state, 'ADULT', 11);
+
+    expectEngineError(() => performBurstFire(state, 'player-1', intruder.id, 0), 'SHOOT_NO_AMMO');
+  });
+});
diff --git a/packages/shared/src/logic/combat.ts b/packages/shared/src/logic/combat.ts
new file mode 100644
index 0000000..188a42c
--- /dev/null
+++ b/packages/shared/src/logic/combat.ts
@@ -0,0 +1,463 @@
+import { COMBAT_DIE_FACES, type CombatDieFace } from '../data/combatDie.js';
+import type { ItemCard } from '../types/cards.js';
+import type { IntruderEntity, IntruderType, PlayerState } from '../types/entities.js';
+import type { ToughnessCheckCardSnapshot } from '../types/log.js';
+import type { GameState } from '../types/state.js';
+import { drawFromStream } from '../utils/rng.js';
+import { dealSeriousWounds, drawIntruderAttackCard, giveContaminationCards, removeIntruder } from './contact.js';
+import { EngineError, findAdjacentOpenRoomIds } from './fsm.js';
+import { appendGameLog } from './gameLog.js';
+
+/**
+ * Пистолет и Револьвер: выброшенные [2 Раны] считаются 1 Раной (текст карт оружия, стр. 22).
+ * Особые свойства сопоставляются по названию — как эффекты карт Атак в `contact.ts`.
+ */
+const TWO_WOUNDS_COUNT_AS_ONE_WEAPONS = new Set(['Револьвер', 'Пистолет']);
+
+/** Обрез: выброшенный символ «Силуэты» считается промахом (текст карты оружия, стр. 22). */
+const SILHOUETTES_MISS_WEAPONS = new Set(['Обрез']);
+
+/**
+ * Дробовик и Боевая винтовка: каждый раз, когда нанесена хотя бы 1 Рана,
+ * нанесите 1 дополнительную Рану (текст карт оружия, стр. 22).
+ */
+const BONUS_WOUND_WEAPONS = new Set(['Дробовик', 'Боевая винтовка']);
+
+/**
+ * Огнемёт: всегда наносит как минимум 1 Рану, кроме Промаха (текст карты оружия).
+ * Второе свойство («при [2 Ранах] поместите маркер Пожара») — механика огня,
+ * этап 0.5.0: бросок [2 Раны] из Огнемёта отклоняется явной ошибкой.
+ */
+const MINIMUM_WOUND_WEAPONS = new Set(['Огнемёт']);
+
+/**
+ * Грань кубика Боя → число Ран при Стрельбе (стр. 18) с учётом типа цели
+ * и особых свойств оружия (стр. 22). Чистая функция — одно место для правила,
+ * которым пользуются и движок, и тесты.
+ */
+export function combatDieWoundsForShoot(face: CombatDieFace, targetType: IntruderType, weaponName: string): number {
+  if (face === 'MISS') {
+    return 0;
+  }
+
+  if (face === 'SILHOUETTES' && SILHOUETTES_MISS_WEAPONS.has(weaponName)) {
+    return 0;
+  }
+
+  let wounds: number;
+
+  if (face === 'TWO_WOUNDS') {
+    wounds = TWO_WOUNDS_COUNT_AS_ONE_WEAPONS.has(weaponName) ? 1 : 2;
+  } else if (face === 'ONE_WOUND') {
+    wounds = 1;
+  } else if (face === 'TAIL') {
+    wounds = targetType === 'LARVA' || targetType === 'CREEPER' ? 1 : 0;
+  } else {
+    // SILHOUETTES: ранит всех, кроме Трутня и Королевы.
+    wounds = targetType === 'BREEDER' || targetType === 'QUEEN' ? 0 : 1;
+  }
+
+  if (wounds === 0 && MINIMUM_WOUND_WEAPONS.has(weaponName)) {
+    wounds = 1;
+  }
+
+  if (wounds >= 1 && BONUS_WOUND_WEAPONS.has(weaponName)) {
+    wounds += 1;
+  }
+
+  return wounds;
+}
+
+/** Проверенные условия выстрела: живые ссылки на состояние для `performShoot`. */
+export interface ShootConditions {
+  player: PlayerState;
+  intruder: IntruderEntity;
+  weaponCard: ItemCard;
+}
+
+/**
+ * Условия выстрела (стр. 18): цель — Чужой в том же отсеке, оружие — в руке
+ * с ≥1 Боезапаса. Вызывается из fsm до оплаты, затем повторно внутри
+ * `performShoot`, чтобы прямые вызовы тоже были безопасны.
+ */
+export function validateShootConditions(
+  state: GameState,
+  playerId: string,
+  targetIntruderId: string,
+  weaponSlotIndex: number,
+): ShootConditions {
+  const player = state.players[playerId];
+
+  if (!player) {
+    throw new EngineError('UNKNOWN_PLAYER', `Стрельба от неизвестного персонажа: ${playerId}.`);
+  }
+
+  const intruder = state.intrudersPool.boardTokens.find((candidate) => candidate.id === targetIntruderId);
+
+  if (!intruder) {
+    throw new EngineError('UNKNOWN_INTRUDER', `Стрельба по Чужому, которого нет на поле: ${targetIntruderId}.`);
+  }
+
+  if (intruder.roomId !== player.roomId) {
+    throw new EngineError(
+      'SHOOT_TARGET_NOT_IN_ROOM',
+      `Стрельба возможна только по Чужому в том же отсеке: цель в отсеке ${intruder.roomId}, стрелок — в ${player.roomId} (стр. 18).`,
+    );
+  }
+
+  const slot = player.handSlots[weaponSlotIndex];
+  const weaponCard = slot?.source === 'ITEM' ? slot.card : undefined;
+
+  if (!weaponCard || weaponCard.isWeapon !== true) {
+    throw new EngineError(
+      'SHOOT_INVALID_WEAPON',
+      `В слоте руки ${weaponSlotIndex} нет Оружия: Стрельба требует Оружие в руке (стр. 18).`,
+    );
+  }
+
+  if (weaponCard.ammo === null) {
+    throw new EngineError(
+      'SHOOT_INVALID_WEAPON',
+      `«${weaponCard.name}» — не огнестрельное Оружие: стрелять из него нельзя.`,
+    );
+  }
+
+  if (weaponCard.ammo < 1) {
+    throw new EngineError('SHOOT_NO_AMMO', `В оружии «${weaponCard.name}» не осталось Боезапаса.`);
+  }
+
+  return { player, intruder, weaponCard };
+}
+
+/** Индекс из потока `combat`: бросок кубика и выбор направления отступления (см. `rollNoiseDie` в fsm). */
+function drawCombatIndex(state: GameState, length: number): number {
+  const drawIndex = state.meta.rngDraws.combat;
+  const value = drawFromStream(state.meta.seed, 'combat', drawIndex);
+
+  state.meta.rngDraws.combat = drawIndex + 1;
+
+  return Math.min(length - 1, Math.floor(value * length));
+}
+
+export function drawCombatFace(state: GameState): CombatDieFace {
+  return COMBAT_DIE_FACES[drawCombatIndex(state, COMBAT_DIE_FACES.length)]!;
+}
+
+/**
+ * Выстрел целиком (стр. 18): сброс 1 Боезапаса, бросок кубика Боя,
+ * нанесение Ран и проверка Стойкости. Оплату картой Действия выполняет
+ * вызывающая ветка fsm до этого вызова.
+ */
+export function performShoot(
+  state: GameState,
+  playerId: string,
+  targetIntruderId: string,
+  weaponSlotIndex: number,
+): void {
+  const conditions = validateShootConditions(state, playerId, targetIntruderId, weaponSlotIndex);
+  const face = drawCombatFace(state);
+
+  applyShootFace(state, playerId, conditions, face);
+}
+
+/**
+ * Огнемёт при [2 Ранах] помещает маркер Пожара в отсек — механика огня
+ * (этап 0.5.0). Проверка вынесена отдельно: «Прицельный огонь» обязан
+ * отклонить такой выстрел до решения о перебросе, а не внутри него.
+ */
+export function assertShootFaceAllowed(weaponCard: ItemCard, face: CombatDieFace): void {
+  if (face === 'TWO_WOUNDS' && MINIMUM_WOUND_WEAPONS.has(weaponCard.name)) {
+    throw new EngineError(
+      'SHOOT_FIRE_NOT_IMPLEMENTED',
+      'Огнемёт при [2 Ранах] помещает маркер Пожара в отсек — механика огня (этап 0.5.0: урон от огня резолвится в Фазе Событий).',
+    );
+  }
+}
+
+/**
+ * Применение выпавшей грани: сброс Боезапаса, Раны (+ бонус классовых карт),
+ * запись в журнал и проверка Стойкости. Отдельно от броска: «Прицельный
+ * огонь» выбирает грань решением игрока, «Стрельба очередью» добавляет бонус.
+ */
+export function applyShootFace(
+  state: GameState,
+  playerId: string,
+  conditions: ShootConditions,
+  face: CombatDieFace,
+  bonusWounds = 0,
+  ammoCost = 1,
+): void {
+  const { player, intruder, weaponCard } = conditions;
+
+  assertShootFaceAllowed(weaponCard, face);
+
+  weaponCard.ammo = weaponCard.ammo! - ammoCost;
+
+  const woundsDealt = combatDieWoundsForShoot(face, intruder.type, weaponCard.name) + bonusWounds;
+
+  appendGameLog(state, {
+    type: 'SHOT_FIRED',
+    playerId,
+    roomId: player.roomId,
+    intruderId: intruder.id,
+    intruderType: intruder.type,
+    weaponId: weaponCard.id,
+    weaponName: weaponCard.name,
+    dieFace: face,
+    woundsDealt,
+  });
+
+  if (woundsDealt > 0) {
+    resolveIntruderWounds(state, intruder, playerId, woundsDealt);
+  }
+}
+
+/** id Боевой Винтовки Солдата — единственного оружия «Стрельбы очередью». */
+const ASSAULT_RIFLE_ITEM_ID = 'WEAPON_SOLDIER_ASSAULT_RIFLE';
+
+/**
+ * «Стрельба очередью» (Солдат): выстрел из Боевой Винтовки со сбросом ВСЕГО
+ * Боезапаса вместо 1 ед.: +1 доп. Рана за каждые 2 потраченные ед. поверх
+ * Ран кубика. Оплата — сама карта (playCost 0), её выполняет ветка fsm.
+ */
+export function performBurstFire(
+  state: GameState,
+  playerId: string,
+  targetIntruderId: string,
+  weaponSlotIndex: number,
+): { ammoSpent: number; bonusWounds: number } {
+  const conditions = validateShootConditions(state, playerId, targetIntruderId, weaponSlotIndex);
+
+  if (conditions.weaponCard.id !== ASSAULT_RIFLE_ITEM_ID) {
+    throw new EngineError(
+      'BURST_FIRE_REQUIRES_RIFLE',
+      `«Стрельба очередью» требует Боевую Винтовку в руках, а в слоте ${weaponSlotIndex} — «${conditions.weaponCard.name}».`,
+    );
+  }
+
+  const ammoSpent = conditions.weaponCard.ammo!;
+  const bonusWounds = Math.floor(ammoSpent / 2);
+
+  conditions.weaponCard.ammo = 0;
+
+  applyShootFace(state, playerId, conditions, drawCombatFace(state), bonusWounds, 0);
+
+  return { ammoSpent, bonusWounds };
+}
+
+/**
+ * Раны Чужого и проверка Стойкости (стр. 18): Личинка погибает от любой Раны
+ * без карты; Крипер и Взрослая тянут 1 карту, Трутень и Королева — 2 карты
+ * (Стойкость суммируется). Стрелка Отступления хотя бы на одной карте
+ * перекрывает смерть: Чужой сбегает вместо гибели. Общая для Стрельбы
+ * (Шаг 4) и Рукопашной (Шаг 5).
+ */
+export function resolveIntruderWounds(
+  state: GameState,
+  intruder: IntruderEntity,
+  playerId: string,
+  woundsDealt: number,
+): void {
+  intruder.woundsCount += woundsDealt;
+
+  if (intruder.type === 'LARVA') {
+    killIntruder(state, intruder, playerId);
+    return;
+  }
+
+  const cardsToDraw = intruder.type === 'BREEDER' || intruder.type === 'QUEEN' ? 2 : 1;
+  const attackCards: ToughnessCheckCardSnapshot[] = [];
+
+  for (let draw = 0; draw < cardsToDraw; draw++) {
+    const card = drawIntruderAttackCard(state);
+    state.decks.intruderAttacks.discard.push(card);
+    attackCards.push({ id: card.id, name: card.name, toughness: card.toughness, hasRetreat: card.hasRetreat });
+  }
+
+  const retreated = attackCards.some((card) => card.hasRetreat);
+  const toughnessTotal = attackCards.reduce((sum, card) => sum + card.toughness, 0);
+  const killed = !retreated && intruder.woundsCount >= toughnessTotal;
+
+  appendGameLog(state, {
+    type: 'TOUGHNESS_CHECKED',
+    playerId,
+    roomId: intruder.roomId,
+    intruderId: intruder.id,
+    intruderType: intruder.type,
+    attackCards,
+    woundsTotal: intruder.woundsCount,
+    killed,
+    retreated,
+  });
+
+  if (retreated) {
+    retreatIntruder(state, intruder, playerId);
+  } else if (killed) {
+    killIntruder(state, intruder, playerId);
+  }
+}
+
+/**
+ * Гибель Чужого: миниатюра снимается с поля, жетон уходит в `deadTokens`,
+ * на пол отсека выкладываются Останки — от любого Чужого, кроме Личинки
+ * (стр. 20, 22). Яйца за Королеву книга не даёт (в коробке всего 5 жетонов
+ * Яиц, все — для Улья): пункт плана про яйцо исправлен по книге.
+ */
+export function killIntruder(state: GameState, intruder: IntruderEntity, playerId: string): void {
+  const roomId = intruder.roomId;
+
+  removeIntruder(state, intruder);
+  state.intrudersPool.deadTokens.push(intruder.token);
+
+  appendGameLog(state, {
+    type: 'INTRUDER_KILLED',
+    playerId,
+    roomId,
+    intruderId: intruder.id,
+    intruderType: intruder.type,
+  });
+
+  if (intruder.type !== 'LARVA') {
+    // Счётчик смертей в id: жетон может вернуться в игру и погибнуть снова —
+    // id Останков обязаны оставаться уникальными детерминированно.
+    const remainsId = `remains-${intruder.id}-${state.intrudersPool.deadTokens.length}`;
+    state.ship.rooms[roomId]?.objects.push({
+      id: remainsId,
+      kind: 'INTRUDER_REMAINS',
+      intruderType: intruder.type,
+    });
+  }
+}
+
+/**
+ * Отступление Чужого (стр. 18).
+ *
+ * ПРОМЕЖУТОЧНОЕ ПРАВИЛО Шага 4: по книге направление отступления задаёт
+ * номер Коридора на вытянутой карте События, но колода Событий появится
+ * только на этапе 0.5.0. До тех пор Чужой уходит в соседний отсек через
+ * открытую Дверь, а направление выбирает поток `combat` генератора —
+ * непредсказуемо для игрока и воспроизводимо по сиду партии. Вентиляция
+ * как пункт назначения исключена: представления «Чужой в Технических
+ * Коридорах» нет до фазы Событий. Если открытых дверей нет, Чужой остаётся
+ * на месте, но выживает: стрелка Отступления уже перекрыла смерть —
+ * журнал показывает `TOUGHNESS_CHECKED` с `retreated` без `INTRUDER_RETREATED`.
+ */
+export function retreatIntruder(state: GameState, intruder: IntruderEntity, playerId: string): void {
+  const fromRoomId = intruder.roomId;
+  const destinations = findAdjacentOpenRoomIds(state, fromRoomId).sort((a, b) => a - b);
+
+  if (destinations.length === 0) {
+    return;
+  }
+
+  const toRoomId = destinations[drawCombatIndex(state, destinations.length)]!;
+
+  intruder.roomId = toRoomId;
+  state.ship.rooms[fromRoomId]!.occupantIntruderIds = state.ship.rooms[fromRoomId]!.occupantIntruderIds.filter(
+    (id) => id !== intruder.id,
+  );
+  state.ship.rooms[toRoomId]!.occupantIntruderIds.push(intruder.id);
+
+  appendGameLog(state, {
+    type: 'INTRUDER_RETREATED',
+    playerId,
+    intruderId: intruder.id,
+    intruderType: intruder.type,
+    fromRoomId,
+    toRoomId,
+  });
+}
+
+/**
+ * Грань кубика Боя → число Ран при Рукопашной Атаке (стр. 19). Отличия от
+ * стрельбы: [++] наносит лишь 1 Рану, а иммунитет типа — это промах
+ * (0 Ран = промах = 1 Тяжёлая Травма атакующему, см. `performMelee`).
+ */
+export function combatDieWoundsForMelee(face: CombatDieFace, targetType: IntruderType): number {
+  if (face === 'MISS') {
+    return 0;
+  }
+
+  if (face === 'TAIL') {
+    return targetType === 'LARVA' || targetType === 'CREEPER' ? 1 : 0;
+  }
+
+  if (face === 'SILHOUETTES') {
+    return targetType === 'BREEDER' || targetType === 'QUEEN' ? 0 : 1;
+  }
+
+  // [+] и [++] наносят 1 Рану любому Чужому.
+  return 1;
+}
+
+/** Проверенные условия рукопашной: живые ссылки на состояние для `performMelee`. */
+export interface MeleeConditions {
+  player: PlayerState;
+  intruder: IntruderEntity;
+}
+
+/**
+ * Условия Рукопашной Атаки (стр. 19): цель — Чужой в том же отсеке.
+ * Оружие и патроны не требуются. Вызывается из fsm до оплаты, затем повторно
+ * внутри `performMelee`, чтобы прямые вызовы тоже были безопасны.
+ */
+export function validateMeleeConditions(state: GameState, playerId: string, targetIntruderId: string): MeleeConditions {
+  const player = state.players[playerId];
+
+  if (!player) {
+    throw new EngineError('UNKNOWN_PLAYER', `Рукопашная атака от неизвестного персонажа: ${playerId}.`);
+  }
+
+  const intruder = state.intrudersPool.boardTokens.find((candidate) => candidate.id === targetIntruderId);
+
+  if (!intruder) {
+    throw new EngineError('UNKNOWN_INTRUDER', `Рукопашная атака по Чужому, которого нет на поле: ${targetIntruderId}.`);
+  }
+
+  if (intruder.roomId !== player.roomId) {
+    throw new EngineError(
+      'MELEE_TARGET_NOT_IN_ROOM',
+      `Рукопашная Атака возможна только по Чужому в том же отсеке: цель в отсеке ${intruder.roomId}, атакующий — в ${player.roomId} (стр. 19).`,
+    );
+  }
+
+  return { player, intruder };
+}
+
+/**
+ * Рукопашная Атака целиком (стр. 19): 1 Заражение в сброс, бросок кубика Боя,
+ * промах — 1 Тяжёлая Травма атакующему, попадание — Раны и проверка Стойкости
+ * (общая со стрельбой). Оплату картой Действия выполняет вызывающая ветка fsm
+ * до этого вызова.
+ *
+ * Событие пишется до разбора последствий, как `SHOT_FIRED`: исход детерминирован
+ * (Заражение — всегда, Травма — всегда при промахе). Если Травма оказывается
+ * смертельной, следом идёт `PLAYER_DIED` — порядок повествования сохраняется.
+ */
+export function performMelee(state: GameState, playerId: string, targetIntruderId: string): void {
+  const { player, intruder } = validateMeleeConditions(state, playerId, targetIntruderId);
+
+  giveContaminationCards(state, playerId, 1);
+
+  const face = drawCombatFace(state);
+  const woundsDealt = combatDieWoundsForMelee(face, intruder.type);
+  const missed = woundsDealt === 0;
+
+  appendGameLog(state, {
+    type: 'MELEE_ATTACKED',
+    playerId,
+    roomId: player.roomId,
+    intruderId: intruder.id,
+    intruderType: intruder.type,
+    dieFace: face,
+    woundsDealt,
+    contaminationDealt: 1,
+    seriousWoundDealt: missed ? 1 : 0,
+  });
+
+  if (missed) {
+    dealSeriousWounds(state, playerId, 1);
+  } else {
+    resolveIntruderWounds(state, intruder, playerId, woundsDealt);
+  }
+}
diff --git a/packages/shared/src/logic/contact.test.ts b/packages/shared/src/logic/contact.test.ts
new file mode 100644
index 0000000..e9026be
--- /dev/null
+++ b/packages/shared/src/logic/contact.test.ts
@@ -0,0 +1,856 @@
+import { describe, expect, it } from 'vitest';
+
+import type { IntruderEntity, IntruderToken, IntruderType } from '../types/entities.js';
+import type { RoomId } from '../types/rooms.js';
+import type { GameState } from '../types/state.js';
+import type { EngineErrorCode } from './fsm.js';
+import { drainInterrupts, EngineError, GameEngine } from './fsm.js';
+import { createInitialGameState } from './setup.js';
+import {
+  dealLightWounds,
+  dealSeriousWounds,
+  drawIntruderAttackCard,
+  giveContaminationCards,
+  killPlayer,
+  queueContact,
+  resolveContactInterrupt,
+  resolveSurpriseAttackInterrupt,
+} from './contact.js';
+
+const SEED = 'contact-test';
+
+function freshState(playerCount = 1): GameState {
+  return createInitialGameState(SEED, { playerCount });
+}
+
+function expectEngineError(run: () => unknown, code: EngineErrorCode): void {
+  try {
+    run();
+  } catch (error) {
+    expect(error).toBeInstanceOf(EngineError);
+    expect((error as EngineError).code).toBe(code);
+    return;
+  }
+
+  throw new Error(`Ожидалась ошибка движка с кодом ${code}, но действие прошло без ошибки.`);
+}
+
+function placePlayer(state: GameState, playerId: string, roomId: RoomId): void {
+  const player = state.players[playerId]!;
+
+  for (const room of Object.values(state.ship.rooms)) {
+    room.occupantPlayerIds = room.occupantPlayerIds.filter((id) => id !== playerId);
+  }
+
+  state.ship.rooms[roomId]!.occupantPlayerIds.push(playerId);
+  player.roomId = roomId;
+}
+
+function forceBagTop(state: GameState, token: IntruderToken): void {
+  state.intrudersPool.bag.unshift(token);
+}
+
+function forceAttackTop(state: GameState, name: string): void {
+  const pile = state.decks.intruderAttacks.drawPile;
+  const index = pile.findIndex((card) => card.name === name);
+
+  if (index === -1) throw new Error(`В колоде Атак Чужих нет карты «${name}».`);
+
+  const [card] = pile.splice(index, 1);
+
+  pile.unshift(card!);
+}
+
+function spawnIntruder(
+  state: GameState,
+  roomId: RoomId,
+  type: IntruderType,
+  tokenId: string,
+  escapeNumber = 1,
+): IntruderEntity {
+  const token: IntruderToken = { id: tokenId, type, escapeNumber };
+  const entity: IntruderEntity = { id: token.id, type, roomId, woundsCount: 0, token };
+
+  state.intrudersPool.boardTokens.push(entity);
+  state.ship.rooms[roomId]!.occupantIntruderIds.push(entity.id);
+
+  return entity;
+}
+
+function woundSerious(state: GameState, playerId: string, count: number): void {
+  const player = state.players[playerId]!;
+
+  for (let dealt = 0; dealt < count; dealt++) {
+    player.seriousWounds.push(state.decks.seriousWounds.drawPile.shift()!);
+  }
+}
+
+function shrinkHand(state: GameState, playerId: string, keep: number): void {
+  const deck = state.players[playerId]!.actionDeck;
+
+  while (deck.hand.length > keep) deck.discard.push(deck.hand.pop()!);
+}
+
+function logTypes(state: GameState): string[] {
+  return state.gameLog.map((entry) => entry.event.type);
+}
+
+describe('Контакт: триггер и сброс Шума (стр. 15, 18)', () => {
+  it('кладёт прерывание Контакта в очередь вместо маркера', () => {
+    const state = freshState();
+
+    queueContact(state, 'player-1', 6);
+
+    expect(state.interruptQueue).toEqual([{ type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 6 }]);
+  });
+
+  it('сбрасывает Шум из всех Коридоров отсека и вентиляции (стр. 18, шаг 1)', () => {
+    const state = freshState();
+
+    placePlayer(state, 'player-1', 14);
+    state.ship.technicalCorridorNoise = true;
+
+    for (const corridor of Object.values(state.ship.corridors)) {
+      corridor.hasNoise = corridor.fromRoomId === 14 || corridor.toRoomId === 14;
+    }
+
+    forceBagTop(state, { id: 'test-adult-1', type: 'ADULT', escapeNumber: 1 });
+    resolveContactInterrupt(state, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 14 });
+
+    expect(
+      Object.values(state.ship.corridors).filter(
+        (corridor) => corridor.hasNoise && (corridor.fromRoomId === 14 || corridor.toRoomId === 14),
+      ),
+    ).toEqual([]);
+    expect(state.ship.technicalCorridorNoise).toBe(false);
+
+    const contact = state.gameLog.find((entry) => entry.event.type === 'CONTACT_OCCURRED');
+
+    expect(contact?.event.type).toBe('CONTACT_OCCURRED');
+
+    if (contact?.event.type === 'CONTACT_OCCURRED') {
+      expect(contact.event.clearedCorridorIds.length).toBeGreaterThan(0);
+      expect(contact.event.clearedTechnical).toBe(true);
+    }
+  });
+
+  it('отклоняет Контакт для неизвестного отсека и персонажа', () => {
+    expectEngineError(
+      () => resolveContactInterrupt(freshState(), { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 999 }),
+      'UNKNOWN_ROOM',
+    );
+    expectEngineError(
+      () => resolveContactInterrupt(freshState(), { type: 'CONTACT_INTERRUPT', playerId: 'ghost', roomId: 6 }),
+      'UNKNOWN_PLAYER',
+    );
+  });
+
+  it('отклоняет Контакт при пустом мешке явной ошибкой', () => {
+    const state = freshState();
+
+    state.intrudersPool.bag = [];
+    expectEngineError(
+      () => resolveContactInterrupt(state, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 6 }),
+      'INTRUDER_BAG_EMPTY',
+    );
+  });
+});
+
+describe('Контакт: появление Чужого и Внезапная атака (стр. 18)', () => {
+  it('ставит миниатюру в отсек с отложенным жетоном (стр. 18, шаги 2–3)', () => {
+    const state = freshState();
+
+    placePlayer(state, 'player-1', 6);
+    forceBagTop(state, { id: 'test-queen-1', type: 'QUEEN', escapeNumber: 1 });
+    resolveContactInterrupt(state, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 6 });
+
+    const entity = state.intrudersPool.boardTokens.find((candidate) => candidate.id === 'test-queen-1');
+
+    expect(entity).toMatchObject({ type: 'QUEEN', roomId: 6, woundsCount: 0 });
+    expect(entity?.token).toEqual({ id: 'test-queen-1', type: 'QUEEN', escapeNumber: 1 });
+    expect(state.ship.rooms[6]?.occupantIntruderIds).toContain('test-queen-1');
+  });
+
+  it('проверяет Внезапную атаку строгим сравнением карт руки с числом жетона (стр. 18, шаг 4)', () => {
+    const triggered = freshState();
+
+    shrinkHand(triggered, 'player-1', 3);
+    forceBagTop(triggered, { id: 'test-adult-1', type: 'ADULT', escapeNumber: 4 });
+    resolveContactInterrupt(triggered, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 6 });
+
+    expect(logTypes(triggered)).toContain('SURPRISE_ATTACK_TRIGGERED');
+    expect(triggered.interruptQueue).toEqual([
+      { type: 'SURPRISE_ATTACK_INTERRUPT', playerId: 'player-1', intruderId: 'test-adult-1' },
+    ]);
+
+    const equal = freshState();
+
+    shrinkHand(equal, 'player-1', 4);
+    forceBagTop(equal, { id: 'test-adult-1', type: 'ADULT', escapeNumber: 4 });
+    resolveContactInterrupt(equal, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 6 });
+
+    expect(logTypes(equal)).not.toContain('SURPRISE_ATTACK_TRIGGERED');
+    expect(equal.interruptQueue).toEqual([]);
+  });
+
+  it('помечает первый Контакт партии флагом для сброса Целей', () => {
+    const state = freshState();
+
+    forceBagTop(state, { id: 'test-adult-1', type: 'ADULT', escapeNumber: 1 });
+    resolveContactInterrupt(state, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 6 });
+    forceBagTop(state, { id: 'test-adult-2', type: 'ADULT', escapeNumber: 1 });
+    resolveContactInterrupt(state, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 7 });
+
+    const contacts = state.gameLog.filter((entry) => entry.event.type === 'CONTACT_OCCURRED');
+
+    expect(contacts).toHaveLength(2);
+    expect(contacts[0]?.event.type).toBe('CONTACT_OCCURRED');
+    expect(contacts[1]?.event.type).toBe('CONTACT_OCCURRED');
+
+    if (contacts[0]?.event.type === 'CONTACT_OCCURRED' && contacts[1]?.event.type === 'CONTACT_OCCURRED') {
+      expect(contacts[0].event.isFirstContact).toBe(true);
+      expect(contacts[1].event.isFirstContact).toBe(false);
+    }
+  });
+
+  it('воспроизводит Контакт по сиду без подтасовок мешка и колоды', () => {
+    const first = freshState();
+    const second = freshState();
+
+    resolveContactInterrupt(first, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 6 });
+    resolveContactInterrupt(second, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 6 });
+
+    expect(first).toEqual(second);
+  });
+});
+
+describe('Контакт: Пустой жетон (стр. 18)', () => {
+  it('возвращает жетон в мешок и шумит во все Коридоры без появления Чужого', () => {
+    const state = freshState();
+    const bagSize = state.intrudersPool.bag.length;
+    const blanksBefore = state.intrudersPool.bag.filter((token) => token.type === 'BLANK').length;
+    const leadingCount = Object.values(state.ship.corridors).filter(
+      (corridor) => corridor.fromRoomId === 6 || corridor.toRoomId === 6,
+    ).length;
+
+    forceBagTop(state, { id: 'blank', type: 'BLANK', escapeNumber: 0 });
+    resolveContactInterrupt(state, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 6 });
+
+    expect(state.intrudersPool.boardTokens).toEqual([]);
+    expect(state.intrudersPool.bag).toHaveLength(bagSize + 1);
+    expect(state.intrudersPool.bag.filter((token) => token.type === 'BLANK')).toHaveLength(blanksBefore + 1);
+    expect(
+      Object.values(state.ship.corridors).filter(
+        (corridor) => corridor.hasNoise && (corridor.fromRoomId === 6 || corridor.toRoomId === 6),
+      ),
+    ).toHaveLength(leadingCount);
+    expect(logTypes(state)).not.toContain('SURPRISE_ATTACK_TRIGGERED');
+    expect(state.interruptQueue).toEqual([]);
+  });
+
+  it('последний жетон в мешке добавляет Взрослую Особь из запаса', () => {
+    const state = freshState();
+    const supplyAdults = state.intrudersPool.supply.filter((token) => token.type === 'ADULT').length;
+
+    state.intrudersPool.bag = [{ id: 'blank', type: 'BLANK', escapeNumber: 0 }];
+    resolveContactInterrupt(state, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 6 });
+
+    expect(state.intrudersPool.bag.filter((token) => token.type === 'ADULT')).toHaveLength(1);
+    expect(state.intrudersPool.bag.filter((token) => token.type === 'BLANK')).toHaveLength(1);
+    expect(state.intrudersPool.supply.filter((token) => token.type === 'ADULT')).toHaveLength(supplyAdults - 1);
+  });
+
+  it('без Взрослых в запасе последний Пустой просто возвращается', () => {
+    const state = freshState();
+
+    state.intrudersPool.supply = state.intrudersPool.supply.filter((token) => token.type !== 'ADULT');
+    state.intrudersPool.bag = [{ id: 'blank', type: 'BLANK', escapeNumber: 0 }];
+    resolveContactInterrupt(state, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 6 });
+
+    expect(state.intrudersPool.bag).toEqual([{ id: 'blank', type: 'BLANK', escapeNumber: 0 }]);
+  });
+
+  it('Пустой срабатывает при ровно достаточном запасе: заняты все остальные Коридоры и вентиляция', () => {
+    const state = freshState();
+
+    for (const corridor of Object.values(state.ship.corridors)) {
+      corridor.hasNoise = corridor.fromRoomId !== 6 && corridor.toRoomId !== 6;
+    }
+
+    state.ship.technicalCorridorNoise = true;
+    forceBagTop(state, { id: 'blank', type: 'BLANK', escapeNumber: 0 });
+    resolveContactInterrupt(state, { type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 6 });
+
+    expect(
+      Object.values(state.ship.corridors).filter(
+        (corridor) => !corridor.hasNoise && (corridor.fromRoomId === 6 || corridor.toRoomId === 6),
+      ),
+    ).toEqual([]);
+  });
+});
+
+describe('Внезапная атака: промах и Личинка (стр. 18, 20)', () => {
+  it('атака проходит мимо без символа атакующего типа', () => {
+    const state = freshState();
+
+    placePlayer(state, 'player-1', 6);
+    const entity = spawnIntruder(state, 6, 'ADULT', 'test-adult-1');
+    forceAttackTop(state, 'Атака хвостом');
+    resolveSurpriseAttackInterrupt(state, {
+      type: 'SURPRISE_ATTACK_INTERRUPT',
+      playerId: 'player-1',
+      intruderId: entity.id,
+    });
+
+    const resolved = state.gameLog.find((entry) => entry.event.type === 'SURPRISE_ATTACK_RESOLVED');
+
+    expect(resolved?.event.type).toBe('SURPRISE_ATTACK_RESOLVED');
+
+    if (resolved?.event.type === 'SURPRISE_ATTACK_RESOLVED') {
+      expect(resolved.event.hit).toBe(false);
+      expect(resolved.event.outcome).toBe('MISSED');
+      expect(resolved.event.attackCardName).toBe('Атака хвостом');
+    }
+
+    expect(state.players['player-1']?.lightWounds).toBe(0);
+    expect(state.decks.intruderAttacks.discard).toHaveLength(1);
+  });
+
+  it('Личинка заражает без карты: уходит с поля на планшет и даёт Заражение', () => {
+    const state = freshState();
+
+    placePlayer(state, 'player-1', 6);
+    const entity = spawnIntruder(state, 6, 'LARVA', 'test-larva-1');
+    resolveSurpriseAttackInterrupt(state, {
+      type: 'SURPRISE_ATTACK_INTERRUPT',
+      playerId: 'player-1',
+      intruderId: entity.id,
+    });
+
+    expect(state.intrudersPool.boardTokens).toEqual([]);
+    expect(state.ship.rooms[6]?.occupantIntruderIds).toEqual([]);
+    expect(state.players['player-1']?.hasLarva).toBe(true);
+    expect(state.players['player-1']?.actionDeck.discard).toHaveLength(1);
+    expect(state.decks.intruderAttacks.drawPile).toHaveLength(20);
+    expect(state.decks.intruderAttacks.discard).toHaveLength(0);
+
+    const resolved = state.gameLog.find((entry) => entry.event.type === 'SURPRISE_ATTACK_RESOLVED');
+
+    if (resolved?.event.type === 'SURPRISE_ATTACK_RESOLVED') {
+      expect(resolved.event.outcome).toBe('LARVA_INFECTION');
+      expect(resolved.event.attackCardId).toBeNull();
+    } else {
+      throw new Error('Нет записи о разыгранной Внезапной атаке.');
+    }
+  });
+
+  it('отклоняет атаку Чужого, которого нет на поле, и неизвестную карту', () => {
+    expectEngineError(
+      () =>
+        resolveSurpriseAttackInterrupt(freshState(), {
+          type: 'SURPRISE_ATTACK_INTERRUPT',
+          playerId: 'player-1',
+          intruderId: 'ghost',
+        }),
+      'UNKNOWN_INTRUDER',
+    );
+
+    const state = freshState();
+
+    placePlayer(state, 'player-1', 6);
+    const entity = spawnIntruder(state, 6, 'ADULT', 'test-adult-1');
+
+    state.decks.intruderAttacks.drawPile.unshift({
+      id: 'UNKNOWN_ATTACK',
+      name: 'Неведомая жуть',
+      description: 'Карты с таким эффектом нет в коробке.',
+      toughness: 1,
+      hasRetreat: false,
+      attackerTypes: ['ADULT'],
+    });
+
+    expectEngineError(
+      () =>
+        resolveSurpriseAttackInterrupt(state, {
+          type: 'SURPRISE_ATTACK_INTERRUPT',
+          playerId: 'player-1',
+          intruderId: entity.id,
+        }),
+      'UNKNOWN_ATTACK_EFFECT',
+    );
+  });
+});
+
+describe('Внезапная атака: раны и смерть (стр. 20–21)', () => {
+  it('Царапина даёт Лёгкую Травму и Заражение', () => {
+    const state = freshState();
+
+    placePlayer(state, 'player-1', 6);
+    const entity = spawnIntruder(state, 6, 'ADULT', 'test-adult-1');
+    forceAttackTop(state, 'Царапина');
+    resolveSurpriseAttackInterrupt(state, {
+      type: 'SURPRISE_ATTACK_INTERRUPT',
+      playerId: 'player-1',
+      intruderId: entity.id,
+    });
+
+    expect(state.players['player-1']?.lightWounds).toBe(1);
+    expect(state.players['player-1']?.actionDeck.discard).toHaveLength(1);
+  });
+
+  it('Атака когтями даёт две Лёгкие Травмы и Заражение', () => {
+    const state = freshState();
+
+    placePlayer(state, 'player-1', 6);
+    const entity = spawnIntruder(state, 6, 'ADULT', 'test-adult-1');
+    forceAttackTop(state, 'Атака когтями');
+    resolveSurpriseAttackInterrupt(state, {
+      type: 'SURPRISE_ATTACK_INTERRUPT',
+      playerId: 'player-1',
+      intruderId: entity.id,
+    });
+
+    expect(state.players['player-1']?.lightWounds).toBe(2);
+    expect(state.players['player-1']?.actionDeck.discard).toHaveLength(1);
+  });
+
+  it('третья Лёгкая Травма сбрасывает счётчик и даёт Тяжёлую', () => {
+    const state = freshState();
+
+    state.players['player-1']!.lightWounds = 2;
+
+    const result = dealLightWounds(state, 'player-1', 1);
+
+    expect(result).toEqual({ died: false, lightDealt: 0, seriousDealt: 1 });
+    expect(state.players['player-1']?.lightWounds).toBe(0);
+    expect(state.players['player-1']?.seriousWounds).toHaveLength(1);
+    expect(state.decks.seriousWounds.drawPile).toHaveLength(15);
+  });
+
+  it('Укус при двух Тяжёлых убивает, при меньшем числе — ранит', () => {
+    const lethal = freshState();
+
+    placePlayer(lethal, 'player-1', 6);
+    const lethalEntity = spawnIntruder(lethal, 6, 'ADULT', 'test-adult-1');
+
+    woundSerious(lethal, 'player-1', 2);
+    forceAttackTop(lethal, 'Укус');
+    resolveSurpriseAttackInterrupt(lethal, {
+      type: 'SURPRISE_ATTACK_INTERRUPT',
+      playerId: 'player-1',
+      intruderId: lethalEntity.id,
+    });
+
+    expect(lethal.players['player-1']?.isDead).toBe(true);
+    expect(logTypes(lethal)).toContain('PLAYER_DIED');
+
+    const wounded = freshState();
+
+    placePlayer(wounded, 'player-1', 6);
+    const woundedEntity = spawnIntruder(wounded, 6, 'ADULT', 'test-adult-1');
+
+    woundSerious(wounded, 'player-1', 1);
+    forceAttackTop(wounded, 'Укус');
+    resolveSurpriseAttackInterrupt(wounded, {
+      type: 'SURPRISE_ATTACK_INTERRUPT',
+      playerId: 'player-1',
+      intruderId: woundedEntity.id,
+    });
+
+    expect(wounded.players['player-1']?.isDead).toBe(false);
+    expect(wounded.players['player-1']?.seriousWounds).toHaveLength(2);
+  });
+
+  it('Атака хвостом убивает при хотя бы одной Тяжёлой', () => {
+    const lethal = freshState();
+
+    placePlayer(lethal, 'player-1', 6);
+    const lethalEntity = spawnIntruder(lethal, 6, 'QUEEN', 'test-queen-1');
+
+    woundSerious(lethal, 'player-1', 1);
+    forceAttackTop(lethal, 'Атака хвостом');
+    resolveSurpriseAttackInterrupt(lethal, {
+      type: 'SURPRISE_ATTACK_INTERRUPT',
+      playerId: 'player-1',
+      intruderId: lethalEntity.id,
+    });
+
+    expect(lethal.players['player-1']?.isDead).toBe(true);
+
+    const wounded = freshState();
+
+    placePlayer(wounded, 'player-1', 6);
+    const woundedEntity = spawnIntruder(wounded, 6, 'QUEEN', 'test-queen-1');
+
+    forceAttackTop(wounded, 'Атака хвостом');
+    resolveSurpriseAttackInterrupt(wounded, {
+      type: 'SURPRISE_ATTACK_INTERRUPT',
+      playerId: 'player-1',
+      intruderId: woundedEntity.id,
+    });
+
+    expect(wounded.players['player-1']?.seriousWounds).toHaveLength(1);
+  });
+
+  it('четвёртая Травма при трёх Тяжёлых убивает немедленно', () => {
+    const light = freshState();
+
+    woundSerious(light, 'player-1', 3);
+
+    expect(dealLightWounds(light, 'player-1', 1).died).toBe(true);
+    expect(light.players['player-1']?.isDead).toBe(true);
+
+    const serious = freshState();
+
+    woundSerious(serious, 'player-1', 3);
+
+    expect(dealSeriousWounds(serious, 'player-1', 1).died).toBe(true);
+    expect(serious.players['player-1']?.isDead).toBe(true);
+  });
+
+  it('смерть убирает миниатюру, кладёт Труп и сбрасывает Тяжёлые Объекты', () => {
+    const state = freshState();
+    const player = state.players['player-1']!;
+
+    placePlayer(state, 'player-1', 6);
+    player.handSlots.push({ source: 'OBJECT', object: { id: 'test-egg-1', kind: 'EGG' } });
+    killPlayer(state, 'player-1', 'INTRUDER_ATTACK');
+
+    expect(player.isDead).toBe(true);
+    expect(player.handSlots).toEqual([]);
+    expect(state.ship.rooms[6]?.occupantPlayerIds).not.toContain('player-1');
+    expect(state.ship.rooms[6]?.objects).toContainEqual({
+      id: 'corpse-player-1',
+      kind: 'CORPSE',
+      characterClass: player.characterClass,
+    });
+    expect(state.ship.rooms[6]?.objects).toContainEqual({ id: 'test-egg-1', kind: 'EGG' });
+  });
+
+  it('Слизь даёт маркер и Заражение', () => {
+    const state = freshState();
+
+    placePlayer(state, 'player-1', 6);
+    const entity = spawnIntruder(state, 6, 'ADULT', 'test-adult-1');
+    forceAttackTop(state, 'Слизь');
+    resolveSurpriseAttackInterrupt(state, {
+      type: 'SURPRISE_ATTACK_INTERRUPT',
+      playerId: 'player-1',
+      intruderId: entity.id,
+    });
+
+    expect(state.players['player-1']?.hasSlime).toBe(true);
+    expect(state.players['player-1']?.actionDeck.discard).toHaveLength(1);
+  });
+});
+
+describe('Внезапная атака: особые эффекты карт', () => {
+  it('Трансформация меняет Крипера на Трутня из запаса', () => {
+    const state = freshState();
+    const supplyBreeders = state.intrudersPool.supply.filter((token) => token.type === 'BREEDER').length;
+
+    placePlayer(state, 'player-1', 6);
+    const entity = spawnIntruder(state, 6, 'CREEPER', 'test-creeper-1');
+    forceAttackTop(state, 'Трансформация');
+    resolveSurpriseAttackInterrupt(state, {
+      type: 'SURPRISE_ATTACK_INTERRUPT',
+      playerId: 'player-1',
+      intruderId: entity.id,
+    });
+
+    expect(state.intrudersPool.boardTokens.map((candidate) => candidate.type)).toEqual(['BREEDER']);
+    expect(state.intrudersPool.supply.filter((token) => token.type === 'BREEDER')).toHaveLength(supplyBreeders - 1);
+    expect(state.intrudersPool.supply.map((token) => token.id)).toContain('test-creeper-1');
+    expect(logTypes(state)).toContain('INTRUDER_TRANSFORMED');
+    expect(state.interruptQueue).toEqual([]);
+  });
+
+  it('Трансформация при пустой руке вызывает новую Внезапную атаку Трутня', () => {
+    const state = freshState();
+
+    placePlayer(state, 'player-1', 6);
+    const entity = spawnIntruder(state, 6, 'CREEPER', 'test-creeper-1');
+
+    shrinkHand(state, 'player-1', 0);
+    forceAttackTop(state, 'Трансформация');
+    resolveSurpriseAttackInterrupt(state, {
+      type: 'SURPRISE_ATTACK_INTERRUPT',
+      playerId: 'player-1',
+      intruderId: entity.id,
+    });
+
+    expect(state.interruptQueue).toHaveLength(1);
+    expect(state.interruptQueue[0]?.type).toBe('SURPRISE_ATTACK_INTERRUPT');
+    expect(logTypes(state).filter((type) => type === 'SURPRISE_ATTACK_TRIGGERED')).toHaveLength(1);
+
+    drainInterrupts(state);
+
+    expect(logTypes(state).filter((type) => type === 'SURPRISE_ATTACK_RESOLVED')).toHaveLength(2);
+    expect(state.interruptQueue).toEqual([]);
+  });
+
+  it('Трансформация без Трутней в запасе отклоняется явной ошибкой', () => {
+    const state = freshState();
+
+    state.intrudersPool.supply = state.intrudersPool.supply.filter((token) => token.type !== 'BREEDER');
+    placePlayer(state, 'player-1', 6);
+    const entity = spawnIntruder(state, 6, 'CREEPER', 'test-creeper-1');
+    forceAttackTop(state, 'Трансформация');
+
+    expectEngineError(
+      () =>
+        resolveSurpriseAttackInterrupt(state, {
+          type: 'SURPRISE_ATTACK_INTERRUPT',
+          playerId: 'player-1',
+          intruderId: entity.id,
+        }),
+      'NO_BREEDER_IN_SUPPLY',
+    );
+  });
+
+  it('Ярость убивает с двумя Тяжёлыми и ранит остальных в отсеке', () => {
+    const state = freshState(2);
+
+    placePlayer(state, 'player-1', 6);
+    placePlayer(state, 'player-2', 6);
+    woundSerious(state, 'player-2', 2);
+    const entity = spawnIntruder(state, 6, 'BREEDER', 'test-breeder-1');
+    forceAttackTop(state, 'Ярость');
+    resolveSurpriseAttackInterrupt(state, {
+      type: 'SURPRISE_ATTACK_INTERRUPT',
+      playerId: 'player-1',
+      intruderId: entity.id,
+    });
+
+    expect(state.players['player-1']?.isDead).toBe(false);
+    expect(state.players['player-1']?.seriousWounds).toHaveLength(1);
+    expect(state.players['player-2']?.isDead).toBe(true);
+  });
+
+  it('Зов приводит Чужого из мешка без Внезапной атаки', () => {
+    const state = freshState();
+
+    placePlayer(state, 'player-1', 6);
+    const entity = spawnIntruder(state, 6, 'QUEEN', 'test-queen-1');
+
+    forceBagTop(state, { id: 'test-adult-9', type: 'ADULT', escapeNumber: 4 });
+    shrinkHand(state, 'player-1', 0);
+    forceAttackTop(state, 'Зов');
+    resolveSurpriseAttackInterrupt(state, {
+      type: 'SURPRISE_ATTACK_INTERRUPT',
+      playerId: 'player-1',
+      intruderId: entity.id,
+    });
+
+    expect(state.intrudersPool.boardTokens.map((candidate) => candidate.id)).toContain('test-adult-9');
+    expect(logTypes(state)).toContain('INTRUDER_CALLED');
+    expect(logTypes(state)).not.toContain('SURPRISE_ATTACK_TRIGGERED');
+    expect(state.interruptQueue).toEqual([]);
+  });
+
+  it('Зов на Пустой жетон возвращает его в мешок без появления', () => {
+    const state = freshState();
+    const bagSize = state.intrudersPool.bag.length;
+
+    placePlayer(state, 'player-1', 6);
+    const entity = spawnIntruder(state, 6, 'QUEEN', 'test-queen-1');
+
+    forceBagTop(state, { id: 'blank', type: 'BLANK', escapeNumber: 0 });
+    forceAttackTop(state, 'Зов');
+    resolveSurpriseAttackInterrupt(state, {
+      type: 'SURPRISE_ATTACK_INTERRUPT',
+      playerId: 'player-1',
+      intruderId: entity.id,
+    });
+
+    expect(state.intrudersPool.bag).toHaveLength(bagSize + 1);
+    expect(state.intrudersPool.boardTokens).toHaveLength(1);
+  });
+});
+
+describe('Контакт: колоды, сбросы и смерть активного игрока', () => {
+  it('пустая колода Атак тасуется из сброса потоком combat', () => {
+    const first = freshState();
+    const second = freshState();
+
+    for (const state of [first, second]) {
+      const pile = state.decks.intruderAttacks;
+
+      pile.discard.push(...pile.drawPile.splice(0, pile.drawPile.length));
+    }
+
+    const firstCard = drawIntruderAttackCard(first);
+    const secondCard = drawIntruderAttackCard(second);
+
+    expect(firstCard.id).toBe(secondCard.id);
+    expect(first.meta.rngDraws.combat).toBe(19);
+    expect(first.decks.intruderAttacks.drawPile).toHaveLength(19);
+    expect(first.decks.intruderAttacks.discard).toHaveLength(0);
+  });
+
+  it('пустые колода и сброс Атак, Заражения и Травм отклоняются явной ошибкой', () => {
+    const attacks = freshState();
+
+    attacks.decks.intruderAttacks.drawPile = [];
+    attacks.decks.intruderAttacks.discard = [];
+    expectEngineError(() => drawIntruderAttackCard(attacks), 'NO_INTRUDER_ATTACKS_LEFT');
+
+    const contamination = freshState();
+
+    contamination.decks.contamination.drawPile = [];
+    contamination.decks.contamination.discard = [];
+    expectEngineError(() => giveContaminationCards(contamination, 'player-1', 1), 'NO_CONTAMINATION_LEFT');
+
+    const wounds = freshState();
+
+    wounds.decks.seriousWounds.drawPile = [];
+    wounds.decks.seriousWounds.discard = [];
+    expectEngineError(() => dealSeriousWounds(wounds, 'player-1', 1), 'NO_SERIOUS_WOUNDS_LEFT');
+  });
+
+  it('гибель активного игрока передаёт ход дальше, соло-гибель завершает партию', () => {
+    const engine = new GameEngine();
+
+    const duel = createInitialGameState('engine-test', { playerCount: 2 });
+
+    duel.ship.rooms[6]!.isExplored = false;
+    duel.ship.rooms[6]!.explorationEffect = null;
+    Object.values(duel.ship.corridors).find(
+      (corridor) =>
+        (corridor.fromRoomId === 6 || corridor.toRoomId === 6) &&
+        (corridor.fromRoomId === 6 ? corridor.fromNumbers : corridor.toNumbers).includes(3),
+    )!.hasNoise = true;
+    woundSerious(duel, 'player-1', 2);
+    shrinkHand(duel, 'player-1', 3);
+    forceBagTop(duel, { id: 'test-adult-1', type: 'ADULT', escapeNumber: 4 });
+    forceAttackTop(duel, 'Укус');
+
+    const afterDuel = engine.processAction(duel, {
+      type: 'ACTION_MOVE',
+      payload: { targetRoomId: 6, discardCardIds: [duel.players['player-1']!.actionDeck.hand[0]!.id] },
+    });
+
+    expect(afterDuel.players['player-1']?.isDead).toBe(true);
+    expect(afterDuel.players['player-1']?.hasPassed).toBe(true);
+    expect(afterDuel.meta.activePlayerId).toBe('player-2');
+    expect(afterDuel.meta.phase).toBe('PLAYER_PHASE');
+
+    const solo = createInitialGameState('engine-test');
+
+    solo.ship.rooms[6]!.isExplored = false;
+    solo.ship.rooms[6]!.explorationEffect = null;
+    Object.values(solo.ship.corridors).find(
+      (corridor) =>
+        (corridor.fromRoomId === 6 || corridor.toRoomId === 6) &&
+        (corridor.fromRoomId === 6 ? corridor.fromNumbers : corridor.toNumbers).includes(3),
+    )!.hasNoise = true;
+    woundSerious(solo, 'player-1', 2);
+    shrinkHand(solo, 'player-1', 3);
+    forceBagTop(solo, { id: 'test-adult-1', type: 'ADULT', escapeNumber: 4 });
+    forceAttackTop(solo, 'Укус');
+
+    const afterSolo = engine.processAction(solo, {
+      type: 'ACTION_MOVE',
+      payload: { targetRoomId: 6, discardCardIds: [solo.players['player-1']!.actionDeck.hand[0]!.id] },
+    });
+
+    expect(afterSolo.meta.phase).toBe('GAME_OVER');
+    expect(afterSolo.meta.gameOverReason).toBe('ALL_PLAYERS_DEAD');
+    expect(afterSolo.interruptQueue).toEqual([]);
+  });
+});
+
+describe('Сквозной бой: шум → Контакт → очередь → Останки → Побег (Шаг 8)', () => {
+  const E2E_SEED = 'nemesis-e2e';
+
+  function forceAttackTopById(state: GameState, cardId: string): void {
+    const pile = state.decks.intruderAttacks.drawPile;
+    const index = pile.findIndex((card) => card.id === cardId);
+
+    if (index === -1) throw new Error(`В колоде Атак Чужих нет карты ${cardId}.`);
+
+    const [card] = pile.splice(index, 1);
+
+    pile.unshift(card!);
+  }
+
+  it('полный цикл боя: Контакт, очередь с убийством и Побег от Крипера', () => {
+    const engine = new GameEngine();
+    const state = createInitialGameState(E2E_SEED, { playerCount: 1, chosenCharacterClass: 'SOLDIER' });
+    const corridor = Object.values(state.ship.corridors).find(
+      (candidate) => candidate.doorState === 'OPEN' && (candidate.fromRoomId === 11 || candidate.toRoomId === 11),
+    )!;
+    const target = (corridor.fromRoomId === 11 ? corridor.toRoomId : corridor.fromRoomId) as RoomId;
+
+    state.ship.rooms[target]!.isExplored = true;
+
+    for (const candidate of Object.values(state.ship.corridors)) {
+      if (candidate.fromRoomId === target || candidate.toRoomId === target) candidate.hasNoise = true;
+    }
+
+    // 1. Повторный шум — Контакт: жетон из мешка, коридоры зачищены.
+    state.intrudersPool.bag.unshift({ id: 'e2e-adult', type: 'ADULT', escapeNumber: 1 });
+    forceAttackTop(state, 'Трансформация');
+
+    let after = engine.processAction(state, {
+      type: 'ACTION_MOVE',
+      payload: {
+        targetRoomId: target,
+        discardCardIds: [state.players['player-1']!.actionDeck.hand[0]!.id],
+      },
+    });
+
+    expect(logTypes(after)).toContain('CONTACT_OCCURRED');
+    expect(after.ship.rooms[target]!.occupantIntruderIds).toContain('e2e-adult');
+    expect(
+      Object.values(after.ship.corridors).some(
+        (candidate) => (candidate.fromRoomId === target || candidate.toRoomId === target) && candidate.hasNoise,
+      ),
+    ).toBe(false);
+
+    // 2. Очередь: Взрослая погибает при любом броске (бонус 2 ≥ стойкости 2 без стрелки).
+    const burstPrep = structuredClone(after);
+
+    burstPrep.players['player-1']!.actionDeck.hand.push({
+      id: 'ACT_SOL_BURST_FIRE',
+      characterClass: 'SOLDIER',
+      name: 'Стрельба очередью',
+      playCost: 0,
+      description: 'e2e',
+    });
+    forceAttackTopById(burstPrep, 'INTRUDER_ATTACK_TAIL_1');
+
+    after = engine.processAction(burstPrep, {
+      type: 'ACTION_PLAY_CARD',
+      payload: { cardId: 'ACT_SOL_BURST_FIRE', targetIntruderId: 'e2e-adult', weaponSlotIndex: 0 },
+    });
+
+    expect(after.intrudersPool.deadTokens.some((token) => token.id === 'e2e-adult')).toBe(true);
+    expect(after.ship.rooms[target]!.objects.some((object) => object.kind === 'INTRUDER_REMAINS')).toBe(true);
+    expect(logTypes(after)).toContain('INTRUDER_KILLED');
+
+    const rifle = after.players['player-1']!.handSlots[0]!;
+
+    expect(rifle.source === 'ITEM' ? rifle.card.ammo : -1).toBe(0);
+
+    // 3. Побег от подоспевшего Крипера: атака в спину, уход, шум.
+    const escapePrep = structuredClone(after);
+
+    spawnIntruder(escapePrep, target, 'CREEPER', 'e2e-creeper-1');
+    forceAttackTop(escapePrep, 'Царапина');
+
+    const escaped = engine.processAction(escapePrep, {
+      type: 'ACTION_MOVE',
+      payload: {
+        targetRoomId: 11,
+        discardCardIds: [escapePrep.players['player-1']!.actionDeck.hand[0]!.id],
+      },
+    });
+    const escapeTypes = logTypes(escaped);
+
+    expect(escapeTypes).toContain('ESCAPE_ATTACK_RESOLVED');
+    expect(escaped.players['player-1']!.roomId).toBe(11);
+    expect(escaped.players['player-1']!.lightWounds).toBe(1);
+    expect(escapeTypes.filter((type) => type === 'PLAYER_MOVED')).toHaveLength(2);
+  });
+});
diff --git a/packages/shared/src/logic/contact.ts b/packages/shared/src/logic/contact.ts
new file mode 100644
index 0000000..1ab2330
--- /dev/null
+++ b/packages/shared/src/logic/contact.ts
@@ -0,0 +1,658 @@
+import type { CardPile, IntruderAttackCard } from '../types/cards.js';
+import type { IntruderEntity, IntruderToken, PlayerState } from '../types/entities.js';
+import type { InterruptEvent } from '../types/interrupts.js';
+import type { PlayerDeathCause } from '../types/log.js';
+import type { CorridorConnection, RoomId } from '../types/rooms.js';
+import type { GameState } from '../types/state.js';
+import { createRng, shuffle, type RngStream } from '../utils/rng.js';
+import { EngineError } from './fsm.js';
+import { appendGameLog } from './gameLog.js';
+import { noiseMarkersInSupply } from './markers.js';
+
+export function queueContact(state: GameState, playerId: string, roomId: RoomId): void {
+  state.interruptQueue.push({ type: 'CONTACT_INTERRUPT', playerId, roomId });
+}
+
+export function resolveContactInterrupt(
+  state: GameState,
+  interrupt: Extract<InterruptEvent, { type: 'CONTACT_INTERRUPT' }>,
+): void {
+  const room = state.ship.rooms[interrupt.roomId];
+
+  if (!room) {
+    throw new EngineError('UNKNOWN_ROOM', `Контакт ссылается на несуществующий отсек ${interrupt.roomId}.`);
+  }
+
+  const player = state.players[interrupt.playerId];
+
+  if (!player) {
+    throw new EngineError('UNKNOWN_PLAYER', `Контакт ссылается на неизвестного персонажа: ${interrupt.playerId}.`);
+  }
+
+  const clearedCorridorIds = clearContactNoise(state, interrupt.roomId);
+  const clearedTechnical = clearTechnicalNoise(state, interrupt.roomId);
+  const token = state.intrudersPool.bag.shift();
+
+  if (!token) {
+    throw new EngineError('INTRUDER_BAG_EMPTY', 'Пул Чужих пуст: вытягивать жетон Контакта не из чего.');
+  }
+
+  const handCount = player.actionDeck.hand.length;
+  const isFirstContact = !state.gameLog.some((entry) => entry.event.type === 'CONTACT_OCCURRED');
+
+  if (token.type === 'BLANK') {
+    resolveBlankToken(state, interrupt.playerId, interrupt.roomId, token);
+    appendGameLog(state, {
+      type: 'CONTACT_OCCURRED',
+      playerId: interrupt.playerId,
+      roomId: interrupt.roomId,
+      tokenType: 'BLANK',
+      escapeNumber: token.escapeNumber,
+      handCount,
+      isFirstContact,
+      clearedCorridorIds,
+      clearedTechnical,
+    });
+    return;
+  }
+
+  const entity: IntruderEntity = {
+    id: token.id,
+    type: token.type,
+    roomId: interrupt.roomId,
+    woundsCount: 0,
+    token,
+  };
+
+  state.intrudersPool.boardTokens.push(entity);
+  room.occupantIntruderIds.push(entity.id);
+  appendGameLog(state, {
+    type: 'CONTACT_OCCURRED',
+    playerId: interrupt.playerId,
+    roomId: interrupt.roomId,
+    tokenType: token.type,
+    escapeNumber: token.escapeNumber,
+    handCount,
+    isFirstContact,
+    clearedCorridorIds,
+    clearedTechnical,
+  });
+
+  if (handCount < token.escapeNumber) {
+    appendGameLog(state, {
+      type: 'SURPRISE_ATTACK_TRIGGERED',
+      playerId: interrupt.playerId,
+      intruderId: entity.id,
+      intruderType: entity.type,
+      handCount,
+      escapeNumber: token.escapeNumber,
+    });
+    state.interruptQueue.push({
+      type: 'SURPRISE_ATTACK_INTERRUPT',
+      playerId: interrupt.playerId,
+      intruderId: entity.id,
+    });
+  }
+}
+
+export function resolveSurpriseAttackInterrupt(
+  state: GameState,
+  interrupt: Extract<InterruptEvent, { type: 'SURPRISE_ATTACK_INTERRUPT' }>,
+): void {
+  const player = state.players[interrupt.playerId];
+
+  if (!player) {
+    throw new EngineError(
+      'UNKNOWN_PLAYER',
+      `Внезапная атака ссылается на неизвестного персонажа: ${interrupt.playerId}.`,
+    );
+  }
+
+  const entity = state.intrudersPool.boardTokens.find((candidate) => candidate.id === interrupt.intruderId);
+
+  if (!entity) {
+    throw new EngineError(
+      'UNKNOWN_INTRUDER',
+      `Внезапная атака ссылается на Чужого, которого нет на поле: ${interrupt.intruderId}.`,
+    );
+  }
+
+  resolveIntruderAttackOnPlayer(state, player, entity, 'SURPRISE_ATTACK_RESOLVED');
+}
+
+/**
+ * Одна Атака Чужих по персонажу (стр. 20): общая процедура Внезапной атаки
+ * и внеочередной атаки при Побеге. Личинка заражает без карты, остальные
+ * тянут карту Атаки: есть символ атакующего — эффект, иначе промах.
+ */
+function resolveIntruderAttackOnPlayer(
+  state: GameState,
+  player: PlayerState,
+  entity: IntruderEntity,
+  eventType: 'SURPRISE_ATTACK_RESOLVED' | 'ESCAPE_ATTACK_RESOLVED',
+): void {
+  if (entity.type === 'LARVA') {
+    infectWithLarva(state, player, entity);
+    appendGameLog(state, {
+      type: eventType,
+      playerId: player.id,
+      intruderId: entity.id,
+      intruderType: entity.type,
+      attackCardId: null,
+      attackCardName: null,
+      hit: true,
+      outcome: 'LARVA_INFECTION',
+      lightWoundsDealt: 0,
+      seriousWoundsDealt: 0,
+      contaminationDealt: 1,
+    });
+    return;
+  }
+
+  const card = drawIntruderAttackCard(state);
+
+  if (!card.attackerTypes.includes(entity.type)) {
+    state.decks.intruderAttacks.discard.push(card);
+    appendGameLog(state, {
+      type: eventType,
+      playerId: player.id,
+      intruderId: entity.id,
+      intruderType: entity.type,
+      attackCardId: card.id,
+      attackCardName: card.name,
+      hit: false,
+      outcome: 'MISSED',
+      lightWoundsDealt: 0,
+      seriousWoundsDealt: 0,
+      contaminationDealt: 0,
+    });
+    return;
+  }
+
+  const dealt = applyAttackCardEffect(state, player, entity, card);
+
+  state.decks.intruderAttacks.discard.push(card);
+  appendGameLog(state, {
+    type: eventType,
+    playerId: player.id,
+    intruderId: entity.id,
+    intruderType: entity.type,
+    attackCardId: card.id,
+    attackCardName: card.name,
+    hit: true,
+    outcome: dealt.died ? 'HIT_DIED' : 'HIT_SURVIVED',
+    lightWoundsDealt: dealt.light,
+    seriousWoundsDealt: dealt.serious,
+    contaminationDealt: dealt.contamination,
+  });
+}
+
+/**
+ * Побег (стр. 19): перед выходом из отсека убегающего по очереди атакует
+ * каждый Чужой в нём — той же процедурой, что Внезапная атака (стр. 20).
+ * Атакуют особи из снимка на начало Побега: призванный «Зовом» новичок
+ * в этом Побеге уже не атакует. Снимок несёт прерывание ESCAPE_ATTACK_INTERRUPT;
+ * без него (прямой вызов) снимок снимается с поля. Если персонаж погибает,
+ * цикл прерывается, а перемещение отменяет вызывающий код: Труп остаётся в отсеке.
+ */
+export function resolveEscapeAttacks(state: GameState, playerId: string, attackerIds?: readonly string[]): void {
+  const player = state.players[playerId];
+
+  if (!player) {
+    throw new EngineError('UNKNOWN_PLAYER', `Побег ссылается на неизвестного персонажа: ${playerId}.`);
+  }
+
+  const roomId = player.roomId;
+  const snapshot =
+    attackerIds ??
+    state.intrudersPool.boardTokens.filter((entity) => entity.roomId === roomId).map((entity) => entity.id);
+
+  for (const intruderId of snapshot) {
+    if (player.isDead) return;
+
+    const entity = state.intrudersPool.boardTokens.find((candidate) => candidate.id === intruderId);
+
+    if (!entity || entity.roomId !== roomId) continue;
+
+    resolveIntruderAttackOnPlayer(state, player, entity, 'ESCAPE_ATTACK_RESOLVED');
+  }
+}
+
+export interface WoundResult {
+  died: boolean;
+  lightDealt: number;
+  seriousDealt: number;
+}
+
+export function dealLightWounds(state: GameState, playerId: string, count: number): WoundResult {
+  const player = state.players[playerId];
+
+  if (!player) {
+    throw new EngineError('UNKNOWN_PLAYER', `Травма ссылается на неизвестного персонажа: ${playerId}.`);
+  }
+
+  let lightDealt = 0;
+  let seriousDealt = 0;
+
+  for (let dealt = 0; dealt < count; dealt++) {
+    if (player.isDead) break;
+
+    if (player.seriousWounds.length >= 3) {
+      killPlayer(state, playerId, 'INTRUDER_ATTACK');
+      return { died: true, lightDealt, seriousDealt };
+    }
+
+    if (player.lightWounds >= 2) {
+      player.lightWounds = 0;
+      const serious = dealSeriousWounds(state, playerId, 1);
+
+      seriousDealt += serious.seriousDealt;
+
+      if (serious.died) return { died: true, lightDealt, seriousDealt };
+    } else {
+      player.lightWounds += 1;
+      lightDealt += 1;
+    }
+  }
+
+  return { died: false, lightDealt, seriousDealt };
+}
+
+export function dealSeriousWounds(state: GameState, playerId: string, count: number): WoundResult {
+  const player = state.players[playerId];
+
+  if (!player) {
+    throw new EngineError('UNKNOWN_PLAYER', `Травма ссылается на неизвестного персонажа: ${playerId}.`);
+  }
+
+  let seriousDealt = 0;
+
+  for (let dealt = 0; dealt < count; dealt++) {
+    if (player.isDead) break;
+
+    if (player.seriousWounds.length >= 3) {
+      killPlayer(state, playerId, 'INTRUDER_ATTACK');
+      return { died: true, lightDealt: 0, seriousDealt };
+    }
+
+    player.seriousWounds.push(drawSeriousWound(state));
+    seriousDealt += 1;
+  }
+
+  return { died: false, lightDealt: 0, seriousDealt };
+}
+
+export function giveContaminationCards(state: GameState, playerId: string, count: number): number {
+  const player = state.players[playerId];
+
+  if (!player) {
+    throw new EngineError('UNKNOWN_PLAYER', `Заражение ссылается на неизвестного персонажа: ${playerId}.`);
+  }
+
+  for (let dealt = 0; dealt < count; dealt++) {
+    const pile = state.decks.contamination;
+
+    if (pile.drawPile.length === 0) {
+      if (pile.discard.length === 0) {
+        throw new EngineError(
+          'NO_CONTAMINATION_LEFT',
+          'Колода и сброс Заражения пусты: книгу правил этот случай не описывает.',
+        );
+      }
+
+      reshuffleDiscard(state, pile, 'combat');
+    }
+
+    player.actionDeck.discard.push(pile.drawPile.shift()!);
+  }
+
+  return count;
+}
+
+export function drawIntruderAttackCard(state: GameState): IntruderAttackCard {
+  const pile = state.decks.intruderAttacks;
+
+  if (pile.drawPile.length === 0) {
+    if (pile.discard.length === 0) {
+      throw new EngineError(
+        'NO_INTRUDER_ATTACKS_LEFT',
+        'Колода и сброс Атак Чужих пусты: книгу правил этот случай не описывает.',
+      );
+    }
+
+    reshuffleDiscard(state, pile, 'combat');
+  }
+
+  return pile.drawPile.shift()!;
+}
+
+export function killPlayer(state: GameState, playerId: string, cause: PlayerDeathCause): void {
+  const player = state.players[playerId];
+
+  if (!player) {
+    throw new EngineError('UNKNOWN_PLAYER', `Смерть ссылается на неизвестного персонажа: ${playerId}.`);
+  }
+
+  const room = state.ship.rooms[player.roomId];
+
+  if (!room) {
+    throw new EngineError('UNKNOWN_ROOM', `Персонаж ${playerId} погиб в несуществующем отсеке ${player.roomId}.`);
+  }
+
+  player.isDead = true;
+  room.occupantPlayerIds = room.occupantPlayerIds.filter((id) => id !== playerId);
+  room.objects.push({ id: `corpse-${playerId}`, kind: 'CORPSE', characterClass: player.characterClass });
+
+  for (const slot of player.handSlots) {
+    if (slot.source === 'OBJECT') room.objects.push(slot.object);
+  }
+
+  player.handSlots = [];
+  appendGameLog(state, { type: 'PLAYER_DIED', playerId, roomId: room.id, cause });
+}
+
+function corridorsLeadingInto(state: GameState, roomId: RoomId): CorridorConnection[] {
+  return Object.values(state.ship.corridors).filter(
+    (corridor) => corridor.fromRoomId === roomId || corridor.toRoomId === roomId,
+  );
+}
+
+function clearContactNoise(state: GameState, roomId: RoomId): string[] {
+  const cleared: string[] = [];
+
+  for (const corridor of corridorsLeadingInto(state, roomId)) {
+    if (corridor.hasNoise) {
+      corridor.hasNoise = false;
+      cleared.push(corridor.id);
+    }
+  }
+
+  return cleared;
+}
+
+function clearTechnicalNoise(state: GameState, roomId: RoomId): boolean {
+  const room = state.ship.rooms[roomId];
+
+  if (!room?.hasTechnicalCorridorEntrance || !state.ship.technicalCorridorNoise) return false;
+
+  state.ship.technicalCorridorNoise = false;
+
+  return true;
+}
+
+function resolveBlankToken(state: GameState, playerId: string, roomId: RoomId, token: IntruderToken): void {
+  if (state.intrudersPool.bag.length === 0) {
+    const adultIndex = state.intrudersPool.supply.findIndex((candidate) => candidate.type === 'ADULT');
+
+    if (adultIndex !== -1) {
+      const [adult] = state.intrudersPool.supply.splice(adultIndex, 1);
+
+      state.intrudersPool.bag.push(adult!);
+    }
+  }
+
+  state.intrudersPool.bag.push(token);
+  reshuffleBag(state);
+
+  const targets = corridorsLeadingInto(state, roomId).filter((corridor) => !corridor.hasNoise);
+
+  if (targets.length > noiseMarkersInSupply(state.ship)) {
+    throw new EngineError(
+      'MARKER_SUPPLY_EXHAUSTED',
+      'Пустому жетону не хватает маркеров Шума в запасе: книга правил не описывает этот случай (стр. 3, 15).',
+    );
+  }
+
+  for (const corridor of targets) {
+    corridor.hasNoise = true;
+    appendGameLog(state, {
+      type: 'NOISE_MARKER_PLACED',
+      playerId,
+      roomId,
+      target: { kind: 'CORRIDOR', corridorId: corridor.id },
+      reason: 'BLANK',
+    });
+  }
+}
+
+function reshuffleDiscard<T>(state: GameState, pile: CardPile<T>, stream: RngStream): void {
+  const items = pile.discard;
+
+  pile.discard = [];
+
+  if (items.length <= 1) {
+    pile.drawPile.push(...items);
+    return;
+  }
+
+  const rng = createRng(state.meta.seed, stream);
+
+  for (let burned = 0; burned < state.meta.rngDraws[stream]; burned++) rng();
+
+  pile.drawPile.push(...shuffle(rng, items));
+  state.meta.rngDraws[stream] += items.length - 1;
+}
+
+function reshuffleBag(state: GameState): void {
+  const bag = state.intrudersPool.bag;
+
+  if (bag.length <= 1) return;
+
+  const rng = createRng(state.meta.seed, 'bag');
+
+  for (let burned = 0; burned < state.meta.rngDraws.bag; burned++) rng();
+
+  state.intrudersPool.bag = shuffle(rng, bag);
+  state.meta.rngDraws.bag += bag.length - 1;
+}
+
+function drawSeriousWound(state: GameState): PlayerState['seriousWounds'][number] {
+  const pile = state.decks.seriousWounds;
+
+  if (pile.drawPile.length === 0) {
+    if (pile.discard.length === 0) {
+      throw new EngineError(
+        'NO_SERIOUS_WOUNDS_LEFT',
+        'Колода и сброс Тяжёлых Травм пусты: книгу правил этот случай не описывает.',
+      );
+    }
+
+    reshuffleDiscard(state, pile, 'combat');
+  }
+
+  return pile.drawPile.shift()!;
+}
+
+/** Снятие миниатюры с поля: из пула на поле и из списка occupants отсека. */
+export function removeIntruder(state: GameState, entity: IntruderEntity): void {
+  state.intrudersPool.boardTokens = state.intrudersPool.boardTokens.filter((candidate) => candidate.id !== entity.id);
+
+  const room = state.ship.rooms[entity.roomId];
+
+  if (room) {
+    room.occupantIntruderIds = room.occupantIntruderIds.filter((id) => id !== entity.id);
+  }
+}
+
+function infectWithLarva(state: GameState, player: PlayerState, entity: IntruderEntity): void {
+  removeIntruder(state, entity);
+  state.intrudersPool.supply.push(entity.token);
+  player.hasLarva = true;
+  giveContaminationCards(state, player.id, 1);
+}
+
+interface AttackDamage {
+  died: boolean;
+  light: number;
+  serious: number;
+  contamination: number;
+}
+
+function applyAttackCardEffect(
+  state: GameState,
+  player: PlayerState,
+  entity: IntruderEntity,
+  card: IntruderAttackCard,
+): AttackDamage {
+  switch (card.name) {
+    case 'Царапина': {
+      const wounds = dealLightWounds(state, player.id, 1);
+      const contamination = wounds.died ? 0 : giveContaminationCards(state, player.id, 1);
+
+      return { died: wounds.died, light: wounds.lightDealt, serious: wounds.seriousDealt, contamination };
+    }
+
+    case 'Укус': {
+      if (player.seriousWounds.length >= 2) {
+        killPlayer(state, player.id, 'INTRUDER_ATTACK');
+        return { died: true, light: 0, serious: 0, contamination: 0 };
+      }
+
+      const wounds = dealSeriousWounds(state, player.id, 1);
+
+      return { died: wounds.died, light: 0, serious: wounds.seriousDealt, contamination: 0 };
+    }
+
+    case 'Атака когтями': {
+      const wounds = dealLightWounds(state, player.id, 2);
+      const contamination = wounds.died ? 0 : giveContaminationCards(state, player.id, 1);
+
+      return { died: wounds.died, light: wounds.lightDealt, serious: wounds.seriousDealt, contamination };
+    }
+
+    case 'Атака хвостом': {
+      if (player.seriousWounds.length >= 1) {
+        killPlayer(state, player.id, 'INTRUDER_ATTACK');
+        return { died: true, light: 0, serious: 0, contamination: 0 };
+      }
+
+      const wounds = dealSeriousWounds(state, player.id, 1);
+
+      return { died: wounds.died, light: 0, serious: wounds.seriousDealt, contamination: 0 };
+    }
+
+    case 'Трансформация': {
+      transformCreeper(state, player, entity);
+      return { died: false, light: 0, serious: 0, contamination: 0 };
+    }
+
+    case 'Ярость':
+      return applyFury(state, player, entity);
+
+    case 'Слизь': {
+      player.hasSlime = true;
+      const contamination = giveContaminationCards(state, player.id, 1);
+
+      return { died: false, light: 0, serious: 0, contamination };
+    }
+
+    case 'Зов': {
+      callIntruder(state, entity.roomId);
+      return { died: false, light: 0, serious: 0, contamination: 0 };
+    }
+
+    default:
+      throw new EngineError(
+        'UNKNOWN_ATTACK_EFFECT',
+        `Карта Атаки Чужих «${card.name}» не имеет разбора эффекта в движке.`,
+      );
+  }
+}
+
+function applyFury(state: GameState, player: PlayerState, entity: IntruderEntity): AttackDamage {
+  const room = state.ship.rooms[entity.roomId];
+  let died = false;
+  let serious = 0;
+
+  for (const occupantId of [...(room?.occupantPlayerIds ?? [])]) {
+    const occupant = state.players[occupantId];
+
+    if (!occupant || occupant.isDead) continue;
+
+    if (occupant.seriousWounds.length >= 2) {
+      killPlayer(state, occupantId, 'INTRUDER_ATTACK');
+
+      if (occupantId === player.id) died = true;
+    } else {
+      const wounds = dealSeriousWounds(state, occupantId, 1);
+
+      if (occupantId === player.id) {
+        died = wounds.died;
+        serious += wounds.seriousDealt;
+      }
+    }
+  }
+
+  return { died, light: 0, serious, contamination: 0 };
+}
+
+function transformCreeper(state: GameState, player: PlayerState, entity: IntruderEntity): void {
+  const breederIndex = state.intrudersPool.supply.findIndex((candidate) => candidate.type === 'BREEDER');
+
+  if (breederIndex === -1) {
+    throw new EngineError(
+      'NO_BREEDER_IN_SUPPLY',
+      'Трансформация требует Трутня из запаса рядом с полем, но оба Трутня уже в игре.',
+    );
+  }
+
+  removeIntruder(state, entity);
+  state.intrudersPool.supply.push(entity.token);
+
+  const [breederToken] = state.intrudersPool.supply.splice(breederIndex, 1);
+  const breeder: IntruderEntity = {
+    id: breederToken!.id,
+    type: 'BREEDER',
+    roomId: entity.roomId,
+    woundsCount: 0,
+    token: breederToken!,
+  };
+
+  state.intrudersPool.boardTokens.push(breeder);
+  state.ship.rooms[entity.roomId]?.occupantIntruderIds.push(breeder.id);
+  appendGameLog(state, {
+    type: 'INTRUDER_TRANSFORMED',
+    roomId: entity.roomId,
+    oldIntruderId: entity.id,
+    newIntruderId: breeder.id,
+  });
+
+  if (player.actionDeck.hand.length === 0) {
+    appendGameLog(state, {
+      type: 'SURPRISE_ATTACK_TRIGGERED',
+      playerId: player.id,
+      intruderId: breeder.id,
+      intruderType: 'BREEDER',
+      handCount: 0,
+      escapeNumber: breederToken!.escapeNumber,
+    });
+    state.interruptQueue.push({ type: 'SURPRISE_ATTACK_INTERRUPT', playerId: player.id, intruderId: breeder.id });
+  }
+}
+
+function callIntruder(state: GameState, roomId: RoomId): void {
+  const room = state.ship.rooms[roomId];
+
+  if (!room) {
+    throw new EngineError('UNKNOWN_ROOM', `Зов ссылается на несуществующий отсек ${roomId}.`);
+  }
+
+  const token = state.intrudersPool.bag.shift();
+
+  if (!token) {
+    throw new EngineError('INTRUDER_BAG_EMPTY', 'Пул Чужих пуст: Зову некого вытягивать.');
+  }
+
+  if (token.type === 'BLANK') {
+    state.intrudersPool.bag.push(token);
+    reshuffleBag(state);
+    appendGameLog(state, { type: 'INTRUDER_CALLED', roomId, intruderId: null, tokenType: 'BLANK' });
+    return;
+  }
+
+  const entity: IntruderEntity = { id: token.id, type: token.type, roomId, woundsCount: 0, token };
+
+  state.intrudersPool.boardTokens.push(entity);
+  room.occupantIntruderIds.push(entity.id);
+  appendGameLog(state, { type: 'INTRUDER_CALLED', roomId, intruderId: entity.id, tokenType: token.type });
+}
diff --git a/packages/shared/src/logic/fsm.test.ts b/packages/shared/src/logic/fsm.test.ts
index 7816bb6..00d8fac 100644
--- a/packages/shared/src/logic/fsm.test.ts
+++ b/packages/shared/src/logic/fsm.test.ts
@@ -1,6 +1,8 @@
 import { describe, expect, it } from 'vitest';
 
 import type { EngineAction } from '../types/actions.js';
+import type { ActionCard } from '../types/cards.js';
+import type { IntruderType } from '../types/entities.js';
 import type { CorridorConnection, CorridorNumber, ExplorationEffect, RoomId, RoomState } from '../types/rooms.js';
 import type { GameState } from '../types/state.js';
 import type { NoiseDieFace } from '../data/noiseDie.js';
@@ -17,6 +19,7 @@ import {
 } from './fsm.js';
 import { SHIP_ROOM_NODES } from '../data/shipGraph.js';
 import { DOOR_TOKEN_SUPPLY, FIRE_MARKER_SUPPLY, MALFUNCTION_MARKER_SUPPLY } from './markers.js';
+import { resolveEscapeAttacks } from './contact.js';
 import { createInitialGameState } from './setup.js';
 
 const SEED = 'engine-test';
@@ -223,6 +226,543 @@ describe('GameEngine: перемещение', () => {
   });
 });
 
+/** Особь на поле: жетон спавнится прямо в отсек, мешок не трогаем. */
+function spawnIntruder(state: GameState, roomId: RoomId, type: IntruderType, tokenId: string): void {
+  const token = { id: tokenId, type, escapeNumber: 1 };
+
+  state.intrudersPool.boardTokens.push({ id: token.id, type, roomId, woundsCount: 0, token });
+  state.ship.rooms[roomId]!.occupantIntruderIds.push(tokenId);
+}
+
+/** Кладёт карту с именем на верх колоды Атак Чужих. */
+function rigAttackTop(state: GameState, name: string): void {
+  const pile = state.decks.intruderAttacks.drawPile;
+  const index = pile.findIndex((card) => card.name === name);
+
+  if (index === -1) throw new Error(`В колоде Атак Чужих нет карты «${name}».`);
+
+  const [card] = pile.splice(index, 1);
+
+  pile.unshift(card!);
+}
+
+function woundSerious(state: GameState, playerId: string, count: number): void {
+  const player = state.players[playerId]!;
+
+  for (let dealt = 0; dealt < count; dealt++) {
+    player.seriousWounds.push(state.decks.seriousWounds.drawPile.shift()!);
+  }
+}
+
+function escapeEvents(state: GameState): { intruderId: string; outcome: string }[] {
+  return state.gameLog
+    .map((entry) => entry.event)
+    .filter((event) => event.type === 'ESCAPE_ATTACK_RESOLVED')
+    .map((event) => ({
+      intruderId: (event as { intruderId: string }).intruderId,
+      outcome: (event as { outcome: string }).outcome,
+    }));
+}
+
+describe('GameEngine: Побег из боя (стр. 19)', () => {
+  // Свой сид: бросок Шума после выхода не должен давать «Опасность» —
+  // «Опасность» при Чужих рядом требует механики движения 0.5.0.
+  const ESCAPE_SEED = 'escape-test';
+
+  function escapeSetup() {
+    const engine = new GameEngine();
+    const state = createInitialGameState(ESCAPE_SEED);
+    const target = openCorridorFrom(state, 11).toRoomId as RoomId;
+    const discardCardId = state.players['player-1']!.actionDeck.hand[0]!.id;
+
+    // Цель пред-разведана: иначе жетон «Опасности» потребует механики 0.5.0.
+    state.ship.rooms[target]!.isExplored = true;
+
+    return { engine, state, target, discardCardId };
+  }
+
+  function targetHasNoise(state: GameState, target: RoomId): boolean {
+    return Object.values(state.ship.corridors).some(
+      (corridor) => (corridor.fromRoomId === target || corridor.toRoomId === target) && corridor.hasNoise,
+    );
+  }
+
+  function doMove(setup: ReturnType<typeof escapeSetup>): GameState {
+    return setup.engine.processAction(setup.state, {
+      type: 'ACTION_MOVE',
+      payload: { targetRoomId: setup.target, discardCardIds: [setup.discardCardId] },
+    });
+  }
+
+  it('без Чужих движение не разыгрывает атак', () => {
+    const after = doMove(escapeSetup());
+
+    expect(escapeEvents(after)).toHaveLength(0);
+    expect(after.players['player-1']!.roomId).not.toBe(11);
+  });
+
+  it('одна особь: промах — персонаж уходит и шумит', () => {
+    const setup = escapeSetup();
+
+    spawnIntruder(setup.state, 11, 'ADULT', 'escape-adult-1');
+    rigAttackTop(setup.state, 'Атака хвостом');
+
+    const after = doMove(setup);
+    const events = escapeEvents(after);
+
+    expect(events).toEqual([{ intruderId: 'escape-adult-1', outcome: 'MISSED' }]);
+    expect(after.players['player-1']!.roomId).toBe(setup.target);
+    expect(after.players['player-1']!.lightWounds).toBe(0);
+    expect(targetHasNoise(after, setup.target)).toBe(true);
+  });
+
+  it('одна особь: попадание — раны в журнале, персонаж уходит', () => {
+    const setup = escapeSetup();
+
+    spawnIntruder(setup.state, 11, 'ADULT', 'escape-adult-1');
+    rigAttackTop(setup.state, 'Царапина');
+
+    const after = doMove(setup);
+    const player = after.players['player-1']!;
+
+    expect(escapeEvents(after)).toEqual([{ intruderId: 'escape-adult-1', outcome: 'HIT_SURVIVED' }]);
+    expect(player.roomId).toBe(setup.target);
+    expect(player.lightWounds).toBe(1);
+    expect(player.actionDeck.discard).toHaveLength(2);
+    expect(player.actionDeck.discard.some((card) => card.id.startsWith('CONTAMINATION_'))).toBe(true);
+  });
+
+  it('каждый Чужой в отсеке атакует по очереди', () => {
+    const setup = escapeSetup();
+
+    spawnIntruder(setup.state, 11, 'ADULT', 'escape-adult-1');
+    spawnIntruder(setup.state, 11, 'BREEDER', 'escape-breeder-1');
+
+    // Две верхние карты — «Царапины»: повторный rigAttackTop нашёл бы ту же.
+    rigAttackTop(setup.state, 'Царапина');
+
+    const pile = setup.state.decks.intruderAttacks.drawPile;
+    const second = pile.findIndex((card, index) => index > 0 && card.name === 'Царапина');
+    const [scratch] = pile.splice(second, 1);
+
+    pile.splice(1, 0, scratch!);
+
+    const after = doMove(setup);
+
+    expect(escapeEvents(after)).toEqual([
+      { intruderId: 'escape-adult-1', outcome: 'HIT_SURVIVED' },
+      { intruderId: 'escape-breeder-1', outcome: 'HIT_SURVIVED' },
+    ]);
+    expect(after.players['player-1']!.roomId).toBe(setup.target);
+    expect(after.players['player-1']!.lightWounds).toBe(2);
+  });
+
+  it('гибель в Побеге: нет перемещения и шума, Труп остаётся в отсеке', () => {
+    const setup = escapeSetup();
+
+    spawnIntruder(setup.state, 11, 'ADULT', 'escape-adult-1');
+    woundSerious(setup.state, 'player-1', 2);
+    rigAttackTop(setup.state, 'Укус');
+
+    const after = doMove(setup);
+    const player = after.players['player-1']!;
+
+    expect(escapeEvents(after)).toEqual([{ intruderId: 'escape-adult-1', outcome: 'HIT_DIED' }]);
+    expect(player.isDead).toBe(true);
+    expect(player.roomId).toBe(11);
+    expect(after.gameLog.some((entry) => entry.event.type === 'PLAYER_MOVED')).toBe(false);
+    expect(
+      after.ship.rooms[11]!.objects.some((object) => object.kind === 'CORPSE' && object.id === 'corpse-player-1'),
+    ).toBe(true);
+
+    const targetCorridors = Object.values(after.ship.corridors).filter(
+      (corridor) => corridor.fromRoomId === setup.target || corridor.toRoomId === setup.target,
+    );
+
+    expect(targetCorridors.some((corridor) => corridor.hasNoise)).toBe(false);
+  });
+
+  it('Личинка заражает без карты Атаки', () => {
+    const setup = escapeSetup();
+
+    spawnIntruder(setup.state, 11, 'LARVA', 'escape-larva-1');
+
+    const deckBefore = setup.state.decks.intruderAttacks.drawPile.length;
+    const after = doMove(setup);
+    const player = after.players['player-1']!;
+
+    expect(escapeEvents(after)).toEqual([{ intruderId: 'escape-larva-1', outcome: 'LARVA_INFECTION' }]);
+    expect(after.decks.intruderAttacks.drawPile.length).toBe(deckBefore);
+    expect(player.hasLarva).toBe(true);
+    expect(player.roomId).toBe(setup.target);
+  });
+
+  it('призванный «Зовом» Чужой в этом Побеге не атакует', () => {
+    const setup = escapeSetup();
+
+    spawnIntruder(setup.state, 11, 'CREEPER', 'escape-creeper-1');
+    rigAttackTop(setup.state, 'Зов');
+
+    const after = doMove(setup);
+
+    expect(escapeEvents(after)).toHaveLength(1);
+    expect(after.intrudersPool.boardTokens.length).toBeGreaterThan(1);
+    expect(after.players['player-1']!.roomId).toBe(setup.target);
+  });
+
+  it('трансформировавшийся Крипер не атакует дважды', () => {
+    const setup = escapeSetup();
+
+    spawnIntruder(setup.state, 11, 'CREEPER', 'escape-creeper-1');
+    rigAttackTop(setup.state, 'Трансформация');
+
+    const after = doMove(setup);
+
+    expect(escapeEvents(after)).toHaveLength(1);
+    expect(after.intrudersPool.boardTokens.some((entity) => entity.type === 'BREEDER')).toBe(true);
+    expect(after.players['player-1']!.roomId).toBe(setup.target);
+  });
+
+  it('прерывание Побега: атаки разыгрываются до шага, шум — после', () => {
+    const setup = escapeSetup();
+
+    spawnIntruder(setup.state, 11, 'ADULT', 'escape-adult-1');
+    rigAttackTop(setup.state, 'Атака хвостом');
+
+    resolveInterrupt(setup.state, {
+      type: 'ESCAPE_ATTACK_INTERRUPT',
+      playerId: 'player-1',
+      intruderIds: ['escape-adult-1'],
+      targetRoomId: setup.target,
+    });
+
+    expect(escapeEvents(setup.state)).toEqual([{ intruderId: 'escape-adult-1', outcome: 'MISSED' }]);
+    expect(setup.state.players['player-1']!.roomId).toBe(setup.target);
+    expect(setup.state.interruptQueue.some((interrupt) => interrupt.type === 'NOISE_ROLL_INTERRUPT')).toBe(true);
+  });
+
+  it('Побег неизвестного персонажа отклоняется', () => {
+    expectEngineError(() => resolveEscapeAttacks(freshState(), 'nobody'), 'UNKNOWN_PLAYER');
+  });
+});
+
+function classCard(id: string, name: string): ActionCard {
+  return { id, characterClass: 'SOLDIER', name, playCost: 0, description: 'классовая боевая карта (тест)' };
+}
+
+function weaponAmmo(state: GameState, playerId: string): number {
+  const slot = state.players[playerId]!.handSlots[0]!;
+
+  if (slot.source !== 'ITEM') throw new Error('В первом слоте руки нет предмета.');
+
+  return slot.card.ammo ?? 0;
+}
+
+describe('GameEngine: классовые боевые карты (Шаг 8)', () => {
+  // Тот же сид, что у Побега: бросок Шума после выхода — не «Опасность».
+  const CARD_SEED = 'escape-test';
+
+  function cardSetup(playerCount = 1): { engine: GameEngine; state: GameState; target: RoomId } {
+    const engine = new GameEngine();
+    const state = createInitialGameState(CARD_SEED, { playerCount });
+    const target = openCorridorFrom(state, 11).toRoomId as RoomId;
+
+    state.ship.rooms[target]!.isExplored = true;
+
+    return { engine, state, target };
+  }
+
+  function giveCard(state: GameState, playerId: string, card: ActionCard): void {
+    state.players[playerId]!.actionDeck.hand.push(card);
+  }
+
+  it('«Прицельный огонь»: ставит решение о перебросе и не тратит выстрел заранее', () => {
+    const { engine, state } = cardSetup();
+
+    spawnIntruder(state, 11, 'ADULT', 'aimed-adult-1');
+    giveCard(state, 'player-1', classCard('ACT_SOL_AIMED_FIRE', 'Прицельный огонь'));
+
+    const ammoBefore = weaponAmmo(state, 'player-1');
+    const after = engine.processAction(state, {
+      type: 'ACTION_PLAY_CARD',
+      payload: { cardId: 'ACT_SOL_AIMED_FIRE', targetIntruderId: 'aimed-adult-1', weaponSlotIndex: 0 },
+    });
+
+    expect(after.pendingDecision?.type).toBe('CHOOSE_AIMED_REROLL');
+
+    if (after.pendingDecision?.type === 'CHOOSE_AIMED_REROLL') {
+      expect(after.pendingDecision.targetIntruderId).toBe('aimed-adult-1');
+      expect(after.pendingDecision.weaponSlotIndex).toBe(0);
+    }
+
+    expect(after.players['player-1']!.actionsPerformedThisRound).toBe(0);
+    expect(weaponAmmo(after, 'player-1')).toBe(ammoBefore);
+    expect(after.gameLog.some((entry) => entry.event.type === 'SHOT_FIRED')).toBe(false);
+  });
+
+  it('«Прицельный огонь»: «Оставить» применяет первую грань и засчитывает действие', () => {
+    const { engine, state } = cardSetup();
+
+    spawnIntruder(state, 11, 'ADULT', 'aimed-adult-1');
+    giveCard(state, 'player-1', classCard('ACT_SOL_AIMED_FIRE', 'Прицельный огонь'));
+
+    const ammoBefore = weaponAmmo(state, 'player-1');
+    const played = engine.processAction(state, {
+      type: 'ACTION_PLAY_CARD',
+      payload: { cardId: 'ACT_SOL_AIMED_FIRE', targetIntruderId: 'aimed-adult-1', weaponSlotIndex: 0 },
+    });
+    const decision = played.pendingDecision;
+
+    if (decision?.type !== 'CHOOSE_AIMED_REROLL') throw new Error('Нет решения о перебросе.');
+
+    const resolved = engine.processAction(played, {
+      type: 'ACTION_RESOLVE_DECISION',
+      payload: { decisionId: decision.id, selectedOption: 'KEEP' },
+    });
+    const shot = resolved.gameLog.map((entry) => entry.event).find((event) => event.type === 'SHOT_FIRED');
+
+    expect(shot?.type).toBe('SHOT_FIRED');
+
+    if (shot?.type === 'SHOT_FIRED') {
+      expect(shot.dieFace).toBe(decision.firstFace);
+    }
+
+    expect(resolved.pendingDecision).toBeNull();
+    expect(weaponAmmo(resolved, 'player-1')).toBe(ammoBefore - 1);
+    expect(resolved.players['player-1']!.actionsPerformedThisRound).toBe(1);
+  });
+
+  it('«Прицельный огонь»: «Перебросить» тратит второй бросок кубика', () => {
+    const first = cardSetup();
+
+    spawnIntruder(first.state, 11, 'ADULT', 'aimed-adult-1');
+    giveCard(first.state, 'player-1', classCard('ACT_SOL_AIMED_FIRE', 'Прицельный огонь'));
+
+    const played = first.engine.processAction(first.state, {
+      type: 'ACTION_PLAY_CARD',
+      payload: { cardId: 'ACT_SOL_AIMED_FIRE', targetIntruderId: 'aimed-adult-1', weaponSlotIndex: 0 },
+    });
+    const decision = played.pendingDecision;
+
+    if (decision?.type !== 'CHOOSE_AIMED_REROLL') throw new Error('Нет решения о перебросе.');
+
+    const kept = first.engine.processAction(played, {
+      type: 'ACTION_RESOLVE_DECISION',
+      payload: { decisionId: decision.id, selectedOption: 'KEEP' },
+    });
+    const rerolled = first.engine.processAction(played, {
+      type: 'ACTION_RESOLVE_DECISION',
+      payload: { decisionId: decision.id, selectedOption: 'REROLL' },
+    });
+
+    expect(rerolled.meta.rngDraws.combat - kept.meta.rngDraws.combat).toBe(1);
+    expect(rerolled.gameLog.some((entry) => entry.event.type === 'SHOT_FIRED')).toBe(true);
+    expect(rerolled.pendingDecision).toBeNull();
+  });
+
+  it('«Прицельный огонь»: неизвестный вариант решения отклоняется', () => {
+    const { engine, state } = cardSetup();
+
+    spawnIntruder(state, 11, 'ADULT', 'aimed-adult-1');
+    giveCard(state, 'player-1', classCard('ACT_SOL_AIMED_FIRE', 'Прицельный огонь'));
+
+    const played = engine.processAction(state, {
+      type: 'ACTION_PLAY_CARD',
+      payload: { cardId: 'ACT_SOL_AIMED_FIRE', targetIntruderId: 'aimed-adult-1', weaponSlotIndex: 0 },
+    });
+    const decision = played.pendingDecision;
+
+    if (decision?.type !== 'CHOOSE_AIMED_REROLL') throw new Error('Нет решения о перебросе.');
+
+    expectEngineError(
+      () =>
+        engine.processAction(played, {
+          type: 'ACTION_RESOLVE_DECISION',
+          payload: { decisionId: decision.id, selectedOption: 'MAYBE' },
+        }),
+      'INVALID_DECISION_OPTION',
+    );
+  });
+
+  it('выстрел без цели и оружия отклоняется до броска', () => {
+    const { engine, state } = cardSetup();
+
+    spawnIntruder(state, 11, 'ADULT', 'aimed-adult-1');
+    giveCard(state, 'player-1', classCard('ACT_SOL_AIMED_FIRE', 'Прицельный огонь'));
+
+    expectEngineError(
+      () => engine.processAction(state, { type: 'ACTION_PLAY_CARD', payload: { cardId: 'ACT_SOL_AIMED_FIRE' } }),
+      'CARD_TARGET_REQUIRED',
+    );
+  });
+
+  it('«Заградительный огонь»: уход из боя без внеочередных атак', () => {
+    const { engine, state, target } = cardSetup();
+
+    spawnIntruder(state, 11, 'ADULT', 'barrage-adult-1');
+    giveCard(state, 'player-1', classCard('ACT_SOL_SUPPRESSIVE_FIRE', 'Заградительный огонь'));
+
+    const ammoBefore = weaponAmmo(state, 'player-1');
+    const after = engine.processAction(state, {
+      type: 'ACTION_PLAY_CARD',
+      payload: { cardId: 'ACT_SOL_SUPPRESSIVE_FIRE', targetRoomId: target },
+    });
+    const types = after.gameLog.map((entry) => entry.event.type);
+
+    expect(after.players['player-1']!.roomId).toBe(target);
+    expect(types).toContain('PLAYER_MOVED');
+    expect(types).not.toContain('ESCAPE_ATTACK_RESOLVED');
+    expect(weaponAmmo(after, 'player-1')).toBe(ammoBefore - 1);
+  });
+
+  it('«Заградительный огонь»: уводит себя и другого персонажа', () => {
+    const { engine, state, target } = cardSetup(2);
+
+    spawnIntruder(state, 11, 'ADULT', 'barrage-adult-1');
+    giveCard(state, 'player-1', classCard('ACT_SOL_SUPPRESSIVE_FIRE', 'Заградительный огонь'));
+
+    const after = engine.processAction(state, {
+      type: 'ACTION_PLAY_CARD',
+      payload: { cardId: 'ACT_SOL_SUPPRESSIVE_FIRE', targetRoomId: target, option: 'BOTH:player-2' },
+    });
+
+    expect(after.players['player-1']!.roomId).toBe(target);
+    expect(after.players['player-2']!.roomId).toBe(target);
+    expect(after.gameLog.map((entry) => entry.event.type)).not.toContain('ESCAPE_ATTACK_RESOLVED');
+  });
+
+  it('«Огонь на подавление»: уводит другого, сам остаётся', () => {
+    const { engine, state, target } = cardSetup(2);
+
+    spawnIntruder(state, 11, 'ADULT', 'suppressive-adult-1');
+    giveCard(state, 'player-1', classCard('ACT_CAP_SUPPRESSIVE_FIRE', 'Огонь на подавление'));
+
+    const after = engine.processAction(state, {
+      type: 'ACTION_PLAY_CARD',
+      payload: { cardId: 'ACT_CAP_SUPPRESSIVE_FIRE', targetRoomId: target, option: 'OTHER:player-2' },
+    });
+
+    expect(after.players['player-1']!.roomId).toBe(11);
+    expect(after.players['player-2']!.roomId).toBe(target);
+    expect(after.gameLog.map((entry) => entry.event.type)).not.toContain('ESCAPE_ATTACK_RESOLVED');
+  });
+
+  it('«Огонь на подавление»: обоих сразу — нельзя', () => {
+    const { engine, state, target } = cardSetup(2);
+
+    giveCard(state, 'player-1', classCard('ACT_CAP_SUPPRESSIVE_FIRE', 'Огонь на подавление'));
+
+    expectEngineError(
+      () =>
+        engine.processAction(state, {
+          type: 'ACTION_PLAY_CARD',
+          payload: { cardId: 'ACT_CAP_SUPPRESSIVE_FIRE', targetRoomId: target, option: 'BOTH:player-2' },
+        }),
+      'INVALID_CARD_OPTION',
+    );
+  });
+
+  it('увод без отсека, патронов и спутника отклоняется', () => {
+    const { engine, state, target } = cardSetup(2);
+
+    giveCard(state, 'player-1', classCard('ACT_SOL_SUPPRESSIVE_FIRE', 'Заградительный огонь'));
+
+    expectEngineError(
+      () =>
+        engine.processAction(state, {
+          type: 'ACTION_PLAY_CARD',
+          payload: { cardId: 'ACT_SOL_SUPPRESSIVE_FIRE' },
+        }),
+      'CARD_TARGET_REQUIRED',
+    );
+
+    for (const slot of state.players['player-1']!.handSlots) {
+      if (slot.source === 'ITEM') slot.card.ammo = 0;
+    }
+
+    expectEngineError(
+      () =>
+        engine.processAction(state, {
+          type: 'ACTION_PLAY_CARD',
+          payload: { cardId: 'ACT_SOL_SUPPRESSIVE_FIRE', targetRoomId: target },
+        }),
+      'CARD_NO_AMMO',
+    );
+
+    const other = state.players['player-2']!;
+
+    other.roomId = target;
+    state.ship.rooms[11]!.occupantPlayerIds = state.ship.rooms[11]!.occupantPlayerIds.filter((id) => id !== 'player-2');
+    state.ship.rooms[target]!.occupantPlayerIds.push('player-2');
+
+    expectEngineError(
+      () =>
+        engine.processAction(state, {
+          type: 'ACTION_PLAY_CARD',
+          payload: { cardId: 'ACT_SOL_SUPPRESSIVE_FIRE', targetRoomId: target, option: 'OTHER:player-2' },
+        }),
+      'CARD_COMPANION_NOT_HERE',
+    );
+  });
+
+  it('«Адреналин» (выстрел): бьёт и добирает карту', () => {
+    const { engine, state } = cardSetup();
+
+    spawnIntruder(state, 11, 'ADULT', 'adrenaline-adult-1');
+    giveCard(state, 'player-1', classCard('ACT_SCO_ADRENALINE', 'Адреналин'));
+
+    const handBefore = state.players['player-1']!.actionDeck.hand.length;
+    const drawBefore = state.players['player-1']!.actionDeck.drawPile.length;
+    const ammoBefore = weaponAmmo(state, 'player-1');
+
+    const after = engine.processAction(state, {
+      type: 'ACTION_PLAY_CARD',
+      payload: {
+        cardId: 'ACT_SCO_ADRENALINE',
+        option: 'SHOOT',
+        targetIntruderId: 'adrenaline-adult-1',
+        weaponSlotIndex: 0,
+      },
+    });
+    const player = after.players['player-1']!;
+
+    expect(after.gameLog.some((entry) => entry.event.type === 'SHOT_FIRED')).toBe(true);
+    expect(weaponAmmo(after, 'player-1')).toBe(ammoBefore - 1);
+    expect(player.actionDeck.hand.length).toBe(handBefore);
+    expect(player.actionDeck.drawPile.length).toBe(drawBefore - 1);
+  });
+
+  it('«Адреналин» (побег): атаки в спину идут, карта добирается', () => {
+    const { engine, state, target } = cardSetup();
+
+    spawnIntruder(state, 11, 'ADULT', 'adrenaline-adult-1');
+    giveCard(state, 'player-1', classCard('ACT_SCO_ADRENALINE', 'Адреналин'));
+    rigAttackTop(state, 'Царапина');
+
+    const handBefore = state.players['player-1']!.actionDeck.hand.length;
+    const after = engine.processAction(state, {
+      type: 'ACTION_PLAY_CARD',
+      payload: { cardId: 'ACT_SCO_ADRENALINE', option: 'ESCAPE', targetRoomId: target },
+    });
+    const types = after.gameLog.map((entry) => entry.event.type);
+
+    expect(types).toContain('ESCAPE_ATTACK_RESOLVED');
+    expect(after.players['player-1']!.roomId).toBe(target);
+    expect(after.players['player-1']!.actionDeck.hand.length).toBe(handBefore);
+  });
+
+  it('«Адреналин» без режима отклоняется', () => {
+    const { engine, state } = cardSetup();
+
+    giveCard(state, 'player-1', classCard('ACT_SCO_ADRENALINE', 'Адреналин'));
+
+    expectEngineError(
+      () => engine.processAction(state, { type: 'ACTION_PLAY_CARD', payload: { cardId: 'ACT_SCO_ADRENALINE' } }),
+      'CARD_TARGET_REQUIRED',
+    );
+  });
+});
+
 describe('GameEngine: объявленные, но не реализованные действия', () => {
   it.each([
     ['ACTION_CLAIM', { type: 'ACTION_CLAIM', payload: { target: 'COORDINATES', declaredStatus: 'DESTINATION_EARTH' } }],
@@ -353,16 +893,12 @@ describe('Прерывания', () => {
     expect(state.ship.rooms[2]?.isExplored).toBe(true);
   });
 
-  it.each([
-    ['ENCOUNTER_INTERRUPT', { type: 'ENCOUNTER_INTERRUPT', roomId: 11, intruderTokenId: 'blank' }],
-    ['SURPRISE_ATTACK_INTERRUPT', { type: 'SURPRISE_ATTACK_INTERRUPT', playerId: 'player-1', intruderId: 'adult-1' }],
-    [
-      'ESCAPE_ATTACK_INTERRUPT',
-      { type: 'ESCAPE_ATTACK_INTERRUPT', playerId: 'player-1', intruderIds: [], targetRoomId: 11 },
-    ],
-  ])('отклоняет %s: прерывание ещё не разыгрывается движком', (_name, interrupt) => {
-    expectEngineError(() => resolveInterrupt(freshState(), interrupt as never), 'INTERRUPT_NOT_IMPLEMENTED');
-  });
+  it.each([['ENCOUNTER_INTERRUPT', { type: 'ENCOUNTER_INTERRUPT', roomId: 11, intruderTokenId: 'blank' }]])(
+    'отклоняет %s: прерывание ещё не разыгрывается движком',
+    (_name, interrupt) => {
+      expectEngineError(() => resolveInterrupt(freshState(), interrupt as never), 'INTERRUPT_NOT_IMPLEMENTED');
+    },
+  );
 
   it('разбирает очередь прерываний по порядку', () => {
     const state = freshState();
@@ -832,7 +1368,7 @@ describe('Кубик Шума (стр. 15, 17)', () => {
     expect(state.meta.rngDraws.noise).toBe(1);
   });
 
-  it('повторный маркер в Коридоре — Контакт, и он пока не разыгрывается', () => {
+  it('повторный маркер в Коридоре — Контакт: жетон вытягивается и Чужой появляется (стр. 15, 18)', () => {
     const engine = new GameEngine();
     const state = createInitialGameState(SEED);
 
@@ -842,21 +1378,22 @@ describe('Кубик Шума (стр. 15, 17)', () => {
     const numbered = Object.values(state.ship.corridors).find((corridor) => numbersOn(corridor, 6).includes(3))!;
 
     numbered.hasNoise = true;
-    const before = structuredClone(state);
+    state.intrudersPool.bag.unshift({ id: 'test-adult-1', type: 'ADULT', escapeNumber: 1 });
     const discardCardId = state.players['player-1']!.actionDeck.hand[0]!.id;
 
-    expectEngineError(
-      () =>
-        engine.processAction(state, {
-          type: 'ACTION_MOVE',
-          payload: { targetRoomId: 6, discardCardIds: [discardCardId] },
-        }),
-      'CONTACT_NOT_IMPLEMENTED',
-      /жетона Чужого/,
-    );
+    const next = engine.processAction(state, {
+      type: 'ACTION_MOVE',
+      payload: { targetRoomId: 6, discardCardIds: [discardCardId] },
+    });
 
-    // Действие отклонено целиком: иммер откатывает и перемещение, и бросок.
-    expect(state).toEqual(before);
+    const contact = next.gameLog.find((entry) => entry.event.type === 'CONTACT_OCCURRED');
+
+    expect(contact).toBeDefined();
+    expect(next.intrudersPool.boardTokens.map((entity) => entity.id)).toContain('test-adult-1');
+    expect(next.ship.rooms[6]?.occupantIntruderIds).toContain('test-adult-1');
+    expect(numbered.hasNoise).toBe(true);
+    expect(next.ship.corridors[numbered.id]?.hasNoise).toBe(false);
+    expect(next.interruptQueue).toEqual([]);
   });
 
   it('выпавший номер Входа уводит маркер на общее поле Технических Коридоров (стр. 15)', () => {
@@ -899,25 +1436,30 @@ describe('Кубик Шума (стр. 15, 17)', () => {
     );
   });
 
-  it('повторный маркер на Технических Коридорах — тоже Контакт', () => {
+  it('повторный маркер на Технических Коридорах — тоже Контакт (стр. 15, 18)', () => {
     const state = createInitialGameState(SEED);
 
     // У отсека 14 есть Вход в Технические Коридоры с номером 3 — это и есть грань сида.
     prepareRoll(state, 14);
     placePlayer(state, 14);
     state.ship.technicalCorridorNoise = true;
+    state.intrudersPool.bag.unshift({ id: 'test-creeper-1', type: 'CREEPER', escapeNumber: 1 });
 
-    expectEngineError(
-      () =>
-        resolveInterrupt(state, {
-          type: 'NOISE_ROLL_INTERRUPT',
-          playerId: 'player-1',
-          roomId: 14,
-          noise: { kind: 'ROLL' },
-        }),
-      'CONTACT_NOT_IMPLEMENTED',
-      /Технические Коридоры/,
-    );
+    resolveInterrupt(state, {
+      type: 'NOISE_ROLL_INTERRUPT',
+      playerId: 'player-1',
+      roomId: 14,
+      noise: { kind: 'ROLL' },
+    });
+
+    expect(state.interruptQueue).toEqual([{ type: 'CONTACT_INTERRUPT', playerId: 'player-1', roomId: 14 }]);
+
+    drainInterrupts(state);
+
+    expect(state.ship.technicalCorridorNoise).toBe(false);
+    expect(state.intrudersPool.boardTokens.map((entity) => entity.id)).toContain('test-creeper-1');
+    expect(state.gameLog.some((entry) => entry.event.type === 'CONTACT_OCCURRED')).toBe(true);
+    expect(state.interruptQueue).toEqual([]);
   });
 
   it('бросок для несуществующего отсека — ошибка контракта', () => {
diff --git a/packages/shared/src/logic/fsm.ts b/packages/shared/src/logic/fsm.ts
index 3c47d7e..3d794cc 100644
--- a/packages/shared/src/logic/fsm.ts
+++ b/packages/shared/src/logic/fsm.ts
@@ -1,7 +1,7 @@
 import { produce } from 'immer';
 
-import type { EngineAction } from '../types/actions.js';
-import type { ActionDeckCard, ItemCard } from '../types/cards.js';
+import type { EngineAction, PlayCardActionPayload } from '../types/actions.js';
+import type { ActionCard, ActionDeckCard, ItemCard } from '../types/cards.js';
 import type { InterruptEvent, NoiseRollMode } from '../types/interrupts.js';
 import type { GameLogEffectOutcome, GameLogNoiseReason } from '../types/log.js';
 import type {
@@ -16,9 +16,26 @@ import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1, SPECIAL_ROOMS } from '../data/roomDe
 import { NOISE_DIE_FACES, type NoiseDieFace } from '../data/noiseDie.js';
 import { SHIP_ROOM_NODES } from '../data/shipGraph.js';
 import { appendGameLog } from './gameLog.js';
+import {
+  queueContact,
+  resolveContactInterrupt,
+  resolveEscapeAttacks,
+  resolveSurpriseAttackInterrupt,
+} from './contact.js';
+import {
+  applyShootFace,
+  assertShootFaceAllowed,
+  drawCombatFace,
+  performBurstFire,
+  performMelee,
+  performShoot,
+  validateMeleeConditions,
+  validateShootConditions,
+} from './combat.js';
+import { performPickUpObject, validatePickUpConditions } from './objects.js';
 import { noiseMarkersInSupply, placeDoorToken, placeFireMarker, placeMalfunctionMarker } from './markers.js';
 import { drawFromStream } from '../utils/rng.js';
-import { executeCardPayment } from './cardsPayment.js';
+import { drawCardsToLimit, executeCardPayment } from './cardsPayment.js';
 import { advanceTurn } from './turnCycle.js';
 import { drawSearchCards, placeItemToPlayer, validateSearchConditions } from './search.js';
 import { executeRoomAbility } from './roomAbilities.js';
@@ -60,9 +77,21 @@ export type EngineErrorCode =
   | 'MARKER_SUPPLY_EXHAUSTED'
   /** Жетонов Дверей нет ни в запасе, ни среди закрытых Дверей на поле (стр. 17). */
   | 'DOOR_TOKEN_SUPPLY_EXHAUSTED'
-  /** Контакт: в Коридоре уже стоит маркер Шума (стр. 15); сам Контакт — этап 4 дорожной карты. */
-  | 'CONTACT_NOT_IMPLEMENTED'
-  /** Перемещение Чужих по эффекту «Опасность» появится вместе с Пулом Чужих (этап 4 дорожной карты). */
+  /** Пул Чужих пуст, а Контакт или Зов требуют вытянуть жетон. */
+  | 'INTRUDER_BAG_EMPTY'
+  /** Внезапная атака ссылается на Чужого, которого нет на поле. */
+  | 'UNKNOWN_INTRUDER'
+  /** Колода и сброс Заражения пусты, а эффект требует карту. */
+  | 'NO_CONTAMINATION_LEFT'
+  /** Колода и сброс Тяжёлых Травм пусты, а эффект требует карту. */
+  | 'NO_SERIOUS_WOUNDS_LEFT'
+  /** Колода и сброс Атак Чужих пусты, а Чужой должен атаковать. */
+  | 'NO_INTRUDER_ATTACKS_LEFT'
+  /** Трансформация требует Трутня из запаса, но оба уже в игре. */
+  | 'NO_BREEDER_IN_SUPPLY'
+  /** Карта Атаки Чужих без разбора эффекта в движке. */
+  | 'UNKNOWN_ATTACK_EFFECT'
+  /** Перемещение Чужих по эффекту «Опасность» — этап 5 дорожной карты. */
   | 'INTRUDER_MOVEMENT_NOT_IMPLEMENTED'
   /** Ошибки валидатора оплаты карт (v0.3.0 Шаг 3) */
   | 'INSUFFICIENT_ACTION_CARDS'
@@ -85,7 +114,24 @@ export type EngineErrorCode =
   | 'INVALID_DECISION'
   | 'INVALID_DECISION_OPTION'
   /** Ошибки действий отсеков (v0.3.0 Шаг 6) */
-  | 'ROOM_ABILITY_NOT_ALLOWED';
+  | 'ROOM_ABILITY_NOT_ALLOWED'
+  /** Ошибки Стрельбы (v0.4.0 Шаг 4) */
+  | 'SHOOT_TARGET_NOT_IN_ROOM'
+  | 'SHOOT_INVALID_WEAPON'
+  | 'SHOOT_NO_AMMO'
+  /** Огнемёт при [2 Ранах] ставит маркер Пожара — механика огня (Шаг 6). */
+  | 'SHOOT_FIRE_NOT_IMPLEMENTED'
+  /** Цель Рукопашной Атаки не в отсеке атакующего (v0.4.0 Шаг 5). */
+  | 'MELEE_TARGET_NOT_IN_ROOM'
+  /** Ошибки подбора Тяжёлых Объектов (v0.4.0 Шаг 6) */
+  | 'PICK_UP_OBJECT_NOT_HERE'
+  | 'PICK_UP_HANDS_FULL'
+  /** Классовые боевые карты (v0.4.0 Шаг 8) */
+  | 'CARD_TARGET_REQUIRED'
+  | 'INVALID_CARD_OPTION'
+  | 'CARD_NO_AMMO'
+  | 'CARD_COMPANION_NOT_HERE'
+  | 'BURST_FIRE_REQUIRES_RIFLE';
 
 export class EngineError extends Error {
   readonly code: EngineErrorCode;
@@ -183,8 +229,8 @@ export class GameEngine {
   /**
    * Применяет действие к состоянию партии и возвращает новое состояние.
    * Исходное состояние не меняется: работа идёт на immer-драфте. Если каскад
-   * прерываний отклоняет шаг (например, Контакт ещё не разыгрывается), откат
-   * возвращает партию к состоянию до действия целиком.
+   * прерываний отклоняет шаг, откат возвращает партию к состоянию до действия
+   * целиком.
    */
   processAction(state: GameState, action: EngineAction, options: ProcessActionOptions = {}): GameState {
     const actorId = options.actorId ?? state.meta.activePlayerId;
@@ -192,6 +238,7 @@ export class GameEngine {
     return produce(state, (draft) => {
       this.handleAction(draft, action, actorId, options);
       drainInterrupts(draft);
+      settleDeadActivePlayer(draft);
     });
   }
 
@@ -248,12 +295,11 @@ export class GameEngine {
     switch (action.type) {
       case 'ACTION_MOVE': {
         const targetRoomId = action.payload.targetRoomId;
-        const corridors = requireOpenPath(state, player.roomId, targetRoomId);
 
         // Стоимость базового действия «Движение» — 1 карта действия с руки (стр. 13)
         executeCardPayment(state, actorId, action.payload.discardCardIds, 1);
 
-        movePlayer(state, actorId, targetRoomId, corridors[0]!.id, { kind: 'ROLL' });
+        startMoveOrEscape(state, actorId, targetRoomId);
         player.actionsPerformedThisRound += 1;
         if (player.actionsPerformedThisRound >= 2) {
           advanceTurn(state, actorId);
@@ -282,6 +328,48 @@ export class GameEngine {
         return;
       }
 
+      case 'ACTION_SHOOT': {
+        validateShootConditions(state, actorId, action.payload.targetIntruderId, action.payload.weaponSlotIndex);
+
+        // Стоимость базового действия «Стрельба» — 1 карта действия с руки (стр. 18)
+        executeCardPayment(state, actorId, action.payload.discardCardIds, 1);
+
+        performShoot(state, actorId, action.payload.targetIntruderId, action.payload.weaponSlotIndex);
+        player.actionsPerformedThisRound += 1;
+        if (player.actionsPerformedThisRound >= 2) {
+          advanceTurn(state, actorId);
+        }
+        return;
+      }
+
+      case 'ACTION_MELEE': {
+        validateMeleeConditions(state, actorId, action.payload.targetIntruderId);
+
+        // Стоимость базового действия «Рукопашная Атака» — 1 карта действия с руки (стр. 19)
+        executeCardPayment(state, actorId, action.payload.discardCardIds, 1);
+
+        performMelee(state, actorId, action.payload.targetIntruderId);
+        player.actionsPerformedThisRound += 1;
+        if (player.actionsPerformedThisRound >= 2) {
+          advanceTurn(state, actorId);
+        }
+        return;
+      }
+
+      case 'ACTION_PICK_UP_OBJECT': {
+        validatePickUpConditions(state, actorId, action.payload.objectId);
+
+        // Стоимость базового действия «Поднять Тяжёлый Объект» — 1 карта действия с руки (стр. 13)
+        executeCardPayment(state, actorId, action.payload.discardCardIds, 1);
+
+        performPickUpObject(state, actorId, action.payload.objectId);
+        player.actionsPerformedThisRound += 1;
+        if (player.actionsPerformedThisRound >= 2) {
+          advanceTurn(state, actorId);
+        }
+        return;
+      }
+
       case 'DEV_TOGGLE_DOOR': {
         // Отладочный переключатель идёт тем же переходом, что и правила:
         // OPEN → CLOSED → DESTROYED, а Разрушенная Дверь — терминальное
@@ -522,6 +610,37 @@ export class GameEngine {
           return;
         }
 
+        if (decision.type === 'CHOOSE_AIMED_REROLL') {
+          const choice = action.payload.selectedOption;
+
+          if (choice !== 'KEEP' && choice !== 'REROLL') {
+            throw new EngineError(
+              'INVALID_DECISION_OPTION',
+              `«Прицельный огонь»: вариант «${choice}» — нужен «KEEP» или «REROLL».`,
+            );
+          }
+
+          // Решение снимается до выстрела: если переброс угодит в Огнемётные
+          // [2 Раны], откат вернёт решение на место и игрок выберет «Оставить».
+          state.pendingDecision = null;
+
+          const conditions = validateShootConditions(
+            state,
+            actorId,
+            decision.targetIntruderId,
+            decision.weaponSlotIndex,
+          );
+          const face = choice === 'REROLL' ? drawCombatFace(state) : decision.firstFace;
+
+          applyShootFace(state, actorId, conditions, face);
+
+          player.actionsPerformedThisRound += 1;
+          if (player.actionsPerformedThisRound >= 2) {
+            advanceTurn(state, actorId);
+          }
+          return;
+        }
+
         throw new EngineError(
           'INVALID_DECISION',
           `Тип решения не поддерживается: ${(decision as PendingDecision).type}`,
@@ -591,6 +710,29 @@ export class GameEngine {
           }
         }
 
+        // Классовые боевые карты (v0.4.0 Шаг 8): точные id из data/actionCards.ts.
+        // «Прицельный огонь» ставит решение о перебросе: действие засчитывается
+        // только после решения (как Поиск), поэтому счётчик — в ветке ниже.
+        if (CLASS_COMBAT_CARD_IDS.has(card.id)) {
+          const outcome = applyClassCombatCard(state, actorId, card, action.payload);
+
+          appendGameLog(state, {
+            type: 'ACTION_CARD_PLAYED',
+            playerId: actorId,
+            cardId: card.id,
+            cardName: card.name,
+          });
+
+          if (outcome === 'RESOLVED') {
+            player.actionsPerformedThisRound += 1;
+            if (player.actionsPerformedThisRound >= 2) {
+              advanceTurn(state, actorId);
+            }
+          }
+
+          return;
+        }
+
         appendGameLog(state, {
           type: 'ACTION_CARD_PLAYED',
           playerId: actorId,
@@ -825,6 +967,230 @@ function requireCarefulMoveAllowed(
  *    движения»; его могут отменить эффекты жетона и присутствие персонажа
  *    или Чужого в отсеке, стр. 14–15).
  */
+/** Классовые боевые карты с разобранными эффектами (data/actionCards.ts, v0.4.0 Шаг 8). */
+const CLASS_COMBAT_CARD_IDS: ReadonlySet<string> = new Set([
+  'ACT_SOL_BURST_FIRE',
+  'ACT_SOL_AIMED_FIRE',
+  'ACT_SOL_SUPPRESSIVE_FIRE',
+  'ACT_CAP_SUPPRESSIVE_FIRE',
+  'ACT_SCO_ADRENALINE',
+]);
+
+/**
+ * Эффекты классовых боевых карт. Карта уже оплачена и сброшена вызывающей
+ * веткой. Возвращает 'DECISION_PENDING', если действие продолжится решением
+ * («Прицельный огонь»), иначе 'RESOLVED'.
+ */
+function applyClassCombatCard(
+  state: GameState,
+  actorId: string,
+  card: ActionCard,
+  payload: PlayCardActionPayload,
+): 'RESOLVED' | 'DECISION_PENDING' {
+  switch (card.id) {
+    case 'ACT_SOL_BURST_FIRE': {
+      const { targetIntruderId, weaponSlotIndex } = requireShootTargets(payload, card.name);
+
+      performBurstFire(state, actorId, targetIntruderId, weaponSlotIndex);
+
+      return 'RESOLVED';
+    }
+
+    case 'ACT_SOL_AIMED_FIRE': {
+      const { targetIntruderId, weaponSlotIndex } = requireShootTargets(payload, card.name);
+      const conditions = validateShootConditions(state, actorId, targetIntruderId, weaponSlotIndex);
+      const firstFace = drawCombatFace(state);
+
+      assertShootFaceAllowed(conditions.weaponCard, firstFace);
+
+      state.pendingDecision = {
+        id: `aimed-reroll-${Date.now()}-${actorId}`,
+        playerId: actorId,
+        type: 'CHOOSE_AIMED_REROLL',
+        firstFace,
+        targetIntruderId,
+        weaponSlotIndex,
+      };
+
+      return 'DECISION_PENDING';
+    }
+
+    case 'ACT_SOL_SUPPRESSIVE_FIRE':
+      applyCoverMove(state, actorId, card.name, payload, true);
+
+      return 'RESOLVED';
+
+    case 'ACT_CAP_SUPPRESSIVE_FIRE':
+      applyCoverMove(state, actorId, card.name, payload, false);
+
+      return 'RESOLVED';
+
+    case 'ACT_SCO_ADRENALINE': {
+      const mode = payload.option;
+
+      if (mode !== 'SHOOT' && mode !== 'ESCAPE') {
+        throw new EngineError(
+          'CARD_TARGET_REQUIRED',
+          '«Адреналин» требует выбрать режим: option «SHOOT» или «ESCAPE».',
+        );
+      }
+
+      if (mode === 'SHOOT') {
+        const { targetIntruderId, weaponSlotIndex } = requireShootTargets(payload, card.name);
+
+        performShoot(state, actorId, targetIntruderId, weaponSlotIndex);
+      } else {
+        if (payload.targetRoomId === undefined) {
+          throw new EngineError('CARD_TARGET_REQUIRED', '«Адреналин» (Побег) требует целевой отсек.');
+        }
+
+        // Побег — настоящий, с внеочередными атаками: карта даёт действие,
+        // а не иммунитет (в отличие от Заградительного огня).
+        startMoveOrEscape(state, actorId, payload.targetRoomId);
+      }
+
+      const player = state.players[actorId]!;
+
+      drawCardsToLimit(state, actorId, player.actionDeck.hand.length + 1);
+
+      return 'RESOLVED';
+    }
+
+    default:
+      throw new EngineError(
+        'ACTION_NOT_IMPLEMENTED',
+        `Карта «${card.name}» (${card.id}) помечена боевой, но эффекта у неё нет.`,
+      );
+  }
+}
+
+/** Цели выстрела из payload: без них боевая карта не разыгрывается. */
+function requireShootTargets(
+  payload: PlayCardActionPayload,
+  cardName: string,
+): { targetIntruderId: string; weaponSlotIndex: number } {
+  if (payload.targetIntruderId === undefined || payload.weaponSlotIndex === undefined) {
+    throw new EngineError(
+      'CARD_TARGET_REQUIRED',
+      `«${cardName}» требует цель (targetIntruderId) и Оружие (weaponSlotIndex).`,
+    );
+  }
+
+  return { targetIntruderId: payload.targetIntruderId, weaponSlotIndex: payload.weaponSlotIndex };
+}
+
+/**
+ * «Заградительный огонь» / «Огонь на подавление»: сброс 1 Боезапаса и
+ * перемещение без Атак Чужих — себя и/или другого (Заградительный) либо
+ * себя или другого (Подавление). Шум и вскрытие — как обычно.
+ */
+function applyCoverMove(
+  state: GameState,
+  actorId: string,
+  cardName: string,
+  payload: PlayCardActionPayload,
+  allowBoth: boolean,
+): void {
+  const player = state.players[actorId];
+
+  if (!player) {
+    throw new EngineError('UNKNOWN_PLAYER', `Карта «${cardName}» от неизвестного персонажа: ${actorId}.`);
+  }
+
+  const targetRoomId = payload.targetRoomId;
+
+  if (targetRoomId === undefined) {
+    throw new EngineError('CARD_TARGET_REQUIRED', `«${cardName}» требует целевой отсек (targetRoomId).`);
+  }
+
+  const who = payload.option ?? 'SELF';
+  let movers: string[];
+
+  if (who === 'SELF') {
+    movers = [actorId];
+  } else if (who.startsWith('OTHER:') || who.startsWith('BOTH:')) {
+    const both = who.startsWith('BOTH:');
+    const otherId = who.slice(both ? 'BOTH:'.length : 'OTHER:'.length);
+
+    if (both && !allowBoth) {
+      throw new EngineError(
+        'INVALID_CARD_OPTION',
+        `«${cardName}» перемещает себя ИЛИ другого: обоих сразу умеет только «Заградительный огонь».`,
+      );
+    }
+
+    const other = state.players[otherId];
+
+    if (!other) {
+      throw new EngineError('UNKNOWN_PLAYER', `Карта «${cardName}» ссылается на неизвестного персонажа: ${otherId}.`);
+    }
+
+    if (other.isDead || other.roomId !== player.roomId) {
+      throw new EngineError(
+        'CARD_COMPANION_NOT_HERE',
+        `«${cardName}»: ${otherId} должен быть жив и находиться в том же отсеке.`,
+      );
+    }
+
+    if (otherId === actorId) {
+      throw new EngineError('INVALID_CARD_OPTION', `«${cardName}»: «другой» — не вы сами.`);
+    }
+
+    movers = both ? [actorId, otherId] : [otherId];
+  } else {
+    throw new EngineError(
+      'INVALID_CARD_OPTION',
+      `«${cardName}»: вариант «${who}» — нужен «SELF», «OTHER:<id>» или «BOTH:<id>».`,
+    );
+  }
+
+  const corridors = requireOpenPath(state, player.roomId, targetRoomId);
+  const weaponSlot = player.handSlots.find(
+    (slot) => slot.source === 'ITEM' && slot.card.isWeapon === true && (slot.card.ammo ?? 0) > 0,
+  );
+
+  if (!weaponSlot || weaponSlot.source !== 'ITEM') {
+    throw new EngineError('CARD_NO_AMMO', `«${cardName}» требует 1 ед. Боезапаса: заряженного Оружия в руках нет.`);
+  }
+
+  weaponSlot.card.ammo = weaponSlot.card.ammo! - 1;
+
+  for (const moverId of movers) {
+    movePlayer(state, moverId, targetRoomId, corridors[0]!.id, { kind: 'ROLL' });
+  }
+}
+
+/**
+ * Шаг в соседний отсек (стр. 14, 19): из отсека с Чужими — через прерывание
+ * Побега, иначе — сразу. Общее для ACTION_MOVE и «Адреналина».
+ */
+function startMoveOrEscape(state: GameState, actorId: string, targetRoomId: RoomId): void {
+  const player = state.players[actorId];
+
+  if (!player) {
+    throw new EngineError('UNKNOWN_PLAYER', `Движение от неизвестного персонажа: ${actorId}.`);
+  }
+
+  const corridors = requireOpenPath(state, player.roomId, targetRoomId);
+
+  // Побег (стр. 19): выход из отсека с Чужими оформляется прерыванием —
+  // каждая особь атакует до шага, погибший никуда не уходит.
+  const intruderIds = state.intrudersPool.boardTokens
+    .filter((entity) => entity.roomId === player.roomId)
+    .map((entity) => entity.id);
+
+  if (intruderIds.length > 0) {
+    state.interruptQueue.push({
+      type: 'ESCAPE_ATTACK_INTERRUPT',
+      playerId: actorId,
+      intruderIds,
+      targetRoomId,
+    });
+  } else {
+    movePlayer(state, actorId, targetRoomId, corridors[0]!.id, { kind: 'ROLL' });
+  }
+}
+
 function movePlayer(
   state: GameState,
   playerId: string,
@@ -867,6 +1233,28 @@ function movePlayer(
   ];
 }
 
+/**
+ * Ход погибшего активного игрока завершается сам: иначе партия встанет —
+ * мёртвый не может ни действовать, ни пасовать. Если живых не осталось
+ * вовсе, продолжать некому и партия заканчивается.
+ */
+function settleDeadActivePlayer(state: GameState): void {
+  if (state.meta.phase !== 'PLAYER_PHASE') return;
+
+  const active = state.players[state.meta.activePlayerId];
+
+  if (!active || !active.isDead || active.hasPassed) return;
+
+  active.hasPassed = true;
+
+  if (!Object.values(state.players).some((player) => !player.isDead)) {
+    endGame(state, 'ALL_PLAYERS_DEAD');
+    return;
+  }
+
+  advanceTurn(state, active.id);
+}
+
 /** Разбирает стек прерываний до конца: действие считается завершённым только тогда (tech_stack §4). */
 export function drainInterrupts(state: GameState): void {
   while (state.interruptQueue.length > 0) {
@@ -888,10 +1276,10 @@ export function drainInterrupts(state: GameState): void {
 /**
  * Разыгрывает одно прерывание.
  *
- * Реализованы вскрытие отсека и шум (бросок кубика и «Осторожное движение»).
- * Побег, Контакт и Внезапная атака требуют Пула Чужих, боя и колод: их разбор —
- * следующие этапы дорожной карты, поэтому движок отклоняет их явной ошибкой,
- * а не разыгрывает наугад.
+ * Реализованы вскрытие отсека, шум (бросок кубика и «Осторожное движение»),
+ * Контакт, Внезапная атака и Побег (атаки — до шага, перемещение — после,
+ * если персонаж выжил). Появление Чужих по картам Событий — этап 0.5.0,
+ * поэтому движок отклоняет его явной ошибкой, а не разыгрывает наугад.
  */
 export function resolveInterrupt(state: GameState, interrupt: InterruptEvent): void {
   switch (interrupt.type) {
@@ -903,6 +1291,18 @@ export function resolveInterrupt(state: GameState, interrupt: InterruptEvent): v
       resolveNoiseRoll(state, interrupt);
       return;
 
+    case 'CONTACT_INTERRUPT':
+      resolveContactInterrupt(state, interrupt);
+      return;
+
+    case 'SURPRISE_ATTACK_INTERRUPT':
+      resolveSurpriseAttackInterrupt(state, interrupt);
+      return;
+
+    case 'ESCAPE_ATTACK_INTERRUPT':
+      resolveEscapeAttack(state, interrupt);
+      return;
+
     default:
       throw new EngineError(
         'INTERRUPT_NOT_IMPLEMENTED',
@@ -920,6 +1320,26 @@ export function resolveInterrupt(state: GameState, interrupt: InterruptEvent): v
  * Эффекты «Тишина» и «Опасность» управляют шумом, поэтому их разыгрывает
  * следующее прерывание `NOISE_ROLL_INTERRUPT`, когда шум уже можно отменить.
  */
+/**
+ * Побег (стр. 19): разыгрывает внеочередные атаки из снимка прерывания и,
+ * если персонаж выжил, завершает шаг в целевой отсек обычным порядком
+ * (вскрытие тайла и шум оформляет `movePlayer` следующими прерываниями).
+ */
+function resolveEscapeAttack(
+  state: GameState,
+  interrupt: Extract<InterruptEvent, { type: 'ESCAPE_ATTACK_INTERRUPT' }>,
+): void {
+  resolveEscapeAttacks(state, interrupt.playerId, interrupt.intruderIds);
+
+  const player = state.players[interrupt.playerId];
+
+  if (!player || player.isDead) return;
+
+  const corridors = requireOpenPath(state, player.roomId, interrupt.targetRoomId);
+
+  movePlayer(state, interrupt.playerId, interrupt.targetRoomId, corridors[0]!.id, { kind: 'ROLL' });
+}
+
 function resolveExploreRoom(
   state: GameState,
   interrupt: Extract<InterruptEvent, { type: 'EXPLORE_ROOM_INTERRUPT' }>,
@@ -1354,9 +1774,8 @@ function corridorNumbersOf(corridor: CorridorConnection, roomId: RoomId): Corrid
 
 /**
  * Кладёт маркер Шума. В каждом Коридоре не может быть больше одного маркера:
- * попытка положить второй означает Контакт (стр. 15), а сам Контакт — вытягивание
- * жетона Чужого и Внезапная атака — появится вместе с Пулом Чужих (этап 4
- * дорожной карты), поэтому здесь движок отклоняет шаг явной ошибкой.
+ * попытка положить второй означает Контакт (стр. 15) — маркер не ставится,
+ * а в очередь уходит прерывание Контакта.
  */
 function placeNoiseMarker(
   state: GameState,
@@ -1367,7 +1786,8 @@ function placeNoiseMarker(
 ): void {
   if (target.kind === 'TECHNICAL_CORRIDOR') {
     if (state.ship.technicalCorridorNoise) {
-      throw contactError('Технические Коридоры');
+      queueContact(state, playerId, roomId);
+      return;
     }
 
     requireNoiseMarkerSupply(state);
@@ -1383,7 +1803,8 @@ function placeNoiseMarker(
   }
 
   if (target.corridor.hasNoise) {
-    throw contactError(`Коридор ${target.corridor.id}`);
+    queueContact(state, playerId, roomId);
+    return;
   }
 
   requireNoiseMarkerSupply(state);
@@ -1411,13 +1832,6 @@ function requireNoiseMarkerSupply(state: GameState): void {
   }
 }
 
-function contactError(place: string): EngineError {
-  return new EngineError(
-    'CONTACT_NOT_IMPLEMENTED',
-    `Контакт: в этом месте уже стоит маркер Шума (${place}). Вытягивание жетона Чужого появится вместе с Пулом Чужих (этап 4 дорожной карты).`,
-  );
-}
-
 /**
  * Эффект «Опасность» (стр. 14–15 и стр. 15): Чужой из соседнего отсека
  * перемещается сюда, а если Чужих рядом нет — по одному маркеру Шума в каждый
@@ -1436,7 +1850,7 @@ function resolveDanger(state: GameState, roomId: RoomId, playerId: string): void
   if (intrudersAround) {
     throw new EngineError(
       'INTRUDER_MOVEMENT_NOT_IMPLEMENTED',
-      'Эффект «Опасность» требует переместить Чужого из соседнего отсека: это появится вместе с Пулом Чужих (этап 4 дорожной карты).',
+      'Эффект «Опасность» требует переместить Чужого из соседнего отсека: это появится вместе с Фазой Событий (этап 5 дорожной карты).',
     );
   }
 
diff --git a/packages/shared/src/logic/objects.test.ts b/packages/shared/src/logic/objects.test.ts
new file mode 100644
index 0000000..ca96f53
--- /dev/null
+++ b/packages/shared/src/logic/objects.test.ts
@@ -0,0 +1,163 @@
+import { describe, expect, it } from 'vitest';
+
+import type { BoardObject, IntruderEntity, IntruderToken, IntruderType } from '../types/entities.js';
+import type { GameLogEvent } from '../types/log.js';
+import type { RoomId } from '../types/rooms.js';
+import type { GameState } from '../types/state.js';
+import { killIntruder } from './combat.js';
+import type { EngineErrorCode } from './fsm.js';
+import { EngineError, GameEngine } from './fsm.js';
+import { performPickUpObject, validatePickUpConditions } from './objects.js';
+import { createInitialGameState } from './setup.js';
+
+function freshState(seed = 'pickup-test'): GameState {
+  return createInitialGameState(seed, { playerCount: 1 });
+}
+
+function expectEngineError(run: () => unknown, code: EngineErrorCode): void {
+  try {
+    run();
+  } catch (error) {
+    expect(error).toBeInstanceOf(EngineError);
+    expect((error as EngineError).code).toBe(code);
+    return;
+  }
+
+  throw new Error(`Ожидалась ошибка движка с кодом ${code}, но действие прошло без ошибки.`);
+}
+
+function placeIntruder(state: GameState, type: IntruderType, roomId: RoomId): IntruderEntity {
+  const n = state.intrudersPool.boardTokens.length + 1;
+  const token: IntruderToken = { id: `token-test-${n}`, type, escapeNumber: 1 };
+  const entity: IntruderEntity = { id: `intruder-test-${n}`, type, roomId, woundsCount: 0, token };
+
+  state.intrudersPool.boardTokens.push(entity);
+  state.ship.rooms[roomId]!.occupantIntruderIds.push(entity.id);
+
+  return entity;
+}
+
+function logEvents(state: GameState): GameLogEvent[] {
+  return state.gameLog.map((entry) => entry.event);
+}
+
+describe('validatePickUpConditions', () => {
+  it('отклоняет подбор от неизвестного персонажа', () => {
+    const state = freshState();
+
+    expectEngineError(() => validatePickUpConditions(state, 'player-nope', 'obj-1'), 'UNKNOWN_PLAYER');
+  });
+
+  it('отклоняет подбор отсутствующего и чужого объекта', () => {
+    const state = freshState();
+    const player = state.players['player-1']!;
+
+    expectEngineError(() => validatePickUpConditions(state, 'player-1', 'object-nope'), 'PICK_UP_OBJECT_NOT_HERE');
+
+    const otherRoom = Number(Object.keys(state.ship.rooms).find((id) => Number(id) !== player.roomId)!);
+    const egg: BoardObject = { id: 'egg-far', kind: 'EGG' };
+    state.ship.rooms[otherRoom]!.objects.push(egg);
+
+    expectEngineError(() => validatePickUpConditions(state, 'player-1', 'egg-far'), 'PICK_UP_OBJECT_NOT_HERE');
+  });
+
+  it('отклоняет подбор занятыми руками', () => {
+    const state = freshState();
+    const player = state.players['player-1']!;
+    player.handSlots.push({ source: 'OBJECT', object: { id: 'egg-held', kind: 'EGG' } });
+    const corpse = state.ship.rooms[player.roomId]!.objects[0]!;
+
+    expectEngineError(() => validatePickUpConditions(state, 'player-1', corpse.id), 'PICK_UP_HANDS_FULL');
+  });
+});
+
+describe('performPickUpObject', () => {
+  it('поднимает Труп из стартовой комнаты в руки и пишет событие', () => {
+    const state = freshState('pickup-corpse');
+    const player = state.players['player-1']!;
+    const room = state.ship.rooms[player.roomId]!;
+    const corpse = room.objects[0]!;
+    expect(corpse.kind).toBe('CORPSE');
+
+    performPickUpObject(state, 'player-1', corpse.id);
+
+    expect(room.objects).toHaveLength(0);
+    expect(player.handSlots).toHaveLength(2);
+    const held = player.handSlots[1]!;
+    expect(held.source).toBe('OBJECT');
+    if (held.source !== 'OBJECT') throw new Error('Ожидался Объект в руке.');
+    expect(held.object.id).toBe(corpse.id);
+    const picked = logEvents(state).find((event) => event.type === 'OBJECT_PICKED_UP');
+    if (picked?.type !== 'OBJECT_PICKED_UP') throw new Error('Ожидалось событие OBJECT_PICKED_UP.');
+    expect(picked.objectId).toBe(corpse.id);
+    expect(picked.objectKind).toBe('CORPSE');
+  });
+
+  it('полный цикл: гибель Чужого → Останки на полу → подбор', () => {
+    const state = freshState('pickup-remains');
+    const player = state.players['player-1']!;
+    const intruder = placeIntruder(state, 'ADULT', player.roomId);
+
+    killIntruder(state, intruder, 'player-1');
+
+    const room = state.ship.rooms[player.roomId]!;
+    const remainsList = room.objects.filter((object) => object.kind === 'INTRUDER_REMAINS');
+    expect(remainsList).toHaveLength(1);
+    const remains = remainsList[0]!;
+
+    performPickUpObject(state, 'player-1', remains.id);
+
+    expect(room.objects.some((object) => object.kind === 'INTRUDER_REMAINS')).toBe(false);
+    expect(player.handSlots.some((slot) => slot.source === 'OBJECT')).toBe(true);
+  });
+});
+
+describe('ACTION_PICK_UP_OBJECT через GameEngine', () => {
+  it('оплачивает 1 карту, подбирает и засчитывает действие раунда', () => {
+    const engine = new GameEngine();
+    const state = freshState('pickup-action-flow');
+    const player = state.players['player-1']!;
+    const objectId = state.ship.rooms[player.roomId]!.objects[0]!.id;
+    const handBefore = player.actionDeck.hand.length;
+    const payCardId = player.actionDeck.hand[0]!.id;
+
+    const next = engine.processAction(state, {
+      type: 'ACTION_PICK_UP_OBJECT',
+      payload: { objectId, discardCardIds: [payCardId] },
+    });
+
+    expect(next.players['player-1']!.actionDeck.hand.length).toBe(handBefore - 1);
+    expect(next.players['player-1']!.actionsPerformedThisRound).toBe(1);
+    expect(logEvents(next).some((event) => event.type === 'OBJECT_PICKED_UP')).toBe(true);
+  });
+
+  it('проверяет условия до оплаты: неверный объект важнее пустой оплаты', () => {
+    const engine = new GameEngine();
+    const state = freshState('pickup-action-order');
+
+    expectEngineError(
+      () =>
+        engine.processAction(state, {
+          type: 'ACTION_PICK_UP_OBJECT',
+          payload: { objectId: 'object-nope', discardCardIds: [] },
+        }),
+      'PICK_UP_OBJECT_NOT_HERE',
+    );
+  });
+
+  it('без карты оплаты отклоняется ошибкой оплаты', () => {
+    const engine = new GameEngine();
+    const state = freshState('pickup-action-payment');
+    const player = state.players['player-1']!;
+    const objectId = state.ship.rooms[player.roomId]!.objects[0]!.id;
+
+    expectEngineError(
+      () =>
+        engine.processAction(state, {
+          type: 'ACTION_PICK_UP_OBJECT',
+          payload: { objectId, discardCardIds: [] },
+        }),
+      'INSUFFICIENT_ACTION_CARDS',
+    );
+  });
+});
diff --git a/packages/shared/src/logic/objects.ts b/packages/shared/src/logic/objects.ts
new file mode 100644
index 0000000..85129cb
--- /dev/null
+++ b/packages/shared/src/logic/objects.ts
@@ -0,0 +1,71 @@
+import { HAND_SLOT_COUNT } from '../data/setup.js';
+import type { BoardObject, PlayerState } from '../types/entities.js';
+import type { RoomState } from '../types/rooms.js';
+import type { GameState } from '../types/state.js';
+import { EngineError } from './fsm.js';
+import { appendGameLog } from './gameLog.js';
+
+/** Проверенные условия подбора: живые ссылки на состояние для `performPickUpObject`. */
+export interface PickUpConditions {
+  player: PlayerState;
+  room: RoomState;
+  object: BoardObject;
+}
+
+/**
+ * Условия базового действия «Поднять Тяжёлый Объект» (стр. 13): объект лежит
+ * на полу отсека персонажа, в руках есть свободный слот. Вызывается из fsm
+ * до оплаты, затем повторно внутри `performPickUpObject`, чтобы прямые
+ * вызовы тоже были безопасны.
+ */
+export function validatePickUpConditions(state: GameState, playerId: string, objectId: string): PickUpConditions {
+  const player = state.players[playerId];
+
+  if (!player) {
+    throw new EngineError('UNKNOWN_PLAYER', `Подбор объекта от неизвестного персонажа: ${playerId}.`);
+  }
+
+  const room = state.ship.rooms[player.roomId];
+
+  if (!room) {
+    throw new EngineError('UNKNOWN_ROOM', `Персонаж ${playerId} находится в несуществующем отсеке.`);
+  }
+
+  const object = room.objects.find((candidate) => candidate.id === objectId);
+
+  if (!object) {
+    throw new EngineError(
+      'PICK_UP_OBJECT_NOT_HERE',
+      `Объекта ${objectId} нет на полу отсека ${room.id}: поднимать можно только из своей Комнаты (стр. 13).`,
+    );
+  }
+
+  if (player.handSlots.length >= HAND_SLOT_COUNT) {
+    throw new EngineError(
+      'PICK_UP_HANDS_FULL',
+      `Обе руки персонажа ${playerId} заняты: сначала освободите слот руки (стр. 22).`,
+    );
+  }
+
+  return { player, room, object };
+}
+
+/**
+ * Подбор Тяжёлого Объекта целиком (стр. 13, 22): жетон переезжает с пола
+ * отсека в руки персонажа. Оплату картой Действия выполняет вызывающая
+ * ветка fsm до этого вызова.
+ */
+export function performPickUpObject(state: GameState, playerId: string, objectId: string): void {
+  const { player, room, object } = validatePickUpConditions(state, playerId, objectId);
+
+  room.objects = room.objects.filter((candidate) => candidate.id !== objectId);
+  player.handSlots.push({ source: 'OBJECT', object });
+
+  appendGameLog(state, {
+    type: 'OBJECT_PICKED_UP',
+    playerId,
+    roomId: room.id,
+    objectId: object.id,
+    objectKind: object.kind,
+  });
+}
diff --git a/packages/shared/src/logic/roomAbilities.test.ts b/packages/shared/src/logic/roomAbilities.test.ts
index 877829b..a7b5e6a 100644
--- a/packages/shared/src/logic/roomAbilities.test.ts
+++ b/packages/shared/src/logic/roomAbilities.test.ts
@@ -374,6 +374,67 @@ describe('Действия комнат (Room Abilities)', () => {
     expect(state.intrudersPool.weaknessSlots[0]!.card?.isRevealed).toBe(true);
   });
 
+  it('лаборатория (LABORATORY): кладёт изученный объект на пол и называет Слабость в журнале', () => {
+    const state = setupState();
+    const player = state.players['player-1']!;
+    giveHand(state, 'player-1', 4);
+
+    player.roomId = 9;
+    const room = state.ship.rooms[9]!;
+    room.isExplored = true;
+    room.definitionId = 'LABORATORY';
+    room.hasMalfunction = false;
+
+    player.handSlots = [
+      {
+        source: 'OBJECT',
+        object: { id: 'remains-test', kind: 'INTRUDER_REMAINS', intruderType: 'ADULT' },
+      },
+    ];
+
+    state.intrudersPool.weaknessSlots = [
+      {
+        objectKind: 'INTRUDER_REMAINS',
+        card: { id: 'weakness-2', name: 'Слабость останков', description: 'Слабость', isRevealed: false },
+      },
+    ];
+
+    executeRoomAbility(state, 'player-1', { targetObjectKind: 'INTRUDER_REMAINS' });
+
+    expect(player.handSlots).toHaveLength(0);
+    expect(room.objects.map((object) => object.id)).toContain('remains-test');
+    const entry = state.gameLog[state.gameLog.length - 1]!;
+    expect(entry.event.type).toBe('ROOM_ABILITY_USED');
+    if (entry.event.type !== 'ROOM_ABILITY_USED') throw new Error('Ожидалось событие ROOM_ABILITY_USED.');
+    expect(entry.event.detail).toContain('Слабость останков');
+  });
+
+  it('лаборатория (LABORATORY): без карты в слоте анализ отклоняется, объект остаётся в руках', () => {
+    const state = setupState();
+    const player = state.players['player-1']!;
+    giveHand(state, 'player-1', 4);
+
+    player.roomId = 9;
+    const room = state.ship.rooms[9]!;
+    room.isExplored = true;
+    room.definitionId = 'LABORATORY';
+    room.hasMalfunction = false;
+
+    player.handSlots = [
+      {
+        source: 'OBJECT',
+        object: { id: 'remains-test', kind: 'INTRUDER_REMAINS', intruderType: 'ADULT' },
+      },
+    ];
+
+    state.intrudersPool.weaknessSlots = [{ objectKind: 'INTRUDER_REMAINS', card: null }];
+
+    expect(() => {
+      executeRoomAbility(state, 'player-1', { targetObjectKind: 'INTRUDER_REMAINS' });
+    }).toThrowError(/нет карты/);
+    expect(player.handSlots).toHaveLength(1);
+  });
+
   it('GameEngine: корректно списывает 2 карты действия за ACTION_ROOM_ABILITY', () => {
     const engine = new GameEngine();
     const state = setupState();
diff --git a/packages/shared/src/logic/roomAbilities.ts b/packages/shared/src/logic/roomAbilities.ts
index 5586d7f..522fc62 100644
--- a/packages/shared/src/logic/roomAbilities.ts
+++ b/packages/shared/src/logic/roomAbilities.ts
@@ -245,21 +245,33 @@ export function executeRoomAbility(state: GameState, actorId: string, payload: R
         throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', `У персонажа в руках нет объекта типа ${targetKind}`);
       }
 
-      // Сбрасываем объект из рук
-      player.handSlots.splice(slotIndex, 1);
-
-      // Раскрываем соответствующий слот Слабости
+      // В слоте обязана лежать карта сетапа: молча глотать анализ нельзя.
       const weaknessSlot = state.intrudersPool.weaknessSlots.find((s) => s.objectKind === targetKind);
-      if (weaknessSlot && weaknessSlot.card) {
-        weaknessSlot.card.isRevealed = true;
+
+      if (!weaknessSlot?.card) {
+        throw new EngineError(
+          'ROOM_ABILITY_NOT_ALLOWED',
+          `В слоте Слабости для ${targetKind} нет карты: анализировать нечего.`,
+        );
       }
 
+      // Изученный объект не исчезает: жетон остаётся на полу Лаборатории (стр. 22).
+      const [studiedSlot] = player.handSlots.splice(slotIndex, 1);
+      const studiedObject = studiedSlot?.source === 'OBJECT' ? studiedSlot.object : undefined;
+
+      if (!studiedObject) {
+        throw new EngineError('ROOM_ABILITY_NOT_ALLOWED', 'Слот руки пуст: изучать нечего.');
+      }
+
+      room.objects.push(studiedObject);
+      weaknessSlot.card.isRevealed = true;
+
       appendGameLog(state, {
         type: 'ROOM_ABILITY_USED',
         playerId: actorId,
         roomId: room.id,
         roomDefinitionId: 'LABORATORY',
-        detail: `Изучен объект ${targetKind}, открыта карта Слабости`,
+        detail: `Изучен объект ${targetKind}, раскрыта Слабость «${weaknessSlot.card.name}»`,
       });
       break;
     }
diff --git a/packages/shared/src/logic/sanitizer.test.ts b/packages/shared/src/logic/sanitizer.test.ts
index 15ebd86..742ef5b 100644
--- a/packages/shared/src/logic/sanitizer.test.ts
+++ b/packages/shared/src/logic/sanitizer.test.ts
@@ -1,6 +1,7 @@
 import { describe, expect, it } from 'vitest';
 
 import type { EngineErrorCode } from './fsm.js';
+import type { IntruderEntity } from '../types/entities.js';
 import { EngineError } from './fsm.js';
 import { filterStateForPlayer } from './sanitizer.js';
 import { createInitialGameState } from './setup.js';
@@ -381,6 +382,32 @@ describe('filterStateForPlayer: колоды корабля (Э2-5)', () => {
     expect(serialized).toContain('red-discard-1');
   });
 
+  it('колоду Атак Чужих отдаёт числом, а сброс — открыто: разыгранные карты лежат лицом вверх', () => {
+    const state = freshState();
+    const attackCard = (id: string) => ({
+      id,
+      name: 'Царапина',
+      fortitude: 1,
+      hasRetreatArrow: false,
+      attackerTypes: ['ADULT'],
+      effect: 'test',
+    });
+
+    state.decks.intruderAttacks = {
+      drawPile: [attackCard('attack-draw-1'), attackCard('attack-draw-2')],
+      discard: [attackCard('attack-discard-1')],
+    } as never;
+
+    const view = filterStateForPlayer(state, VIEWER);
+    const serialized = JSON.stringify(view);
+
+    expect(view.decks.intruderAttacks.drawPileCount).toBe(2);
+    expect(view.decks.intruderAttacks.discard.map((card) => card.id)).toEqual(['attack-discard-1']);
+    expect(serialized).not.toContain('attack-draw-1');
+    expect(serialized).not.toContain('attack-draw-2');
+    expect(serialized).toContain('attack-discard-1');
+  });
+
   it('у колоды Заражения, Целей и Слабостей скрыт и сброс: наружу уходят только числа', () => {
     const state = freshState();
 
@@ -453,3 +480,56 @@ describe('filterStateForPlayer: колоды корабля (Э2-5)', () => {
     }
   });
 });
+
+describe('filterStateForPlayer: Чужие на поле (этап 0.4.0, шаг 3)', () => {
+  it('передаёт в срез монстров исследованного отсека и их раны', () => {
+    const state = freshState();
+    const room = state.ship.rooms[11]!;
+
+    expect(room.isExplored).toBe(true);
+
+    const entity: IntruderEntity = {
+      id: 'test-adult-1',
+      type: 'ADULT',
+      roomId: 11,
+      woundsCount: 2,
+      token: { id: 'test-adult-1', type: 'ADULT', escapeNumber: 4 },
+    };
+
+    state.intrudersPool.boardTokens.push(entity);
+    room.occupantIntruderIds.push(entity.id);
+
+    const view = filterStateForPlayer(state, VIEWER);
+
+    expect(view.ship.rooms[11]?.occupantIntruderIds).toEqual(['test-adult-1']);
+    expect(view.intrudersPool.boardTokens).toHaveLength(1);
+    expect(view.intrudersPool.boardTokens[0]).toMatchObject({
+      id: 'test-adult-1',
+      type: 'ADULT',
+      roomId: 11,
+      woundsCount: 2,
+    });
+  });
+});
+
+describe('filterStateForPlayer: чужие решения (Шаг 8)', () => {
+  it('владелец видит свой переброс с первой гранью, остальные — null', () => {
+    const state = createInitialGameState(SEED, { playerCount: 2 });
+
+    state.pendingDecision = {
+      id: 'aimed-sanitize',
+      playerId: 'player-1',
+      type: 'CHOOSE_AIMED_REROLL',
+      firstFace: 'MISS',
+      targetIntruderId: 't-adult',
+      weaponSlotIndex: 0,
+    };
+
+    const owner = filterStateForPlayer(state, 'player-1');
+    const stranger = filterStateForPlayer(state, 'player-2');
+
+    expect(owner.pendingDecision).toMatchObject({ id: 'aimed-sanitize', firstFace: 'MISS' });
+    expect(stranger.pendingDecision).toBeNull();
+    expect(JSON.stringify(stranger)).not.toContain('aimed-sanitize');
+  });
+});
diff --git a/packages/shared/src/logic/setup.party.test.ts b/packages/shared/src/logic/setup.party.test.ts
index 0ffcccc..fcbb1e1 100644
--- a/packages/shared/src/logic/setup.party.test.ts
+++ b/packages/shared/src/logic/setup.party.test.ts
@@ -1,6 +1,7 @@
 import { describe, expect, it } from 'vitest';
 
 import { CHARACTERS, MAX_PLAYER_COUNT, WEAKNESS_SLOT_OBJECT_KINDS } from '../data/setup.js';
+import { WEAKNESS_CARDS } from '../data/weaknessCards.js';
 import { createInitialGameState, explorationTokenAt } from './setup.js';
 
 describe('createInitialGameState: состав партии по числу игроков', () => {
@@ -82,10 +83,17 @@ describe('createInitialGameState: Планшет Чужих', () => {
     expect(new Set(slots.map((slot) => slot.objectKind)).size).toBe(3);
   });
 
-  it('оставляет слоты Слабостей пустыми до появления данных о картах', () => {
+  it('раздаёт в слоты 3 различные карты Слабостей рубашкой вверх (стр. 6, шаг 9)', () => {
     const slots = createInitialGameState('nemesis-alpha').intrudersPool.weaknessSlots;
+    const ids = slots.map((slot) => slot.card?.id);
 
-    expect(slots.every((slot) => slot.card === null)).toBe(true);
+    expect(ids.every((id) => id !== undefined)).toBe(true);
+    expect(new Set(ids).size).toBe(3);
+    expect(slots.every((slot) => slot.card?.isRevealed === false)).toBe(true);
+
+    for (const id of ids) {
+      expect(WEAKNESS_CARDS.some((card) => card.id === id)).toBe(true);
+    }
   });
 });
 
diff --git a/packages/shared/src/logic/setup.test.ts b/packages/shared/src/logic/setup.test.ts
index 8d9d774..34b2842 100644
--- a/packages/shared/src/logic/setup.test.ts
+++ b/packages/shared/src/logic/setup.test.ts
@@ -6,6 +6,8 @@ import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1 } from '../data/roomDefinitions.js';
 import { SHIP_CORRIDORS, SHIP_ROOM_NODES } from '../data/shipGraph.js';
 import { EXPLORATION_TOKENS } from '../data/explorationTokens.js';
 import { COORDINATE_DESTINATIONS, ESCAPE_POD_NUMBERS } from '../data/setup.js';
+import { STARTING_WEAPONS } from '../data/startingItems.js';
+import { WEAKNESS_CARDS } from '../data/weaknessCards.js';
 import { GAME_STATE_SCHEMA_VERSION } from '../types/state.js';
 import { createInitialGameState } from './setup.js';
 
@@ -307,7 +309,7 @@ describe('createInitialGameState: колоды партии', () => {
     }
   });
 
-  it('создаёт наполненные и пустые колоды в соответствии со спецификацией v0.3.0', () => {
+  it('создаёт наполненные и пустые колоды в соответствии со спецификацией v0.4.0 (шаг 1)', () => {
     const { craftedItems, contamination, weaknesses, seriousWounds, events, intruderAttacks, objectives } =
       createInitialGameState('nemesis-alpha').decks;
 
@@ -317,10 +319,11 @@ describe('createInitialGameState: колоды партии', () => {
     expect(contamination.discard).toEqual([]);
     expect(seriousWounds.drawPile).toHaveLength(16);
     expect(seriousWounds.discard).toEqual([]);
+    expect(intruderAttacks.drawPile).toHaveLength(20);
+    expect(intruderAttacks.discard).toEqual([]);
 
     expect(weaknesses).toEqual({ drawPile: [], discard: [] });
     expect(events).toEqual({ drawPile: [], discard: [] });
-    expect(intruderAttacks).toEqual({ drawPile: [], discard: [] });
     expect(objectives.personal).toEqual({ drawPile: [], discard: [] });
     expect(objectives.corporate).toEqual({ drawPile: [], discard: [] });
   });
@@ -441,3 +444,55 @@ describe('createInitialGameState: Спасательные Капсулы', () =
     }
   });
 });
+
+describe('createInitialGameState: стартовое оружие', () => {
+  it('выдаёт каждой партии независимую копию оружия (выстрел мутирует боезапас)', () => {
+    const first = createInitialGameState('weapon-copy-a', { playerCount: 1 });
+    const second = createInitialGameState('weapon-copy-b', { playerCount: 1 });
+    const slotA = first.players['player-1']!.handSlots[0]!;
+    const slotB = second.players['player-1']!.handSlots[0]!;
+
+    if (slotA.source !== 'ITEM' || slotB.source !== 'ITEM') {
+      throw new Error('В сетапе ожидалось оружие в руке.');
+    }
+
+    slotA.card.ammo = 0;
+
+    expect(slotB.card.ammo).toBe(slotB.card.maxAmmo);
+    expect(slotB.card.ammo).toBeGreaterThan(0);
+
+    const characterClass = first.players['player-1']!.characterClass;
+    expect(STARTING_WEAPONS[characterClass].ammo).toBe(STARTING_WEAPONS[characterClass].maxAmmo);
+  });
+});
+
+describe('createInitialGameState: слоты Слабостей', () => {
+  it('раздаёт 3 различные карты рубашкой вверх (стр. 6, шаг 9)', () => {
+    for (const seed of SEEDS) {
+      const slots = createInitialGameState(seed).intrudersPool.weaknessSlots;
+
+      expect(slots).toHaveLength(3);
+
+      const ids: string[] = [];
+
+      for (const slot of slots) {
+        expect(slot.card).not.toBeNull();
+        expect(slot.card!.isRevealed).toBe(false);
+        expect(WEAKNESS_CARDS.some((card) => card.id === slot.card!.id)).toBe(true);
+        ids.push(slot.card!.id);
+      }
+
+      expect(new Set(ids).size).toBe(3);
+    }
+  });
+
+  it('выдаёт независимые копии карт: переворот не портит данные', () => {
+    const first = createInitialGameState('weakness-copy-a');
+    const card = first.intrudersPool.weaknessSlots[0]!.card!;
+
+    card.isRevealed = true;
+
+    const source = WEAKNESS_CARDS.find((candidate) => candidate.id === card.id)!;
+    expect(source.isRevealed).toBe(false);
+  });
+});
diff --git a/packages/shared/src/logic/setup.ts b/packages/shared/src/logic/setup.ts
index bd25d3b..f8ef582 100644
--- a/packages/shared/src/logic/setup.ts
+++ b/packages/shared/src/logic/setup.ts
@@ -7,6 +7,7 @@ import { STARTING_WEAPONS } from '../data/startingItems.js';
 import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1 } from '../data/roomDefinitions.js';
 import { EXPLORATION_TOKENS } from '../data/explorationTokens.js';
 import { createIntruderSupply, splitIntruderBag } from '../data/intruderPool.js';
+import { WEAKNESS_CARDS } from '../data/weaknessCards.js';
 import { SHIP_CORRIDORS, SHIP_ROOM_NODES } from '../data/shipGraph.js';
 import {
   CHARACTERS,
@@ -20,7 +21,7 @@ import {
 } from '../data/setup.js';
 import { GAME_STATE_SCHEMA_VERSION } from '../types/state.js';
 import { createInitialGameLog } from './gameLog.js';
-import { createRng, createRngDraws, shuffle } from '../utils/rng.js';
+import { createRng, createRngDraws, shuffle, type Rng } from '../utils/rng.js';
 
 export const DEFAULT_SEED = 'nemesis-default-seed';
 
@@ -47,8 +48,18 @@ const ENGINE_NUMBERS = [1, 2, 3] as const;
  * тип Объекта — Труп, Яйцо и Останки (стр. 6, шаг 9; стр. 21). Состав карт
  * появится вместе с данными о колодах, поэтому слоты создаются пустыми.
  */
-function createWeaknessSlots(): GameState['intrudersPool']['weaknessSlots'] {
-  return WEAKNESS_SLOT_OBJECT_KINDS.map((objectKind) => ({ objectKind, card: null }));
+/**
+ * Слоты Слабостей: 3 случайные карты рубашкой вверх (стр. 6, шаг 9), остальные
+ * возвращаются в коробку. Тасуется потоком `layout` последним в подготовке —
+ * раздачи выше по коду сид не меняет. Карты клонируются: переворот мутирует.
+ */
+function createWeaknessSlots(rng: Rng): GameState['intrudersPool']['weaknessSlots'] {
+  const dealt = shuffle(rng, WEAKNESS_CARDS).slice(0, WEAKNESS_SLOT_OBJECT_KINDS.length);
+
+  return WEAKNESS_SLOT_OBJECT_KINDS.map((objectKind, index) => ({
+    objectKind,
+    card: { ...dealt[index]!, isRevealed: false },
+  }));
 }
 
 /**
@@ -72,7 +83,9 @@ function createEscapePods(playerCount: number, podNumbers: number[]): Record<str
 function createPlayer(playerId: string, preset: CharacterPreset, orderNumber: number, seed: string): PlayerState {
   const actionDeckCards = createActionDeckForCharacter(preset.characterClass, seed, orderNumber);
   const startingWeapon = STARTING_WEAPONS[preset.characterClass];
-  const handSlots = startingWeapon ? [{ source: 'ITEM' as const, card: startingWeapon }] : [];
+  // Копия, а не ссылка: выстрел мутирует боезапас, и общий объект данных
+  // потёк бы между партиями (новую игру начинали бы с пустым оружием).
+  const handSlots = startingWeapon ? [{ source: 'ITEM' as const, card: { ...startingWeapon } }] : [];
 
   const initialHand = actionDeckCards.slice(0, 5);
   const initialDrawPile = actionDeckCards.slice(5);
@@ -95,6 +108,7 @@ function createPlayer(playerId: string, preset: CharacterPreset, orderNumber: nu
     seriousWounds: [],
     objectives: [],
     hasSlime: false,
+    hasLarva: false,
     hasSignalSent: false,
     isInHibernation: false,
     hasEscapedInPod: false,
@@ -322,7 +336,7 @@ export function createInitialGameState(seed: string = DEFAULT_SEED, options: Ini
       boardTokens: [],
       deadTokens: [],
       eggsOnBoard: 5,
-      weaknessSlots: createWeaknessSlots(),
+      weaknessSlots: createWeaknessSlots(rng),
     },
 
     decks: createInitialDecks(seed),
diff --git a/packages/shared/src/types/actions.ts b/packages/shared/src/types/actions.ts
index 843588e..95ff51b 100644
--- a/packages/shared/src/types/actions.ts
+++ b/packages/shared/src/types/actions.ts
@@ -25,6 +25,10 @@ export type PlayCardActionPayload = {
   option?: string;
   targetRoomId?: RoomId;
   targetCorridorId?: string;
+  /** Боевые карты: цель выстрела («Стрельба очередью», «Прицельный огонь», «Адреналин»). */
+  targetIntruderId?: string;
+  /** Боевые карты: слот руки с Оружием для выстрела. */
+  weaponSlotIndex?: number;
 };
 
 export type UseItemActionPayload = {
@@ -48,6 +52,26 @@ export type GameAction =
       payload: { targetRoomId: RoomId; chosenCorridor: CarefulMoveChosenCorridor; discardCardIds: string[] };
     }
   | { type: 'ACTION_SEARCH'; payload: { chosenDeckColor?: ItemDeckColor; discardCardIds: string[] } }
+  /**
+   * «Поднять Тяжёлый Объект» [1] (стр. 13): Труп, Останки или Яйцо с пола
+   * своего отсека в свободный слот руки. Оплата — 1 карта Действия.
+   */
+  | { type: 'ACTION_PICK_UP_OBJECT'; payload: { objectId: string; discardCardIds: string[] } }
+  /**
+   * «Рукопашная Атака» [1] (стр. 19): атака Чужого в том же отсеке без
+   * расхода патронов. Персонаж сначала берёт 1 Заражение в сброс, затем
+   * бросает кубик; промах наносит ему 1 Тяжёлую Травму. Оплата — 1 карта Действия.
+   */
+  | { type: 'ACTION_MELEE'; payload: { targetIntruderId: string; discardCardIds: string[] } }
+  /**
+   * «Стрельба» [1] (стр. 18): выстрел по Чужому в том же отсеке из Оружия
+   * в руке с ≥1 Боезапаса. `weaponSlotIndex` — индекс слота руки с оружием.
+   * Оплата — 1 карта Действия.
+   */
+  | {
+      type: 'ACTION_SHOOT';
+      payload: { targetIntruderId: string; weaponSlotIndex: number; discardCardIds: string[] };
+    }
   | { type: 'ACTION_ROOM_ABILITY'; payload: RoomAbilityPayload }
   | { type: 'ACTION_PLAY_CARD'; payload: PlayCardActionPayload }
   | { type: 'ACTION_USE_ITEM'; payload: UseItemActionPayload }
diff --git a/packages/shared/src/types/cards.ts b/packages/shared/src/types/cards.ts
index f6e1d59..803c791 100644
--- a/packages/shared/src/types/cards.ts
+++ b/packages/shared/src/types/cards.ts
@@ -1,4 +1,4 @@
-import type { CharacterClass } from './entities.js';
+import type { CharacterClass, IntruderType } from './entities.js';
 
 /**
  * Карты, колоды и компоненты крафта.
@@ -136,8 +136,11 @@ export interface ObjectiveCard extends CardDefinition {
 /** Карта Событий: сдвигает Чужих по номерам коридоров и разыгрывает текст (стр. 10). */
 export type EventCard = CardDefinition;
 
-/** Карта Атаки Чужих: стойкость Чужого — сумма двух таких карт (стр. 20). */
-export type IntruderAttackCard = CardDefinition;
+export interface IntruderAttackCard extends CardDefinition {
+  toughness: number;
+  hasRetreat: boolean;
+  attackerTypes: readonly IntruderType[];
+}
 
 /**
  * Карта Слабости Чужих. Всего их 8, в партию попадают 3 случайные и лежат
diff --git a/packages/shared/src/types/decisions.ts b/packages/shared/src/types/decisions.ts
index 1eff54f..8b8a8d6 100644
--- a/packages/shared/src/types/decisions.ts
+++ b/packages/shared/src/types/decisions.ts
@@ -1,5 +1,6 @@
 import type { ItemDeckColor } from './cards.js';
 import type { RoomId } from './rooms.js';
+import type { CombatDieFace } from '../data/combatDie.js';
 
 export type PendingDecision =
   | {
@@ -39,4 +40,13 @@ export type PendingDecision =
       playerId: string;
       type: 'CHOOSE_REST_CONTAMINATION_DISCARD';
       scannedCardIds: string[];
+    }
+  | {
+      id: string;
+      playerId: string;
+      type: 'CHOOSE_AIMED_REROLL';
+      /** Первая грань: игрок видит её до решения. */
+      firstFace: CombatDieFace;
+      targetIntruderId: string;
+      weaponSlotIndex: number;
     };
diff --git a/packages/shared/src/types/entities.ts b/packages/shared/src/types/entities.ts
index d2cca17..a2ed889 100644
--- a/packages/shared/src/types/entities.ts
+++ b/packages/shared/src/types/entities.ts
@@ -13,12 +13,14 @@ export interface IntruderToken {
   escapeNumber: number;
 }
 
-/** Чужой на поле: миниатюра с накопленными ранами. */
+/** Чужой на поле: миниатюра с накопленными ранами и отложенным жетоном. */
 export interface IntruderEntity {
   id: string;
   type: IntruderType;
   roomId: RoomId;
   woundsCount: number;
+  /** Вытянутый жетон: отложен при появлении и вернётся в пул при отступлении в вентиляцию. */
+  token: IntruderToken;
 }
 
 /**
@@ -87,6 +89,8 @@ export interface PlayerState {
   objectives: ObjectiveCard[]; // 1 личная и 1 корпоративная цель
   /** Маркер Слизи лежит на планшете Персонажа, а не в отсеке (стр. 15). */
   hasSlime: boolean;
+  /** Личинка на планшете Персонажа после атаки-инфицирования (стр. 20). */
+  hasLarva: boolean;
   hasSignalSent: boolean;
   isInHibernation: boolean;
   hasEscapedInPod: boolean;
diff --git a/packages/shared/src/types/interrupts.ts b/packages/shared/src/types/interrupts.ts
index 626a213..5c112ec 100644
--- a/packages/shared/src/types/interrupts.ts
+++ b/packages/shared/src/types/interrupts.ts
@@ -22,6 +22,11 @@ export type InterruptEvent =
    * в выбранный игроком Коридор (стр. 13).
    */
   | { type: 'NOISE_ROLL_INTERRUPT'; playerId: string; roomId: RoomId; noise: NoiseRollMode }
+  /**
+   * Контакт: маркер Шума лёг бы вторым — сброс маркеров, жетон из мешка,
+   * появление Чужого и проверка Внезапной атаки (стр. 18).
+   */
+  | { type: 'CONTACT_INTERRUPT'; playerId: string; roomId: RoomId }
   /** Контакт: вытянутый из мешка жетон Чужого появляется на поле. */
   | { type: 'ENCOUNTER_INTERRUPT'; roomId: RoomId; intruderTokenId: string }
   /** Внезапная атака: карт на руке меньше числа на жетоне (стр. 18). */
diff --git a/packages/shared/src/types/log.ts b/packages/shared/src/types/log.ts
index 5785d80..fb8de0b 100644
--- a/packages/shared/src/types/log.ts
+++ b/packages/shared/src/types/log.ts
@@ -1,4 +1,6 @@
+import type { CombatDieFace } from '../data/combatDie.js';
 import type { NoiseDieFace } from '../data/noiseDie.js';
+import type { BoardObject, IntruderToken, IntruderType } from './entities.js';
 import type { GameOverReason } from './state.js';
 import type { ExplorationEffect, RoomId, RoomSlotCategory } from './rooms.js';
 
@@ -6,7 +8,27 @@ export type GameLogMovementMode = 'NORMAL' | 'CAREFUL';
 
 export type GameLogNoiseTarget = { kind: 'CORRIDOR'; corridorId: string } | { kind: 'TECHNICAL_CORRIDOR' };
 
-export type GameLogNoiseReason = 'ROLL' | 'CAREFUL' | 'DANGER';
+export type GameLogNoiseReason = 'ROLL' | 'CAREFUL' | 'DANGER' | 'BLANK';
+
+/** Чем закончилась разыгранная Внезапная атака для атакованного персонажа. */
+export type SurpriseAttackOutcome = 'MISSED' | 'HIT_SURVIVED' | 'HIT_DIED' | 'LARVA_INFECTION';
+
+/** Исход внеочередной атаки при Побеге: процедура та же, что у Внезапной (стр. 20). */
+export type EscapeAttackOutcome = SurpriseAttackOutcome;
+
+/**
+ * Снимок карты Атаки, вытянутой для проверки Стойкости: сама карта уходит
+ * в сброс, а журнал хранит только нужное для разбора (стр. 18).
+ */
+export interface ToughnessCheckCardSnapshot {
+  id: string;
+  name: string;
+  toughness: number;
+  hasRetreat: boolean;
+}
+
+/** От чего погиб персонаж. Пока только атаки Чужих; остальные причины — следующие этапы. */
+export type PlayerDeathCause = 'INTRUDER_ATTACK';
 
 export type GameLogNoiseSkippedReason = 'COMPANION' | 'EXPLORATION_SILENCE' | 'NOISE_SILENCE' | 'UNMAPPED_EXIT';
 
@@ -117,6 +139,124 @@ export type GameLogEvent =
       roomId: RoomId;
       reason: GameLogNoiseSkippedReason;
     }
+  | {
+      type: 'CONTACT_OCCURRED';
+      playerId: string;
+      roomId: RoomId;
+      tokenType: IntruderToken['type'];
+      escapeNumber: number;
+      handCount: number;
+      isFirstContact: boolean;
+      clearedCorridorIds: string[];
+      clearedTechnical: boolean;
+    }
+  | {
+      type: 'SURPRISE_ATTACK_TRIGGERED';
+      playerId: string;
+      intruderId: string;
+      intruderType: IntruderType;
+      handCount: number;
+      escapeNumber: number;
+    }
+  | {
+      type: 'SURPRISE_ATTACK_RESOLVED';
+      playerId: string;
+      intruderId: string;
+      intruderType: IntruderType;
+      attackCardId: string | null;
+      attackCardName: string | null;
+      hit: boolean;
+      outcome: SurpriseAttackOutcome;
+      lightWoundsDealt: number;
+      seriousWoundsDealt: number;
+      contaminationDealt: number;
+    }
+  | {
+      type: 'ESCAPE_ATTACK_RESOLVED';
+      playerId: string;
+      intruderId: string;
+      intruderType: IntruderType;
+      attackCardId: string | null;
+      attackCardName: string | null;
+      hit: boolean;
+      outcome: EscapeAttackOutcome;
+      lightWoundsDealt: number;
+      seriousWoundsDealt: number;
+      contaminationDealt: number;
+    }
+  | {
+      type: 'INTRUDER_TRANSFORMED';
+      roomId: RoomId;
+      oldIntruderId: string;
+      newIntruderId: string;
+    }
+  | {
+      type: 'INTRUDER_CALLED';
+      roomId: RoomId;
+      intruderId: string | null;
+      tokenType: IntruderToken['type'];
+    }
+  | {
+      type: 'SHOT_FIRED';
+      playerId: string;
+      roomId: RoomId;
+      intruderId: string;
+      intruderType: IntruderType;
+      weaponId: string;
+      weaponName: string;
+      dieFace: CombatDieFace;
+      woundsDealt: number;
+    }
+  | {
+      type: 'TOUGHNESS_CHECKED';
+      playerId: string;
+      roomId: RoomId;
+      intruderId: string;
+      intruderType: IntruderType;
+      attackCards: ToughnessCheckCardSnapshot[];
+      woundsTotal: number;
+      killed: boolean;
+      retreated: boolean;
+    }
+  | {
+      type: 'INTRUDER_KILLED';
+      playerId: string;
+      roomId: RoomId;
+      intruderId: string;
+      intruderType: IntruderType;
+    }
+  | {
+      type: 'INTRUDER_RETREATED';
+      playerId: string;
+      intruderId: string;
+      intruderType: IntruderType;
+      fromRoomId: RoomId;
+      toRoomId: RoomId;
+    }
+  | {
+      type: 'MELEE_ATTACKED';
+      playerId: string;
+      roomId: RoomId;
+      intruderId: string;
+      intruderType: IntruderType;
+      dieFace: CombatDieFace;
+      woundsDealt: number;
+      contaminationDealt: number;
+      seriousWoundDealt: number;
+    }
+  | {
+      type: 'OBJECT_PICKED_UP';
+      playerId: string;
+      roomId: RoomId;
+      objectId: string;
+      objectKind: BoardObject['kind'];
+    }
+  | {
+      type: 'PLAYER_DIED';
+      playerId: string;
+      roomId: RoomId;
+      cause: PlayerDeathCause;
+    }
   | { type: 'GAME_OVER'; reason: GameOverReason }
   | {
       type: 'PLAYER_PASSED';
diff --git a/packages/shared/src/types/state.ts b/packages/shared/src/types/state.ts
index e784143..6f05bdf 100644
--- a/packages/shared/src/types/state.ts
+++ b/packages/shared/src/types/state.ts
@@ -25,8 +25,13 @@ import type { RngStream } from '../utils/rng.js';
  *
  * v4: публичный журнал событий партии (`gameLog`) сохраняется вместе с игрой.
  * Старые сохранения не восстанавливаются, чтобы журнал и состояние не расходились.
+ *
+ * v5 (0.4.0, шаг 2): Контакт и Внезапная атака — у особи Чужого на поле хранится
+ * отложенный жетон (`IntruderEntity.token`), у персонажа — Личинка на планшете
+ * (`PlayerState.hasLarva`), а гибель всех персонажей завершает партию
+ * (`ALL_PLAYERS_DEAD`).
  */
-export const GAME_STATE_SCHEMA_VERSION = 4;
+export const GAME_STATE_SCHEMA_VERSION = 5;
 
 /**
  * Режим партии (стр. 27 «Игровые Режимы»). Базовая игра полукооперативная:
@@ -35,8 +40,8 @@ export const GAME_STATE_SCHEMA_VERSION = 4;
  */
 export type GameMode = 'SOLO' | 'COOP' | 'SEMI_COOP' | 'INTRUDER_PLAYER';
 
-/** Почему партия окончена: корабль взорвался или обшивка не выдержала (стр. 17). */
-export type GameOverReason = 'SHIP_EXPLODED' | 'HULL_BREACH';
+/** Почему партия окончена: корабль взорвался, обшивка не выдержала (стр. 17) или погибли все персонажи. */
+export type GameOverReason = 'SHIP_EXPLODED' | 'HULL_BREACH' | 'ALL_PLAYERS_DEAD';
 export type GamePhase = 'PLAYER_PHASE' | 'EVENT_PHASE' | 'GAME_OVER';
 export type Destination = 'EARTH' | 'MARS' | 'DEEP_SPACE_1' | 'DEEP_SPACE_2';
 export type CourseMarker = 'A' | 'B' | 'C' | 'D';
-- 
2.49.0.windows.1

