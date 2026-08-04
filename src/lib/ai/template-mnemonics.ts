import type { Question } from '@/types'
import type { MnemonicProvider } from './interfaces'
import {
  CATEGORY_NAMES,
  TEMPLATE_STRINGS,
  normalizeLanguage,
} from './template-strings'

/**
 * Template-based {@link MnemonicProvider}.
 *
 * Anchors a short memory hook on the category name and a "notable term"
 * extracted from the correct answer (first word of at least 4 letters,
 * falling back to the first word). Pure string templating — no NLP, no ML.
 */
export class TemplateMnemonicProvider implements MnemonicProvider {
  generateMnemonic(question: Question, language: string): string {
    const lang = normalizeLanguage(language)
    const strings = TEMPLATE_STRINGS[lang]
    const categoryName = CATEGORY_NAMES[lang][question.category]
    const keyword = extractKeyword(question, lang)
    return `${strings.mnemonicPrefix} ${categoryName} ${strings.mnemonicInvolve} ${keyword}.`
  }
}

/** Pulls a notable term out of the correct answer's localized text. */
function extractKeyword(question: Question, lang: 'de' | 'en' | 'pt-BR'): string {
  const answer = question.answers[question.correctAnswerIndex]
  const text = answer?.text[lang] ?? answer?.text.de ?? ''
  const words = text
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter((w) => w.length > 0)
  // Prefer a "notable" term (>= 4 chars) over short connectors/articles.
  return words.find((w) => w.length >= 4) ?? words[0] ?? 'topic'
}
