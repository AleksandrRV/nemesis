import type { IntruderToken } from '@nemesis/shared';
import { INTRUDER_COLORS } from './intruderShapes';

/**
 * Единый справочник Чужих (Шаг 1 плана `doc/intruder-board-ui.md`):
 * русские названия, свойства классов и правило Внезапной Атаки — один
 * источник для карты (`IntruderBadge`), модалок Контакта/Боя, журнала
 * и будущего Планшета Чужих. Только ПУБЛИЧНАЯ информация из
 * `doc/data/INTRUDERS.md` (§3.3–§5) и книги правил; обороты конкретных
 * жетонов и состав мешка здесь не хранятся — это состояние партии.
 */

/** Русские названия всех типов жетонов, включая Пустой (журнал, Контакты). */
export const INTRUDER_NAMES_RU: Record<IntruderToken['type'], string> = {
  BLANK: 'Пустой жетон',
  LARVA: 'Личинка',
  CREEPER: 'Крипер',
  ADULT: 'Взрослая особь',
  BREEDER: 'Трутень',
  QUEEN: 'Королева',
};

/** definitionId отсека Улья (`roomDefinitions.ts`): кладка и Королева. */
export const HIVE_DEFINITION_ID = 'NEST' as const;

/** Вместимость кладки на Планшете Чужих (стр. 6, шаг 9; стр. 10, шаг 8). */
export const HIVE_EGGS_CAPACITY = 8;

/** Справочная карточка класса Чужих для Планшета Чужих (секция G). */
export interface IntruderClassReference {
  type: Exclude<IntruderToken['type'], 'BLANK'>;
  name: string;
  /** Цвет силуэта — тот же, что на карте (`intruderShapes.ts`). */
  color: string;
  /** Стойкость: сколько ран и как проверяется гибель (INTRUDERS §4). */
  toughnessLabel: string;
  /** Лимит миниатюр класса в коробке (6/3/8/2/1). */
  miniatureLimit: number;
  /** В каких Атаках Чужих класс участвует (INTRUDERS §5). */
  attacksLabel: string;
  /** Особые правила класса, 1–2 строки (INTRUDERS §4). */
  note: string;
}

export const INTRUDER_CLASS_REFERENCE: readonly IntruderClassReference[] = [
  {
    type: 'LARVA',
    name: INTRUDER_NAMES_RU.LARVA,
    color: INTRUDER_COLORS.LARVA,
    toughnessLabel: '1 Рана без карты Атаки',
    miniatureLimit: 6,
    attacksLabel: 'Не атакует: в атакующих классах не участвует.',
    note: 'Не вступает в Бой. При Контакте заражает: карта Заражения — в личный сброс, Личинка — на планшет Персонажа. Первый Контакт не считается (стр. 12); повторная Личинка — ещё одна карта Заражения, без гибели (FAQ Rules 12).',
  },
  {
    type: 'CREEPER',
    name: INTRUDER_NAMES_RU.CREEPER,
    color: INTRUDER_COLORS.CREEPER,
    toughnessLabel: '1 карта Атаки',
    miniatureLimit: 3,
    attacksLabel: 'Царапина; Слизь; Зов; Трансформация — замена на Трутня.',
    note: 'Слабый класс: по карте «Трансформация» Крипер заменяется миниатюрой Трутня.',
  },
  {
    type: 'ADULT',
    name: INTRUDER_NAMES_RU.ADULT,
    color: INTRUDER_COLORS.ADULT,
    toughnessLabel: '1 карта Атаки',
    miniatureLimit: 8,
    attacksLabel: 'Царапина, Укус, Атака когтями, Слизь.',
    note: 'Основа пула. При исчерпании жетонов Взрослые вне Боя отступают, их жетоны возвращаются в мешок (стр. 15).',
  },
  {
    type: 'BREEDER',
    name: INTRUDER_NAMES_RU.BREEDER,
    color: INTRUDER_COLORS.BREEDER,
    toughnessLabel: '2 карты Атаки (сумма ран)',
    miniatureLimit: 2,
    attacksLabel: 'Царапина, Укус, Атака когтями, Ярость, Слизь.',
    note: 'Доминантный класс: увеличенный силуэт и аура биоугрозы на карте.',
  },
  {
    type: 'QUEEN',
    name: INTRUDER_NAMES_RU.QUEEN,
    color: INTRUDER_COLORS.QUEEN,
    toughnessLabel: '2 карты Атаки (сумма ран)',
    miniatureLimit: 1,
    attacksLabel: 'Царапина, Укус, Атака когтями, Атака хвостом, Ярость, Слизь, Зов.',
    note: 'Босс. При отступлении и находясь в Улье защищает кладку; в Развитие Улья при пустом Улье добавляет Яйцо (стр. 10, шаг 8).',
  },
] as const;

/**
 * Памятка правила Внезапной Атаки (стр. 18) — только механика правила.
 * Числа на оборотах конкретных жетонов здесь не приводятся: это скрытое
 * состояние партии (EXTERNAL_UNVERIFIED, golden-тест в shared).
 */
export const SURPRISE_ATTACK_RULE_RU =
  'Оборотная сторона вытянутого жетона — число от 1 до 4 (у Пустого числа нет). Оно сравнивается с числом карт в руке Персонажа после оплаты действия, вызвавшего Контакт: если карт строго меньше числа — Внезапная Атака (стр. 18).';
