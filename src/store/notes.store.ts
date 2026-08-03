import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface NotesState {
  /** questionId → markdown content */
  notes: Record<string, string>
  setNote: (questionId: string, markdown: string) => void
  getNote: (questionId: string) => string
  removeNote: (questionId: string) => void
  getAllNotes: () => Record<string, string>
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: {},
      setNote: (questionId, markdown) =>
        set((s) => ({ notes: { ...s.notes, [questionId]: markdown } })),
      getNote: (questionId) => get().notes[questionId] ?? '',
      removeNote: (questionId) =>
        set((s) => {
          const notes = { ...s.notes }
          delete notes[questionId]
          return { notes }
        }),
      getAllNotes: () => get().notes,
    }),
    {
      name: 'fishing-notes',
    },
  ),
)
