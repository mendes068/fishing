import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDataStore } from '@/store/data.store'
import { useSettingsStore } from '@/store/settings.store'
import type { FishSpecies, GlossaryTerm, Question } from '@/types'

/**
 * Minimal stand-in for `fetch` responses. The data store only touches
 * `res.ok` and `res.json()`, so a plain object is sufficient and avoids
 * relying on the jsdom environment exposing a real `Response` constructor.
 */
function jsonResponse(
  data: unknown,
  ok = true,
  status = 200,
): { ok: boolean; status: number; json: () => Promise<unknown> } {
  return { ok, status, json: async () => data }
}

const question = (id: string): Question => ({
  id,
  category: 'fischkunde_und_hege',
  questionText: { de: '?', en: '?', 'pt-BR': '?' },
  answers: [
    { text: { de: 'a', en: 'a', 'pt-BR': 'a' } },
    { text: { de: 'b', en: 'b', 'pt-BR': 'b' } },
    { text: { de: 'c', en: 'c', 'pt-BR': 'c' } },
  ],
  correctAnswerIndex: 0,
  explanation: { de: 'x', en: 'x', 'pt-BR': 'x' },
  tags: [],
  fishRefs: [],
})

const fish = (id: string): FishSpecies => ({
  id,
  scientificName: 'Testus spec.',
  commonNames: { de: id, en: id, 'pt-BR': id },
  habitat: { de: id, en: id, 'pt-BR': id },
  maxSize: 100,
  minCatchSize: null,
  closedSeason: null,
  distinguishingFeatures: { de: id, en: id, 'pt-BR': id },
  imagePath: '',
  protectedStatus: false,
  category: 'common',
})

const glossary = (id: string): GlossaryTerm => ({
  id,
  term: { de: id, en: id, 'pt-BR': id },
  definition: { de: id, en: id, 'pt-BR': id },
  category: 'biology',
  relatedTermIds: [],
  seeAlso: [],
})

describe('data store loading (mocked fetch)', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Reset store to the pre-load state between tests.
    useDataStore.setState({
      questions: null,
      fish: null,
      glossary: null,
      loading: false,
      error: null,
    })
    useSettingsStore.setState({ language: 'de' })

    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('isLoaded() is false before any load', () => {
    expect(useDataStore.getState().isLoaded()).toBe(false)
  })

  it('loadAll fetches questions, fish and glossary for the current language', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/questions/')) {
        return Promise.resolve(jsonResponse({ q1: question('q1') }))
      }
      if (url.includes('/fish/')) {
        return Promise.resolve(jsonResponse({ f1: fish('f1') }))
      }
      return Promise.resolve(jsonResponse({ g1: glossary('g1') }))
    })

    await useDataStore.getState().loadAll()

    const calls = fetchMock.mock.calls.map((c) => String(c[0]))
    expect(calls.some((u) => u.includes('/data/questions/de.json'))).toBe(true)
    expect(calls.some((u) => u.includes('/data/fish/de.json'))).toBe(true)
    expect(calls.some((u) => u.includes('/data/glossary/de.json'))).toBe(true)
  })

  it('isLoaded() is true after a successful loadAll', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ q1: question('q1') }))

    await useDataStore.getState().loadAll()

    expect(useDataStore.getState().isLoaded()).toBe(true)
    expect(useDataStore.getState().error).toBeNull()
  })

  it('language change → loadAll fetches the new language files', async () => {
    useSettingsStore.setState({ language: 'pt-BR' })
    fetchMock.mockResolvedValue(jsonResponse({ q1: question('q1') }))

    await useDataStore.getState().loadAll()

    const urls = fetchMock.mock.calls.map((c) => String(c[0]))
    expect(urls.every((u) => u.includes('/pt-BR.json'))).toBe(true)
    expect(urls.some((u) => u.includes('/data/questions/pt-BR.json'))).toBe(true)
    expect(urls.some((u) => u.includes('/data/fish/pt-BR.json'))).toBe(true)
    expect(urls.some((u) => u.includes('/data/glossary/pt-BR.json'))).toBe(true)
    expect(urls.some((u) => u.includes('/de.json'))).toBe(false)
  })

  it('loadQuestions stores the fetched record keyed by id', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ q1: question('q1'), q2: question('q2') }))

    await useDataStore.getState().loadQuestions()

    expect(Object.keys(useDataStore.getState().questions ?? {})).toEqual(['q1', 'q2'])
    expect(useDataStore.getState().loading).toBe(false)
  })

  it('loadFish stores the fetched record keyed by id', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ f1: fish('f1') }))

    await useDataStore.getState().loadFish()

    expect(useDataStore.getState().fish?.['f1']?.scientificName).toBe('Testus spec.')  })

  it('loadGlossary stores the fetched record keyed by id', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ g1: glossary('g1') }))

    await useDataStore.getState().loadGlossary()

    expect(useDataStore.getState().glossary?.['g1']?.term.de).toBe('g1')
  })

  it('normalizes an array payload into an id-keyed record', async () => {
    fetchMock.mockResolvedValue(jsonResponse([question('a'), question('b')]))

    await useDataStore.getState().loadQuestions()

    expect(Object.keys(useDataStore.getState().questions ?? {})).toEqual(['a', 'b'])
  })

  it('normalizes a QuestionBank-style envelope into an id-keyed record', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ version: 1, questions: [question('x')] }))

    await useDataStore.getState().loadQuestions()

    expect(Object.keys(useDataStore.getState().questions ?? {})).toEqual(['x'])
  })

  it('fetch failure sets the error state instead of throwing', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))

    await expect(useDataStore.getState().loadQuestions()).resolves.toBeUndefined()

    const s = useDataStore.getState()
    expect(s.error).toContain('network down')
    expect(s.questions).toEqual({})
    expect(s.loading).toBe(false)
  })

  it('non-OK HTTP response sets the error state with the status code', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 404))

    await useDataStore.getState().loadQuestions()

    expect(useDataStore.getState().error).toContain('HTTP 404')
  })

  it('a failed loadAll still resolves and reports the error', async () => {
    fetchMock.mockRejectedValue(new Error('boom'))

    await expect(useDataStore.getState().loadAll()).resolves.toBeUndefined()

    const s = useDataStore.getState()
    expect(s.loading).toBe(false)
    expect(s.error).toBe('boom')
    // A failed load substitutes empty records (per store design) so the UI can
    // render empty states — isLoaded() therefore reports true.
    expect(s.isLoaded()).toBe(true)
  })
})
