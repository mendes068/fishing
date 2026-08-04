import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DownloadIcon, FileJsonIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  EXPORT_SECTIONS,
  buildExportData,
  downloadExport,
  exportFilename,
  hasAnyData,
  serializeExport,
  type ExportOptions,
  type ExportSectionKey,
  type ExportState,
} from '@/lib/exporter'
import {
  useExamStore,
  useFavoritesStore,
  useFlashcardStore,
  useNotesStore,
  useProgressStore,
  useSettingsStore,
} from '@/store'

/** i18n key for each exportable section (drives the checkbox labels). */
const SECTION_KEYS = {
  notes: 'section.notes',
  favorites: 'section.favorites',
  statistics: 'section.statistics',
  progress: 'section.progress',
  examHistory: 'section.examHistory',
  flashcards: 'section.flashcards',
  settings: 'section.settings',
} as const satisfies Record<ExportSectionKey, string>

const EMPTY_SELECTION: ExportOptions = {
  notes: false,
  favorites: false,
  statistics: false,
  progress: false,
  examHistory: false,
  flashcards: false,
  settings: false,
}

export default function Settings() {
  const { t } = useTranslation('settings')
  const { t: te } = useTranslation('export')

  // --- Store snapshots (the data available for export) -----------------------

  const notes = useNotesStore((s) => s.notes)
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds)
  const results = useProgressStore((s) => s.results)
  const studyDays = useProgressStore((s) => s.studyDays)
  const studyStreak = useProgressStore((s) => s.studyStreak)
  const lastStudyDate = useProgressStore((s) => s.lastStudyDate)
  const history = useExamStore((s) => s.history)
  const cards = useFlashcardStore((s) => s.cards)
  const reviewedToday = useFlashcardStore((s) => s.reviewedToday)
  const lastReviewDate = useFlashcardStore((s) => s.lastReviewDate)
  const theme = useSettingsStore((s) => s.theme)
  const language = useSettingsStore((s) => s.language)
  const dailyReviewCap = useSettingsStore((s) => s.dailyReviewCap)

  const state: ExportState = useMemo(
    () => ({
      notes,
      favoriteIds,
      results,
      studyDays,
      studyStreak,
      lastStudyDate,
      history,
      cards,
      reviewedToday,
      lastReviewDate,
      theme,
      language,
      dailyReviewCap,
    }),
    [
      notes,
      favoriteIds,
      results,
      studyDays,
      studyStreak,
      lastStudyDate,
      history,
      cards,
      reviewedToday,
      lastReviewDate,
      theme,
      language,
      dailyReviewCap,
    ],
  )

  // Per-section data counts, shown next to each checkbox label.
  const sectionCounts = useMemo(
    () => ({
      notes: Object.keys(notes).length,
      favorites: favoriteIds.length,
      statistics: Object.keys(results).length,
      progress: Object.keys(results).length,
      examHistory: history.length,
      flashcards: Object.keys(cards).length,
      settings: null,
    }),
    [notes, favoriteIds, results, history, cards],
  )

  // --- Export selection -------------------------------------------------------

  const [selection, setSelection] = useState<ExportOptions>(EMPTY_SELECTION)
  const [status, setStatus] = useState<'idle' | 'done'>('idle')

  const allSelected = EXPORT_SECTIONS.every((s) => selection[s])
  const canExport = hasAnyData(state, selection)

  const toggleSection = (section: ExportSectionKey) => {
    setSelection((prev) => ({ ...prev, [section]: !prev[section] }))
    setStatus('idle')
  }

  const toggleAll = () => {
    if (allSelected) {
      setSelection({ ...EMPTY_SELECTION })
    } else {
      setSelection({
        notes: true,
        favorites: true,
        statistics: true,
        progress: true,
        examHistory: true,
        flashcards: true,
        settings: true,
      })
    }
    setStatus('idle')
  }

  const handleExport = () => {
    const data = buildExportData(state, selection)
    downloadExport(exportFilename(), serializeExport(data))
    setStatus('done')
    window.setTimeout(() => setStatus('idle'), 2500)
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>

      {/* ── Current settings (read-only for now) ─────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">
              {t('themeLabel')}
            </p>
            <p className="mt-1 font-medium">{theme}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">
              {t('languageLabel')}
            </p>
            <p className="mt-1 font-medium">{language}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">
              {t('dailyReviewCapLabel')}
            </p>
            <p className="mt-1 font-medium tabular-nums">{dailyReviewCap}</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Export section ───────────────────────────────────────────────── */}
      <Card data-testid="export-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJsonIcon className="size-4" aria-hidden />
            {te('title')}
          </CardTitle>
          <CardDescription>{te('description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Select all */}
          <label
            data-testid="export-select-all"
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted/50"
          >
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="size-4 shrink-0 accent-primary"
            />
            {te('exportAll')}
          </label>

          <Separator />

          {/* Per-section checkboxes */}
          <div className="grid gap-2 sm:grid-cols-2">
            {EXPORT_SECTIONS.map((section) => {
              const count = sectionCounts[section]
              return (
                <label
                  key={section}
                  data-testid={`export-option-${section}`}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={selection[section]}
                    onChange={() => toggleSection(section)}
                    className="size-4 shrink-0 accent-primary"
                  />
                  <span>{te(SECTION_KEYS[section])}</span>
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                    {count === null ? '' : count}
                  </span>
                </label>
              )
            })}
          </div>

          {/* Empty state */}
          {!canExport && (
            <p
              data-testid="export-no-data"
              className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
            >
              {te('noData')}
            </p>
          )}

          {/* Filename preview */}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-dashed border-border px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              {te('filename')}
            </span>
            <code
              data-testid="export-filename"
              className="text-xs text-foreground break-all"
            >
              {exportFilename()}
            </code>
          </div>

          <Button
            data-testid="export-button"
            onClick={handleExport}
            disabled={!canExport}
            className="w-full sm:w-auto"
          >
            <DownloadIcon aria-hidden />
            {status === 'done' ? te('done') : te('export')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
