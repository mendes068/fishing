import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { QuestionCategory, QuestionResult } from '@/types'

const CATEGORIES: QuestionCategory[] = [
  'fischkunde_und_hege',
  'pflege_der_fischgewaesser',
  'fanggeraete_und_deren_gebrauch',
  'behandlung_der_gefangenen_fische',
  'einschlaegige_rechtsvorschriften',
]

export interface WeakCategory {
  category: QuestionCategory
  accuracy: number
}

export interface ProgressState {
  results: Record<string, QuestionResult>
  lastStudyDate: string | null
  studyStreak: number
  studyDays: Record<string, number>
  recordAnswer: (
    questionId: string,
    correct: boolean,
    answerIndex: number,
    category: QuestionCategory,
  ) => void
  getAccuracy: () => number
  getTotalStudied: () => number
  getCategoryAccuracy: (category: QuestionCategory) => number
  getWeakCategories: () => WeakCategory[]
}

/** Local 'YYYY-MM-DD' for `offsetDays` relative to today. */
function dateKey(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      results: {},
      lastStudyDate: null,
      studyStreak: 0,
      studyDays: {},
      recordAnswer: (questionId, correct, answerIndex, category) =>
        set((s) => {
          const today = dateKey()
          const yesterday = dateKey(-1)
          let streak = s.studyStreak
          if (s.lastStudyDate === yesterday) streak += 1
          else if (s.lastStudyDate !== today) streak = 1

          return {
            results: {
              ...s.results,
              [questionId]: {
                questionId,
                answeredAt: Date.now(),
                correct,
                answerIndex,
                category,
              },
            },
            lastStudyDate: today,
            studyStreak: streak,
            studyDays: {
              ...s.studyDays,
              [today]: (s.studyDays[today] ?? 0) + 1,
            },
          }
        }),
      getAccuracy: () => {
        const results = Object.values(get().results)
        if (results.length === 0) return 0
        return results.filter((r) => r.correct).length / results.length
      },
      getTotalStudied: () => Object.keys(get().results).length,
      getCategoryAccuracy: (category) => {
        const results = Object.values(get().results).filter(
          (r) => r.category === category,
        )
        if (results.length === 0) return 0
        return results.filter((r) => r.correct).length / results.length
      },
      getWeakCategories: () => {
        const out: WeakCategory[] = []
        for (const category of CATEGORIES) {
          const results = Object.values(get().results).filter(
            (r) => r.category === category,
          )
          if (results.length === 0) continue
          out.push({
            category,
            accuracy: results.filter((r) => r.correct).length / results.length,
          })
        }
        return out.sort((a, b) => a.accuracy - b.accuracy)
      },
    }),
    {
      name: 'fishing-progress',
    },
  ),
)
