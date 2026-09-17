import { defineConfig } from 'vitest/config';

/**
 * Тесты запускаются проектами: ядро правил (packages/shared) проверяется
 * отдельно от клиента (packages/client), у каждого проекта своя карта модулей.
 */
export default defineConfig({
  test: {
    projects: ['packages/shared/vitest.config.ts', 'packages/client/vite.config.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      include: ['packages/*/src/**/*.{ts,tsx}'],
      exclude: ['**/*.test.{ts,tsx}', '**/dist/**', '**/*.d.ts'],
    },
  },
});
