import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSeed } from './seed';

/** UUID версии 4 по RFC 4122: версия — в третьей группе, вариант — в четвёртой. */
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createSeed: сид новой партии', () => {
  it('берёт crypto.randomUUID, когда он доступен (https и localhost)', () => {
    const randomUUID = vi.fn(() => '11111111-2222-4333-8444-555555555555');

    vi.stubGlobal('crypto', { randomUUID });

    expect(createSeed()).toBe('11111111-2222-4333-8444-555555555555');
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });

  it('собирает UUIDv4 из getRandomValues, когда randomUUID нет (http по LAN-адресу)', () => {
    // Так выглядит среда небезопасного контекста: getRandomValues есть, randomUUID — нет.
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      bytes.fill(0xab);
      return bytes;
    });

    vi.stubGlobal('crypto', { getRandomValues });

    // 0xab с выставленными битами версии и варианта: 4b в версии, ab в варианте.
    expect(createSeed()).toBe('abababab-abab-4bab-abab-abababababab');
    expect(getRandomValues).toHaveBeenCalledTimes(1);
  });

  it('остаётся UUID при настоящем Web Crypto: партию можно передать другому устройству', () => {
    expect(createSeed()).toMatch(UUID_V4);
    expect(createSeed()).not.toBe(createSeed());
  });

  it('падает явной ошибкой, если Web Crypto нет вовсе, а не выдумывает сид', () => {
    vi.stubGlobal('crypto', undefined);

    expect(() => createSeed()).toThrow(/Web Crypto/);
  });
});
