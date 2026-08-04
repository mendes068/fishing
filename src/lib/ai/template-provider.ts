import type { Question } from '@/types'
import type { QuestionExplanationProvider } from './interfaces'
import {
  TEMPLATE_STRINGS,
  normalizeLanguage,
} from './template-strings'

/**
 * Template-based {@link QuestionExplanationProvider}.
 *
 * Returns the question's pre-written explanation when one exists for the
 * requested language; otherwise it assembles a deterministic localized
 * fallback from the correct answer and a generic category hint. This is a
 * placeholder for a future LLM-backed implementation — no AI, no network.
 */
export class TemplateExplanationProvider implements QuestionExplanationProvider {
  explain(
    question: Question,
    _userAnswerIndex: number | null,
    language: string,
  ): string {
    const lang = normalizeLanguage(language)
    const preWritten = question.explanation[lang]
    if (preWritten && preWritten.trim().length > 0) return preWritten

    const strings = TEMPLATE_STRINGS[lang]
    const answerText =
      question.answers[question.correctAnswerIndex]?.text[lang] ??
      question.answers[question.correctAnswerIndex]?.text.de ??
      ''
    return `${strings.correctAnswerIs} ${answerText}. ${strings.categoryHint}`
  }
}
