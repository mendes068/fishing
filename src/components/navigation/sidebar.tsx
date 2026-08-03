import { useLocation } from 'react-router'
import { NavLink } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Anchor, ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageSwitcher } from '@/components/language-switcher'
import { NAV_ITEMS } from '@/components/navigation/nav-items'
import { cn } from '@/lib/utils'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { t } = useTranslation()
  const location = useLocation()

  function isActivePath(to: string): boolean {
    if (to === '/') return location.pathname === '/'
    return location.pathname === to || location.pathname.startsWith(`${to}/`)
  }

  return (
    <TooltipProvider delay={300}>
      <aside
        data-testid="sidebar"
        className={cn(
          'hidden lg:flex h-screen flex-col border-r bg-card text-card-foreground transition-all duration-200',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        {/* App header */}
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-4',
            collapsed && 'justify-center',
          )}
        >
          <Anchor className="size-6 shrink-0 text-primary" />
          {!collapsed && (
            <span className="truncate text-sm font-semibold">
              {t('app.name')}
            </span>
          )}
        </div>

        <Separator />

        {/* Nav items */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => {
            const active = isActivePath(to)

            if (collapsed) {
              return (
                <Tooltip key={to}>
                  <TooltipTrigger
                    render={
                      <NavLink
                        to={to}
                        end={to === '/'}
                        aria-label={t(labelKey)}
                        className={cn(
                          'flex items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                          active && 'bg-accent text-accent-foreground',
                        )}
                      />
                    }
                  >
                    <Icon className="size-5 shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="right">{t(labelKey)}</TooltipContent>
                </Tooltip>
              )
            }

            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                aria-label={t(labelKey)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                    (isActive ?? active) &&
                      'bg-accent text-accent-foreground',
                  )
                }
              >
                <Icon className="size-5 shrink-0" />
                <span className="truncate">{t(labelKey)}</span>
              </NavLink>
            )
          })}
        </nav>

        <Separator />

        {/* Bottom controls */}
        <div
          className={cn(
            'flex items-center gap-1 p-2',
            collapsed ? 'flex-col' : 'justify-between',
          )}
        >
          <ThemeToggle />
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            aria-label={
              collapsed ? t('nav.expand') : t('nav.collapse')
            }
            data-testid="sidebar-toggle"
          >
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
