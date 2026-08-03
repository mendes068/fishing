import { z } from 'zod'
import { LanguageSchema, QuestionCategorySchema } from './question.schema'

export const UserSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  language: LanguageSchema,
  dailyReviewCap: z.number().int().min(0), // default 50
})
export type UserSettings = z.infer<typeof UserSettingsSchema>

export const QuestionResultSchema = z.object({
  questionId: z.string().min(1),
  answeredAt: z.number().int(),
  correct: z.boolean(),
  answerIndex: z.number().int(),
  category: QuestionCategorySchema,
})
export type QuestionResult = z.infer<typeof QuestionResultSchema>

export const ExamHistoryEntrySchema = z.object({
  id: z.string().min(1),
  date: z.number().int(),
  totalQuestions: z.number().int(),
  correctAnswers: z.number().int(),
  passed: z.boolean(),
  perCategory: z.record(
    QuestionCategorySchema,
    z.object({ correct: z.number().int(), total: z.number().int() }),
  ),
  durationSeconds: z.number().int(),
})
export type ExamHistoryEntry = z.infer<typeof ExamHistoryEntrySchema>

export const UserProgressSchema = z.object({
  results: z.record(z.string(), QuestionResultSchema), // by questionId
  lastStudyDate: z.string().nullable(), // 'YYYY-MM-DD'
  studyStreak: z.number().int(),
  studyDays: z.record(z.string(), z.number().int()), // 'YYYY-MM-DD' -> questions studied
})
export type UserProgress = z.infer<typeof UserProgressSchema>

export const FlashcardStateSchema = z.object({
  repetitions: z.number().int(),
  easeFactor: z.number(),
  interval: z.number(),
  nextReviewAt: z.number().int(),
  lastReviewedAt: z.number().int().nullable(),
  lapses: z.number().int(),
})
export type FlashcardState = z.infer<typeof FlashcardStateSchema>
