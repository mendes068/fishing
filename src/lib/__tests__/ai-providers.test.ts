import { describe, expect, it } from 'vitest'
import type { Question, QuestionCategory, LocalizedText } from '@/types'
import {
  TemplateExplanationProvider,
  TemplateMnemonicProvider,
  TemplateLearningAssistant,
  questionExplanationProvider,
  mnemonicProvider,
  learningAssistant,
} from '@/lib/ai'

function text(de: string, en: string, ptBr: string): LocalizedText {
  return { de, en, 'pt-BR': ptBr }
}

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q1',
    category: 'fischkunde_und_hege',
    questionText: text(
      'Welcher Fisch ist ein Raubfisch?',
      'Which fish is a predator?',
      'Qual peixe é um predador?',
    ),
    answers: [
      { text: text('Der Hecht', 'The pike', 'O lúcio') },
      { text: text('Die Brasse', 'The bream', 'A sardinha') },
      { text: text('Die Karausche', 'The crucian carp', 'A carpa') },
    ],
    correctAnswerIndex: 0,
    explanation: text(
      'Der Hecht ist ein Raubfisch.',
      'The pike is a predator.',
      'O lúcio é um predador.',
    ),
    tags: ['predator'],
    fishRefs: [],
    ...overrides,
  }
}

describe('TemplateExplanationProvider', () => {
  it('returns the pre-written explanation when present for the requested language', () => {
    const q = makeQuestion()
    expect(questionExplanationProvider.explain(q, 0, 'en')).toBe(
      'The pike is a predator.',
    )
  })

  it('returns a localized fallback template when the explanation is missing', () => {
    const q = makeQuestion({
      explanation: { de: '', en: '', 'pt-BR': '' },
    })
    const result = questionExplanationProvider.explain(q, 0, 'en')
    expect(result).toContain('The correct answer is')
    expect(result).toContain('The pike')
  })

  it('builds the fallback in the requested language', () => {
    const q = makeQuestion({ explanation: text('', '', '') })
    const result = questionExplanationProvider.explain(q, null, 'de')
    expect(result).toContain('Die richtige Antwort ist')
    expect(result).toContain('Der Hecht')
  })

  it('exposes a class that satisfies the interface', () => {
    const provider = new TemplateExplanationProvider()
    expect(typeof provider.explain).toBe('function')
  })
})

describe('TemplateMnemonicProvider', () => {
  it('returns a string containing a keyword from the correct answer', () => {
    const q = makeQuestion()
    const mnemonic = mnemonicProvider.generateMnemonic(q, 'en')
    const answerWords = q.answers[q.correctAnswerIndex].text.en
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .split(/\s+/)
      .filter((w) => w.length >= 4)
    expect(answerWords.some((w) => mnemonic.includes(w))).toBe(true)
  })

  it('includes the category name and prefix', () => {
    const mnemonic = mnemonicProvider.generateMnemonic(makeQuestion(), 'en')
    expect(mnemonic).toContain('Remember:')
    expect(mnemonic).toContain('Fish Biology and Conservation')
  })

  it('uses the language-appropriate prefix', () => {
    const mnemonic = mnemonicProvider.generateMnemonic(makeQuestion(), 'de')
    expect(mnemonic).toContain('Merke:')
  })

  it('exposes a class that satisfies the interface', () => {
    const provider = new TemplateMnemonicProvider()
    expect(typeof provider.generateMnemonic).toBe('function')
  })
})

describe('TemplateLearningAssistant', () => {
  function progress(results: Record<string, { correct: boolean; category: QuestionCategory }>) {
    return { results }
  }

  it('analyzeWeaknesses groups by category and sorts weakest first', () => {
    const weakAreas = learningAssistant.analyzeWeaknesses(
      progress({
        a: { correct: true, category: 'fischkunde_und_hege' },
        b: { correct: false, category: 'fischkunde_und_hege' },
        c: { correct: false, category: 'pflege_der_fischgewaesser' },
        d: { correct: false, category: 'pflege_der_fischgewaesser' },
        e: { correct: true, category: 'pflege_der_fischgewaesser' },
        f: { correct: true, category: 'fanggeraete_und_deren_gebrauch' },
      }),
    )
    expect(weakAreas.map((w) => w.category)).toEqual([
      'pflege_der_fischgewaesser',
      'fischkunde_und_hege',
      'fanggeraete_und_deren_gebrauch',
    ])
    expect(weakAreas.map((w) => w.accuracy)).toEqual([1 / 3, 0.5, 1])
    expect(weakAreas[0].correct).toBe(1)
    expect(weakAreas[0].total).toBe(3)
  })

  it('skips categories with no recorded results', () => {
    const weakAreas = learningAssistant.analyzeWeaknesses(
      progress({ a: { correct: true, category: 'fischkunde_und_hege' } }),
    )
    expect(weakAreas).toHaveLength(1)
    expect(weakAreas[0].category).toBe('fischkunde_und_hege')
  })

  it('suggestFocus mentions the weakest category with its accuracy', () => {
    const suggestion = learningAssistant.suggestFocus(
      [
        {
          category: 'pflege_der_fischgewaesser',
          accuracy: 0.25,
          correct: 1,
          total: 4,
        },
        { category: 'fischkunde_und_hege', accuracy: 0.8, correct: 8, total: 10 },
      ],
      'en',
    )
    expect(suggestion).toContain('Waterbody Management')
    expect(suggestion).toContain('25%')
  })

  it('suggestFocus handles an empty weak-area list', () => {
    expect(learningAssistant.suggestFocus([], 'en')).toBe(
      'Keep studying! No weak areas detected.',
    )
  })

  it('exposes a class that satisfies the interface', () => {
    const provider = new TemplateLearningAssistant()
    expect(typeof provider.analyzeWeaknesses).toBe('function')
    expect(typeof provider.suggestFocus).toBe('function')
  })

  it('handles unknown languages by falling back to German', () => {
    const suggestion = learningAssistant.suggestFocus(
      [
        {
          category: 'fischkunde_und_hege',
          accuracy: 0.5,
          correct: 1,
          total: 2,
        },
      ],
      'fr',
    )
    expect(suggestion).toContain('Fischkunde und Hege')
    expect(suggestion).toContain('50%')
    expect(questionExplanationProvider.explain(makeQuestion(), null, 'fr')).toBe(
      'Der Hecht ist ein Raubfisch.',
    )
  })
})
