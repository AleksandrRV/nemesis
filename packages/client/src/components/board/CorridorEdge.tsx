import React from 'react';
import type { CorridorConnection } from '@nemesis/shared';
import { CorridorDoor } from './CorridorDoor';
import type { DoorTransition } from './doorTransitionModel';

interface CorridorEdgeProps {
  corridor: CorridorConnection;
  x1: number;
  y1: number;
  y2: number;
  x2: number;
  isPathActive?: boolean;
  isNoisePop?: boolean;
  isNoiseRollTarget?: boolean;
  carefulState?: 'free' | 'busy' | 'hovered-free' | 'hovered-busy' | null;
  /** Призрачный маркер «осторожного движения» — состояние места, куда встанет шум. */
  ghostFree?: boolean;
  doorTransition?: DoorTransition | null;
  onClick?: () => void;
}

export const CorridorEdge: React.FC<CorridorEdgeProps> = ({
  corridor,
  x1,
  y1,
  x2,
  y2,
  isPathActive = false,
  isNoisePop = false,
  isNoiseRollTarget = false,
  carefulState = null,
  ghostFree = true,
  doorTransition = null,
  onClick,
}) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  const ux = dx / len;
  const uy = dy / len;

  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  const isWide = corridor.fromNumbers.length > 1 || corridor.toNumbers.length > 1;

  const safeOffset = Math.min(54, len * 0.38);
  const num1X = x1 + ux * safeOffset;
  const num1Y = y1 + uy * safeOffset;
  const num2X = x2 - ux * safeOffset;
  const num2Y = y2 - uy * safeOffset;

  const textFrom = corridor.fromNumbers.join(',');
  const textTo = corridor.toNumbers.join(',');

  const isClickable = Boolean(onClick);

  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  return (
    <g
      className={`select-none ${isClickable ? 'cursor-pointer' : ''}`}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
    >
      {isPathActive && (
        <>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#00f0ff" strokeOpacity={0.22} strokeWidth={12} />
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#00f0ff"
            strokeOpacity={0.45}
            strokeWidth={6}
            className="motion-safe:animate-pulse"
          />
        </>
      )}

      {isNoiseRollTarget && (
        <>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffb700" strokeOpacity={0.32} strokeWidth={13} />
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#ffb700"
            strokeOpacity={0.85}
            strokeWidth={4}
            className="motion-safe:animate-noise-flash motion-reduce:animate-none"
          />
        </>
      )}

      {carefulState && (
        <>
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={carefulState.includes('free') ? '#ffb700' : '#ff3b5c'}
            strokeOpacity={carefulState.includes('hovered') ? 0.42 : 0.26}
            strokeWidth={carefulState.includes('hovered') ? 14 : 9}
          />
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={carefulState.includes('free') ? '#ffb700' : '#ff3b5c'}
            strokeOpacity={carefulState.includes('hovered') ? 0.88 : 0.55}
            strokeWidth={carefulState.includes('hovered') ? 4 : 3}
            strokeDasharray={carefulState.includes('busy') ? '6,4' : undefined}
            className={carefulState.includes('hovered') ? 'motion-safe:animate-pulse' : undefined}
          />
        </>
      )}

      {isNoisePop && (
        <g className="pointer-events-none">
          <circle
            cx={mx}
            cy={my}
            r={20}
            fill="none"
            stroke="#ff5500"
            strokeWidth={2.5}
            className="motion-safe:animate-noise-ripple motion-reduce:animate-none"
            style={{ transformBox: 'fill-box', transformOrigin: `${mx}px ${my}px` } as React.CSSProperties}
          />
        </g>
      )}

      {isWide && !isPathActive && !carefulState && !isNoiseRollTarget && (
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#38bdf8" strokeOpacity={0.15} strokeWidth={10} />
      )}

      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={
          isPathActive
            ? '#00f0ff'
            : isNoiseRollTarget
              ? '#ffb700'
              : carefulState
                ? carefulState.includes('free')
                  ? '#ffb700'
                  : '#ff3b5c'
                : corridor.hasNoise
                  ? '#ff5500'
                  : isWide
                    ? '#38bdf8'
                    : '#1e293b'
        }
        strokeWidth={isPathActive || carefulState || isNoiseRollTarget ? 3.2 : corridor.hasNoise ? 3 : isWide ? 2.5 : 2}
        className={`${isClickable ? 'transition-all duration-150' : ''} ${corridor.hasNoise && !isPathActive && !carefulState && !isNoiseRollTarget ? 'motion-safe:animate-noise-glow motion-reduce:animate-none' : ''}`}
      />

      {/* Призрачный маркер осторожного движения: куда ляжет шум */}
      {carefulState && carefulState.includes('hovered') && (
        <g className="pointer-events-none" aria-hidden="true">
          <circle
            cx={mx}
            cy={my}
            r={9}
            fill={ghostFree ? '#ffb700' : '#ff003c'}
            opacity={0.32}
            stroke={ghostFree ? '#ffb700' : '#ff003c'}
            strokeWidth={1.6}
            strokeDasharray="3,2"
            className="motion-safe:animate-pulse"
          />
        </g>
      )}

      <CorridorDoor doorState={corridor.doorState} cx={mx} cy={my} angleDeg={angleDeg} transition={doorTransition} />

      {/* Плашка цифр */}
      <g className="pointer-events-none">
        <rect
          x={num1X - (textFrom.length > 1 ? 9 : 6)}
          y={num1Y - 6.5}
          width={textFrom.length > 1 ? 18 : 12}
          height={13}
          rx={3}
          fill="#060a12"
          stroke={
            isPathActive
              ? '#00f0ff'
              : isNoiseRollTarget
                ? '#ffb700'
                : carefulState
                  ? carefulState.includes('free')
                    ? '#ffb700'
                    : '#ff3b5c'
                  : isWide
                    ? '#38bdf8'
                    : '#475569'
          }
          strokeWidth={1}
        />
        <text x={num1X} y={num1Y + 3} textAnchor="middle" className="text-[8px] font-mono fill-cyan-300 font-bold">
          {textFrom}
        </text>
      </g>

      <g className="pointer-events-none">
        <rect
          x={num2X - (textTo.length > 1 ? 9 : 6)}
          y={num2Y - 6.5}
          width={textTo.length > 1 ? 18 : 12}
          height={13}
          rx={3}
          fill="#060a12"
          stroke={
            isPathActive
              ? '#00f0ff'
              : isNoiseRollTarget
                ? '#ffb700'
                : carefulState
                  ? carefulState.includes('free')
                    ? '#ffb700'
                    : '#ff3b5c'
                  : isWide
                    ? '#38bdf8'
                    : '#475569'
          }
          strokeWidth={1}
        />
        <text x={num2X} y={num2Y + 3} textAnchor="middle" className="text-[8px] font-mono fill-cyan-300 font-bold">
          {textTo}
        </text>
      </g>
    </g>
  );
};
