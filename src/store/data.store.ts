import { create } from 'zustand'
import type { FishSpecies, GlossaryTerm, Question } from '@/types'
import { useSettingsStore } from './settings.store'

export interface DataState {
  questions: Record<string, Question> | null
  fish: Record<string, FishSpecies> | null
  glossary: Record<string, GlossaryTerm> | null
  loading: boolean
  error: string | null
  loadAll: () => Promise<void>
  loadQuestions: () => Promise<void>
  loadFish: () => Promise<void>
  loadGlossary: () => Promise<void>
  isLoaded: () => boolean
}

const EMPTY_RECORD: Record<string, never> = {}

/**
 * Fetch a JSON file and normalize it to a record keyed by `id`. Accepts:
 * - a plain record `{ [id]: T }`
 * - an array of `T`
 * - a `QuestionBank`-style `{ version, questions: T[] }` envelope
 */
async function fetchByIdRecord<T extends { id: string }>(
  url: string,
): Promise<Record<string, T>> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`)
  }
  const raw: unknown = await res.json()

  if (Array.isArray(raw)) {
    const out: Record<string, T> = {}
    for (const item of raw as T[]) out[item.id] = item
    return out
  }

  const obj = (raw ?? {}) as Record<string, unknown>
  if (Array.isArray(obj.questions)) {
    const out: Record<string, T> = {}
    for (const item of obj.questions as T[]) out[item.id] = item
    return out
  }

  return obj as Record<string, T>
}

export const useDataStore = create<DataState>()((set, get) => ({
  questions: null,
  fish: null,
  glossary: null,
  loading: false,
  error: null,

  loadAll: async () => {
    set({ loading: true, error: null })
    const { loadQuestions, loadFish, loadGlossary } = get()
    await Promise.allSettled([loadQuestions(), loadFish(), loadGlossary()])
    set({ loading: false })
  },

  loadQuestions: async () => {
    const lang = useSettingsStore.getState().language
    set({ loading: true, error: null })
    try {
      const questions = await fetchByIdRecord<Question>(
        `${import.meta.env.BASE_URL}data/questions/${lang}.json`,
      )
      set({ questions, loading: false })
    } catch (err) {
      set({
        questions: EMPTY_RECORD as Record<string, Question>,
        error: err instanceof Error ? err.message : String(err),
        loading: false,
      })
    }
  },

  loadFish: async () => {
    const lang = useSettingsStore.getState().language
    set({ loading: true, error: null })
    try {
      const fish = await fetchByIdRecord<FishSpecies>(
        `${import.meta.env.BASE_URL}data/fish/${lang}.json`,
      )
      set({ fish, loading: false })
    } catch (err) {
      set({
        fish: EMPTY_RECORD as Record<string, FishSpecies>,
        error: err instanceof Error ? err.message : String(err),
        loading: false,
      })
    }
  },

  loadGlossary: async () => {
    const lang = useSettingsStore.getState().language
    set({ loading: true, error: null })
    try {
      const glossary = await fetchByIdRecord<GlossaryTerm>(
        `${import.meta.env.BASE_URL}data/glossary/${lang}.json`,
      )
      set({ glossary, loading: false })
    } catch (err) {
      set({
        glossary: EMPTY_RECORD as Record<string, GlossaryTerm>,
        error: err instanceof Error ? err.message : String(err),
        loading: false,
      })
    }
  },

  isLoaded: () =>
    get().questions !== null && get().fish !== null && get().glossary !== null,
}))
