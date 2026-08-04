import type { Question, QuestionCategory } from '@/types'

/**
 * AI integration contracts for the fishing-exam study app.
 *
 * These interfaces are the stable architecture: each consumer depends on the
 * abstract capability, and the concrete implementation can later be swapped
 * from a template-based local provider to a real LLM-backed one without
 * touching any UI code. Currently only template-based implementations exist
 * (see ./template-*.ts) — no network calls, no external AI libraries.
 */

/** Explains why the correct answer is correct, in the requested language. */
export interface QuestionExplanationProvider {
  /**
   * @param question the question being explained
   * @param userAnswerIndex the answer the user picked (0-based), or null when
   *   the question was not answered (e.g. skipped in an exam review)
   * @param language the ISO language code ('de' | 'en' | 'pt-BR')
   * @returns localized explanation text
   */
  explain(
    question: Question,
    userAnswerIndex: number | null,
    language: string,
  ): string
}

/** Generates a short memory hook for a question's correct answer. */
export interface MnemonicProvider {
  /**
   * @param question the question to build a mnemonic for
   * @param language the ISO language code ('de' | 'en' | 'pt-BR')
   * @returns a localized, keyword-anchored mnemonic string
   */
  generateMnemonic(question: Question, language: string): string
}

/** Per-category accuracy summary, weakest (lowest accuracy) first. */
export interface WeakArea {
  category: QuestionCategory
  accuracy: number // 0..1
  correct: number
  total: number
}

/** Analyzes study progress and proposes what to focus on next. */
export interface LearningAssistant {
  /**
   * Groups past question results by category and returns per-category
   * accuracy, sorted ascending (weakest category first). Only categories
   * with at least one recorded result are included.
   */
  analyzeWeaknesses(progress: {
    results: Record<string, { correct: boolean; category: QuestionCategory }>
  }): WeakArea[]
  /**
   * @param weakAreas output of {@link analyzeWeaknesses} (already sorted)
   * @param language the ISO language code ('de' | 'en' | 'pt-BR')
   * @returns a localized study-focus recommendation
   */
  suggestFocus(weakAreas: WeakArea[], language: string): string
}
