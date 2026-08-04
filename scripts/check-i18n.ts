/**
 * i18n completeness checker — Task 30.
 *
 * Verifies that all 17 namespaces × 3 languages (de / en / pt-BR) under
 * `public/locales/` have:
 *   1. IDENTICAL recursive key structures across the three languages,
 *   2. No placeholder / TODO / empty values,
 *   3. No literal `t('...')` keys used in `src/` that are missing from the
 *      matching namespace JSON files (raw-key leak check).
 *
 * Usage:  npx tsx scripts/check-i18n.ts
 * Exit:   0 when everything is clean, 1 when any issue is found.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const LOCALES_DIR = join(ROOT, 'public', 'locales')
const SRC_DIR = join(ROOT, 'src')
const LANGS = ['de', 'en', 'pt-BR'] as const
const DEFAULT_NS = 'common'

/** Depth-first leaf-key collector: returns dotted paths to every scalar value. */
function leafKeys(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return [prefix]
  }
  const out: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    out.push(...leafKeys(value, path))
  }
  return out
}

interface Problem {
  namespace: string
  message: string
}

function checkNamespace(ns: string, problems: Problem[]): void {
  const files: Record<string, unknown> = {}
  for (const lang of LANGS) {
    const file = join(LOCALES_DIR, lang, `${ns}.json`)
    if (!existsSync(file)) {
      problems.push({ namespace: ns, message: `missing file: ${lang}/${ns}.json` })
      continue
    }
    files[lang] = JSON.parse(readFileSync(file, 'utf8'))
  }

  // 1. Structural parity across languages
  const keySets: Record<string, Set<string>> = {} as Record<string, Set<string>>
  for (const lang of LANGS) keySets[lang] = new Set(leafKeys(files[lang]))
  const allKeys = new Set([...keySets.de, ...keySets.en, ...keySets['pt-BR']])
  for (const key of allKeys) {
    for (const lang of LANGS) {
      if (!keySets[lang].has(key)) {
        problems.push({ namespace: ns, message: `missing key in ${lang}: "${key}"` })
      }
    }
  }

  // 2. Placeholder / empty / non-string values
  const PLACEHOLDER = /^(todo|tbd|xxx+|lorem(\s+ipsum)?|placeholder|fixme)$/i
  const walk = (obj: unknown, prefix = ''): void => {
    if (obj === null) return
    if (typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        walk(value, prefix ? `${prefix}.${key}` : key)
      }
      return
    }
    const path = prefix || '(root)'
    if (typeof obj !== 'string') {
      problems.push({
        namespace: ns,
        message: `non-string value at "${path}": ${JSON.stringify(obj)}`,
      })
      return
    }
    const value = obj.trim()
    if (value === '') {
      problems.push({ namespace: ns, message: `empty value at "${path}"` })
    } else if (PLACEHOLDER.test(value)) {
      problems.push({
        namespace: ns,
        message: `placeholder value at "${path}": ${JSON.stringify(obj)}`,
      })
    }
  }
  for (const lang of LANGS) walk(files[lang])
}

/**
 * Raw-key leak check: scans `src/` for literal `t('...')` calls. Translation
 * hook variables are resolved by NAME — `const { t: tcat } =
 * useTranslation('categories')` binds `tcat` → categories, `const { t } =
 * useTranslation('exam')` binds `t` → exam, and a bare `useTranslation()`
 * binds to the defaultNS 'common'. Keys prefixed `ns:key` are resolved
 * explicitly. Any referenced key absent from the matching JSON is flagged.
 */
function checkUsedKeys(problems: Problem[]): void {
  const scoped: Record<string, Set<string>> = {}
  const add = (ns: string, key: string): void => {
    if (!scoped[ns]) scoped[ns] = new Set()
    scoped[ns].add(key)
  }

  const scanDir = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '__tests__') continue
        scanDir(full)
        continue
      }
      if (!/\.(ts|tsx)$/.test(entry.name)) continue

      const source = readFileSync(full, 'utf8')
      // Bind hook variable names to namespaces:
      //   const { t: tcat } = useTranslation('categories')   -> tcat -> categories
      //   const { t } = useTranslation('exam')               -> t -> exam
      //   const { t } = useTranslation()                     -> t -> common
      const tBindings = new Map<string, string>()
      const hookRe = /const\s*\{\s*t(?::\s*([A-Za-z_$][\w$]*))?\s*\}\s*=\s*useTranslation\(\s*(?:'([^']+)')?\s*\)/g
      let h: RegExpExecArray | null
      while ((h = hookRe.exec(source)) !== null) {
        const varName = h[1] ?? 't'
        const ns = h[2] ?? DEFAULT_NS
        tBindings.set(varName, ns)
      }

      // Resolve every literal t('...') call, including 'ns:key' prefixes and
      // i18n.t('...') direct calls.
      const callRe = /\b(t|t[A-Za-z_$][\w$]*|i18n\.t)\s*\(\s*'([^']+)'/g
      let m: RegExpExecArray | null
      while ((m = callRe.exec(source)) !== null) {
        const fnName = m[1]
        const raw = m[2]
        if (fnName === 'i18n.t') {
          add(DEFAULT_NS, raw)
          continue
        }
        const binding = tBindings.get(fnName)
        if (binding === undefined) continue // not a translation call
        if (raw.includes(':')) {
          const parts = raw.split(':')
          add(parts[0], parts.slice(1).join(':'))
        } else {
          add(binding, raw)
        }
      }
    }
  }
  scanDir(SRC_DIR)

  for (const [ns, keys] of Object.entries(scoped)) {
    const file = join(LOCALES_DIR, 'de', `${ns}.json`)
    if (!existsSync(file)) {
      problems.push({
        namespace: ns,
        message: `t() keys reference namespace "${ns}" but no locale file exists`,
      })
      continue
    }
    const json = JSON.parse(readFileSync(file, 'utf8'))
    const available = new Set(leafKeys(json))
    for (const key of keys) {
      if (!available.has(key)) {
        problems.push({
          namespace: ns,
          message: `t('${key}') referenced in src/ but missing from ${ns}.json`,
        })
      }
    }
  }
}

const problems: Problem[] = []
const namespaces = readdirSync(join(LOCALES_DIR, 'de'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))
  .sort()

console.log(
  `i18n completeness check — ${namespaces.length} namespaces × ${LANGS.length} languages`,
)
console.log(`locales dir: ${LOCALES_DIR}`)
console.log('-'.repeat(72))

for (const ns of namespaces) {
  const before = problems.length
  checkNamespace(ns, problems)
  const found = problems.slice(before)
  if (found.length === 0) {
    console.log(`OK   ${ns}`)
  } else {
    console.log(`FAIL ${ns}`)
    for (const p of found) console.log(`     - ${p.message}`)
  }
}

checkUsedKeys(problems)
if (namespaces.length === 0) {
  problems.push({ namespace: '(all)', message: 'no namespace files found' })
}

console.log('-'.repeat(72))
if (problems.length === 0) {
  console.log('RESULT: ALL CLEAN — 0 missing keys, 0 placeholders, 0 raw-key leaks')
  process.exit(0)
} else {
  console.log(`RESULT: ${problems.length} issue(s) found`)
  process.exit(1)
}
