import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '@nemesis/shared';
import { CHARACTER_ART_SLOTS, characterArtPath, characterArtUrl } from './characterArt';

const PUBLISHED_FILES = new Set(
  Object.keys(import.meta.glob('../../public/art/characters/*.webp')).map((path) => path.replace('../../public/', '')),
);

describe('Арт персонажей: манифест (doc/art-pipeline.md §2, §5)', () => {
  it('у каждого Персонажа есть файл каждого слота — портрет, широкий кадр и аватар', () => {
    for (const { characterClass } of CHARACTERS) {
      for (const slot of CHARACTER_ART_SLOTS) {
        expect(PUBLISHED_FILES, `${characterClass} ${slot}`).toContain(characterArtPath(characterClass, slot));
      }
    }
  });

  it('в папке нет лишних файлов: всё, что лежит, принадлежит манифесту', () => {
    const expected = CHARACTERS.flatMap(({ characterClass }) =>
      CHARACTER_ART_SLOTS.map((slot) => characterArtPath(characterClass, slot)),
    );
    expect([...PUBLISHED_FILES].sort()).toEqual([...new Set(expected)].sort());
  });

  it('адрес строится от базового пути сборки', () => {
    expect(characterArtUrl('CAPTAIN', 'portrait')).toBe(
      `${import.meta.env.BASE_URL}art/characters/character-captain-portrait.webp`,
    );
  });
});
