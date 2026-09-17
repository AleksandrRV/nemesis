import { describe, expect, it } from 'vitest';

import {
  RNG_STREAMS,
  type Rng,
  type RngStream,
  createRng,
  drawFromStream,
  isRngStream,
  pickIndex,
  rollDie,
  shuffle,
  streamSeed,
} from './rng.js';

const SEED = 'rng-test-seed';

/** Первые `count` значений последовательности — так тесты сравнивают потоки целиком. */
function take(rng: Rng, count: number): number[] {
  return Array.from({ length: count }, () => rng());
}

describe('Потоки случайности', () => {
  it('перечисляет потоки и проверяет имя потока', () => {
    expect([...RNG_STREAMS]).toEqual(['layout', 'noise', 'bag', 'cards', 'combat']);

    for (const stream of RNG_STREAMS) {
      expect(isRngStream(stream)).toBe(true);
    }

    expect(isRngStream('layout#')).toBe(false);
    expect(isRngStream('')).toBe(false);
    expect(isRngStream('Layout')).toBe(false);
  });

  it('даёт одинаковую последовательность для одного сида и потока', () => {
    expect(take(createRng(SEED, 'noise'), 8)).toEqual(take(createRng(SEED, 'noise'), 8));
  });

  it('разводит потоки одного сида по разным последовательностям', () => {
    const sequences = RNG_STREAMS.map((stream) => take(createRng(SEED, stream), 6));

    for (const [index, sequence] of sequences.entries()) {
      const others = sequences.filter((_, otherIndex) => otherIndex !== index);
      expect(others).not.toContainEqual(sequence);
    }
  });

  it('не сдвигает поток, пока читается соседний', () => {
    const before = take(createRng(SEED, 'layout'), 5);
    // Бросок Шума и добор из мешка — чужие подсистемы: расклад отсеков обязан
    // остаться прежним, иначе воспроизводимость сида держится на «случайном»
    // порядке действий игроков.
    take(createRng(SEED, 'noise'), 7);
    take(createRng(SEED, 'bag'), 3);

    expect(take(createRng(SEED, 'layout'), 5)).toEqual(before);
  });

  it('меняет последовательность при смене мастер-сида', () => {
    expect(take(createRng('другой-сид', 'layout'), 5)).not.toEqual(take(createRng(SEED, 'layout'), 5));
  });

  it('собирает строку потока из мастер-сида и имени', () => {
    expect(streamSeed(SEED, 'combat')).toBe(`${SEED}#combat`);
    expect(streamSeed(SEED, 'cards')).not.toBe(streamSeed(SEED, 'combat'));
  });

  it('отвергает неизвестный поток явной ошибкой', () => {
    const unknown = 'неизвестный' as RngStream;

    expect(() => streamSeed(SEED, unknown)).toThrow(/Неизвестный поток случайности/);
    expect(() => createRng(SEED, unknown)).toThrow(/Неизвестный поток случайности/);
  });
});

describe('Бросок кубика', () => {
  it('возвращает грани от 1 до числа граней', () => {
    const rng = createRng(SEED, 'noise');

    for (const faceCount of [2, 4, 6, 10]) {
      for (let draw = 0; draw < 100; draw++) {
        const roll = rollDie(rng, faceCount);

        expect(roll).toBeGreaterThanOrEqual(1);
        expect(roll).toBeLessThanOrEqual(faceCount);
      }
    }
  });

  it('выдаёт каждую грань шестигранного кубика', () => {
    const rng = createRng(SEED, 'noise');
    const rolls = new Set(Array.from({ length: 600 }, () => rollDie(rng, 6)));

    expect([...rolls].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('отвергает кубик с невозможным числом граней', () => {
    const rng = createRng(SEED, 'noise');

    expect(() => rollDie(rng, 1)).toThrow(/Недопустимое число граней/);
    expect(() => rollDie(rng, 2.5)).toThrow(/Недопустимое число граней/);
  });
});

describe('Выбор элемента и раскладка', () => {
  it('держит индекс в границах набора', () => {
    const rng = createRng(SEED, 'bag');
    const indexes = Array.from({ length: 200 }, () => pickIndex(rng, 4));

    for (const index of indexes) {
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThanOrEqual(3);
    }
  });

  it('отвергает пустой набор', () => {
    const rng = createRng(SEED, 'bag');

    expect(() => pickIndex(rng, 0)).toThrow(/длиной 0/);
    expect(() => pickIndex(rng, -1)).toThrow(/длиной -1/);
  });

  it('перемешивает набор без потерь и повторов', () => {
    const items = Array.from({ length: 30 }, (_, index) => index);
    const shuffled = shuffle(createRng(SEED, 'layout'), items);

    expect(shuffled).toHaveLength(items.length);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(items);
    expect(items).toEqual(Array.from({ length: 30 }, (_, index) => index));
  });

  it('перемешивает одинаково при одном сиде и по-разному при разных', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    expect(shuffle(createRng(SEED, 'cards'), items)).toEqual(shuffle(createRng(SEED, 'cards'), items));
    expect(shuffle(createRng(SEED, 'layout'), items)).not.toEqual(shuffle(createRng(SEED, 'cards'), items));
  });

  it('оставляет короткие наборы на месте', () => {
    expect(shuffle(createRng(SEED, 'cards'), [])).toEqual([]);
    expect(shuffle(createRng(SEED, 'cards'), ['один'])).toEqual(['один']);
  });
});

describe('Позиция в потоке', () => {
  it('совпадает с последовательным чтением генератора', () => {
    const sequential = take(createRng(SEED, 'noise'), 10);

    const replayed = Array.from({ length: 10 }, (_, index) => drawFromStream(SEED, 'noise', index));

    expect(replayed).toEqual(sequential);
  });

  it('повторяет значение при повторном чтении той же позиции', () => {
    expect(drawFromStream(SEED, 'bag', 4)).toBe(drawFromStream(SEED, 'bag', 4));
  });

  it('отвергает невозможную позицию', () => {
    expect(() => drawFromStream(SEED, 'bag', -1)).toThrow(/Недопустимая позиция/);
    expect(() => drawFromStream(SEED, 'bag', 1.5)).toThrow(/Недопустимая позиция/);
  });
});
