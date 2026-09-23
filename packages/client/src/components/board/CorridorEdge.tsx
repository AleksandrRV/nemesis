import React from 'react';
import type { CorridorConnection } from '@nemesis/shared';
import { Volume2 } from 'lucide-react';

interface CorridorEdgeProps {
  corridor: CorridorConnection;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isPathActive?: boolean;
  isNoisePop?: boolean;
  isNoiseRollTarget?: boolean;
  carefulState?: 'free' | 'busy' | 'hovered-free' | 'hovered-busy' | null;
  isGhostNoise?: boolean;
  ghostFree?: boolean;
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
  isGhostNoise = false,
  ghostFree = true,
  onClick,
}) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;

  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  const noiseX = mx - nx * 14;
  const noiseY = my - ny * 14;

  const isWide = corridor.fromNumbers.length > 1 || corridor.toNumbers.length > 1;

  const safeOffset = Math.min(54, len * 0.38);
  const num1X = x1 + ux * safeOffset;
  const num1Y = y1 + uy * safeOffset;
  const num2X = x2 - ux * safeOffset;
  const num2Y = y2 - uy * safeOffset;

  const textFrom = corridor.fromNumbers.join(',');
  const textTo = corridor.toNumbers.join(',');

  const isClickable = Boolean(onClick);

  const doorState = corridor.doorState;

  // Геометрия перемычки поперёк коридора для CLOSED/DESTROYED
  const barrierHalf = 16;
  const barrierX1 = mx + nx * barrierHalf;
  const barrierY1 = my + ny * barrierHalf;
  const barrierX2 = mx - nx * barrierHalf;
  const barrierY2 = my - ny * barrierHalf;

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
      <defs>
        <filter id={`door-shadow-${corridor.id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#000" floodOpacity="0.7" />
        </filter>
        <filter id={`door-inner-${corridor.id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feOffset dx="0" dy="0" />
          <feGaussianBlur stdDeviation="1.5" result="offset-blur" />
          <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
          <feFlood floodColor="#000" floodOpacity="0.65" result="color" />
          <feComposite operator="in" in="color" in2="inverse" result="shadow" />
          <feComposite operator="over" in="shadow" in2="SourceGraphic" />
        </filter>
      </defs>

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
          {[18, 26, 34].map((r, idx) => (
            <circle
              key={r}
              cx={mx}
              cy={my}
              r={r}
              fill="none"
              stroke="#ff5500"
              strokeWidth={1.6}
              strokeOpacity={0.7 - idx * 0.18}
              className="motion-safe:animate-vent-alarm motion-reduce:opacity-0"
              style={{ animationDelay: `${idx * 120}ms` } as React.CSSProperties}
            />
          ))}
        </g>
      )}

      {isWide && !isPathActive && !carefulState && !isNoisePop && !isNoiseRollTarget && (
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
        strokeDasharray={doorState === 'DESTROYED' ? '4,4' : undefined}
        className={isClickable ? 'transition-all duration-150' : undefined}
      />

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

      {/* Дверь как барьер — Этап D10 */}
      {doorState === 'CLOSED' && (
        <g className="pointer-events-none" aria-label="Дверь закрыта — барьер">
          {/* Внешнее свечение */}
          <line
            x1={barrierX1}
            y1={barrierY1}
            x2={barrierX2}
            y2={barrierY2}
            stroke="#ff003c"
            strokeOpacity={0.28}
            strokeWidth={12}
            strokeLinecap="round"
          />
          {/* Толстая перемычка поперёк коридора */}
          <line
            x1={barrierX1}
            y1={barrierY1}
            x2={barrierX2}
            y2={barrierY2}
            stroke="#ff003c"
            strokeWidth={6}
            strokeLinecap="round"
            filter={`url(#door-shadow-${corridor.id})`}
          />
          {/* Inner shadow / блик */}
          <line
            x1={barrierX1}
            y1={barrierY1}
            x2={barrierX2}
            y2={barrierY2}
            stroke="#7a001a"
            strokeOpacity={0.55}
            strokeWidth={1.8}
            strokeLinecap="round"
            style={{ transform: 'translateY(1px)' } as React.CSSProperties}
          />
          {/* Заклёпки по краям перемычки */}
          <circle cx={barrierX1} cy={barrierY1} r={2.2} fill="#ff4d6d" stroke="#05070c" strokeWidth={0.8} />
          <circle cx={barrierX2} cy={barrierY2} r={2.2} fill="#ff4d6d" stroke="#05070c" strokeWidth={0.8} />
        </g>
      )}

      {doorState === 'DESTROYED' && (
        <g className="pointer-events-none" aria-label="Дверь разрушена">
          {/* Рваная линия — толстая с dash + искры */}
          <line
            x1={barrierX1}
            y1={barrierY1}
            x2={barrierX2}
            y2={barrierY2}
            stroke="#ff5500"
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray="4,4"
            opacity={0.9}
          />
          <line
            x1={barrierX1}
            y1={barrierY1}
            x2={barrierX2}
            y2={barrierY2}
            stroke="#ffb700"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="2,5"
            className="motion-safe:animate-door-spark motion-reduce:opacity-80"
          />
          {/* Искры по краям */}
          <g className="motion-safe:animate-door-spark motion-reduce:animate-none">
            <circle cx={barrierX1} cy={barrierY1} r={1.6} fill="#ffb700" />
            <circle cx={barrierX2} cy={barrierY2} r={1.6} fill="#ffb700" />
          </g>
          {/* Тень обломков */}
          <line
            x1={barrierX1}
            y1={barrierY1}
            x2={barrierX2}
            y2={barrierY2}
            stroke="#000"
            strokeOpacity={0.35}
            strokeWidth={7}
            strokeLinecap="round"
            style={{ transform: 'translateY(2px)' } as React.CSSProperties}
          />
        </g>
      )}

      {doorState === 'OPEN' && (
        <g className="pointer-events-none" aria-label="Дверь открыта">
          {/* Открытая — тонкий разрыв, два маленьких штриха по краям */}
          <line
            x1={mx + nx * 6}
            y1={my + ny * 6}
            x2={mx + nx * 12}
            y2={my + ny * 12}
            stroke="#1e293b"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.9}
          />
          <line
            x1={mx - nx * 6}
            y1={my - ny * 6}
            x2={mx - nx * 12}
            y2={my - ny * 12}
            stroke="#1e293b"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.9}
          />
        </g>
      )}

      {/* Шум */}
      <g
        transform={`translate(${noiseX}, ${noiseY})`}
        aria-label={corridor.hasNoise ? 'Маркер шума' : 'Шума нет'}
        className={isClickable ? 'pointer-events-none' : undefined}
      >
        <circle cx={0} cy={0} r={16} fill="transparent" className={isClickable ? 'pointer-events-auto' : undefined} />
        <circle
          cx={0}
          cy={0}
          r={8.5}
          fill={corridor.hasNoise ? '#ff5500' : '#0f172a'}
          stroke={corridor.hasNoise ? '#ffaa00' : '#334155'}
          strokeWidth={1.5}
          className={`${isNoisePop ? 'motion-safe:animate-token-pop' : 'group-hover:stroke-cyan-400'} transition-colors`}
        />
        <Volume2
          size={10}
          className={`pointer-events-none ${corridor.hasNoise ? 'text-white' : 'text-slate-500'} ${isNoisePop ? 'motion-safe:animate-token-pop' : ''}`}
          x={-5}
          y={-5}
        />
      </g>

      {isGhostNoise && (
        <g transform={`translate(${noiseX}, ${noiseY})`} className="pointer-events-none">
          <circle
            cx={0}
            cy={0}
            r={11}
            fill={ghostFree ? '#ffb700' : '#ff003c'}
            opacity={0.18}
            stroke={ghostFree ? '#ffb700' : '#ff003c'}
            strokeWidth={1.6}
            strokeDasharray="3,2"
            className="motion-safe:animate-pulse"
          />
          <circle cx={0} cy={0} r={8.5} fill={ghostFree ? '#ffb700' : '#ff003c'} opacity={0.32} />
          <Volume2 size={10} className={`text-white`} x={-5} y={-5} opacity={0.9} />
        </g>
      )}
    </g>
  );
};
