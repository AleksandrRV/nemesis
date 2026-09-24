import type React from 'react';

export const DOOR_SCALE = 1.35;

export const DOOR_GEOMETRY = {
  opening: 11,
  leafHalfDepth: 2.8,
  leafTravel: 8.6,
  jambHalfDepth: 5,
  jambThickness: 3,
  pocketHalfDepth: 4.2,
  pocketInner: 10.2,
  pocketOuter: 20.5,
} as const;

export const DOOR_PALETTE = {
  floor: '#03060b',
  leaf: '#2f4568',
  leafEdge: '#8aa4cc',
  leafPanel: '#4f6891',
  pocket: '#152033',
  pocketDamaged: '#1c120e',
  pocketEdge: '#3a4f70',
  jamb: '#2a3850',
  jambEdge: '#6b84a8',
  bolt: '#64748b',
  lockPin: '#cbd5e1',
  ledOpen: '#34d399',
  ledClosed: '#ff2d55',
  ledDead: '#2b1016',
  charredEdge: '#9a3412',
  shard: '#3d4f6d',
  debris: '#64748b',
  ember: '#ff7a18',
  heat: '#ff5500',
  flash: '#ffe2b0',
  smoke: '#334155',
  steam: '#cbd5e1',
} as const;

export function cssVars(values: Record<string, string>): React.CSSProperties {
  return values as React.CSSProperties;
}
