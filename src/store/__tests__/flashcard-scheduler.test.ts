import { beforeEach, describe, expect, it } from 'vitest'
import { sm2 } from '@/lib/sm2'
import { useFlashcardStore } from '../flashcard.store'

/** Mirror of sm2.ts: local-midnight today, shifted by `interval` days. */
function midnightPlusDays(interval: number): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + interval)
  return d.getTime()
}

describe('flashcard scheduler integration (sm2 + store + queue)', () => {
  beforeEach(() => {
    localStorage.clear()
    useFlashcardStore.setState({
      cards: {},
      reviewedToday: 0,
      lastReviewDate: null,
    })
  })

  it('reviewing a new card with quality 5 schedules it for tomorrow and removes it from the due queue', () => {
    useFlashcardStore.getState().initializeCards(['q1'])
    const before = useFlashcardStore.getState().cards['q1']!
    expect(useFlashcardStore.getState().getDueCards(50)).toContain('q1')

    const result = sm2({
      quality: 5,
      repetitions: before.repetitions,
      easeFactor: before.easeFactor,
      interval: before.interval,
    })
    useFlashcardStore.getState().updateCard('q1', {
      repetitions: result.repetitions,
      easeFactor: result.easeFactor,
      interval: result.interval,
      nextReviewAt: result.nextReviewDate.getTime(),
      lastReviewedAt: Date.now(),
      lapses: 0,
    })

    const card = useFlashcardStore.getState().cards['q1']!
    expect(card.repetitions).toBe(1)
    expect(card.interval).toBe(1)
    expect(card.nextReviewAt).toBe(midnightPlusDays(1))
    expect(useFlashcardStore.getState().getDueCards(50)).not.toContain('q1')
  })

  it('a failed review (quality 0) resets repetitions and increments lapses', () => {
    useFlashcardStore.getState().initializeCards(['q1'])
    const result = sm2({
      quality: 0,
      repetitions: 3,
      easeFactor: 2.5,
      interval: 12,
    })

    expect(result.repetitions).toBe(0)
    expect(result.interval).toBe(1)

    useFlashcardStore.getState().updateCard('q1', {
      repetitions: result.repetitions,
      easeFactor: result.easeFactor,
      interval: result.interval,
      nextReviewAt: result.nextReviewDate.getTime(),
      lastReviewedAt: Date.now(),
      lapses: 1,
    })

    const card = useFlashcardStore.getState().cards['q1']!
    expect(card.repetitions).toBe(0)
    expect(card.lapses).toBe(1)
    // Interval 1 → still rescheduled for tomorrow, so not due today.
    expect(useFlashcardStore.getState().getDueCards(50)).not.toContain('q1')
  })

  it('getStats reflects scheduled cards (total/due/mastered)', () => {
    useFlashcardStore.getState().initializeCards(['new', 'mastered'])

    // Master a card through 5 consecutive correct reviews.
    let card = useFlashcardStore.getState().cards['mastered']!
    for (let i = 0; i < 5; i++) {
      const r = sm2({
        quality: 5,
        repetitions: card.repetitions,
        easeFactor: card.easeFactor,
        interval: card.interval,
      })
      card = {
        repetitions: r.repetitions,
        easeFactor: r.easeFactor,
        interval: r.interval,
        nextReviewAt: r.nextReviewDate.getTime(),
        lastReviewedAt: Date.now(),
        lapses: 0,
      }
      useFlashcardStore.getState().updateCard('mastered', card)
    }

    const stats = useFlashcardStore.getState().getStats()
    expect(stats.total).toBe(2)
    expect(stats.due).toBe(1) // 'new' is due, 'mastered' is scheduled out
    expect(stats.newCards).toBe(1)
    expect(stats.mastered).toBe(1)
  })

  it('initializeCards keeps existing card state untouched', () => {
    const store = useFlashcardStore.getState()
    store.initializeCards(['q1', 'q2'])
    const r = sm2({ quality: 4, repetitions: 0, easeFactor: 2.5, interval: 0 })
    store.updateCard('q1', {
      repetitions: r.repetitions,
      easeFactor: r.easeFactor,
      interval: r.interval,
      nextReviewAt: r.nextReviewDate.getTime(),
      lastReviewedAt: Date.now(),
      lapses: 0,
    })

    useFlashcardStore.getState().initializeCards(['q1', 'q3'])

    const cards = useFlashcardStore.getState().cards
    expect(cards['q1']!.repetitions).toBe(1) // untouched by re-init
    expect(cards['q2']).toBeDefined()
    expect(cards['q3']).toBeDefined()
    expect(Object.keys(cards).length).toBe(3)
  })

  it('markReviewedToday increments within a day and resets on day rollover', () => {
    useFlashcardStore.getState().markReviewedToday()
    useFlashcardStore.getState().markReviewedToday()
    expect(useFlashcardStore.getState().reviewedToday).toBe(2)

    // Simulate a new day: lastReviewDate from the previous day.
    useFlashcardStore.setState({ lastReviewDate: '2000-01-01' })
    useFlashcardStore.getState().markReviewedToday()
    expect(useFlashcardStore.getState().reviewedToday).toBe(1)
  })

  it('reviewing every card in the queue drains getDueCards to empty', () => {
    useFlashcardStore.getState().initializeCards(['a', 'b', 'c'])
    expect(useFlashcardStore.getState().getDueCards(50)).toHaveLength(3)

    for (const id of ['a', 'b', 'c']) {
      const card = useFlashcardStore.getState().cards[id]!
      const r = sm2({
        quality: 3,
        repetitions: card.repetitions,
        easeFactor: card.easeFactor,
        interval: card.interval,
      })
      useFlashcardStore.getState().updateCard(id, {
        repetitions: r.repetitions,
        easeFactor: r.easeFactor,
        interval: r.interval,
        nextReviewAt: r.nextReviewDate.getTime(),
        lastReviewedAt: Date.now(),
        lapses: 0,
      })
    }

    expect(useFlashcardStore.getState().getDueCards(50)).toEqual([])
    expect(useFlashcardStore.getState().reviewedToday).toBe(0)
  })
})
