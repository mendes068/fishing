import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowRight, BookOpenText, ChevronDown, Search, X } from 'lucide-react'

import { useDataStore } from '@/store/data.store'
import { useSettingsStore } from '@/store/settings.store'
import type { GlossaryTerm, Language, LocalizedText } from '@/types'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/loading-spinner'

type GlossaryCategory = GlossaryTerm['category']

const CATEGORY_KEYS: Record<GlossaryCategory, string> = {
  equipment: 'filterEquipment',
  biology: 'filterBiology',
  legal: 'filterLegal',
  technique: 'filterTechnique',
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function pick(loc: LocalizedText, lang: Language): string {
  return loc[lang] || loc.de || loc.en || loc['pt-BR'] || ''
}

function getFirstLetter(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return '#'
  const first = trimmed[0].toUpperCase()
  // Group digits/symbols under #
  return /[A-ZÀ-ÖØ-Þ]/.test(first) ? first : '#'
}

interface TermCardProps {
  term: GlossaryTerm
  language: Language
  expanded: boolean
  onToggle: () => void
  onSeeAlso: (id: string) => void
  categoryLabel: string
  tDef: string
  tSeeAlso: string
  allTerms: Map<string, string>
}

function TermCard({
  term,
  language,
  expanded,
  onToggle,
  onSeeAlso,
  categoryLabel,
  tDef,
  tSeeAlso,
  allTerms,
}: TermCardProps) {
  const termName = pick(term.term, language)
  const definition = pick(term.definition, language)

  return (
    <Card
      data-testid={`glossary-term-${term.id}`}
      size="sm"
      className="transition-colors"
    >
      <CardHeader
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onToggle()
          }
        }}
        className="cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <CardTitle className="flex-1 text-sm">{termName}</CardTitle>
          <Badge variant="secondary">{categoryLabel}</Badge>
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </div>
        {!expanded && (
          <CardDescription className="line-clamp-1">
            {definition}
          </CardDescription>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="flex flex-col gap-3 pb-(--card-spacing)">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {tDef}
            </p>
            <p className="text-sm leading-relaxed">{definition}</p>
          </div>

          {term.seeAlso.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {tSeeAlso}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {term.seeAlso.map((id) => (
                  <button
                    type="button"
                    key={id}
                    data-testid={`glossary-see-also-${id}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      onSeeAlso(id)
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <ArrowRight className="size-3" />
                    {allTerms.get(id) ?? id}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export default function Glossary() {
  const { t } = useTranslation('glossary')
  const language = useSettingsStore((s) => s.language)
  const glossary = useDataStore((s) => s.glossary)
  const loading = useDataStore((s) => s.loading)

  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<GlossaryCategory | 'all'>('all')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  // Load data on mount
  useEffect(() => {
    const { isLoaded, loadAll } = useDataStore.getState()
    if (!isLoaded()) void loadAll()
  }, [])

  // Read ?term=<id> from search params and auto-expand
  useEffect(() => {
    const termId = searchParams.get('term')
    if (termId && glossary && glossary[termId]) {
      setExpandedIds((prev) => new Set(prev).add(termId))
      // Remove the query param from the URL after processing
      const next = new URLSearchParams(searchParams)
      next.delete('term')
      setSearchParams(next, { replace: true })
    }
    // Only run on mount / when glossary arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glossary !== null])

  // Ctrl+K / Cmd+K focuses search
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const toggleTerm = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const expandTerm = useCallback((id: string) => {
    setExpandedIds((prev) => new Set(prev).add(id))
  }, [])

  // Build a lookup map: id → term name (current language)
  const termNameMap = useMemo(() => {
    const map = new Map<string, string>()
    if (glossary) {
      for (const g of Object.values(glossary)) {
        map.set(g.id, pick(g.term, language))
      }
    }
    return map
  }, [glossary, language])

  // Filter + sort + group
  const groups = useMemo(() => {
    if (!glossary) return []

    const normalizedQuery = normalize(query.trim())
    const terms = Object.values(glossary)

    const filtered = terms.filter((g) => {
      // Category filter
      if (category !== 'all' && g.category !== category) return false

      // Search filter
      if (normalizedQuery) {
        const haystack = normalize(
          `${pick(g.term, language)} ${pick(g.definition, language)}`,
        )
        if (!haystack.includes(normalizedQuery)) return false
      }

      return true
    })

    // Sort alphabetically by current-language term
    const sorted = [...filtered].sort((a, b) => {
      const nameA = pick(a.term, language)
      const nameB = pick(b.term, language)
      return nameA.localeCompare(nameB, language, { sensitivity: 'base' })
    })

    // Group by first letter
    const grouped = new Map<string, GlossaryTerm[]>()
    for (const g of sorted) {
      const letter = getFirstLetter(pick(g.term, language))
      const bucket = grouped.get(letter)
      if (bucket) {
        bucket.push(g)
      } else {
        grouped.set(letter, [g])
      }
    }

    // Convert to array of [letter, terms] sorted by letter
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [glossary, language, query, category])

  const hasResults = groups.length > 0
  const totalVisible = groups.reduce((sum, [, terms]) => sum + terms.length, 0)

  // Calculate available categories from the data
  const availableCategories = useMemo(() => {
    if (!glossary) return []
    const cats = new Set<GlossaryCategory>()
    for (const g of Object.values(glossary)) {
      cats.add(g.category)
    }
    return [...cats].sort()
  }, [glossary])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[11px]">
            Ctrl
          </kbd>
          <span>+</span>
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[11px]">
            K
          </kbd>
        </span>
      </div>

      {/* Filters row */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            data-testid="glossary-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className="h-9 pl-9 pr-9"
          />
          {query.length > 0 && (
            <button
              type="button"
              data-testid="glossary-search-clear"
              onClick={() => setQuery('')}
              aria-label={t('close')}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Select
          value={category}
          onValueChange={(value) =>
            setCategory(value as GlossaryCategory | 'all')
          }
        >
          <SelectTrigger
            data-testid="glossary-category-filter"
            className="sm:w-44"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filterAll')}</SelectItem>
            {availableCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {t(CATEGORY_KEYS[cat])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      {glossary && (
        <p className="text-xs text-muted-foreground">
          {totalVisible} {t('title')}
          {query && ` — "${query}"`}
        </p>
      )}

      {/* Loading state */}
      {loading && !glossary && (
        <div
          data-testid="glossary-loading"
          className="flex items-center justify-center gap-3 py-12 text-sm text-muted-foreground"
        >
          <LoadingSpinner className="size-5" />
          <span>{t('loading')}</span>
        </div>
      )}

      {/* Empty state */}
      {glossary && !loading && !hasResults && (
        <div
          data-testid="glossary-no-results"
          className="flex flex-col items-center gap-2 py-12 text-center"
        >
          <BookOpenText className="size-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">{t('noResults')}</p>
        </div>
      )}

      {/* Alphabetical groups */}
      {glossary &&
        !loading &&
        groups.map(([letter, terms]) => (
          <section key={letter} className="flex flex-col gap-2">
            <h2
              className="sticky top-0 z-10 -mx-1 rounded-md bg-background/95 px-1 py-1 text-sm font-semibold tracking-wide text-muted-foreground uppercase backdrop-blur-sm"
              data-testid={`glossary-section-${letter}`}
            >
              {letter}
            </h2>
            <div className="flex flex-col gap-2">
              {terms.map((g) => (
                <TermCard
                  key={g.id}
                  term={g}
                  language={language}
                  expanded={expandedIds.has(g.id)}
                  onToggle={() => toggleTerm(g.id)}
                  onSeeAlso={expandTerm}
                  categoryLabel={t(CATEGORY_KEYS[g.category])}
                  tDef={t('definition')}
                  tSeeAlso={t('seeAlso')}
                  allTerms={termNameMap}
                />
              ))}
            </div>
          </section>
        ))}
    </div>
  )
}
