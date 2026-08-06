import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  base: '/fishing/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['pwa-icon.svg', 'favicon.svg'],
      manifest: {
        name: 'Brandenburg Fishing Exam Study',
        short_name: 'Fishing Exam',
        description:
          'Study for the Brandenburg fishing license exam (Fischereischein) with questions, flashcards, and a fish encyclopedia',
        lang: 'de',
        display: 'standalone',
        scope: '/fishing/',
        start_url: '/fishing/',
        theme_color: '#863bff',
        background_color: '#ffffff',
        categories: ['education'],
        icons: [
          {
            src: '/fishing/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/fishing/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/fishing/icons/maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/fishing/icons/maskable-512.png',
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
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // Vendor splitting via Rolldown `codeSplitting` (Vite 8 removed object-form
        // `manualChunks`). Chart.js / react-chartjs-2 intentionally NOT listed:
        // they stay in the lazy /stats route chunk.
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 40,
            },
            {
              name: 'router',
              test: /node_modules[\\/]react-router[\\/]/,
              priority: 35,
            },
            {
              name: 'state',
              test: /node_modules[\\/]zustand[\\/]/,
              priority: 30,
            },
            {
              name: 'i18n',
              test: /node_modules[\\/](i18next|react-i18next|i18next-http-backend|i18next-browser-languagedetector)[\\/]/,
              priority: 25,
            },
          ],
        },
      },
    },
  },
})
