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
  pwa: {
    offlineReady: string
    newVersion: string
    refresh: string
    dismiss: string
  }
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

export interface StatsResources {
  title: string
  totalStudied: string
  overallAccuracy: string
  currentStreak: string
  questionsReviewed: string
  categoryPerformance: string
  accuracyOverTime: string
  streakCalendar: string
  accuracyLabel: string
  days_one: string
  days_other: string
  last7Days: string
  last30Days: string
  allTime: string
  empty: string
  emptyMessage: string
  goToStudy: string
  noData: string
}

export interface ImportResources {
  title: string
  dropzone: string
  browse: string
  orDrop: string
  processing: string
  validQuestions: string
  errorsFound: string
  newQuestions: string
  updatedQuestions: string
  importConfirm: string
  cancel: string
  importSuccess: string
  importedCount: string
  noErrors: string
  invalidJson: string
  questionIndex: string
  fileTooLarge: string
  tryAgain: string
  selectFile: string
}

export interface ExportResources {
  title: string
  description: string
  section: {
    notes: string
    favorites: string
    statistics: string
    progress: string
    examHistory: string
    flashcards: string
    settings: string
  }
  exportAll: string
  export: string
  noData: string
  exporting: string
  done: string
  filename: string
}

export interface SettingsResources {
  title: string
  themeLabel: string
  languageLabel: string
  dailyReviewCapLabel: string
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
      stats: StatsResources
      search: Record<string, unknown>
      favorites: FavoritesResources
      notes: NotesResources
      flashcards: Record<string, unknown>
      encyclopedia: Record<string, unknown>
      glossary: Record<string, unknown>
      import: ImportResources
      export: ExportResources
      settings: SettingsResources
      ai: Record<string, unknown>
    }
  }
}

/** Loose fallback type for keys that are not yet deeply typed. */
export type TranslationKey = string
