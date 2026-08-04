import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { QuestionSchema } from '../question.schema'

const DATA_DIR = join(process.cwd(), 'public', 'data', 'questions')

function loadJson(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(DATA_DIR, name), 'utf8')) as Record<string, unknown>
}

const de = loadJson('de.json')
const en = loadJson('en.json')
const ptBR = loadJson('pt-BR.json')

const CATEGORIES = [
  'fischkunde_und_hege',
  'pflege_der_fischgewaesser',
  'fanggeraete_und_deren_gebrauch',
  'behandlung_der_gefangenen_fische',
  'einschlaegige_rechtsvorschriften',
] as const

function localizedStrings(q: Record<string, unknown>): string[] {
  const out: string[] = []
  const qtext = q.questionText as Record<string, string>
  const expl = q.explanation as Record<string, string>
  const answers = q.answers as Array<{ text: Record<string, string> }>
  out.push(...Object.values(qtext), ...Object.values(expl))
  for (const a of answers) out.push(...Object.values(a.text))
  return out
}

describe('Question data files (de/en/pt-BR)', () => {
  it('has at least 300 questions in the German file', () => {
    expect(Object.keys(de).length).toBeGreaterThanOrEqual(300)
  })

  it('has at least 300 questions in the English file', () => {
    expect(Object.keys(en).length).toBeGreaterThanOrEqual(300)
  })

  it('has at least 300 questions in the Brazilian Portuguese file', () => {
    expect(Object.keys(ptBR).length).toBeGreaterThanOrEqual(300)
  })

  it('has identical question ID sets across all three files', () => {
    const keys = (o: Record<string, unknown>) => Object.keys(o).sort()
    expect(keys(en)).toEqual(keys(de))
    expect(keys(ptBR)).toEqual(keys(de))
  })

  it('has at least 60 questions in each of the 5 categories (de)', () => {
    const counts: Record<string, number> = {}
    for (const q of Object.values(de)) {
      const cat = (q as { category: string }).category
      counts[cat] = (counts[cat] ?? 0) + 1
    }
    for (const c of CATEGORIES) {
      expect(counts[c] ?? 0, `category ${c}`).toBeGreaterThanOrEqual(60)
    }
  })

  it('has identical category distribution in en and pt-BR', () => {
    const catOf = (o: Record<string, unknown>) =>
      Object.values(o).map((q) => (q as { category: string }).category).sort()
    expect(catOf(en)).toEqual(catOf(de))
    expect(catOf(ptBR)).toEqual(catOf(de))
  })

  it('validates every German question against QuestionSchema', () => {
    for (const q of Object.values(de)) {
      expect(() => QuestionSchema.parse(q)).not.toThrow()
    }
  })

  it('validates every English question against QuestionSchema', () => {
    for (const q of Object.values(en)) {
      expect(() => QuestionSchema.parse(q)).not.toThrow()
    }
  })

  it('validates every Brazilian Portuguese question against QuestionSchema', () => {
    for (const q of Object.values(ptBR)) {
      expect(() => QuestionSchema.parse(q)).not.toThrow()
    }
  })

  it('has no empty or placeholder strings in any localized field', () => {
    const placeholder = /^(todo|lorem|\.\.\.|tbd|\?+)$/i
    for (const [label, file] of [
      ['de', de],
      ['en', en],
      ['pt-BR', ptBR],
    ] as const) {
      for (const [id, q] of Object.entries(file)) {
        for (const s of localizedStrings(q as Record<string, unknown>)) {
          expect(s.trim(), `${label}/${id}`).not.toBe('')
          expect(s.trim(), `${label}/${id}`).not.toMatch(placeholder)
        }
      }
    }
  })

  it('has valid answer counts (exactly 3) and correctAnswerIndex in range', () => {
    for (const q of Object.values(de)) {
      const typed = q as {
        answers: unknown[]
        correctAnswerIndex: number
        questionText: Record<string, string>
      }
      expect(typed.answers).toHaveLength(3)
      expect([0, 1, 2]).toContain(typed.correctAnswerIndex)
      expect(typed.questionText.de).toBeTruthy()
    }
  })
})
