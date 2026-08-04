import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { FileText, Search, StickyNote } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NoteEditor } from '@/components/notes/note-editor'
import { useDataStore } from '@/store/data.store'
import { useNotesStore } from '@/store/notes.store'
import { useSettingsStore } from '@/store/settings.store'
import type { Language } from '@/types'

/** Strip basic Markdown syntax to produce a plain-text preview. */
function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/^[>*+-]\s+/gm, '')
    .replace(/^(\d+)\.\s+/gm, '')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/^[-–—]{3,}\s*$/gm, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Pick the active-language value with a fallback chain. */
function pickText(
  loc: Record<Language, string> | undefined,
  lang: Language,
): string {
  if (!loc) return ''
  return loc[lang] || loc.de || ''
}

interface NoteEntry {
  questionId: string
  title: string
  preview: string
  category: string
}

export default function Notes() {
  const { t } = useTranslation('notes')
  const { t: tCommon } = useTranslation()
  const { t: tCategories } = useTranslation('categories')
  const navigate = useNavigate()

  const language = useSettingsStore((s) => s.language)
  const allQuestions = useDataStore((s) => s.questions)
  const dataLoading = useDataStore((s) => s.loading)
  const loadAll = useDataStore((s) => s.loadAll)
  const isLoaded = useDataStore((s) => s.isLoaded)
  const allNotes = useNotesStore((s) => s.notes)

  const [search, setSearch] = useState('')
  const [editQuestionId, setEditQuestionId] = useState<string | null>(null)

  // Load data on mount
  useEffect(() => {
    if (!isLoaded()) {
      void loadAll()
    }
  }, [isLoaded, loadAll])

  // Derive note entries from store
  const entries = useMemo<NoteEntry[]>(() => {
    if (!allQuestions) return []

    const result: NoteEntry[] = []
    for (const questionId of Object.keys(allNotes)) {
      const noteText = allNotes[questionId]
      if (!noteText || !noteText.trim()) continue

      const question = allQuestions[questionId]
      const title = question
        ? pickText(question.questionText, language)
        : `(${questionId})`
      const category = question?.category ?? ''

      result.push({
        questionId,
        title: title || `(${questionId})`,
        preview: stripMarkdown(noteText).slice(0, 150),
        category,
      })
    }

    return result
  }, [allNotes, allQuestions, language])

  // Filter by search query
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return entries

    return entries.filter((entry) => {
      const noteFull = stripMarkdown(allNotes[entry.questionId] ?? '').toLowerCase()
      return (
        entry.title.toLowerCase().includes(q) ||
        noteFull.includes(q) ||
        entry.category.toLowerCase().includes(q)
      )
    })
  }, [entries, search, allNotes])

  const handleOpenQuestion = useCallback(
    (entry: NoteEntry) => {
      navigate(
        `/study?category=${encodeURIComponent(entry.category)}&focus=${encodeURIComponent(entry.questionId)}`,
      )
    },
    [navigate],
  )

  const handleEditNote = useCallback((questionId: string) => {
    setEditQuestionId(questionId)
  }, [])

  const categoryLabelMap = useMemo(() => {
    const map: Record<string, string> = {}
    map.fischkunde_und_hege = tCategories('names.fischkunde_und_hege')
    map.pflege_der_fischgewaesser = tCategories('names.pflege_der_fischgewaesser')
    map.fanggeraete_und_deren_gebrauch = tCategories('names.fanggeraete_und_deren_gebrauch')
    map.behandlung_der_gefangenen_fische = tCategories('names.behandlung_der_gefangenen_fische')
    map.einschlaegige_rechtsvorschriften = tCategories('names.einschlaegige_rechtsvorschriften')
    return map
  }, [tCategories])

  // Loading state
  if (dataLoading && !allQuestions) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-muted-foreground">{tCommon('loading')}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
      </div>

      {/* Search */}
      {entries.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="notes-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className="h-11 pl-10 text-base"
          />
        </div>
      )}

      {/* Empty state */}
      {entries.length === 0 ? (
        <div
          data-testid="notes-empty"
          className="flex flex-col items-center gap-4 py-16 text-center"
        >
          <StickyNote className="size-12 text-muted-foreground/40" />
          <div className="flex flex-col gap-1">
            <p className="text-lg font-medium">{t('empty')}</p>
            <p className="text-sm text-muted-foreground">{t('emptyMessage')}</p>
          </div>
          <Button
            onClick={() => navigate('/study')}
            data-testid="notes-go-study"
          >
            {t('goToStudy')}
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {tCommon('search')}: &ldquo;{search}&rdquo;
          </p>
          <p className="text-xs text-muted-foreground/70">
            {t('noNotes')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((entry) => (
            <Card key={entry.questionId} size="sm">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="truncate text-sm">
                      {entry.title}
                    </CardTitle>
                    <CardDescription className="truncate">
                      {entry.preview}
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => handleEditNote(entry.questionId)}
                      data-testid={`note-edit-${entry.questionId}`}
                    >
                      {t('editNote')}
                    </Button>
                  </div>
                </div>
                {entry.category && categoryLabelMap[entry.category] && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {categoryLabelMap[entry.category]}
                    </span>
                    <Button
                      variant="link"
                      size="xs"
                      onClick={() => handleOpenQuestion(entry)}
                      data-testid={`note-open-${entry.questionId}`}
                      className="h-auto p-0 text-xs"
                    >
                      <FileText className="mr-1 size-3" />
                      {t('goToStudy')}
                    </Button>
                  </div>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Note editor dialog */}
      {editQuestionId !== null && (
        <NoteEditor
          questionId={editQuestionId}
          open={editQuestionId !== null}
          onOpenChange={(v) => {
            if (!v) setEditQuestionId(null)
          }}
        />
      )}
    </div>
  )
}
