import { z } from 'zod'
import { QuestionSchema } from './question.schema'
import { FishSpeciesSchema } from './fish.schema'
import { GlossaryTermSchema } from './glossary.schema'

export const QuestionImportSchema = z.array(QuestionSchema)
export type QuestionImport = z.infer<typeof QuestionImportSchema>

export const FishImportSchema = z.array(FishSpeciesSchema)
export type FishImport = z.infer<typeof FishImportSchema>

export const GlossaryImportSchema = z.array(GlossaryTermSchema)
export type GlossaryImport = z.infer<typeof GlossaryImportSchema>
