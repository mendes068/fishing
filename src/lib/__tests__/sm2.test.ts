import { describe, expect, it } from 'vitest'
import { sm2 } from '@/lib/sm2'

/**
 * Correct SM-2 trace (verified against the official spec + x1ee7 reference):
 *
 * EF' = max(1.3, EF + 0.1 - (5-q) * (0.08 + (5-q) * 0.02))
 * I(1) = 1, I(2) = 6, I(n) = round(I(n-1) * EF)
 * q < 3  => repetitions = 0, interval = 1
 *
 * Sequential perfect-streak trace (EF carries across reviews):
 *   1st review: reps 0 -> 1, interval 1,  EF 2.5 -> 2.6
 *   2nd review: reps 1 -> 2, interval 6,  EF 2.6 -> 2.7
 *   3rd review: reps 2 -> 3, interval round(6*2.7)=16, EF 2.7 -> 2.8
 *   4th review: reps 3 -> 4, interval round(16*2.8)=45, EF 2.8 -> 2.9
 *   5th review: reps 4 -> 5, interval round(45*2.9)=131, EF 2.9 -> 3.0
 *   ...
 *   10th review: reps 9 -> 10, interval 43734, EF 3.5
 *
 * NOTE (plan deviation): the plan's acceptance example
 *   sm2({quality:5, repetitions:2, easeFactor:2.5, interval:6})
 *   -> {repetitions:3, interval:15, easeFactor:2.6} IS correct as a single call
 *   (interval uses the input EF 2.5: round(6*2.5)=15; EF becomes 2.5+0.1=2.6).
 *   It is only "wrong" if read as the 3rd step of a sequential streak where EF has
 *   already accumulated to 2.7 (then interval would be round(6*2.7)=16). Both are
 *   covered below.
 */

describe('sm2', () => {
  describe('correct reviews (quality >= 3)', () => {
    it('first correct review: repetitions 0 -> 1, interval 1, EF +0.1', () => {
      const result = sm2({ quality: 5, repetitions: 0, easeFactor: 2.5, interval: 0 })
      expect(result.repetitions).toBe(1)
      expect(result.interval).toBe(1)
      expect(result.easeFactor).toBeCloseTo(2.6, 4)
    })

    it('second correct review: repetitions 1 -> 2, interval 6, EF +0.1', () => {
      const result = sm2({ quality: 5, repetitions: 1, easeFactor: 2.6, interval: 1 })
      expect(result.repetitions).toBe(2)
      expect(result.interval).toBe(6)
      expect(result.easeFactor).toBeCloseTo(2.7, 4)
    })

    it('third correct review in a sequential streak: interval = round(6 * 2.7) = 16, EF 2.8', () => {
      const result = sm2({ quality: 5, repetitions: 2, easeFactor: 2.7, interval: 6 })
      expect(result.repetitions).toBe(3)
      expect(result.interval).toBe(16)
      expect(result.easeFactor).toBeCloseTo(2.8, 4)
    })

    it('plan acceptance example: single call from EF 2.5 yields interval 15, EF 2.6', () => {
      const result = sm2({ quality: 5, repetitions: 2, easeFactor: 2.5, interval: 6 })
      expect(result.repetitions).toBe(3)
      expect(result.interval).toBe(15)
      expect(result.easeFactor).toBeCloseTo(2.6, 4)
    })

    it('perfect 10x streak: repetitions accumulate, interval grows exponentially, EF increases', () => {
      let state = { quality: 5, repetitions: 0, easeFactor: 2.5, interval: 0 }
      const intervals: number[] = []
      const efs: number[] = []
      for (let i = 0; i < 10; i++) {
        const out = sm2(state)
        intervals.push(out.interval)
        efs.push(out.easeFactor)
        state = {
          quality: 5,
          repetitions: out.repetitions,
          easeFactor: out.easeFactor,
          interval: out.interval,
        }
      }
      expect(state.repetitions).toBe(10)
      expect(state.easeFactor).toBeCloseTo(3.5, 4)
      expect(state.interval).toBe(43734)
      // strict monotonic growth
      for (let i = 1; i < intervals.length; i++) {
        expect(intervals[i]).toBeGreaterThan(intervals[i - 1])
        expect(efs[i]).toBeGreaterThan(efs[i - 1])
      }
      expect(intervals[0]).toBe(1)
      expect(intervals[1]).toBe(6)
      expect(intervals[2]).toBe(16)
    })
  })

  describe('incorrect reviews (quality < 3)', () => {
    it('failure resets repetitions and interval, EF drops to 1.7 (plan acceptance example)', () => {
      const result = sm2({ quality: 0, repetitions: 5, easeFactor: 2.5, interval: 30 })
      expect(result.repetitions).toBe(0)
      expect(result.interval).toBe(1)
      expect(result.easeFactor).toBeCloseTo(1.7, 4)
    })

    it('ease factor never drops below 1.3', () => {
      let state = { quality: 0, repetitions: 0, easeFactor: 1.3, interval: 1 }
      for (let i = 0; i < 5; i++) {
        const out = sm2(state)
        expect(out.easeFactor).toBeGreaterThanOrEqual(1.3)
        state = {
          quality: 0,
          repetitions: out.repetitions,
          easeFactor: out.easeFactor,
          interval: out.interval,
        }
      }
      expect(state.easeFactor).toBe(1.3)
    })

    it('quality 2 also resets, EF still updated (2.5 -> 2.18)', () => {
      const result = sm2({ quality: 2, repetitions: 4, easeFactor: 2.5, interval: 30 })
      expect(result.repetitions).toBe(0)
      expect(result.interval).toBe(1)
      expect(result.easeFactor).toBeCloseTo(2.18, 4)
    })
  })

  describe('input validation', () => {
    it('throws RangeError for quality > 5', () => {
      expect(() => sm2({ quality: 6, repetitions: 0, easeFactor: 2.5, interval: 0 })).toThrow(RangeError)
    })

    it('throws RangeError for negative quality', () => {
      expect(() => sm2({ quality: -1, repetitions: 0, easeFactor: 2.5, interval: 0 })).toThrow(RangeError)
    })

    it('throws RangeError for non-integer quality', () => {
      expect(() => sm2({ quality: 2.5, repetitions: 0, easeFactor: 2.5, interval: 0 })).toThrow(RangeError)
    })
  })

  describe('nextReviewDate', () => {
    it('is a Date normalized to local midnight, today + interval days', () => {
      const result = sm2({ quality: 5, repetitions: 0, easeFactor: 2.5, interval: 0 })
      expect(result.nextReviewDate).toBeInstanceOf(Date)
      expect(result.nextReviewDate.getHours()).toBe(0)
      expect(result.nextReviewDate.getMinutes()).toBe(0)
      expect(result.nextReviewDate.getSeconds()).toBe(0)
      expect(result.nextReviewDate.getMilliseconds()).toBe(0)

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const expected = new Date(today)
      expected.setDate(today.getDate() + result.interval)
      expect(result.nextReviewDate.getTime()).toBe(expected.getTime())
    })

    it('failure review schedules the next review 1 day out', () => {
      const result = sm2({ quality: 0, repetitions: 5, easeFactor: 2.5, interval: 30 })
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const expected = new Date(today)
      expected.setDate(today.getDate() + 1)
      expect(result.nextReviewDate.getTime()).toBe(expected.getTime())
    })
  })

  describe('purity', () => {
    it('does not mutate the input object', () => {
      const input = { quality: 5, repetitions: 2, easeFactor: 2.5, interval: 6 }
      const snapshot = { ...input }
      sm2(input)
      expect(input).toEqual(snapshot)
    })
  })
})
