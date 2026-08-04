import { STORAGE_KEYS } from '@/lib/storage'
import {
  useExamStore,
  useFavoritesStore,
  useFlashcardStore,
  useNotesStore,
  useProgressStore,
  useQuestionStore,
  useSettingsStore,
} from '@/store'

/**
 * Cross-tab synchronization.
 *
 * The browser fires a `storage` event in *other* tabs whenever a key in
 * localStorage changes. This module listens for those events and rehydrates
 * the affected Zustand persist store so all open tabs stay in sync.
 */

/**
 * Register a `storage` event listener that reports keys changed by another
 * tab. Returns a cleanup function that removes the listener.
 */
export function onStorageChange(callback: (key: string) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }
  const handler = (event: StorageEvent): void => {
    // event.key === null means localStorage.clear() was called elsewhere.
    if (event.key === null) return
    if (event.storageArea !== window.localStorage) return
    callback(event.key)
  }
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener('storage', handler)
  }
}

/**
 * Wire a map of localStorage key → rehydrate callback to the storage event.
 * Returns a cleanup function for teardown (e.g. React effect cleanup).
 */
export function initCrossTabSync(
  stores: Record<string, () => void>,
): () => void {
  return onStorageChange((key) => {
    const rehydrate = stores[key]
    if (rehydrate) {
      try {
        rehydrate()
      } catch (error) {
        console.warn(`[storage] cross-tab rehydrate failed for "${key}"`, error)
      }
    }
  })
}

/**
 * Convenience wiring: rehydrates every persisted Zustand store when another
 * tab writes to its key. Call once from the app entry (e.g. main.tsx) and
 * keep the returned cleanup for HMR/teardown.
 */
export function syncStoresFromStorage(): () => void {
  return initCrossTabSync({
    [STORAGE_KEYS.settings]: () => {
      void useSettingsStore.persist.rehydrate()
    },
    [STORAGE_KEYS.question]: () => {
      void useQuestionStore.persist.rehydrate()
    },
    [STORAGE_KEYS.exam]: () => {
      void useExamStore.persist.rehydrate()
    },
    [STORAGE_KEYS.progress]: () => {
      void useProgressStore.persist.rehydrate()
    },
    [STORAGE_KEYS.favorites]: () => {
      void useFavoritesStore.persist.rehydrate()
    },
    [STORAGE_KEYS.notes]: () => {
      void useNotesStore.persist.rehydrate()
    },
    [STORAGE_KEYS.flashcard]: () => {
      void useFlashcardStore.persist.rehydrate()
    },
  })
}
