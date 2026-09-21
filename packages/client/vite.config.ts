import { readFileSync } from 'fs';
import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Версия приложения — из package.json, а не из строки в HUD: иначе интерфейс
 * рано или поздно покажет версию, которой уже нет (план исправлений, Э1-6).
 */
const clientVersion = (JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')) as { version: string })
  .version;

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(clientVersion),
  },
  resolve: {
    alias: {
      '@nemesis/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  server: {
    host: true, // Позволяет подключаться с телефона по Wi-Fi (IP-адресу ПК)
    port: 5173,
    // Vite 5.4+ проверяет заголовок Host: без этого LAN-IP и внешние
    // прокси-домены (например, preview-хост облачной IDE) получают 403.
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
  // Конфигурация тестов живёт здесь же, чтобы алиас @nemesis/shared
  // оставался в одном месте и тесты видели ту же карту модулей, что и сборка.
  test: {
    name: 'client',
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
