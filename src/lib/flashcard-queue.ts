import type { FlashcardState } from '@/types'

/**
 * Pure helper: return question IDs that are due for review.
 *
 * - Filters cards where `nextReviewAt <= now` (default new cards have
 *   `nextReviewAt === 0`, so they are always due the first time).
 * - Sorts by `nextReviewAt` ascending (oldest due first).
 * - Caps the result at `cap`.
 */
export function getDueQueue(
  cards: Record<string, FlashcardState>,
  cap: number,
  now: number,
): string[] {
  return Object.entries(cards)
    .filter(([, card]) => card.nextReviewAt <= now)
    .sort((a, b) => a[1].nextReviewAt - b[1].nextReviewAt)
    .slice(0, cap)
    .map(([id]) => id)
}
