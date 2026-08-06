import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useDataStore,
  useExamStore,
  useFavoritesStore,
  useFlashcardStore,
  useNotesStore,
  useProgressStore,
  useQuestionStore,
  useSettingsStore,
} from '../index'
import type { Question } from '@/types'

const q = (id: string, category: Question['category']): Question => ({
  id,
  category,
  questionText: { de: '?', en: '?', 'pt-BR': '?' },
  answers: [
    { text: { de: 'a', en: 'a', 'pt-BR': 'a' } },
    { text: { de: 'b', en: 'b', 'pt-BR': 'b' } },
    { text: { de: 'c', en: 'c', 'pt-BR': 'c' } },
  ],
  correctAnswerIndex: 0,
  explanation: { de: 'x', en: 'x', 'pt-BR': 'x' },
  tags: [],
  fishRefs: [],
})

describe('store persistence smoke test', () => {
  beforeEach(() => {
    localStorage.clear()
    // Rehydrate each store from the (now empty) storage.
    for (const s of [
      useSettingsStore,
      useQuestionStore,
      useExamStore,
      useProgressStore,
      useFavoritesStore,
      useNotesStore,
      useFlashcardStore,
    ]) {
      void s.persist.rehydrate()
    }
  })

  it('all 8 stores exist and instantiate', () => {
    expect(useSettingsStore.getState().dailyReviewCap).toBe(50)
    expect(useQuestionStore.getState().order).toEqual([])
    expect(useExamStore.getState().currentExam).toBeNull()
    expect(useProgressStore.getState().studyStreak).toBe(0)
    expect(useFavoritesStore.getState().favoriteIds).toEqual([])
    expect(useNotesStore.getState().notes).toEqual({})
    expect(useFlashcardStore.getState().cards).toEqual({})
    expect(useDataStore.getState().isLoaded()).toBe(false)
  })

  it('settings persists theme/language/cap', () => {
    useSettingsStore.getState().setTheme('dark')
    useSettingsStore.getState().setLanguage('pt-BR')
    useSettingsStore.getState().setDailyReviewCap(30)
    const raw = localStorage.getItem('fishing-settings')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.state.theme).toBe('dark')
    expect(parsed.state.language).toBe('pt-BR')
    expect(parsed.state.dailyReviewCap).toBe(30)
  })

  it('question store persists ONLY UI state, never questions/order', () => {
    const questions: Record<string, Question> = { q1: q('q1', 'fischkunde_und_hege') }
    useQuestionStore.getState().setQuestions(questions)
    useQuestionStore.getState().setOrder(['q1'])
    useQuestionStore.getState().setMode('random')
    useQuestionStore.getState().setCategoryFilter('pflege_der_fischgewaesser')
    useQuestionStore.getState().markAnswered('q1')
    useQuestionStore.getState().next()

    const raw = localStorage.getItem('fishing-question')
    const parsed = JSON.parse(raw!)
    expect(parsed.state.mode).toBe('random')
    expect(parsed.state.categoryFilter).toBe('pflege_der_fischgewaesser')
    expect(parsed.state.currentIndex).toBeUndefined()
    expect(parsed.state.questions).toBeUndefined()
    expect(parsed.state.order).toBeUndefined()
    expect(parsed.state.answeredIds).toBeUndefined()
  })

  it('exam store persists currentExam + history and computes pass', () => {
    const questions = Array.from({ length: 60 }, (_, i) =>
      q(`q${i}`, 'fischkunde_und_hege'),
    )
    useExamStore.getState().startExam(questions)
    // Answer all 60 correctly.
    for (const question of questions) {
      useExamStore.getState().answerQuestion(question.id, 0)
    }
    const entry = useExamStore.getState().submitExam()
    expect(entry).not.toBeNull()
    expect(entry!.passed).toBe(true)
    expect(entry!.correctAnswers).toBe(60)
    expect(entry!.perCategory.fischkunde_und_hege.correct).toBe(60)
    expect(useExamStore.getState().currentExam).toBeNull()

    const raw = localStorage.getItem('fishing-exam')
    const parsed = JSON.parse(raw!)
    expect(parsed.state.history).toHaveLength(1)
    expect(parsed.state.history[0].passed).toBe(true)

    // Fail case: only 20 correct → 45/60 threshold not met.
    useExamStore.getState().startExam(questions)
    for (let i = 0; i < 60; i++) {
      useExamStore.getState().answerQuestion(`q${i}`, i % 2 === 0 ? 1 : 2)
    }
    const failed = useExamStore.getState().submitExam()
    expect(failed!.passed).toBe(false)
  })

  it('progress store tracks streak + accuracy', () => {
    const p = useProgressStore.getState()
    p.recordAnswer('a', true, 0, 'fischkunde_und_hege')
    expect(useProgressStore.getState().studyStreak).toBe(1)
    expect(useProgressStore.getState().getAccuracy()).toBe(1)
    useProgressStore.getState().recordAnswer('b', false, 1, 'fischkunde_und_hege')
    expect(useProgressStore.getState().getAccuracy()).toBe(0.5)
    expect(useProgressStore.getState().getTotalStudied()).toBe(2)
    const raw = JSON.parse(localStorage.getItem('fishing-progress')!)
    expect(raw.state.studyStreak).toBe(1)
  })

  it('favorites/notes/flashcard persist', () => {
    useFavoritesStore.getState().toggleFavorite('x')
    expect(useFavoritesStore.getState().isFavorite('x')).toBe(true)
    expect(JSON.parse(localStorage.getItem('fishing-favorites')!).state.favoriteIds).toEqual(['x'])

    useNotesStore.getState().setNote('x', '# heading')
    expect(useNotesStore.getState().getNote('x')).toBe('# heading')
    expect(JSON.parse(localStorage.getItem('fishing-notes')!).state.notes.x).toBe('# heading')

    useFlashcardStore.getState().initializeCards(['c1', 'c2'])
    useFlashcardStore.getState().updateCard('c1', {
      repetitions: 2,
      easeFactor: 2.5,
      interval: 3,
      nextReviewAt: Date.now() - 1,
      lastReviewedAt: Date.now() - 1000,
      lapses: 0,
    })
    expect(useFlashcardStore.getState().getDueCards(10)).toContain('c1')
    useFlashcardStore.getState().markReviewedToday()
    expect(useFlashcardStore.getState().reviewedToday).toBe(1)
    const raw = JSON.parse(localStorage.getItem('fishing-flashcard')!)
    expect(raw.state.reviewedToday).toBe(1)
  })

  it('data store is NOT persisted', () => {
    useDataStore.getState().loadQuestions().catch(() => {
      // fetch fails in jsdom — error state set, must not throw
    })
    expect(localStorage.getItem('fishing-data')).toBeNull()
  })

  it('state survives a simulated refresh (fresh module import)', async () => {
    useSettingsStore.getState().setTheme('light')
    useSettingsStore.getState().setDailyReviewCap(70)

    // Simulate a page reload: fresh module instances rehydrate from storage.
    vi.resetModules()
    const { useSettingsStore: freshStore } = await import('../index')
    expect(freshStore.getState().theme).toBe('light')
    expect(freshStore.getState().dailyReviewCap).toBe(70)
  })
})
