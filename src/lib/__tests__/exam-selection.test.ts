import { describe, expect, it } from 'vitest'
import { selectExamQuestions, shuffleAnswerIndices, mapDisplayToData } from '@/lib/exam-select'
import type { Question } from '@/types'

function makeQuestion(id: string, category: Question['category']): Question {
  return {
    id,
    category,
    questionText: { de: `Q${id}`, en: `Q${id}`, 'pt-BR': `Q${id}` },
    answers: [
      { text: { de: 'A', en: 'A', 'pt-BR': 'A' } },
      { text: { de: 'B', en: 'B', 'pt-BR': 'B' } },
      { text: { de: 'C', en: 'C', 'pt-BR': 'C' } },
    ],
    correctAnswerIndex: 0,
    explanation: { de: '', en: '', 'pt-BR': '' },
    tags: [],
    fishRefs: [],
  }
}

describe('selectExamQuestions', () => {
  it('returns exactly perCategory * 5 questions (default 60)', () => {
    const q: Record<string, Question> = {}
    const categories = [
      'fischkunde_und_hege',
      'pflege_der_fischgewaesser',
      'fanggeraete_und_deren_gebrauch',
      'behandlung_der_gefangenen_fische',
      'einschlaegige_rechtsvorschriften',
    ] as const
    // 20 per category
    for (const cat of categories) {
      for (let i = 0; i < 20; i++) {
        q[`${cat}-${i}`] = makeQuestion(`${cat}-${i}`, cat)
      }
    }

    const selected = selectExamQuestions(q, 12)
    expect(selected).toHaveLength(60)
  })

  it('selects exactly 12 per category', () => {
    const q: Record<string, Question> = {}
    const categories = [
      'fischkunde_und_hege',
      'pflege_der_fischgewaesser',
      'fanggeraete_und_deren_gebrauch',
      'behandlung_der_gefangenen_fische',
      'einschlaegige_rechtsvorschriften',
    ] as const
    for (const cat of categories) {
      for (let i = 0; i < 20; i++) {
        q[`${cat}-${i}`] = makeQuestion(`${cat}-${i}`, cat)
      }
    }

    const selected = selectExamQuestions(q, 12)
    const perCategory: Record<string, number> = {}
    for (const item of selected) {
      perCategory[item.category] = (perCategory[item.category] || 0) + 1
    }

    for (const cat of categories) {
      expect(perCategory[cat]).toBe(12)
    }
  })

  it('has no duplicates', () => {
    const q: Record<string, Question> = {}
    const categories = [
      'fischkunde_und_hege',
      'pflege_der_fischgewaesser',
      'fanggeraete_und_deren_gebrauch',
      'behandlung_der_gefangenen_fische',
      'einschlaegige_rechtsvorschriften',
    ] as const
    for (const cat of categories) {
      for (let i = 0; i < 15; i++) {
        q[`${cat}-${i}`] = makeQuestion(`${cat}-${i}`, cat)
      }
    }

    const selected = selectExamQuestions(q, 12)
    const ids = new Set(selected.map((s) => s.id))
    expect(ids.size).toBe(60)
  })

  it('works with exactly 12 per category (minimum)', () => {
    const q: Record<string, Question> = {}
    const categories = [
      'fischkunde_und_hege',
      'pflege_der_fischgewaesser',
      'fanggeraete_und_deren_gebrauch',
      'behandlung_der_gefangenen_fische',
      'einschlaegige_rechtsvorschriften',
    ] as const
    for (const cat of categories) {
      for (let i = 0; i < 12; i++) {
        q[`${cat}-${i}`] = makeQuestion(`${cat}-${i}`, cat)
      }
    }

    const selected = selectExamQuestions(q, 12)
    expect(selected).toHaveLength(60)

    const perCategory: Record<string, number> = {}
    for (const item of selected) {
      perCategory[item.category] = (perCategory[item.category] || 0) + 1
    }
    for (const cat of categories) {
      expect(perCategory[cat]).toBe(12)
    }
  })

  it('deterministic order is randomized (not same on every call)', () => {
    const q: Record<string, Question> = {}
    const categories = [
      'fischkunde_und_hege',
      'pflege_der_fischgewaesser',
      'fanggeraete_und_deren_gebrauch',
      'behandlung_der_gefangenen_fische',
      'einschlaegige_rechtsvorschriften',
    ] as const
    for (const cat of categories) {
      for (let i = 0; i < 20; i++) {
        q[`${cat}-${i}`] = makeQuestion(`${cat}-${i}`, cat)
      }
    }

    // Run twice; they should differ since shuffle uses Math.random
    const first = selectExamQuestions(q, 12).map((x) => x.id)
    const second = selectExamQuestions(q, 12).map((x) => x.id)

    // Extremely unlikely to be identical with 60 items
    const identical = first.every((id, i) => id === second[i])
    expect(identical).toBe(false)
  })
})

describe('shuffleAnswerIndices', () => {
  it('returns all three indices [0,1,2] in some order', () => {
    const result = shuffleAnswerIndices()
    expect(result).toHaveLength(3)
    expect(result.sort()).toEqual([0, 1, 2])
  })
})

describe('mapDisplayToData', () => {
  it('maps correctly', () => {
    const shuffled = [2, 0, 1]
    expect(mapDisplayToData(0, shuffled)).toBe(2)
    expect(mapDisplayToData(1, shuffled)).toBe(0)
    expect(mapDisplayToData(2, shuffled)).toBe(1)
  })
})
