import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ExamHistoryEntry, Question, QuestionCategory } from '@/types'

export interface ActiveExam {
  questions: Question[]
  answers: Record<string, number>
  startedAt: number
  expiresAt: number
}

const EXAM_DURATION_MS = 90 * 60 * 1000 // 90 minutes

const CATEGORIES: QuestionCategory[] = [
  'fischkunde_und_hege',
  'pflege_der_fischgewaesser',
  'fanggeraete_und_deren_gebrauch',
  'behandlung_der_gefangenen_fische',
  'einschlaegige_rechtsvorschriften',
]

function emptyCategoryBreakdown(): Record<
  QuestionCategory,
  { correct: number; total: number }
> {
  return {
    fischkunde_und_hege: { correct: 0, total: 0 },
    pflege_der_fischgewaesser: { correct: 0, total: 0 },
    fanggeraete_und_deren_gebrauch: { correct: 0, total: 0 },
    behandlung_der_gefangenen_fische: { correct: 0, total: 0 },
    einschlaegige_rechtsvorschriften: { correct: 0, total: 0 },
  }
}

export interface ExamState {
  currentExam: ActiveExam | null
  history: ExamHistoryEntry[]
  startExam: (questions: Question[]) => void
  answerQuestion: (questionId: string, answerIndex: number) => void
  submitExam: () => ExamHistoryEntry | null
  resumeExam: (exam: ActiveExam) => void
  clearExam: () => void
  addToHistory: (entry: ExamHistoryEntry) => void
}

export const useExamStore = create<ExamState>()(
  persist(
    (set, get) => ({
      currentExam: null,
      history: [],
      startExam: (questions) => {
        const startedAt = Date.now()
        set({
          currentExam: {
            questions,
            answers: {},
            startedAt,
            expiresAt: startedAt + EXAM_DURATION_MS,
          },
        })
      },
      answerQuestion: (questionId, answerIndex) =>
        set((s) => {
          if (!s.currentExam) return s
          return {
            currentExam: {
              ...s.currentExam,
              answers: { ...s.currentExam.answers, [questionId]: answerIndex },
            },
          }
        }),
      submitExam: () => {
        const { currentExam, history } = get()
        if (!currentExam) return null

        const totalQuestions = currentExam.questions.length
        const perCategory = emptyCategoryBreakdown()
        let correctAnswers = 0

        for (const q of currentExam.questions) {
          const category = perCategory[q.category]
          category.total += 1
          const chosen = currentExam.answers[q.id]
          if (chosen === q.correctAnswerIndex) {
            category.correct += 1
            correctAnswers += 1
          }
        }

        // Brandenburg rules: ≥45 of 60 overall AND ≥6 correct per category.
        // For shorter/uneven exams scale proportionally: ≥75% overall, and a
        // category with fewer than 6 questions requires a perfect score.
        const overallPass =
          totalQuestions >= 60
            ? correctAnswers >= 45
            : correctAnswers >= Math.ceil(totalQuestions * 0.75)
        const categoriesPass = CATEGORIES.every((c) => {
          const { correct, total } = perCategory[c]
          if (total === 0) return true
          return total >= 6 ? correct >= 6 : correct === total
        })
        const passed = overallPass && categoriesPass

        const entry: ExamHistoryEntry = {
          id: crypto.randomUUID(),
          date: currentExam.startedAt,
          totalQuestions,
          correctAnswers,
          passed,
          perCategory,
          durationSeconds: Math.max(
            1,
            Math.round((Date.now() - currentExam.startedAt) / 1000),
          ),
        }

        set({
          currentExam: null,
          history: [entry, ...history].slice(0, 100),
        })
        return entry
      },
      resumeExam: (exam) => set({ currentExam: exam }),
      clearExam: () => set({ currentExam: null }),
      addToHistory: (entry) =>
        set((s) => ({ history: [entry, ...s.history].slice(0, 100) })),
    }),
    {
      name: 'fishing-exam',
    },
  ),
)
