import { describe, expect, it } from 'vitest'
import { FishSpeciesSchema } from '../fish.schema'
import type { FishSpecies } from '../../types'

const validFish: FishSpecies = {
  id: 'pike',
  scientificName: 'Esox lucius',
  commonNames: { de: 'Hecht', en: 'Northern pike', 'pt-BR': 'Lúcio' },
  habitat: { de: 'Flüsse', en: 'Rivers', 'pt-BR': 'Rios' },
  maxSize: 150,
  minCatchSize: 50,
  closedSeason: { start: '03-01', end: '04-30' },
  distinguishingFeatures: {
    de: 'Langgestreckter Körper',
    en: 'Elongated body',
    'pt-BR': 'Corpo alongado',
  },
  imagePath: '',
  protectedStatus: true,
  category: 'bbgfischo',
}

describe('FishSpeciesSchema', () => {
  it('parses a valid fish species without throwing', () => {
    const result = FishSpeciesSchema.parse(validFish)
    expect(result.id).toBe('pike')
  })

  it('accepts null for minCatchSize and closedSeason', () => {
    const result = FishSpeciesSchema.parse({
      ...validFish,
      minCatchSize: null,
      closedSeason: null,
    })
    expect(result.minCatchSize).toBeNull()
    expect(result.closedSeason).toBeNull()
  })

  it('throws when maxSize is not a positive number', () => {
    const bad = { ...validFish, maxSize: -5 }
    expect(() => FishSpeciesSchema.parse(bad)).toThrow()
  })

  it('throws on an invalid category name', () => {
    const bad = { ...validFish, category: 'protected' }
    expect(() => FishSpeciesSchema.parse(bad)).toThrow()
  })

  it('throws when closedSeason is not in MM-DD format', () => {
    const bad = { ...validFish, closedSeason: { start: '03-01', end: 'April' } }
    expect(() => FishSpeciesSchema.parse(bad)).toThrow()
  })

  it('throws when a localized text field is missing a language', () => {
    const bad = {
      ...validFish,
      commonNames: { de: 'Hecht', en: 'Northern pike' },
    }
    expect(() => FishSpeciesSchema.parse(bad)).toThrow()
  })
})
