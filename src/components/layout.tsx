import { useState } from 'react'
import { Outlet } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Anchor } from 'lucide-react'

import { Sidebar } from '@/components/navigation/sidebar'
import { MobileNav } from '@/components/navigation/mobile-nav'

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen bg-background text-foreground">
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
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
