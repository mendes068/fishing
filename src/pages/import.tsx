import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangleIcon, CheckCircle2Icon, FileUpIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  MAX_IMPORT_BYTES,
  mergeQuestions,
  validateImport,
  type ImportResult,
  type MergeResult,
} from '@/lib/importer'
import { useDataStore } from '@/store/data.store'
import { useQuestionStore } from '@/store/question.store'

type Phase = 'idle' | 'processing' | 'validated' | 'failed'

/**
 * JSON import page: drag-and-drop / file picker for question banks. Files are
 * parsed and validated against the Zod schemas before anything touches the
 * stores; on confirm, questions are merged by id (user progress — keyed
 * separately by question id — is never touched).
 */
export default function Import() {
  const { t } = useTranslation('import')

  // --- Local UI state --------------------------------------------------------
  const [phase, setPhase] = useState<Phase>('idle')
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [preview, setPreview] = useState<MergeResult | null>(null)
  const [sizeError, setSizeError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // --- Stores ----------------------------------------------------------------
  const storeQuestions = useDataStore((s) => s.questions)

  // Load the trilingual bank on mount so the preview merge sees current data.
  const loadAll = useDataStore((s) => s.loadAll)
  const isLoaded = useDataStore((s) => s.isLoaded)
  if (!isLoaded()) void loadAll()

  const existing = storeQuestions ?? {}

  /** Reset the form back to the idle dropzone (keeps success banner). */
  const resetForm = useCallback(() => {
    setPhase('idle')
    setDragging(false)
    setFileName(null)
    setResult(null)
    setPreview(null)
    setSizeError(null)
  }, [])

  /** Read + validate a dropped/picked file, then build the preview merge. */
  const handleFile = useCallback(
    async (file: File) => {
      if (!file) return
      setSuccessMessage(null)
      if (file.size > MAX_IMPORT_BYTES) {
        setSizeError(t('fileTooLarge'))
        setPhase('idle')
        return
      }
      setFileName(file.name)
      setPhase('processing')
      // Yield so the "Processing…" state paints before the parse work.
      await new Promise((resolve) => setTimeout(resolve, 0))
      const text = await file.text()
      const validation = validateImport(text)
      setResult(validation)
      if (validation.ok) {
        setPreview(mergeQuestions(existing, validation.questions))
        setPhase('validated')
      } else {
        setPhase('failed')
      }
    },
    // `existing` is a fresh object each render; read it lazily instead so the
    // callback stays stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  )

  /** Apply the validated merge: data store + question store (order preserved). */
  const handleConfirm = useCallback(() => {
    if (!result?.ok || !preview) return
    const current = useDataStore.getState().questions ?? {}
    const merged = mergeQuestions(current, result.questions)
    useDataStore.setState({ questions: merged.merged })

    const questionStore = useQuestionStore.getState()
    questionStore.setQuestions(merged.merged)
    const order = questionStore.order
    const appended = merged.added.filter((id) => !order.includes(id))
    questionStore.setOrder([...order, ...appended])

    setSuccessMessage(
      t('importSuccess', {
        count: merged.added.length + merged.updated.length,
        new: merged.added.length,
        updated: merged.updated.length,
      }),
    )
    resetForm()
  }, [preview, resetForm, result, t])

  // --- Drop handlers ---------------------------------------------------------

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setDragging(false)
      const file = event.dataTransfer.files?.[0]
      if (file) void handleFile(file)
    },
    [handleFile],
  )

  // --- Derived ---------------------------------------------------------------

  const structuralError = useMemo(() => {
    if (result?.ok === false && result.errors.length === 1 && result.errors[0].index === -1) {
      return result.errors[0]
    }
    return null
  }, [result])

  const invalidJson = useMemo(
    () => structuralError?.message.startsWith('Invalid JSON:') ?? false,
    [structuralError],
  )

  const dropzoneLabel =
    phase === 'processing' ? t('processing') : t('dropzone')

  // --- JSX --------------------------------------------------------------------

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>

      {successMessage && (
        <div
          data-testid="import-success"
          className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-3 text-sm font-medium text-primary"
        >
          <CheckCircle2Icon className="size-4 shrink-0" />
          {successMessage}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUpIcon className="size-4" />
            {t('selectFile')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <input
            id="import-file-input"
            type="file"
            accept=".json,application/json"
            data-testid="import-file-input"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleFile(file)
              event.target.value = ''
            }}
          />
          <div
            data-testid="import-dropzone"
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
              dragging
                ? 'border-primary bg-primary/5'
                : 'border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50'
            }`}
            onClick={() =>
              document.getElementById('import-file-input')?.click()
            }
            role="button"
            tabIndex={0}
            aria-label={t('selectFile')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                document.getElementById('import-file-input')?.click()
              }
            }}
          >
            {phase === 'processing' ? (
              <div className="flex w-full max-w-xs flex-col items-center gap-3">
                <Progress value={null} className="w-full" aria-label={t('processing')} />
                <p className="text-sm text-muted-foreground">{t('processing')}</p>
              </div>
            ) : (
              <>
                <FileUpIcon className="size-8 text-muted-foreground" />
                <p className="font-medium">{t('browse')}</p>
                <p className="text-sm text-muted-foreground">{t('orDrop')}</p>
              </>
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {dropzoneLabel}
          </p>

          {sizeError && (
            <p
              data-testid="import-errors"
              className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertTriangleIcon className="size-4 shrink-0" />
              {sizeError}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Validation results */}
      {result?.ok ? (
        preview && (
          <Card>
            <CardHeader>
              <CardTitle>
                {t('validQuestions', { count: result.questions.length })}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {fileName && (
                <p className="text-sm text-muted-foreground">{fileName}</p>
              )}
              {/* Summary table: new vs updated */}
              <div
                data-testid="import-summary"
                className="grid grid-cols-2 gap-3"
              >
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    {t('newQuestions')}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {preview.added.length}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    {t('updatedQuestions')}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {preview.updated.length}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('importedCount', { count: result.questions.length })}
              </p>
              <div className="flex items-center gap-2">
                <Button data-testid="import-confirm" onClick={handleConfirm}>
                  {t('importConfirm')}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  {t('cancel')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        result && (
          <Card>
            <CardHeader>
              <CardTitle>
                {structuralError
                  ? invalidJson
                    ? t('invalidJson')
                    : t('errorsFound', { count: result.errors.length })
                  : t('errorsFound', { count: result.errors.length })}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {fileName && (
                <p className="text-sm text-muted-foreground">{fileName}</p>
              )}
              <div
                data-testid="import-errors"
                className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-lg border border-destructive/30 bg-destructive/5 p-3"
              >
                {result.errors.map((err, idx) => (
                  <p
                    key={idx}
                    className="flex items-baseline gap-2 text-sm text-destructive"
                  >
                    <AlertTriangleIcon className="size-3.5 shrink-0 translate-y-0.5" />
                    <span>
                      {err.index >= 0
                        ? `${t('questionIndex', { index: err.index })}: `
                        : ''}
                      {err.message}
                      {err.path ? (
                        <span className="text-muted-foreground">
                          {' '}
                          ({err.path})
                        </span>
                      ) : null}
                    </span>
                  </p>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={resetForm}>
                  {t('tryAgain')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      )}
    </div>
  )
}
