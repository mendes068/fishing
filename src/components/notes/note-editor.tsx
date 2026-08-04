import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useNotesStore } from '@/store/notes.store'

export interface NoteEditorProps {
  questionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NoteEditor({ questionId, open, onOpenChange }: NoteEditorProps) {
  const { t } = useTranslation('notes')
  const { t: tCommon } = useTranslation()

  const getNote = useNotesStore((s) => s.getNote)
  const setNote = useNotesStore((s) => s.setNote)
  const removeNote = useNotesStore((s) => s.removeNote)

  const [text, setText] = useState('')
  const [dirty, setDirty] = useState(false)

  // Load existing note when dialog opens or questionId changes
  useEffect(() => {
    if (open) {
      setText(getNote(questionId))
      setDirty(false)
    }
  }, [open, questionId, getNote])

  const handleSave = useCallback(() => {
    const trimmed = text.trim()
    if (trimmed.length === 0) {
      removeNote(questionId)
    } else {
      setNote(questionId, trimmed)
    }
    setDirty(false)
    onOpenChange(false)
  }, [text, questionId, setNote, removeNote, onOpenChange])

  const handleDelete = useCallback(() => {
    removeNote(questionId)
    setText('')
    setDirty(false)
    onOpenChange(false)
  }, [questionId, removeNote, onOpenChange])

  const handleCancel = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  // Determine if we have content for the tab default
  const markdownContent = useMemo(() => text.trim() || `*${t('noNotes')}*`, [text, t])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>{t('editNote')}</DialogTitle>
          <DialogDescription>
            {t('noteForQuestion', { id: questionId })}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="edit" className="flex-1">
          <TabsList className="mb-3">
            <TabsTrigger value="edit">{t('edit')}</TabsTrigger>
            <TabsTrigger value="preview" data-testid="note-preview-tab">
              {t('preview')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="flex flex-col gap-2">
            <Textarea
              data-testid="note-textarea"
              placeholder={t('addNote')}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setDirty(true)
              }}
              className="min-h-48 resize-y"
            />
          </TabsContent>

          <TabsContent value="preview" className="min-h-48">
            <div
              data-testid="note-preview"
              className="prose prose-sm dark:prose-invert max-w-none rounded-lg border bg-muted/30 p-4"
            >
              <Markdown remarkPlugins={[remarkGfm]}>
                {markdownContent}
              </Markdown>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter showCloseButton={false}>
          <Button
            variant="destructive"
            onClick={handleDelete}
            data-testid="note-delete"
            className="mr-auto"
          >
            {t('delete')}
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            {tCommon('cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!dirty}
            data-testid="note-save"
          >
            {tCommon('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default NoteEditor
