import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CATEGORY_DESC_KEYS,
  CATEGORY_NAME_KEYS,
  CATEGORY_ORDER,
} from '@/lib/categories'

const LOCALE_DIR = join(process.cwd(), 'public', 'locales')
const LANGS = ['de', 'en', 'pt-BR'] as const

function loadCategories(lang: string): {
  names: Record<string, string>
  descriptions: Record<string, string>
} {
  const raw = JSON.parse(
    readFileSync(join(LOCALE_DIR, lang, 'categories.json'), 'utf8'),
  ) as { names: Record<string, string>; descriptions: Record<string, string> }
  return { names: raw.names, descriptions: raw.descriptions }
}

describe('category constants', () => {
  it('CATEGORY_ORDER contains exactly the 5 official Brandenburg categories', () => {
    expect(CATEGORY_ORDER).toEqual([
      'fischkunde_und_hege',
      'pflege_der_fischgewaesser',
      'fanggeraete_und_deren_gebrauch',
      'behandlung_der_gefangenen_fische',
      'einschlaegige_rechtsvorschriften',
    ])
  })

  it('CATEGORY_ORDER has no duplicate entries', () => {
    expect(new Set(CATEGORY_ORDER).size).toBe(CATEGORY_ORDER.length)
  })

  it('CATEGORY_NAME_KEYS has exactly one key per category in CATEGORY_ORDER', () => {
    expect(Object.keys(CATEGORY_NAME_KEYS).sort()).toEqual(
      [...CATEGORY_ORDER].sort(),
    )
  })

  it('CATEGORY_DESC_KEYS has exactly one key per category in CATEGORY_ORDER', () => {
    expect(Object.keys(CATEGORY_DESC_KEYS).sort()).toEqual(
      [...CATEGORY_ORDER].sort(),
    )
  })

  it('CATEGORY_NAME_KEYS values follow the names.<category> suffix pattern', () => {
    for (const category of CATEGORY_ORDER) {
      expect(CATEGORY_NAME_KEYS[category]).toBe(`names.${category}`)
    }
  })

  it('CATEGORY_DESC_KEYS values follow the descriptions.<category> suffix pattern', () => {
    for (const category of CATEGORY_ORDER) {
      expect(CATEGORY_DESC_KEYS[category]).toBe(`descriptions.${category}`)
    }
  })
})

describe('category locale files', () => {
  for (const lang of LANGS) {
    it(`every category has a non-empty names entry in ${lang}/categories.json`, () => {
      const { names } = loadCategories(lang)
      for (const category of CATEGORY_ORDER) {
        expect(names[category], `names.${category} in ${lang}`).toBeTruthy()
      }
    })

    it(`every category has a non-empty descriptions entry in ${lang}/categories.json`, () => {
      const { descriptions } = loadCategories(lang)
      for (const category of CATEGORY_ORDER) {
        expect(
          descriptions[category],
          `descriptions.${category} in ${lang}`,
        ).toBeTruthy()
      }
    })
  }

  it('locale names/descriptions contain no extra category keys beyond CATEGORY_ORDER', () => {
    for (const lang of LANGS) {
      const { names, descriptions } = loadCategories(lang)
      expect(Object.keys(names).sort(), `${lang} names`).toEqual(
        [...CATEGORY_ORDER].sort(),
      )
      expect(Object.keys(descriptions).sort(), `${lang} descriptions`).toEqual(
        [...CATEGORY_ORDER].sort(),
      )
    }
  })
})
