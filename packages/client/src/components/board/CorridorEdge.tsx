import React from 'react';
import type { CorridorConnection } from '@nemesis/shared';
import { Volume2, ShieldAlert, X } from 'lucide-react';

interface CorridorEdgeProps {
  corridor: CorridorConnection;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Отладочные переключатели: показываются только в dev-сборке (аудит №22). */
  showDebugControls: boolean;
  onToggleDoor: (id: string) => void;
  onToggleNoise: (id: string) => void;
}

export const CorridorEdge: React.FC<CorridorEdgeProps> = ({
  corridor,
  x1,
  y1,
  x2,
  y2,
  showDebugControls,
  onToggleDoor,
  onToggleNoise,
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

  // Виджеты разнесены по бокам
  const doorX = mx + nx * 14;
  const doorY = my + ny * 14;
  const noiseX = mx - nx * 14;
  const noiseY = my - ny * 14;

  const isWide = corridor.fromNumbers.length > 1 || corridor.toNumbers.length > 1;

  // Безопасный отступ для цифр
  const safeOffset = Math.min(54, len * 0.38);
  const num1X = x1 + ux * safeOffset;
  const num1Y = y1 + uy * safeOffset;
  const num2X = x2 - ux * safeOffset;
  const num2Y = y2 - uy * safeOffset;

  const textFrom = corridor.fromNumbers.join(',');
  const textTo = corridor.toNumbers.join(',');

  return (
    <g className="select-none">
      {/* Свечение для широких коридоров */}
      {isWide && <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#38bdf8" strokeOpacity="0.15" strokeWidth={10} />}

      {/* Основная линия */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={corridor.hasNoise ? '#ff5500' : isWide ? '#38bdf8' : '#1e293b'}
        strokeWidth={corridor.hasNoise ? 3 : isWide ? 2.5 : 2}
        strokeDasharray={corridor.doorState === 'DESTROYED' ? '4,4' : undefined}
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
          stroke={isWide ? '#38bdf8' : '#475569'}
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
          stroke={isWide ? '#38bdf8' : '#475569'}
          strokeWidth={1}
        />
        <text x={num2X} y={num2Y + 3} textAnchor="middle" className="text-[8px] font-mono fill-cyan-300 font-bold">
          {textTo}
        </text>
      </g>

      {/* Дверь */}
      <g
        transform={`translate(${doorX}, ${doorY})`}
        onClick={(e) => {
          e.stopPropagation();
          if (showDebugControls) onToggleDoor(corridor.id);
        }}
        className={showDebugControls ? 'cursor-pointer group' : 'group'}
        aria-label={
          corridor.doorState === 'OPEN'
            ? 'Дверь открыта'
            : corridor.doorState === 'CLOSED'
              ? 'Дверь закрыта'
              : 'Дверь разрушена'
        }
      >
        <rect x={-16} y={-16} width={32} height={32} fill="transparent" />
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

      {/* Шум */}
      <g
        transform={`translate(${noiseX}, ${noiseY})`}
        onClick={(e) => {
          e.stopPropagation();
          if (showDebugControls) onToggleNoise(corridor.id);
        }}
        className={showDebugControls ? 'cursor-pointer group' : 'group'}
      >
        <circle cx={0} cy={0} r={16} fill="transparent" />
        <circle
          cx={0}
          cy={0}
          r={8.5}
          fill={corridor.hasNoise ? '#ff5500' : '#0f172a'}
          stroke={corridor.hasNoise ? '#ffaa00' : '#334155'}
          strokeWidth={1.5}
          className="group-hover:stroke-cyan-400 transition-colors"
        />
        <Volume2
          size={10}
          className={`pointer-events-none ${corridor.hasNoise ? 'text-white' : 'text-slate-500'}`}
          x={-5}
          y={-5}
        />
      </g>
    </g>
  );
};
