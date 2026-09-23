import React from 'react';
import type { CarefulMoveChosenCorridor, CorridorNumber, SanitizedRoomState } from '@nemesis/shared';
import { ADDITIONAL_ROOMS_2, BASIC_ROOMS_1, SPECIAL_ROOMS, findAdjacentOpenRoomIds } from '@nemesis/shared';
import { useGameStore } from '../../store/gameStore';
import { intrudersInRoom } from '../board/intruderMapModel';
import { LaboratoryActions, WeaknessSlotsPanel } from './LaboratoryPanel';
import { EscapeConfirmDialog } from './EscapeConfirmDialog';
import { CarefulMovePanel } from './CarefulMovePanel';
import { DisengagePanel } from './DisengagePanel';
import { FloorObjectsPanel } from './FloorObjectsPanel';
import { carefulMoveChoices } from './carefulMoveModel';
import { RoomStatusGrid } from './RoomStatusGrid';
import { TechCorridorPanel } from './TechCorridorPanel';
import { INTRUDER_COLORS, INTRUDER_SHAPES } from '../board/intruderShapes';
import { X, Package, User, Footprints, Ban, ShieldAlert, Bug, Droplets, Crosshair, Hand } from 'lucide-react';

/** Подписи Тяжёлых объектов на полу отсека (стр. 22). */
const CATEGORY_LABELS: Record<SanitizedRoomState['category'], string> = {
  SPECIAL: 'ОСОБАЯ',
  ROOM_1: 'ОСНОВНАЯ «1»',
  ROOM_2: 'ДОП. «2»',
};

/** Русские названия типов Чужих для инспектора. */
const INTRUDER_NAMES_RU: Record<string, string> = {
  LARVA: 'Личинка',
  CREEPER: 'Крипер',
  ADULT: 'Взрослая особь',
  BREEDER: 'Трутень',
  QUEEN: 'Королева',
};

export const RoomInspector: React.FC = () => {
  const view = useGameStore((state) => state.view);
  const selectedRoomId = useGameStore((state) => state.selectedRoomId);
  const selectRoom = useGameStore((state) => state.selectRoom);
  const technicalCorridorsOpen = useGameStore((state) => state.technicalCorridorsOpen);
  const dispatch = useGameStore((state) => state.dispatch);
  const rejection = useGameStore((state) => state.rejection);
  const consumePaymentCards = useGameStore((state) => state.consumePaymentCards);
  const selectedCardIds = useGameStore((state) => state.selectedCardIds);
  const convertedCardIds = useGameStore((state) => state.convertedCardIds);
  const setShootModalOpen = useGameStore((state) => state.setShootModalOpen);
  const setMeleeModalOpen = useGameStore((state) => state.setMeleeModalOpen);
  const carefulTargetRoomId = useGameStore((state) => state.carefulMoveTargetRoomId);
  const setCarefulTargetRoomId = useGameStore((state) => state.setCarefulMoveTargetRoomId);
  const setCarefulHoveredNumber = useGameStore((state) => state.setCarefulHoveredNumber);
  const setCarefulHoveredTechnical = useGameStore((state) => state.setCarefulHoveredTechnical);

  const [escapePromptOpen, setEscapePromptOpen] = React.useState(false);
  const [disengageOpen, setDisengageOpen] = React.useState(false);

  if (!view) return null;

  // Поле Технических Коридоров — отдельная локация со своей панелью (Шаг 3
  // этапа 0.5.0): выбор узла вентиляции заменяет инспектор отсека.
  if (technicalCorridorsOpen) return <TechCorridorPanel />;

  if (!selectedRoomId) return null;

  const room = view.ship.rooms[selectedRoomId];
  if (!room) return null;

  const roomDef =
    SPECIAL_ROOMS.find((definition) => definition.id === room.definitionId) ??
    BASIC_ROOMS_1.find((definition) => definition.id === room.definitionId) ??
    ADDITIONAL_ROOMS_2.find((definition) => definition.id === room.definitionId) ??
    null;

  const activePlayerId = view.meta.activePlayerId;
  const activePlayer = view.players[activePlayerId];
  const isPlayerHere = room.occupantPlayerIds.includes(activePlayerId);
  const occupantNames = room.occupantPlayerIds.map((playerId) => view.players[playerId]?.name ?? playerId);

  // Чужие в выбранном отсеке и статус Боя (стр. 18): блокируют Поиск,
  // Осторожное движение и Действие Комнаты — движок проверит то же самое.
  const roomIntruders = intrudersInRoom(view.intrudersPool.boardTokens, room.id);
  const isActiveInCombat = isPlayerHere && roomIntruders.length > 0;

  // Переходить можно только в соседний отсек через открытую Дверь (стр. 14):
  const reachableRoomIds = activePlayer ? findAdjacentOpenRoomIds(view, activePlayer.roomId) : [];
  const canMoveHere = !isPlayerHere && reachableRoomIds.includes(room.id);
  // Шаг 7: Движение из отсека с Чужими — Побег (стр. 19); важен отсек ПЕРСОНАЖА,
  // а не просматриваемый соседний.
  const movingFromCombat = Boolean(
    activePlayer && intrudersInRoom(view.intrudersPool.boardTokens, activePlayer.roomId).length > 0,
  );
  const escapeIntruders = activePlayer ? intrudersInRoom(view.intrudersPool.boardTokens, activePlayer.roomId) : [];

  // Шаг 8: классовые боевые карты в руке и параметры для их панелей.
  const handCardIds = (activePlayer?.actionDeck.hand.map((card) => card.id) ?? []) as string[];
  const disengageCardId = handCardIds.includes('ACT_SOL_SUPPRESSIVE_FIRE')
    ? ('ACT_SOL_SUPPRESSIVE_FIRE' as const)
    : handCardIds.includes('ACT_CAP_SUPPRESSIVE_FIRE')
      ? ('ACT_CAP_SUPPRESSIVE_FIRE' as const)
      : null;
  const disengageCardName =
    disengageCardId === 'ACT_SOL_SUPPRESSIVE_FIRE' ? 'Заградительный огонь' : 'Огонь на подавление';
  const adrenalineAvailable = handCardIds.includes('ACT_SCO_ADRENALINE');
  const handWeapons = (activePlayer?.handSlots ?? [])
    .filter((slot): slot is Extract<typeof slot, { source: 'ITEM' }> => slot.source === 'ITEM' && slot.card.isWeapon)
    .map((slot) => ({ id: slot.card.id, name: slot.card.name, ammo: slot.card.ammo ?? 0 }));
  const companionsHere = isPlayerHere
    ? room.occupantPlayerIds
        .filter((playerId) => playerId !== activePlayerId)
        .map((playerId) => ({ playerId, name: view.players[playerId]?.name ?? playerId }))
    : [];
  const destinationsFromHome = activePlayer ? findAdjacentOpenRoomIds(view, activePlayer.roomId) : [];

  // Шаг 6: подбор Тяжёлых объектов [1] (стр. 13, 22) — свободный слот Рук
  // и выделенная карта цены; движение в Бою не запрещает базовые действия.
  const paymentReady = selectedCardIds.length + convertedCardIds.length >= 1;
  const hasFreeHandSlot = (activePlayer?.handSlots.length ?? 2) < 2;

  // Шаг 6: Лаборатория [2] (стр. 16) — изучение объекта с пола или из рук.
  const isLaboratory = room.definitionId === 'LABORATORY';
  const floorKinds = [...new Set(room.objects.map((object) => object.kind))];
  const handKinds = isPlayerHere
    ? [
        ...new Set(
          activePlayer?.handSlots
            .filter((slot): slot is Extract<typeof slot, { source: 'OBJECT' }> => slot.source === 'OBJECT')
            .map((slot) => slot.object.kind) ?? [],
        ),
      ]
    : [];
  const studyKinds = [...new Set([...floorKinds, ...handKinds])].filter((kind) => {
    const slot = view.intrudersPool.weaknessSlots.find((entry) => entry.objectKind === kind);
    return slot ? slot.visibility === 'FACE_DOWN' : false;
  });

  // Раскладка «Осторожного движения» (стр. 13) — чистая модель (Шаг 8).
  const { choices: availableCorridorNumbers, hasFreeTechnical } = carefulMoveChoices(view, room.id);
  const isCarefulSelecting = carefulTargetRoomId === room.id;

  const handleNormalMove = () => {
    // Движение из отсека с Чужими — это Побег (стр. 19): подтверждаем отдельно.
    if (movingFromCombat) {
      setEscapePromptOpen(true);
      return;
    }
    const discardCardIds = consumePaymentCards(1);
    dispatch({
      type: 'ACTION_MOVE',
      payload: {
        targetRoomId: room.id,
        discardCardIds,
      },
    });
  };

  const confirmEscape = () => {
    setEscapePromptOpen(false);
    const discardCardIds = consumePaymentCards(1);
    dispatch({
      type: 'ACTION_MOVE',
      payload: {
        targetRoomId: room.id,
        discardCardIds,
      },
    });
  };

  // «Адреналин» (Шаг 8): тот же Побег, но действием играется карта Скаута —
  // после атак и Шума персонаж берёт карту Действия.
  const adrenalineEscape = () => {
    setEscapePromptOpen(false);
    const discardCardIds = consumePaymentCards(1);
    dispatch({
      type: 'ACTION_PLAY_CARD',
      payload: {
        cardId: 'ACT_SCO_ADRENALINE',
        discardCardIds,
        combat: { kind: 'ADRENALINE_ESCAPE', targetRoomId: room.id },
      },
    });
  };

  const dispatchDisengage = (
    weaponId: string,
    selfTo: number | null,
    companionTo: { playerId: string; roomId: number } | null,
  ) => {
    setDisengageOpen(false);
    const moves: { playerId: string; targetRoomId: number }[] = [];
    if (selfTo !== null) moves.push({ playerId: activePlayerId, targetRoomId: selfTo });
    if (companionTo) moves.push({ playerId: companionTo.playerId, targetRoomId: companionTo.roomId });
    dispatch({
      type: 'ACTION_PLAY_CARD',
      payload: {
        cardId: disengageCardId!,
        combat: { kind: 'REPOSITION', weaponItemId: weaponId, moves },
      },
    });
  };

  const handleCarefulMove = (chosen: CarefulMoveChosenCorridor) => {
    const discardCardIds = consumePaymentCards(2);
    dispatch({
      type: 'ACTION_CAREFUL_MOVE',
      payload: {
        targetRoomId: room.id,
        chosenCorridor: chosen,
        discardCardIds,
      },
    });
    setCarefulTargetRoomId(null);
  };

  const handleCarefulHoverNumber = (num: CorridorNumber | null) => {
    setCarefulHoveredNumber(num);
  };

  const handleCarefulHoverTechnical = (hovered: boolean) => {
    setCarefulHoveredTechnical(hovered);
  };

  const handleSearch = () => {
    const discardCardIds = consumePaymentCards(1);
    dispatch({
      type: 'ACTION_SEARCH',
      payload: { discardCardIds },
    });
  };

  const handleRoomAbility = () => {
    const discardCardIds = consumePaymentCards(2);
    dispatch({
      type: 'ACTION_ROOM_ABILITY',
      payload: { discardCardIds },
    });
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 md:bottom-auto md:top-4 md:right-4 md:left-auto md:w-96 bg-nemesis-hull/95 backdrop-blur-md border-t md:border border-nemesis-border md:rounded-xl shadow-2xl p-4 z-30 transition-all">
      {/* Шапка инспектора */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400">
              ОТСЕК #{String(room.id).padStart(3, '0')}
            </span>
            <span className="text-xs font-mono text-slate-400">{CATEGORY_LABELS[room.category]}</span>
          </div>
          <h2 className="text-xl font-heading text-white mt-0.5">
            {room.isExplored ? roomDef?.name || 'Комната' : 'Неисследованный отсек'}
          </h2>
        </div>
        <button
          onClick={() => {
            selectRoom(null);
            setCarefulTargetRoomId(null);
          }}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <X size={18} />
        </button>
      </div>

      {/* Тело инспектора */}
      <div className="py-3 space-y-3 max-h-[60vh] md:max-h-96 overflow-y-auto pr-1">
        <RoomStatusGrid room={room} />

        {/* Описание свойства комнаты: только у вскрытого тайла */}
        {room.isExplored && roomDef && (
          <div className="bg-slate-900/40 p-2.5 rounded border border-cyan-900/40">
            <div className="text-[11px] text-cyan-400 uppercase font-bold tracking-wider mb-1">
              Действие комнаты [{roomDef.actionCost}]:
            </div>
            <div className="text-xs text-slate-300 leading-relaxed">{roomDef.actionDescription}</div>
          </div>
        )}

        {/* Персонажи в отсеке */}
        {occupantNames.length > 0 && (
          <div className="text-xs bg-slate-900/40 p-2 rounded flex items-center gap-2">
            <User size={14} className="text-cyan-400" />
            <span>
              В отсеке: <b className="text-cyan-300">{occupantNames.join(', ')}</b>
            </span>
          </div>
        )}

        {/* Чужие в отсеке: миниатюры и раны публичны (стр. 19) */}
        {roomIntruders.length > 0 && (
          <div className="bg-red-950/30 border border-red-900/50 p-2.5 rounded space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-red-300">
              <Bug size={13} aria-hidden="true" /> Чужие в отсеке
            </div>
            {roomIntruders.map((intruder) => (
              <div
                key={intruder.id}
                className="flex items-center justify-between gap-2 bg-slate-950/60 rounded px-2 py-1.5 text-xs"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <svg
                    viewBox="0 0 96 96"
                    className="h-4 w-4 shrink-0"
                    role="img"
                    aria-label={INTRUDER_NAMES_RU[intruder.type]}
                  >
                    <path d={INTRUDER_SHAPES[intruder.type]} fill={INTRUDER_COLORS[intruder.type]} />
                  </svg>
                  <span className="text-slate-200 font-semibold">{INTRUDER_NAMES_RU[intruder.type]}</span>
                </span>
                <span
                  className="flex items-center gap-1 shrink-0"
                  aria-label={intruder.woundsCount > 0 ? `Ран: ${intruder.woundsCount}` : 'Без ран'}
                >
                  {intruder.woundsCount === 0 ? (
                    <span className="text-[10px] text-slate-500">без ран</span>
                  ) : (
                    <>
                      <Droplets size={12} className="text-red-400" aria-hidden="true" />
                      {Array.from({ length: Math.min(intruder.woundsCount, 5) }, (_, woundIndex) => (
                        <span
                          key={woundIndex}
                          className="inline-block h-2 w-2 rounded-full bg-red-500 border border-red-300/70"
                          aria-hidden="true"
                        />
                      ))}
                      {intruder.woundsCount > 5 && (
                        <span className="font-mono text-red-300 font-bold">×{intruder.woundsCount}</span>
                      )}
                    </>
                  )}
                </span>
              </div>
            ))}
            <p className="text-[10px] text-red-200/80 leading-snug">
              Стойкость Чужого неизвестна, пока не вытянута карта Атаки (стр. 19): показаны только выставленные Раны.
            </p>
          </div>
        )}

        {/* Статус Боя активного персонажа */}
        {isActiveInCombat && (
          <div
            role="alert"
            className="bg-red-950/50 border border-red-500/60 p-2.5 rounded flex items-start gap-2 text-xs text-red-100"
          >
            <ShieldAlert size={15} className="mt-0.5 shrink-0 text-red-400" />
            <span>
              <b>ВЫ В БОЮ.</b> Поиск, Осторожное движение и Действия Комнат запрещены (стр. 18). Доступны Стрельба,
              Рукопашная атака (стр. 19) и Побег: обычное Движение из отсека, перед шагом каждый Чужой атакует в спину
              (стр. 19).
            </span>
          </div>
        )}

        {/* Отход без атак классовой картой (стр. 19; Шаг 8) */}
        {isActiveInCombat && isPlayerHere && disengageCardId && !disengageOpen && (
          <button
            type="button"
            onClick={() => setDisengageOpen(true)}
            className="w-full rounded-lg border border-emerald-600/60 bg-emerald-950/40 px-3 py-2 text-xs font-bold text-emerald-200 transition hover:bg-emerald-900/60"
          >
            Отход без атак: {disengageCardName} [карта + 1 Боезапас]
          </button>
        )}
        {isActiveInCombat && disengageOpen && disengageCardId && (
          <DisengagePanel
            cardId={disengageCardId}
            cardName={disengageCardName}
            weapons={handWeapons}
            destinations={destinationsFromHome.map((roomId) => ({ roomId }))}
            companions={companionsHere}
            onDispatch={dispatchDisengage}
            onCancel={() => setDisengageOpen(false)}
          />
        )}

        {/* Стрельба и Рукопашная в Бою (стр. 19): цель выбирается в боевой панели */}
        {isActiveInCombat && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShootModalOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-500 active:scale-95"
            >
              <Crosshair size={14} /> Стрелять
            </button>
            <button
              type="button"
              onClick={() => setMeleeModalOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-500 active:scale-95"
            >
              <Hand size={14} /> Рукопашная
            </button>
          </div>
        )}

        <FloorObjectsPanel
          objects={room.objects}
          isPlayerHere={isPlayerHere}
          hasFreeHandSlot={hasFreeHandSlot}
          paymentReady={paymentReady}
          onPickUp={(objectId) =>
            dispatch({
              type: 'ACTION_PICK_UP_OBJECT',
              payload: { objectId, discardCardIds: consumePaymentCards(1) },
            })
          }
        />

        {/* Лаборатория [2] (стр. 16) и слоты Слабостей (стр. 21) */}
        {isLaboratory && isPlayerHere && !isActiveInCombat && (
          <LaboratoryActions
            studyKinds={studyKinds}
            paymentReady={paymentReady}
            onStudy={(kind) =>
              dispatch({
                type: 'ACTION_ROOM_ABILITY',
                payload: { discardCardIds: consumePaymentCards(2), targetObjectKind: kind },
              })
            }
          />
        )}
        <WeaknessSlotsPanel slots={view.intrudersPool.weaknessSlots} />

        {/* Отказ движка: игрок должен понимать, почему действие не прошло */}
        {rejection && (
          <div className="text-xs bg-amber-950/40 border border-amber-900/60 p-2 rounded flex items-start gap-2 text-amber-200">
            <Ban size={14} className="mt-0.5 shrink-0" />
            <span>{rejection}</span>
          </div>
        )}
      </div>

      {/* Панель выбора коридора для Осторожного движения */}
      {isCarefulSelecting && canMoveHere && (
        <CarefulMovePanel
          choices={availableCorridorNumbers}
          hasFreeTechnical={hasFreeTechnical}
          onChoose={handleCarefulMove}
          onCancel={() => setCarefulTargetRoomId(null)}
          onHoverNumber={handleCarefulHoverNumber}
          onHoverTechnical={handleCarefulHoverTechnical}
        />
      )}

      {/* Действия: только те, что разрешены правилами. */}
      <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
        {isPlayerHere && room.isExplored && (
          <div className="flex flex-col gap-1.5">
            {/* Поиск в отсеке: запрещён в Бою (стр. 18) */}
            {room.definitionId !== 'NEST' && room.definitionId !== 'SLIME_ROOM' && (room.itemsCount ?? 0) > 0 && (
              <button
                type="button"
                onClick={handleSearch}
                disabled={isActiveInCombat}
                title={isActiveInCombat ? 'В Бою поиск запрещён (стр. 18)' : undefined}
                className={`w-full min-h-[38px] font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition ${
                  isActiveInCombat
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-500 text-slate-950 active:scale-95'
                }`}
              >
                <Package size={14} /> Обыскать отсек [цена: 1]
              </button>
            )}

            {/* Действие комнаты: запрещено в Бою и при Неисправности (стр. 18, 24) */}
            {roomDef && roomDef.actionCost > 0 && !room.hasMalfunction && (
              <button
                type="button"
                onClick={handleRoomAbility}
                disabled={isActiveInCombat}
                title={isActiveInCombat ? 'В Бою Действия Комнат запрещены (стр. 18)' : undefined}
                className={`w-full min-h-[38px] font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition ${
                  isActiveInCombat
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 active:scale-95'
                }`}
              >
                <span>Использовать консоль отсека [цена: {roomDef.actionCost}]</span>
              </button>
            )}
          </div>
        )}

        {canMoveHere && !isCarefulSelecting && (
          <div className="flex flex-col gap-1.5">
            <button
              onClick={handleNormalMove}
              className={`w-full min-h-[40px] ${
                movingFromCombat
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-slate-950'
              } font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 active:scale-95 transition`}
            >
              <Footprints size={14} /> {movingFromCombat ? 'Побег [цена: 1]' : 'Движение [цена: 1]'}
            </button>
            <button
              onClick={() => setCarefulTargetRoomId(room.id)}
              disabled={isActiveInCombat}
              title={
                isActiveInCombat
                  ? 'Осторожное движение нельзя выполнять в Бою (стр. 13); выход из отсека — Побег (Шаг 7)'
                  : undefined
              }
              className={`w-full min-h-[36px] font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition ${
                isActiveInCombat
                  ? 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed'
                  : 'bg-slate-800 hover:bg-slate-700 border border-amber-600/60 text-amber-300 active:scale-95'
              }`}
            >
              <ShieldAlert size={14} /> Осторожное движение [цена: 2]
            </button>
          </div>
        )}

        {!canMoveHere && !isPlayerHere && (
          <div className="w-full min-h-[44px] bg-slate-900/60 border border-slate-800 text-slate-500 rounded-lg text-xs flex items-center justify-center gap-1.5 px-3 text-center">
            <Ban size={14} /> Сюда нет пути через открытую Дверь
          </div>
        )}
      </div>

      {/* Подтверждение Побега (стр. 19): атаки в спину до шага */}
      {escapePromptOpen && movingFromCombat && (
        <EscapeConfirmDialog
          intruderLabels={escapeIntruders.map((intruder) => INTRUDER_NAMES_RU[intruder.type] ?? intruder.type)}
          onConfirm={confirmEscape}
          onCancel={() => setEscapePromptOpen(false)}
          adrenalineAvailable={adrenalineAvailable}
          onAdrenalineEscape={adrenalineEscape}
        />
      )}
    </div>
  );
};
