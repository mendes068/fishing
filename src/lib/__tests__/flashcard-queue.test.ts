import { describe, expect, it } from 'vitest'
import { getDueQueue } from '@/lib/flashcard-queue'
import type { FlashcardState } from '@/types'

const DEFAULT_CARD: FlashcardState = {
  repetitions: 0,
  easeFactor: 2.5,
  interval: 0,
  nextReviewAt: 0,
  lastReviewedAt: null,
  lapses: 0,
}

function makeCard(overrides: Partial<FlashcardState> = {}): FlashcardState {
  return { ...DEFAULT_CARD, ...overrides }
}

describe('getDueQueue', () => {
  const NOW = 1_700_000_000_000 // some fixed timestamp

  it('returns only due cards (nextReviewAt <= now)', () => {
    const cards: Record<string, FlashcardState> = {
      due1: makeCard({ nextReviewAt: 0 }),
      due2: makeCard({ nextReviewAt: NOW }),
      future: makeCard({ nextReviewAt: NOW + 86_400_000 }),
    }
    const result = getDueQueue(cards, 50, NOW)
    expect(result).toHaveLength(2)
    expect(result).toContain('due1')
    expect(result).toContain('due2')
    expect(result).not.toContain('future')
  })

  it('sorts by nextReviewAt ascending (oldest due first)', () => {
    const cards: Record<string, FlashcardState> = {
      middle: makeCard({ nextReviewAt: NOW - 5000 }),
      newest: makeCard({ nextReviewAt: NOW }),
      oldest: makeCard({ nextReviewAt: 0 }), // epoch 0 is oldest
    }
    const result = getDueQueue(cards, 50, NOW)
    expect(result).toEqual(['oldest', 'middle', 'newest'])
  })

  it('caps at the given limit', () => {
    const cards: Record<string, FlashcardState> = {}
    for (let i = 1; i <= 60; i++) {
      cards[`q${i}`] = makeCard({ nextReviewAt: i })
    }
    const result = getDueQueue(cards, 50, NOW)
    expect(result).toHaveLength(50)
    // Verify sorted order (smaller nextReviewAt first)
    for (let i = 0; i < result.length; i++) {
      expect(cards[result[i]]!.nextReviewAt).toBe(i + 1)
    }
  })

  it('default new cards (nextReviewAt: 0) are always due', () => {
    const cards: Record<string, FlashcardState> = {
      fresh: makeCard({ nextReviewAt: 0 }),
    }
    const result = getDueQueue(cards, 50, NOW)
    expect(result).toContain('fresh')
  })

  it('returns empty array when no cards are due', () => {
    const cards: Record<string, FlashcardState> = {
      future1: makeCard({ nextReviewAt: NOW + 1000 }),
      future2: makeCard({ nextReviewAt: NOW + 2000 }),
    }
    const result = getDueQueue(cards, 50, NOW)
    expect(result).toEqual([])
  })

  it('returns empty array for empty cards record', () => {
    const result = getDueQueue({}, 50, NOW)
    expect(result).toEqual([])
  })

  it('handles cap of 0', () => {
    const cards: Record<string, FlashcardState> = {
      q1: makeCard({ nextReviewAt: 0 }),
    }
    const result = getDueQueue(cards, 0, NOW)
    expect(result).toEqual([])
  })

  it('returns all due cards when less than cap', () => {
    const cards: Record<string, FlashcardState> = {
      a: makeCard({ nextReviewAt: 0 }),
      b: makeCard({ nextReviewAt: 0 }),
      c: makeCard({ nextReviewAt: NOW }),
    }
    const result = getDueQueue(cards, 50, NOW)
    expect(result).toHaveLength(3)
    expect(result).toContain('a')
    expect(result).toContain('b')
    expect(result).toContain('c')
  })
})
