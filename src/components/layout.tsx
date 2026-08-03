import { Outlet } from 'react-router'
import { useTranslation } from 'react-i18next'

import { ThemeToggle } from '@/components/theme-toggle'

/**
 * Minimal app shell. Navigation sidebar arrives in Task 12 — for now just a
 * header (app name + theme toggle) and the routed content outlet.
 */
export function AppLayout() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <h1 className="text-lg font-semibold">{t('app.name')}</h1>
        <ThemeToggle />
      </header>
      <main className="mx-auto w-full max-w-5xl p-6">
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
