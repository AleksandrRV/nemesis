import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
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
    include: ['src/**/*.test.ts'],
  },
});
