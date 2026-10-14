import type { CharacterClass } from '@nemesis/shared';

/** Слоты арта персонажа (doc/art-pipeline.md §2): планшет, крупные панели, жетон и ростер. */
export type CharacterArtSlot = 'portrait' | 'splash' | 'avatar';

export const CHARACTER_ART_SLOTS: readonly CharacterArtSlot[] = ['portrait', 'splash', 'avatar'];

const ART_SLUGS: Record<CharacterClass, string> = {
  CAPTAIN: 'captain',
  PILOT: 'pilot',
  SCIENTIST: 'scientist',
  SCOUT: 'scout',
  SOLDIER: 'soldier',
  MECHANIC: 'mechanic',
};

/** Путь файла относительно `public/`. */
export function characterArtPath(role: CharacterClass, slot: CharacterArtSlot): string {
  return `art/characters/character-${ART_SLUGS[role]}-${slot}.webp`;
}

export function characterArtUrl(role: CharacterClass, slot: CharacterArtSlot): string {
  return `${import.meta.env.BASE_URL}${characterArtPath(role, slot)}`;
}
