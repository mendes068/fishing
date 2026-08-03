import type { CommonResources } from '@/i18n/types'
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  FolderOpen,
  BarChart3,
  Search,
  Star,
  StickyNote,
  Layers,
  Fish,
  BookMarked,
  FileDown,
  Settings,
  type LucideIcon,
} from 'lucide-react'

/** Dotted path into the `nav` section of the common namespace. */
export type NavKey = `nav.${keyof CommonResources['nav'] & string}`

export interface NavItem {
  to: string
  labelKey: NavKey
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/study', labelKey: 'nav.study', icon: BookOpen },
  { to: '/exam', labelKey: 'nav.exam', icon: ClipboardList },
  { to: '/categories', labelKey: 'nav.categories', icon: FolderOpen },
  { to: '/stats', labelKey: 'nav.stats', icon: BarChart3 },
  { to: '/search', labelKey: 'nav.search', icon: Search },
  { to: '/favorites', labelKey: 'nav.favorites', icon: Star },
  { to: '/notes', labelKey: 'nav.notes', icon: StickyNote },
  { to: '/flashcards', labelKey: 'nav.flashcards', icon: Layers },
  { to: '/encyclopedia', labelKey: 'nav.encyclopedia', icon: Fish },
  { to: '/glossary', labelKey: 'nav.glossary', icon: BookMarked },
  { to: '/import', labelKey: 'nav.import', icon: FileDown },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
]
