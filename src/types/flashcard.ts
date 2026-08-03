export interface SM2Input {
  quality: number // 0-5
  repetitions: number
  easeFactor: number
  interval: number
}

export interface SM2Output {
  repetitions: number
  easeFactor: number
  interval: number
  nextReviewDate: Date
}

export type { FlashcardState } from './user'
