import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  STORAGE_KEYS,
  STORAGE_VERSION,
  clearState,
  getStorageUsage,
  isQuotaExceeded,
  loadState,
  saveState,
} from '@/lib/storage'

describe('versioned LocalStorage layer', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('saveState writes a versioned JSON envelope via localStorage.setItem', () => {
    const setSpy = vi.spyOn(Storage.prototype, 'setItem')
    const ok = saveState('my-key', { theme: 'dark', cap: 50 }, 2)
    expect(ok).toBe(true)
    expect(setSpy).toHaveBeenCalledWith(
      'my-key',
      JSON.stringify({ version: 2, data: { theme: 'dark', cap: 50 } }),
    )
    // Round-trip through the real storage to confirm the envelope shape.
    const raw = localStorage.getItem('my-key')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!)).toEqual({
      version: 2,
      data: { theme: 'dark', cap: 50 },
    })
  })

  it('loadState returns saved data (roundtrip)', () => {
    saveState('k', { a: 1, b: [2, 3] })
    expect(loadState('k', { a: 0, b: [] })).toEqual({ a: 1, b: [2, 3] })
  })

  it('loadState with corrupted JSON returns fallback and never throws', () => {
    localStorage.setItem('k', 'not-json{{{')
    expect(() => loadState('k', 'fallback')).not.toThrow()
    expect(loadState('k', 'fallback')).toBe('fallback')
    // Also: valid JSON that is not one of our envelopes.
    localStorage.setItem('k2', JSON.stringify({ state: { theme: 'dark' } }))
    expect(loadState('k2', 'fallback')).toBe('fallback')
  })

  it('loadState with an older version + migrate upgrades and saves v2', () => {
    saveState('k', { legacy: true }, 0)
    const migrated = loadState('k', { modern: false }, 1, (old) => ({
      modern: Boolean((old as { legacy?: boolean })?.legacy),
    }))
    expect(migrated).toEqual({ modern: true })
    // The upgraded value is persisted under the current version.
    const raw = JSON.parse(localStorage.getItem('k')!)
    expect(raw.version).toBe(1)
    expect(raw.data).toEqual({ modern: true })
  })

  it('loadState with an older version but no migrate returns fallback', () => {
    saveState('k', { legacy: true }, 0)
    expect(loadState('k', 'fallback', 1)).toBe('fallback')
  })

  it('isQuotaExceeded detects quota DOMException and Firefox error', () => {
    expect(isQuotaExceeded(new DOMException('full', 'QuotaExceededError'))).toBe(
      true,
    )
    expect(
      isQuotaExceeded(
        Object.assign(new Error('quota'), { name: 'NS_ERROR_DOM_QUOTA_REACHED' }),
      ),
    ).toBe(true)
    expect(isQuotaExceeded(new Error('boom'))).toBe(false)
    expect(isQuotaExceeded('not an error')).toBe(false)
  })

  it('clearState removes the key', () => {
    saveState('k', 1)
    expect(localStorage.getItem('k')).not.toBeNull()
    clearState('k')
    expect(localStorage.getItem('k')).toBeNull()
  })

  it('getStorageUsage reports sane numbers (percentage 0-100)', () => {
    localStorage.clear()
    const empty = getStorageUsage()
    expect(empty.used).toBeGreaterThanOrEqual(0)
    expect(empty.total).toBeGreaterThan(0)
    expect(empty.percentage).toBeGreaterThanOrEqual(0)
    expect(empty.percentage).toBeLessThanOrEqual(100)

    saveState('big', { payload: 'x'.repeat(5000) })
    const after = getStorageUsage()
    expect(after.used).toBeGreaterThan(empty.used)
    expect(after.percentage).toBeGreaterThanOrEqual(0)
    expect(after.percentage).toBeLessThanOrEqual(100)
  })

  it('saveState returns false (no throw) when setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('storage full', 'QuotaExceededError')
    })
    expect(() => saveState('k', { big: true })).not.toThrow()
    expect(saveState('k', { big: true })).toBe(false)
  })

  it('exposes STORAGE_VERSION and the canonical store keys', () => {
    expect(STORAGE_VERSION).toBe(1)
    expect(STORAGE_KEYS).toEqual({
      settings: 'fishing-settings',
      question: 'fishing-question',
      exam: 'fishing-exam',
      progress: 'fishing-progress',
      favorites: 'fishing-favorites',
      notes: 'fishing-notes',
      flashcard: 'fishing-flashcard',
    })
  })
})
