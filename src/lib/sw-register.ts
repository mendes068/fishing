import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Central service-worker registration via workbox-window (vite-plugin-pwa's
 * `virtual:pwa-register/react`). With `registerType: 'autoUpdate'` the SW
 * self-updates on next load; this hook exposes the `needRefresh` flag so the
 * app can show a "new version available — refresh" banner via UpdateBanner.
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
