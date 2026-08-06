import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Central service-worker registration via workbox-window (vite-plugin-pwa's
 * `virtual:pwa-register/react`). Uses `registerType: 'prompt'` so the app
 * controls when to apply updates — the UpdateBanner shows a "new version
 * available" message with Refresh / Dismiss buttons.
 */
export function useServiceWorkerRegistration() {
  return useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // Optional: poll for updates every hour while a registration exists.
      if (!registration) return
      const interval = setInterval(() => {
        registration.update().catch(() => {})
      }, 60 * 60 * 1000)
      // Clean up the interval when the window is unloaded (avoid leaks).
      window.addEventListener('beforeunload', () => clearInterval(interval))
    },
    onRegisterError(error) {
      console.error('SW registration error', error)
    },
  })
}
