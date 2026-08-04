import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PageLoading } from '@/components/loading-spinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CATEGORY_NAME_KEYS } from '@/lib/categories'
import { sm2 } from '@/lib/sm2'
import { useDataStore } from '@/store/data.store'
import { useFlashcardStore } from '@/store/flashcard.store'
import { useSettingsStore } from '@/store/settings.store'
import type { Question } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const QUALITY_LABEL_KEYS = ['blackout', 'wrong', 'almost', 'hard', 'good', 'easy'] as const

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Flashcards() {
  const { t } = useTranslation('flashcards')
  const { t: tc } = useTranslation('categories')

  // --- Data store ----------------------------------------------------------
  const questions = useDataStore((s) => s.questions)
  const dataLoading = useDataStore((s) => s.loading)
  const loadAll = useDataStore((s) => s.loadAll)
  const isLoaded = useDataStore((s) => s.isLoaded)

  // --- Settings ------------------------------------------------------------
  const language = useSettingsStore((s) => s.language)
  const dailyCap = useSettingsStore((s) => s.dailyReviewCap)

  // --- Flashcard store -----------------------------------------------------
  const cards = useFlashcardStore((s) => s.cards)
  const initializeCards = useFlashcardStore((s) => s.initializeCards)
  const getDueCards = useFlashcardStore((s) => s.getDueCards)
  const updateCard = useFlashcardStore((s) => s.updateCard)
  const markReviewedToday = useFlashcardStore((s) => s.markReviewedToday)
  const getStats = useFlashcardStore((s) => s.getStats)
  const reviewedToday = useFlashcardStore((s) => s.reviewedToday)

  // --- Local UI state ------------------------------------------------------
  const [initialized, setInitialized] = useState(false)
  const [reviewQueue, setReviewQueue] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const cardsCount = Object.keys(cards).length

  // --- Data loading ---------------------------------------------------------
  useEffect(() => {
    if (!isLoaded()) {
      void loadAll()
    }
  }, [isLoaded, loadAll])

  // --- Initialize cards when questions load ---------------------------------
  useEffect(() => {
    if (questions && !initialized && cardsCount === 0) {
      initializeCards(Object.keys(questions))
    }
  }, [questions, initialized, cardsCount, initializeCards])

  // --- Build review queue after cards are populated -------------------------
  useEffect(() => {
    if (cardsCount > 0 && !initialized) {
      setReviewQueue(getDueCards(dailyCap))
      setCurrentIndex(0)
      setFlipped(false)
      setInitialized(true)
    }
  }, [cardsCount, initialized, dailyCap, getDueCards])

  // --- Derived values ------------------------------------------------------

  const currentId = reviewQueue[currentIndex] ?? null
  const currentQuestion: Question | null =
    currentId && questions ? (questions[currentId] ?? null) : null

  const stats = useMemo(() => getStats(), [cards, reviewedToday, getStats])

  /** Number of due cards beyond the daily cap. */
  const moreDueCount = Math.max(0, stats.due - dailyCap)

  /** Minimum future nextReviewAt across all cards (for "Next review" label). */
  const nextReviewDate = useMemo(() => {
    const now = Date.now()
    let earliest: number | null = null
    for (const card of Object.values(cards)) {
      if (card.nextReviewAt > now && (earliest === null || card.nextReviewAt < earliest)) {
        earliest = card.nextReviewAt
      }
    }
    return earliest !== null ? new Date(earliest) : null
  }, [cards])

  /** Category display name for the current question. */
  const categoryLabel = useMemo(() => {
    if (!currentQuestion) return ''
    const key = CATEGORY_NAME_KEYS[currentQuestion.category as keyof typeof CATEGORY_NAME_KEYS]
    return key ? tc(key) : currentQuestion.category
  }, [currentQuestion, tc])

  /** Progress percentage through the daily queue. */
  const progressPercent = useMemo(() => {
    const total = reviewQueue.length
    if (total === 0) return 0
    return Math.round((Math.min(currentIndex, total) / total) * 100)
  }, [reviewQueue.length, currentIndex])

  // --- Handlers -------------------------------------------------------------

  const handleFlip = useCallback(() => {
    setFlipped((v) => !v)
  }, [])

  const handleRate = useCallback(
    (quality: number) => {
      const id = reviewQueue[currentIndex]
      if (id === undefined) return
      const card = cards[id]
      if (!card || !currentQuestion) return

      const result = sm2({
        quality,
        repetitions: card.repetitions,
        easeFactor: card.easeFactor,
        interval: card.interval,
      })

      updateCard(id, {
        repetitions: result.repetitions,
        easeFactor: result.easeFactor,
        interval: result.interval,
        nextReviewAt: result.nextReviewDate.getTime(),
        lastReviewedAt: Date.now(),
        lapses: quality < 3 ? card.lapses + 1 : card.lapses,
      })

      markReviewedToday()
      setFlipped(false)
      setCurrentIndex((i) => i + 1)
    },
    [reviewQueue, currentIndex, cards, currentQuestion, updateCard, markReviewedToday],
  )

  // --- Keyboard shortcuts ---------------------------------------------------
  const handleFlipRef = useRef(handleFlip)
  handleFlipRef.current = handleFlip

  const handleRateRef = useRef(handleRate)
  handleRateRef.current = handleRate

  const flippedRef = useRef(flipped)
  flippedRef.current = flipped

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return
      }

      if (e.key === ' ') {
        e.preventDefault()
        handleFlipRef.current()
        return
      }

      if (flippedRef.current) {
        const num = Number(e.key)
        if (!isNaN(num) && num >= 0 && num <= 5) {
          e.preventDefault()
          handleRateRef.current(num)
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // --- Loading --------------------------------------------------------------
  if (dataLoading && !questions) {
    return <PageLoading />
  }

  // --- Empty: no cards at all -----------------------------------------------
  if (initialized && stats.total === 0) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-muted-foreground">{t('noCards')}</p>
      </div>
    )
  }

  // --- Empty / waiting for init ---------------------------------------------
  if (!initialized) {
    return <PageLoading />
  }

  // --- All caught up (queue empty or exhausted) -----------------------------
  if (currentIndex >= reviewQueue.length) {
    const showMoreDue = stats.due > 0
    const wasEmptyQueue = reviewQueue.length === 0

    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-16 text-center">
        <div className="text-4xl" data-testid="all-caught-up">
          {wasEmptyQueue ? '\u{1F389}' : '\u2705'}
        </div>
        <h2 className="text-xl font-semibold">{t('allCaughtUp')}</h2>
        {stats.reviewedToday > 0 && (
          <p className="text-muted-foreground">
            {t('reviewedToday', { count: stats.reviewedToday })}
          </p>
        )}
        {showMoreDue && (
          <p className="text-muted-foreground">
            {t('moreDue', { count: stats.due })}
          </p>
        )}
        {nextReviewDate && (
          <p className="text-muted-foreground">
            {t('nextReview', { date: formatDate(nextReviewDate) })}
          </p>
        )}
      </div>
    )
  }

  // --- Active review --------------------------------------------------------
  const correctAnswerText =
    currentQuestion?.answers[currentQuestion.correctAnswerIndex]?.text[language] ??
    currentQuestion?.answers[currentQuestion.correctAnswerIndex]?.text.de ??
    ''

  const explanationText =
    currentQuestion?.explanation[language] ?? currentQuestion?.explanation.de ?? ''

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      {/* --- Top stats bar --- */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>{t('reviewedToday', { count: stats.reviewedToday })}</span>
        <span>
          {t('questionCount', { current: currentIndex + 1, total: reviewQueue.length })}
        </span>
        <span>{t('totalCards', { count: stats.total })}</span>
      </div>

      {/* --- Progress bar --- */}
      <div className="flex items-center gap-2">
        <Progress value={progressPercent} className="flex-1" />
        <span className="text-xs tabular-nums text-muted-foreground">
          {progressPercent}%
        </span>
      </div>

      {/* --- Due alert --- */}
      {moreDueCount > 0 && (
        <p className="text-center text-sm text-amber-600 dark:text-amber-400">
          {t('moreDue', { count: moreDueCount })}
        </p>
      )}

      {/* --- Flashcard --- */}
      <div
        className="cursor-pointer select-none"
        onClick={handleFlip}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            handleFlip()
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={flipped ? t('back') : t('front')}
      >
        <Card className="min-h-[320px] transition-all duration-300">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-lg leading-relaxed">
                {currentQuestion?.questionText[language] ??
                  currentQuestion?.questionText.de}
              </CardTitle>
            </div>
            {categoryLabel && (
              <CardDescription>
                <Badge variant="secondary">{categoryLabel}</Badge>
              </CardDescription>
            )}
          </CardHeader>

          {!flipped ? (
            /* --- Front: question only --- */
            <CardContent
              data-testid="flashcard-front"
              className="flex flex-1 items-center justify-center py-10"
            >
              <p className="text-center text-sm text-muted-foreground">
                {t('flipHint')}
              </p>
            </CardContent>
          ) : (
            /* --- Back: answer + explanation --- */
            <CardContent data-testid="flashcard-back" className="flex flex-col gap-4">
              <div className="rounded-lg border border-green-500 bg-green-50 p-4 dark:border-green-600 dark:bg-green-950">
                <p className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-300">
                  {t('answer')}
                </p>
                <p className="mt-1 text-sm">{correctAnswerText}</p>
              </div>

              {explanationText && (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('explanationLabel')}
                  </p>
                  <p className="mt-1 text-sm">{explanationText}</p>
                </div>
              )}
            </CardContent>
          )}

          {/* --- Quality rating (only visible after flip) --- */}
          {flipped && (
            <CardFooter className="flex-col items-stretch gap-2">
              <p className="text-center text-xs text-muted-foreground">
                {t('qualityHint')}
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {[0, 1, 2, 3, 4, 5].map((q) => (
                  <Button
                    key={q}
                    size="xs"
                    variant={q >= 3 ? 'default' : 'outline'}
                    data-testid={`quality-${q}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRate(q)
                    }}
                    className="min-w-[3rem]"
                  >
                    <span className="font-mono text-xs">{q}</span>
                    <span className="ml-1 hidden sm:inline">
                      {t(QUALITY_LABEL_KEYS[q])}
                    </span>
                  </Button>
                ))}
              </div>
            </CardFooter>
          )}
        </Card>
      </div>

      {/* --- Keyboard hint --- */}
      <p className="text-center text-xs text-muted-foreground">
        {flipped
          ? t('qualityHint')
          : t('flipHint')}
      </p>

      {/* --- Bottom stats: next review --- */}
      {nextReviewDate && (
        <p className="text-center text-xs text-muted-foreground">
          {t('nextReview', { date: formatDate(nextReviewDate) })}
        </p>
      )}
    </div>
  )
}
