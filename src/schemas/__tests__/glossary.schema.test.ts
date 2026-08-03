import { describe, expect, it } from 'vitest'
import { GlossaryTermSchema } from '../glossary.schema'
import type { GlossaryTerm } from '../../types'

const validTerm: GlossaryTerm = {
  id: 'spinner',
  term: { de: 'Spinner', en: 'Spinner', 'pt-BR': 'Spinner' },
  definition: {
    de: 'Ein drehender Köder',
    en: 'A rotating lure',
    'pt-BR': 'Uma isca giratória',
  },
  category: 'equipment',
  relatedTermIds: ['blade'],
  seeAlso: ['lure'],
}

describe('GlossaryTermSchema', () => {
  it('parses a valid glossary term without throwing', () => {
    const result = GlossaryTermSchema.parse(validTerm)
    expect(result.id).toBe('spinner')
  })

  it('throws on an invalid category name', () => {
    const bad = { ...validTerm, category: 'regulations' }
    expect(() => GlossaryTermSchema.parse(bad)).toThrow()
  })

  it('throws when the definition is missing', () => {
    const { definition: _omitted, ...withoutDefinition } = validTerm
    void _omitted
    expect(() => GlossaryTermSchema.parse(withoutDefinition)).toThrow()
  })

  it('throws when relatedTermIds contains a non-string value', () => {
    const bad = { ...validTerm, relatedTermIds: ['blade', 42] }
    expect(() => GlossaryTermSchema.parse(bad)).toThrow()
  })

  it('throws when the term text is an empty string', () => {
    const bad = {
      ...validTerm,
      term: { de: 'Spinner', en: '', 'pt-BR': 'Spinner' },
    }
    expect(() => GlossaryTermSchema.parse(bad)).toThrow()
  })

  it('accepts empty arrays for relatedTermIds and seeAlso', () => {
    const result = GlossaryTermSchema.parse({
      ...validTerm,
      relatedTermIds: [],
      seeAlso: [],
    })
    expect(result.relatedTermIds).toEqual([])
    expect(result.seeAlso).toEqual([])
  })
})
