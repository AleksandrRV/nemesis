import React from 'react';
import { Snowflake } from 'lucide-react';
import type { SanitizedGameState } from '@nemesis/shared';
import { cryoStatus } from './evacuationModel';

export const CryoChip: React.FC<{ view: SanitizedGameState }> = ({ view }) => {
  const status = cryoStatus(view);
  return (
    <div
      className={`hidden items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-xs sm:flex ${
        status.open ? 'border-sky-500/70 bg-sky-950/60 text-sky-200' : 'border-slate-800 bg-slate-900 text-slate-400'
      }`}
      title={
        status.open
          ? 'Камеры Анабиоза открыты: маркер Времени на синем поле'
          : 'Камеры Анабиоза откроются на синих полях трека Времени'
      }
    >
      <Snowflake
        size={13}
        className={status.open ? 'text-sky-300 motion-safe:animate-pulse' : 'text-slate-500'}
        aria-hidden="true"
      />
      {status.open ? 'АНАБИОЗ ОТКРЫТ' : `АНАБИОЗ ЧЕРЕЗ ${status.advancesUntilOpen}`}
    </div>
  );
};
