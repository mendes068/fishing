import type { Question } from '@/types'
import { CATEGORY_ORDER } from '@/lib/categories'

/**
 * Fisher-Yates shuffle (in-place). Returns the same array reference.
 */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

/**
 * Select questions for a full Brandenburg fishing exam.
 *
 * Rules:
 * - Exactly `perCategory` questions from each of the 5 official categories
 * - Total returned: `perCategory * 5` (default 12 → 60)
 * - Selection is random (Fisher-Yates) and stable — the same category order
 *   is maintained, but questions within each category are shuffled, then
 *   the combined 60 are shuffled once more
 * - No duplicates
 *
 * @param questionsById  Lookup map of all loaded questions
 * @param perCategory     Number of questions per category (default 12)
 * @returns               Array of exactly `perCategory * 5` Question objects
 */
export function selectExamQuestions(
  questionsById: Record<string, Question>,
  perCategory: number = 12,
): Question[] {
  const result: Question[] = []

  for (const category of CATEGORY_ORDER) {
    // Collect all question IDs for this category
    const ids: string[] = []
    for (const [id, q] of Object.entries(questionsById)) {
      if (q.category === category) {
        ids.push(id)
      }
    }

    // Shuffle and take the first perCategory
    shuffle(ids)
    const selected = ids.slice(0, perCategory)

    for (const id of selected) {
      result.push(questionsById[id])
    }
  }

  // Final shuffle so the 60 are not in category blocks
  shuffle(result)
  return result
}

/**
 * Shuffle an array of indices for answer display. Returns a new array
 * `[0, 1, 2]` in random order so the correct answer is not always first.
 */
export function shuffleAnswerIndices(): number[] {
  return shuffle([0, 1, 2])
}

/**
 * Map a shuffled display index back to the original data index.
 *
 * @param displayIndex  The index the user clicked in the shuffled view
 * @param shuffleMap    The shuffled order returned by shuffleAnswerIndices()
 * @returns             The original data index (0–2)
 */
export function mapDisplayToData(
  displayIndex: number,
  shuffleMap: number[],
): number {
  return shuffleMap[displayIndex]
}
