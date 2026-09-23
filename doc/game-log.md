# Журнал действий партии

В интерфейсе есть постоянный публичный журнал действий. Он находится в нижней
части игровой зоны, имеет чёрный фон и показывает только уже разыгранные
события партии. Журнал не заменяет состояние игры и не используется для
принятия решений движком: единственным источником изменений остаётся
`GameEngine` общего пакета.

## Поведение интерфейса

- Панель **«ЖУРНАЛ ДЕЙСТВИЙ»** открыта при входе в партию.
- Кнопка **«Скрыть» / «Показать»** имеет `aria-expanded`, `aria-controls` и
  понятный `aria-label`, поэтому журнал можно свернуть без потери записей.
- При добавлении записи список прокручивается к последнему событию; старые
  записи остаются доступны во внутренней прокрутке.
- Фон панели — чёрный, записи разделены, номер последовательности отображается
  моноширинным шрифтом. Цвета не являются единственным способом различать
  смысл: важные сущности дополнительно выделяются жирным и формулируются
  обычным текстом.
- Панель получает `SanitizedGameState` из `useGameStore`, а не полный
  серверный `GameState`. Поэтому React-компонент не может прочитать скрытое
  содержимое колод или неисследованных отсеков.
- Журнал презентации Фазы Событий (`EventPhaseModal`) повторно использует
  тот же форматтер (`GameLogPanel` экспортирует `LogLine`) и подсвечивает
  затронутые отсеки на карте янтарным кольцом; баннер сводки атак скрывается
  на время показа модалки.

## Что попадает в журнал

В `GameState.gameLog` хранятся типизированные записи с монотонными
`sequence` и детерминированным `id` (`log-1`, `log-2`, ...). Все события
публичны: скрытые данные (порядок колод, чужой инвентарь, неисследованный
тайл) сюда не попадают. Если действие отклонено и `Immer` откатывает
состояние, его незавершённые записи также не попадают в журнал.

| Тип события | Что сообщает игроку |
| --- | --- |
| `GAME_STARTED` | Партия начата |
| `ROUND_STARTED` / `PLAYER_TURN_STARTED` | Начало раунда / хода игрока |
| `ACTION_CARD_DRAWN` | Добор карты действия классовой картой («Адреналин») |
| `ACTION_CARD_PLAYED` / `ITEM_USED` / `OBJECT_PICKED_UP` | Розыгрыш карты действия / использование предмета / поднятие Тяжёлого объекта |
| `ROOM_ABILITY_USED` | Использование консоли отсека |
| `PLAYER_MOVED` | Персонаж, исходный и целевой отсек, Коридор и режим обычного / Осторожного движения |
| `ROOM_DISCOVERED` | Обнаруженный отсек, его название и категория |
| `EXPLORATION_TOKEN_REVEALED` | Число предметов и раскрытый эффект жетона Исследования |
| `EXPLORATION_EFFECT_RESOLVED` | Результат эффекта: Пожар, Неисправность, Слизь, Двери, Тишина или Опасность |
| `NOISE_ROLLED` | Результат кубика Шума: номер Коридора, Тишина или Опасность |
| `NOISE_MARKER_PLACED` | Место и причина установки маркера Шума (`ROLL` / `CAREFUL` / `DANGER` / `BLANK` / `EVENT`; `playerId = null` для карт Событий) |
| `NOISE_SKIPPED` | Почему бросок или размещение Шума не состоялись |
| `TIME_TRACK_ADVANCED` | Шаг 4 Фазы Событий: новые позиции маркеров Времени и Самоуничтожения |
| `EVENT_CARD_DRAWN` | Шаг 7а: верхняя карта Событий вытянута лицом вверх (направление, типы) |
| `EVENT_EFFECT_RESOLVED` | Шаг 7б: итог текстового эффекта карты Событий (19 вариантов `EventEffectOutcome`: `HUNT`, `PROTECT_NEST`, `BROOD`, `REGENERATION`, `HIDDEN`, `MATURATION`, `RAMPAGE`, `PREPARATION`, `PREY_SCENT`, `NOISE_TECH_CORRIDORS`, `HIVE`, `FLAMMABLE_MIXTURE`, `DESTRUCTIVE_FLAME`, `ESCAPE_POD_EJECTION`, `SHORT_CIRCUIT`, `COOLANT_LEAK`, `LIFE_SUPPORT_MALFUNCTION`, `MALFUNCTION`, `OPEN_COMPARTMENTS`) |
| `EVENT_CARD_CHOSEN` | «Подготовка»: какую из трёх карт выбрал Первый Игрок и какие ушли в сброс |
| `HIVE_DEVELOPMENT_RESOLVED` | Шаг 8: развитие Улья — тип вытянутого жетона Пула Чужих и итог (`HiveDevelopmentOutcome`: `LARVA` / `CREEPER` / `ADULT` / `BREEDER` / `QUEEN` / `BLANK`) |
| `HIVE_DEVELOPMENT_SKIPPED` | Развитие Улья пропущено: мешок Пула Чужих пуст |
| `FIRE_DAMAGE_TAKEN_BY_INTRUDER` | Шаг 6: Чужой в горящем отсеке получил 1 Рану |
| `EGG_DESTROYED_BY_FIRE` | Огонь уничтожил свободное Яйцо на полу отсека |
| `CONTACT_OCCURRED` | Контакт: жетон из мешка, число на обороте, рука, Первый Контакт, источник (`NOISE` / `CALL` / `EVENT`), заражение Личинкой |
| `SURPRISE_ATTACK_RESOLVED` / `ESCAPE_ATTACK_RESOLVED` / `EVENT_PHASE_ATTACK_RESOLVED` | Атака Чужого: карта, исход (`HIT` / `MISS` / `INFESTATION` / `SUPPRESSED`), статусы жертв |
| `SHOOT_RESOLVED` / `MELEE_RESOLVED` | Исход боя: грань кубика Боя, раны, карты Стойкости, гибель/Отступление (`retreat`), Заражение и Тяжёлая Травма в рукопашной |
| `INTRUDER_KILLED` / `INTRUDER_RETREATED` / `INTRUDER_MOVED` / `INTRUDERS_BLOCKED_BY_DOOR` | Судьба Чужого: Останки, направление Отступления по карте События, переход по Коридору или уход в Технические Коридоры |
| `PLAYER_DIED` / `ESCAPE_PODS_UNLOCKED` / `FIRE_DAMAGE_TAKEN` / `PLAYER_PASSED` | Повседневные события Фаза Игроков: гибель, разблокировка Капсул (`FIRST_DEATH` / `SELF_DESTRUCT`), урон от огня игроку, пас |
| `DEV_STATE_CHANGED` | Изменение Двери или маркера Шума из dev-инструмента |
| `GAME_OVER` | Завершение партии (`SHIP_EXPLODED` / `HULL_BREACH` / `HYPERSPACE_JUMP` / `NO_ACTIVE_CHARACTERS`) |

События контакта, боя, стрельбы и движения добавляются в тех же ветках
движка, где изменяется состояние. Запись о перемещении появляется при
успешном переходе, а записи о вскрытии, Исследовании, Шуме, Контакте и Фазе
Событий — при полном разборе очереди прерываний (`drainInterrupts`).

## Форматирование и цвета

`packages/client/src/components/log/gameLogModel.ts` и смежные модели
преобразуют события в русские сообщения и сегменты с semantic tone-классами.
Дополнительно:

- `log/intruderLogModel.ts` — тексты Контакта, Внезапной атаки, Побега и атак Фазы Событий;
- `log/eventEffectLogModel.ts` — тексты 19 итогов эффектов карт Событий (`EVENT_EFFECT_RESOLVED`) и выбора «Подготовки»;
- `contact/contactPresentationModel.ts` — русские имена жетонов и маппинги презентации.

В интерфейсе выделены:

- игроки, отсеки и Коридоры;
- результат Шума, маркеры Шума и Тишина;
- Пожар, Неисправность, Слизь, Двери и Опасность;
- Чужие и их типы, раны и Стойкость, исходы атак;
- успешные результаты, предупреждения, ошибки и завершение партии.

Названия комнат в сообщении о перемещении берутся из текущего среза только
после того, как отсек исследован. Для неисследованного отсека используется
номер (`отсек #NNN`), поэтому журнал не раскрывает скрытый тайл задним числом.
Название обнаруженного отсека передаётся отдельным событием только в момент
его публичного вскрытия.

## Хранение и совместимость

Журнал является частью состояния партии и сохраняется вместе с остальными
данными в браузере (`sessionStorage`, ключ `nemesis-session`, сервис
`services/session/sessionStorage.ts`). Из-за обязательных полей журнала и
последующего наращивания схемы версия состояния — **19**
(`GAME_STATE_SCHEMA_VERSION = 19`). Сохранения без журнала или с прежней
версией считаются несовместимыми и не восстанавливаются: клиент начинает
новую партию вместо показа неполной истории, не совпадающей с состоянием поля.

Основные точки реализации:

- `packages/shared/src/types/log.ts` — публичный контракт событий (`GameLogEvent`, `EventEffectOutcome`, `HiveDevelopmentOutcome`) и `GameLogEntry`;
- `packages/shared/src/types/contact.ts` — события контакта и боя (`IntruderLogEvent`, `IntruderRetreatRecord`);
- `packages/shared/src/logic/gameLog.ts` — создание и последовательное добавление (`appendGameLog`);
- `packages/shared/src/logic/eventsPhase.ts` / `eventCardMovement.ts` / `eventEffects.ts` / `hiveDevelopment.ts` / `contact.ts` / `shoot.ts` / `melee.ts` — запись событий правил;
- `packages/shared/src/logic/sanitizer.ts` — передача журнала в срез игрока (журнал публичен, скрытое остаётся скрытым);
- `packages/client/src/components/log/GameLogPanel.tsx` — нижняя панель и переключатель (экспортирует `LogLine`);
- `packages/client/src/components/log/gameLogModel.ts` — русские сообщения и выделение;
- `packages/client/src/components/events/eventPhasePresentation.tsx` — виджеты презентации Фазы Событий поверх тех же записей.

Покрытие находится в `packages/shared/src/logic/gameLog.test.ts`,
`packages/shared/src/logic/eventsPhase.test.ts`,
`packages/shared/src/logic/eventCardMovement.test.ts`,
`packages/shared/src/logic/eventEffects.test.ts`,
`packages/shared/src/logic/hiveDevelopment.test.ts`,
`packages/shared/src/logic/contact.test.ts`,
`packages/client/src/components/log/gameLogModel.test.ts`,
`packages/client/src/components/log/intruderLogModel.ts` и
`packages/client/src/components/log/GameLogPanel.test.ts`: проверяются начальная
запись, последовательные идентификаторы, запись последствий перемещения,
откат отклонённого действия, форматирование перемещения, результатов Шума,
эффектов, отсутствие названий скрытых отсеков и доступные атрибуты панели.
