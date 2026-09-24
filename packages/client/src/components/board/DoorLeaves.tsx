import React from 'react';
import type { DoorTransitionKind } from './doorTransitionModel';
import { DOOR_GEOMETRY as G, DOOR_PALETTE as P, cssVars } from './doorGeometry';

type Side = -1 | 1;

interface DoorLeafProps {
  side: Side;
  retracted: boolean;
  motionClass?: string;
  motionDelayMs?: number;
}

export function DoorLeaf({ side, retracted, motionClass, motionDelayMs }: DoorLeafProps): React.ReactElement {
  const travel = side * G.leafTravel;
  const top = side < 0 ? -G.opening : 0;
  const stripeY = side < 0 ? -3.2 : 0;
  const panelY = side < 0 ? -G.opening + 1.4 : 4.2;
  return (
    <g
      className={motionClass}
      style={{
        ...cssVars({ '--door-travel': `${travel}px` }),
        transform: `translateY(${retracted ? travel : 0}px)`,
        animationDelay: motionDelayMs ? `${motionDelayMs}ms` : undefined,
      }}
    >
      <rect
        x={-G.leafHalfDepth}
        y={top}
        width={G.leafHalfDepth * 2}
        height={G.opening}
        rx={0.8}
        fill={P.leaf}
        stroke={P.leafEdge}
        strokeWidth={0.6}
      />
      <rect
        x={-G.leafHalfDepth + 1.2}
        y={panelY}
        width={G.leafHalfDepth * 2 - 2.4}
        height={5.4}
        rx={0.5}
        fill="none"
        stroke={P.leafPanel}
        strokeWidth={0.5}
      />
      <rect x={-G.leafHalfDepth} y={stripeY} width={G.leafHalfDepth * 2} height={3.2} fill="url(#door-hazard)" />
    </g>
  );
}

function leafMotion(kind: DoorTransitionKind | undefined): { motionClass?: string; motionDelayMs?: number } {
  if (kind === 'CLOSING') return { motionClass: 'motion-safe:animate-door-leaf-slam' };
  if (kind === 'OPENING') return { motionClass: 'motion-safe:animate-door-leaf-retract', motionDelayMs: 200 };
  return {};
}

export function DoorLeaves({
  doorState,
  kind,
}: {
  doorState: 'OPEN' | 'CLOSED';
  kind: DoorTransitionKind | undefined;
}): React.ReactElement {
  const motion = leafMotion(kind);
  return (
    <g aria-hidden="true">
      <DoorLeaf side={-1} retracted={doorState === 'OPEN'} {...motion} />
      <DoorLeaf side={1} retracted={doorState === 'OPEN'} {...motion} />
    </g>
  );
}
