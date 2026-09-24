/* eslint-disable max-lines -- карта корабля: звёзды с параллаксом, камера, осторожное движение и секвенсор презентаций */
import React from 'react';
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { useTransformEffect } from 'react-zoom-pan-pinch';
import { SHIP_ROOM_NODES, findAdjacentOpenRoomIds, type CorridorNumber } from '@nemesis/shared';
import { useGameStore } from '../../store/gameStore';
import { RoomHex } from './RoomHex';
import { CorridorEdge } from './CorridorEdge';
import { TechCorridorHub } from './TechCorridorHub';
import { VentShaftTraces } from './VentShaftTraces';
import { groupIntrudersByRoom } from './intruderMapModel';
import { lastLogSequence, newVentRetreats, type VentEcho } from './techCorridorModel';
import { BoardAnimationLayer } from './BoardAnimationLayer';
import { DieRollOverlay } from './DieRollOverlay';
import { usePrefersReducedMotion } from './useBoardAnimations';
import { usePresentationSequencer } from './usePresentationSequencer';
import { ContactOverlay } from '../contact/ContactOverlay';
import { carefulMoveChoices } from '../inspector/carefulMoveModel';
import { CarefulMoveOverlay } from './CarefulMoveOverlay';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

function ParallaxStars({ layerRefs }: { layerRefs: { l1: React.RefObject<HTMLDivElement>; l2: React.RefObject<HTMLDivElement>; l3: React.RefObject<HTMLDivElement> } }) {
  // This component lives inside TransformComponent and reports transform to stars layers outside via direct DOM manipulation
  useTransformEffect(({ state }) => {
    const { positionX, positionY, scale } = state;
    // Parallax factors: distant moves slowest
    const factors = [
      { ref: layerRefs.l1, factor: 0.12 },
      { ref: layerRefs.l2, factor: 0.32 },
      { ref: layerRefs.l3, factor: 0.55 },
    ];
    for (const { ref, factor } of factors) {
      if (!ref.current) continue;
      // When map moves +X, stars move +X*factor (slower)
      // Scale: stars scale less than map, so distant stars appear more distant
      const s = 1 + (scale - 1) * factor * 0.6;
      ref.current.style.transform = `translate3d(${positionX * factor}px, ${positionY * factor}px, 0) scale(${s})`;
    }
  });
  return null;
}

function generateStars(count: number, seed: number) {
  // Deterministic pseudo-random
  const stars: Array<{ x: number; y: number; size: number; opacity: number; delay: number; color: string }> = [];
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const colors = ['#ffffff', '#c8d8ff', '#ffe8c8', '#d0e4ff', '#fff4e0'];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rnd() * 140 - 20, // -20% to 120%
      y: rnd() * 140 - 20,
      size: 0.4 + rnd() * 1.6,
      opacity: 0.5 + rnd() * 0.5,
      delay: rnd() * 5,
      color: colors[Math.floor(rnd() * colors.length)]!,
    });
  }
  return stars;
}

const STARS_L1 = generateStars(90, 123);
const STARS_L2 = generateStars(55, 456);
const STARS_L3 = generateStars(32, 789);

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
  const setCarefulHoveredNumber = useGameStore((state) => state.setCarefulHoveredNumber);
  const setCarefulHoveredTechnical = useGameStore((state) => state.setCarefulHoveredTechnical);
  const dispatch = useGameStore((state) => state.dispatch);
  const consumePaymentCards = useGameStore((state) => state.consumePaymentCards);
  const reducedMotion = usePrefersReducedMotion();

  // --- Секвенсор презентаций: строгая последовательность анимаций ---
  const {
    activeBoardAnimations,
    activeDieRoll,
    activeContact,
    renderView,
    inTransitPlayerIds,
    inTransitIntruderIds,
    hiddenNewIntruderIds,
    hasContactTease,
    noisePopCorridorIds,
    noiseRollCorridorIds,
    doorTransitionCorridorIds,
    hasTechnicalNoisePop,
    dismissDieRoll,
    dismissContact,
  } = usePresentationSequencer(view, { reducedMotion });

  const displayView = renderView ?? view;

  // Parallax stars refs (outside TransformComponent, manipulated via useTransformEffect)
  const starsL1Ref = React.useRef<HTMLDivElement>(null);
  const starsL2Ref = React.useRef<HTMLDivElement>(null);
  const starsL3Ref = React.useRef<HTMLDivElement>(null);

  const intrudersByRoom = React.useMemo(
    () =>
      displayView
        ? groupIntrudersByRoom(
            displayView.intrudersPool.boardTokens.filter(
              (token) => !inTransitIntruderIds.has(token.id) && !hiddenNewIntruderIds.has(token.id),
            ),
          )
        : new Map(),
    [displayView, inTransitIntruderIds, hiddenNewIntruderIds],
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
  const gameLog = displayView?.gameLog;
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

  // --- Camera follow после PLAYER_MOVED ---
  const transformRef = React.useRef<ReactZoomPanPinchRef | null>(null);
  const lastMoveSequenceRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!displayView || !gameLog || reducedMotion) return;
    if (lastMoveSequenceRef.current === null) {
      lastMoveSequenceRef.current = lastLogSequence(gameLog);
      return;
    }
    const prevSeq = lastMoveSequenceRef.current;
    lastMoveSequenceRef.current = lastLogSequence(gameLog);

    const activeId = displayView.meta.activePlayerId;
    for (let i = gameLog.length - 1; i >= 0; i--) {
      const entry = gameLog[i]!;
      if (entry.sequence <= prevSeq) break;
      if (entry.event.type === 'PLAYER_MOVED' && entry.event.playerId === activeId) {
        const targetRoomId = entry.event.toRoomId;
        const el = document.getElementById(`room-${targetRoomId}`);
        if (el && transformRef.current?.zoomToElement) {
          try {
            transformRef.current.zoomToElement(el, 1.4, 400);
          } catch {
            const coord = coordsMap.get(targetRoomId);
            if (coord && transformRef.current?.setTransform) {
              transformRef.current.setTransform(-coord.x + 540, -coord.y + 580, 1.4, 400, 'easeOut');
            }
          }
        } else {
          const coord = coordsMap.get(targetRoomId);
          if (coord && transformRef.current?.setTransform) {
            transformRef.current.setTransform(-coord.x + 540, -coord.y + 580, 1.4, 400, 'easeOut');
          }
        }
        break;
      }
    }
  }, [gameLog, displayView, coordsMap, reducedMotion]);

  const reachableRoomIds = React.useMemo(() => {
    if (!displayView) return [] as number[];
    const active = displayView.players[displayView.meta.activePlayerId];
    if (!active) return [] as number[];
    return findAdjacentOpenRoomIds(displayView, active.roomId);
  }, [displayView]);

  const canMoveToSelected = React.useMemo(() => {
    if (selectedRoomId === null) return false;
    return reachableRoomIds.includes(selectedRoomId);
  }, [selectedRoomId, reachableRoomIds]);

  const activeRoomId = React.useMemo(() => {
    if (!displayView) return null;
    return displayView.players[displayView.meta.activePlayerId]?.roomId ?? null;
  }, [displayView]);

  const pathActiveCorridorId = React.useMemo(() => {
    if (!displayView || !activeRoomId || !selectedRoomId || !canMoveToSelected) return null;
    if (carefulTargetRoomId !== null) return null;
    for (const corridor of Object.values(displayView.ship.corridors)) {
      const connects =
        (corridor.fromRoomId === activeRoomId && corridor.toRoomId === selectedRoomId) ||
        (corridor.fromRoomId === selectedRoomId && corridor.toRoomId === activeRoomId);
      if (connects && corridor.doorState !== 'CLOSED') return corridor.id;
    }
    return null;
  }, [displayView, activeRoomId, selectedRoomId, canMoveToSelected, carefulTargetRoomId]);

  const carefulChoices = React.useMemo(() => {
    if (!displayView || carefulTargetRoomId === null) return null;
    return carefulMoveChoices(displayView, carefulTargetRoomId);
  }, [displayView, carefulTargetRoomId]);

  const numberFreeMap = React.useMemo(() => {
    const map = new Map<number, boolean>();
    if (!carefulChoices) return map;
    for (const choice of carefulChoices.choices) {
      map.set(choice.number, choice.isFree);
    }
    return map;
  }, [carefulChoices]);

  const carefulCorridorsForOverlay = React.useMemo(() => {
    if (!displayView || carefulTargetRoomId === null) return [];
    const target = carefulTargetRoomId;
    const result: Array<{
      id: string;
      fromRoomId: number;
      toRoomId: number;
      fromNumbers: readonly number[];
      toNumbers: readonly number[];
      hasNoise: boolean;
      mx: number;
      my: number;
      noiseX: number;
      noiseY: number;
    }> = [];
    for (const corridor of Object.values(displayView.ship.corridors)) {
      if (corridor.fromRoomId !== target && corridor.toRoomId !== target) continue;
      const c1 = coordsMap.get(corridor.fromRoomId);
      const c2 = coordsMap.get(corridor.toRoomId);
      if (!c1 || !c2) continue;
      const dx = c2.x - c1.x;
      const dy = c2.y - c1.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const nx = -uy;
      const ny = ux;
      const mx = (c1.x + c2.x) / 2;
      const my = (c1.y + c2.y) / 2;
      const noiseX = mx - nx * 14;
      const noiseY = my - ny * 14;
      result.push({
        id: corridor.id,
        fromRoomId: corridor.fromRoomId,
        toRoomId: corridor.toRoomId,
        fromNumbers: corridor.fromNumbers,
        toNumbers: corridor.toNumbers,
        hasNoise: corridor.hasNoise,
        mx,
        my,
        noiseX,
        noiseY,
      });
    }
    return result;
  }, [displayView, carefulTargetRoomId, coordsMap]);

  const carefulTargetCoord = React.useMemo(() => {
    if (carefulTargetRoomId === null) return null;
    return coordsMap.get(carefulTargetRoomId) ?? null;
  }, [carefulTargetRoomId, coordsMap]);

  if (!displayView) return null;

  const technicalNoise = displayView.ship.technicalCorridorNoise;

  return (
    <div className="relative w-full h-full touch-none bg-nemesis-bg overflow-hidden">
      {/* --- Звёзды с параллаксом: 3 слоя, двигаются при движении камеры --- */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-[#05070c]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,#0a1020_0%,#070b14_52%,#05070c_100%)]" />
        {/* Layer 1 — дальний, медленный */}
        <div ref={starsL1Ref} className="absolute -left-[20%] -top-[20%] h-[140%] w-[140%] will-change-transform">
          {STARS_L1.map((s, i) => (
            <div
              key={`s1-${i}`}
              className="absolute rounded-full motion-safe:animate-stars-twinkle-1"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: `${s.size}px`,
                height: `${s.size}px`,
                backgroundColor: s.color,
                opacity: s.opacity,
                animationDelay: `${s.delay}s`,
                boxShadow: `0 0 ${s.size * 1.2}px ${s.color}`,
              }}
            />
          ))}
        </div>
        {/* Layer 2 — средний */}
        <div ref={starsL2Ref} className="absolute -left-[20%] -top-[20%] h-[140%] w-[140%] will-change-transform">
          {STARS_L2.map((s, i) => (
            <div
              key={`s2-${i}`}
              className="absolute rounded-full motion-safe:animate-stars-twinkle-2"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: `${s.size}px`,
                height: `${s.size}px`,
                backgroundColor: s.color,
                opacity: s.opacity,
                animationDelay: `${s.delay * 0.8}s`,
                boxShadow: `0 0 ${s.size * 1.5}px ${s.color}`,
              }}
            />
          ))}
        </div>
        {/* Layer 3 — ближний, быстрый, яркий */}
        <div ref={starsL3Ref} className="absolute -left-[20%] -top-[20%] h-[140%] w-[140%] will-change-transform">
          {STARS_L3.map((s, i) => (
            <div
              key={`s3-${i}`}
              className="absolute rounded-full motion-safe:animate-stars-twinkle-3"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: `${s.size}px`,
                height: `${s.size}px`,
                backgroundColor: s.color,
                opacity: s.opacity,
                animationDelay: `${s.delay * 0.6}s`,
                boxShadow: `0 0 ${s.size * 2.2}px ${s.color}, 0 0 ${s.size * 4}px ${s.color}66`,
              }}
            />
          ))}
        </div>
        {/* Лёгкая туманность для глубины */}
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(ellipse_at_20%_30%,#1a2a44_0%,transparent_50%),radial-gradient(ellipse_at_80%_70%,#1a2333_0%,transparent_45%)] pointer-events-none" />
      </div>

      {/* Секвенсированные модалки — только одно окно за раз */}
      <DieRollOverlay entry={activeDieRoll} onClose={dismissDieRoll} />
      {activeContact && displayView && (
        <ContactOverlay view={displayView} entry={activeContact} onClose={dismissContact} />
      )}

      {hasContactTease && (
        <div
          className="pointer-events-none absolute inset-0 z-[30] motion-safe:animate-contact-vignette motion-reduce:opacity-60"
          style={{ boxShadow: 'inset 0 0 80px rgba(255,0,60,0.4)' }}
          aria-hidden="true"
        />
      )}

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
                {/* Parallax controller inside TransformComponent */}
                <ParallaxStars layerRefs={{ l1: starsL1Ref, l2: starsL2Ref, l3: starsL3Ref }} />

                <svg
                  viewBox="-60 0 1140 1160"
                  className={`w-full h-full min-w-[800px] min-h-[600px] select-none ${hasContactTease ? 'motion-safe:animate-shake motion-reduce:animate-none' : ''}`}
                  onClick={() => selectRoom(null)}
                >
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(42, 59, 84, 0.12)" strokeWidth="1" />
                    </pattern>
                    <pattern id="hull-plate" width="120" height="120" patternUnits="userSpaceOnUse">
                      <path d="M 120 0 L 0 0 0 120" fill="none" stroke="rgba(42,59,84,0.18)" strokeWidth="1" />
                      <path
                        d="M 60 0 L 60 120 M 0 60 L 120 60"
                        fill="none"
                        stroke="rgba(42,59,84,0.08)"
                        strokeWidth="0.8"
                      />
                      <circle cx="60" cy="60" r="1.2" fill="rgba(100,116,139,0.12)" />
                    </pattern>
                    <radialGradient id="map-vignette" cx="50%" cy="50%" r="78%">
                      <stop offset="0%" stopColor="#000" stopOpacity="0" />
                      <stop offset="68%" stopColor="#000" stopOpacity="0" />
                      <stop offset="88%" stopColor="#000" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#000" stopOpacity="0.62" />
                    </radialGradient>
                  </defs>

                  <rect x={-60} y={0} width={1140} height={1160} fill="transparent" />
                  <rect x={-60} y={0} width={1140} height={1160} fill="url(#grid)" opacity={0.9} />
                  <rect
                    x={-60}
                    y={0}
                    width={1140}
                    height={1160}
                    fill="url(#hull-plate)"
                    opacity={0.14}
                    className="pointer-events-none"
                  />

                  <VentShaftTraces hasNoise={technicalNoise} />

                  <g id="corridors-layer">
                    {Object.values(displayView.ship.corridors).map((corridor) => {
                      const c1 = coordsMap.get(corridor.fromRoomId);
                      const c2 = coordsMap.get(corridor.toRoomId);
                      if (!c1 || !c2) return null;

                      const isPathActive = corridor.id === pathActiveCorridorId;
                      const isNoisePop = noisePopCorridorIds.has(corridor.id);
                      const isNoiseRollTarget = noiseRollCorridorIds.has(corridor.id);

                      let carefulState: 'free' | 'busy' | 'hovered-free' | 'hovered-busy' | null = null;
                      let ghostFree = true;
                      let onCorridorClick: (() => void) | undefined;

                      if (carefulTargetRoomId !== null && displayView.ship.rooms[carefulTargetRoomId]) {
                        const leadsIntoTarget =
                          corridor.fromRoomId === carefulTargetRoomId || corridor.toRoomId === carefulTargetRoomId;
                        if (leadsIntoTarget) {
                          const relevantNumbers =
                            corridor.fromRoomId === carefulTargetRoomId ? corridor.fromNumbers : corridor.toNumbers;

                          if (carefulHoveredNumber !== null) {
                            if (relevantNumbers.includes(carefulHoveredNumber)) {
                              const isFree = numberFreeMap.get(carefulHoveredNumber) ?? false;
                              carefulState = isFree ? 'hovered-free' : 'hovered-busy';
                              ghostFree = isFree;
                            }
                          } else if (!carefulHoveredTechnical) {
                            carefulState = corridor.hasNoise ? 'busy' : 'free';
                          }

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
                          isNoisePop={isNoisePop}
                          isNoiseRollTarget={isNoiseRollTarget}
                          carefulState={carefulState}
                          ghostFree={ghostFree}
                          doorTransition={doorTransitionCorridorIds.get(corridor.id) ?? null}
                          onClick={onCorridorClick}
                        />
                      );
                    })}
                  </g>

                  <g id="rooms-layer">
                    {Object.values(displayView.ship.rooms).map((room) => {
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

                  <BoardAnimationLayer view={displayView} animations={activeBoardAnimations} reducedMotion={reducedMotion} />

                  <TechCorridorHub
                    hasNoise={technicalNoise}
                    isSelected={technicalCorridorsOpen}
                    echoes={ventEchoes}
                    onSelect={openTechnicalCorridors}
                    carefulState={
                      carefulTargetRoomId !== null && displayView.ship.rooms[carefulTargetRoomId]?.hasTechnicalCorridorEntrance
                        ? carefulHoveredTechnical
                          ? 'hovered-free'
                          : technicalNoise
                            ? 'busy'
                            : 'free'
                        : null
                    }
                    isGhostNoise={carefulHoveredTechnical}
                    isNoisePop={hasTechnicalNoisePop}
                    isNoiseRollTarget={activeBoardAnimations.some((a) => a.kind === 'NOISE_ROLL' && a.isTechnical)}
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

                  {carefulTargetRoomId !== null && carefulChoices && carefulTargetCoord && (
                    <CarefulMoveOverlay
                      targetRoomId={carefulTargetRoomId}
                      targetX={carefulTargetCoord.x}
                      targetY={carefulTargetCoord.y}
                      choices={carefulChoices.choices}
                      hasFreeTechnical={carefulChoices.hasFreeTechnical && !technicalNoise}
                      hoveredNumber={carefulHoveredNumber}
                      hoveredTechnical={carefulHoveredTechnical}
                      corridors={carefulCorridorsForOverlay}
                      onChoose={(chosen) => {
                        const discardCardIds = consumePaymentCards(2);
                        dispatch({
                          type: 'ACTION_CAREFUL_MOVE',
                          payload: { targetRoomId: carefulTargetRoomId, chosenCorridor: chosen, discardCardIds },
                        });
                        setCarefulTargetRoomId(null);
                      }}
                      onCancel={() => setCarefulTargetRoomId(null)}
                      onHoverNumber={(num) => setCarefulHoveredNumber(num)}
                      onHoverTechnical={(h) => setCarefulHoveredTechnical(h)}
                    />
                  )}

                  <rect
                    x={-60}
                    y={0}
                    width={1140}
                    height={1160}
                    fill="url(#map-vignette)"
                    className="pointer-events-none"
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
