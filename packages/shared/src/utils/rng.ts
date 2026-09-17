import seedrandom from 'seedrandom';

/**
 * Сидированная случайность партии (аудит §4, P1-1).
 *
 * Партия обязана воспроизводиться по сиду: одинаковый сид — одинаковый стол
 * (AGENTS.md §4.3). Один общий генератор это ломает: любой посторонний бросок
 * сдвигает очередь и меняет расклад отсеков, который игрок уже увидел. Поэтому
 * у каждой подсистемы свой **поток** — отдельная последовательность от одного
 * мастер-сида:
 *
 * - `layout` — подготовка партии: тайлы отсеков, жетоны Исследования, номера
 *   Спасательных Капсул, пункты назначения Координат;
 * - `noise` — кубик Шума и прочие броски по таблицам;
 * - `bag` — жетоны Предметов из мешка;
 * - `cards` — перемешивание и добор колод;
 * - `combat` — бои: Атаки Чужих, Тяжёлые Травы, Заражение.
 *
 * Каждый поток читает только его подсистема, поэтому добавление броска Шума не
 * переставляет отсеки у той же партии. Обращений внутри потока тоже нужно
 * ровно столько, сколько требует правило: лишний вызов `rng()` — это сдвиг
 * всех последующих значений потока.
 */

/** Потоки случайности. Список — часть контракта состояния: потоки хранятся в сохранении по имени. */
export const RNG_STREAMS = ['layout', 'noise', 'bag', 'cards', 'combat'] as const;

export type RngStream = (typeof RNG_STREAMS)[number];

/** Источник единичных значений [0, 1): совместим с любым сидированным генератором. */
export type Rng = () => number;

/** Проверка имени потока для данных, пришедших извне (сохранение, будущий сервер). */
export function isRngStream(value: string): value is RngStream {
  return (RNG_STREAMS as readonly string[]).includes(value);
}

/**
 * Строка, из которой рождается поток. Мастер-сид остаётся в ней целиком, поэтому
 * поток можно восстановить из одной строки состояния — и наоборот, из мастер-сида
 * воспроизвести всю партию.
 */
export function streamSeed(masterSeed: string, stream: RngStream): string {
  if (!isRngStream(stream)) {
    throw new Error(`Неизвестный поток случайности: ${String(stream)}.`);
  }

  return `${masterSeed}#${stream}`;
}

/** Генератор потока: одинаковый мастер-сид и имя потока дают одинаковую последовательность. */
export function createRng(masterSeed: string, stream: RngStream): Rng {
  return seedrandom(streamSeed(masterSeed, stream));
}

/**
 * Значение потока в позиции `drawIndex` (0 — первое обращение).
 *
 * Нужно подсистемам, которые восстанавливают поток из состояния партии: счётчик
 * обращений лежит в `GameState`, а сам генератор там не хранится — состояние
 * остаётся JSON-сериализуемым и не зависит от библиотеки. Позиция
 * восстанавливается реплеем, и это осознанный выбор: за партию поток читается
 * сотни раз, а не миллионы, зато сохранение не ломается при смене генератора.
 */
export function drawFromStream(masterSeed: string, stream: RngStream, drawIndex: number): number {
  if (!Number.isInteger(drawIndex) || drawIndex < 0) {
    throw new Error(`Недопустимая позиция в потоке ${stream}: ${drawIndex}.`);
  }

  const rng = createRng(masterSeed, stream);
  let value = rng();

  for (let index = 0; index < drawIndex; index++) {
    value = rng();
  }

  return value;
}

/** Бросок кубика с `faces` гранями: результат 1..faces (грани нумеруются с единицы). */
export function rollDie(rng: Rng, faces: number): number {
  if (!Number.isInteger(faces) || faces < 2) {
    throw new Error(`Недопустимое число граней кубика: ${faces}.`);
  }

  return Math.floor(rng() * faces) + 1;
}

/** Индекс элемента длиной `length`: результат 0..length-1. */
export function pickIndex(rng: Rng, length: number): number {
  if (!Number.isInteger(length) || length < 1) {
    throw new Error(`Нельзя выбрать элемент из набора длиной ${length}.`);
  }

  return Math.floor(rng() * length);
}

/**
 * Раскладка Фишера — Йетса. Единственная реализация перемешивания в проекте:
 * колоды и тайлы тасуются одинаково, а не «как получится» в каждом модуле.
 */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = pickIndex(rng, i + 1);
    const temp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp;
  }

  return shuffled;
}
