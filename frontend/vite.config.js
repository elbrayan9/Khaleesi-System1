// frontend/vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';

// Importamos la referencia para la configuración de test
/// <reference types="vitest" />

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // avisamos al usuario antes de actualizar
      includeAssets: ['apple-touch-icon.png', 'khaleesi-system.svg'],
      manifest: {
        name: 'Khaleesi System',
        short_name: 'Khaleesi',
        description: 'Gestión y punto de venta para tu negocio.',
        start_url: '/dashboard',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#18181b',
        theme_color: '#18181b',
        lang: 'es-AR',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icon-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Solo el armazón de la app. Los datos los maneja Firestore con su
        // propia caché y las Cloud Functions tienen que ir SIEMPRE a la red.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // El .jpg del logo pesa 11 MB: no entra en la precarga.
        globIgnores: ['**/khaleesi-system.jpg'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
        // Nada de Firebase/Google/Mercado Pago se cachea ni se intercepta.
        navigateFallbackDenylist: [/^\/__/, /^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fuentes',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
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
