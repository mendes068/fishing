import { describe, expect, it } from 'vitest'
import {
  QuestionSchema,
  QuestionBankSchema,
  QuestionCategorySchema,
} from '../question.schema'
import type { Question } from '../../types'

const localized = { de: 'Frage', en: 'Question', 'pt-BR': 'Pergunta' }

const validQuestion: Question = {
  id: 'q-001',
  category: 'fischkunde_und_hege',
  questionText: localized,
  answers: [
    { text: { de: 'A', en: 'A', 'pt-BR': 'A' } },
    { text: { de: 'B', en: 'B', 'pt-BR': 'B' } },
    { text: { de: 'C', en: 'C', 'pt-BR': 'C' } },
  ],
  correctAnswerIndex: 1,
  explanation: localized,
  tags: ['fischkunde'],
  fishRefs: ['pike'],
}

describe('QuestionSchema', () => {
  it('parses a valid question without throwing', () => {
    const result = QuestionSchema.parse(validQuestion)
    expect(result.id).toBe('q-001')
    expect(result.answers).toHaveLength(3)
    expect(result.fishRefs).toEqual(['pike'])
  })

  it('throws when correctAnswerIndex is missing', () => {
    const { correctAnswerIndex: _omitted, ...withoutIndex } = validQuestion
    void _omitted
    expect(() => QuestionSchema.parse(withoutIndex)).toThrow()
  })

  it('throws when questionText is a plain string instead of a localized object', () => {
    const bad = { ...validQuestion, questionText: 'Frage' }
    expect(() => QuestionSchema.parse(bad)).toThrow()
  })

  it('throws when answers does not have exactly 3 elements', () => {
    const bad = { ...validQuestion, answers: validQuestion.answers.slice(0, 2) }
    expect(() => QuestionSchema.parse(bad)).toThrow()
  })

  it('throws on an invalid (legacy) category name', () => {
    const bad = { ...validQuestion, category: 'fish_biology' }
    expect(() => QuestionSchema.parse(bad)).toThrow()
  })

  it('throws when correctAnswerIndex is out of range', () => {
    const bad = { ...validQuestion, correctAnswerIndex: 5 }
    expect(() => QuestionSchema.parse(bad)).toThrow()
  })

  it('defaults missing fishRefs to an empty array', () => {
    const { fishRefs: _omitted, ...withoutFishRefs } = validQuestion
    void _omitted
    const result = QuestionSchema.parse(withoutFishRefs)
    expect(result.fishRefs).toEqual([])
  })

  it('throws when a localized text contains an empty string', () => {
    const bad = {
      ...validQuestion,
      questionText: { de: 'Frage', en: '', 'pt-BR': 'Pergunta' },
    }
    expect(() => QuestionSchema.parse(bad)).toThrow()
  })
})

describe('QuestionCategorySchema', () => {
  it('accepts all five official Brandenburg category names', () => {
    const official = [
      'fischkunde_und_hege',
      'pflege_der_fischgewaesser',
      'fanggeraete_und_deren_gebrauch',
      'behandlung_der_gefangenen_fische',
      'einschlaegige_rechtsvorschriften',
    ] as const
    for (const c of official) {
      expect(QuestionCategorySchema.parse(c)).toBe(c)
    }
  })
})

describe('QuestionBankSchema', () => {
  it('parses a question bank with one valid question', () => {
    const bank = { version: 1, questions: [validQuestion] }
    expect(QuestionBankSchema.parse(bank).questions).toHaveLength(1)
  })

  it('throws when the questions array contains an invalid question', () => {
    const bank = { version: 1, questions: [{ ...validQuestion, id: '' }] }
    expect(() => QuestionBankSchema.parse(bank)).toThrow()
  })
})
