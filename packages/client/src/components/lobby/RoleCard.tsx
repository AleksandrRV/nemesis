import React from 'react';
import type { CharacterClass } from '@nemesis/shared';
import { Lock } from 'lucide-react';
import { CREW_IDENTITIES } from '../../utils/crewIdentity';

export type RoleCardState = 'OPEN' | 'SHOWN' | 'CHOSEN' | 'TAKEN' | 'RETURNING';

interface RoleCardProps {
  role: CharacterClass;
  state?: RoleCardState;
  takenBy?: string;
  onPick?: () => void;
  dealDelayMs?: number;
  compact?: boolean;
}

const STATE_CLASSES: Record<RoleCardState, string> = {
  OPEN: 'hover:-translate-y-1.5 hover:shadow-[0_0_28px_rgba(34,211,238,0.35)] cursor-pointer',
  SHOWN: 'cursor-default',
  CHOSEN: 'motion-safe:animate-draft-take ring-2 ring-cyan-300',
  TAKEN: 'opacity-45 grayscale cursor-not-allowed',
  RETURNING: 'motion-safe:animate-draft-return pointer-events-none',
};

export const RoleCardBack: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div
    aria-hidden="true"
    className={`relative ${compact ? 'h-40 w-28' : 'h-56 w-40'} overflow-hidden rounded-2xl border-2 border-slate-700 bg-slate-950`}
  >
    <div className="absolute inset-2 rounded-xl border border-cyan-900/60 bg-[repeating-linear-gradient(45deg,rgba(8,145,178,0.12)_0_6px,transparent_6px_12px)]" />
    <span className="absolute inset-0 flex items-center justify-center font-heading text-lg tracking-[0.4em] text-cyan-800">
      NEMESIS
    </span>
  </div>
);

export const RoleCard: React.FC<RoleCardProps> = ({
  role,
  state = 'OPEN',
  takenBy,
  onPick,
  dealDelayMs = 0,
  compact = false,
}) => {
  const identity = CREW_IDENTITIES[role];
  const Icon = identity.Icon;
  const interactive = state === 'OPEN' && onPick !== undefined;
  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={onPick}
      aria-label={takenBy ? `${identity.label} — занят: ${takenBy}` : `Персонаж: ${identity.label}`}
      style={{ animationDelay: `${dealDelayMs}ms`, borderColor: identity.color }}
      className={`group relative flex ${compact ? 'h-40 w-28' : 'h-56 w-40'} flex-col overflow-hidden rounded-2xl border-2 bg-slate-950 text-left transition duration-300 motion-safe:animate-draft-deal ${STATE_CLASSES[state]} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300`}
    >
      <span
        aria-hidden="true"
        style={{ backgroundColor: identity.color }}
        className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl transition group-hover:opacity-35"
      />
      <span className="relative flex flex-1 items-center justify-center">
        <span
          style={{ borderColor: identity.color }}
          className={`flex ${compact ? 'h-14 w-14' : 'h-20 w-20'} items-center justify-center rounded-full border-2 bg-slate-900/80 shadow-inner`}
        >
          <Icon size={compact ? 26 : 38} color={identity.color} aria-hidden="true" />
        </span>
      </span>
      <span className="relative border-t border-slate-800 bg-slate-900/80 px-2 py-2 text-center">
        <span className={`block font-heading ${compact ? 'text-sm' : 'text-lg'} uppercase tracking-widest text-white`}>
          {identity.label}
        </span>
        {takenBy && (
          <span className="mt-0.5 flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
            <Lock size={10} aria-hidden="true" /> {takenBy}
          </span>
        )}
      </span>
    </button>
  );
};
