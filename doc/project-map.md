# NEMESIS DIGITAL — Карта проекта (`doc/project-map.md`)

> Для разработчиков и AI-агентов. Карта «экран / модуль / сущность → что делает → где в коде».
> Строки смещаются, главная опора — путь к файлу, имя функции/класса/типа.
> Архитектура и правила — `doc/tech_stack.md`, `doc/design_document.md`, `doc/rules.md`.
> **Версия документа:** 4.0 (актуализировано после сверки со сканами: версия 0.7.0, схема 26, 1512 тестов, 28 коридоров, 2 пакета).

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
| `state.ts` | `GameState`, `ShipState`, `GameMeta`, `CoordinatesState`, `IntrudersPoolState`, `GAME_STATE_SCHEMA_VERSION = 24` | Корневой контракт состояния (история версий — `CHANGELOG.md`). |
| `actions.ts` | `GameAction`, `DevAction`, `RoomAbilityPayload` | Все легальные действия: `ACTION_MOVE`, `ACTION_SEARCH`, `ACTION_ROOM_ABILITY`, `ACTION_PASS`, `ACTION_SHOOT`, `ACTION_MELEE`, `ACTION_PICK_UP_OBJECT`, `ACTION_RESOLVE_DECISION`, dev. |
| `cards.ts` | `ActionCard`, `ItemCard`, `CraftedItemCard`, `ContaminationCard`, `SeriousWoundCard`, `IntruderAttackCard`, `EventCard`, `GameDecksState` | Контракты колод: предметы 90, крафт 12, заражение 27, травмы 16, атаки 20, события 20, действия 60. |
| `rooms.ts` | `RoomState`, `RoomDefinition`, `CorridorConnection`, `ExplorationEffect`, `RoomSlotCategory` | Комнаты, двери OPEN/CLOSED/DESTROYED, 28 коридоров, эффекты жетонов. |
| `entities.ts` | `PlayerState`, `CharacterClass`, `IntruderToken`, `IntruderEntity`, `BoardObject`, `HandSlotContent`, `EscapePodState`, `WeaknessSlotState` | Персонажи 6 классов, 2 слота рук, инвентарь, жетоны Чужих 27, миниатюры лимиты. |
| `decisions.ts` | `PendingDecision` | Отложенные решения: `CHOOSE_OBJECTIVE`, `CHOOSE_SEARCH_ITEM`, `CHOOSE_WHITE_ROOM_DECK`, `DISCARD_HEAVY_ITEM_FOR_NEW`, `ROOM_FIRE_CONTROL_TARGET`, `ROOM_GENERATOR_ACTION`, `CHOOSE_REST_CONTAMINATION_DISCARD`, `REROLL_COMBAT_DIE`. |
| `sanitized.ts` | `SanitizedGameState`, `SanitizedPlayerState` | Отфильтрованный срез: скрытое как `null`/счётчики. |
| `log.ts` | `GameLogEntry`, `EventEffectOutcome` (19), `HiveDevelopmentOutcome` (6) | Журнал партии + итоги эффектов Событий и Улья. |
| `interrupts.ts` | `InterruptEvent` | Стек прерываний: `EXPLORE_ROOM`, `NOISE_ROLL`, `CONTACT`, `SURPRISE_ATTACK`, `ESCAPE_ATTACK`, `ESCAPE_MOVE`, etc. |
| `contact.ts` | `IntruderRetreatOutcome`, `AttackVictimStatus`, `IntruderLogEvent` | Презентация Контакта/Атак/Отступления. |
| `endgame.ts` | `EndgameReport`, `EndgameCharacterResult`, `EndgameDeath` | Отчёт Финального Валидатора (стр. 11): судьба корабля, Двигатели, Курс, Заражение, Цели по Персонажам. |
| `shipSystemsLog.ts` | `ShipSystemsLogEvent`, `ExchangedEntry`, `RoomPeekSource` | События систем корабля: проверки Двигателей и Координат, Курс, Двери, Декомпрессия, Слизь, Обмен. |

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
| `escape.ts` | `resolveEscapeAttack()`, `resolveEscapeMove()` | Побег: атаки в спину FAQ Rules 5; шаг и Шум — отдельным прерыванием после всего, что подняли Атаки. |
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
| `gameEnd.ts` | `endGame()` | Перевод в `GAME_OVER` и запуск Финального Валидатора. |
| `endgame.ts` | `resolveEndgame()`, `killEveryoneAboard()` | Финальный Валидатор (стр. 11): перенос маркера при пустом корабле, Двигатели, Курс, Заражение (4 карты), Цели → `GameState.endgame`. |
| `objectiveConditions.ts` | `metObjectiveCondition()`, `OBJECTIVE_CONDITIONS` | Проверки условий всех 25 Целей, по варианту «ИЛИ». |
| `shipSystemsAbilities.ts` | `inspectEngineInRoom()`, `inspectAllEngines()`, `operateFlightControl()`, `observeUnexploredRoom()` | Машинные Отсеки, Машинное Отделение, Мостик, Комната Наблюдения (стр. 25–26). |
| `doorControl.ts` | `rearrangeRoomDoors()`, `corridorsIntoRoom()` | Двери выбранной Комнаты: Центр Управления и «Ключ безопасности». |
| `decompression.ts` | `startDecompression()`, `guardDecompression()`, `resolveDecompressions()` | Экстренная Декомпрессия: жетон, отмена при открытой Двери, гибель в конце Фазы Игроков. |
| `hygieneAbilities.ts` | `snackInCanteen()`, `takeShower()` | Столовая и Душевая: лечение/Слизь и скан руки. |
| `slimeRoom.ts` | `stepIntoSlimeRoom()` | Маркер Слизи при входе в Комнату Слизи. |
| `exchange.ts` | `proposeExchange()`, `resolveExchangeConsent()` | Обмен [1]: предложение, согласие каждого участника, передача без Боезапаса. |
| `crewSetup.ts` | `startCrewSetup()`, `pickRole()`, `pickRandomRole()`, `crewAssignment()` | Подготовка экипажа (стр. 8, шаги 14–17): номера, Цели до выбора, Драфт и свободный выбор; поток ГСЧ `crew`. |
| `crewSetupView.ts` | `filterCrewSetupForSeat()`, `crewSetupPicker()` | Срез подготовки для одного места: чужие Цели скрыты. |
| `reposition.ts` | `executeReposition()`, `resolveRepositionConsent()` | Отход без Атак: согласие переносимого в «Огне на подавление» и «Заградительном огне». |
| `reactions.ts` | `openDismissWindow()`, `resolveDismissWindow()` | Окно «Отставить»: цепочка встречных карт, оплата Цены отменённого Действия. |
| `playerToAct.ts` | `playerToAct()` | Чьего ответа ждёт движок. |
| `comms/commsActions.ts` | `executeComms()`, `commsUsageThisTurn()` | Рация: сообщения, лимиты хода, ответы на Просьбы. |
| `comms/commitments.ts` | `trackCommitments()` | Обещания: выполнено / нарушено / истекло по журналу. |
| `comms/commsState.ts`, `commsTargets.ts`, `deedLog.ts`, `commsSettings.ts` | `announceEngineOrderChanged()`, `logActorDeeds()`, `COMMS_SETTINGS` | Системное объявление, проверка целей, Двери и Пожары в журнале, настройки. |
| `../ai/passiveBotPolicy.ts` | `decidePassiveBotAction()` | Базовый бот по своему срезу: Пас, осторожные ответы на решения. |
| `../ai/botAgent.ts`, `botObserver.ts`, `botBeliefs.ts` | `BotAgent.decide()`, `createBotMind()`, `observeForBot()` | Ядро бота: чистое решение по срезу и памяти, наблюдения, убеждения о Двигателях и Курсе ([bots.md](bots.md)). |
| `../ai/botMind.ts`, `botCharacter.ts`, `botTuning.ts` | `BotMind`, `generateCharacter()`, `BOT_TUNING` | Память бота со своей схемой, характер (мораль, черты), все числа поведения. |
| `../ai/botSocial.ts`, `botClaims.ts`, `botDeeds.ts`, `botMorale.ts` | `trustIn()`, `verifyClaims()`, `applySignal()` | Социальная модель: шкалы и улики, проверка Заявлений, дела, обещания, Намерения, дрейф морали. |
| `../ai/botObjectives.ts`, `botLying.ts`, `botRequests.ts`, `botGraph.ts` | `threatFrom()`, `planEngineClaim()`, `assessRequest()` | Угадывание Целей, политика лжи, ответы на Просьбы, расстояния по графу. |
| `../ai/botActions.ts`, `botRoomActions.ts`, `botCandidates.ts`, `botHand.ts` | `generateCandidates()`, `paymentFor()` | Генератор допустимых Действий по срезу и оплата самыми дешёвыми картами. |
| `../ai/botGoals.ts`, `botObjectivePlanner.ts`, `botTasks.ts`, `botShipKnowledge.ts` | `buildAgenda()`, `planObjective()` | Повестка желаний и планировщики 25 Целей. |
| `../ai/botUtility.ts`, `botCurves.ts`, `botRisk.ts`, `botNavigation.ts`, `botChoices.ts` | `scoreCandidates()`, `chooseCandidate()`, `findRoute()`, `decideChoice()` | Utility и softmax, риск, A*, обязательные решения. |
| `../ai/botVoice.ts`, `botPhrases.ts`, `../data/botPhrases.ts` | `speak()`, `toneOf()`, `BOT_PHRASES`, `voicedText()` | Голос бота: когда сказать Заявление, Намерение или Просьбу; банк фраз и интонация характера. |
| `../ai/botInspection.ts` | `inspectBot()` | Разбор бота для Инспектора (dev): черты, убеждения, доверие, 5 лучших кандидатов с факторами. |
| `../simulation/simulateGame.ts`, `simulationStats.ts`, `deathCauses.ts` | `simulateGame()`, `summarizeSimulations()` | Симулятор партий ботов: подробный отчёт, сводка серии, причины гибели. |
| `actionRules.ts` | `searchBlock()`, `roomAbilityBlock()`, `carefulMoveBlock()`… | Правила допустимости Действий: их читают и движок, и боты. |

### C. Данные (`src/data/`)

| Файл | Константы | Назначение |
|---|---|---|
| `shipGraph.ts` | `SHIP_ROOM_NODES` 21, `SHIP_CORRIDORS` 28 | Геометрия поля, techNumbers (8 отсеков с входами, сверены с `map_full.jpg`). |
| `roomDefinitions.ts` | `BASIC_ROOMS_1` 11, `ADDITIONAL_ROOMS_2` 9, `SPECIAL_ROOMS` 5 | Свойства комнат: цвет, компьютер, действие. Цвета по тайлам (`rooms.pdf`): ARMORY RED, COMM YELLOW, INFIRMARY GREEN, LAB GREEN, GENERATOR YELLOW, ESCAPE WHITE, FIRE_CONTROL YELLOW, NEST NONE, STORAGE RED, SURGERY GREEN, AIRLOCK YELLOW, CABINS WHITE, CANTEEN GREEN, COMMAND_CENTER RED, ENGINE_CONTROL YELLOW, HATCH_CONTROL WHITE, OBSERVATION RED, SLIME NONE, SHOWER WHITE; особые Комнаты — NONE, без Компьютера. |
| `actionCards.ts` | `ACTION_CARDS_BY_CHARACTER` 60 | 6×10 карт действий. |
| `itemCards.ts` | RED 30, YELLOW 30, GREEN 30 | Колоды стола 90. |
| `startingItems.ts` | `STARTING_WEAPONS` 6 | Револьвер 6 (классическое), Дробовик 2, Обрез 2, Боевая винтовка 5, Винтовка 4, Пистолет 3 (Энергооружие); свойства — `weaponModifiers.ts`. |
| `crafting.ts` | 4 рецепта, 12 карт | Антидот, Тазер, Огнемёт 4, Молотов. |
| `contaminationCards.ts` | 27 (7 инфицированных) | Заражение. |
| `seriousWounds.ts` | 16: спина 4, нога 3, кисть 3, кровотечение 3, рука 3 | Тяжёлые Травмы по скану; эффекты — `logic/seriousWoundEffects.ts`. |
| `coordinateCards.ts` | 8 карт × A–D | Карты Координат по скану; `coursedDestination` — пункт назначения по маркеру Курса. |
| `intruderAttacks.ts` | 20 | Атаки Чужих с эффектами. |
| `weaknesses.ts` | 8 | Слабости: 3 в слоты при подготовке. |
| `combatDie.ts` | 6 граней (2 промаха) | Кубик Боя. |
| `noiseDie.ts` | 10 граней (1-4×2 + Тишина + Опасность) | Кубик Шума. |
| `intruderMiniatures.ts` | лимиты 6/3/8/2/1 | Миниатюры. |
| `eventCards.ts` | 20 | События: 9 охота, 3 шум, 7 разрушение, 1 двери. |
| `explorationTokens.ts` | 20 (44 предмета) | Жетоны Исследования: 16 в партии. |
| `intruderPool.ts` | 27 жетонов, ADULT_ESCAPE_NUMBERS | Пул Чужих: 1 Пустой, 4 Личинки, 1 Крипер, 1 Королева, 3+1×игроков Взрослых + запас. |
| `cardsSetup.ts` | `createInitialDecks()` | Сборка колод по сиду. |
| `setup.ts` | константы подготовки | Капсулы по игрокам, трек Времени 15, 2 слота рук, 2 цели, 3 взрослых база; деления Анабиоза и Самоуничтожения — `evacuation.ts` (7; 3 и 6). |

---

## 3. Карта клиента (`packages/client/`)

### A. Корень и состояние

| Файл | Назначение | Экспорты |
|---|---|---|
| `App.tsx` | Каркас UI, HUD (раунд, фаза, активный, время, сид, dev). | `App` |
| `store/gameStore.ts` | Zustand-стор: `view`, `selectedRoomId`, `rejection`, места, темп ботов, шторка, подготовка экипажа. | `useGameStore` |
| `hooks/useBotPacing.ts` | Шаг бота, когда отыграли анимации; пауза по скорости. | `useBotPacing` |
| `services/transport/` | `ITransport`, `LocalInMemoryTransport`, `createLocalTransport` — изоляция движка; `SeatController` — места и ход ботов; `BotController` — срез и память ботов; `CrewSetupSession` — подготовка экипажа. | — |
| `services/session/` | `sessionStorage.ts`, `seed.ts` — сохранение партии, мест и памяти ботов; сид. | — |

### B. Компоненты (`src/components/`)

| Компонент | Роль | Движок |
|---|---|---|
| **Карта** `board/ShipMapSVG.tsx`, `RoomHex.tsx`, `CorridorEdge.tsx`, `TechCorridorHub.tsx`, `VentShaftTraces.tsx`, `intruderMapModel.ts`, `intruderShapes.ts`, `IntruderBadge.tsx`, `BoardAnimationLayer.tsx` | SVG-карта 21/29, двери, шум, огонь, поломки, фишки, Чужие (масштабы, аура Трутня/Королевы, сетка 3+ типов, рамка В Бою), Технические Коридоры с трассами, анимации перемещений 750мс. | `selectRoom`, `openTechnicalCorridors`, дифф `SanitizedGameState`. |
| **Презентация Фазы Событий** `events/EventPhaseModal.tsx`, `eventPhasePresentation.tsx`, `EventPhaseBanner.tsx` | Оверлей 6 шагов Фазы Событий, баннер атак, подсветка отсеков `isHighlighted`. | Читает `gameLog`. |
| **Инспектор** `inspector/RoomInspector.tsx`, `TechCorridorPanel.tsx`, `RoomStatusGrid.tsx`, `FloorObjectsPanel.tsx`, `LaboratoryPanel.tsx`, `CarefulMovePanel.tsx`, `DisengagePanel.tsx`, `EscapeConfirmDialog.tsx` | Инфо отсека, кнопки действий, тяжёлые объекты на полу, Лаборатория, осторожное движение, отход, подтверждение Побега. | `ACTION_MOVE`, `ACTION_SEARCH`, `ACTION_ROOM_ABILITY`, `ACTION_PICK_UP_OBJECT`. |
| **Рука** `hand/PlayerHandPanel.tsx`, `HandConfirmModals.tsx` | Карты руки, цена, мультиселект, пас, счётчик 0/2, инвентарь/травмы. | `ACTION_PASS`, `ACTION_PLAY_CARD`, `ACTION_USE_ITEM`. |
| **Контакт** `contact/ContactOverlay.tsx`, `ContactModal.tsx`, `IntruderSilhouette.tsx` | Окна силуэта, Внезапной, боя, Побега. | Читает `gameLog`. |
| **Решения** `modals/DecisionModal.tsx` | Модалки `pendingDecision`: белая колода, поиск 1 из 2, сброс тяжёлого, цели, Пожарный контроль, Генератор, отдых, переброс. | `ACTION_RESOLVE_DECISION`. |
| **Новая партия** `lobby/CrewSetupFlow.tsx`, `LobbyScreen.tsx`, `WaitingRoomScreen.tsx`, `CrewBriefingScreen.tsx`, `RoleSelectionScreen.tsx` | Лобби, ожидание участников, брифинг Целей, Драфт или свободный выбор с таймером. | `beginCrewSetup`, `pickRole`, `launchCrew`. |
| **Рация** `comms/RadioPanel.tsx`, `FeedCard.tsx`, `EngineBroadcast.tsx`, `commsFeedModel.ts`, `commsPhrases.ts` | Лента Рации, ответы и реакции, ссылки «На карте», объявление о перестановке жетонов. | `ACTION_COMMS`. |
| **Конструктор и «Входящие»** `comms/CommsComposer.tsx`, `composerModel.ts`, `CommsInbox.tsx`, `inboxModel.ts`, `ClaimAfterIntel.tsx` | Фразы без свободного текста, Просьбы и обещания в начале хода, Заявление после Проверки. | `ACTION_COMMS`, `store/commsUiStore.ts`. |
| **Досье и пузыри** `comms/PlayerDossierPanel.tsx`, `dossierModel.ts`, `SpeechBubbleLayer.tsx`, `speechBubbleModel.ts` | Открытые сведения об игроке и отметки по вашим проверкам; реплики над фишками на карте. | Читает срез. |
| **Реакции** `reactions/ReactionDialogs.tsx` | Окно «Отставить», согласие на отход, баннер цепочки. | `ACTION_RESOLVE_DECISION`. |
| **Стол** `table/HandoffShutter.tsx`, `BotTableHud.tsx` | Шторка передачи устройства, кнопка «Быстрее», активность ботов. | Стор. |
| **Бой** `combat/ShootModal.tsx`, `MeleeModal.tsx`, `CombatActionButtons.tsx` | Стрельба/рукопашная, выбор оружия/цели, цена, отказы. | `ACTION_SHOOT`, `ACTION_MELEE`. |
| **Журнал** `log/GameLogPanel.tsx`, `gameLogModel.ts`, `intruderLogModel.ts`, `eventEffectLogModel.ts` | История ходов, 19 итогов Событий, 6 Улья. | Читает `view.gameLog`. |
| **Dev** `dev/DevPanel.tsx`, `dev/BotInspector.tsx` | Переключение дверей/шума, сырое состояние; Инспектор ботов (IS_DEV). | `DEV_TOGGLE_DOOR/NOISE`, `inspectBots()`. |
| **Симуляция** `simulation/SimulationScreen.tsx`, `SimulationSetup.tsx`, `SingleGameReport.tsx`, `SeriesReport.tsx`; графики `bots/charts.tsx` | Окно «Симуляция ботов»: одна партия с отчётом или серия из 100 со статистикой; Web Worker `services/simulation/`. | `simulateGame`, `summarizeSimulations`. |
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
3. Перед коммитом — `npm run verify` (typecheck, lint, format:check, test 1474/130).
