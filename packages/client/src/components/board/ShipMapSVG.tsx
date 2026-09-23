import React from 'react';
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { SHIP_ROOM_NODES, findAdjacentOpenRoomIds, type CorridorNumber } from '@nemesis/shared';
import { useGameStore } from '../../store/gameStore';
import { RoomHex } from './RoomHex';
import { CorridorEdge } from './CorridorEdge';
import { TechCorridorHub } from './TechCorridorHub';
import { VentShaftTraces } from './VentShaftTraces';
import { groupIntrudersByRoom } from './intruderMapModel';
import { lastLogSequence, newVentRetreats, type VentEcho } from './techCorridorModel';
import { BoardAnimationLayer } from './BoardAnimationLayer';
import { useBoardAnimations, usePrefersReducedMotion } from './useBoardAnimations';
import { carefulMoveChoices } from '../inspector/carefulMoveModel';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export const ShipMapSVG: React.FC<{ highlightRoomIds?: readonly number[] }> = ({ highlightRoomIds = [] }) => {
  const view = useGameStore((state) => state.view);
  const selectedRoomId = useGameStore((state) => state.selectedRoomId);
  const selectRoom = useGameStore((state) => state.selectRoom);
  const technicalCorridorsOpen = useGameStore((state) => state.technicalCorridorsOpen);
  const openTechnicalCorridors = useGameStore((state) => state.openTechnicalCorridors);
  const carefulTargetRoomId = useGameStore((state) => state.carefulMoveTargetRoomId);
  const carefulHoveredNumber = useGameStore((state) => state.carefulHoveredNumber);
  const carefulHoveredTechnical = useGameStore((state) => state.carefulHoveredTechnical);
  const setCarefulTargetRoomId = useGameStore((state) => state.setCarefulMoveTargetRoomId);
  const dispatch = useGameStore((state) => state.dispatch);
  const consumePaymentCards = useGameStore((state) => state.consumePaymentCards);
  const reducedMotion = usePrefersReducedMotion();
  const { animations, inTransitPlayerIds, inTransitIntruderIds } = useBoardAnimations(view);

  const intrudersByRoom = React.useMemo(
    () =>
      view
        ? groupIntrudersByRoom(view.intrudersPool.boardTokens.filter((token) => !inTransitIntruderIds.has(token.id)))
        : new Map(),
    [view, inTransitIntruderIds],
  );

  const coordsMap = React.useMemo(() => {
    const map = new Map<number, { x: number; y: number }>();
    for (const node of SHIP_ROOM_NODES) {
      map.set(node.id, { x: node.x, y: node.y });
    }
    return map;
  }, []);

  // --- Вентиляция: эхо ухода ---
  const [ventEchoes, setVentEchoes] = React.useState<VentEcho[]>([]);
  const seenSequenceRef = React.useRef<number | null>(null);
  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const gameLog = view?.gameLog;
  React.useEffect(() => {
    if (!gameLog) return;
    if (seenSequenceRef.current === null) {
      seenSequenceRef.current = lastLogSequence(gameLog);
      return;
    }
    const fresh = newVentRetreats(gameLog, seenSequenceRef.current);
    seenSequenceRef.current = lastLogSequence(gameLog);
    if (fresh.length === 0) return;
    const echoes = fresh.map((entry) => ({ key: entry.sequence, type: entry.intruderType }));
    setVentEchoes((prev) =>
      [...prev.filter((echo) => !echoes.some((next) => next.key === echo.key)), ...echoes].slice(-4),
    );
    const keys = new Set(echoes.map((echo) => echo.key));
    setTimeout(() => {
      if (mountedRef.current) setVentEchoes((prev) => prev.filter((echo) => !keys.has(echo.key)));
    }, 2600);
  }, [gameLog]);

  // --- Этап 2B: Camera follow после PLAYER_MOVED ---
  const transformRef = React.useRef<ReactZoomPanPinchRef | null>(null);
  const lastMoveSequenceRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!view || !gameLog || reducedMotion) return;
    if (lastMoveSequenceRef.current === null) {
      lastMoveSequenceRef.current = lastLogSequence(gameLog);
      return;
    }
    const prevSeq = lastMoveSequenceRef.current;
    lastMoveSequenceRef.current = lastLogSequence(gameLog);

    // Находим свежие PLAYER_MOVED активного игрока
    const activeId = view.meta.activePlayerId;
    for (let i = gameLog.length - 1; i >= 0; i--) {
      const entry = gameLog[i]!;
      if (entry.sequence <= prevSeq) break;
      if (entry.event.type === 'PLAYER_MOVED' && entry.event.playerId === activeId) {
        const targetRoomId = entry.event.toRoomId;
        // Плавно ведём камеру к целевой комнате, масштаб 1.4, 400мс
        const el = document.getElementById(`room-${targetRoomId}`);
        if (el && transformRef.current?.zoomToElement) {
          try {
            transformRef.current.zoomToElement(el, 1.4, 400);
          } catch {
            // fallback: setTransform к центру комнаты
            const coord = coordsMap.get(targetRoomId);
            if (coord && transformRef.current?.setTransform) {
              // Центрируем: viewBox центр 540,580, целевая координата coord
              // setTransform ожидает translation, масштаб, длительность
              transformRef.current.setTransform(-coord.x + 540, -coord.y + 580, 1.4, 400, 'easeOut');
            }
          }
        } else {
          const coord = coordsMap.get(targetRoomId);
          if (coord && transformRef.current?.setTransform) {
            transformRef.current.setTransform(-coord.x + 540, -coord.y + 580, 1.4, 400, 'easeOut');
          }
        }
        break; // только последний ход
      }
    }
  }, [gameLog, view, coordsMap, reducedMotion]);

  // --- Этап 2B: путь движения и осторожное превью — все хуки до early return ---
  const reachableRoomIds = React.useMemo(() => {
    if (!view) return [] as number[];
    const active = view.players[view.meta.activePlayerId];
    if (!active) return [] as number[];
    return findAdjacentOpenRoomIds(view, active.roomId);
  }, [view]);

  const canMoveToSelected = React.useMemo(() => {
    if (selectedRoomId === null) return false;
    return reachableRoomIds.includes(selectedRoomId);
  }, [selectedRoomId, reachableRoomIds]);

  const activeRoomId = React.useMemo(() => {
    if (!view) return null;
    return view.players[view.meta.activePlayerId]?.roomId ?? null;
  }, [view]);

  const pathActiveCorridorId = React.useMemo(() => {
    if (!view || !activeRoomId || !selectedRoomId || !canMoveToSelected) return null;
    if (carefulTargetRoomId !== null) return null;
    for (const corridor of Object.values(view.ship.corridors)) {
      const connects =
        (corridor.fromRoomId === activeRoomId && corridor.toRoomId === selectedRoomId) ||
        (corridor.fromRoomId === selectedRoomId && corridor.toRoomId === activeRoomId);
      if (connects && corridor.doorState !== 'CLOSED') return corridor.id;
    }
    return null;
  }, [view, activeRoomId, selectedRoomId, canMoveToSelected, carefulTargetRoomId]);

  const carefulChoices = React.useMemo(() => {
    if (!view || carefulTargetRoomId === null) return null;
    return carefulMoveChoices(view, carefulTargetRoomId);
  }, [view, carefulTargetRoomId]);

  const numberFreeMap = React.useMemo(() => {
    const map = new Map<number, boolean>();
    if (!carefulChoices) return map;
    for (const choice of carefulChoices.choices) {
      map.set(choice.number, choice.isFree);
    }
    return map;
  }, [carefulChoices]);

  if (!view) return null;

  const technicalNoise = view.ship.technicalCorridorNoise;

  return (
    <div className="relative w-full h-full touch-none bg-nemesis-bg overflow-hidden">
      <TransformWrapper
        initialScale={1}
        minScale={0.7}
        maxScale={2.8}
        centerOnInit
        limitToBounds={true}
        doubleClick={{ disabled: true }}
        panning={{ velocityDisabled: true }}
        ref={transformRef}
      >
        {({ zoomIn, zoomOut, resetTransform, setTransform, zoomToElement }) => {
          // Сохраняем актуальные функции в ref для camera follow
          if (transformRef.current) {
            transformRef.current.setTransform = setTransform;
            transformRef.current.zoomToElement = zoomToElement as unknown as ReactZoomPanPinchRef['zoomToElement'];
          }
          return (
            <>
              <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 bg-nemesis-hull/90 backdrop-blur border border-nemesis-border p-1.5 rounded-lg shadow-lg">
                <button
                  onClick={() => zoomIn(0.3)}
                  className="p-2 hover:bg-slate-800 text-slate-300 rounded active:scale-95 transition"
                  title="Приблизить"
                >
                  <ZoomIn size={18} />
                </button>
                <button
                  onClick={() => zoomOut(0.3)}
                  className="p-2 hover:bg-slate-800 text-slate-300 rounded active:scale-95 transition"
                  title="Отдалить"
                >
                  <ZoomOut size={18} />
                </button>
                <button
                  onClick={() => resetTransform()}
                  className="p-2 hover:bg-slate-800 text-slate-300 rounded active:scale-95 transition"
                  title="Сбросить масштаб"
                >
                  <RotateCcw size={18} />
                </button>
              </div>

              <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
                <svg
                  viewBox="-60 0 1140 1160"
                  className="w-full h-full min-w-[800px] min-h-[600px] select-none"
                  onClick={() => selectRoom(null)}
                >
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(42, 59, 84, 0.12)" strokeWidth="1" />
                    </pattern>
                  </defs>

                  <rect x={-60} y={0} width={1140} height={1160} fill="url(#grid)" />

                  <VentShaftTraces hasNoise={technicalNoise} />

                  <g id="corridors-layer">
                    {Object.values(view.ship.corridors).map((corridor) => {
                      const c1 = coordsMap.get(corridor.fromRoomId);
                      const c2 = coordsMap.get(corridor.toRoomId);
                      if (!c1 || !c2) return null;

                      // --- Path highlight ---
                      const isPathActive = corridor.id === pathActiveCorridorId;

                      // --- Careful preview ---
                      let carefulState: 'free' | 'busy' | 'hovered-free' | 'hovered-busy' | null = null;
                      let isGhostNoise = false;
                      let ghostFree = true;
                      let onCorridorClick: (() => void) | undefined;

                      if (carefulTargetRoomId !== null && view.ship.rooms[carefulTargetRoomId]) {
                        const leadsIntoTarget =
                          corridor.fromRoomId === carefulTargetRoomId || corridor.toRoomId === carefulTargetRoomId;
                        if (leadsIntoTarget) {
                          const relevantNumbers =
                            corridor.fromRoomId === carefulTargetRoomId ? corridor.fromNumbers : corridor.toNumbers;

                          if (carefulHoveredNumber !== null) {
                            if (relevantNumbers.includes(carefulHoveredNumber)) {
                              const isFree = numberFreeMap.get(carefulHoveredNumber) ?? false;
                              carefulState = isFree ? 'hovered-free' : 'hovered-busy';
                              isGhostNoise = true;
                              ghostFree = isFree;
                            }
                          } else if (!carefulHoveredTechnical) {
                            // Без hover — показываем свободные янтарным, занятые красным
                            carefulState = corridor.hasNoise ? 'busy' : 'free';
                          }

                          // Клик по коридору выбирает его номер (первый свободный из релевантных)
                          if (!corridor.hasNoise) {
                            const freeNumbers = relevantNumbers.filter((n) => numberFreeMap.get(n));
                            if (freeNumbers.length > 0) {
                              const chosenNumber = (
                                carefulHoveredNumber !== null && relevantNumbers.includes(carefulHoveredNumber)
                                  ? carefulHoveredNumber
                                  : freeNumbers[0]
                              ) as CorridorNumber;
                              onCorridorClick = () => {
                                const discardCardIds = consumePaymentCards(2);
                                dispatch({
                                  type: 'ACTION_CAREFUL_MOVE',
                                  payload: {
                                    targetRoomId: carefulTargetRoomId,
                                    chosenCorridor: { kind: 'CORRIDOR_NUMBER', corridorNumber: chosenNumber },
                                    discardCardIds,
                                  },
                                });
                                setCarefulTargetRoomId(null);
                              };
                            }
                          }
                        }
                      }

                      return (
                        <CorridorEdge
                          key={corridor.id}
                          corridor={corridor}
                          x1={c1.x}
                          y1={c1.y}
                          x2={c2.x}
                          y2={c2.y}
                          isPathActive={isPathActive}
                          carefulState={carefulState}
                          isGhostNoise={isGhostNoise}
                          ghostFree={ghostFree}
                          onClick={onCorridorClick}
                        />
                      );
                    })}
                  </g>

                  <g id="rooms-layer">
                    {Object.values(view.ship.rooms).map((room) => {
                      const coord = coordsMap.get(room.id);
                      if (!coord) return null;

                      const isMoveTarget =
                        room.id === selectedRoomId && canMoveToSelected && carefulTargetRoomId === null;

                      return (
                        <RoomHex
                          key={room.id}
                          room={room}
                          intruders={intrudersByRoom.get(room.id) ?? []}
                          x={coord.x}
                          y={coord.y}
                          isSelected={selectedRoomId === room.id}
                          isMoveTarget={isMoveTarget}
                          onSelect={selectRoom}
                          technicalNoise={technicalNoise}
                          hiddenPlayerIds={inTransitPlayerIds}
                          isHighlighted={highlightRoomIds.includes(room.id)}
                        />
                      );
                    })}
                  </g>

                  <BoardAnimationLayer view={view} animations={animations} reducedMotion={reducedMotion} />

                  <TechCorridorHub
                    hasNoise={technicalNoise}
                    isSelected={technicalCorridorsOpen}
                    echoes={ventEchoes}
                    onSelect={openTechnicalCorridors}
                    carefulState={
                      carefulTargetRoomId !== null && view.ship.rooms[carefulTargetRoomId]?.hasTechnicalCorridorEntrance
                        ? carefulHoveredTechnical
                          ? 'hovered-free'
                          : technicalNoise
                            ? 'busy'
                            : 'free'
                        : null
                    }
                    isGhostNoise={carefulHoveredTechnical}
                    onCarefulSelect={
                      carefulTargetRoomId !== null && !technicalNoise
                        ? () => {
                            const discardCardIds = consumePaymentCards(2);
                            dispatch({
                              type: 'ACTION_CAREFUL_MOVE',
                              payload: {
                                targetRoomId: carefulTargetRoomId,
                                chosenCorridor: { kind: 'TECHNICAL_CORRIDOR' },
                                discardCardIds,
                              },
                            });
                            setCarefulTargetRoomId(null);
                          }
                        : undefined
                    }
                  />
                </svg>
              </TransformComponent>
            </>
          );
        }}
      </TransformWrapper>
    </div>
  );
};
