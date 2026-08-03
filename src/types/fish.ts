import type { LocalizedText } from './question'

export interface ClosedSeason {
  start: string // 'MM-DD'
  end: string // 'MM-DD'
}

export interface FishSpecies {
  id: string
  scientificName: string
  commonNames: LocalizedText
  habitat: LocalizedText
  maxSize: number // cm
  minCatchSize: number | null // cm, null if none
  closedSeason: ClosedSeason | null
  distinguishingFeatures: LocalizedText
  imagePath: string // empty string for MVP
  protectedStatus: boolean // true = in BbgFischO Anlage
  category: 'bbgfischo' | 'common'
}
