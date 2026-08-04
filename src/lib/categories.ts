import type { QuestionCategory } from '@/types'

/** Ordered list of the 5 official Brandenburg exam categories. */
export const CATEGORY_ORDER: QuestionCategory[] = [
  'fischkunde_und_hege',
  'pflege_der_fischgewaesser',
  'fanggeraete_und_deren_gebrauch',
  'behandlung_der_gefangenen_fische',
  'einschlaegige_rechtsvorschriften',
]

/** i18n key suffix for each category name (e.g. `categories:names.fischkunde_und_hege`). */
export const CATEGORY_NAME_KEYS: Record<QuestionCategory, string> = {
  fischkunde_und_hege: 'names.fischkunde_und_hege',
  pflege_der_fischgewaesser: 'names.pflege_der_fischgewaesser',
  fanggeraete_und_deren_gebrauch: 'names.fanggeraete_und_deren_gebrauch',
  behandlung_der_gefangenen_fische: 'names.behandlung_der_gefangenen_fische',
  einschlaegige_rechtsvorschriften: 'names.einschlaegige_rechtsvorschriften',
}

/** i18n key suffix for each category description (e.g. `categories:descriptions.fischkunde_und_hege`). */
export const CATEGORY_DESC_KEYS: Record<QuestionCategory, string> = {
  fischkunde_und_hege: 'descriptions.fischkunde_und_hege',
  pflege_der_fischgewaesser: 'descriptions.pflege_der_fischgewaesser',
  fanggeraete_und_deren_gebrauch: 'descriptions.fanggeraete_und_deren_gebrauch',
  behandlung_der_gefangenen_fische: 'descriptions.behandlung_der_gefangenen_fische',
  einschlaegige_rechtsvorschriften: 'descriptions.einschlaegige_rechtsvorschriften',
}
