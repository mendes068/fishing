import { z } from 'zod'

export const LanguageSchema = z.enum(['de', 'en', 'pt-BR'])
export type Language = z.infer<typeof LanguageSchema>

export const LocalizedTextSchema = z.record(LanguageSchema, z.string().min(1))
export type LocalizedText = z.infer<typeof LocalizedTextSchema>

export const QuestionCategorySchema = z.enum([
  'fischkunde_und_hege',
  'pflege_der_fischgewaesser',
  'fanggeraete_und_deren_gebrauch',
  'behandlung_der_gefangenen_fische',
  'einschlaegige_rechtsvorschriften',
])
export type QuestionCategory = z.infer<typeof QuestionCategorySchema>

export const QuestionAnswerSchema = z.object({
  text: LocalizedTextSchema,
})
export type QuestionAnswer = z.infer<typeof QuestionAnswerSchema>

export const QuestionSchema = z.object({
  id: z.string().min(1),
  category: QuestionCategorySchema,
  questionText: LocalizedTextSchema,
  answers: z.array(QuestionAnswerSchema).length(3),
  correctAnswerIndex: z.number().int().min(0).max(2),
  explanation: LocalizedTextSchema,
  tags: z.array(z.string()),
  fishRefs: z.array(z.string()).default([]),
})
export type Question = z.infer<typeof QuestionSchema>

export const QuestionBankSchema = z.object({
  version: z.number(),
  questions: z.array(QuestionSchema),
})
export type QuestionBank = z.infer<typeof QuestionBankSchema>
