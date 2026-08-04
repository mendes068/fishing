import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  BookOpen,
  Flame,
  Target,
  TrendingUp,
  BarChart3,
} from 'lucide-react'
import { Radar, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  type ChartData,
  type ChartOptions,
  CategoryScale,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from 'chart.js'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from '@/components/ui/progress'
import { CATEGORY_ORDER, CATEGORY_NAME_KEYS } from '@/lib/categories'
import { useProgressStore } from '@/store'
import type { QuestionCategory, QuestionResult } from '@/types'

// ── Chart.js one-time registration (tree-shaken per chart type) ────────────
ChartJS.register(
  CategoryScale,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  RadialLinearScale,
  Tooltip,
)

// ── Helpers ────────────────────────────────────────────────────────────────

/** Format a Date → 'YYYY-MM-DD'. */
function toDateKey(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

/** Format 'YYYY-MM-DD' → locale-friendly short date (e.g. "4 Aug"). */
function formatDateShort(key: string): string {
  const [y, m, d] = key.split('-')
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/** Return days ago cutoff based on range string. */
function daysAgo(range: '7d' | '30d' | 'all'): number {
  if (range === '7d') return 7
  if (range === '30d') return 30
  return Number.MAX_SAFE_INTEGER
}

// ── Streak Calendar palette (opacity classes via primary) ──────────────────

const INTENSITY_CLASSES = [
  'bg-muted/30 dark:bg-muted/20',
  'bg-primary/15',
  'bg-primary/30',
  'bg-primary/50',
  'bg-primary/70',
  'bg-primary',
] as const

function intensityClass(count: number): string {
  if (count === 0) return INTENSITY_CLASSES[0]
  if (count <= 2) return INTENSITY_CLASSES[1]
  if (count <= 5) return INTENSITY_CLASSES[2]
  if (count <= 9) return INTENSITY_CLASSES[3]
  if (count <= 15) return INTENSITY_CLASSES[4]
  return INTENSITY_CLASSES[5]
}

const DAY_LETTERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

// ── Component ──────────────────────────────────────────────────────────────

export default function Statistics() {
  const { t } = useTranslation('stats')
  const { t: tc } = useTranslation('categories')
  const navigate = useNavigate()

  // ── Store ────────────────────────────────────────────────────────────────

  const results = useProgressStore((s) => s.results)
  const studyDays = useProgressStore((s) => s.studyDays)
  const studyStreak = useProgressStore((s) => s.studyStreak)

  // ── Time range ───────────────────────────────────────────────────────────

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d')

  // ── Derived: summary stats ───────────────────────────────────────────────

  const totalStudied = useProgressStore((s) => s.getTotalStudied)()
  const totalQuestionsReviewed = useMemo(() => {
    let sum = 0
    for (const v of Object.values(studyDays)) sum += v
    return sum
  }, [studyDays])

  const overallAccuracy = useMemo(() => {
    if (totalStudied === 0) return 0
    const correct = Object.values(results).filter((r) => r.correct).length
    return correct / totalStudied
  }, [results, totalStudied])

  // ── Derived: category accuracy (for radar) ───────────────────────────────

  const categoryAccuracyData = useMemo(() => {
    const map: Record<QuestionCategory, number> = {
      fischkunde_und_hege: 0,
      pflege_der_fischgewaesser: 0,
      fanggeraete_und_deren_gebrauch: 0,
      behandlung_der_gefangenen_fische: 0,
      einschlaegige_rechtsvorschriften: 0,
    }
    for (const cat of CATEGORY_ORDER) {
      const catResults = Object.values(results).filter(
        (r) => r.category === cat,
      )
      if (catResults.length === 0) {
        map[cat] = 0
      } else {
        const correct = catResults.filter((r) => r.correct).length
        map[cat] = Math.round((correct / catResults.length) * 100)
      }
    }
    return map
  }, [results])

  const categoryLabelMap = useMemo(() => {
    const map = {} as Record<QuestionCategory, string>
    map.fischkunde_und_hege = tc(
      CATEGORY_NAME_KEYS.fischkunde_und_hege,
    ) as string
    map.pflege_der_fischgewaesser = tc(
      CATEGORY_NAME_KEYS.pflege_der_fischgewaesser,
    ) as string
    map.fanggeraete_und_deren_gebrauch = tc(
      CATEGORY_NAME_KEYS.fanggeraete_und_deren_gebrauch,
    ) as string
    map.behandlung_der_gefangenen_fische = tc(
      CATEGORY_NAME_KEYS.behandlung_der_gefangenen_fische,
    ) as string
    map.einschlaegige_rechtsvorschriften = tc(
      CATEGORY_NAME_KEYS.einschlaegige_rechtsvorschriften,
    ) as string
    return map
  }, [tc])

  // ── Derived: accuracy over time (line chart) ─────────────────────────────

  const { dailyAccuracyLabels, dailyAccuracyValues } = useMemo(() => {
    const resultsArr = Object.values(results) as QuestionResult[]
    if (resultsArr.length === 0) return { dailyAccuracyLabels: [], dailyAccuracyValues: [] }

    const cutoff = daysAgo(timeRange)
    const now = new Date()

    // Group by day
    const byDay: Record<string, { correct: number; total: number }> = {}
    for (const r of resultsArr) {
      const date = new Date(r.answeredAt)
      const diffDays = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
      )
      if (diffDays > cutoff) continue
      const key = toDateKey(date)
      if (!byDay[key]) byDay[key] = { correct: 0, total: 0 }
      byDay[key].total += 1
      if (r.correct) byDay[key].correct += 1
    }

    // Sort dates
    const sorted = Object.keys(byDay).sort()
    const labels = sorted.map(formatDateShort)
    const values = sorted.map((k) =>
      Math.round((byDay[k].correct / byDay[k].total) * 100),
    )

    return { dailyAccuracyLabels: labels, dailyAccuracyValues: values }
  }, [results, timeRange])

  // ── Derived: streak calendar data ────────────────────────────────────────

  const calendarWeeks = useMemo(() => {
    const cutoff = daysAgo(timeRange)
    const totalDays = cutoff === Number.MAX_SAFE_INTEGER ? 84 : cutoff
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Collect day data
    interface DayCell {
      dateKey: string
      count: number
      dayOfWeek: number // 0=Mon … 6=Sun
    }

    const cells: DayCell[] = []
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = toDateKey(d)
      // Map JS getDay() (0=Sun) to Mon-first (0=Mon)
      const dow = (d.getDay() + 6) % 7
      cells.push({ dateKey: key, count: studyDays[key] ?? 0, dayOfWeek: dow })
    }

    // Arrange into weeks (columns)
    const weeks: DayCell[][] = []
    const firstDay = cells[0]?.dayOfWeek ?? 0

    // Pad start so the first column starts on Mon
    if (firstDay > 0) {
      for (let p = 0; p < firstDay; p++) {
        if (weeks.length === 0) weeks.push([])
        weeks[0].push({ dateKey: '', count: -1, dayOfWeek: p })
      }
    }

    for (const cell of cells) {
      if (weeks.length === 0 || weeks[weeks.length - 1].length === 7) {
        weeks.push([])
      }
      weeks[weeks.length - 1].push(cell)
    }

    // Pad end: last week may be incomplete
    const last = weeks[weeks.length - 1]
    if (last && last.length < 7) {
      const lastDow = last[last.length - 1].dayOfWeek
      for (let p = lastDow + 1; p < 7; p++) {
        last.push({ dateKey: '', count: -1, dayOfWeek: p })
      }
    }

    // Month labels: collect first-of-month positions
    const monthLabels: Record<number, string> = {}
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ] as const

    for (let col = 0; col < weeks.length; col++) {
      const week = weeks[col]
      for (const cell of week) {
        if (cell.count < 0 || !cell.dateKey) continue
        const m = Number(cell.dateKey.split('-')[1]) - 1
        if (!(col in monthLabels)) {
          monthLabels[col] = monthNames[m]
        }
        break
      }
    }

    return { weeks, monthLabels }
  }, [studyDays, timeRange])

  // ── Chart configs ────────────────────────────────────────────────────────

  const radarData: ChartData<'radar'> = useMemo(
    () => ({
      labels: CATEGORY_ORDER.map((cat) => categoryLabelMap[cat]),
      datasets: [
        {
          label: t('accuracyLabel'),
          data: CATEGORY_ORDER.map((cat) => categoryAccuracyData[cat]),
          backgroundColor: 'rgba(59,130,246,0.2)',
          borderColor: 'rgba(59,130,246,1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(59,130,246,1)',
          pointBorderColor: '#fff',
          pointHoverRadius: 5,
        },
      ],
    }),
    [categoryLabelMap, categoryAccuracyData, t],
  )

  const radarOptions: ChartOptions<'radar'> = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
          backdropColor: 'transparent',
        },
        grid: {
          color: 'rgba(128,128,128,0.15)',
        },
        angleLines: {
          color: 'rgba(128,128,128,0.15)',
        },
        pointLabels: {
          font: { size: 11 },
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.raw}%`,
        },
      },
    },
  }

  const lineData: ChartData<'line'> = useMemo(
    () => ({
      labels: dailyAccuracyLabels,
      datasets: [
        {
          label: t('accuracyLabel'),
          data: dailyAccuracyValues,
          borderColor: 'rgba(59,130,246,1)',
          backgroundColor: 'rgba(59,130,246,0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    }),
    [dailyAccuracyLabels, dailyAccuracyValues, t],
  )

  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxTicksLimit: 7, font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
          callback: (v) => `${v}%`,
        },
        grid: {
          color: 'rgba(128,128,128,0.15)',
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.parsed.y}%`,
        },
      },
    },
  }

  // ── Screen-reader text summaries for the canvas charts ───────────────────

  const radarSummary = useMemo(
    () =>
      CATEGORY_ORDER.map(
        (cat) => `${categoryLabelMap[cat]}: ${categoryAccuracyData[cat]}%`,
      ).join(', '),
    [categoryLabelMap, categoryAccuracyData],
  )

  const lineSummary = useMemo(
    () =>
      dailyAccuracyLabels
        .map((label, i) => `${label}: ${dailyAccuracyValues[i]}%`)
        .join(', '),
    [dailyAccuracyLabels, dailyAccuracyValues],
  )

  // ── Empty state ──────────────────────────────────────────────────────────

  if (totalStudied === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
        <Card data-testid="stats-empty" className="max-w-md text-center">
          <CardHeader>
            <BarChart3
              className="mx-auto size-12 text-muted-foreground"
              aria-hidden
            />
            <CardTitle>{t('empty')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription className="text-sm">
              {t('emptyMessage')}
            </CardDescription>
            <Button
              size="lg"
              className="w-full"
              onClick={() => navigate('/study')}
            >
              <BookOpen className="size-4" />
              {t('goToStudy')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        </div>
        <div data-testid="time-range">
          <Select
            value={timeRange}
            onValueChange={(v) =>
              setTimeRange(v as '7d' | '30d' | 'all')
            }
          >
            <SelectTrigger size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">{t('last7Days')}</SelectItem>
              <SelectItem value="30d">{t('last30Days')}</SelectItem>
              <SelectItem value="all">{t('allTime')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Summary stats cards ─────────────────────────────────────────── */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total studied */}
        <Card size="sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {t('totalStudied')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BookOpen className="size-5 text-primary" aria-hidden />
              <span className="text-2xl font-bold tabular-nums">
                {totalStudied}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Overall accuracy */}
        <Card size="sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {t('overallAccuracy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="size-5 text-primary" aria-hidden />
              <span className="text-2xl font-bold tabular-nums">
                {Math.round(overallAccuracy * 100)}%
              </span>
            </div>
            <Progress value={Math.round(overallAccuracy * 100)} className="mt-2">
              <ProgressTrack>
                <ProgressIndicator />
              </ProgressTrack>
            </Progress>
          </CardContent>
        </Card>

        {/* Study streak */}
        <Card size="sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {t('currentStreak')}
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

        {/* Questions reviewed */}
        <Card size="sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {t('questionsReviewed')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="size-5 text-primary" aria-hidden />
              <span className="text-2xl font-bold tabular-nums">
                {totalQuestionsReviewed}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts row ──────────────────────────────────────────────────── */}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Performance Radar */}
        <Card>
          <CardHeader>
            <CardTitle>{t('categoryPerformance')}</CardTitle>
          </CardHeader>
          <CardContent data-testid="chart-radar" className="flex justify-center">
            <div className="w-full max-w-sm">
              <div role="img" aria-label={t('chartRadarLabel')}>
                <Radar data={radarData} options={radarOptions} />
              </div>
              <p className="sr-only">{radarSummary}</p>
            </div>
          </CardContent>
        </Card>

        {/* Accuracy Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>{t('accuracyOverTime')}</CardTitle>
          </CardHeader>
          <CardContent data-testid="chart-line">
            {dailyAccuracyLabels.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                {t('noData')}
              </div>
            ) : (
              <div role="img" aria-label={t('chartLineLabel')}>
                <Line data={lineData} options={lineOptions} />
              </div>
            )}
            {dailyAccuracyLabels.length > 0 && (
              <p className="sr-only">{lineSummary}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Streak Calendar ─────────────────────────────────────────────── */}

      <Card>
        <CardHeader>
          <CardTitle>{t('streakCalendar')}</CardTitle>
        </CardHeader>
        <CardContent data-testid="streak-calendar">
          <div className="overflow-x-auto">
            {/* Month labels */}
            {Object.keys(calendarWeeks.monthLabels).length > 0 && (
              <div
                className="mb-1 ml-8 flex text-xs font-medium text-muted-foreground"
                style={{ gap: '3px' }}
              >
                {Array.from({ length: calendarWeeks.weeks.length }).map(
                  (_, col) => (
                    <div
                      key={col}
                      className="w-[14px] flex-shrink-0 text-center"
                    >
                      {calendarWeeks.monthLabels[col] ?? ''}
                    </div>
                  ),
                )}
              </div>
            )}

            {/* Grid: rows = weekdays, cols = weeks */}
            <div className="flex" style={{ gap: '3px' }}>
              {/* Day labels (left) */}
              <div className="flex flex-col pr-2" style={{ gap: '3px' }}>
                {DAY_LETTERS.map((day, i) => (
                  <div
                    key={day}
                    className="flex h-[14px] w-8 items-center text-[10px] leading-none text-muted-foreground"
                  >
                    {i % 2 === 0 ? day : ''}
                  </div>
                ))}
              </div>

              {/* Week columns */}
              {calendarWeeks.weeks.map((week, col) => (
                <div
                  key={col}
                  className="flex flex-col"
                  style={{ gap: '3px' }}
                >
                  {week.map((cell, row) => (
                    <div
                      key={`${col}-${row}`}
                      className={`h-[14px] w-[14px] rounded-sm ${
                        cell.count < 0
                          ? 'bg-transparent'
                          : intensityClass(cell.count)
                      }`}
                      role={cell.dateKey ? 'img' : undefined}
                      aria-label={
                        cell.dateKey
                          ? `${cell.dateKey}: ${cell.count} ${t('questionsReviewed').toLowerCase()}`
                          : undefined
                      }
                      title={
                        cell.dateKey
                          ? `${cell.dateKey}: ${cell.count} ${t('questionsReviewed').toLowerCase()}`
                          : ''
                      }
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-3 flex items-center justify-end gap-1">
              <span className="mr-1 text-[10px] text-muted-foreground">
                Less
              </span>
              {INTENSITY_CLASSES.map((cls, i) => (
                <div
                  key={i}
                  className={`h-[10px] w-[10px] rounded-sm ${cls}`}
                />
              ))}
              <span className="ml-1 text-[10px] text-muted-foreground">
                More
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
