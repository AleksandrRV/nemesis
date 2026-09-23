import React from 'react';
import type { CorridorConnection } from '@nemesis/shared';
import { Volume2, ShieldAlert, X } from 'lucide-react';

interface CorridorEdgeProps {
  corridor: CorridorConnection;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Этап 2B: подсветка пути движения — неон cyan + glow */
  isPathActive?: boolean;
  /** Этап C8: только что поставленный Шум — pop + ripple */
  isNoisePop?: boolean;
  /** Этап C7: цель броска Шума — вспышка на коридоре */
  isNoiseRollTarget?: boolean;
  /** Этап 2B: состояние для осторожного движения */
  carefulState?: 'free' | 'busy' | 'hovered-free' | 'hovered-busy' | null;
  /** Ghost-маркер шума при hover на выбор коридора */
  isGhostNoise?: boolean;
  ghostFree?: boolean;
  /** Клик по коридору для выбора номера при осторожном движении */
  onClick?: () => void;
}

/**
 * Коридор на карте: линия связи, номера выходов, жетон Двери и маркер Шума.
 * Этап 2B: поддерживает подсветку пути и превью осторожного движения.
 * Этап C: pop + ripple для нового Шума, вспышка для броска d10.
 */
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

  const doorX = mx + nx * 14;
  const doorY = my + ny * 14;
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
      {/* --- Этап 2B: glow для пути движения --- */}
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

      {/* --- Этап C7: вспышка на целевом коридоре броска Шума --- */}
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

      {/* --- Этап 2B: glow для осторожного движения --- */}
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

      {/* --- Этап C8: pop + ripple для нового Шума --- */}
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

      {/* Свечение для широких коридоров (базовое) */}
      {isWide && !isPathActive && !carefulState && !isNoisePop && !isNoiseRollTarget && (
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#38bdf8" strokeOpacity={0.15} strokeWidth={10} />
      )}

      {/* Основная линия */}
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
        strokeDasharray={corridor.doorState === 'DESTROYED' ? '4,4' : undefined}
        className={isClickable ? 'transition-all duration-150' : undefined}
      />

      {/* Плашка цифр первой комнаты */}
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

      {/* Плашка цифр второй комнаты */}
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

      {/* Дверь */}
      <g
        transform={`translate(${doorX}, ${doorY})`}
        aria-label={
          corridor.doorState === 'OPEN'
            ? 'Дверь открыта'
            : corridor.doorState === 'CLOSED'
              ? 'Дверь закрыта'
              : 'Дверь разрушена'
        }
        className={isClickable ? 'pointer-events-none' : undefined}
      >
        <rect
          x={-16}
          y={-16}
          width={32}
          height={32}
          fill="transparent"
          className={isClickable ? 'pointer-events-auto' : undefined}
        />
        <rect
          x={-8}
          y={-8}
          width={16}
          height={16}
          rx={3}
          fill={corridor.doorState === 'OPEN' ? '#0f172a' : corridor.doorState === 'CLOSED' ? '#ff003c' : '#334155'}
          stroke={corridor.doorState === 'CLOSED' ? '#ff4d6d' : '#475569'}
          strokeWidth={1.5}
          className="group-hover:stroke-cyan-400 transition-colors"
        />
        {corridor.doorState === 'CLOSED' && (
          <ShieldAlert size={10} className="text-white pointer-events-none" x={-5} y={-5} />
        )}
        {corridor.doorState === 'DESTROYED' && (
          <X size={10} className="text-amber-400 pointer-events-none" x={-5} y={-5} />
        )}
      </g>

      {/* Шум — базовый */}
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

      {/* Ghost-маркер шума при hover на выбор коридора */}
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
