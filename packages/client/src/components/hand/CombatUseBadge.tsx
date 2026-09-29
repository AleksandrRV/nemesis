import React from 'react';
import { Crosshair } from 'lucide-react';
import { COMBAT_USE_LABELS, type CombatUse } from '@nemesis/shared';

export const CombatUseBadge: React.FC<{ combatUse: CombatUse | null; size?: number }> = ({ combatUse, size = 16 }) => {
  if (!combatUse) return null;
  const label = COMBAT_USE_LABELS[combatUse];
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`relative inline-flex shrink-0 items-center justify-center rounded-md border p-0.5 ${
        combatUse === 'IN_COMBAT'
          ? 'border-slate-300/70 bg-slate-100/10 text-slate-100'
          : 'border-red-500/70 bg-red-950/60 text-red-300'
      }`}
    >
      <Crosshair size={size - 4} aria-hidden="true" />
      {combatUse === 'OUT_OF_COMBAT' && (
        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 -rotate-45 bg-red-400" />
      )}
    </span>
  );
};
