import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Question, QuestionCategory } from '@/types'

export type StudyMode = 'sequential' | 'random'

export interface QuestionState {
  /** Loaded question bank keyed by question id (NOT persisted — comes from JSON via data store). */
  questions: Record<string, Question>
  /** Ordered question ids driving the current study session (NOT persisted). */
  order: string[]
  currentIndex: number
  mode: StudyMode
  categoryFilter: QuestionCategory | 'all'
  answeredIds: string[]
  setQuestions: (questions: Record<string, Question>) => void
  setOrder: (order: string[]) => void
  shuffle: () => void
  next: () => void
  prev: () => void
  setMode: (mode: StudyMode) => void
  setCategoryFilter: (category: QuestionCategory | 'all') => void
  markAnswered: (questionId: string) => void
  getCurrent: () => Question | null
}

export const useQuestionStore = create<QuestionState>()(
  persist(
    (set, get) => ({
      questions: {},
      order: [],
      currentIndex: 0,
      mode: 'sequential',
      categoryFilter: 'all',
      answeredIds: [],
      setQuestions: (questions) => set({ questions }),
      setOrder: (order) =>
        set((s) => {
          if (s.order === order) return {}
          const sameContent =
            s.order.length === order.length &&
            s.order.every((id, i) => id === order[i])
          return {
            order,
            currentIndex: sameContent ? s.currentIndex : 0,
          }
        }),
      shuffle: () =>
        set((s) => {
          const arr = [...s.order]
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[arr[i], arr[j]] = [arr[j], arr[i]]
          }
          return { order: arr }
        }),
      next: () =>
        set((s) => ({
          currentIndex:
            s.order.length === 0 ? 0 : (s.currentIndex + 1) % s.order.length,
        })),
      prev: () =>
        set((s) => ({
          currentIndex:
            s.order.length === 0
              ? 0
              : (s.currentIndex - 1 + s.order.length) % s.order.length,
        })),
      setMode: (mode) => set({ mode }),
      setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
      markAnswered: (questionId) =>
        set((s) => ({
          answeredIds: s.answeredIds.includes(questionId)
            ? s.answeredIds
            : [...s.answeredIds, questionId],
        })),
      getCurrent: () => {
        const { questions, order, currentIndex } = get()
        const id = order[currentIndex]
        return id ? (questions[id] ?? null) : null
      },
    }),
    {
      name: 'fishing-question',
      // Persist only UI preferences, not the loaded bank (questions/order come
      // from JSON files via the data store).
      partialize: (s) => ({
        mode: s.mode,
        categoryFilter: s.categoryFilter,
      }),
    },
  ),
)
