import type {
  ExamHistoryEntry,
  FlashcardState,
  Language,
  QuestionCategory,
  QuestionResult,
} from '@/types'
import type { Theme } from '@/store/settings.store'
import { CATEGORY_ORDER } from '@/lib/categories'

/**
 * User-data JSON export (pairs with the JSON import page for roundtrips).
 *
 * Only *user* data is exported here — the question bank is never included
 * (that is what the import page handles). The export is a pure function of a
 * state snapshot + options, so it can be unit-tested without a DOM or stores.
 */

/** Which sections the user wants in the export. */
export interface ExportOptions {
  notes: boolean
  favorites: boolean
  statistics: boolean
  progress: boolean
  examHistory: boolean
  flashcards: boolean
  settings: boolean
}

/** Ordered list of every exportable section (drives checkboxes + iteration). */
export const EXPORT_SECTIONS = [
  'notes',
  'favorites',
  'statistics',
  'progress',
  'examHistory',
  'flashcards',
  'settings',
] as const

export type ExportSectionKey = (typeof EXPORT_SECTIONS)[number]

/** Flat snapshot of the stores that can be exported. */
export interface ExportState {
  notes: Record<string, string>
  favoriteIds: string[]
  results: Record<string, QuestionResult>
  studyDays: Record<string, number>
  studyStreak: number
  lastStudyDate: string | null
  history: ExamHistoryEntry[]
  cards: Record<string, FlashcardState>
  reviewedToday: number
  lastReviewDate: string | null
  theme: Theme
  language: Language
  dailyReviewCap: number
}

export interface ExportStatistics {
  totalStudied: number
  /** Correct / answered, 0..1 (0 when nothing studied). */
  accuracy: number
  studyStreak: number
  /** Per-category accuracy as a 0..1 fraction (0 when a category is untouched). */
  categoryPerformance: Record<QuestionCategory, number>
}

/** True when the given section currently holds any user data. */
export function sectionHasData(state: ExportState, section: ExportSectionKey): boolean {
  switch (section) {
    case 'notes':
      return Object.keys(state.notes).length > 0
    case 'favorites':
      return state.favoriteIds.length > 0
    case 'statistics':
    case 'progress':
      return Object.keys(state.results).length > 0
    case 'examHistory':
      return state.history.length > 0
    case 'flashcards':
      return Object.keys(state.cards).length > 0
    case 'settings':
      // Settings always carry defaults (theme/language/cap) — never "empty".
      return true
  }
}

/** True when at least one *selected* section actually has data to export. */
export function hasAnyData(state: ExportState, options: ExportOptions): boolean {
  return EXPORT_SECTIONS.some((s) => options[s] && sectionHasData(state, s))
}

function buildStatistics(state: ExportState): ExportStatistics {
  const results = Object.values(state.results)
  const totalStudied = results.length
  const correct = results.filter((r) => r.correct).length
  const accuracy = totalStudied === 0 ? 0 : correct / totalStudied

  const categoryPerformance = {} as Record<QuestionCategory, number>
  for (const category of CATEGORY_ORDER) {
    const inCategory = results.filter((r) => r.category === category)
    categoryPerformance[category] =
      inCategory.length === 0
        ? 0
        : inCategory.filter((r) => r.correct).length / inCategory.length
  }

  return { totalStudied, accuracy, studyStreak: state.studyStreak, categoryPerformance }
}

/**
 * Build the export payload from a store snapshot. Only the sections selected
 * in `options` are included; a metadata header is always present.
 */
export function buildExportData(
  state: ExportState,
  options: ExportOptions,
): Record<string, unknown> {
  const data: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    app: 'fishing-license-study',
    version: 1,
  }

  if (options.notes) {
    data.notes = { notes: state.notes }
  }
  if (options.favorites) {
    data.favorites = { favorites: state.favoriteIds }
  }
  if (options.statistics) {
    data.statistics = buildStatistics(state)
  }
  if (options.progress) {
    data.progress = {
      results: state.results,
      studyDays: state.studyDays,
      studyStreak: state.studyStreak,
      lastStudyDate: state.lastStudyDate,
    }
  }
  if (options.examHistory) {
    data.examHistory = { examHistory: state.history }
  }
  if (options.flashcards) {
    data.flashcards = {
      flashcards: {
        cards: state.cards,
        reviewedToday: state.reviewedToday,
        lastReviewDate: state.lastReviewDate,
      },
    }
  }
  if (options.settings) {
    data.settings = {
      settings: {
        theme: state.theme,
        language: state.language,
        dailyReviewCap: state.dailyReviewCap,
      },
    }
  }

  return data
}

/** Pretty-print the export payload as indented JSON. */
export function serializeExport(data: unknown): string {
  return JSON.stringify(data, null, 2)
}

/** Timestamped export filename, e.g. `fishing-study-export-2026-08-04.json`. */
export function exportFilename(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `fishing-study-export-${y}-${m}-${d}.json`
}

/**
 * Trigger a client-side download of `content` under `filename`. No-op when
 * there is no DOM (SSR / tests in a node environment).
 */
export function downloadExport(filename: string, content: string): void {
  if (typeof document === 'undefined') return
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
