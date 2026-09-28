import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialGameState, filterStateForPlayer, type SanitizedGameLogEntry } from '@nemesis/shared';
import { INFECTION_WORD, buildCodeField, readHiddenRow } from './scannerCodeField';
import { collectScanReports, scanTally, type ScanReport } from './scanQueueModel';
import { InfectionScannerLens } from './InfectionScannerLens';
import { ScanSession } from './InfectionScanOverlay';
import { formatScanLogEvent } from '../log/scanLogFormat';

const view = filterStateForPlayer(createInitialGameState('scanner-ui'), 'player-1');

function scanEntry(sequence: number, overrides: Partial<ScanReport> = {}): SanitizedGameLogEntry {
  return {
    id: `log-${sequence}`,
    sequence,
    event: {
      type: 'CONTAMINATION_SCANNED',
      playerId: 'player-1',
      source: overrides.source ?? 'REST',
      results: overrides.results ?? ['CLEAN', 'INFECTED'],
      removedCount: overrides.removedCount ?? 1,
      outcome: overrides.outcome ?? 'LARVA_PLACED',
    },
  };
}

describe('Кодированное поле карты Заражения', () => {
  it('ИНФЕКЦИЯ записана «чернилами кода», которые проступают под красной плёнкой', () => {
    const grid = buildCodeField('card-7', 'INFECTED');
    expect(readHiddenRow(grid)).toContain(INFECTION_WORD);
    expect(
      grid
        .flat()
        .filter((glyph) => glyph.isWord)
        .map((glyph) => glyph.char)
        .join(''),
    ).toBe(INFECTION_WORD);
  });

  it('стерильная карта прячет похожее слово-обманку, а не ИНФЕКЦИЮ', () => {
    const grid = buildCodeField('card-7', 'CLEAN');
    expect(readHiddenRow(grid)).not.toBe(INFECTION_WORD);
    expect(grid.flat().some((glyph) => glyph.isWord)).toBe(false);
  });

  it('до сканирования в поле нет ни слова — клиенту нечего подсмотреть', () => {
    const grid = buildCodeField('card-7', 'UNKNOWN');
    expect(readHiddenRow(grid).replace(/\s/g, '').length).toBeLessThanOrEqual(4);
  });

  it('поле детерминировано по id карты', () => {
    expect(buildCodeField('card-9', 'INFECTED')).toEqual(buildCodeField('card-9', 'INFECTED'));
  });
});

describe('Очередь сканирований', () => {
  it('берёт только новые записи сканирования и считает итог по мере раскрытия', () => {
    const log: SanitizedGameLogEntry[] = [scanEntry(3), scanEntry(5, { results: ['CLEAN'] })];
    expect(collectScanReports(log, 3).map((report) => report.sequence)).toEqual([5]);
    expect(scanTally(['CLEAN', 'INFECTED', 'INFECTED'], 2)).toEqual({ scanned: 2, infected: 1, clean: 1, total: 3 });
  });

  it('запись журнала называет источник, число ИНФЕКЦИЙ и исход', () => {
    const event = scanEntry(4).event as Extract<SanitizedGameLogEntry['event'], { type: 'CONTAMINATION_SCANNED' }>;
    const text = formatScanLogEvent(event, view)
      .map((segment) => segment.text)
      .join('');
    expect(text).toContain('Отдых');
    expect(text).toContain('ИНФЕКЦИЯ ×1');
    expect(text).toContain('Инфицирован');
  });
});

describe('Линза Красного Сканера', () => {
  it('без сканирования плёнки нет: только кодированное поле', () => {
    const html = renderToStaticMarkup(<InfectionScannerLens cardId="c-1" result="UNKNOWN" phase="IDLE" />);
    expect(html).toContain('Кодированное поле');
    expect(html).not.toContain('mix-blend-multiply');
    expect(html).toContain('data-scan-result="HIDDEN"');
  });

  it('сканирование: плёнка наезжает на поле, помехи и развёртка', () => {
    const html = renderToStaticMarkup(<InfectionScannerLens cardId="c-1" result="INFECTED" phase="SCANNING" />);
    expect(html).toContain('animate-scanner-lens-in');
    expect(html).toContain('feTurbulence');
    expect(html).toContain('animate-scanner-scanline');
  });

  it('итог: слово ИНФЕКЦИЯ проступает с помехами, штамп вердикта', () => {
    const html = renderToStaticMarkup(<InfectionScannerLens cardId="c-1" result="INFECTED" phase="REVEALED" />);
    expect(html).toContain('data-scan-result="INFECTED"');
    expect(html).toContain('animate-scanner-glitch');
    expect(html).toContain('animate-scanner-stamp');
  });
});

describe('Кинематографичная сессия сканирования', () => {
  it('открывается диалогом со счётчиками, пульсом и кнопкой пропуска', () => {
    const report = collectScanReports([scanEntry(2)], 0)[0]!;
    const html = renderToStaticMarkup(<ScanSession report={report} view={view} onDone={() => undefined} />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('КРАСНЫЙ СКАНЕР');
    expect(html).toContain('0/2');
    expect(html).toContain('animate-scanner-ecg');
    expect(html).toContain('Показать результат');
  });

  it('без карт сразу показывает исход', () => {
    const report = collectScanReports([scanEntry(2, { results: [], outcome: 'LARVA_REMOVED' })], 0)[0]!;
    const html = renderToStaticMarkup(<ScanSession report={report} view={view} onDone={() => undefined} />);
    expect(html).toContain('Паразит удалён');
    expect(html).toContain('Продолжить');
  });
});
