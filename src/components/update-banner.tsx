import { useTranslation } from 'react-i18next'
import { RefreshCw } from 'lucide-react'

import { useServiceWorkerRegistration } from '@/lib/sw-register'
import { Button } from '@/components/ui/button'

/**
 * PWA update notification banner.
 *
 * - `offlineReady`: the app shell is fully cached and works offline.
 * - `needRefresh`: a new version is installed; the page must be reloaded to
 *   pick it up. `updateServiceWorker(true)` reloads, `updateServiceWorker(false)`
 *   dismisses the banner.
 */
export function UpdateBanner() {
  const { t } = useTranslation()
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useServiceWorkerRegistration()

  const show = offlineReady || needRefresh

  if (!show) return null

  return (
    <div
      data-testid="update-banner"
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
    >
      <div className="flex w-full max-w-md items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-card-foreground shadow-lg">
        <RefreshCw className="size-4 shrink-0 text-primary" />
        <p className="flex-1 text-sm">
          {needRefresh ? t('pwa.newVersion') : t('pwa.offlineReady')}
        </p>
        {needRefresh ? (
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" onClick={() => updateServiceWorker(true)}>
              {t('pwa.refresh')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setNeedRefresh(false)}
            >
              {t('pwa.dismiss')}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default UpdateBanner
