import type { QuestionCategory } from '@/types'
import type { LearningAssistant, WeakArea } from './interfaces'
import {
  CATEGORY_NAMES,
  TEMPLATE_STRINGS,
  interpolate,
  normalizeLanguage,
} from './template-strings'

interface ResultLike {
  correct: boolean
  category: QuestionCategory
}

/**
 * Template-based {@link LearningAssistant}.
 *
 * Computes per-category accuracy from recorded results and turns the weakest
 * area into a plain-language focus recommendation. Deterministic and local —
 * a placeholder for a future LLM-backed study coach.
 */
export class TemplateLearningAssistant implements LearningAssistant {
  analyzeWeaknesses(progress: {
    results: Record<string, ResultLike>
  }): WeakArea[] {
    const totals: Partial<Record<QuestionCategory, { correct: number; total: number }>> =
      {}
    for (const result of Object.values(progress.results)) {
      const entry = totals[result.category] ?? { correct: 0, total: 0 }
      entry.total += 1
      if (result.correct) entry.correct += 1
      totals[result.category] = entry
    }
    return (Object.entries(totals) as Array<[QuestionCategory, { correct: number; total: number }]>)
      .map(([category, { correct, total }]) => ({
        category,
        correct,
        total,
        accuracy: total > 0 ? correct / total : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
  }

  suggestFocus(weakAreas: WeakArea[], language: string): string {
    const lang = normalizeLanguage(language)
    const strings = TEMPLATE_STRINGS[lang]
    if (weakAreas.length === 0) return strings.noWeakAreas

    const weakest = weakAreas[0]
    const categoryName = CATEGORY_NAMES[lang][weakest.category]
    const percent = Math.round(weakest.accuracy * 100)
    const focusOn = interpolate(strings.focusOn, { category: categoryName })
    const accuracy = interpolate(strings.accuracyPercent, { percent: String(percent) })
    return `${focusOn} ${accuracy}`
  }
}
