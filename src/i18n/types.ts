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
  reviewWeakAreas: string
  studiedOf: string
  scoreOf: string
}

export interface StudyResources {
  title: string
  modeLabel: string
  categoryLabel: string
  questionCounter: string
  showExplanation: string
  favoritesOnly: string
  incorrectOnly: string
  sequential: string
  random: string
  allCategories: string
  noQuestions: string
  loading: string
  resetFilters: string
  correct: string
  incorrect: string
  explanation: string
  favoriteAdd: string
  favoriteRemove: string
  noteAdd: string
  noteRemove: string
}

export interface FavoritesResources {
  title: string
  empty: string
  emptyMessage: string
  goToStudy: string
  remove: string
  count: string
  searchPlaceholder: string
  allCategories: string
  categoryLabel: string
  filteredEmpty: string
}

export interface NotesResources {
  title: string
  empty: string
  emptyMessage: string
  goToStudy: string
  addNote: string
  editNote: string
  save: string
  cancel: string
  delete: string
  preview: string
  edit: string
  searchPlaceholder: string
  noteForQuestion: string
  noNotes: string
}

export interface CategoriesResources {
  title: string
  names: {
    fischkunde_und_hege: string
    pflege_der_fischgewaesser: string
    fanggeraete_und_deren_gebrauch: string
    behandlung_der_gefangenen_fische: string
    einschlaegige_rechtsvorschriften: string
  }
  descriptions: {
    fischkunde_und_hege: string
    pflege_der_fischgewaesser: string
    fanggeraete_und_deren_gebrauch: string
    behandlung_der_gefangenen_fische: string
    einschlaegige_rechtsvorschriften: string
  }
  answeredOf: string
  accuracy: string
  studyCategory: string
  noProgress: string
  questionsTotal: string
  noQuestions: string
  correctLabel: string
  answeredLabel: string
}

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: CommonResources
      errors: ErrorsResources
      dashboard: DashboardResources
      study: StudyResources
      exam: Record<string, unknown>
      categories: CategoriesResources
      stats: Record<string, unknown>
      search: Record<string, unknown>
      favorites: FavoritesResources
      notes: NotesResources
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
