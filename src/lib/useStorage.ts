import { useCallback, useState } from 'react'
import { loadState, saveState } from '@/lib/storage'

/**
 * React hook that initializes from (and writes to) the versioned
 * LocalStorage layer.
 *
 * - Initial state is loaded lazily via `loadState`; if storage is
 *   unavailable or corrupted the `fallback` is used.
 * - The setter persists via `saveState` and only updates React state when
 *   the write succeeded — on failure (quota exceeded, storage disabled) it
 *   no-ops so the UI never shows state that cannot be persisted.
 */
export function useStoredState<T>(
  key: string,
  fallback: T,
  version?: number,
): [T, (data: T) => void] {
  const [state, setState] = useState<T>(() => loadState(key, fallback, version))

  const setter = useCallback(
    (data: T) => {
      if (saveState(key, data, version)) {
        setState(data)
      }
    },
    [key, version],
  )

  return [state, setter]
}
