import 'i18next'

/**
 * Type augmentation for i18next translation keys.
 *
 * All 17 namespaces (common, dashboard, study, exam, categories, stats,
 * search, favorites, notes, flashcards, encyclopedia, glossary, import,
 * export, settings, errors, ai) are fully typed so `t('key')` is checked at
 * compile time across every namespace.
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
  a11y: { skipToContent: string }
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
  compareLabel: string
  compareOff: string
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
  chartRadarLabel: string
  chartLineLabel: string
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

export interface ExamResources {
  title: string
  rules: {
    title: string
    intro: string
    questionCount: string
    categories: string
    duration: string
    passCriteria: string
    shuffled: string
    autoSubmit: string
  }
  startExam: string
  question: string
  of: string
  answered: string
  unanswered: string
  submitExam: string
  confirmSubmit: {
    title: string
    description: string
    yesSubmit: string
    cancel: string
  }
  timeRemaining: string
  oneMinuteWarning: string
  timeUp: string
  result: {
    passed: string
    failed: string
    score: string
    categoryBreakdown: string
    timeUsed: string
    reviewAnswers: string
    backToDashboard: string
    passCriteria: string
  }
  resume: {
    title: string
    prompt: string
    resume: string
    abandon: string
  }
  languageLocked: string
  noQuestions: string
  backWarning: string
  navigator: {
    current: string
    answered: string
    unanswered: string
    label: string
  }
  review: {
    title: string
    correct: string
    incorrect: string
    yourAnswer: string
    correctAnswer: string
    notAnswered: string
    explanation: string
  }
}

export interface SearchResources {
  title: string
  searchPlaceholder: string
  clear: string
  resultsFor: string
  resultsCount: string
  questions: string
  fishSpecies: string
  glossaryTerms: string
  noResults: string
  noResultsFor: string
  noResultsSuggestion: string
  hint: string
  searchHint: string
  loading: string
}

export interface FlashcardsResources {
  title: string
  front: string
  back: string
  flipHint: string
  blackout: string
  wrong: string
  almost: string
  hard: string
  good: string
  easy: string
  reviewedToday: string
  dueToday: string
  moreDue: string
  nextReview: string
  allCaughtUp: string
  noCards: string
  studyStreak: string
  qualityHint: string
  answer: string
  explanationLabel: string
  totalCards: string
  progress: string
  questionCount: string
  categoryLabel: string
}

export interface EncyclopediaResources {
  title: string
  searchPlaceholder: string
  filterAll: string
  filterProtected: string
  filterCommon: string
  scientificName: string
  commonNames: string
  habitat: string
  maxSize: string
  minCatchSize: string
  noMinSize: string
  closedSeason: string
  noClosedSeason: string
  distinguishingFeatures: string
  protected: string
  common: string
  relatedQuestions: string
  noRelatedQuestions: string
  notFound: string
  back: string
  sortByName: string
  sortByScientific: string
  alphabetical: string
  noResults: string
  imagePlaceholder: string
  details: string
  sizeUnit: string
  seasonFormat: string
  category: string
  speciesCount: string
  speciesCount_zero: string
  speciesCount_one: string
  speciesCount_other: string
}

export interface GlossaryResources {
  title: string
  searchPlaceholder: string
  filterAll: string
  filterEquipment: string
  filterBiology: string
  filterLegal: string
  filterTechnique: string
  definition: string
  seeAlso: string
  noResults: string
  loading: string
}

export interface AiResources {
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

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: CommonResources
      errors: ErrorsResources
      dashboard: DashboardResources
      study: StudyResources
      exam: ExamResources
      categories: CategoriesResources
      stats: StatsResources
      search: SearchResources
      favorites: FavoritesResources
      notes: NotesResources
      flashcards: FlashcardsResources
      encyclopedia: EncyclopediaResources
      glossary: GlossaryResources
      import: ImportResources
      export: ExportResources
      settings: SettingsResources
      ai: AiResources
    }
  }
}

/** Loose fallback type for keys that are not yet deeply typed. */
export type TranslationKey = string
