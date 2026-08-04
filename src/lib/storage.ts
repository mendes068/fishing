/**
 * Versioned LocalStorage persistence layer.
 *
 * Every value is stored inside a `{ version, data }` envelope so that schema
 * changes can be handled through explicit migrations instead of silent data
 * loss. ALL localStorage access is wrapped in try/catch — this module never
 * throws, even when storage is unavailable, corrupted, or full.
 */

export const STORAGE_VERSION = 1

/** Versioned envelope persisted under each key. */
export interface StoredEnvelope<T> {
  version: number
  data: T
}

/** Canonical localStorage keys shared with the Zustand persist stores. */
export const STORAGE_KEYS = {
  settings: 'fishing-settings',
  question: 'fishing-question',
  exam: 'fishing-exam',
  progress: 'fishing-progress',
  favorites: 'fishing-favorites',
  notes: 'fishing-notes',
  flashcard: 'fishing-flashcard',
} as const

/** Default storage quota estimate (5 MB, per the HTML5 spec). */
const DEFAULT_QUOTA = 5 * 1024 * 1024

/** Cached `navigator.storage.estimate().quota` once resolved. */
let estimatedQuota: number | null = null

function isEnvelope(value: unknown): value is StoredEnvelope<unknown> {
  if (value === null || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return typeof record.version === 'number' && 'data' in record
}

/**
 * Detect a storage-quota error across browsers:
 * - Chrome/Safari: DOMException with name `QuotaExceededError` (code 22)
 * - Firefox: `NS_ERROR_DOM_QUOTA_REACHED`
 */
export function isQuotaExceeded(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'QuotaExceededError' || error.code === 22
  }
  if (error instanceof Error) {
    return error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
  }
  return false
}

/**
 * Serialize `data` into a `{ version, data }` envelope and write it to
 * localStorage. Returns `false` (without throwing) when the write fails,
 * e.g. on quota exceeded or when storage is unavailable.
 */
export function saveState<T>(
  key: string,
  data: T,
  version: number = STORAGE_VERSION,
): boolean {
  try {
    const envelope: StoredEnvelope<T> = { version, data }
    window.localStorage.setItem(key, JSON.stringify(envelope))
    return true
  } catch (error) {
    if (isQuotaExceeded(error)) {
      console.warn(`[storage] quota exceeded while saving "${key}"`)
    } else {
      console.warn(`[storage] failed to save "${key}"`, error)
    }
    return false
  }
}

/**
 * Read and decode a versioned envelope from localStorage.
 *
 * - No entry or corrupted JSON → returns `fallback` (never throws)
 * - Matching version → returns the stored data
 * - Older version + `migrate` → runs the migration, persists the upgraded
 *   value under the current version, and returns the result
 * - Version mismatch without `migrate` → returns `fallback`
 */
export function loadState<T>(
  key: string,
  fallback: T,
  version: number = STORAGE_VERSION,
  migrate?: (old: unknown) => T,
): T {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(key)
  } catch (error) {
    console.warn(`[storage] failed to read "${key}"`, error)
    return fallback
  }

  if (raw === null) return fallback

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    console.warn(`[storage] corrupted JSON for "${key}", using fallback`)
    return fallback
  }

  if (!isEnvelope(parsed)) {
    console.warn(`[storage] unrecognized data for "${key}", using fallback`)
    return fallback
  }

  if (parsed.version === version) {
    return parsed.data as T
  }

  if (parsed.version < version && migrate) {
    const migrated = migrate(parsed.data)
    saveState(key, migrated, version)
    return migrated
  }

  console.warn(
    `[storage] version mismatch for "${key}" ` +
      `(stored ${parsed.version}, current ${version}), using fallback`,
  )
  return fallback
}

/** Remove a key from localStorage. Never throws. */
export function clearState(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch (error) {
    console.warn(`[storage] failed to clear "${key}"`, error)
  }
}

/**
 * Estimate current storage usage in bytes by iterating every key/value
 * (UTF-16: 2 bytes per char). Total defaults to 5 MB, upgraded to the
 * browser-reported quota once `navigator.storage.estimate()` resolves.
 */
export function getStorageUsage(): {
  used: number
  total: number
  percentage: number
} {
  let used = 0
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key === null) continue
      const value = window.localStorage.getItem(key)
      used += key.length * 2 + (value === null ? 0 : value.length * 2)
    }
  } catch (error) {
    console.warn('[storage] failed to measure usage', error)
  }

  if (estimatedQuota === null && typeof navigator !== 'undefined') {
    const estimate = navigator.storage?.estimate
    if (typeof estimate === 'function') {
      try {
        void estimate()
          .then((result) => {
            estimatedQuota =
              typeof result.quota === 'number'
                ? result.quota
                : DEFAULT_QUOTA
          })
          .catch(() => {
            estimatedQuota = DEFAULT_QUOTA
          })
      } catch {
        estimatedQuota = DEFAULT_QUOTA
      }
    }
  }

  const total = estimatedQuota ?? DEFAULT_QUOTA
  const percentage = total > 0 ? Math.min(100, (used / total) * 100) : 0
  return { used, total, percentage }
}
