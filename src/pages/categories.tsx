import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Fish, Droplets, Wrench, Utensils, Scale } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { QuestionCategory } from '@/types'
import { CATEGORY_ORDER } from '@/lib/categories'
import { useDataStore } from '@/store/data.store'
import { useProgressStore } from '@/store/progress.store'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const CATEGORY_ICONS: Record<QuestionCategory, LucideIcon> = {
  fischkunde_und_hege: Fish,
  pflege_der_fischgewaesser: Droplets,
  fanggeraete_und_deren_gebrauch: Wrench,
  behandlung_der_gefangenen_fische: Utensils,
  einschlaegige_rechtsvorschriften: Scale,
}

interface CategoryStats {
  total: number
  answered: number
  correct: number
  accuracy: number
  progress: number
}

export default function Categories() {
  const { t } = useTranslation('categories')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const questions = useDataStore((s) => s.questions)
  const loading = useDataStore((s) => s.loading)
  const isLoaded = useDataStore((s) => s.isLoaded)
  const loadAll = useDataStore((s) => s.loadAll)
  const results = useProgressStore((s) => s.results)
  const totalStudied = useProgressStore((s) => Object.keys(s.results).length)

  useEffect(() => {
    if (!isLoaded()) void loadAll()
  }, [isLoaded, loadAll])

  const statsByCategory = useMemo(() => {
    const map = new Map<QuestionCategory, CategoryStats>()
    for (const cat of CATEGORY_ORDER) {
      const catQuestions = questions
        ? Object.values(questions).filter((q) => q.category === cat)
        : []
      const total = catQuestions.length
      const answeredIds = Object.keys(results).filter(
        (id) => results[id].category === cat,
      )
      const answered = answeredIds.length
      const correct = answeredIds.filter((id) => results[id].correct).length
      map.set(cat, {
        total,
        answered,
        correct,
        accuracy: answered > 0 ? correct / answered : 0,
        progress: total > 0 ? (answered / total) * 100 : 0,
      })
    }
    return map
  }, [questions, results])

  if (loading && !questions) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">{tc('loading')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('title')}
        </h1>
        {totalStudied === 0 ? (
          <p className="mt-1 text-muted-foreground">{t('noProgress')}</p>
        ) : (
          <p className="mt-1 text-muted-foreground">
            {t('answeredLabel')}: {totalStudied}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {CATEGORY_ORDER.map((category) => {
          const stats = statsByCategory.get(category)!
          const Icon = CATEGORY_ICONS[category]

          return (
            <Card key={category}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="size-5 text-primary" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <CardTitle>{t(`names.${category}`)}</CardTitle>
                    <CardDescription>{t(`descriptions.${category}`)}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground tabular-nums">
                      {t('answeredOf', {
                        answered: stats.answered,
                        total: stats.total,
                      })}
                    </span>
                    {stats.answered > 0 ? (
                      <Badge variant="secondary">
                        {t('accuracy')}:{' '}
                        {Math.round(stats.accuracy * 100)}%
                      </Badge>
                    ) : null}
                  </div>
                  <Progress value={stats.progress} />
                  {stats.total > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {t('questionsTotal', { count: stats.total })}
                      {stats.answered > 0 && (
                        <>
                          {' — '}
                          {t('correctLabel')}: {stats.correct}/{stats.answered}
                        </>
                      )}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t('noQuestions')}
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => navigate(`/study?category=${category}`)}
                >
                  {t('studyCategory')}
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
