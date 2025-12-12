// frontend/vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// Importamos la referencia para la configuración de test
/// <reference types="vitest" />

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // --- AÑADIMOS ESTA SECCIÓN ---
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js', // Opcional, pero buena práctica
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'unsafe-none',
    },
  },
});
