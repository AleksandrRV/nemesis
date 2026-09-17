import { describe, expect, it } from 'vitest';

import { shortSeed } from './seed';

describe('Сид партии в интерфейсе', () => {
  it('обрезает длинный сид до короткой формы', () => {
    expect(shortSeed('3f2a9c11-7b54-4d0e-9a86-1c2d3e4f5a6b')).toBe('3f2a9c11');
  });

  it('оставляет короткий сид как есть', () => {
    expect(shortSeed('nemesis-default-seed')).toBe('nemesis-');
    expect(shortSeed('seed-42')).toBe('seed-42');
  });

  it('поддерживает другую длину короткой формы', () => {
    expect(shortSeed('3f2a9c11-7b54', 4)).toBe('3f2a');
  });

  it('показывает прочерк вместо пустого сида', () => {
    expect(shortSeed('')).toBe('—');
  });
});
