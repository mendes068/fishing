import type { Question } from '@/types'
import {
  FishImportSchema,
  GlossaryImportSchema,
  QuestionImportSchema,
} from '@/schemas/import.schema'

/** One validation failure, tied to a question index (or -1 when not per-question). */
export interface ImportError {
  /** Position in the imported questions array; -1 for JSON/structural errors. */
  index: number
  /** Human-readable message (zod issue message, already localized-friendly). */
  message: string
  /** Zod issue path joined with '.' (e.g. "correctAnswerIndex"), when available. */
  path?: string
}

export type ImportResult =
  | { ok: true; questions: Question[] }
  | { ok: false; errors: ImportError[] }

export interface MergeResult {
  merged: Record<string, Question>
  added: string[]
  updated: string[]
}

/** JSON file size cap for the import dropzone (5 MB — plenty for 300+ questions). */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024

/**
 * Extract the questions array from a flexible file shape: a bare array of
 * questions, or a `{ questions: [...] }` envelope (QuestionBank style). Returns
 * null when the top-level shape is neither.
 */
function extractQuestions(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw
  if (raw !== null && typeof raw === 'object') {
    const questions = (raw as Record<string, unknown>).questions
    if (Array.isArray(questions)) return questions
  }
  return null
}

/** Pull the question index out of a zod issue path like [3, 'correctAnswerIndex']. */
function indexFromPath(path: PropertyKey[] | undefined): number {
  if (!path) return -1
  const first = path[0]
  return typeof first === 'number' ? first : -1
}

/** Build a flat ImportError from a zod issue, prefixing non-question sections. */
function errorFromIssue(
  issue: { path?: PropertyKey[]; message: string },
  section: 'questions' | 'fish' | 'glossary',
): ImportError {
  const index = indexFromPath(issue.path)
  // zod v4 array paths start with the element index ([1, 'correctAnswerIndex']);
  // that index is already exposed above, so the path keeps only the field chain.
  const fieldPath = issue.path?.slice(1).map(String).join('.') ?? ''
  if (section === 'questions') {
    return { index, message: issue.message, path: fieldPath || undefined }
  }
  return {
    index: -1,
    message: `${section}: ${issue.message}`,
    path: issue.path?.map(String).join('.'),
  }
}

function collectSectionErrors(raw: unknown): ImportError[] {
  if (raw === null || typeof raw !== 'object') return []
  const obj = raw as Record<string, unknown>
  const errors: ImportError[] = []
  if (Array.isArray(obj.fish)) {
    const parsed = FishImportSchema.safeParse(obj.fish)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(errorFromIssue(issue, 'fish'))
      }
    }
  }
  if (Array.isArray(obj.glossary)) {
    const parsed = GlossaryImportSchema.safeParse(obj.glossary)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(errorFromIssue(issue, 'glossary'))
      }
    }
  }
  return errors
}

/**
 * Validate a JSON import file. Accepts either a bare question array or a
 * `{ questions: [...] }` envelope, and — when present in the envelope — also
 * validates the `fish` and `glossary` arrays. Never throws.
 */
export function validateImport(fileText: string): ImportResult {
  let raw: unknown
  try {
    raw = JSON.parse(fileText)
  } catch (err) {
    return {
      ok: false,
      errors: [
        {
          index: -1,
          message: `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
    }
  }

  const questions = extractQuestions(raw)
  if (questions === null) {
    return {
      ok: false,
      errors: [
        {
          index: -1,
          message: 'Expected an array of questions or a { questions: [...] } object',
        },
      ],
    }
  }

  const errors: ImportError[] = []
  let parsedQuestions: Question[] | null = null
  const questionsParsed = QuestionImportSchema.safeParse(questions)
  if (questionsParsed.success) {
    parsedQuestions = questionsParsed.data
  } else {
    for (const issue of questionsParsed.error.issues) {
      errors.push(errorFromIssue(issue, 'questions'))
    }
  }

  errors.push(...collectSectionErrors(raw))

  if (errors.length > 0) return { ok: false, errors }
  // Errors empty implies the questions parse succeeded above.
  if (parsedQuestions === null) {
    return {
      ok: false,
      errors: [{ index: -1, message: 'No questions found in file' }],
    }
  }
  return { ok: true, questions: parsedQuestions }
}

/**
 * Merge incoming questions into the existing bank keyed by id. New ids are
 * added, existing ids are replaced with the incoming (fresher) record. User
 * progress (results/favorites/notes) is keyed separately by question id, so it
 * is untouched here by design.
 */
export function mergeQuestions(
  existing: Record<string, Question>,
  incoming: Question[],
): MergeResult {
  const merged: Record<string, Question> = { ...existing }
  const added = new Set<string>()
  const updated = new Set<string>()
  for (const question of incoming) {
    if (Object.prototype.hasOwnProperty.call(existing, question.id)) {
      updated.add(question.id)
    } else {
      added.add(question.id)
    }
    merged[question.id] = question
  }
  return {
    merged,
    added: [...added],
    updated: [...updated],
  }
}
