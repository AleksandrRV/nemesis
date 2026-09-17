import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

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
  },
});