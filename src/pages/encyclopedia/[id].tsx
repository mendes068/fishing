import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Fish, ShieldCheck } from 'lucide-react'

import { useDataStore } from '@/store/data.store'
import { useSettingsStore } from '@/store/settings.store'
import type { Language } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/loading-spinner'

/** Pick the active-language value with a safe fallback chain. */
function pick(loc: Record<Language, string>, lang: Language): string {
  return loc[lang] || loc.de || loc.en || loc['pt-BR'] || ''
}

/** Format a MM-DD season string for display. */
function formatSeasonDate(dateStr: string): string {
  const [month, day] = dateStr.split('-')
  return `${day}.${month}.`
}

export default function EncyclopediaDetail() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation('encyclopedia')
  const { t: tCategories } = useTranslation('categories')
  const navigate = useNavigate()
  const language = useSettingsStore((s) => s.language)

  const fishRecord = useDataStore((s) => s.fish)
  const questions = useDataStore((s) => s.questions)
  const dataLoading = useDataStore((s) => s.loading)
  const isLoaded = useDataStore((s) => s.isLoaded)
  const loadAll = useDataStore((s) => s.loadAll)

  // --- Data loading on mount ---
  useEffect(() => {
    if (!isLoaded()) {
      void loadAll()
    }
  }, [isLoaded, loadAll])

  // --- Look up species ---
  const species = id && fishRecord ? fishRecord[id] ?? null : null

  // --- Related questions ---
  const relatedQuestions = useMemo(() => {
    if (!questions || !id) return []
    return Object.values(questions)
      .filter((q) => q.fishRefs.includes(id))
      .slice(0, 10)
  }, [questions, id])

  const categoryLabelMap = useMemo(() => {
    const map = {} as Record<string, string>
    map.fischkunde_und_hege = tCategories('names.fischkunde_und_hege')
    map.pflege_der_fischgewaesser = tCategories('names.pflege_der_fischgewaesser')
    map.fanggeraete_und_deren_gebrauch = tCategories('names.fanggeraete_und_deren_gebrauch')
    map.behandlung_der_gefangenen_fische = tCategories('names.behandlung_der_gefangenen_fische')
    map.einschlaegige_rechtsvorschriften = tCategories('names.einschlaegige_rechtsvorschriften')
    return map
  }, [tCategories])

  // --- Loading state ---
  if (dataLoading && !fishRecord) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingSpinner className="size-8" />
      </div>
    )
  }

  // --- Not found ---
  if (!species) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-16 text-center">
        <Fish className="size-12 text-muted-foreground/40" />
        <p className="text-lg text-muted-foreground">{t('notFound')}</p>
        <Button variant="outline" onClick={() => navigate('/encyclopedia')}>
          {t('back')}
        </Button>
      </div>
    )
  }

  return (
    <div
      data-testid="fish-detail"
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6"
    >
      {/* --- Back button --- */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/encyclopedia')}
        className="w-fit gap-2"
      >
        <ArrowLeft className="size-4" />
        {t('back')}
      </Button>

      {/* --- Header --- */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold italic tracking-tight">
            {species.scientificName}
          </h1>
          {species.protectedStatus && (
            <Badge variant="default" className="gap-1">
              <ShieldCheck className="size-3" />
              {t('protected')}
            </Badge>
          )}
        </div>
        <p className="text-lg text-muted-foreground">
          {pick(species.commonNames, language)}
        </p>
      </div>

      {/* --- Info cards --- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Common names */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('commonNames')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">DE</span>
              <span>{species.commonNames.de}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">EN</span>
              <span>{species.commonNames.en}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">PT-BR</span>
              <span>{species.commonNames['pt-BR']}</span>
            </div>
          </CardContent>
        </Card>

        {/* Habitat */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('habitat')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">
              {pick(species.habitat, language)}
            </p>
          </CardContent>
        </Card>

        {/* Max size & Min catch size */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('maxSize')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {species.maxSize} {t('sizeUnit')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('minCatchSize')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {species.minCatchSize !== null
                ? `${species.minCatchSize} ${t('sizeUnit')}`
                : t('noMinSize')}
            </p>
          </CardContent>
        </Card>

        {/* Closed season */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('closedSeason')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {species.closedSeason
                ? t('seasonFormat', {
                    start: formatSeasonDate(species.closedSeason.start),
                    end: formatSeasonDate(species.closedSeason.end),
                  })
                : t('noClosedSeason')}
            </p>
          </CardContent>
        </Card>

        {/* Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('category')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {species.category === 'bbgfischo' ? t('protected') : t('common')}
            </p>
          </CardContent>
        </Card>

        {/* Distinguishing features */}
        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {t('distinguishingFeatures')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">
              {pick(species.distinguishingFeatures, language)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* --- Related questions --- */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {t('relatedQuestions')}
        </h2>
        {relatedQuestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noRelatedQuestions')}</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {relatedQuestions.map((q) => (
              <Card
                key={q.id}
                role="button"
                tabIndex={0}
                onClick={() =>
                  navigate(`/study?category=${encodeURIComponent(q.category)}`)
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    navigate(`/study?category=${encodeURIComponent(q.category)}`)
                  }
                }}
                className="cursor-pointer transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <CardHeader>
                  <CardTitle className="text-sm leading-snug">
                    {pick(q.questionText, language)}
                  </CardTitle>
                  <div className="text-xs text-muted-foreground">
                    {categoryLabelMap[q.category] ?? q.category}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
