import React from 'react';
import { DoorLeaves } from './DoorLeaves';
import { DoorTransitionFx } from './DoorTransitionFx';
import {
  DOOR_BLAST_DELAY_MS,
  DOOR_STATE_LABELS,
  type DoorState,
  type DoorTransition,
  type DoorTransitionKind,
} from './doorTransitionModel';
import { DOOR_GEOMETRY as G, DOOR_PALETTE as P, DOOR_SCALE } from './doorGeometry';

interface CorridorDoorProps {
  doorState: DoorState;
  cx: number;
  cy: number;
  angleDeg: number;
  transition: DoorTransition | null;
}

type Side = -1 | 1;
const SIDES: readonly Side[] = [-1, 1];

function wreckRevealStyle(kind: DoorTransitionKind | undefined): React.CSSProperties | undefined {
  if (kind !== 'BREACH' && kind !== 'BLAST') return undefined;
  return { animationDelay: `${DOOR_BLAST_DELAY_MS[kind] + 40}ms` };
}

export function DoorDefs(): React.ReactElement {
  return (
    <>
      <pattern id="door-hazard" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="3" height="3" fill="#0b0f16" />
        <rect width="1.5" height="3" fill="#f5b400" />
      </pattern>
      <radialGradient id="door-scorch" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ff7a18" stopOpacity="0.4" />
        <stop offset="45%" stopColor="#3a1406" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#05070c" stopOpacity="0" />
      </radialGradient>
    </>
  );
}

function DoorPocket({ side, damaged }: { side: Side; damaged: boolean }) {
  const y = side < 0 ? -G.pocketOuter : G.pocketInner;
  const length = G.pocketOuter - G.pocketInner;
  return (
    <g>
      <rect
        x={-G.pocketHalfDepth}
        y={y}
        width={G.pocketHalfDepth * 2}
        height={length}
        rx={1.2}
        fill={damaged ? P.pocketDamaged : P.pocket}
        stroke={damaged ? P.charredEdge : P.pocketEdge}
        strokeWidth={0.7}
      />
      <line
        x1={-G.pocketHalfDepth + 1.2}
        x2={G.pocketHalfDepth - 1.2}
        y1={y + length / 2}
        y2={y + length / 2}
        stroke={P.pocketEdge}
        strokeWidth={0.5}
        opacity={0.8}
      />
    </g>
  );
}

function DoorJamb({ side }: { side: Side }) {
  const y = side < 0 ? -G.opening - G.jambThickness / 2 : G.opening - G.jambThickness / 2;
  return (
    <g>
      <rect
        x={-G.jambHalfDepth}
        y={y}
        width={G.jambHalfDepth * 2}
        height={G.jambThickness}
        rx={0.8}
        fill={P.jamb}
        stroke={P.jambEdge}
        strokeWidth={0.7}
      />
      <circle cx={-G.jambHalfDepth + 1.4} cy={y + G.jambThickness / 2} r={0.55} fill={P.bolt} />
      <circle cx={G.jambHalfDepth - 1.4} cy={y + G.jambThickness / 2} r={0.55} fill={P.bolt} />
    </g>
  );
}

function StatusLights({ doorState, blinking }: { doorState: DoorState; blinking: boolean }) {
  const color = doorState === 'OPEN' ? P.ledOpen : doorState === 'CLOSED' ? P.ledClosed : P.ledDead;
  const animation = blinking
    ? 'motion-safe:animate-door-led-blink'
    : doorState === 'CLOSED'
      ? 'motion-safe:animate-door-seal-pulse'
      : undefined;
  return (
    <g aria-hidden="true">
      {SIDES.map((side) => (
        <g key={side} className={animation}>
          <circle cy={side * G.opening} r={2.6} fill={color} opacity={0.28} />
          <circle cy={side * G.opening} r={1.3} fill={color} stroke="#05070c" strokeWidth={0.4} />
        </g>
      ))}
    </g>
  );
}

function SealedSeam({ locking }: { locking: boolean }) {
  const boltClass = locking ? 'motion-safe:animate-door-bolt-lock' : undefined;
  const boltStyle: React.CSSProperties = {
    transformBox: 'fill-box',
    transformOrigin: 'center',
    animationDelay: locking ? '460ms' : undefined,
  };
  return (
    <g aria-hidden="true">
      <circle r={14} fill={P.ledClosed} opacity={0.07} />
      <line
        x1={-G.leafHalfDepth}
        x2={G.leafHalfDepth}
        y1={0}
        y2={0}
        stroke={P.ledClosed}
        strokeWidth={3.4}
        strokeOpacity={0.35}
        className="motion-safe:animate-door-seal-pulse"
      />
      <line x1={-G.leafHalfDepth} x2={G.leafHalfDepth} y1={0} y2={0} stroke={P.ledClosed} strokeWidth={0.9} />
      <rect
        x={-2}
        y={-1.9}
        width={0.9}
        height={3.8}
        rx={0.3}
        fill={P.lockPin}
        className={boltClass}
        style={boltStyle}
      />
      <rect
        x={1.1}
        y={-1.9}
        width={0.9}
        height={3.8}
        rx={0.3}
        fill={P.lockPin}
        className={boltClass}
        style={boltStyle}
      />
    </g>
  );
}

const DEBRIS = [
  { x: 8.5, y: -4, rot: 25, w: 2.4, h: 1.2 },
  { x: -9, y: 3, rot: -40, w: 2, h: 1.4 },
  { x: 11.5, y: 5.5, rot: 70, w: 1.6, h: 1 },
  { x: -12, y: -6, rot: 15, w: 1.8, h: 1 },
] as const;

function DoorWreck({ kind }: { kind: DoorTransitionKind | undefined }) {
  const revealing = kind === 'BREACH' || kind === 'BLAST';
  return (
    <g
      aria-hidden="true"
      className={revealing ? 'motion-safe:animate-door-wreck-reveal' : undefined}
      style={wreckRevealStyle(kind)}
    >
      <ellipse rx={9} ry={15} fill="url(#door-scorch)" />
      <path
        d="M -3 -8.6 L -1.6 -6 L -0.4 -7.4 L 1 -5 L 2.4 -7 M -3 8.6 L -1.2 6.2 L 0.2 7.6 L 1.6 5.2 L 2.8 7.8"
        fill="none"
        stroke={P.ember}
        strokeWidth={0.7}
        strokeLinecap="round"
        opacity={0.85}
        className="motion-safe:animate-door-ember"
      />
      {DEBRIS.map((piece) => (
        <rect
          key={`${piece.x}-${piece.y}`}
          x={piece.x - piece.w / 2}
          y={piece.y - piece.h / 2}
          width={piece.w}
          height={piece.h}
          fill={P.debris}
          opacity={0.85}
          transform={`rotate(${piece.rot} ${piece.x} ${piece.y})`}
        />
      ))}
      <g transform={`rotate(-9 0 ${-G.opening})`}>
        <polygon
          points="-2.8,-9.4 -1.8,-5.4 -0.6,-7.8 0.6,-4 1.8,-6.9 2.8,-9.4"
          fill={P.shard}
          stroke={P.charredEdge}
          strokeWidth={0.5}
        />
      </g>
      <g transform={`rotate(7 0 ${G.opening})`}>
        <polygon
          points="-2.8,9.4 -1.3,6.6 0,8.2 1.5,5 2.8,9.4"
          fill={P.shard}
          stroke={P.charredEdge}
          strokeWidth={0.5}
        />
      </g>
      <circle cx={1.2} cy={-2} r={0.9} fill={P.ember} className="motion-safe:animate-door-ember" />
      <circle
        cx={-1.5}
        cy={3}
        r={0.6}
        fill={P.ember}
        className="motion-safe:animate-door-ember"
        style={{ animationDelay: '700ms' }}
      />
      <circle
        cy={-G.opening}
        r={1.3}
        fill={P.ember}
        className="motion-safe:animate-door-led-flicker motion-reduce:opacity-20"
      />
    </g>
  );
}

export const CorridorDoor: React.FC<CorridorDoorProps> = ({ doorState, cx, cy, angleDeg, transition }) => {
  const kind = transition?.kind;
  const isDestroyed = doorState === 'DESTROYED';
  const shakeClass = kind === 'CLOSING' ? 'motion-safe:animate-door-impact-shake' : undefined;

  return (
    <g
      transform={`translate(${cx} ${cy}) rotate(${angleDeg}) scale(${DOOR_SCALE})`}
      className="pointer-events-none"
      role="img"
      aria-label={DOOR_STATE_LABELS[doorState]}
      data-door-state={doorState}
    >
      <title>{DOOR_STATE_LABELS[doorState]}</title>
      <g className={shakeClass} style={shakeClass ? { animationDelay: '390ms' } : undefined}>
        {doorState === 'OPEN' && (
          <rect
            x={-G.leafHalfDepth}
            y={-G.opening}
            width={G.leafHalfDepth * 2}
            height={G.opening * 2}
            fill={P.floor}
            opacity={0.35}
          />
        )}
        {isDestroyed ? (
          <rect
            x={-G.jambHalfDepth}
            y={-G.opening}
            width={G.jambHalfDepth * 2}
            height={G.opening * 2}
            fill={P.floor}
            opacity={0.55}
          />
        ) : (
          <DoorLeaves doorState={doorState} kind={kind} />
        )}
        {SIDES.map((side) => (
          <DoorPocket key={`pocket-${side}`} side={side} damaged={isDestroyed && kind === undefined} />
        ))}
        {SIDES.map((side) => (
          <DoorJamb key={`jamb-${side}`} side={side} />
        ))}
        {doorState === 'CLOSED' && <SealedSeam locking={kind === 'CLOSING'} />}
        {isDestroyed ? <DoorWreck kind={kind} /> : <StatusLights doorState={doorState} blinking={kind !== undefined} />}
      </g>
      {transition && <DoorTransitionFx key={transition.key} transition={transition} />}
    </g>
  );
};
