import type { Language, QuestionCategory } from '@/types'

/**
 * Embedded, localized template strings for the template-based AI providers.
 *
 * These strings MIRROR `public/locales/{de,en,pt-BR}/ai.json` (and the
 * category names in `categories.json`) so the pure, non-React provider classes
 * can produce localized output without depending on the i18next runtime.
 * Placeholders use `{{key}}` in both places for easy comparison. When the real
 * LLM integration lands, this module is replaced by API-backed providers and
 * the JSON files remain the UI-facing source of truth.
 */

export interface TemplateStrings {
  title: string
  correctAnswerIs: string
  categoryHint: string
  mnemonicPrefix: string
  mnemonicInvolve: string
  focusSuggestion: string
  noWeakAreas: string
  focusOn: string
  accuracyPercent: string
  weakAreasTitle: string
  mnemonicLabel: string
}

export const TEMPLATE_STRINGS: Record<Language, TemplateStrings> = {
  de: {
    title: 'KI-Assistent',
    correctAnswerIs: 'Die richtige Antwort ist',
    categoryHint:
      'Wiederhole die Kernkonzepte dieser Kategorie, um dein Verständnis zu festigen.',
    mnemonicPrefix: 'Merke:',
    mnemonicInvolve: 'Fragen betreffen oft',
    focusSuggestion: 'Empfehlung für den Lernfokus',
    noWeakAreas: 'Weiter so! Es wurden keine Schwachstellen erkannt.',
    focusOn: 'Konzentriere dich auf {{category}} — deine Genauigkeit beträgt',
    accuracyPercent: '{{percent}}% dort.',
    weakAreasTitle: 'Empfohlener Schwerpunkt',
    mnemonicLabel: 'Merkhilfe:',
  },
  en: {
    title: 'AI Assistant',
    correctAnswerIs: 'The correct answer is',
    categoryHint:
      'Review this category’s key concepts to strengthen your understanding.',
    mnemonicPrefix: 'Remember:',
    mnemonicInvolve: 'questions often involve',
    focusSuggestion: 'Focus suggestion',
    noWeakAreas: 'Keep studying! No weak areas detected.',
    focusOn: 'Focus on {{category}} — your accuracy is',
    accuracyPercent: '{{percent}}% there.',
    weakAreasTitle: 'Suggested focus area',
    mnemonicLabel: 'Mnemonic:',
  },
  'pt-BR': {
    title: 'Assistente de IA',
    correctAnswerIs: 'A resposta correta é',
    categoryHint:
      'Revise os conceitos-chave desta categoria para reforçar seu entendimento.',
    mnemonicPrefix: 'Lembre-se:',
    mnemonicInvolve: 'perguntas frequentemente envolvem',
    focusSuggestion: 'Sugestão de foco',
    noWeakAreas: 'Continue estudando! Nenhuma área fraca detectada.',
    focusOn: 'Concentre-se em {{category}} — sua precisão é',
    accuracyPercent: '{{percent}}% lá.',
    weakAreasTitle: 'Área de foco sugerida',
    mnemonicLabel: 'Mnemônico:',
  },
}

/** Localized names for the five official exam categories. */
export const CATEGORY_NAMES: Record<Language, Record<QuestionCategory, string>> = {
  de: {
    fischkunde_und_hege: 'Fischkunde und Hege',
    pflege_der_fischgewaesser: 'Pflege der Fischgewässer',
    fanggeraete_und_deren_gebrauch: 'Fanggeräte und deren Gebrauch',
    behandlung_der_gefangenen_fische: 'Behandlung der gefangenen Fische',
    einschlaegige_rechtsvorschriften: 'Einschlägige Rechtsvorschriften',
  },
  en: {
    fischkunde_und_hege: 'Fish Biology and Conservation',
    pflege_der_fischgewaesser: 'Waterbody Management',
    fanggeraete_und_deren_gebrauch: 'Fishing Gear and Its Use',
    behandlung_der_gefangenen_fische: 'Handling of Caught Fish',
    einschlaegige_rechtsvorschriften: 'Relevant Legislation',
  },
  'pt-BR': {
    fischkunde_und_hege: 'Biologia e Conservação dos Peixes',
    pflege_der_fischgewaesser: "Gestão de Corpos d'Água",
    fanggeraete_und_deren_gebrauch: 'Equipamentos de Pesca e seu Uso',
    behandlung_der_gefangenen_fische: 'Manuseio dos Peixes Capturados',
    einschlaegige_rechtsvorschriften: 'Legislação Aplicável',
  },
}

const SUPPORTED: readonly Language[] = ['de', 'en', 'pt-BR']

/** Maps an arbitrary language string to a supported Language (falls back to 'de'). */
export function normalizeLanguage(language: string): Language {
  return (SUPPORTED as readonly string[]).includes(language)
    ? (language as Language)
    : 'de'
}

/** Replaces `{{key}}` placeholders in a template with the given values. */
export function interpolate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    key in values ? values[key] : match,
  )
}
