import 'i18next'

/**
 * Type augmentation for i18next translation keys.
 *
 * Fully-typed namespaces (common, errors, dashboard) get explicit interfaces so
 * `t('common:app.name')` is checked at compile time. Placeholder namespaces
 * (filled in Task 30) are typed as `Record<string, unknown>` for now — keys are
 * accepted but not deeply validated until their JSON files are completed.
 */

export interface CommonResources {
  app: { name: string }
  nav: {
    dashboard: string
    study: string
    exam: string
    categories: string
    stats: string
    search: string
    favorites: string
    notes: string
    flashcards: string
    encyclopedia: string
    glossary: string
    import: string
    settings: string
    menu: string
    expand: string
    collapse: string
  }
  theme: { toggle: string; light: string; dark: string }
  lang: { label: string }
  loading: string
  back: string
  next: string
  previous: string
  save: string
  cancel: string
  confirm: string
  search: string
  all: string
  yes: string
  no: string
  close: string
  reset: string
}

export interface ErrorsResources {
  generic: string
  notFound: { title: string; message: string }
  unexpected: string
  retry: string
  storageFull: string
}

export interface DashboardResources {
  title: string
  progress: string
  accuracy: string
  streak: string
  lastExam: string
  noExams: string
  continueStudying: string
  startExam: string
  weakCategories: string
  empty: { title: string; message: string }
  startStudying: string
}

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: CommonResources
      errors: ErrorsResources
      dashboard: DashboardResources
      study: Record<string, unknown>
      exam: Record<string, unknown>
      categories: Record<string, unknown>
      stats: Record<string, unknown>
      search: Record<string, unknown>
      favorites: Record<string, unknown>
      notes: Record<string, unknown>
      flashcards: Record<string, unknown>
      encyclopedia: Record<string, unknown>
      glossary: Record<string, unknown>
      import: Record<string, unknown>
      export: Record<string, unknown>
      settings: Record<string, unknown>
      ai: Record<string, unknown>
    }
  }
}

/** Loose fallback type for keys that are not yet deeply typed. */
export type TranslationKey = string
