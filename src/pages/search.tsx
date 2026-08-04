import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  BookOpenText,
  FileQuestion,
  Fish,
  Search as SearchIcon,
  X,
} from 'lucide-react'

import { useDataStore } from '@/store/data.store'
import { useSettingsStore } from '@/store/settings.store'
import type { Language, LocalizedText, QuestionCategory } from '@/types'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/loading-spinner'

/** Every language the app ships — the search haystack spans all of them. */
const LANGUAGES: readonly Language[] = ['de', 'en', 'pt-BR']

/** i18n keys for the 5 official exam categories (categories:names.*). */
const CATEGORY_NAME_KEYS = {
  fischkunde_und_hege: 'names.fischkunde_und_hege',
  pflege_der_fischgewaesser: 'names.pflege_der_fischgewaesser',
  fanggeraete_und_deren_gebrauch: 'names.fanggeraete_und_deren_gebrauch',
  behandlung_der_gefangenen_fische: 'names.behandlung_der_gefangenen_fische',
  einschlaegige_rechtsvorschriften: 'names.einschlaegige_rechtsvorschriften',
} as const

type ResultType = 'question' | 'fish' | 'glossary'

interface IndexEntry {
  type: ResultType
  id: string
  /** Category id — only present for question entries. */
  category?: QuestionCategory
  /** Display title in the active language. */
  title: string
  /** One-line preview in the active language. */
  preview: string
  /** Normalized (lowercased, diacritic-stripped) text across ALL languages. */
  haystack: string
}

/**
 * Lowercase + strip diacritics so "Förelle" matches "forelle" and
 * "Fischgewässer" matches "fischgewasser". Applied to both the query and the
 * index so matching is robust across languages.
 */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Join every language variant of a localized string. */
function allLanguages(loc: LocalizedText): string {
  return LANGUAGES.map((lang) => loc[lang] ?? '').join(' ')
}

/** Pick the active-language value with a safe fallback chain. */
function pick(loc: LocalizedText, lang: Language): string {
  return loc[lang] || loc.de || loc.en || loc['pt-BR'] || ''
}

function truncate(value: string, max = 140): string {
  return value.length > max ? `${value.slice(0, max).trimEnd()}…` : value
}

interface ResultCardProps {
  entry: IndexEntry
  testId: string
  categoryLabel?: string
  onSelect: (entry: IndexEntry) => void
}

function ResultCard({ entry, testId, categoryLabel, onSelect }: ResultCardProps) {
  return (
    <Card
      data-testid={testId}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(entry)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(entry)
        }
      }}
      className="cursor-pointer transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      <CardHeader>
        <CardTitle className="text-sm">{entry.title}</CardTitle>
        <CardDescription>{entry.preview}</CardDescription>
        {categoryLabel && (
          <CardAction>
            <Badge variant="secondary">{categoryLabel}</Badge>
          </CardAction>
        )}
      </CardHeader>
    </Card>
  )
}

interface ResultGroupProps {
  label: string
  count: number
  testId: string
  items: IndexEntry[]
  icon: ReactNode
  categoryLabels: Record<QuestionCategory, string>
  onSelect: (entry: IndexEntry) => void
}

function ResultGroup({
  label,
  count,
  testId,
  items,
  icon,
  categoryLabels,
  onSelect,
}: ResultGroupProps) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {icon}
        <span>
          {label} ({count})
        </span>
      </h2>
      <div className="flex flex-col gap-2">
        {items.map((entry) => (
          <ResultCard
            key={`${entry.type}-${entry.id}`}
            entry={entry}
            testId={testId}
            categoryLabel={
              entry.category ? categoryLabels[entry.category] : undefined
            }
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  )
}

/**
 * Instant full-text search across questions, fish species and glossary terms.
 *
 * Responsiveness strategy (documented): the raw input state updates on every
 * keystroke so the field never lags; a 300 ms debounce (useEffect + setTimeout)
 * throttles how often the search actually re-runs; and `useDeferredValue` lets
 * React defer the (memoized) filtering work so typing never blocks the UI.
 */
export default function Search() {
  const { t } = useTranslation('search')
  const { t: tCategories } = useTranslation('categories')
  const navigate = useNavigate()
  const language = useSettingsStore((s) => s.language)

  const questions = useDataStore((s) => s.questions)
  const fish = useDataStore((s) => s.fish)
  const glossary = useDataStore((s) => s.glossary)
  const loading = useDataStore((s) => s.loading)

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const deferredQuery = useDeferredValue(debouncedQuery)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load the trilingual data sets on mount (idempotent, no-op if already loaded).
  useEffect(() => {
    const { isLoaded, loadAll } = useDataStore.getState()
    if (!isLoaded()) void loadAll()
  }, [])

  // 300 ms debounce on the input state — the input itself stays instant.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  // Ctrl+K / Cmd+K focuses the search field while this page is mounted.
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

  // Memoized search index: rebuilt when the data sets or the active language
  // change. `haystack` deliberately includes ALL three languages per entity so
  // searching "pike" finds the Hecht entry even in German mode.
  const index = useMemo<IndexEntry[]>(() => {
    const entries: IndexEntry[] = []

    if (questions) {
      for (const q of Object.values(questions)) {
        const haystack = normalize(
          [
            allLanguages(q.questionText),
            ...q.answers.map((a) => allLanguages(a.text)),
            allLanguages(q.explanation),
            q.tags.join(' '),
          ].join(' '),
        )
        entries.push({
          type: 'question',
          id: q.id,
          category: q.category,
          title: pick(q.questionText, language),
          preview: truncate(pick(q.explanation, language)),
          haystack,
        })
      }
    }

    if (fish) {
      for (const f of Object.values(fish)) {
        const haystack = normalize(
          [
            allLanguages(f.commonNames),
            allLanguages(f.habitat),
            allLanguages(f.distinguishingFeatures),
            f.scientificName,
          ].join(' '),
        )
        entries.push({
          type: 'fish',
          id: f.id,
          title: pick(f.commonNames, language),
          preview: `${f.scientificName} · ${truncate(pick(f.habitat, language), 90)}`,
          haystack,
        })
      }
    }

    if (glossary) {
      for (const g of Object.values(glossary)) {
        const haystack = normalize(
          [allLanguages(g.term), allLanguages(g.definition)].join(' '),
        )
        entries.push({
          type: 'glossary',
          id: g.id,
          title: pick(g.term, language),
          preview: truncate(pick(g.definition, language)),
          haystack,
        })
      }
    }

    return entries
  }, [questions, fish, glossary, language])

  // Case/diacritic-insensitive substring filter over the index.
  const results = useMemo(() => {
    const q = normalize(deferredQuery.trim())
    const grouped: Record<ResultType, IndexEntry[]> = {
      question: [],
      fish: [],
      glossary: [],
    }
    if (!q) return grouped
    for (const entry of index) {
      if (entry.haystack.includes(q)) grouped[entry.type].push(entry)
    }
    return grouped
  }, [index, deferredQuery])

  const categoryLabels = useMemo(() => {
    const labels = {} as Record<QuestionCategory, string>
    for (const key of Object.keys(CATEGORY_NAME_KEYS) as QuestionCategory[]) {
      labels[key] = tCategories(CATEGORY_NAME_KEYS[key])
    }
    return labels
  }, [tCategories])

  const hasQuery = query.trim().length > 0
  const totalResults =
    results.question.length + results.fish.length + results.glossary.length

  const handleSelect = (entry: IndexEntry) => {
    switch (entry.type) {
      case 'question':
        // ?category=… scopes the study page to the question's category.
        navigate(`/study?category=${encodeURIComponent(entry.category ?? '')}`)
        break
      case 'fish':
        // Fish detail route lands in Task 22; the index page is reachable now.
        navigate('/encyclopedia')
        break
      case 'glossary':
        // Task 23 reads ?term=… to deep-link a glossary entry.
        navigate(`/glossary?term=${encodeURIComponent(entry.id)}`)
        break
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
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

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          data-testid="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          className="h-11 pr-10 pl-10 text-base"
        />
        {query.length > 0 && (
          <button
            type="button"
            data-testid="search-clear"
            onClick={() => setQuery('')}
            aria-label={t('clear')}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div
          data-testid="search-loading"
          className="flex items-center justify-center gap-3 py-12 text-sm text-muted-foreground"
        >
          <LoadingSpinner className="size-5" />
          <span>{t('loading')}</span>
        </div>
      ) : !hasQuery ? (
        <div
          data-testid="search-hint"
          className="flex flex-col items-center gap-2 py-12 text-center"
        >
          <SearchIcon className="size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{t('hint')}</p>
          <p className="text-xs text-muted-foreground/70">{t('searchHint')}</p>
        </div>
      ) : totalResults > 0 ? (
        <div className="flex flex-col gap-8">
          <p
            className="text-sm text-muted-foreground"
            aria-live="polite"
            aria-atomic="true"
          >
            {t('resultsFor', { query: debouncedQuery })}
          </p>
          <p className="sr-only" role="status" aria-live="polite">
            {t('resultsCount', { count: totalResults })}
          </p>
          {results.question.length > 0 && (
            <ResultGroup
              label={t('questions')}
              count={results.question.length}
              testId="search-result-question"
              items={results.question}
              icon={<FileQuestion className="size-4" />}
              categoryLabels={categoryLabels}
              onSelect={handleSelect}
            />
          )}
          {results.fish.length > 0 && (
            <ResultGroup
              label={t('fishSpecies')}
              count={results.fish.length}
              testId="search-result-fish"
              items={results.fish}
              icon={<Fish className="size-4" />}
              categoryLabels={categoryLabels}
              onSelect={handleSelect}
            />
          )}
          {results.glossary.length > 0 && (
            <ResultGroup
              label={t('glossaryTerms')}
              count={results.glossary.length}
              testId="search-result-glossary"
              items={results.glossary}
              icon={<BookOpenText className="size-4" />}
              categoryLabels={categoryLabels}
              onSelect={handleSelect}
            />
          )}
        </div>
      ) : (
        <div
          data-testid="search-no-results"
          className="flex flex-col items-center gap-2 py-12 text-center"
        >
          <p className="text-sm font-medium">{t('noResults')}</p>
          <p className="text-sm text-muted-foreground">
            {t('noResultsFor', { query: debouncedQuery })}
          </p>
          <p className="text-xs text-muted-foreground/70">
            {t('noResultsSuggestion')}
          </p>
        </div>
      )}
    </div>
  )
}
