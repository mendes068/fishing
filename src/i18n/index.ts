import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import HttpBackend from 'i18next-http-backend'

export const NAMESPACES = [
  'common',
  'dashboard',
  'study',
  'exam',
  'categories',
  'stats',
  'search',
  'favorites',
  'notes',
  'flashcards',
  'encyclopedia',
  'glossary',
  'import',
  'export',
  'settings',
  'errors',
  'ai',
] as const

export type Namespace = (typeof NAMESPACES)[number]

export const SUPPORTED_LANGUAGES = ['de', 'en', 'pt-BR'] as const

void i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'de',
    supportedLngs: SUPPORTED_LANGUAGES,
    ns: NAMESPACES,
    defaultNS: 'common',
    // `load: 'languageOnly'` would strip 'pt-BR' to 'pt' (absent from
    // supportedLngs), silently falling back to German. Keep the full code so
    // 'pt-BR' loads as-is; 'en-US' still resolves to 'en' via the hierarchy.
    backend: {
      loadPath: `${import.meta.env.BASE_URL}locales/{{lng}}/{{ns}}.json`,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: true,
    },
  })

export default i18n
