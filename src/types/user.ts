import type { Language, QuestionCategory } from './question'

export interface UserSettings {
  theme: 'light' | 'dark' | 'system'
  language: Language
  dailyReviewCap: number // default 50
}

export interface QuestionResult {
  questionId: string
  answeredAt: number
  correct: boolean
  answerIndex: number
  category: QuestionCategory
}

export interface ExamHistoryEntry {
  id: string
  date: number
  totalQuestions: number
  correctAnswers: number
  passed: boolean
  perCategory: Record<QuestionCategory, { correct: number; total: number }>
  durationSeconds: number
}

export interface UserProgress {
  results: Record<string, QuestionResult> // by questionId
  lastStudyDate: string | null // 'YYYY-MM-DD'
  studyStreak: number
  studyDays: Record<string, number> // 'YYYY-MM-DD' -> questions studied
}

export interface FlashcardState {
  repetitions: number
  easeFactor: number
  interval: number
  nextReviewAt: number
  lastReviewedAt: number | null
  lapses: number
}
