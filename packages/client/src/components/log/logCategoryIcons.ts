import { Flag, Footprints, Hourglass, Package, Skull, Volume2, type LucideIcon } from 'lucide-react';
import type { GameLogCategory } from './gameLogViewModel';

export const GAME_LOG_CATEGORY_ICONS: Record<GameLogCategory, LucideIcon> = {
  SYSTEM: Flag,
  MOVEMENT: Footprints,
  NOISE: Volume2,
  COMBAT: Skull,
  CREW: Package,
  EVENTS: Hourglass,
};

export const GAME_LOG_CATEGORY_ACCENTS: Record<GameLogCategory, string> = {
  SYSTEM: 'text-slate-300',
  MOVEMENT: 'text-cyan-300',
  NOISE: 'text-orange-300',
  COMBAT: 'text-red-300',
  CREW: 'text-emerald-300',
  EVENTS: 'text-violet-300',
};
