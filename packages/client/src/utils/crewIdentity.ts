import type { CharacterClass } from '@nemesis/shared';
import { Crosshair, Eye, FlaskConical, Plane, Star, Wrench, type LucideIcon } from 'lucide-react';

export interface CrewIdentity {
  label: string;
  shortLabel: string;
  color: string;
  Icon: LucideIcon;
}

export const CREW_IDENTITIES: Record<CharacterClass, CrewIdentity> = {
  CAPTAIN: { label: 'Капитан', shortLabel: 'КАП', color: '#facc15', Icon: Star },
  PILOT: { label: 'Пилот', shortLabel: 'ПИЛ', color: '#38bdf8', Icon: Plane },
  SCIENTIST: { label: 'Учёный', shortLabel: 'УЧН', color: '#34d399', Icon: FlaskConical },
  SCOUT: { label: 'Скаут', shortLabel: 'СКТ', color: '#c084fc', Icon: Eye },
  SOLDIER: { label: 'Солдат', shortLabel: 'СОЛ', color: '#fb7185', Icon: Crosshair },
  MECHANIC: { label: 'Механик', shortLabel: 'МЕХ', color: '#fb923c', Icon: Wrench },
};
