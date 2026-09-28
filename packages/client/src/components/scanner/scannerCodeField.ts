export type ScanResultView = 'INFECTED' | 'CLEAN' | 'UNKNOWN';

export type GlyphInk = 'DECOY' | 'CODE';

export interface CodeGlyph {
  char: string;
  ink: GlyphInk;
  isWord: boolean;
}

export const CODE_FIELD_ROWS = 7;
export const CODE_FIELD_COLUMNS = 11;
export const INFECTION_WORD = 'ИНФЕКЦИЯ';

const ALPHABET = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ';
const DECOY_WORDS = ['ИНСПЕКЦИЯ', 'ИНФОРМАЦИЯ', 'ИНДУКЦИЯ', 'ФРАКЦИЯ', 'ИНТЕРВЕНЦИЯ'] as const;
const SCATTERED_CODE_GLYPHS = 4;

function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)]!;
}

export function buildCodeField(cardId: string, result: ScanResultView): CodeGlyph[][] {
  const random = createRandom(hashSeed(cardId));
  const grid: CodeGlyph[][] = Array.from({ length: CODE_FIELD_ROWS }, () =>
    Array.from({ length: CODE_FIELD_COLUMNS }, () => ({
      char: pick(random, [...ALPHABET]),
      ink: 'DECOY' as GlyphInk,
      isWord: false,
    })),
  );

  const word = result === 'INFECTED' ? INFECTION_WORD : result === 'CLEAN' ? pick(random, DECOY_WORDS) : null;
  const wordRow = Math.floor(random() * CODE_FIELD_ROWS);
  if (word) {
    const start = Math.floor(random() * (CODE_FIELD_COLUMNS - word.length + 1));
    [...word].forEach((char, offset) => {
      grid[wordRow]![start + offset] = { char, ink: 'CODE', isWord: result === 'INFECTED' };
    });
  }

  let scattered = 0;
  while (scattered < SCATTERED_CODE_GLYPHS) {
    const row = Math.floor(random() * CODE_FIELD_ROWS);
    if (word && row === wordRow) continue;
    const column = Math.floor(random() * CODE_FIELD_COLUMNS);
    grid[row]![column] = { ...grid[row]![column]!, ink: 'CODE' };
    scattered += 1;
  }
  return grid;
}

export function readHiddenRow(grid: readonly (readonly CodeGlyph[])[]): string {
  return grid
    .map((row) =>
      row
        .map((glyph) => (glyph.ink === 'CODE' ? glyph.char : ' '))
        .join('')
        .trim(),
    )
    .reduce((longest, row) => (row.length > longest.length ? row : longest), '');
}
