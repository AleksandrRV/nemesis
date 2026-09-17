/**
 * Сид новой партии.
 *
 * UUID вместо времени: два игрока, начавшие партию в одну секунду, получают
 * разные столы, а сам сид остаётся воспроизводимым — его можно показать,
 * передать или восстановить (AGENTS.md §4.3 запрещает недетерминизм, поэтому
 * случайность допущена ровно в одном месте — при рождении сида).
 *
 * Генерация не зависит от «безопасного контекста»: `crypto.randomUUID` доступен
 * только на HTTPS и на localhost, поэтому на LAN-адресе по http (игра с телефона
 * в той же сети Wi-Fi) его просто нет. В этом случае UUIDv4 собирается из
 * `crypto.getRandomValues` — он доступен и в небезопасном контексте. Если Web
 * Crypto нет вовсе, сид не выдумывается: `Math.random()` в проекте запрещён
 * (AGENTS.md §4.3), поэтому рождается явная ошибка (план исправлений, Э1-2).
 */

/** Байтов в UUID. */
const UUID_BYTE_LENGTH = 16;

/** Версия 4 и вариант RFC 4122 — старшие биты шестого и восьмого байтов. */
const UUID_V4_VERSION_BITS = 0x40;
const UUID_RFC4122_VARIANT_BITS = 0x80;

export function createSeed(): string {
  const webCrypto = globalThis.crypto;

  if (!webCrypto) {
    throw new Error('Web Crypto недоступен: без криптографического источника случайности сид партии не создаётся.');
  }

  if (typeof webCrypto.randomUUID === 'function') {
    return webCrypto.randomUUID();
  }

  return uuidV4FromRandomValues(webCrypto);
}

/** UUIDv4 из 16 случайных байтов: формат RFC 4122, версия 4. */
function uuidV4FromRandomValues(webCrypto: Crypto): string {
  const bytes = webCrypto.getRandomValues(new Uint8Array(UUID_BYTE_LENGTH));

  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | UUID_V4_VERSION_BITS;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | UUID_RFC4122_VARIANT_BITS;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
