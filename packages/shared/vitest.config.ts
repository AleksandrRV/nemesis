import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'shared',
    // Ядро правил — чистый TypeScript без DOM, поэтому окружение Node.js.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
