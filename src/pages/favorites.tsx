import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { SearchIcon, StarIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageLoading } from '@/components/loading-spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CATEGORY_NAME_KEYS, CATEGORY_ORDER } from '@/lib/categories'
import { useDataStore } from '@/store/data.store'
import { useFavoritesStore } from '@/store/favorites.store'
import { useSettingsStore } from '@/store/settings.store'
import type { Question, QuestionCategory } from '@/types'

type CategoryFilter = QuestionCategory | 'all'

/**
 * Favorites list: every question the user starred while studying, with a
 * category filter, a within-list search, and navigation back into study mode
 * scoped to the question's category.
 */
export default function Favorites() {
  const { t } = useTranslation('favorites')
  const { t: tc } = useTranslation('categories')
  const navigate = useNavigate()

  // --- Stores ----------------------------------------------------------------
  const language = useSettingsStore((s) => s.language)
  const questions = useDataStore((s) => s.questions)
  const dataLoading = useDataStore((s) => s.loading)
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds)
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite)

  // --- Local UI state --------------------------------------------------------
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [query, setQuery] = useState('')

  // Load the trilingual data sets on mount (idempotent, no-op if already loaded).
  useEffect(() => {
    const { isLoaded, loadAll } = useDataStore.getState()
    if (!isLoaded()) void loadAll()
  }, [])

  // --- Derived data -----------------------------------------------------------

  /** Category names in the active language (avoids dynamic-key i18next typing). */
  const categoryLabels = useMemo(() => {
    const labels = {} as Record<QuestionCategory, string>
    for (const key of Object.keys(CATEGORY_NAME_KEYS) as QuestionCategory[]) {
      labels[key] = tc(CATEGORY_NAME_KEYS[key])
    }
    return labels
  }, [tc])

  /** Question objects for every favorited id, in favorite order. */
  const favorites = useMemo(() => {
    if (!questions) return []
    return favoriteIds
      .map((id) => questions[id])
      .filter((q): q is Question => q !== undefined)
  }, [favoriteIds, questions])

  /** Favorites narrowed by the active category filter + search query. */
  const filteredFavorites = useMemo(() => {
    const q = query.trim().toLowerCase()
    return favorites.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false
      if (!q) return true
      const text = (item.questionText[language] ?? item.questionText.de).toLowerCase()
      return text.includes(q)
    })
  }, [favorites, categoryFilter, query, language])

  // --- Handlers ---------------------------------------------------------------

  const handleOpen = (item: Question) => {
    // ?category=… scopes the study page to the question's category; ?focus=… is
    // reserved for a future deep-link refinement and is harmless if ignored.
    navigate(
      `/study?category=${encodeURIComponent(item.category)}&focus=${encodeURIComponent(item.id)}`,
    )
  }

  // --- JSX --------------------------------------------------------------------

  if (dataLoading && !questions) {
    return <PageLoading />
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <span className="text-sm text-muted-foreground tabular-nums">
          {t('count', { count: favorites.length })}
        </span>
      </div>

      {favoriteIds.length === 0 ? (
        <div
          data-testid="favorites-empty"
          className="flex flex-col items-center gap-3 py-16 text-center"
        >
          <StarIcon className="size-8 text-muted-foreground/50" />
          <p className="text-lg font-medium">{t('empty')}</p>
          <p className="max-w-md text-sm text-muted-foreground">{t('emptyMessage')}</p>
          <Button
            variant="outline"
            onClick={() => navigate('/study')}
            data-testid="go-to-study"
          >
            {t('goToStudy')}
          </Button>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                data-testid="favorites-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('searchPlaceholder')}
                aria-label={t('searchPlaceholder')}
                className="h-9 pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <label
                htmlFor="favorites-category-trigger"
                className="text-sm font-medium whitespace-nowrap"
              >
                {t('categoryLabel')}
              </label>
              <Select
                value={categoryFilter}
                onValueChange={(value) =>
                  value && setCategoryFilter(value as CategoryFilter)
                }
              >
                <SelectTrigger
                  id="favorites-category-trigger"
                  data-testid="favorites-category-select"
                  size="sm"
                >
                  <SelectValue>
                    {categoryFilter === 'all'
                      ? t('allCategories')
                      : categoryLabels[categoryFilter]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allCategories')}</SelectItem>
                  {CATEGORY_ORDER.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {categoryLabels[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* List */}
          {filteredFavorites.length === 0 ? (
            <p
              data-testid="favorites-no-match"
              className="py-10 text-center text-sm text-muted-foreground"
            >
              {t('filteredEmpty')}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {filteredFavorites.map((item) => (
                <li key={item.id}>
                  <Card data-testid={`favorite-item-${item.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpen(item)}
                          data-testid={`favorite-open-${item.id}`}
                          className="flex-1 cursor-pointer rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <CardTitle className="text-sm leading-relaxed">
                            {item.questionText[language] ?? item.questionText.de}
                          </CardTitle>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleFavorite(item.id)}
                          data-testid={`favorite-remove-${item.id}`}
                          aria-label={t('remove')}
                          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-yellow-500"
                        >
                          <StarIcon className="size-5 fill-yellow-400 text-yellow-400" />
                        </button>
                      </div>
                      <div>
                        <Badge variant="secondary">
                          {categoryLabels[item.category]}
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
