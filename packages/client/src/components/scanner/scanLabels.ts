import type { ContaminationScanOutcome, ContaminationScanSource } from '@nemesis/shared';

export const SCAN_SOURCE_LABELS: Record<ContaminationScanSource, string> = {
  REST: 'Отдых',
  SURGERY: 'Операционная',
  ANTIDOTE: 'Антидот',
  ALCOHOL: 'Алкоголь',
};

export interface ScanOutcomeCopy {
  title: string;
  detail: string;
  tone: 'clean' | 'infected' | 'lethal' | 'cured';
}

export const SCAN_OUTCOME_COPY: Record<ContaminationScanOutcome, ScanOutcomeCopy> = {
  CLEAN: { title: 'Организм чист', detail: 'Сканер не нашёл ИНФЕКЦИИ.', tone: 'clean' },
  LARVA_PLACED: {
    title: 'Инфицирован',
    detail: 'Личинка на планшете. Карта с ИНФЕКЦИЕЙ остаётся в колоде. Повторное заражение убьёт Персонажа.',
    tone: 'infected',
  },
  DIED: {
    title: 'Персонаж погиб',
    detail: 'Повторное заражение при Личинке на планшете: из тела вырвался Крипер.',
    tone: 'lethal',
  },
  LARVA_REMOVED: {
    title: 'Паразит удалён',
    detail: 'Личинка извлечена, карты с ИНФЕКЦИЕЙ удалены из игры.',
    tone: 'cured',
  },
  CONTAMINATION_REPLACED: {
    title: 'ИНФЕКЦИЯ подтверждена',
    detail: 'Карта удалена, взамен взята новая карта Заражения.',
    tone: 'infected',
  },
};
