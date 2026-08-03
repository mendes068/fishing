import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FlashcardState } from '@/types'

export interface FlashcardStats {
  total: number
  due: number
  newCards: number
  reviewedToday: number
  mastered: number
}

export interface FlashcardStoreState {
  /** questionId → SM-2 card state */
  cards: Record<string, FlashcardState>
  reviewedToday: number
  lastReviewDate: string | null
  initializeCards: (questionIds: string[]) => void
  updateCard: (questionId: string, state: FlashcardState) => void
  getDueCards: (cap: number) => string[]
  getStats: () => FlashcardStats
  markReviewedToday: () => void
}

const DEFAULT_CARD: FlashcardState = {
  repetitions: 0,
  easeFactor: 2.5,
  interval: 0,
  nextReviewAt: 0, // 0 = due immediately
  lastReviewedAt: null,
  lapses: 0,
}

/** Local 'YYYY-MM-DD'. */
function dateKey(): string {
  const d = new Date()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

export const useFlashcardStore = create<FlashcardStoreState>()(
  persist(
    (set, get) => ({
      cards: {},
      reviewedToday: 0,
      lastReviewDate: null,
      initializeCards: (questionIds) =>
        set((s) => {
          const cards = { ...s.cards }
          for (const id of questionIds) {
            if (!cards[id]) cards[id] = { ...DEFAULT_CARD }
          }
          return { cards }
        }),
      updateCard: (questionId, state) =>
        set((s) => ({
          cards: { ...s.cards, [questionId]: state },
        })),
      getDueCards: (cap) => {
        const now = Date.now()
        return Object.entries(get().cards)
          .filter(([, card]) => card.nextReviewAt <= now)
          .sort((a, b) => a[1].nextReviewAt - b[1].nextReviewAt)
          .slice(0, cap)
          .map(([id]) => id)
      },
      getStats: () => {
        const values = Object.values(get().cards)
        const now = Date.now()
        return {
          total: values.length,
          due: values.filter((c) => c.nextReviewAt <= now).length,
          newCards: values.filter((c) => c.nextReviewAt === 0).length,
          reviewedToday: get().reviewedToday,
          mastered: values.filter((c) => c.repetitions >= 5).length,
        }
      },
      markReviewedToday: () => {
        const today = dateKey()
        set((s) => ({
          lastReviewDate: today,
          // Reset the counter when the day rolls over.
          reviewedToday: s.lastReviewDate === today ? s.reviewedToday + 1 : 1,
        }))
      },
    }),
    {
      name: 'fishing-flashcard',
    },
  ),
)
