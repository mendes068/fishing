import { describe, expect, it } from 'vitest'
import {
  EXPORT_SECTIONS,
  buildExportData,
  exportFilename,
  hasAnyData,
  sectionHasData,
  serializeExport,
  type ExportOptions,
  type ExportState,
} from '@/lib/exporter'
import type { ExamHistoryEntry, FlashcardState, QuestionResult } from '@/types'

const ALL_OPTIONS: ExportOptions = {
  notes: true,
  favorites: true,
  statistics: true,
  progress: true,
  examHistory: true,
  flashcards: true,
  settings: true,
}

const NONE_OPTIONS: ExportOptions = {
  notes: false,
  favorites: false,
  statistics: false,
  progress: false,
  examHistory: false,
  flashcards: false,
  settings: false,
}

function makeResult(overrides: Partial<QuestionResult> = {}): QuestionResult {
  return {
    questionId: 'q-1',
    answeredAt: 1_700_000_000_000,
    correct: true,
    answerIndex: 0,
    category: 'fischkunde_und_hege',
    ...overrides,
  }
}

function makeHistoryEntry(overrides: Partial<ExamHistoryEntry> = {}): ExamHistoryEntry {
  return {
    id: 'e-1',
    date: 1_700_000_000_000,
    totalQuestions: 60,
    correctAnswers: 50,
    passed: true,
    perCategory: {
      fischkunde_und_hege: { correct: 10, total: 12 },
      pflege_der_fischgewaesser: { correct: 10, total: 12 },
      fanggeraete_und_deren_gebrauch: { correct: 10, total: 12 },
      behandlung_der_gefangenen_fische: { correct: 10, total: 12 },
      einschlaegige_rechtsvorschriften: { correct: 10, total: 12 },
    },
    durationSeconds: 3600,
    ...overrides,
  }
}

function makeFlashcard(overrides: Partial<FlashcardState> = {}): FlashcardState {
  return {
    repetitions: 1,
    easeFactor: 2.6,
    interval: 6,
    nextReviewAt: 1_700_000_000_000,
    lastReviewedAt: 1_700_000_000_000,
    lapses: 0,
    ...overrides,
  }
}

/** A full snapshot with data in every section. */
function fullState(): ExportState {
  return {
    notes: { 'q-1': '# Note' },
    favoriteIds: ['q-1', 'q-2'],
    results: {
      'q-1': makeResult(),
      'q-2': makeResult({ questionId: 'q-2', correct: false, category: 'pflege_der_fischgewaesser' }),
    },
    studyDays: { '2026-08-04': 5 },
    studyStreak: 2,
    lastStudyDate: '2026-08-04',
    history: [makeHistoryEntry()],
    cards: { 'q-1': makeFlashcard() },
    reviewedToday: 1,
    lastReviewDate: '2026-08-04',
    theme: 'system',
    language: 'de',
    dailyReviewCap: 50,
  }
}

/** An empty snapshot (defaults, no user data anywhere). */
function emptyState(): ExportState {
  return {
    notes: {},
    favoriteIds: [],
    results: {},
    studyDays: {},
    studyStreak: 0,
    lastStudyDate: null,
    history: [],
    cards: {},
    reviewedToday: 0,
    lastReviewDate: null,
    theme: 'system',
    language: 'de',
    dailyReviewCap: 50,
  }
}

describe('buildExportData', () => {
  it('includes only the notes section when only notes are selected', () => {
    const data = buildExportData(fullState(), {
      ...NONE_OPTIONS,
      notes: true,
    })
    expect(data.notes).toEqual({ notes: fullState().notes })
    expect(data).not.toHaveProperty('favorites')
    expect(data).not.toHaveProperty('statistics')
    expect(data).not.toHaveProperty('progress')
    expect(data).not.toHaveProperty('examHistory')
    expect(data).not.toHaveProperty('flashcards')
    expect(data).not.toHaveProperty('settings')
  })

  it('includes every section when all are selected', () => {
    const state = fullState()
    const data = buildExportData(state, ALL_OPTIONS)
    expect(data).toHaveProperty('notes')
    expect(data).toHaveProperty('favorites')
    expect(data).toHaveProperty('statistics')
    expect(data).toHaveProperty('progress')
    expect(data).toHaveProperty('examHistory')
    expect(data).toHaveProperty('flashcards')
    expect(data).toHaveProperty('settings')
    expect(data.favorites).toEqual({ favorites: ['q-1', 'q-2'] })
    expect(data.examHistory).toEqual({ examHistory: state.history })
    expect(data.flashcards).toEqual({
      flashcards: {
        cards: state.cards,
        reviewedToday: 1,
        lastReviewDate: '2026-08-04',
      },
    })
  })

  it('computes statistics from the progress snapshot', () => {
    const data = buildExportData(fullState(), {
      ...NONE_OPTIONS,
      statistics: true,
    })
    const stats = data.statistics as {
      totalStudied: number
      accuracy: number
      studyStreak: number
      categoryPerformance: Record<string, number>
    }
    expect(stats.totalStudied).toBe(2)
    expect(stats.accuracy).toBe(0.5)
    expect(stats.studyStreak).toBe(2)
    expect(stats.categoryPerformance.fischkunde_und_hege).toBe(1)
    expect(stats.categoryPerformance.pflege_der_fischgewaesser).toBe(0)
  })

  it('always carries the metadata header', () => {
    const data = buildExportData(emptyState(), NONE_OPTIONS)
    expect(data.app).toBe('fishing-license-study')
    expect(data.version).toBe(1)
    expect(typeof data.exportedAt).toBe('string')
    expect(Number.isNaN(Date.parse(data.exportedAt as string))).toBe(false)
  })

  it('exports only the selected sub-keys of progress', () => {
    const data = buildExportData(fullState(), {
      ...NONE_OPTIONS,
      progress: true,
    })
    const progress = data.progress as Record<string, unknown>
    expect(progress.results).toBeDefined()
    expect(progress.studyDays).toEqual({ '2026-08-04': 5 })
    expect(progress.studyStreak).toBe(2)
    expect(progress.lastStudyDate).toBe('2026-08-04')
  })

  it('round-trips through JSON.parse without loss for a partial selection', () => {
    const state = fullState()
    const data = buildExportData(state, {
      ...NONE_OPTIONS,
      notes: true,
      favorites: true,
      examHistory: true,
    })
    const parsed = JSON.parse(serializeExport(data)) as Record<string, unknown>
    expect(parsed.notes).toEqual({ notes: state.notes })
    expect(parsed.favorites).toEqual({ favorites: state.favoriteIds })
    expect(parsed.examHistory).toEqual({ examHistory: state.history })
    expect(parsed).not.toHaveProperty('progress')
  })
})

describe('serializeExport', () => {
  it('produces valid JSON with 2-space indentation', () => {
    const json = serializeExport({ a: 1, b: [1, 2] })
    expect(JSON.parse(json)).toEqual({ a: 1, b: [1, 2] })
    expect(json).toContain('\n  "a"')
  })
})

describe('exportFilename', () => {
  it('builds a timestamped filename', () => {
    const date = new Date(2026, 7, 4) // 2026-08-04 local
    expect(exportFilename(date)).toBe('fishing-study-export-2026-08-04.json')
  })

  it('zero-pads month and day', () => {
    const date = new Date(2026, 0, 9) // 2026-01-09 local
    expect(exportFilename(date)).toBe('fishing-study-export-2026-01-09.json')
  })
})

describe('sectionHasData', () => {
  it('detects which sections have data', () => {
    const state = fullState()
    expect(sectionHasData(state, 'notes')).toBe(true)
    expect(sectionHasData(state, 'favorites')).toBe(true)
    expect(sectionHasData(state, 'statistics')).toBe(true)
    expect(sectionHasData(state, 'progress')).toBe(true)
    expect(sectionHasData(state, 'examHistory')).toBe(true)
    expect(sectionHasData(state, 'flashcards')).toBe(true)
    expect(sectionHasData(state, 'settings')).toBe(true)
  })

  it('detects empty sections', () => {
    const state = emptyState()
    expect(sectionHasData(state, 'notes')).toBe(false)
    expect(sectionHasData(state, 'favorites')).toBe(false)
    expect(sectionHasData(state, 'statistics')).toBe(false)
    expect(sectionHasData(state, 'progress')).toBe(false)
    expect(sectionHasData(state, 'examHistory')).toBe(false)
    expect(sectionHasData(state, 'flashcards')).toBe(false)
    // Settings always carry defaults, so they are never "empty".
    expect(sectionHasData(state, 'settings')).toBe(true)
  })
})

describe('hasAnyData', () => {
  it('is false when nothing is selected', () => {
    expect(hasAnyData(fullState(), NONE_OPTIONS)).toBe(false)
  })

  it('is true when a selected section has data', () => {
    expect(
      hasAnyData(fullState(), { ...NONE_OPTIONS, notes: true }),
    ).toBe(true)
  })

  it('is false when the only selected sections are empty', () => {
    expect(
      hasAnyData(emptyState(), { ...NONE_OPTIONS, favorites: true }),
    ).toBe(false)
  })

  it('is true for settings-only selection even on an otherwise empty store', () => {
    expect(
      hasAnyData(emptyState(), { ...NONE_OPTIONS, settings: true }),
    ).toBe(true)
  })
})

describe('EXPORT_SECTIONS', () => {
  it('lists all seven sections', () => {
    expect(EXPORT_SECTIONS).toEqual([
      'notes',
      'favorites',
      'statistics',
      'progress',
      'examHistory',
      'flashcards',
      'settings',
    ])
  })
})
