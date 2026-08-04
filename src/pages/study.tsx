import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StarIcon, StickyNote } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { NoteEditor } from '@/components/notes/note-editor'
import { PageLoading } from '@/components/loading-spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { CATEGORY_ORDER } from '@/lib/categories'
import { useDataStore } from '@/store/data.store'
import { useFavoritesStore } from '@/store/favorites.store'
import { useNotesStore } from '@/store/notes.store'
import { useProgressStore } from '@/store/progress.store'
import { useQuestionStore } from '@/store/question.store'
import { useSettingsStore } from '@/store/settings.store'
import { mnemonicProvider, questionExplanationProvider } from '@/lib/ai'
import type { Language, QuestionCategory } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fisher-Yates shuffle returning a new array. */
function fisherYatesShuffle<T>(arr: readonly T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

type ExtendedMode = 'sequential' | 'random' | 'favorites' | 'incorrect'

const MODE_VALUES: ExtendedMode[] = [
  'sequential',
  'random',
  'favorites',
  'incorrect',
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Study() {
  const { t } = useTranslation('study')
  const { t: tc } = useTranslation('categories')
  const { t: tCommon } = useTranslation()
  const { t: tAi } = useTranslation('ai')

  // --- Data store ----------------------------------------------------------
  const allQuestions = useDataStore((s) => s.questions)
  const dataLoading = useDataStore((s) => s.loading)
  const loadAll = useDataStore((s) => s.loadAll)
  const isLoaded = useDataStore((s) => s.isLoaded)

  // --- Question store ------------------------------------------------------
  const storeQuestions = useQuestionStore((s) => s.questions)
  const order = useQuestionStore((s) => s.order)
  const currentIndex = useQuestionStore((s) => s.currentIndex)
  const setQuestions = useQuestionStore((s) => s.setQuestions)
  const setOrder = useQuestionStore((s) => s.setOrder)
  const next = useQuestionStore((s) => s.next)
  const prev = useQuestionStore((s) => s.prev)
  const markAnswered = useQuestionStore((s) => s.markAnswered)

  // --- Progress, favorites, notes -------------------------------------------
  const recordAnswer = useProgressStore((s) => s.recordAnswer)
  const results = useProgressStore((s) => s.results)
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds)
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite)
  const isFavorite = useFavoritesStore((s) => s.isFavorite)
  const getNote = useNotesStore((s) => s.getNote)

  // --- Settings ------------------------------------------------------------
  const language = useSettingsStore((s) => s.language)

  // --- Local UI state ------------------------------------------------------
  const [extendedMode, setExtendedMode] = useState<ExtendedMode>('sequential')
  const [categoryFilter, setCategoryFilter] = useState<QuestionCategory | 'all'>('all')
  /** Shuffled display order of answers [0,1,2] → map(displayIndex → originalIndex). */
  const [answerOrder, setAnswerOrder] = useState<number[] | null>(null)
  /** Which display index the user clicked (null = not yet answered). */
  const [selectedDisplayIndex, setSelectedDisplayIndex] = useState<number | null>(null)
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [compareLanguage, setCompareLanguage] = useState<Language | null>(null)

  // --- Data loading ---------------------------------------------------------
  useEffect(() => {
    if (!isLoaded()) {
      void loadAll()
    }
  }, [isLoaded, loadAll])

  // --- Derive filtered / ordered question list -----------------------------
  const derivedOrder = useMemo(() => {
    if (!allQuestions) return []
    let ids = Object.keys(allQuestions)

    // Category filter
    if (categoryFilter !== 'all') {
      ids = ids.filter((id) => allQuestions[id]?.category === categoryFilter)
    }

    // Mode filter + ordering
    switch (extendedMode) {
      case 'favorites':
        ids = ids.filter((id) => favoriteIds.includes(id))
        break
      case 'incorrect':
        ids = ids.filter((id) => results[id]?.correct === false)
        break
      case 'random':
        ids = fisherYatesShuffle(ids)
        break
      case 'sequential':
        // natural object-key order
        break
    }

    return ids
  }, [allQuestions, categoryFilter, extendedMode, favoriteIds, results])

  // --- Sync derived order into the question store --------------------------
  useEffect(() => {
    if (allQuestions) {
      setQuestions(allQuestions)
    }
    setOrder(derivedOrder)
  }, [allQuestions, derivedOrder, setQuestions, setOrder])

  // --- Current question (reactive) -----------------------------------------
  const currentId: string | null = order[currentIndex] ?? null
  const currentQuestion =
    currentId && storeQuestions[currentId] ? storeQuestions[currentId] : null

  // --- Reset answer state when question changes ----------------------------
  const prevQuestionIdRef = useState<string | null>(null)
  const [, setPrevQuestionId] = prevQuestionIdRef

  useEffect(() => {
    if (currentQuestion && currentQuestion.id !== prevQuestionIdRef[0]) {
      setPrevQuestionId(currentQuestion.id)
      setAnswerOrder(fisherYatesShuffle([0, 1, 2]))
      setSelectedDisplayIndex(null)
    }
  }, [currentQuestion?.id])

  // --- Handlers -------------------------------------------------------------

  const handleAnswerClick = useCallback(
    (displayIndex: number) => {
      if (!currentQuestion || answerOrder === null || selectedDisplayIndex !== null) return

      setSelectedDisplayIndex(displayIndex)

      const originalChosenIndex = answerOrder[displayIndex]
      const isCorrect = originalChosenIndex === currentQuestion.correctAnswerIndex

      recordAnswer(currentQuestion.id, isCorrect, displayIndex, currentQuestion.category)
      markAnswered(currentQuestion.id)
    },
    [currentQuestion, answerOrder, selectedDisplayIndex, recordAnswer, markAnswered],
  )

  const handleModeChange = useCallback(
    (value: string | null) => {
      if (value) setExtendedMode(value as ExtendedMode)
    },
    [],
  )

  const handleCategoryChange = useCallback((value: string | null) => {
    if (value) setCategoryFilter(value as QuestionCategory | 'all')
  }, [])

  const handleCompareChange = useCallback((value: string | null) => {
    setCompareLanguage(value === 'off' ? null : (value as Language))
  }, [])

  const handleResetFilters = useCallback(() => {
    setExtendedMode('sequential')
    setCategoryFilter('all')
  }, [])

  const handleToggleFavorite = useCallback(() => {
    if (currentId) toggleFavorite(currentId)
  }, [currentId, toggleFavorite])

  const handleOpenNote = useCallback(() => {
    if (currentId) setNoteDialogOpen(true)
  }, [currentId])

  // --- Derived UI values ---------------------------------------------------

  const total = derivedOrder.length
  const displayNumber = total > 0 ? currentIndex + 1 : 0
  const hasPrev = total > 0
  const hasNext = total > 0
  const favoriteActive = currentId ? isFavorite(currentId) : false
  const hasNote = currentId ? (getNote(currentId).trim().length > 0) : false

  const getAnswerClass = (displayIndex: number): string => {
    if (selectedDisplayIndex === null || answerOrder === null) {
      // Not yet answered: neutral card style
      return 'cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors'
    }

    const originalIndex = answerOrder[displayIndex]
    const isCorrectAnswer = originalIndex === (currentQuestion?.correctAnswerIndex ?? -1)
    const wasSelected = displayIndex === selectedDisplayIndex

    if (isCorrectAnswer) {
      return 'border-green-500 bg-green-50 dark:bg-green-950 dark:border-green-600'
    }
    if (wasSelected && !isCorrectAnswer) {
      return 'border-red-500 bg-red-50 dark:bg-red-950 dark:border-red-600'
    }
    // Other unselected answers when answered: dimmed
    return 'opacity-50'
  }

  // --- Category name lookup (avoids dynamic-key i18next type issues) -------
  const categoryLabelMap = useMemo(() => {
    const map = { all: t('allCategories') } as Record<QuestionCategory | 'all', string>
    map.fischkunde_und_hege = tc('names.fischkunde_und_hege')
    map.pflege_der_fischgewaesser = tc('names.pflege_der_fischgewaesser')
    map.fanggeraete_und_deren_gebrauch = tc('names.fanggeraete_und_deren_gebrauch')
    map.behandlung_der_gefangenen_fische = tc('names.behandlung_der_gefangenen_fische')
    map.einschlaegige_rechtsvorschriften = tc('names.einschlaegige_rechtsvorschriften')
    return map
  }, [t, tc])

  // --- JSX -----------------------------------------------------------------

  // Loading skeleton
  if (dataLoading && !allQuestions) {
    return <PageLoading />
  }

  // Error / no data
  if (!allQuestions) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    )
  }

  // Empty state
  if (derivedOrder.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-16 text-center">
        <p className="text-lg text-muted-foreground">{t('noQuestions')}</p>
        <Button variant="outline" onClick={handleResetFilters} data-testid="reset-filters">
          {t('resetFilters')}
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      {/* --- Header: mode + category selectors --- */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Mode selector */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="mode-select-trigger"
            className="text-sm font-medium whitespace-nowrap"
          >
            {t('modeLabel')}
          </label>
          <Select value={extendedMode} onValueChange={handleModeChange}>
            <SelectTrigger id="mode-select-trigger" data-testid="mode-select" size="sm">
              <SelectValue>
                {extendedMode === 'sequential'
                  ? t('sequential')
                  : extendedMode === 'random'
                    ? t('random')
                    : extendedMode === 'favorites'
                      ? t('favoritesOnly')
                      : t('incorrectOnly')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {MODE_VALUES.map((m) => (
                <SelectItem key={m} value={m}>
                  {m === 'sequential'
                    ? t('sequential')
                    : m === 'random'
                      ? t('random')
                      : m === 'favorites'
                        ? t('favoritesOnly')
                        : t('incorrectOnly')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category selector */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="category-select-trigger"
            className="text-sm font-medium whitespace-nowrap"
          >
            {t('categoryLabel')}
          </label>
          <Select value={categoryFilter} onValueChange={handleCategoryChange}>
            <SelectTrigger id="category-select-trigger" data-testid="category-select" size="sm">
              <SelectValue>
                {categoryLabelMap[categoryFilter]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allCategories')}</SelectItem>
              {CATEGORY_ORDER.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {categoryLabelMap[cat]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Compare language selector */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="compare-select-trigger"
            className="text-sm font-medium whitespace-nowrap"
          >
            {t('compareLabel')}
          </label>
          <Select
            value={compareLanguage ?? 'off'}
            onValueChange={handleCompareChange}
          >
            <SelectTrigger id="compare-select-trigger" data-testid="compare-select" size="sm">
              <SelectValue>
                {compareLanguage === null
                  ? t('compareOff')
                  : compareLanguage === 'de'
                    ? 'Deutsch'
                    : compareLanguage === 'en'
                      ? 'English'
                      : 'Português'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">{t('compareOff')}</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="pt-BR">Português</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* --- Question card --- */}
      {currentQuestion && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-lg leading-relaxed">
                <div>
                  {currentQuestion.questionText[language] ??
                    currentQuestion.questionText.de}
                </div>
                {compareLanguage && (
                  <div className="mt-1 text-sm font-normal text-muted-foreground">
                    {currentQuestion.questionText[compareLanguage] ??
                      currentQuestion.questionText.de}
                  </div>
                )}
              </CardTitle>
              {/* Note toggle */}
              <button
                type="button"
                onClick={handleOpenNote}
                data-testid="note-toggle"
                className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-blue-500 transition-colors"
                aria-label={t('noteAdd')}
              >
                <StickyNote
                  className={cn(
                    'size-5',
                    hasNote && 'fill-blue-400 text-blue-400',
                  )}
                />
              </button>
              {/* Favorite toggle */}
              <button
                type="button"
                onClick={handleToggleFavorite}
                data-testid="favorite-toggle"
                className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-yellow-500 transition-colors"
                aria-label={favoriteActive ? t('favoriteRemove') : t('favoriteAdd')}
              >
                <StarIcon
                  className={cn(
                    'size-5',
                    favoriteActive && 'fill-yellow-400 text-yellow-400',
                  )}
                />
              </button>
            </div>
            <CardDescription>
              {t('questionCounter', { current: displayNumber, total })}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-3">
            {answerOrder?.map((_originalIdx, displayIdx) => {
              const originalIdx = answerOrder[displayIdx]
              const answerText =
                currentQuestion.answers[originalIdx]?.text[language] ??
                currentQuestion.answers[originalIdx]?.text.de ??
                ''

              return (
                <button
                  key={`${currentQuestion.id}-${displayIdx}`}
                  type="button"
                  data-testid={`answer-${displayIdx}`}
                  disabled={selectedDisplayIndex !== null}
                  onClick={() => handleAnswerClick(displayIdx)}
                  className={cn(
                    'w-full rounded-lg border p-4 text-left text-sm transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    getAnswerClass(displayIdx),
                  )}
                >
                  <span className="font-medium">
                    {String.fromCharCode(65 + displayIdx)}.
                  </span>{' '}
                  {answerText}
                  {compareLanguage && (
                    <p className="mt-0.5 border-t border-dashed pt-1 text-xs text-muted-foreground">
                      {currentQuestion.answers[originalIdx]?.text[
                        compareLanguage
                      ] ?? currentQuestion.answers[originalIdx]?.text.de ?? ''}
                    </p>
                  )}
                </button>
              )
            })}
          </CardContent>

          {/* Explanation (shown after answer) */}
          {selectedDisplayIndex !== null && answerOrder !== null && (
            <CardFooter
              aria-live="polite"
              className="flex-col items-start gap-2"
            >
              <p className="text-sm font-semibold">
                {answerOrder[selectedDisplayIndex] ===
                currentQuestion.correctAnswerIndex
                  ? t('correct')
                  : t('incorrect')}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t('explanation')}: </span>
                {questionExplanationProvider.explain(
                  currentQuestion,
                  selectedDisplayIndex,
                  language,
                )}
              </p>
              {compareLanguage && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">{t('explanation')}: </span>
                  {currentQuestion.explanation[compareLanguage] ??
                    currentQuestion.explanation.de}
                </p>
              )}
              <p className="text-xs text-muted-foreground" data-testid="mnemonic">
                <span className="font-medium">{tAi('mnemonicLabel')}: </span>
                {mnemonicProvider.generateMnemonic(currentQuestion, language)}
              </p>
            </CardFooter>
          )}
        </Card>
      )}

      {/* --- Navigation --- */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={prev}
          disabled={!hasPrev}
          data-testid="prev-question"
        >
          {tCommon('previous')}
        </Button>

        <span className="text-sm text-muted-foreground tabular-nums">
          {t('questionCounter', { current: displayNumber, total })}
        </span>

        <Button
          variant="outline"
          onClick={next}
          disabled={!hasNext}
          data-testid="next-question"
        >
          {tCommon('next')}
        </Button>
      </div>

      {/* Note editor dialog */}
      {currentId && (
        <NoteEditor
          questionId={currentId}
          open={noteDialogOpen}
          onOpenChange={setNoteDialogOpen}
        />
      )}
    </div>
  )
}
