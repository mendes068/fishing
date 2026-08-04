// Generates public/data/questions/{de,en,pt-BR}.json from the compact question
// data files in scripts/questions/. Each locale file contains the full question
// structure but only the text for that locale (en.json = English translations).
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { toQuestion } from './questions/helpers.mjs'

import { questions as cat1a } from './questions/cat1-a.mjs'
import { questions as cat1b } from './questions/cat1-b.mjs'
import { questions as cat2a } from './questions/cat2-a.mjs'
import { questions as cat2b } from './questions/cat2-b.mjs'
import { questions as cat3a } from './questions/cat3-a.mjs'
import { questions as cat3b } from './questions/cat3-b.mjs'
import { questions as cat4a } from './questions/cat4-a.mjs'
import { questions as cat4b } from './questions/cat4-b.mjs'
import { questions as cat5a } from './questions/cat5-a.mjs'
import { questions as cat5b } from './questions/cat5-b.mjs'

const ALL = [...cat1a, ...cat1b, ...cat2a, ...cat2b, ...cat3a, ...cat3b, ...cat4a, ...cat4b, ...cat5a, ...cat5b]

// --- sanity checks ---
const ids = new Set()
for (const t of ALL) {
  const [id] = t
  if (ids.has(id)) throw new Error(`duplicate id ${id}`)
  ids.add(id)
}
console.log(`Total raw questions: ${ALL.length}`)

const full = ALL.map(toQuestion)

const byCat = {}
for (const q of full) byCat[q.category] = (byCat[q.category] || 0) + 1
for (const [c, n] of Object.entries(byCat)) console.log(`  ${c}: ${n}`)

const LANGS = ['de', 'en', 'pt-BR']
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data', 'questions')
mkdirSync(outDir, { recursive: true })

// NOTE: QuestionSchema's LocalizedTextSchema uses z.record(LanguageSchema, ...),
// which in zod v4 requires ALL three language keys to be present. Each locale
// file therefore contains the FULL trilingual question object; the app reads
// the text for the active language from it.
const perLang = { de: {}, en: {}, 'pt-BR': {} }
for (const q of full) {
  for (const lng of LANGS) {
    perLang[lng][q.id] = q
  }
}

for (const lng of LANGS) {
  const file = join(outDir, `${lng}.json`)
  writeFileSync(file, JSON.stringify(perLang[lng], null, 2) + '\n')
  console.log(`Wrote ${file}: ${Object.keys(perLang[lng]).length} questions`)
}

// quick empty-string check
for (const lng of LANGS) {
  for (const q of Object.values(perLang[lng])) {
    for (const [k, v] of Object.entries(q.questionText)) if (!v.trim()) throw new Error(`empty questionText in ${lng}/${q.id}`)
    for (const a of q.answers) for (const v of Object.values(a.text)) if (!v.trim()) throw new Error(`empty answer in ${lng}/${q.id}`)
    for (const v of Object.values(q.explanation)) if (!v.trim()) throw new Error(`empty explanation in ${lng}/${q.id}`)
  }
}
console.log('All localized strings non-empty.')
