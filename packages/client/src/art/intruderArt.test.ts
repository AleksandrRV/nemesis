import { describe, expect, it } from 'vitest';
import { INTRUDER_ART_SLOTS, INTRUDER_ART_TYPES, hasIntruderArt, intruderArtPath, intruderArtUrl } from './intruderArt';

const PUBLISHED_FILES = new Set(
  Object.keys(import.meta.glob('../../public/art/intruders/*.webp')).map((path) => path.replace('../../public/', '')),
);

describe('Арт Чужих: манифест (doc/art-pipeline.md §2, §5)', () => {
  it('пять типов миниатюр: Личинка, Крипер, Взрослая особь, Трутень, Королева', () => {
    expect(INTRUDER_ART_TYPES).toEqual(['LARVA', 'CREEPER', 'ADULT', 'BREEDER', 'QUEEN']);
  });

  it('у каждого типа есть файл каждого слота — портрет, кинематограф и значок', () => {
    for (const type of INTRUDER_ART_TYPES) {
      for (const slot of INTRUDER_ART_SLOTS) {
        expect(PUBLISHED_FILES, `${type} ${slot}`).toContain(intruderArtPath(type, slot));
      }
    }
  });

  it('в папке нет лишних файлов: всё, что лежит, принадлежит манифесту', () => {
    const expected = INTRUDER_ART_TYPES.flatMap((type) =>
      INTRUDER_ART_SLOTS.map((slot) => intruderArtPath(type, slot)),
    );
    expect([...PUBLISHED_FILES].sort()).toEqual(expected.sort());
  });

  it('у пустого жетона мешка арта нет — он остаётся векторным', () => {
    expect(hasIntruderArt('BLANK')).toBe(false);
    expect(hasIntruderArt('QUEEN')).toBe(true);
  });

  it('адрес строится от базового пути сборки', () => {
    expect(intruderArtUrl('QUEEN', 'splash')).toBe(
      `${import.meta.env.BASE_URL}art/intruders/intruder-queen-splash.webp`,
    );
  });
});
