import type { IntruderType } from '@nemesis/shared';

/** Слоты арта Чужого (doc/art-pipeline.md §2): кинематограф Контакта, планшет и окна Боя, значок на поле. */
export type IntruderArtSlot = 'portrait' | 'splash' | 'token';

export const INTRUDER_ART_SLOTS: readonly IntruderArtSlot[] = ['portrait', 'splash', 'token'];

const ART_SLUGS: Record<IntruderType, string> = {
  LARVA: 'larva',
  CREEPER: 'creeper',
  ADULT: 'adult',
  BREEDER: 'breeder',
  QUEEN: 'queen',
};

/** Высота, по которой портрет обрезается в кадре шире 3:4: у Личинки и Крипера голова ниже верхней трети. */
export const INTRUDER_PORTRAIT_FOCUS_Y: Record<IntruderType, string> = {
  LARVA: '60%',
  CREEPER: '45%',
  ADULT: '10%',
  BREEDER: '25%',
  QUEEN: '5%',
};

export const INTRUDER_ART_TYPES = Object.keys(ART_SLUGS) as IntruderType[];

export function hasIntruderArt(type: IntruderType | 'BLANK'): type is IntruderType {
  return type !== 'BLANK';
}

/** Путь файла относительно `public/`. */
export function intruderArtPath(type: IntruderType, slot: IntruderArtSlot): string {
  return `art/intruders/intruder-${ART_SLUGS[type]}-${slot}.webp`;
}

export function intruderArtUrl(type: IntruderType, slot: IntruderArtSlot): string {
  return `${import.meta.env.BASE_URL}${intruderArtPath(type, slot)}`;
}
