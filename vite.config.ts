import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  base: '/fishing-license-study/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.svg', 'favicon.svg'],
      manifest: {
        name: 'Brandenburg Fishing Exam Study',
        short_name: 'Fishing Exam',
        description:
          'Study for the Brandenburg fishing license exam (Fischereischein) with questions, flashcards, and a fish encyclopedia',
        lang: 'de',
        display: 'standalone',
        scope: '/fishing-license-study/',
        start_url: '/fishing-license-study/',
        theme_color: '#863bff',
        background_color: '#ffffff',
        categories: ['education'],
        icons: [
          {
            src: '/fishing-license-study/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/fishing-license-study/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/fishing-license-study/icons/maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/fishing-license-study/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // `json` included so runtime-fetched i18n locale files are precached
        // for offline use (i18next HTTP backend loads them on demand).
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
