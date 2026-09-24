import React from 'react';
import { CREW_IDENTITIES } from '../../utils/crewIdentity';
import { CREW_TOKEN_RADIUS, crewTokenLabel, type CrewTokenData } from './crewTokenModel';

interface CrewTokenProps {
  token: CrewTokenData;
  x?: number;
  y?: number;
  scale?: number;
  showActiveRing?: boolean;
}

const R = CREW_TOKEN_RADIUS;
const CENTERED: React.CSSProperties = { transformBox: 'fill-box', transformOrigin: 'center' };

export const CrewToken: React.FC<CrewTokenProps> = ({ token, x = 0, y = 0, scale = 1, showActiveRing = true }) => {
  const identity = CREW_IDENTITIES[token.characterClass];
  const Icon = identity.Icon;
  const label = crewTokenLabel(token);
  const dimmed = token.hasPassed || token.isInHibernation;

  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      role="img"
      aria-label={label}
      data-crew-class={token.characterClass}
      data-crew-number={token.orderNumber}
    >
      <title>{label}</title>
      {token.isActive && showActiveRing && (
        <>
          <circle
            r={R + 3}
            fill="none"
            stroke={identity.color}
            strokeWidth={1.4}
            className="motion-safe:animate-crew-active-ring"
            style={CENTERED}
          />
          <circle
            r={R + 2.4}
            fill="none"
            stroke={identity.color}
            strokeOpacity={0.7}
            strokeWidth={0.9}
            strokeDasharray="2 2.2"
            className="motion-safe:animate-crew-active-spin"
            style={CENTERED}
          />
        </>
      )}
      <g opacity={dimmed ? 0.55 : 1}>
        <circle cy={1.3} r={R + 0.4} fill="#020409" opacity={0.65} />
        <circle
          r={R}
          fill="#070d18"
          stroke={identity.color}
          strokeWidth={2}
          strokeDasharray={token.isInHibernation ? '3 2' : undefined}
        />
        <circle r={R - 2.6} fill={identity.color} fillOpacity={0.16} />
        <Icon x={-5.5} y={-5.5} width={11} height={11} color={identity.color} strokeWidth={2.4} aria-hidden="true" />
      </g>
      <g transform={`translate(${R - 1.6} ${-(R - 1.6)})`}>
        <circle r={5} fill={identity.color} stroke="#05070c" strokeWidth={1.4} />
        <text y={2.5} textAnchor="middle" className="font-mono font-bold" style={{ fontSize: '7px', fill: '#05070c' }}>
          {token.orderNumber}
        </text>
      </g>
    </g>
  );
};
