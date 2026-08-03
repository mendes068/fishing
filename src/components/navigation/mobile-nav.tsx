import { useState } from 'react'
import { NavLink } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Anchor, Menu } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageSwitcher } from '@/components/language-switcher'
import { NAV_ITEMS } from '@/components/navigation/nav-items'
import { cn } from '@/lib/utils'

export function MobileNav() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            data-testid="mobile-nav-toggle"
            aria-label={t('nav.menu')}
          />
        }
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2">
            <Anchor className="size-5 text-primary" />
            {t('app.name')}
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
            <SheetClose
              key={to}
              render={
                <NavLink
                  to={to}
                  end={to === '/'}
                  aria-label={t(labelKey)}
                  className={({ isActive }) =>
                    cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                      isActive && 'bg-accent text-accent-foreground',
                    )
                  }
                />
              }
            >
              <Icon className="size-5 shrink-0" />
              <span>{t(labelKey)}</span>
            </SheetClose>
          ))}
        </nav>

        <Separator />

        <SheetFooter className="flex-row items-center justify-between p-3">
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
