import { z } from 'zod'
import { LocalizedTextSchema } from './question.schema'

export const GlossaryTermSchema = z.object({
  id: z.string().min(1),
  term: LocalizedTextSchema,
  definition: LocalizedTextSchema,
  category: z.enum(['equipment', 'biology', 'legal', 'technique']),
  relatedTermIds: z.array(z.string()),
  seeAlso: z.array(z.string()),
})
export type GlossaryTerm = z.infer<typeof GlossaryTermSchema>
