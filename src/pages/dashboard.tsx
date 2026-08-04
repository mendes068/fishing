import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  Flame,
  Target,
  Trophy,
  BookOpen,
  GraduationCap,
  AlertTriangle,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Progress,
  ProgressTrack,
  ProgressIndicator,
} from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/loading-spinner'
import { syncStoresFromStorage } from '@/lib/cross-tab'
import { CATEGORY_ORDER } from '@/lib/categories'
import { useProgressStore, useExamStore, useDataStore } from '@/store'
import type { QuestionCategory } from '@/types'

declare global {
  interface Window {
    /** Test hook: when true, the dashboard throws so the error boundary is exercised. */
    __THROW_IN_DASHBOARD__?: boolean
  }
}

export default function Dashboard() {
  const { t } = useTranslation('dashboard')
  const { t: tc } = useTranslation('categories')
  const { t: terr } = useTranslation('errors')
  const { t: tCommon } = useTranslation()
  const navigate = useNavigate()

  if (window.__THROW_IN_DASHBOARD__) {
    throw new Error('Test error from dashboard (__THROW_IN_DASHBOARD__)')
  }

  // ── Data store ──────────────────────────────────────────────────────────

  const questions = useDataStore((s) => s.questions)
  const dataLoading = useDataStore((s) => s.loading)
  const dataError = useDataStore((s) => s.error)
  const isLoaded = useDataStore((s) => s.isLoaded)

  // ── Progress store ──────────────────────────────────────────────────────

  const results = useProgressStore((s) => s.results)
  const studyStreak = useProgressStore((s) => s.studyStreak)

  // ── Exam store ──────────────────────────────────────────────────────────

  const history = useExamStore((s) => s.history)

  // ── Bootstrap effects ───────────────────────────────────────────────────

  useEffect(() => {
    return syncStoresFromStorage()
  }, [])

  useEffect(() => {
    if (!useDataStore.getState().isLoaded()) {
      void useDataStore.getState().loadAll()
    }
  }, [])

  // ── Derived values ──────────────────────────────────────────────────────

  const totalQuestions = questions ? Object.keys(questions).length : 300
  const totalStudied = Object.keys(results).length

  const accuracy = useMemo(() => {
    if (totalStudied === 0) return 0
    const correct = Object.values(results).filter((r) => r.correct).length
    return correct / totalStudied
  }, [results, totalStudied])

  const weakCategories = useMemo(() => {
    const totals: Record<QuestionCategory, { correct: number; total: number }> =
      {
        fischkunde_und_hege: { correct: 0, total: 0 },
        pflege_der_fischgewaesser: { correct: 0, total: 0 },
        fanggeraete_und_deren_gebrauch: { correct: 0, total: 0 },
        behandlung_der_gefangenen_fische: { correct: 0, total: 0 },
        einschlaegige_rechtsvorschriften: { correct: 0, total: 0 },
      }
    for (const r of Object.values(results)) {
      const entry = totals[r.category]
      if (!entry) continue
      entry.total += 1
      if (r.correct) entry.correct += 1
    }
    return CATEGORY_ORDER.filter((cat) => totals[cat].total > 0)
      .map((cat) => ({
        category: cat,
        accuracy: totals[cat].correct / totals[cat].total,
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
  }, [results])

  const lastExam = history[0] ?? null
  const weakestCategory = weakCategories.length > 0 ? weakCategories[0].category : null

  // ── Loading state ───────────────────────────────────────────────────────

  if (dataLoading && !isLoaded()) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner className="size-12" />
      </div>
    )
  }

  // ── Error state ─────────────────────────────────────────────────────────

  if (dataError && !isLoaded()) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <AlertTriangle className="size-12 text-destructive" />
        <p className="text-sm text-muted-foreground">
          {terr('generic')}
        </p>
        <Button
          variant="outline"
          onClick={() => {
            void useDataStore.getState().loadAll()
          }}
        >
          {tCommon('reset')}
        </Button>
      </div>
    )
  }

  // ── Empty state (first visit) ────────────────────────────────────────────

  if (totalStudied === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
        <Card data-testid="empty-welcome" className="max-w-md text-center">
          <CardHeader>
            <GraduationCap
              className="mx-auto size-12 text-primary"
              aria-hidden
            />
            <CardTitle>{t('empty.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('empty.message')}
            </p>
            <Button size="lg" className="w-full" onClick={() => navigate('/study')}>
              <BookOpen className="size-4" />
              {t('startStudying')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Main dashboard ──────────────────────────────────────────────────────

  const progressPercent = Math.round((totalStudied / totalQuestions) * 100)

  // Category name lookup (avoids dynamic-key i18next type issues)
  const categoryLabelMap = useMemo(() => {
    const map = {} as Record<QuestionCategory, string>
    map.fischkunde_und_hege = tc('names.fischkunde_und_hege') as string
    map.pflege_der_fischgewaesser = tc('names.pflege_der_fischgewaesser') as string
    map.fanggeraete_und_deren_gebrauch = tc('names.fanggeraete_und_deren_gebrauch') as string
    map.behandlung_der_gefangenen_fische = tc('names.behandlung_der_gefangenen_fische') as string
    map.einschlaegige_rechtsvorschriften = tc('names.einschlaegige_rechtsvorschriften') as string
    return map
  }, [tc])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {t('progress')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold tabular-nums">
              {totalStudied}
              <span className="text-sm font-normal text-muted-foreground">
                {' / '}
                {totalQuestions}
              </span>
            </div>
            <Progress value={progressPercent}>
              <ProgressTrack>
                <ProgressIndicator />
              </ProgressTrack>
            </Progress>
            <p className="text-xs tabular-nums text-muted-foreground">
              {progressPercent}%
            </p>
          </CardContent>
        </Card>

        {/* Accuracy */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {t('accuracy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="size-5 text-primary" aria-hidden />
              <span className="text-2xl font-bold tabular-nums">
                {Math.round(accuracy * 100)}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Streak */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {t('streak')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Flame
                className="size-5 text-orange-500 dark:text-orange-400"
                aria-hidden
              />
              <span className="text-2xl font-bold tabular-nums">
                {studyStreak}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Last exam */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {t('lastExam')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastExam ? (
              <div className="flex flex-wrap items-center gap-2">
                <Trophy className="size-5 text-primary" aria-hidden />
                <span className="text-2xl font-bold tabular-nums">
                  {lastExam.correctAnswers}/{lastExam.totalQuestions}
                </span>
                <Badge
                  variant={lastExam.passed ? 'default' : 'destructive'}
                >
                  {lastExam.passed ? tCommon('yes') : tCommon('no')}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('noExams')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weak categories */}
      {weakCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('weakCategories')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {weakCategories.map(({ category, accuracy: catAccuracy }) => (
              <div key={category} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-sm">
                  {categoryLabelMap[category]}
                </span>
                <div className="flex w-32 shrink-0 items-center gap-2">
                  <Progress
                    value={Math.round(catAccuracy * 100)}
                    className="flex-1"
                  >
                    <ProgressTrack>
                      <ProgressIndicator />
                    </ProgressTrack>
                  </Progress>
                  <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                    {Math.round(catAccuracy * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate('/study')}>
          <BookOpen className="size-4" />
          {t('continueStudying')}
        </Button>
        <Button variant="secondary" onClick={() => navigate('/exam')}>
          <GraduationCap className="size-4" />
          {t('startExam')}
        </Button>
        {weakestCategory && (
          <Button
            variant="outline"
            onClick={() =>
              navigate(`/study?category=${weakestCategory}`)
            }
          >
            <Target className="size-4" />
            {t('reviewWeakAreas')}
          </Button>
        )}
      </div>
    </div>
  )
}
