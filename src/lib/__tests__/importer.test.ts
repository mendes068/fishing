import { describe, expect, it } from 'vitest'
import { mergeQuestions, validateImport } from '@/lib/importer'
import type { Question } from '@/types'

const localized = { de: 'Text', en: 'Text', 'pt-BR': 'Texto' }

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q-1',
    category: 'fischkunde_und_hege',
    questionText: localized,
    answers: [
      { text: localized },
      { text: localized },
      { text: localized },
    ],
    correctAnswerIndex: 0,
    explanation: localized,
    tags: [],
    fishRefs: [],
    ...overrides,
  }
}

const validArray = [makeQuestion(), makeQuestion({ id: 'q-2' })]

describe('validateImport', () => {
  it('parses a valid bare JSON array', () => {
    const result = validateImport(JSON.stringify(validArray))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.questions).toHaveLength(2)
      expect(result.questions[0]?.id).toBe('q-1')
      expect(result.questions[1]?.id).toBe('q-2')
    }
  })

  it('accepts a { questions: [...] } envelope', () => {
    const result = validateImport(
      JSON.stringify({ version: 1, questions: validArray }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.questions).toHaveLength(2)
    }
  })

  it('rejects invalid JSON with a single structural error', () => {
    const result = validateImport('{ not json !!!')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]?.index).toBe(-1)
      expect(result.errors[0]?.message).toMatch(/Invalid JSON/)
    }
  })

  it('rejects a top-level shape that is neither array nor envelope', () => {
    const result = validateImport(JSON.stringify({ foo: 1 }))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors[0]?.index).toBe(-1)
      expect(result.errors[0]?.message).toMatch(/array of questions/)
    }
  })

  it('reports the exact index and field for an invalid question', () => {
    const bad = makeQuestion({ correctAnswerIndex: 7 as unknown as number })
    const result = validateImport(JSON.stringify([makeQuestion(), bad]))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const err = result.errors.find((e) => e.index === 1)
      expect(err).toBeDefined()
      expect(err?.path).toBe('correctAnswerIndex')
    }
  })

  it('reports per-question errors for a missing required field', () => {
    const base = makeQuestion()
    const missing = {
      id: 'q-2',
      category: base.category,
      questionText: base.questionText,
      answers: base.answers,
      explanation: base.explanation,
      tags: base.tags,
      fishRefs: base.fishRefs,
    }
    const result = validateImport(
      JSON.stringify([makeQuestion(), missing]),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.some((e) => e.index === 1)).toBe(true)
      expect(result.errors.some((e) => e.path === 'correctAnswerIndex')).toBe(true)
    }
  })

  it('validates fish and glossary sections in the envelope', () => {
    const fish = {
      id: 'f-1',
      scientificName: 'Esox lucius',
      commonNames: localized,
      habitat: localized,
      maxSize: 150,
      minCatchSize: 45,
      closedSeason: { start: '02-01', end: '03-31' },
      distinguishingFeatures: localized,
      imagePath: '',
      protectedStatus: true,
      category: 'bbgfischo',
    }
    const good = validateImport(
      JSON.stringify({ questions: validArray, fish: [fish] }),
    )
    expect(good.ok).toBe(true)

    const bad = validateImport(
      JSON.stringify({
        questions: validArray,
        fish: [{ ...fish, maxSize: 'big' }],
      }),
    )
    expect(bad.ok).toBe(false)
    if (!bad.ok) {
      expect(bad.errors.some((e) => e.message.startsWith('fish:'))).toBe(true)
    }
  })
})

describe('mergeQuestions', () => {
  it('adds new questions and updates existing ones by id', () => {
    const existing: Record<string, Question> = {
      'q-1': makeQuestion({ id: 'q-1' }),
    }
    const incoming = [
      makeQuestion({ id: 'q-1', tags: ['updated'] }),
      makeQuestion({ id: 'q-9' }),
    ]
    const { merged, added, updated } = mergeQuestions(existing, incoming)
    expect(added).toEqual(['q-9'])
    expect(updated).toEqual(['q-1'])
    expect(Object.keys(merged).sort()).toEqual(['q-1', 'q-9'])
    expect(merged['q-1']?.tags).toEqual(['updated'])
    expect(merged['q-9']?.id).toBe('q-9')
  })

  it('preserves existing questions that are not in the import', () => {
    const existing: Record<string, Question> = {
      'keep-me': makeQuestion({ id: 'keep-me' }),
    }
    const { merged } = mergeQuestions(existing, [makeQuestion({ id: 'q-new' })])
    expect(merged['keep-me']).toBeDefined()
    expect(merged['q-new']).toBeDefined()
    expect(Object.keys(merged)).toHaveLength(2)
  })

  it('treats duplicate ids in the import as updates (last wins)', () => {
    const incoming = [
      makeQuestion({ id: 'dup', tags: ['first'] }),
      makeQuestion({ id: 'dup', tags: ['second'] }),
    ]
    const { merged, added, updated } = mergeQuestions({}, incoming)
    expect(added).toEqual(['dup'])
    expect(updated).toEqual([])
    expect(merged['dup']?.tags).toEqual(['second'])
  })
})
