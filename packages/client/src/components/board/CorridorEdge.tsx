import React from 'react';
import type { CorridorConnection } from '@nemesis/shared';

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
  /** Дверь сменила состояние в этом кадре презентации: разовая переходная анимация. */
  doorTransition?: 'OPEN' | 'CLOSED' | 'DESTROYED' | null;
  onClick?: () => void;
}

const DOOR_FRAME_COLOR = '#0b1220';
const DOOR_LEAF_OPEN = '#16233b';
const DOOR_LEAF_CLOSED = '#1e2f4d';

/**
 * Створки двери поперёк коридора (массивные двухсторонние переборки).
 *
 * CLOSED — створки сомкнуты в центре (двухсторонняя герметичная дверь),
 * OPEN — створки разъехались к раме (проход открыт), DESTROYED — обе створки
 * вырваны: в раме зазубренные петли, на полу обломки и искры.
 * Переходы анимируются CSS-транзишеном transform створок + разовой вспышкой.
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
  ghostFree = true,
  doorTransition = null,
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

  // Геометрия дверного проёма поперёк коридора: рама + створки.
  const doorHalf = 15; // полуширина проёма вдоль нормали
  const leafDepth = 7; // толщина створки вдоль коридора
  const doorCx = mx;
  const doorCy = my;

  const frameX1 = doorCx + nx * doorHalf;
  const frameY1 = doorCy + ny * doorHalf;
  const frameX2 = doorCx - nx * doorHalf;
  const frameY2 = doorCy - ny * doorHalf;

  // Каждая створка: прямоугольник от края проёма к центру; в OPEN отъезжает к своему краю.
  const leafTransform = (side: 1 | -1): { transform: string; transition: string } => {
    const closedOffset = 0;
    const openOffset = side * (doorHalf - 2.5); // створка почти целиком уходит в раму
    const translate = doorState === 'OPEN' ? openOffset : closedOffset;
    return {
      transform: `translate(${nx * translate} ${ny * translate})`,
      transition: 'transform 460ms cubic-bezier(0.6, 0, 0.3, 1)',
    };
  };

  const transitionFlash =
    doorTransition === 'CLOSED'
      ? 'motion-safe:animate-door-shockwave motion-reduce:animate-none'
      : doorTransition === 'DESTROYED'
        ? 'motion-safe:animate-door-breach motion-reduce:animate-none'
        : null;

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

      {/* Полотно коридора: шум читается цветом и мягкой пульсацией, иконки больше нет */}
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

      {/* Дверь: массивные двухсторонние створки в раме */}
      <g className="pointer-events-none">
        {/* Разрыв коридора под дверью: тёмный проём */}
        <line
          x1={frameX1}
          y1={frameY1}
          x2={frameX2}
          y2={frameY2}
          stroke={DOOR_FRAME_COLOR}
          strokeWidth={leafDepth + 3}
          strokeLinecap="butt"
        />
        {/* Рама: две массивные опоры по краям проёма */}
        <line
          x1={doorCx + nx * doorHalf}
          y1={doorCy + ny * doorHalf}
          x2={doorCx + nx * (doorHalf - 4)}
          y2={doorCy + ny * (doorHalf - 4)}
          stroke="#334155"
          strokeWidth={leafDepth + 2}
          strokeLinecap="butt"
        />
        <line
          x1={doorCx - nx * doorHalf}
          y1={doorCy - ny * doorHalf}
          x2={doorCx - nx * (doorHalf - 4)}
          y2={doorCy - ny * (doorHalf - 4)}
          stroke="#334155"
          strokeWidth={leafDepth + 2}
          strokeLinecap="butt"
        />

        {/* Створка «от» — сдвигается к раме «от» в OPEN */}
        <g style={leafTransform(1)}>
          <rect
            x={doorCx + nx * 2.5 - (leafDepth / 2) * ux}
            y={doorCy + ny * 2.5 - (leafDepth / 2) * uy}
            width={leafDepth}
            height={doorHalf * 2 - 5}
            rx={1.5}
            fill={doorState === 'OPEN' ? DOOR_LEAF_OPEN : DOOR_LEAF_CLOSED}
            stroke={doorState === 'DESTROYED' ? '#92400e' : '#475d85'}
            strokeWidth={1}
            transform={`rotate(${(Math.atan2(ny, nx) * 180) / Math.PI - 90} ${doorCx + nx * 2.5} ${doorCy + ny * 2.5})`}
          />
        </g>

        {/* Створка «к» */}
        <g style={leafTransform(-1)}>
          <rect
            x={doorCx - nx * 2.5 - (leafDepth / 2) * ux}
            y={doorCy - ny * 2.5 - (leafDepth / 2) * uy}
            width={leafDepth}
            height={doorHalf * 2 - 5}
            rx={1.5}
            fill={doorState === 'OPEN' ? DOOR_LEAF_OPEN : DOOR_LEAF_CLOSED}
            stroke={doorState === 'DESTROYED' ? '#92400e' : '#475d85'}
            strokeWidth={1}
            transform={`rotate(${(Math.atan2(ny, nx) * 180) / Math.PI - 90} ${doorCx - nx * 2.5} ${doorCy - ny * 2.5})`}
          />
        </g>

        {/* CLOSED: центральный шов + сигнальная полоса герметизации */}
        {doorState === 'CLOSED' && (
          <>
            <line
              x1={frameX1}
              y1={frameY1}
              x2={frameX2}
              y2={frameY2}
              stroke="#ff003c"
              strokeOpacity={0.85}
              strokeWidth={1.6}
            />
            <line
              x1={doorCx + nx * 8}
              y1={doorCy + ny * 8}
              x2={doorCx + nx * 4}
              y2={doorCy + ny * 4}
              stroke="#ff4d6d"
              strokeOpacity={0.5}
              strokeWidth={1}
            />
            <line
              x1={doorCx - nx * 8}
              y1={doorCy - ny * 8}
              x2={doorCx - nx * 4}
              y2={doorCy - ny * 4}
              stroke="#ff4d6d"
              strokeOpacity={0.5}
              strokeWidth={1}
            />
          </>
        )}

        {/* DESTROYED: рваные петли в раме, обломки створок на полу, искры */}
        {doorState === 'DESTROYED' && (
          <>
            <line
              x1={doorCx + nx * (doorHalf - 5)}
              y1={doorCy + ny * (doorHalf - 5)}
              x2={doorCx + nx * (doorHalf - 9)}
              y2={doorCy + ny * (doorHalf - 9)}
              stroke="#92400e"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <line
              x1={doorCx - nx * (doorHalf - 5)}
              y1={doorCy - ny * (doorHalf - 5)}
              x2={doorCx - nx * (doorHalf - 9)}
              y2={doorCy - ny * (doorHalf - 9)}
              stroke="#92400e"
              strokeWidth={3}
              strokeLinecap="round"
            />
            {/* Обломки: рваные куски створок у проёма */}
            <line
              x1={doorCx + nx * 7 + ux * 3}
              y1={doorCy + ny * 7 + uy * 3}
              x2={doorCx + nx * 12 + ux * -2}
              y2={doorCy + ny * 12 + uy * -2}
              stroke="#8b0000"
              strokeWidth={2.4}
              strokeLinecap="round"
              opacity={0.85}
            />
            <line
              x1={doorCx - nx * 6 + ux * -4}
              y1={doorCy - ny * 6 + uy * -4}
              x2={doorCx - nx * 11 + ux * 2}
              y2={doorCy - ny * 11 + uy * 2}
              stroke="#7a001a"
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.8}
            />
            {/* Искры на разрыве */}
            <g className="motion-safe:animate-door-spark motion-reduce:opacity-80">
              <circle cx={doorCx + nx * 3} cy={doorCy + ny * 3} r={1.6} fill="#ffb700" />
              <circle cx={doorCx - nx * 3} cy={doorCy - ny * 3} r={1.6} fill="#ffb700" />
            </g>
          </>
        )}

        {/* Переходная вспышка: хлопок при закрытии, взрыв при разрушении */}
        {doorTransition && transitionFlash && (
          <circle
            cx={doorCx}
            cy={doorCy}
            r={22}
            fill="none"
            stroke={doorTransition === 'DESTROYED' ? '#ff5500' : '#ff003c'}
            strokeWidth={2.5}
            className={transitionFlash}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          />
        )}
      </g>
    </g>
  );
};
