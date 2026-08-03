import { z } from 'zod'
import { LocalizedTextSchema } from './question.schema'

export const ClosedSeasonSchema = z.object({
  start: z.string().regex(/^\d{2}-\d{2}$/, 'expected MM-DD'),
  end: z.string().regex(/^\d{2}-\d{2}$/, 'expected MM-DD'),
})
export type ClosedSeason = z.infer<typeof ClosedSeasonSchema>

export const FishSpeciesSchema = z.object({
  id: z.string().min(1),
  scientificName: z.string().min(1),
  commonNames: LocalizedTextSchema,
  habitat: LocalizedTextSchema,
  maxSize: z.number().positive(), // cm
  minCatchSize: z.number().positive().nullable(), // cm, null if none
  closedSeason: ClosedSeasonSchema.nullable(),
  distinguishingFeatures: LocalizedTextSchema,
  imagePath: z.string(), // empty string for MVP
  protectedStatus: z.boolean(),
  category: z.enum(['bbgfischo', 'common']),
})
export type FishSpecies = z.infer<typeof FishSpeciesSchema>
