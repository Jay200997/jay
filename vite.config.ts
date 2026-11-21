import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build` → installable PWA in dist/
// `npm run build:single` → one self-contained HTML file in dist-single/ (no service worker)
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    define: single ? { 'import.meta.env.VITE_TARGET': JSON.stringify('artifact') } : {},
    build: single
      ? { outDir: 'dist-single', chunkSizeWarningLimit: 2000, assetsInlineLimit: 100_000_000 }
      : { chunkSizeWarningLimit: 800 },
    plugins: [
      react(),
      single
        ? viteSingleFile()
        : VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['icon.svg', 'apple-touch-icon.png'],
            manifest: {
              name: 'FitTrack',
              short_name: 'FitTrack',
              description: 'Offline fitness, meal and progress tracker',
              theme_color: '#0b0f14',
              background_color: '#0b0f14',
              display: 'standalone',
              orientation: 'portrait',
              start_url: './',
              scope: './',
              icons: [
                { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
                { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
              ],
            },
            workbox: { globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'] },
          }),
    ],
  };
});
