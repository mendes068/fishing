import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Anchor } from 'lucide-react'

import { Sidebar } from '@/components/navigation/sidebar'
import { MobileNav } from '@/components/navigation/mobile-nav'
import { UpdateBanner } from '@/components/update-banner'

/**
 * Full responsive app shell:
 * - Desktop (≥lg): fixed sidebar (collapsible) + main content
 * - Tablet (≥md, <lg): collapsed sidebar (icons + tooltips) + main content
 * - Mobile (<md): thin top bar with hamburger (Sheet) + main content
 *
 * Theme/language toggles live inside the sidebar and mobile Sheet.
 */
export function AppLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const mainRef = useRef<HTMLElement>(null)

  // Move focus to the main content region after a route change so keyboard and
  // screen-reader users aren't stranded at the top of the page. Skipped while a
  // modal dialog/sheet is open — Base UI owns focus management inside those.
  useEffect(() => {
    const modalOpen = document.querySelector(
      '[data-slot="dialog-content"], [data-slot="sheet-content"], [role="dialog"]',
    )
    if (modalOpen) return
    mainRef.current?.focus({ preventScroll: true })
  }, [location.pathname])

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Skip-to-content link: first focusable element in the tab order */}
      <a
        href="#main-content"
        data-testid="skip-to-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
      >
        {t('a11y.skipToContent')}
      </a>

      {/* Desktop / tablet sidebar — hidden below lg */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile top bar — visible below lg */}
        <header className="flex items-center gap-2 border-b border-border px-3 py-2 lg:hidden">
          <MobileNav />
          <Anchor className="size-5 shrink-0 text-primary" />
          <span className="truncate text-sm font-semibold">
            {t('app.name')}
          </span>
        </header>

        {/* Page content */}
        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="flex-1 p-6 focus:outline-none"
        >
          <Outlet />
        </main>
      </div>

      {/* PWA update / offline-ready notification */}
      <UpdateBanner />
    </div>
  )
}

export default AppLayout
