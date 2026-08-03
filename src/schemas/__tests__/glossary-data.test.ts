import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GlossaryTermSchema } from '../glossary.schema'

const GLOSSARY_DIR = resolve(import.meta.dirname, '../../../public/data/glossary')

const LANGS = ['de', 'en', 'pt-BR'] as const

interface GlossaryRecord {
  id: string
  term: Record<string, string>
  definition: Record<string, string>
  category: 'equipment' | 'biology' | 'legal' | 'technique'
  relatedTermIds: string[]
  seeAlso: string[]
}

function loadGlossary(lang: (typeof LANGS)[number]): Record<string, GlossaryRecord> {
  const raw = readFileSync(resolve(GLOSSARY_DIR, `${lang}.json`), 'utf-8')
  return JSON.parse(raw) as Record<string, GlossaryRecord>
}

describe('glossary data', () => {
  const files = {
    de: loadGlossary('de'),
    en: loadGlossary('en'),
    'pt-BR': loadGlossary('pt-BR'),
  }

  it('each language file has at least 50 terms', () => {
    for (const lang of LANGS) {
      expect(Object.keys(files[lang]).length, `${lang} file`).toBeGreaterThanOrEqual(50)
    }
  })

  it('IDs match across all three files', () => {
    const ids = Object.keys(files.de).sort()
    for (const lang of LANGS) {
      expect(Object.keys(files[lang]).sort(), `${lang} file`).toEqual(ids)
    }
  })

  it('every term passes GlossaryTermSchema.parse()', () => {
    for (const lang of LANGS) {
      for (const [id, term] of Object.entries(files[lang])) {
        expect(() => GlossaryTermSchema.parse(term), `${lang}/${id}`).not.toThrow()
      }
    }
  })

  it('every term provides all three languages for term and definition', () => {
    for (const lang of LANGS) {
      for (const [id, term] of Object.entries(files[lang])) {
        for (const field of ['term', 'definition'] as const) {
          for (const key of LANGS) {
            const value = term[field][key]
            expect(value.trim().length, `${lang}/${id}/${field}/${key}`).toBeGreaterThan(0)
          }
        }
      }
    }
  })

  it('uses only valid categories and covers all four categories', () => {
    const categories = new Set<string>()
    for (const [id, term] of Object.entries(files.de)) {
      expect(
        ['equipment', 'biology', 'legal', 'technique'],
        `de/${id} category`,
      ).toContain(term.category)
      categories.add(term.category)
    }
    expect(categories).toEqual(new Set(['equipment', 'biology', 'legal', 'technique']))
  })

  it('all referenced IDs exist in the file', () => {
    for (const lang of LANGS) {
      const ids = new Set(Object.keys(files[lang]))
      for (const [id, term] of Object.entries(files[lang])) {
        for (const ref of [...term.relatedTermIds, ...term.seeAlso]) {
          expect(ids.has(ref), `${lang}/${id} -> ${ref}`).toBe(true)
        }
      }
    }
  })

  it('relatedTermIds and seeAlso contain no circular references (graph is a DAG)', () => {
    for (const lang of LANGS) {
      const ids = new Set(Object.keys(files[lang]))
      // color: 0 = unvisited, 1 = in current DFS stack, 2 = fully processed
      const color = new Map<string, number>()
      for (const id of ids) color.set(id, 0)

      const visit = (id: string, path: string[]): void => {
        color.set(id, 1)
        const term = files[lang][id]
        for (const ref of [...term.relatedTermIds, ...term.seeAlso]) {
          if (color.get(ref) === 1) {
            throw new Error(`${lang}: cycle detected: ${[...path, ref].join(' -> ')}`)
          }
          if (color.get(ref) === 0) visit(ref, [...path, ref])
        }
        color.set(id, 2)
      }

      for (const id of ids) {
        if (color.get(id) === 0) visit(id, [id])
      }
      // reaching here without throwing means the graph is acyclic
      expect(true).toBe(true)
    }
  })

  it('no relatedTermIds or seeAlso entry points back to the term itself', () => {
    for (const lang of LANGS) {
      for (const [id, term] of Object.entries(files[lang])) {
        expect(term.relatedTermIds, `${lang}/${id} relatedTermIds`).not.toContain(id)
        expect(term.seeAlso, `${lang}/${id} seeAlso`).not.toContain(id)
      }
    }
  })
})
