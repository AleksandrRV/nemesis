import React from 'react';
import { ventShaftRoutes } from './techCorridorModel';

interface VentShaftTracesProps {
  /** Маркер Шума на поле Технических Коридоров подсвечивает шахты тревогой (стр. 15–16). */
  hasNoise: boolean;
}

function routePath(points: ReadonlyArray<readonly [number, number]>): string {
  return points.map(([px, py], index) => `${index === 0 ? 'M' : 'L'} ${px} ${py}`).join(' ');
}

/**
 * Пунктирные неоновые трассы вентиляционных шахт: от маячка входа отсека к
 * узлу Технических Коридоров, проложенные вокруг корпуса, чтобы не пересекать
 * жилые отсеки. Трассы лежат под слоем отсеков и соединяются портами.
 */
export const VentShaftTraces: React.FC<VentShaftTracesProps> = ({ hasNoise }) => {
  const shaftColor = hasNoise ? '#ff5500' : '#155e75';
  const glowColor = hasNoise ? '#ff003c' : '#22d3ee';

  return (
    <g id="vent-shafts-layer" className="select-none pointer-events-none">
      {ventShaftRoutes().map((route) => (
        <g key={`vent-${route.roomId}`}>
          <path d={routePath(route.points)} fill="none" stroke={glowColor} strokeOpacity="0.14" strokeWidth={6} />
          <path
            d={routePath(route.points)}
            fill="none"
            stroke={shaftColor}
            strokeWidth={1.8}
            strokeDasharray="7,5"
            strokeLinejoin="round"
            className={hasNoise ? 'motion-safe:animate-vent-flow motion-reduce:animate-none' : undefined}
          />
          {/* Порт входа вентиляции у маячка отсека. */}
          <rect
            x={route.points[0]![0] - 4}
            y={route.points[0]![1] - 4}
            width={8}
            height={8}
            rx={2}
            fill="#05070c"
            stroke={shaftColor}
            strokeWidth={1.4}
          />
        </g>
      ))}
    </g>
  );
};
