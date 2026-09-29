import React from 'react';
import type { SanitizedGameState } from '@nemesis/shared';

const HEX_RADIUS = 45;

function hexPoints(x: number, y: number, radius: number): string {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 180) * (60 * index + 30);
    return `${(x + radius * Math.cos(angle)).toFixed(1)},${(y + radius * Math.sin(angle)).toFixed(1)}`;
  }).join(' ');
}

/** Жетон Экстренной Декомпрессии (стр. 25): пульсирующий контур и значок шлюза над Комнатой. */
export const DecompressionLayer: React.FC<{
  view: SanitizedGameState;
  coords: ReadonlyMap<number, { x: number; y: number }>;
}> = ({ view, coords }) => (
  <g id="decompression-layer" className="pointer-events-none">
    {Object.values(view.ship.rooms)
      .filter((room) => room.hasDecompressionToken)
      .map((room) => {
        const coord = coords.get(room.id);
        if (!coord) return null;
        return (
          <g key={room.id} role="img" aria-label={`Декомпрессия: отсек ${room.id}`}>
            <polygon
              points={hexPoints(coord.x, coord.y, HEX_RADIUS - 2)}
              fill="rgba(220,38,38,0.18)"
              stroke="#f87171"
              strokeWidth={3}
              strokeDasharray="8 5"
              className="motion-safe:animate-objective-alarm"
            />
            <g transform={`translate(${coord.x + 22}, ${coord.y - 34})`}>
              <circle r={10} fill="#7f1d1d" stroke="#fca5a5" strokeWidth={1.5} />
              <text textAnchor="middle" y={4} className="fill-red-100 font-mono text-[10px] font-bold">
                ⚠
              </text>
            </g>
          </g>
        );
      })}
  </g>
);
