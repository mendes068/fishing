import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FishSpeciesSchema } from '../fish.schema'

const FISH_DIR = resolve(import.meta.dirname, '../../../public/data/fish')

const LANGS = ['de', 'en', 'pt-BR'] as const

interface FishRecord {
  id: string
  scientificName: string
  maxSize: number
  minCatchSize: number | null
  imagePath: string
  protectedStatus: boolean
  category: string
}

function loadFish(lang: (typeof LANGS)[number]): Record<string, FishRecord> {
  const raw = readFileSync(resolve(FISH_DIR, `${lang}.json`), 'utf-8')
  return JSON.parse(raw) as Record<string, FishRecord>
}

describe('fish encyclopedia data', () => {
  const files = {
    de: loadFish('de'),
    en: loadFish('en'),
    'pt-BR': loadFish('pt-BR'),
  }

  it('each language file has at least 60 species', () => {
    for (const lang of LANGS) {
      expect(Object.keys(files[lang]).length, `${lang} file`).toBeGreaterThanOrEqual(60)
    }
  })

  it('IDs match across all three files', () => {
    const ids = Object.keys(files.de).sort()
    for (const lang of LANGS) {
      expect(Object.keys(files[lang]).sort(), `${lang} file`).toEqual(ids)
    }
  })

  it('has at least 41 species with protectedStatus === true', () => {
    const count = Object.values(files.de).filter((s) => s.protectedStatus === true).length
    expect(count).toBeGreaterThanOrEqual(41)
  })

  it('every species passes FishSpeciesSchema.parse()', () => {
    for (const lang of LANGS) {
      for (const [id, species] of Object.entries(files[lang])) {
        expect(() => FishSpeciesSchema.parse(species), `${lang}/${id}`).not.toThrow()
      }
    }
  })

  it('every scientificName is non-empty', () => {
    for (const [id, species] of Object.entries(files.de)) {
      expect(species.scientificName.trim().length, `de/${id}`).toBeGreaterThan(0)
    }
  })

  it('imagePath is an empty string for all species', () => {
    for (const lang of LANGS) {
      for (const [id, species] of Object.entries(files[lang])) {
        expect(species.imagePath, `${lang}/${id}`).toBe('')
      }
    }
  })

  it('category is only bbgfischo or common', () => {
    for (const [id, species] of Object.entries(files.de)) {
      expect(['bbgfischo', 'common'], `de/${id}`).toContain(species.category)
    }
  })

  it('protected species are all in category bbgfischo', () => {
    for (const [id, species] of Object.entries(files.de)) {
      if (species.protectedStatus) {
        expect(species.category, `de/${id}`).toBe('bbgfischo')
      }
    }
  })
})
