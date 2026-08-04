import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useBlocker, useNavigate } from 'react-router'
import { Clock, AlertTriangle, CheckCircle2, XCircle, ArrowLeft, ArrowRight } from 'lucide-react'

import { useExamStore } from '@/store/exam.store'
import { useDataStore } from '@/store/data.store'
import { useProgressStore } from '@/store/progress.store'
import { useSettingsStore } from '@/store/settings.store'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { PageLoading } from '@/components/loading-spinner'
import { selectExamQuestions, shuffleAnswerIndices, mapDisplayToData } from '@/lib/exam-select'
import { CATEGORY_ORDER, CATEGORY_NAME_KEYS } from '@/lib/categories'
import { questionExplanationProvider } from '@/lib/ai'
import { cn } from '@/lib/utils'
import type { ExamHistoryEntry, Language, Question, QuestionCategory } from '@/types'

type Phase = 'setup' | 'active' | 'results' | 'review'

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function Exam() {
  const { t } = useTranslation('exam')
  const { t: tc } = useTranslation('common')
  const { t: tcat } = useTranslation('categories')
  const navigate = useNavigate()

  const currentExam = useExamStore((s) => s.currentExam)
  const startExam = useExamStore((s) => s.startExam)
  const answerQuestion = useExamStore((s) => s.answerQuestion)
  const submitExam = useExamStore((s) => s.submitExam)
  const clearExam = useExamStore((s) => s.clearExam)

  const questionsById = useDataStore((s) => s.questions)
  const isLoaded = useDataStore((s) => s.isLoaded)
  const loading = useDataStore((s) => s.loading)
  const loadAll = useDataStore((s) => s.loadAll)

  const recordAnswer = useProgressStore((s) => s.recordAnswer)
  const language = useSettingsStore((s) => s.language)

  const [phase, setPhase] = useState<Phase>('setup')
  const [showResumeDialog, setShowResumeDialog] = useState(false)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answerShuffles, setAnswerShuffles] = useState<Record<string, number[]>>({})
  const [examResult, setExamResult] = useState<ExamHistoryEntry | null>(null)
  const [languageAtStart, setLanguageAtStart] = useState<Language>(language)
  const [timeRemainingSec, setTimeRemainingSec] = useState(0)
  const [showTimeWarning, setShowTimeWarning] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const submittedRef = useRef(false)
  const examQuestionsRef = useRef<Question[]>([])
  const examAnswersRef = useRef<Record<string, number>>({})
  const answerShufflesRef = useRef<Record<string, number[]>>({})
  const resumeConfirmRef = useRef<HTMLButtonElement>(null)

  function getCategoryName(cat: QuestionCategory): string {
    return tcat(CATEGORY_NAME_KEYS[cat])
  }

  function recordAllAnswers(questions: Question[], answers: Record<string, number>) {
    for (const q of questions) {
      const chosen = answers[q.id]
      if (chosen !== undefined) {
        const correct = chosen === q.correctAnswerIndex
        recordAnswer(q.id, correct, chosen, q.category)
      }
    }
  }

  function getShuffleForQuestion(qid: string): number[] {
    if (answerShuffles[qid]) return answerShuffles[qid]
    const shuffled = shuffleAnswerIndices()
    setAnswerShuffles((prev) => {
      if (prev[qid]) return prev
      return { ...prev, [qid]: shuffled }
    })
    return shuffled
  }

  function handleAnswerClick(displayIndex: number) {
    if (!currentExam) return
    const question = currentExam.questions[currentIndex]
    const shuffled = getShuffleForQuestion(question.id)
    const dataIndex = mapDisplayToData(displayIndex, shuffled)
    answerQuestion(question.id, dataIndex)
  }

  function handleStartExam() {
    if (!questionsById) return
    const selected = selectExamQuestions(questionsById, 12)
    if (selected.length !== 60) return

    setLanguageAtStart(language)
    setAnswerShuffles({})
    answerShufflesRef.current = {}
    setCurrentIndex(0)
    setShowTimeWarning(false)
    submittedRef.current = false
    startExam(selected)
    setPhase('active')
  }

  function handleResume() {
    if (!currentExam) return
    setShowResumeDialog(false)
    setLanguageAtStart(language)
    setCurrentIndex(0)
    setShowTimeWarning(false)
    setPhase('active')
  }

  function handleAbandon() {
    clearExam()
    setShowResumeDialog(false)
    setPhase('setup')
  }

  function handleSubmit() {
    if (!currentExam || submittedRef.current) return
    submittedRef.current = true
    setShowSubmitConfirm(false)

    examQuestionsRef.current = [...currentExam.questions]
    examAnswersRef.current = { ...currentExam.answers }
    answerShufflesRef.current = { ...answerShuffles }

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    recordAllAnswers(examQuestionsRef.current, examAnswersRef.current)
    const entry = submitExam()
    if (entry) {
      setExamResult(entry)
      setPhase('results')
    }
  }

  function getAnsweredStats() {
    if (!currentExam) return { answered: 0, total: 0 }
    const answers = currentExam.answers
    const total = currentExam.questions.length
    const answered = currentExam.questions.filter((q) => answers[q.id] !== undefined).length
    return { answered, total }
  }

  useEffect(() => {
    if (!isLoaded()) {
      void loadAll()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentExam && !submittedRef.current) {
      if (Date.now() > currentExam.expiresAt) {
        const entry = submitExam()
        if (entry) {
          setExamResult(entry)
          setPhase('results')
        }
        submittedRef.current = true
        return
      }
      setShowResumeDialog(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'active' || !currentExam) return

    const tick = () => {
      const remaining = Math.max(0, Math.floor((currentExam.expiresAt - Date.now()) / 1000))
      setTimeRemainingSec(remaining)

      if (remaining <= 60 && remaining > 0) {
        setShowTimeWarning(true)
      }

      if (remaining <= 0 && !submittedRef.current) {
        submittedRef.current = true
        setShowTimeWarning(false)

        examQuestionsRef.current = [...currentExam.questions]
        examAnswersRef.current = { ...currentExam.answers }
        answerShufflesRef.current = { ...answerShuffles }

        const entry = submitExam()
        if (entry) {
          recordAllAnswers(examQuestionsRef.current, examAnswersRef.current)
          setExamResult(entry)
          setPhase('results')
        }
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }
    }

    tick()
    timerRef.current = setInterval(tick, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [phase, currentExam]) // eslint-disable-line react-hooks/exhaustive-deps

  const blocker = useBlocker(phase === 'active')

  useEffect(() => {
    if (phase !== 'active') return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [phase])

  if (loading && !isLoaded()) {
    return <PageLoading />
  }

  if (!isLoaded() && !loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md text-center">
          <CardContent className="pt-6">
            <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">{t('noQuestions')}</p>
            <Button className="mt-4" onClick={() => void loadAll()}>
              {tc('reset')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showResumeDialog && currentExam) {
    return (
      <Dialog open onOpenChange={() => {}}>
        <DialogContent
          showCloseButton={false}
          initialFocus={() => resumeConfirmRef.current}
        >
          <DialogHeader>
            <DialogTitle>{t('resume.title')}</DialogTitle>
            <DialogDescription>{t('resume.prompt')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleAbandon}>
              {t('resume.abandon')}
            </Button>
            <Button onClick={handleResume} ref={resumeConfirmRef}>
              {t('resume.resume')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  if (blocker.state === 'blocked') {
    return (
      <Dialog open onOpenChange={() => {}}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('resume.title')}</DialogTitle>
            <DialogDescription>{t('backWarning')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => blocker.reset()}>
              {tc('cancel')}
            </Button>
            <Button variant="destructive" onClick={() => blocker.proceed()}>
              {tc('yes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  if (phase === 'setup') {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="mt-1 text-muted-foreground">{t('rules.intro')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('rules.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{t('rules.duration')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  60
                </span>
                <span>
                  {t('rules.questionCount')} ({t('rules.categories')})
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                <span>{t('rules.passCriteria')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-xs">
                  🔀
                </span>
                <span>{t('rules.shuffled')}</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>{t('rules.autoSubmit')}</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              data-testid="start-exam"
              size="lg"
              className="w-full"
              onClick={handleStartExam}
              disabled={!questionsById}
            >
              {t('startExam')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (phase === 'results' && examResult) {
    const passed = examResult.passed
    const durationFormatted = formatTime(examResult.durationSeconds)

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <Badge
            data-testid="exam-result"
            variant={passed ? 'default' : 'destructive'}
            className="px-4 py-1 text-lg font-bold"
          >
            {passed ? t('result.passed') : t('result.failed')}
          </Badge>
          <h1 className="mt-4 text-2xl font-bold">{t('title')}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('result.score')}</CardTitle>
            <CardDescription aria-live="polite" aria-atomic="true">
              {examResult.correctAnswers} / {examResult.totalQuestions}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={(examResult.correctAnswers / examResult.totalQuestions) * 100}>
              <ProgressTrack>
                <ProgressIndicator />
              </ProgressTrack>
            </Progress>
          </CardContent>
          <CardFooter className="flex-col items-start gap-1">
            <div className="flex w-full justify-between text-sm">
              <span className="text-muted-foreground">{t('result.timeUsed')}</span>
              <span className="font-medium tabular-nums">{durationFormatted}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('result.passCriteria')}</p>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('result.categoryBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {CATEGORY_ORDER.map((cat) => {
                const stats = examResult.perCategory[cat]
                const catPassed = stats.correct >= 6
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 truncate text-sm">
                      {getCategoryName(cat)}
                    </span>
                    <div className="flex-1">
                      <Progress value={(stats.correct / stats.total) * 100}>
                        <ProgressTrack>
                          <ProgressIndicator />
                        </ProgressTrack>
                      </Progress>
                    </div>
                    <span
                      className={cn(
                        'w-16 text-right text-sm font-medium tabular-nums',
                        catPassed ? 'text-green-600' : 'text-red-500',
                      )}
                    >
                      {stats.correct}/{stats.total}
                    </span>
                    {catPassed ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/')}>
            {t('result.backToDashboard')}
          </Button>
          <Button className="flex-1" onClick={() => setPhase('review')}>
            {t('result.reviewAnswers')}
          </Button>
        </div>
      </div>
    )
  }

  if (phase === 'review' && examResult) {
    return (
      <ReviewPhase
        examResult={examResult}
        questions={examQuestionsRef.current}
        answers={examAnswersRef.current}
        shuffles={answerShufflesRef.current}
      />
    )
  }

  if (!currentExam) {
    return <PageLoading />
  }

  const question = currentExam.questions[currentIndex]
  if (!question) {
    return <PageLoading />
  }

  const answers = currentExam.answers
  const shuffled = getShuffleForQuestion(question.id)
  const chosenAnswer = answers[question.id]
  const stats = getAnsweredStats()
  const lang = languageAtStart

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2">
          <Clock
            className={cn(
              'h-5 w-5',
              showTimeWarning ? 'animate-pulse text-red-500' : 'text-muted-foreground',
            )}
          />
          <span
            aria-live="polite"
            aria-atomic="true"
            className={cn(
              'font-mono text-lg font-bold tabular-nums',
              showTimeWarning ? 'text-red-500' : '',
            )}
          >
            {formatTime(timeRemainingSec)}
          </span>
          <span className="text-xs text-muted-foreground">{t('timeRemaining')}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {t('answered')}: {stats.answered}/{stats.total}
          </span>
          <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {t('languageLocked')}
          </span>
        </div>
      </div>

      {showTimeWarning && (
        <div
          role="status"
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-center text-sm font-medium text-amber-600 dark:text-amber-400"
        >
          <AlertTriangle className="mr-2 inline h-4 w-4" />
          {t('oneMinuteWarning')}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardDescription>
              {t('question')} {currentIndex + 1} {t('of')} {currentExam.questions.length}
            </CardDescription>
            <Badge variant="outline" className="text-xs">
              {getCategoryName(question.category)}
            </Badge>
          </div>
          <CardTitle className="text-lg leading-relaxed">
            {question.questionText[lang]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {shuffled.map((dataIdx, displayIdx) => {
              const isSelected = chosenAnswer === dataIdx
              const optionLetter = ['A', 'B', 'C'][displayIdx]
              return (
                <button
                  key={displayIdx}
                  type="button"
                  onClick={() => handleAnswerClick(displayIdx)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50',
                    isSelected
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-border',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/30 text-muted-foreground',
                    )}
                  >
                    {optionLetter}
                  </span>
                  <span className="text-sm">{question.answers[dataIdx].text[lang]}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {tc('previous')}
          </Button>
          <Button
            variant="outline"
            disabled={currentIndex === currentExam.questions.length - 1}
            onClick={() =>
              setCurrentIndex((i) => Math.min(currentExam.questions.length - 1, i + 1))
            }
          >
            {tc('next')}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>{t('navigator.label')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-10 gap-1.5 sm:grid-cols-12 md:grid-cols-15 lg:grid-cols-20">
            {currentExam.questions.map((q, i) => {
              const isAnswered = answers[q.id] !== undefined
              const isCurrent = i === currentIndex
              return (
                <button
                  key={q.id}
                  type="button"
                  data-testid={`question-nav-${i}`}
                  onClick={() => setCurrentIndex(i)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded text-xs font-medium transition-colors',
                    isCurrent && 'ring-2 ring-primary ring-offset-1',
                    isAnswered
                      ? 'bg-primary/20 text-primary hover:bg-primary/30'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                  title={
                    isAnswered ? t('navigator.answered') : t('navigator.unanswered')
                  }
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={() => setShowSubmitConfirm(true)}>
          {t('submitExam')}
        </Button>
      </div>

      {showSubmitConfirm && (
        <Dialog
          open
          onOpenChange={(open: boolean) => {
            if (!open) setShowSubmitConfirm(false)
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('confirmSubmit.title')}</DialogTitle>
              <DialogDescription>
                {t('confirmSubmit.description', {
                  answered: stats.answered,
                  total: stats.total,
                })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>
                {t('confirmSubmit.cancel')}
              </Button>
              <Button onClick={handleSubmit}>
                {t('confirmSubmit.yesSubmit')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ========== REVIEW PHASE COMPONENT ==========

interface ReviewPhaseProps {
  examResult: ExamHistoryEntry
  questions: Question[]
  answers: Record<string, number>
  shuffles: Record<string, number[]>
}

function ReviewPhase({ examResult, questions, answers, shuffles }: ReviewPhaseProps) {
  const { t } = useTranslation('exam')
  const { t: tcat } = useTranslation('categories')
  const lang = useSettingsStore((s) => s.language)
  const navigate = useNavigate()

  function getCategoryName(cat: QuestionCategory): string {
    return tcat(CATEGORY_NAME_KEYS[cat])
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">{t('review.title')}</h1>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              {examResult.correctAnswers} / {examResult.totalQuestions}{' '}
              {t('result.score').toLowerCase()}
            </p>
            <Button className="mt-4" variant="outline" onClick={() => navigate('/')}>
              {t('result.backToDashboard')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('review.title')}</h1>
        <p className="mt-1 text-muted-foreground">
          {examResult.correctAnswers} / {examResult.totalQuestions} —{' '}
          {examResult.passed ? t('result.passed') : t('result.failed')}
        </p>
      </div>

      <div data-testid="review-list" className="space-y-4">
        {questions.map((q, i) => {
          const chosen = answers[q.id]
          const isCorrect = chosen === q.correctAnswerIndex
          const isAnswered = chosen !== undefined

          const shuffleOrder = shuffles[q.id] ?? [0, 1, 2]
          const displayItems = shuffleOrder.map((dataIdx) => ({
            dataIdx,
            isCorrect: dataIdx === q.correctAnswerIndex,
            isChosen: dataIdx === chosen,
          }))

          return (
            <Card
              key={q.id}
              className={cn(
                'border-l-4',
                isAnswered
                  ? isCorrect
                    ? 'border-l-green-500'
                    : 'border-l-red-500'
                  : 'border-l-muted-foreground/30',
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>
                    {t('question')} {i + 1} — {getCategoryName(q.category)}
                  </CardDescription>
                  {isAnswered ? (
                    isCorrect ? (
                      <Badge variant="default" className="bg-green-600 text-white">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {t('review.correct')}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="mr-1 h-3 w-3" />
                        {t('review.incorrect')}
                      </Badge>
                    )
                  ) : (
                    <Badge variant="outline">{t('review.notAnswered')}</Badge>
                  )}
                </div>
                <CardTitle className="text-base">{q.questionText[lang]}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-1.5">
                {displayItems.map((item, di) => {
                  const optionLetter = ['A', 'B', 'C'][di]
                  let borderClass = 'border-border'
                  let bgClass = ''
                  let label = ''

                  if (item.isCorrect) {
                    borderClass = 'border-green-500'
                    bgClass = 'bg-green-50 dark:bg-green-950/30'
                    if (!item.isChosen) {
                      label = t('review.correctAnswer')
                    }
                  }
                  if (item.isChosen && !item.isCorrect) {
                    borderClass = 'border-red-500'
                    bgClass = 'bg-red-50 dark:bg-red-950/30'
                    label = t('review.yourAnswer')
                  }
                  if (item.isChosen && item.isCorrect) {
                    label = t('review.correct')
                  }

                  return (
                    <div
                      key={di}
                      className={cn(
                        'flex items-start gap-3 rounded-lg border p-3',
                        borderClass,
                        bgClass,
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                          item.isCorrect
                            ? 'border-green-500 bg-green-500 text-white'
                            : item.isChosen
                              ? 'border-red-500 bg-red-500 text-white'
                              : 'border-muted-foreground/30 text-muted-foreground',
                        )}
                      >
                        {optionLetter}
                      </span>
                      <span className="flex-1 text-sm">
                        {q.answers[item.dataIdx].text[lang]}
                      </span>
                      {label && (
                        <span
                          className={cn(
                            'shrink-0 text-xs font-medium',
                            item.isCorrect ? 'text-green-600' : 'text-red-500',
                          )}
                        >
                          {label}
                        </span>
                      )}
                    </div>
                  )
                })}
              </CardContent>

              <CardFooter className="flex-col items-start">
                <p className="text-xs text-muted-foreground">
                  <strong>{t('review.explanation')}:</strong>{' '}
                  {questionExplanationProvider.explain(q, chosen ?? null, lang)}
                </p>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      <div className="flex justify-center pb-8">
        <Button variant="outline" onClick={() => navigate('/')}>
          {t('result.backToDashboard')}
        </Button>
      </div>
    </div>
  )
}
