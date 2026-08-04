import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Fish, Search as SearchIcon, ShieldCheck } from 'lucide-react'

import { useDataStore } from '@/store/data.store'
import { useSettingsStore } from '@/store/settings.store'
import type { FishSpecies, Language } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

/** Lowercase + strip diacritics for accent-insensitive matching. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Pick the active-language value with a safe fallback chain. */
function pick(loc: Record<Language, string>, lang: Language): string {
  return loc[lang] || loc.de || loc.en || loc['pt-BR'] || ''
}

/** German alphabet letters (A-Z, Ä, Ö, Ü). */
const GERMAN_ALPHABET = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  'Ä', 'Ö', 'Ü',
]

type SortMode = 'name' | 'scientific'
type ProtectionFilter = 'all' | 'protected' | 'common'

const PROTECTION_VALUES: ProtectionFilter[] = ['all', 'protected', 'common']

export default function Encyclopedia() {
  const { t } = useTranslation('encyclopedia')
  const navigate = useNavigate()
  const language = useSettingsStore((s) => s.language)

  const fishRecord = useDataStore((s) => s.fish)
  const dataLoading = useDataStore((s) => s.loading)
  const isLoaded = useDataStore((s) => s.isLoaded)
  const loadAll = useDataStore((s) => s.loadAll)

  // --- Data loading on mount ---
  useEffect(() => {
    if (!isLoaded()) {
      void loadAll()
    }
  }, [isLoaded, loadAll])

  // --- Local UI state ---
  const [searchQuery, setSearchQuery] = useState('')
  const [protectionFilter, setProtectionFilter] = useState<ProtectionFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('name')
  const [letterFilter, setLetterFilter] = useState<string | null>(null)

  // --- Derived fish list ---
  const allFish = useMemo<FishSpecies[]>(() => {
    if (!fishRecord) return []
    return Object.values(fishRecord)
  }, [fishRecord])

  // --- Filtered & sorted fish ---
  const filteredFish = useMemo(() => {
    let list = [...allFish]

    // Protection filter
    if (protectionFilter === 'protected') {
      list = list.filter((f) => f.protectedStatus)
    } else if (protectionFilter === 'common') {
      list = list.filter((f) => !f.protectedStatus)
    }

    // Search filter (normalized matching on common name + scientific name)
    const query = normalize(searchQuery.trim())
    if (query) {
      list = list.filter((f) => {
        const nameText = normalize(pick(f.commonNames, language))
        const sciText = normalize(f.scientificName)
        return nameText.includes(query) || sciText.includes(query)
      })
    }

    // Letter filter (based on German name first letter)
    if (letterFilter) {
      const lf = normalize(letterFilter)
      list = list.filter((f) => {
        const deName = f.commonNames.de
        return normalize(deName.charAt(0)) === lf
      })
    }

    // Sort
    if (sortMode === 'scientific') {
      list.sort((a, b) => a.scientificName.localeCompare(b.scientificName, 'de'))
    } else {
      // Default: sort by German name alphabetically
      list.sort((a, b) => a.commonNames.de.localeCompare(b.commonNames.de, 'de'))
    }

    return list
  }, [allFish, protectionFilter, searchQuery, sortMode, letterFilter, language])

  // --- Available letters for quick-jump (based on current filtered list if no letter filter) ---
  const availableLetters = useMemo(() => {
    const base = letterFilter ? allFish : filteredFish
    const letterSet = new Set<string>()
    for (const f of base) {
      const firstChar = f.commonNames.de.charAt(0).toUpperCase()
      letterSet.add(firstChar)
    }
    // Sort by position in GERMAN_ALPHABET
    return GERMAN_ALPHABET.filter((l) => letterSet.has(l))
  }, [filteredFish, letterFilter, allFish])

  // --- Handlers ---
  const handleClearLetter = () => setLetterFilter(null)

  // --- Rendering ---

  // Loading state
  if (dataLoading && !fishRecord) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingSpinner className="size-8" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
      {/* --- Header --- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <span className="text-sm text-muted-foreground">
          {t('speciesCount', { count: filteredFish.length })}
        </span>
      </div>

      {/* --- Toolbar: search + filters + sort --- */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className="pl-9"
          />
        </div>

        <Select
          value={protectionFilter}
          onValueChange={(value) => setProtectionFilter(value as ProtectionFilter)}
        >
          <SelectTrigger size="sm" className="w-fit">
            <SelectValue>
              {protectionFilter === 'all'
                ? t('filterAll')
                : protectionFilter === 'protected'
                  ? t('filterProtected')
                  : t('filterCommon')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PROTECTION_VALUES.map((val) => (
              <SelectItem key={val} value={val}>
                {val === 'all'
                  ? t('filterAll')
                  : val === 'protected'
                    ? t('filterProtected')
                    : t('filterCommon')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sortMode}
          onValueChange={(value) => setSortMode(value as SortMode)}
        >
          <SelectTrigger size="sm" className="w-fit">
            <SelectValue>
              {sortMode === 'name' ? t('sortByName') : t('sortByScientific')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">{t('sortByName')}</SelectItem>
            <SelectItem value="scientific">{t('sortByScientific')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* --- Alphabetical quick-jump --- */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-xs font-medium text-muted-foreground">
          {t('alphabetical')}:
        </span>
        {availableLetters.map((letter) => (
          <Button
            key={letter}
            variant={letterFilter === letter ? 'default' : 'ghost'}
            size="xs"
            onClick={() => setLetterFilter(letterFilter === letter ? null : letter)}
            className="min-w-[1.75rem] px-0"
          >
            {letter}
          </Button>
        ))}
        {letterFilter && (
          <Button variant="ghost" size="xs" onClick={handleClearLetter} className="text-xs">
            ✕
          </Button>
        )}
      </div>

      {/* --- Card grid --- */}
      {filteredFish.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Fish className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t('noResults')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFish.map((fish) => (
            <Card
              key={fish.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/encyclopedia/${fish.id}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  navigate(`/encyclopedia/${fish.id}`)
                }
              }}
              className="cursor-pointer transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">
                    {pick(fish.commonNames, language)}
                  </CardTitle>
                  {fish.protectedStatus && (
                    <ShieldCheck className="size-4 shrink-0 text-primary" />
                  )}
                </div>
                <CardDescription>
                  <span className="font-italic italic">{fish.scientificName}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {fish.protectedStatus ? (
                    <Badge variant="default">{t('protected')}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">{t('common')}</span>
                  )}
                  <Button variant="ghost" size="xs" className="gap-1" tabIndex={-1}>
                    {t('details')}
                    <ArrowRight className="size-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
