import React from 'react';
import { INTRUDER_COLORS, INTRUDER_SHAPES } from './intruderShapes';
import { TECH_HUB, TECH_HUB_RADIUS, type VentEcho } from './techCorridorModel';

interface TechCorridorHubProps {
  hasNoise: boolean;
  isSelected: boolean;
  echoes: VentEcho[];
  onSelect: () => void;
  carefulState?: 'free' | 'busy' | 'hovered-free' | null;
  isGhostNoise?: boolean;
  isNoisePop?: boolean;
  isNoiseRollTarget?: boolean;
  onCarefulSelect?: () => void;
}

function hexPoints(x: number, y: number, radius: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i + 30);
    pts.push(`${(x + radius * Math.cos(angle)).toFixed(1)},${(y + radius * Math.sin(angle)).toFixed(1)}`);
  }
  return pts.join(' ');
}

export const TechCorridorHub: React.FC<TechCorridorHubProps> = ({
  hasNoise,
  isSelected,
  echoes,
  onSelect,
  carefulState = null,
  isGhostNoise = false,
  isNoisePop = false,
  isNoiseRollTarget = false,
  onCarefulSelect,
}) => {
  const { x, y } = TECH_HUB;
  const radius = TECH_HUB_RADIUS;

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (carefulState && onCarefulSelect) {
      onCarefulSelect();
    } else {
      onSelect();
    }
  };

  return (
    <g
      onClick={handleClick}
      className="cursor-pointer transition-all duration-150 hover:brightness-125 select-none"
      aria-label={
        carefulState
          ? carefulState.includes('free')
            ? 'Технические Коридоры: выбор для Осторожного движения'
            : 'Технические Коридоры: Шум уже есть'
          : hasNoise
            ? 'Технические Коридоры: Шум в вентиляции'
            : 'Технические Коридоры'
      }
    >
      <defs>
        <pattern id="vent-grid" width="11" height="11" patternUnits="userSpaceOnUse">
          <rect width="11" height="11" fill="#0a0f16" />
          <path d="M 11 0 L 0 0 0 11" fill="none" stroke="#233043" strokeWidth="1.4" />
        </pattern>
      </defs>

      {isSelected && (
        <polygon
          points={hexPoints(x, y, radius + 9)}
          fill="none"
          stroke="#00f0ff"
          strokeWidth="5"
          strokeOpacity="0.4"
          className="animate-pulse"
        />
      )}

      {hasNoise && (
        <polygon
          points={hexPoints(x, y, radius + 6)}
          fill="none"
          stroke="#ff003c"
          strokeWidth="5"
          strokeOpacity="0.55"
          className="motion-safe:animate-vent-alarm motion-reduce:opacity-60"
        />
      )}

      {carefulState && (
        <>
          <polygon
            points={hexPoints(x, y, radius + 7)}
            fill="none"
            stroke={carefulState.includes('free') ? '#ffb700' : '#ff3b5c'}
            strokeWidth={carefulState.includes('hovered') ? 6 : 4.5}
            strokeOpacity={carefulState.includes('hovered') ? 0.88 : 0.56}
            className="motion-safe:animate-pulse motion-reduce:animate-none"
          />
          <polygon
            points={hexPoints(x, y, radius + 13)}
            fill="none"
            stroke={carefulState.includes('free') ? '#ffb700' : '#ff3b5c'}
            strokeWidth={2}
            strokeOpacity={carefulState.includes('hovered') ? 0.38 : 0.18}
          />
        </>
      )}

      {isGhostNoise && (
        <g className="pointer-events-none">
          <circle
            cx={x - radius + 6}
            cy={y - radius + 6}
            r={11}
            fill={carefulState?.includes('free') ? '#ffb700' : '#ff3b5c'}
            opacity={0.18}
            stroke={carefulState?.includes('free') ? '#ffb700' : '#ff3b5c'}
            strokeWidth={1.6}
            strokeDasharray="3,2"
            className="motion-safe:animate-pulse"
          />
          <circle
            cx={x - radius + 6}
            cy={y - radius + 6}
            r={8.5}
            fill={carefulState?.includes('free') ? '#ffb700' : '#ff3b5c'}
            opacity={0.34}
          />
        </g>
      )}

      {/* Этап C8: pop + ripple для нового Шума в вентиляции */}
      {isNoisePop && (
        <g className="pointer-events-none">
          <circle
            cx={x}
            cy={y}
            r={22}
            fill="none"
            stroke="#ff5500"
            strokeWidth={2.5}
            className="motion-safe:animate-noise-ripple motion-reduce:animate-none"
            style={{ transformBox: 'fill-box', transformOrigin: `${x}px ${y}px` } as React.CSSProperties}
          />
          {[24, 32, 40].map((r, idx) => (
            <circle
              key={r}
              cx={x}
              cy={y}
              r={r}
              fill="none"
              stroke="#ff5500"
              strokeWidth={1.6}
              strokeOpacity={0.7 - idx * 0.18}
              className="motion-safe:animate-vent-alarm motion-reduce:opacity-0"
              style={{ animationDelay: `${idx * 120}ms` } as React.CSSProperties}
            />
          ))}
          <circle
            cx={x - radius + 6}
            cy={y - radius + 6}
            r={11}
            fill="#ff5500"
            stroke="#ffaa00"
            strokeWidth={1.6}
            className="motion-safe:animate-token-pop motion-reduce:animate-none"
          />
        </g>
      )}

      {/* Этап C7: вспышка при броске Шума в вентиляцию */}
      {isNoiseRollTarget && (
        <g className="pointer-events-none">
          <polygon
            points={hexPoints(x, y, radius + 8)}
            fill="none"
            stroke="#ffb700"
            strokeWidth={4}
            strokeOpacity={0.85}
            className="motion-safe:animate-noise-flash motion-reduce:animate-none"
          />
        </g>
      )}

      <polygon
        points={hexPoints(x, y, radius + 3)}
        fill="none"
        stroke="#f59e0b"
        strokeWidth="4"
        strokeDasharray="12,9"
        strokeOpacity="0.9"
      />

      <polygon
        points={hexPoints(x, y, radius)}
        fill="url(#vent-grid)"
        stroke={isSelected ? '#00f0ff' : hasNoise ? '#ff4d6d' : '#475569'}
        strokeWidth={isSelected ? 3 : 2}
      />

      {hexPoints(x, y, radius)
        .split(' ')
        .map((point, index) => {
          const [cx, cy] = point.split(',').map(Number);
          return <circle key={index} cx={cx} cy={cy} r={2.4} fill="#64748b" />;
        })}

      <g transform={`translate(${x + 32}, ${y - 30})`} className="pointer-events-none">
        <circle cx={0} cy={0} r={9} fill="#05070c" stroke="#475569" strokeWidth={1.5} />
        <path d="M -6 3 A 6.5 6.5 0 0 1 6 3" fill="none" stroke="#22d3ee" strokeWidth={1.6} />
        <line
          x1={0}
          y1={0}
          x2={hasNoise ? 4.5 : -3.5}
          y2={-5}
          stroke={hasNoise ? '#ff003c' : '#94a3b8'}
          strokeWidth={1.6}
        />
      </g>

      <g className="pointer-events-none">
        <circle cx={x} cy={y - 6} r={16} fill="#05070c" stroke="#334155" strokeWidth={1.5} />
        <g
          className={
            hasNoise
              ? 'motion-safe:animate-spin motion-reduce:animate-none'
              : 'motion-safe:animate-spin motion-reduce:animate-none'
          }
          style={
            {
              transformOrigin: `${x}px ${y - 6}px`,
              animationDuration: hasNoise ? '1s' : '3s',
            } as React.CSSProperties
          }
        >
          <g transform={`translate(${x}, ${y - 6})`}>
            {[45, 135, 225, 315].map((angle) => (
              <path
                key={angle}
                d="M 0 -3 C 6 -7 12 -5 13 0 C 9 2 4 2 0 -3 Z"
                fill={hasNoise ? '#ff4d6d' : '#38bdf8'}
                transform={`rotate(${angle})`}
                className={hasNoise ? 'motion-safe:animate-vent-alarm motion-reduce:opacity-80' : undefined}
              />
            ))}
          </g>
        </g>
        <circle cx={x} cy={y - 6} r={3} fill="#0e1420" stroke="#475569" strokeWidth={1} />
      </g>

      <text
        x={x}
        y={y + 26}
        textAnchor="middle"
        className="font-heading fill-amber-300 font-bold pointer-events-none tracking-wider text-[9.5px]"
      >
        ТЕХНИЧЕСКИЕ
      </text>
      <text
        x={x}
        y={y + 37}
        textAnchor="middle"
        className="font-heading fill-amber-300 font-bold pointer-events-none tracking-wider text-[9.5px]"
      >
        КОРИДОРЫ
      </text>
      <text x={x} y={y + 48} textAnchor="middle" className="text-[7px] font-mono fill-slate-500 pointer-events-none">
        ПОЛЕ ВЕНТИЛЯЦИИ • НЕДОСТУПНО ЭКИПАЖУ
      </text>

      {hasNoise && (
        <g className="pointer-events-none">
          {[20, 28, 36].map((waveRadius, index) => (
            <path
              key={waveRadius}
              d={`M ${x - radius - waveRadius} ${y - 12} a ${waveRadius} ${waveRadius} 0 0 1 0 24`}
              fill="none"
              stroke="#ff003c"
              strokeWidth={2}
              strokeOpacity={0.8 - index * 0.22}
              className="motion-safe:animate-vent-alarm motion-reduce:opacity-70"
              style={{ animationDelay: `${index * 180}ms` }}
            />
          ))}
          <circle
            cx={x - radius + 6}
            cy={y - radius + 6}
            r={7}
            fill="#ff003c"
            stroke="#ff4d6d"
            strokeWidth={1.5}
            className="motion-safe:animate-noise-glow motion-reduce:animate-none"
          />
          <text x={x} y={y - radius - 10} textAnchor="middle" className="text-[8px] font-mono fill-red-400 font-bold">
            ШУМ В ВЕНТИЛЯЦИИ
          </text>
        </g>
      )}

      {echoes.map((echo, index) => (
        <g
          key={echo.key}
          transform={`translate(${x - 34 + index * 24}, ${y - 34}) scale(0.22)`}
          className="motion-safe:animate-vent-echo motion-reduce:opacity-60 pointer-events-none"
          aria-label={`Чужой уходит в вентиляцию: ${echo.type}`}
        >
          <path d={INTRUDER_SHAPES[echo.type]} fill={INTRUDER_COLORS[echo.type]} />
        </g>
      ))}
    </g>
  );
};
