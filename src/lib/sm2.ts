import type { SM2Input, SM2Output } from '@/types/flashcard'

/**
 * Pure implementation of the SM-2 spaced repetition algorithm.
 *
 * References:
 * - Official spec (super-memo.com): EF' = max(1.3, EF + 0.1 - (5-q)*(0.08 + (5-q)*0.02));
 *   I(1)=1, I(2)=6, I(n)=round(I(n-1) * EF); quality < 3 resets repetitions to 0 and interval to 1.
 * - Production reference: x1ee7/sm2-spaced-repetition (MIT) — uses Math.round for the
 *   interval and toFixed(4) for the ease factor. Math.round is preferred over Math.ceil
 *   to stay consistent with the reference implementation (both agree on integral products
 *   like 6 * 2.5 = 15; they only diverge on .5-above fractions, where round is the
 *   convention used by the reference).
 *
 * The function is pure with respect to the review state: input carries day numbers only,
 * no Date objects. It creates a Date only for the `nextReviewDate` output (today + interval
 * days, normalized to local midnight).
 */
export function sm2(input: SM2Input): SM2Output {
  const { quality, repetitions, easeFactor, interval } = input

  if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
    throw new RangeError(`quality must be an integer between 0 and 5, got ${quality}`)
  }

  let nextRepetitions: number
  let nextInterval: number

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      nextInterval = 1
    } else if (repetitions === 1) {
      nextInterval = 6
    } else {
      nextInterval = Math.round(interval * easeFactor)
    }
    nextRepetitions = repetitions + 1
  } else {
    // Incorrect response: reset the whole card
    nextRepetitions = 0
    nextInterval = 1
  }

  // Ease factor update, floored at 1.3 per the spec.
  const easeDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  const nextEaseFactor = Math.max(1.3, easeFactor + easeDelta)
  // Round to 4 decimals to avoid floating-point drift across reviews.
  const roundedEaseFactor = Number(nextEaseFactor.toFixed(4))

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const nextReviewDate = new Date(today)
  nextReviewDate.setDate(today.getDate() + nextInterval)

  return {
    repetitions: nextRepetitions,
    easeFactor: roundedEaseFactor,
    interval: nextInterval,
    nextReviewDate,
  }
}
