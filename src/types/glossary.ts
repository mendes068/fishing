import type { LocalizedText } from './question'

export interface GlossaryTerm {
  id: string
  term: LocalizedText
  definition: LocalizedText
  category: 'equipment' | 'biology' | 'legal' | 'technique'
  relatedTermIds: string[]
  seeAlso: string[]
}
