import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

interface TranscriptionError {
  page: number;
  line: number;
  transcript: string;
  scan: string;
}

interface RulesSource {
  kind: string;
  location: string;
  knownTranscriptionErrors?: TranscriptionError[];
}

interface DocsAwareSources {
  meta: { sources: Record<string, RulesSource> };
}

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));

function readRepoFile(relativePath: string): string {
  return readFileSync(`${repoRoot}${relativePath}`, 'utf8');
}

function listMarkdown(relativeDir: string): string[] {
  return readdirSync(`${repoRoot}${relativeDir}`, { withFileTypes: true }).flatMap((entry) => {
    const path = `${relativeDir}/${entry.name}`;
    if (entry.isDirectory()) return listMarkdown(path);
    return entry.name.endsWith('.md') ? [path] : [];
  });
}

const ORIGINAL_TEXT_AND_PLAN = new Set(['doc/rules.md', 'doc/fix-plan-scans.md']);

const RETRACTED_BY_SCANS = [
  'DEEP_SPACE_2',
  '8 делений',
  'ELECTRONICS',
  'Смазка',
  'визуально 16',
  '29 коридоров',
  'Подготовка 1 из 3',
];

const dataSources = JSON.parse(readRepoFile('doc/sources/data-sources.json')) as DocsAwareSources;
const rulesLines = readRepoFile('doc/rules.md').split('\n');

describe('Документация после сверки со сканами (С6)', () => {
  it('не повторяет утверждений, опровергнутых сканами оригинала', () => {
    const documents = [...listMarkdown('doc'), 'README.md'].filter((path) => !ORIGINAL_TEXT_AND_PLAN.has(path));

    expect(documents.length).toBeGreaterThan(10);

    for (const path of documents) {
      const text = readRepoFile(path);
      for (const phrase of RETRACTED_BY_SCANS) {
        expect(text.includes(phrase), `${path}: «${phrase}»`).toBe(false);
      }
    }
  });

  it('не включает «Подготовку» в состав колоды Событий', () => {
    const eventsDoc = readRepoFile('doc/data/EVENTS.md');
    const deckRows = eventsDoc.split('\n').filter((line) => line.startsWith('|') && line.includes('Подготовка'));

    expect(deckRows).toEqual([]);
  });
});

describe('Опечатки транскрипции rules.md, найденные по скану (С6-3)', () => {
  const errors = dataSources.meta.sources['rules-md']?.knownTranscriptionErrors ?? [];

  it('ведёт список для владельца: rules.md правится только с его разрешения', () => {
    expect(errors.length).toBeGreaterThan(0);
  });

  it('указывает каждую опечатку дословно на её строке rules.md и страницу скана', () => {
    for (const error of errors) {
      expect(error.page, `«${error.transcript}»`).toBeGreaterThanOrEqual(1);
      expect(error.page, `«${error.transcript}»`).toBeLessThanOrEqual(31);
      expect(rulesLines[error.line - 1], `строка ${error.line}`).toContain(error.transcript);
      expect(error.scan, `строка ${error.line}`).not.toBe(error.transcript);
    }
  });
});
