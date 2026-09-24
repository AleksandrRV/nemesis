import React from 'react';
import { DoorLeaf } from './DoorLeaves';
import { DOOR_BLAST_DELAY_MS, type DoorTransition } from './doorTransitionModel';
import { DOOR_GEOMETRY as G, DOOR_PALETTE as P, cssVars } from './doorGeometry';

const CENTERED: React.CSSProperties = { transformBox: 'fill-box', transformOrigin: 'center' };

const SLAM_IMPACT_MS = 390;

const IMPACT_PUFFS = [
  { x: 4.5, y: -1.6, dx: 7, dy: -2.5 },
  { x: 4.5, y: 1.6, dx: 7.5, dy: 2.2 },
  { x: -4.5, y: -1.6, dx: -7, dy: -2.2 },
  { x: -4.5, y: 1.6, dx: -7.5, dy: 2.5 },
] as const;

const STEAM_PUFFS = [
  { dx: 8, dy: -1 },
  { dx: -8, dy: 1 },
  { dx: 5, dy: 2.5 },
] as const;

const SHRAPNEL = [
  { x: 0, y: -8, dx: 24, dy: -9, rot: 220, points: '-1.6,-2 1.8,-1.4 1.2,2 -1.4,1.4' },
  { x: 0, y: -4, dx: -22, dy: -5, rot: -160, points: '-2,-1 1.6,-1.6 2,1.2 -1.2,1.8' },
  { x: 0, y: -1, dx: 18, dy: 3, rot: 300, points: '-1.2,-1.4 1.4,-1 0.8,1.6 -1.6,0.8' },
  { x: 0, y: 2, dx: -19, dy: 6, rot: -250, points: '-1.4,-1.8 1.8,-0.8 1,1.8 -1.8,1' },
  { x: 0, y: 5, dx: 23, dy: 10, rot: 180, points: '-1.8,-1.2 1.4,-1.6 1.8,1.4 -1,1.6' },
  { x: 0, y: 8, dx: -24, dy: 11, rot: -210, points: '-1.6,-1.6 1.6,-1.2 1.2,1.8 -1.4,1.2' },
] as const;

const SPARK_DIRECTIONS = [0, 45, 90, 135, 180, 225, 270, 315] as const;

const SMOKE = [
  { dx: 12, dy: -3 },
  { dx: -12, dy: 3 },
  { dx: 3, dy: -12 },
] as const;

function delay(ms: number): React.CSSProperties {
  return { animationDelay: `${ms}ms` };
}

function ClosingFx() {
  return (
    <g aria-hidden="true">
      <line
        x1={-4}
        x2={4}
        y1={0}
        y2={0}
        stroke="#ffffff"
        strokeWidth={2.2}
        className="motion-safe:animate-door-seam-flash"
        style={delay(SLAM_IMPACT_MS)}
      />
      <circle
        r={9}
        fill="none"
        stroke={P.ledClosed}
        strokeWidth={1.4}
        className="motion-safe:animate-door-blast-wave"
        style={{ ...CENTERED, ...delay(SLAM_IMPACT_MS) }}
      />
      {IMPACT_PUFFS.map((puff) => (
        <circle
          key={`${puff.x}-${puff.y}`}
          cx={puff.x}
          cy={puff.y}
          r={2.4}
          fill={P.debris}
          className="motion-safe:animate-door-puff"
          style={{
            ...CENTERED,
            ...cssVars({ '--puff-x': `${puff.dx}px`, '--puff-y': `${puff.dy}px` }),
            ...delay(SLAM_IMPACT_MS),
          }}
        />
      ))}
    </g>
  );
}

function OpeningFx() {
  return (
    <g aria-hidden="true">
      {[-2, 1.1].map((x) => (
        <rect
          key={x}
          x={x}
          y={-1.9}
          width={0.9}
          height={3.8}
          rx={0.3}
          fill={P.lockPin}
          className="motion-safe:animate-door-bolt-release"
          style={CENTERED}
        />
      ))}
      {STEAM_PUFFS.map((puff) => (
        <circle
          key={`${puff.dx}-${puff.dy}`}
          r={2}
          fill={P.steam}
          opacity={0.7}
          className="motion-safe:animate-door-puff"
          style={{
            ...CENTERED,
            ...cssVars({ '--puff-x': `${puff.dx}px`, '--puff-y': `${puff.dy}px` }),
            ...delay(140),
          }}
        />
      ))}
    </g>
  );
}

function StrainingLeaves({ holdMs }: { holdMs: number }) {
  return (
    <g
      className="motion-safe:animate-door-ghost-hold motion-reduce:hidden"
      style={{ animationDuration: `${holdMs}ms` }}
    >
      <g className="motion-safe:animate-door-strain" style={{ animationDuration: `${holdMs}ms` }}>
        <DoorLeaf side={-1} retracted={false} />
        <DoorLeaf side={1} retracted={false} />
        <rect
          x={-G.leafHalfDepth}
          y={-G.opening}
          width={G.leafHalfDepth * 2}
          height={G.opening * 2}
          fill={P.heat}
          className="motion-safe:animate-door-heat"
          style={{ animationDuration: `${holdMs}ms` }}
        />
        {[-1, 1].map((side) => (
          <circle
            key={side}
            cy={side * G.opening}
            r={1.3}
            fill={P.ledClosed}
            className="motion-safe:animate-door-led-blink"
          />
        ))}
      </g>
    </g>
  );
}

function BlastFx({ blastMs }: { blastMs: number }) {
  return (
    <g aria-hidden="true">
      <circle
        r={10}
        fill={P.flash}
        className="motion-safe:animate-door-blast-flash"
        style={{ ...CENTERED, ...delay(blastMs) }}
      />
      <circle
        r={10}
        fill="none"
        stroke={P.ember}
        strokeWidth={1.8}
        className="motion-safe:animate-door-blast-wave"
        style={{ ...CENTERED, ...delay(blastMs) }}
      />
      {SHRAPNEL.map((shard) => (
        <g key={`${shard.dx}-${shard.dy}`} transform={`translate(${shard.x} ${shard.y})`}>
          <polygon
            points={shard.points}
            fill={P.leaf}
            stroke={P.ember}
            strokeWidth={0.4}
            className="motion-safe:animate-door-shrapnel"
            style={{
              ...CENTERED,
              ...cssVars({
                '--shard-x': `${shard.dx}px`,
                '--shard-y': `${shard.dy}px`,
                '--shard-rot': `${shard.rot}deg`,
              }),
              ...delay(blastMs),
            }}
          />
        </g>
      ))}
      {SPARK_DIRECTIONS.map((angle, index) => {
        const radians = (angle * Math.PI) / 180;
        const reach = 13 + (index % 3) * 4;
        return (
          <circle
            key={angle}
            r={0.9}
            fill="#ffd166"
            className="motion-safe:animate-door-spark-fly"
            style={{
              ...CENTERED,
              ...cssVars({
                '--spark-x': `${(Math.cos(radians) * reach).toFixed(1)}px`,
                '--spark-y': `${(Math.sin(radians) * reach).toFixed(1)}px`,
              }),
              ...delay(blastMs + (index % 2) * 40),
            }}
          />
        );
      })}
      {SMOKE.map((puff, index) => (
        <circle
          key={`${puff.dx}-${puff.dy}`}
          r={4}
          fill={P.smoke}
          className="motion-safe:animate-door-smoke"
          style={{
            ...CENTERED,
            ...cssVars({ '--puff-x': `${puff.dx}px`, '--puff-y': `${puff.dy}px` }),
            ...delay(blastMs + 80 + index * 60),
          }}
        />
      ))}
    </g>
  );
}

export function DoorTransitionFx({ transition }: { transition: DoorTransition }): React.ReactElement {
  const kind = transition.kind;
  return (
    <g className="pointer-events-none" data-door-transition={kind}>
      {kind === 'CLOSING' && <ClosingFx />}
      {kind === 'OPENING' && <OpeningFx />}
      {kind === 'BREACH' && <StrainingLeaves holdMs={DOOR_BLAST_DELAY_MS.BREACH} />}
      {(kind === 'BREACH' || kind === 'BLAST') && <BlastFx blastMs={DOOR_BLAST_DELAY_MS[kind]} />}
    </g>
  );
}
