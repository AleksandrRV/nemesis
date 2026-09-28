import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

interface ScanDiscrepancy {
  task: string;
  page: string;
  reading: string;
}

interface ScanAwareTable {
  status: string;
  facts: { source: string; page?: string }[];
  unverified?: string[];
  scanDiscrepancies?: ScanDiscrepancy[];
}

interface ScanAwareSources {
  meta: { sources: Record<string, { kind: string; location: string }> };
  tables: Record<string, ScanAwareTable>;
}

function readRepoFile(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(`../../../../${relativePath}`, import.meta.url)), 'utf8');
}

const dataSources = JSON.parse(readRepoFile('doc/sources/data-sources.json')) as ScanAwareSources;
const fixPlan = readRepoFile('doc/fix-plan-scans.md');
const tables = Object.entries(dataSources.tables);

describe('Пакет источника: сверка со сканами оригинала (С0-1)', () => {
  it('описывает сканы отдельным источником с транскриптом в репозитории', () => {
    const scans = dataSources.meta.sources['pnp-scans'];

    expect(scans?.kind).toBe('ORIGINAL_SCAN');
    expect(scans?.location).toContain('doc/sources/scan-transcript.md');
    expect(readRepoFile('doc/sources/scan-transcript.md')).toContain('# Транскрипт сканов оригинала');
  });

  it('объявляет таблицу сверенной со сканом только со страницей скана и без расхождений', () => {
    const verified = tables.filter(([, entry]) => entry.status === 'SCAN_VERIFIED');

    expect(verified.length).toBeGreaterThan(0);

    for (const [id, entry] of verified) {
      expect(
        entry.facts.some((fact) => fact.source === 'pnp-scans' && fact.page),
        `таблица ${id}: статус SCAN_VERIFIED без страницы скана`,
      ).toBe(true);
      expect(entry.scanDiscrepancies ?? [], `таблица ${id}: сверена, но расходится со сканом`).toEqual([]);
    }
  });

  it('привязывает каждое расхождение со сканом к задаче плана исправлений', () => {
    const discrepancies = tables.flatMap(([id, entry]) =>
      (entry.scanDiscrepancies ?? []).map((item) => ({ id, item })),
    );

    expect(discrepancies.length).toBeGreaterThan(0);

    for (const { id, item } of discrepancies) {
      expect(item.task, `таблица ${id}: метка задачи`).toMatch(/^С[1-7]-\d+$/);
      expect(fixPlan, `таблица ${id}: задачи ${item.task} нет в плане`).toContain(`### ${item.task}.`);
      expect(item.page.length, `таблица ${id}: нет страницы скана`).toBeGreaterThan(0);
      expect(item.reading.length, `таблица ${id}: нет прочитанного значения`).toBeGreaterThan(0);
    }
  });

  it('не выдаёт расходящуюся со сканом внешнюю таблицу за проверенную', () => {
    for (const [id, entry] of tables) {
      if (!entry.scanDiscrepancies?.length || entry.status === 'RULES_LOCAL') continue;

      expect(entry.unverified?.length ?? 0, `таблица ${id}: расхождение без списка несверенного`).toBeGreaterThan(0);
    }
  });
});
